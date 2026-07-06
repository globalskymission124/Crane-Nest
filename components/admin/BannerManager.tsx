"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Banner } from "@/lib/types";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

const BUCKET = "banners";
const TARGET_RATIO = 16 / 9;
const RATIO_TOLERANCE = 0.05; // 約1.78:1からのズレの許容幅

type LoadState = "loading" | "ready" | "error";

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = objectUrl;
  });
}

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "jpg";
}

// 公開URLからStorage上のオブジェクトパスを逆算する（削除時に利用）
function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export default function BannerManager() {
  const { t } = useAdminTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ratioWarning, setRatioWarning] = useState<string | null>(null);

  async function loadBanners() {
    const { data, error } = await supabase
      .from("banners")
      .select("id, image_url, alt_text, display_order, is_active")
      .order("display_order", { ascending: true });

    if (error || !data) {
      setState("error");
      return;
    }
    setBanners(data as Banner[]);
    setState("ready");
  }

  useEffect(() => {
    loadBanners();
  }, []);

  const handleFileSelected = async (file: File) => {
    setActionError(null);
    setRatioWarning(null);
    setUploading(true);

    try {
      const { width, height } = await readImageDimensions(file);
      const ratio = width / height;
      if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
        setRatioWarning(t.banners.ratioWarning(width, height, ratio.toFixed(2)));
      }

      const path = `${crypto.randomUUID()}.${fileExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setActionError(t.banners.uploadFailed);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.display_order)) + 1 : 1;

      const { error: insertError } = await supabase.from("banners").insert({
        image_url: publicUrlData.publicUrl,
        alt_text: "",
        display_order: nextOrder,
        is_active: true,
      });

      if (insertError) {
        setActionError(t.banners.insertFailed);
        return;
      }

      await loadBanners();
    } catch {
      setActionError(t.banners.imageReadFailed);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  };

  const handleToggleActive = async (banner: Banner) => {
    setBusyId(banner.id);
    setActionError(null);

    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    setBusyId(null);
    if (error) {
      setActionError(t.common.toggleFailed);
      return;
    }
    await loadBanners();
  };

  // 表示順（display_order）を隣の項目と入れ替えることで並び替えを実現する
  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const current = banners[index];
    const target = banners[targetIndex];

    setBusyId(current.id);
    setActionError(null);

    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase.from("banners").update({ display_order: target.display_order }).eq("id", current.id),
      supabase.from("banners").update({ display_order: current.display_order }).eq("id", target.id),
    ]);

    setBusyId(null);
    if (error1 || error2) {
      setActionError(t.common.orderChangeFailed);
      return;
    }
    await loadBanners();
  };

  const handleDelete = async (banner: Banner) => {
    if (!window.confirm(t.banners.confirmDelete)) return;

    setBusyId(banner.id);
    setActionError(null);

    const path = storagePathFromPublicUrl(banner.image_url);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const { error } = await supabase.from("banners").delete().eq("id", banner.id);

    setBusyId(null);
    if (error) {
      setActionError(t.banners.deleteFailed);
      return;
    }
    await loadBanners();
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-400">{t.common.loading}</p>;
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {t.banners.loadFailed}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* アップロードエリア */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500 transition active:scale-[0.99] disabled:opacity-60"
        >
          <ImagePlus className="h-5 w-5" />
          {uploading ? t.banners.uploading : t.banners.uploadButton}
        </button>
        <p className="text-xs text-slate-400">
          {t.banners.sizeHint}
        </p>
        {ratioWarning && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{ratioWarning}</p>
        )}
      </div>

      {actionError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{actionError}</p>
      )}

      {/* 一覧 */}
      <div className="flex flex-col gap-3">
        {banners.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
            {t.banners.emptyList}
          </p>
        ) : (
          banners.map((banner, index) => (
            <div
              key={banner.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
            >
              {/* 上段（モバイル）/ 左列（デスクトップ）: 並び替えボタン + 画像 + メタ情報 */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || busyId !== null}
                    aria-label={t.banners.moveUpAria}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30 sm:h-6 sm:w-6"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === banners.length - 1 || busyId !== null}
                    aria-label={t.banners.moveDownAria}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30 sm:h-6 sm:w-6"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image_url}
                  alt={banner.alt_text || t.banners.previewAlt}
                  className="h-16 w-28 shrink-0 rounded-lg border border-slate-200 object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">{t.common.displayOrder(banner.display_order)}</p>
                  <p className="truncate text-xs text-slate-400">{banner.image_url}</p>
                </div>
              </div>

              {/* 下段（モバイル）/ 右列（デスクトップ）: トグル + 削除 */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2 sm:ml-auto sm:border-0 sm:pt-0">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{banner.is_active ? t.banners.shown : t.banners.hidden}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    disabled={busyId === banner.id}
                    role="switch"
                    aria-checked={banner.is_active}
                    aria-label={t.banners.toggleAria(!banner.is_active)}
                    className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 sm:h-6 sm:w-11 ${
                      banner.is_active ? "bg-brand-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition sm:h-5 sm:w-5 ${
                        banner.is_active ? "left-[1.375rem]" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>

                <button
                  type="button"
                  onClick={() => handleDelete(banner)}
                  disabled={busyId === banner.id}
                  aria-label={t.banners.deleteAria}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40 sm:h-8 sm:w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
