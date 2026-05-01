import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { EnterpriseCreator } from '@/types/api';

const KEY_JWT = 'ec.auth.jwt';
const KEY_REFRESH = 'ec.auth.refresh';

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
    const jwt = (await SecureStore.getItemAsync(KEY_JWT).catch(() => null)) ?? null;
    const refreshToken = (await SecureStore.getItemAsync(KEY_REFRESH).catch(() => null)) ?? null;
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
