"use client";

// =========================================================
// site_settings テーブルから基準色(primary_color)を取得し、
// generateBrandScale() で50/100/500/600/700のスケールを生成、
// :root に --brand-* CSSカスタムプロパティとして注入するコンポーネント。
//
// tailwind.config.ts の brand.* は var(--brand-*, #既定値) を参照しているため、
// このコンポーネントが描画されるだけで管理画面で選んだ色が
// サイト全体（ゲスト画面・管理画面の両方）に反映される。
// 取得に失敗した場合は何もせず、既定の青系パレットのまま表示される。
// =========================================================

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { brandScaleToCssVariables, generateBrandScale } from "@/lib/theme";

export default function ThemeStyleInjector() {
  const [css, setCss] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("primary_color")
        .limit(1)
        .maybeSingle();

      if (cancelled || error || !data) return;

      const scale = generateBrandScale(data.primary_color);
      setCss(brandScaleToCssVariables(scale));
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!css) return null;

  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
