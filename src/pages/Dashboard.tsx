import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import OnboardingModal from "@/components/OnboardingModal";

import PremiumToolsSection from "@/components/dashboard/PremiumToolsSection";
import DigestPreferences from "@/components/DigestPreferences";
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
  top_enforcement_signals?: TopEnforcementSignal[] | null;
}

interface TopEnforcementSignal {
  id: string;
  regulator: string;
  jurisdiction: string;
  subject: string | null;
  summary: string | null;
  fine: string | null;
  fine_eur_equivalent: number | null;
  decision_date: string | null;
  precedent_significance: number | null;
  sector: string | null;
  violation_types: string[] | null;
  source_url: string | null;
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
    <section className="py-7 border-b border-slate-100 last:border-0">
      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
        <span className="mr-2">{icon}</span>{title}
      </h3>
      <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
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
  const [subscriptionInterval, setSubscriptionInterval] = useState<string | null>(null);
  const [customBrief, setCustomBrief] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDigestPrefs, setShowDigestPrefs] = useState(false);
  const [digestPrefsSet, setDigestPrefsSet] = useState(false);
  const [freeDigest, setFreeDigest] = useState<any>(null);

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
      .select("is_premium, subscription_interval, bonus_report_credits, monthly_reports_used, reports_reset_date, onboarding_complete, digest_jurisdictions, digest_topics")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const premium = data?.is_premium ?? false;
        setIsPremium(premium);
        setSubscriptionInterval((data as any)?.subscription_interval ?? null);
        // Show onboarding for free users who haven't completed it
        if (!premium && !(data as any)?.onboarding_complete) {
          setShowOnboarding(true);
        }
        setDigestPrefsSet(
          Array.isArray((data as any)?.digest_jurisdictions) &&
          (data as any).digest_jurisdictions.length > 0
        );
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

  // Fetch free digest for non-premium users
  useEffect(() => {
    if (!user || isPremium) return;
    (supabase as any)
      .from("free_digests")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setFreeDigest(data); });
  }, [user, isPremium]);


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
    return (
      <div className="min-h-screen bg-background">
        {showOnboarding && user && (
          <OnboardingModal userId={user.id} onComplete={() => setShowOnboarding(false)} />
        )}
        {showDigestPrefs && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
              <h2 className="font-display font-bold text-navy text-[20px] mb-6">
                Your weekly digest
              </h2>
              <DigestPreferences
                userId={user.id}
                onSave={() => { setShowDigestPrefs(false); setDigestPrefsSet(true); }}
                onSkip={() => setShowDigestPrefs(false)}
              />
            </div>
          </div>
        )}
        <Helmet>
          <title>Intelligence Dashboard | EndUserPrivacy</title>
        </Helmet>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Premium upsell banner */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                ⭐ Upgrade to Premium
              </div>
              <h3 className="font-display font-bold text-white text-[18px] mb-2">
                This brief, re-analyzed for your practice
              </h3>
              <p className="text-blue-200 text-[13px] mb-4 max-w-md mx-auto">
                Your weekly digest tells you what happened. Premium tells you what it means
                for your industry, what your priorities are, and what to do about it. $20/month.
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

          {/* Digest preferences prompt */}
          {!digestPrefsSet && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-semibold text-navy text-[14px] mb-1">Set up your weekly digest</p>
                <p className="text-slate text-[13px]">Choose 2 regions and 2 topics to receive a personalized weekly update every Monday.</p>
              </div>
              <button onClick={() => setShowDigestPrefs(true)} className="flex-shrink-0 bg-navy text-white font-semibold text-[13px] px-4 py-2 rounded-xl border-none cursor-pointer hover:opacity-90">
                Set up digest →
              </button>
            </div>
          )}

          {/* Digest card */}
          {digestPrefsSet && (
            <div className="bg-card border border-fog rounded-2xl overflow-hidden">
              <div className="bg-navy px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Your Weekly Digest</p>
                  <p className="text-white text-[13px]">{freeDigest ? freeDigest.week_label : "Your first digest arrives Monday"}</p>
                </div>
                <button onClick={() => setShowDigestPrefs(true)} className="text-[11px] text-blue-200/60 hover:text-blue-200 bg-transparent border-none cursor-pointer transition-colors">Edit preferences</button>
              </div>

              {!freeDigest && (
                <div className="px-6 py-12 text-center">
                  <p className="text-[32px] mb-3">📅</p>
                  <p className="font-display font-bold text-navy text-[18px] mb-2">First digest arrives Monday</p>
                  <p className="text-slate text-[14px] max-w-sm mx-auto">Your personalized digest is generated every Monday morning from the previous week's regulatory activity in your selected regions and topics.</p>
                </div>
              )}

              {freeDigest && freeDigest.digest_items?.length > 0 && (
                <div className="divide-y divide-fog">
                  {freeDigest.digest_items.map((item: any, i: number) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 px-6 py-4 no-underline hover:bg-fog/50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-medium text-steel">{item.region_label}</span>
                          <span className="text-[11px] text-slate-light">·</span>
                          <span className="text-[11px] text-slate-light">{item.source_name}</span>
                        </div>
                        <p className="text-[14px] font-semibold text-navy leading-snug group-hover:text-steel transition-colors mb-1">{item.title}</p>
                        {item.summary && <p className="text-[12px] text-slate leading-relaxed line-clamp-2">{item.summary}</p>}
                      </div>
                      <span className="text-slate-light text-[18px] flex-shrink-0 mt-0.5">→</span>
                    </a>
                  ))}
                </div>
              )}

              {freeDigest?.pattern_observation && (
                <div className="px-6 py-4 bg-blue-50/50 border-t border-fog">
                  <p className="text-[13px] text-steel leading-relaxed"><span className="font-semibold">This week: </span>{freeDigest.pattern_observation}</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-fog flex items-center justify-between gap-4">
                <p className="text-[13px] text-slate">Get Premium for analysis, priorities, and action items.</p>
                <Link to="/subscribe" className="flex-shrink-0 text-[12px] font-bold text-navy bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg no-underline transition-colors">Get Premium →</Link>
              </div>
            </div>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subscription plan status */}
        <div className="mb-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display font-bold text-foreground text-[16px]">
                {subscriptionInterval === "year" ? "⭐ Premium Annual" : "⭐ Premium Monthly"}
              </span>
              {subscriptionInterval === "year" && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  Best Value
                </span>
              )}
            </div>
            <Link to="/account" className="text-[12px] font-semibold text-primary hover:underline no-underline">
              Manage →
            </Link>
          </div>
          {subscriptionInterval === "year" && (
            <p className="text-[12px] text-muted-foreground mb-4">
              Annual plan — saving $60/year vs monthly billing.
            </p>
          )}

          {/* Tool pricing reminder */}
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-steel mb-3">
              Your subscriber tool pricing
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <Link
                to="/governance-assessment"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Healthcheck</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$15</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $14 vs standard</p>
              </Link>
              <Link
                to="/li-assessment"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">LI Analyzer</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$19</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $20 vs standard</p>
              </Link>
              <Link
                to="/dpia-framework"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">DPIA Builder</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$39</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $30 vs standard</p>
              </Link>
              <Link
                to="/dpa-generator"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">DPA Generator</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$39</span>
                  <span className="text-muted-foreground"> /document</span>
                </p>
                <p className="text-[10px] text-green-700">Save $30 vs standard</p>
              </Link>
              <Link
                to="/ir-playbook"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">IR Playbook</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">Included free</span>
                </p>
                <p className="text-[10px] text-green-700">Free with your subscription</p>
              </Link>
              <Link
                to="/biometric-checker"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Biometric Checker</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">Included free</span>
                </p>
                <p className="text-[10px] text-green-700">Free with your subscription</p>
              </Link>
            </div>
          </div>
        </div>

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

        {/* Custom brief for Pro users — document layout */}
        {customBrief && (
          <div className="bg-slate-100 rounded-2xl p-4 md:p-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">

              {/* Document header */}
              <div className="bg-gradient-to-r from-navy to-steel px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                    ⭐ Your Personalized Brief — {customBrief.week_label}
                  </span>
                  <Link to="/brief-preferences" className="text-[11px] text-blue-300 hover:text-white no-underline">
                    Edit preferences →
                  </Link>
                </div>
                {customBrief.custom_sections?.opening_headline && (
                  <h2 className="font-display text-[18px] md:text-[22px] text-white font-bold leading-tight">
                    {customBrief.custom_sections.opening_headline}
                  </h2>
                )}
              </div>

              {/* Section content */}
              <div className="px-6 py-2 divide-y divide-slate-100">

                {/* Critical alert */}
                {customBrief.custom_sections?.your_critical_alert && (
                  <section className="py-5">
                    <div className={`rounded-lg px-4 py-3 ${
                      customBrief.custom_sections.your_critical_alert.startsWith("Monitor week")
                        ? "bg-blue-50 border-l-4 border-blue-400"
                        : "bg-red-50 border-l-4 border-red-400"
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
                  </section>
                )}

                {/* Your week */}
                {customBrief.custom_sections?.your_week && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">This Week</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.your_week} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.your_week} />
                  </section>
                )}

                {/* Industry intelligence */}
                {customBrief.custom_sections?.industry_intelligence && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Your Industry</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.industry_intelligence} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.industry_intelligence} />
                  </section>
                )}

                {/* Jurisdiction developments */}
                {customBrief.custom_sections?.jurisdiction_developments && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Your Jurisdictions</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.jurisdiction_developments} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.jurisdiction_developments} />
                  </section>
                )}

                {/* Topic depth */}
                {customBrief.custom_sections?.topic_depth && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Topic Focus</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.topic_depth} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.topic_depth} />
                  </section>
                )}

                {/* Enforcement pattern */}
                {customBrief.custom_sections?.enforcement_pattern_for_you && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Enforcement Patterns</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.enforcement_pattern_for_you} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.enforcement_pattern_for_you} />
                  </section>
                )}

                {/* What to ignore — subtle inset */}
                {customBrief.custom_sections?.what_to_ignore && (
                  <section className="py-5">
                    <div className="bg-slate-50 rounded-lg px-4 py-3 border-l-2 border-slate-300">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📭 What to deprioritize this week</h3>
                      <div className="text-[13px] text-slate-500 leading-relaxed">
                        <CitedParagraphs content={customBrief.custom_sections.what_to_ignore} sourceMap={brief?.source_map ?? {}} />
                      </div>
                    </div>
                  </section>
                )}

                {/* Continuity from Last Week */}
                {customBrief.custom_sections?.continuity_from_last_week && (
                  <section className="py-7">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">From Last Week</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={customBrief.custom_sections.continuity_from_last_week} sourceMap={brief?.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief?.source_map ?? {}} usedIn={customBrief.custom_sections.continuity_from_last_week} />
                  </section>
                )}

                {/* Action items — dark section */}
                {customBrief.custom_sections?.your_action_items?.length > 0 && (
                  <section className="py-7">
                    <div className="bg-navy rounded-xl p-6">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400 mb-5">🎯 Action Items</h3>
                      <div className="space-y-3">
                        {customBrief.custom_sections.your_action_items.map((item: any, i: number) => (
                          <div key={i} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-navy text-[11px] font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  item.priority === "Immediate"
                                    ? "bg-red-500/20 text-red-300 border border-red-400/30"
                                    : item.priority?.includes("quarter")
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                    : "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-[14px] text-white font-medium mb-0.5">{item.action}</p>
                              <p className="text-[12px] text-blue-200">{item.why_now}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Look ahead — amber inset */}
                {customBrief.custom_sections?.look_ahead && (
                  <section className="py-5">
                    <div className="bg-amber-50 rounded-lg px-4 py-3 border-l-2 border-amber-400">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">📅 Coming Up</h3>
                      <div className="text-[13px] text-amber-800 leading-relaxed">
                        <CitedParagraphs content={customBrief.custom_sections.look_ahead} sourceMap={brief?.source_map ?? {}} />
                      </div>
                    </div>
                  </section>
                )}

              </div>
            </div>
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
            {/* Public weekly brief — document layout */}
            <div className="bg-slate-100 rounded-2xl p-4 md:p-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">

                {/* Document header */}
                <div className="bg-gradient-to-r from-navy to-steel px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky">
                      ⭐ EndUserPrivacy Intelligence Brief
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-blue-300">
                      <span>{brief.week_label}</span>
                      <span>·</span>
                      <span>{brief.article_count} updates reviewed</span>
                    </div>
                  </div>
                  <h2 className="font-display text-[18px] md:text-[22px] text-white font-bold leading-tight">
                    {brief.headline}
                  </h2>
                </div>

                {/* Section content */}
                <div className="px-6 py-2">

                  {/* Executive Summary */}
                  <section className="py-7 border-b border-slate-100">
                    <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">Executive Summary</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={brief.executive_summary} sourceMap={brief.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.executive_summary} />
                  </section>

                  {/* All other sections */}
                  <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" content={brief.us_federal} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🏛️" title="U.S. State Analysis" content={brief.us_states} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🇪🇺" title="EU & UK Analysis" content={brief.eu_uk} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🌍" title="Global Developments" content={brief.global_developments} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🤖" title="AI Governance" content={brief.ai_governance} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="📡" title="AdTech & Advertising Privacy" content={brief.adtech_advertising} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="👁️" title="Biometric Data" content={brief.biometric_data} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🏛️" title="Privacy Litigation" content={brief.privacy_litigation} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="📊" title="Enforcement Trends" content={brief.enforcement_trends} sourceMap={brief.source_map ?? {}} />

                  {/* Enforcement table */}
                  {brief.enforcement_table && brief.enforcement_table.length > 0 && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                        ⚖️ Enforcement Actions This Week
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-[13px]">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              {["Regulator", "Subject", "Type", "Amount", "Significance"].map(h => (
                                <th key={h} className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {brief.enforcement_table.map((row, i) => (
                              <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-b border-slate-100`}>
                                <td className="py-3 px-4 font-medium text-navy text-[13px]">
                                  {row.regulator}
                                  <div className="text-[11px] text-slate-400">{row.jurisdiction}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-[13px]">{row.subject}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ACTION_COLOR[row.action_type] || "bg-muted text-muted-foreground border-border"}`}>
                                    {row.action_type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-navy">{row.amount}</td>
                                <td className="py-3 px-4 text-slate-500 text-[12px]">{row.significance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Top 10 enforcement signals — ranked by significance + recency */}
                  {brief.top_enforcement_signals && brief.top_enforcement_signals.length > 0 && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-1">
                        🔝 Top 10 Enforcement Signals
                      </h3>
                      <p className="text-[12px] text-slate-500 mb-4">
                        Ranked by precedent significance and recency across the last 90 days.
                      </p>
                      <ol className="space-y-3 list-none p-0 m-0">
                        {brief.top_enforcement_signals.map((s, i) => (
                          <li key={s.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-navy text-white text-[12px] font-bold flex items-center justify-center">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <Link
                                  to={`/enforcement-intelligence/${s.id}`}
                                  className="font-display font-semibold text-navy hover:text-navy/80 text-[14px] leading-snug no-underline"
                                >
                                  {s.subject || s.regulator}
                                </Link>
                                {s.fine && (
                                  <span className="text-[12px] font-semibold text-navy whitespace-nowrap tabular-nums">
                                    {s.fine}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mb-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                                <span className="font-medium">{s.regulator}</span>
                                <span>·</span>
                                <span>{s.jurisdiction}</span>
                                {s.decision_date && (<><span>·</span><span>{new Date(s.decision_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>)}
                                {s.precedent_significance != null && (
                                  <><span>·</span><span title="Precedent significance">{"★".repeat(s.precedent_significance)}{"☆".repeat(Math.max(0, 5 - s.precedent_significance))}</span></>
                                )}
                              </div>
                              {s.summary && (
                                <p className="text-[12.5px] text-slate-600 leading-relaxed line-clamp-2 m-0">
                                  {s.summary}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-4">
                        <Link
                          to="/enforcement-intelligence"
                          className="text-[12px] font-semibold text-navy hover:underline"
                        >
                          Browse all enforcement actions →
                        </Link>
                      </div>
                    </section>
                  )}

                  {brief.cross_jurisdiction_patterns && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">
                        🌐 Cross-Jurisdiction Patterns
                      </h3>
                      <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                        <CitedParagraphs content={brief.cross_jurisdiction_patterns} sourceMap={brief.source_map ?? {}} />
                      </div>
                    </section>
                  )}

                  {/* Trend signal */}
                  {brief.trend_signal && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-4">📡 Trend Signal</h3>
                      <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                        <CitedParagraphs content={brief.trend_signal} sourceMap={brief.source_map ?? {}} />
                      </div>
                      <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.trend_signal ?? ""} />
                    </section>
                  )}

                  {/* Why this matters / Action items — dark section */}
                  {brief.why_this_matters && (
                    <section className="py-7">
                      <div className="bg-navy rounded-xl p-6">
                        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400 mb-5">
                          🎯 Action Items for This Week
                        </h3>
                        <div className="text-[14px] text-blue-100 leading-relaxed space-y-3">
                          <CitedParagraphs content={brief.why_this_matters} sourceMap={brief.source_map ?? {}} />
                        </div>
                        <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.why_this_matters ?? ""} />
                      </div>
                    </section>
                  )}

                </div>
              </div>
            </div>

            {/* Full sources reference */}
            {brief.source_map && Object.keys(brief.source_map).length > 0 && (
              <div className="bg-slate-100 rounded-2xl p-4 md:p-6">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
                  <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-3 flex items-center gap-2">
                    <span>📚</span> All Source Articles This Week
                  </h3>
                  <p className="text-[12px] text-slate-400 mb-4">
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
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all no-underline group"
                        >
                          <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 w-6 text-right mt-0.5">
                            [{num}]
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-navy group-hover:text-steel transition-colors line-clamp-2">
                              {src.title}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{src.source}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-steel transition-colors flex-shrink-0 mt-0.5" />
                        </a>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <PremiumToolsSection isPremium={isPremium} />
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
