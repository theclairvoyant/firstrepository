// Mock /v1/identity/* endpoints.

import { ApiError } from '@/types/api';
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
import { useAuthStore } from '@/lib/store/authStore';
import {
  nextPushTokenId,
  readPersistedHasCreatorProfile,
  readPersistedHasJoinedAnyWorkspace,
  seedState,
  simulateLatency,
  writePersistedHasCreatorProfile,
} from './__seed';

const TAKEN_USERNAMES = new Set<string>(['admin', 'kiran', 'support', 'team']);

export async function me(): Promise<IdentityMeResponse> {
  await simulateLatency(260);
  if (!useAuthStore.getState().jwt) {
    return { creator: null, memberships: [] };
  }
  // hasCreatorProfile is in-memory and resets on cold start, but the JWT
  // persists across launches. Without a persistent flag, returning users
  // would land back on profile-setup forever. Read the persisted flag
  // and sync it into seedState so the rest of the mock surface matches.
  if (!seedState.hasCreatorProfile) {
    const persisted = await readPersistedHasCreatorProfile();
    if (persisted) {
      seedState.hasCreatorProfile = true;
    }
  }
  if (!seedState.hasCreatorProfile) {
    return { creator: null, memberships: [] };
  }
  // Memberships are gated behind "have you joined anything yet?" so a
  // freshly verified user lands on the no-workspace empty state instead of
  // pre-seeded sample memberships. The flag flips on the first redeem /
  // request and is cleared on signOut.
  if (!seedState.hasJoinedAnyWorkspace) {
    const persistedJoin = await readPersistedHasJoinedAnyWorkspace();
    if (persistedJoin) {
      seedState.hasJoinedAnyWorkspace = true;
    }
  }
  return {
    creator: seedState.creator,
    memberships: seedState.hasJoinedAnyWorkspace ? seedState.memberships : [],
  };
}

export async function createProfile(input: CreateProfileInput): Promise<EnterpriseCreator> {
  await simulateLatency(300);
  if (TAKEN_USERNAMES.has(input.globalUsername.toLowerCase()) && input.globalUsername.toLowerCase() !== 'kiran') {
    throw new ApiError({
      code: 'CONFLICT',
      message: 'That username is taken.',
      status: 409,
    });
  }
  const next: EnterpriseCreator = {
    ...seedState.creator,
    firstName: input.firstName,
    lastName: input.lastName,
    globalUsername: input.globalUsername,
    avatarUrl: input.avatarUrl ?? seedState.creator.avatarUrl,
    phone: input.phone ?? seedState.creator.phone,
    phoneVerified: false,
  };
  seedState.creator = next;
  seedState.hasCreatorProfile = true;
  await writePersistedHasCreatorProfile(true);
  return next;
}

export async function patchMe(input: PatchMeInput): Promise<EnterpriseCreator> {
  await simulateLatency(280);
  const next: EnterpriseCreator = {
    ...seedState.creator,
    firstName: input.firstName ?? seedState.creator.firstName,
    lastName: input.lastName ?? seedState.creator.lastName,
    globalUsername: input.globalUsername ?? seedState.creator.globalUsername,
    phone: input.phone ?? seedState.creator.phone,
  };
  seedState.creator = next;
  return next;
}

export async function deleteMe(): Promise<DeleteMeResponse> {
  await simulateLatency(330);
  return { ok: true, deletedAt: new Date().toISOString() };
}

export async function uploadAvatar(): Promise<AvatarUploadResponse> {
  await simulateLatency(360);
  const url = 'https://example.com/avatars/kiran.jpg';
  seedState.creator = { ...seedState.creator, avatarUrl: url };
  return { avatarUrl: url };
}

export async function usernameAvailable(candidate: string): Promise<UsernameAvailableResponse> {
  await simulateLatency(220);
  const lower = candidate.trim().toLowerCase();
  if (!lower) return { available: false };
  return { available: !TAKEN_USERNAMES.has(lower) };
}

export async function registerPushToken(
  _input: RegisterPushTokenInput,
): Promise<RegisterPushTokenResponse> {
  await simulateLatency(240);
  return { id: nextPushTokenId() };
}

export async function deletePushToken(_id: string): Promise<DeletePushTokenResponse> {
  await simulateLatency(210);
  return { ok: true };
}
