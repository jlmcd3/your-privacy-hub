import { Link } from "react-router-dom";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

// ─────────────────────────────────────────────────────────────────────────────
// HomepageTriptych
// Replaces ProToolsBanner on the homepage.
// Three panels: Intelligence | Assessments | Compliance Documents
// Below: multi-client strip · workflow connector · CPPA urgency · standalone note
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT_TOOLS = [
  { label: "Privacy programme assessment (full)", free: false, freeLabel: "" },
  { label: "Governance quick scan", free: true, freeLabel: "free" },
  { label: "LIA — full three-part report", free: false, freeLabel: "" },
  { label: "LIA — preliminary signal", free: true, freeLabel: "free" },
  { label: "DPIA / impact assessment", free: false, freeLabel: "" },
  { label: "Biometric privacy compliance check", free: false, freeLabel: "" },
];

const DOCUMENT_TOOLS = [
  { label: "Breach notification deadlines", free: true, freeLabel: "free" },
  { label: "Data processing agreement (DPA)", free: false, freeLabel: "" },
  { label: "Incident response playbook", free: false, freeLabel: "" },
  { label: "RoFA / RoPA builder (Article 30)", free: false, freeLabel: "" },
  { label: "US + EU/UK privacy notices", free: false, freeLabel: "" },
  { label: "Registration manager", free: false, freeLabel: "" },
];

function PlatformBadge() {
  return (
    <div className="flex items-start gap-2.5 bg-navy/5 border border-navy/15 rounded-lg px-3 py-2.5 mb-3">
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
  freeLabel,
  tickColor,
}: {
  label: string;
  free: boolean;
  freeLabel: string;
  tickColor: string;
}) {
  return (
    <li className="flex items-start gap-2 py-1.5 border-b border-border/60 last:border-0">
      <span className={`text-[12px] mt-0.5 font-bold ${tickColor}`}>✓</span>
      <span className="text-[12px] text-slate leading-snug flex-1">{label}</span>
      {free && (
        <span className="text-[9px] font-bold uppercase tracking-wide bg-green-100 text-green-800 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
          {freeLabel}
        </span>
      )}
    </li>
  );
}

export default function HomepageTriptych() {
  const { isPremium } = usePremiumStatus();

  return (
    <section className="w-full border-t border-fog">
      {/* Section header */}
      <div className="bg-paper border-b border-fog px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 max-w-[1280px] mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate">
          How we can help
        </p>
        <p className="text-[11px] text-slate hidden sm:block">
          All tools included with Annual Platform · standalone purchases always available
        </p>
      </div>

      {/* Triptych grid */}
      <div className="max-w-[1280px] mx-auto bg-paper grid grid-cols-1 lg:grid-cols-3 border-b border-fog">

        {/* PANEL 1: Intelligence */}
        <div className="border-t-[3px] border-t-[#1D9E75] lg:border-r border-fog px-6 py-6">
          <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center mb-3 flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="#0F6E56" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="9" cy="9" r="6" />
              <polyline points="9,4.5 9,9 11.5,11" />
            </svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-[#E1F5EE] text-[#1D9E75] px-2 py-0.5 rounded inline-block mb-2">
            Intelligence
          </span>
          <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1.5">
            Stay current on every regulation that affects your organisation
          </h3>
          <p className="text-[12px] text-slate leading-relaxed mb-4">
            Your personalised weekly brief, filtered by region, sector, and topic. Enforcement actions, new guidance, legislative movement — tracked daily.
          </p>
          <ul className="list-none mb-4">
            {[
              { label: "Weekly intelligence brief — personalised", free: false, freeLabel: "" },
              { label: "Enforcement tracker — all 119 authorities", free: false, freeLabel: "" },
              { label: "Jurisdiction monitoring — 150+ countries", free: false, freeLabel: "" },
              { label: "Legislation tracker + watchlists", free: false, freeLabel: "" },
            ].map((f) => (
              <FeatRow key={f.label} {...f} tickColor="text-[#1D9E75]" />
            ))}
            <li className="flex items-center gap-2 py-1.5 text-[12px] text-slate/50">
              <span className="text-[12px]">—</span>
              <span>Compliance tools not included</span>
            </li>
          </ul>
          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-display font-bold text-navy">
                {INTELLIGENCE_PRICING.monthlyShort()}
              </span>
            </div>
            <p className="text-[10px] text-slate mt-0.5">or $249/yr — save two months</p>
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
            Intelligence is the foundation of every paid tier. All Assessments, Documents, and CPPA subscribers receive the full brief.
          </p>
        </div>

        {/* PANEL 2: Assessments */}
        <div className="border-t border-t-[3px] border-t-blue-600 lg:border-r border-fog px-6 py-6">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-3 flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="#185FA5" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="2" width="12" height="14" rx="2" />
              <line x1="6" y1="7" x2="12" y2="7" />
              <line x1="6" y1="10" x2="10" y2="10" />
              <line x1="6" y1="13" x2="8" y2="13" />
            </svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-800 px-2 py-0.5 rounded inline-block mb-2">
            Assessments
          </span>
          <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1.5">
            Know where you stand — against what regulators actually enforce
          </h3>
          <p className="text-[12px] text-slate leading-relaxed mb-4">
            Structured assessments calibrated to 3,500+ enforcement decisions. Score your programme, run a defensible LIA, build your DPIA.
          </p>
          <ul className="list-none mb-4">
            {ASSESSMENT_TOOLS.map((f) => (
              <FeatRow key={f.label} {...f} tickColor="text-blue-600" />
            ))}
          </ul>
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

        {/* PANEL 3: Compliance Documents */}
        <div className="border-t border-t-[3px] border-t-amber-600 px-6 py-6">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mb-3 flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="#854F0B" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 2h7l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
              <polyline points="11 2 11 6 15 6" />
              <line x1="6" y1="10" x2="12" y2="10" />
              <line x1="6" y1="13" x2="10" y2="13" />
            </svg>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-900 px-2 py-0.5 rounded inline-block mb-2">
            Compliance documents
          </span>
          <h3 className="font-display font-bold text-[15px] text-navy leading-snug mb-1.5">
            Produce the documents — tailored to your jurisdictions and stack
          </h3>
          <p className="text-[12px] text-slate leading-relaxed mb-4">
            AI-generated compliance documents drawn from enforcement precedent. Designed for professional review, not as a substitute for it.
          </p>
          <ul className="list-none mb-4">
            {DOCUMENT_TOOLS.map((f) => (
              <FeatRow key={f.label} {...f} tickColor="text-amber-600" />
            ))}
          </ul>
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

      {/* Multi-client strip */}
      <div className="max-w-[1280px] mx-auto bg-paper/70 border-b border-fog px-6 py-4 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-4 items-center">
        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none" stroke="#4A148C" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="12" cy="6" r="3" />
            <path d="M1 15c0-2.5 2-3.5 5-3.5s5 1 5 3.5" />
            <path d="M12 11.5c1.8 0 3.5.8 3.5 3.5" strokeDasharray="2 1" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-navy mb-0.5">
            Managing multiple clients?
          </p>
          <p className="text-[12px] text-slate leading-relaxed">
            Annual Platform subscribers can add client workspaces — separate document histories and tool sessions per client. Ideal for DPOs, consultants, and privacy counsel managing multiple organisations.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[18px] font-display font-bold text-navy leading-none">$199</p>
          <p className="text-[10px] text-slate">/yr per additional client</p>
          <p className="text-[10px] text-slate/60 mb-1">Annual Platform required</p>
          <Link
            to="/subscribe#multi-client"
            className="inline-block text-[10px] font-semibold text-purple-800 border border-purple-300 px-3 py-1 rounded-md hover:bg-purple-50 no-underline"
          >
            Learn more →
          </Link>
        </div>
      </div>

      {/* Workflow connector */}
      <div className="max-w-[1280px] mx-auto bg-paper border-b border-fog px-6 py-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-[11px] text-slate">The compliance workflow:</span>
        <span className="text-[11px] font-semibold text-navy">stay informed</span>
        <span className="text-[11px] text-slate">→</span>
        <span className="text-[11px] font-semibold text-navy">assess your risks</span>
        <span className="text-[11px] text-slate">→</span>
        <span className="text-[11px] font-semibold text-navy">produce your documents</span>
        <Link
          to="/subscribe"
          className="ml-auto text-[11px] font-semibold text-blue-700 no-underline hover:underline whitespace-nowrap hidden sm:block"
        >
          Annual Platform covers all three — {PLATFORM_PRICING.standard()} →
        </Link>
      </div>

      {/* CPPA urgency bar */}
      <div className="max-w-[1280px] mx-auto bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700 mb-1">
            California · CPPA audit requirement
          </p>
          <p className="text-[13px] font-semibold text-amber-950 mb-1 flex flex-wrap items-center gap-2">
            Is your organisation in scope for the 2027 CPPA audit?
            <span className="inline-flex items-center gap-1 bg-red-100 border border-red-200 rounded px-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
              <span className="text-[10px] font-bold text-red-800">Dec 31 2027</span>
            </span>
          </p>
          <p className="text-[12px] text-amber-800">
            The CPPA Audits Division stood up February 2026. California-facing businesses must assess. CPPA tools are available at subscriber or standalone rates on all plans.
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
      <div className="max-w-[1280px] mx-auto bg-paper border-b border-fog px-6 py-2.5 flex items-center justify-between gap-4">
        <p className="text-[11px] text-slate">
          Not ready to subscribe? Every tool is available as a one-time standalone purchase — no subscription required.
        </p>
        <Link
          to="/tools"
          className="text-[11px] font-semibold text-slate underline underline-offset-2 hover:text-navy no-underline whitespace-nowrap flex-shrink-0"
        >
          See standalone prices →
        </Link>
      </div>
    </section>
  );
}
