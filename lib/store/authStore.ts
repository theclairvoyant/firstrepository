import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EnterpriseCreator } from '@/types/api';
import { MOCK_API } from '@/lib/api/config';

const KEY_JWT = 'ec.auth.jwt';
const KEY_REFRESH = 'ec.auth.refresh';

// SCAFFOLD-only AsyncStorage keys defined in lib/api/mocks/__seed.ts. We
// duplicate the literals here so authStore can best-effort wipe them on FULL
// boot without importing the mock module (which would pull mock seed data
// into the production bundle path).
const MOCK_KEY_HAS_CREATOR_PROFILE = 'ec.mock.hasCreatorProfile';
const MOCK_KEY_HAS_JOINED_ANY_WORKSPACE = 'ec.mock.hasJoinedAnyWorkspace';

export type AuthState = {
  jwt: string | null;
  refreshToken: string | null;
  creator: EnterpriseCreator | null;
  isHydrated: boolean;
  signIn: (jwt: string, refreshToken: string, creator: EnterpriseCreator | null) => Promise<void>;
  setCreator: (creator: EnterpriseCreator | null) => void;
  setTokens: (jwt: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  refreshToken: null,
  creator: null,
  isHydrated: false,

  signIn: async (jwt, refreshToken, creator) => {
    await SecureStore.setItemAsync(KEY_JWT, jwt);
    await SecureStore.setItemAsync(KEY_REFRESH, refreshToken);
    set({ jwt, refreshToken, creator });
  },

  setCreator: (creator) => set({ creator }),

  setTokens: async (jwt, refreshToken) => {
    await SecureStore.setItemAsync(KEY_JWT, jwt);
    await SecureStore.setItemAsync(KEY_REFRESH, refreshToken);
    set({ jwt, refreshToken });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(KEY_JWT).catch(() => undefined);
    await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => undefined);
    set({ jwt: null, refreshToken: null, creator: null });
  },

  hydrate: async () => {
    let jwt = (await SecureStore.getItemAsync(KEY_JWT).catch(() => null)) ?? null;
    let refreshToken = (await SecureStore.getItemAsync(KEY_REFRESH).catch(() => null)) ?? null;

    // Mock-token guard: if FULL mode is active but the persisted JWT was
    // created under SCAFFOLD ("mock_*"), wipe it before any request fires.
    // Otherwise the axios interceptor would forward the literal string
    // "mock_jwt" as a Bearer token to the real backend, which would 401 and
    // attempt a refresh with an equally fake refresh token.
    if (!MOCK_API && jwt && jwt.startsWith('mock_')) {
      await SecureStore.deleteItemAsync(KEY_JWT).catch(() => undefined);
      await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => undefined);
      jwt = null;
      refreshToken = null;
    }

    // Cleanup: wipe SCAFFOLD-only AsyncStorage keys when running FULL. They
    // are inert in FULL but bloat persistent storage and can confuse anyone
    // inspecting the app's data dir. Best-effort; never blocks hydration.
    if (!MOCK_API) {
      await Promise.allSettled([
        AsyncStorage.removeItem(MOCK_KEY_HAS_CREATOR_PROFILE),
        AsyncStorage.removeItem(MOCK_KEY_HAS_JOINED_ANY_WORKSPACE),
      ]);
    }

    set({ jwt, refreshToken, isHydrated: true });
  },
}));

// Convenience hook re-export.
export const useAuth = useAuthStore;

// Synchronous getters for the axios interceptor (no hooks).
export function getAuthSnapshot(): { jwt: string | null; refreshToken: string | null } {
  const s = useAuthStore.getState();
  return { jwt: s.jwt, refreshToken: s.refreshToken };
}
