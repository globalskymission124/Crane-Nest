// =========================================================
// サイト設定（site_settings.primary_color）から
// Tailwindのbrandカラースケール（50/100/500/600/700）を
// 自動生成するためのユーティリティ。
//
// 既存のbrandパレット（#eff6ff〜#1d4ed8）をHSLに変換すると、
// 明度(L)がおおよそ 97 / 93 / 60 / 53 / 46 という並びになっている。
// これは「600(基準色)を中心に、明度を ±7 / ±40〜44 ずらしたスケール」
// と近似できるため、管理者が選んだ基準色を600として扱い、
// 同じ明度差を適用してスケール全体を生成する。
// =========================================================

export interface BrandScale {
  50: string;
  100: string;
  500: string;
  600: string;
  700: string;
}

export const DEFAULT_BRAND_COLOR = "#2563eb";

export const DEFAULT_BRAND_SCALE: BrandScale = {
  50: "#eff6ff",
  100: "#dbeafe",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
};

interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

function hexToHsl(hex: string): Hsl | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const intVal = parseInt(match[1], 16);
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sNorm = Math.min(100, Math.max(0, s)) / 100;
  const lNorm = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, x, 0];
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// 既存パレットの明度差から算出した、600(基準)からの相対オフセット
const LIGHTNESS_OFFSET = {
  50: 44,
  100: 40,
  500: 7,
  600: 0,
  700: -7,
} as const;

// 50/100は彩度を少し落として「白に近い淡色」に寄せる
const SATURATION_OFFSET = {
  50: 6,
  100: 2,
  500: 0,
  600: 0,
  700: -8,
} as const;

/**
 * 管理者が選んだ基準色（HEX）から、Tailwindのbrandスケール一式を生成する。
 * 不正な値の場合は既定のスケール（現行の青系パレット）を返す。
 */
export function generateBrandScale(baseHex: string | null | undefined): BrandScale {
  if (!baseHex) return DEFAULT_BRAND_SCALE;

  const base = hexToHsl(baseHex);
  if (!base) return DEFAULT_BRAND_SCALE;

  const shade = (key: keyof BrandScale): string =>
    hslToHex({
      h: base.h,
      s: clamp(base.s + SATURATION_OFFSET[key], 0, 100),
      l: clamp(base.l + LIGHTNESS_OFFSET[key], 0, 100),
    });

  return {
    50: shade(50),
    100: shade(100),
    500: shade(500),
    600: shade(600),
    700: shade(700),
  };
}

/**
 * brandスケールから :root に適用するCSSカスタムプロパティの文字列を生成する。
 */
export function brandScaleToCssVariables(scale: BrandScale): string {
  return `:root {\n${(Object.keys(scale) as unknown as Array<keyof BrandScale>)
    .map((key) => `  --brand-${key}: ${scale[key]};`)
    .join("\n")}\n}`;
}
