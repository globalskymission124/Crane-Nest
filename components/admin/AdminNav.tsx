"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, MapPin, Image as ImageIcon, Palette, BedDouble, FileDown, Star, BarChart3, Users, Flag, BadgeJapaneseYen, Globe, LayoutGrid, X } from "lucide-react";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import type { AdminDictionary } from "@/lib/i18n/admin/types";
import type { AdminLocale } from "@/lib/i18n/admin/types";

// レビュー管理ナビの多言語ラベル（辞書型を変更せず、ここでインラインに定義）
const REVIEWS_LABEL: Record<AdminLocale, string> = {
  ja: "レビュー",
  zh: "评价",
  en: "Reviews",
};
const STAYS_LABEL: Record<AdminLocale, string> = {
  ja: "宿泊分析",
  zh: "住宿分析",
  en: "Stays",
};
const USERS_LABEL: Record<AdminLocale, string> = {
  ja: "ユーザー",
  zh: "用户",
  en: "Users",
};
const REPORTS_LABEL: Record<AdminLocale, string> = {
  ja: "通報",
  zh: "举报",
  en: "Reports",
};
const MONETIZE_LABEL: Record<AdminLocale, string> = {
  ja: "収益化",
  zh: "变现",
  en: "Monetize",
};
const WEBSITE_LABEL: Record<AdminLocale, string> = {
  ja: "サイト編集",
  zh: "网站编辑",
  en: "Website",
};

function buildNavItems(t: AdminDictionary, locale: AdminLocale) {
  // 先頭4件はモバイル下部ナビに常時表示される主要メニュー
  return [
    { href: "/admin", label: t.nav.board, icon: LayoutDashboard },
    { href: "/admin/stays", label: STAYS_LABEL[locale], icon: BarChart3 },
    { href: "/admin/monetize", label: MONETIZE_LABEL[locale], icon: BadgeJapaneseYen },
    { href: "/admin/website", label: WEBSITE_LABEL[locale], icon: Globe },
    { href: "/admin/rooms", label: t.nav.rooms, icon: BedDouble },
    { href: "/admin/destinations", label: t.nav.destinations, icon: MapPin },
    { href: "/admin/banners", label: t.nav.banners, icon: ImageIcon },
    { href: "/admin/records", label: t.nav.records, icon: FileDown },
    { href: "/admin/reviews", label: REVIEWS_LABEL[locale], icon: Star },
    { href: "/admin/users", label: USERS_LABEL[locale], icon: Users },
    { href: "/admin/reports", label: REPORTS_LABEL[locale], icon: Flag },
    { href: "/admin/settings", label: t.nav.settings, icon: Palette },
  ] as const;
}

// 完全一致 or 配下のパスかどうかを判定（/adminだけはルート完全一致で判定する）
function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();
  const { t, locale } = useAdminTranslation();
  const navItems = buildNavItems(t, locale);

  return (
    <>
      {/* ── デスクトップ用トップナビ（sm以上） ── */}
      <nav className="sticky top-[61px] z-10 hidden border-b border-slate-200/70 bg-white/70 backdrop-blur-md sm:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-2.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-600/30"
                    : "text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── モバイル用ボトムナビ（sm未満）: 主要4タブ + メニュー ── */}
      <MobileNav navItems={navItems} pathname={pathname} />
    </>
  );
}

// 主要4項目を常時表示し、残りは「メニュー」から大きなタイルで選択する
function MobileNav({
  navItems,
  pathname,
}: {
  navItems: ReturnType<typeof buildNavItems>;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const primary = navItems.slice(0, 4);

  return (
    <>
      {/* メニューオーバーレイ（全項目をタイル表示） */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-slate-900/50 sm:hidden" onClick={() => setOpen(false)}>
          <div
            className="max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">すべてのメニュー</p>
              <button onClick={() => setOpen(false)} aria-label="閉じる" className="rounded-full bg-slate-100 p-2">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${active ? "text-brand-600" : "text-slate-400"}`} />
                    <span className="text-[11px] font-bold leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur-md sm:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                active ? "text-brand-600" : "text-slate-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-brand-600" : "text-slate-400"}`} />
              <span className="w-full truncate text-center leading-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          aria-label="メニュー"
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold ${open ? "text-brand-600" : "text-slate-400"}`}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="leading-none">メニュー</span>
        </button>
      </nav>
    </>
  );
}
