// In-app camera helpers.
//
// The camera UI lives in `app/composer/record.tsx` because expo-camera's
// CameraView needs JSX context (refs, layout, etc.). This file exposes only
// the slim helpers that the screen needs: permission requests and a single
// `finalizeCameraResult` translator that converts the recordAsync result into
// the `PickedAsset` shape used by the rest of the pipeline.

import { Camera } from 'expo-camera';
import { getInfoAsync } from 'expo-file-system/legacy';
import type { PickedAsset } from './pickFromGallery';

export type CameraRecordingResult = {
  uri: string;
};

export async function requestCameraPermission(): Promise<boolean> {
  const res = await Camera.requestCameraPermissionsAsync();
  return res.granted;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  const res = await Camera.requestMicrophonePermissionsAsync();
  return res.granted;
}

// Convert the raw recordAsync result into a PickedAsset interchangeable with
// the gallery picker output. The CameraView is locked to 720p portrait so we
// fall back to 720x1280 when the underlying recording does not expose
// dimensions directly. The validator will reject anything that ends up off
// aspect.
export async function finalizeCameraResult(
  raw: CameraRecordingResult,
  durationMs: number,
  width?: number,
  height?: number,
  fileSize?: number | null,
  mimeType?: string | null,
): Promise<PickedAsset> {
  let resolvedSize: number | null =
    typeof fileSize === 'number' ? fileSize : null;
  if (resolvedSize === null) {
    try {
      const info = await getInfoAsync(raw.uri);
      if (info.exists && typeof info.size === 'number') {
        resolvedSize = info.size;
      }
    } catch {
      // Swallow; the validator will surface FILE_NOT_FOUND if the file is
      // genuinely missing.
    }
  }
  return {
    uri: raw.uri,
    mimeType: mimeType ?? null,
    width: width ?? 720,
    height: height ?? 1280,
    durationMs,
    fileSize: resolvedSize,
  };
}
