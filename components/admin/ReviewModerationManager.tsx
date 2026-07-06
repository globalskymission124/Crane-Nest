"use client";

// =========================================================
// 管理者：レビューのモデレーション
//  - 評価/コメント/オーナー返信の編集
//  - 非表示（論理削除）/ 再表示のトグル
//  - 完全削除
// =========================================================
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Check, X, Star } from "lucide-react";
import { fetchAllReviews, fetchAllListings } from "@/lib/stays/queries";
import { updateReview, deleteReview } from "@/lib/stays/host";
import type { Listing, Review } from "@/lib/stays/types";

export default function ReviewModerationManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [editing, setEditing] = useState<Review | null>(null);
  const [draft, setDraft] = useState<{ rating: number; comment: string; host_reply: string }>({
    rating: 5,
    comment: "",
    host_reply: "",
  });

  async function load() {
    const [rv, ls] = await Promise.all([fetchAllReviews(), fetchAllListings()]);
    setReviews(rv);
    setListings(ls);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const listingMap = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const filtered = reviews.filter((r) =>
    filter === "all" ? true : filter === "hidden" ? r.is_hidden : !r.is_hidden
  );

  function startEdit(r: Review) {
    setEditing(r);
    setDraft({ rating: r.rating, comment: r.comment, host_reply: r.host_reply || "" });
  }

  async function saveEdit() {
    if (!editing) return;
    await updateReview(editing.id, {
      rating: draft.rating,
      comment: draft.comment,
      host_reply: draft.host_reply || null,
    });
    setReviews((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? { ...r, rating: draft.rating, comment: draft.comment, host_reply: draft.host_reply || null }
          : r
      )
    );
    setEditing(null);
  }

  async function toggleHidden(r: Review) {
    await updateReview(r.id, { is_hidden: !r.is_hidden });
    setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_hidden: !x.is_hidden } : x)));
  }

  async function remove(r: Review) {
    if (!confirm("このレビューを完全に削除しますか？（元に戻せません）")) return;
    await deleteReview(r.id);
    setReviews((prev) => prev.filter((x) => x.id !== r.id));
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold text-slate-800">レビュー管理</h1>
      <p className="mb-4 text-sm text-slate-500">
        投稿されたレビューの編集・非表示・削除ができます。
      </p>

      <div className="mb-4 flex gap-1.5">
        {(["all", "visible", "hidden"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"
            }`}
          >
            {f === "all" ? "すべて" : f === "visible" ? "表示中" : "非表示"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-400">レビューはありません。</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 ${
                r.is_hidden ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"
              }`}
            >
              {editing?.id === r.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setDraft({ ...draft, rating: s })}>
                        <Star
                          className={s <= draft.rating ? "h-5 w-5 fill-amber-400 text-amber-400" : "h-5 w-5 text-slate-300"}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draft.comment}
                    onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="コメント"
                  />
                  <textarea
                    value={draft.host_reply}
                    onChange={(e) => setDraft({ ...draft, host_reply: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="オーナー返信（任意）"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                      <Check className="h-3.5 w-3.5" /> 保存
                    </button>
                    <button onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <X className="h-3.5 w-3.5" /> キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{r.guest_name}</span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={s <= r.rating ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-slate-300"} />
                        ))}
                      </span>
                      {r.is_hidden && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">非表示中</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{listingMap.get(r.listing_id)?.title || "—"}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>
                  {r.host_reply && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      <span className="font-semibold">オーナー返信：</span> {r.host_reply}
                    </p>
                  )}
                  <div className="mt-3 flex gap-1.5">
                    <button onClick={() => startEdit(r)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                      <Pencil className="h-3.5 w-3.5" /> 編集
                    </button>
                    <button onClick={() => toggleHidden(r)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                      {r.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {r.is_hidden ? "再表示" : "非表示"}
                    </button>
                    <button onClick={() => remove(r)} className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" /> 削除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
