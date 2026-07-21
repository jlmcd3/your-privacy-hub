import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { ReactNode, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { ResearchPageHeader, type BreadcrumbItem } from "./ResearchPageHeader";
import { ResearchSynthesisBlock } from "./ResearchSynthesisBlock";
import { ResearchToolCTA } from "./ResearchToolCTA";
import SectionReferenceRail from "./SectionReferenceRail";
import AdSlot from "@/components/ads/AdSlot";
import SourceMethodology from "./SourceMethodology";
import type { RailEntry } from "@/components/intake/StatuteRail";

const SITE_ORIGIN = "https://enduserprivacy.com";

export interface ResearchToolCtaConfig {
  toolName: string;
  toolDescription: string;
  href: string;
  context?: string;
}

export interface ResearchSectionConfig {
  id: string;
  h2: string;
  /** Either an HTML string (rendered with dangerouslySetInnerHTML) or React children */
  content?: string;
  children?: ReactNode;
  /** Section-level synthesis block sectionKey */
  synthesisKey?: string;
  /** Optional tool CTA shown after the synthesis block */
  toolCta?: ResearchToolCtaConfig;
  /** Where the tool CTA renders relative to section content. Defaults to "bottom". */
  toolCtaPlacement?: "top" | "bottom";
  /** Optional one-sentence "does this apply to me?" callout rendered above content. */
  complianceTrigger?: string;
}

export interface AtAGlanceItem {
  /** Left-column label (typically 1–3 words). Rendered in Roboto Mono. */
  label: string;
  /** Right-column value or short clause. */
  value: string;
}

export interface MerchandisingRailConfig {
  /** Rail heading, e.g. "Use this in your workflow". */
  heading?: string;
  /** Products to surface — 1–3 items. State pages → that state's notice + registration. EU/intl → International notice + LIA/DPIA. Enforcement → subscription. */
  items: { label: string; href: string; description?: string }[];
}

export interface ResearchPageLayoutProps {
  metaTitle: string;
  metaDescription: string;
  header: {
    eyebrow: string;
    title: string;
    description: string;
    lastUpdated?: string;
    stats?: { value: string; label: string }[];
    feedCategory?: string;
    breadcrumbs?: BreadcrumbItem[];
    /** UX-2c — mono statute citation in the masthead band. */
    statuteCite?: string;
  };
  /** UX-2c — at-a-glance card rendered after the masthead, before page synthesis. */
  atAGlance?: AtAGlanceItem[];
  /** UX-2c — contextual merchandising rail (state notice/registration, intl notice/LIA/DPIA, or subscription for enforcement pages). */
  merchandisingRail?: MerchandisingRailConfig;
  /** Page-level synthesis sectionKey, rendered above sections */
  pageSynthesisKey?: string;
  /** Optional top tool CTA shown above the first section */
  topToolCta?: ResearchToolCtaConfig;
  sections: ResearchSectionConfig[];
  relatedLinks: { label: string; href: string }[];
  /** Title for the bottom intelligence upsell */
  intelligenceUpsellTopic?: string;
  /** Optional ad banner placement: "after-header" (between header & page synthesis) */
  adAfterHeader?: boolean;
  /** Optional block rendered immediately after pageSynthesis/topToolCta and before the section nav. */
  introBlock?: ReactNode;
  /** Optional map of section.id → RailEntry. When provided, a sticky right-column rail tracks the in-view section and shows the controlling statute. */
  sectionRailEntries?: Record<string, RailEntry>;
}


export function ResearchPageLayout({
  metaTitle,
  metaDescription,
  header,
  atAGlance,
  merchandisingRail,
  pageSynthesisKey,
  topToolCta,
  sections,
  relatedLinks,
  intelligenceUpsellTopic,
  adAfterHeader = true,
  introBlock,
  sectionRailEntries,
}: ResearchPageLayoutProps) {

  const { isPremium } = usePremiumStatus();
  const { pathname } = useLocation();
  const canonicalUrl = `${SITE_ORIGIN}${pathname}`;
  const [contextUpdated, setContextUpdated] = useState<string | undefined>(undefined);
  const hasRail = !!sectionRailEntries && Object.keys(sectionRailEntries).length > 0;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
      { "@type": "ListItem", position: 2, name: "Research", item: `${SITE_ORIGIN}/research` },
      { "@type": "ListItem", position: 3, name: header.title, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
      <Navbar />

      <ResearchPageHeader {...header} contextUpdated={contextUpdated} />

      {adAfterHeader && (
        <div className="max-w-4xl mx-auto px-6 print:hidden">
          <AdBanner variant="leaderboard" className="my-4" />
        </div>
      )}

      <div className={`${hasRail ? "max-w-[1180px]" : "max-w-[860px]"} mx-auto px-6 py-8`}>
        {atAGlance && atAGlance.length > 0 && (
          <aside
            aria-label="At a glance"
            className="mb-10 rounded-xl border border-brand-navy/15 bg-white px-6 py-5 shadow-sm"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-brand-mist mb-3">
              At a glance
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              {atAGlance.map((it) => (
                <div key={it.label} className="contents">
                  <dt className="font-mono text-[13px] text-brand-navy/80 whitespace-nowrap">
                    {it.label}
                  </dt>
                  <dd className="text-[16px] leading-relaxed text-brand-navy m-0">
                    {it.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        {pageSynthesisKey && (
          <div className="mb-10">
            <ResearchSynthesisBlock
              sectionKey={pageSynthesisKey}
              promoteHeading
              onLoaded={(info) => setContextUpdated(info.generated_at || undefined)}
            />
          </div>
        )}

        {topToolCta && <ResearchToolCTA {...topToolCta} />}

        {introBlock && <div className="mb-8">{introBlock}</div>}


        {sections.length > 1 && (
          <nav aria-label="Contents" className="mt-10 mb-10 pb-4 border-b border-brand-navy/15 print:hidden">
            <p className="text-[15px] font-semibold tracking-[0.1em] uppercase text-brand-mist mb-3">Contents:</p>
            <ol className="list-none m-0 p-0 space-y-1.5">
              {sections.map((s, i) => (
                <li key={s.id} className="text-[19px] leading-relaxed">
                  <a href={`#${s.id}`} className="text-brand-teal-text no-underline hover:underline">{i + 1}. {s.h2}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className={hasRail ? "lg:flex lg:gap-6 lg:items-start" : ""}>
          <div className={hasRail ? "flex-1 min-w-0 space-y-10" : "space-y-10"}>
            {sections.map((sec, idx) => {
              const placement = sec.toolCtaPlacement ?? "bottom";
              return (
                <div key={sec.id}>
                  <section id={sec.id} className={`scroll-mt-24 ${idx > 0 ? "pt-10 border-t border-brand-navy/10" : ""}`}>
                    <h3 className="font-display text-brand-navy mb-4 leading-tight">
                      <span className="text-brand-mist mr-2">{idx + 1}.</span>{sec.h2}
                    </h3>
                    {sec.complianceTrigger && (
                      <div className="mb-4 rounded-lg border-l-4 border-accent bg-accent/5 px-4 py-3">
                        <div className="text-[11px] font-bold tracking-wider uppercase text-accent mb-1">
                          Compliance trigger
                        </div>
                        <p className="text-sm text-brand-navy leading-relaxed m-0">
                          {sec.complianceTrigger}
                        </p>
                      </div>
                    )}
                    {sec.toolCta && placement === "top" && <ResearchToolCTA {...sec.toolCta} />}
                    {sec.content && (
                      <div
                        className="text-[14px] text-slate leading-relaxed space-y-4 [&_a]:text-brand-teal-text [&_a]:no-underline [&_a:hover]:underline [&_h3]:font-display [&_h3]:text-[16px] [&_h3]:md:text-[18px] [&_h3]:text-brand-navy [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-brand-navy [&_strong]:font-semibold [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-brand-navy [&_th]:border-b [&_th]:border-brand-navy/30 [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-brand-cloud [&_td]:align-top"
                        dangerouslySetInnerHTML={{ __html: sec.content }}
                      />
                    )}
                    {sec.children}
                    {sec.synthesisKey && <ResearchSynthesisBlock sectionKey={sec.synthesisKey} compact />}
                    {sec.toolCta && placement === "bottom" && <ResearchToolCTA {...sec.toolCta} />}
                  </section>
                  {/* Single in-content AdSlot after the first content section (no-rail variant only). */}
                  {idx === 0 && !hasRail && sections.length > 1 && <AdSlot format="in-content" />}
                </div>
              );
            })}
          </div>
          {hasRail && (
            <SectionReferenceRail
              entries={sectionRailEntries!}
              sectionIds={sections.map((s) => s.id)}
            />
          )}
        </div>


        {/* Related resources */}
        <div className="mt-14 pt-8 border-t border-brand-cloud">
          <h3 className="text-brand-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="flex items-center gap-2 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium"
              >
                <span className="text-brand-teal-text">→</span> {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Source methodology (C-1) */}
        <div className="mt-10">
          <SourceMethodology />
        </div>

        {/* Intelligence upsell */}
        {!isPremium && (
          <div className="mt-12 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center print:hidden">
            <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-2">
              ⭐ Weekly Intelligence
            </div>
            <h2 className="text-white mb-3">
              Get weekly intelligence on {intelligenceUpsellTopic ?? header.title}
            </h2>
            <p className="text-sm text-brand-mist mb-5 max-w-[500px] mx-auto">
              Intelligence subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.
            </p>
            <Link
              to="/subscribe"
              className="inline-block px-6 py-3 text-sm font-semibold text-brand-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline"
            >
              Get full intelligence →
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
