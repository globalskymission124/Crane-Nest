"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Luggage, MessageSquare, Search, UserCircle2 } from "lucide-react";
import { useStaysSession } from "@/lib/stays/auth";
import { useStaysT } from "@/lib/stays/i18n";

const LABELS = {
  en: { explore: "Explore", wishlist: "Wishlist", trips: "Trips", messages: "Messages", profile: "Profile" },
  ja: { explore: "探す", wishlist: "お気に入り", trips: "旅程", messages: "メッセージ", profile: "プロフィール" },
  zh: { explore: "探索", wishlist: "心愿单", trips: "行程", messages: "消息", profile: "个人资料" },
  tw: { explore: "探索", wishlist: "心願單", trips: "行程", messages: "消息", profile: "個人資料" },
} as const;

function activeFor(pathname: string, href: string) {
  if (href === "/stays") return pathname === "/stays" || /^\/stays\/[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppBottomNav() {
  const pathname = usePathname();
  const { session } = useStaysSession();
  const { lang } = useStaysT();
  const labels = LABELS[lang];
  const profileHref = session ? "/stays/profile" : "/stays/login";
  const items = [
    { href: "/stays", label: labels.explore, icon: Search },
    { href: "/stays/wishlist", label: labels.wishlist, icon: Heart },
    { href: "/stays/trips", label: labels.trips, icon: Luggage },
    { href: "/stays/messages", label: labels.messages, icon: MessageSquare },
    { href: profileHref, label: labels.profile, icon: UserCircle2 },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = activeFor(pathname, href) || (href === profileHref && pathname === "/stays/login");
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-semibold transition ${
              active ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {href === profileHref && session?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.avatar_url}
                alt=""
                className={`h-6 w-6 rounded-full object-cover ${active ? "ring-2 ring-rose-500 ring-offset-2" : ""}`}
              />
            ) : (
              <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
            )}
            <span className="w-full truncate text-center leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
