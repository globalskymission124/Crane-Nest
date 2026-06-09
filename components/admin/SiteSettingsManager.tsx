"use client";

// =========================================================
// Step 4: 管理画面からサイトの見た目（ブランドカラー・ロゴ・アイキャッチ画像）を
// 変更できるようにするための設定UI。
//
// site_settings テーブルは1行のみのシングルトンとして扱う。
// 画像はSupabase Storageの site-assets バケットへアップロードする。
// =========================================================

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SiteSettings } from "@/lib/types";
import { DEFAULT_BRAND_COLOR, generateBrandScale } from "@/lib/theme";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

const BUCKET = "site-assets";

type LoadState = "loading" | "ready" | "error";
type ImageKind = "logo" | "hero";

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

function isValidHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export default function SiteSettingsManager() {
  const { t } = useAdminTranslation();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [colorInput, setColorInput] = useState(DEFAULT_BRAND_COLOR);
  const [savingColor, setSavingColor] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<ImageKind | null>(null);
  const [removingKind, setRemovingKind] = useState<ImageKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function loadSettings() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, primary_color, logo_url, hero_image_url")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setState("error");
      return;
    }
    setSettings(data as SiteSettings);
    setColorInput((data as SiteSettings).primary_color);
    setState("ready");
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const flashSaved = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  const handleSaveColor = async () => {
    if (!settings) return;
    if (!isValidHexColor(colorInput)) {
      setActionError(t.settings.invalidColor);
      return;
    }

    setActionError(null);
    setSavingColor(true);

    const normalized = colorInput.trim().toLowerCase();
    const { error } = await supabase
      .from("site_settings")
      .update({ primary_color: normalized })
      .eq("id", settings.id);

    setSavingColor(false);
    if (error) {
      setActionError(t.settings.saveColorFailed);
      return;
    }
    setSettings({ ...settings, primary_color: normalized });
    flashSaved(t.settings.colorSaved);
  };

  const handleImageSelected = async (kind: ImageKind, file: File) => {
    if (!settings) return;

    setActionError(null);
    setUploadingKind(kind);

    try {
      const path = `${kind}-${crypto.randomUUID()}.${fileExtension(file)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        setActionError(t.settings.uploadFailed);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const column = kind === "logo" ? "logo_url" : "hero_image_url";
      const previousUrl = kind === "logo" ? settings.logo_url : settings.hero_image_url;

      const { error: updateError } = await supabase
        .from("site_settings")
        .update({ [column]: publicUrlData.publicUrl })
        .eq("id", settings.id);

      if (updateError) {
        setActionError(t.settings.saveSettingsFailed);
        return;
      }

      // 旧画像が残っている場合は削除する（差し替え時の不要ファイル防止）
      if (previousUrl) {
        const oldPath = storagePathFromPublicUrl(previousUrl);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      setSettings({ ...settings, [column]: publicUrlData.publicUrl });
      flashSaved(kind === "logo" ? t.settings.logoUpdated : t.settings.heroUpdated);
    } catch {
      setActionError(t.settings.imageReadFailed);
    } finally {
      setUploadingKind(null);
      const ref = kind === "logo" ? logoInputRef : heroInputRef;
      if (ref.current) ref.current.value = "";
    }
  };

  const handleRemoveImage = async (kind: ImageKind) => {
    if (!settings) return;
    const currentUrl = kind === "logo" ? settings.logo_url : settings.hero_image_url;
    if (!currentUrl) return;
    if (!window.confirm(t.settings.confirmRemoveImage)) return;

    setActionError(null);
    setRemovingKind(kind);

    const column = kind === "logo" ? "logo_url" : "hero_image_url";
    const { error } = await supabase
      .from("site_settings")
      .update({ [column]: null })
      .eq("id", settings.id);

    if (error) {
      setRemovingKind(null);
      setActionError(t.settings.removeFailed);
      return;
    }

    const path = storagePathFromPublicUrl(currentUrl);
    if (path) await supabase.storage.from(BUCKET).remove([path]);

    setSettings({ ...settings, [column]: null });
    setRemovingKind(null);
    flashSaved(kind === "logo" ? t.settings.logoRemoved : t.settings.heroRemoved);
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-400">{t.common.loading}</p>;
  }

  if (state === "error" || !settings) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        {t.settings.loadFailed}
      </div>
    );
  }

  const previewScale = generateBrandScale(isValidHexColor(colorInput) ? colorInput : settings.primary_color);

  return (
    <div className="flex flex-col gap-6">
      {savedMessage && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{savedMessage}</p>
      )}
      {actionError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{actionError}</p>
      )}

      {/* ブランドカラー設定 */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
        <h3 className="text-sm font-bold text-slate-800">{t.settings.brandColorTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">
          {t.settings.brandColorDescription}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            type="color"
            value={isValidHexColor(colorInput) ? colorInput : DEFAULT_BRAND_COLOR}
            onChange={(e) => setColorInput(e.target.value)}
            aria-label={t.settings.colorInputAria}
            className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
          />
          <input
            type="text"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            placeholder="#2563eb"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={handleSaveColor}
            disabled={savingColor}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {savingColor ? t.settings.savingColor : t.settings.saveColor}
          </button>
        </div>

        {/* 生成されるスケールのプレビュー */}
        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {(Object.keys(previewScale) as unknown as Array<keyof typeof previewScale>).map((key) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div
                  className="h-10 w-10 rounded-lg border border-slate-200 shadow-sm"
                  style={{ backgroundColor: previewScale[key] }}
                />
                <span className="text-[10px] text-slate-400">{key}</span>
              </div>
            ))}
            <p className="ml-3 text-xs text-slate-400">{t.settings.scaleHint}</p>
          </div>
        </div>
      </section>

      {/* ロゴ画像 */}
      <ImageSettingSection
        title={t.settings.logoTitle}
        description={t.settings.logoDescription}
        imageUrl={settings.logo_url}
        previewClassName="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 object-contain p-2"
        uploading={uploadingKind === "logo"}
        removing={removingKind === "logo"}
        inputRef={logoInputRef}
        onSelect={(file) => handleImageSelected("logo", file)}
        onRemove={() => handleRemoveImage("logo")}
        uploadLabel={t.settings.logoUploadLabel}
        uploadingLabel={t.settings.uploadingLabel}
        notSetLabel={t.settings.notSet}
        previewAlt={t.settings.previewAlt(t.settings.logoTitle)}
        deleteLabel={t.common.deleteLabel}
      />

      {/* アイキャッチ画像 */}
      <ImageSettingSection
        title={t.settings.heroTitle}
        description={t.settings.heroDescription}
        imageUrl={settings.hero_image_url}
        previewClassName="h-24 w-full max-w-md rounded-xl border border-slate-200 object-cover"
        uploading={uploadingKind === "hero"}
        removing={removingKind === "hero"}
        inputRef={heroInputRef}
        onSelect={(file) => handleImageSelected("hero", file)}
        onRemove={() => handleRemoveImage("hero")}
        uploadLabel={t.settings.heroUploadLabel}
        uploadingLabel={t.settings.uploadingLabel}
        notSetLabel={t.settings.notSet}
        previewAlt={t.settings.previewAlt(t.settings.heroTitle)}
        deleteLabel={t.common.deleteLabel}
      />
    </div>
  );
}

interface ImageSettingSectionProps {
  title: string;
  description: string;
  imageUrl: string | null;
  previewClassName: string;
  uploading: boolean;
  removing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (file: File) => void;
  onRemove: () => void;
  uploadLabel: string;
  uploadingLabel: string;
  notSetLabel: string;
  previewAlt: string;
  deleteLabel: string;
}

function ImageSettingSection({
  title,
  description,
  imageUrl,
  previewClassName,
  uploading,
  removing,
  inputRef,
  onSelect,
  onRemove,
  uploadLabel,
  uploadingLabel,
  notSetLabel,
  previewAlt,
  deleteLabel,
}: ImageSettingSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={previewAlt} className={previewClassName} />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-400">
            {notSetLabel}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 transition active:scale-[0.99] disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? uploadingLabel : uploadLabel}
        </button>

        {imageUrl && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteLabel}
          </button>
        )}
      </div>
    </section>
  );
}
