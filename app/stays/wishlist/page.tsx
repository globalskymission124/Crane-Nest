"use client";

// お気に入り（ウィッシュリスト）一覧
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import WishlistButton from "@/components/stays/WishlistButton";
import { useStaysSession } from "@/lib/stays/auth";
import { useCurrency } from "@/lib/stays/currency";
import { fetchWishlist } from "@/lib/stays/v2";
import { fetchListings } from "@/lib/stays/queries";
import type { Listing } from "@/lib/stays/types";

function WishlistBody() {
  const { session } = useStaysSession();
  const { fmt } = useCurrency();
  const [items, setItems] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [wl, listings] = await Promise.all([fetchWishlist(session.email), fetchListings()]);
      const ids = new Set(wl.map((w) => w.listing_id));
      setSaved(ids);
      setItems(listings.filter((l) => ids.has(l.id)));
      setLoading(false);
    })();
  }, [session?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
        <Heart className="h-6 w-6 fill-rose-500 text-rose-500" /> お気に入り
      </h1>
      {items.filter((l) => saved.has(l.id)).length === 0 ? (
        <p className="py-16 text-center text-slate-400">
          お気に入りはまだありません。
          <Link href="/stays" className="ml-1 text-brand-600 underline">宿を探す</Link>
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items
            .filter((l) => saved.has(l.id))
            .map((l) => (
              <Link key={l.id} href={`/stays/${l.id}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-lg">
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
                <div className="aspect-[4/3] bg-slate-100">
                  {l.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 font-semibold text-slate-800">{l.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {l.city}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-bold">{fmt(l.price_per_night)}</span>
                    <span className="text-slate-500"> / 泊</span>
                  </p>
                </div>
              </Link>
            ))}
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
