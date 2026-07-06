"use client";

import BannerManager from "@/components/admin/BannerManager";
import { useAdminTranslation } from "@/lib/i18n/admin/AdminLanguageProvider";

// バナー管理：16:9画像のアップロード・並び替え・表示/非表示の切り替え
export default function AdminBannersPage() {
  const { t } = useAdminTranslation();
  return (
    <div>
      <header className="mb-4 flex items-start sm:mb-6 gap-3">
        <span className="mt-1 h-7 w-1 shrink-0 sm:h-8 sm:w-1.5 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl text-slate-800">{t.pages.banners.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.pages.banners.description}</p>
        </div>
      </header>

      <BannerManager />
    </div>
  );
}
