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
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy via-navy to-steel text-white mb-8 min-h-[260px] md:min-h-[300px]">
      {/* Subtle radial highlights */}
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(ellipse_at_top_right,_#60a5fa,_transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_bottom_left,_#f59e0b,_transparent_50%)]" />

      <div className="relative z-10 p-7 md:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">

        {/* Left: editorial content */}
        <div>
          {/* Label row */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              📋 Top Story
            </span>
            <span className="text-blue-300 text-[11px]">·</span>
            <span className="text-blue-300 text-[11px]">{date}</span>
            {aiSummary?.urgency && aiSummary.urgency !== "Monitor" && (
              <>
                <span className="text-blue-300 text-[11px]">·</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  aiSummary.urgency === "Immediate"
                    ? "bg-red-900/40 text-red-300 border-red-700/40"
                    : "bg-amber-900/30 text-amber-300 border-amber-700/30"
                }`}>
                  {aiSummary.urgency === "Immediate" ? "⚡ Act now" : "📅 This quarter"}
                </span>
              </>
            )}
          </div>

          {/* Jurisdiction breadcrumb */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl flag-emoji">{jurisdictionFlag}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
              {jurisdiction}
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-display font-bold text-2xl md:text-[28px] leading-snug text-white mb-4 max-w-2xl">
            {headline}
          </h2>

          {/* Intelligence excerpt */}
          <p className="text-blue-100 text-[14px] leading-relaxed mb-5 max-w-xl">
            {aiSummary?.why_it_matters
              ? aiSummary.why_it_matters.split(/\.\s+/)[0] + "."
              : summary}
          </p>

          {/* Compliance impact line */}
          {aiSummary?.compliance_impact && (
            <p className="text-blue-300 text-[12px] mb-5 line-clamp-1">
              <span className="font-semibold text-blue-200">Impact: </span>
              {aiSummary.compliance_impact.split(".")[0]}.
            </p>
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

        {/* Right: credibility panel — visible on md+ screens */}
        <div className="hidden md:flex flex-col gap-3 min-w-[170px]">
          <div className="bg-white/[0.07] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-[28px] font-bold text-white leading-none mb-1">119</div>
            <div className="text-[10px] text-blue-300 uppercase tracking-wider">Regulators tracked</div>
          </div>
          <div className="bg-white/[0.07] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-[28px] font-bold text-white leading-none mb-1">150+</div>
            <div className="text-[10px] text-blue-300 uppercase tracking-wider">Jurisdictions</div>
          </div>
          <div className="bg-white/[0.07] border border-white/10 rounded-xl p-4 text-center">
            <div className="text-[11px] font-semibold text-amber-300 leading-snug">
              Weekly Intelligence Brief
            </div>
            <div className="text-[10px] text-blue-300 mt-1 uppercase tracking-wider">Every Monday</div>
          </div>
        </div>

      </div>
    </div>
  );
}
