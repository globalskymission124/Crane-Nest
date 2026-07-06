"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Image as ImageIcon, Palette, BedDouble, FileDown, Star, BarChart3, Users, Flag, BadgeJapaneseYen, Globe } from "lucide-react";
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
  return [
    { href: "/admin", label: t.nav.board, icon: LayoutDashboard },
    { href: "/admin/rooms", label: t.nav.rooms, icon: BedDouble },
    { href: "/admin/destinations", label: t.nav.destinations, icon: MapPin },
    { href: "/admin/banners", label: t.nav.banners, icon: ImageIcon },
    { href: "/admin/records", label: t.nav.records, icon: FileDown },
    { href: "/admin/reviews", label: REVIEWS_LABEL[locale], icon: Star },
    { href: "/admin/stays", label: STAYS_LABEL[locale], icon: BarChart3 },
    { href: "/admin/monetize", label: MONETIZE_LABEL[locale], icon: BadgeJapaneseYen },
    { href: "/admin/website", label: WEBSITE_LABEL[locale], icon: Globe },
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

      {/* ── モバイル用ボトムナビ（sm未満） ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur-md sm:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-semibold transition ${
                active ? "text-brand-600" : "text-slate-400"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition ${active ? "text-brand-600" : "text-slate-400"}`}
              />
              <span className="w-full truncate text-center leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
