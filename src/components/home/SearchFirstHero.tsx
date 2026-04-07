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
        <div className="flex items-center justify-center gap-2 mb-3 text-[10px] tracking-wider text-white/60 flex-wrap">
          <span className="font-bold text-white/90">119 Regulators</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">150+ Jurisdictions</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">Updated Daily</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">$0 to Browse</span>
        </div>

        {/* 4 wide, short panels */}
        <div className="grid grid-cols-4 gap-2">
          {panels.map((p) => (
            <Link
              key={p.title}
              to={p.cta.href}
              className={`rounded-lg border ${p.borderColor} bg-white/[0.06] hover:bg-white/[0.10] transition-colors no-underline p-2.5 md:p-3 flex items-center gap-2.5`}
              style={{ height: "clamp(56px, 10vw, 72px)" }}
            >
              <p.icon className={`w-5 h-5 flex-shrink-0 ${p.iconColor}`} />
              <div className="min-w-0">
                <div className="font-display text-[12px] md:text-[14px] text-white font-bold leading-tight truncate">
                  {p.title}
                </div>
                <div className="text-[9px] md:text-[10px] text-blue-200/70 leading-snug truncate mt-0.5">
                  {p.copy}
                </div>
              </div>
            </Link>
          ))}

          {/* Globe panel */}
          <div
            className="rounded-lg border border-white/15 bg-white/[0.04] p-2 flex items-center justify-center"
            style={{ height: "clamp(56px, 10vw, 72px)" }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <SpinTheGlobe compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
