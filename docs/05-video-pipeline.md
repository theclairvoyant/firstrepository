# Video Upload Pipeline

This is the most failure-prone part of the app. Five stages with explicit handling for the platform reality.

## Operating mode behavior

- **SCAFFOLD**: validate locally, simulate upload with 3s timer
- **FULL**: real signed-URL upload, conditional client-side compression, resumability, background continuation

## Platform reality

| Source | Codec | Container |
|--------|-------|-----------|
| iPhone gallery (default) | HEVC (H.265) | .MOV |
| iPhone gallery ("Most Compatible") | H.264 | .MOV |
| iPhone HDR / Dolby Vision (iPhone 12+) | HEVC HDR | .MOV |
| Android gallery (most) | H.264 | .mp4 |
| Android gallery (S20+ / Pixel 6+ at 4K) | HEVC | .mp4 |
| iPhone in-app camera at 720p | H.264 | .mov |
| Android in-app camera at 720p | H.264 | .mp4 |

The pipeline always produces H.264 video, AAC audio, 720p or below at the upload boundary. Container can be .mov or .mp4.

## Gallery pick - `lib/video/pickFromGallery.ts`

```ts
import * as ImagePicker from 'expo-image-picker';
import { useTenantStore } from '@/lib/store/tenantStore';

export async function pickVideoFromGallery() {
  const { activeWorkspace } = useTenantStore.getState();
  const maxSeconds = activeWorkspace?.capabilities.maxVideoSeconds ?? 60;

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('PERMISSION_DENIED');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
    videoMaxDuration: maxSeconds,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  });

  if (result.canceled) return null;
  return result.assets[0];
}
```

iOS triggers AVAssetExportSession to transcode HEVC -> H.264 720p. Shows OS "Compressing" progress bar. Android: option is no-op but most sources are already H.264 MP4.

## Camera record - `lib/video/recordWithCamera.ts`

```ts
const recording = await cameraRef.current.recordAsync({
  maxDuration: workspace.capabilities.maxVideoSeconds,
  quality: '720p',
  mute: false,
});
```

Cap recordings at 720p for predictable codec output.

## Validate - `lib/video/validateMedia.ts`

```ts
import * as FileSystem from 'expo-file-system';

export async function validateMedia(input, capabilities) {
  const info = await FileSystem.getInfoAsync(input.uri, { size: true });
  if (!info.exists) throw new ValidationError('FILE_NOT_FOUND');

  const sizeMB = info.size / (1024 * 1024);
  const durationSec = input.durationMs / 1000;
  const aspectRatio = input.width / input.height;
  const target = 9 / 16;

  if (durationSec > capabilities.maxVideoSeconds) throw new ValidationError('DURATION_TOO_LONG', { limit: capabilities.maxVideoSeconds });
  if (sizeMB > capabilities.maxFileSizeMB) throw new ValidationError('FILE_TOO_LARGE', { limitMB: capabilities.maxFileSizeMB });
  if (Math.abs(aspectRatio - target) > 0.1) throw new ValidationError('ASPECT_RATIO_INVALID');
  if (input.width === 0 || input.height === 0) throw new ValidationError('UNREADABLE');

  return { ...input, sizeBytes: info.size };
}
```

Each error code maps to an i18n key.

## Conditional transcode - `lib/video/transcode.ts` (FULL mode only)

Not in SCAFFOLD. Uses react-native-compressor when needed (size > 100MB or width > 1280).

## Cellular warning

Before starting any upload, check NetInfo. If cellular and file > 25MB, show CellularWarningSheet with "Wait for Wi-Fi" (queues, auto-resumes via NetInfo listener) or "Upload now".

## Upload (FULL mode) - `lib/video/uploader.ts`

Two-step signed URL flow.

Step 1: POST `/v1/uploads/sign` -> `{ uploadUrl, mediaKey, method, fields?, partSize?, expiresAt }`.
Step 2: PUT/POST file bytes via `expo-file-system` createUploadTask with progress callbacks. Always Content-Type: video/mp4.
Step 3: POST `/v1/workspaces/{id}/posts` with mediaKey + metadata.

## Upload (SCAFFOLD mode) - `lib/video/uploader.ts`

```ts
export async function uploadVideo(localUri: string, onProgress: (pct: number) => void) {
  const totalMs = 3000;
  const stepMs = 50;
  const steps = totalMs / stepMs;
  for (let i = 0; i <= steps; i++) {
    await new Promise(r => setTimeout(r, stepMs));
    onProgress(i / steps);
  }
  return { mediaKey: `mock_${Date.now()}` };
}
```

## Resume and retry - `uploadStore`

```ts
type UploadJob = {
  id: string;
  workspaceId: string;
  localUri: string;
  signedUrl?: string;
  mediaKey?: string;
  state: 'queued' | 'preparing' | 'transcoding' | 'uploading' | 'creating_post' | 'done' | 'failed' | 'cancelled' | 'waiting_wifi';
  progressPct: number;
  errorCode?: string;
  draftFields: { title; description; tagIds; ctaId; ctaUrl? };
  createdAt: string;
};
```

Concurrency: max 1 active upload. Additional submissions queue. Persisted to AsyncStorage so force-quit recovers via "Resume upload" banner.

## Background behavior (FULL mode)

| Platform | Behavior |
|----------|----------|
| Android | Continues via expo-task-manager |
| iOS | OS suspends after ~30s in background. Active upload pauses. On foreground, resume from last successful chunk (S3 multipart) or restart. |

For files over 50MB, show "Keep this screen open for fastest upload" hint.

## UI feedback

- Profile sticky UploadProgressBanner above grid. Active job shows %. Queue depth shown if > 0. Cancel link.
- Skeleton tile at position 0 in grid with progress ring overlay. Becomes real VideoTile on success.

On failure: banner turns red with retry. Draft preserved in draftStore.
