"use client";

// =========================================================
// Step 4: 部屋管理機能
//
// これまでフロントエンドにハードコードされていた「部屋番号(101〜109)」を
// 管理画面から「部屋の名前」として登録・編集・削除・並び替え・写真登録できるようにする。
// 写真はSupabase Storageの room-photos バケットへアップロードする。
// =========================================================

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/lib/types";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

const BUCKET = "room-photos";

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

export default function RoomManager() {
  const { t } = useAdminTranslation();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [rooms, setRooms] = useState<Room[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function loadRooms() {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, photo_url, display_order, is_active")
      .order("display_order", { ascending: true });

    if (error || !data) {
      setState("error");
      return;
    }
    setRooms(data as Room[]);
    setState("ready");
  }

  useEffect(() => {
    loadRooms();
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    setActionError(null);

    const nextOrder = rooms.length > 0 ? Math.max(...rooms.map((r) => r.display_order)) + 1 : 1;

    const { error } = await supabase.from("rooms").insert({ name: trimmed, display_order: nextOrder, is_active: true });

    setAdding(false);

    if (error) {
      setActionError(t.rooms.addFailed);
      return;
    }

    setNewName("");
    await loadRooms();
  };

  const startEditing = (room: Room) => {
    setEditingId(room.id);
    setEditingName(room.name);
    setActionError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleSaveName = async (room: Room) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setActionError(t.rooms.nameRequired);
      return;
    }

    setBusyId(room.id);
    setActionError(null);

    const { error } = await supabase.from("rooms").update({ name: trimmed }).eq("id", room.id);

    setBusyId(null);

    if (error) {
      setActionError(t.rooms.nameUpdateFailed);
      return;
    }

    cancelEditing();
    await loadRooms();
  };

  const handleToggleActive = async (room: Room) => {
    setBusyId(room.id);
    setActionError(null);

    const { error } = await supabase.from("rooms").update({ is_active: !room.is_active }).eq("id", room.id);

    setBusyId(null);

    if (error) {
      setActionError(t.common.toggleFailed);
      return;
    }

    await loadRooms();
  };

  // 表示順（display_order）を隣の項目と入れ替えることで並び替えを実現する
  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rooms.length) return;

    const current = rooms[index];
    const target = rooms[targetIndex];

    setBusyId(current.id);
    setActionError(null);

    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase.from("rooms").update({ display_order: target.display_order }).eq("id", current.id),
      supabase.from("rooms").update({ display_order: current.display_order }).eq("id", target.id),
    ]);

    setBusyId(null);

    if (error1 || error2) {
      setActionError(t.common.orderChangeFailed);
      return;
    }

    await loadRooms();
  };

  const handlePhotoSelected = async (room: Room, file: File) => {
    setActionError(null);
    setUploadingId(room.id);

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
        .from("rooms")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", room.id);

      if (updateError) {
        setActionError(t.common.photoSaveFailed);
        return;
      }

      // 旧写真が残っている場合は削除する
      if (room.photo_url) {
        const oldPath = storagePathFromPublicUrl(room.photo_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      await loadRooms();
    } catch {
      setActionError(t.common.imageReadFailed);
    } finally {
      setUploadingId(null);
      const input = fileInputRefs.current[room.id];
      if (input) input.value = "";
    }
  };

  const handleRemovePhoto = async (room: Room) => {
    if (!room.photo_url) return;
    if (!window.confirm(t.common.confirmRemovePhoto(t.common.photoLabel))) return;

    setBusyId(room.id);
    setActionError(null);

    const { error } = await supabase.from("rooms").update({ photo_url: null }).eq("id", room.id);

    if (error) {
      setBusyId(null);
      setActionError(t.common.photoRemoveFailed);
      return;
    }

    const path = storagePathFromPublicUrl(room.photo_url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);

    setBusyId(null);
    await loadRooms();
  };

  const handleDelete = async (room: Room) => {
    if (!window.confirm(t.common.confirmDelete(room.name))) return;

    setBusyId(room.id);
    setActionError(null);

    const { error } = await supabase.from("rooms").delete().eq("id", room.id);

    if (error) {
      setBusyId(null);
      setActionError(t.rooms.deleteFailed);
      return;
    }

    if (room.photo_url) {
      const path = storagePathFromPublicUrl(room.photo_url);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
    }

    setBusyId(null);
    await loadRooms();
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-400">{t.common.loading}</p>;
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {t.rooms.loadFailed}
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
          placeholder={t.rooms.namePlaceholder}
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
        {rooms.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-400">
            {t.rooms.emptyList}
          </p>
        ) : (
          rooms.map((room, index) => (
            <div
              key={room.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || busyId !== null}
                  aria-label={t.common.moveUpAria(room.name)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === rooms.length - 1 || busyId !== null}
                  aria-label={t.common.moveDownAria(room.name)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-400 transition disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 写真 */}
              <input
                ref={(el) => {
                  fileInputRefs.current[room.id] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(room, file);
                }}
              />
              {room.photo_url ? (
                <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={room.photo_url} alt={t.common.photoAlt(room.name)} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(room)}
                    aria-label={t.common.removePhotoAria(room.name)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[room.id]?.click()}
                  disabled={uploadingId === room.id}
                  aria-label={t.common.uploadPhotoAria(room.name)}
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">{uploadingId === room.id ? t.common.processingLabel : t.common.photoLabel}</span>
                </button>
              )}

              {/* 名前 / 編集 */}
              <div className="min-w-0 flex-1">
                {editingId === room.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName(room);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveName(room)}
                      disabled={busyId === room.id}
                      aria-label={t.common.saveAria}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white transition disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      aria-label={t.common.cancelAria}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{room.name}</p>
                    <button
                      type="button"
                      onClick={() => startEditing(room)}
                      aria-label={t.common.editNameAria(room.name)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition hover:text-slate-500"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400">{t.common.displayOrder(room.display_order)}</p>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">{room.is_active ? t.common.active : t.common.inactive}</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(room)}
                  disabled={busyId === room.id}
                  role="switch"
                  aria-checked={room.is_active}
                  aria-label={t.common.toggleAria(room.name, !room.is_active)}
                  className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 sm:h-6 sm:w-11 ${
                    room.is_active ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition sm:h-5 sm:w-5 ${
                      room.is_active ? "left-[1.375rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>

              <button
                type="button"
                onClick={() => handleDelete(room)}
                disabled={busyId === room.id}
                aria-label={t.common.deleteAria(room.name)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40 sm:h-8 sm:w-8"
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
