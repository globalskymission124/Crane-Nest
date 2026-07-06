"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { Destination } from "@/lib/types";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

const BUCKET = "destination-photos";

type LoadState = "loading" | "ready" | "error";

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "jpg";
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

export default function DestinationManager() {
  const { t } = useAdminTranslation();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // 料金インライン編集
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");

  async function loadDestinations() {
    const { data, error } = await supabase
      .from("destinations")
      .select("id, name, image_url, display_order, is_active, price_jpy")
      .order("display_order", { ascending: true });

    if (error || !data) {
      setState("error");
      return;
    }
    setDestinations(data as Destination[]);
    setState("ready");
  }

  useEffect(() => {
    loadDestinations();
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setActionError(null);

    const nextOrder =
      destinations.length > 0 ? Math.max(...destinations.map((d) => d.display_order)) + 1 : 1;

    const { error } = await supabase
      .from("destinations")
      .insert({ name: trimmed, display_order: nextOrder, is_active: true });

    setAdding(false);

    if (error) {
      setActionError(t.destinations.addFailed);
      return;
    }

    setNewName("");
    await loadDestinations();
  };

  const handleToggleActive = async (destination: Destination) => {
    setBusyId(destination.id);
    setActionError(null);

    const { error } = await supabase
      .from("destinations")
      .update({ is_active: !destination.is_active })
      .eq("id", destination.id);

    setBusyId(null);

    if (error) {
      setActionError(t.common.toggleFailed);
      return;
    }

    await loadDestinations();
  };

  // 表示順（display_order）を隣の項目と入れ替えることで並び替えを実現する
  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= destinations.length) return;

    const current = destinations[index];
    const target = destinations[targetIndex];

    setBusyId(current.id);
    setActionError(null);

    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase.from("destinations").update({ display_order: target.display_order }).eq("id", current.id),
      supabase.from("destinations").update({ display_order: current.display_order }).eq("id", target.id),
    ]);

    setBusyId(null);

    if (error1 || error2) {
      setActionError(t.common.orderChangeFailed);
      return;
    }

    await loadDestinations();
  };

  const handlePhotoSelected = async (destination: Destination, file: File) => {
    setActionError(null);
    setUploadingId(destination.id);

    try {
      const path = `${crypto.randomUUID()}.${fileExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setActionError(t.common.photoUploadFailed);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("destinations")
        .update({ image_url: publicUrlData.publicUrl })
        .eq("id", destination.id);

      if (updateError) {
        setActionError(t.common.photoSaveFailed);
        return;
      }

      if (destination.image_url) {
        const oldPath = storagePathFromPublicUrl(destination.image_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      await loadDestinations();
    } catch {
      setActionError(t.common.imageReadFailed);
    } finally {
      setUploadingId(null);
      const input = fileInputRefs.current[destination.id];
      if (input) input.value = "";
    }
  };

  const handleRemovePhoto = async (destination: Destination) => {
    if (!destination.image_url) return;
    if (!window.confirm(t.common.confirmRemovePhoto(t.common.photoLabel))) return;

    setBusyId(destination.id);
    setActionError(null);

    const { error } = await supabase.from("destinations").update({ image_url: null }).eq("id", destination.id);

    if (error) {
      setBusyId(null);
      setActionError(t.common.photoRemoveFailed);
      return;
    }

    const path = storagePathFromPublicUrl(destination.image_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);

    setBusyId(null);
    await loadDestinations();
  };

  const handleDelete = async (destination: Destination) => {
    if (!window.confirm(t.common.confirmDelete(destination.name))) return;

    setBusyId(destination.id);
    setActionError(null);

    const { error } = await supabase.from("destinations").delete().eq("id", destination.id);

    if (error) {
      setBusyId(null);
      setActionError(t.destinations.deleteFailed);
      return;
    }

    if (destination.image_url) {
      const path = storagePathFromPublicUrl(destination.image_url);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }

    setBusyId(null);
    await loadDestinations();
  };

  const handleSavePrice = async (destination: Destination) => {
    const trimmed = editingPrice.trim();
    const priceValue = trimmed === "" ? null : parseInt(trimmed, 10);
    if (trimmed !== "" && (Number.isNaN(priceValue) || (priceValue !== null && priceValue < 0))) {
      setActionError(t.destinations.priceInvalid ?? "0以上の整数で入力してください");
      return;
    }

    setBusyId(destination.id);
    setActionError(null);

    const { error } = await supabase
      .from("destinations")
      .update({ price_jpy: priceValue })
      .eq("id", destination.id);

    setBusyId(null);

    if (error) {
      setActionError(t.destinations.priceSaveFailed ?? "料金の保存に失敗しました");
      return;
    }

    setEditingPriceId(null);
    await loadDestinations();
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-400">{t.common.loading}</p>;
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {t.destinations.loadFailed}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 追加フォーム */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder={t.destinations.namePlaceholder}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || newName.trim() === ""}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Plus className="h-4 w-4" />
          {t.common.add}
        </button>
      </div>

      {actionError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{actionError}</p>
      )}

      {/* 一覧 */}
      <div className="flex flex-col gap-2">
        {destinations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
            {t.destinations.emptyList}
          </p>
        ) : (
          destinations.map((destination, index) => (
            <div
              key={destination.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || busyId !== null}
                  aria-label={t.common.moveUpAria(destination.name)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === destinations.length - 1 || busyId !== null}
                  aria-label={t.common.moveDownAria(destination.name)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 写真 */}
              <input
                ref={(el) => {
                  fileInputRefs.current[destination.id] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(destination, file);
                }}
              />
              {destination.image_url ? (
                <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={destination.image_url}
                    alt={t.common.photoAlt(destination.name)}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(destination)}
                    aria-label={t.common.removePhotoAria(destination.name)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[destination.id]?.click()}
                  disabled={uploadingId === destination.id}
                  aria-label={t.common.uploadPhotoAria(destination.name)}
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">{uploadingId === destination.id ? t.common.processingLabel : t.common.photoLabel}</span>
                </button>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{destination.name}</p>
                <p className="text-xs text-slate-400">{t.common.displayOrder(destination.display_order)}</p>

                {/* 料金インライン編集 */}
                {editingPriceId === destination.id ? (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">¥</span>
                    <input
                      type="number"
                      min={0}
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePrice(destination);
                        if (e.key === "Escape") setEditingPriceId(null);
                      }}
                      placeholder="例: 3000"
                      autoFocus
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePrice(destination)}
                      disabled={busyId === destination.id}
                      className="rounded-lg bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPriceId(null)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-400"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPriceId(destination.id);
                      setEditingPrice(destination.price_jpy != null ? String(destination.price_jpy) : "");
                    }}
                    className="mt-1 text-xs text-brand-600 hover:underline"
                  >
                    {destination.price_jpy != null
                      ? `¥${destination.price_jpy.toLocaleString()}`
                      : (t.destinations.setPriceLabel ?? "+ 料金を設定")}
                  </button>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">{destination.is_active ? t.common.active : t.common.inactive}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(destination)}
                  disabled={busyId === destination.id}
                  role="switch"
                  aria-checked={destination.is_active}
                  aria-label={t.common.toggleAria(destination.name, !destination.is_active)}
                  className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 sm:h-6 sm:w-11 ${
                    destination.is_active ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition sm:h-5 sm:w-5 ${
                      destination.is_active ? "left-[1.375rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>

              <button
                type="button"
                onClick={() => handleDelete(destination)}
                disabled={busyId === destination.id}
                aria-label={t.common.deleteAria(destination.name)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40 sm:h-8 sm:w-8"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
