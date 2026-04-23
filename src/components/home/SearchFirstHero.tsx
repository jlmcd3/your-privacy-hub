import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";

export default function SearchFirstHero() {
  return (
    <div className="relative bg-gradient-to-br from-navy via-navy-mid to-navy-light border-b border-white/10 overflow-hidden">
      <StarFieldBackground />
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-display font-bold text-white text-[28px] md:text-[36px] mb-3">
              Global privacy law, tracked daily.
            </h1>
            <p className="text-blue-200/80 text-[14px] md:text-[16px] mb-8">
              Everything a privacy professional needs in one place. Daily intelligence across 150+ jurisdictions and 119 authorities. Weekly briefs written for your sector and regions. A complete tool suite — assessments, DPIAs, LIAs, DPAs, breach playbooks, and registration filings — calibrated to 3,500+ enforcement decisions worldwide.
            </p>
            <div className="flex gap-3 justify-center lg:justify-start flex-wrap mb-8">
              <Link
                to="/sample-brief"
                className="bg-white text-navy font-bold px-6 py-3 rounded-lg hover:opacity-90 no-underline text-[14px] transition-all"
              >
                See the Intelligence Brief →
              </Link>
              <Link
                to="/updates"
                className="bg-white text-navy font-bold px-6 py-3 rounded-lg hover:opacity-90 no-underline text-[14px] transition-all"
              >
                Browse today's developments →
              </Link>
            </div>
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
