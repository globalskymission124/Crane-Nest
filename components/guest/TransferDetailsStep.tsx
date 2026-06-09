"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Info, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Destination, Room, TransferFormData } from "@/lib/types";
import { calculateSuggestedDepartureTime, isKansaiAirport } from "@/lib/transferTime";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import Counter from "./Counter";
import LanguageSwitcher from "./LanguageSwitcher";

// YYYY-MM-DD 形式でオフセット日数後の文字列を返す（ローカルタイム）
function localDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// roomsテーブル取得失敗時のフォールバック（オフライン/未設定時のデモ用）
const FALLBACK_ROOMS: Room[] = Array.from({ length: 9 }, (_, i) => ({
  id: `fallback-room-${i + 1}`,
  name: `10${i + 1}`,
  photo_url: null,
  display_order: i + 1,
  is_active: true,
}));

// destinationsテーブル取得失敗時のフォールバック（オフライン/未設定時のデモ用）
const FALLBACK_DESTINATIONS: Destination[] = [
  { id: "fallback-kix", name: "関西国際空港", image_url: null, display_order: 1, is_active: true, price_jpy: null },
  { id: "fallback-rinku", name: "りんくうタウン駅", image_url: null, display_order: 2, is_active: true, price_jpy: null },
  { id: "fallback-hineno", name: "JR日根野駅", image_url: null, display_order: 3, is_active: true, price_jpy: null },
];

interface TransferDetailsStepProps {
  onBack: () => void;
  /**
   * 入力完了時に、フォームデータと選択された目的地・お部屋の情報を一緒に渡す。
   * 完了画面（デジタル乗車券）で目的地・お部屋の写真を表示するために、
   * 表示名だけでなくオブジェクト全体（写真URL含む）を渡す。
   */
  onNext: (data: TransferFormData, destination: Destination, room: Room) => void;
}

export default function TransferDetailsStep({ onBack, onNext }: TransferDetailsStepProps) {
  const { t } = useTranslation();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destinationId, setDestinationId] = useState<string | null>(null);

  const [transferDate, setTransferDate] = useState<string>(() => localDateString(1));

  const [flightTime, setFlightTime] = useState<string>("");
  const [preferredDepartureTime, setPreferredDepartureTime] = useState<string>("");

  const [passengerCount, setPassengerCount] = useState(1);
  const [luggageLarge, setLuggageLarge] = useState(0);
  const [luggageSmall, setLuggageSmall] = useState(0);
  const [luggageSpecial, setLuggageSpecial] = useState(0);

  // お部屋マスターを動的取得（無効化されたものは除外、表示順に整列）
  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, photo_url, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setRooms(FALLBACK_ROOMS);
        setRoomId(FALLBACK_ROOMS[0]?.id ?? null);
      } else {
        const list = data as Room[];
        setRooms(list);
        setRoomId(list[0]?.id ?? null);
      }
      setLoadingRooms(false);
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  // 目的地マスターを動的取得（無効化されたものは除外、表示順に整列）
  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, image_url, display_order, is_active, price_jpy")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setDestinations(FALLBACK_DESTINATIONS);
      } else {
        setDestinations(data as Destination[]);
      }
      setLoadingDestinations(false);
    }

    loadDestinations();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRoom = rooms.find((r) => r.id === roomId) ?? null;
  const selectedDestination = destinations.find((d) => d.id === destinationId) ?? null;

  const suggestedDepartureTime =
    selectedDestination && isKansaiAirport(selectedDestination.name) && flightTime
      ? calculateSuggestedDepartureTime(flightTime)
      : null;

  // フライト時刻は任意項目になったため、必須なのは「お部屋」と「目的地」の選択のみ
  const canProceed = roomId !== null && destinationId !== null;

  const handleSubmit = () => {
    if (!canProceed || !selectedDestination || !selectedRoom) return;
    onNext(
      {
        transferDate,
        roomNumber: selectedRoom.name,
        destinationId,
        flightTime,
        preferredDepartureTime: preferredDepartureTime || null,
        suggestedDepartureTime,
        passengerCount,
        luggageLarge,
        luggageSmall,
        luggageSpecial,
      },
      selectedDestination,
      selectedRoom
    );
  };

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-brand-600">{t.stepLabel(2, 3)}</p>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-1 text-xl font-bold">{t.transfer.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.transfer.description}</p>
      </header>

      <div className="flex flex-col gap-6">
        {/* 送迎日付選択 */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-slate-700">{t.transfer.transferDateLabel}</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={transferDate}
              min={localDateString(0)}
              onChange={(e) => setTransferDate(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setTransferDate(localDateString(1))}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                transferDate === localDateString(1)
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-500 hover:border-brand-300"
              }`}
            >
              明日
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{t.transfer.transferDateNote}</p>
        </section>

        {/* お部屋（写真付きカード） */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.transfer.roomLabel}</h2>
          {loadingRooms ? (
            <p className="text-sm text-slate-400">{t.transfer.roomLoading}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {rooms.map((room) => {
                const selected = roomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setRoomId(room.id)}
                    className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.97] ${
                      selected ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      {room.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={room.photo_url} alt={room.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-300">
                          {room.name}
                        </div>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1.5 text-center text-sm font-semibold ${
                        selected ? "bg-brand-50 text-brand-700" : "bg-white text-slate-600"
                      }`}
                    >
                      {room.name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 目的地（写真付きカード） */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.transfer.destinationLabel}</h2>
          {loadingDestinations ? (
            <p className="text-sm text-slate-400">{t.transfer.destinationLoading}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {destinations.map((dest) => {
                const selected = destinationId === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setDestinationId(dest.id)}
                    className={`flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                      selected ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200"
                    }`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {dest.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dest.image_url} alt={dest.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Lightbulb className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={`text-sm font-medium ${selected ? "text-brand-700" : "text-slate-600"}`}>
                        {dest.name}
                      </span>
                      {dest.price_jpy != null && (
                        <span className={`mt-0.5 text-xs font-semibold ${selected ? "text-brand-600" : "text-slate-400"}`}>
                          ¥{dest.price_jpy.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* フライト時刻（任意項目） */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">{t.transfer.flightTimeLabel}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {t.transfer.flightTimeOptionalBadge}
            </span>
          </div>
          <input
            type="time"
            value={flightTime}
            onChange={(e) => setFlightTime(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1.5 text-xs text-slate-400">{t.transfer.flightTimeOptionalNote}</p>

          {suggestedDepartureTime && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t.transfer.suggestion(suggestedDepartureTime)}</p>
            </div>
          )}
        </section>

        {/* 希望出発（送迎）時刻 */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">{t.transfer.preferredDepartureTimeLabel}</h2>
          <input
            type="time"
            value={preferredDepartureTime}
            onChange={(e) => setPreferredDepartureTime(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1.5 text-xs text-slate-400">{t.transfer.preferredDepartureTimeNote}</p>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>{t.transfer.checkoutNote}</p>
          </div>
        </section>

        {/* 人数・荷物 */}
        <section className="flex flex-col gap-2.5">
          <h2 className="mb-0.5 text-sm font-semibold text-slate-700">{t.transfer.luggageSectionLabel}</h2>
          <Counter icon="🧑‍🤝‍🧑" label={t.transfer.passengerLabel} value={passengerCount} min={1} onChange={setPassengerCount} />
          <Counter icon="🧳" label={t.transfer.luggageLargeLabel} value={luggageLarge} onChange={setLuggageLarge} />
          <Counter icon="🎒" label={t.transfer.luggageSmallLabel} value={luggageSmall} onChange={setLuggageSmall} />
          <Counter icon="🚲" label={t.transfer.luggageSpecialLabel} value={luggageSpecial} onChange={setLuggageSpecial} />
        </section>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-300 px-5 py-3.5 text-sm font-semibold text-slate-600"
        >
          {t.transfer.back}
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={handleSubmit}
          className="flex-1 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {t.transfer.confirm}
        </button>
      </div>
    </div>
  );
}
