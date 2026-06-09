"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import PassportUploadStep from "@/components/guest/PassportUploadStep";
import TransferDetailsStep from "@/components/guest/TransferDetailsStep";
import BookingCompleteStep from "@/components/guest/BookingCompleteStep";
import type { Destination, PassportFormData, Room, TransferFormData } from "@/lib/types";
import { submitBooking } from "@/lib/guestBooking";

type GuestStep = "passport" | "details" | "submitting" | "complete";

// Supabaseへの保存に失敗した場合のフォールバック予約番号（デモ表示用）
function generateFallbackBookingReference() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${random}`;
}

export default function GuestFlowPage() {
  const [step, setStep] = useState<GuestStep>("passport");
  const [passport, setPassport] = useState<PassportFormData | null>(null);
  const [transfer, setTransfer] = useState<TransferFormData | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bookingReference, setBookingReference] = useState<string>("");

  const handlePassportNext = (data: PassportFormData) => {
    setPassport(data);
    setStep("details");
  };

  const handleDetailsNext = async (data: TransferFormData, resolvedDestination: Destination, resolvedRoom: Room) => {
    setTransfer(data);
    setDestination(resolvedDestination);
    setRoom(resolvedRoom);
    setStep("submitting");

    // パスポート写真・宿泊者情報・送迎リクエストをSupabaseへ保存する。
    // 管理画面で「誰がいつ宿泊したか」をパスポート写真とリンクして確認・ダウンロードできるようにするため。
    // 保存に失敗してもゲスト側の体験は止めず、デモ用の予約番号で完了画面へ進める。
    const result = passport ? await submitBooking(passport, data) : null;
    setBookingReference(result?.bookingReference ?? generateFallbackBookingReference());
    setStep("complete");
  };

  switch (step) {
    case "passport":
      return <PassportUploadStep onNext={handlePassportNext} />;

    case "details":
      return <TransferDetailsStep onBack={() => setStep("passport")} onNext={handleDetailsNext} />;

    case "submitting":
      return (
        <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 px-5 py-6 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm">予約内容を送信しています...</p>
        </div>
      );

    case "complete":
      if (!passport || !transfer || !destination || !room) return null;
      return (
        <BookingCompleteStep
          passport={passport}
          transfer={transfer}
          destination={destination}
          room={room}
          bookingReference={bookingReference}
        />
      );

    default:
      return null;
  }
}
