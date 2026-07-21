// =========================================================
// し尿タンク — サーバサイドのデータアクセス層（サーバ専用）
//   Supabase（stays_tank_state / stays_tank_logs）を第一データソースとし、
//   環境変数が未設定 or 接続失敗のときは「インメモリのモック」に自動フォールバックする。
//   （既存の Stripe モック決済と同じ思想。キーが無くてもデモが動く。）
//
//   ※ このファイルは API Route からのみ import すること（クライアントには載せない）。
// =========================================================
import { supabase } from "@/lib/supabase";
import {
  DailyLog,
  TankState,
  TANK_DEFAULTS,
  litersForGuests,
  sumLiters,
} from "./tank";

const TANK_ID = 1; // シングルトン（自社ゲストハウス1棟用）。複数棟化する場合はキーを増やす。

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------
// インメモリ・モックストア（Supabase未設定時のデモ用）
//   モジュールスコープに保持するので、開発サーバ稼働中は状態が維持される。
// ---------------------------------------------------------
function seedMock(): TankState {
  // デモ用に、前回汲み取りから数日分の宿泊が積み上がった状態を用意
  const logs: DailyLog[] = [
    { date: daysAgo(1), guests: 4, liters: litersForGuests(4) },
    { date: daysAgo(2), guests: 6, liters: litersForGuests(6) },
    { date: daysAgo(3), guests: 0, liters: 0 },
    { date: daysAgo(4), guests: 5, liters: litersForGuests(5) },
    { date: daysAgo(5), guests: 3, liters: litersForGuests(3) },
  ];
  return {
    capacityLiters: TANK_DEFAULTS.capacityLiters,
    litersPerGuestPerDay: TANK_DEFAULTS.litersPerGuestPerDay,
    currentLiters: sumLiters(logs),
    lastEmptiedDate: daysAgo(6),
    logs,
    alerted: false,
    updatedAt: new Date().toISOString(),
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// globalThis に載せることで Next.js のホットリロードをまたいでも状態が飛びにくい
const g = globalThis as unknown as { __tankMock?: TankState };
function mock(): TankState {
  if (!g.__tankMock) g.__tankMock = seedMock();
  return g.__tankMock;
}

// Supabaseが実際に使えるか（プレースホルダのままなら false）
function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

// ---------------------------------------------------------
// 公開API：状態の取得
// ---------------------------------------------------------
export async function getTankState(): Promise<TankState> {
  if (!supabaseConfigured()) return { ...mock(), logs: [...mock().logs] };

  try {
    const { data: state } = await supabase
      .from("stays_tank_state")
      .select("*")
      .eq("id", TANK_ID)
      .maybeSingle();

    // 初回はレコードが無いので既定値で初期化
    const capacity = (state as any)?.capacity_liters ?? TANK_DEFAULTS.capacityLiters;
    const perGuest =
      (state as any)?.liters_per_guest ?? TANK_DEFAULTS.litersPerGuestPerDay;
    const lastEmptied = (state as any)?.last_emptied_date ?? today();

    const { data: rows } = await supabase
      .from("stays_tank_logs")
      .select("date, guests, liters")
      .gt("date", lastEmptied)
      .order("date", { ascending: false });

    const logs: DailyLog[] = (rows as any[])?.map((r) => ({
      date: r.date,
      guests: r.guests,
      liters: Number(r.liters),
    })) ?? [];

    return {
      capacityLiters: Number(capacity),
      litersPerGuestPerDay: Number(perGuest),
      currentLiters: sumLiters(logs),
      lastEmptiedDate: lastEmptied,
      logs,
      alerted: !!(state as any)?.alerted,
      updatedAt: (state as any)?.updated_at ?? new Date().toISOString(),
    };
  } catch {
    // 接続不良時もデモが死なないようモックへフォールバック
    return { ...mock(), logs: [...mock().logs] };
  }
}

// ---------------------------------------------------------
// 公開API：当日の宿泊人数を追加/更新し、累積を再計算して保存
//   同じ日付が既にあれば上書き（スタッフによる当日微調整を想定）。
// ---------------------------------------------------------
export async function upsertDailyGuests(
  date: string,
  guests: number
): Promise<TankState> {
  const state = await getTankState();
  const liters = litersForGuests(guests, state.litersPerGuestPerDay);

  // ログ配列を更新（同日は置換）
  const nextLogs = state.logs.filter((l) => l.date !== date);
  nextLogs.unshift({ date, guests: Math.max(0, Math.floor(guests || 0)), liters });
  nextLogs.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新しい順

  const currentLiters = sumLiters(nextLogs);

  if (!supabaseConfigured()) {
    const m = mock();
    m.logs = nextLogs;
    m.currentLiters = currentLiters;
    m.updatedAt = new Date().toISOString();
    return { ...m, logs: [...m.logs] };
  }

  try {
    // ログを upsert（date をユニークキーに）
    await supabase
      .from("stays_tank_logs")
      .upsert(
        { date, guests: Math.max(0, Math.floor(guests || 0)), liters },
        { onConflict: "date" }
      );
    // 状態の updated_at を更新（累積は都度ログから再計算するので保持は任意）
    await supabase
      .from("stays_tank_state")
      .upsert({ id: TANK_ID, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    // 失敗しても計算済みの状態は返す（UIは楽観的に更新される）
  }

  return {
    ...state,
    logs: nextLogs,
    currentLiters,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------
// 公開API：警告通知フラグの記録（多重通知の抑制用）
// ---------------------------------------------------------
export async function setAlerted(alerted: boolean): Promise<void> {
  if (!supabaseConfigured()) {
    mock().alerted = alerted;
    return;
  }
  try {
    await supabase
      .from("stays_tank_state")
      .upsert({ id: TANK_ID, alerted }, { onConflict: "id" });
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------
// 公開API：汲み取り完了（リセット）
//   累積を 0L に戻し、前回汲み取り日を「今日」に更新。
//   ＝ 今日以前のログは「猶予計算の対象外」になる（date > lastEmptied で絞るため）。
// ---------------------------------------------------------
export async function resetTank(): Promise<TankState> {
  const t = today();

  if (!supabaseConfigured()) {
    const m = mock();
    m.logs = [];
    m.currentLiters = 0;
    m.lastEmptiedDate = t;
    m.alerted = false;
    m.updatedAt = new Date().toISOString();
    return { ...m, logs: [] };
  }

  try {
    await supabase
      .from("stays_tank_state")
      .upsert(
        { id: TANK_ID, last_emptied_date: t, alerted: false, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    // 過去ログは残しても date フィルタで自然に除外されるが、肥大化防止のため古い分は削除
    await supabase.from("stays_tank_logs").delete().lte("date", t);
  } catch {
    /* noop */
  }

  return getTankState();
}
