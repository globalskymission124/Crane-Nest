"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLangSwitcher from "@/components/AdminLangSwitcher";
import {
  addDays,
  buildMobileDayCards,
  buildTwoWeekCalendarRows,
  buildVehicleTimelineRows,
  dateKey,
  dateToKey,
  dayDiff,
  keyToDate,
  todayKey,
} from "@/lib/calendarTimeline";
import { normalizeAdminLocale, type AdminLocale } from "@/lib/adminI18n";

/**
 * 予約カレンダー（直感ビュー）。
 * - タイムライン（Airbnb風・取車→返却をバー表示）
 * - 月カレンダー（各日の出発/帰着をチップ表示）
 * - グラフ（日別件数 / 店舗別 / 予約元別 / 車種別）
 * 色分けは「店舗 / 予約元 / 車種 / ステータス」から選べる。
 * データは GET /api/reservations（全件）から取得。
 */

interface Reservation {
  id: string;
  source: string;
  orderNo?: string;
  customerName: string;
  vehicleClass?: string;
  pickupAt?: string;
  returnAt?: string;
  store?: string;
  pickupStore?: string;
  returnStore?: string;
  status: string;
}

type View = "weekBars" | "timeline" | "vehicleSchedule" | "month" | "charts";
type ColorBy = "store" | "source" | "vehicle" | "status";

// ── 多言語（スタッフ画面と同じ ja / en / zh-CN） ──
const DICT: Record<AdminLocale, Record<string, string>> = {
  ja: {
    title: "予約カレンダー",
    subtitle: "取車〜返却をひと目で。タブとフィルタで切り替え。",
    weekBars: "2週間バー",
    timeline: "タイムライン",
    vehicleSchedule: "車両別",
    month: "月カレンダー",
    charts: "グラフ",
    colorBy: "色分け",
    store: "店舗",
    source: "予約元",
    vehicle: "車種",
    status: "ステータス",
    allStores: "全店舗",
    today: "今日",
    prev: "前へ",
    next: "次へ",
    pickup: "出発",
    ret: "帰着",
    loading: "読み込み中…",
    noData: "対象の予約がありません",
    hideCancelled: "キャンセルを隠す",
    chartDaily: "日別の取車件数",
    chartStore: "店舗別の内訳",
    chartSource: "予約元の内訳",
    chartVehicle: "車種別の内訳",
    count: "件",
    unset: "未設定",
    unknown: "不明",
    activeReservations: "有効な予約",
    range: "期間",
    vehicleAxis: "車両 / 車種",
    booking: "予約",
    mobileHint: "スマホでは日付ごとに貸出中の車を表示します。",
    active: "貸出中",
  },
  en: {
    title: "Reservation Calendar",
    subtitle: "See pickups & returns at a glance. Switch with tabs and filters.",
    weekBars: "2-week bars",
    timeline: "Timeline",
    vehicleSchedule: "By vehicle",
    month: "Month",
    charts: "Charts",
    colorBy: "Color by",
    store: "Store",
    source: "Source",
    vehicle: "Vehicle",
    status: "Status",
    allStores: "All stores",
    today: "Today",
    prev: "Prev",
    next: "Next",
    pickup: "Pickup",
    ret: "Return",
    loading: "Loading…",
    noData: "No reservations in range",
    hideCancelled: "Hide cancelled",
    chartDaily: "Pickups per day",
    chartStore: "By store",
    chartSource: "By source",
    chartVehicle: "By vehicle class",
    count: "",
    unset: "Unset",
    unknown: "Unknown",
    activeReservations: "Active reservations",
    range: "Range",
    vehicleAxis: "Vehicle / class",
    booking: "Booking",
    mobileHint: "On phones, rentals are grouped by date for quick checking.",
    active: "Out",
  },
  "zh-CN": {
    title: "预约日历",
    subtitle: "一目了然地查看取车与还车。可用标签和筛选切换。",
    weekBars: "两周条形",
    timeline: "时间线",
    vehicleSchedule: "按车辆",
    month: "月历",
    charts: "图表",
    colorBy: "颜色区分",
    store: "门店",
    source: "预约来源",
    vehicle: "车型",
    status: "状态",
    allStores: "全部门店",
    today: "今天",
    prev: "上一页",
    next: "下一页",
    pickup: "取车",
    ret: "还车",
    loading: "加载中…",
    noData: "该范围内没有预约",
    hideCancelled: "隐藏已取消",
    chartDaily: "每日取车数",
    chartStore: "按门店",
    chartSource: "按来源",
    chartVehicle: "按车型",
    count: "件",
    unset: "未设置",
    unknown: "未知",
    activeReservations: "有效预约",
    range: "范围",
    vehicleAxis: "车辆 / 车型",
    booking: "预约",
    mobileHint: "手机上按日期显示正在出租的车辆。",
    active: "出租中",
  },
};

const PALETTE = [
  "#2563eb", "#16a34a", "#f59e0b", "#db2777", "#7c3aed",
  "#0891b2", "#dc2626", "#65a30d", "#ea580c", "#4f46e5",
  "#0d9488", "#c026d3",
];

function currentWeekStartKey(): string {
  const today = new Date();
  return dateToKey(addDays(today, -today.getDay()));
}

export default function CalendarDashboard({ locale = "ja" }: { locale?: string }) {
  const [lang, setLang] = useState<AdminLocale>(normalizeAdminLocale(locale));
  useEffect(() => {
    const s = typeof window !== "undefined" ? window.localStorage.getItem("adminLang") : null;
    if (s === "ja" || s === "en" || s === "zh-CN") setLang(s);
  }, []);
  const changeLang = (l: AdminLocale) => {
    setLang(l);
    try {
      window.localStorage.setItem("adminLang", l);
    } catch {
      /* noop */
    }
  };
  const t = (k: string) => DICT[lang][k] ?? k;

  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("weekBars");
  const [colorBy, setColorBy] = useState<ColorBy>("store");
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [hideCancelled, setHideCancelled] = useState(true);
  const [tlStart, setTlStart] = useState<string>(currentWeekStartKey());
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/reservations", { cache: "no-store" });
        const j = await res.json();
        if (j.success && Array.isArray(j.reservations)) setItems(j.reservations);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── アクセサ & フィルタ ──
  const storeOf = (r: Reservation) => r.pickupStore ?? r.store ?? t("unset");
  const dimOf = (r: Reservation): string => {
    switch (colorBy) {
      case "store":
        return r.pickupStore ?? r.store ?? t("unset");
      case "source":
        return r.source ?? t("unknown");
      case "vehicle":
        return r.vehicleClass ?? t("unset");
      case "status":
        return r.status ?? t("unknown");
    }
  };

  const stores = useMemo(() => {
    const set = new Set<string>();
    items.forEach((r) => {
      const s = r.pickupStore ?? r.store;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (hideCancelled && r.status === "cancelled") return false;
      if (storeFilter && storeOf(r) !== storeFilter) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hideCancelled, storeFilter]);

  // ── 色マップ（色分け軸の値→色） ──
  const colorMap = useMemo(() => {
    const values = Array.from(new Set(filtered.map(dimOf))).sort();
    const m = new Map<string, string>();
    values.forEach((v, i) => m.set(v, PALETTE[i % PALETTE.length]));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, colorBy, lang]);
  const colorFor = (r: Reservation) => colorMap.get(dimOf(r)) ?? "#64748b";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダ */}
        <div className="flex justify-between items-start gap-3 mb-1">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
          <AdminLangSwitcher value={lang} onChange={changeLang} />
        </div>

        {/* コントロール */}
        <div className="flex flex-wrap items-center gap-2 my-4">
          {/* ビュー切替タブ */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            {(["weekBars", "vehicleSchedule", "timeline", "month", "charts"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  view === v ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t(v)}
              </button>
            ))}
          </div>

          {/* 色分け軸 */}
          <div className="inline-flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-500">{t("colorBy")}:</span>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
              {(["store", "source", "vehicle", "status"] as ColorBy[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColorBy(c)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    colorBy === c ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t(c)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 店舗フィルタ & キャンセル表示 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setStoreFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              storeFilter === null ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-300"
            }`}
          >
            {t("allStores")}
          </button>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                storeFilter === s ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCancelled}
              onChange={(e) => setHideCancelled(e.target.checked)}
            />
            {t("hideCancelled")}
          </label>
        </div>

        {/* 凡例 */}
        {colorMap.size > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {Array.from(colorMap.entries()).map(([v, c]) => (
              <span key={v} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                {v}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-gray-400">{t("loading")}</div>
        ) : (
          <>
            {view === "weekBars" && (
              <TwoWeekBarView
                data={filtered}
                colorFor={colorFor}
                start={tlStart}
                setStart={setTlStart}
                t={t}
              />
            )}
            {view === "timeline" && (
              <TimelineView
                data={filtered}
                colorFor={colorFor}
                start={tlStart}
                setStart={setTlStart}
                t={t}
              />
            )}
            {view === "vehicleSchedule" && (
              <VehicleScheduleView
                data={filtered}
                colorFor={colorFor}
                start={tlStart}
                setStart={setTlStart}
                t={t}
              />
            )}
            {view === "month" && (
              <MonthView
                data={filtered}
                colorFor={colorFor}
                cursor={monthCursor}
                setCursor={setMonthCursor}
                lang={lang}
                t={t}
              />
            )}
            {view === "charts" && (
              <ChartsView data={filtered} colorBy={colorBy} colorMap={colorMap} dimOf={dimOf} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── 2週間バー ───────────────────────────
function TwoWeekBarView({
  data,
  colorFor,
  start,
  setStart,
  t,
}: {
  data: Reservation[];
  colorFor: (r: Reservation) => string;
  start: string;
  setStart: (s: string) => void;
  t: (k: string) => string;
}) {
  const COL = 170;
  const weeks = buildTwoWeekCalendarRows(data, start, t("unset"));
  const mobileDays = buildMobileDayCards(data, start, 14, t("unset"));
  const today = todayKey();
  const end = weeks[weeks.length - 1]?.weekEnd ?? start;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), -14)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          ← {t("prev")}
        </button>
        <button
          onClick={() => setStart(currentWeekStartKey())}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("today")}
        </button>
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), 14)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("next")} →
        </button>
        <span className="text-xs text-gray-400 sm:ml-2">
          {t("range")}: {start} → {end}
        </span>
      </div>

      <div className="sm:hidden bg-slate-50 p-3">
        <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
          {t("mobileHint")}
        </p>
        <div className="space-y-3">
          {mobileDays.map((day) => {
            const d = keyToDate(day.dayKey);
            const isToday = day.dayKey === today;
            return (
              <div
                key={day.dayKey}
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  isToday ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${isToday ? "text-blue-600" : "text-slate-900"}`}>
                      {d.getDate()}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                    {day.items.length}
                    {t("count")}
                  </span>
                </div>

                {day.items.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                    {t("noData")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.items.map((item) => {
                      const reservation = item.reservation;
                      const color = colorFor(reservation);
                      const phaseLabel =
                        item.phase === "pickup"
                          ? t("pickup")
                          : item.phase === "return"
                          ? t("ret")
                          : t("active");
                      return (
                        <div
                          key={`${day.dayKey}-${reservation.id}-${item.phase}`}
                          className="rounded-lg border border-slate-200 bg-white p-2"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black text-white"
                              style={{ backgroundColor: color }}
                            >
                              {phaseLabel}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                              {item.vehicleLabel}
                            </p>
                          </div>
                          <p className="truncate text-xs font-semibold text-slate-700">
                            {reservation.customerName}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {item.startKey.slice(5)} → {item.endKey.slice(5)}
                            {reservation.orderNo ? ` / #${reservation.orderNo}` : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <div style={{ minWidth: COL * 7 }}>
          {weeks.map((week) => {
            const days = Array.from({ length: 7 }, (_, i) =>
              dateToKey(addDays(keyToDate(week.weekStart), i))
            );
            const bodyHeight = Math.max(190, week.segments.length * 33 + 26);

            return (
              <div key={week.weekStart} className="border-b border-gray-200 last:border-b-0">
                <div className="grid grid-cols-7 bg-gray-50">
                  {days.map((day) => {
                    const d = keyToDate(day);
                    const isToday = day === today;
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={day}
                        className={`border-l border-gray-200 px-3 py-2 first:border-l-0 ${
                          isToday ? "bg-blue-50" : weekend ? "bg-gray-100/80" : ""
                        }`}
                      >
                        <p className="text-[11px] font-semibold text-gray-500">
                          {["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}
                        </p>
                        <p className={`text-lg font-black ${isToday ? "text-blue-600" : "text-gray-800"}`}>
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="relative"
                  style={{
                    height: bodyHeight,
                    backgroundImage:
                      "linear-gradient(to right, rgba(229,231,235,.95) 1px, transparent 1px)",
                    backgroundSize: `${COL}px 100%`,
                  }}
                >
                  {days.map((day, i) =>
                    day === today ? (
                      <div
                        key={day}
                        className="absolute top-0 bottom-0 bg-blue-50/50"
                        style={{ left: i * COL, width: COL }}
                      />
                    ) : null
                  )}

                  {week.segments.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                      {t("noData")}
                    </div>
                  ) : (
                    week.segments.map((segment, index) => {
                      const reservation = segment.reservation;
                      const color = colorFor(reservation);
                      const pickupTime =
                        dateKey(reservation.pickupAt) === segment.startKey
                          ? new Date(reservation.pickupAt!).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "";
                      const title = [
                        pickupTime,
                        segment.vehicleLabel,
                        reservation.source,
                        reservation.orderNo ? `#${reservation.orderNo}` : "",
                      ]
                        .filter(Boolean)
                        .join(" | ");

                      return (
                        <div
                          key={`${reservation.id}-${week.weekIndex}`}
                          className="absolute flex h-7 items-center gap-1 overflow-hidden rounded-md px-2 text-xs font-bold text-white shadow-sm"
                          style={{
                            left: segment.offsetDays * COL + 10,
                            top: 12 + index * 33,
                            width: Math.max(74, segment.spanDays * COL - 20),
                            backgroundColor: color,
                            opacity: reservation.status === "cancelled" ? 0.4 : 1,
                          }}
                          title={`${segment.vehicleLabel} / ${reservation.customerName} / ${segment.startKey} → ${segment.endKey}`}
                        >
                          {pickupTime && <span className="shrink-0 opacity-90">{pickupTime}</span>}
                          <span className="truncate">{title || reservation.customerName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── タイムライン ───────────────────────────
function TimelineView({
  data,
  colorFor,
  start,
  setStart,
  t,
}: {
  data: Reservation[];
  colorFor: (r: Reservation) => string;
  start: string;
  setStart: (s: string) => void;
  t: (k: string) => string;
}) {
  const DAYS = 21;
  const COL = 46; // px/日
  const days = Array.from({ length: DAYS }, (_, i) => dateToKey(addDays(keyToDate(start), i)));
  const end = days[days.length - 1];
  const today = todayKey();

  // 期間に重なる予約のみ、取車日で並べる
  const rows = data
    .filter((r) => {
      const p = dateKey(r.pickupAt);
      const rt = dateKey(r.returnAt) ?? p;
      if (!p) return false;
      return !(rt! < start || p > end); // 重なりあり
    })
    .sort((a, b) => (dateKey(a.pickupAt) ?? "").localeCompare(dateKey(b.pickupAt) ?? ""));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ナビ */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), -7)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          ← {t("prev")}
        </button>
        <button
          onClick={() => setStart(dateToKey(addDays(new Date(), -3)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("today")}
        </button>
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), 7)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("next")} →
        </button>
        <span className="text-xs text-gray-400 ml-2">
          {t("range")}: {start} → {end}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 160 + DAYS * COL }}>
          {/* 日付ヘッダ */}
          <div className="flex sticky top-0 bg-gray-50 border-b border-gray-200">
            <div className="w-40 shrink-0 px-3 py-2 text-[11px] font-semibold text-gray-500">
              {t("timeline")}
            </div>
            {days.map((d) => {
              const dt = keyToDate(d);
              const isToday = d === today;
              const wend = dt.getDay() === 0 || dt.getDay() === 6;
              return (
                <div
                  key={d}
                  style={{ width: COL }}
                  className={`shrink-0 text-center py-2 border-l border-gray-100 ${
                    isToday ? "bg-blue-50" : wend ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="text-[10px] text-gray-400">
                    {["日", "月", "火", "水", "木", "金", "土"][dt.getDay()]}
                  </div>
                  <div className={`text-xs font-bold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                    {dt.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 行 */}
          {rows.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">{t("noData")}</div>
          ) : (
            rows.map((r) => {
              const p = dateKey(r.pickupAt)!;
              const rt = dateKey(r.returnAt) ?? p;
              const from = Math.max(0, dayDiff(start, p));
              const toRaw = Math.min(DAYS - 1, dayDiff(start, rt));
              const span = Math.max(1, toRaw - from + 1);
              return (
                <div key={r.id} className="flex items-center border-b border-gray-50 hover:bg-gray-50">
                  <div className="w-40 shrink-0 px-3 py-2">
                    <p className="text-xs font-bold text-gray-800 truncate">{r.customerName}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {r.vehicleClass ?? ""} {r.orderNo ? `#${r.orderNo}` : ""}
                    </p>
                  </div>
                  <div className="relative flex-1" style={{ height: 40 }}>
                    <div
                      className="absolute top-1.5 h-7 rounded-md flex items-center px-2 text-[10px] font-semibold text-white truncate shadow-sm"
                      style={{
                        left: from * COL + 2,
                        width: span * COL - 4,
                        backgroundColor: colorFor(r),
                        opacity: r.status === "cancelled" ? 0.4 : 1,
                      }}
                      title={`${r.customerName} / ${p} → ${rt}`}
                    >
                      {p} → {rt}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 車両別スケジュール ───────────────────────────
function VehicleScheduleView({
  data,
  colorFor,
  start,
  setStart,
  t,
}: {
  data: Reservation[];
  colorFor: (r: Reservation) => string;
  start: string;
  setStart: (s: string) => void;
  t: (k: string) => string;
}) {
  const DAYS = 21;
  const COL = 58;
  const LABEL_W = 220;
  const days = Array.from({ length: DAYS }, (_, i) => dateToKey(addDays(keyToDate(start), i)));
  const end = days[days.length - 1];
  const today = todayKey();
  const rows = buildVehicleTimelineRows(data, start, DAYS, t("unset"));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), -7)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          ← {t("prev")}
        </button>
        <button
          onClick={() => setStart(dateToKey(addDays(new Date(), -3)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("today")}
        </button>
        <button
          onClick={() => setStart(dateToKey(addDays(keyToDate(start), 7)))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("next")} →
        </button>
        <span className="text-xs text-gray-400 sm:ml-2">
          {t("range")}: {start} → {end}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_W + DAYS * COL }}>
          <div className="flex sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <div
              className="shrink-0 px-3 py-2 text-[11px] font-semibold text-gray-500"
              style={{ width: LABEL_W }}
            >
              {t("vehicleAxis")}
            </div>
            {days.map((d) => {
              const dt = keyToDate(d);
              const isToday = d === today;
              const weekend = dt.getDay() === 0 || dt.getDay() === 6;
              return (
                <div
                  key={d}
                  style={{ width: COL }}
                  className={`shrink-0 text-center py-2 border-l border-gray-100 ${
                    isToday ? "bg-emerald-50" : weekend ? "bg-gray-100/70" : ""
                  }`}
                >
                  <div className="text-[10px] text-gray-400">
                    {["日", "月", "火", "水", "木", "金", "土"][dt.getDay()]}
                  </div>
                  <div className={`text-xs font-bold ${isToday ? "text-emerald-600" : "text-gray-700"}`}>
                    {dt.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">{t("noData")}</div>
          ) : (
            rows.map((row) => {
              const rowHeight = Math.max(56, row.bars.length * 34 + 18);
              return (
                <div
                  key={row.vehicleLabel}
                  className="flex border-b border-gray-100 hover:bg-gray-50/70"
                  style={{ minHeight: rowHeight }}
                >
                  <div
                    className="shrink-0 px-3 py-3 border-r border-gray-100 bg-white"
                    style={{ width: LABEL_W }}
                  >
                    <p className="text-sm font-black text-gray-900 truncate" title={row.vehicleLabel}>
                      {row.vehicleLabel}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {row.bars.length}
                      {t("count")} {t("booking")}
                    </p>
                  </div>
                  <div
                    className="relative flex-1"
                    style={{
                      height: rowHeight,
                      backgroundImage:
                        "linear-gradient(to right, rgba(229,231,235,.9) 1px, transparent 1px)",
                      backgroundSize: `${COL}px 100%`,
                    }}
                  >
                    {days.map((d, i) =>
                      d === today ? (
                        <div
                          key={d}
                          className="absolute top-0 bottom-0 bg-emerald-50/70"
                          style={{ left: i * COL, width: COL }}
                        />
                      ) : null
                    )}
                    {row.bars.map((bar, i) => {
                      const reservation = bar.reservation;
                      const label = [
                        reservation.customerName,
                        reservation.orderNo ? `#${reservation.orderNo}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div
                          key={reservation.id}
                          className="absolute h-7 rounded-md px-2 text-[11px] font-semibold text-white shadow-sm flex items-center gap-1 overflow-hidden"
                          style={{
                            left: bar.offsetDays * COL + 4,
                            top: 10 + i * 34,
                            width: Math.max(42, bar.spanDays * COL - 8),
                            backgroundColor: colorFor(reservation),
                            opacity: reservation.status === "cancelled" ? 0.4 : 1,
                          }}
                          title={`${row.vehicleLabel} / ${reservation.customerName} / ${bar.startKey} → ${bar.endKey}`}
                        >
                          <span className="truncate">{label}</span>
                          <span className="ml-auto shrink-0 opacity-85">
                            {bar.startKey.slice(5)}→{bar.endKey.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 月カレンダー ───────────────────────────
function MonthView({
  data,
  colorFor,
  cursor,
  setCursor,
  lang,
  t,
}: {
  data: Reservation[];
  colorFor: (r: Reservation) => string;
  cursor: Date;
  setCursor: (d: Date) => void;
  lang: AdminLocale;
  t: (k: string) => string;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0=日
  const gridStart = addDays(first, -startPad);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = todayKey();

  // 日付キー -> {pickups, returns}
  const byDay = useMemo(() => {
    const m = new Map<string, { pickups: Reservation[]; returns: Reservation[] }>();
    const ensure = (k: string) => {
      if (!m.has(k)) m.set(k, { pickups: [], returns: [] });
      return m.get(k)!;
    };
    data.forEach((r) => {
      const p = dateKey(r.pickupAt);
      const rt = dateKey(r.returnAt);
      if (p) ensure(p).pickups.push(r);
      if (rt) ensure(rt).returns.push(r);
    });
    return m;
  }, [data]);

  const monthLabel = new Intl.DateTimeFormat(lang === "zh-CN" ? "zh-CN" : lang, {
    year: "numeric",
    month: "long",
  }).format(first);
  const dow = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          ← {t("prev")}
        </button>
        <button
          onClick={() => setCursor(new Date())}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("today")}
        </button>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200"
        >
          {t("next")} →
        </button>
        <span className="ml-2 text-base font-bold text-gray-800">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dow.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const k = dateToKey(c);
          const inMonth = c.getMonth() === month;
          const info = byDay.get(k);
          const isToday = k === today;
          return (
            <div
              key={k}
              className={`min-h-[92px] rounded-lg border p-1 ${
                isToday ? "border-blue-400 bg-blue-50/40" : "border-gray-100"
              } ${inMonth ? "bg-white" : "bg-gray-50/60"}`}
            >
              <div
                className={`text-[11px] font-bold mb-0.5 ${
                  inMonth ? "text-gray-700" : "text-gray-300"
                } ${isToday ? "text-blue-600" : ""}`}
              >
                {c.getDate()}
              </div>
              <div className="space-y-0.5">
                {(info?.pickups ?? []).slice(0, 3).map((r) => (
                  <div
                    key={"p" + r.id}
                    className="flex items-center gap-1 text-[9px] leading-tight truncate rounded px-1 py-0.5 text-white"
                    style={{ backgroundColor: colorFor(r), opacity: r.status === "cancelled" ? 0.4 : 1 }}
                    title={`${t("pickup")}: ${r.customerName}`}
                  >
                    <span className="font-black">▶</span>
                    <span className="truncate">{r.customerName}</span>
                  </div>
                ))}
                {(info?.returns ?? []).slice(0, 2).map((r) => (
                  <div
                    key={"r" + r.id}
                    className="flex items-center gap-1 text-[9px] leading-tight truncate rounded px-1 py-0.5 border"
                    style={{ borderColor: colorFor(r), color: colorFor(r) }}
                    title={`${t("ret")}: ${r.customerName}`}
                  >
                    <span className="font-black">◀</span>
                    <span className="truncate">{r.customerName}</span>
                  </div>
                ))}
                {info && info.pickups.length + info.returns.length > 5 && (
                  <div className="text-[9px] text-gray-400">
                    +{info.pickups.length + info.returns.length - 5}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="font-black">▶</span>{t("pickup")}</span>
        <span className="inline-flex items-center gap-1"><span className="font-black">◀</span>{t("ret")}</span>
      </div>
    </div>
  );
}

// ─────────────────────────── グラフ ───────────────────────────
function ChartsView({
  data,
  colorBy,
  colorMap,
  dimOf,
  t,
}: {
  data: Reservation[];
  colorBy: ColorBy;
  colorMap: Map<string, string>;
  dimOf: (r: Reservation) => string;
  t: (k: string) => string;
}) {
  // 日別の取車件数（直近30日窓、取車日ベース）
  const daily = useMemo(() => {
    const start = dateToKey(addDays(new Date(), -7));
    const days = Array.from({ length: 30 }, (_, i) => dateToKey(addDays(keyToDate(start), i)));
    const counts = new Map<string, number>();
    data.forEach((r) => {
      const p = dateKey(r.pickupAt);
      if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
    });
    return days.map((d) => ({ day: d, n: counts.get(d) ?? 0 }));
  }, [data]);
  const dailyMax = Math.max(1, ...daily.map((d) => d.n));

  const countBy = (fn: (r: Reservation) => string) => {
    const m = new Map<string, number>();
    data.forEach((r) => m.set(fn(r), (m.get(fn(r)) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };
  const byStore = countBy((r) => r.pickupStore ?? r.store ?? t("unset"));
  const bySource = countBy((r) => r.source ?? t("unknown"));
  const byVehicle = countBy((r) => r.vehicleClass ?? t("unset"));

  const palColor = (label: string, i: number) =>
    colorMap.get(label) ?? PALETTE[i % PALETTE.length];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 日別件数 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:col-span-2">
        <h3 className="text-sm font-bold text-gray-800 mb-3">{t("chartDaily")}</h3>
        <div className="flex items-end gap-1 h-40">
          {daily.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end group">
              <div className="text-[9px] text-gray-500 mb-0.5 opacity-0 group-hover:opacity-100">
                {d.n || ""}
              </div>
              <div
                className="w-full rounded-t bg-blue-500"
                style={{ height: `${(d.n / dailyMax) * 100}%`, minHeight: d.n ? 3 : 0 }}
                title={`${d.day}: ${d.n}`}
              />
              <div className="text-[8px] text-gray-400 mt-1 rotate-0">{Number(d.day.slice(8))}</div>
            </div>
          ))}
        </div>
      </div>

      <BarBlock title={t("chartStore")} rows={byStore} colorOf={palColor} t={t} />
      <BarBlock title={t("chartSource")} rows={bySource} colorOf={palColor} t={t} />
      <BarBlock title={t("chartVehicle")} rows={byVehicle} colorOf={palColor} t={t} full />
    </div>
  );
}

function BarBlock({
  title,
  rows,
  colorOf,
  t,
  full,
}: {
  title: string;
  rows: [string, number][];
  colorOf: (label: string, i: number) => string;
  t: (k: string) => string;
  full?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 ${full ? "md:col-span-2" : ""}`}>
      <h3 className="text-sm font-bold text-gray-800 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{t("noData")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map(([label, n], i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-24 shrink-0 text-[11px] text-gray-600 truncate" title={label}>
                {label}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full"
                  style={{ width: `${(n / max) * 100}%`, backgroundColor: colorOf(label, i) }}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-[11px] font-bold text-gray-700">
                {n}
                {t("count")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
