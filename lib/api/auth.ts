// Typed wrapper for /v1/auth/*. Routes through mocks in SCAFFOLD mode, axios in FULL.

import { MOCK_API } from './config';
import { httpPost } from './client';
import * as mock from './mocks/auth';
import type {
  AuthResponse,
  EmailStartResponse,
  RefreshResponse,
  SignOutResponse,
  SsoProvider,
} from '@/types/api';

export async function emailStart(email: string): Promise<EmailStartResponse> {
  if (MOCK_API) return mock.emailStart(email);
  return httpPost<EmailStartResponse>('/v1/auth/email/start', { email });
}

export async function emailVerify(email: string, code: string): Promise<AuthResponse> {
  if (MOCK_API) return mock.emailVerify(email, code);
  return httpPost<AuthResponse>('/v1/auth/email/verify', { email, code });
}

export async function ssoExchange(provider: SsoProvider, idToken: string): Promise<AuthResponse> {
  if (MOCK_API) return mock.ssoExchange(provider, idToken);
  return httpPost<AuthResponse>('/v1/auth/sso/exchange', { provider, idToken });
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  if (MOCK_API) return mock.refresh(refreshToken);
  return httpPost<RefreshResponse>('/v1/auth/refresh', { refreshToken });
}

export async function signOut(pushTokenId?: string): Promise<SignOutResponse> {
  if (MOCK_API) return mock.signOut(pushTokenId);
  return httpPost<SignOutResponse>('/v1/auth/signout', { pushTokenId });
}
