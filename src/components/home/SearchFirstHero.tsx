import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";

export default function SearchFirstHero() {
  return (
    <div className="bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <div className="max-w-[760px] mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Tagline */}
        <h1 className="font-display font-bold text-white text-[28px] md:text-[36px] text-center mb-3">
          Global privacy law, tracked daily.
        </h1>

        {/* Subtitle */}
        <p className="text-blue-200/80 text-[14px] md:text-[16px] text-center mb-8">
          Tracking 119 regulatory authorities across 150+ jurisdictions — updated daily.
        </p>

        {/* Two primary CTAs */}
        <div className="flex gap-3 justify-center flex-wrap mb-8">
          <Link
            to="/updates"
            className="bg-white text-navy font-bold px-6 py-3 rounded-lg hover:opacity-90 no-underline text-[14px] transition-all"
          >
            Browse today's developments →
          </Link>
          <Link
            to="/sample-brief"
            className="border border-white/40 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 no-underline text-[14px] transition-all"
          >
            See the Intelligence Brief →
          </Link>
        </div>

        {/* Three quick links */}
        <div className="flex gap-6 justify-center flex-wrap mb-6">
          <Link to="/get-intelligence" className="text-blue-200/70 hover:text-white text-[13px] font-medium no-underline transition-colors">
            🧠 Intelligence Brief
          </Link>
          <Link to="/jurisdictions" className="text-blue-200/70 hover:text-white text-[13px] font-medium no-underline transition-colors">
            🌍 Global Law Map
          </Link>
          <Link to="/enforcement-tracker" className="text-blue-200/70 hover:text-white text-[13px] font-medium no-underline transition-colors">
            ⚖️ Enforcement Tracker
          </Link>
        </div>
      </div>

      {/* Globe */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-6">
        <div className="rounded-xl overflow-hidden relative hidden sm:block" style={{ height: "300px" }}>
          <StarFieldBackground />
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <SpinTheGlobe compact />
          </div>
        </div>
      </div>
    </div>
  );
}
