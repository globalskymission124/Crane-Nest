"use client";

import { Globe } from "lucide-react";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import { ADMIN_LOCALE_OPTIONS, type AdminLocale } from "@/lib/i18n/admin/types";

export default function AdminLanguageSwitcher() {
  const { locale, setLocale, t } = useAdminTranslation();

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      <Globe className="h-3.5 w-3.5 text-slate-400" />
      <span className="sr-only">{t.languageSwitcher.label}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as AdminLocale)}
        aria-label={t.languageSwitcher.label}
        className="appearance-none bg-transparent pr-1 text-xs font-medium text-slate-600 focus:outline-none"
      >
        {ADMIN_LOCALE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
