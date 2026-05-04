// SCAFFOLD mode: every endpoint resolves the in-memory mock.
// To switch to FULL mode, set EXPO_PUBLIC_MOCK_API=false in your .env (see
// .env.example) and EXPO_PUBLIC_API_BASE_URL to your backend. The SCAFFOLD
// default ships true so the app runs end-to-end with no backend.
import Constants from 'expo-constants';

function readMockFlag(): boolean {
  // process.env wins when present (string injected at build time by Metro).
  const raw: unknown = process.env.EXPO_PUBLIC_MOCK_API;
  if (typeof raw === 'string') {
    return raw.toLowerCase() !== 'false';
  }
  // Fall back to the manifest extra. app.config.ts maps the env var through
  // here so EAS builds where process.env is empty at runtime still resolve.
  // The value can come back as string, boolean, null, or undefined depending
  // on how the build was configured - handle each.
  const fromExtra: unknown = Constants.expoConfig?.extra?.mockApi;
  if (typeof fromExtra === 'string') {
    return fromExtra.toLowerCase() !== 'false';
  }
  if (typeof fromExtra === 'boolean') {
    return fromExtra;
  }
  // Default: SCAFFOLD on. Lets the app run end-to-end with no backend.
  return true;
}

export const MOCK_API: boolean = readMockFlag();

// Sentinel from the pre-config-ts era. Treated as missing so the FULL-mode
// guard fires loudly instead of silently sending requests to a dead host.
const SENTINEL_BASE_URL = 'https://api.example.invalid';

function readBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  return SENTINEL_BASE_URL;
}

// Base URL for the real backend. Read at module load. In SCAFFOLD this can be
// the sentinel (the wrappers never invoke axios). In FULL the client refuses
// to fire any request when this is missing or still the sentinel.
export const API_BASE_URL: string = readBaseUrl();

export function isApiBaseUrlConfigured(): boolean {
  return API_BASE_URL !== SENTINEL_BASE_URL && API_BASE_URL.length > 0;
}

// Header constants.
export const HEADER_WORKSPACE = 'X-Workspace-Id';
export const HEADER_CLIENT = 'X-Client';
export const HEADER_CLIENT_VERSION = 'X-Client-Version';
export const HEADER_CLIENT_PLATFORM = 'X-Client-Platform';
export const HEADER_ACCEPT_LANGUAGE = 'Accept-Language';
export const HEADER_IDEMPOTENCY_KEY = 'Idempotency-Key';

export const CLIENT_NAME = 'enterprise-creator-mobile';

// Paths that must NOT receive X-Workspace-Id (per docs/06-api-contracts.md).
export const GLOBAL_PATH_PREFIXES: readonly string[] = [
  '/v1/auth/',
  '/v1/identity/',
  '/v1/invites/',
  '/v1/discovery/',
  '/v1/uploads/sign',
];

// Exact paths considered global as well.
export const GLOBAL_EXACT_PATHS: readonly string[] = ['/v1/memberships'];

// True when the URL path is global (no X-Workspace-Id).
export function isGlobalPath(path: string): boolean {
  if (GLOBAL_EXACT_PATHS.includes(path)) return true;
  // /v1/memberships/{id} is global.
  if (/^\/v1\/memberships\/[^/]+$/.test(path)) return true;
  for (const prefix of GLOBAL_PATH_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }
  return false;
}
