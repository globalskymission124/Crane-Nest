"use client";

// 決済結果ページ（Stripe成功/キャンセル・モック完了）
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

function ResultBody() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const cancelled = params.get("cancelled");
  const mock = params.get("mock");
  const [state, setState] = useState<"loading" | "paid" | "unpaid" | "cancelled">(
    cancelled ? "cancelled" : mock ? "paid" : "loading"
  );

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/stays/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        setState(json.paid ? "paid" : "unpaid");
      } catch {
        setState("unpaid");
      }
    })();
  }, [sessionId]);

  if (state === "loading")
    return <p className="py-24 text-center text-slate-400">決済結果を確認しています…</p>;

  const ok = state === "paid";
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {ok ? (
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
      ) : (
        <XCircle className="mx-auto mb-3 h-14 w-14 text-rose-400" />
      )}
      <h1 className="text-xl font-extrabold">
        {ok ? "お支払いが完了しました" : state === "cancelled" ? "お支払いをキャンセルしました" : "お支払いを確認できませんでした"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {ok
          ? "予約の詳細は旅程ページからいつでも確認できます。"
          : "旅程ページから再度お支払いいただけます。"}
      </p>
      <Link
        href="/stays/trips"
        className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3 text-sm font-semibold text-white"
      >
        旅程を確認する
      </Link>
    </div>
  );
}

export default function PayResultPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-slate-400">読み込み中…</p>}>
      <ResultBody />
    </Suspense>
  );
}
