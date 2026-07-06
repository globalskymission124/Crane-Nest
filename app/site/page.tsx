import SiteLanding from "@/components/site/SiteLanding";
import { siteMetadata } from "@/lib/site/meta";
import { fetchSiteCms } from "@/lib/site/cms";

// 正規版はEnglish（訪日外国人がメインターゲット）
// CMS（管理画面「ウェブサイト」タブ）の内容を5分キャッシュで反映
export const metadata = siteMetadata("en");
export const revalidate = 300;

export default async function SitePage() {
  const cms = await fetchSiteCms();
  return <SiteLanding locale="en" cms={cms} />;
}
