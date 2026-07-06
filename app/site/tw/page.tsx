import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";
import { fetchSiteCms } from "@/lib/site/cms";

export const metadata = siteMetadata("tw");
export const revalidate = 300;

export default async function SitePageTw() {
  const cms = await fetchSiteCms();
  return <SiteLanding locale="tw" cms={cms} />;
}
