// =========================================================
// し尿タンク — サーバサイドのデータアクセス層（サーバ専用）
//
//   ★ 方式: 「予約リストから自動計算（ハイブリッド）」
//     現在水量は 2つの予約ソースを統合して毎回再計算する:
//       1) 自社予約   … stays_bookings（人数・キャンセルを正確に保持）
//       2) Airbnb予約 … stays_ext_reservations（予約メール解析の取り込み結果）
//     いずれも confirmed のみ対象（cancelled / pending は自動除外）。
//     各予約を「泊まった夜」に展開し、前回汲み取り日〜今日より前の“過ぎた夜”のみ加算。
//     → キャンセルは再計算で自然に消え、未来の予約は現在値を膨らませない。
//
//   stays_tank_logs は「スタッフの手動補正(override)」専用。指定日だけ自動値を上書き。
//
//   Supabase 未設定時はインメモリ・モックへ自動フォールバックする。
//   ※ このファイルは API Route からのみ import すること（クライアントには載せない）。
// =========================================================
import { supabase } from "@/lib/supabase";
import {
  DailyLog,
  ReservationLite,
  TankState,
  TANK_DEFAULTS,
  mergeNightly,
  nightlyGuests,
  sumLiters,
} from "./tank";
import type { ParsedReservation } from "./airbnbEmail";

const TANK_ID = 1; // シングルトン（自社ゲストハウス1棟）

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

// Airbnbメールで人数が取れなかった予約に充てる既定人数（安全側の想定値）
function defaultAirbnbGuests(): number {
  const n = Number(process.env.AIRBNB_DEFAULT_GUESTS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

// 外部予約(ParsedReservation相当) → ReservationLite。日付が無ければ計算不能なので除外。
function extToLite(ext: {
  guests: number | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
}): ReservationLite | null {
  if (!ext.check_in || !ext.check_out) return null;
  return {
    check_in: ext.check_in,
    check_out: ext.check_out,
    guests: ext.guests == null ? defaultAirbnbGuests() : ext.guests,
    status: ext.status,
  };
}

// ---------------------------------------------------------
// インメモリ・モック（Supabase未設定時のデモ用）
// ---------------------------------------------------------
interface MockExt {
  source: string;
  code: string;
  guests: number | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  email_id?: string;
  raw_subject?: string;
}
interface MockDB {
  capacityLiters: number;
  litersPerGuestPerDay: number;
  lastEmptiedDate: string;
  alerted: boolean;
  updatedAt: string;
  bookings: ReservationLite[]; // 自社予約
  ext: MockExt[]; // Airbnb等の外部予約
  overrides: Record<string, number>;
}
function seedMock(): MockDB {
  return {
    capacityLiters: TANK_DEFAULTS.capacityLiters,
    litersPerGuestPerDay: TANK_DEFAULTS.litersPerGuestPerDay,
    lastEmptiedDate: daysAgo(6),
    alerted: false,
    updatedAt: new Date().toISOString(),
    // 自社予約（stays_bookings相当）
    bookings: [
      { check_in: daysAgo(5), check_out: daysAgo(3), guests: 4, status: "completed" },
      { check_in: daysAgo(2), check_out: daysAgo(1), guests: 5, status: "confirmed" },
      { check_in: daysAgo(3), check_out: daysAgo(1), guests: 6, status: "cancelled" }, // 除外
    ],
    // Airbnb予約（メール取り込み相当）
    ext: [
      { source: "airbnb", code: "HMDEMO0001", guests: 3, check_in: daysAgo(4), check_out: daysAgo(2), status: "confirmed" },
      { source: "airbnb", code: "HMDEMO0002", guests: 2, check_in: daysAgo(2), check_out: daysAgo(1), status: "cancelled" }, // 除外
      { source: "airbnb", code: "HMDEMO0003", guests: 4, check_in: daysAgo(-1), check_out: daysAgo(-3), status: "confirmed" }, // 未来
    ],
    overrides: {},
  };
}
const g = globalThis as unknown as { __tankMockDB?: MockDB };
function mock(): MockDB {
  if (!g.__tankMockDB) g.__tankMockDB = seedMock();
  return g.__tankMockDB;
}

// ---------------------------------------------------------
// 2ソースを統合した予約リストを取得（check_out > sinceDate のもの）
// ---------------------------------------------------------
async function getReservations(sinceDate: string): Promise<ReservationLite[]> {
  if (!supabaseConfigured()) {
    const m = mock();
    const own = m.bookings.filter((b) => b.check_out > sinceDate);
    const ext = m.ext
      .map(extToLite)
      .filter((r): r is ReservationLite => !!r && r.check_out > sinceDate);
    return [...own, ...ext];
  }

  const out: ReservationLite[] = [];
  try {
    const { data: own } = await supabase
      .from("stays_bookings")
      .select("check_in, check_out, guests_count, status")
      .gt("check_out", sinceDate);
    for (const r of (own as any[]) || []) {
      out.push({ check_in: r.check_in, check_out: r.check_out, guests: r.guests_count, status: r.status });
    }
  } catch {
    /* noop */
  }
  try {
    const { data: ext } = await supabase
      .from("stays_ext_reservations")
      .select("check_in, check_out, guests, status")
      .gt("check_out", sinceDate);
    for (const r of (ext as any[]) || []) {
      const lite = extToLite(r);
      if (lite) out.push(lite);
    }
  } catch {
    /* noop */
  }
  return out;
}

// state メタ（容量・前回汲み取り日・通知フラグ）取得
async function getMeta() {
  if (!supabaseConfigured()) {
    const m = mock();
    return {
      capacityLiters: m.capacityLiters,
      litersPerGuestPerDay: m.litersPerGuestPerDay,
      lastEmptiedDate: m.lastEmptiedDate,
      alerted: m.alerted,
      updatedAt: m.updatedAt,
    };
  }
  try {
    const { data: state } = await supabase
      .from("stays_tank_state")
      .select("*")
      .eq("id", TANK_ID)
      .maybeSingle();
    return {
      capacityLiters: Number((state as any)?.capacity_liters ?? TANK_DEFAULTS.capacityLiters),
      litersPerGuestPerDay: Number((state as any)?.liters_per_guest ?? TANK_DEFAULTS.litersPerGuestPerDay),
      lastEmptiedDate: (state as any)?.last_emptied_date ?? today(),
      alerted: !!(state as any)?.alerted,
      updatedAt: (state as any)?.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return {
      capacityLiters: TANK_DEFAULTS.capacityLiters,
      litersPerGuestPerDay: TANK_DEFAULTS.litersPerGuestPerDay,
      lastEmptiedDate: today(),
      alerted: false,
      updatedAt: new Date().toISOString(),
    };
  }
}

// 手動補正(override)取得
async function getOverrides(sinceDate: string): Promise<Record<string, number>> {
  if (!supabaseConfigured()) return { ...mock().overrides };
  try {
    const { data } = await supabase
      .from("stays_tank_logs")
      .select("date, guests")
      .gte("date", sinceDate);
    const ov: Record<string, number> = {};
    for (const o of (data as any[]) || []) ov[o.date] = Number(o.guests);
    return ov;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------
// 公開API：状態の取得（純粋な再計算・副作用なし）
// ---------------------------------------------------------
export async function getTankState(): Promise<TankState> {
  const meta = await getMeta();
  const t = today();
  const reservations = await getReservations(meta.lastEmptiedDate);

  // 過去の夜のみ: [前回汲み取り日, 今日)
  const auto = nightlyGuests(reservations, meta.lastEmptiedDate, t);

  const overridesAll = await getOverrides(meta.lastEmptiedDate);
  const overrides: Record<string, number> = {};
  for (const [date, guests] of Object.entries(overridesAll)) {
    if (date >= meta.lastEmptiedDate && date < t) overrides[date] = guests;
  }

  const logs: DailyLog[] = mergeNightly(auto, overrides, meta.litersPerGuestPerDay);
  return {
    capacityLiters: meta.capacityLiters,
    litersPerGuestPerDay: meta.litersPerGuestPerDay,
    currentLiters: sumLiters(logs),
    lastEmptiedDate: meta.lastEmptiedDate,
    logs,
    alerted: meta.alerted,
    updatedAt: meta.updatedAt,
  };
}

// ---------------------------------------------------------
// 公開API：今後の予約からの1日あたり平均人数（予測日数の基礎値）
// ---------------------------------------------------------
export async function upcomingDailyGuests(window = 14): Promise<number> {
  const t = today();
  const to = new Date();
  to.setDate(to.getDate() + window);
  const toStr = to.toISOString().slice(0, 10);

  const reservations = await getReservations(t);
  const nights = nightlyGuests(reservations, t, toStr);
  const total = Object.values(nights).reduce((a, b) => a + b, 0);
  return total / window; // 予約が無い夜は0として平均に反映
}

// ---------------------------------------------------------
// 公開API：Airbnb等の外部予約を1件 upsert（sync / ingest から呼ぶ）
//   source + code をキーに、確定→キャンセルの更新を追跡する。
// ---------------------------------------------------------
export async function upsertExternalReservation(
  parsed: ParsedReservation,
  emailId?: string
): Promise<void> {
  if (!supabaseConfigured()) {
    const m = mock();
    const idx = m.ext.findIndex((e) => e.source === parsed.source && e.code === parsed.code);
    const row: MockExt = {
      source: parsed.source,
      code: parsed.code,
      guests: parsed.guests,
      check_in: parsed.checkIn,
      check_out: parsed.checkOut,
      status: parsed.status,
      email_id: emailId,
    };
    // キャンセルは日付が無くても既存の日付を保持したい
    if (idx >= 0) {
      const prev = m.ext[idx];
      m.ext[idx] = {
        ...prev,
        ...row,
        check_in: row.check_in ?? prev.check_in,
        check_out: row.check_out ?? prev.check_out,
        guests: row.guests ?? prev.guests,
      };
    } else {
      m.ext.push(row);
    }
    m.updatedAt = new Date().toISOString();
    return;
  }
  try {
    // 既存を取得して、キャンセルメールで日付が欠けても上書きしないようにする
    const { data: prev } = await supabase
      .from("stays_ext_reservations")
      .select("guests, check_in, check_out")
      .eq("source", parsed.source)
      .eq("code", parsed.code)
      .maybeSingle();
    await supabase.from("stays_ext_reservations").upsert(
      {
        source: parsed.source,
        code: parsed.code,
        guests: parsed.guests ?? (prev as any)?.guests ?? null,
        check_in: parsed.checkIn ?? (prev as any)?.check_in ?? null,
        check_out: parsed.checkOut ?? (prev as any)?.check_out ?? null,
        status: parsed.status,
        email_id: emailId ?? null,
        raw_subject: undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source,code" }
    );
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------
// 公開API：手動補正(override)の設定 / 解除
// ---------------------------------------------------------
export async function setOverride(date: string, guests: number | null): Promise<TankState> {
  if (!supabaseConfigured()) {
    const m = mock();
    if (guests === null) delete m.overrides[date];
    else m.overrides[date] = Math.max(0, Math.floor(guests));
    m.updatedAt = new Date().toISOString();
    return getTankState();
  }
  try {
    if (guests === null) {
      await supabase.from("stays_tank_logs").delete().eq("date", date);
    } else {
      const gg = Math.max(0, Math.floor(guests));
      await supabase
        .from("stays_tank_logs")
        .upsert({ date, guests: gg, liters: gg * TANK_DEFAULTS.litersPerGuestPerDay }, { onConflict: "date" });
    }
    await supabase
      .from("stays_tank_state")
      .upsert({ id: TANK_ID, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    /* noop */
  }
  return getTankState();
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
    await supabase.from("stays_tank_state").upsert({ id: TANK_ID, alerted }, { onConflict: "id" });
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------
// 公開API：汲み取り完了（リセット）
// ---------------------------------------------------------
export async function resetTank(): Promise<TankState> {
  const t = today();
  if (!supabaseConfigured()) {
    const m = mock();
    m.lastEmptiedDate = t;
    m.alerted = false;
    m.overrides = {};
    m.updatedAt = new Date().toISOString();
    return getTankState();
  }
  try {
    await supabase
      .from("stays_tank_state")
      .upsert(
        { id: TANK_ID, last_emptied_date: t, alerted: false, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    await supabase.from("stays_tank_logs").delete().lt("date", t);
  } catch {
    /* noop */
  }
  return getTankState();
}
