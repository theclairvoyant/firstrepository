import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UploadState =
  | 'queued'
  | 'preparing'
  | 'transcoding'
  | 'uploading'
  | 'creating_post'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'waiting_wifi';

export type UploadDraftFields = {
  title: string;
  description: string;
  tagIds: string[];
  ctaId: string | null;
  ctaUrl: string | null;
};

export type UploadJob = {
  id: string;
  workspaceId: string;
  localUri: string;
  signedUrl: string | null;
  mediaKey: string | null;
  state: UploadState;
  progressPct: number;
  errorCode: string | null;
  draftFields: UploadDraftFields;
  createdAt: string;
  updatedAt: string;
};

interface UploadStoreState {
  jobs: UploadJob[];
  enqueue: (job: Omit<UploadJob, 'state' | 'progressPct' | 'errorCode' | 'createdAt' | 'updatedAt' | 'signedUrl' | 'mediaKey'> & {
    signedUrl?: string | null;
    mediaKey?: string | null;
  }) => UploadJob;
  update: (id: string, patch: Partial<UploadJob>) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  markFailed: (id: string, errorCode: string) => void;
  retry: (id: string) => void;
  clearTerminal: () => void;
  getActive: () => UploadJob | null;
  getQueued: () => UploadJob[];
  getResumable: () => UploadJob | null;
}

const TERMINAL: UploadState[] = ['done', 'cancelled'];
const RESUMABLE_FROM: UploadState[] = ['preparing', 'transcoding', 'uploading', 'creating_post', 'failed'];

export const useUploadStore = create<UploadStoreState>()(
  persist(
    (set, get) => ({
      jobs: [],

      enqueue: (input) => {
        const now = new Date().toISOString();
        const job: UploadJob = {
          id: input.id,
          workspaceId: input.workspaceId,
          localUri: input.localUri,
          signedUrl: input.signedUrl ?? null,
          mediaKey: input.mediaKey ?? null,
          state: 'queued',
          progressPct: 0,
          errorCode: null,
          draftFields: input.draftFields,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ jobs: [...state.jobs, job] }));
        return job;
      },

      update: (id, patch) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j,
          ),
        })),

      cancel: (id) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? { ...j, state: 'cancelled' as UploadState, updatedAt: new Date().toISOString() }
              : j,
          ),
        })),

      remove: (id) => set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

      markFailed: (id, errorCode) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  state: 'failed' as UploadState,
                  errorCode,
                  updatedAt: new Date().toISOString(),
                }
              : j,
          ),
        })),

      retry: (id) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  state: 'queued' as UploadState,
                  progressPct: 0,
                  errorCode: null,
                  updatedAt: new Date().toISOString(),
                }
              : j,
          ),
        })),

      clearTerminal: () =>
        set((state) => ({ jobs: state.jobs.filter((j) => !TERMINAL.includes(j.state)) })),

      getActive: () => {
        const j = get().jobs.find(
          (x) =>
            x.state === 'preparing' ||
            x.state === 'transcoding' ||
            x.state === 'uploading' ||
            x.state === 'creating_post',
        );
        return j ?? null;
      },

      getQueued: () => get().jobs.filter((j) => j.state === 'queued' || j.state === 'waiting_wifi'),

      getResumable: () => {
        const j = get().jobs.find((x) => RESUMABLE_FROM.includes(x.state));
        return j ?? null;
      },
    }),
    {
      name: 'enterprise-creator.uploads',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ jobs: state.jobs }),
    },
  ),
);
