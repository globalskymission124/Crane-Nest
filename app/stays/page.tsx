"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Home,
  MapPin,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import SearchFilters, { DEFAULT_FILTERS, type Filters } from "@/components/stays/SearchFilters";
import StaysMap, { type MapMarker } from "@/components/stays/StaysMap";
import WishlistButton from "@/components/stays/WishlistButton";
import { buildBlockedNights, isRangeAvailable, todayStr } from "@/lib/stays/availability";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { useStaysT } from "@/lib/stays/i18n";
import { fetchWishlist, isFeatured } from "@/lib/stays/v2";
import { averageRating, fetchAllReviews, fetchBlocks, fetchBookings, fetchListings } from "@/lib/stays/queries";
import { DEMO_LISTINGS, DEMO_REVIEWS } from "@/lib/stays/demoData";
import type { Listing, Review } from "@/lib/stays/types";

type SearchSheetProps = {
  open: boolean;
  onClose: () => void;
  q: string;
  setQ: (value: string) => void;
  dateIn: string;
  setDateIn: (value: string) => void;
  dateOut: string;
  setDateOut: (value: string) => void;
  guests: number;
  setGuests: (value: number) => void;
  onClear: () => void;
};

function SearchSheet({
  open,
  onClose,
  q,
  setQ,
  dateIn,
  setDateIn,
  dateOut,
  setDateOut,
  guests,
  setGuests,
  onClear,
}: SearchSheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/35 backdrop-blur-sm sm:hidden" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-[#f7f6f2] px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="grid flex-1 grid-cols-3 text-center text-sm font-bold text-slate-500">
            {[
              { label: "房源", Icon: Home, active: true },
              { label: "体验", Icon: Sparkles, active: false },
              { label: "服务", Icon: Settings2, active: false },
            ].map(({ label, Icon, active }) => (
              <button key={label} className={`relative flex flex-col items-center gap-1 ${active ? "text-slate-950" : ""}`}>
                {!active && <span className="absolute right-4 top-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-white">全新</span>}
                <Icon className="h-7 w-7" />
                {label}
                {active && <span className="mt-0.5 block h-1 w-8 rounded-full bg-slate-950" />}
              </button>
            ))}
          </div>
          <button onClick={onClose} aria-label="閉じる" className="ml-3 rounded-full bg-white p-3 shadow-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="rounded-[1.6rem] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-2xl font-black text-slate-950">地点</h2>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3">
            <Search className="h-5 w-5 text-slate-800" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索目的地"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="mt-4 space-y-3">
            {[
              { title: "附近", sub: "查找周边", Icon: MapPin },
              { title: "大阪市, 大阪府", sub: "机场、动漫、美食", Icon: Home },
              { title: "白滨町, 和歌山县", sub: "魅力海滨", Icon: Sparkles },
              { title: "京都市, 京都府", sub: "町家与古都体验", Icon: CalendarDays },
            ].map(({ title, sub, Icon }) => (
              <button
                key={title}
                onClick={() => setQ(title === "附近" ? "" : title)}
                className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg font-black text-sky-500">
                  <Icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-bold text-slate-950">{title}</span>
                  <span className="text-sm text-slate-500">{sub}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-[1.4rem] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-500">时间</span>
            <div className="flex flex-1 items-center justify-end gap-2 text-sm font-bold">
              <input
                type="date"
                min={todayStr()}
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                className="min-w-0 rounded-xl bg-slate-50 px-2 py-2 outline-none"
              />
              <span className="text-slate-300">→</span>
              <input
                type="date"
                min={dateIn || todayStr()}
                value={dateOut}
                onChange={(e) => setDateOut(e.target.value)}
                className="min-w-0 rounded-xl bg-slate-50 px-2 py-2 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[1.4rem] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="block font-bold text-slate-500">人员</span>
              <span className="text-sm text-slate-400">添加客人</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuests(Math.max(1, guests - 1))}
                className="h-9 w-9 rounded-full border border-slate-300 text-xl font-bold text-slate-500"
                aria-label="人数を減らす"
              >
                -
              </button>
              <span className="w-6 text-center font-black">{guests}</span>
              <button
                onClick={() => setGuests(Math.min(8, guests + 1))}
                className="h-9 w-9 rounded-full bg-slate-950 text-xl font-bold text-white"
                aria-label="人数を増やす"
              >
                +
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={onClear} className="text-lg font-black text-slate-950 underline underline-offset-4">
            清除全部
          </button>
          <button onClick={onClose} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-rose-600/20">
            <Search className="h-5 w-5" /> 搜索
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-black text-slate-950 sm:text-xl">{title}</h2>
      {href && (
        <Link href={href} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-950">
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}

function RatingBadge({ avg }: { avg: number }) {
  if (avg <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
      <Star className="h-4 w-4 fill-slate-900 text-slate-900" />
      {avg.toFixed(2)}
    </span>
  );
}

function nightsBetween(start: string, end: string) {
  if (!start || !end || end <= start) return 2;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const nights = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 2;
}

function ListingCard({
  listing,
  avg,
  reviewCount,
  saved,
  onSaved,
  compact = false,
  price,
  nights,
}: {
  listing: Listing;
  avg: number;
  reviewCount: number;
  saved: boolean;
  onSaved: (saved: boolean) => void;
  compact?: boolean;
  price: string;
  nights: number;
}) {
  const subtitle = `${listing.city} · ${listing.max_guests}人 · ${listing.bedrooms}寝室`;
  return (
    <article className={`group relative shrink-0 ${compact ? "w-[78vw] max-w-[21rem] sm:w-auto" : ""}`}>
      <Link href={`/stays/${listing.id}`} className="block">
        <div className="relative overflow-hidden rounded-[1.4rem] bg-slate-100">
          <div className={compact ? "aspect-[1.08]" : "aspect-[1.12]"}>
            {listing.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-300">No Image</div>
            )}
          </div>
          <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-sm">
            房客推荐
          </span>
        </div>
        <div className="pt-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-lg font-black text-slate-950 sm:text-base">{listing.title}</h3>
            <RatingBadge avg={avg} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">{subtitle}</p>
          <p className="mt-1 text-base font-black text-slate-950">
            {price}
            <span className="font-semibold text-slate-500"> / {nights}晚</span>
          </p>
          {reviewCount > 0 && <p className="mt-0.5 text-xs font-semibold text-slate-400">{reviewCount} 条评价</p>}
        </div>
      </Link>
      <div className="absolute right-3 top-3 z-10">
        <WishlistButton listingId={listing.id} saved={saved} onChange={onSaved} />
      </div>
    </article>
  );
}

export default function StaysHomePage() {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const { t } = useStaysT();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [guests, setGuests] = useState(1);
  const [dateIn, setDateIn] = useState("");
  const [dateOut, setDateOut] = useState("");
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (isLocalPreview) {
        setListings(DEMO_LISTINGS);
        setReviews(DEMO_REVIEWS);
        setLoading(false);
      }
      const [ls, rv] = await Promise.all([fetchListings(), fetchAllReviews()]);
      const hasLiveSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (ls.length > 0 || (!isLocalPreview && hasLiveSupabase)) setListings(ls);
      if (rv.length > 0 || (!isLocalPreview && hasLiveSupabase)) setReviews(rv);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!session) {
      setSaved(new Set());
      return;
    }
    fetchWishlist(session.email).then((wl) => setSaved(new Set(wl.map((w) => w.listing_id))));
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dateIn || !dateOut || dateOut <= dateIn || listings.length === 0) {
      setAvailableIds(null);
      return;
    }
    let alive = true;
    (async () => {
      const results = await Promise.all(
        listings.map(async (l) => {
          const [bl, bk] = await Promise.all([fetchBlocks(l.id), fetchBookings(l.id)]);
          const blocked = buildBlockedNights(bl, bk);
          return isRangeAvailable(dateIn, dateOut, blocked) ? l.id : null;
        })
      );
      if (alive) setAvailableIds(new Set(results.filter((x): x is string => !!x)));
    })();
    return () => {
      alive = false;
    };
  }, [dateIn, dateOut, listings]);

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
      if (availableIds && !availableIds.has(l.id)) return false;
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
        l.address.toLowerCase().includes(kw) ||
        l.description.toLowerCase().includes(kw)
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
        return [...list].sort(
          (a, b) =>
            (isFeatured(b) ? 100 : 0) + avg(b) + Math.min(1, (reviewsByListing.get(b.id)?.length || 0) * 0.1) -
            ((isFeatured(a) ? 100 : 0) + avg(a) + Math.min(1, (reviewsByListing.get(a.id)?.length || 0) * 0.1))
        );
    }
  }, [listings, q, guests, filters, reviewsByListing, availableIds]);

  const featured = useMemo(() => filtered.filter((l) => isFeatured(l) || averageRating(reviewsByListing.get(l.id) || []) >= 4.8), [filtered, reviewsByListing]);
  const osaka = filtered.filter((l) => /大阪|泉佐野|難波|Osaka|Izumisano/i.test(`${l.city} ${l.title} ${l.address}`));
  const kyoto = filtered.filter((l) => /京都|Kyoto/i.test(`${l.city} ${l.title} ${l.address}`));
  const nights = nightsBetween(dateIn, dateOut);
  const dateSummary = dateIn && dateOut ? `${dateIn} 至 ${dateOut}` : "选择日期可查看实时空房";
  const markers: MapMarker[] = filtered
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({ id: l.id, lat: l.lat!, lng: l.lng!, title: l.title, price: l.price_per_night, href: `/stays/${l.id}` }));

  function updateSaved(listingId: string, isSaved: boolean) {
    setSaved((prev) => {
      const next = new Set(prev);
      isSaved ? next.add(listingId) : next.delete(listingId);
      return next;
    });
  }

  function resetSearch() {
    setQ("");
    setGuests(1);
    setDateIn("");
    setDateOut("");
    setAvailableIds(null);
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="-mx-4 -mt-6 bg-white sm:mx-0 sm:mt-0">
      <SearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        q={q}
        setQ={setQ}
        dateIn={dateIn}
        setDateIn={setDateIn}
        dateOut={dateOut}
        setDateOut={setDateOut}
        guests={guests}
        setGuests={setGuests}
        onClear={resetSearch}
      />

      <section className="bg-[#f7f6f2] px-4 pb-4 pt-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:rounded-3xl sm:px-6">
        <button
          onClick={() => setSearchOpen(true)}
          className="mx-auto flex h-16 w-full max-w-3xl items-center justify-center gap-3 rounded-full bg-white text-lg font-black text-slate-950 shadow-sm sm:hidden"
        >
          <Search className="h-5 w-5" /> 开始搜索
        </button>

        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            <SlidersHorizontal className="h-4 w-4" /> 筛选搜索
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 text-center text-sm font-bold text-slate-500 sm:hidden">
          {[
            { label: "房源", Icon: Home, active: true },
            { label: "体验", Icon: Sparkles, active: false },
            { label: "服务", Icon: Settings2, active: false },
          ].map(({ label, Icon, active }) => (
            <button key={label} className={`relative flex flex-col items-center gap-1 ${active ? "text-slate-950" : ""}`}>
              {!active && <span className="absolute right-5 top-0 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-white">全新</span>}
              <Icon className="h-7 w-7" />
              {label}
              {active && <span className="mt-1 block h-1 w-10 rounded-full bg-slate-950" />}
            </button>
          ))}
        </div>
      </section>

      <div className="px-4 pt-6 sm:px-0">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-500">
              {filtered.length} 个房源 · {guests} 位客人 · {dateSummary}
            </p>
            <h1 className="mt-1 hidden text-2xl font-black text-slate-950 sm:block">直观查找关西住宿</h1>
          </div>
          <div className="flex items-center gap-2">
            <SearchFilters filters={filters} onChange={setFilters} />
            <button onClick={resetSearch} className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 sm:block">
              Reset
            </button>
          </div>
        </div>

        {availableIds && (
          <p className="mb-5 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
            {t.availableForDates}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-[1.4rem] bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.4rem] border border-slate-100 bg-white py-16 text-center shadow-sm">
            <p className="text-lg font-black text-slate-800">{t.noResults}</p>
            <button onClick={resetSearch} className="mt-3 rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white">
              条件をリセット
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {featured.length > 0 && (
              <section>
                <SectionHeader title="大阪市的热门房源" href="/stays" />
                <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                  {featured.slice(0, 4).map((l) => {
                    const rv = reviewsByListing.get(l.id) || [];
                    return (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        avg={averageRating(rv)}
                        reviewCount={rv.length}
                        saved={saved.has(l.id)}
                        onSaved={(s) => updateSaved(l.id, s)}
                        compact
                        price={fmt(l.price_per_night * nights + l.cleaning_fee)}
                        nights={nights}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {osaka.length > 0 && (
              <section>
                <SectionHeader title="关西机场与大阪周边" href="/stays" />
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {osaka.slice(0, 6).map((l) => {
                    const rv = reviewsByListing.get(l.id) || [];
                    return (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        avg={averageRating(rv)}
                        reviewCount={rv.length}
                        saved={saved.has(l.id)}
                        onSaved={(s) => updateSaved(l.id, s)}
                        price={fmt(l.price_per_night * nights + l.cleaning_fee)}
                        nights={nights}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {kyoto.length > 0 && (
              <section>
                <SectionHeader title="京都市的房源" href="/stays" />
                <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                  {kyoto.slice(0, 4).map((l) => {
                    const rv = reviewsByListing.get(l.id) || [];
                    return (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        avg={averageRating(rv)}
                        reviewCount={rv.length}
                        saved={saved.has(l.id)}
                        onSaved={(s) => updateSaved(l.id, s)}
                        compact
                        price={fmt(l.price_per_night * nights + l.cleaning_fee)}
                        nights={nights}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <section className="hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:block">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">地图与价格位置</h2>
                  <p className="text-sm font-semibold text-slate-500">搜索结果会同步到地图，便于比较机场、难波、京都的距离。</p>
                </div>
                <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-500">{filtered.length} {t.results}</p>
              </div>
              <StaysMap markers={markers} className="h-[420px] overflow-hidden rounded-2xl border border-slate-100" />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
