"use client";

// =========================================================
// Step 6: 宿泊記録管理
//
// ゲストがアップロードしたパスポート写真と宿泊者情報（氏名・パスポート番号・
// 連絡先・お部屋・行き先・宿泊予定日）を月単位で一覧表示し、
// 「誰がいつ宿泊したか」が一目でわかる形でパスポート写真とリンクさせて
// ZIPファイルとしてダウンロードできるようにする。
// =========================================================

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Download, ExternalLink, Hash, IdCard, ImageOff, Loader2, MapPin, Phone, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import type { AdminDictionary } from "@/lib/i18n/admin/types";

type GuestRecordSource = "transfer" | "checkin";

// 1予約に紐づく1名分（代表者・同行者共通）
interface GuestPerson {
  fullName: string;
  passportNumber: string;
  nationality: string | null;
  phoneNumber: string | null;
  email: string | null;
  passportImageUrl: string | null;
  isPrimary: boolean;
}

interface GuestRecord {
  recordId: string;
  source: GuestRecordSource;
  sourceLabel: string;
  createdAt: string; // 登録日時（ISO）
  recordDate: string | null; // 月別絞り込みに使う日付（送迎日 or C/I日）
  transferDate: string | null; // 送迎日（YYYY-MM-DD）
  checkinDate: string | null; // QRチェックイン日（YYYY-MM-DD）
  departureTime: string | null;
  flightTime: string | null;
  passengerCount: number | null;
  luggageTotal: number | null;
  status: string | null;
  checkinPageTitle: string | null;
  // 代表者の情報（既存の一覧・モーダル表示との後方互換のため保持）
  fullName: string;
  passportNumber: string;
  nationality: string | null;
  phoneNumber: string | null;
  email: string | null;
  passportImageUrl: string | null;
  // 予約に含まれる全ゲスト（代表者を先頭に、同行者が続く）
  guests: GuestPerson[];
  roomNumber: string | null;
  destinationName: string | null;
}

interface RawGuest {
  full_name: string;
  passport_number: string;
  phone_number: string | null;
  passport_image_url: string | null;
}

interface RawTransferRow {
  id: string;
  created_at: string;
  room_number: string;
  transfer_date: string | null;
  flight_time: string | null;
  preferred_departure_time: string | null;
  suggested_departure_time: string | null;
  guests: RawGuest | RawGuest[] | null;
  passenger_count: number | null;
  luggage_large: number | null;
  luggage_small: number | null;
  luggage_special: number | null;
  status: string | null;
  destinations: { name: string } | { name: string }[] | null;
}

interface RawTransferLink {
  transfer_request_id: string;
  is_primary: boolean;
  guests: RawGuest | RawGuest[] | null;
}

interface RawCheckinRow {
  id: string;
  created_at: string;
  full_name: string;
  passport_number: string;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  checkin_date: string | null;
  passport_image_url: string | null;
  stays_checkin_pages: { title: string } | { title: string }[] | null;
}

type LoadState = "loading" | "ready" | "error";

function pickRecord<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toPerson(guest: RawGuest, isPrimary: boolean, t: AdminDictionary): GuestPerson {
  return {
    fullName: guest.full_name ?? t.records.unregisteredName,
    passportNumber: guest.passport_number ?? "—",
    nationality: null,
    phoneNumber: guest.phone_number ?? null,
    email: null,
    passportImageUrl: guest.passport_image_url ?? null,
    isPrimary,
  };
}

function toCheckinPerson(row: RawCheckinRow, t: AdminDictionary): GuestPerson {
  return {
    fullName: row.full_name ?? t.records.unregisteredName,
    passportNumber: row.passport_number ?? "—",
    nationality: row.nationality ?? null,
    phoneNumber: row.phone ?? null,
    email: row.email ?? null,
    passportImageUrl: row.passport_image_url ?? null,
    isPrimary: true,
  };
}

function toTransferRecord(row: RawTransferRow, links: RawTransferLink[] | undefined, t: AdminDictionary): GuestRecord {
  const destination = pickRecord(row.destinations);

  // 中間テーブルがあれば全ゲストを展開（代表者を先頭に並べ替え）。
  // 無ければ従来どおり単一FKの guests を代表者1名として扱う（旧データ互換）。
  let people: GuestPerson[] = [];
  if (links && links.length > 0) {
    people = links
      .map((link) => {
        const g = pickRecord(link.guests);
        return g ? toPerson(g, link.is_primary, t) : null;
      })
      .filter((p): p is GuestPerson => p !== null)
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }
  if (people.length === 0) {
    const fallback = pickRecord(row.guests);
    people = fallback ? [toPerson(fallback, true, t)] : [];
  }

  const primary = people[0];

  return {
    recordId: row.id,
    source: "transfer",
    sourceLabel: t.records.transferSourceLabel,
    createdAt: row.created_at,
    recordDate: row.transfer_date ?? row.flight_time ?? row.suggested_departure_time ?? null,
    transferDate: row.transfer_date ?? null,
    checkinDate: null,
    departureTime: row.preferred_departure_time ?? formatTimeLabel(row.suggested_departure_time),
    flightTime: formatTimeLabel(row.flight_time),
    passengerCount: row.passenger_count ?? null,
    luggageTotal: (row.luggage_large ?? 0) + (row.luggage_small ?? 0) + (row.luggage_special ?? 0),
    status: row.status ?? null,
    checkinPageTitle: null,
    fullName: primary?.fullName ?? t.records.unregisteredName,
    passportNumber: primary?.passportNumber ?? "—",
    nationality: primary?.nationality ?? null,
    phoneNumber: primary?.phoneNumber ?? null,
    email: primary?.email ?? null,
    passportImageUrl: primary?.passportImageUrl ?? null,
    guests: people,
    roomNumber: row.room_number,
    destinationName: destination?.name ?? t.records.unsetDestination,
  };
}

function toCheckinRecord(row: RawCheckinRow, t: AdminDictionary): GuestRecord {
  const person = toCheckinPerson(row, t);
  const page = pickRecord(row.stays_checkin_pages);

  return {
    recordId: row.id,
    source: "checkin",
    sourceLabel: t.records.checkinSourceLabel,
    createdAt: row.created_at,
    recordDate: row.checkin_date ?? row.created_at,
    transferDate: null,
    checkinDate: row.checkin_date ?? null,
    departureTime: null,
    flightTime: null,
    passengerCount: null,
    luggageTotal: null,
    status: null,
    checkinPageTitle: page?.title ?? null,
    fullName: person.fullName,
    passportNumber: person.passportNumber,
    nationality: person.nationality,
    phoneNumber: person.phoneNumber,
    email: person.email,
    passportImageUrl: person.passportImageUrl,
    guests: [person],
    roomNumber: null,
    destinationName: null,
  };
}

// "2026-06" 形式のキーを返す（月単位の絞り込み・グルーピング用）
function monthKey(value: string | null): string {
  return (value || "").slice(0, 7);
}

function recordMonthKey(record: GuestRecord): string {
  return monthKey(record.recordDate ?? record.createdAt);
}

function buildTravelCardPreviewHref(record: GuestRecord): string {
  const params = new URLSearchParams({
    previewSource: record.source,
    previewId: record.recordId,
  });
  return `/stays/travel-card?${params.toString()}`;
}

function formatDateLabel(isoString: string | null, undecided: string): string {
  if (!isoString) return undecided;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) return isoString;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return undecided;
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTimeLabel(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeLabel(value: string | null): string | null {
  if (!value) return null;
  const time = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (time) return `${time[1].padStart(2, "0")}:${time[2]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function monthLabel(key: string, monthFormat: (year: string, month: number) => string): string {
  const [year, month] = key.split("-");
  if (!year || !month) return key;
  return monthFormat(year, Number(month));
}

// ファイル名に使えない文字を除去・置換する
function sanitizeForFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || "guest";
}

function fileExtensionFromUrl(url: string): string {
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/.exec(url);
  return match ? match[1].toLowerCase() : "jpg";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nonEmptyCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text || "—";
}

function contactCell(person: GuestPerson): string {
  const parts = [person.phoneNumber, person.email].filter((value): value is string => Boolean(value?.trim()));
  return parts.length > 0 ? parts.join(" / ") : "—";
}

async function fetchTransferRecords(t: AdminDictionary): Promise<GuestRecord[]> {
  const { data, error } = await supabase
    .from("transfer_requests")
    .select(
      `id, created_at, room_number, transfer_date, flight_time, preferred_departure_time, suggested_departure_time,
       passenger_count, luggage_large, luggage_small, luggage_special, status,
       guests ( full_name, passport_number, phone_number, passport_image_url ),
       destinations ( name )`
    )
    .order("created_at", { ascending: false });

  if (error || !data) throw error ?? new Error("transfer_requests returned no data");

  const rows = data as unknown as RawTransferRow[];
  const ids = rows.map((row) => row.id);
  const linksByTransfer = new Map<string, RawTransferLink[]>();

  if (ids.length > 0) {
    const { data: linkData, error: linkError } = await supabase
      .from("transfer_request_guests")
      .select("transfer_request_id, is_primary, guests ( full_name, passport_number, phone_number, passport_image_url )")
      .in("transfer_request_id", ids);

    if (!linkError && linkData) {
      for (const link of linkData as unknown as RawTransferLink[]) {
        const existing = linksByTransfer.get(link.transfer_request_id) ?? [];
        existing.push(link);
        linksByTransfer.set(link.transfer_request_id, existing);
      }
    } else if (linkError) {
      console.warn("[records] transfer_request_guests could not be loaded:", linkError.message, linkError);
    }
  }

  return rows.map((row) => toTransferRecord(row, linksByTransfer.get(row.id), t));
}

async function fetchCheckinRecords(t: AdminDictionary): Promise<GuestRecord[]> {
  const { data, error } = await supabase
    .from("stays_checkin_guests")
    .select(
      `id, created_at, full_name, passport_number, nationality, phone, email, checkin_date, passport_image_url,
       stays_checkin_pages ( title )`
    )
    .order("created_at", { ascending: false });

  if (error || !data) throw error ?? new Error("stays_checkin_guests returned no data");
  return (data as unknown as RawCheckinRow[]).map((row) => toCheckinRecord(row, t));
}

export default function GuestRecordsManager() {
  const { t } = useAdminTranslation();
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<GuestRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [transferRecords, checkinRecords] = await Promise.all([
          fetchTransferRecords(t),
          fetchCheckinRecords(t),
        ]);
        if (cancelled) return;

        const mapped = [...transferRecords, ...checkinRecords].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        );
        setRecords(mapped);
        setSelectedMonth((current) => current || (mapped[0] ? recordMonthKey(mapped[0]) : ""));
        setState("ready");
      } catch (error) {
        console.error("[records] load failed:", error);
        if (cancelled) return;
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set(records.map(recordMonthKey).filter(Boolean));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    return records.filter((record) => recordMonthKey(record) === selectedMonth);
  }, [records, selectedMonth]);

  const handleDownload = async () => {
    if (filteredRecords.length === 0 || downloading) return;

    setDownloading(true);
    setActionError(null);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const monthName = selectedMonth ? monthLabel(selectedMonth, t.records.monthFormat) : t.records.allPeriod;

      // ---- 一覧表（誰がいつ宿泊したか一目でわかるサマリー） ----
      const summaryHeader = t.records.summaryHeaders;
      const photoColumnIndex = summaryHeader.length - 1;

      const usedNames = new Set<string>();
      const summaryRows: string[][] = [];
      const photoEntries: { fileName: string; url: string }[] = [];

      for (const record of filteredRecords) {
        const dateLabel = formatDateLabel(record.recordDate, t.records.undecided);

        // 予約に含まれる全ゲスト（代表者＋同行者）を1名1行で書き出す。
        const people = record.guests.length > 0
          ? record.guests
          : [{
              fullName: record.fullName,
              passportNumber: record.passportNumber,
              nationality: record.nationality,
              phoneNumber: record.phoneNumber,
              email: record.email,
              passportImageUrl: record.passportImageUrl,
              isPrimary: true,
            } as GuestPerson];

        for (const person of people) {
          let photoFileName = "";

          if (person.passportImageUrl) {
            const baseName = `${dateLabel}_${sanitizeForFilename(person.fullName)}_${sanitizeForFilename(
              person.passportNumber
            )}`;
            let candidate = `${baseName}.${fileExtensionFromUrl(person.passportImageUrl)}`;
            let suffix = 2;
            while (usedNames.has(candidate)) {
              candidate = `${baseName}-${suffix}.${fileExtensionFromUrl(person.passportImageUrl)}`;
              suffix += 1;
            }
            usedNames.add(candidate);
            photoFileName = candidate;
            photoEntries.push({ fileName: candidate, url: person.passportImageUrl });
          }

          summaryRows.push([
            record.sourceLabel,
            formatDateTimeLabel(record.createdAt),
            dateLabel,
            person.fullName,
            person.passportNumber,
            nonEmptyCell(person.nationality),
            contactCell(person),
            nonEmptyCell(record.roomNumber),
            nonEmptyCell(record.destinationName),
            nonEmptyCell(record.departureTime),
            nonEmptyCell(record.passengerCount),
            nonEmptyCell(record.luggageTotal),
            nonEmptyCell(record.status ?? record.checkinPageTitle),
            photoFileName || t.records.noPhotoCell,
          ]);
        }
      }

      // CSV（Excel等で開きやすいようUTF-8 BOM付き）
      const csvBody = [summaryHeader, ...summaryRows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      zip.file(t.records.csvFileName, "﻿" + csvBody);

      // 一目でわかるHTML一覧表（パスポート写真へのリンク付き）
      const htmlRows = summaryRows
        .map(
          (row) => `
            <tr>
              ${row
                .map((cell, index) => {
                  if (index === photoColumnIndex) {
                    return `<td>${
                      cell !== t.records.noPhotoCell
                        ? `<a href="${escapeHtml(t.records.photoFolderName)}/${encodeURIComponent(cell)}">${escapeHtml(cell)}</a>`
                        : escapeHtml(t.records.noPhotoCell)
                    }</td>`;
                  }
                  return `<td>${index === 3 ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)}</td>`;
                })
                .join("")}
            </tr>`
        )
        .join("");

      const htmlDoc = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t.records.htmlTitle(monthName))}</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif; padding: 24px; color: #1e293b; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p.note { color: #64748b; font-size: 13px; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
  th { background: #eff6ff; color: #1d4ed8; }
  tr:nth-child(even) { background: #f8fafc; }
  a { color: #2563eb; }
</style>
</head>
<body>
  <h1>${escapeHtml(t.records.htmlHeading(monthName))}</h1>
  <p class="note">${escapeHtml(t.records.htmlNote)}</p>
  <table>
    <thead>
      <tr>${summaryHeader.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>${htmlRows}</tbody>
  </table>
</body>
</html>`;
      zip.file(t.records.htmlFileName, htmlDoc);

      // ---- パスポート写真をフォルダにまとめて格納 ----
      if (photoEntries.length > 0) {
        const photoFolder = zip.folder(t.records.photoFolderName);
        await Promise.all(
          photoEntries.map(async ({ fileName, url }) => {
            try {
              const response = await fetch(url);
              const blob = await response.blob();
              photoFolder?.file(fileName, blob);
            } catch {
              // 個別の画像取得に失敗しても全体のダウンロードは継続する
            }
          })
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = t.records.zipFileName(selectedMonth || t.records.allPeriod);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setActionError(t.records.downloadCreateFailed);
    } finally {
      setDownloading(false);
    }
  };

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.common.loading}
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {t.records.loadFailed}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ===== 詳細モーダル ===== */}
      {detailRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailRecord(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={() => setDetailRecord(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
            >
              <X className="h-4 w-4" />
            </button>

            {/* パスポート写真（全幅） */}
            {detailRecord.passportImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detailRecord.passportImageUrl}
                alt={t.records.passportPhotoAlt(detailRecord.fullName)}
                className="h-56 w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
                <ImageOff className="h-8 w-8" />
                <span className="text-sm">{t.records.noPhoto}</span>
              </div>
            )}

            {/* 詳細情報 */}
            <div className="p-5 flex flex-col gap-4">
              {/* 名前 + パスポート番号 */}
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                    {detailRecord.sourceLabel}
                  </span>
                  {detailRecord.status && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {detailRecord.status}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{detailRecord.fullName}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  {detailRecord.passportNumber}
                </p>
                <a
                  href={buildTravelCardPreviewHref(detailRecord)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
                >
                  <IdCard className="h-4 w-4" />
                  {t.records.travelCardPreviewButton}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* グリッド詳細 */}
              <div className="grid grid-cols-2 gap-3">
                {detailRecord.recordDate && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-brand-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">
                      {detailRecord.source === "transfer" ? t.records.transferDateLabel : t.records.checkinDateLabel}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-brand-700">
                      <Calendar className="h-3 w-3" />
                      {formatDateLabel(detailRecord.recordDate, t.records.undecided)}
                    </span>
                  </div>
                )}
                {detailRecord.roomNumber && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.roomLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.roomNumber}</span>
                  </div>
                )}
                {detailRecord.destinationName && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.destinationLabel}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                      <MapPin className="h-3 w-3" />
                      {detailRecord.destinationName}
                    </span>
                  </div>
                )}
                {detailRecord.departureTime && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.departureTimeLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.departureTime}</span>
                  </div>
                )}
                {detailRecord.passengerCount !== null && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.passengersLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.passengerCount}</span>
                  </div>
                )}
                {detailRecord.luggageTotal !== null && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.luggageLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.luggageTotal}</span>
                  </div>
                )}
                {detailRecord.nationality && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.nationalityLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.nationality}</span>
                  </div>
                )}
                {detailRecord.phoneNumber && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.phoneLabel}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                      <Phone className="h-3 w-3" />
                      {detailRecord.phoneNumber}
                    </span>
                  </div>
                )}
                {detailRecord.checkinPageTitle && (
                  <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t.records.checkinPageLabel}</span>
                    <span className="text-sm font-semibold text-slate-800">{detailRecord.checkinPageTitle}</span>
                  </div>
                )}
              </div>

              {/* 同行者（2人目以降） */}
              {detailRecord.guests.length > 1 && (
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {detailRecord.guests.length - 1}
                  </span>
                  {detailRecord.guests
                    .filter((person) => !person.isPrimary)
                    .map((person, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2">
                        {person.passportImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={person.passportImageUrl}
                            alt={t.records.passportPhotoAlt(person.fullName)}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{person.fullName}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Hash className="h-3 w-3" />
                            {person.passportNumber}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* 予約日時 */}
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                {t.records.bookingDateTimeLabel}: {formatDateTimeLabel(detailRecord.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 月選択 & ダウンロード */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">{t.records.monthLabel}</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {availableMonths.length === 0 && <option value="">{t.records.noData}</option>}
              {availableMonths.map((key) => (
                <option key={key} value={key}>
                  {t.records.monthOption(
                    monthLabel(key, t.records.monthFormat),
                    records.filter((r) => recordMonthKey(r) === key).length
                  )}
                </option>
              ))}
            </select>
          </label>

          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {t.records.showingCount(filteredRecords.length)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={filteredRecords.length === 0 || downloading}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:ml-auto sm:w-auto sm:py-2"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? t.records.creating : t.records.downloadButton}
        </button>
      </div>

      {actionError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{actionError}</p>
      )}

      <p className="text-xs text-slate-400">
        {t.records.helpText}
      </p>

      {/* 一覧 */}
      <div className="flex flex-col gap-2">
        {filteredRecords.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
            {t.records.emptyForMonth}
          </p>
        ) : (
          filteredRecords.map((record) => (
            <div
              key={`${record.source}-${record.recordId}`}
              className="flex w-full items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => setDetailRecord(record)}
                className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 text-left active:scale-[0.99]"
              >
                {record.passportImageUrl ? (
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={record.passportImageUrl}
                      alt={t.records.passportPhotoAlt(record.fullName)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300">
                    <ImageOff className="h-5 w-5" />
                    <span className="text-[10px]">{t.records.noPhoto}</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      {record.sourceLabel}
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-800">{record.fullName}</p>
                    <p className="text-xs text-slate-400">{record.passportNumber}</p>
                    {record.guests.length > 1 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                        <Users className="h-3 w-3" />
                        +{record.guests.length - 1}
                      </span>
                    )}
                  </div>
                  {(record.roomNumber || record.destinationName || record.checkinPageTitle) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {record.roomNumber ? `${t.records.roomLabel}: ${record.roomNumber}` : ""}
                      {record.roomNumber && record.destinationName ? "・" : ""}
                      {record.destinationName ? `${t.records.destinationLabel}: ${record.destinationName}` : ""}
                      {!record.roomNumber && !record.destinationName && record.checkinPageTitle
                        ? `${t.records.checkinPageLabel}: ${record.checkinPageTitle}`
                        : ""}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs font-medium text-brand-600">
                    {record.source === "transfer" ? t.records.transferDateLabel : t.records.checkinDateLabel}:{" "}
                    {formatDateLabel(record.recordDate, t.records.undecided)}
                    {record.departureTime ? `・${t.records.departureTimeLabel}: ${record.departureTime}` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {t.records.bookingDateTimeLabel}: {formatDateTimeLabel(record.createdAt)}
                    {record.phoneNumber ? `・${t.records.phoneLabel}: ${record.phoneNumber}` : ""}
                  </p>
                </div>
              </button>

              <a
                href={buildTravelCardPreviewHref(record)}
                target="_blank"
                rel="noreferrer"
                title={t.records.travelCardPreviewButton}
                className="my-3 mr-3 flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-900 hover:bg-slate-950 hover:text-white sm:w-auto sm:px-3"
              >
                <IdCard className="h-4 w-4" />
                <span className="hidden text-xs font-black sm:inline">{t.records.travelCardPreviewButton}</span>
                <ExternalLink className="hidden h-3.5 w-3.5 sm:block" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
