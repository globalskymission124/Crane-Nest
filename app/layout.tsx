import type { Metadata } from "next";
import "./globals.css";
import ThemeStyleInjector from "@/components/ThemeStyleInjector";

export const metadata: Metadata = {
  title: "送迎予約＆事前チェックイン",
  description: "関西空港周辺ゲストハウスの送迎予約・事前チェックインアプリ",
};

// ルートレイアウトはhtml/bodyの土台のみ。
// モバイル向けコンテナや多言語化は app/(guest)/layout.tsx 側で適用し、
// 管理画面（app/admin）はPC向けの全幅レイアウトを使う。
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <ThemeStyleInjector />
        {children}
      </body>
    </html>
  );
}
