"use client";

// =========================================================
// レビュー表示 + 投稿フォーム（評価システム）
// 総合評価に加え、項目別評価（清潔さ・正確さ・チェックイン・価格）を収集・表示する。
// =========================================================
import { useState } from "react";
import Stars from "./Stars";
import type { Review } from "@/lib/stays/types";
import {
  averageRating,
  categoryAverages,
  createReview,
  type ReviewCategory,
} from "@/lib/stays/queries";
import { useStaysT } from "@/lib/stays/i18n";

interface Props {
  listingId: string;
  initialReviews: Review[];
  // 宿泊検証: 完了予約を持つゲストのみレビュー可能。
  canReview?: boolean;
  bookingId?: string | null;
  reviewerName?: string;
  // レビューを書けない理由（未ログイン / 宿泊未完了 / 投稿済み）
  reason?: "login" | "no_stay" | "already" | null;
}

// 項目別評価のラベル（表示順）
const CATEGORY_LABELS: { key: ReviewCategory; label: string }[] = [
  { key: "cleanliness", label: "清潔さ" },
  { key: "accuracy", label: "正確さ" },
  { key: "checkin", label: "チェックイン" },
  { key: "value", label: "価格の妥当性" },
];

export default function ReviewsSection({
  listingId,
  initialReviews,
  canReview = false,
  bookingId = null,
  reviewerName = "",
  reason = null,
}: Props) {
  const { t } = useStaysT();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [posted, setPosted] = useState(false); // この画面で投稿済みか
  const [name, setName] = useState(reviewerName);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 項目別評価の入力状態（初期値5）
  const [cats, setCats] = useState<Record<ReviewCategory, number>>({
    cleanliness: 5,
    accuracy: 5,
    checkin: 5,
    value: 5,
  });
  const setCat = (key: ReviewCategory, v: number) =>
    setCats((prev) => ({ ...prev, [key]: v }));

  const avg = averageRating(reviews);
  const catAvg = categoryAverages(reviews);

  // 総合評価は項目別4つの平均（Airbnbと同じ考え方）
  const overallInput =
    (cats.cleanliness + cats.accuracy + cats.checkin + cats.value) / 4;

  async function submit() {
    if (!name.trim() || !comment.trim()) return alert("お名前とコメントを入力してください");
    setSubmitting(true);
    try {
      const r = await createReview({
        listing_id: listingId,
        guest_name: name.trim(),
        rating: Math.round(overallInput),
        comment: comment.trim(),
        booking_id: bookingId, // 宿泊検証: 完了予約に紐付け →「✓宿泊確認済み」バッジ
        rating_cleanliness: cats.cleanliness,
        rating_accuracy: cats.accuracy,
        rating_checkin: cats.checkin,
        rating_value: cats.value,
      });
      setReviews((prev) => [r, ...prev]);
      setComment("");
      setCats({ cleanliness: 5, accuracy: 5, checkin: 5, value: 5 });
      setPosted(true); // 1予約1レビュー
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

      {/* 項目別評価の平均（1件でも項目別データがあれば表示） */}
      {CATEGORY_LABELS.some((c) => catAvg[c.key] != null) && (
        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          {CATEGORY_LABELS.map((c) => (
            <div key={c.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.label}</span>
                <span className="font-semibold text-slate-800">
                  {catAvg[c.key] != null ? catAvg[c.key]!.toFixed(1) : "—"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${((catAvg[c.key] ?? 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* 宿泊検証: 完了予約を持つゲストのみ投稿フォームを表示 */}
      {canReview && !posted ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-1 font-semibold">レビューを書く</h3>
          <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            ✓ 宿泊確認済みのレビューとして投稿されます
          </p>

          {/* 項目別評価の入力 */}
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORY_LABELS.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                <span className="text-sm text-slate-600">{c.label}</span>
                <Stars value={cats[c.key]} size={20} onChange={(v) => setCat(c.key, v)} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            総合評価：<span className="font-semibold text-slate-700">{overallInput.toFixed(1)}</span>（項目別の平均）
          </p>

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
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          {posted
            ? "レビューを投稿しました。ありがとうございました！"
            : reason === "login"
              ? "レビューはこの宿に宿泊されたゲストのみ投稿できます。ログインしてご確認ください。"
              : reason === "already"
                ? "この宿泊分のレビューは投稿済みです。ありがとうございました！"
                : "レビューは宿泊完了後に投稿できます。ご滞在後にこちらから評価をお寄せください。"}
        </div>
      )}
    </section>
  );
}
