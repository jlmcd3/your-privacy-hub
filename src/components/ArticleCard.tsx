import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { stripHtml, normalizeTitle } from "@/lib/utils";

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
  ai_summary?: {
    urgency?: string | null;
    legal_weight?: string | null;
    why_it_matters?: string | null;
  } | null;
}

// Variant controls the density and context of display
export type ArticleCardVariant = 'full' | 'compact' | 'featured' | 'enforcement';

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

// Legal weight badge colors
const WEIGHT_COLORS: Record<string, string> = {
  'Binding Decision': 'bg-navy text-white',
  'Binding Guidance': 'bg-blue-700 text-white',
  'Soft Guidance': 'bg-blue-200 text-blue-800',
  'Enforcement Signal': 'bg-amber-100 text-amber-800',
  'Commentary': 'bg-gray-100 text-gray-600',
};

const fmtDate = (d?: string | null) => d
  ? new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  : null;

// — COMPACT variant ——————————————————————————————————
const CompactCard = ({ item }: { item: ArticleItem }) => (
  <Link to={`/updates/${item.id}`}
    className="block group hover:bg-fog/40 rounded-xl px-3 py-2.5 -mx-3 transition-colors no-underline">
    <div className="flex items-start gap-2">
      {item.category && (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${categoryClass(item.category)}`}>
          {categoryLabel(item.category)}
        </span>
      )}
      <p className="text-[13px] font-semibold text-navy leading-snug group-hover:text-blue transition-colors line-clamp-2">
        {normalizeTitle(item.title)}
      </p>
    </div>
    <p className="text-[11px] text-slate-light mt-1">
      {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
    </p>
  </Link>
);

// — FULL variant ——————————————————————————————————
const FullCard = ({ item }: { item: ArticleItem }) => {
  const urgency = item.ai_summary?.urgency;
  const weight = item.ai_summary?.legal_weight;
  return (
    <div className="flex gap-4 items-start py-4 border-b border-fog last:border-0">
      {/* Source logo placeholder */}
      <div className="w-10 h-10 rounded-lg bg-fog flex-shrink-0 flex items-center justify-center overflow-hidden">
        {item.source_name && (
          <span className="text-[9px] font-bold text-slate uppercase text-center leading-tight px-1">
            {item.source_name.split('.')[0].slice(0,6)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {/* Metadata row */}
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
          {urgency && URGENCY_COLORS[urgency] && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${URGENCY_COLORS[urgency]}`}>
              {urgency}
            </span>
          )}
          {weight && WEIGHT_COLORS[weight] && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${WEIGHT_COLORS[weight]}`}>
              {weight}
            </span>
          )}
        </div>
        {/* Title */}
        <Link to={`/updates/${item.id}`}
          className="text-[14px] font-bold text-navy hover:text-blue leading-snug block mb-1 no-underline transition-colors">
          {normalizeTitle(item.title)}
        </Link>
        {/* Summary */}
        {item.summary && (
          <p className="text-[13px] text-slate leading-relaxed line-clamp-3">{stripHtml(item.summary)}</p>
        )}
        {/* Why it matters — first sentence only */}
        {!item.summary && item.ai_summary?.why_it_matters && (
          <p className="text-[13px] text-slate leading-relaxed line-clamp-2">
            {item.ai_summary.why_it_matters}
          </p>
        )}
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
  <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6">
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
// Preserves dense table-row layout. Used inside the enforcement tracker.
const EnforcementCard = ({ item }: { item: ArticleItem }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="flex-1 min-w-0">
      <Link to={`/updates/${item.id}`}
        className="text-[13px] font-semibold text-navy hover:text-blue no-underline leading-snug block">
        {item.title}
      </Link>
      <p className="text-[11px] text-slate-light mt-0.5">
        {[item.source_name, fmtDate(item.published_at)].filter(Boolean).join(' · ')}
      </p>
    </div>
    {item.source_url && (
      <a href={item.source_url} target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 text-slate-light hover:text-blue mt-0.5">
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    )}
  </div>
);

// — MAIN EXPORT ——————————————————————————————————
interface ArticleCardProps {
  item: ArticleItem;
  variant?: ArticleCardVariant;
}

export const ArticleCard = ({ item, variant = 'full' }: ArticleCardProps) => {
  switch (variant) {
    case 'compact':     return <CompactCard item={item} />;
    case 'featured':    return <FeaturedCard item={item} />;
    case 'enforcement': return <EnforcementCard item={item} />;
    default:            return <FullCard item={item} />;
  }
};

export default ArticleCard;
