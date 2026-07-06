import { redirect } from "next/navigation";

// 旧URL /site/en は正規版 /site へ
export default function SiteEnRedirect() {
  redirect("/site");
}
