import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/content";

// 通常クローラーとAIクローラー(GPTBot/ClaudeBot/PerplexityBot等)を明示的に許可。
// 管理画面・API・決済ページはクロール対象外にする。
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/host", "/api/", "/stays/pay"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
