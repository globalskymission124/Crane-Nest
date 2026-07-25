"use client";

import Link from "next/link";
import {
  Bell,
  CircleHelp,
  CreditCard,
  Gift,
  Heart,
  Home,
  KeyRound,
  LogIn,
  LogOut,
  Luggage,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import ModeSwitchButton from "@/components/stays/ModeSwitchButton";
import NotificationsBell from "@/components/stays/NotificationsBell";
import CurrencySwitcher from "@/components/stays/CurrencySwitcher";
import StaysLangSwitcher from "@/components/stays/StaysLangSwitcher";
import { logout, useStaysSession } from "@/lib/stays/auth";

const primaryItems = [
  { href: "/stays/profile", label: "アカウント設定", sub: "プロフィールと本人確認", icon: Settings },
  { href: "/stays/trips", label: "旅程", sub: "予約と支払い", icon: Luggage },
  { href: "/stays/wishlist", label: "お気に入り", sub: "保存した宿", icon: Heart },
  { href: "/stays/messages", label: "メッセージ", sub: "ホストとの会話", icon: MessageSquare },
] as const;

const supportItems = [
  { href: "/stays/login", label: "ログイン方法", icon: KeyRound },
  { href: "/stays/trips", label: "支払いと領収書", icon: CreditCard },
  { href: "/stays/profile", label: "紹介コード", icon: Gift },
  { href: "/site/ja", label: "ヘルプ", icon: CircleHelp },
] as const;

export default function StaysMenuPage() {
  const { session } = useStaysSession();
  const profileHref = session ? "/stays/profile" : "/stays/login";
  const profileLabel = session ? session.name : "ログイン";

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="mb-8 flex items-center justify-between pt-2">
        <div>
          <h1 className="text-5xl font-black text-slate-950 sm:text-3xl">メニュー</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">旅行モード</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link href={profileHref} aria-label="プロフィール" className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {session?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : session ? (
              <span className="text-sm font-black text-slate-700">{session.name.charAt(0)}</span>
            ) : (
              <UserCircle2 className="h-7 w-7 text-slate-500" />
            )}
          </Link>
        </div>
      </div>

      <Link
        href={profileHref}
        className="mb-5 flex items-center justify-between rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <span>
          <span className="block text-xl font-black text-slate-950">{profileLabel}</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">{session?.email || "予約とメッセージを確認"}</span>
        </span>
        {session ? <ShieldCheck className="h-7 w-7 text-emerald-600" /> : <LogIn className="h-7 w-7 text-slate-700" />}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {primaryItems.map(({ href, label, sub, icon: Icon }) => (
          <Link key={href} href={href} className="min-h-32 rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98]">
            <Icon className="h-7 w-7 text-slate-950" />
            <span className="mt-4 block text-base font-black text-slate-950">{label}</span>
            <span className="mt-1 block text-xs font-semibold text-slate-500">{sub}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/host/menu"
        className="mt-5 flex items-center gap-4 rounded-[1.4rem] bg-[#f4f1eb] px-5 py-5 text-slate-950"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Home className="h-7 w-7 text-rose-600" />
        </span>
        <span>
          <span className="block text-lg font-black">オーナーモード</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">収入、予約、房源を管理</span>
        </span>
      </Link>

      <div className="mt-7 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
        {supportItems.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0">
            <span className="flex items-center gap-4 text-base font-bold text-slate-800">
              <Icon className="h-6 w-6 text-slate-700" />
              {label}
            </span>
            <span className="text-2xl leading-none text-slate-300">›</span>
          </Link>
        ))}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-4 text-base font-bold text-slate-800">
            <Bell className="h-6 w-6 text-slate-700" />
            表示と言語
          </span>
          <span className="flex items-center gap-2">
            <StaysLangSwitcher />
            <CurrencySwitcher />
          </span>
        </div>
      </div>

      {session && (
        <button
          type="button"
          onClick={() => logout()}
          className="mt-5 flex w-full items-center gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 text-left text-base font-bold text-slate-800"
        >
          <LogOut className="h-6 w-6 text-slate-700" />
          ログアウト
        </button>
      )}

      <ModeSwitchButton from="guest" to="host" href="/host/menu" />
    </div>
  );
}
