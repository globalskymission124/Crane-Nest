import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";

export const metadata = siteMetadata("ja");

export default function SitePageJa() {
  return <SiteLanding locale="ja" />;
}
