import { Link } from "react-router-dom";
import SpinTheGlobe from "@/components/globe/SpinTheGlobe";
import StarFieldBackground from "@/components/globe/StarFieldBackground";
import { useAuth } from "@/hooks/useAuth";

export default function SearchFirstHero() {
  const { user } = useAuth();

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
              119 regulatory authorities. 150+ jurisdictions. Action intelligence on every development — and the compliance tools to act on it.
            </p>
            <div className="flex gap-3 justify-center lg:justify-start flex-wrap mb-8">
              {!user && (
                <Link
                  to="/signup"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-colors no-underline"
                >
                  Start monitoring — it's free
                </Link>
              )}
              <Link
                to="/sample-brief"
                className="inline-flex items-center px-6 py-3 rounded-lg border border-white/40 text-white font-medium text-sm hover:bg-white/10 transition-colors no-underline"
              >
                See a sample Intelligence Brief →
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
