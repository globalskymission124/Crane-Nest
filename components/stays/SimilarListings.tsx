"use client";

// 類似宿のレコメンド（同エリア・同タイプ・近い価格帯・共通アメニティで採点）
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCurrency } from "@/lib/stays/currency";
import type { Listing } from "@/lib/stays/types";

export default function SimilarListings({ listings }: { listings: Listing[] }) {
  const { fmt } = useCurrency();
  if (listings.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Sparkles className="h-5 w-5 text-brand-600" /> この宿に似ているおすすめ
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {listings.map((l) => (
          <Link key={l.id} href={`/stays/${l.id}`} className="group overflow-hidden rounded-xl border border-slate-200">
            <div className="aspect-[4/3] bg-slate-100">
              {l.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              )}
            </div>
            <div className="p-2">
              <p className="line-clamp-1 text-xs font-semibold text-slate-700">{l.title}</p>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-800">{fmt(l.price_per_night)}</span> / 泊
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
