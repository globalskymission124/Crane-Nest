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
import { Download, ImageOff, Loader2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";
import type { AdminDictionary } from "@/lib/i18n/admin/types";

interface GuestRecord {
  transferId: string;
  createdAt: string; // 予約日時（ISO）
  transferDate: string | null; // 送迎日（YYYY-MM-DD）
  stayDate: string | null; // 送迎予定日（ISO、日付部分のみ使用）
  fullName: string;
  passportNumber: string;
  phoneNumber: string | null;
  passportImageUrl: string | null;
  roomNumber: string;
  destinationName: string;
}

interface RawRow {
  id: string;
  created_at: string;
  room_number: string;
  transfer_date: string | null;
  flight_time: string | null;
  suggested_departure_time: string | null;
  guests: {
    full_name: string;
    passport_number: string;
    phone_number: string | null;
    passport_image_url: string | null;
  } | {
    full_name: string;
    passport_number: string;
    phone_number: string | null;
    passport_image_url: string | null;
  }[] | null;
  destinations: { name: string } | { name: string }[] | null;
}

type LoadState = "loading" | "ready" | "error";

function pickRecord<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toRecord(row: RawRow, t: AdminDictionary): GuestRecord {
  const guest = pickRecord(row.guests);
  const destination = pickRecord(row.destinations);

  return {
    transferId: row.id,
    createdAt: row.created_at,
    transferDate: row.transfer_date ?? null,
    stayDate: row.flight_time ?? row.suggested_departure_time ?? null,
    fullName: guest?.full_name ?? t.records.unregisteredName,
    passportNumber: guest?.passport_number ?? "—",
    phoneNumber: guest?.phone_number ?? null,
    passportImageUrl: guest?.passport_image_url ?? null,
    roomNumber: row.room_number,
    destinationName: destination?.name ?? t.records.unsetDestination,
  };
}

// "2026-06" 形式のキーを返す（月単位の絞り込み・グルーピング用）
function monthKey(isoString: string): string {
  return isoString.slice(0, 7);
}

function formatDateLabel(isoString: string | null, undecided: string): string {
  if (!isoString) return undecided;
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

export default function GuestRecordsManager() {
  const { t } = useAdminTranslation();
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("transfer_requests")
        .select(
          `id, created_at, room_number, transfer_date, flight_time, suggested_departure_time,
           guests ( full_name, passport_number, phone_number, passport_image_url ),
           destinations ( name )`
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error || !data) {
        setState("error");
        return;
      }

      const mapped = (data as unknown as RawRow[]).map((row) => toRecord(row, t));
      setRecords(mapped);
      setSelectedMonth((current) => current || (mapped[0] ? monthKey(mapped[0].createdAt) : ""));
      setState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableMonths = useMemo(() => {
    const set = new Set(records.map((record) => monthKey(record.createdAt)));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    return records.filter((record) => monthKey(record.createdAt) === selectedMonth);
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

      const usedNames = new Set<string>();
      const summaryRows: string[][] = [];
      const photoEntries: { fileName: string; url: string }[] = [];

      for (const record of filteredRecords) {
        const dateLabel = formatDateLabel(record.stayDate, t.records.undecided);
        let photoFileName = "";

        if (record.passportImageUrl) {
          const baseName = `${dateLabel}_${sanitizeForFilename(record.fullName)}_${sanitizeForFilename(
            record.passportNumber
          )}`;
          let candidate = `${baseName}.${fileExtensionFromUrl(record.passportImageUrl)}`;
          let suffix = 2;
          while (usedNames.has(candidate)) {
            candidate = `${baseName}-${suffix}.${fileExtensionFromUrl(record.passportImageUrl)}`;
            suffix += 1;
          }
          usedNames.add(candidate);
          photoFileName = candidate;
          photoEntries.push({ fileName: candidate, url: record.passportImageUrl });
        }

        summaryRows.push([
          formatDateTimeLabel(record.createdAt),
          record.fullName,
          record.passportNumber,
          record.phoneNumber ?? "—",
          record.roomNumber,
          record.destinationName,
          photoFileName || t.records.noPhotoCell,
        ]);
      }

      // CSV（Excel等で開きやすいようUTF-8 BOM付き）
      const csvBody = [summaryHeader, ...summaryRows]
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      zip.file(t.records.csvFileName, "﻿" + csvBody);

      // 一目でわかるHTML一覧表（パスポート写真へのリンク付き）
      const htmlRows = summaryRows
        .map(
          (row, index) => `
            <tr>
              <td>${row[0]}</td>
              <td><strong>${row[1]}</strong></td>
              <td>${row[2]}</td>
              <td>${row[3]}</td>
              <td>${row[4]}</td>
              <td>${row[5]}</td>
              <td>${
                photoEntries[index] && row[6] !== t.records.noPhotoCell
                  ? `<a href="${t.records.photoFolderName}/${encodeURIComponent(row[6])}">${row[6]}</a>`
                  : t.records.noPhotoCell
              }</td>
            </tr>`
        )
        .join("");

      const htmlDoc = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${t.records.htmlTitle(monthName)}</title>
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
  <h1>${t.records.htmlHeading(monthName)}</h1>
  <p class="note">${t.records.htmlNote}</p>
  <table>
    <thead>
      <tr>${summaryHeader.map((h) => `<th>${h}</th>`).join("")}</tr>
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
                    records.filter((r) => monthKey(r.createdAt) === key).length
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
              key={record.transferId}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
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
                  <p className="truncate text-sm font-semibold text-slate-800">{record.fullName}</p>
                  <p className="text-xs text-slate-400">{record.passportNumber}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.records.roomLabel}: {record.roomNumber}・{t.records.destinationLabel}: {record.destinationName}
                </p>
                {record.transferDate && (
                  <p className="mt-0.5 text-xs font-medium text-brand-600">
                    {t.records.transferDateLabel}: {record.transferDate}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {t.records.bookingDateTimeLabel}: {formatDateTimeLabel(record.createdAt)}
                  {record.phoneNumber ? `・${t.records.phoneLabel}: ${record.phoneNumber}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
