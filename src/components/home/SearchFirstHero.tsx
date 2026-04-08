import { Link } from "react-router-dom";
import { Newspaper, Scale, Brain, Globe } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";

const panels = [
  {
    icon: Brain,
    title: "Intelligence",
    borderColor: "border-amber-400/30",
    iconColor: "text-amber-400",
    subtitle: "Get the Intelligence Brief",
    copy: "Receive weekly privacy intelligence tailored to your industry and jurisdictions. Our customized reports synthesize global regulatory developments, enforcement trends, and key compliance signals so you can understand what matters for your organization.",
    cta: { label: "Get Intel →", href: "/get-intelligence" },
  },
  {
    icon: Newspaper,
    title: "Latest News",
    borderColor: "border-sky/30",
    iconColor: "text-sky",
    subtitle: "Latest Privacy Developments",
    copy: "Stay current with real-time updates from privacy regulators around the world. Enforcement actions, new legislation, regulatory guidance, and major data breaches are tracked daily across more than 150 jurisdictions.",
    cta: { label: "Browse →", href: "/category/enforcement" },
  },
  {
    icon: Scale,
    title: "Laws & Frameworks",
    borderColor: "border-accent/30",
    iconColor: "text-accent",
    subtitle: "Research Privacy Laws",
    copy: "Explore the world's leading privacy laws and regulatory frameworks in one place. Compare U.S. state statutes, review major international regimes, and understand how different jurisdictions regulate data protection.",
    cta: { label: "Explore →", href: "/global-privacy-laws" },
  },
];

export default function SearchFirstHero() {
  return (
    <div className="bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-3 md:px-6 py-3 md:py-4">
        {/* Stats strip */}
        <div className="flex items-center justify-center gap-2 mb-2 text-[9px] tracking-wider text-white/60 flex-wrap">
          <span className="font-bold text-white/90">Global privacy law, tracked daily and customized for you.</span>
        </div>

        {/* Panels + Globe side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2 md:gap-3">
          {/* Left: 3 stacked panels */}
          <div className="flex flex-col gap-1.5">
            {panels.map((p) => (
              <div
                key={p.title}
                className={`rounded-lg border ${p.borderColor} bg-white/[0.06] px-3 py-2 flex flex-col gap-1`}
              >
                <div className="flex items-center gap-1.5">
                  <p.icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.iconColor}`} />
                  <h2 className="font-display text-[16px] md:text-[20px] text-white font-bold leading-tight">
                    {p.title}
                  </h2>
                </div>
                <p className="text-[11px] md:text-[13px] text-white/90 font-semibold leading-snug">
                  {p.subtitle}
                </p>
                <p className="text-[12px] md:text-[14px] text-blue-200/70 leading-snug line-clamp-2 flex-1 min-w-0">
                  {p.copy}
                </p>
                <div className="flex items-center justify-end">
                  <Link
                    to={p.cta.href}
                    className="text-[12px] md:text-[14px] font-bold text-white hover:text-sky transition-colors no-underline whitespace-nowrap"
                  >
                    {p.cta.label}
                  </Link>
                </div>
              </div>
            ))}
            <Link
              to="/get-intelligence"
              className="inline-flex items-center justify-center gap-2 bg-amber-400 text-navy font-bold text-[12px] md:text-[13px] px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors no-underline mt-2"
            >
              Get Your Privacy Intelligence →
            </Link>
          </div>

          {/* Right: Globe panel — ~1/3 width, star background */}
          <div className="rounded-lg border border-white/15 bg-[#050b18] relative flex-col items-center justify-center overflow-hidden hidden sm:flex min-h-[200px]">
            <StarFieldBackground />
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <SpinTheGlobe compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
