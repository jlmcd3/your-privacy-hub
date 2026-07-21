import { lazy, Suspense } from "react";
const SpinTheGlobe = lazy(() => import("@/components/globe/SpinTheGlobe"));
const StarFieldBackground = lazy(() => import("@/components/globe/StarFieldBackground"));
import { useGeoCountry as _useGeoCountry } from "@/hooks/useGeoCountry";
import { useGeoCountry, isEuOrUk } from "@/hooks/useGeoCountry";

export default function SearchFirstHero() {
  const country = useGeoCountry();
  const euMode = isEuOrUk(country);

  return (
    <div className="relative bg-gradient-to-br from-brand-navy via-brand-ocean to-[#1f6674] border-b border-white/10 overflow-hidden">
      <Suspense fallback={null}><StarFieldBackground /></Suspense>
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: text content */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-hero-h1 text-white mb-3">
              Global privacy law — tracked daily.
            </h1>
            <p className="text-center lg:text-left text-xl md:text-2xl font-semibold tracking-widest uppercase text-blue-300 mb-2">
              {euMode
                ? "New EDPB DPIA template is just about here"
                : "California's CPPA deadlines are here"}
            </p>
            <p className="font-display text-3xl md:text-4xl text-white/95 mb-6">
              {euMode
                ? "Generate your EDPB-aligned DPIA now."
                : "Find out which CPPA rules apply to you — free."}
            </p>
            <p className="text-blue-100 text-sm md:text-base mb-6 whitespace-pre-line">
              {euMode
                ? "The EDPB's harmonised DPIA template — out for public consultation through June 2026 — will be adopted by national supervisory authorities across the EEA as their unique or 'meta' template. Get ahead of the rollout: generate a DPIA structured to the EDPB template today, with controller inputs, risk analysis, and Article 35 mapping built in. Plus daily global privacy intelligence and enforcement-calibrated tools."
                : "California businesses face risk-assessment, cybersecurity-audit, and ADMT deadlines through 2027. Check your obligations in two minutes — then generate the assessments that satisfy them. Plus daily global privacy intelligence and enforcement-calibrated tools."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start mb-8">
              <a
                href={euMode ? "/dpia-framework" : "/cppa-scope-checker"}
                className="inline-flex items-center justify-center bg-[#C8922A] text-brand-navy font-semibold px-6 py-3 rounded-lg no-underline hover:opacity-90"
              >
                {euMode
                  ? "Start your EDPB-aligned DPIA →"
                  : "Run the free CPPA Scope Checker →"}
              </a>
              <a
                href="/samples"
                className="inline-flex items-center justify-center border border-white/40 text-white font-semibold px-6 py-3 rounded-lg no-underline hover:bg-white/10"
              >
                View a sample report →
              </a>
            </div>

            {/* UX-2e T2: 13px pricing line removed from hero; pricing now lives on /pricing. */}
          </div>

          {/* Right: Globe (lazy, fixed dimensions to prevent CLS) */}
          <div className="hidden sm:block flex-shrink-0 w-full lg:w-[400px]">
            <div className="rounded-xl overflow-hidden relative" style={{ height: "420px", width: "100%", minWidth: 0, aspectRatio: "auto" }}>
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                <Suspense fallback={<div style={{ width: 400, height: 420 }} aria-hidden />}>
                  <SpinTheGlobe compact />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
