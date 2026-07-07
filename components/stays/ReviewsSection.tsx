"use client";

// =========================================================
// レビュー表示 + 投稿フォーム（評価システム）
// =========================================================
import { useState } from "react";
import Stars from "./Stars";
import type { Review } from "@/lib/stays/types";
import { averageRating, createReview } from "@/lib/stays/queries";
import { useStaysT } from "@/lib/stays/i18n";

interface Props {
  listingId: string;
  initialReviews: Review[];
}

export default function ReviewsSection({ listingId, initialReviews }: Props) {
  const { t } = useStaysT();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const avg = averageRating(reviews);

  async function submit() {
    if (!name.trim() || !comment.trim()) return alert("お名前とコメントを入力してください");
    setSubmitting(true);
    try {
      const r = await createReview({
        listing_id: listingId,
        guest_name: name.trim(),
        rating,
        comment: comment.trim(),
      });
      setReviews((prev) => [r, ...prev]);
      setName("");
      setComment("");
      setRating(5);
    } catch (e: any) {
      alert("投稿に失敗しました: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        評価・レビュー
        {avg > 0 && (
          <span className="flex items-center gap-1 text-base font-semibold text-slate-600">
            <Stars value={avg} /> {avg.toFixed(1)}（{reviews.length}件）
          </span>
        )}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.length === 0 && (
          <p className="text-sm text-slate-400">まだレビューはありません。最初のレビューを書きましょう。</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                {r.guest_name}
                {r.booking_id && (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    ✓ {t.verifiedStay}
                  </span>
                )}
              </span>
              <Stars value={r.rating} size={14} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
            {r.host_reply && (
              <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                <span className="font-semibold">オーナーより：</span> {r.host_reply}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 font-semibold">レビューを書く</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">評価:</span>
          <Stars value={rating} size={22} onChange={setRating} />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="お名前"
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="滞在の感想を教えてください"
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "投稿中…" : "レビューを投稿"}
        </button>
      </div>
    </section>
  );
}
