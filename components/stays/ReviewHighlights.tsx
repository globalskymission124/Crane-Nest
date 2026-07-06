"use client";

// レビューAIハイライト: 全レビューから頻出トピックを抽出してチップ表示
import { Sparkles } from "lucide-react";
import type { Review } from "@/lib/stays/types";

const TOPICS: [RegExp, string][] = [
  [/清潔|きれい|綺麗|クリーン|clean/i, "清潔さが好評"],
  [/立地|アクセス|近い|便利|location|access/i, "立地・アクセス"],
  [/駅|station/i, "駅チカ"],
  [/空港|関空|airport/i, "空港に近い"],
  [/広い|ゆったり|spacious|large/i, "広々"],
  [/静か|quiet|落ち着/i, "静かな環境"],
  [/親切|丁寧|優しい|friendly|helpful|kind/i, "ホストが親切"],
  [/駐車|parking/i, "駐車場が便利"],
  [/コスパ|安い|お得|value|price/i, "コスパ良し"],
  [/家族|子供|kids|family/i, "家族向き"],
];

export default function ReviewHighlights({ reviews }: { reviews: Review[] }) {
  const visible = reviews.filter((r) => !r.is_hidden);
  if (visible.length < 2) return null;
  const counts = TOPICS.map(([re, label]) => ({
    label,
    n: visible.filter((r) => re.test(r.comment)).length,
  }))
    .filter((t) => t.n >= 1)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  if (counts.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl bg-brand-50 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand-700">
        <Sparkles className="h-3.5 w-3.5" /> AIレビューハイライト（{visible.length}件から抽出）
      </p>
      <div className="flex flex-wrap gap-1.5">
        {counts.map((t) => (
          <span key={t.label} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {t.label} <span className="text-slate-400">×{t.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
