"use client";

import { Luggage, Plane, Users } from "lucide-react";
import {
  getDisplayDepartureLabel,
  formatTime,
  isHeavyLuggage,
  luggageTotal,
  type KanbanCard,
} from "@/lib/adminSchedule";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

interface TransferCardProps {
  card: KanbanCard;
}

export default function TransferCard({ card }: TransferCardProps) {
  const { t } = useAdminTranslation();
  const heavy = isHeavyLuggage(card);
  const departureLabel = getDisplayDepartureLabel(card);
  const hasImages = card.roomPhotoUrl || card.destinationImageUrl;

  return (
    <div
      className={`flex flex-col rounded-xl border shadow-sm overflow-hidden text-sm ${
        heavy ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      {/* ===== 画像エリア ===== */}
      {hasImages && (
        <div className="flex w-full" style={{ aspectRatio: "16/7" }}>
          {/* 部屋写真 */}
          {card.roomPhotoUrl && (
            <div className="relative flex-1 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.roomPhotoUrl}
                alt={card.roomNumber}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <span className="text-[11px] font-bold text-white drop-shadow">
                  {card.roomNumber}
                </span>
              </span>
            </div>
          )}

          {/* 区切り */}
          {card.roomPhotoUrl && card.destinationImageUrl && (
            <div className="w-px bg-white/40" />
          )}

          {/* 目的地写真 */}
          {card.destinationImageUrl && (
            <div className="relative flex-1 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.destinationImageUrl}
                alt={card.destinationName}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-right">
                <span className="text-[11px] font-bold text-white drop-shadow">
                  {card.destinationName}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ===== 情報エリア ===== */}
      <div className="flex flex-col gap-2.5 px-3 py-3">
        {/* ヘッダー行: 部屋バッジ + 希望出発時刻 */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-white shrink-0">
            {card.roomNumber}
          </span>
          {departureLabel && (
            <span className={`text-xs font-semibold ${heavy ? "text-red-700" : "text-brand-600"}`}>
              {t.board.cardDepartureEstimate(departureLabel)}
            </span>
          )}
        </div>

        {/* ゲスト名 + パスポート写真 */}
        <div className="flex items-center gap-2">
          {card.passportImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.passportImageUrl}
              alt={card.guestName}
              className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-100 text-xs font-bold text-slate-400">
              {card.guestName.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="font-semibold text-slate-800 leading-tight truncate">{card.guestName}</p>
        </div>

        {/* 目的地 + フライト時刻 */}
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Plane className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t.board.cardDestinationFlight(card.destinationName, formatTime(card.flightTime))}
          </span>
        </p>

        {/* 人数 + 荷物 */}
        <div className={`flex items-center gap-4 text-xs ${heavy ? "text-red-700" : "text-slate-500"}`}>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {t.board.cardPassengers(card.passengerCount)}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <Luggage className="h-3.5 w-3.5" />
            {t.board.cardLuggageTotal(luggageTotal(card))}
            {heavy && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {t.board.cardHeavyBadge}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
