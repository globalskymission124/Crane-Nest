"use client";

// ホストレイアウトのヘッダー文言（多言語）。
// レイアウトはサーバーコンポーネントのため、翻訳表示はこのクライアント部品で行う。
import { useHostT } from "@/lib/stays/hostI18n";

export default function HostHeaderLabels({ which }: { which: "console" | "profile" | "toGuest" }) {
  const { t } = useHostT();
  if (which === "console") return <>{t.ownerConsole}</>;
  if (which === "profile") return <>{t.profile}</>;
  return <>{t.toGuest}</>;
}
