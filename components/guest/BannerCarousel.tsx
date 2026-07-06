"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Banner } from "@/lib/types";

const ROTATION_INTERVAL_MS = 5000;

// 管理画面で登録された有効な16:9バナーを取得し、自動で切り替えながら表示する。
// バナーが0件の場合は何も表示しない（スペースを取らない）。
export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBanners() {
      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, alt_text, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setBanners(data as Banner[]);
      }
    }

    loadBanners();
    return () => {
      cancelled = true;
    };
  }, []);

  // 複数枚ある場合のみ自動ローテーション
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200">
      <div className="relative aspect-video w-full bg-slate-100">
        {banners.map((banner, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={banner.id}
            src={banner.image_url}
            alt={banner.alt_text || "ゲストハウスのお知らせバナー"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 bg-white py-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`バナー ${index + 1} を表示`}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-5 bg-brand-600" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
