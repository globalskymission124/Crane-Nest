import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";

// 正規版はEnglish（訪日外国人がメインターゲット）
export const metadata = siteMetadata("en");

export default function SitePage() {
  return <SiteLanding locale="en" />;
}
