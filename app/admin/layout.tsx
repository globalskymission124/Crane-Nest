import AdminNav from "@/components/admin/AdminNav";
import AdminBrandHeader from "@/components/admin/AdminBrandHeader";
import { AdminLanguageProvider } from "@/lib/i18n/admin/AdminLanguageProvider";

// 管理画面レイアウト（PC利用を想定した全幅レイアウト）。
// ゲスト向けのモバイルコンテナとは独立した、管理者専用の多言語化コンテキストでラップする。
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLanguageProvider>
      <div className="min-h-screen bg-gradient-to-b from-brand-50/70 via-slate-50 to-slate-50">
        <AdminBrandHeader />
        <AdminNav />
        <main className="mx-auto max-w-6xl px-3 py-5 pb-24 sm:px-4 sm:py-8 sm:pb-8">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-900/5 backdrop-blur-sm sm:rounded-3xl sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AdminLanguageProvider>
  );
}
