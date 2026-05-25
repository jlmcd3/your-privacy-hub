import { Link } from "react-router-dom";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import eupTile from "@/assets/eup-intelligence-tile.jpg";
import { getSeverityLabel } from "@/lib/severity";

interface AnonymousUpdatesCardItem {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  published_at?: string | null;
  source_name?: string | null;
  image_url?: string | null;
  why_it_matters_short?: string | null;
  source_url?: string | null;
  ai_summary?: { why_it_matters_short?: string | null; urgency?: string | null; legal_weight?: string | null } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  enforcement: "bg-red-50 text-red-700 border border-red-200",
  "eu-uk": "bg-blue-50 text-blue-700 border border-blue-200",
  "us-federal": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "us-states": "bg-violet-50 text-violet-700 border border-violet-200",
  global: "bg-teal-50 text-teal-700 border border-teal-200",
  "ai-privacy": "bg-purple-50 text-purple-700 border border-purple-200",
  adtech: "bg-orange-50 text-orange-700 border border-orange-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  enforcement: "Enforcement",
  "eu-uk": "EU & UK",
  "us-federal": "U.S. Federal",
  "us-states": "U.S. States",
  global: "Global",
  "ai-privacy": "AI & Privacy",
  adtech: "AdTech",
};

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

export default function AnonymousUpdatesCard({ item }: { item: AnonymousUpdatesCardItem }) {
  const cat = item.category || "";
  const catClass = CATEGORY_COLORS[cat] || "bg-gray-50 text-gray-600 border border-gray-200";
  const catLabel = CATEGORY_LABELS[cat] || cat;
  const shortWhy = item.why_it_matters_short ?? item.ai_summary?.why_it_matters_short;

  return (
    <a
      href={item.source_url || `/updates/${item.id}`}
      {...(item.source_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex gap-4 items-start py-4 border-b border-brand-cloud last:border-0 no-underline"
    >
      {/* Article thumbnail — falls back to EUP brand tile when missing */}
      <img
        src={item.image_url || eupTile}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-100"
        onError={(e) => {
          (e.target as HTMLImageElement).src = eupTile;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {item.source_name && (
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
              {item.source_name}
            </span>
          )}
          {item.published_at && (
            <span className="text-[11px] text-brand-mist">{fmtDate(item.published_at)}</span>
          )}
          {cat && (
            <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${catClass}`}>
              {catLabel}
            </span>
          )}
          {(() => {
            const sev = getSeverityLabel(item.ai_summary);
            return sev ? (
              <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${sev.className}`}>
                {sev.label}
              </span>
            ) : null;
          })()}
        </div>
        <p className="text-[14px] font-bold text-brand-navy group-hover:text-brand-teal leading-snug mb-1 transition-colors">
          {normalizeTitle(item.title)}
        </p>
        {item.summary && (
          <p className="text-xs text-slate leading-relaxed line-clamp-2 mt-1">
            {stripHtml(item.summary)}
          </p>
        )}
        {shortWhy && (
          <div className="mt-2 border-l-4 px-3 py-2 rounded-r-lg" style={{ borderColor: 'hsl(var(--brand-teal))', background: 'hsl(var(--brand-teal) / 0.12)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'hsl(var(--brand-teal))' }}>
              Why it matters
            </p>
            <p className="text-xs text-brand-navy leading-relaxed line-clamp-2">{stripHtml(shortWhy)}</p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[11px] text-slate flex-1">Full analysis on every update — free account</p>
          <Link
            to="/signup"
            className="flex-shrink-0 text-[11px] font-semibold bg-accent text-white px-2.5 py-1.5 rounded-lg hover:bg-accent-light transition-colors no-underline whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            Register free →
          </Link>
        </div>
      </div>
    </a>
  );
}
