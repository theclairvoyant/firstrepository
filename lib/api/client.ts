// Axios client for the Enterprise Creator app. In SCAFFOLD mode this client is
// constructed but never invoked at runtime (every wrapper short-circuits to the mock
// when MOCK_API is true). In FULL mode the wrappers route here.
//
// Headers and per-workspace logic match docs/06-api-contracts.md.

import axios, { AxiosError, AxiosHeaders } from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  API_BASE_URL,
  CLIENT_NAME,
  HEADER_ACCEPT_LANGUAGE,
  HEADER_CLIENT,
  HEADER_CLIENT_PLATFORM,
  HEADER_CLIENT_VERSION,
  HEADER_IDEMPOTENCY_KEY,
  HEADER_WORKSPACE,
  MOCK_API,
  isApiBaseUrlConfigured,
  isGlobalPath,
} from './config';
import { getAuthSnapshot, useAuthStore } from '@/lib/store/authStore';
import { getActiveWorkspaceId } from '@/lib/store/tenantStore';
import { dispatchUnauthorized } from './navigation';
import { ApiError } from '@/types/api';
import type { ApiErrorEnvelope, RefreshResponse } from '@/types/api';

// Track in-flight retry attempts to avoid loops.
type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

function appVersion(): string {
  // expo-constants surfaces version in different fields depending on managed vs bare.
  // Falling through is fine; do not throw inside the interceptor.
  const cfg = Constants.expoConfig;
  const v = cfg && typeof cfg.version === 'string' ? cfg.version : undefined;
  return v ?? '0.0.0';
}

function platformTag(): string {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return Platform.OS;
}

function activeLanguageTag(): string {
  // expo-localization v17 returns a Locale[] from getLocales(); the first entry's
  // languageTag is the user's preferred locale (e.g. "en-US").
  const locales = Localization.getLocales();
  if (locales.length > 0 && typeof locales[0].languageTag === 'string') {
    return locales[0].languageTag;
  }
  return 'en';
}

// Idempotency key for non-idempotent verbs. The backend uses this to dedupe
// retried POST/PATCH/DELETE within a short window. We do not depend on
// expo-crypto (not installed); a JS-side RFC4122 v4 generator is sufficient
// for an opaque per-request token. Backend treats it as opaque.
function generateIdempotencyKey(): string {
  const cryptoLike = (globalThis as unknown as {
    crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array };
  }).crypto;
  if (cryptoLike?.randomUUID) {
    try {
      return cryptoLike.randomUUID();
    } catch {
      // fall through
    }
  }
  // Fallback: 16 random bytes. Use crypto.getRandomValues if available, else
  // Math.random. On RN+Hermes neither global crypto nor randomUUID is
  // guaranteed; the Math.random path is acceptable for an opaque dedupe key
  // (not a security token).
  const bytes = new Uint8Array(16);
  if (cryptoLike?.getRandomValues) {
    cryptoLike.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Per RFC 4122 4.4: set version (0100) and variant (10).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) hex.push(bytes[i].toString(16).padStart(2, '0'));
  return (
    `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  );
}

function isMutating(method: string | undefined): boolean {
  if (!method) return false;
  const m = method.toLowerCase();
  return m === 'post' || m === 'patch' || m === 'delete' || m === 'put';
}

// Build the four telemetry headers. Centralized so the refresh call attaches
// the same set as regular requests (the prior bare axios.post stripped them).
function telemetryHeaders(): Record<string, string> {
  return {
    [HEADER_CLIENT]: CLIENT_NAME,
    [HEADER_CLIENT_VERSION]: appVersion(),
    [HEADER_CLIENT_PLATFORM]: platformTag(),
    [HEADER_ACCEPT_LANGUAGE]: activeLanguageTag(),
  };
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ---- Request interceptor ----------------------------------------------------

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // FULL-mode safety net: refuse to fire if the base URL was never configured
  // (i.e. someone shipped without setting EXPO_PUBLIC_API_BASE_URL). SCAFFOLD
  // never reaches this interceptor because wrappers short-circuit, so this
  // only triggers in FULL.
  if (!MOCK_API && !isApiBaseUrlConfigured()) {
    // eslint-disable-next-line no-console
    console.error(
      '[api] EXPO_PUBLIC_API_BASE_URL is not configured. Refusing to send request to ' +
        (config.url ?? '<unknown>') +
        '. Set the env var via eas.json or your local .env and rebuild.',
    );
    throw new ApiError({
      code: 'INTERNAL',
      message: 'API base URL is not configured.',
      status: 0,
    });
  }

  // Mock-token guard: if the persisted JWT is a SCAFFOLD-mode sentinel
  // ("mock_*") and we're now in FULL, force sign-out before the request fires.
  // The hydrate-time guard in authStore catches the cold-boot case; this
  // catches any race where a request races the guard.
  const { jwt } = getAuthSnapshot();
  if (!MOCK_API && jwt && jwt.startsWith('mock_')) {
    void dispatchUnauthorized();
    throw new ApiError({
      code: 'UNAUTHENTICATED',
      message: 'Stale mock session. Please sign in again.',
      status: 401,
    });
  }

  // Make sure we always have a real AxiosHeaders object to mutate.
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers as Record<string, string> | undefined);

  if (jwt) {
    headers.set('Authorization', `Bearer ${jwt}`);
  }

  const path = config.url ?? '';
  if (!isGlobalPath(path)) {
    const wsId = getActiveWorkspaceId();
    if (wsId) {
      headers.set(HEADER_WORKSPACE, wsId);
    }
  }

  const tele = telemetryHeaders();
  for (const k of Object.keys(tele)) headers.set(k, tele[k]);

  // Idempotency-Key for mutations. Skip if a wrapper already supplied one
  // (e.g. for explicit retry semantics).
  if (isMutating(config.method) && !headers.has(HEADER_IDEMPOTENCY_KEY)) {
    headers.set(HEADER_IDEMPOTENCY_KEY, generateIdempotencyKey());
  }

  config.headers = headers;
  return config;
});

// ---- 401 single-flight refresh ---------------------------------------------

let inFlightRefresh: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = getAuthSnapshot();
  if (!refreshToken) return null;
  try {
    // Bare axios.post here so the response interceptor doesn't recursively
    // attempt another refresh on a 401 from the refresh endpoint itself.
    // We must manually attach the same telemetry headers the request
    // interceptor would have, otherwise the backend's per-platform
    // rate-limiting and analytics see refresh attempts as anonymous traffic.
    const res = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/v1/auth/refresh`,
      { refreshToken },
      {
        timeout: 15000,
        headers: telemetryHeaders(),
      },
    );
    const next = res.data;
    if (!next || typeof next.jwt !== 'string') return null;
    await useAuthStore.getState().setTokens(next.jwt, next.refreshToken);
    return next.jwt;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

// ---- Response interceptor ---------------------------------------------------

function asEnvelope(data: unknown): ApiErrorEnvelope | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'object' &&
    (data as { error: unknown }).error !== null
  ) {
    const env = (data as { error: { code?: unknown; message?: unknown; requestId?: unknown } }).error;
    if (typeof env.code === 'string' && typeof env.message === 'string') {
      return {
        error: {
          code: env.code,
          message: env.message,
          requestId: typeof env.requestId === 'string' ? env.requestId : undefined,
        },
      };
    }
  }
  return null;
}

function toApiError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0;
  const env = asEnvelope(err.response?.data);
  if (env) {
    return new ApiError({
      code: env.error.code,
      message: env.error.message,
      status,
      requestId: env.error.requestId,
    });
  }
  return new ApiError({
    code: status === 0 ? 'NETWORK' : 'INTERNAL',
    message: err.message || 'Request failed.',
    status,
  });
}

http.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status ?? 0;
    const path = config?.url ?? '';

    // Single-flight refresh for 401s, except on the refresh endpoint itself.
    if (status === 401 && config && !config._retried && path !== '/v1/auth/refresh') {
      config._retried = true;
      const newJwt = await refreshOnce();
      if (newJwt) {
        const headers =
          config.headers instanceof AxiosHeaders
            ? config.headers
            : new AxiosHeaders(config.headers as Record<string, string> | undefined);
        headers.set('Authorization', `Bearer ${newJwt}`);
        config.headers = headers;
        try {
          return await http.request(config);
        } catch (retryErr) {
          if (retryErr instanceof AxiosError && retryErr.response?.status === 401) {
            await dispatchUnauthorized();
          }
          throw retryErr instanceof AxiosError ? toApiError(retryErr) : retryErr;
        }
      }
      // Refresh failed: clear stores and bubble up.
      await dispatchUnauthorized();
    }

    throw toApiError(error);
  },
);

// ---- Tiny ergonomic helpers used by wrappers --------------------------------

export async function httpGet<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<T>(path, config);
  return res.data;
}

export async function httpPost<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.post<T>(path, body, config);
  return res.data;
}

export async function httpPatch<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.patch<T>(path, body, config);
  return res.data;
}

export async function httpDelete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<T>(path, config);
  return res.data;
}
