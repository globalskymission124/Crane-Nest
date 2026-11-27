"use client";

import { useEffect, useState } from "react";
import { conciergeUrl } from "@/lib/craneLink";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** 登録完了の画面のいちばん上: 「🛎 コンシェルジュを開く」(お部屋の鍵・明かり・ガイド・🌏 WELCOME) */
const T: Record<string, { title: string; sub: string }> = {
  ja: { title: "コンシェルジュを開く", sub: "お部屋の鍵・明かり・ガイド・ウェルカム演出" },
  en: { title: "Open Concierge", sub: "Room key · lights · guide · welcome show" },
  zh: { title: "打开礼宾服务", sub: "房间钥匙 · 灯光 · 指南 · 欢迎演出" },
  ko: { title: "컨시어지 열기", sub: "객실 키 · 조명 · 가이드 · 웰컴 연출" },
  es: { title: "Abrir conserjería", sub: "Llave · luces · guía · bienvenida" },
  fr: { title: "Ouvrir la conciergerie", sub: "Clé · lumières · guide · accueil" },
};

export default function ConciergeButton({ className = "" }: { className?: string }) {
  const { locale } = useTranslation();
  const [href, setHref] = useState<string>("#");
  useEffect(() => { setHref(conciergeUrl(locale)); }, [locale]);
  const t = T[locale] ?? T.en;
  return (
    <a
      href={href}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-sky-300/40 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 px-5 py-4 text-left text-white shadow-lg shadow-sky-900/30 ${className}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-2xl ring-1 ring-sky-300/50">🛎</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold tracking-wide">{t.title}</span>
        <span className="mt-0.5 block truncate text-xs text-sky-200/80">{t.sub} 🌏</span>
      </span>
      <span className="text-xl text-sky-300 transition-transform group-hover:translate-x-1">›</span>
    </a>
  );
}
