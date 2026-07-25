import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/site`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/site/tw`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/site/zh`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/site/ja`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/stays`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
