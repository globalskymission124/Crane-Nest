"use client";

// =========================================================
// 管理画面ヘッダー：サイト設定で登録したロゴ・アイキャッチ画像を表示する。
// 画像が未設定の場合は何も表示せず、既存のテキストのみのヘッダーのまま。
// =========================================================

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import AdminLanguageSwitcher from "./AdminLanguageSwitcher";

interface BrandAssets {
  logo_url: string | null;
  hero_image_url: string | null;
}

export default function AdminBrandHeader() {
  const [assets, setAssets] = useState<BrandAssets | null>(null);
  const { t } = useAdminTranslation();

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("site_settings")
      .select("logo_url, hero_image_url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setAssets(data as BrandAssets);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand-100/70 bg-white/90 px-4 py-2.5 backdrop-blur-md sm:py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {assets?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assets.logo_url}
                alt={t.brand.logoAlt}
                className="h-8 w-8 shrink-0 rounded-xl border border-brand-100 bg-white object-contain p-1 shadow-sm sm:h-10 sm:w-10"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-sm shadow-brand-600/30 sm:h-10 sm:w-10 sm:text-sm">
                GH
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800 sm:text-base">{t.brand.title}</h1>
              <p className="hidden text-xs text-slate-400 sm:block">{t.brand.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminLanguageSwitcher />
            <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 sm:inline-block">
              {t.brand.badge}
            </span>
          </div>
        </div>
      </header>

      {assets?.hero_image_url && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assets.hero_image_url}
            alt={t.brand.heroAlt}
            className="h-32 w-full rounded-2xl border border-brand-100/70 object-cover shadow-md shadow-brand-700/10 sm:h-44"
          />
        </div>
      )}
    </>
  );
}
