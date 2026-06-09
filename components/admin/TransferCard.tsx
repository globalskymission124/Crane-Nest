"use client";

import { Luggage, Plane, Users } from "lucide-react";
import {
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

  // 表示する出発時刻（優先順位: suggested > preferred > flight）
  const departureLabel = card.departureTime
    ? formatTime(card.departureTime)
    : card.preferredDepartureTime ?? null;

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border text-sm shadow-sm overflow-hidden ${
        heavy ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      {/* 部屋・目的地のサムネイル画像帯 */}
      {(card.roomPhotoUrl || card.destinationImageUrl) && (
        <div className="flex h-20 w-full gap-0.5">
          {card.roomPhotoUrl && (
            <div className={`relative flex-1 overflow-hidden ${!card.destinationImageUrl ? "w-full" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.roomPhotoUrl}
                alt={card.roomNumber}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {card.roomNumber}
              </span>
            </div>
          )}
          {card.destinationImageUrl && (
            <div className={`relative flex-1 overflow-hidden ${!card.roomPhotoUrl ? "w-full" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.destinationImageUrl}
                alt={card.destinationName}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {card.destinationName}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">
            {card.roomNumber}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {departureLabel
              ? t.board.cardDepartureEstimate(departureLabel)
              : t.board.cardFlight(formatTime(card.flightTime))}
          </span>
        </div>

        <div>
          <p className="font-semibold text-slate-800">{card.guestName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Plane className="h-3.5 w-3.5" />
            {t.board.cardDestinationFlight(card.destinationName, formatTime(card.flightTime))}
          </p>
        </div>

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
