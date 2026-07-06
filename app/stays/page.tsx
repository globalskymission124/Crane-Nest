"use client";

// =========================================================
// ゲスト：宿一覧 + 地図検索 v2
// キーワード/人数 + 高度フィルター（価格帯・タイプ・アメニティ・評価・即時予約）
// 並び替え・お気に入り・多通貨表示
// =========================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Users, Star, Map as MapIcon, List, Zap } from "lucide-react";
import StaysMap, { type MapMarker } from "@/components/stays/StaysMap";
import SearchFilters, { DEFAULT_FILTERS, type Filters } from "@/components/stays/SearchFilters";
import WishlistButton from "@/components/stays/WishlistButton";
import { fetchListings, fetchAllReviews, averageRating } from "@/lib/stays/queries";
import { fetchWishlist } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { PROPERTY_TYPE_LABELS } from "@/lib/stays/types";
import type { Listing, Review } from "@/lib/stays/types";

export default function StaysHomePage() {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [guests, setGuests] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"split" | "list" | "map">("split");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ls, rv] = await Promise.all([fetchListings(), fetchAllReviews()]);
        setListings(ls);
        setReviews(rv);
      } catch (e: any) {
        setError("データを取得できませんでした。Supabaseの設定を確認してください。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!session) {
      setSaved(new Set());
      return;
    }
    fetchWishlist(session.email).then((wl) => setSaved(new Set(wl.map((w) => w.listing_id))));
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const reviewsByListing = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const r of reviews) {
      if (!map.has(r.listing_id)) map.set(r.listing_id, []);
      map.get(r.listing_id)!.push(r);
    }
    return map;
  }, [reviews]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = listings.filter((l) => {
      if (l.max_guests < guests) return false;
      if (filters.priceMin != null && l.price_per_night < filters.priceMin) return false;
      if (filters.priceMax != null && l.price_per_night > filters.priceMax) return false;
      if (filters.propertyTypes.length && !filters.propertyTypes.includes(l.property_type)) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => l.amenities.includes(a))) return false;
      if (filters.instantOnly && !l.instant_book) return false;
      if (filters.minRating > 0) {
        const avg = averageRating(reviewsByListing.get(l.id) || []);
        if (avg < filters.minRating) return false;
      }
      if (!kw) return true;
      return (
        l.title.toLowerCase().includes(kw) ||
        l.city.toLowerCase().includes(kw) ||
        l.address.toLowerCase().includes(kw)
      );
    });
    const avg = (l: Listing) => averageRating(reviewsByListing.get(l.id) || []);
    switch (filters.sort) {
      case "price_asc":
        return [...list].sort((a, b) => a.price_per_night - b.price_per_night);
      case "price_desc":
        return [...list].sort((a, b) => b.price_per_night - a.price_per_night);
      case "rating":
        return [...list].sort((a, b) => avg(b) - avg(a));
      default:
        // おすすめ順: 評価 × レビュー数を軽く加味
        return [...list].sort(
          (a, b) =>
            avg(b) + Math.min(1, (reviewsByListing.get(b.id)?.length || 0) * 0.1) -
            (avg(a) + Math.min(1, (reviewsByListing.get(a.id)?.length || 0) * 0.1))
        );
    }
  }, [listings, q, guests, filters, reviewsByListing]);

  const markers: MapMarker[] = filtered
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: l.id,
      lat: l.lat!,
      lng: l.lng!,
      title: l.title,
      price: l.price_per_night,
      href: `/stays/${l.id}`,
    }));

  return (
    <div>
      {/* 検索バー */}
      <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="エリア・宿名で検索（例: 難波、京都）"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3">
          <Users className="h-4 w-4 text-slate-400" />
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="bg-transparent py-2.5 text-sm outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                ゲスト{n}名
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
          {([
            ["split", "分割"],
            ["list", "一覧"],
            ["map", "地図"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                view === v ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {v === "list" ? <List className="mr-1 inline h-3.5 w-3.5" /> : v === "map" ? <MapIcon className="mr-1 inline h-3.5 w-3.5" /> : null}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* フィルター・並び替え */}
      <div className="mb-5 flex items-center justify-between">
        <SearchFilters filters={filters} onChange={setFilters} />
        <p className="text-xs text-slate-400">{filtered.length}件</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}
      {loading ? (
        <p className="py-20 text-center text-slate-400">読み込み中…</p>
      ) : (
        <div
          className={`grid gap-6 ${
            view === "split" ? "lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {view !== "map" && (
            <div className="grid gap-5 sm:grid-cols-2">
              {filtered.length === 0 && (
                <p className="col-span-full py-10 text-center text-slate-400">
                  条件に合う宿が見つかりませんでした。
                </p>
              )}
              {filtered.map((l) => {
                const rv = reviewsByListing.get(l.id) || [];
                const avg = averageRating(rv);
                return (
                  <Link
                    key={l.id}
                    href={`/stays/${l.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg"
                  >
                    <div className="absolute right-2 top-2 z-10">
                      <WishlistButton
                        listingId={l.id}
                        saved={saved.has(l.id)}
                        onChange={(s) =>
                          setSaved((prev) => {
                            const next = new Set(prev);
                            s ? next.add(l.id) : next.delete(l.id);
                            return next;
                          })
                        }
                      />
                    </div>
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      {l.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.photos[0]}
                          alt={l.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 font-semibold text-slate-800">{l.title}</h3>
                        {avg > 0 && (
                          <span className="flex shrink-0 items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {avg.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {l.city}・{PROPERTY_TYPE_LABELS[l.property_type]}・最大{l.max_guests}名
                        {l.instant_book && <Zap className="h-3 w-3 text-amber-500" />}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="font-bold text-slate-900">{fmt(l.price_per_night)}</span>
                        <span className="text-slate-500"> / 泊</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {view !== "list" && (
            <div className={view === "map" ? "" : "lg:sticky lg:top-24 lg:self-start"}>
              <StaysMap
                markers={markers}
                className="h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 lg:h-[70vh]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
