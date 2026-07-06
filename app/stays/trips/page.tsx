"use client";

// 旅程（マイ予約）: 支払い / キャンセル（ポリシーに基づく返金） / レビュー導線
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CreditCard, Luggage } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { fetchBookingsByEmail, notify, audit } from "@/lib/stays/v2";
import { fetchAllListings } from "@/lib/stays/queries";
import { updateBookingStatus } from "@/lib/stays/host";
import { calcRefund } from "@/lib/stays/pricing";
import { CANCELLATION_POLICY_LABELS, formatJPY } from "@/lib/stays/types";
import type { Booking, Listing } from "@/lib/stays/types";

const STATUS_LABEL: Record<Booking["status"], { label: string; cls: string }> = {
  pending: { label: "承認待ち", cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "確定", cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "宿泊済み", cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "キャンセル", cls: "bg-rose-50 text-rose-600" },
};

const PAY_LABEL: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "未払い", cls: "bg-slate-100 text-slate-500" },
  paid: { label: "支払済み", cls: "bg-emerald-50 text-emerald-700" },
  refunded: { label: "返金済み", cls: "bg-sky-50 text-sky-700" },
  partially_refunded: { label: "一部返金", cls: "bg-sky-50 text-sky-700" },
};

function TripsBody() {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Map<string, Listing>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [bs, ls] = await Promise.all([fetchBookingsByEmail(session.email), fetchAllListings()]);
      setBookings(bs);
      setListings(new Map(ls.map((l) => [l.id, l])));
      setLoading(false);
    })();
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = useMemo(() => bookings.filter((b) => b.status !== "cancelled"), [bookings]);
  const cancelled = useMemo(() => bookings.filter((b) => b.status === "cancelled"), [bookings]);

  async function pay(b: Booking) {
    setBusy(b.id);
    try {
      const res = await fetch("/api/stays/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: b.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      window.location.href = json.url;
    } catch (e: any) {
      alert("決済を開始できませんでした: " + (e?.message || e));
      setBusy(null);
    }
  }

  async function cancel(b: Booking) {
    const listing = listings.get(b.listing_id);
    if (!listing || !session) return;
    const refund = b.payment_status === "paid" ? calcRefund(b, listing.cancellation_policy) : 0;
    const msg =
      b.payment_status === "paid"
        ? `キャンセルしますか?\nポリシー: ${CANCELLATION_POLICY_LABELS[listing.cancellation_policy]}\n返金額: ${formatJPY(refund)}`
        : "この予約をキャンセルしますか?";
    if (!confirm(msg)) return;
    setBusy(b.id);
    try {
      if (b.payment_status === "paid") {
        const res = await fetch("/api/stays/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: b.id, amount: refund }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await updateBookingStatus(b.id, "cancelled");
      await notify(
        "host@demo.com",
        "予約がキャンセルされました",
        `${listing.title} ${b.check_in}〜${b.check_out}（返金 ${formatJPY(refund)}）`,
        "/host"
      );
      await audit(session.email, session.role, "booking.cancel", b.id, `refund=${refund}`);
      setBookings((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, status: "cancelled" } : x))
      );
    } catch (e: any) {
      alert("キャンセルに失敗しました: " + (e?.message || e));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  function BookingCard({ b }: { b: Booking }) {
    const l = listings.get(b.listing_id);
    const st = STATUS_LABEL[b.status];
    const pay_ = PAY_LABEL[b.payment_status] || PAY_LABEL.unpaid;
    const canPay = b.payment_status === "unpaid" && b.status !== "cancelled";
    const canCancel = (b.status === "pending" || b.status === "confirmed") && b.check_in >= new Date().toISOString().slice(0, 10);
    return (
      <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
          {l?.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.photos[0]} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/stays/${b.listing_id}`} className="font-semibold text-slate-800 hover:underline">
              {l?.title || "宿"}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${pay_.cls}`}>{pay_.label}</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4" /> {b.check_in} → {b.check_out}・{b.guests_count}名
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">{fmt(b.total_price)}</p>
          {l && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {CANCELLATION_POLICY_LABELS[l.cancellation_policy]}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {canPay && (
              <button
                onClick={() => pay(b)}
                disabled={busy === b.id}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <CreditCard className="h-3.5 w-3.5" /> 今すぐ支払う
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => cancel(b)}
                disabled={busy === b.id}
                className="rounded-xl border border-rose-200 px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                キャンセル
              </button>
            )}
            {b.status === "completed" && (
              <Link
                href={`/stays/${b.listing_id}#reviews`}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                レビューを書く
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
        <Luggage className="h-6 w-6 text-brand-600" /> 旅程・予約履歴
      </h1>
      {upcoming.length === 0 && cancelled.length === 0 && (
        <p className="py-16 text-center text-slate-400">
          予約はまだありません。
          <Link href="/stays" className="ml-1 text-brand-600 underline">宿を探す</Link>
        </p>
      )}
      <div className="grid gap-3">
        {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
      </div>
      {cancelled.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-bold text-slate-400">キャンセル済み</h2>
          <div className="grid gap-3 opacity-70">
            {cancelled.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function TripsPage() {
  return (
    <AuthGuard roles={["guest", "host", "admin"]}>
      <TripsBody />
    </AuthGuard>
  );
}
