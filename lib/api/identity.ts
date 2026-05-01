// Typed wrapper for /v1/identity/*.

import { MOCK_API } from './config';
import { httpDelete, httpGet, httpPatch, httpPost } from './client';
import * as mock from './mocks/identity';
import type {
  AvatarUploadResponse,
  CreateProfileInput,
  DeleteMeResponse,
  DeletePushTokenResponse,
  EnterpriseCreator,
  IdentityMeResponse,
  PatchMeInput,
  RegisterPushTokenInput,
  RegisterPushTokenResponse,
  UsernameAvailableResponse,
} from '@/types/api';

export async function me(): Promise<IdentityMeResponse> {
  if (MOCK_API) return mock.me();
  return httpGet<IdentityMeResponse>('/v1/identity/me');
}

export async function createProfile(input: CreateProfileInput): Promise<EnterpriseCreator> {
  if (MOCK_API) return mock.createProfile(input);
  return httpPost<EnterpriseCreator>('/v1/identity/profile', input);
}

export async function patchMe(input: PatchMeInput): Promise<EnterpriseCreator> {
  if (MOCK_API) return mock.patchMe(input);
  return httpPatch<EnterpriseCreator>('/v1/identity/me', input);
}

export async function deleteMe(): Promise<DeleteMeResponse> {
  if (MOCK_API) return mock.deleteMe();
  return httpDelete<DeleteMeResponse>('/v1/identity/me');
}

// Avatar upload uses multipart in FULL mode. The video pipeline (or a future image
// uploader) calls this with a FormData payload. SCAFFOLD ignores the payload.
export async function uploadAvatar(form?: FormData): Promise<AvatarUploadResponse> {
  if (MOCK_API) return mock.uploadAvatar();
  return httpPost<AvatarUploadResponse>('/v1/identity/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function usernameAvailable(candidate: string): Promise<UsernameAvailableResponse> {
  if (MOCK_API) return mock.usernameAvailable(candidate);
  return httpGet<UsernameAvailableResponse>('/v1/identity/username/available', {
    params: { candidate },
  });
}

export async function registerPushToken(
  input: RegisterPushTokenInput,
): Promise<RegisterPushTokenResponse> {
  if (MOCK_API) return mock.registerPushToken(input);
  return httpPost<RegisterPushTokenResponse>('/v1/identity/push-tokens', input);
}

export async function deletePushToken(id: string): Promise<DeletePushTokenResponse> {
  if (MOCK_API) return mock.deletePushToken(id);
  return httpDelete<DeletePushTokenResponse>(`/v1/identity/push-tokens/${id}`);
}
