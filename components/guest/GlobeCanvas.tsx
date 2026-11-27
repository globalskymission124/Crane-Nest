"use client";

// =========================================================
// 国籍を選ぶ地球儀 (2D canvas + d3-geo。古いスマホでも動く)
//  - big: 指で回す・国を押して選ぶ (小さい国・地域は白い印を押す)
//  - mini: 入力欄の横でゆっくり回り、選んだ国へくるっと回って金色に光る
//  - 地図 (/geo/world-110m.json, 約 160KB) は最初に地球を出すときに 1 回だけ読む
// =========================================================
import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, geoGraticule10, geoCentroid, geoContains, geoInterpolate, geoDistance } from "d3-geo";
import { countryName } from "@/lib/countries";

type LL = [number, number];
type Feat = { type: "Feature"; properties: { a2: string | null }; geometry: any };

let GEO: Promise<Feat[]> | null = null;
const loadGeo = () => (GEO ??= fetch("/geo/world-110m.json").then((r) => r.json()).then((j) => j.features as Feat[]).catch(() => { GEO = null; return []; }));

// 小さくて地球の上で押しにくい国・地域 (白い印)
const SMALL: Record<string, LL> = { HK: [114.17, 22.32], MO: [113.55, 22.2], SG: [103.82, 1.35], BN: [114.9, 4.9], AD: [1.5, 42.5], LU: [6.1, 49.8], MT: [14.4, 35.9], BH: [50.6, 26.1], QA: [51.2, 25.3], MV: [73.5, 4.2], MU: [57.6, -20.3] };
// 国の真ん中が海に出る国 (見せたい位置)
const CENTER: Record<string, LL> = { US: [-98, 39], FR: [2.5, 46.5], RU: [90, 60], CA: [-100, 56], NO: [10, 62], NZ: [174, -41], ID: [113, -2], MY: [102, 4], CL: [-71, -35], JP: [138, 37], GB: [-2, 54], AU: [134, -25], CN: [104, 35], PH: [122, 12] };

/** 古い・遅い端末 (コマ数を減らす) */
const isLite = () => {
  try {
    const n = navigator as any;
    return (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
};

interface Props {
  big?: boolean;
  /** 金色に光らせる国 */
  value: string | null;
  /** big のとき: 国を押した */
  onPick?: (a2: string) => void;
  locale?: string;
  className?: string;
}

export default function GlobeCanvas({ big, value, onPick, locale = "en", className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ goTo: (a2: string | null) => void; setSel: (a2: string | null) => void } | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  const locRef = useRef(locale); locRef.current = locale;

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    let alive = true, FEAT: Feat[] = [];
    const lite = isLite(), dpr = Math.min(lite ? 1.5 : 2, window.devicePixelRatio || 1), ctx = cv.getContext("2d")!;
    const proj = geoOrthographic().clipAngle(90).precision(0.5), path = geoPath(proj, ctx), grat = geoGraticule10();
    let W = 0, H = 0, base = 1, zoom = 1, zoomT = 1, rot: LL = [-135, -25], sel: string | null = value, anim = 0, spin = !big, lastDraw = 0;
    const centerOf = (a2: string): LL => SMALL[a2] ?? CENTER[a2] ?? (() => { const f = FEAT.find((x) => x.properties.a2 === a2); return f ? (geoCentroid(f) as LL) : [135, 35]; })();
    const facing = (c: LL) => geoDistance(c, [-rot[0], -rot[1]]) < 1.45;

    function size() {
      const r = cv!.getBoundingClientRect(); if (!r.width || !r.height) return;
      W = r.width; H = r.height; cv!.width = Math.round(W * dpr); cv!.height = Math.round(H * dpr);
      base = Math.max(2, Math.min(W, H) / 2 - (big ? 10 : 3)); proj.translate([W / 2, H / 2]);
    }
    function draw(t: number) {
      if (!W) { size(); if (!W) return; }
      zoom += (zoomT - zoom) * 0.08; proj.scale(base * zoom).rotate([rot[0], rot[1], 0]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const R = proj.scale(), cx = W / 2, cy = H / 2;
      // 大気の光
      const ga = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.12); ga.addColorStop(0, "rgba(90,190,255,.45)"); ga.addColorStop(1, "rgba(90,190,255,0)");
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 7); ctx.fill(); ctx.restore();
      // 海
      const go = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); go.addColorStop(0, "#1b4f8f"); go.addColorStop(1, "#071a36");
      ctx.fillStyle = go; ctx.beginPath(); path({ type: "Sphere" } as any); ctx.fill();
      if (big) { ctx.beginPath(); path(grat as any); ctx.strokeStyle = "rgba(120,200,255,.12)"; ctx.lineWidth = 0.6; ctx.stroke(); }
      // 陸と国境
      if (FEAT.length) { ctx.beginPath(); for (const f of FEAT) path(f as any); ctx.fillStyle = "#2e6a8f"; ctx.fill(); ctx.strokeStyle = "rgba(170,225,255,.45)"; ctx.lineWidth = big ? 0.7 : 0.4; ctx.stroke(); }
      // 選んだ国 (金色に光る)
      if (sel && FEAT.length) {
        const f = FEAT.find((x) => x.properties.a2 === sel), pulse = 0.55 + 0.45 * Math.sin(t / 260);
        if (f) { ctx.beginPath(); path(f as any); ctx.fillStyle = `rgba(255,190,80,${0.75 + 0.2 * pulse})`; if (!lite) { ctx.shadowColor = "rgba(255,180,60,.9)"; ctx.shadowBlur = 14; } ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "#ffe7b0"; ctx.lineWidth = 1.2; ctx.stroke(); }
        const c = centerOf(sel), p = proj(c);
        if (p && facing(c)) {
          if (SMALL[sel]) { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fillStyle = "#ffcf6b"; ctx.fill(); }
          for (let i = 0; i < 2; i++) { const u = (t / 1400 + i / 2) % 1; ctx.beginPath(); ctx.arc(p[0], p[1], 6 + u * (big ? 34 : 16), 0, 7); ctx.strokeStyle = `rgba(255,200,100,${(1 - u) * 0.9})`; ctx.lineWidth = 1.5; ctx.stroke(); }
        }
      }
      // 小さい国・地域の印 (押せる)
      if (big) for (const [a2, c] of Object.entries(SMALL)) {
        if (!facing(c)) continue; const p = proj(c)!; const on = a2 === sel;
        ctx.beginPath(); ctx.arc(p[0], p[1], on ? 6 : 4.5, 0, 7); ctx.fillStyle = on ? "#ffcf6b" : "rgba(255,255,255,.9)"; ctx.fill(); ctx.strokeStyle = "rgba(10,30,60,.8)"; ctx.lineWidth = 1.5; ctx.stroke();
        if (a2 === "HK" || a2 === "MO" || a2 === "SG") { ctx.font = "600 11px -apple-system,sans-serif"; ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fillText(countryName(a2, locRef.current), p[0] + 8, p[1] + (a2 === "MO" ? 12 : -4)); }
      }
      // ふちの光
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.strokeStyle = "rgba(150,220,255,.6)"; ctx.lineWidth = 1; ctx.stroke();
    }
    let raf = 0;
    const loop = (t: number) => {
      if (!alive) return; raf = requestAnimationFrame(loop);
      if (t - lastDraw < (lite ? 32 : 15)) return; lastDraw = t; // 古い端末は 30 コマ
      if (spin && !anim) rot = [rot[0] + (lite ? 0.24 : 0.12), rot[1]];
      draw(t);
    };
    raf = requestAnimationFrame(loop);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => size()) : null; ro?.observe(cv); addEventListener("resize", size);

    /** その国へくるっと回る */
    function goTo(a2: string | null) {
      if (!big) zoomT = a2 ? (SMALL[a2] ? 3.2 : 2.2) : 1;
      if (!a2) { spin = !big; return; }
      spin = false; const c = centerOf(a2), ip = geoInterpolate([-rot[0], -rot[1]], c), s = performance.now(), D = 1100; const my = ++anim;
      const step = (t: number) => { if (!alive || my !== anim) return; const u = Math.min(1, (t - s) / D), k = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; const p = ip(k); rot = [-p[0], -p[1]]; if (u < 1) requestAnimationFrame(step); else anim = 0; };
      requestAnimationFrame(step);
    }
    api.current = { goTo, setSel: (a2) => { sel = a2; } };
    loadGeo().then((f) => { if (!alive) return; FEAT = f; if (sel) goTo(sel); });

    // 大きい地球: 指で回す・押して選ぶ
    let down: { x: number; y: number; r: LL; moved: boolean } | null = null;
    const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, r: [...rot] as LL, moved: false }; anim++; spin = false; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } };
    const pm = (e: PointerEvent) => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 5) down.moved = true; const k = 90 / proj.scale(); rot = [down.r[0] + dx * k, Math.max(-80, Math.min(80, down.r[1] - dy * k))]; };
    const pu = (e: PointerEvent) => {
      const d = down; down = null; if (!d || d.moved) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best: string | null = null, bd = 22;
      for (const [a2, c] of Object.entries(SMALL)) { if (!facing(c)) continue; const p = proj(c)!; const dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = a2; } }
      if (!best) { const ll = proj.invert!([x, y]) as LL | null; if (ll && facing(ll)) best = FEAT.find((f) => f.properties.a2 && geoContains(f as any, ll))?.properties.a2 ?? null; }
      if (best) { sel = best; pickRef.current?.(best); }
    };
    if (big) { cv.addEventListener("pointerdown", pd); cv.addEventListener("pointermove", pm); cv.addEventListener("pointerup", pu); cv.addEventListener("pointercancel", () => { down = null; }); }
    return () => { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); removeEventListener("resize", size); cv.removeEventListener("pointerdown", pd); cv.removeEventListener("pointermove", pm); cv.removeEventListener("pointerup", pu); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big]);

  // 選んだ国が変わったら、そこへ回る
  useEffect(() => { api.current?.setSel(value); api.current?.goTo(value); }, [value]);

  return <canvas ref={ref} className={className} style={{ touchAction: big ? "none" : undefined, display: "block" }} aria-hidden />;
}
