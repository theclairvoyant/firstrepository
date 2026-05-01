import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LanguageCode = 'en' | 'ar' | 'hi' | 'ml';
export type LanguagePreference = LanguageCode | 'system';

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['en', 'ar', 'hi', 'ml'] as const;

interface LanguageState {
  preference: LanguagePreference;
  resolved: LanguageCode;
  setPreference: (pref: LanguagePreference) => void;
  setResolved: (code: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      preference: 'system',
      resolved: 'en',
      setPreference: (preference) => set({ preference }),
      setResolved: (resolved) => set({ resolved }),
    }),
    {
      name: 'enterprise-creator.language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference, resolved: state.resolved }),
    },
  ),
);
