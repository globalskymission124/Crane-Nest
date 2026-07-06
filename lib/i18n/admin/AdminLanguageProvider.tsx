"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminDictionaries } from "./dictionaries";
import { ADMIN_DEFAULT_LOCALE, type AdminDictionary, type AdminLocale } from "./types";

const STORAGE_KEY = "guesthouse_admin_locale";
const SUPPORTED_LOCALES: AdminLocale[] = ["ja", "zh", "en"];

interface AdminLanguageContextValue {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  t: AdminDictionary;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

function detectBrowserLocale(): AdminLocale | null {
  if (typeof navigator === "undefined") return null;

  for (const lang of navigator.languages ?? [navigator.language]) {
    const normalized = lang.toLowerCase();

    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("en")) return "en";
  }

  return null;
}

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(ADMIN_DEFAULT_LOCALE);

  // 初回マウント時のみ: 保存済みの選択 → ブラウザの言語設定 → デフォルトの順で初期言語を決定
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved as AdminLocale)) {
        setLocaleState(saved as AdminLocale);
        return;
      }
    } catch {
      // localStorageが使えない環境は無視してブラウザ言語の検出にフォールバック
    }

    const detected = detectBrowserLocale();
    if (detected) setLocaleState(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (next: AdminLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存できなくても画面表示自体には影響しない
    }
  };

  const value = useMemo<AdminLanguageContextValue>(
    () => ({ locale, setLocale, t: adminDictionaries[locale] }),
    [locale]
  );

  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
}

export function useAdminTranslation(): AdminLanguageContextValue {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) {
    throw new Error("useAdminTranslation must be used within an AdminLanguageProvider");
  }
  return ctx;
}
