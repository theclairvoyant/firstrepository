// Upload orchestrator. Encapsulates the lifecycle:
//
//   queued -> preparing -> uploading -> creating_post -> done
//
// Cancellation moves the job to 'cancelled' and aborts the in-flight upload.
// Failures move the job to 'failed' and preserve the draft fields so the
// user can retry from the UploadProgressBanner.
//
// Concurrency: only one job runs at a time. If `getActive()` is non-null when
// `runUpload` is invoked the new job sits in 'queued' until the active job
// finishes, then it picks up automatically.
//
// This driver is callable from anywhere (no React context required) because
// it imports `postsApi.createPost` directly rather than using the
// useCreatePost mutation hook.

import { createPost } from '@/lib/api/posts';
import { useUploadStore } from '@/lib/store/uploadStore';
import type { UploadJob } from '@/lib/store/uploadStore';
import type { CreatePostInput, Post } from '@/types/api';
import { VideoPipelineError, isVideoPipelineError } from './errors';
import { uploadVideo } from './uploader';

export type RunUploadInput = {
  workspaceId: string;
  localUri: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  durationMs: number;
  title: string;
  description: string;
  tagIds: string[];
  ctaId: string | null;
  ctaUrl: string | null;
};

export type RunUploadHandle = {
  jobId: string;
  cancel: () => void;
  result: Promise<{ post: Post; mediaKey: string }>;
};

// Inputs needed to deferred-enqueue a job (waiting on Wi-Fi). The same shape
// can be replayed later via `resumeUpload(jobId)`.
export type EnqueueWaitingWifiInput = RunUploadInput;

// Internal shape persisted in the upload job's draftFields plus the local
// pipeline metadata we need to resume. We stash sizeBytes / dimensions on the
// job's `mediaKey` field is wrong - keep them on a small in-memory map keyed
// by jobId. On force-quit recovery the user must re-pick the file (the
// uploadStore alone cannot restore mediaSize / dimensions). This is fine for
// SCAFFOLD; FULL mode will persist the sign response.
const PENDING_INPUTS = new Map<string, RunUploadInput>();

let jobCounter = 0;
function nextJobId(): string {
  jobCounter += 1;
  return `job_${Date.now().toString(36)}_${jobCounter}`;
}

// Wait until no other job is in an active state. Resolves immediately if the
// store is idle. Polls via the zustand subscribe API so we are notified the
// moment a peer transitions to a terminal state.
function waitForSlot(currentJobId: string, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const isFree = (): boolean => {
      const active = useUploadStore.getState().getActive();
      return !active || active.id === currentJobId;
    };
    if (isFree()) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      unsub();
      signal.removeEventListener('abort', onAbort);
      reject(new VideoPipelineError('CANCELLED'));
    };
    const unsub = useUploadStore.subscribe((state) => {
      // Recompute on any state change. Cheap.
      void state;
      if (signal.aborted) return;
      if (isFree()) {
        unsub();
        signal.removeEventListener('abort', onAbort);
        resolve();
      }
    });
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort);
  });
}

export function runUpload(input: RunUploadInput): RunUploadHandle {
  const store = useUploadStore.getState();
  const jobId = nextJobId();
  const controller = new AbortController();

  const job: UploadJob = store.enqueue({
    id: jobId,
    workspaceId: input.workspaceId,
    localUri: input.localUri,
    draftFields: {
      title: input.title,
      description: input.description,
      tagIds: input.tagIds,
      ctaId: input.ctaId,
      ctaUrl: input.ctaUrl,
    },
  });
  void job;
  PENDING_INPUTS.set(jobId, input);

  const cancel = (): void => {
    controller.abort();
    const current = useUploadStore.getState().jobs.find((j) => j.id === jobId);
    if (current && current.state !== 'done') {
      useUploadStore.getState().cancel(jobId);
    }
  };

  const result: Promise<{ post: Post; mediaKey: string }> = (async () => {
    try {
      // Wait our turn in the single-active queue.
      await waitForSlot(jobId, controller.signal);

      // Upload phase.
      useUploadStore.getState().update(jobId, {
        state: 'preparing',
        progressPct: 0,
      });

      const { mediaKey } = await uploadVideo(
        {
          workspaceId: input.workspaceId,
          localUri: input.localUri,
          sizeBytes: input.sizeBytes,
          // Hard rule: every upload boundary is video/mp4, even if the
          // container is .mov.
          mimeType: 'video/mp4',
          signal: controller.signal,
        },
        (pct) => {
          const pctClamped = Math.max(0, Math.min(1, pct));
          useUploadStore.getState().update(jobId, {
            state: 'uploading',
            progressPct: Math.round(pctClamped * 100),
          });
        },
      );

      useUploadStore.getState().update(jobId, {
        state: 'creating_post',
        mediaKey,
        progressPct: 100,
      });

      const ctaIdToSubmit: string = input.ctaId ?? '';
      const createInput: CreatePostInput = {
        title: input.title.trim(),
        description: input.description,
        tagIds: input.tagIds,
        ctaId: ctaIdToSubmit,
        ctaUrl: input.ctaUrl ?? undefined,
        mediaKey,
      };
      const post = await createPost(input.workspaceId, createInput);

      useUploadStore.getState().update(jobId, {
        state: 'done',
        progressPct: 100,
      });

      PENDING_INPUTS.delete(jobId);
      return { post, mediaKey };
    } catch (err) {
      if (isVideoPipelineError(err) && err.code === 'CANCELLED') {
        useUploadStore.getState().cancel(jobId);
        PENDING_INPUTS.delete(jobId);
        throw err;
      }
      const code = isVideoPipelineError(err)
        ? err.code
        : err instanceof Error
          ? 'GENERIC'
          : 'GENERIC';
      useUploadStore.getState().markFailed(jobId, code);
      throw err;
    }
  })();

  return { jobId, cancel, result };
}

// Place a job into the upload queue but defer the actual run until the network
// transitions to Wi-Fi (or the user manually resumes via the banner). Returns
// the jobId so callers can correlate it with later events.
export function enqueueWaitingWifi(input: EnqueueWaitingWifiInput): string {
  const jobId = nextJobId();
  const store = useUploadStore.getState();
  store.enqueue({
    id: jobId,
    workspaceId: input.workspaceId,
    localUri: input.localUri,
    draftFields: {
      title: input.title,
      description: input.description,
      tagIds: input.tagIds,
      ctaId: input.ctaId,
      ctaUrl: input.ctaUrl,
    },
  });
  store.update(jobId, { state: 'waiting_wifi' });
  PENDING_INPUTS.set(jobId, input);
  return jobId;
}

// Replay a previously enqueued job. If we have its inputs in memory we run
// the standard runUpload path. If not (e.g. after a force-quit), the caller
// should fall back to navigating the user to the composer to re-pick the
// file - the uploadStore alone does not retain dimensions / sizeBytes.
export function resumeUpload(jobId: string): RunUploadHandle | null {
  const input = PENDING_INPUTS.get(jobId);
  if (!input) return null;
  // Drop the existing record so runUpload re-enqueues with a fresh id and
  // the stale waiting_wifi entry can be removed by the caller if desired.
  PENDING_INPUTS.delete(jobId);
  return runUpload(input);
}
