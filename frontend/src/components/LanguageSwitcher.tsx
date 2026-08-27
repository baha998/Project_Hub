import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

/** RU | ҚАЗ | EN pill switcher. i18next-browser-languagedetector persists
 * the chosen language to localStorage on every change, so it survives a
 * page reload. */
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1"
    >
      {SUPPORTED_LANGUAGES.map((lng: SupportedLanguage) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
            current === lng
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}
