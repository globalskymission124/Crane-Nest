"use client";

// =========================================================
// 予約ウィジェット v2
// 日付選択 → 空室判定 → 料金計算（長期割引/クーポン）→ 予約作成
// → 即時予約（instant_book）は自動確定 → Stripe/モック決済
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CreditCard, Tag, Zap } from "lucide-react";
import type { Addon, Booking, CalendarBlock, Coupon, Listing, PlatformSettings } from "@/lib/stays/types";
import { formatJPY } from "@/lib/stays/types";
import { buildBlockedNights, isRangeAvailable, todayStr } from "@/lib/stays/availability";
import { createBooking } from "@/lib/stays/queries";
import { calcQuote, couponError } from "@/lib/stays/pricing";
import { addPoints, fetchAddons, fetchBookingsByEmail, fetchCouponByCode, fetchPlatformSettings, fetchPointsBalance, incrementCouponUse, notify, audit } from "@/lib/stays/v2";
import { getTier, LOYALTY_LABELS, type LoyaltyTier } from "@/lib/stays/loyalty";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { useStaysT } from "@/lib/stays/i18n";

interface Props {
  listing: Listing;
  blocks: CalendarBlock[];
  bookings: Booking[];
  onBooked?: (b: Booking) => void;
}

export default function BookingWidget({ listing, blocks, bookings, onBooked }: Props) {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const { t, lang } = useStaysT();
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
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [tier, setTier] = useState<LoyaltyTier | null>(null);

  // ログイン済みなら名前/メールを自動入力
  useEffect(() => {
    if (session) {
      setName((n) => n || session.name);
      setEmail((e) => e || session.email);
    }
  }, [session]);

  // 料率設定とアドオンを取得
  useEffect(() => {
    fetchPlatformSettings().then(setSettings);
    fetchAddons(listing.id, listing.host_id).then(setAddons);
  }, [listing.id, listing.host_id]);

  // ポイント残高 + 会員ランク
  useEffect(() => {
    if (session) {
      fetchPointsBalance(session.email).then(setPointsBalance);
      fetchBookingsByEmail(session.email).then((bs) => setTier(getTier(bs)));
    }
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const blockedNights = useMemo(() => buildBlockedNights(blocks, bookings), [blocks, bookings]);
  const available =
    checkIn && checkOut ? isRangeAvailable(checkIn, checkOut, blockedNights) : true;
  const chosenAddons = useMemo(
    () => addons.filter((a) => selectedAddons.has(a.id)),
    [addons, selectedAddons]
  );
  const quote = useMemo(
    () => (checkIn && checkOut ? calcQuote(listing, checkIn, checkOut, coupon, settings, chosenAddons, tier?.discountPct || 0) : null),
    [listing, checkIn, checkOut, coupon, settings, chosenAddons, tier]
  );
  const nights = quote?.nights || 0;
  const pointsUsed = usePoints && quote ? Math.min(pointsBalance, quote.total) : 0;
  const finalTotal = quote ? Math.max(0, quote.total - pointsUsed) : 0;

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
        total_price: finalTotal,
        note: null,
        status: listing.instant_book ? "confirmed" : "pending",
        payment_status: "unpaid",
        coupon_code: coupon?.code || null,
        discount_amount: (quote!.longStayDiscount || 0) + (quote!.couponDiscount || 0) + (quote!.loyaltyDiscount || 0) + pointsUsed,
        guest_fee: quote!.guestFee,
        host_commission: quote!.hostCommission,
        addons: chosenAddons.map((a) => ({ name: a.name, price: a.price })),
      } as any);
      if (coupon) await incrementCouponUse(coupon.id, coupon.used_count);
      // ポイント: 利用分を減算し、支払予定額に応じて還元
      if (pointsUsed > 0) await addPoints(email.trim(), -pointsUsed, "予約でポイント利用", b.id);
      const earnPct = Number(settings?.points_earn_pct ?? 1);
      const earned = Math.floor((finalTotal * earnPct) / 100);
      if (earned > 0) await addPoints(email.trim(), earned, `予約ポイント還元（${earnPct}%）`, b.id);
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
          {listing.instant_book ? t.bookedInstant : t.bookedRequest}
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          {checkIn} → {checkOut}・{guests} {t.guestsN}<br />
          {t.total} {formatJPY(done.total_price)}
          {!listing.instant_book && ` ${t.pendingApproval}`}
        </p>
        <button
          onClick={handlePay}
          disabled={paying}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {paying ? "…" : t.payNow}
        </button>
        <p className="mt-2 text-[11px] text-emerald-700/70">
          {t.payLater}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p>
          <span className="text-2xl font-bold">{fmt(listing.price_per_night)}</span>
          <span className="text-slate-500"> {t.perNight}</span>
        </p>
        {listing.instant_book && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600">
            <Zap className="h-3 w-3" /> {t.instantBook}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500">{t.checkIn}</span>
          <input
            type="date"
            min={todayStr()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500">{t.checkOut}</span>
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
        <span className="text-[11px] font-semibold text-slate-500">{t.guests}</span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
        >
          {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {t.guestsN}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 grid gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.yourName}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.yourEmail}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder={t.coupon}
              className="w-full py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={applyCoupon}
            className="rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            {t.apply}
          </button>
        </div>
        {couponMsg && (
          <p className={`text-xs ${coupon ? "text-emerald-600" : "text-rose-500"}`}>{couponMsg}</p>
        )}
      </div>

      {checkIn && checkOut && !available && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {t.unavailable}
        </p>
      )}
      {nights > 0 && nights < listing.min_nights && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {t.minNightsWarn} {listing.min_nights}
        </p>
      )}

      {settings?.enable_addons && addons.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{t.options}</p>
          <div className="grid gap-1.5">
            {addons.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAddons.has(a.id)}
                    onChange={(e) =>
                      setSelectedAddons((prev) => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(a.id) : next.delete(a.id);
                        return next;
                      })
                    }
                  />
                  <span>
                    {a.name}
                    {a.description && <span className="block text-[10px] text-slate-400">{a.description}</span>}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">{fmt(a.price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {quote && nights > 0 && available && (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{fmt(listing.price_per_night)} × {nights} {t.nightsUnit}</span>
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
              <span>{t.cleaningFee}</span>
              <span>{fmt(quote.cleaningFee)}</span>
            </div>
          )}
          {quote.couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.couponDiscount}</span>
              <span>-{fmt(quote.couponDiscount)}</span>
            </div>
          )}
          {quote.loyaltyDiscount > 0 && tier && (
            <div className="flex justify-between text-emerald-600">
              <span>{t.loyaltyDiscount} ({LOYALTY_LABELS[tier.key][lang]} -{tier.discountPct}%)</span>
              <span>-{fmt(quote.loyaltyDiscount)}</span>
            </div>
          )}
          {quote.addonsTotal > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{t.optionsTotal}</span>
              <span>{fmt(quote.addonsTotal)}</span>
            </div>
          )}
          {quote.guestFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{t.serviceFee}</span>
              <span>{fmt(quote.guestFee)}</span>
            </div>
          )}
          {session && pointsBalance > 0 && (
            <label className="flex cursor-pointer items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                {t.usePoints} {pointsBalance.toLocaleString()}{t.ptBalance}
              </span>
              {pointsUsed > 0 && <span className="font-bold text-amber-700">-{fmt(pointsUsed)}</span>}
            </label>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
            <span>{t.total}</span>
            <span>{fmt(finalTotal)}</span>
          </div>
          {settings?.points_earn_pct ? (
            <p className="text-right text-[10px] text-amber-600">
              +{Math.floor((finalTotal * Number(settings.points_earn_pct)) / 100).toLocaleString()} {t.ptEarn}
            </p>
          ) : null}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 font-semibold text-white shadow-md disabled:opacity-50"
      >
        {submitting ? t.sending : listing.instant_book ? t.bookNow : t.requestBook}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        {t.policy[listing.cancellation_policy]}
      </p>
    </div>
  );
}
