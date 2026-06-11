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
  };
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
}

export function ResearchPageLayout({
  metaTitle,
  metaDescription,
  header,
  pageSynthesisKey,
  topToolCta,
  sections,
  relatedLinks,
  intelligenceUpsellTopic,
  adAfterHeader = true,
  introBlock,
}: ResearchPageLayoutProps) {
  const { isPremium } = usePremiumStatus();
  const { pathname } = useLocation();
  const canonicalUrl = `${SITE_ORIGIN}${pathname}`;
  const [contextUpdated, setContextUpdated] = useState<string | undefined>(undefined);

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

      <div className="max-w-4xl mx-auto px-6 py-8">
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
          <nav aria-label="Contents" className="mb-10 pb-4 border-b border-brand-navy/15 print:hidden">
            <p className="text-sm leading-relaxed">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-brand-mist mr-2">Contents:</span>
              {sections.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && <span className="text-brand-mist mx-1.5">·</span>}
                  <a href={`#${s.id}`} className="text-brand-teal no-underline hover:underline">{i + 1}. {s.h2}</a>
                </span>
              ))}
            </p>
          </nav>
        )}

        <div className="space-y-10">
          {sections.map((sec, idx) => {
            const placement = sec.toolCtaPlacement ?? "bottom";
            return (
              <section key={sec.id} id={sec.id} className={`scroll-mt-24 ${idx > 0 ? "pt-10 border-t border-brand-navy/10" : ""}`}>
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
                    className="text-[14px] text-slate leading-relaxed space-y-4 [&_a]:text-brand-teal [&_a]:no-underline [&_a:hover]:underline [&_h3]:font-display [&_h3]:text-[16px] [&_h3]:md:text-[18px] [&_h3]:text-brand-navy [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-brand-navy [&_strong]:font-semibold [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-brand-navy [&_th]:border-b [&_th]:border-brand-navy/30 [&_th]:py-2 [&_th]:pr-4 [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-brand-cloud [&_td]:align-top"
                    dangerouslySetInnerHTML={{ __html: sec.content }}
                  />
                )}
                {sec.children}
                {sec.synthesisKey && <ResearchSynthesisBlock sectionKey={sec.synthesisKey} compact />}
                {sec.toolCta && placement === "bottom" && <ResearchToolCTA {...sec.toolCta} />}
              </section>
            );
          })}
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
                <span className="text-brand-teal">→</span> {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Intelligence upsell */}
        {!isPremium && (
          <div className="mt-12 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center">
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
