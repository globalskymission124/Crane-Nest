"use client";

import Link from "next/link";
import { Heart, Home, LayoutGrid, LogIn, LogOut, Luggage } from "lucide-react";
import NotificationsBell from "@/components/stays/NotificationsBell";
import CurrencySwitcher from "@/components/stays/CurrencySwitcher";
import { logout, useStaysSession } from "@/lib/stays/auth";

// Stays（Airbnb型予約サイト）ゲスト向けレイアウト v2
export default function StaysLayout({ children }: { children: React.ReactNode }) {
  const { session } = useStaysSession();
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
              <LayoutGrid className="h-4 w-4" /> 宿を探す
            </Link>
            <Link
              href="/stays/wishlist"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
            >
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">お気に入り</span>
            </Link>
            <Link
              href="/stays/trips"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
            >
              <Luggage className="h-4 w-4" /> <span className="hidden sm:inline">旅程</span>
            </Link>
            <NotificationsBell />
            <CurrencySwitcher />
            {session ? (
              <div className="flex items-center gap-1.5">
                {session.role === "host" && (
                  <Link href="/host" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    オーナー管理
                  </Link>
                )}
                {session.role === "admin" && (
                  <Link href="/admin/stays" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    管理者
                  </Link>
                )}
                <Link href="/stays/profile" className="inline-block max-w-[90px] truncate text-xs font-semibold text-slate-500 hover:text-brand-600 hover:underline">
                  {session.name}
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
                <LogIn className="h-4 w-4" /> ログイン
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        Crane Nest Stays — デモ予約サイト
      </footer>
    </div>
  );
}
