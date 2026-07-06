import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";

export const metadata = siteMetadata("zh");

export default function SitePageZh() {
  return <SiteLanding locale="zh" />;
}
