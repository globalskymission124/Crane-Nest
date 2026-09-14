"use client";

// 旅程（マイ予約）: 支払い / キャンセル（ポリシーに基づく返金） / レビュー導線
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CreditCard, KeyRound, Luggage, MapPin, TicketCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AuthGuard from "@/components/stays/AuthGuard";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { fetchBookingsByEmail, notify, audit } from "@/lib/stays/v2";
import { fetchAllListings } from "@/lib/stays/queries";
import { updateBookingStatus } from "@/lib/stays/host";
import { calcRefund } from "@/lib/stays/pricing";
import { CANCELLATION_POLICY_LABELS, formatJPY } from "@/lib/stays/types";
import type { Booking, Listing } from "@/lib/stays/types";
import { useStaysT, fmtShortDate } from "@/lib/stays/i18n";
import { todayStr } from "@/lib/stays/availability";

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
    const { t, lang } = useStaysT();
    const l = listings.get(b.listing_id);
    const [showPass, setShowPass] = useState(false);
    // セルフチェックイン: 確定済み予約で、ホストが案内を登録している場合に表示
    const hasCheckin = b.status === "confirmed" && !!l?.checkin_instructions?.trim();
    // チェックインまでの残り日数（前日/当日リマインド用）
    const today = todayStr();
    const daysUntil = Math.ceil(
      (new Date(b.check_in + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
    );
    const imminent = b.status === "confirmed" && daysUntil >= 0 && daysUntil <= 1;
    // 到着案内は、チェックインが目前なら自動的に開いておく
    const [showCheckin, setShowCheckin] = useState(hasCheckin && imminent);
    // 予約ステータス進捗の現在地: 0=予約確定 1=チェックイン日 2=滞在中 3=チェックアウト済み
    const stepIdx =
      b.status === "completed" || today >= b.check_out ? 3 : today > b.check_in ? 2 : today >= b.check_in ? 1 : 0;
    const steps = [t.stepBooked, t.stepCheckin, t.stepStaying, t.stepDone];
    const reminderText =
      daysUntil === 0 ? t.arriveToday : daysUntil === 1 ? t.arriveTomorrow : t.arriveDaysLeft.replace("{n}", String(daysUntil));
    // デジタル到着パス: 確定済み予約の証明QR（オーナーが到着時に確認）
    const passPayload = `CRANE-NEST-PASS|${b.id}|${b.guest_name}|${b.check_in}|${b.check_out}|${b.guests_count}pax|${b.payment_status}`;
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

          {/* 予約ステータス進捗バー */}
          {b.status !== "cancelled" && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold text-slate-400">{t.tripProgress}</p>
              <div className="flex items-center">
                {steps.map((label, i) => (
                  <div key={i} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          i <= stepIdx ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {i < stepIdx ? "✓" : i + 1}
                      </div>
                      <span className={`mt-1 whitespace-nowrap text-[9px] ${i <= stepIdx ? "font-bold text-brand-700" : "text-slate-400"}`}>
                        {label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`mx-1 mb-4 h-0.5 flex-1 ${i < stepIdx ? "bg-brand-600" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* チェックイン前日/当日リマインド */}
          {imminent && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-amber-800">{t.arriveTitle} · {reminderText}</p>
                <p className="mt-0.5 text-amber-700">
                  {fmtShortDate(b.check_in, lang)} · {l?.check_in_time ? `${l.check_in_time}〜` : ""}
                  {l?.address || ""}
                </p>
              </div>
            </div>
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
            {b.status === "confirmed" && (
              <button
                onClick={() => setShowPass((s) => !s)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-1.5 text-xs font-semibold text-white"
              >
                <TicketCheck className="h-3.5 w-3.5" /> 到着パス
              </button>
            )}
            {hasCheckin && (
              <button
                onClick={() => setShowCheckin((s) => !s)}
                className="flex items-center gap-1.5 rounded-xl border border-brand-200 px-4 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                <KeyRound className="h-3.5 w-3.5" /> セルフチェックイン案内
              </button>
            )}
          </div>
          {hasCheckin && showCheckin && (
            <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
                <KeyRound className="h-4 w-4" /> セルフチェックイン案内
              </p>
              {l?.address && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {l.address}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {l!.checkin_instructions}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                ※ 到着時に問題があれば、メッセージからホストへご連絡ください。
              </p>
            </div>
          )}
          {showPass && b.status === "confirmed" && (
            <div className="mt-3 flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-4">
              <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
                <QRCodeSVG value={passPayload} size={96} />
              </div>
              <div className="min-w-0 text-xs text-slate-600">
                <p className="font-bold text-brand-700">Digital Arrival Pass</p>
                <p className="mt-1">到着時にこのQRをホストに見せてください。予約内容(氏名・日程・人数・支払状況)を即座に確認できます。</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">#{b.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          )}
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
