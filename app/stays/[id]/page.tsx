"use client";

// =========================================================
// ゲスト：宿の詳細ページ v2
// 写真 / 地図 / アメニティ / 予約 / レビュー(カテゴリ別) / チャット
// キャンセルポリシー / 即時予約 / 類似宿レコメンド / 通報
// =========================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, BedDouble, Bath, Star, Zap, ShieldCheck, Flag } from "lucide-react";
import StaysMap from "@/components/stays/StaysMap";
import BookingWidget from "@/components/stays/BookingWidget";
import ReviewsSection from "@/components/stays/ReviewsSection";
import ReviewHighlights from "@/components/stays/ReviewHighlights";
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
  averageRating,
} from "@/lib/stays/queries";
import { createReport, fetchWishlist, similarListings } from "@/lib/stays/v2";
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

  useEffect(() => {
    (async () => {
      try {
        const l = await fetchListing(params.id);
        setListing(l);
        if (l) {
          const [h, rv, bl, bk, all] = await Promise.all([
            fetchHost(l.host_id),
            fetchReviews(l.id),
            fetchBlocks(l.id),
            fetchBookings(l.id),
            fetchListings(),
          ]);
          setHost(h);
          setReviews(rv);
          setBlocks(bl);
          setBookings(bk);
          setSimilar(similarListings(l, all));
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
          <WishlistButton listingId={listing.id} saved={savedHere} onChange={setSavedHere} className="border border-slate-200" />
          <button onClick={report} aria-label="通報" className="rounded-full border border-slate-200 bg-white p-2 shadow hover:bg-slate-50">
            <Flag className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 写真ギャラリー */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100">
        <div className="aspect-[16/9] w-full">
          {listing.photos[activePhoto] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photos[activePhoto]} alt={listing.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">No Image</div>
          )}
        </div>
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

          {host && (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                {host.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{t.hostLabel}: {host.name}</p>
                <p className="text-xs text-slate-500">{listing.city}</p>
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
            {(listing.weekly_discount_pct > 0 || listing.monthly_discount_pct > 0) && (
              <p className="mt-1 text-xs text-emerald-600">
                {listing.weekly_discount_pct > 0 && `${listing.weekly_discount_pct}${t.weeklyOff}`}
                {listing.weekly_discount_pct > 0 && listing.monthly_discount_pct > 0 && "・"}
                {listing.monthly_discount_pct > 0 && `${listing.monthly_discount_pct}${t.monthlyOff}`}
              </p>
            )}
          </div>

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
            <ReviewHighlights reviews={reviews} />
            <ReviewsSection listingId={listing.id} initialReviews={reviews} />
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
    </div>
  );
}
