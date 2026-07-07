"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, Home, ListChecks, MessageSquare, QrCode, Tag } from "lucide-react";

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
  return (
    <nav className="flex gap-1.5 overflow-x-auto">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/host" ? pathname === "/host" : pathname.startsWith(href);
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
  );
}
