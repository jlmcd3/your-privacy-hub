import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Sparkles, ChevronDown } from "lucide-react";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import PremiumGate from "@/components/PremiumGate";

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
  ai_summary?: {
    urgency?: string | null;
    legal_weight?: string | null;
    why_it_matters?: string | null;
    compliance_impact?: string | null;
    risk_level?: string | null;
    skipped?: boolean;
  } | null;
}

// Variant controls the density and context of display
export type ArticleCardVariant = 'full' | 'compact' | 'featured' | 'enforcement' | 'newsfeed' | 'preview';

// Determine if article is AI-enriched (has meaningful ai_summary content)
const isEnriched = (item: ArticleItem): boolean => {
  if (!item.ai_summary) return false;
  const s = item.ai_summary;
  return !!(s.why_it_matters || s.urgency || s.legal_weight || s.compliance_impact || s.risk_level);
};

// Badge colors keyed by category string
const CATEGORY_COLORS: Record<string, string> = {
  'enforcement': 'bg-red-50 text-red-700 border border-red-200',
  'eu-uk': 'bg-blue-50 text-blue-700 border border-blue-200',
  'us-federal': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'us-states': 'bg-violet-50 text-violet-700 border border-violet-200',
  'global': 'bg-teal-50 text-teal-700 border border-teal-200',
  'ai-privacy': 'bg-purple-50 text-purple-700 border border-purple-200',
  'adtech': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Enforcement': 'bg-red-50 text-red-700 border border-red-200',
  'EU & UK': 'bg-blue-50 text-blue-700 border border-blue-200',
  'U.S. Federal': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'U.S. States': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Global': 'bg-teal-50 text-teal-700 border border-teal-200',
  'AI & Privacy': 'bg-purple-50 text-purple-700 border border-purple-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  'enforcement': 'Enforcement',
  'eu-uk': 'EU & UK',
  'us-federal': 'U.S. Federal',
  'us-states': 'U.S. States',
  'global': 'Global',
  'ai-privacy': 'AI & Privacy',
  'adtech': 'AdTech',
};

const categoryClass = (cat?: string | null) =>
  CATEGORY_COLORS[cat || ''] || 'bg-gray-50 text-gray-600 border border-gray-200';

const categoryLabel = (cat?: string | null) =>
  CATEGORY_LABELS[cat || ''] || cat || '';

// Urgency badge colors
const URGENCY_COLORS: Record<string, string> = {
  'Immediate': 'bg-red-500 text-white',
  'This Quarter': 'bg-amber-500 text-white',
  'Monitor': 'bg-slate-400 text-white',
};

// Attention level badge colors
const ATTENTION_COLORS: Record<string, string> = {
  'High': 'bg-red-100 text-red-800 border border-red-200',
  'Medium': 'bg-amber-100 text-amber-800 border border-amber-200',
  'Low': 'bg-green-100 text-green-800 border border-green-200',
};

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

// — Enrichment detail accordion —
const EnrichmentAccordion = ({ item, isPremium = false }: { item: ArticleItem; isPremium?: boolean }) => {
  const [open, setOpen] = useState(false);
  const s = item.ai_summary;
  if (!s) return null;

  const details = [
    s.compliance_impact && { label: 'Compliance Impact', value: s.compliance_impact },
    s.risk_level && { label: 'Risk Level', value: s.risk_level },
    s.urgency && { label: 'Urgency', value: s.urgency },
    s.legal_weight && { label: 'Legal Weight', value: s.legal_weight },
    item.regulatory_theory && { label: 'Regulatory Theory', value: item.regulatory_theory },
    item.related_development && { label: 'Related Development', value: item.related_development },
  ].filter(Boolean) as { label: string; value: string }[];

  // Only show accordion if there's detail beyond what's already visible
  if (details.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 text-[12px] font-semibold hover:underline transition-colors"
        style={{ color: '#4A6FA5' }}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide details' : 'View analysis'}
      </button>
      {open && !isPremium && (
        <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <PremiumGate message="Full compliance analysis is a Premium feature." blur={false} />
        </div>
      )}
      {open && isPremium && (
        <div className="mt-2 pl-3 border-l-2 space-y-1.5" style={{ borderColor: '#4A6FA5' }}>
          {details.map((d) => (
            <div key={d.label}>
              <span className="text-[11px] font-bold text-navy">{d.label}:</span>{' '}
              <span className="text-[12px] text-slate">{d.value}</span>
            </div>
          ))}
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
      <p className="text-[11px] text-slate-light mt-1">
        {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
      </p>
    </Link>
  );
};

// — FULL variant ——————————————————————————————————
const FullCard = ({ item, isPremium = false }: { item: ArticleItem; isPremium?: boolean }) => {
  const urgency = item.ai_summary?.urgency;
  const weight = item.ai_summary?.legal_weight;
  const enriched = isEnriched(item);
  // Only premium subscribers see enriched-derived content (urgency, legal weight,
  // attention level, sectors, "why it matters", and the analysis accordion).
  // Non-premium users get the basic article card with a single upgrade nudge.
  const showEnrichment = enriched && isPremium;

  return (
    <div
      className={`flex gap-4 items-start py-4 border-b border-fog last:border-0 relative ${showEnrichment ? 'px-4 rounded-lg my-1' : ''}`}
      style={showEnrichment ? { background: '#F0F4FF', borderLeft: '3px solid #4A6FA5' } : undefined}
    >
      {/* Intelligence badge top-right — premium only */}
      {showEnrichment && (
        <div className="absolute top-2 right-2">
          <IntelligenceBadge />
        </div>
      )}

      {/* Source logo placeholder */}
      <div className="w-10 h-10 rounded-lg bg-fog flex-shrink-0 flex items-center justify-center overflow-hidden">
        {item.source_name && (
          <span className="text-[9px] font-bold text-slate uppercase text-center leading-tight px-1">
            {item.source_name.split('.')[0].slice(0,6)}
          </span>
        )}
      </div>
      <div className={`flex-1 min-w-0 ${showEnrichment ? 'pr-20' : ''}`}>
        {/* Metadata row — base info always shown; enrichment-derived badges premium-only */}
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
          {showEnrichment && urgency && URGENCY_COLORS[urgency] && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${URGENCY_COLORS[urgency]}`}>
              {urgency}
            </span>
          )}
          {showEnrichment && weight && WEIGHT_COLORS[weight] && (
            <span className={`font-mono-code text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${WEIGHT_COLORS[weight]}`}>
              {weight}
            </span>
          )}
          {showEnrichment && item.attention_level && ATTENTION_COLORS[item.attention_level] && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${ATTENTION_COLORS[item.attention_level]}`}>
              {item.attention_level === 'High' ? '🔴' : item.attention_level === 'Medium' ? '🟡' : '🟢'} {item.attention_level}
            </span>
          )}
        </div>
        {/* Sector tags — enrichment-derived, premium-only */}
        {showEnrichment && item.affected_sectors && item.affected_sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {item.affected_sectors.slice(0, 4).map((sector) => (
              <span key={sector} className="text-[10px] font-medium text-slate bg-fog px-1.5 py-0.5 rounded">
                {sector}
              </span>
            ))}
            {item.affected_sectors.length > 4 && (
              <span className="text-[10px] text-slate-light">+{item.affected_sectors.length - 4}</span>
            )}
          </div>
        )}
        {/* Title */}
        <Link to={`/updates/${item.id}`}
          className="text-[14px] font-bold text-navy hover:text-blue leading-snug block mb-1 no-underline transition-colors">
          {normalizeTitle(item.title)}
        </Link>
        {/* Summary — base content, always shown */}
        {item.summary && (
          <p className="text-[13px] text-slate leading-relaxed line-clamp-3">{stripHtml(item.summary)}</p>
        )}
        {/* Why it matters — premium only (full text) */}
        {showEnrichment && item.ai_summary?.why_it_matters && (
          <div className="mt-1">
            <p className="text-[13px] text-emerald-700 leading-relaxed italic">
              <span className="font-semibold not-italic">Why it matters:</span>{' '}
              {stripHtml(item.ai_summary.why_it_matters)}
            </p>
          </div>
        )}
        {/* Note: enrichment upgrade nudge is rendered once at the feed level by
            TieredFeed for free registered users, to avoid per-card clutter. */}
        {/* Enrichment accordion — premium only */}
        {showEnrichment && <EnrichmentAccordion item={item} isPremium={isPremium} />}
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
  return (
    <a
      href={articleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 border-b border-fog hover:bg-slate-50/50 transition-colors no-underline"
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-slate-100"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-16 h-16 rounded-md bg-slate-100 flex-shrink-0 flex items-center justify-center text-[20px]">
          📰
        </div>
      )}
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
      <ExternalLink className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-1 group-hover:text-slate-500 transition-colors" />
    </a>
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
      </div>

      <div className="px-4 py-3">
        <p className="text-[14px] font-semibold text-navy leading-snug mb-3">{normalizeTitle(item.title)}</p>

        {s?.why_it_matters && (
          <div className="border-l-4 border-sky-500 bg-sky-50 px-3 py-2 rounded-r-lg mb-3">
            <p className="text-[10px] font-bold tracking-wider uppercase text-sky-700 mb-1">Why it matters</p>
            <p className="text-[12px] text-sky-900 leading-relaxed">{stripHtml(s.why_it_matters)}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-3">
          {s?.legal_weight && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">Legal weight</p>
              <p className="text-[11px] font-medium text-navy">{s.legal_weight}</p>
            </div>
          )}
          {item.affected_sectors && item.affected_sectors.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">Affected sectors</p>
              <div className="flex gap-1 flex-wrap">
                {item.affected_sectors.slice(0, 3).map((sec: string, i: number) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{sec}</span>
                ))}
              </div>
            </div>
          )}
        </div>

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

// — MAIN EXPORT ——————————————————————————————————
interface ArticleCardProps {
  item: ArticleItem;
  variant?: ArticleCardVariant;
  isPremium?: boolean;
  onOpenDrawer?: (item: ArticleItem) => void;
}

export const ArticleCard = ({ item, variant = 'full', isPremium = false }: ArticleCardProps) => {
  switch (variant) {
    case 'compact':     return <CompactCard item={item} />;
    case 'featured':    return <FeaturedCard item={item} />;
    case 'enforcement': return <EnforcementCard item={item} />;
    case 'newsfeed':    return <NewsfeedCard item={item} />;
    case 'preview':     return <PreviewCard item={item} />;
    default:            return <FullCard item={item} isPremium={isPremium} />;
  }
};

export default ArticleCard;
