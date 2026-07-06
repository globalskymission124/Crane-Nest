"use client";

// =========================================================
// 予約ウィジェット v2
// 日付選択 → 空室判定 → 料金計算（長期割引/クーポン）→ 予約作成
// → 即時予約（instant_book）は自動確定 → Stripe/モック決済
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CreditCard, Tag, Zap } from "lucide-react";
import type { Booking, CalendarBlock, Coupon, Listing } from "@/lib/stays/types";
import { CANCELLATION_POLICY_LABELS, formatJPY } from "@/lib/stays/types";
import { buildBlockedNights, isRangeAvailable, todayStr } from "@/lib/stays/availability";
import { createBooking } from "@/lib/stays/queries";
import { calcQuote, couponError } from "@/lib/stays/pricing";
import { fetchCouponByCode, incrementCouponUse, notify, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";

interface Props {
  listing: Listing;
  blocks: CalendarBlock[];
  bookings: Booking[];
  onBooked?: (b: Booking) => void;
}

export default function BookingWidget({ listing, blocks, bookings, onBooked }: Props) {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  // ログイン済みなら名前/メールを自動入力
  useEffect(() => {
    if (session) {
      setName((n) => n || session.name);
      setEmail((e) => e || session.email);
    }
  }, [session]);

  const blockedNights = useMemo(() => buildBlockedNights(blocks, bookings), [blocks, bookings]);
  const available =
    checkIn && checkOut ? isRangeAvailable(checkIn, checkOut, blockedNights) : true;
  const quote = useMemo(
    () => (checkIn && checkOut ? calcQuote(listing, checkIn, checkOut, coupon) : null),
    [listing, checkIn, checkOut, coupon]
  );
  const nights = quote?.nights || 0;

  async function applyCoupon() {
    setCouponMsg(null);
    setCoupon(null);
    if (!couponCode.trim()) return;
    const c = await fetchCouponByCode(couponCode);
    if (!c) return setCouponMsg("クーポンが見つかりません");
    const err = couponError(c, listing);
    if (err) return setCouponMsg(err);
    setCoupon(c);
    setCouponMsg(
      c.discount_type === "percent" ? `適用: ${c.value}% OFF` : `適用: ${formatJPY(c.value)} OFF`
    );
  }

  async function handleSubmit() {
    if (!checkIn || !checkOut || nights <= 0) return alert("チェックイン/アウト日を選択してください");
    if (!available) return alert("選択した期間は予約できません（空室なし）");
    if (nights < listing.min_nights) return alert(`最低${listing.min_nights}泊からご予約いただけます`);
    if (guests > listing.max_guests) return alert(`定員は${listing.max_guests}名です`);
    if (!name.trim() || !email.trim()) return alert("お名前とメールを入力してください");
    setSubmitting(true);
    try {
      const b = await createBooking({
        listing_id: listing.id,
        guest_name: name.trim(),
        guest_email: email.trim(),
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guests,
        total_price: quote!.total,
        note: null,
        status: listing.instant_book ? "confirmed" : "pending",
        payment_status: "unpaid",
        coupon_code: coupon?.code || null,
        discount_amount: (quote!.longStayDiscount || 0) + (quote!.couponDiscount || 0),
      } as any);
      if (coupon) await incrementCouponUse(coupon.id, coupon.used_count);
      await notify(
        "host@demo.com",
        listing.instant_book ? "新しい予約（即時確定）" : "新しい予約リクエスト",
        `${listing.title} ${checkIn}〜${checkOut}・${guests}名・${formatJPY(quote!.total)}`,
        "/host"
      );
      await audit(email.trim(), session?.role || "guest", "booking.create", b.id, listing.title);
      setDone(b);
      onBooked?.(b);
    } catch (e: any) {
      alert("予約に失敗しました: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!done) return;
    setPaying(true);
    try {
      const res = await fetch("/api/stays/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: done.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      window.location.href = json.url;
    } catch (e: any) {
      alert("決済を開始できませんでした: " + (e?.message || e));
      setPaying(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
        <p className="font-semibold text-emerald-800">
          {listing.instant_book ? "予約が確定しました！" : "予約リクエストを送信しました！"}
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          {checkIn} → {checkOut}・{guests}名<br />
          合計 {formatJPY(done.total_price)}
          {!listing.instant_book && "（承認待ち）"}
        </p>
        <button
          onClick={handlePay}
          disabled={paying}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {paying ? "決済ページへ移動中…" : "今すぐ支払う"}
        </button>
        <p className="mt-2 text-[11px] text-emerald-700/70">
          後から「旅程」ページでもお支払いいただけます
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p>
          <span className="text-2xl font-bold">{fmt(listing.price_per_night)}</span>
          <span className="text-slate-500"> / 泊</span>
        </p>
        {listing.instant_book && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600">
            <Zap className="h-3 w-3" /> 即時予約
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500">チェックイン</span>
          <input
            type="date"
            min={todayStr()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500">チェックアウト</span>
          <input
            type="date"
            min={checkIn || todayStr()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-2 block">
        <span className="text-[11px] font-semibold text-slate-500">ゲスト</span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
        >
          {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}名
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 grid gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="お名前"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="クーポンコード"
              className="w-full py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={applyCoupon}
            className="rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            適用
          </button>
        </div>
        {couponMsg && (
          <p className={`text-xs ${coupon ? "text-emerald-600" : "text-rose-500"}`}>{couponMsg}</p>
        )}
      </div>

      {checkIn && checkOut && !available && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          選択した期間は予約できません（既に埋まっています）。
        </p>
      )}
      {nights > 0 && nights < listing.min_nights && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          この宿は最低{listing.min_nights}泊からご予約いただけます。
        </p>
      )}

      {quote && nights > 0 && available && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{fmt(listing.price_per_night)} × {nights}泊</span>
            <span>{fmt(quote.subtotal)}</span>
          </div>
          {quote.longStayDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{quote.longStayLabel}</span>
              <span>-{fmt(quote.longStayDiscount)}</span>
            </div>
          )}
          {quote.cleaningFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>清掃料</span>
              <span>{fmt(quote.cleaningFee)}</span>
            </div>
          )}
          {quote.couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>クーポン割引</span>
              <span>-{fmt(quote.couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
            <span>合計</span>
            <span>{fmt(quote.total)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-semibold text-white shadow-md disabled:opacity-50"
      >
        {submitting ? "送信中…" : listing.instant_book ? "今すぐ予約する" : "予約をリクエスト"}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        {CANCELLATION_POLICY_LABELS[listing.cancellation_policy]}
      </p>
    </div>
  );
}
