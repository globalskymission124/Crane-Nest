"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, Home, LayoutGrid, ListChecks, MessageSquare, QrCode, Tag } from "lucide-react";

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
        <Link
          href="/host/menu"
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold ${
            isActive("/host/menu") ? "text-rose-600" : "text-slate-500"
          }`}
          aria-label="メニュー"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="w-full truncate text-center leading-none">菜单</span>
        </Link>
      </nav>
    </>
  );
}
