import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ec.tenant.v1';

type Persisted = {
  activeWorkspaceId: string | null;
  lastActiveWorkspaceId: string | null;
};

export type TenantState = Persisted & {
  isHydrated: boolean;
  setActive: (id: string | null) => Promise<void>;
  clear: () => Promise<void>;
  hydrate: () => Promise<void>;
};

async function persist(state: Persisted): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export const useTenantStore = create<TenantState>((set, get) => ({
  activeWorkspaceId: null,
  lastActiveWorkspaceId: null,
  isHydrated: false,

  setActive: async (id) => {
    const prev = get().activeWorkspaceId;
    const next: Persisted = {
      activeWorkspaceId: id,
      lastActiveWorkspaceId: prev ?? get().lastActiveWorkspaceId,
    };
    set(next);
    await persist(next);
  },

  clear: async () => {
    const next: Persisted = { activeWorkspaceId: null, lastActiveWorkspaceId: null };
    set(next);
    await AsyncStorage.removeItem(KEY).catch(() => undefined);
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        set({
          activeWorkspaceId: parsed.activeWorkspaceId ?? null,
          lastActiveWorkspaceId: parsed.lastActiveWorkspaceId ?? null,
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
