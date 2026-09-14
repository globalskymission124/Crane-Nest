"use client";

// お気に入り（ウィッシュリスト）— 複数リスト対応（Airbnb風）
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Plus, X } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import WishlistButton from "@/components/stays/WishlistButton";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { useStaysT } from "@/lib/stays/i18n";
import {
  fetchWishlist,
  fetchWishlistCollections,
  createWishlistCollection,
  deleteWishlistCollection,
  setWishlistCollection,
} from "@/lib/stays/v2";
import { fetchListings } from "@/lib/stays/queries";
import type { Listing, Wishlist, WishlistCollection } from "@/lib/stays/types";

function WishlistBody() {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const { t } = useStaysT();
  const [rows, setRows] = useState<Wishlist[]>([]);
  const [collections, setCollections] = useState<WishlistCollection[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<string>("all"); // "all" | "uncat" | collectionId
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) return;
    const [wl, cols, ls] = await Promise.all([
      fetchWishlist(session.email),
      fetchWishlistCollections(session.email),
      fetchListings(),
    ]);
    setRows(wl);
    setCollections(cols);
    setListings(ls);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const collectionOf = useMemo(() => new Map(rows.map((r) => [r.listing_id, r.collection_id ?? null])), [rows]);

  const visibleRows = rows.filter((r) => {
    if (tab === "all") return true;
    if (tab === "uncat") return !r.collection_id;
    return r.collection_id === tab;
  });

  async function newList() {
    if (!session) return;
    const name = prompt(t.wlListPrompt);
    if (!name?.trim()) return;
    await createWishlistCollection(session.email, name.trim());
    await load();
  }
  async function removeList(id: string) {
    if (!confirm(t.wlDeleteList)) return;
    await deleteWishlistCollection(id);
    if (tab === id) setTab("all");
    await load();
  }
  async function moveItem(listingId: string, collectionId: string | null) {
    if (!session) return;
    setRows((prev) => prev.map((r) => (r.listing_id === listingId ? { ...r, collection_id: collectionId } : r)));
    await setWishlistCollection(session.email, listingId, collectionId);
  }

  if (loading) return <p className="py-20 text-center text-slate-400">{t.loading}</p>;

  const TabBtn = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" /> {t.wishlist}
        </h1>
        <button onClick={newList} className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400">
          <Plus className="h-3.5 w-3.5" /> {t.wlNewList}
        </button>
      </div>

      {/* リストのタブ */}
      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn id="all" label={t.wlAll} />
        {collections.map((c) => (
          <span key={c.id} className="group relative inline-flex items-center">
            <TabBtn id={c.id} label={c.name} />
            <button onClick={() => removeList(c.id)} className="ml-0.5 rounded-full p-0.5 text-slate-300 hover:text-rose-500" aria-label="delete list">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <TabBtn id="uncat" label={t.wlUncat} />
      </div>

      {visibleRows.length === 0 ? (
        <p className="py-16 text-center text-slate-400">
          {t.wlEmpty}
          <Link href="/stays" className="ml-1 text-brand-600 underline">{t.wlFind}</Link>
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRows.map((r) => {
            const l = listingMap.get(r.listing_id);
            if (!l) return null;
            return (
              <div key={r.listing_id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-lg">
                <div className="absolute right-2 top-2 z-10">
                  <WishlistButton
                    listingId={l.id}
                    saved={true}
                    onChange={(sv) => { if (!sv) setRows((prev) => prev.filter((x) => x.listing_id !== l.id)); }}
                  />
                </div>
                <Link href={`/stays/${l.id}`}>
                  <div className="aspect-[4/3] bg-slate-100">
                    {l.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link href={`/stays/${l.id}`}>
                    <h3 className="line-clamp-1 font-semibold text-slate-800">{l.title}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {l.city}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-bold">{fmt(l.price_per_night)}</span>
                      <span className="text-slate-500"> {t.perNight}</span>
                    </p>
                  </Link>
                  {/* リストへ振り分け */}
                  <select
                    value={collectionOf.get(l.id) ?? ""}
                    onChange={(e) => moveItem(l.id, e.target.value || null)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
                  >
                    <option value="">{t.wlUncat}</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard roles={["guest", "host", "admin"]}>
      <WishlistBody />
    </AuthGuard>
  );
}
