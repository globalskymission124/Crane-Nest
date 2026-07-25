"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Luggage, Menu, MessageSquare, Search, type LucideIcon } from "lucide-react";
import { useStaysT } from "@/lib/stays/i18n";

const LABELS = {
  en: { explore: "Explore", wishlist: "Wishlist", trips: "Trips", messages: "Messages", menu: "Menu" },
  ja: { explore: "探す", wishlist: "お気に入り", trips: "旅程", messages: "メッセージ", menu: "メニュー" },
  zh: { explore: "探索", wishlist: "心愿单", trips: "行程", messages: "消息", menu: "菜单" },
  tw: { explore: "探索", wishlist: "心願單", trips: "行程", messages: "消息", menu: "選單" },
} as const;

function activeFor(pathname: string, href: string) {
  if (href === "/stays") return pathname === "/stays" || /^\/stays\/[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  related?: string[];
};

export default function AppBottomNav() {
  const pathname = usePathname();
  const { lang } = useStaysT();
  const labels = LABELS[lang];
  const items: NavItem[] = [
    { href: "/stays", label: labels.explore, icon: Search },
    { href: "/stays/wishlist", label: labels.wishlist, icon: Heart },
    { href: "/stays/trips", label: labels.trips, icon: Luggage },
    { href: "/stays/messages", label: labels.messages, icon: MessageSquare },
    { href: "/stays/menu", label: labels.menu, icon: Menu, related: ["/stays/profile", "/stays/login"] },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:hidden">
      {items.map(({ href, label, icon: Icon, related }) => {
        const active = activeFor(pathname, href) || related?.some((path) => pathname === path || pathname.startsWith(`${path}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold transition ${
              active ? "text-rose-600" : "text-slate-500"
            }`}
          >
            <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
            <span className="w-full truncate text-center leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
