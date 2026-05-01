// Local validation pass. Runs after the picker / camera produces a
// `PickedAsset` and before the upload boundary.
//
// Each thrown error code maps 1:1 to an i18n key under `videoErrors.*`. When a
// limit is involved the caller can render the value via interpolation
// (e.g. `t('videoErrors.DURATION_TOO_LONG', err.params)`).

import { getInfoAsync } from 'expo-file-system/legacy';
import { VideoPipelineError } from './errors';
import type { PickedAsset } from './pickFromGallery';
import type { WorkspaceCapabilities } from '@/types/api';

export type ValidatedAsset = PickedAsset & { sizeBytes: number };

const ASPECT_TARGET = 9 / 16;
const ASPECT_TOLERANCE = 0.1;
const BYTES_PER_MB = 1024 * 1024;

export async function validateMedia(
  input: PickedAsset,
  capabilities: WorkspaceCapabilities,
): Promise<ValidatedAsset> {
  if (!input.uri) {
    throw new VideoPipelineError('FILE_NOT_FOUND');
  }

  let sizeBytes: number;
  try {
    const info = await getInfoAsync(input.uri);
    if (!info.exists) {
      throw new VideoPipelineError('FILE_NOT_FOUND');
    }
    sizeBytes = typeof info.size === 'number' ? info.size : (input.fileSize ?? 0);
  } catch (err) {
    if (err instanceof VideoPipelineError) throw err;
    throw new VideoPipelineError('UNREADABLE');
  }

  if (sizeBytes <= 0 && input.fileSize && input.fileSize > 0) {
    sizeBytes = input.fileSize;
  }

  const durationSec = input.durationMs / 1000;
  if (durationSec <= 0) {
    throw new VideoPipelineError('UNREADABLE');
  }
  if (durationSec > capabilities.maxVideoSeconds) {
    throw new VideoPipelineError('DURATION_TOO_LONG', {
      limit: capabilities.maxVideoSeconds,
    });
  }

  const sizeMB = sizeBytes / BYTES_PER_MB;
  if (sizeMB > capabilities.maxFileSizeMB) {
    throw new VideoPipelineError('FILE_TOO_LARGE', {
      limitMB: capabilities.maxFileSizeMB,
    });
  }

  if (input.width <= 0 || input.height <= 0) {
    throw new VideoPipelineError('UNREADABLE');
  }
  const aspect = input.width / input.height;
  if (Math.abs(aspect - ASPECT_TARGET) > ASPECT_TOLERANCE) {
    throw new VideoPipelineError('ASPECT_RATIO_INVALID');
  }

  return { ...input, sizeBytes };
}
