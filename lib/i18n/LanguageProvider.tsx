"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries } from "./dictionaries";
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "./types";

const STORAGE_KEY = "guesthouse_locale";
const SUPPORTED_LOCALES: Locale[] = ["ja", "en", "zh", "es", "fr", "ko"];

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;

  for (const lang of navigator.languages ?? [navigator.language]) {
    const normalized = lang.toLowerCase();

    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("ko")) return "ko";
    if (normalized.startsWith("es")) return "es";
    if (normalized.startsWith("fr")) return "fr";
    if (normalized.startsWith("en")) return "en";
  }

  return null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // 初回マウント時のみ: 保存済みの選択 → ブラウザの言語設定 → デフォルトの順で初期言語を決定
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
        setLocaleState(saved as Locale);
        return;
      }
    } catch {
      // localStorageが使えない環境は無視してブラウザ言語の検出にフォールバック
    }

    const detected = detectBrowserLocale();
    if (detected) setLocaleState(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存できなくても画面表示自体には影響しない
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
