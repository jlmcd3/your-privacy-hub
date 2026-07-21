import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { PRICING } from "@/config/pricing";
import { useRegion } from "@/hooks/useRegion";
import RegionSwitcher from "@/components/RegionSwitcher";
const SpinTheGlobe = lazy(() => import("@/components/globe/SpinTheGlobe"));
const StarFieldBackground = lazy(() => import("@/components/globe/StarFieldBackground"));

// UX-2a — Regional homepage hero.
// G1: the spinning globe is preserved in BOTH regional variants at the same
// placement, size, and interaction as before. Do not remove or shrink.

const CPPA_SUITE_PRICE = PRICING.tools.cppa_suite.display; // "$449"
const LIA_PRICE = PRICING.tools.lia.display;               // "$99"

const US_STATS: Array<{ value: string; label: string }> = [
  { value: "52,326", label: "affected CA residents (median)" },
  { value: "$67k", label: "median CPPA penalty exposure" },
  { value: CPPA_SUITE_PRICE, label: "CPPA Full Suite" },
  { value: "4", label: "generations included" },
];

const EU_UK_PRODUCTS: Array<{ href: string; title: string; sub: string }> = [
  { href: "/li-assessment", title: "Legitimate Interest Assessment", sub: "3-part LIA · $99" },
  { href: "/dpia-framework", title: "DPIA / Impact Assessment", sub: "EDPB-aligned template" },
  { href: "/governance-assessment", title: "GDPR Governance Assessment", sub: "Programme health check" },
  { href: "/ropa-builder", title: "RoPA Builder", sub: "Article 30 record · free with subscription" },
];

export default function SearchFirstHero() {
  const { region } = useRegion();
  const euMode = region === "EU_UK";

  return (
    <div className="relative bg-gradient-to-br from-brand-navy via-brand-ocean to-[#1f6674] border-b border-white/10 overflow-hidden">
      <Suspense fallback={null}><StarFieldBackground /></Suspense>

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: regional text content */}
          <div className="flex-1 text-center lg:text-left">
            {euMode ? (
              <>
                <h1 className="text-hero-h1 text-white mb-4">
                  GDPR paperwork your DPO can defend.
                </h1>
                <p className="text-blue-100 text-base md:text-lg mb-6 max-w-2xl">
                  Legitimate interest assessments, DPIAs, RoPA, and governance reviews — every output calibrated to real EDPB and supervisory-authority enforcement, cite-anchored, and sized so counsel can sign it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start mb-6">
                  <Link
                    to="/li-assessment"
                    className="inline-flex items-center justify-center bg-[#C8922A] text-brand-navy font-semibold px-6 py-3 rounded-lg no-underline hover:opacity-90"
                  >
                    Start a Legitimate Interest Assessment — {LIA_PRICE} →
                  </Link>
                  <Link
                    to="/ropa-builder"
                    className="inline-flex items-center justify-center border border-white/40 text-white font-semibold px-6 py-3 rounded-lg no-underline hover:bg-white/10"
                  >
                    Build your RoPA free →
                  </Link>
                </div>

                {/* EU/UK product row — revenue-weighted order */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                  {EU_UK_PRODUCTS.map((p) => (
                    <li key={p.href}>
                      <Link
                        to={p.href}
                        className="block rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 no-underline"
                      >
                        <span className="block text-sm font-semibold text-white">{p.title}</span>
                        <span className="block text-xs text-blue-100/80">{p.sub}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1 className="text-hero-h1 text-white mb-4">
                  California's privacy deadlines are here. Be audit-ready this week.
                </h1>
                <p className="text-blue-100 text-base md:text-lg mb-6 max-w-2xl">
                  The CPPA's risk-assessment, cybersecurity-audit, and ADMT rules are live, with certifications due through 2027–2028. Start with the free Scope Checker, then generate the assessments that satisfy the record — cite-anchored to the final regulations and FSOR commentary.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start mb-8">
                  <Link
                    to="/cppa-scope-checker"
                    className="inline-flex items-center justify-center bg-[#C8922A] text-brand-navy font-semibold px-6 py-3 rounded-lg no-underline hover:opacity-90"
                  >
                    Run the free CPPA Scope Checker →
                  </Link>
                  <Link
                    to="/cppa"
                    className="inline-flex items-center justify-center border border-white/40 text-white font-semibold px-6 py-3 rounded-lg no-underline hover:bg-white/10"
                  >
                    CPPA Full Suite — {CPPA_SUITE_PRICE} →
                  </Link>
                </div>

                {/* US stat band — 52,326 / $67k / $449 / 4 */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                  {US_STATS.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left"
                    >
                      <dt className="text-[11px] uppercase tracking-wider text-blue-100/80">{s.label}</dt>
                      <dd className="text-xl font-display font-bold text-white leading-tight">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>

          {/* Right: Spinning Globe — preserved in BOTH variants (G1). */}
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
