// SCAFFOLD mode: every endpoint resolves the in-memory mock.
// To switch to FULL mode, flip MOCK_API to false. Each wrapper checks this constant
// at call time and dispatches accordingly.
export const MOCK_API: boolean = true;

// Base URL for the real backend. Read at module load. Safe to import even in SCAFFOLD
// since axios is created with this value but never invoked.
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.invalid';

// Header constants.
export const HEADER_WORKSPACE = 'X-Workspace-Id';
export const HEADER_CLIENT = 'X-Client';
export const HEADER_CLIENT_VERSION = 'X-Client-Version';
export const HEADER_CLIENT_PLATFORM = 'X-Client-Platform';
export const HEADER_ACCEPT_LANGUAGE = 'Accept-Language';

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
