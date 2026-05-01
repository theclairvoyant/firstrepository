import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ComposerDraft = {
  workspaceId: string;
  localUri: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  title: string;
  description: string;
  tagIds: string[];
  ctaId: string | null;
  ctaUrl: string | null;
  updatedAt: string;
};

interface DraftState {
  drafts: Record<string, ComposerDraft>;
  getDraft: (workspaceId: string) => ComposerDraft | null;
  setDraft: (draft: ComposerDraft) => void;
  patchDraft: (workspaceId: string, patch: Partial<ComposerDraft>) => void;
  clearDraft: (workspaceId: string) => void;
  clearAll: () => void;
}

const emptyDraft = (workspaceId: string): ComposerDraft => ({
  workspaceId,
  localUri: null,
  durationMs: null,
  width: null,
  height: null,
  title: '',
  description: '',
  tagIds: [],
  ctaId: null,
  ctaUrl: null,
  updatedAt: new Date(0).toISOString(),
});

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      getDraft: (workspaceId) => get().drafts[workspaceId] ?? null,

      setDraft: (draft) =>
        set((state) => ({
          drafts: { ...state.drafts, [draft.workspaceId]: draft },
        })),

      patchDraft: (workspaceId, patch) =>
        set((state) => {
          const current = state.drafts[workspaceId] ?? emptyDraft(workspaceId);
          const next: ComposerDraft = {
            ...current,
            ...patch,
            workspaceId,
            updatedAt: new Date().toISOString(),
          };
          return { drafts: { ...state.drafts, [workspaceId]: next } };
        }),

      clearDraft: (workspaceId) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[workspaceId];
          return { drafts: next };
        }),

      clearAll: () => set({ drafts: {} }),
    }),
    {
      name: 'enterprise-creator.drafts',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
