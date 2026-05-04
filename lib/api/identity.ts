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

// SCAFFOLD-only sentinel URI. profile-setup and edit-global-profile default
// the avatar field to "silhouette:#RRGGBB" when the user hasn't picked a
// gallery photo. The Avatar component renders these as a face icon over a
// background swatch. The real backend has no concept of silhouette URIs and
// would persist the literal string, breaking <Image source={{ uri }} /> for
// every other consumer. Strip them at the wire boundary.
function isSilhouetteUri(uri: string | undefined | null): boolean {
  return typeof uri === 'string' && uri.startsWith('silhouette:');
}

function scrubAvatarUrl<T extends { avatarUrl?: string }>(input: T): T {
  if (input.avatarUrl !== undefined && isSilhouetteUri(input.avatarUrl)) {
    const { avatarUrl: _drop, ...rest } = input;
    void _drop;
    return rest as T;
  }
  return input;
}

export async function me(): Promise<IdentityMeResponse> {
  if (MOCK_API) return mock.me();
  return httpGet<IdentityMeResponse>('/v1/identity/me');
}

export async function createProfile(input: CreateProfileInput): Promise<EnterpriseCreator> {
  const cleaned = scrubAvatarUrl(input);
  if (MOCK_API) return mock.createProfile(cleaned);
  return httpPost<EnterpriseCreator>('/v1/identity/profile', cleaned);
}

export async function patchMe(input: PatchMeInput): Promise<EnterpriseCreator> {
  // PatchMeInput has no avatarUrl field today, but if a future caller adds
  // one (e.g. when the avatar upload endpoint is consolidated), the scrub
  // already covers it. TODO(schema): docs/06-api-contracts.md does not list
  // `phone` on PATCH /v1/identity/me. The shape is collected by
  // edit-global-profile today; align with the CTO before depending on it
  // server-side.
  const cleaned = scrubAvatarUrl(input as PatchMeInput & { avatarUrl?: string });
  if (MOCK_API) return mock.patchMe(cleaned);
  return httpPatch<EnterpriseCreator>('/v1/identity/me', cleaned);
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
