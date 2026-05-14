import { Link } from "react-router-dom";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAuth } from "@/hooks/useAuth";

export default function SearchFirstHero() {
  const { isPremium } = usePremiumStatus();
  const { user } = useAuth();
  return (
    <div className="relative bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <StarFieldBackground />
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-center lg:text-left text-xs font-semibold tracking-widest uppercase text-blue-300 mb-3">
              For privacy professionals and the privacy-conscious
            </p>
            <h1 className="font-display font-bold text-white text-[28px] md:text-[36px] mb-3">
              Global privacy law, tracked daily.
            </h1>
            <p className="text-blue-200/80 text-[14px] md:text-[16px] mb-8">
              119 regulatory authorities. 150+ jurisdictions. Action intelligence on every development — and the compliance tools to act on it.
            </p>

            {/* ── Hero CTA Cards ─────────────────────────────────── */}
            {!user ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl mt-2">
                {isPremium ? (
                  <Link
                    to="/dashboard"
                    className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-navy hover:opacity-90 border border-navy transition-all duration-200"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gold mb-1.5">
                      Intelligence Brief
                    </p>
                    <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                      Your Privacy Intelligence Report
                    </p>
                    <p className="text-[12px] text-white/80 leading-snug">
                      Your personalized weekly brief — read this week's analysis.
                    </p>
                    <span className="inline-block mt-3 bg-gold text-white rounded-xl px-3 py-1 text-xs font-semibold">Read your brief →</span>
                  </Link>
                ) : (
                  <Link
                    to="/#brief"
                    className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-navy/80 hover:opacity-90 border border-white/20 transition-all duration-200"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gold mb-1.5">
                      Intelligence Brief
                    </p>
                    <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                      Build your sample brief
                    </p>
                    <p className="text-[12px] text-white/80 leading-snug">
                      Select your jurisdiction and role to generate a representative Intelligence Brief.
                    </p>
                    <span className="inline-block mt-3 bg-gold text-white rounded-xl px-3 py-1 text-xs font-semibold">Build sample brief →</span>
                  </Link>
                )}

                {/* Card 2 — Privacy Updates (Secondary) */}
                <a
                  href="#updates"
                  className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200"
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">
                    Privacy Intelligence Feed
                  </p>
                  <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                    Your Privacy Intelligence Feed — to keep you ahead
                  </p>
                  <p className="text-[12px] text-white/60 leading-snug">
                    119 monitored sources. Enriched with compliance intelligence. Updated daily.
                  </p>
                </a>

                {/* Card 3 — Compliance Tools (Secondary) */}
                <a
                  href="#tools"
                  className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200"
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">
                    Compliance Tools
                  </p>
                  <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                    Your Compliance Tools — to do your job well
                  </p>
                  <p className="text-[12px] text-white/60 leading-snug">
                    LIA, DPIA, DPA Generator, RoPA Builder, CPPA Suite. Enforcement-calibrated.
                  </p>
                </a>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                {isPremium ? (
                  <Link
                    to="/dashboard"
                    className="inline-block bg-gold text-white rounded-xl px-5 py-3 text-sm font-semibold no-underline hover:opacity-90 transition-all"
                  >
                    Read your brief →
                  </Link>
                ) : (
                  <Link
                    to="/updates"
                    className="inline-block bg-gold text-white rounded-xl px-5 py-3 text-sm font-semibold no-underline hover:opacity-90 transition-all"
                  >
                    Open the Feed →
                  </Link>
                )}
                <Link
                  to="/tools"
                  className="inline-block border border-white/30 text-white rounded-xl px-5 py-3 text-sm font-semibold no-underline hover:bg-white/10 transition-all"
                >
                  Compliance Tools →
                </Link>
              </div>
            )}

            {/* Subtle pricing note */}
            <p className="text-white/40 text-[11px] mt-4 text-center lg:text-left">
              Intelligence Feed from {INTELLIGENCE_PRICING.monthly()} ·
              Compliance Platform {PLATFORM_PRICING.standard()} ·
              Tools available standalone
            </p>
          </div>

          {/* Right: Globe */}
          <div className="hidden sm:block flex-shrink-0 w-full lg:w-[400px]">
            <div className="rounded-xl overflow-hidden relative" style={{ height: "420px" }}>
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                <SpinTheGlobe compact />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
