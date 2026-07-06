"use client";

// =========================================================
// 管理者：公式サイト編集（CMS）
// ヒーロー画像・エリア画像・ギャラリー・言語別見出しを直感的に編集。
// 画像はアップロードした瞬間に保存され、サイトには最大5分で反映。
// =========================================================
import { useEffect, useRef, useState } from "react";
import { Globe, ImagePlus, Save, Trash2, Upload } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { fetchSiteCms, saveSiteCms, uploadSiteImage, type SiteCms } from "@/lib/site/cms";
import { SITE_CONTENT, type SiteLocale } from "@/lib/site/content";
import { audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";

const LOCALES: { code: SiteLocale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tw", label: "繁體中文" },
  { code: "zh", label: "简体中文" },
  { code: "ja", label: "日本語" },
];

function ImageSlot({
  url,
  label,
  aspect = "aspect-[16/9]",
  onUpload,
  onRemove,
}: {
  url: string | null;
  label: string;
  aspect?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <div className={`group relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 ${aspect}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <button onClick={() => ref.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">クリックして画像を選択</span>
          </button>
        )}
        {url && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/50 opacity-0 transition group-hover:opacity-100">
            <button onClick={() => ref.current?.click()} className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-800">
              <Upload className="mr-1 inline h-3.5 w-3.5" />差し替え
            </button>
            <button onClick={onRemove} className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />削除
            </button>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function WebsiteBody() {
  const { session } = useStaysSession();
  const [cms, setCms] = useState<SiteCms | null>(null);
  const [locale, setLocale] = useState<SiteLocale>("en");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSiteCms().then(setCms);
  }, []);

  if (!cms) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  async function persist(patch: Partial<SiteCms>, note: string) {
    setBusy(true);
    setMsg(null);
    try {
      await saveSiteCms(patch);
      setCms((prev) => (prev ? { ...prev, ...patch } : prev));
      await audit(session?.email || "", "admin", "site_cms.update", "", note);
      setMsg("保存しました。サイトへは最大5分で反映されます。");
      setTimeout(() => setMsg(null), 4000);
    } catch (e: any) {
      alert("保存に失敗しました: " + (e?.message || e) + "\n（0023マイグレーション未適用の可能性があります）");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File): Promise<string | null> {
    try {
      setBusy(true);
      return await uploadSiteImage(file);
    } catch (e: any) {
      alert("アップロードに失敗しました: " + (e?.message || e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const ov = cms.text_overrides[locale] || {};
  const defaults = SITE_CONTENT[locale];

  return (
    <div className="pb-20 sm:pb-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Globe className="h-6 w-6 text-brand-600" /> 公式サイト編集
        </h1>
        <a href="/site" target="_blank" className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          サイトを開く ↗
        </a>
      </div>
      <p className="mb-5 text-sm text-slate-500">画像はアップロードした瞬間に保存されます。テキストは「保存」で確定。反映まで最大5分です。</p>
      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</p>}

      {/* ヒーロー画像 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <ImageSlot
          url={cms.hero_image_url}
          label="メインビジュアル（トップの背景・横長推奨 1920×1080）"
          onUpload={async (f) => {
            const url = await upload(f);
            if (url) persist({ hero_image_url: url }, "hero image");
          }}
          onRemove={() => persist({ hero_image_url: null }, "hero image removed")}
        />
      </div>

      {/* エリア画像 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-slate-700">エリアカード画像（左から: 関空エリア / 難波 / 京都）</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <ImageSlot
              key={i}
              url={cms.area_images[i] || null}
              label={defaults.areas[i]?.name || `エリア${i + 1}`}
              onUpload={async (f) => {
                const url = await upload(f);
                if (!url) return;
                const imgs = [...cms.area_images];
                imgs[i] = url;
                persist({ area_images: imgs }, `area image ${i}`);
              }}
              onRemove={() => {
                const imgs = [...cms.area_images];
                imgs[i] = "";
                persist({ area_images: imgs }, `area image ${i} removed`);
              }}
            />
          ))}
        </div>
      </div>

      {/* ギャラリー */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">フォトギャラリー（最大8枚・1枚目が大きく表示）</p>
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={busy || cms.gallery.length >= 8}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <ImagePlus className="h-4 w-4" /> 画像を追加
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, 8 - cms.gallery.length);
              const urls: string[] = [];
              for (const f of files) {
                const u = await upload(f);
                if (u) urls.push(u);
              }
              if (urls.length) persist({ gallery: [...cms.gallery, ...urls] }, `gallery +${urls.length}`);
              e.target.value = "";
            }}
          />
        </div>
        {cms.gallery.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">まだ画像がありません。「画像を追加」から複数選択できます。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cms.gallery.map((url, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => persist({ gallery: cms.gallery.filter((_, x) => x !== i) }, `gallery -${i}`)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="削除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 言語別テキスト */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-slate-700">トップの見出し文（言語別・空欄なら初期文を表示）</p>
        <div className="mb-4 flex gap-1.5">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${locale === l.code ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-500"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <label className="block text-xs font-semibold text-slate-500">大見出し
          <input
            value={ov.heroHeading || ""}
            placeholder={defaults.hero.heading}
            onChange={(e) =>
              setCms({ ...cms, text_overrides: { ...cms.text_overrides, [locale]: { ...ov, heroHeading: e.target.value } } })
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-slate-500">サブ見出し
          <textarea
            value={ov.heroSub || ""}
            placeholder={defaults.hero.sub}
            rows={2}
            onChange={(e) =>
              setCms({ ...cms, text_overrides: { ...cms.text_overrides, [locale]: { ...ov, heroSub: e.target.value } } })
            }
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          onClick={() => persist({ text_overrides: cms.text_overrides }, "text overrides")}
          disabled={busy}
          className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> テキストを保存
        </button>
      </div>
    </div>
  );
}

export default function AdminWebsitePage() {
  return (
    <AuthGuard roles={["admin"]}>
      <WebsiteBody />
    </AuthGuard>
  );
}
