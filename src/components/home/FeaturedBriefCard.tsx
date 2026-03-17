import { Link } from "react-router-dom";

const ISO_TO_FLAG: Record<string, string> = {
  "US": "🇺🇸", "EU": "🇪🇺", "GB": "🇬🇧", "FR": "🇫🇷", "DE": "🇩🇪",
  "IT": "🇮🇹", "ES": "🇪🇸", "NL": "🇳🇱", "IE": "🇮🇪", "BE": "🇧🇪",
  "PL": "🇵🇱", "SE": "🇸🇪", "NO": "🇳🇴", "CH": "🇨🇭", "TR": "🇹🇷",
  "BR": "🇧🇷", "CA": "🇨🇦", "AU": "🇦🇺", "JP": "🇯🇵", "KR": "🇰🇷",
  "CN": "🇨🇳", "IN": "🇮🇳", "SG": "🇸🇬", "ZA": "🇿🇦", "IL": "🇮🇱",
  "AE": "🇦🇪", "SA": "🇸🇦", "MX": "🇲🇽", "AR": "🇦🇷",
  "GLOBAL": "🌐", "US-FEDERAL": "🇺🇸", "US-STATES": "🗺️",
};

export function getFlag(code: string): string {
  return ISO_TO_FLAG[code?.toUpperCase()] ?? "🌐";
}

interface FeaturedBriefProps {
  headline: string;
  summary: string;
  jurisdiction: string;
  jurisdictionFlag: string;
  category: string;
  date: string;
  href: string;
}

export default function FeaturedBriefCard({
  headline,
  summary,
  jurisdiction,
  jurisdictionFlag,
  category,
  date,
  href,
}: FeaturedBriefProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy to-steel text-white mb-8">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#60a5fa,_transparent_60%)]" />
      <div className="relative z-10 p-7 md:p-9">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200">
            📋 This Week's Top Story
          </span>
          <span className="text-blue-300 text-xs">·</span>
          <span className="text-blue-200 text-xs">{date}</span>
        </div>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">{jurisdictionFlag}</span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1 block">
              {category} · {jurisdiction}
            </span>
            <h2 className="font-display font-bold text-xl md:text-2xl leading-snug text-white">
              {headline}
            </h2>
          </div>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed mb-5 max-w-2xl">
          {summary}
        </p>
        <Link
          to={href}
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-all text-white font-semibold text-sm px-5 py-2.5 rounded-xl no-underline"
        >
          Read full analysis →
        </Link>
      </div>
    </div>
  );
}
