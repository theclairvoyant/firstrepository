// Typed wrapper for /v1/uploads/sign and /v1/uploads/complete.
// In SCAFFOLD mode the video uploader stub returns a fake mediaKey directly without
// invoking these. They are still exposed so FULL mode wiring is one switch away.

import { MOCK_API } from './config';
import { httpPost } from './client';
import * as mock from './mocks/upload';
import type {
  CompleteUploadInput,
  CompleteUploadResponse,
  SignUploadInput,
  SignUploadResponse,
} from '@/types/api';

export async function signUpload(input: SignUploadInput): Promise<SignUploadResponse> {
  if (MOCK_API) return mock.signUpload(input);
  return httpPost<SignUploadResponse>('/v1/uploads/sign', input);
}

export async function completeUpload(input: CompleteUploadInput): Promise<CompleteUploadResponse> {
  if (MOCK_API) return mock.completeUpload(input);
  return httpPost<CompleteUploadResponse>('/v1/uploads/complete', input);
}
