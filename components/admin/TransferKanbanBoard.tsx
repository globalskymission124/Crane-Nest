"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { TransferStatus } from "@/lib/types";
import {
  TIME_LANES,
  assignLane,
  formatDateLabel,
  getDateRange,
  toDateString,
  parseDateString,
  isWithinMorningTransferBoard,
  type KanbanCard,
} from "@/lib/adminSchedule";
import TransferCard from "./TransferCard";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import type { AdminDictionary } from "@/lib/i18n/admin/types";

// 部屋情報（写真URL検索用）
interface RoomInfo {
  name: string;
  photo_url: string | null;
}

// Supabaseの結合クエリ結果の型。
interface RawTransferRow {
  id: string;
  room_number: string;
  flight_time: string | null;
  suggested_departure_time: string | null;
  preferred_departure_time: string | null;
  passenger_count: number;
  luggage_large: number;
  luggage_small: number;
  luggage_special: number;
  status: TransferStatus;
  guests: { full_name: string; passport_image_url: string | null } | { full_name: string; passport_image_url: string | null }[] | null;
  destinations: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null;
}

function pickGuest(value: RawTransferRow["guests"], fallback: string): { name: string; photoUrl: string | null } {
  if (!value) return { name: fallback, photoUrl: null };
  const record = Array.isArray(value) ? value[0] : value;
  return { name: record?.full_name || fallback, photoUrl: record?.passport_image_url ?? null };
}

function pickDestination(value: RawTransferRow["destinations"]): { name: string; imageUrl: string | null } {
  if (!value) return { name: "", imageUrl: null };
  const record = Array.isArray(value) ? value[0] : value;
  return { name: record?.name ?? "", imageUrl: record?.image_url ?? null };
}

function toCard(row: RawTransferRow, t: AdminDictionary, rooms: RoomInfo[]): KanbanCard {
  const dest = pickDestination(row.destinations);
  const room = rooms.find((r) => r.name === row.room_number);
  const guest = pickGuest(row.guests, t.board.unnamedGuest);
  return {
    id: row.id,
    roomNumber: row.room_number,
    roomPhotoUrl: room?.photo_url ?? null,
    guestName: guest.name,
    passportImageUrl: guest.photoUrl,
    destinationName: dest.name || t.board.unsetDestination,
    destinationImageUrl: dest.imageUrl,
    flightTime: row.flight_time,
    departureTime: row.suggested_departure_time,
    preferredDepartureTime: row.preferred_departure_time,
    passengerCount: row.passenger_count,
    luggageLarge: row.luggage_large,
    luggageSmall: row.luggage_small,
    luggageSpecial: row.luggage_special,
    status: row.status,
  };
}

type LoadState = "loading" | "ready" | "error";

// 今日の YYYY-MM-DD 文字列を返す（ローカルタイム）
function todayString(): string {
  return toDateString(new Date());
}

// 翌日の YYYY-MM-DD 文字列を返す（ローカルタイム）
function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateString(d);
}

export default function TransferKanbanBoard() {
  const { t } = useAdminTranslation();
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowString);

  // 部屋リスト（写真URL含む）を初回取得
  useEffect(() => {
    supabase
      .from("rooms")
      .select("name, photo_url")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setRooms(data as RoomInfo[]);
      });
  }, []);

  // transfer_date が存在する場合はそれで絞り込む。
  // 古いレコード（transfer_date = NULL）は flight_time の日付範囲で対応（後方互換）
  const { start: dateStart, end: dateEnd } = useMemo(
    () => getDateRange(parseDateString(selectedDate)),
    [selectedDate]
  );

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    async function load() {
      const SELECT_FIELDS = `id, room_number, flight_time, suggested_departure_time, preferred_departure_time,
           passenger_count, luggage_large, luggage_small, luggage_special, status,
           guests ( full_name, passport_image_url ),
           destinations ( name, image_url )`;

      // transfer_date で絞り込んだ新形式データ
      const { data: newData, error: newError } = await supabase
        .from("transfer_requests")
        .select(SELECT_FIELDS)
        .neq("status", "cancelled")
        .eq("transfer_date", selectedDate)
        .order("suggested_departure_time", { ascending: true, nullsFirst: true })
        .order("flight_time", { ascending: true, nullsFirst: false });

      // 後方互換: transfer_date がない古いレコードは flight_time 範囲で取得
      const { data: legacyData, error: legacyError } = await supabase
        .from("transfer_requests")
        .select(SELECT_FIELDS)
        .neq("status", "cancelled")
        .is("transfer_date", null)
        .gte("flight_time", dateStart.toISOString())
        .lt("flight_time", dateEnd.toISOString())
        .order("suggested_departure_time", { ascending: true, nullsFirst: true })
        .order("flight_time", { ascending: true });

      if (cancelled) return;

      if (newError && legacyError) {
        setState("error");
        return;
      }

      const combined = [
        ...((newData ?? []) as unknown as RawTransferRow[]),
        ...((legacyData ?? []) as unknown as RawTransferRow[]),
      ];
      setCards(combined.map((row) => toCard(row, t, rooms)).filter(isWithinMorningTransferBoard));
      setState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, dateStart, dateEnd, rooms]);

  // 前日・翌日ナビゲーション
  const shiftDate = (days: number) => {
    const d = parseDateString(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateString(d));
  };

  const isToday = selectedDate === todayString();
  const isTomorrow = selectedDate === tomorrowString();

  return (
    <div>
      {/* 日付ピッカー */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
          aria-label="前日"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative flex items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {(isToday || isTomorrow) && (
            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {isToday ? (t.board.todayBadge ?? "今日") : (t.board.tomorrowBadge ?? "明日")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => shiftDate(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
          aria-label="翌日"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {state === "loading" && (
        <p className="mb-4 text-sm text-slate-400">{t.common.loading}</p>
      )}

      {state === "error" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {t.board.loadFailed}
        </div>
      )}

      {state === "ready" && (
        <>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {t.board.summary(formatDateLabel(dateStart), cards.length)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-red-300 bg-red-50" />
              {t.board.heavyHint(4)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {TIME_LANES.map((lane) => {
              const laneCards = cards.filter((card) => assignLane(card).id === lane.id);
              return (
                <div key={lane.id} className="flex flex-col gap-3 rounded-2xl bg-slate-100/70 p-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-slate-600">{lane.label}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-400">
                      {t.board.laneCount(laneCards.length)}
                    </span>
                  </div>

                  {laneCards.length === 0 ? (
                    <p className="px-1 text-xs text-slate-400">{t.board.laneEmpty}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {laneCards.map((card) => (
                        <TransferCard key={card.id} card={card} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
