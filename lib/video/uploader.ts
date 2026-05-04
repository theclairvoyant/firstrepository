// Upload step of the pipeline.
//
// ============================================================================
// SCAFFOLD vs FULL boundary
// ============================================================================
// This module is the single switch point between the SCAFFOLD simulated upload
// and the FULL signed-URL implementation. The upper layer (uploadDriver.ts)
// does NOT need to change between modes - only this file does.
//
// SCAFFOLD: 3-second timer with progress callbacks 0..1, returns a fake
// mediaKey of the form `mock_<timestamp>`. No network calls.
//
// FULL: three-step flow.
//   1. POST /v1/uploads/sign to get { uploadUrl, mediaKey, method, partSize? }
//   2. PUT the file bytes via expo-file-system createUploadTask with progress
//      callbacks. The MIME at the upload boundary is always `video/mp4`,
//      regardless of the source container (.mov etc).
//   3. POST /v1/uploads/complete to finalize the media on the backend.
//
// Branching is exclusively on `MOCK_API` from `lib/api/config.ts`. No other
// flag is consulted.
// ============================================================================

import { MOCK_API } from '@/lib/api/config';
import { signUpload, completeUpload } from '@/lib/api/upload';
import {
  createUploadTask,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { ApiError } from '@/types/api';
import { VideoPipelineError } from './errors';

export type UploaderProgress = (pct: number) => void;
export type UploadResult = { mediaKey: string };

export type UploadOptions = {
  workspaceId: string;
  localUri: string;
  sizeBytes: number;
  mimeType: string;
  signal?: AbortSignal;
};

const SCAFFOLD_TOTAL_MS = 3000;
const SCAFFOLD_STEP_MS = 50;

// Bytes-to-MB conversions used by the conditional transcode policy.
const BYTES_PER_MB = 1024 * 1024;

// Spec policy (docs/05-video-pipeline.md): client-side recompression should
// kick in when the file is larger than 100 MB or width is above 1280. The
// camera path is locked to 720p, and the gallery picker on iOS forces the
// H264_1280x720 export preset, so most flows already satisfy this. Anything
// larger should still upload as-is until react-native-compressor is wired
// (see TODO in `maybeTranscode` below).
const TRANSCODE_THRESHOLD_BYTES = 100 * BYTES_PER_MB;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveFilename(localUri: string): string {
  const tail = localUri.split('/').pop() ?? '';
  // Strip any query string just in case (some platforms suffix asset URLs).
  const cleaned = tail.split('?')[0] ?? '';
  if (cleaned.length === 0) {
    return `upload-${Date.now()}.mp4`;
  }
  return cleaned;
}

// Hard rule (CLAUDE.md #8): every upload boundary is `video/mp4`, even when
// the source container is `.mov`. Centralized so callers can reuse the value
// for the X-Upload Content-Type header.
const UPLOAD_MIME = 'video/mp4';

// Conditional transcode shim. The spec calls for react-native-compressor when
// size > 100 MB or width > 1280. Neither dependency is wired in this repo
// today. The function returns the original URI as a working fallback so the
// FULL upload path is end-to-end functional. Backend-side transcode (or a
// 413 from the signer) is the safety net.
//
// TODO(video-pipeline): install react-native-compressor and call
// Video.compress() with quality "medium" and bitrate "lowest" when this
// returns true, then return the compressed URI. Track in your sprint board.
async function maybeTranscode(opts: UploadOptions): Promise<string> {
  const oversize = opts.sizeBytes > TRANSCODE_THRESHOLD_BYTES;
  if (oversize) {
    // No-op fallback so the upload still proceeds. The signer may reject if
    // the file exceeds the workspace cap; that surfaces as UPLOAD_REJECTED
    // (HTTP 413 / UPLOAD_TOO_LARGE).
    return opts.localUri;
  }
  return opts.localUri;
}

export async function uploadVideo(
  opts: UploadOptions,
  onProgress: UploaderProgress,
): Promise<UploadResult> {
  if (MOCK_API) {
    return uploadVideoScaffold(opts, onProgress);
  }
  return uploadVideoFull(opts, onProgress);
}

// ---- FULL implementation ---------------------------------------------------

async function uploadVideoFull(
  opts: UploadOptions,
  onProgress: UploaderProgress,
): Promise<UploadResult> {
  if (opts.signal?.aborted) {
    throw new VideoPipelineError('CANCELLED');
  }

  // Step 0: conditional transcode. Returns the URI to actually send.
  const sourceUri = await maybeTranscode(opts);

  if (opts.signal?.aborted) {
    throw new VideoPipelineError('CANCELLED');
  }

  // Step 1: ask the backend for a signed URL + mediaKey.
  let signed;
  try {
    signed = await signUpload({
      workspaceId: opts.workspaceId,
      filename: deriveFilename(sourceUri),
      mime: UPLOAD_MIME,
      sizeBytes: opts.sizeBytes,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      // Map known API codes to the surface the UI banners speak.
      if (err.code === 'UPLOAD_TOO_LARGE' || err.code === 'UPLOAD_INVALID_FORMAT') {
        throw new VideoPipelineError('UPLOAD_REJECTED');
      }
      if (err.status === 0 || err.code === 'NETWORK') {
        throw new VideoPipelineError('NETWORK');
      }
      throw new VideoPipelineError('SIGN_FAILED');
    }
    throw new VideoPipelineError('SIGN_FAILED');
  }

  if (opts.signal?.aborted) {
    throw new VideoPipelineError('CANCELLED');
  }

  // TODO(video-pipeline): if `signed.partSize` is present the backend wants
  // an S3 multipart upload; that path supports range-resume on retry. Until
  // we ship that, fall through to the single-part PUT below. A retry today
  // restarts the upload from byte 0, which is acceptable per spec.

  // Step 2: stream the file bytes to the signed URL.
  const task = createUploadTask(
    signed.uploadUrl,
    sourceUri,
    {
      httpMethod: signed.method,
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        // MUST be video/mp4 even if the container is .mov - hard rule.
        'Content-Type': UPLOAD_MIME,
      },
    },
    (data) => {
      if (data.totalBytesExpectedToSend > 0) {
        const pct = data.totalBytesSent / data.totalBytesExpectedToSend;
        onProgress(Math.max(0, Math.min(1, pct)));
      }
    },
  );

  let aborted = false;
  const onAbort = (): void => {
    aborted = true;
    void task.cancelAsync().catch(() => {
      // Cancellation can race with completion; swallow.
    });
  };
  if (opts.signal) {
    if (opts.signal.aborted) {
      onAbort();
      throw new VideoPipelineError('CANCELLED');
    }
    opts.signal.addEventListener('abort', onAbort);
  }

  let uploadResult;
  try {
    uploadResult = await task.uploadAsync();
  } catch (err) {
    if (aborted || opts.signal?.aborted) {
      throw new VideoPipelineError('CANCELLED');
    }
    // Network errors from the upload task come through as a thrown error
    // (no response object). Treat as transient so the retry banner shows.
    void err;
    throw new VideoPipelineError('NETWORK');
  } finally {
    if (opts.signal) {
      opts.signal.removeEventListener('abort', onAbort);
    }
  }

  if (aborted || opts.signal?.aborted) {
    throw new VideoPipelineError('CANCELLED');
  }
  if (!uploadResult) {
    throw new VideoPipelineError('UPLOAD_FAILED');
  }
  if (uploadResult.status >= 400) {
    if (uploadResult.status === 413) {
      throw new VideoPipelineError('UPLOAD_REJECTED');
    }
    throw new VideoPipelineError('UPLOAD_FAILED');
  }

  // Step 3: tell the backend we're done so it can kick off processing.
  try {
    await completeUpload({ mediaKey: signed.mediaKey });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 0 || err.code === 'NETWORK')) {
      throw new VideoPipelineError('NETWORK');
    }
    // A failed completion is recoverable from the backend's side (the bytes
    // are already in storage), but from the client's perspective we can't
    // attach an unconfirmed mediaKey to a post. Surface as UPLOAD_FAILED so
    // the user retries.
    throw new VideoPipelineError('UPLOAD_FAILED');
  }

  // Final progress beat so the banner snaps to 100% before the driver flips
  // to creating_post.
  onProgress(1);

  return { mediaKey: signed.mediaKey };
}

// ---- SCAFFOLD implementation -----------------------------------------------

async function uploadVideoScaffold(
  opts: UploadOptions,
  onProgress: UploaderProgress,
): Promise<UploadResult> {
  const steps = Math.max(1, Math.floor(SCAFFOLD_TOTAL_MS / SCAFFOLD_STEP_MS));
  for (let i = 0; i <= steps; i++) {
    if (opts.signal?.aborted) {
      throw new VideoPipelineError('CANCELLED');
    }
    onProgress(i / steps);
    if (i < steps) {
      await delay(SCAFFOLD_STEP_MS);
    }
  }
  return { mediaKey: `mock_${Date.now()}` };
}
