// =========================================================
// 公式サイトLP（サーバーコンポーネント）
// SEO: 本文はすべてサーバーレンダリング。JSON-LD構造化データ
// (Organization / WebSite / FAQPage / BreadcrumbList) を埋め込み、
// Google・Bing・AI検索(ChatGPT/Perplexity/Gemini等)の両方に最適化。
// =========================================================
import Link from "next/link";
import { SITE_CONTENT, SITE_URL, type SiteLocale } from "@/lib/site/content";

// 英語を正規版（/site）に。ターゲットは訪日外国人（中華圏・欧州）。
const LOCALE_PATH: Record<SiteLocale, string> = { en: "/site", tw: "/site/tw", zh: "/site/zh", ja: "/site/ja" };
const LOCALE_LABEL: Record<SiteLocale, string> = { en: "English", tw: "繁體中文", zh: "简体中文", ja: "日本語" };

export default function SiteLanding({ locale }: { locale: SiteLocale }) {
  const c = SITE_CONTENT[locale];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Crane Nest",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      description: c.description,
      areaServed: ["Osaka", "Kyoto", "Kansai", "Japan"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Crane Nest",
      url: SITE_URL,
      inLanguage: c.htmlLang,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/stays?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ヘッダー */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">Crane Nest</p>
          <nav className="flex items-center gap-3 text-sm">
            {(Object.keys(LOCALE_PATH) as SiteLocale[]).map((l) => (
              <Link
                key={l}
                href={LOCALE_PATH[l]}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  l === locale ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
                aria-label={l}
              >
                {LOCALE_LABEL[l]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="mx-auto max-w-5xl px-5 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {c.hero.heading}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">{c.hero.sub}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/stays" className="rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-slate-700">
            {c.hero.ctaSearch}
          </Link>
          <Link href="/" className="rounded-2xl border border-slate-200 px-8 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {c.hero.ctaTransfer}
          </Link>
        </div>
      </section>

      {/* 特徴 */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* エリア */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-xl font-extrabold text-slate-900">{c.areasTitle}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {c.areas.map((a) => (
            <Link key={a.name} href="/stays" className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-md">
              <h3 className="font-bold text-slate-800">{a.name}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ（FAQPage構造化データと同一内容 = AI検索が引用しやすい） */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-xl font-extrabold text-slate-900">{c.faqTitle}</h2>
          <div className="mt-5 space-y-3">
            {c.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none font-semibold text-slate-800">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ホスト募集 */}
      <section className="mx-auto max-w-5xl px-5 py-14 text-center">
        <h2 className="text-xl font-extrabold text-slate-900">{c.hostTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">{c.hostBody}</p>
        <Link href="/host" className="mt-6 inline-block rounded-2xl border border-slate-300 px-8 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
          {c.hostCta}
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-10 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Crane Nest — {c.footer}</p>
        <p className="mt-2">
          <Link href="/stays" className="underline">Stays</Link>・
          <Link href="/" className="underline">Transfer</Link>
        </p>
      </footer>
    </div>
  );
}
