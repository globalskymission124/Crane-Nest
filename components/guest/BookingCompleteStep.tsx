"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Image as ImageIcon, Luggage, Users } from "lucide-react";
import type { Destination, PassportFormData, Room, TransferFormData } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "./LanguageSwitcher";

interface BookingCompleteStepProps {
  passport: PassportFormData;
  transfer: TransferFormData;
  destination: Destination;
  room: Room;
  /** デモ表示用の予約番号。本番ではSupabaseへのinsert結果(transfer_requests.id)を利用する。 */
  bookingReference?: string;
}

function buildTicketPayload(
  bookingReference: string,
  passport: PassportFormData,
  transfer: TransferFormData,
  destinationName: string
) {
  return JSON.stringify({
    ref: bookingReference,
    name: passport.fullName,
    room: transfer.roomNumber,
    destination: destinationName,
    departure:
      transfer.suggestedDepartureTime ??
      transfer.preferredDepartureTime ??
      (transfer.flightTime || null),
  });
}

const luggageTotal = (transfer: TransferFormData) =>
  transfer.luggageLarge + transfer.luggageSmall + transfer.luggageSpecial;

// 写真カード（目的地・お部屋共通）。画像が無い場合はプレースホルダーを表示する。
function PhotoCard({ label, name, imageUrl }: { label: string; name: string; imageUrl: string | null }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-700">{name}</p>
      </div>
    </div>
  );
}

export default function BookingCompleteStep({
  passport,
  transfer,
  destination,
  room,
  bookingReference = "TRF-PENDING",
}: BookingCompleteStepProps) {
  const { t } = useTranslation();
  const qrPayload = useMemo(
    () => buildTicketPayload(bookingReference, passport, transfer, destination.name),
    [bookingReference, passport, transfer, destination.name]
  );

  const departureLabel =
    transfer.suggestedDepartureTime ?? transfer.preferredDepartureTime ?? (transfer.flightTime || "—");

  // 「指定した出発時間」をご希望の出発時刻欄として明示表示する（推奨時刻と重複しても、ご本人が指定した内容を確実に提示するため）
  const showSpecifiedDeparture = Boolean(transfer.preferredDepartureTime);

  const total = luggageTotal(transfer);

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="mb-2 flex justify-end">
        <LanguageSwitcher />
      </div>

      <header className="mb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-600/30">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="mt-3 text-sm font-medium text-brand-600">{t.stepLabel(3, 3)}</p>
        <h1 className="mt-1 text-xl font-bold">{t.complete.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.complete.description}</p>
      </header>

      {/* デジタル乗車券 */}
      <div className="overflow-hidden rounded-2xl border border-brand-100 shadow-lg shadow-brand-700/20">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-3.5 text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-100">{t.complete.boardingPass}</p>
          <p className="text-base font-bold">{t.complete.transferTo(destination.name)}</p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* 目的地・お部屋の写真 */}
          <div className="flex gap-2.5">
            <PhotoCard label={t.complete.destinationPhotoLabel} name={destination.name} imageUrl={destination.image_url} />
            <PhotoCard label={t.complete.roomPhotoLabel} name={room.name} imageUrl={room.photo_url} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{t.complete.guestNameLabel}</p>
              <p className="text-base font-semibold">{passport.fullName || t.complete.guestFallbackName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t.complete.roomLabel}</p>
              <p className="text-base font-semibold">{transfer.roomNumber}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-brand-100/70 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3">
            <div>
              <p className="text-xs text-slate-400">
                {transfer.suggestedDepartureTime
                  ? t.complete.suggestedDepartureLabel
                  : t.complete.preferredDepartureLabel}
              </p>
              <p className="text-lg font-bold text-brand-700">{departureLabel}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {transfer.flightTime && <p>{t.complete.flightTimeLabel} {transfer.flightTime}</p>}
              <p>{t.complete.bookingRefLabel} {bookingReference}</p>
            </div>
          </div>

          {/* ご本人が指定した出発時刻（推奨時刻とは別に、必ず明示する） */}
          {showSpecifiedDeparture && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
              <span className="text-slate-500">{t.complete.specifiedDepartureLabel}</span>
              <span className="font-semibold text-slate-700">{transfer.preferredDepartureTime}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              {t.complete.passengerCount(transfer.passengerCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <Luggage className="h-4 w-4 text-slate-400" />
              {t.complete.luggageTotal(total)}
            </span>
          </div>

          {/* 荷物の内訳（大型・小型・特殊それぞれの個数） */}
          {total > 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-slate-400">{t.complete.luggageBreakdownLabel}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                {transfer.luggageLarge > 0 && (
                  <span>
                    {t.transfer.luggageLargeLabel} <span className="font-semibold text-slate-700">×{transfer.luggageLarge}</span>
                  </span>
                )}
                {transfer.luggageSmall > 0 && (
                  <span>
                    {t.transfer.luggageSmallLabel} <span className="font-semibold text-slate-700">×{transfer.luggageSmall}</span>
                  </span>
                )}
                {transfer.luggageSpecial > 0 && (
                  <span>
                    {t.transfer.luggageSpecialLabel} <span className="font-semibold text-slate-700">×{transfer.luggageSpecial}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 border-t border-dashed border-slate-200 pt-4">
            <QRCodeSVG value={qrPayload} size={148} includeMargin />
            <p className="text-xs text-slate-400">{t.complete.qrHint}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p>・{t.complete.note1}</p>
        <p>・{t.complete.note2}</p>
        <p>・{t.transfer.checkoutNote}</p>
      </div>
    </div>
  );
}
