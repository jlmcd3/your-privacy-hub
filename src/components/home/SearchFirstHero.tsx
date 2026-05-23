import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

export default function SearchFirstHero() {
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
            <h1 className="text-hero-h1 text-white mb-3">
              Global privacy law, tracked daily.
            </h1>
            <p className="text-blue-200/80 text-sm md:text-base mb-8">
              119 regulatory authorities. 150+ jurisdictions. Action intelligence on every development — and the compliance tools to act on it.
            </p>

            {/* ── Hero CTA Cards ─────────────────────────────────── */}
            <div className="@container flex flex-col gap-3 w-full max-w-3xl mt-2">
              <div className="grid grid-cols-1 @md:grid-cols-2 @[900px]:grid-cols-3 gap-3">
              {/* Card 1 — Privacy Intelligence Feed (Primary) */}
              <a
                href="#updates"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-accent hover:bg-accent-light border border-accent hover:border-accent-light transition-all duration-200"
              >
                <p className="text-eyebrow text-white/80 mb-1.5">
                  Privacy Intelligence Feed
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your Privacy Intelligence Feed — to keep you ahead
                </p>
                <p className="text-meta text-white/85 leading-snug">
                  119 monitored sources. Enriched with compliance intelligence. Updated daily.
                </p>
              </a>

              {/* Card 2 — Intelligence Brief (Secondary) */}
              <a
                href="#brief"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200"
              >
                <p className="text-eyebrow text-white/50 mb-1.5">
                  Intelligence Report
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your Privacy Intelligence Report — to save you time
                </p>
                <p className="text-meta text-white/60 leading-snug">
                  Personalized to your jurisdiction, role, and tracked topics. Every Monday.
                </p>
              </a>

              {/* Card 3 — Compliance Tools (Secondary) */}
              <a
                href="#tools"
                className="group flex-1 rounded-2xl px-5 py-4 no-underline block bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all duration-200"
              >
                <p className="text-eyebrow text-white/50 mb-1.5">
                  Compliance Tools
                </p>
                <p className="font-display text-[15px] font-bold text-white leading-snug mb-1.5">
                  Your Compliance Tools — to do your job well
                </p>
                <p className="text-meta text-white/60 leading-snug">
                  LIA, DPIA, DPA Generator, RoPA Builder, CPPA Suite. Enforcement-calibrated.
                </p>
              </a>
              </div>
            </div>

            {/* Subtle pricing note */}
            <p className="text-white/40 text-meta mt-4 text-center lg:text-left">
              Intelligence from {INTELLIGENCE_PRICING.monthly()} ·
              Professional from {PLATFORM_PRICING.standardMonthly()} + {PLATFORM_PRICING.clientAddon()} ·
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
