import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, ChevronDown, EyeOff, Building2, ChevronsUpDown, ChevronsDownUp, Star, FlaskConical, Zap } from 'lucide-react';
import { useEnrichmentToggle } from "@/hooks/useEnrichmentToggle";

import { stripHtml, normalizeTitle } from "@/lib/utils";

import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import ArticleThumb from "@/components/feed/ArticleThumb";
import { categoryClass, categoryLabel, CATEGORY_BADGE_CLASS } from "@/config/categories";
import { fmtDate } from "@/lib/dates";
import { getSeverityLabel } from "@/lib/severity";
import { useAuth } from "@/hooks/useAuth";
import { InvestigationPrompt } from "@/components/InvestigationPrompt";

// Admin-only inline control to hide an article from all feeds.
const AdminHideButton = ({ articleId }: { articleId: string }) => {
  const { isAdmin } = useIsAdmin();
  const [hiding, setHiding] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (!isAdmin || hidden) return null;

  const onHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Hide this article from all feeds?")) return;
    setHiding(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-toggle-update-hidden",
      { body: { id: articleId, is_hidden: true } },
    );
    setHiding(false);
    if (error || (data as any)?.error) {
      alert(`Failed: ${error?.message || (data as any)?.error}`);
      return;
    }
    setHidden(true);
  };

  return (
    <button
      type="button"
      onClick={onHide}
      disabled={hiding}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded px-1.5 py-0.5 disabled:opacity-50"
      title="Admin: hide from feeds"
    >
      <EyeOff className="w-3 h-3" />
      {hiding ? "Hiding…" : "Hide"}
    </button>
  );
};

// Render-time fallback for any article missing a real image. Curated photo
// rotation is applied at ingestion time via the assign-fallback-images
// edge function; this is the safety net so no card ever looks empty.
// (See src/components/feed/ArticleFallbackImage.tsx.)

// Shared type for all article-like content across the site
export interface ArticleItem {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  published_at?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  jurisdiction?: string | null;
  attention_level?: string | null;
  affected_sectors?: string[] | null;
  regulatory_theory?: string | null;
  related_development?: string | null;
  precedent_novelty?: "new_theory" | "confirms" | "reverses" | "routine" | string | null;
  enrichment_version?: number | null;
  image_url?: string | null;
  is_premium?: boolean;
  why_it_matters_short?: string | null;
  related_signals?: Array<{ label?: string; kind?: string }> | null;
  action_items?: Array<{ role?: string; action?: string; timeframe?: string }> | null;
  ai_summary?: {
    urgency?: string | null;
    legal_weight?: string | null;
    why_it_matters?: string | null;
    why_it_matters_short?: string | null;
    compliance_impact?: string | null;
    risk_level?: string | null;
    takeaways?: string[] | null;
    skipped?: boolean;
    reason?: string | null;
  } | null;
}

// Variant controls the density and context of display
export type ArticleCardVariant = 'full' | 'compact' | 'featured' | 'enforcement' | 'newsfeed' | 'preview' | 'homepage';

// Determine if the enricher intentionally skipped this row (e.g. routine breach announcement)
const isSkipped = (item: ArticleItem): boolean => !!item.ai_summary?.skipped;

const SKIP_REASON_LABELS: Record<string, string> = {
  breach_announcement: 'Breach notice',
};
const skipLabel = (item: ArticleItem): string => {
  const r = item.ai_summary?.reason ?? '';
  return SKIP_REASON_LABELS[r] ?? 'Routine notice';
};

// Determine if article is AI-enriched (has meaningful ai_summary content)
const isEnriched = (item: ArticleItem): boolean => {
  if (isSkipped(item)) return false;
  const s = item.ai_summary;
  const hasAiSummary = !!(s && (s.why_it_matters || s.urgency || s.legal_weight || s.compliance_impact || s.risk_level));
  const hasShortWhy = !!(item.why_it_matters_short && item.why_it_matters_short.trim().length > 0);
  return hasAiSummary || hasShortWhy;
};

// Category colors/labels live in src/config/categories.ts (shared with UpdateDetail).

// (URGENCY_COLORS / ATTENTION_COLORS removed — Attention badge dropped from
// surface cards; urgency now appears only inside the paid Intelligence Card.)


// Legal weight badge colors
const WEIGHT_COLORS: Record<string, string> = {
  'Binding Decision': 'bg-brand-navy text-white',
  'Binding Guidance': 'bg-blue-700 text-white',
  'Soft Guidance': 'bg-blue-200 text-blue-800',
  'Enforcement Signal': 'bg-amber-100 text-amber-800',
  'Commentary': 'bg-gray-100 text-gray-600',
  'In effect': 'bg-brand-navy text-white',
  'Enforcement action': 'bg-red-100 text-red-800',
  'Guidance issued': 'bg-blue-200 text-blue-800',
  'Proposed': 'bg-amber-100 text-amber-800',
};

// fmtDate imported from @/lib/dates

// — Intelligence badge for enriched articles —
const IntelligenceBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-semibold font-sans"
    style={{ background: 'hsl(var(--brand-teal) / 0.12)', color: 'hsl(var(--brand-teal))' }}>
    <Sparkles className="w-3 h-3" />
    Intelligence
  </span>
);

// — Skipped badge for rows the enricher intentionally bypassed (e.g. routine breach announcements) —
const SkippedBadge = ({ item }: { item: ArticleItem }) => (
  <span
    className="inline-flex items-center px-1.5 py-1 rounded text-[11px] font-semibold font-sans bg-gray-100 text-gray-500"
    title="This routine notice is not enriched with custom Intelligence analysis."
  >
    {skipLabel(item)}
  </span>
);


// — Intelligence Card (paid-only, expandable, collapsed by default) —
const IntelligenceCard = ({ item }: { item: ArticleItem }) => {
  const [open, setOpen] = useState(false);
  const s = item.ai_summary;

  const signals = (item as any).related_signals as Array<{ label?: string; kind?: string }> | undefined;
  const regTheory = item.regulatory_theory;
  const related = item.related_development;
  const urgency = s?.urgency;
  const weight = s?.legal_weight;

  const hasContent = (signals && signals.length > 0) || regTheory || related;
  if (!hasContent) return null;

  return (
    <div className="mt-3 rounded-lg border" style={{ borderColor: 'hsl(var(--brand-teal) / 0.25)', background: 'hsl(var(--brand-teal) / 0.05)' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/60 rounded-t-lg transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'hsl(var(--brand-teal))' }} />
          <span className="text-[12px] font-bold" style={{ color: 'hsl(var(--brand-teal))' }}>
            Intelligence Card
          </span>
          <span className="text-[11px] text-slate">
            — connect the dots, compliance impact, action items
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'hsl(var(--brand-teal))' }} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t" style={{ borderColor: 'hsl(var(--brand-teal) / 0.18)' }}>
          {/* Connect the dots — related signals */}
          {signals && signals.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--brand-teal))' }}>
                Connect the dots
              </p>
              <ul className="space-y-1">
                {signals.map((sig, i) => (
                  <li key={i} className="text-[12px] text-brand-navy flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>{sig.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Regulatory theory + related */}
          {(regTheory || related) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t" style={{ borderColor: 'hsl(var(--brand-teal) / 0.18)' }}>
              {regTheory && (
                <div className="text-[11px]">
                  <span className="font-bold text-brand-navy">Regulatory theory: </span>
                  <span className="text-slate">{regTheory}</span>
                </div>
              )}
              {related && (
                <div className="text-[11px]">
                  <span className="font-bold text-brand-navy">Related: </span>
                  <span className="text-slate">{related}</span>
                </div>
              )}
            </div>
          )}

          {/* Meta footer */}
          {(urgency || weight) && (
            <div className="flex gap-3 pt-1">
              {urgency && (
                <span className="text-[11px] text-slate">
                  Urgency: <span className="font-semibold text-brand-navy">{urgency}</span>
                </span>
              )}
              {weight && (
                <span className="text-[11px] text-slate">
                  Legal weight: <span className="font-semibold text-brand-navy">{weight}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// — COMPACT variant ——————————————————————————————————
const CompactCard = ({ item }: { item: ArticleItem }) => {
  const enriched = isEnriched(item);
  const wrapperClass = `block group rounded-xl px-3 py-2.5 -mx-3 transition-colors no-underline ${
    enriched ? 'hover:bg-[hsl(var(--brand-teal) / 0.1)]' : 'hover:bg-brand-cloud/40'
  }`;
  const wrapperStyle = enriched ? { background: 'hsl(var(--brand-teal) / 0.08)', borderLeft: '3px solid hsl(var(--brand-teal))' } : undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    item.source_url ? (
      <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={wrapperClass} style={wrapperStyle}>
        {children}
      </a>
    ) : (
      <Link to={`/updates/${item.id}`} className={wrapperClass} style={wrapperStyle}>
        {children}
      </Link>
    );
  return (
    <Wrapper>
      <div className="flex items-start gap-2">
        <p className="text-[11px] font-semibold text-gray-900 leading-snug group-hover:text-brand-teal-text transition-colors line-clamp-2 flex-1">
          {normalizeTitle(item.title)}
        </p>
        {enriched && <IntelligenceBadge />}
        {isSkipped(item) && <SkippedBadge item={item} />}
      </div>
      {item.summary && (
        <p className="text-sm text-gray-600 leading-snug mt-1 line-clamp-2">
          {stripHtml(item.summary)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <p className="text-[11px] text-brand-mist">
          {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
        </p>
        {item.category && (
          <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(item.category)}`}>
            {categoryLabel(item.category)}
          </span>
        )}
      </div>
    </Wrapper>
  );
};

// — Brief Builder CTA — pre-seeds jurisdiction/topic from the article context
const BriefBuilderCTA = ({ item }: { item: ArticleItem }) => {
  const jur = item.jurisdiction ?? '';
  const cat = item.category ?? '';
  const params = new URLSearchParams();
  if (jur) params.set('pre_jurisdiction', jur);
  if (cat) params.set('pre_topic', cat);
  const qs = params.toString();
  const href = qs ? `/#brief?${qs}` : '/#brief';
  const label = jur
    ? `Build a sample ${jur} Privacy Intelligence Report →`
    : 'Build a sample Privacy Intelligence Report →';
  return (
    <div className="mt-2">
      <Link
        to={href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal-text hover:underline no-underline"
      >
        <Sparkles className="w-3 h-3" />
        {label}
      </Link>
    </div>
  );
};

// Title link helper — prefers source_url (opens in new tab), falls back to internal /updates/:id
const TitleLink = ({
  item,
  className,
  children,
}: {
  item: ArticleItem;
  className?: string;
  children: React.ReactNode;
}) =>
  item.source_url ? (
    <a
      href={item.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  ) : (
    <Link to={`/updates/${item.id}`} className={className}>
      {children}
    </Link>
  );

// — FULL variant ——————————————————————————————————
const getToolCTA = (item: ArticleItem): { label: string; href: string } => {
  const cat = (item.category ?? '').toLowerCase();
  const jur = (item.jurisdiction ?? '').toLowerCase();
  if (cat.includes('biometric'))
    return { label: 'Check biometric compliance →', href: '/biometric-checker' };
  if (cat.includes('breach') || cat.includes('incident'))
    return { label: 'Build an IR Playbook →', href: '/ir-playbook' };
  if (cat.includes('ai') || cat.includes('artificial intelligence'))
    return { label: 'Run an LIA for this processing →', href: '/li-assessment' };
  if (cat.includes('cross-border') || cat.includes('transfer') || cat.includes('dpa'))
    return { label: 'Generate a Data Processing Agreement →', href: '/dpa-generator' };
  if (cat.includes('dpia') || cat.includes('impact assessment'))
    return { label: 'Run a DPIA →', href: '/dpia-framework' };
  if (jur.includes('california') || jur.includes('cppa'))
    return { label: 'Check your CPPA scope →', href: '/cppa-scope-checker' };
  return { label: 'Assess your governance posture →', href: '/governance-assessment' };
};

const FullCard = ({
  item,
  isPremium = false,
  userSalutation = 'your team',
}: {
  item: ArticleItem;
  isPremium?: boolean;
  userSalutation?: string;
}) => {
  const { user } = useAuth();
  const tier: 'paid' | 'free' | 'anonymous' = isPremium ? 'paid' : user ? 'free' : 'anonymous';
  const enriched = isEnriched(item);
  const weight = item.ai_summary?.legal_weight;
  const accentBackground = enriched && isPremium;
  const { expanded, showAll, toggleArticle, toggleAll } = useEnrichmentToggle(item.id);



  return (
    <div
      className={`flex gap-4 items-start py-5 border-b border-gray-200 last:border-0 relative ${accentBackground ? 'px-4 rounded-lg my-1' : ''}`}
      style={accentBackground ? { background: 'hsl(var(--brand-teal) / 0.08)', borderLeft: '3px solid hsl(var(--brand-teal))' } : undefined}
    >
      {/* Enrichment toggles — upper-right of card */}
      {enriched && (
        <div className="absolute top-1 right-2 flex items-center gap-2 z-10 text-[11px] text-slate-500">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleArticle(); }}
            className="flex items-center gap-1 px-1.5 py-1 rounded hover:text-brand-teal-text hover:bg-brand-cloud/50 transition-colors"
            aria-label={expanded ? 'Collapse this article' : 'Expand this article'}
          >
            <span>{expanded ? 'Collapse this article' : 'Expand this article'}</span>
            {expanded ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAll(); }}
            className="flex items-center gap-1 px-1.5 py-1 rounded hover:text-brand-teal-text hover:bg-brand-cloud/50 transition-colors"
            aria-label={showAll ? 'Collapse all articles' : 'Expand all articles'}
          >
            <span>{showAll ? 'Collapse all' : 'Expand all'}</span>
            {showAll ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}


      {/* Article thumbnail */}
      <ArticleThumb
        item={item}
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-100"
      />
      <div className="flex-1 min-w-0">
        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {item.source_name && (
            <span className="text-meta font-semibold text-slate uppercase tracking-wide">{item.source_name}</span>
          )}
          {item.published_at && (
            <time className="text-meta text-brand-mist" dateTime={item.published_at || undefined}>{fmtDate(item.published_at)}</time>
          )}
          {item.category && (
            <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(item.category)}`}>
              {categoryLabel(item.category)}
            </span>
          )}
          {/* severity chip intentionally not surfaced to end users */}

          {isSkipped(item) && <SkippedBadge item={item} />}
          <AdminHideButton articleId={item.id} />
        </div>
        {/* Sector tags — show up to 2 if sectors are present */}
        {((item.affected_sectors?.length ?? 0) > 0 || ((item.ai_summary as any)?.affected_sectors?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(item.affected_sectors || (item.ai_summary as any)?.affected_sectors || [])
              .slice(0, 2)
              .map((sector: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                >
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  {sector}
                </span>
              ))}
          </div>
        )}
        {/* Title */}
        <TitleLink
          item={item}
          className="text-base text-gray-900 hover:text-brand-teal-text block mb-1 no-underline transition-colors"
        >
          {normalizeTitle(item.title)}
          {item.source_url && <ExternalLink className="w-3 h-3 inline ml-1 opacity-30" />}
        </TitleLink>

        {/* Article excerpt — first two lines of the source summary */}
        {item.summary && (
          <p className="text-sm text-gray-500 leading-relaxed mt-1.5 line-clamp-2">
            {stripHtml(item.summary)}
          </p>
        )}

        {/* ── ANONYMOUS CTAs ─────────── */}
        {tier === 'anonymous' && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-col gap-1">
              <Link to="/signup" className="text-sm font-semibold text-brand-steel hover:underline no-underline">
                Register free to see analysis →
              </Link>
              <Link to="/subscribe" className="text-sm font-semibold text-brand-teal-text hover:underline no-underline">
                Subscribe to use AI investigation prompts →
              </Link>
            </div>
            <Link
              to="/get-intelligence"
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3 py-2.5 no-underline hover:from-amber-100 transition-colors group"
            >
              <span className="flex items-start gap-2.5 min-w-0">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-brand-navy leading-tight">
                    Get analysis personalized in your Weekly Intelligence Brief
                  </span>
                  <span className="block text-[11px] text-slate mt-0.5">
                    <span className="font-semibold text-amber-700">Subscriber feature</span> · curated weekly for your industry, your role, your interests &amp; jurisdictions
                  </span>
                </span>
              </span>
              <span className="flex-shrink-0 text-[12px] font-semibold bg-brand-navy text-white px-3 py-1.5 rounded-md group-hover:opacity-90 whitespace-nowrap">
                Get the brief →
              </span>
            </Link>
          </div>
        )}

        {/* ── REGISTERED — single enrichment block (free + paid) ───── */}
        {expanded && (tier === 'paid' || tier === 'free') && (() => {
          const impact = item.ai_summary?.compliance_impact;
          const why = item.ai_summary?.why_it_matters ?? item.why_it_matters_short ?? item.ai_summary?.why_it_matters_short;
          const actionItems = item.action_items ?? [];
          const signals = item.related_signals ?? [];
          const watchLine = signals.length > 0
            ? 'Watch: ' + signals.map(s => s.label).filter(Boolean).join('; ') + '.'
            : null;
          const toolCTA = getToolCTA(item);
          const hasContent = !!(impact || why || actionItems.length > 0);

          return (
            <div className="mt-2 space-y-2">
              {(why || impact || actionItems.length > 0) && (
                <div className="pl-3 border-l-[3px] rounded-r-md py-2 pr-2 space-y-2" style={{ borderColor: 'hsl(var(--brand-teal))', background: 'hsl(var(--brand-teal) / 0.04)' }}>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" style={{ color: 'hsl(var(--brand-teal))' }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-teal))' }}>Key Takeaways</span>
                  </div>
                  {(why || impact) && (
                    <p className="text-[13px] text-brand-steel leading-relaxed">
                      {why}
                      {why && impact && ' '}
                      {impact}
                      {(why || impact) && watchLine && ' '}
                      {watchLine && <span className="italic">{watchLine}</span>}
                    </p>
                  )}

                  {actionItems.length > 0 && (
                    <ul className="space-y-1 list-none pl-0">
                      {actionItems.slice(0, 3).map((a, i) => (
                        <li key={i} className="flex gap-2 items-start text-[13px] font-medium text-brand-navy leading-relaxed">
                          <span className="text-brand-teal-text flex-shrink-0 mt-0.5">•</span>
                          <span>{a.action}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tier === 'paid' && (
                <InvestigationPrompt item={item} />
              )}
              {tier === 'free' && (
                <div className="border border-silver rounded-lg bg-white px-3 py-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <FlaskConical className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-gray-900 whitespace-nowrap">Investigate further</span>
                    <span className="text-[11px] text-slate truncate hidden sm:inline">— AI prompts pre-built for this article are available to subscribers</span>
                  </span>
                  <Link
                    to="/subscribe"
                    className="flex-shrink-0 text-[11px] font-semibold bg-brand-navy text-white px-2.5 py-1 rounded-md hover:opacity-90 no-underline whitespace-nowrap"
                  >
                    Subscribe →
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t border-brand-cloud">
                <Link to={toolCTA.href} className="text-sm font-semibold text-brand-teal-text hover:underline no-underline">
                  {toolCTA.label}
                </Link>
              </div>

              {tier === 'free' && hasContent && (
                <Link
                  to="/get-intelligence"
                  className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3 py-2.5 no-underline hover:from-amber-100 transition-colors group"
                >
                  <span className="flex items-start gap-2.5 min-w-0">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-brand-navy leading-tight">
                        Get analysis personalized in your Weekly Intelligence Brief
                      </span>
                      <span className="block text-[11px] text-slate mt-0.5">
                        <span className="font-semibold text-amber-700">Subscriber feature</span> · curated weekly for your industry, your role, your interests &amp; jurisdictions
                      </span>
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-[12px] font-semibold bg-brand-navy text-white px-3 py-1.5 rounded-md group-hover:opacity-90 whitespace-nowrap">
                    Get the brief →
                  </span>
                </Link>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// — FEATURED variant ——————————————————————————————————
const FeaturedCard = ({ item }: { item: ArticleItem }) => (
  <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-2xl p-6 relative">
    {isEnriched(item) && (
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-semibold font-sans"
          style={{ background: 'rgba(232,238,255,0.2)', color: 'hsl(var(--brand-teal) / 0.6)' }}>
          <Sparkles className="w-3 h-3" />
          Intelligence
        </span>
      </div>
    )}
    {isSkipped(item) && (
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center px-1.5 py-1 rounded text-[11px] font-semibold font-sans bg-white/15 text-white/70">
          {skipLabel(item)}
        </span>
      </div>
    )}
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {item.category && (
        <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">{categoryLabel(item.category)}</span>
      )}
      {item.ai_summary?.urgency === 'Immediate' && (
        <span className="text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full"><Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Immediate</span>
      )}
    </div>
    <a
      href={item.source_url || `/updates/${item.id}`}
      {...(item.source_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-[12px] font-bold text-white leading-snug block mb-2 no-underline hover:text-blue-200 transition-colors">
      {normalizeTitle(item.title)}
    </a>
    {(item.summary || item.ai_summary?.why_it_matters) && (
      <p className="text-sm text-blue-200 leading-relaxed line-clamp-3">
        {stripHtml(item.summary) || item.ai_summary?.why_it_matters}
      </p>
    )}
    <p className="text-[11px] text-blue-300/70 mt-3">
      {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
    </p>
  </div>
);

// — ENFORCEMENT variant ——————————————————————————————————
const EnforcementCard = ({ item }: { item: ArticleItem }) => {
  const enriched = isEnriched(item);
  return (
    <div
      className={`flex items-start gap-3 py-2 ${enriched ? 'px-3 rounded-md' : ''}`}
      style={enriched ? { background: 'hsl(var(--brand-teal) / 0.08)', borderLeft: '3px solid hsl(var(--brand-teal))' } : undefined}
    >
      <div className="flex-1 min-w-0">
        <a
          href={item.source_url || `/updates/${item.id}`}
          {...(item.source_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="text-[11px] font-semibold text-gray-900 hover:text-brand-teal-text no-underline leading-snug block">
          {normalizeTitle(item.title)}
        </a>
        {item.summary && (
          <p className="text-sm text-gray-600 leading-snug mt-1 line-clamp-2">
            {stripHtml(item.summary)}
          </p>
        )}
        <p className="text-[11px] text-brand-mist mt-0.5">
          {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {enriched && (
        <span className="flex-shrink-0">
          <Sparkles className="w-3 h-3" style={{ color: 'hsl(var(--brand-teal))' }} />
        </span>
      )}
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-brand-mist hover:text-brand-teal-text mt-0.5">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};

// — NEWSFEED variant (lightweight outbound link card for anonymous users) ——
const NewsfeedCard = ({ item }: { item: ArticleItem }) => {
  const articleUrl = item.source_url || (item as any).url || '#';
  const hasExternal = articleUrl && articleUrl !== '#';
  return (
    <div className="group relative flex gap-3 py-3 border-b border-brand-cloud hover:bg-slate-50/50 transition-colors">
      <a
        href={hasExternal ? articleUrl : `/updates/${item.id}`}
        {...(hasExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex gap-3 flex-1 min-w-0 no-underline"
      >
        <ArticleThumb
          item={item}
          className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-slate-100"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {item.source_name && (
              <span className="text-[11px] text-slate-500 font-medium">{item.source_name}</span>
            )}
            {item.published_at && (
              <time className="text-[11px] text-slate-400" dateTime={item.published_at || undefined}>{fmtDate(item.published_at)}</time>
            )}
            {item.category && (
              <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(item.category)}`}>
                {categoryLabel(item.category)}
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-gray-900 leading-snug mb-1 group-hover:text-sky-700 transition-colors line-clamp-2">
            {normalizeTitle(item.title)}
          </p>
          {item.summary && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{stripHtml(item.summary)}</p>
          )}
        </div>
      </a>
      {hasExternal && (
        <a
          href={articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          aria-label="Open original source in new tab"
          title="Open original source"
          className="flex-shrink-0 mt-1 text-slate-300 hover:text-slate-600 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};

// — PREVIEW variant (anonymous teaser of full enrichment) ——
const PreviewCard = ({ item }: { item: ArticleItem }) => {
  const s = item.ai_summary;
  const urgency = s?.urgency;
  const urgencyLabel = urgency === 'immediate' || urgency === 'Immediate' ? 'High urgency'
    : urgency === 'this-quarter' || urgency === 'This Quarter' ? 'Medium urgency'
    : urgency ? 'Monitor' : null;
  const urgencyClass = urgency === 'immediate' || urgency === 'Immediate'
    ? 'bg-red-100 text-red-800 border border-red-200'
    : urgency === 'this-quarter' || urgency === 'This Quarter'
    ? 'bg-amber-100 text-amber-800 border border-amber-200'
    : 'bg-green-100 text-green-800 border border-green-200';

  return (
    <div className="rounded-xl border border-sky-200/60 bg-white overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 bg-sky-50/60 border-b border-sky-100 flex-wrap">
        <span className="text-[11px] font-bold tracking-widest uppercase text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
          Intelligence preview
        </span>
        {urgencyLabel && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${urgencyClass}`}>
            {urgencyLabel}
          </span>
        )}
        <span className="text-[11px] text-slate ml-auto">{item.source_name}</span>
        {item.published_at && (
          <time className="text-[11px] text-slate-400" dateTime={item.published_at || undefined}>{fmtDate(item.published_at)}</time>
        )}
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-mist hover:text-sky-700 transition-colors"
            aria-label="Open source article"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-3 mb-3">
          <ArticleThumb
            item={item}
            className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-slate-100"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-900 leading-snug mb-1">{normalizeTitle(item.title)}</p>
            {item.summary && (
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{stripHtml(item.summary)}</p>
            )}
          </div>
        </div>

        {s?.why_it_matters && (
          <div
            className="border-l-4 px-3 py-2 rounded-r-lg mb-3"
            style={{ borderColor: 'hsl(var(--brand-teal))', background: 'hsl(var(--brand-teal) / 0.12)' }}
          >
            <p
              className="text-[11px] font-bold tracking-wider uppercase mb-1"
              style={{ color: 'hsl(var(--brand-teal))' }}
            >
              Why it matters
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{stripHtml(s.why_it_matters)}</p>
          </div>
        )}

        {item.affected_sectors && item.affected_sectors.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">Affected sectors</p>
            <div className="flex gap-1 flex-wrap">
              {item.affected_sectors.slice(0, 3).map((sec: string, i: number) => (
                <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{sec}</span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center gap-3">
          <p className="text-[12px] text-slate flex-1">
            Register free to see analysis like this on every update.
          </p>
          <Link
            to="/signup"
            className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent-light transition-colors whitespace-nowrap"
          >
            Register free →
          </Link>
        </div>
      </div>
    </div>
  );
};

// — HOMEPAGE variant (anonymous users — uniform internal-link card) ——
export const HomepageCard = ({ item }: { item: ArticleItem }) => {
  return (
    <div className="flex gap-3 items-start py-3 border-b border-brand-cloud last:border-0">
      <ArticleThumb
        item={item}
        className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-100"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {item.source_name && (
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
              {item.source_name}
            </span>
          )}
          {item.published_at && (
            <time className="text-[11px] text-brand-mist" dateTime={item.published_at || undefined}>{fmtDate(item.published_at)}</time>
          )}
          {item.category && (
            <span className={`${CATEGORY_BADGE_CLASS} ${categoryClass(item.category)}`}>
              {categoryLabel(item.category)}
            </span>
          )}
          <AdminHideButton articleId={item.id} />
        </div>
        <TitleLink
          item={item}
          className="text-[11px] font-semibold text-gray-900 hover:text-brand-teal-text leading-snug block no-underline transition-colors"
        >
          {normalizeTitle(item.title)}
          {item.source_url && <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-30" />}
        </TitleLink>
        {(() => {
          const s = item.why_it_matters_short ?? item.ai_summary?.why_it_matters_short;
          return s ? (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug">{s}</p>
          ) : null;
        })()}
      </div>
    </div>
  );
};

// — MAIN EXPORT ——————————————————————————————————
interface ArticleCardProps {
  item: ArticleItem;
  variant?: ArticleCardVariant;
  isPremium?: boolean;
  userSalutation?: string;
  onOpenDrawer?: (item: ArticleItem) => void;
}

export const ArticleCard = ({
  item,
  variant = 'full',
  isPremium = false,
  userSalutation,
}: ArticleCardProps) => {
  switch (variant) {
    case 'compact':     return <CompactCard item={item} />;
    case 'featured':    return <FeaturedCard item={item} />;
    case 'enforcement': return <EnforcementCard item={item} />;
    case 'newsfeed':    return <NewsfeedCard item={item} />;
    case 'preview':     return <PreviewCard item={item} />;
    case 'homepage':    return <HomepageCard item={item} />;
    default:            return (
      <FullCard
        item={item}
        isPremium={isPremium}
        userSalutation={userSalutation}
      />
    );
  }
};

export default ArticleCard;
