import { Link } from "react-router-dom";
import { Newspaper, Scale, Brain, Globe } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";

const panels = [
  {
    icon: Newspaper,
    title: "Latest News",
    borderColor: "border-sky/30",
    iconColor: "text-sky",
    copy: "119 regulators. 7 categories. Updated daily.",
    cta: { label: "Browse →", href: "/category/enforcement" },
  },
  {
    icon: Scale,
    title: "Laws",
    borderColor: "border-accent/30",
    iconColor: "text-accent",
    copy: "150+ jurisdictions. Compare & track legislation.",
    cta: { label: "Explore →", href: "/global-privacy-laws" },
  },
  {
    icon: Brain,
    title: "Intelligence",
    borderColor: "border-amber-400/30",
    iconColor: "text-amber-400",
    copy: "AI briefs, trend reports & custom alerts.",
    cta: { label: "Get Intel →", href: "/get-intelligence" },
  },
];

export default function SearchFirstHero() {
  return (
    <div className="bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-3 md:px-6 py-3 md:py-4">
        {/* Stats strip */}
        <div className="flex items-center justify-center gap-2 mb-2 text-[9px] tracking-wider text-white/60 flex-wrap">
          <span className="font-bold text-white/90">119 Regulators</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">150+ Jurisdictions</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">Updated Daily</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">$0 to Browse</span>
        </div>

        {/* Panels + Globe side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 md:gap-3">
          {/* Left: 3 stacked panels */}
          <div className="flex flex-col gap-1.5">
            {panels.map((p) => (
              <div
                key={p.title}
                className={`rounded-lg border ${p.borderColor} bg-white/[0.06] px-3 py-2 flex items-center gap-2`}
              >
                <p.icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.iconColor}`} />
                <h2 className="font-display text-[12px] md:text-[14px] text-white font-bold leading-tight whitespace-nowrap">
                  {p.title}
                </h2>
                <p className="text-[10px] md:text-[13px] text-blue-200/80 leading-snug line-clamp-1 flex-1 min-w-0">
                  {p.copy}
                </p>
                <Link
                  to={p.cta.href}
                  className="text-[9px] md:text-[11px] font-bold text-white hover:text-sky transition-colors no-underline whitespace-nowrap"
                >
                  {p.cta.label}
                </Link>
              </div>
            ))}
          </div>

          {/* Right: Globe panel */}
          <div className="rounded-lg border border-white/15 bg-white/[0.04] px-2 py-1.5 flex flex-col items-center justify-center overflow-hidden w-[160px] hidden sm:flex">
            <div className="flex items-center gap-1 mb-0.5">
              <Globe className="w-3 h-3 text-sky flex-shrink-0" />
              <span className="font-display text-[11px] text-white font-bold">Global</span>
            </div>
            <div className="w-full flex items-center justify-center overflow-hidden max-h-[120px]">
              <SpinTheGlobe compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
