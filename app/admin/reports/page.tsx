"use client";

// =========================================================
// 管理者：通報・紛争対応 + 監査ログ
// =========================================================
import { useEffect, useState } from "react";
import { Flag, ScrollText } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { fetchReports, updateReport, fetchAuditLogs, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import type { AuditLog, Report } from "@/lib/stays/types";

const STATUS_LABEL: Record<Report["status"], { label: string; cls: string }> = {
  open: { label: "未対応", cls: "bg-rose-50 text-rose-600" },
  in_review: { label: "確認中", cls: "bg-amber-50 text-amber-700" },
  resolved: { label: "解決済み", cls: "bg-emerald-50 text-emerald-700" },
  dismissed: { label: "却下", cls: "bg-slate-100 text-slate-500" },
};

const TARGET_LABEL: Record<Report["target_type"], string> = {
  listing: "物件",
  review: "レビュー",
  booking: "予約",
  user: "ユーザー",
};

function AdminReportsBody() {
  const { session } = useStaysSession();
  const [tab, setTab] = useState<"reports" | "audit">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [rs, ls] = await Promise.all([fetchReports(), fetchAuditLogs()]);
      setReports(rs);
      setLogs(ls);
      setLoading(false);
    })();
  }, []);

  async function setStatus(r: Report, status: Report["status"]) {
    let note: string | null = r.resolution_note;
    if (status === "resolved" || status === "dismissed") {
      note = prompt("対応メモ（任意）:", r.resolution_note || "") ?? r.resolution_note;
    }
    await updateReport(r.id, { status, resolution_note: note });
    await audit(session?.email || "", "admin", `report.${status}`, r.id, r.reason.slice(0, 50));
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status, resolution_note: note } : x)));
  }

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-extrabold">
        <Flag className="h-6 w-6 text-brand-600" /> 通報・監査
      </h1>

      <div className="mb-4 flex gap-1.5">
        <button
          onClick={() => setTab("reports")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${tab === "reports" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
        >
          <Flag className="h-3.5 w-3.5" /> 通報 ({reports.filter((r) => r.status === "open").length}件未対応)
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${tab === "audit" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}
        >
          <ScrollText className="h-3.5 w-3.5" /> 監査ログ
        </button>
      </div>

      {tab === "reports" ? (
        <div className="grid gap-3">
          {reports.length === 0 && <p className="py-16 text-center text-slate-400">通報はありません。</p>}
          {reports.map((r) => {
            const st = STATUS_LABEL[r.status];
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {TARGET_LABEL[r.target_type]}
                  </span>
                  <span className="text-xs text-slate-400">{r.created_at?.slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{r.reason}</p>
                <p className="mt-1 text-xs text-slate-400">
                  通報者: {r.reporter_name}（{r.reporter_email}）・対象ID: {r.target_id}
                </p>
                {r.resolution_note && (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">対応メモ: {r.resolution_note}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.status === "open" && (
                    <button onClick={() => setStatus(r, "in_review")} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      確認中にする
                    </button>
                  )}
                  {r.status !== "resolved" && (
                    <button onClick={() => setStatus(r, "resolved")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      解決済みにする
                    </button>
                  )}
                  {r.status !== "dismissed" && (
                    <button onClick={() => setStatus(r, "dismissed")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                      却下
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">実行者</th>
                <th className="px-4 py-3">アクション</th>
                <th className="px-4 py-3">対象 / 詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">
                    {l.created_at?.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {l.actor_email} <span className="text-slate-400">({l.actor_role})</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{l.action}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {l.target} {l.detail && <span className="text-slate-400">— {l.detail}</span>}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">ログはありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <AuthGuard roles={["admin"]}>
      <AdminReportsBody />
    </AuthGuard>
  );
}
