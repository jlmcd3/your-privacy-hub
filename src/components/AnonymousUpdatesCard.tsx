import { Link } from "react-router-dom";
import { stripHtml, normalizeTitle } from "@/lib/utils";
import eupTile from "@/assets/eup-intelligence-tile.jpg";

interface AnonymousUpdatesCardItem {
  id: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  published_at?: string | null;
  source_name?: string | null;
  image_url?: string | null;
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

  return (
    <Link
      to={`/updates/${item.id}`}
      className="group flex gap-4 items-start py-4 border-b border-fog last:border-0 no-underline"
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
            <span className="text-[11px] text-slate-light">{fmtDate(item.published_at)}</span>
          )}
          {cat && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${catClass}`}>
              {catLabel}
            </span>
          )}
        </div>
        <p className="text-[14px] font-bold text-navy group-hover:text-blue leading-snug mb-1 transition-colors">
          {normalizeTitle(item.title)}
        </p>
        {item.summary && (
          <p className="text-[13px] text-slate leading-relaxed line-clamp-2">
            {stripHtml(item.summary)}
          </p>
        )}
      </div>
    </Link>
  );
}
