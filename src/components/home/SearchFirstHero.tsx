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
      <div className="max-w-[1280px] mx-auto px-3 md:px-6 py-2 md:py-2.5">
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

        {/* 4 compact panels — always in a row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
          {panels.map((p) => (
            <div
              key={p.title}
              className={`rounded-lg border ${p.borderColor} bg-white/[0.06] px-3 py-2.5 md:px-4 md:py-3 flex flex-col`}
            >
              <div className="flex items-center gap-1 mb-1">
                <p.icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.iconColor}`} />
                <h2 className="font-display text-[12px] md:text-[14px] text-white font-bold leading-tight truncate">
                  {p.title}
                </h2>
              </div>
              <p className="text-[10px] md:text-[12px] text-blue-200/80 leading-snug flex-1 mb-1.5 line-clamp-2">
                {p.copy}
              </p>
              <Link
                to={p.cta.href}
                className="text-[9px] md:text-[11px] font-bold text-white hover:text-sky transition-colors no-underline"
              >
                {p.cta.label}
              </Link>
            </div>
          ))}

          {/* Globe panel */}
          <div className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 md:px-4 md:py-3 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1 mb-1">
              <Globe className="w-3.5 h-3.5 text-sky flex-shrink-0" />
              <h2 className="font-display text-[12px] md:text-[14px] text-white font-bold leading-tight truncate">
                Global
              </h2>
            </div>
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden max-h-[100px]">
              <SpinTheGlobe compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
