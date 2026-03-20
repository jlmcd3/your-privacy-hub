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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0c1e38] via-navy to-steel text-white mb-6 no-underline group"
    >
      {/* Subtle texture overlays */}
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(ellipse_at_top_right,_#60a5fa,_transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(ellipse_at_bottom_left,_#f59e0b,_transparent_50%)]" />

      <div className="relative z-10 p-7 md:p-10">

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
            📋 Top Story
          </span>
          <span className="text-blue-300 text-[11px]">·</span>
          <span className="text-[11px] text-blue-300">{date}</span>
          <span className="text-blue-300 text-[11px]">·</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
            {jurisdictionFlag} {jurisdiction}
          </span>
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

        {/* Headline — large, editorial */}
        <h2 className="font-display font-bold text-[24px] md:text-[30px] leading-tight text-white mb-4 max-w-3xl group-hover:text-blue-100 transition-colors">
          {headline}
        </h2>

        {/* Intelligence excerpt */}
        <p className="text-blue-100/80 text-[14px] leading-relaxed mb-5 max-w-2xl">
          {aiSummary?.why_it_matters
            ? aiSummary.why_it_matters.split(/\.\s+/)[0] + "."
            : summary}
        </p>

        {/* Compliance impact */}
        {aiSummary?.compliance_impact && (
          <p className="text-blue-300/70 text-[12px] mb-5 max-w-xl">
            <span className="font-semibold text-blue-200/80">Impact: </span>
            {aiSummary.compliance_impact.split(".")[0]}.
          </p>
        )}

        <span className="inline-flex items-center gap-2 bg-white text-navy font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all">
          Read full analysis ↗
        </span>

      </div>
    </a>
  );
}
