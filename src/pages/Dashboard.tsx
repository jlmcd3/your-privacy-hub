import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import OnboardingModal from "@/components/OnboardingModal";
import ReportCredits from "@/components/dashboard/ReportCredits";
import PremiumGate from "@/components/PremiumGate";
import { CitedParagraphs } from "@/components/brief/CitedText";
import { SourcesList } from "@/components/brief/SourcesList";
import type { SourceMap } from "@/components/brief/CitedText";
import { ExternalLink, Loader2 } from "lucide-react";

interface EnforcementRow {
  regulator: string;
  jurisdiction: string;
  action_type: string;
  subject: string;
  amount: string;
  significance: string;
}

interface WeeklyBrief {
  id: string;
  week_label: string;
  headline: string;
  executive_summary: string;
  us_federal: string | null;
  us_states: string | null;
  eu_uk: string | null;
  global_developments: string | null;
  ai_governance: string | null;
  adtech_advertising: string | null;
  biometric_data: string | null;
  privacy_litigation: string | null;
  enforcement_trends: string | null;
  enforcement_table: EnforcementRow[] | null;
  cross_jurisdiction_patterns: string | null;
  trend_signal: string | null;
  why_this_matters: string | null;
  article_count: number;
  published_at: string;
  source_map: Record<string, { title: string; url: string; source: string }> | null;
}

const ACTION_COLOR: Record<string, string> = {
  Fine: "bg-red-50 text-red-700 border-red-200",
  Investigation: "bg-amber-50 text-amber-700 border-amber-200",
  Guidance: "bg-blue-50 text-blue-700 border-blue-200",
  Lawsuit: "bg-purple-50 text-purple-700 border-purple-200",
  Rulemaking: "bg-green-50 text-green-700 border-green-200",
};

function SectionBlock({ icon, title, content, sourceMap }: { icon: string; title: string; content: string | null; sourceMap: SourceMap }) {
  if (!content) return null;
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-display text-[17px] text-foreground mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
        <CitedParagraphs content={content} sourceMap={sourceMap} />
      </div>
      <SourcesList sourceMap={sourceMap} usedIn={content} />
    </section>
  );
}

/** Truncate to first N sentences for the free-user teaser */
function truncateToSentences(text: string | null, count = 2): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text.slice(0, 150) + "…";
  return sentences.slice(0, count).join("").trim();
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [customBrief, setCustomBrief] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [reportsUsed, setReportsUsed] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [genPhase, setGenPhase] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const GEN_PHASES = [
    "Your Intelligence brief is reading this week's regulatory developments…",
    "Analyzing implications for your industry…",
    "Writing your personalized brief…",
  ];

  const generateBriefNow = useCallback(async () => {
    setGenerating(true);
    setGenPhase(0);
    const phaseInterval = setInterval(() => {
      setGenPhase(p => Math.min(p + 1, 2));
    }, 8000);

    try {
      const { data, error } = await supabase.functions.invoke("generate-brief-on-demand");
      if (!error && data?.brief) {
        setCustomBrief(data.brief);
        setReportsUsed(prev => prev + 1);
        if (data.bonus_credits_remaining !== undefined) {
          setBonusCredits(data.bonus_credits_remaining);
        }
      }
    } catch (e) {
      console.error("Brief generation failed:", e);
    } finally {
      clearInterval(phaseInterval);
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login?redirect=/dashboard"); return; }
    supabase
      .from("profiles")
      .select("is_premium, bonus_report_credits, monthly_reports_used, reports_reset_date, onboarding_complete")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const premium = data?.is_premium ?? false;
        setIsPremium(premium);
        // Show onboarding for free users who haven't completed it
        if (!premium && !(data as any)?.onboarding_complete) {
          setShowOnboarding(true);
        }
        setBonusCredits((data as any)?.bonus_report_credits ?? 0);

        // Use profiles.monthly_reports_used (server-side source of truth)
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const resetDate = (data as any)?.reports_reset_date ? new Date((data as any).reports_reset_date) : null;
        const used = (resetDate && resetDate >= monthStart) ? ((data as any)?.monthly_reports_used ?? 0) : 0;
        setReportsUsed(used);
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await (supabase as any)
        .from("weekly_briefs")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setBrief(data as WeeklyBrief | null);
      setLoading(false);
    }
    load();
  }, [user]);

  // Fetch custom brief for Pro users
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }: any) => setCustomBrief(data));
  }, [user]);

  // Handle credits_purchased redirect from Stripe
  useEffect(() => {
    const purchased = searchParams.get("credits_purchased");
    if (purchased) {
      setBonusCredits(prev => prev + parseInt(purchased, 10));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (authLoading || isPremium === null) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Intelligence Dashboard | EndUserPrivacy</title>
          <meta name="description" content="Your personalized privacy intelligence dashboard." />
        </Helmet>
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  if (!isPremium) {
    // Free users still see the brief — but with Pro upsell
    return (
      <div className="min-h-screen bg-background">
        {showOnboarding && user && (
          <OnboardingModal userId={user.id} onComplete={() => setShowOnboarding(false)} />
        )}
        <Helmet>
          <title>Intelligence Dashboard | EndUserPrivacy</title>
        </Helmet>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Premium upsell banner */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                ⭐ Upgrade to Premium
              </div>
              <h3 className="font-display font-bold text-white text-[18px] mb-2">
                Get this brief re-written for your industry
              </h3>
              <p className="text-blue-200 text-[13px] mb-4 max-w-md mx-auto">
                Same intelligence, re-analyzed from your perspective. Sector-specific
                action items. Your jurisdiction focus. $20/month.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/subscribe"
                  className="bg-white text-navy font-bold text-[14px] py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  Get Premium — $20/month →
                </Link>
              </div>
            </div>
          </div>

          {/* Brief header */}
          <div className="mb-10">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
              📋 Weekly Intelligence Brief
            </p>
            <h1 className="font-display text-[28px] md:text-[34px] text-foreground leading-tight">
              {loading ? "Loading this week's brief..." : brief?.headline ?? "No brief available yet"}
            </h1>
            {brief && (
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[13px] text-muted-foreground">
                <span>{brief.week_label}</span>
                <span>·</span>
                <span>{brief.article_count} regulatory updates synthesized</span>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !brief && (
            <div className="text-center py-20">
              <p className="text-4xl mb-4">📅</p>
              <p className="font-display text-[20px] text-foreground mb-2">First brief coming Monday</p>
              <p className="text-[14px] text-muted-foreground max-w-md mx-auto">
                Your weekly intelligence brief is generated every Monday at 7am UTC from the past week's regulatory activity. Check back then.
              </p>
            </div>
          )}

          {!loading && brief && (
            <>
              <div className="space-y-8">
                {/* 1. Executive Summary — show in full (the hook) */}
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                  <h2 className="font-display text-[20px] text-foreground mb-4">Executive Summary</h2>
                  <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                    <CitedParagraphs content={brief.executive_summary} sourceMap={brief.source_map ?? {}} />
                  </div>
                  <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.executive_summary} />
                </section>

                {/* 2. First section preview — show in full */}
                <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" content={brief.us_federal} sourceMap={brief.source_map ?? {}} />

                {/* 3. Remaining sections — title + 2 sentences + blur gate */}
                {[
                  { icon: "🏛️", title: "U.S. State Analysis", content: brief.us_states },
                  { icon: "🇪🇺", title: "EU & UK Analysis", content: brief.eu_uk },
                  { icon: "🌍", title: "Global Developments", content: brief.global_developments },
                  { icon: "🤖", title: "AI Governance", content: brief.ai_governance },
                  { icon: "📡", title: "AdTech & Advertising Privacy", content: brief.adtech_advertising },
                  { icon: "👁️", title: "Biometric Data", content: brief.biometric_data },
                  { icon: "🏛️", title: "Privacy Litigation", content: brief.privacy_litigation },
                ].filter(s => s.content).map((s) => (
                  <PremiumGate
                    key={s.title}
                    message="Your personalized analyst covers this section in full — tailored to your industry and jurisdictions."
                  >
                    <SectionBlock icon={s.icon} title={s.title} content={s.content} sourceMap={brief.source_map ?? {}} />
                  </PremiumGate>
                ))}

                {/* Cross-jurisdiction patterns — show as teaser */}
                {brief.cross_jurisdiction_patterns && (
                  <section className="bg-violet-50/50 rounded-xl border border-violet-200/50 p-6">
                    <h3 className="font-display text-[17px] text-foreground mb-3">
                      🌐 Cross-Jurisdiction Patterns
                    </h3>
                    <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                      <CitedParagraphs content={brief.cross_jurisdiction_patterns} sourceMap={brief.source_map ?? {}} />
                    </div>
                  </section>
                )}

                {/* 4. Enforcement Trends — gated */}
                {brief.enforcement_trends && (
                  <PremiumGate message="Premium subscribers see full enforcement trend analysis relevant to their sector.">
                    <SectionBlock icon="📊" title="Enforcement Trends" content={brief.enforcement_trends} sourceMap={brief.source_map ?? {}} />
                  </PremiumGate>
                )}

                {/* 5. Trend Signal — fully gated */}
                {brief.trend_signal && (
                  <PremiumGate message="Trend signals are included in Premium. See emerging patterns before they become headlines." />
                )}

                {/* 6. Why This Matters — fully gated */}
                {brief.why_this_matters && (
                  <PremiumGate message="Action items and 'Why This Matters' analysis is included in Premium." />
                )}
              </div>

              {/* Intelligence Builder CTA */}
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5
                flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="font-bold text-navy text-[15px] mb-1">
                    Want this analysis written for your practice?
                  </p>
                  <p className="text-[13px] text-slate">
                    Build a personalized Intelligence Report in 60 seconds — free to configure.
                  </p>
                </div>
                <Link to="/get-intelligence"
                  className="flex-shrink-0 bg-navy text-white font-bold text-[13px] px-5 py-2.5
                    rounded-xl hover:opacity-90 no-underline transition-all">
                  Get Your Intelligence →
                </Link>
              </div>

              {/* Intelligence Preview — blurred industry example */}
              <section className="mt-10 bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-6 pt-5 pb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">Intelligence Preview</p>
                  <h3 className="font-display font-bold text-foreground text-[17px] mb-1">What your personalized brief would add</h3>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Financial Services example
                  </span>
                </div>
                <div className="px-6 pb-2">
                  <div className="filter blur-sm pointer-events-none select-none">
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      For financial services firms operating in the EU and US, this week's EDPB guidance on legitimate interest carries direct implications for behavioral targeting in banking apps. The simultaneous FTC enforcement action against data brokers creates a convergent compliance obligation: your existing Article 6(1)(f) assessment likely needs updating before Q3, and your US data broker contracts should be reviewed against the FTC's newly articulated unreasonable data practice standard. Suggested action: instruct counsel to cross-map your current LIA documentation against both the EDPB guidance and FTC criteria before your next DPO review.
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-3 text-center">
                  <p className="text-[12px] text-muted-foreground mb-3 italic">This analysis is written for your industry and jurisdictions</p>
                  <Link
                    to="/subscribe"
                    className="inline-block bg-amber-400 text-navy font-bold text-[13px] px-6 py-2.5 rounded-xl no-underline hover:bg-amber-300 transition-colors"
                  >
                    Get Intelligence — $20/month →
                  </Link>
                </div>
              </section>

            </>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Intelligence Dashboard | EndUserPrivacy</title>
        <meta name="description" content="Your personalized privacy intelligence dashboard. Access your weekly digest, enforcement tracker, and regulatory updates." />
      </Helmet>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
            📋 Weekly Intelligence Brief
          </p>
          <h1 className="font-display text-[28px] md:text-[34px] text-foreground leading-tight">
            {loading ? "Loading this week's brief..." : brief?.headline ?? "No brief available yet"}
          </h1>
          {brief && (
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[13px] text-muted-foreground">
              <span>{brief.week_label}</span>
              <span>·</span>
              <span>{brief.article_count} regulatory updates synthesized</span>
              <span>·</span>
              <span>Published {new Date(brief.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
            </div>
          )}
        </div>

        {/* Generate Brief Now CTA for Pro users with no custom brief */}
        {!customBrief && !generating && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-8 mb-8 text-center">
            <p className="text-4xl mb-3">🧠</p>
            <h3 className="font-display font-bold text-foreground text-[20px] mb-2">
              Your personalized brief is ready to generate
            </h3>
            <p className="text-muted-foreground text-[14px] mb-5 max-w-md mx-auto">
              You've set your preferences. Your Intelligence brief is ready to generate. This takes about 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={generateBriefNow}
                className="bg-gradient-to-br from-navy to-blue text-white font-bold text-[14px] py-3 px-8 rounded-xl hover:opacity-90 transition-all cursor-pointer border-none"
              >
                Generate My Brief Now →
              </button>
              <Link
                to="/brief-preferences"
                className="text-primary font-medium text-[14px] py-3 px-6 rounded-xl border border-border no-underline hover:bg-muted transition-all"
              >
                Edit preferences first
              </Link>
            </div>
          </div>
        )}

        {/* Generating spinner */}
        {generating && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-8 mb-8 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-foreground font-semibold text-[15px] mb-1">
              {GEN_PHASES[genPhase]}
            </p>
            <p className="text-muted-foreground text-[13px]">This usually takes 20-40 seconds.</p>
          </div>
        )}

        {/* Report credits — shown near top so usage state is visible on arrival */}
        <ReportCredits reportsUsed={reportsUsed} bonusCredits={bonusCredits} />

        {/* Custom brief for Pro users — 9-section display */}
        {customBrief && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-6 mb-8">

            {/* Pro brief header */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                ⭐ Your Personalized Brief — {customBrief.week_label}
              </span>
              <Link to="/brief-preferences" className="text-[11px] text-primary hover:text-foreground no-underline ml-auto">
                Edit preferences →
              </Link>
            </div>

            {/* Critical alert — shown first, most prominent */}
            {customBrief.custom_sections?.your_critical_alert && (
              <div className={`rounded-xl px-5 py-4 mb-5 ${
                customBrief.custom_sections.your_critical_alert.startsWith("Monitor week")
                  ? "bg-blue-50 border border-blue-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  customBrief.custom_sections.your_critical_alert.startsWith("Monitor week")
                    ? "text-blue-600"
                    : "text-red-700"
                }`}>
                  {customBrief.custom_sections.your_critical_alert.startsWith("Monitor week")
                    ? "📊 This week: monitoring mode"
                    : "⚡ Critical alert this week"
                  }
                </p>
                <p className={`text-[14px] font-semibold leading-snug ${
                  customBrief.custom_sections.your_critical_alert.startsWith("Monitor week")
                    ? "text-blue-800"
                    : "text-red-800"
                }`}>
                  {customBrief.custom_sections.your_critical_alert}
                </p>
              </div>
            )}

            {/* Opening headline */}
            {customBrief.custom_sections?.opening_headline && (
              <h2 className="font-display font-bold text-foreground text-[20px] leading-snug mb-5">
                {customBrief.custom_sections.opening_headline}
              </h2>
            )}

            {/* Your week */}
            {customBrief.custom_sections?.your_week && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">Your Week</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.your_week} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.your_week} />
              </section>
            )}

            {/* Industry intelligence */}
            {customBrief.custom_sections?.industry_intelligence && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">Industry Intelligence</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.industry_intelligence} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.industry_intelligence} />
              </section>
            )}

            {/* Jurisdiction developments */}
            {customBrief.custom_sections?.jurisdiction_developments && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">Your Jurisdictions This Week</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.jurisdiction_developments} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.jurisdiction_developments} />
              </section>
            )}

            {/* Topic depth */}
            {customBrief.custom_sections?.topic_depth && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">Your Subject-Matter Focus</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.topic_depth} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.topic_depth} />
              </section>
            )}

            {/* What to ignore */}
            {customBrief.custom_sections?.what_to_ignore && (
              <section className="bg-muted rounded-xl p-4 mb-5">
                <h3 className="font-semibold text-muted-foreground text-[12px] uppercase tracking-wider mb-2">📭 What to deprioritize this week</h3>
                <div className="text-[13px] text-muted-foreground leading-relaxed space-y-2">
                  <CitedParagraphs content={customBrief.custom_sections.what_to_ignore} sourceMap={brief?.source_map ?? {}} />
                </div>
              </section>
            )}

            {/* Action items */}
            {customBrief.custom_sections?.your_action_items?.length > 0 && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-3">🎯 Your Action Items</h3>
                <div className="space-y-3">
                  {customBrief.custom_sections.your_action_items.map((item: any, i: number) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.priority === "Immediate"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : item.priority?.includes("quarter")
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-[14px] font-semibold text-foreground mb-1">{item.action}</p>
                      <p className="text-[12px] text-muted-foreground">{item.why_now}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Enforcement pattern */}
            {customBrief.custom_sections?.enforcement_pattern_for_you && (
              <section className="mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">⚖️ Enforcement Pattern for Your Sector</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.enforcement_pattern_for_you} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.enforcement_pattern_for_you} />
              </section>
            )}

            {/* Continuity from Last Week */}
            {customBrief.custom_sections?.continuity_from_last_week && (
              <section className="bg-card rounded-xl border border-border p-4 mb-5">
                <h3 className="font-semibold text-foreground text-[14px] uppercase tracking-wider mb-2">🔄 Continuity from Last Week</h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={customBrief.custom_sections.continuity_from_last_week} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.continuity_from_last_week} />
              </section>
            )}

            {/* Look ahead */}
            {customBrief.custom_sections?.look_ahead && (
              <section className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 text-[12px] uppercase tracking-wider mb-2">📅 Compliance Calendar Preview</h3>
                <div className="text-[13px] text-amber-800 leading-relaxed space-y-2">
                  <CitedParagraphs content={customBrief.custom_sections.look_ahead} sourceMap={brief?.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.look_ahead} />
              </section>
            )}

          </div>
        )}

        {loading && (
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !brief && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📅</p>
            <p className="font-display text-[20px] text-foreground mb-2">First brief coming Monday</p>
            <p className="text-[14px] text-muted-foreground max-w-md mx-auto">
              Your weekly intelligence brief is generated every Monday at 7am UTC from the past week's regulatory activity. Check back then.
            </p>
          </div>
        )}

        {!loading && brief && (
          <>
            <div className="space-y-8">
              {/* Executive Summary */}
              <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                <h2 className="font-display text-[20px] text-foreground mb-4">Executive Summary</h2>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.executive_summary} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.executive_summary} />
              </section>

            {/* Analysis sections */}
            <div className="grid gap-6">
              <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" content={brief.us_federal} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🏛️" title="U.S. State Analysis" content={brief.us_states} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🇪🇺" title="EU & UK Analysis" content={brief.eu_uk} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🌍" title="Global Developments" content={brief.global_developments} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🤖" title="AI Governance" content={brief.ai_governance} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="📡" title="AdTech & Advertising Privacy" content={brief.adtech_advertising} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="👁️" title="Biometric Data" content={brief.biometric_data} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🏛️" title="Privacy Litigation" content={brief.privacy_litigation} sourceMap={brief.source_map ?? {}} />
            </div>

            {/* Enforcement table */}
            {brief.enforcement_table && brief.enforcement_table.length > 0 && (
              <section className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-[17px] text-foreground mb-4">
                  ⚖️ Enforcement Actions This Week
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Regulator</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Subject</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Amount</th>
                        <th className="py-2 font-semibold text-muted-foreground">Significance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brief.enforcement_table.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-3 pr-4 text-foreground font-medium">
                            {row.regulator}
                            <div className="text-[11px] text-muted-foreground">{row.jurisdiction}</div>
                          </td>
                          <td className="py-3 pr-4 text-foreground">{row.subject}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ACTION_COLOR[row.action_type] || "bg-muted text-muted-foreground border-border"}`}>
                              {row.action_type}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-foreground font-semibold">{row.amount}</td>
                          <td className="py-3 text-muted-foreground text-[12px]">{row.significance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Cross-jurisdiction patterns */}
            {brief.cross_jurisdiction_patterns && (
              <section className="bg-violet-50/50 rounded-xl border border-violet-200/50 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  🌐 Cross-Jurisdiction Patterns
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.cross_jurisdiction_patterns} sourceMap={brief.source_map ?? {}} />
                </div>
              </section>
            )}

            {/* Enforcement trends */}
            <SectionBlock icon="📊" title="Enforcement Trends" content={brief.enforcement_trends} sourceMap={brief.source_map ?? {}} />

            {/* Trend signal */}
            {brief.trend_signal && (
              <section className="bg-amber-50/50 rounded-xl border border-amber-200/50 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  📡 Trend Signal
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.trend_signal} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.trend_signal ?? ""} />
              </section>
            )}

            {/* Why this matters */}
            {brief.why_this_matters && (
              <section className="bg-primary/5 rounded-xl border border-primary/15 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  🎯 Why This Matters — Action Items for This Week
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.why_this_matters} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.why_this_matters ?? ""} />
              </section>
            )}
            </div>

            {/* Full sources reference */}
            {brief.source_map && Object.keys(brief.source_map).length > 0 && (
              <section className="bg-card rounded-xl border border-border p-6 mt-2">
                <h3 className="font-display text-[17px] text-foreground mb-3 flex items-center gap-2">
                  <span>📚</span> All Source Articles This Week
                </h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  {Object.keys(brief.source_map).length} articles monitored and synthesized to produce this brief. Click any title to read the original.
                </p>
                <div className="grid gap-2">
                  {Object.entries(brief.source_map)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([num, src]) => (
                      <a
                        key={num}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-muted-foreground hover:bg-muted/40 transition-all no-underline group"
                      >
                        <span className="text-[11px] font-bold text-muted-foreground flex-shrink-0 w-6 text-right mt-0.5">
                          [{num}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {src.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{src.source}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                </div>
              </section>
            )}



          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
