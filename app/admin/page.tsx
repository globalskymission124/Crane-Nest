"use client";

import TransferKanbanBoard from "@/components/admin/TransferKanbanBoard";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

// 送迎カンバンボード：明日の送迎予定を時間帯レーン別に表示
export default function AdminDashboardPage() {
  const { t } = useAdminTranslation();
  return (
    <div>
      <header className="mb-4 flex items-start sm:mb-6 gap-3">
        <span className="mt-1 h-7 w-1 shrink-0 sm:h-8 sm:w-1.5 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl text-slate-800">{t.pages.board.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.pages.board.description}</p>
        </div>
      </header>

      <TransferKanbanBoard />
    </div>
  );
}
