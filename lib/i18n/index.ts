import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';
import hi from '@/locales/hi.json';
import ml from '@/locales/ml.json';
import {
  SUPPORTED_LANGUAGES,
  useLanguageStore,
  type LanguageCode,
  type LanguagePreference,
} from '@/lib/store/languageStore';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  hi: { translation: hi },
  ml: { translation: ml },
} as const;

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
