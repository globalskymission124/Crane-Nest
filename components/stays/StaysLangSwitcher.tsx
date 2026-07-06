"use client";

// 予約UIの言語切替（英語デフォルト / 繁中 / 简中 / 日本語）
import { useEffect, useState } from "react";
import { getStaysLang, setStaysLang, STAYS_LANGS, type StaysLang } from "@/lib/stays/i18n";

export default function StaysLangSwitcher() {
  const [lang, setLang] = useState<StaysLang>("en");
  useEffect(() => setLang(getStaysLang()), []);
  return (
    <select
      value={lang}
      onChange={(e) => {
        const l = e.target.value as StaysLang;
        setLang(l);
        setStaysLang(l);
      }}
      className="rounded-full border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none"
      aria-label="Language"
    >
      {STAYS_LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
