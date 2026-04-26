import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
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
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const [captureEmail, setCaptureEmail] = useState("");
  const [captureSent, setCaptureSent] = useState(false);

  const tier: "anonymous" | "free" | "premium" = !user ? "anonymous" : isPremium ? "premium" : "free";

  const trackRecentDevClick = (a: any) => {
    try {
      (window as any).plausible?.("Recent Dev Click", {
        props: {
          tier,
          pillar: title,
          source: a.source_name || "unknown",
          article_id: a.id,
          url: a.url,
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

      if (data) setRecentArticles(data);
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
        <title>{title} — Privacy Law Guide 2026 | Your Privacy Hub</title>
        <meta name="description" content={subtitle} />
        <meta property="og:title" content={`${title} | Your Privacy Hub`} />
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

      {/* Recent Developments — moved above the fold, tier-aware */}
      {recentArticles.length > 0 && (
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display text-base text-navy">Recent developments</h2>
            <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-teal-600/15 text-teal-700">
              Live
            </span>
            <span className="text-[11px] text-slate ml-auto">
              {user ? (isPremium ? "Showing all updates" : "Free account") : `Showing 3 of ${recentArticles.length}`}
            </span>
          </div>

          {/* Anonymous tier */}
          {!user && (
            <>
              <div className="divide-y divide-fog">
                {recentArticles.slice(0, 3).map((a: any) => {
                  const TitleEl: any = a.url ? "a" : "div";
                  const titleProps = a.url
                    ? { href: a.url, target: "_blank", rel: "noopener noreferrer" }
                    : {};
                  return (
                    <div key={a.id} className="py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        {a.source_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{a.source_name}</span>
                        )}
                        {a.published_at && (
                          <span className="text-[10px] text-slate">
                            {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <TitleEl
                        {...titleProps}
                        className={`text-[13px] font-medium text-navy leading-snug inline-flex items-start gap-1.5 no-underline ${a.url ? "hover:text-sky-700 hover:underline cursor-pointer" : ""}`}
                      >
                        <span>{a.title}</span>
                        {a.url && <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate" />}
                      </TitleEl>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-4 border border-dashed border-fog rounded-xl text-center bg-slate-50">
                <p className="text-[12px] text-slate mb-3">
                  {Math.max(0, recentArticles.length - 3)} more updates — plus analysis on each
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Link
                    to="/signup"
                    className="text-[12px] px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-500 transition-colors no-underline"
                  >
                    Create free account
                  </Link>
                  <Link
                    to="/subscribe"
                    className="text-[12px] px-4 py-2 rounded-lg border border-fog text-navy font-medium hover:bg-slate-50 transition-colors no-underline"
                  >
                    Intelligence plan — $39/month
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Free registered tier */}
          {user && !isPremium && (
            <>
              <div className="divide-y divide-fog">
                {recentArticles.slice(0, 6).map((a: any) => {
                  const TitleEl: any = a.url ? "a" : "div";
                  const titleProps = a.url
                    ? { href: a.url, target: "_blank", rel: "noopener noreferrer" }
                    : {};
                  return (
                    <div key={a.id} className="py-3 group">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {a.source_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{a.source_name}</span>
                        )}
                        {a.published_at && (
                          <span className="text-[10px] text-slate">
                            {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <TitleEl
                        {...titleProps}
                        className={`text-[13px] font-medium text-navy leading-snug inline-flex items-start gap-1.5 mb-1 no-underline ${a.url ? "hover:text-sky-700 hover:underline cursor-pointer" : ""}`}
                      >
                        <span>{a.title}</span>
                        {a.url && <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate" />}
                      </TitleEl>
                      {a.summary && (
                        <p className="text-[12px] text-slate leading-relaxed line-clamp-2">{a.summary}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-right">
                <Link to="/updates" className="text-[12px] text-sky-700 hover:underline">
                  See all updates →
                </Link>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-200/60 flex items-center gap-3">
                <p className="text-[12px] text-navy flex-1">
                  Intelligence subscribers see analysis — regulatory theory, cross-jurisdiction signals, and action items — on every update.
                </p>
                <Link
                  to="/subscribe"
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-navy text-white font-medium whitespace-nowrap hover:bg-navy-mid transition-colors shrink-0 no-underline"
                >
                  Get Intelligence →
                </Link>
              </div>
            </>
          )}

          {/* Intelligence subscriber tier */}
          {user && isPremium && (
            <>
              <div className="divide-y divide-fog">
                {recentArticles.map((a: any) => {
                  const TitleEl: any = a.url ? "a" : "div";
                  const titleProps = a.url
                    ? { href: a.url, target: "_blank", rel: "noopener noreferrer" }
                    : {};
                  return (
                    <div key={a.id} className="py-3 group">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {a.ai_summary?.urgency && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              a.ai_summary.urgency === "immediate"
                                ? "bg-red-100 text-red-800"
                                : a.ai_summary.urgency === "this-quarter"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {a.ai_summary.urgency === "immediate"
                              ? "High urgency"
                              : a.ai_summary.urgency === "this-quarter"
                              ? "Medium urgency"
                              : "Monitor"}
                          </span>
                        )}
                        {a.source_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{a.source_name}</span>
                        )}
                        {a.published_at && (
                          <span className="text-[10px] text-slate">
                            {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <TitleEl
                        {...titleProps}
                        className={`text-[13px] font-medium text-navy leading-snug inline-flex items-start gap-1.5 mb-1 no-underline ${a.url ? "hover:text-sky-700 hover:underline cursor-pointer" : ""}`}
                      >
                        <span>{a.title}</span>
                        {a.url && <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate" />}
                      </TitleEl>
                      {a.ai_summary?.why_it_matters && (
                        <p className="text-[12px] text-slate leading-relaxed line-clamp-2">{a.ai_summary.why_it_matters}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-right">
                <Link to="/updates" className="text-[12px] text-sky-700 hover:underline">
                  See all updates →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <AdBanner variant="leaderboard" adSlot={`eup-pillar-top`} className="py-3" />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <p className="text-[15px] text-navy leading-relaxed">{intro}</p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, i) => (
            <React.Fragment key={i}>
              <div>
                <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
                <div
                  className="text-[14px] text-slate leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{
                    __html: sec.content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-navy font-semibold">$1</strong>'),
                  }}
                />
              </div>
              {i === Math.floor(sections.length / 2) - 1 && (
                <>
                  <AdBanner variant="inline" adSlot={`eup-pillar-mid`} className="py-4" />
                  {/* Mid-content premium teaser */}
                  <div className="rounded-2xl border border-sky/20 overflow-hidden shadow-eup-sm my-2">
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
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-3">
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
                </>
              )}
            </React.Fragment>
          ))}
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
