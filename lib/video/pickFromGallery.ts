// Gallery pick step of the video pipeline.
//
// Wraps `expo-image-picker.launchImageLibraryAsync` with the H264 720p export
// preset on iOS so HEVC clips are transcoded by AVAssetExportSession at pick
// time. On Android the preset is a no-op and most sources are already H.264 mp4.
//
// The caller is responsible for passing in `maxVideoSeconds` from the active
// workspace's capabilities. The picker enforces the same limit at the OS level
// where supported, but `validateMedia` is still authoritative.

import * as ImagePicker from 'expo-image-picker';
import { VideoPipelineError } from './errors';

export type PickedAsset = {
  uri: string;
  mimeType: string | null;
  width: number;
  height: number;
  durationMs: number;
  fileSize: number | null;
};

export type PickOptions = {
  maxVideoSeconds: number;
};

function normalizeDurationMs(rawDuration: number | null | undefined): number {
  if (rawDuration == null || Number.isNaN(rawDuration)) return 0;
  // expo-image-picker historically returned duration in seconds on some
  // platforms. Newer versions return milliseconds. Anything under 1000 we
  // assume is already in seconds (a sub-second clip would fail validation
  // anyway). Anything else is treated as ms.
  if (rawDuration > 0 && rawDuration < 1000) {
    return Math.round(rawDuration * 1000);
  }
  return Math.round(rawDuration);
}

export async function pickVideoFromGallery(
  opts: PickOptions,
): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new VideoPipelineError('PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: false,
    quality: 1,
    videoMaxDuration: opts.maxVideoSeconds,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    durationMs: normalizeDurationMs(asset.duration ?? null),
    fileSize: typeof asset.fileSize === 'number' ? asset.fileSize : null,
  };
}
