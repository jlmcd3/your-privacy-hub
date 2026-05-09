import { Link } from "react-router-dom";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";
import { useAuth } from "@/hooks/useAuth";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

export default function SearchFirstHero() {
  const { user } = useAuth();

  return (
    <div className="relative bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <StarFieldBackground />
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-center lg:text-left text-xs font-semibold tracking-widest uppercase text-blue-300 mb-3">
              For DPOs, privacy counsel, and compliance professionals
            </p>
            <h1 className="font-display font-bold text-white text-[28px] md:text-[36px] mb-3">
              Global privacy law, tracked daily.
            </h1>
            <p className="text-blue-200/80 text-[14px] md:text-[16px] mb-8">
              119 regulatory authorities. 150+ jurisdictions. Action intelligence on every development — and the compliance tools to act on it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl mt-2 mb-4 mx-auto lg:mx-0">
              {/* Card 1 — Intelligence Brief (Primary) */}
              <a
                href="#briefbuilder"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-teal-600 hover:bg-teal-500 border border-teal-600 hover:border-teal-500 transition-all duration-200 text-left"
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-teal-100 mb-1.5">
                  Intelligence Brief
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your intelligence brief — to save you time
                </p>
                <p className="text-[12px] text-teal-100 leading-snug">
                  Personalized to your jurisdiction, role, and tracked topics. Every Monday.
                </p>
              </a>

              {/* Card 2 — Privacy Updates (Secondary) */}
              <a
                href="#updates"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200 text-left"
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">
                  Regulatory Feed
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your privacy updates — to keep you ahead
                </p>
                <p className="text-[12px] text-white/60 leading-snug">
                  119 monitored sources. Enriched with compliance intelligence. Updated daily.
                </p>
              </a>

              {/* Card 3 — Compliance Tools (Secondary) */}
              <a
                href="#tools"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200 text-left"
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5">
                  Compliance Tools
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your compliance tools — to do your job well
                </p>
                <p className="text-[12px] text-white/60 leading-snug">
                  LIA, DPIA, DPA Generator, RoPA Builder, CPPA Suite. Enforcement-calibrated.
                </p>
              </a>
            </div>

            <p className="text-white/50 text-[11px] mb-4 text-center lg:text-left">
              Intelligence Feed from {INTELLIGENCE_PRICING.monthly()} · Compliance Platform {PLATFORM_PRICING.standard()} · Tools available standalone
            </p>

            {!user && (
              <div className="flex justify-center lg:justify-start">
                <Link
                  to="/signup"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg border border-white/30 text-white/80 font-medium text-[13px] hover:bg-white/10 transition-colors no-underline"
                >
                  Start monitoring — it's free
                </Link>
              </div>
            )}
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
