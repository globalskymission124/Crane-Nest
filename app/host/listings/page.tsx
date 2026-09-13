"use client";

// =========================================================
// オーナー：物件管理（一覧 / 公開切替 / 削除 / ブースト）
//  ＋ 新規・編集は Airbnb 風のステップ式ウィザード（ListingWizard）
//  多言語対応（日/英/繁/簡）: useHostT（UI文言）+ useStaysT（共通語彙）
// =========================================================
import { useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Rocket, ImagePlus, X, Star, Loader2,
  ChevronLeft, ChevronRight, Minus, Check, GripVertical,
  Home, Building, Building2, Hotel, Palmtree, TreePine, Landmark, Tent, Warehouse, BedDouble,
  DoorOpen, Users, PawPrint, Cigarette, PartyPopper, Baby, Sparkles,
} from "lucide-react";
import { fetchAllListings, fetchHost } from "@/lib/stays/queries";
import { supabase } from "@/lib/supabase";
import { uploadListingPhoto } from "@/lib/stays/image";
import { deleteListing, upsertListing } from "@/lib/stays/host";
import { audit, fetchPlatformSettings, isFeatured, setFeatured } from "@/lib/stays/v2";
import { addDays, todayStr } from "@/lib/stays/availability";
import { useStaysSession } from "@/lib/stays/auth";
import { useStaysT } from "@/lib/stays/i18n";
import { useHostT } from "@/lib/stays/hostI18n";
import {
  AMENITY_CATEGORIES, ALL_PROPERTY_TYPES, ALL_ROOM_TYPES, ALL_HIGHLIGHTS,
  CANCELLATION_POLICY_LABELS, formatJPY,
} from "@/lib/stays/types";
import type { CancellationPolicy, Highlight, Host, Listing, PropertyType, RoomType } from "@/lib/stays/types";

const empty: Partial<Listing> = {
  title: "", description: "", address: "", city: "", country: "Japan",
  price_per_night: 10000, cleaning_fee: 0, max_guests: 2, bedrooms: 1, beds: 1, baths: 1,
  amenities: [], photos: [], highlights: [], lat: null, lng: null,
  is_published: true, instant_book: false, cancellation_policy: "moderate",
  property_type: "house", room_type: "entire", min_nights: 1,
  weekly_discount_pct: 0, monthly_discount_pct: 0,
  allow_pets: false, allow_smoking: false, allow_events: false, allow_children: true,
  check_in_time: "15:00", check_out_time: "10:00", quiet_hours: "", checkin_instructions: "",
};

// 物件タイプごとのアイコン
const PROPERTY_TYPE_ICONS: Record<PropertyType, React.ComponentType<{ className?: string }>> = {
  house: Home, apartment: Building2, guesthouse: Building, hotel: Hotel, villa: Palmtree, cabin: TreePine,
  ryokan: Landmark, minshuku: Tent, loft: Warehouse, condo: Building2, townhouse: Home, bnb: BedDouble,
};
const ROOM_TYPE_ICONS: Record<RoomType, React.ComponentType<{ className?: string }>> = {
  entire: Home, private: DoorOpen, shared: Users,
};

// ---- ウィザードのステップ定義（3フェーズ）----
type StepId =
  | "property_type" | "room_type" | "location" | "basics"
  | "amenities" | "photos" | "title" | "highlights" | "description"
  | "price" | "discounts" | "rules" | "booking" | "checkin" | "review";

const PHASES: StepId[][] = [
  ["property_type", "room_type", "location", "basics"],
  ["amenities", "photos", "title", "highlights", "description"],
  ["price", "discounts", "rules", "booking", "checkin", "review"],
];
const STEP_SEQUENCE: StepId[] = PHASES.flat();

const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";
const DRAFT_KEY = "crane_listing_draft"; // 新規物件の下書き自動保存キー

// 数量ステッパー（定員・寝室・ベッド・バス）
function Stepper({
  label, value, min = 0, step = 1, onChange,
}: { label: string; value: number; min?: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(+(value + step).toFixed(1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function HostListingsPage() {
  const { session } = useStaysSession();
  const { t } = useHostT();
  const [listings, setListings] = useState<Listing[]>([]);
  const [host, setHost] = useState<Host | null>(null);
  const [editing, setEditing] = useState<Partial<Listing> | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const dragPhotoIndex = useRef<number | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const set = (patch: Partial<Listing>) => setEditing((e) => (e ? { ...e, ...patch } : e));

  // ---- 下書きの自動保存（新規物件のみ）----
  useEffect(() => {
    try { setHasDraft(!!localStorage.getItem(DRAFT_KEY)); } catch {}
  }, []);
  useEffect(() => {
    if (editing && !editing.id && (editing.title || (editing.photos && editing.photos.length) || editing.description)) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(editing)); } catch {}
    }
  }, [editing]);
  function resumeDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { setEditing(JSON.parse(raw)); setStep(0); }
    } catch {}
    setHasDraft(false);
  }
  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setHasDraft(false);
  }

  function setPhotos(next: string[]) {
    setEditing((e) => (e ? { ...e, photos: next } : e));
  }
  async function addPhotoFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        try {
          urls.push(await uploadListingPhoto(file));
        } catch (e: any) {
          alert(`${file.name}: ${e?.message || e}`);
        }
      }
      if (urls.length) setPhotos([...(editing?.photos || []), ...urls]);
    } finally {
      setUploadingPhotos(false);
    }
  }
  function removePhoto(index: number) {
    setPhotos((editing?.photos || []).filter((_, i) => i !== index));
  }
  function makeCover(index: number) {
    const photos = [...(editing?.photos || [])];
    const [pic] = photos.splice(index, 1);
    setPhotos([pic, ...photos]);
  }
  function movePhoto(from: number, to: number) {
    const photos = [...(editing?.photos || [])];
    if (from < 0 || to < 0 || from >= photos.length || to >= photos.length || from === to) return;
    const [pic] = photos.splice(from, 1);
    photos.splice(to, 0, pic);
    setPhotos(photos);
  }
  function addPhotoUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setPhotos([...(editing?.photos || []), url]);
    setUrlInput("");
  }

  async function load() {
    const ls = await fetchAllListings();
    const mine =
      session?.role === "host" && session.host_id
        ? ls.filter((l) => l.host_id === session.host_id)
        : ls;
    setListings(mine);
    if (session?.host_id) setHost(await fetchHost(session.host_id));
    else if (ls[0]) setHost(await fetchHost(ls[0].host_id));
    else {
      const { data } = await supabase.from("stays_hosts").select("*").limit(1).maybeSingle();
      setHost((data as Host) || null);
    }
  }
  useEffect(() => {
    load();
  }, [session?.host_id, session?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  function startNew() {
    setEditing({ ...empty });
    setStep(0);
    setUrlInput("");
  }
  function startEdit(l: Listing) {
    setEditing({ ...empty, ...l });
    setStep(0);
    setUrlInput("");
  }
  function closeWizard() {
    setEditing(null);
    setStep(0);
    try { setHasDraft(!!localStorage.getItem(DRAFT_KEY)); } catch {}
  }

  function toggleAmenity(a: string) {
    setEditing((e) => {
      if (!e) return e;
      const s = new Set(e.amenities || []);
      s.has(a) ? s.delete(a) : s.add(a);
      return { ...e, amenities: Array.from(s) };
    });
  }
  function toggleHighlight(h: Highlight) {
    setEditing((e) => {
      if (!e) return e;
      const s = new Set<Highlight>((e.highlights as Highlight[]) || []);
      s.has(h) ? s.delete(h) : s.add(h);
      return { ...e, highlights: Array.from(s) };
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim()) { setStep(STEP_SEQUENCE.indexOf("title")); return; }
    if (!host) return;
    setSaving(true);
    try {
      const photos = (editing.photos || []).map((s) => s.trim()).filter(Boolean);
      // 新規物件をホストが作成した場合は「審査待ち」。管理者作成や既存編集は現状維持。
      const isNew = !editing.id;
      const moderation_status =
        isNew && session?.role === "host" ? "pending" : editing.moderation_status || "approved";
      await upsertListing({ ...editing, photos, moderation_status, host_id: editing.host_id || session?.host_id || host.id });
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setHasDraft(false);
      setEditing(null);
      setStep(0);
      await load();
    } catch (e: any) {
      alert((e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(l: Listing) {
    await upsertListing({ id: l.id, is_published: !l.is_published });
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_published: !x.is_published } : x)));
  }

  async function remove(l: Listing) {
    if (!confirm(`「${l.title}」?`)) return;
    await deleteListing(l.id);
    setListings((prev) => prev.filter((x) => x.id !== l.id));
  }

  async function boost(l: Listing) {
    const settings = await fetchPlatformSettings();
    if (!settings.enable_featured) return;
    const daysStr = prompt(`${l.title}\n${formatJPY(settings.featured_price_per_day)}/日`, "7");
    const days = Number(daysStr);
    if (!days || days <= 0) return;
    const price = settings.featured_price_per_day * days;
    if (!confirm(`${days}日 = ${formatJPY(price)}?`)) return;
    const base = l.featured_until && l.featured_until >= todayStr() ? l.featured_until : todayStr();
    const until = addDays(base, days);
    await setFeatured(l.id, until);
    await audit(session?.email || "host", session?.role || "host", "listing.boost", l.id, `${days}days ¥${price}`);
    setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, featured_until: until } : x)));
  }

  const stepId = STEP_SEQUENCE[step];
  const isLast = step === STEP_SEQUENCE.length - 1;
  const canProceed = (() => {
    switch (stepId) {
      case "title": return !!editing?.title?.trim();
      case "price": return (editing?.price_per_night ?? 0) > 0;
      default: return true;
    }
  })();
  const goNext = () => setStep((s) => Math.min(STEP_SEQUENCE.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t.manageListings}</h1>
        {!editing && (
          <button onClick={startNew} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> {t.newListing}
          </button>
        )}
      </div>

      {!editing && hasDraft && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-800">{t.draft_found}</span>
          <div className="flex gap-2">
            <button onClick={resumeDraft} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">{t.draft_continue}</button>
            <button onClick={discardDraft} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{t.draft_discard}</button>
          </div>
        </div>
      )}

      {editing && (
        <ListingWizard
          editing={editing} set={set} step={step} stepId={stepId} isLast={isLast}
          canProceed={canProceed} goNext={goNext} goBack={goBack} save={save} saving={saving} close={closeWizard}
          photoInputRef={photoInputRef} uploadingPhotos={uploadingPhotos} dragOver={dragOver} setDragOver={setDragOver}
          addPhotoFiles={addPhotoFiles} removePhoto={removePhoto} makeCover={makeCover} movePhoto={movePhoto}
          dragPhotoIndex={dragPhotoIndex} urlInput={urlInput} setUrlInput={setUrlInput} addPhotoUrl={addPhotoUrl}
          toggleAmenity={toggleAmenity} toggleHighlight={toggleHighlight}
        />
      )}

      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <div key={l.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="aspect-[4/3] bg-slate-100">
                {l.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">{t.no_image}</div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 font-semibold">{l.title}</h3>
                  {l.moderation_status === "pending" && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{t.card_pending}</span>}
                  {!l.is_published && <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{t.card_draft_badge}</span>}
                </div>
                <p className="text-xs text-slate-500">{l.city}・{formatJPY(l.price_per_night)}{t.per_night}</p>
                <div className="mt-3 flex gap-1.5">
                  <button onClick={() => startEdit(l)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <Pencil className="h-3.5 w-3.5" /> {t.card_edit}
                  </button>
                  <button onClick={() => togglePublish(l)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    {l.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {l.is_published ? t.card_unpublish : t.card_publish}
                  </button>
                  <button
                    onClick={() => boost(l)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      isFeatured(l) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    {isFeatured(l) ? t.card_boosting : t.card_boost}
                  </button>
                  <button onClick={() => remove(l)} className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// ステップ式ウィザード本体
// =========================================================
function ListingWizard(props: {
  editing: Partial<Listing>;
  set: (patch: Partial<Listing>) => void;
  step: number;
  stepId: StepId;
  isLast: boolean;
  canProceed: boolean;
  goNext: () => void;
  goBack: () => void;
  save: () => void;
  saving: boolean;
  close: () => void;
  photoInputRef: React.RefObject<HTMLInputElement>;
  uploadingPhotos: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  addPhotoFiles: (files: FileList | File[]) => void;
  removePhoto: (i: number) => void;
  makeCover: (i: number) => void;
  movePhoto: (from: number, to: number) => void;
  dragPhotoIndex: React.MutableRefObject<number | null>;
  urlInput: string;
  setUrlInput: (v: string) => void;
  addPhotoUrl: () => void;
  toggleAmenity: (a: string) => void;
  toggleHighlight: (h: Highlight) => void;
}) {
  const {
    editing, set, step, stepId, isLast, canProceed, goNext, goBack, save, saving, close,
    photoInputRef, uploadingPhotos, dragOver, setDragOver, addPhotoFiles, removePhoto, makeCover, movePhoto,
    dragPhotoIndex, urlInput, setUrlInput, addPhotoUrl, toggleAmenity, toggleHighlight,
  } = props;

  const { t } = useHostT();
  const { t: st } = useStaysT(); // 共通語彙（物件タイプ・部屋タイプ・ハイライト・アメニティ・ポリシー）

  const totalSteps = STEP_SEQUENCE.length;
  const phaseTitles = [t.phase1, t.phase2, t.phase3];
  const phaseIndex = PHASES.findIndex((p) => p.includes(stepId));
  const photos = editing.photos || [];
  const catLabel = (key: string) => (key === "basic" ? t.cat_basic : key === "features" ? t.cat_features : t.cat_safety);

  return (
    <div className="mb-6 rounded-2xl border border-brand-200 bg-white">
      {/* ヘッダー：フェーズ名 + 進捗 */}
      <div className="border-b border-slate-100 px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">{phaseTitles[phaseIndex]}</p>
            <h2 className="text-lg font-bold">{editing.id ? t.editListing : t.registerNewListing}</h2>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label={t.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {PHASES.map((p, i) => {
            const done = i < phaseIndex;
            const active = i === phaseIndex;
            const startIdx = PHASES.slice(0, i).reduce((n, ph) => n + ph.length, 0);
            const localProgress = active ? (step - startIdx + 1) / p.length : done ? 1 : 0;
            return (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${localProgress * 100}%` }} />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{t.stepWord} {step + 1} / {totalSteps}</p>
      </div>

      {/* 本文 */}
      <div className="px-5 py-5">
        {/* 物件タイプ */}
        {stepId === "property_type" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_ptype_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_ptype_d}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ALL_PROPERTY_TYPES.map((pt) => {
                const Icon = PROPERTY_TYPE_ICONS[pt];
                const on = (editing.property_type || "house") === pt;
                return (
                  <button key={pt} type="button" onClick={() => set({ property_type: pt })}
                    className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${on ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <Icon className="h-6 w-6 text-slate-700" />
                    <span className="text-sm font-semibold text-slate-800">{st.ptype[pt]}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 部屋タイプ */}
        {stepId === "room_type" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_room_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_room_d}</p>
            <div className="grid gap-3">
              {ALL_ROOM_TYPES.map((rt) => {
                const Icon = ROOM_TYPE_ICONS[rt];
                const on = (editing.room_type || "entire") === rt;
                const desc = rt === "entire" ? t.rd_entire : rt === "private" ? t.rd_private : t.rd_shared;
                return (
                  <button key={rt} type="button" onClick={() => set({ room_type: rt })}
                    className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${on ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <Icon className="h-6 w-6 shrink-0 text-slate-700" />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{st.roomType[rt]}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 所在地 */}
        {stepId === "location" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_loc_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_loc_d}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">{t.f_city}
                <input value={editing.city || ""} onChange={(e) => set({ city: e.target.value })} className={field} placeholder={t.ph_city} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_address}
                <input value={editing.address || ""} onChange={(e) => set({ address: e.target.value })} className={field} placeholder={t.ph_address} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_lat}
                <input type="number" step="0.0001" value={editing.lat ?? ""} onChange={(e) => set({ lat: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_lng}
                <input type="number" step="0.0001" value={editing.lng ?? ""} onChange={(e) => set({ lng: e.target.value === "" ? null : Number(e.target.value) })} className={field} />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{t.loc_hint}</p>
          </section>
        )}

        {/* 基本情報 */}
        {stepId === "basics" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_basics_t}</h3>
            <p className="mb-2 text-sm text-slate-500">{t.s_basics_d}</p>
            <div>
              <Stepper label={t.f_capacity} value={editing.max_guests ?? 1} min={1} onChange={(v) => set({ max_guests: v })} />
              <Stepper label={t.f_bedrooms} value={editing.bedrooms ?? 0} min={0} onChange={(v) => set({ bedrooms: v })} />
              <Stepper label={t.f_beds} value={editing.beds ?? 1} min={1} onChange={(v) => set({ beds: v })} />
              <Stepper label={t.f_baths} value={editing.baths ?? 1} min={0} step={0.5} onChange={(v) => set({ baths: v })} />
            </div>
          </section>
        )}

        {/* アメニティ */}
        {stepId === "amenities" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_amenities_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_amenities_d}</p>
            <div className="space-y-5">
              {AMENITY_CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  <p className="mb-2 text-xs font-bold text-slate-500">{catLabel(cat.key)}</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((a) => {
                      const on = (editing.amenities || []).includes(a);
                      return (
                        <button key={a} type="button" onClick={() => toggleAmenity(a)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>
                          {on && <Check className="h-3 w-3" />}
                          {st.amenity[a] || a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 写真 */}
        {stepId === "photos" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_photos_t}</h3>
            <p className="mb-3 text-sm text-slate-500">
              {t.photos_desc}
              <span className={`ml-1 font-semibold ${photos.length >= 5 ? "text-emerald-600" : "text-amber-600"}`}>
                （{t.photos_current} {photos.length} {t.photos_unit}）
              </span>
            </p>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) addPhotoFiles(e.target.files); e.target.value = ""; }} />
            <div role="button" tabIndex={0} onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) addPhotoFiles(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-8 text-sm transition ${dragOver ? "border-brand-500 bg-brand-50 text-brand-600" : "border-slate-300 text-slate-500 hover:bg-slate-50"}`}>
              {uploadingPhotos ? (<><Loader2 className="h-5 w-5 animate-spin" /> {t.uploading}</>) : (<><ImagePlus className="h-5 w-5" /> {t.drop_hint}</>)}
            </div>

            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((url, i) => (
                  <div key={`${url}-${i}`} draggable
                    onDragStart={() => { dragPhotoIndex.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragPhotoIndex.current !== null) movePhoto(dragPhotoIndex.current, i); dragPhotoIndex.current = null; }}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <GripVertical className="h-3 w-3" />
                      {i === 0 ? <><Star className="h-2.5 w-2.5 fill-white" /> {t.cover_badge}</> : i + 1}
                    </span>
                    <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label={t.close}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      {i !== 0 && (
                        <button type="button" onClick={() => makeCover(i)} className="flex-1 rounded-md bg-white/90 py-0.5 text-[10px] font-semibold text-slate-700">
                          {t.make_cover}
                        </button>
                      )}
                      <button type="button" onClick={() => movePhoto(i, i - 1)} disabled={i === 0} className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 disabled:opacity-30">
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => movePhoto(i, i + 1)} disabled={i === photos.length - 1} className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 disabled:opacity-30">
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhotoUrl(); } }}
                placeholder={t.url_ph} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={addPhotoUrl} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                {t.add_btn}
              </button>
            </div>
          </section>
        )}

        {/* タイトル */}
        {stepId === "title" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_title_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_title_d}</p>
            <textarea value={editing.title || ""} onChange={(e) => set({ title: e.target.value })} rows={2} maxLength={50} placeholder={t.ph_title} className={field} />
            <p className="mt-1 text-right text-[11px] text-slate-400">{(editing.title || "").length}/50</p>
          </section>
        )}

        {/* ハイライト */}
        {stepId === "highlights" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_highlights_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_highlights_d}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_HIGHLIGHTS.map((h) => {
                const on = ((editing.highlights as Highlight[]) || []).includes(h);
                return (
                  <button key={h} type="button" onClick={() => toggleHighlight(h)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {st.highlight[h]}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 説明文 */}
        {stepId === "description" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_desc_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_desc_d}</p>
            <textarea value={editing.description || ""} onChange={(e) => set({ description: e.target.value })} rows={6} placeholder={t.ph_desc} className={field} />
          </section>
        )}

        {/* 料金 */}
        {stepId === "price" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_price_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_price_d}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">{t.f_price}
                <input type="number" min={0} value={editing.price_per_night ?? 0} onChange={(e) => set({ price_per_night: Number(e.target.value) })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_cleaning}
                <input type="number" min={0} value={editing.cleaning_fee ?? 0} onChange={(e) => set({ cleaning_fee: Number(e.target.value) })} className={field} />
              </label>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {t.guest_pays} <span className="font-bold text-slate-800">{formatJPY((editing.price_per_night ?? 0) + (editing.cleaning_fee ?? 0))}</span> {t.per_night_clean}
            </p>
          </section>
        )}

        {/* 割引 */}
        {stepId === "discounts" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_disc_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_disc_d}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">{t.f_weekly}
                <input type="number" min={0} max={90} value={editing.weekly_discount_pct ?? 0} onChange={(e) => set({ weekly_discount_pct: Number(e.target.value) })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_monthly}
                <input type="number" min={0} max={90} value={editing.monthly_discount_pct ?? 0} onChange={(e) => set({ monthly_discount_pct: Number(e.target.value) })} className={field} />
              </label>
            </div>
          </section>
        )}

        {/* ハウスルール */}
        {stepId === "rules" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_rules_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_rules_d}</p>
            <div className="space-y-1">
              {([
                { key: "allow_children", label: t.r_children, Icon: Baby },
                { key: "allow_pets", label: t.r_pets, Icon: PawPrint },
                { key: "allow_smoking", label: t.r_smoking, Icon: Cigarette },
                { key: "allow_events", label: t.r_events, Icon: PartyPopper },
              ] as const).map(({ key, label, Icon }) => (
                <div key={key} className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Icon className="h-4 w-4 text-slate-500" /> {label}
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                    <input type="checkbox" checked={!!(editing as any)[key]} onChange={(e) => set({ [key]: e.target.checked } as Partial<Listing>)} />
                    {(editing as any)[key] ? t.allowed : t.not_allowed}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-500">{t.f_checkin_time}
                <input type="time" value={editing.check_in_time || ""} onChange={(e) => set({ check_in_time: e.target.value })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_checkout_time}
                <input type="time" value={editing.check_out_time || ""} onChange={(e) => set({ check_out_time: e.target.value })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_quiet}
                <input value={editing.quiet_hours || ""} onChange={(e) => set({ quiet_hours: e.target.value })} placeholder={t.ph_quiet} className={field} />
              </label>
            </div>
          </section>
        )}

        {/* 予約設定 */}
        {stepId === "booking" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_booking_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_booking_d}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-500">{t.f_min_nights}
                <input type="number" min={1} value={editing.min_nights ?? 1} onChange={(e) => set({ min_nights: Number(e.target.value) })} className={field} />
              </label>
              <label className="text-xs font-semibold text-slate-500">{t.f_cancel_policy}
                <select value={editing.cancellation_policy || "moderate"} onChange={(e) => set({ cancellation_policy: e.target.value as CancellationPolicy })} className={field}>
                  {(Object.keys(CANCELLATION_POLICY_LABELS) as CancellationPolicy[]).map((p) => (
                    <option key={p} value={p}>{st.policy[p]}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={editing.instant_book || false} onChange={(e) => set({ instant_book: e.target.checked })} />
              <span><span className="font-semibold">{t.instant_t}</span><br /><span className="text-xs text-slate-500">{t.instant_d}</span></span>
            </label>
            <label className="mt-2 flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={editing.auto_pricing || false} onChange={(e) => set({ auto_pricing: e.target.checked })} />
              <span><span className="font-semibold">{t.autoprice_t}</span><br /><span className="text-xs text-slate-500">{t.autoprice_d}</span></span>
            </label>
          </section>
        )}

        {/* チェックイン案内 */}
        {stepId === "checkin" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_checkin_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_checkin_d}</p>
            <textarea value={editing.checkin_instructions ?? ""} onChange={(e) => set({ checkin_instructions: e.target.value })} rows={5} placeholder={t.ph_checkin} className={field} />
          </section>
        )}

        {/* 確認して公開 */}
        {stepId === "review" && (
          <section>
            <h3 className="mb-1 text-base font-bold">{t.s_review_t}</h3>
            <p className="mb-4 text-sm text-slate-500">{t.s_review_d}</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="aspect-[16/9] bg-slate-100">
                {photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">{t.no_photos}</div>
                )}
              </div>
              <div className="p-4 text-sm">
                <div className="font-bold">{editing.title || t.no_title}</div>
                <div className="mt-0.5 text-slate-500">
                  {st.ptype[(editing.property_type as PropertyType) || "house"]}・
                  {st.roomType[(editing.room_type as RoomType) || "entire"]}・{editing.city || t.no_loc}
                </div>
                <div className="mt-1 text-slate-500">
                  {editing.max_guests}{t.guests_unit}・{t.bedrooms_short}{editing.bedrooms}・{t.beds_short}{editing.beds}・{t.baths_short}{editing.baths}
                </div>
                <div className="mt-2 font-semibold text-slate-800">{formatJPY(editing.price_per_night ?? 0)}{t.per_night}</div>
                <div className="mt-1 text-slate-500">{t.photos_n} {photos.length} / {t.amenities_n} {(editing.amenities || []).length}{t.items_unit}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => set({ is_published: true })}
                className={`rounded-xl border-2 p-3 text-left text-sm transition ${editing.is_published ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <div className="font-semibold">{t.publish_now}</div>
                <div className="text-xs text-slate-500">{t.publish_now_d}</div>
              </button>
              <button type="button" onClick={() => set({ is_published: false })}
                className={`rounded-xl border-2 p-3 text-left text-sm transition ${!editing.is_published ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <div className="font-semibold">{t.draft_t}</div>
                <div className="text-xs text-slate-500">{t.draft_d}</div>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* フッター：ナビゲーション */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
        <button onClick={goBack} disabled={step === 0} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 underline disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" /> {t.back}
        </button>
        {isLast ? (
          <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? t.saving : editing.is_published ? t.publishBtn : t.saveDraftBtn}
          </button>
        ) : (
          <button onClick={goNext} disabled={!canProceed} className="flex items-center gap-1 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {t.next} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
