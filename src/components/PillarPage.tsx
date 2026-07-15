import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SourceMethodology from "@/components/research/SourceMethodology";
import AdBanner from "@/components/AdBanner";
import { TieredFeed } from "@/components/TieredFeed";
import type { ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { fireEmailCaptured } from "@/lib/analyticsEvents";
import { useConversionEvent } from "@/hooks/useConversionEvent";

interface PillarPageProps {
  title: string;
  subtitle: string;
  /** Optional HTML version of the subtitle (e.g. with inline links). Used for display only; meta tags still use the plain `subtitle`. */
  subtitleHtml?: string;
  icon: string;
  lastUpdated: string;
  intro: string;
  sections: { heading: string; content: string }[];
  relatedLinks: { label: string; href: string }[];
  directoryLink?: { label: string; href: string };
  intelligenceLabel?: string;
  updateCategory?: string;
  /** Postgrest .or() filter string for the updates feed (used when updateCategory not set). */
  updateOrFilter?: string;
  /** 3–4 key numbers shown in the hero stat bar. */
  heroStats?: { value: string; label: string }[];
  /** Topic-specific email capture label, anonymous users only. */
  emailCaptureText?: string;
  /** Tool CTA shown at the bottom of the page before Related Resources. */
  toolCta?: {
    heading: string;
    description: string;
    link: string;
    linkLabel: string;
  };
  /** Short contextual upgrade message shown to FREE registered users mid-page. */
  midPageCtaMessage?: string;
}

const PillarPage = ({
  title,
  subtitle,
  subtitleHtml,
  icon,
  lastUpdated,
  intro,
  sections,
  relatedLinks,
  directoryLink,
  intelligenceLabel,
  updateCategory,
  updateOrFilter,
  heroStats,
  emailCaptureText,
  toolCta,
  midPageCtaMessage,
}: PillarPageProps) => {
  const [recentArticles, setRecentArticles] = useState<ArticleItem[]>([]);
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const [captureEmail, setCaptureEmail] = useState("");
  const [captureSent, setCaptureSent] = useState(false);
  const fireConversion = useConversionEvent();

  const tier: "anonymous" | "free" | "premium" = !user ? "anonymous" : isPremium ? "premium" : "free";

  // Fire the legacy "Recent Dev Click" Plausible event from a delegated handler
  // on the feed container, so we don't lose analytics signal after switching to
  // the centralized TieredFeed/ArticleCard rendering.
  const handleFeedClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.("a[href^='http']") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    const match = recentArticles.find((a: any) => a.url === href || a.source_url === href);
    if (!match) return;
    try {
      (window as any).plausible?.("Recent Dev Click", {
        props: {
          tier,
          pillar: title,
          source: (match as any).source_name || "unknown",
          article_id: match.id,
          url: href,
        },
      });
    } catch {
      /* swallow */
    }
  };

  useEffect(() => {
    if (!updateCategory && !updateOrFilter) return;

    async function load() {
      let query = (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_name,published_at,ai_summary,image_url,why_it_matters_short")
        .eq("is_hidden", false);

      if (updateCategory) query = query.eq("category", updateCategory);
      if (updateOrFilter) query = query.or(updateOrFilter);

      const { data } = await query
        .order("published_at", { ascending: false })
        .limit(8);

      if (data) {
        // Map db `url` → ArticleItem `source_url` expected by ArticleCard.
        setRecentArticles(
          (data as any[]).map((a) => ({ ...a, source_url: a.url })) as ArticleItem[]
        );
      }
    }

    load();
  }, [updateCategory, updateOrFilter]);

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureEmail) return;
    try {
      await (supabase as any)
        .from("email_signups")
        .insert({ email: captureEmail.toLowerCase().trim(), source: "pillar-hero" });
      fireEmailCaptured("pillar-hero");
    } catch {
      /* swallow */
    }
    setCaptureSent(true);
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{title} — Privacy Law Guide 2026 | End User Privacy</title>
        <meta name="description" content={subtitle} />
        <meta property="og:title" content={`${title} | End User Privacy`} />
        <meta property="og:description" content={subtitle} />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-ocean to-brand-slate-teal py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-brand-mist mb-4 bg-brand-mist/10 px-3 py-1.5 rounded-full border border-brand-mist/20">
            {icon} Intelligence Guide
          </div>
          <h1 className="text-page-h1 text-white mb-3 leading-tight">{title}</h1>
          {subtitleHtml ? (
            <p
              className="text-sm md:text-base text-brand-mist max-w-[700px] [&_a]:text-brand-mist [&_a]:no-underline [&_a:hover]:underline"
              dangerouslySetInnerHTML={{ __html: subtitleHtml }}
            />
          ) : (
            <p className="text-sm md:text-base text-brand-mist max-w-[700px]">{subtitle}</p>
          )}
          

          {/* Stat bar */}
          {heroStats && heroStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 max-w-[700px]">
              {heroStats.map((stat, idx) => (
                <div key={idx} className="bg-white/10 rounded-lg px-4 py-3 text-center">
                  <p className="font-display text-[22px] text-white font-bold leading-none mb-1">{stat.value}</p>
                  <p className="text-[11px] text-brand-mist leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Email capture — anonymous users only */}
          {!user && emailCaptureText && (
            <div className="mt-5 max-w-[500px]">
              {captureSent ? (
                <p className="text-[12px] text-brand-mist">You're subscribed — updates will arrive Monday morning.</p>
              ) : (
                <form onSubmit={handleEmailCapture} className="flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder={emailCaptureText}
                    className="flex-1 text-[12px] px-3 py-2 rounded-lg bg-white/15 border border-white/20 text-white placeholder:text-brand-mist focus:outline-none focus:border-white/40"
                    required
                  />
                  <button
                    type="submit"
                    className="text-[12px] px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-light transition-colors whitespace-nowrap"
                  >
                    Get updates →
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Contextual chip — free registered users */}
          {user && !isPremium && emailCaptureText && (
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-brand-mist bg-white/10 px-3 py-1.5 rounded-full">
              <span>Intelligence subscribers see full tables and analysis on every update.</span>
              <Link to="/subscribe" className="text-sky-300 font-semibold hover:text-white transition-colors">
                Get Intelligence →
              </Link>
            </div>
          )}
        </div>
      </div>


      <AdBanner variant="leaderboard" className="mt-6" />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Intro */}
        <div className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-8 shadow-eup-sm mb-6">
          <p className="text-[15px] text-brand-navy leading-relaxed">{intro}</p>
        </div>

        {/* Assessment CTA — shown to all users when this pillar has an associated tool/assessment.
            Placed below the intro card (context first) and above the TOC (high visibility). */}
        {toolCta && (
          <div className="mb-8 rounded-xl border border-accent/30 bg-gradient-to-br from-[hsl(var(--accent)/0.05)] to-card overflow-hidden shadow-eup-sm">
            <div className="px-5 py-4 md:px-6 md:py-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-[hsl(var(--accent))] mb-1.5">
                  ✓ Assessment tool
                </div>
                <h3 className="text-[16px] text-brand-navy leading-snug mb-1">
                  {toolCta.heading}
                </h3>
                <p className="text-sm text-slate leading-relaxed">{toolCta.description}</p>
              </div>
              <Link
                to={toolCta.link}
                className="inline-flex w-full md:w-auto items-center justify-center text-sm font-semibold text-white bg-accent hover:bg-accent-light px-5 py-2.5 rounded-lg no-underline transition-colors whitespace-nowrap"
              >
                {toolCta.linkLabel}
              </Link>
            </div>
          </div>
        )}

        {/* On this page — jump-link TOC. Collapsible on mobile, expanded on md+. */}
        {sections.length > 1 && (
          <details
            open
            className="mb-8 rounded-xl border border-brand-cloud bg-card md:open:block group"
          >
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-[12px] font-semibold tracking-wider uppercase text-brand-navy md:cursor-default">
              <span>On this page</span>
              <span className="md:hidden text-slate text-[11px] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <nav className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {recentArticles.length > 0 && (
                <a
                  href="#recent-developments"
                  className="text-sm text-brand-teal-text hover:text-brand-navy transition-colors no-underline flex items-start gap-2"
                >
                  <span className="text-slate">→</span>
                  <span>Recent developments <span className="text-[11px] font-bold tracking-widest uppercase px-1.5 py-0.5 ml-1 rounded bg-[hsl(var(--cobalt)/0.12)] text-[hsl(var(--cobalt))] align-middle">Live</span></span>
                </a>
              )}
              {sections.map((sec, i) => {
                const slug = sec.heading
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .trim()
                  .replace(/\s+/g, "-");
                return (
                  <a
                    key={i}
                    href={`#${slug}`}
                    className="text-sm text-brand-teal-text hover:text-brand-navy transition-colors no-underline flex items-start gap-2"
                  >
                    <span className="text-slate">→</span>
                    <span>{sec.heading}</span>
                  </a>
                );
              })}
            </nav>
          </details>
        )}

        {/* "What changed this week" CTA — hidden for premium users (they already get it). */}
        {!premiumLoading && !isPremium && (
          <div className="rounded-xl border border-brand-mist/20 overflow-hidden shadow-eup-sm mb-10 bg-card">
            <div className="bg-gradient-to-br from-brand-navy to-brand-ocean px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-1">
                  ⭐ Weekly Intelligence
                </div>
                <h3 className="text-[16px] text-white leading-snug">
                  {intelligenceLabel || "What changed in this area this week"}
                </h3>
              </div>
              <Lock className="w-4 h-4 text-brand-mist/60 shrink-0 mt-1" />
            </div>
            <div className="p-5 md:p-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <p className="text-sm text-brand-navy leading-relaxed font-medium">
                {midPageCtaMessage || "Intelligence subscribers get full analysis on every development in this area."}
              </p>
              <Link
                to="/subscribe"
                className="inline-flex w-full sm:w-auto items-center justify-center text-[12px] font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-4 py-2.5 rounded-lg no-underline hover:opacity-90 transition-all whitespace-nowrap"
              >
                Get full intelligence →
              </Link>
            </div>
          </div>
        )}

        {/* Recent Developments — proves the page is live after the Weekly Intelligence CTA */}
        {recentArticles.length > 0 && (
          <div id="recent-developments" className="scroll-mt-24 mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-brand-navy">Recent developments</h2>
              <span className="text-[11px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[hsl(var(--cobalt)/0.12)] text-[hsl(var(--cobalt))]">
                Live
              </span>
            </div>
            <div onClickCapture={handleFeedClick}>
              <TieredFeed
                articles={recentArticles}
                previewCount={1}
                seeAllHref="/updates"
                showSeeAll={true}
              />
            </div>
          </div>
        )}

        {/* Deep sections */}
        <div className="space-y-8">
          {sections.map((sec, i) => {
            const slug = sec.heading
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-");
            return (
              <React.Fragment key={i}>
                <div id={slug} className="scroll-mt-24">
                  <h2 className="font-display text-brand-navy mb-3">{sec.heading}</h2>
                  <div
                    className="text-[14px] text-slate leading-relaxed whitespace-pre-line [&_a]:text-brand-mist [&_a]:no-underline [&_a:hover]:underline"
                    dangerouslySetInnerHTML={{
                      __html: sec.content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-brand-navy font-semibold">$1</strong>'),
                    }}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>


        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-brand-cloud">
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
          {directoryLink && (
            <div className="mt-6">
              <Link
                to={directoryLink.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline"
              >
                {directoryLink.label} →
              </Link>
            </div>
          )}
        </div>


        {/* Premium CTA — hidden for premium users */}
        {!isPremium && (
          <div className="mt-12 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center">
            <div className="text-[11px] font-bold tracking-widest uppercase text-brand-mist mb-2">⭐ Weekly Intelligence</div>
            <h3 className="text-white mb-3">Get weekly intelligence on {title}</h3>
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
        <div className="mt-10">
          <SourceMethodology />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PillarPage;
