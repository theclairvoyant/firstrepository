import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ec.tenant.v1';

type Persisted = {
  activeWorkspaceId: string | null;
  lastActiveWorkspaceId: string | null;
  // User-set "open this workspace by default" preference. When set, the
  // boot router routes to this workspace before falling back to lastActive
  // or the first available membership.
  defaultWorkspaceId: string | null;
};

export type TenantState = Persisted & {
  isHydrated: boolean;
  setActive: (id: string | null) => Promise<void>;
  setDefault: (id: string | null) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
};

async function persist(state: Persisted): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export const useTenantStore = create<TenantState>((set, get) => ({
  activeWorkspaceId: null,
  lastActiveWorkspaceId: null,
  defaultWorkspaceId: null,
  isHydrated: false,

  setActive: async (id) => {
    const prev = get().activeWorkspaceId;
    const next: Persisted = {
      activeWorkspaceId: id,
      lastActiveWorkspaceId: prev ?? get().lastActiveWorkspaceId,
      defaultWorkspaceId: get().defaultWorkspaceId,
    };
    set(next);
    await persist(next);
  },

  setDefault: async (id) => {
    const next: Persisted = {
      activeWorkspaceId: get().activeWorkspaceId,
      lastActiveWorkspaceId: get().lastActiveWorkspaceId,
      defaultWorkspaceId: id,
    };
    set(next);
    await persist(next);
  },

  clear: async () => {
    const next: Persisted = {
      activeWorkspaceId: null,
      lastActiveWorkspaceId: null,
      defaultWorkspaceId: null,
    };
    set(next);
    await AsyncStorage.removeItem(KEY).catch(() => undefined);
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        set({
          activeWorkspaceId: parsed.activeWorkspaceId ?? null,
          lastActiveWorkspaceId: parsed.lastActiveWorkspaceId ?? null,
          defaultWorkspaceId: parsed.defaultWorkspaceId ?? null,
          isHydrated: true,
        });
        return;
      }
    } catch {
      // fall through to default
    }
    set({ isHydrated: true });
  },
}));

// Synchronous getter for axios interceptor.
export function getActiveWorkspaceId(): string | null {
  return useTenantStore.getState().activeWorkspaceId;
}
