"use client";

// =========================================================
// 印刷用QRポスター: オーナーがこのページをそのまま印刷して掲示する
// =========================================================
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { fetchCheckinPageBySlug, type CheckinPage } from "@/lib/stays/checkin";

export default function CheckinPosterPage({ params }: { params: { slug: string } }) {
  const [page, setPage] = useState<CheckinPage | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/checkin/${params.slug}`);
    fetchCheckinPageBySlug(params.slug).then(setPage);
  }, [params.slug]);

  if (!page) return <p className="py-24 text-center text-slate-400">Loading…</p>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8">
      <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none } }` }} />
      <div className="w-full max-w-md text-center">
        {page.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.logo_url} alt="" className="mx-auto mb-5 h-20 w-20 rounded-2xl object-cover" />
        )}
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{page.title}</h1>
        <p className="mt-3 text-lg font-bold text-slate-700">Guest Check-in — Scan to register</p>
        <p className="text-sm text-slate-500">パスポート登録はこちらのQRコードから / 請掃描QR碼登記護照</p>
        <div className="mx-auto mt-8 inline-block rounded-3xl border-4 border-slate-900 p-6">
          {url && <QRCodeSVG value={url} size={260} includeMargin />}
        </div>
        <p className="mt-4 font-mono text-xs text-slate-400">{url}</p>
        <p className="mt-6 text-xs text-slate-400">
          Registration takes about 1 minute. Please have your passport ready.
        </p>
        <button
          onClick={() => window.print()}
          className="no-print mt-8 rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white"
        >
          このポスターを印刷する 🖨
        </button>
      </div>
    </div>
  );
}
