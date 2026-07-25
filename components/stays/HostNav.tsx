"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, CalendarClock, Home, LayoutGrid, ListChecks, MessageSquare, QrCode, Tag, X } from "lucide-react";

const items = [
  { href: "/host", label: "予約", icon: ListChecks },
  { href: "/host/analytics", label: "分析", icon: BarChart3 },
  { href: "/host/listings", label: "物件", icon: Home },
  { href: "/host/checkin", label: "パスポート登録", icon: QrCode },
  { href: "/host/promotions", label: "クーポン", icon: Tag },
  { href: "/host/calendar", label: "カレンダー同期", icon: CalendarClock },
  { href: "/host/messages", label: "メッセージ", icon: MessageSquare },
] as const;

export default function HostNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = [
    { href: "/host", label: "今日必看", icon: ListChecks },
    { href: "/host/calendar", label: "日历", icon: CalendarClock },
    { href: "/host/listings", label: "房源", icon: Home },
    { href: "/host/messages", label: "消息", icon: MessageSquare },
  ] as const;

  const isActive = (href: string) => (href === "/host" ? pathname === "/host" : pathname.startsWith(href));

  return (
    <>
      <nav className="hidden gap-1.5 overflow-x-auto sm:flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-slate-950/45 sm:hidden" onClick={() => setOpen(false)}>
          <div className="rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-black text-slate-950">菜单</p>
              <button onClick={() => setOpen(false)} aria-label="閉じる" className="rounded-full bg-slate-100 p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border text-center text-xs font-black ${
                      active ? "border-rose-500 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:hidden">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold ${
                active ? "text-rose-600" : "text-slate-500"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="w-full truncate text-center leading-none">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold ${
            open ? "text-rose-600" : "text-slate-500"
          }`}
          aria-label="メニュー"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="w-full truncate text-center leading-none">菜单</span>
        </button>
      </nav>
    </>
  );
}
