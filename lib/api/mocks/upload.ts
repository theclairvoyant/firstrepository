// Mock /v1/uploads/sign and /v1/uploads/complete.

import type {
  CompleteUploadInput,
  CompleteUploadResponse,
  SignUploadInput,
  SignUploadResponse,
} from '@/types/api';
import { simulateLatency } from './__seed';

export async function signUpload(_input: SignUploadInput): Promise<SignUploadResponse> {
  await simulateLatency(300);
  const ts = Date.now();
  return {
    uploadUrl: 'mock://upload',
    mediaKey: `mock_${ts}`,
    method: 'PUT',
    expiresAt: new Date(ts + 600 * 1000).toISOString(),
  };
}

export async function completeUpload(_input: CompleteUploadInput): Promise<CompleteUploadResponse> {
  await simulateLatency(280);
  return { ok: true, processingState: 'ready' };
}
