"use client";

// =========================================================
// Leaflet + OpenStreetMap の地図（無料枠・APIキー不要）。
// npm依存を増やさないよう、CDNからLeafletを動的ロードする。
// =========================================================
import { useEffect, useRef } from "react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price?: number;
  href?: string;
}

interface Props {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.L) return resolve(w.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).L));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function StaysMap({
  markers,
  center,
  zoom = 12,
  className = "",
  onMarkerClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !ref.current) return;
        const first = markers.find((m) => m.lat != null && m.lng != null);
        const c: [number, number] = center || (first ? [first.lat, first.lng] : [34.6937, 135.5023]);
        if (!mapRef.current) {
          mapRef.current = L.map(ref.current).setView(c, zoom);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
        } else {
          mapRef.current.setView(c, zoom);
        }
        if (layerRef.current) layerRef.current.remove();
        layerRef.current = L.layerGroup().addTo(mapRef.current);

        const pts: [number, number][] = [];
        for (const m of markers) {
          if (m.lat == null || m.lng == null) continue;
          pts.push([m.lat, m.lng]);
          const priceLabel = m.price != null ? `¥${m.price.toLocaleString("ja-JP")}` : "";
          const icon = L.divIcon({
            className: "stays-price-marker",
            html: `<div style="background:#fff;border:1px solid #d1d5db;border-radius:9999px;padding:4px 10px;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;">${priceLabel || "●"}</div>`,
            iconSize: [0, 0],
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(layerRef.current);
          const popup = m.href
            ? `<a href="${m.href}" style="font-weight:600;color:#2563eb;">${m.title}</a>`
            : m.title;
          marker.bindPopup(popup);
          if (onMarkerClick) marker.on("click", () => onMarkerClick(m.id));
        }
        if (pts.length > 1) {
          mapRef.current.fitBounds(pts, { padding: [40, 40] });
        }
        setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 100);
      })
      .catch(() => {
        if (ref.current) {
          ref.current.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">地図を読み込めませんでした</div>';
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), center?.[0], center?.[1], zoom]);

  return <div ref={ref} className={className} style={{ minHeight: 240, zIndex: 0 }} />;
}
