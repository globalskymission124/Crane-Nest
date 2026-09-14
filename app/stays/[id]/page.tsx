"use client";

// =========================================================
// ゲスト：宿の詳細ページ v2
// 写真 / 地図 / アメニティ / 予約 / レビュー(カテゴリ別) / チャット
// キャンセルポリシー / 即時予約 / 類似宿レコメンド / 通報
// =========================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, BedDouble, Bath, Star, Zap, ShieldCheck, Flag, Award, X, Share2, Check } from "lucide-react";
import StaysMap from "@/components/stays/StaysMap";
import BookingWidget from "@/components/stays/BookingWidget";
import ReviewsSection from "@/components/stays/ReviewsSection";
import ReviewHighlights from "@/components/stays/ReviewHighlights";
import RatingBreakdown from "@/components/stays/RatingBreakdown";
import ContactHostCard from "@/components/stays/ContactHostCard";
import SimilarListings from "@/components/stays/SimilarListings";
import WishlistButton from "@/components/stays/WishlistButton";
import {
  fetchListing,
  fetchListings,
  fetchHost,
  fetchReviews,
  fetchBlocks,
  fetchBookings,
  fetchAllReviews,
  averageRating,
  hostRatingStats,
  type HostRatingStats,
} from "@/lib/stays/queries";
import { createReport, fetchWishlist, similarListings } from "@/lib/stays/v2";
import { addRecent } from "@/lib/stays/recentlyViewed";
import { addDays, buildBlockedNights, todayStr } from "@/lib/stays/availability";
import { useStaysSession } from "@/lib/stays/auth";
import { useStaysT } from "@/lib/stays/i18n";
import type { Booking, CalendarBlock, Host, Listing, Review } from "@/lib/stays/types";

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { session } = useStaysSession();
  const { t } = useStaysT();
  const [listing, setListing] = useState<Listing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [savedHere, setSavedHere] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [hostStats, setHostStats] = useState<HostRatingStats | null>(null);
  const [shared, setShared] = useState(false);

  // 最近見た宿として記録
  useEffect(() => {
    if (listing) addRecent({ id: listing.id, title: listing.title, photo: listing.photos[0], city: listing.city, price: listing.price_per_night });
  }, [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: listing?.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* cancelled */ }
  }

  useEffect(() => {
    (async () => {
      try {
        const l = await fetchListing(params.id);
        setListing(l);
        if (l) {
          const [h, rv, bl, bk, all, allRv] = await Promise.all([
            fetchHost(l.host_id),
            fetchReviews(l.id),
            fetchBlocks(l.id),
            fetchBookings(l.id),
            fetchListings(),
            fetchAllReviews(),
          ]);
          setHost(h);
          setReviews(rv);
          setBlocks(bl);
          setBookings(bk);
          setSimilar(similarListings(l, all));
          setHostStats(hostRatingStats(l.host_id, all, allRv));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  useEffect(() => {
    if (!session || !listing) return;
    fetchWishlist(session.email).then((wl) =>
      setSavedHere(wl.some((w) => w.listing_id === listing.id))
    );
  }, [session?.email, listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function report() {
    const reason = prompt("この宿を通報する理由を入力してください:");
    if (!reason?.trim() || !listing) return;
    await createReport({
      reporter_name: session?.name || "匿名",
      reporter_email: session?.email || "anonymous",
      target_type: "listing",
      target_id: listing.id,
      reason: reason.trim(),
    });
    alert("通報を受け付けました。管理者が確認します。");
  }

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;
  if (!listing)
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">宿が見つかりませんでした。</p>
        <Link href="/stays" className="mt-2 inline-block text-brand-600 underline">
          一覧に戻る
        </Link>
      </div>
    );

  const avg = averageRating(reviews);

  // 宿泊検証レビュー: この宿に完了予約を持つログインゲストのみ投稿可能。
  // 1予約1レビュー（同じbooking_idのレビューが既にあれば不可）。
  const myCompleted = session
    ? bookings.find(
        (b) =>
          b.status === "completed" &&
          b.guest_email.trim().toLowerCase() === session.email.trim().toLowerCase()
      )
    : undefined;
  const alreadyReviewed =
    !!myCompleted && reviews.some((r) => r.booking_id === myCompleted.id);
  const canReview = !!myCompleted && !alreadyReviewed;
  const reviewReason: "login" | "no_stay" | "already" | null = !session
    ? "login"
    : !myCompleted
      ? "no_stay"
      : alreadyReviewed
        ? "already"
        : null;

  // 実データに基づく人気シグナル（偽の演出はしない）
  const recent7 = bookings.filter(
    (b) => b.status !== "cancelled" && b.created_at && Date.now() - new Date(b.created_at).getTime() < 7 * 86400000
  ).length;
  const blockedSet = buildBlockedNights(blocks, bookings);
  let occ30 = 0;
  for (let i = 0; i < 30; i++) if (blockedSet.has(addDays(todayStr(), i))) occ30++;
  const almostFull = occ30 / 30 >= 0.6;

  return (
    <div>
      <Link href="/stays" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {t.backToList}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{listing.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {avg > 0 && (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {avg.toFixed(1)}・{reviews.length}件
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {listing.address || listing.city}
            </span>
            <span>{t.ptype[listing.property_type]}</span>
            {listing.room_type && <span>{t.roomType[listing.room_type]}</span>}
            {listing.instant_book && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                <Zap className="h-3 w-3" /> {t.instantBook}
              </span>
            )}
            {avg >= 4.8 && reviews.length >= 3 && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-white">★ {t.guestFavorite}</span>
            )}
            {recent7 > 0 && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                🔥 {recent7} {t.recentBooked7d}
              </span>
            )}
            {almostFull && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">{t.almostFull}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={share} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow hover:bg-slate-50">
            {shared ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{shared ? t.linkCopied : t.shareListing}</span>
          </button>
          <WishlistButton listingId={listing.id} saved={savedHere} onChange={setSavedHere} className="border border-slate-200" />
          <button onClick={report} aria-label="通報" className="rounded-full border border-slate-200 bg-white p-2 shadow hover:bg-slate-50">
            <Flag className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 写真ギャラリー（クリックで全画面ライトボックス） */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-100">
        <div className="aspect-[16/9] w-full">
          {listing.photos[activePhoto] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photos[activePhoto]}
              alt={listing.title}
              onClick={() => setLightbox(activePhoto)}
              className="h-full w-full cursor-zoom-in object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">No Image</div>
          )}
        </div>
        {listing.photos.length > 0 && (
          <button
            onClick={() => setLightbox(activePhoto)}
            className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-white"
          >
            {t.allPhotos}（{listing.photos.length}）
          </button>
        )}
      </div>
      {listing.photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {listing.photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhoto(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === activePhoto ? "border-brand-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* 左：本文 */}
        <div className="space-y-8 lg:col-span-2">
          <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-5 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {listing.max_guests} {t.maxGuestsLabel}</span>
            <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" /> {listing.bedrooms} {t.bedrooms}</span>
            <span className="flex items-center gap-1.5"><Bath className="h-4 w-4" /> {listing.baths} {t.baths}</span>
            {listing.min_nights > 1 && <span>{t.minNightsLabel}: {listing.min_nights}</span>}
          </div>

          {Array.isArray(listing.highlights) && listing.highlights.length > 0 && (
            <div className="-mt-3 flex flex-wrap gap-2">
              {listing.highlights.map((h) => (
                <span key={h} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {t.highlight[h] || h}
                </span>
              ))}
            </div>
          )}

          {host && (
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                {host.name.charAt(0)}
                {hostStats?.isSuperhost && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow ring-2 ring-white">
                    <Award className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  {t.hostLabel}: {host.name}
                  {hostStats?.isSuperhost && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                      <Award className="h-3 w-3" /> スーパーホスト
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {listing.city}
                  {hostStats && hostStats.reviewCount > 0 && (
                    <>
                      {" "}・ <Star className="mb-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" />{" "}
                      {hostStats.avgRating.toFixed(1)}（{hostStats.reviewCount}件）
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-bold">{t.about}</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{listing.description}</p>
          </div>

          {listing.amenities.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold">{t.amenitiesTitle}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-3">
                {listing.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    ✓ {t.amenity[a] || a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t.policyTitle}
            </h2>
            <p className="text-sm text-slate-600">
              {t.policy[listing.cancellation_policy]}
            </p>
            {/* 返金タイムライン（視覚化） */}
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-slate-500">{t.cxlTimeline}</p>
              <div className="flex overflow-hidden rounded-full text-center text-[10px] font-bold text-white">
                {(listing.cancellation_policy === "flexible"
                  ? [{ w: 85, c: "bg-emerald-500", l: t.cxlFull }, { w: 15, c: "bg-slate-300", l: t.cxlNone }]
                  : listing.cancellation_policy === "moderate"
                    ? [{ w: 50, c: "bg-emerald-500", l: t.cxlFull }, { w: 35, c: "bg-amber-500", l: t.cxlHalf }, { w: 15, c: "bg-slate-300", l: t.cxlNone }]
                    : [{ w: 45, c: "bg-amber-500", l: t.cxlHalf }, { w: 55, c: "bg-slate-300", l: t.cxlNone }]
                ).map((seg, i) => (
                  <div key={i} className={`${seg.c} py-1`} style={{ width: `${seg.w}%` }} title={seg.l}>{seg.l}</div>
                ))}
              </div>
            </div>
            {(listing.weekly_discount_pct > 0 || listing.monthly_discount_pct > 0) && (
              <p className="mt-1 text-xs text-emerald-600">
                {listing.weekly_discount_pct > 0 && `${listing.weekly_discount_pct}${t.weeklyOff}`}
                {listing.weekly_discount_pct > 0 && listing.monthly_discount_pct > 0 && "・"}
                {listing.monthly_discount_pct > 0 && `${listing.monthly_discount_pct}${t.monthlyOff}`}
              </p>
            )}
          </div>

          {(listing.check_in_time || listing.check_out_time || listing.quiet_hours || typeof listing.allow_pets === "boolean" || typeof listing.allow_smoking === "boolean") && (
            <div>
              <h2 className="mb-3 text-lg font-bold">{t.houseRulesTitle}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-3">
                {listing.check_in_time && <span className="rounded-lg bg-slate-50 px-3 py-2">{t.checkinTimeLabel}: {listing.check_in_time}</span>}
                {listing.check_out_time && <span className="rounded-lg bg-slate-50 px-3 py-2">{t.checkoutTimeLabel}: {listing.check_out_time}</span>}
                {listing.quiet_hours && <span className="rounded-lg bg-slate-50 px-3 py-2">{t.quietHoursLabel}: {listing.quiet_hours}</span>}
                <span className="rounded-lg bg-slate-50 px-3 py-2">{t.ruleChildren}: {listing.allow_children === false ? t.ruleNotAllowed : t.ruleAllowed}</span>
                <span className="rounded-lg bg-slate-50 px-3 py-2">{t.rulePets}: {listing.allow_pets ? t.ruleAllowed : t.ruleNotAllowed}</span>
                <span className="rounded-lg bg-slate-50 px-3 py-2">{t.ruleSmoking}: {listing.allow_smoking ? t.ruleAllowed : t.ruleNotAllowed}</span>
                <span className="rounded-lg bg-slate-50 px-3 py-2">{t.ruleEvents}: {listing.allow_events ? t.ruleAllowed : t.ruleNotAllowed}</span>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-lg font-bold">{t.location}</h2>
            {listing.lat != null && listing.lng != null ? (
              <StaysMap
                markers={[{ id: listing.id, lat: listing.lat, lng: listing.lng, title: listing.title, price: listing.price_per_night }]}
                center={[listing.lat, listing.lng]}
                zoom={14}
                className="h-72 w-full overflow-hidden rounded-2xl border border-slate-200"
              />
            ) : (
              <p className="text-sm text-slate-400">{t.noLocation}</p>
            )}
          </div>

          <div id="reviews">
            <RatingBreakdown reviews={reviews} />
            <ReviewHighlights reviews={reviews} />
            <ReviewsSection
              listingId={listing.id}
              initialReviews={reviews}
              canReview={canReview}
              bookingId={myCompleted?.id ?? null}
              reviewerName={session?.name ?? ""}
              reason={reviewReason}
            />
          </div>
          <ContactHostCard listing={listing} host={host} />
          <SimilarListings listings={similar} />
        </div>

        {/* 右：予約ウィジェット（PCで追従） */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <BookingWidget
              listing={listing}
              blocks={blocks}
              bookings={bookings}
              onBooked={(b) => setBookings((prev) => [...prev, b])}
            />
          </div>
        </div>
      </div>

      {/* 全画面ライトボックス */}
      {lightbox !== null && listing.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t.close}
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i - 1 + listing.photos.length) % listing.photos.length)); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
            aria-label="prev"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photos[lightbox]}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? 0 : (i + 1) % listing.photos.length)); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
            aria-label="next"
          >
            <ArrowLeft className="h-6 w-6 rotate-180" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {lightbox + 1} / {listing.photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
