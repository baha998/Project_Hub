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
      className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-neutral-800 p-1"
    >
      {SUPPORTED_LANGUAGES.map((lng: SupportedLanguage) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
            current === lng
              ? "bg-white dark:bg-neutral-900 text-zinc-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}
