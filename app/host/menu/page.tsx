"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  KeyRound,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  UserCircle2,
} from "lucide-react";
import ModeSwitchButton from "@/components/stays/ModeSwitchButton";
import NotificationsBell from "@/components/stays/NotificationsBell";
import { logout, useStaysSession } from "@/lib/stays/auth";
import { averageRating, fetchAllBookings, fetchAllListings, fetchAllReviews } from "@/lib/stays/queries";
import { formatJPY } from "@/lib/stays/types";
import type { Booking, Listing, Review } from "@/lib/stays/types";

const actionRows = [
  { href: "/stays/profile", label: "アカウント設定", icon: Settings },
  { href: "/host/listings", label: "出租资源", icon: BookOpen },
  { href: "/host/checkin", label: "チェックインQR", icon: KeyRound },
  { href: "/site/ja", label: "获取帮助", icon: CircleHelp },
] as const;

function isThisMonth(date?: string) {
  if (!date) return false;
  return date.slice(0, 7) === new Date().toISOString().slice(0, 7);
}

export default function HostMenuPage() {
  const { session } = useStaysSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchAllBookings(), fetchAllListings(), fetchAllReviews()]).then(([bookingData, listingData, reviewData]) => {
      if (!alive) return;
      setBookings(bookingData);
      setListings(listingData);
      setReviews(reviewData);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((booking) => booking.status === "confirmed" || booking.status === "completed");
    const monthRevenue = activeBookings
      .filter((booking) => isThisMonth(booking.check_in) || isThisMonth(booking.created_at))
      .reduce((sum, booking) => sum + booking.total_price, 0);
    const listedIds = new Set(listings.map((listing) => listing.id));
    const listingReviews = reviews.filter((review) => listedIds.has(review.listing_id));
    return {
      monthRevenue,
      rating: averageRating(listingReviews),
      reviewCount: listingReviews.length,
      publishedCount: listings.filter((listing) => listing.is_published).length,
    };
  }, [bookings, listings, reviews]);

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="mb-8 flex items-center justify-between pt-2">
        <div>
          <h1 className="text-5xl font-black text-slate-950 sm:text-3xl">菜单</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">オーナーモード</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link href="/stays/profile" aria-label="プロフィール" className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100">
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

      <div className="grid grid-cols-2 gap-3">
        <Link href="/host/analytics" className="min-h-56 rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-lg font-black text-slate-950">収入</span>
          <span className="mt-2 block text-sm font-bold text-slate-500">本月收入 {formatJPY(stats.monthRevenue)}</span>
          <span className="mt-20 flex h-16 items-end gap-2">
            {[58, 32, 48, 64, 46, 28].map((height, index) => (
              <span
                key={height}
                className={`w-8 rounded-t-lg ${index < 4 ? "bg-rose-600" : "bg-slate-200"}`}
                style={{ height }}
              />
            ))}
          </span>
        </Link>

        <Link href="/host/analytics" className="min-h-56 rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
          <span className="block text-lg font-black text-slate-950">分析洞察</span>
          <span className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-500">
            <Star className="h-4 w-4 fill-slate-500 text-slate-500" />
            {stats.rating > 0 ? stats.rating.toFixed(2) : "0.00"} · {stats.reviewCount} 条评价
          </span>
          <span className="mt-20 flex items-end">
            {listings.slice(0, 3).map((listing, index) => (
              <span
                key={listing.id}
                className="-ml-3 first:ml-0 block h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-sm"
                style={{ zIndex: 3 - index }}
              >
                {listing.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.photos[0]} alt="" className="h-full w-full object-cover" />
                )}
              </span>
            ))}
            <span className="-ml-3 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-slate-200 text-sm font-black text-slate-700">
              +{Math.max(0, stats.publishedCount - 3)}
            </span>
          </span>
        </Link>
      </div>

      <Link
        href="/host/listings"
        className="mt-5 flex items-center gap-4 rounded-[1.4rem] bg-[#f4f1eb] px-5 py-5 text-slate-950"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Plus className="h-7 w-7 text-rose-600" />
        </span>
        <span>
          <span className="block text-lg font-black">创建新项目</span>
          <span className="mt-1 block text-sm font-semibold text-slate-500">发布房源、体验或服务，拓展多元收入。</span>
        </span>
      </Link>

      <div className="mt-7 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
        {actionRows.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0">
            <span className="flex items-center gap-4 text-base font-bold text-slate-800">
              <Icon className="h-6 w-6 text-slate-700" />
              {label}
            </span>
            <span className="text-2xl leading-none text-slate-300">›</span>
          </Link>
        ))}
      </div>

      <Link
        href="/host"
        className="mt-5 flex items-center justify-between rounded-[1.4rem] border border-emerald-100 bg-emerald-50 px-5 py-4 text-emerald-800"
      >
        <span className="flex items-center gap-4 text-base font-black">
          <ShieldCheck className="h-6 w-6" />
          オーナーバックエンドを開く
        </span>
        <BarChart3 className="h-6 w-6" />
      </Link>

      <button
        type="button"
        onClick={() => logout()}
        className="mt-5 flex w-full items-center gap-4 rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 text-left text-base font-bold text-slate-800"
      >
        <LogOut className="h-6 w-6 text-slate-700" />
        ログアウト
      </button>

      <ModeSwitchButton from="host" to="guest" href="/stays/menu" />
    </div>
  );
}
