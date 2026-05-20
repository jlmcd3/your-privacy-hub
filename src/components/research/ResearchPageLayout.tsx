import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { ResearchPageHeader, type BreadcrumbItem } from "./ResearchPageHeader";
import { ResearchSynthesisBlock } from "./ResearchSynthesisBlock";
import { ResearchToolCTA } from "./ResearchToolCTA";

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
}: ResearchPageLayoutProps) {
  const { isPremium } = usePremiumStatus();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
      </Helmet>
      <Navbar />

      <ResearchPageHeader {...header} />

      {adAfterHeader && (
        <div className="max-w-4xl mx-auto px-6">
          <AdBanner variant="leaderboard" className="my-4" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {pageSynthesisKey && (
          <div className="mb-10">
            <ResearchSynthesisBlock sectionKey={pageSynthesisKey} promoteHeading />
          </div>
        )}

        {topToolCta && <ResearchToolCTA {...topToolCta} />}

        {sections.length > 1 && (
          <details open className="mb-8 rounded-xl border border-fog bg-card group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-[12px] font-semibold tracking-wider uppercase text-navy">
              <span>On this page</span>
              <span className="md:hidden text-slate text-[11px] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <nav className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm text-blue hover:text-navy transition-colors no-underline flex items-start gap-2"
                >
                  <span className="text-slate">→</span>
                  <span>{s.h2}</span>
                </a>
              ))}
            </nav>
          </details>
        )}

        <h2 className="font-display text-navy mb-6 leading-tight">
          Full Analysis
        </h2>
        <div className="space-y-12">
          {sections.map((sec) => (
            <section key={sec.id} id={sec.id} className="scroll-mt-24">
              <h3 className="font-display text-navy mb-4 leading-tight">
                {sec.h2}
              </h3>
              {sec.content && (
                <div
                  className="text-[14px] text-slate leading-relaxed space-y-4 [&_a]:text-cobalt [&_a]:font-bold [&_a]:underline [&_a:hover]:text-navy [&_h3]:font-display [&_h3]:text-[16px] [&_h3]:md:text-[18px] [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-navy [&_strong]:font-semibold [&_a_strong]:text-cobalt"
                  dangerouslySetInnerHTML={{ __html: sec.content }}
                />
              )}
              {sec.children}
              {sec.synthesisKey && <ResearchSynthesisBlock sectionKey={sec.synthesisKey} compact />}
              {sec.toolCta && <ResearchToolCTA {...sec.toolCta} />}
            </section>
          ))}
        </div>

        {/* Related resources */}
        <div className="mt-14 pt-8 border-t border-fog">
          <h3 className="text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-sm text-navy font-medium"
              >
                <span className="text-blue">→</span> {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Intelligence upsell */}
        {!isPremium && (
          <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
            <div className="text-[11px] font-bold tracking-widest uppercase text-sky mb-2">
              ⭐ Weekly Intelligence
            </div>
            <h2 className="text-white mb-3">
              Get weekly intelligence on {intelligenceUpsellTopic ?? header.title}
            </h2>
            <p className="text-sm text-slate-light mb-5 max-w-[500px] mx-auto">
              Intelligence subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.
            </p>
            <Link
              to="/subscribe"
              className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline"
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
