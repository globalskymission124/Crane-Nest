"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/stays/AuthGuard";
import JapanTravelCard from "@/components/stays/JapanTravelCard";
import { useStaysSession } from "@/lib/stays/auth";
import {
  fetchJapanTravelCard,
  fetchJapanTravelCardForAdminRecord,
  type JapanTravelCardData,
  type TravelCardPreviewSource,
} from "@/lib/stays/travelCard";

function isPreviewSource(value: string | null): value is TravelCardPreviewSource {
  return value === "transfer" || value === "checkin";
}

function LoadingCard() {
  return (
    <p className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      Travel Cardを準備中...
    </p>
  );
}

function TravelCardBody() {
  const { session } = useStaysSession();
  const searchParams = useSearchParams();
  const previewSource = searchParams.get("previewSource");
  const previewId = searchParams.get("previewId");
  const [card, setCard] = useState<JapanTravelCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const activeSession = session;

    setCard(null);
    setError(null);

    async function load(): Promise<JapanTravelCardData> {
      if (previewSource || previewId) {
        if (activeSession.role !== "admin") {
          throw new Error("Travel Cardプレビューは管理者ログインでのみ表示できます。");
        }
        if (!isPreviewSource(previewSource) || !previewId) {
          throw new Error("Travel CardプレビューURLが正しくありません。");
        }
        return fetchJapanTravelCardForAdminRecord(previewSource, previewId);
      }

      return fetchJapanTravelCard(activeSession);
    }

    load()
      .then((data) => {
        if (!cancelled) setCard(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Travel Cardを読み込めませんでした";
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.role, previewSource, previewId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
        {error}
      </div>
    );
  }

  if (!card) {
    return <LoadingCard />;
  }

  return <JapanTravelCard data={card} />;
}

export default function TravelCardPage() {
  return (
    <AuthGuard roles={["guest", "host", "admin"]}>
      <Suspense fallback={<LoadingCard />}>
        <TravelCardBody />
      </Suspense>
    </AuthGuard>
  );
}
