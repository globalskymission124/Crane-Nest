// 公式サイト各言語ページ共通のメタデータ生成（hreflang: 英語を x-default）
import type { Metadata } from "next";
import { SITE_CONTENT, SITE_URL, type SiteLocale } from "./content";

const PATHS: Record<SiteLocale, string> = { en: "/site", tw: "/site/tw", zh: "/site/zh", ja: "/site/ja" };
const OG_LOCALE: Record<SiteLocale, string> = { en: "en_US", tw: "zh_TW", zh: "zh_CN", ja: "ja_JP" };

const KEYWORDS: Record<SiteLocale, string[]> = {
  en: ["Kansai guesthouse", "entire house rental Osaka", "Kyoto machiya stay", "KIX airport transfer accommodation", "Namba apartment", "Japan direct booking", "where to stay near Kansai airport"],
  tw: ["關西 民宿", "大阪 包棟 民宿", "京都 町家 住宿", "關西機場 接送 住宿", "難波 公寓", "日本 直訂"],
  zh: ["关西 民宿", "大阪 整栋 民宿", "京都 町家 住宿", "关西机场 接送 酒店", "难波 公寓", "日本 直订"],
  ja: ["関西 ゲストハウス", "一棟貸し 大阪", "町家 京都 宿泊", "関空 送迎 宿", "泉佐野 民泊"],
};

export function siteMetadata(locale: SiteLocale): Metadata {
  const c = SITE_CONTENT[locale];
  const url = `${SITE_URL}${PATHS[locale]}`;
  return {
    title: c.title,
    description: c.description,
    keywords: KEYWORDS[locale],
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/site`,
        "zh-TW": `${SITE_URL}/site/tw`,
        "zh-CN": `${SITE_URL}/site/zh`,
        ja: `${SITE_URL}/site/ja`,
        "x-default": `${SITE_URL}/site`,
      },
    },
    openGraph: {
      title: c.title,
      description: c.description,
      url,
      siteName: "Crane Nest",
      locale: OG_LOCALE[locale],
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}
