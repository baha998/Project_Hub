import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ru from "../locales/ru.json";
import kk from "../locales/kk.json";
import en from "../locales/en.json";

export const SUPPORTED_LANGUAGES = ["ru", "kk", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "project_hub_language";

const INTL_LOCALES: Record<SupportedLanguage, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

/** Maps the active i18n language to an Intl/toLocaleDateString tag, for
 * locale-aware date formatting outside of translated strings. */
export function intlLocale(language: string): string {
  return INTL_LOCALES[language as SupportedLanguage] ?? INTL_LOCALES.ru;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kk: { translation: kk },
      en: { translation: en },
    },
    fallbackLng: "ru",
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
