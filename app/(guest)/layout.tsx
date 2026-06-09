import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

// ゲスト向けフロー専用レイアウト。
// スマホ画面を想定したモバイルコンテナ＋多言語コンテキストでラップする。
// （管理画面はこの制約を受けないよう、ルートレイアウトではなくここに置く）
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-brand-50/60 sm:py-8">
      <div className="mx-auto min-h-screen w-full max-w-md bg-white shadow-sm sm:min-h-0 sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-brand-100/70 sm:shadow-2xl sm:shadow-brand-700/15">
        <LanguageProvider>{children}</LanguageProvider>
      </div>
    </div>
  );
}
