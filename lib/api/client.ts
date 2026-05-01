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
  HEADER_WORKSPACE,
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

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ---- Request interceptor ----------------------------------------------------

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Make sure we always have a real AxiosHeaders object to mutate.
  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers as Record<string, string> | undefined);

  const { jwt } = getAuthSnapshot();
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

  headers.set(HEADER_CLIENT, CLIENT_NAME);
  headers.set(HEADER_CLIENT_VERSION, appVersion());
  headers.set(HEADER_CLIENT_PLATFORM, platformTag());
  headers.set(HEADER_ACCEPT_LANGUAGE, activeLanguageTag());

  config.headers = headers;
  return config;
});

// ---- 401 single-flight refresh ---------------------------------------------

let inFlightRefresh: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = getAuthSnapshot();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/v1/auth/refresh`,
      { refreshToken },
      { timeout: 15000 },
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
