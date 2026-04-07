import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Newspaper, Scale, Brain, Globe } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";

const panels = [
  {
    icon: Newspaper,
    title: "Latest News",
    color: "from-sky/20 to-blue/10",
    borderColor: "border-sky/30",
    iconColor: "text-sky",
    stats: "7 categories · Updated daily",
    copy: "Real-time coverage from 119 regulators across every major jurisdiction. GDPR fines, AI Act updates, US state laws — all in one feed.",
    cta: { label: "Browse News →", href: "/category/enforcement" },
  },
  {
    icon: Scale,
    title: "Laws & Frameworks",
    color: "from-accent/15 to-accent/5",
    borderColor: "border-accent/30",
    iconColor: "text-accent",
    stats: "150+ jurisdictions mapped",
    copy: "Navigate every privacy statute worldwide. Compare US state laws side-by-side, track legislation in progress, and monitor global DPA directories.",
    cta: { label: "Explore Laws →", href: "/global-privacy-laws" },
  },
  {
    icon: Brain,
    title: "Intelligence",
    color: "from-amber-400/15 to-amber-400/5",
    borderColor: "border-amber-400/30",
    iconColor: "text-amber-400",
    stats: "AI-powered · Weekly briefs",
    copy: "Go beyond headlines. Get enforcement analytics, AI-generated weekly briefs, trend reports, and custom alerts tailored to your jurisdictions.",
    cta: { label: "Get Intelligence →", href: "/get-intelligence" },
  },
];

export default function SearchFirstHero() {
  return (
    <div className="bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Stats strip */}
        <div className="flex items-center justify-center gap-3 mb-6 text-[11px] tracking-wider text-white/60">
          <span className="font-bold text-white/90">119 Regulators</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">150+ Jurisdictions</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">Updated Daily</span>
          <span className="text-white/25">·</span>
          <span className="font-bold text-white/90">$0 to Browse</span>
        </div>

        {/* 4 panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {panels.map((p) => (
            <div
              key={p.title}
              className={`relative rounded-xl border ${p.borderColor} bg-gradient-to-br ${p.color} backdrop-blur-sm p-5 flex flex-col`}
            >
              <div className="flex items-center gap-2 mb-2">
                <p.icon className={`w-5 h-5 ${p.iconColor}`} />
                <h2 className="font-display text-[16px] text-white font-bold leading-tight">
                  {p.title}
                </h2>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2">
                {p.stats}
              </p>
              <p className="text-[12px] text-blue-200/90 leading-relaxed flex-1 mb-3">
                {p.copy}
              </p>
              <Link
                to={p.cta.href}
                className="text-[12px] font-bold text-white hover:text-sky transition-colors no-underline"
              >
                {p.cta.label}
              </Link>
            </div>
          ))}

          {/* Globe panel */}
          <div className="relative rounded-xl border border-white/15 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm p-4 flex flex-col items-center justify-center min-h-[200px] md:min-h-0">
            <div className="flex items-center gap-2 mb-1 self-start">
              <Globe className="w-5 h-5 text-sky" />
              <h2 className="font-display text-[16px] text-white font-bold leading-tight">
                Global Coverage
              </h2>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2 self-start">
              Spin to explore
            </p>
            <div className="flex-1 w-full flex items-center justify-center">
              <SpinTheGlobe compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
