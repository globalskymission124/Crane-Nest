"use client";

// =========================================================
// 自社ゲストハウス専用：し尿タンク（便槽）モニタリング・ダッシュボード
//   稼働率（宿泊人数）に応じて累積水量を動的計算し、
//   80%（480L）超過時にバックエンドが WeCom & Email へダブル通知する。
//   このコンポーネントは /api/stays/tank を叩くだけ（計算・通知はサーバ側）。
// =========================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Gauge,
  Loader2,
  Mail,
  RefreshCw,
  Users,
} from "lucide-react";
import type { DailyLog, TankStatus } from "@/lib/stays/tank";
import { STATUS_META } from "@/lib/stays/tank";

// APIレスポンスの型
interface TankSummary {
  pct: number;
  status: TankStatus;
  alertLine: number;
  remainingLiters: number;
  upcomingGuestsPerDay: number;
  forecastDays: number | null;
}
interface TankResponse {
  capacityLiters: number;
  litersPerGuestPerDay: number;
  currentLiters: number;
  lastEmptiedDate: string;
  logs: DailyLog[];
  updatedAt: string;
  summary: TankSummary;
  alertDispatched?: {
    wecom: { ok: boolean; skipped?: boolean; error?: string };
    email: { ok: boolean; skipped?: boolean; error?: string };
  } | null;
}

// 状態ごとの配色（Tailwindのクラスは静的文字列で持つ＝purgeされないように）
const STATUS_STYLE: Record<
  TankStatus,
  { chip: string; bar: string; ring: string; soft: string; text: string }
> = {
  safe: {
    chip: "bg-emerald-100 text-emerald-700",
    bar: "from-emerald-400 to-emerald-500",
    ring: "border-emerald-300",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
  caution: {
    chip: "bg-amber-100 text-amber-700",
    bar: "from-amber-400 to-amber-500",
    ring: "border-amber-300",
    soft: "bg-amber-50",
    text: "text-amber-700",
  },
  alert: {
    chip: "bg-red-100 text-red-700",
    bar: "from-red-500 to-rose-600",
    ring: "border-red-300",
    soft: "bg-red-50",
    text: "text-red-700",
  },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function GuesthouseTankDashboard() {
  const [data, setData] = useState<TankResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [guests, setGuests] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stays/tank", { cache: "no-store" });
      const json = (await res.json()) as TankResponse;
      setData(json);
    } catch {
      setToast("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 選択中の日付に手動補正が入っていれば入力欄へ反映
  useEffect(() => {
    if (!data) return;
    const log = data.logs.find((l) => l.date === date);
    setGuests(log?.overridden ? String(log.guests) : "");
  }, [date, data]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  // POST 共通処理（再評価＋任意の補正）。通知結果もトーストで知らせる。
  async function postTank(body: Record<string, unknown>, okMsg: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/stays/tank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as TankResponse;
      if (!res.ok) throw new Error((json as any)?.error || "更新失敗");
      setData(json);
      if (json.alertDispatched) {
        const w = json.alertDispatched.wecom;
        const e = json.alertDispatched.email;
        flash(
          `⚠️ 80%超過を検知し通知しました（WeCom: ${w.ok ? "送信✓" : w.skipped ? "未設定" : "失敗"} / Email: ${e.ok ? "送信✓" : e.skipped ? "未設定" : "失敗"}）`
        );
      } else {
        flash(okMsg);
      }
    } catch (err: any) {
      flash(err?.message || "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 予約から再評価（補正なし）。通知の再判定も行う。
  function refreshEvaluate() {
    postTank({}, "予約データから再計算しました");
  }

  // Airbnbメールを同期（Gmail取得→解析→反映→再計算）
  async function syncAirbnb() {
    setSaving(true);
    try {
      const res = await fetch("/api/stays/tank/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "同期失敗");
      setData(json as TankResponse);
      const s = json.sync;
      if (s?.gmail?.skipped) {
        flash("Airbnb同期: Gmail連携が未設定です（GMAIL_* を設定してください）");
      } else if (s) {
        flash(`Airbnb同期完了: 取得${s.fetched} / 反映${s.parsed}（確定${s.confirmed} / キャンセル${s.cancelled}）`);
      } else {
        flash("Airbnbを同期しました");
      }
    } catch (err: any) {
      flash(err?.message || "Airbnb同期に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 手動補正を設定
  function submitOverride() {
    const n = Number(guests);
    if (!Number.isFinite(n) || n < 0) {
      flash("宿泊人数は0以上の数値で入力してください");
      return;
    }
    postTank({ date, guests: n }, `${date} を ${n}名に手動補正しました`);
  }

  // 手動補正を解除して予約自動値へ戻す
  function clearOverride() {
    postTank({ date, guests: null }, `${date} の補正を解除し自動値に戻しました`);
  }

  async function doReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/stays/tank/reset", { method: "POST" });
      const json = (await res.json()) as TankResponse;
      if (!res.ok) throw new Error((json as any)?.error || "リセット失敗");
      setData(json);
      setGuests("");
      setConfirmReset(false);
      flash("汲み取り完了として累積を 0L にリセットしました");
    } catch (err: any) {
      flash(err?.message || "リセットに失敗しました");
    } finally {
      setResetting(false);
    }
  }

  const meta = data ? STATUS_META[data.summary.status] : STATUS_META.safe;
  const style = data ? STATUS_STYLE[data.summary.status] : STATUS_STYLE.safe;

  // 警告ラインの縦位置（%）
  const alertLinePct = useMemo(() => {
    if (!data) return 80;
    return Math.min(100, (data.summary.alertLine / data.capacityLiters) * 100);
  }, [data]);

  const fillPct = data ? Math.min(100, data.summary.pct) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中…
      </div>
    );
  }
  if (!data) {
    return <p className="py-24 text-center text-slate-400">データを表示できませんでした。</p>;
  }

  return (
    <div>
      {/* ===== ヘッダー・ステータス ===== */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">便槽モニタリング</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncAirbnb}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Airbnb同期
          </button>
          <button
            onClick={refreshEvaluate}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            再計算
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        自社予約＋Airbnb（メール取込）から自動計算。キャンセルは自動除外し、過ぎた宿泊夜だけを
        {data.litersPerGuestPerDay}L/人で積算します。80%（{data.summary.alertLine}L）で自動通知。
      </p>

      <div className={`mb-5 flex flex-col gap-3 rounded-2xl border ${style.ring} ${style.soft} p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {meta.emoji}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.chip}`}>
                {meta.label}
              </span>
              <span className="text-xs text-slate-400">
                更新: {new Date(data.updatedAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <p className={`mt-1 text-lg font-extrabold ${style.text}`}>{meta.message}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-slate-900">
            {Math.round(data.currentLiters)}
            <span className="ml-1 text-base font-semibold text-slate-400">
              / {data.capacityLiters} L
            </span>
          </p>
          <p className={`text-sm font-bold ${style.text}`}>{data.summary.pct}%</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* ===== 縦型タンクメーター ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Gauge className="h-4 w-4 text-brand-600" /> タンク残量メーター
          </div>
          <div className="flex items-end justify-center gap-4">
            {/* タンク本体 */}
            <div className="relative h-64 w-28 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
              {/* 水量 */}
              <div
                className={`absolute bottom-0 left-0 w-full bg-gradient-to-t ${style.bar} transition-all duration-700`}
                style={{ height: `${fillPct}%` }}
              >
                {/* 水面のハイライト */}
                <div className="h-1.5 w-full bg-white/40" />
              </div>
              {/* 警告ライン（赤い破線） */}
              <div
                className="absolute left-0 z-10 w-full border-t-2 border-dashed border-red-500"
                style={{ bottom: `${alertLinePct}%` }}
              >
                <span className="absolute -top-4 right-1 rounded bg-red-500 px-1 text-[10px] font-bold text-white">
                  80% 警告
                </span>
              </div>
              {/* 中央のパーセント表示 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-lg bg-white/70 px-2 py-0.5 text-sm font-extrabold text-slate-800 backdrop-blur">
                  {data.summary.pct}%
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm font-bold text-slate-700">
            {Math.round(data.currentLiters)} L / {data.capacityLiters} L（{data.summary.pct}%）
          </p>
        </div>

        {/* ===== 右カラム：メトリクス + コントロール ===== */}
        <div className="space-y-5">
          {/* データサマリー */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              icon={<CalendarDays className="h-4 w-4" />}
              label="前回の汲み取り日"
              value={data.lastEmptiedDate}
              sub={`本日 ${todayStr()}`}
            />
            <Metric
              icon={<Droplets className="h-4 w-4" />}
              label="満杯までの残り"
              value={`${data.summary.remainingLiters} L`}
              sub={`警告ラインまで ${Math.max(0, Math.round(data.summary.alertLine - data.currentLiters))} L`}
            />
            <Metric
              icon={<AlertTriangle className="h-4 w-4" />}
              label="残り予測日数"
              value={
                data.summary.forecastDays === null
                  ? "—"
                  : `約 ${data.summary.forecastDays} 日`
              }
              sub={
                data.summary.upcomingGuestsPerDay > 0
                  ? `今後の予約 平均 ${data.summary.upcomingGuestsPerDay}名/日 換算`
                  : "今後の予約なし"
              }
            />
          </div>

          {/* 手動補正（override）: 通常は予約から自動計算。実人数がズレた日だけ上書き */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Users className="h-4 w-4 text-brand-600" /> 手動補正（任意）
            </div>
            <p className="mb-3 text-xs text-slate-400">
              人数は予約データから自動反映されます。実際の宿泊人数がズレた日だけ、この補正で上書きできます。
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-500">
                対象日
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-slate-500">
                補正人数
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="例: 4"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="mt-1 block w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none"
                />
              </label>
              <button
                onClick={submitOverride}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                補正を適用
              </button>
              <button
                onClick={clearOverride}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-slate-300 disabled:opacity-50"
              >
                自動に戻す
              </button>
            </div>
          </div>

          {/* 汲み取り完了リセット */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">汲み取りが完了したら</p>
                <p className="text-xs text-slate-400">
                  累積水量を 0L に戻し、前回汲み取り日を本日に更新します。
                </p>
              </div>
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                <RefreshCw className="h-4 w-4" /> 汲み取り完了（リセット）
              </button>
            </div>
          </div>

          {/* 直近ログ */}
          {data.logs.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                宿泊ログ（前回汲み取り以降・予約から自動算出）
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.logs.slice(0, 10).map((l) => (
                    <tr key={l.date}>
                      <td className="px-4 py-2 text-slate-600">{l.date}</td>
                      <td className="px-4 py-2 text-slate-800">
                        {l.guests}名
                        {l.overridden && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            手動補正
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-700">
                        +{l.liters} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== 確認ダイアログ（誤操作防止） ===== */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <RefreshCw className="h-5 w-5" />
              <h3 className="text-lg font-extrabold text-slate-900">汲み取り完了の確認</h3>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              累積水量を <strong>0 L</strong> にリセットし、前回汲み取り日を <strong>{todayStr()}</strong> に更新します。この操作は取り消せません。よろしいですか？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                キャンセル
              </button>
              <button
                onClick={doReset}
                disabled={resetting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                リセットする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== トースト ===== */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---- 小さなメトリクスカード ----
function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <span className="text-brand-600">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
