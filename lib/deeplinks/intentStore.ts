import { create } from 'zustand';
import type { DeeplinkIntent } from './parser';

interface IntentState {
  pending: DeeplinkIntent | null;
  setPending: (intent: DeeplinkIntent | null) => void;
  consume: () => DeeplinkIntent | null;
}

export const useDeeplinkIntentStore = create<IntentState>((set, get) => ({
  pending: null,
  setPending: (intent) => set({ pending: intent }),
  consume: () => {
    const intent = get().pending;
    if (intent) set({ pending: null });
    return intent;
  },
}));
