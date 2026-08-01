import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { PRICING, PRICING_REGISTRY } from "@/config/pricing";
import { useRegion } from "@/hooks/useRegion";
const SpinTheGlobe = lazy(() => import("@/components/globe/SpinTheGlobe"));
const StarFieldBackground = lazy(() => import("@/components/globe/StarFieldBackground"));

// UX-2a — Regional homepage hero.
// G1: the spinning globe is preserved in BOTH regional variants at the same
// placement, size, and interaction as before. Do not remove or shrink.

const CPPA_SUITE_PRICE = PRICING.tools.cppa_suite.display; // "$449"
const CPPA_RISK_PRICE = PRICING.tools.cppa_risk.display;   // "$229"
const CPPA_CYBER_PRICE = PRICING.tools.cppa_cyber.display; // "$299"
const CPPA_ADMT_PRICE = PRICING.tools.cppa_admt.display;   // "$99"
const LIA_PRICE = PRICING.tools.lia.display;               // "$99"

// Subscriber prices sourced from PRICING_REGISTRY — never hardcode.
const LIA_SUB = PRICING_REGISTRY.li_subscriber_v2.displayPrice;             // "$49"
const DPIA_SUB = PRICING_REGISTRY.dpia_subscriber_v2.displayPrice;          // "$49"
const GOV_SUB = PRICING_REGISTRY.hc_subscriber_v2.displayPrice;             // "$49"
const CPPA_ADMT_SUB = PRICING_REGISTRY.cppa_admt_subscriber.displayPrice;   // "$49"
const CPPA_CYBER_SUB = PRICING_REGISTRY.cppa_cyber_subscriber.displayPrice; // "$169"
const CPPA_SUITE_SUB = PRICING_REGISTRY.cppa_suite_subscriber.displayPrice; // "$249"

const priceLine = (standalone: string, subscriber: string) =>
  `${standalone} · ${subscriber} subscriber`;

const EU_UK_PRODUCTS: Array<{ href: string; title: string; sub: string }> = [
  { href: "/li-assessment", title: "Legitimate Interest Assessment", sub: priceLine(LIA_PRICE, LIA_SUB) },
  { href: "/dpia-framework", title: "DPIA / Impact Assessment", sub: priceLine(PRICING.tools.dpia.display, DPIA_SUB) },
  { href: "/governance-assessment", title: "GDPR Governance Assessment", sub: priceLine(PRICING.tools.governance.display, GOV_SUB) },
  { href: "/ropa-builder", title: "RoPA Builder", sub: "Article 30 record · free with subscription" },
];

const US_PRODUCTS: Array<{ href: string; title: string; sub: string; bundle?: boolean }> = [
  { href: "/cppa-admt", title: "ADMT Compliance Check", sub: priceLine(CPPA_ADMT_PRICE, CPPA_ADMT_SUB) },
  { href: "/cppa-cybersecurity", title: "CPPA Cybersecurity Readiness", sub: priceLine(CPPA_CYBER_PRICE, CPPA_CYBER_SUB) },
  { href: "/cppa", title: "CPPA Full Audit Suite", sub: `${priceLine(CPPA_SUITE_PRICE, CPPA_SUITE_SUB)} · bundle`, bundle: true },
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
                  Global privacy law, tracked daily.
                </h1>
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                  GDPR paperwork your DPO can defend.
                </h2>
                <p className="text-blue-100 text-base md:text-lg mb-6 max-w-2xl">
                  Generate legitimate interest assessments, DPIAs, RoPA entries, and governance reviews — cite-anchored to the GDPR, EDPB guidelines, and supervisory-authority decisions so your counsel can review the source behind every finding.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start mb-6">
                  <Link
                    to="/li-assessment"
                    className="inline-flex items-center justify-center bg-[#C8922A] text-brand-navy font-semibold px-6 py-3 rounded-lg no-underline hover:opacity-90"
                  >
                    Start a Legitimate Interest Assessment — {priceLine(LIA_PRICE, LIA_SUB)} →
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
                  Global privacy law, tracked daily.
                </h1>
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                  California's privacy deadlines are here. Be audit-ready this week.
                </h2>
                <p className="text-blue-100 text-base md:text-lg mb-6 max-w-2xl">
                  The CPPA's risk-assessment, cybersecurity-audit, and ADMT rules are live, with assessments due now and with certifications due through 2027–2028. Start with the free Scope Checker, then generate the assessments you or your clients need — cite-anchored to CA's final regulations and regulatory commentary, and referencing analogous GDPR decisions as persuasive authority.
                </p>
                <div className="inline-flex flex-col items-stretch gap-1">
                  <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start">
                    <Link
                      to="/cppa-scope-checker"
                      className="inline-flex items-center justify-center bg-[#C8922A] text-brand-navy font-semibold px-6 py-3 rounded-lg no-underline hover:opacity-90"
                    >
                      Run the free CPPA Scope Checker →
                    </Link>
                    <Link
                      to="/cppa-risk-assessment"
                      className="inline-flex items-center justify-center border border-white/40 text-white font-semibold px-6 py-3 rounded-lg no-underline hover:bg-white/10"
                    >
                      Start a CPPA Risk Assessment — {priceLine(CPPA_RISK_PRICE, PRICING_REGISTRY.cppa_risk_subscriber.displayPrice)} →
                    </Link>
                  </div>

                  {/* US product row — three CPPA tabs, bundle highlighted */}
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {US_PRODUCTS.map((p) => (
                      <li key={p.href} className={p.bundle ? "sm:col-span-2" : undefined}>
                        <Link
                          to={p.href}
                          className={`block rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 no-underline ${p.bundle ? "border-l-4 border-l-[#C8922A]" : ""}`}
                        >
                          <span className="flex items-center justify-between text-sm font-semibold text-white">
                            <span>{p.title}</span>
                            {p.bundle && (
                              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-brand-navy bg-[#C8922A] px-1.5 py-0.5 rounded">
                                Full Suite
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-blue-100/80">{p.sub}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
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
