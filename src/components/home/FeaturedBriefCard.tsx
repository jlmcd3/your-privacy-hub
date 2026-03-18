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
  aiSummary?: {
    why_it_matters?: string;
    urgency?: string;
    compliance_impact?: string;
  } | null;
}

export default function FeaturedBriefCard({
  headline,
  summary,
  jurisdiction,
  jurisdictionFlag,
  category,
  date,
  href,
  aiSummary,
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
          <span className="text-2xl flex-shrink-0 flag-emoji">{getFlag(jurisdictionFlag) !== "🌐" ? getFlag(jurisdictionFlag) : jurisdictionFlag}</span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1 block">
              {category} · {jurisdiction}
            </span>
            <h2 className="font-display font-bold text-xl md:text-2xl leading-snug text-white">
              {headline}
            </h2>
          </div>
        </div>

        {/* Show ai_summary why_it_matters if available, else fall back to summary */}
        <p className="text-blue-100 text-sm leading-relaxed mb-4 max-w-2xl">
          {aiSummary?.why_it_matters
            ? aiSummary.why_it_matters.split(/\.\s+/)[0] + "."
            : summary}
        </p>

        {/* Urgency + compliance impact strip if ai_summary available */}
        {aiSummary?.urgency && aiSummary.urgency !== "Monitor" && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              aiSummary.urgency === "Immediate"
                ? "bg-red-900/40 text-red-300 border-red-700/40"
                : "bg-amber-900/30 text-amber-300 border-amber-700/30"
            }`}>
              {aiSummary.urgency === "Immediate" ? "⚡ Immediate action" : "📅 This quarter"}
            </span>
            {aiSummary.compliance_impact && (
              <span className="text-blue-300 text-[11px] line-clamp-1 flex-1">
                {aiSummary.compliance_impact.split(".")[0]}
              </span>
            )}
          </div>
        )}

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-all text-white font-semibold text-sm px-5 py-2.5 rounded-xl no-underline"
        >
          Read full analysis ↗
        </a>
      </div>
    </div>
  );
}
