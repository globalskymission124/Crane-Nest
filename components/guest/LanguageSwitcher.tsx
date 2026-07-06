"use client";

import { Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LOCALE_OPTIONS, type Locale } from "@/lib/i18n/types";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      <Globe className="h-3.5 w-3.5 text-slate-400" />
      <span className="sr-only">{t.languageSwitcher.label}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.languageSwitcher.label}
        className="appearance-none bg-transparent pr-1 text-xs font-medium text-slate-600 focus:outline-none"
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
