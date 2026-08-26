"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import PassportUploadStep from "@/components/guest/PassportUploadStep";
import TransferDetailsStep from "@/components/guest/TransferDetailsStep";
import BookingCompleteStep from "@/components/guest/BookingCompleteStep";
import type { Destination, PassportFormData, Room, TransferFormData } from "@/lib/types";
import { submitBooking } from "@/lib/guestBooking";
import { autoSignInWithPassport } from "@/lib/stays/auth";

type GuestStep = "passport" | "details" | "submitting" | "submitError" | "complete";

function notifyTransferBooking(transferRequestId: string) {
  fetch("/api/transfer/booking-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transferRequestId }),
  }).catch(() => {
    // 通知失敗でゲストの予約完了体験を止めない。
  });
}

export default function GuestFlowPage() {
  const [step, setStep] = useState<GuestStep>("passport");
  const [passport, setPassport] = useState<PassportFormData | null>(null);
  const [transfer, setTransfer] = useState<TransferFormData | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bookingReference, setBookingReference] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");

  const handlePassportNext = (data: PassportFormData) => {
    setPassport(data);
    // パスポート情報で予約プラットフォーム(Stays)のゲストアカウントを
    // 自動作成してサインイン状態にする（失敗しても送迎予約は続行）。
    // パスワードは後から /stays/profile で設定できる。
    autoSignInWithPassport(data.fullName, data.passportNumber, data.phoneNumber);
    setStep("details");
  };

  const handleDetailsNext = async (data: TransferFormData, resolvedDestination: Destination, resolvedRoom: Room) => {
    setTransfer(data);
    setDestination(resolvedDestination);
    setRoom(resolvedRoom);
    setSubmitError("");
    setStep("submitting");

    // パスポート写真・宿泊者情報・送迎リクエストをSupabaseへ保存する。
    // 管理画面で「誰がいつ宿泊したか」をパスポート写真とリンクして確認・ダウンロードできるようにするため。
    // 保存できなかった予約は送迎看板に出ないため、完了画面には進めず理由を表示する。
    try {
      if (!passport) throw new Error("パスポート情報が見つかりません。最初からやり直してください。");
      const result = await submitBooking(passport, data);
      setBookingReference(result.bookingReference);
      setStep("complete");
      notifyTransferBooking(result.transferRequestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "予約情報の保存に失敗しました。";
      setSubmitError(message);
      setStep("submitError");
    }
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

    case "submitError":
      return (
        <div className="flex h-full min-h-[480px] flex-col justify-center px-5 py-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-5 text-rose-700">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-base font-bold">予約情報を保存できませんでした</h1>
            </div>
            <p className="text-sm leading-6">
              このまま完了すると管理画面の送迎看板に表示されません。通信状況を確認して、もう一度送信してください。
            </p>
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-rose-600">{submitError}</p>
          </div>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="mt-5 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            入力画面に戻る
          </button>
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
