import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, ChevronDown, EyeOff } from "lucide-react";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import { ActionBrief } from "@/components/ActionBrief";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import eupTile from "@/assets/eup-intelligence-tile.jpg";
import { categoryClass, categoryLabel, CATEGORY_BADGE_CLASS } from "@/config/categories";
import { fmtDate } from "@/lib/dates";

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
const EUP_TILE = eupTile;

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
  } | null;
}

// Variant controls the density and context of display
export type ArticleCardVariant = 'full' | 'compact' | 'featured' | 'enforcement' | 'newsfeed' | 'preview' | 'homepage';

// Determine if article is AI-enriched (has meaningful ai_summary content)
const isEnriched = (item: ArticleItem): boolean => {
  if (!item.ai_summary) return false;
  const s = item.ai_summary;
  return !!(s.why_it_matters || s.urgency || s.legal_weight || s.compliance_impact || s.risk_level);
};

// Category colors/labels live in src/config/categories.ts (shared with UpdateDetail).

// (URGENCY_COLORS / ATTENTION_COLORS removed — Attention badge dropped from
// surface cards; urgency now appears only inside the paid Intelligence Card.)


// Legal weight badge colors
const WEIGHT_COLORS: Record<string, string> = {
  'Binding Decision': 'bg-navy text-white',
  'Binding Guidance': 'bg-blue-700 text-white',
  'Soft Guidance': 'bg-blue-200 text-blue-800',
  'Enforcement Signal': 'bg-amber-100 text-amber-800',
  'Commentary': 'bg-gray-100 text-gray-600',
  'In effect': 'bg-navy text-white',
  'Enforcement action': 'bg-red-100 text-red-800',
  'Guidance issued': 'bg-blue-200 text-blue-800',
  'Proposed': 'bg-amber-100 text-amber-800',
};

const fmtDate = (d?: string | null) => d
  ? new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  : null;

// — Intelligence badge for enriched articles —
const IntelligenceBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-semibold font-sans"
    style={{ background: '#E8EEFF', color: '#4A6FA5' }}>
    <Sparkles className="w-3 h-3" />
    Intelligence
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
    <div className="mt-3 rounded-lg border" style={{ borderColor: '#C8D5F0', background: '#F7F9FF' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/60 rounded-t-lg transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#4A6FA5' }} />
          <span className="text-[12px] font-bold" style={{ color: '#4A6FA5' }}>
            Intelligence Card
          </span>
          <span className="text-[11px] text-slate">
            — connect the dots, compliance impact, action items
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#4A6FA5' }} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t" style={{ borderColor: '#E0E8F5' }}>
          {/* Connect the dots — related signals */}
          {signals && signals.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#4A6FA5' }}>
                Connect the dots
              </p>
              <ul className="space-y-1">
                {signals.map((sig, i) => (
                  <li key={i} className="text-[12px] text-navy flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>{sig.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Regulatory theory + related */}
          {(regTheory || related) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t" style={{ borderColor: '#E0E8F5' }}>
              {regTheory && (
                <div className="text-[11px]">
                  <span className="font-bold text-navy">Regulatory theory: </span>
                  <span className="text-slate">{regTheory}</span>
                </div>
              )}
              {related && (
                <div className="text-[11px]">
                  <span className="font-bold text-navy">Related: </span>
                  <span className="text-slate">{related}</span>
                </div>
              )}
            </div>
          )}

          {/* Meta footer */}
          {(urgency || weight) && (
            <div className="flex gap-3 pt-1">
              {urgency && (
                <span className="text-[10px] text-slate">
                  Urgency: <span className="font-semibold text-navy">{urgency}</span>
                </span>
              )}
              {weight && (
                <span className="text-[10px] text-slate">
                  Legal weight: <span className="font-semibold text-navy">{weight}</span>
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
  return (
    <Link to={`/updates/${item.id}`}
      className={`block group rounded-xl px-3 py-2.5 -mx-3 transition-colors no-underline ${
        enriched ? 'hover:bg-[#e4eafc]' : 'hover:bg-fog/40'
      }`}
      style={enriched ? { background: '#F0F4FF', borderLeft: '3px solid #4A6FA5' } : undefined}
    >
      <div className="flex items-start gap-2">
        {item.category && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${categoryClass(item.category)}`}>
            {categoryLabel(item.category)}
          </span>
        )}
        <p className="text-[13px] font-semibold text-navy leading-snug group-hover:text-blue transition-colors line-clamp-2 flex-1">
          {normalizeTitle(item.title)}
        </p>
        {enriched && <IntelligenceBadge />}
      </div>
      {item.summary && (
        <p className="text-[11.5px] text-slate leading-snug mt-1 line-clamp-2">
          {stripHtml(item.summary)}
        </p>
      )}
      <p className="text-[11px] text-slate-light mt-1">
        {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
      </p>
    </Link>
  );
};

// — FULL variant ——————————————————————————————————
const FullCard = ({ item, isPremium = false, userSalutation = 'your team' }: { item: ArticleItem; isPremium?: boolean; userSalutation?: string }) => {
  const enriched = isEnriched(item);
  const weight = item.ai_summary?.legal_weight;
  const shortWhy = item.why_it_matters_short || item.ai_summary?.why_it_matters_short;
  // Both registered tiers see the short why-it-matters; paid tier additionally
  // gets the expandable Intelligence Card. Anonymous users use the newsfeed variant.
  const accentBackground = enriched && isPremium;

  return (
    <div
      className={`flex gap-4 items-start py-4 border-b border-fog last:border-0 relative ${accentBackground ? 'px-4 rounded-lg my-1' : ''}`}
      style={accentBackground ? { background: '#F0F4FF', borderLeft: '3px solid #4A6FA5' } : undefined}
    >
      {/* Article thumbnail — falls back to EUP brand tile when missing */}
      <img
        src={item.image_url || EUP_TILE}
        alt=""
        loading="lazy"
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-100"
        onError={e => { (e.target as HTMLImageElement).src = EUP_TILE; }}
      />
      <div className="flex-1 min-w-0">
        {/* Metadata row — base info always shown; legal weight badge if enriched */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {item.source_name && (
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">{item.source_name}</span>
          )}
          {item.published_at && (
            <span className="text-[11px] text-slate-light">{fmtDate(item.published_at)}</span>
          )}
          {item.category && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${categoryClass(item.category)}`}>
              {categoryLabel(item.category)}
            </span>
          )}
          {enriched && weight && WEIGHT_COLORS[weight] && (
            <span className={`font-mono-code text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${WEIGHT_COLORS[weight]}`}>
              {weight}
            </span>
          )}
          <AdminHideButton articleId={item.id} />
        </div>
        {/* Title */}
        <Link to={`/updates/${item.id}`}
          className="text-[14px] font-bold text-navy hover:text-blue leading-snug block mb-1 no-underline transition-colors">
          {normalizeTitle(item.title)}
        </Link>
        {/* Article excerpt — first two lines of the source article */}
        {item.summary && (
          <p className="text-[12.5px] text-slate leading-relaxed line-clamp-2 mt-1">
            {stripHtml(item.summary)}
          </p>
        )}
        {/* Why it matters — Pro sees full, free sees short */}
        {isPremium && item.ai_summary?.why_it_matters ? (
          <div className="mt-2 flex gap-2 items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#E8EEFF', color: '#4A6FA5' }}>
              Why it matters
            </span>
            <p className="text-[12.5px] text-navy leading-relaxed">{stripHtml(item.ai_summary.why_it_matters)}</p>
          </div>
        ) : shortWhy ? (
          <div className="mt-2 flex gap-2 items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: '#E8EEFF', color: '#4A6FA5' }}>
              Why it matters
            </span>
            <p className="text-[12.5px] text-navy leading-relaxed">{stripHtml(shortWhy)}</p>
          </div>
        ) : null}
        {/* Inline takeaways — Pro only */}
        {isPremium && item.ai_summary?.takeaways && item.ai_summary.takeaways.length > 0 && (
          <ul className="mt-2 space-y-1 pl-4 list-disc">
            {item.ai_summary.takeaways.map((t, i) => (
              <li key={i} className="text-[12px] text-slate leading-relaxed">{t}</li>
            ))}
          </ul>
        )}
        {/* Action Brief — both registered tiers (blurred for free, full for Pro) */}
        {(item.ai_summary?.compliance_impact || item.ai_summary?.urgency) && (
          <ActionBrief
            urgency={item.ai_summary?.urgency ?? null}
            who_should_care={(item.ai_summary as any)?.who_should_care ?? null}
            compliance_impact={item.ai_summary?.compliance_impact ?? null}
            action_items={item.action_items ?? null}
            risk_level={item.ai_summary?.risk_level ?? null}
            isPremium={isPremium}
            articleId={item.id}
          />
        )}
        {/* Upgrade CTA — free signed-in only */}
        {!isPremium && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-[11px] text-amber-700 flex-1">Unlock action items, compliance impact, and full analysis</p>
            <Link
              to="/subscribe"
              className="flex-shrink-0 text-[11px] font-semibold bg-amber-500 text-white px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity no-underline whitespace-nowrap"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
        {/* Intelligence Card — paid only, collapsed by default */}
        {isPremium && <IntelligenceCard item={item} />}
      </div>
      {/* External link */}
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-slate-light hover:text-blue transition-colors mt-1">
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};

// — FEATURED variant ——————————————————————————————————
const FeaturedCard = ({ item }: { item: ArticleItem }) => (
  <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 relative">
    {isEnriched(item) && (
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-semibold font-sans"
          style={{ background: 'rgba(232,238,255,0.2)', color: '#B8CCFF' }}>
          <Sparkles className="w-3 h-3" />
          Intelligence
        </span>
      </div>
    )}
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {item.category && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">{categoryLabel(item.category)}</span>
      )}
      {item.ai_summary?.urgency === 'Immediate' && (
        <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">⚡ Immediate</span>
      )}
    </div>
    <Link to={`/updates/${item.id}`}
      className="text-[18px] font-bold text-white leading-snug block mb-2 no-underline hover:text-blue-200 transition-colors">
      {normalizeTitle(item.title)}
    </Link>
    {(item.summary || item.ai_summary?.why_it_matters) && (
      <p className="text-[13px] text-blue-200 leading-relaxed line-clamp-3">
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
      style={enriched ? { background: '#F0F4FF', borderLeft: '3px solid #4A6FA5' } : undefined}
    >
      <div className="flex-1 min-w-0">
        <Link to={`/updates/${item.id}`}
          className="text-[13px] font-semibold text-navy hover:text-blue no-underline leading-snug block">
          {normalizeTitle(item.title)}
        </Link>
        {item.summary && (
          <p className="text-[11.5px] text-slate leading-snug mt-1 line-clamp-2">
            {stripHtml(item.summary)}
          </p>
        )}
        <p className="text-[11px] text-slate-light mt-0.5">
          {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
        </p>
      </div>
      {enriched && (
        <span className="flex-shrink-0">
          <Sparkles className="w-3 h-3" style={{ color: '#4A6FA5' }} />
        </span>
      )}
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-slate-light hover:text-blue mt-0.5">
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
    <div className="group relative flex gap-3 py-3 border-b border-fog hover:bg-slate-50/50 transition-colors">
      <Link
        to={`/updates/${item.id}`}
        className="flex gap-3 flex-1 min-w-0 no-underline"
      >
        <img
          src={item.image_url || EUP_TILE}
          alt=""
          loading="lazy"
          className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-slate-100"
          onError={e => { (e.target as HTMLImageElement).src = EUP_TILE; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {item.source_name && (
              <span className="text-[10px] text-slate-500 font-medium">{item.source_name}</span>
            )}
            {item.published_at && (
              <span className="text-[10px] text-slate-400">{fmtDate(item.published_at)}</span>
            )}
            {item.category && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${categoryClass(item.category)}`}>
                {categoryLabel(item.category)}
              </span>
            )}
          </div>
          <p className="text-[13px] font-medium text-navy leading-snug mb-1 group-hover:text-sky-700 transition-colors line-clamp-2">
            {normalizeTitle(item.title)}
          </p>
          {item.summary && (
            <p className="text-[12px] text-slate leading-relaxed line-clamp-2">{stripHtml(item.summary)}</p>
          )}
        </div>
      </Link>
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
        <span className="text-[9px] font-bold tracking-widest uppercase text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
          Intelligence preview
        </span>
        {urgencyLabel && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${urgencyClass}`}>
            {urgencyLabel}
          </span>
        )}
        <span className="text-[10px] text-slate ml-auto">{item.source_name}</span>
        {item.published_at && (
          <span className="text-[10px] text-slate-400">{fmtDate(item.published_at)}</span>
        )}
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-light hover:text-sky-700 transition-colors"
            aria-label="Open source article"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-3 mb-3">
          <img
            src={item.image_url || EUP_TILE}
            alt=""
            loading="lazy"
            className="w-20 h-20 rounded-md object-cover flex-shrink-0 bg-slate-100"
            onError={e => { (e.target as HTMLImageElement).src = EUP_TILE; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-navy leading-snug mb-1">{normalizeTitle(item.title)}</p>
            {item.summary && (
              <p className="text-[12.5px] text-slate leading-relaxed line-clamp-2">{stripHtml(item.summary)}</p>
            )}
          </div>
        </div>

        {s?.why_it_matters && (
          <div className="border-l-4 border-sky-500 bg-sky-50 px-3 py-2 rounded-r-lg mb-3">
            <p className="text-[10px] font-bold tracking-wider uppercase text-sky-700 mb-1">Why it matters</p>
            <p className="text-[12px] text-sky-900 leading-relaxed">{stripHtml(s.why_it_matters)}</p>
          </div>
        )}

        {item.affected_sectors && item.affected_sectors.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">Affected sectors</p>
            <div className="flex gap-1 flex-wrap">
              {item.affected_sectors.slice(0, 3).map((sec: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{sec}</span>
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
            className="shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 transition-colors whitespace-nowrap"
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
  const shortWhy = item.why_it_matters_short || item.ai_summary?.why_it_matters_short;
  return (
    <Link
      to={`/updates/${item.id}`}
      className="block group py-4 border-b border-fog last:border-0 no-underline"
    >
      <div className="flex gap-3">
        <img
          src={item.image_url || EUP_TILE}
          alt=""
          loading="lazy"
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-md object-cover flex-shrink-0 bg-slate-100"
          onError={e => { (e.target as HTMLImageElement).src = EUP_TILE; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {item.source_name && (
              <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">{item.source_name}</span>
            )}
            {item.published_at && (
              <span className="text-[11px] text-slate-light">{fmtDate(item.published_at)}</span>
            )}
            {item.category && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${categoryClass(item.category)}`}>
                {categoryLabel(item.category)}
              </span>
            )}
          </div>
          <p className="text-[14px] font-bold text-navy group-hover:text-blue leading-snug mb-1 transition-colors">
            {normalizeTitle(item.title)}
          </p>
          {item.summary && (
            <p className="text-[12.5px] text-slate leading-relaxed line-clamp-2">
              {stripHtml(item.summary)}
            </p>
          )}
          {shortWhy && (
            <div className="mt-2 border-l-4 px-3 py-2 rounded-r-lg" style={{ borderColor: '#4A6FA5', background: '#E8EEFF' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#4A6FA5' }}>
                Why it matters
              </p>
              <p className="text-[12.5px] text-navy leading-relaxed">{stripHtml(shortWhy)}</p>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <p className="text-[11px] text-slate flex-1">Full analysis on every update — free account</p>
            <Link
              to="/signup"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-[11px] font-semibold bg-teal-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-500 transition-colors no-underline whitespace-nowrap"
            >
              Register free →
            </Link>
          </div>
        </div>
      </div>
    </Link>
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

export const ArticleCard = ({ item, variant = 'full', isPremium = false, userSalutation }: ArticleCardProps) => {
  switch (variant) {
    case 'compact':     return <CompactCard item={item} />;
    case 'featured':    return <FeaturedCard item={item} />;
    case 'enforcement': return <EnforcementCard item={item} />;
    case 'newsfeed':    return <NewsfeedCard item={item} />;
    case 'preview':     return <PreviewCard item={item} />;
    case 'homepage':    return <HomepageCard item={item} />;
    default:            return <FullCard item={item} isPremium={isPremium} userSalutation={userSalutation} />;
  }
};

export default ArticleCard;
