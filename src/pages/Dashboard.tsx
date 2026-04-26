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
import { ExternalLink, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import CustomBriefDocument from "@/components/dashboard/CustomBriefDocument";
import RecentReportsCard from "@/components/dashboard/RecentReportsCard";

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

function SectionBlock({ icon, title, subtitle, content, sourceMap }: { icon: string; title: string; subtitle?: string; content: string | null; sourceMap: SourceMap }) {
  if (!content) return null;
  return (
    <section className="py-7 border-b border-slate-100 last:border-0">
      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-steel mb-1">
        <span className="mr-2">{icon}</span>{title}
      </h3>
      {subtitle && (
        <p className="text-[12px] text-slate-500 mb-4 leading-snug">{subtitle}</p>
      )}
      <div className={`text-[15px] text-slate-700 leading-relaxed space-y-3 ${subtitle ? "" : "mt-3"}`}>
        <CitedParagraphs content={content} sourceMap={sourceMap} />
      </div>
      <SourcesList sourceMap={sourceMap} usedIn={content} />
    </section>
  );
}

/** Document-shaped skeleton so users see the brief loading into its real layout. */
function BriefSkeleton() {
  return (
    <div className="bg-slate-100 rounded-2xl p-4 md:p-6 mb-8 animate-pulse">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-navy to-steel px-6 py-5">
          <div className="h-3 w-48 bg-white/20 rounded mb-3" />
          <div className="h-5 w-3/4 bg-white/30 rounded mb-2" />
          <div className="h-3 w-40 bg-white/20 rounded" />
        </div>
        <div className="px-6 py-2 divide-y divide-slate-100">
          {[0, 1, 2, 3].map(i => (
            <section key={i} className="py-7">
              <div className="h-2.5 w-32 bg-slate-200 rounded mb-3" />
              <div className="h-2 w-56 bg-slate-100 rounded mb-5" />
              <div className="space-y-2.5">
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-[95%] bg-slate-100 rounded" />
                <div className="h-3 w-[88%] bg-slate-100 rounded" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Truncate to first N sentences for the free-user teaser */
function truncateToSentences(text: string | null, count = 2): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text.slice(0, 150) + "…";
  return sentences.slice(0, count).join("").trim();
}

/**
 * Plain-English description of when the brief was published, so readers
 * always know whether they're looking at this week's analysis or an older one.
 */
function describeBriefFreshness(publishedAt: string | null | undefined): string {
  if (!publishedAt) return "Publication date unavailable";
  const published = new Date(publishedAt);
  if (isNaN(published.getTime())) return "Publication date unavailable";
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.floor((now.getTime() - published.getTime()) / dayMs);
  const sameYear = published.getFullYear() === now.getFullYear();
  const dateStr = published.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });

  if (days < 0) return `Scheduled for ${dateStr}`;
  if (days === 0) return `Published today, ${dateStr}`;
  if (days === 1) return `Published yesterday, ${dateStr}`;
  if (days < 7) return `Published ${dateStr} — ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return `Published ${dateStr} — 1 week ago`;
  if (weeks < 8) return `Published ${dateStr} — ${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return `Published ${dateStr} — 1 month ago`;
  if (months < 12) return `Published ${dateStr} — ${months} months ago`;
  return `Published ${dateStr}`;
}

/**
 * Human-readable date range the brief covers — the seven days ending on the
 * publication date. Replaces opaque labels like "Week 18 · 2026" with text
 * users can act on.
 */
function describeBriefPeriod(publishedAt: string | null | undefined): string {
  if (!publishedAt) return "the past 7 days";
  const end = new Date(publishedAt);
  if (isNaN(end.getTime())) return "the past 7 days";
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  // When the range stays inside one month, drop the redundant month on the end date.
  const startFmt = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endFmt = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
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
  const [briefArchive, setBriefArchive] = useState<any[]>([]);
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);
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
        // Move any prior "current" brief into the archive
        setBriefArchive(prev => (customBrief ? [customBrief, ...prev] : prev));
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
      .select("is_premium, subscription_interval, onboarding_complete, digest_jurisdictions, digest_topics")
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

  // Fetch all personalized briefs (most recent first) for Pro users
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(50)
      .then(({ data }: any) => {
        const rows = Array.isArray(data) ? data : [];
        setCustomBrief(rows[0] ?? null);
        setBriefArchive(rows.slice(1));
      });
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
          <title>Intelligence Dashboard | Your Privacy Hub</title>
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
          <title>Intelligence Dashboard | Your Privacy Hub</title>
        </Helmet>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Premium upsell banner */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                ⭐ Get Intelligence
              </div>
              <h3 className="font-display font-bold text-white text-[18px] mb-2">
                This brief, re-analyzed for your practice
              </h3>
              <p className="text-blue-200 text-[13px] mb-4 max-w-md mx-auto">
                Your weekly digest tells you what happened. Intelligence tells you what it means
                for your industry, what your priorities are, and what to do about it. $39/month.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/subscribe"
                  className="bg-white text-navy font-bold text-[14px] py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  Get full intelligence — $39/month →
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
                <div className="px-6 py-10">
                  <div className="rounded-xl border border-border p-8 text-center max-w-lg mx-auto">
                    <div className="text-3xl mb-3">📋</div>
                    <h3 className="font-semibold text-base mb-2">Your first digest is on its way</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Your personalized digest will arrive Monday morning. While you wait, explore the feed and tools below.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/updates" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline">
                        Browse updates →
                      </Link>
                      <Link to="/subscribe" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors no-underline">
                        Get the full Intelligence Brief
                      </Link>
                    </div>
                  </div>
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
                <p className="text-[13px] text-slate">Get full intelligence for analysis, priorities, and action items.</p>
                <Link to="/subscribe" className="flex-shrink-0 text-[12px] font-bold text-navy bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg no-underline transition-colors">Get full intelligence →</Link>
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
        <title>Intelligence Dashboard | Your Privacy Hub</title>
        <meta name="description" content="Your personalized privacy intelligence dashboard. Access your weekly digest, enforcement tracker, and regulatory updates." />
      </Helmet>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subscription plan status */}
        <div className="mb-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display font-bold text-foreground text-[16px]">
                {subscriptionInterval === "year" ? "⭐ Intelligence Annual" : "⭐ Intelligence Monthly"}
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
              Annual plan — saving $78/year vs monthly billing.
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
                <p className="text-[12px] font-semibold text-foreground">Privacy Program Assessment</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$25</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $24 vs standard</p>
              </Link>
              <Link
                to="/li-assessment"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Legitimate Interest Assessment</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$35</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $44 vs standard</p>
              </Link>
              <Link
                to="/dpia-framework"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Impact Assessment Builder</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$49</span>
                  <span className="text-muted-foreground"> /analysis</span>
                </p>
                <p className="text-[10px] text-green-700">Save $50 vs standard</p>
              </Link>
              <Link
                to="/dpa-generator"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Your Custom DPA</p>
                <p className="text-[12px] text-foreground">
                  <span className="font-bold">$49</span>
                  <span className="text-muted-foreground"> /document</span>
                </p>
                <p className="text-[10px] text-green-700">Save $50 vs standard</p>
              </Link>
              <Link
                to="/ir-playbook"
                className="block bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 no-underline transition-colors"
              >
                <p className="text-[12px] font-semibold text-foreground">Your Breach Response Playbook</p>
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
            {loading
              ? "Loading your latest brief…"
              : brief?.headline ?? "Your next brief is on the way"}
          </h1>
          {!loading && brief && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Covering {describeBriefPeriod(brief.published_at)} · {describeBriefFreshness(brief.published_at)} · {brief.article_count} regulatory updates synthesized
            </p>
          )}
          {!loading && !brief && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              We publish a new Intelligence Brief every Monday morning. Your first
              brief will appear here as soon as it's ready — no action needed.
            </p>
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

        {/* Custom brief for Pro users — most recent, expanded */}
        {customBrief && (
          <div className="bg-slate-100 rounded-2xl p-4 md:p-6 mb-8">
            <CustomBriefDocument
              customBrief={customBrief}
              sourceMap={brief?.source_map ?? {}}
              showEditPreferencesLink
            />
          </div>
        )}

        {/* Archive of older personalized briefs — collapsible */}
        {briefArchive.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-[14px] font-bold uppercase tracking-[0.12em] text-steel mb-3 px-1">
              📚 Your Brief History ({briefArchive.length})
            </h2>
            <div className="space-y-2">
              {briefArchive.map((b: any) => {
                const isOpen = expandedBriefId === b.id;
                const generated = b.generated_at
                  ? new Date(b.generated_at).toLocaleString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })
                  : "";
                const headline = b.custom_sections?.opening_headline ?? "Personalized brief";
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedBriefId(isOpen ? null : b.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⭐ {b.week_label}
                          </span>
                          <span className="text-[11px] text-slate-400">{generated}</span>
                        </div>
                        <p className="text-[13px] text-slate-700 font-medium mt-1 line-clamp-1">{headline}</p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="bg-slate-100 p-3 md:p-4 border-t border-slate-200">
                        <CustomBriefDocument
                          customBrief={b}
                          sourceMap={brief?.source_map ?? {}}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {loading && <BriefSkeleton />}

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
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky">
                      ⭐ Your Privacy Hub Intelligence Brief
                    </span>
                    <span className="text-[11px] text-blue-300">
                      Covering {describeBriefPeriod(brief.published_at)} · {brief.article_count} updates reviewed
                    </span>
                  </div>
                  <h2 className="font-display text-[18px] md:text-[22px] text-white font-bold leading-tight">
                    {brief.headline}
                  </h2>
                  <p className="mt-2 text-[12px] text-blue-200">
                    {describeBriefFreshness(brief.published_at)}
                  </p>
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
                  <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" subtitle="Federal agency moves, Congressional bills, and what they mean for your program." content={brief.us_federal} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🏛️" title="U.S. State Analysis" subtitle="State legislatures and attorneys general — new laws, amendments, and enforcement." content={brief.us_states} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🇪🇺" title="EU & UK Analysis" subtitle="EDPB, member-state DPAs, and the UK ICO — guidance, enforcement, and rulemaking." content={brief.eu_uk} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🌍" title="Global Developments" subtitle="Privacy moves outside the US and EU — APAC, LATAM, Middle East, and Africa." content={brief.global_developments} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🤖" title="AI Governance" subtitle="Where AI regulation meets data privacy — training data, automated decisions, and biometrics." content={brief.ai_governance} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="📡" title="AdTech & Advertising Privacy" subtitle="Cookies, consent, behavioral targeting, and commercial surveillance enforcement." content={brief.adtech_advertising} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="👁️" title="Biometric Data" subtitle="Face, voice, and biometric processing rules — BIPA, GDPR Art. 9, and parallels worldwide." content={brief.biometric_data} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🏛️" title="Privacy Litigation" subtitle="Class actions, settlements, and court rulings shaping how privacy laws are applied." content={brief.privacy_litigation} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="📊" title="Enforcement Trends" subtitle="The pattern across this week's actions — what regulators are signaling next." content={brief.enforcement_trends} sourceMap={brief.source_map ?? {}} />

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
                    <span>📚</span> All source articles for this brief
                  </h3>
                  <p className="text-[12px] text-slate-400 mb-4">
                    {Object.keys(brief.source_map).length} articles monitored and synthesized for the period covering {describeBriefPeriod(brief.published_at)}. Click any title to read the original.
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

        <RecentReportsCard />
        <PremiumToolsSection isPremium={isPremium} />
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
