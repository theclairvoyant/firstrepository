import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LanguageCode = 'en' | 'es' | 'fr' | 'hi' | 'ar';
export type LanguagePreference = LanguageCode | 'system';

// Single source of truth for the supported language set.
// Adding a new language is a 4-step contract:
//   1. Add the code to LanguageCode + SUPPORTED_LANGUAGES below.
//   2. Drop locales/<code>.json in the repo.
//   3. Import + register the JSON in lib/i18n/index.ts (the resources map).
//   4. Append display + native name keys to locales/en.json under
//      settings.language.<code> and settings.language.<code>Native.
// Nothing else has to change - the settings screens are data-driven over
// SUPPORTED_LANGUAGES and look the names up by code.
export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['en', 'es', 'fr', 'hi', 'ar'] as const;

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
