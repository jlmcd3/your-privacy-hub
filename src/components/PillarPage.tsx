import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { TieredFeed } from "@/components/TieredFeed";
import type { ArticleItem } from "@/components/ArticleCard";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface PillarPageProps {
  title: string;
  subtitle: string;
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
  const { isPremium } = usePremiumStatus();
  const [captureEmail, setCaptureEmail] = useState("");
  const [captureSent, setCaptureSent] = useState(false);

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
        .select("id,title,summary,url,source_name,published_at,ai_summary");

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
    } catch {
      /* swallow */
    }
    setCaptureSent(true);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>{title} — Privacy Law Guide 2026 | End User Privacy</title>
        <meta name="description" content={subtitle} />
        <meta property="og:title" content={`${title} | End User Privacy`} />
        <meta property="og:description" content={subtitle} />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            {icon} Intelligence Guide
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">{title}</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">{subtitle}</p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: {lastUpdated}</div>

          {/* Stat bar */}
          {heroStats && heroStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 max-w-[700px]">
              {heroStats.map((stat, idx) => (
                <div key={idx} className="bg-white/10 rounded-lg px-4 py-3 text-center">
                  <p className="font-display text-[22px] text-white font-bold leading-none mb-1">{stat.value}</p>
                  <p className="text-[11px] text-slate-light leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Email capture — anonymous users only */}
          {!user && emailCaptureText && (
            <div className="mt-5 max-w-[500px]">
              {captureSent ? (
                <p className="text-[12px] text-slate-light">You're subscribed — updates will arrive Monday morning.</p>
              ) : (
                <form onSubmit={handleEmailCapture} className="flex gap-2">
                  <input
                    type="email"
                    value={captureEmail}
                    onChange={(e) => setCaptureEmail(e.target.value)}
                    placeholder={emailCaptureText}
                    className="flex-1 text-[12px] px-3 py-2 rounded-lg bg-white/15 border border-white/20 text-white placeholder:text-slate-light focus:outline-none focus:border-white/40"
                    required
                  />
                  <button
                    type="submit"
                    className="text-[12px] px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-500 transition-colors whitespace-nowrap"
                  >
                    Get updates →
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Contextual chip — free registered users */}
          {user && !isPremium && emailCaptureText && (
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-slate-light bg-white/10 px-3 py-1.5 rounded-full">
              <span>Intelligence subscribers see full tables and analysis on every update.</span>
              <Link to="/subscribe" className="text-sky-300 font-semibold hover:text-white transition-colors">
                Get Intelligence →
              </Link>
            </div>
          )}
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot={`eup-pillar-top`} className="py-3" />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Intro */}
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-6">
          <p className="text-[15px] text-navy leading-relaxed">{intro}</p>
        </div>

        {/* On this page — jump-link TOC. Collapsible on mobile, expanded on md+. */}
        {sections.length > 1 && (
          <details
            open
            className="mb-8 rounded-xl border border-fog bg-card md:open:block group"
          >
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-[12px] font-semibold tracking-wider uppercase text-navy md:cursor-default">
              <span>On this page</span>
              <span className="md:hidden text-slate text-[10px] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <nav className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
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
                    className="text-[13px] text-blue hover:text-navy transition-colors no-underline flex items-start gap-2"
                  >
                    <span className="text-slate">→</span>
                    <span>{sec.heading}</span>
                  </a>
                );
              })}
            </nav>
          </details>
        )}

        {/* Recent Developments — proves the page is live before any CTA */}
        {recentArticles.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-base text-navy">Recent developments</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-teal-600/15 text-teal-700">
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

        {/* "What changed this week" CTA — hidden for premium users (they already get it). */}
        {!isPremium && (
          <div className="rounded-2xl border border-sky/20 overflow-hidden shadow-eup-sm mb-10">
            <div className="bg-gradient-to-br from-navy to-navy-mid px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-1">
                  ⭐ Weekly Intelligence
                </div>
                <h3 className="font-display text-[14px] text-white">
                  {intelligenceLabel || "What changed in this area this week"}
                </h3>
              </div>
              <Lock className="w-4 h-4 text-sky/50 shrink-0" />
            </div>
            <div className="relative bg-card px-5 py-4">
              <div className="space-y-2 blur-[3px] select-none pointer-events-none">
                <div className="h-2.5 bg-navy/10 rounded w-full" />
                <div className="h-2.5 bg-navy/10 rounded w-4/5" />
                <div className="h-2.5 bg-navy/10 rounded w-3/4" />
                <div className="h-2.5 bg-navy/10 rounded w-full mt-2" />
                <div className="h-2.5 bg-navy/10 rounded w-2/3" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] px-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                  <Lock className="w-4 h-4 text-navy/40 shrink-0" />
                  <span className="text-[12px] text-navy font-medium">
                    {midPageCtaMessage || "Intelligence subscribers get full analysis on every development in this area."}
                  </span>
                  <Link
                    to="/subscribe"
                    className="text-[11px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-3 py-1.5 rounded-lg no-underline hover:opacity-90 transition-all whitespace-nowrap"
                  >
                    Get full intelligence →
                  </Link>
                </div>
              </div>
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
                  <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
                  <div
                    className="text-[14px] text-slate leading-relaxed whitespace-pre-line"
                    dangerouslySetInnerHTML={{
                      __html: sec.content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-navy font-semibold">$1</strong>'),
                    }}
                  />
                </div>
                {i === Math.floor(sections.length / 2) - 1 && (
                  <AdBanner variant="inline" adSlot={`eup-pillar-mid`} className="py-4" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom tool CTA */}
        {toolCta && (
          <div className="mt-12">
            <div className="rounded-xl border border-sky/20 bg-gradient-to-br from-navy to-navy-mid px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest uppercase text-sky-300 mb-1">Intelligence plan tool</p>
                <h3 className="font-display text-[16px] text-white mb-1">{toolCta.heading}</h3>
                <p className="text-[13px] text-slate-light leading-relaxed">{toolCta.description}</p>
              </div>
              <Link
                to={toolCta.link}
                className="shrink-0 text-[12px] px-5 py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 transition-colors whitespace-nowrap no-underline"
              >
                {toolCta.linkLabel}
              </Link>
            </div>
          </div>
        )}

        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-fog">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium"
              >
                <span className="text-blue">→</span> {link.label}
              </Link>
            ))}
          </div>
          {directoryLink && (
            <div className="mt-6">
              <Link
                to={directoryLink.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline"
              >
                {directoryLink.label} →
              </Link>
            </div>
          )}
        </div>

        <AdBanner variant="leaderboard" adSlot={`eup-pillar-bottom`} className="py-6" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Weekly Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly intelligence on {title}</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">
            Intelligence subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.
          </p>
          <Link
            to="/subscribe"
            className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline"
          >
            Get full intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PillarPage;
