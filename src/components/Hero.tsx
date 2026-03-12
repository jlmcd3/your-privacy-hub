import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import RegulatorGlobe from "./RegulatorGlobe";

const liveFeed = [
  { flag: "🇪🇺", label: "EDPB · AI Training Data Guidance", time: "2 hours ago" },
  { flag: "🇺🇸", label: "Texas AG · First TDPSA Enforcement", time: "5 hours ago" },
  { flag: "🇧🇷", label: "ANPD · International Transfer Rules", time: "9 hours ago" },
];

const Hero = () => {
  const [feedIndex, setFeedIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeedIndex(i => (i + 1) % liveFeed.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-mid to-navy-light text-white py-12 md:py-20 px-4 md:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_20%,rgba(59,130,196,0.18)_0%,transparent_60%),radial-gradient(ellipse_40%_50%_at_10%_80%,rgba(29,158,111,0.10)_0%,transparent_50%)]" />
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px"
      }} />

      {/* World map background */}
      <div className="absolute inset-0 hidden lg:block pointer-events-none overflow-hidden">
        <RegulatorGlobe />
      </div>

      <div className="max-w-[1280px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-5 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            <span>🌐</span> Global Privacy Intelligence Platform
          </div>
          <h1 className="font-display text-[clamp(28px,5vw,52px)] leading-[1.1] tracking-tight mb-5">
            Every regulator tracked. Every update summarized.<br />
            <Link
              to="/subscribe"
              className="italic text-sky underline decoration-sky/40 underline-offset-4 hover:decoration-sky transition-all"
            >
              Deeper intelligence
            </Link>
            <em className="italic text-white/80"> for those who need the full picture.</em>
          </h1>
          <p className="text-sm md:text-base text-slate-light leading-relaxed max-w-[520px] mb-7 md:mb-9">
            Track regulatory developments from 250+ privacy authorities across 150+ jurisdictions — automatically monitored, AI-summarized, and structured for professionals.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <Link to="/signup" className="px-5 md:px-7 py-3 md:py-3.5 text-sm font-semibold text-navy bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all no-underline inline-flex items-center gap-2">
              Start Free — No Credit Card Required
            </Link>
            <Link to="/subscribe" className="px-5 md:px-6 py-3 md:py-3.5 text-sm font-medium text-white/85 bg-white/[0.08] border border-white/[0.18] rounded-lg hover:bg-white/[0.14] hover:text-white transition-all no-underline inline-flex items-center gap-2">
              See Premium Plans →
            </Link>
          </div>

          {/* Stat strip */}
          <div className="flex items-center gap-2 mt-6 text-[12px] text-slate-light tracking-wide">
            <span>250+ Regulators</span>
            <span className="text-white/30">·</span>
            <span>150+ Jurisdictions</span>
            <span className="text-white/30">·</span>
            <span>Updated Daily</span>
          </div>

          {/* Live pulse feed */}
          <div className="flex items-center gap-2 mt-4 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-accent-l font-semibold tracking-wider uppercase text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-l inline-block" />
              Live
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white/75 transition-all duration-500">
              {liveFeed[feedIndex].flag} {liveFeed[feedIndex].label}
            </span>
            <span className="text-white/30 ml-auto text-[10px]">
              {liveFeed[feedIndex].time}
            </span>
          </div>

          {/* Social proof */}
          <p className="text-[12px] italic text-slate-light/70 mt-2">
            Used by privacy professionals, DPOs, and compliance teams worldwide.
          </p>

          <div className="grid grid-cols-2 md:flex gap-5 md:gap-7 mt-8 md:mt-11 pt-6 md:pt-8 border-t border-white/10">
            {[
              { num: "250+", label: "Regulators monitored" },
              { num: "150+", label: "Jurisdictions covered" },
              { num: "Daily", label: "Automated updates" },
              { num: "$0", label: "To start browsing" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-5 md:gap-7">
                {i > 0 && <div className="hidden md:block w-px h-10 bg-white/10 -ml-5 md:-ml-7 mr-0" />}
                <div>
                  <div className="font-display text-xl md:text-[28px] leading-none">{stat.num}</div>
                  <div className="text-[10px] md:text-[11px] font-medium text-slate-light mt-1 tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Premium card preview */}
        <div className="bg-white/[0.06] border border-white/[0.12] rounded-2xl p-5 md:p-7 backdrop-blur-xl animate-fade-up" style={{ animationDelay: "0.12s" }}>
          <div className="flex justify-between items-start mb-5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-sky bg-sky/15 px-2.5 py-1 rounded-full border border-sky/25">⭐ Premium Brief</span>
            <span className="text-[11px] text-slate-light">Week of Mar 3, 2026</span>
          </div>
          <h3 className="font-display text-[15px] md:text-[17px] text-white mb-4 leading-snug">
            EDPB issues binding guidance on AI training data; Texas AG opens first TDPSA enforcement
          </h3>
          <div className="bg-white/5 rounded-lg p-3 mb-2 border-l-2 border-sky/40 hover:border-sky transition-colors">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-light mb-1">Executive Summary</div>
            <div className="text-[12.5px] text-white/75 leading-relaxed">
              This week's most consequential developments span AI data processing and state-level enforcement escalation. The EDPB issued binding guidance restricting use of personal data for large language model training without explicit consent…
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border-l-2 border-sky/40 relative overflow-hidden">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-light mb-1">Trend Signal</div>
            <div className="text-[12.5px] text-white/75 leading-relaxed">
              Three enforcement actions across EU, U.S., and Brazil this week point to coordinated regulatory pressure on data brokers — a pattern not observed at this frequency since 2022…
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-navy-mid/95 to-transparent" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-slate-light">Full brief: 8 sections · 12 updates</span>
            <Link to="/subscribe" className="text-[12px] font-semibold text-navy bg-sky px-4 py-1.5 rounded-lg hover:bg-white transition-colors no-underline">Unlock →</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
