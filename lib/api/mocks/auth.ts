// Mock implementation of /v1/auth/*.
// Behaviors per the brief and docs/06-api-contracts.md.

import { ApiError } from '@/types/api';
import type {
  AuthResponse,
  EmailStartResponse,
  RefreshResponse,
  SignOutResponse,
  SsoProvider,
} from '@/types/api';
import {
  clearPersistedHasCreatorProfile,
  clearPersistedHasJoinedAnyWorkspace,
  nextRefreshJwt,
  seedState,
  simulateLatency,
  writePersistedHasCreatorProfile,
  writePersistedHasJoinedAnyWorkspace,
} from './__seed';

export async function emailStart(_email: string): Promise<EmailStartResponse> {
  await simulateLatency(220);
  return { ok: true, ttlSeconds: 300 };
}

export async function emailVerify(_email: string, code: string): Promise<AuthResponse> {
  await simulateLatency(280);
  if (code !== '123456') {
    throw new ApiError({
      code: 'INVALID_OTP',
      message: 'That code is not correct. Please try again.',
      status: 400,
      requestId: 'mock_req_otp',
    });
  }
  // Treat every email-verify in SCAFFOLD as a brand-new sign-up. The boot
  // router sees identity === null and routes to /(auth)/profile-setup so the
  // user creates their global creator profile, which is the canonical
  // first-run experience the real backend will mirror once a /me probe
  // returns 404 for unknown users.
  return {
    jwt: 'mock_jwt',
    refreshToken: 'mock_refresh',
    identity: null,
  };
}

export async function ssoExchange(_provider: SsoProvider, _idToken: string): Promise<AuthResponse> {
  await simulateLatency(320);
  // SSO is treated as a returning user with an existing creator profile and
  // existing memberships - skip the no-workspace empty state.
  seedState.hasCreatorProfile = true;
  seedState.hasJoinedAnyWorkspace = true;
  await writePersistedHasCreatorProfile(true);
  await writePersistedHasJoinedAnyWorkspace(true);
  return {
    jwt: 'mock_jwt',
    refreshToken: 'mock_refresh',
    identity: seedState.creator,
  };
}

export async function refresh(_refreshToken: string): Promise<RefreshResponse> {
  await simulateLatency(240);
  return {
    jwt: nextRefreshJwt(),
    refreshToken: 'mock_refresh',
  };
}

export async function signOut(_pushTokenId?: string): Promise<SignOutResponse> {
  await simulateLatency(210);
  // Reset mock state so the next sign-in starts fresh (and the next cold
  // reopen without a JWT lands on welcome instead of profile-setup).
  seedState.hasCreatorProfile = false;
  seedState.hasJoinedAnyWorkspace = false;
  await clearPersistedHasCreatorProfile();
  await clearPersistedHasJoinedAnyWorkspace();
  return { ok: true };
}
