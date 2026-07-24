import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FlagIcon } from "@/components/FlagIcon";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import OnboardingModal from "@/components/OnboardingModal";


import DigestPreferences from "@/components/DigestPreferences";
import PremiumGate from "@/components/PremiumGate";
import { CitedParagraphs } from "@/components/brief/CitedText";
import { SourcesList } from "@/components/brief/SourcesList";
import type { SourceMap } from "@/components/brief/CitedText";
import { ExternalLink, ChevronDown, ChevronRight, Trash2, ArrowUpToLine, BarChart3, BookOpen, Bot, Calendar, ClipboardList, Eye, Globe, Landmark, Mail, Satellite, Scale, Star, Target, Wrench } from 'lucide-react';
import CustomBriefDocument from "@/components/dashboard/CustomBriefDocument";
import DashboardObligationsCard from "@/components/obligations/DashboardObligationsCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import TrialCountdownBanner from "@/components/dashboard/TrialCountdownBanner";
import WorkspaceStatusLine from "@/components/WorkspaceStatusLine";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import { useClientStore } from "@/stores/clientStore";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "@/hooks/use-toast";
import ProductCtaChip from "@/components/ProductCtaChip";


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
  toolkit_ctas?: { slug: string; triggered_by: string }[] | null;
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
      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-1">
        <span className="mr-2"><FlagIcon icon={icon} /></span>{title}
      </h3>
      {subtitle && (
        <p className="text-meta text-slate-500 mb-4 leading-snug">{subtitle}</p>
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
        <div className="bg-gradient-to-r from-brand-navy to-brand-steel px-6 py-5">
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
// Exported so unit tests can cover every date-range branch (same-month,
// cross-month same-year, cross-year, invalid). Explicit option objects avoid
// the earlier `undefined`-field pattern which produced malformed ranges in
// some engines.
export function describeBriefPeriod(publishedAt: string | null | undefined): string {
  if (!publishedAt) return "the past 7 days";
  const end = new Date(publishedAt);
  if (isNaN(end.getTime())) return "the past 7 days";
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const monthDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const monthDayYear = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dayOnly = (d: Date) =>
    d.toLocaleDateString("en-US", { day: "numeric" });

  if (sameMonth) {
    // e.g. "Jul 7–13, 2026"
    return `${monthDay(start)}–${dayOnly(end)}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    // e.g. "Aug 28 – Sep 3, 2026"
    return `${monthDay(start)} – ${monthDay(end)}, ${end.getFullYear()}`;
  }
  // e.g. "Dec 29, 2026 – Jan 4, 2027"
  return `${monthDayYear(start)} – ${monthDayYear(end)}`;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [customBrief, setCustomBrief] = useState<any>(null);
  const [briefArchive, setBriefArchive] = useState<any[]>([]);
  const [customBriefLoading, setCustomBriefLoading] = useState(true);
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDigestPrefs, setShowDigestPrefs] = useState(false);
  const [digestPrefsSet, setDigestPrefsSet] = useState(false);
  const [freeDigest, setFreeDigest] = useState<any>(null);
  const { isAdmin } = useIsAdmin();

  async function confirmDeleteBrief() {
    const id = pendingDeleteId;
    if (!id) return;
    setPendingDeleteId(null);
    const { error } = await (supabase as any).from("custom_briefs").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setBriefArchive((prev) => prev.filter((b) => b.id !== id));
    setCustomBrief((prev: any) => (prev?.id === id ? null : prev));
    if (expandedBriefId === id) setExpandedBriefId(null);
    toast({ title: "Report deleted" });
  }

  // The Intelligence Report is a per-user product, not per-client. If the
  // user lands here while a client workspace is active, snap the workspace
  // selector back to their personal context so the page header and any
  // downstream surfaces correctly reflect "this brief is for you".
  useEffect(() => {
    const { activeClient, personal, switchToPersonal } = useClientStore.getState();
    if (personal && activeClient && activeClient.id !== personal.id) {
      switchToPersonal();
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
        // subscription_interval no longer tracked in component state (unused)
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
    setCustomBriefLoading(true);
    (supabase as any)
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(50)
      .then(({ data }: any) => {
        const rows = Array.isArray(data) ? data : [];
        setCustomBrief(rows[0] ?? null);
        setBriefArchive(rows);
        // v9 Prompt 4.2: auto-expand most recent custom brief so subscribers
        // don't land on a list of fully-collapsed accordions.
        if (rows[0]?.id) setExpandedBriefId(rows[0].id);
        setCustomBriefLoading(false);
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
      <WorkspaceLayout>
        <Helmet>
          <title>Intelligence Dashboard | End User Privacy</title>
          <meta name="description" content="Your personalized privacy intelligence dashboard." />
        </Helmet>
        <div className="flex items-center justify-center py-24">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!user) return null;

  const canShowPublicBrief = !customBriefLoading && !customBrief && briefArchive.length === 0;

  if (!isPremium) {
    return (
      <WorkspaceLayout>
        {showOnboarding && user && (
          <OnboardingModal userId={user.id} onComplete={() => setShowOnboarding(false)} />
        )}
        {showDigestPrefs && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
              <h2 className="font-display text-brand-navy mb-6">
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
          <title>Intelligence Dashboard | End User Privacy</title>
        </Helmet>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* V7-C3: Obligations placeholder (free users) */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="font-display text-lg text-brand-navy mb-1">Deadlines &amp; Reminders</h2>
            <p className="text-sm text-muted-foreground">
              Subscribers see renewal and review deadlines derived from their documents here.{" "}
              <Link to="/subscribe" className="text-brand-teal-text hover:underline">See plans →</Link>
            </p>
          </div>
          {/* Premium upsell banner */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-2xl p-6 text-center">
              <div className="text-eyebrow text-amber-400 mb-2">
                ⭐ Get Intelligence
              </div>
              <h3 className="text-white mb-2">
                This brief, re-analyzed for your practice
              </h3>
              <p className="text-blue-200 text-sm mb-4 max-w-md mx-auto">
                Your weekly digest tells you what happened. Intelligence tells you what it means
                for your industry, what your priorities are, and what to do about it. {`${INTELLIGENCE_PRICING.monthly()}`}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/subscribe"
                  className="bg-white text-brand-navy font-bold text-sm py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
                >
                  Get full intelligence — {`${INTELLIGENCE_PRICING.monthly()}`} →
                </Link>
              </div>
            </div>
          </div>

          {/* "What you get" descriptor for the free Monday Report — non-premium context. */}
          <MondayReportWhatYouGet className="mb-6" />

          {/* Digest preferences prompt */}
          {!digestPrefsSet && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-card-title text-gray-900 mb-1">Set up your Monday Report</p>
                <p className="text-sm text-gray-700">Choose up to 2 regions and up to 2 topics to receive the Monday Privacy Intelligence Report — filtered to your selections, every Monday.</p>
              </div>
              <button onClick={() => setShowDigestPrefs(true)} className="flex-shrink-0 bg-brand-navy text-white font-semibold text-sm px-4 py-2 rounded-xl border-none cursor-pointer hover:opacity-90">
                Set up digest →
              </button>
            </div>
          )}

          {/* Digest card */}
          {digestPrefsSet && (
            <div className="bg-card border border-brand-cloud rounded-2xl overflow-hidden">
              <div className="bg-brand-navy px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-eyebrow text-amber-400 mb-0.5">Your Weekly Digest</p>
                  <p className="text-white text-sm">{freeDigest ? freeDigest.week_label : "Your first digest arrives Monday"}</p>
                </div>
                <button onClick={() => setShowDigestPrefs(true)} className="text-meta text-blue-200/60 hover:text-blue-200 bg-transparent border-none cursor-pointer transition-colors">Edit preferences</button>
              </div>

              {!freeDigest && (
                <div className="px-6 py-10">
                  <div className="rounded-xl border border-border p-8 text-center max-w-lg mx-auto">
                    <div className="text-3xl mb-3"><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></div>
                    <h3 className="text-gray-900 mb-2">Your first digest is on its way</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Your personalized digest will arrive Monday morning. While you wait, explore the feed and tools below.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/updates" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity no-underline">
                        Browse updates →
                      </Link>
                      <Link to="/subscribe" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors no-underline">
                        Get the full Privacy Intelligence Report
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {freeDigest && freeDigest.digest_items?.length > 0 && (
                <div className="divide-y divide-brand-cloud">
                  {freeDigest.digest_items.map((item: any, i: number) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 px-6 py-4 no-underline hover:bg-brand-cloud/50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-meta font-medium text-brand-steel">{item.region_label}</span>
                          <span className="text-meta text-brand-mist">·</span>
                          <span className="text-meta text-brand-mist">{item.source_name}</span>
                        </div>
                        <p className="text-card-title text-gray-900 leading-snug group-hover:text-brand-steel transition-colors mb-1">{item.title}</p>
                        {item.summary && <p className="text-meta text-gray-700 leading-relaxed line-clamp-2">{item.summary}</p>}
                      </div>
                      <span className="text-brand-mist text-lg flex-shrink-0 mt-0.5">→</span>
                    </a>
                  ))}
                </div>
              )}

              {freeDigest?.pattern_observation && (
                <div className="px-6 py-4 bg-blue-50/50 border-t border-brand-cloud">
                  <p className="text-sm text-brand-steel leading-relaxed"><span className="font-semibold">This week: </span>{freeDigest.pattern_observation}</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-brand-cloud flex items-center justify-between gap-4">
                <p className="text-sm text-gray-700">Get full intelligence for analysis, priorities, and action items.</p>
                <Link to="/subscribe" className="flex-shrink-0 text-meta font-bold text-brand-navy bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg no-underline transition-colors">Get full intelligence →</Link>
              </div>
            </div>
          )}
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>Privacy Intelligence Report | End User Privacy</title>
        <meta name="description" content="Your personalized weekly privacy intelligence brief." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <TrialCountdownBanner />
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h1 className="font-display text-brand-navy mb-1">
            Privacy Intelligence Workspace
          </h1>
          <WorkspaceStatusLine />
        </div>
        {/* Brief-only page: plan status lives on /account, tool pricing lives on /tools. */}
        {/* Header — only shown to subscribers without a personalized brief yet */}
        {canShowPublicBrief && (
          <div className="mb-10">
            <p className="text-meta font-semibold tracking-widest uppercase text-primary mb-2">
              <ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Weekly Privacy Intelligence Report
            </p>
            <h2 className="font-display text-foreground leading-tight">
              {loading
                ? "Loading your latest brief…"
                : brief?.headline ?? "Your next brief is on the way"}
            </h2>
            {!loading && brief && (
              <p className="mt-3 text-sm text-muted-foreground">
                Covering {describeBriefPeriod(brief.published_at)} · {describeBriefFreshness(brief.published_at)} · {brief.article_count} regulatory updates synthesized
              </p>
            )}
            {!loading && !brief && (
              <p className="mt-3 text-sm text-muted-foreground">
                We publish a new Intelligence Brief every Monday morning. Your first
                brief will appear here as soon as it's ready — no action needed.
              </p>
            )}
          </div>
        )}

        {/* Awaiting first personalized brief — prospective messaging.
            Shown above the general weekly brief so subscribers know their
            customized version is still pending. */}
        {canShowPublicBrief && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <p className="text-3xl"><Mail aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></p>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground mb-1">
                  Your Privacy Intelligence Report arrives next Monday
                </h3>
                <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                  In the meantime, the general Weekly Privacy Intelligence Report below covers this week's
                  developments across every jurisdiction and topic. Your personalized version
                  will customize and analyze the same material for your priorities and responsibilities.
                </p>
                <Link
                  to="/brief-preferences"
                  className="inline-block text-primary font-semibold text-sm no-underline hover:underline"
                >
                  Review your preferences →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* V7-C3: Obligations card above brief/archive (premium users only) */}
        <DashboardObligationsCard />

        {/* Custom briefs for Pro users — collapsible list, most recent first */}
        {customBrief && (
          <div className="mb-3 flex items-center justify-end gap-3 flex-wrap px-1">
            <p className="text-meta text-muted-foreground">
              Want to change focus for your next report?
            </p>
            <Link
              to="/brief-preferences"
              className="text-meta font-semibold text-primary hover:underline no-underline"
            >
              Update preferences for next Monday →
            </Link>
          </div>
        )}

        {briefArchive.length > 0 && (
          <div className="mb-8">
            {briefArchive.length > 1 && (
              <h2 className="text-slate-500 uppercase tracking-wider mb-4 px-1">
                Reports ({briefArchive.length})
              </h2>
            )}
            <div className="space-y-2">
              {briefArchive.map((b: any, idx: number) => {
                const isLatest = idx === 0;
                const isOpen = expandedBriefId === b.id;
                const toggle = () => {
                  setExpandedBriefId(isOpen ? null : b.id);
                };
                const generated = b.generated_at
                  ? new Date(b.generated_at).toLocaleString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })
                  : "";
                const headline = b.custom_sections?.opening_headline ?? "Privacy Intelligence Report";
                const headerId = `brief-header-${b.id}`;
                const panelId = `brief-panel-${b.id}`;
                const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggle();
                  }
                };
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <h3 className="m-0 flex items-stretch">
                      <button
                        type="button"
                        id={headerId}
                        onClick={toggle}
                        onKeyDown={onKeyDown}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors bg-transparent border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />}
                        <span className="sr-only">{isOpen ? "Collapse brief" : "Expand brief"}: </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-eyebrow text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              ⭐ {describeBriefPeriod(b.generated_at)}
                            </span>
                            {isLatest && (
                              <span className="text-eyebrow text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Latest
                              </span>
                            )}
                            <span className="text-meta text-slate-400">{generated}</span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium mt-1 line-clamp-1">{headline}</p>
                        </div>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPendingDeleteId(b.id); }}
                          aria-label="Delete report (admin)"
                          title="Delete report"
                          className="px-3 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors bg-transparent border-none border-l border-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headerId}
                      hidden={!isOpen}
                    >
                      {isOpen && (
                        <div className="bg-slate-100 p-3 md:p-4 border-t border-slate-200">
                          <CustomBriefDocument
                            customBrief={b}
                            sourceMap={(b as any)?.source_map ?? brief?.source_map ?? {}}
                            hideHeader
                            topEnforcementSignals={isLatest ? (brief?.top_enforcement_signals ?? null) : null}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* v9 Prompt 4.2 → BRIEF-1: Top 10 enforcement signals now render as the
            FINAL section of each brief document (public brief render below and
            CustomBriefDocument via topEnforcementSignals prop) rather than as a
            standalone dashboard section. */}




        {loading && canShowPublicBrief && <BriefSkeleton />}

        {!loading && canShowPublicBrief && !brief && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4"><Calendar aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></p>
            <p className="font-display text-xl text-foreground mb-2">First report coming Monday</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your Privacy Intelligence Report is generated every Monday morning from the past week's regulatory activity. Check back then.
            </p>
          </div>
        )}

        {!loading && brief && canShowPublicBrief && (
          <>
            {/* Public weekly brief — document layout */}
            <div className="bg-slate-100 rounded-2xl p-4 md:p-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">

                {/* Document header */}
                <div className="bg-gradient-to-r from-brand-navy to-brand-steel px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <span className="text-meta font-bold uppercase tracking-[0.15em] text-brand-mist">
                      ⭐ End User Privacy Intelligence Report
                    </span>
                    <span className="text-meta text-blue-300">
                      Covering {describeBriefPeriod(brief.published_at)} · {brief.article_count} updates reviewed
                    </span>
                  </div>
                  <h2 className="font-display text-white leading-tight">
                    {brief.headline}
                  </h2>
                  <p className="mt-2 text-meta text-blue-200">
                    {describeBriefFreshness(brief.published_at)}
                  </p>
                </div>

                {/* Section content */}
                <div className="px-6 py-2">

                  {/* Executive Summary */}
                  <section className="py-7 border-b border-slate-100">
                    <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-4">Executive Summary</h3>
                    <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                      <CitedParagraphs content={brief.executive_summary} sourceMap={brief.source_map ?? {}} />
                    </div>
                    <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.executive_summary} />
                  </section>

                  {/* All other sections */}
                  <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" subtitle="Federal agency moves, Congressional bills, and what they mean for your program." content={brief.us_federal} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="U.S. State Analysis" subtitle="State legislatures and attorneys general — new laws, amendments, and enforcement." content={brief.us_states} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="🇪🇺" title="EU & UK Analysis" subtitle="EDPB, member-state DPAs, and the UK ICO — guidance, enforcement, and rulemaking." content={brief.eu_uk} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="Global Developments" subtitle="Privacy moves outside the US and EU — APAC, LATAM, Middle East, and Africa." content={brief.global_developments} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="AI Governance" subtitle="Where AI regulation meets data privacy — training data, automated decisions, and biometrics." content={brief.ai_governance} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="AdTech & Advertising Privacy" subtitle="Cookies, consent, behavioral targeting, and commercial surveillance enforcement." content={brief.adtech_advertising} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="Biometric Data" subtitle="Face, voice, and biometric processing rules — BIPA, GDPR Art. 9, and parallels worldwide." content={brief.biometric_data} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="Privacy Litigation" subtitle="Class actions, settlements, and court rulings shaping how privacy laws are applied." content={brief.privacy_litigation} sourceMap={brief.source_map ?? {}} />
                  <SectionBlock icon="" title="Enforcement Trends" subtitle="The pattern across this week's actions — what regulators are signaling next." content={brief.enforcement_trends} sourceMap={brief.source_map ?? {}} />

                  {/* Enforcement table */}
                  {brief.enforcement_table && brief.enforcement_table.length > 0 && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-4">
                        <Scale aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Enforcement Actions This Week
                      </h3>
                      <div className="cmp-table overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              {["Regulator", "Subject", "Type", "Amount", "Significance"].map(h => (
                                <th key={h} className="py-2.5 px-4 text-left text-label text-slate-500">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {brief.enforcement_table.map((row, i) => (
                              <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-b border-slate-100`}>
                                <td className="py-3 px-4 font-medium text-brand-navy text-sm">
                                  {row.regulator}
                                  <div className="text-meta text-slate-400">{row.jurisdiction}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-sm">{row.subject}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-meta px-2 py-0.5 rounded-full border ${ACTION_COLOR[row.action_type] || "bg-muted text-muted-foreground border-border"}`}>
                                    {row.action_type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-brand-navy">{row.amount}</td>
                                <td className="py-3 px-4 text-slate-500 text-meta">{row.significance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Top 10 enforcement signals moved to the END of the brief document — see block after "From the toolkit" below. */}


                  {brief.cross_jurisdiction_patterns && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-4">
                        <Globe aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Cross-Jurisdiction Patterns
                      </h3>
                      <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                        <CitedParagraphs content={brief.cross_jurisdiction_patterns} sourceMap={brief.source_map ?? {}} />
                      </div>
                    </section>
                  )}

                  {/* Trend signal */}
                  {brief.trend_signal && (
                    <section className="py-7 border-b border-slate-100">
                      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-4"><Satellite aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Trend Signal</h3>
                      <div className="text-[15px] text-slate-700 leading-relaxed space-y-3">
                        <CitedParagraphs content={brief.trend_signal} sourceMap={brief.source_map ?? {}} />
                      </div>
                      <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.trend_signal ?? ""} />
                    </section>
                  )}

                  {/* Why this matters / Action items — dark section */}
                  {brief.why_this_matters && (
                    <section className="py-7">
                      <div className="bg-brand-navy rounded-xl p-6">
                        <h3 className="text-meta uppercase tracking-[0.12em] text-amber-400 mb-5">
                          <Target aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Action Items for This Week
                        </h3>
                        <div className="text-sm text-blue-100 leading-relaxed space-y-3">
                          <CitedParagraphs content={brief.why_this_matters} sourceMap={brief.source_map ?? {}} />
                        </div>
                        <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.why_this_matters ?? ""} />
                      </div>
                    </section>
                  )}

                  {/* From the toolkit (CTA-3) */}
                  {brief.toolkit_ctas && brief.toolkit_ctas.length > 0 && (
                    <section className="py-7 border-t border-slate-100">
                      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-2">
                        <Wrench aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> From the toolkit
                      </h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Tools from End User Privacy relevant to this week's developments.
                      </p>
                      <div className="space-y-3">
                        {brief.toolkit_ctas.slice(0, 3).map((c) => (
                          <div key={c.slug}>
                            <ProductCtaChip slug={c.slug} placement="weekly_brief" />
                            {c.triggered_by && (
                              <p className="text-xs text-muted-foreground mt-1 ml-1">
                                Related coverage: {c.triggered_by}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Top 10 enforcement signals — FINAL section of the weekly brief document */}
                  {brief.top_enforcement_signals && brief.top_enforcement_signals.length > 0 && (
                    <section className="py-7 border-t border-slate-100">
                      <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-1">
                        <ArrowUpToLine aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Top 10 Enforcement Signals
                      </h3>
                      <p className="text-meta text-slate-500 mb-4">
                        Ranked by precedent significance and recency across the last 90 days.
                      </p>
                      <ol className="space-y-3 list-none p-0 m-0">
                        {brief.top_enforcement_signals.map((s, i) => (
                          <li key={s.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-navy text-white text-meta font-bold flex items-center justify-center">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <Link
                                  to={`/enforcement/${s.id}`}
                                  className="font-display font-semibold text-brand-navy hover:text-brand-navy/80 text-sm leading-snug no-underline"
                                >
                                  {s.subject || s.regulator}
                                </Link>
                                {s.fine && (
                                  <span className="text-meta font-semibold text-brand-navy whitespace-nowrap tabular-nums">
                                    {s.fine}
                                  </span>
                                )}
                              </div>
                              <div className="text-meta text-slate-500 mb-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                                <span className="font-medium">{s.regulator}</span>
                                <span>·</span>
                                <span>{s.jurisdiction}</span>
                                {s.decision_date && (<><span>·</span><span>{new Date(s.decision_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>)}
                                {s.precedent_significance != null && (
                                  <><span>·</span><span title="Precedent significance" className="inline-flex items-center gap-0.5" aria-label={`${s.precedent_significance} of 5 stars`}>{Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={14} strokeWidth={1.75} className={i < s.precedent_significance! ? "text-brand-teal" : "text-muted-foreground/30"} fill={i < s.precedent_significance! ? "currentColor" : "none"} aria-hidden />))}</span></>
                                )}
                              </div>
                              {s.summary && (
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 m-0">
                                  {s.summary}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-4">
                        <Link
                          to="/enforcement"
                          className="text-meta font-semibold text-brand-navy hover:underline"
                        >
                          Browse all enforcement actions →
                        </Link>
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
                  <h3 className="text-meta uppercase tracking-[0.12em] text-brand-steel mb-3 flex items-center gap-2">
                    <span><BookOpen aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span> All source articles for this report
                  </h3>
                  <p className="text-meta text-slate-400 mb-4">
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
                          <span className="text-meta font-bold text-slate-400 flex-shrink-0 w-6 text-right mt-0.5">
                            [{num}]
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-navy group-hover:text-brand-steel transition-colors line-clamp-2">
                              {src.title}
                            </p>
                            <p className="text-meta text-slate-400 mt-0.5">{src.source}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-steel transition-colors flex-shrink-0 mt-0.5" />
                        </a>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this weekly report?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the personalized report. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBrief}>Delete report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceLayout>
  );
};

export default Dashboard;
