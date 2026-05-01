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
import { nextRefreshJwt, seedState, simulateLatency } from './__seed';

export async function emailStart(_email: string): Promise<EmailStartResponse> {
  await simulateLatency(220);
  return { ok: true, ttlSeconds: 300 };
}

export async function emailVerify(email: string, code: string): Promise<AuthResponse> {
  await simulateLatency(280);
  if (code !== '123456') {
    throw new ApiError({
      code: 'INVALID_OTP',
      message: 'That code is not correct. Please try again.',
      status: 400,
      requestId: 'mock_req_otp',
    });
  }
  // Bind the seeded creator's email to the value supplied at sign-in if it differs.
  const creator = { ...seedState.creator, email: email || seedState.creator.email };
  seedState.creator = creator;
  return {
    jwt: 'mock_jwt',
    refreshToken: 'mock_refresh',
    identity: creator,
  };
}

export async function ssoExchange(_provider: SsoProvider, _idToken: string): Promise<AuthResponse> {
  await simulateLatency(320);
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
  return { ok: true };
}
