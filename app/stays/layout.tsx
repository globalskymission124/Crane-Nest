"use client";

import Link from "next/link";
import { Heart, Home, LayoutGrid, LogIn, LogOut, Luggage } from "lucide-react";
import NotificationsBell from "@/components/stays/NotificationsBell";
import CurrencySwitcher from "@/components/stays/CurrencySwitcher";
import InstallBanner from "@/components/stays/InstallBanner";
import StaysLangSwitcher from "@/components/stays/StaysLangSwitcher";
import { logout, useStaysSession } from "@/lib/stays/auth";
import { useStaysT } from "@/lib/stays/i18n";

// Stays（Airbnb型予約サイト）ゲスト向けレイアウト v2（多言語）
export default function StaysLayout({ children }: { children: React.ReactNode }) {
  const { session } = useStaysSession();
  const { t } = useStaysT();
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/stays" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-brand-600">
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Crane Nest Stays</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/stays"
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 sm:flex"
            >
              <LayoutGrid className="h-4 w-4" /> {t.searchStays}
            </Link>
            <Link
              href="/stays/wishlist"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
            >
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">{t.wishlist}</span>
            </Link>
            <Link
              href="/stays/trips"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
            >
              <Luggage className="h-4 w-4" /> <span className="hidden sm:inline">{t.trips}</span>
            </Link>
            <NotificationsBell />
            <StaysLangSwitcher />
            <CurrencySwitcher />
            {session ? (
              <div className="flex items-center gap-1.5">
                {session.role === "host" && (
                  <Link href="/host" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    {t.hostConsole}
                  </Link>
                )}
                {session.role === "admin" && (
                  <Link href="/admin/stays" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    {t.adminConsole}
                  </Link>
                )}
                <Link href="/stays/profile" className="flex items-center gap-1.5" aria-label="Profile">
                  {session.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.avatar_url} alt="" className="h-7 w-7 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {session.name.charAt(0)}
                    </span>
                  )}
                  <span className="hidden max-w-[80px] truncate text-xs font-semibold text-slate-500 sm:inline">
                    {session.name}
                  </span>
                </Link>
                <button onClick={() => logout()} aria-label="ログアウト" className="rounded-full p-2 hover:bg-slate-100">
                  <LogOut className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <Link
                href="/stays/login"
                className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-700"
              >
                <LogIn className="h-4 w-4" /> {t.login}
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        {t.footer}
      </footer>
      <InstallBanner />
    </div>
  );
}
