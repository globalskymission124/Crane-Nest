"use client";

// =========================================================
// 管理者：ユーザー管理（ロール変更 / 停止・再開）
// =========================================================
import { useEffect, useState } from "react";
import { Ban, ShieldCheck, Users } from "lucide-react";
import AuthGuard from "@/components/stays/AuthGuard";
import { fetchUsers, updateUser, audit } from "@/lib/stays/v2";
import { useStaysSession } from "@/lib/stays/auth";
import type { StaysUser, UserRole } from "@/lib/stays/types";

const ROLE_LABEL: Record<UserRole, string> = { guest: "ゲスト", host: "オーナー", admin: "管理者" };

function AdminUsersBody() {
  const { session } = useStaysSession();
  const [users, setUsers] = useState<StaysUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  async function setRole(u: StaysUser, role: UserRole) {
    await updateUser(u.id, { role });
    await audit(session?.email || "", "admin", "user.role_change", u.email, `→ ${role}`);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
  }

  async function toggleSuspend(u: StaysUser) {
    if (!confirm(`${u.name} を${u.is_suspended ? "再開" : "停止"}しますか?`)) return;
    await updateUser(u.id, { is_suspended: !u.is_suspended } as any);
    await audit(session?.email || "", "admin", u.is_suspended ? "user.unsuspend" : "user.suspend", u.email);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_suspended: !x.is_suspended } : x)));
  }

  if (loading) return <p className="py-20 text-center text-slate-400">読み込み中…</p>;

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-extrabold">
        <Users className="h-6 w-6 text-brand-600" /> ユーザー管理
      </h1>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">メール</th>
              <th className="px-4 py-3">ロール</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.is_suspended ? "opacity-50" : ""}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u, e.target.value as UserRole)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.is_suspended ? (
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">停止中</span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">有効</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleSuspend(u)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      u.is_suspended ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {u.is_suspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    {u.is_suspended ? "再開" : "停止"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">ユーザーがいません（0019シードを適用してください）</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard roles={["admin"]}>
      <AdminUsersBody />
    </AuthGuard>
  );
}
