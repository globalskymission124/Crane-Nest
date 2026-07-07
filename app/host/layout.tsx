import Link from "next/link";
import { Building2 } from "lucide-react";
import HostNav from "@/components/stays/HostNav";
import AuthGuard from "@/components/stays/AuthGuard";
import NotificationsBell from "@/components/stays/NotificationsBell";

// オーナー（貸主）向けバックエンドのレイアウト。ホスト/管理者ロールが必要。
export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/host" className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <Building2 className="h-5 w-5 text-brand-600" />
            オーナー管理
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <Link href="/stays/profile" className="text-sm font-medium text-slate-500 hover:text-brand-600">
              プロフィール
            </Link>
            <Link href="/stays" className="text-sm font-medium text-slate-500 hover:text-brand-600">
              ゲスト画面 →
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <HostNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AuthGuard roles={["host", "admin"]}>{children}</AuthGuard>
      </main>
    </div>
  );
}
