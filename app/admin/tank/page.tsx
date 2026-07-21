"use client";

// =========================================================
// 管理者専用：便槽（し尿タンク）モニタリング
//   自社ゲストハウス専用の内部管理ページ。
//   プラットフォーム（ホスト/ゲスト）には公開せず、admin ロールのみ閲覧可。
// =========================================================
import AuthGuard from "@/components/stays/AuthGuard";
import GuesthouseTankDashboard from "@/components/stays/GuesthouseTankDashboard";

export default function AdminTankPage() {
  return (
    <AuthGuard roles={["admin"]}>
      <GuesthouseTankDashboard />
    </AuthGuard>
  );
}
