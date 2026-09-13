"use client";

// =========================================================
// オーナー：予約ダッシュボード（多言語対応）
// =========================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, X, Clock, QrCode, Rocket, Tag } from "lucide-react";
import { fetchAllBookings, fetchAllListings, hostScope, ownedListings, byListingIds } from "@/lib/stays/queries";
import { updateBookingStatus } from "@/lib/stays/host";
import { notify, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { useHostT } from "@/lib/stays/hostI18n";
import { formatJPY } from "@/lib/stays/types";
import type { Booking, BookingStatus, Listing } from "@/lib/stays/types";

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-500",
  completed: "bg-blue-100 text-blue-700",
};
const PAY_STYLE: Record<string, string> = {
  unpaid: "bg-slate-100 text-slate-500",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-sky-100 text-sky-700",
  partially_refunded: "bg-sky-100 text-sky-700",
};

export default function HostBookingsPage() {
  const { session } = useStaysSession();
  const { t } = useHostT();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");

  const STATUS_LABEL: Record<BookingStatus, string> = {
    pending: t.st_pending, confirmed: t.st_confirmed, cancelled: t.st_cancelled, completed: t.st_completed,
  };
  const PAY_LABEL: Record<string, string> = {
    unpaid: t.pay_unpaid, paid: t.pay_paid, refunded: t.pay_refunded, partially_refunded: t.pay_partial,
  };

  async function load() {
    const [bk, ls] = await Promise.all([fetchAllBookings(), fetchAllListings()]);
    const scope = hostScope(session);
    const myListings = ownedListings(ls, scope);
    const ids = new Set(myListings.map((l) => l.id));
    setListings(myListings);
    setBookings(scope ? byListingIds(bk, ids) : bk);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [session?.host_id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);

  async function setStatus(b: Booking, status: BookingStatus) {
    await updateBookingStatus(b.id, status);
    const title = listingMap.get(b.listing_id)?.title || "";
    await notify(
      b.guest_email,
      status === "confirmed" ? "予約が承認されました" : status === "completed" ? "ご宿泊ありがとうございました" : "予約がキャンセルされました",
      `${title}（${b.check_in}〜${b.check_out}）`,
      "/stays/trips"
    );
    await audit(session?.email || "host", session?.role || "host", `booking.${status}`, b.id, title);
    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status } : x)));
  }

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const todayCheckins = bookings.filter((b) => b.status === "confirmed" && b.check_in === today);
  const unpaidConfirmed = bookings.filter((b) => b.status === "confirmed" && b.payment_status === "unpaid").length;

  return (
    <div>
      <h1 className="mb-1 text-4xl font-black text-slate-950 sm:text-2xl">{filtered.length}{t.d_orders_suffix}</h1>
      <p className="mb-4 text-sm font-semibold text-slate-500">{t.d_subtitle}</p>

      {/* 今日のサマリー */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <button onClick={() => setFilter("pending")} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${pendingCount > 0 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-2xl font-extrabold text-slate-900">{pendingCount}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t.d_pending}{pendingCount > 0 && ` ${t.d_need_action}`}</p>
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-extrabold text-slate-900">{todayCheckins.length}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t.d_today_checkin}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-extrabold text-slate-900">{unpaidConfirmed}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t.d_confirmed_unpaid}</p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ["/host/checkin", QrCode, t.qa_passport],
          ["/host/analytics", BarChart3, t.qa_sales],
          ["/host/promotions", Tag, t.qa_coupon],
          ["/host/listings", Rocket, t.qa_boost],
        ] as const).map(([href, Icon, label]) => (
          <Link key={href} href={href} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700">
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
            {f === "all" ? t.f_all : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">{t.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-400">{t.no_bookings}</p>
      ) : (
        <>
        <div className="grid gap-3 sm:hidden">
          {filtered.map((b) => {
            const listing = listingMap.get(b.listing_id);
            return (
              <article key={b.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-400">{b.check_in} → {b.check_out}</p>
                    <h2 className="mt-1 line-clamp-2 text-2xl font-black text-slate-950">{b.guest_name}・{b.guests_count}{t.guests_count_unit}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-slate-500">{listing?.title || "—"}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatJPY(b.total_price)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.status === "pending" && (
                    <button onClick={() => setStatus(b, "confirmed")} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">
                      <Check className="h-3.5 w-3.5" /> {t.act_approve}
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => setStatus(b, "completed")} className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">
                      <Clock className="h-3.5 w-3.5" /> {t.act_complete}
                    </button>
                  )}
                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <button onClick={() => setStatus(b, "cancelled")} className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                      <X className="h-3.5 w-3.5" /> {t.act_cancel}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">{t.th_property}</th>
                <th className="px-4 py-3">{t.th_guest}</th>
                <th className="px-4 py-3">{t.th_dates}</th>
                <th className="px-4 py-3">{t.th_guests}</th>
                <th className="px-4 py-3">{t.th_price}</th>
                <th className="px-4 py-3">{t.th_status}</th>
                <th className="px-4 py-3">{t.th_actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{listingMap.get(b.listing_id)?.title || "—"}</td>
                  <td className="px-4 py-3">
                    <div>{b.guest_name}</div>
                    <div className="text-xs text-slate-400">{b.guest_email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.check_in}<br />→ {b.check_out}</td>
                  <td className="px-4 py-3">{b.guests_count}{t.guests_count_unit}</td>
                  <td className="px-4 py-3 font-semibold">{formatJPY(b.total_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                    <span className={`ml-1 rounded-full px-2 py-1 text-[10px] font-semibold ${PAY_STYLE[b.payment_status] || PAY_STYLE.unpaid}`}>
                      {PAY_LABEL[b.payment_status] || PAY_LABEL.unpaid}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {b.status === "pending" && (
                        <button onClick={() => setStatus(b, "confirmed")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                          <Check className="h-3.5 w-3.5" /> {t.act_approve}
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button onClick={() => setStatus(b, "completed")} className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                          <Clock className="h-3.5 w-3.5" /> {t.act_complete}
                        </button>
                      )}
                      {b.status !== "cancelled" && b.status !== "completed" && (
                        <button onClick={() => setStatus(b, "cancelled")} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                          <X className="h-3.5 w-3.5" /> {t.act_cancel}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
