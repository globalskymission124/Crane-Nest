import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";

export const metadata = siteMetadata("tw");

export default function SitePageTw() {
  return <SiteLanding locale="tw" />;
}
