import { Link } from "react-router-dom";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

// ─────────────────────────────────────────────────────────────────────────────
// HomepageTriptych
// Replaces ProToolsBanner on the homepage.
//
// Design: dark navy rounded-xl outer container matching the ProToolsBanner and
// LatestUpdates sections. Three white bg-card cards sit inside.
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT_TOOLS = [
  { label: "Governance quick scan", free: true },
  { label: "Privacy programme assessment (full)", free: false },
  { label: "LIA — preliminary signal", free: true },
  { label: "LIA — full three-part report", free: false },
  { label: "DPIA / impact assessment", free: false },
  { label: "Biometric privacy compliance check", free: false },
];

const DOCUMENT_TOOLS = [
  { label: "Breach notification deadlines", free: true },
  { label: "Data processing agreement (DPA)", free: false },
  { label: "Incident response playbook", free: false },
  { label: "RoFA / RoPA builder (Article 30)", free: false },
  { label: "US + EU/UK privacy notices", free: false },
  { label: "Registration manager", free: false },
];

function PlatformBadge() {
  return (
    <div className="flex items-start gap-2 bg-navy/5 border border-navy/10 rounded-lg px-3 py-2.5 mb-3">
      <div className="w-5 h-5 rounded bg-navy flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3 h-3" viewBox="0 0 12 14" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 1L1 3V7c0 3 2.2 5.2 5 6.2C8.8 12.2 11 10 11 7V3L6 1z" />
        </svg>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-navy leading-tight">
          Included with Annual Platform
        </p>
        <p className="text-[11px] text-slate mt-0.5">
          {PLATFORM_PRICING.standard()} · {PLATFORM_PRICING.standardMonthly()} equiv
          <span className="mx-1 text-fog">·</span>
          standalone rates also available
        </p>
      </div>
    </div>
  );
}

function FeatRow({
  label,
  free,
  tickClass,
}: {
  label: string;
  free: boolean;
  tickClass: string;
}) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-fog/60 last:border-0">
      <span className={`text-[12px] font-bold mt-0.5 ${tickClass}`}>✓</span>
      <span className="text-[12px] text-slate leading-snug flex-1">{label}</span>
      {free && (
        <span className="text-[9px] font-bold uppercase tracking-wide bg-green-100 text-green-800 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
          free
        </span>
      )}
    </li>
  );
}

export default function HomepageTriptych() {
  usePremiumStatus();

  return (
    <section className="my-8 px-4">
      <div className="max-w-[1280px] mx-auto rounded-xl bg-gradient-to-br from-navy via-navy to-[#1A3A5C] overflow-hidden">
        {/* Navy header */}
        <div className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 md:pt-8 pb-5">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-2">
              How we can help
            </p>
            <h2 className="font-display text-2xl md:text-[28px] font-bold text-white leading-tight mb-1.5">
              Intelligence, assessments, and compliance documents
            </h2>
            <p className="text-blue-100/80 text-sm leading-relaxed">
              All tools included with Annual Platform
              <span className="mx-1.5 text-white/25">·</span>
              standalone purchases always available
            </p>
          </div>
          <Link
            to="/tools"
            className="flex-shrink-0 mt-1 text-[12px] font-semibold text-white/80 border border-white/25 px-3 py-1.5 rounded-lg hover:bg-white/10 no-underline transition-colors"
          >
            See all tools →
          </Link>
        </div>

        {/* Three white cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 px-4 md:px-6 pb-0">
          {/* CARD 1 — Intelligence */}
          <div className="bg-card rounded-xl border border-fog p-5 flex flex-col">
            <div className="w-9 h-9 rounded-lg bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mb-3">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="10" cy="10" r="7" />
                <polyline points="10,5 10,10 13,12" />
              </svg>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-[#E1F5EE] text-[#1D9E75] px-2 py-0.5 rounded inline-block mb-2 w-fit">
              Intelligence
            </span>
            <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1">
              Stay current on every regulation that affects your organisation
            </h3>
            <p className="text-[12px] text-slate leading-relaxed mb-4">
              Personalised weekly brief, enforcement tracking, and jurisdiction monitoring — filtered to your regions and topics.
            </p>
            <ul className="list-none mb-4 flex-1">
              {[
                { label: "Weekly intelligence brief", free: false },
                { label: "All 119 authorities tracked", free: false },
                { label: "150+ jurisdiction monitoring", free: false },
                { label: "Legislation tracker + watchlists", free: false },
              ].map((f) => (
                <FeatRow key={f.label} {...f} tickClass="text-[#1D9E75]" />
              ))}
              <li className="flex items-center gap-2 py-1.5 text-[12px] text-slate/40">
                <span>—</span>
                <span>Compliance tools not included</span>
              </li>
            </ul>
            <div className="h-px bg-fog my-3" />
            <div className="mb-3">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-[22px] text-navy">
                  {INTELLIGENCE_PRICING.monthlyShort()}
                </span>
              </div>
              <p className="text-[10px] text-slate mt-0.5">
                or $249/yr — save two months
              </p>
            </div>
            <Link
              to="/subscribe"
              className="block w-full text-center bg-[#1D9E75] text-white font-semibold text-[12px] py-2.5 rounded-lg hover:opacity-90 no-underline mb-2"
            >
              Start intelligence →
            </Link>
            <p className="text-[10px] text-center text-slate">
              or{" "}
              <Link to="/subscribe#digest" className="underline underline-offset-2 text-slate hover:text-navy">
                get the free weekly digest
              </Link>
            </p>
            <p className="text-[10px] text-slate/60 leading-relaxed mt-3 pt-3 border-t border-fog">
              Intelligence is included in every paid tier — Assessments and Documents subscribers receive the full brief.
            </p>
          </div>

          {/* CARD 2 — Assessments */}
          <div className="bg-card rounded-xl border border-fog p-5 flex flex-col">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mb-3">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round">
                <rect x="4" y="3" width="12" height="14" rx="2" />
                <line x1="7" y1="8" x2="13" y2="8" />
                <line x1="7" y1="11" x2="11" y2="11" />
                <line x1="7" y1="14" x2="9" y2="14" />
              </svg>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-800 px-2 py-0.5 rounded inline-block mb-2 w-fit">
              Assessments
            </span>
            <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1">
              Know where you stand against what regulators actually enforce
            </h3>
            <p className="text-[12px] text-slate leading-relaxed mb-4">
              Structured assessments calibrated to 3,500+ enforcement decisions. Score your programme, run a defensible LIA, build your DPIA.
            </p>
            <ul className="list-none mb-4 flex-1">
              {ASSESSMENT_TOOLS.map((f) => (
                <FeatRow key={f.label} {...f} tickClass="text-blue-600" />
              ))}
            </ul>
            <div className="h-px bg-fog my-3" />
            <PlatformBadge />
            <Link
              to="/subscribe"
              className="block w-full text-center bg-navy text-white font-semibold text-[12px] py-2.5 rounded-lg hover:opacity-90 no-underline mb-2"
            >
              See Annual Platform →
            </Link>
            <p className="text-[10px] text-center text-slate">
              or{" "}
              <Link to="/governance-assessment" className="underline underline-offset-2 text-slate hover:text-navy">
                try the free governance quick scan
              </Link>
            </p>
          </div>

          {/* CARD 3 — Compliance Documents */}
          <div className="bg-card rounded-xl border border-fog p-5 flex flex-col">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mb-3">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="#854F0B" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 3h8l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
                <polyline points="13 3 13 7 17 7" />
                <line x1="7" y1="11" x2="13" y2="11" />
                <line x1="7" y1="14" x2="11" y2="14" />
              </svg>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-900 px-2 py-0.5 rounded inline-block mb-2 w-fit">
              Compliance documents
            </span>
            <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1">
              Produce the documents tailored to your jurisdictions and stack
            </h3>
            <p className="text-[12px] text-slate leading-relaxed mb-4">
              Customised compliance documents drawn from enforcement precedent. Designed for professional review, not as a substitute for it.
            </p>
            <ul className="list-none mb-4 flex-1">
              {DOCUMENT_TOOLS.map((f) => (
                <FeatRow key={f.label} {...f} tickClass="text-amber-600" />
              ))}
            </ul>
            <div className="h-px bg-fog my-3" />
            <PlatformBadge />
            <Link
              to="/subscribe"
              className="block w-full text-center bg-amber-700 text-amber-50 font-semibold text-[12px] py-2.5 rounded-lg hover:opacity-90 no-underline mb-2"
            >
              See Annual Platform →
            </Link>
            <p className="text-[10px] text-center text-slate">
              or{" "}
              <Link to="/tools" className="underline underline-offset-2 text-slate hover:text-navy">
                buy a single document
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom area */}
        <div className="px-4 md:px-6 py-4 space-y-3">
          {/* Multi-client */}
          <div className="bg-card rounded-xl border border-fog px-4 py-3.5 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="#4A148C" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="12" cy="6" r="2.5" />
                <path d="M1 15c0-2.5 2-3.5 5-3.5s5 1 5 3.5" />
                <path d="M12 11.5c1.5.2 3.5 1 3.5 3.5" strokeDasharray="2 1.5" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-navy mb-0.5">
                Managing multiple clients?
              </p>
              <p className="text-[12px] text-slate leading-relaxed">
                Annual Platform subscribers can add separate client workspaces — individual document histories and tool sessions per client. Ideal for DPOs, consultants, and privacy counsel.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display font-bold text-[18px] text-navy leading-none">
                $199
              </p>
              <p className="text-[10px] text-slate">/yr per additional client</p>
              <p className="text-[10px] text-slate/60 mb-1">
                Annual Platform required
              </p>
              <Link
                to="/subscribe#multi-client"
                className="inline-block text-[10px] font-semibold text-purple-800 border border-purple-300 px-2.5 py-1 rounded-md hover:bg-purple-50 no-underline"
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* Workflow connector */}
          <div className="bg-white/5 rounded-lg px-4 py-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-blue-200">The compliance workflow:</span>
            <span className="text-[11px] font-semibold text-white">stay informed</span>
            <span className="text-[11px] text-blue-200/50">→</span>
            <span className="text-[11px] font-semibold text-white">assess your risks</span>
            <span className="text-[11px] text-blue-200/50">→</span>
            <span className="text-[11px] font-semibold text-white">produce your documents</span>
            <Link
              to="/subscribe"
              className="ml-auto text-[11px] font-semibold text-[#1D9E75] no-underline hover:underline whitespace-nowrap hidden sm:block"
            >
              Annual Platform covers all three — {PLATFORM_PRICING.standard()} →
            </Link>
          </div>

          {/* CPPA urgency */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700 mb-1">
                California · CPPA audit requirement
              </p>
              <p className="text-[13px] font-semibold text-amber-950 mb-1 flex flex-wrap items-center gap-2">
                Is your organisation in scope for the 2027 CPPA audit?
                <span className="inline-flex items-center gap-1 bg-red-100 border border-red-200 rounded px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-red-800">
                    Dec 31 2027
                  </span>
                </span>
              </p>
              <p className="text-[12px] text-amber-800">
                The CPPA Audits Division stood up February 2026. CPPA tools available at subscriber or standalone rates on all plans.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <Link
                to="/cppa-scope-checker"
                className="text-[11px] font-semibold text-amber-800 border border-amber-400 px-3 py-2 rounded-lg hover:bg-amber-100 no-underline whitespace-nowrap"
              >
                Free scope check →
              </Link>
              <Link
                to="/cppa-risk-assessment"
                className="text-[11px] font-semibold bg-amber-700 text-amber-50 px-3 py-2 rounded-lg hover:opacity-90 no-underline whitespace-nowrap"
              >
                Run CPPA risk assessment →
              </Link>
            </div>
          </div>

          {/* Standalone note */}
          <div className="flex items-center justify-between gap-4 pb-1">
            <p className="text-[11px] text-blue-200/70">
              Not ready to subscribe? Every tool is available as a one-time standalone purchase — no subscription required.
            </p>
            <Link
              to="/tools"
              className="text-[11px] font-semibold text-blue-200/70 underline underline-offset-2 hover:text-white no-underline whitespace-nowrap flex-shrink-0"
            >
              See standalone prices →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
