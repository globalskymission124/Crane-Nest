"use client";

// =========================================================
// ゲスト：体験（Experiences）一覧
// =========================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Users, Sparkles } from "lucide-react";
import { fetchExperiences } from "@/lib/stays/experiences";
import { useCurrency } from "@/lib/stays/currency";
import {
  EXPERIENCE_CATEGORY_LABELS,
  type Experience,
  type ExperienceCategory,
} from "@/lib/stays/types";

export default function ExperiencesPage() {
  const { fmt } = useCurrency();
  const [items, setItems] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<ExperienceCategory | "all">("all");

  useEffect(() => {
    fetchExperiences().then((e) => {
      setItems(e);
      setLoading(false);
    });
  }, []);

  const cats = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return (Object.keys(EXPERIENCE_CATEGORY_LABELS) as ExperienceCategory[]).filter((c) => present.has(c));
  }, [items]);

  const filtered = cat === "all" ? items : items.filter((i) => i.category === cat);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Sparkles className="h-6 w-6 text-brand-600" /> 体験
        </h1>
        <p className="mt-1 text-sm text-slate-500">地元ホストが案内する、ここでしかできないアクティビティ。</p>
      </header>

      {/* カテゴリ絞り込み */}
      {cats.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setCat("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              cat === "all" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            すべて
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                cat === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {EXPERIENCE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-slate-400">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-slate-400">まだ体験がありません。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link key={e.id} href={`/stays/experiences/${e.id}`} className="group block">
              <div className="relative aspect-[1.2] overflow-hidden rounded-[1.4rem] bg-slate-100">
                {e.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photos[0]} alt={e.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">No Image</div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">
                  {EXPERIENCE_CATEGORY_LABELS[e.category]}
                </span>
              </div>
              <div className="pt-3">
                <h3 className="line-clamp-1 text-base font-black text-slate-950">{e.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.city}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(e.duration_minutes / 60 * 10) / 10}時間</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 最大{e.max_guests}名</span>
                </p>
                <p className="mt-1 text-base font-black text-slate-950">
                  {fmt(e.price_per_person)}<span className="text-sm font-semibold text-slate-500"> / 1名</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
