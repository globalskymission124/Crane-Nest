import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";
import { fetchSiteCms } from "@/lib/site/cms";

export const metadata = siteMetadata("zh");
export const revalidate = 300;

export default async function SitePageZh() {
  const cms = await fetchSiteCms();
  return <SiteLanding locale="zh" cms={cms} />;
}
