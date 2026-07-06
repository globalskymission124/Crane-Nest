"use client";

// 役割ベースの簡易認証ガード。未ログイン/権限不足なら /stays/login へ誘導。
import Link from "next/link";
import { Lock } from "lucide-react";
import { useStaysSession } from "@/lib/stays/auth";
import type { UserRole } from "@/lib/stays/types";

export default function AuthGuard({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { session, ready } = useStaysSession();
  if (!ready) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;
  if (!session || !roles.includes(session.role)) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-700">
          このページには{roles.includes("admin") ? "管理者" : roles.includes("host") ? "オーナー" : ""}ログインが必要です
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {session ? `現在 ${session.name}（${session.role}）でログイン中です。権限が不足しています。` : "ログインしてからアクセスしてください。"}
        </p>
        <Link
          href="/stays/login"
          className="mt-4 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          ログインページへ
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
