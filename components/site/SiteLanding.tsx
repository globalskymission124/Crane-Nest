// =========================================================
// 公式サイトLP v2（モダンデザイン・サーバーコンポーネント）
// ダークヒーロー + グラデーション、ガラス質ヘッダー、ホバー演出。
// SEO: 本文はすべてサーバーレンダリング。JSON-LD構造化データ入り。
// CMS（/admin/website）の画像・文言を反映。
// =========================================================
import Link from "next/link";
import { ArrowRight, Globe2, Plane, ShieldCheck, Sparkles, Star } from "lucide-react";
import { SITE_CONTENT, SITE_URL, type SiteLocale } from "@/lib/site/content";
import { EMPTY_CMS, type SiteCms } from "@/lib/site/cms";

const LOCALE_PATH: Record<SiteLocale, string> = { en: "/site", tw: "/site/tw", zh: "/site/zh", ja: "/site/ja" };
const LOCALE_LABEL: Record<SiteLocale, string> = { en: "EN", tw: "繁中", zh: "简中", ja: "日本語" };
const FEATURE_ICONS = [Sparkles, Plane, ShieldCheck, Star];

export default function SiteLanding({ locale, cms = EMPTY_CMS }: { locale: SiteLocale; cms?: SiteCms }) {
  const c = SITE_CONTENT[locale];
  const ov = cms.text_overrides?.[locale] || {};
  const heroHeading = ov.heroHeading || c.hero.heading;
  const heroSub = ov.heroSub || c.hero.sub;

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
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes cnFadeUp { from { opacity:0; transform:translateY(18px);} to { opacity:1; transform:none;} }
          .cn-fade { animation: cnFadeUp .7s cubic-bezier(.2,.7,.2,1) both; }
          .cn-d1 { animation-delay:.08s } .cn-d2 { animation-delay:.16s } .cn-d3 { animation-delay:.24s }
        `,
        }}
      />

      {/* ガラス質の固定ヘッダー */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <p className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            Crane Nest
          </p>
          <nav className="flex items-center gap-1">
            {(Object.keys(LOCALE_PATH) as SiteLocale[]).map((l) => (
              <Link
                key={l}
                href={LOCALE_PATH[l]}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  l === locale ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {LOCALE_LABEL[l]}
              </Link>
            ))}
            <Link
              href="/stays"
              className="ml-2 hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 sm:flex"
            >
              {c.hero.ctaSearch} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-slate-950 pt-16">
        {cms.hero_image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cms.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950" />
          </>
        ) : (
          <>
            {/* グラデーションの光彩 */}
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl" />
            <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
          </>
        )}
        <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
          <p className="cn-fade mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-200 backdrop-blur">
            <Globe2 className="h-3.5 w-3.5 text-emerald-400" /> Kansai, Japan — Direct booking platform
          </p>
          <h1 className="cn-fade cn-d1 mx-auto max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl">
            {heroHeading}
          </h1>
          <p className="cn-fade cn-d2 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {heroSub}
          </p>
          <div className="cn-fade cn-d3 mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/stays"
              className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition hover:scale-[1.03]"
            >
              {c.hero.ctaSearch}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              {c.hero.ctaTransfer}
            </Link>
          </div>
          {/* 統計 */}
          <div className="cn-fade cn-d3 mx-auto mt-14 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 py-4 backdrop-blur">
            {[
              ["3+", "Areas"],
              ["4", "Languages"],
              ["24/7", "Chat support"],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-2xl font-black text-transparent">{v}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="relative -mt-10 pb-4">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <div
                key={f.title}
                className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* エリア */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{c.areasTitle}</h2>
          <Link href="/stays" className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:underline">
            {c.hero.ctaSearch} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {c.areas.map((a, i) => (
            <Link
              key={a.name}
              href="/stays"
              className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="aspect-[4/5] w-full">
                {cms.area_images[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cms.area_images[i]}
                    alt={a.name}
                    className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${["from-sky-700 to-slate-900", "from-emerald-700 to-slate-900", "from-indigo-700 to-slate-900"][i % 3]}`} />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-5 pt-16">
                <h3 className="text-lg font-extrabold text-white">{a.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ギャラリー（CMSで管理） */}
      {cms.gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cms.gallery.slice(0, 8).map((url, i) => (
              <div
                key={i}
                className={`group overflow-hidden rounded-3xl bg-slate-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-2xl font-black tracking-tight text-slate-900">{c.faqTitle}</h2>
          <div className="mt-7 space-y-3">
            {c.faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-slate-800">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ホスト募集 */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center shadow-2xl">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <h2 className="relative text-2xl font-black tracking-tight text-white">{c.hostTitle}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">{c.hostBody}</p>
          <Link
            href="/host"
            className="relative mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-900 transition hover:scale-[1.03]"
          >
            {c.hostCta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center">
          <p className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
            <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            Crane Nest
          </p>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Crane Nest — {c.footer}</p>
          <p className="text-xs text-slate-400">
            <Link href="/stays" className="hover:text-slate-600 hover:underline">Stays</Link>
            <span className="mx-2">·</span>
            <Link href="/" className="hover:text-slate-600 hover:underline">Transfer</Link>
            <span className="mx-2">·</span>
            <Link href="/host" className="hover:text-slate-600 hover:underline">Hosting</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
