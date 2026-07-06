import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 管理画面の「サイト設定」で基準色を変更すると、
        // ThemeStyleInjector が :root に --brand-* を注入し、
        // ここで定義したCSS変数経由で全体の配色が切り替わる。
        // 変数が未設定の場合は既定の青系パレットにフォールバックする。
        brand: {
          50: "var(--brand-50, #eff6ff)",
          100: "var(--brand-100, #dbeafe)",
          500: "var(--brand-500, #3b82f6)",
          600: "var(--brand-600, #2563eb)",
          700: "var(--brand-700, #1d4ed8)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
