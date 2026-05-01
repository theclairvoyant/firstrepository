import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import hi from '@/locales/hi.json';
import ar from '@/locales/ar.json';
import {
  SUPPORTED_LANGUAGES,
  useLanguageStore,
  type LanguageCode,
  type LanguagePreference,
} from '@/lib/store/languageStore';

// To add a new language: import the JSON and add an entry below keyed by
// the LanguageCode. The supported set itself lives in lib/store/languageStore.ts.
// Untranslated keys fall back to English via fallbackLng.
const resources: Record<LanguageCode, { translation: Record<string, unknown> }> = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  hi: { translation: hi },
  ar: { translation: ar },
};

function detectDeviceLanguage(): LanguageCode {
  const locales = Localization.getLocales();
  for (const loc of locales) {
    const code = loc.languageCode;
    if (code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
      return code as LanguageCode;
    }
  }
  return 'en';
}

function resolveLanguage(preference: LanguagePreference): LanguageCode {
  if (preference === 'system') return detectDeviceLanguage();
  return preference;
}

let initialized = false;

export function initI18n(): typeof i18n {
  if (initialized) return i18n;
  initialized = true;

  const preference = useLanguageStore.getState().preference;
  const resolved = resolveLanguage(preference);
  useLanguageStore.getState().setResolved(resolved);

  void i18n.use(initReactI18next).init({
    resources,
    lng: resolved,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export async function changeLanguage(preference: LanguagePreference): Promise<void> {
  const resolved = resolveLanguage(preference);
  useLanguageStore.getState().setPreference(preference);
  useLanguageStore.getState().setResolved(resolved);
  await i18n.changeLanguage(resolved);
}

export { i18n, resolveLanguage, detectDeviceLanguage };
