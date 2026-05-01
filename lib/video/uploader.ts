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
// FULL (Phase 9): three-step flow - call signUpload to get a presigned URL,
// PUT the file bytes via expo-file-system createUploadTask with onProgress,
// then call completeUpload. The MIME at the upload boundary is always
// `video/mp4`. The FULL implementation block below is intentionally kept as
// a documented commented-out reference so the Phase 9 handoff is one search
// away.
// ============================================================================

import { MOCK_API } from '@/lib/api/config';
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadVideo(
  opts: UploadOptions,
  onProgress: UploaderProgress,
): Promise<UploadResult> {
  if (MOCK_API) {
    return uploadVideoScaffold(opts, onProgress);
  }
  // ============================================================================
  // FULL mode flow (Phase 9)
  // ============================================================================
  // import { signUpload, completeUpload } from '@/lib/api/upload';
  // import { createUploadTask, FileSystemUploadType } from 'expo-file-system/legacy';
  //
  // const filename = opts.localUri.split('/').pop() ?? 'upload.mp4';
  // const signed = await signUpload({
  //   workspaceId: opts.workspaceId,
  //   filename,
  //   mime: 'video/mp4',
  //   sizeBytes: opts.sizeBytes,
  // });
  // const task = createUploadTask(
  //   signed.uploadUrl,
  //   opts.localUri,
  //   {
  //     httpMethod: signed.method,
  //     uploadType: FileSystemUploadType.BINARY_CONTENT,
  //     headers: { 'Content-Type': 'video/mp4' },
  //   },
  //   (data) => {
  //     if (data.totalBytesExpectedToSend > 0) {
  //       onProgress(data.totalBytesSent / data.totalBytesExpectedToSend);
  //     }
  //   },
  // );
  // if (opts.signal) {
  //   opts.signal.addEventListener('abort', () => { void task.cancelAsync(); });
  // }
  // const res = await task.uploadAsync();
  // if (!res || res.status >= 400) {
  //   throw new VideoPipelineError('GENERIC');
  // }
  // await completeUpload({ mediaKey: signed.mediaKey });
  // return { mediaKey: signed.mediaKey };
  // ============================================================================
  return uploadVideoScaffold(opts, onProgress);
}

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
