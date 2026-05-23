import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import { PRICING } from "@/config/pricing";
import FreeDigestSignup from "@/components/subscribe/FreeDigestSignup";
import UIDebugOverlay from "@/components/UIDebugOverlay";
import SubscribeCheckoutModal from "@/components/SubscribeCheckoutModal";

type CellValue = boolean | string;
type ComparisonRow =
  | { feature: string; free: CellValue; intel: CellValue; platform: CellValue; isSection?: false }
  | { feature: string; isSection: true };

const comparisonRows: ComparisonRow[] = [
  { isSection: true, feature: "The monitoring layer" },
  { feature: "Regulatory developments, monitored daily", free: true, intel: true, platform: true },
  { feature: "Jurisdiction profiles (150+ countries)", free: true, intel: true, platform: true },
  { feature: "Regulator directory (119 authorities)", free: true, intel: true, platform: true },
  { feature: "Research guides (GDPR, AI Act, US laws)", free: true, intel: true, platform: true },
  { feature: "Enforcement tracker — all actions", free: true, intel: true, platform: true },
  { feature: "Personalized weekly digest", free: true, intel: true, platform: true },

  { isSection: true, feature: "The intelligence layer" },
  { feature: "Cross-jurisdiction signals and pattern analysis", free: true, intel: true, platform: true },
  { feature: "Full Privacy Intelligence Report — customized for your industry & jurisdictions", free: false, intel: true, platform: true },
  { feature: "Enforcement trends & pattern signals", free: false, intel: true, platform: true },
  { feature: "Per-article intelligence: regulatory theory, action items, sectors", free: false, intel: true, platform: true },
  { feature: "AI investigation prompt — pre-loaded with regulatory context, ready to paste into any AI assistant", free: false, intel: true, platform: true },
  { feature: "Priority Monday delivery", free: false, intel: true, platform: true },

  { isSection: true, feature: "The action layer — compliance tools" },
  { feature: "Sample preview of all tools", free: true, intel: true, platform: true },
  { feature: "Governance Assessment (Smart Tool)", free: false, intel: "$55", platform: "$55" },
  { feature: "Legitimate Interest Assessment (Smart Tool)", free: false, intel: "$35", platform: "$35" },
  { feature: "DPIA / Impact Assessment (Smart Tool)", free: false, intel: "$45", platform: "$45" },
  { feature: "DPA Generator (Smart Tool)", free: false, intel: "$45", platform: "$45" },
  { feature: "IR Playbook (Convenience)", free: false, intel: "$25", platform: "$25" },
  { feature: "Biometric Privacy Checker (Smart Tool)", free: false, intel: "$15", platform: "$15" },
  { feature: "Records of Processing (RoPA) (Convenience)", free: false, intel: "$40", platform: "$40" },
  { feature: "US Privacy Notice (Convenience)", free: false, intel: "$25", platform: "$25" },
  { feature: "EU & Global Privacy Notice (Convenience)", free: false, intel: "$50", platform: "$50" },
  { feature: "Registration Manager (Convenience)", free: false, intel: "$45", platform: "$45" },
  { feature: "1 free Convenience Tool/client/month", free: false, intel: false, platform: "Annual only" },

  { isSection: true, feature: "CPPA tools" },
  { feature: "CPPA Risk Assessment (Smart Tool)", free: false, intel: "$55", platform: "$55" },
  { feature: "CPPA Cybersecurity Audit (Smart Tool)", free: false, intel: "$70", platform: "$70" },
];

const Subscribe = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const bJurisdiction = searchParams.get("j");
  const bIndustry = searchParams.get("i");
  const bTopics = searchParams.get("t") ? searchParams.get("t")!.split(",").filter(Boolean) : [];
  const fromBuilder = !!bJurisdiction;
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutInterval, setCheckoutInterval] = useState<"month" | "year">("month");
  const startCheckout = async (interval: "month" | "year") => {
    if (!user) {
      navigate(`/signup?redirect=/subscribe`);
      return;
    }
    setLoading(interval);
    setError(null);
    try {
      setCheckoutInterval(interval);
      setCheckoutOpen(true);
      setLoading(null);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  const handleCheckoutComplete = () => {
    setCheckoutOpen(false);
    navigate("/account?subscribed=1");
  };



  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>{`Two products. One mission. — ${PRICING.intelligence.monthly.display}/month or Professional from ${PRICING.professional.monthly.display}/month | End User Privacy`}</title>
        <meta
          name="description"
          content={`Privacy Intelligence at ${PRICING.intelligence.monthly.display}/month with a 10-day free trial. Professional from ${PRICING.professional.monthly.display}/month — client workspaces, branded outputs, 1 free Convenience Tool run per client per month (annual).`}
        />
      </Helmet>
      <Navbar />




      {/* Two-product hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[800px] mx-auto">
          <h1 className="font-display text-white mb-4 leading-tight">
            Two products. One mission.
          </h1>
          <p className="text-[15px] text-slate-light max-w-[600px] leading-relaxed mb-10">
            Stay informed with Intelligence for {PRICING.intelligence.monthly.display}/month.
            Run a client-facing practice with Professional from {PRICING.professional.monthly.display}/month.
          </p>

          <div id="pro-plan-card" className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[760px] mx-auto text-left">
            {/* Intelligence card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <p className="text-eyebrow text-sky mb-2">
                Privacy Intelligence
              </p>
              <div className="text-white font-display font-bold text-[36px] leading-none mb-1">
                {PRICING.intelligence.monthly.display}<span className="text-lg font-normal text-blue-200">/month</span>
              </div>
              <p className="text-blue-200 text-meta mb-1">
                or {PRICING.intelligence.annual.display}/year — {PRICING.intelligence.annual.savingDisplay}
              </p>
              <p className="text-blue-200 text-meta mb-4">Cancel any time</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Daily privacy intelligence feed",
                  "Weekly Privacy Intelligence Report — personalised by role, jurisdiction & topics",
                  "AI investigation prompt on every article",
                  "Access to all compliance tools at standalone prices",

                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white">
                    <span className="text-sky font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => startCheckout("month")}
                disabled={!!loading}
                className="w-full py-3 rounded-xl text-sm font-bold bg-white text-navy hover:opacity-90 disabled:opacity-50"
              >
                Start free 10-day trial →
              </button>
              <p className="text-center text-blue-200/80 text-meta mt-2">
                10-day free trial · Card required · No tools in trial
              </p>
            </div>

            {/* Professional card */}
            <div className="bg-amber-400/10 border-2 border-amber-400/60 rounded-2xl p-6 relative">
              <p className="text-eyebrow text-amber-300 mb-2">
                Professional
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-display font-bold text-[36px] leading-none">
                  {PRICING.professional.monthly.display}
                </span>
                <span className="text-blue-200 text-lg font-normal">/month</span>
              </div>
              <p className="text-amber-100 text-meta mb-1">
                or {PRICING.professional.annual.display}/year — {PRICING.professional.annual.savingDisplay}
              </p>
              <p className="text-blue-200/80 text-meta mb-1">
                {PRICING.professional.annual.note}
              </p>
              <p className="text-amber-100 text-meta mb-4">
                + {PRICING.professional.perClient.display} per client/year
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Everything in Intelligence (for account holder)",
                  `${PRICING.professional.teamLoginsIncluded} seats included`,
                  "Client/matter workspace & compliance record",
                  "Branded document outputs",
                  "1 free Convenience Tool run per client/month (annual only)",
                  
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white">
                    <span className="text-amber-400 font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => startCheckout("year")}
                disabled={!!loading}
                className="w-full py-3 rounded-xl text-sm font-bold bg-amber-400 text-navy hover:opacity-90 disabled:opacity-50"
              >
                Start Professional →
              </button>
              <p className="text-center text-amber-100/80 text-meta mt-2">
                Add clients at {PRICING.professional.perClient.display}/client/year — no minimum.
              </p>
            </div>
          </div>
          {error && <p className="text-red-300 text-meta mt-4">{error}</p>}
          {isPremium && (
            <p className="text-blue-200 text-meta mt-4">
              You're already subscribed. <Link to="/account" className="underline">Manage your subscription →</Link>
            </p>
          )}
        </div>
      </div>

      {/* Smart Tools / Convenience Tools explainer */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-slate-700 mb-3">
            About our compliance tools
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800 mb-1">Smart Tools</p>
              <p>
                Multi-stage assessments calibrated against 3,500+ enforcement
                decisions. Methodology reviewed by qualified privacy counsel.
                Cannot be replicated by prompting a general AI.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Governance Assessment · LIA · DPIA · CPPA Risk ·
                CPPA Cybersecurity · DPA Generator · Biometric Check
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Convenience Tools</p>
              <p>
                Jurisdiction-specific document generators that save significant
                drafting time. Professional annual subscribers receive
                1 free run per client per month.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                IR Playbook · US Notice Builder · EU/Global Notice Builder ·
                RoPA Builder · Registration Filings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Manager mention */}
      <div className="bg-white border-b border-fog py-4 px-4 mt-6">
        <div className="max-w-[720px] mx-auto text-center text-sm text-slate">
          Need DPO appointments, ROPAs, or AI Act registrations filed?{" "}
          <Link
            to="/registration-manager"
            className="text-navy font-semibold underline underline-offset-2 hover:text-navy-mid"
          >
            Try Registration Filings →
          </Link>{" "}
          <span className="text-slate-light">— $45 per filing.</span>
        </div>
      </div>

      <p className="text-center text-meta text-slate-500 mt-4 mb-8 px-4">
        Every tool output calibrated against 3,700+ real enforcement decisions — not just statutory text.
      </p>

      {/* Feature comparison table */}
      <div className="max-w-3xl mx-auto px-4 mt-12 mb-8">
        <h2 className="text-center font-display text-navy mb-6">
          What's included at each level
        </h2>
        <div className="cmp-table overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 pr-4 font-semibold text-gray-700 w-1/2">Feature</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Anonymous</th>
                <th className="text-center py-3 px-2 font-semibold text-steel text-xs uppercase tracking-wider">Intelligence<br/><span className="font-normal normal-case tracking-normal">{PRICING.intelligence.monthly.display}/mo</span></th>
                <th className="text-center py-3 px-2 font-semibold text-xs uppercase tracking-wider" style={{color:'hsl(var(--gold))'}}>Professional<br/><span className="font-normal normal-case tracking-normal">{PRICING.professional.base.display}/mo + {PRICING.professional.perClient.display}/client/yr</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {([
                ['Privacy Intelligence Feed (news)', '✓', '✓', '✓'],
                ['Article Alert summaries', '✓', '✓', '✓'],
                ['Article Context layer', '—', '✓', '✓'],
                ['Article Analysis and Guidance', '—', '—', '✓'],
                ['Weekly Privacy Intelligence Report', '—', '✓', '✓'],
                ['Personalised by role, jurisdiction, topics', '—', '✓', '✓'],
                ['AI investigation prompts on every article', '—', '✓', '✓'],
                ['119-authority enforcement tracking', 'Limited', '✓', '✓'],
                ['Research guides (GDPR, biometric, health, etc.)', '✓', '✓', '✓'],
                ['1 free Convenience Tool/client/month', '—', '—', '✓ (annual)'],
                ['Governance Assessment (Smart)', '—', '$55', '$55'],
                ['Legitimate Interest Assessment (Smart)', '—', '$35', '$35'],
                ['DPIA Builder (Smart)', '—', '$45', '$45'],
                ['DPA Generator (Smart)', '—', '$45', '$45'],
                ['IR Playbook (Convenience)', '—', '$25', '$25'],
                ['RoPA Builder (Convenience)', '—', '$40', '$40'],
                ['CPPA Suite (Scope free · Risk · Cyber)', 'Scope free', 'Scope free', 'Scope free'],
                ['Client/matter workspace', '—', '—', '✓'],
                ['Up to 3 team logins', '—', '—', '✓'],
                ['Saved reports in My Reports', '—', '✓', '✓'],
                ['Personalized investigation prompts', '—', '✓', '✓'],
              ] as const).map(([feature, anon, intel, platform], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2.5 pr-4 text-gray-700">{feature}</td>
                  <td className="py-2.5 px-2 text-center text-gray-400">{anon}</td>
                  <td className="py-2.5 px-2 text-center font-medium text-steel">{intel}</td>
                  <td className="py-2.5 px-2 text-center font-medium" style={{color:'hsl(var(--gold))'}}>{platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Individual tools also available as standalone purchases.
          CPPA Scope Checker is free — no account required.
        </p>
      </div>

      {fromBuilder && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-green-600 text-lg flex-shrink-0 mt-0.5">✓</span>
            <div>
              <p className="font-bold text-navy text-sm mb-0.5">
                Your Intelligence Report is configured and ready.
              </p>
              <p className="text-sm text-slate">
                {[bJurisdiction, bIndustry, ...bTopics.slice(0, 2)].filter(Boolean).join(" · ")}. Subscribe to receive it.
              </p>
            </div>
          </div>
        </div>
      )}

      <div id="brief-builder-section" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display text-navy mb-2">
            See what your report would look like
          </h2>
          <p className="text-slate text-sm">
            Pick your jurisdiction, role, and topics. We'll build a sample report showing the depth and format you receive every Monday.
          </p>
        </div>
        <BriefBuilder />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Three-column comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-navy text-center mb-8">Free vs. Intelligence vs. Professional</h2>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="cmp-table overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-meta font-semibold tracking-wider uppercase text-slate">
                      Feature
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-slate w-[110px]">
                      Free
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-sky w-[170px]">
                      Intelligence ({PRICING.intelligence.monthly.display}/mo)
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-amber-600 w-[230px]">
                      Professional ({PRICING.professional.base.display}/mo + {PRICING.professional.perClient.display}/client/yr)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => {
                    if ("isSection" in row && row.isSection) {
                      return (
                        <tr key={i} className="bg-navy/5">
                          <td
                            colSpan={4}
                            className="px-5 py-2 text-eyebrow text-navy/60 border-t border-fog"
                          >
                            {row.feature}
                          </td>
                        </tr>
                      );
                    }
                    const renderCell = (val: CellValue, color: "free" | "intel" | "platform") => {
                      if (val === true) {
                        const cls =
                          color === "platform"
                            ? "text-amber-500"
                            : color === "intel"
                              ? "text-sky"
                              : "text-accent";
                        return <Check className={`w-4 h-4 ${cls} mx-auto`} />;
                      }
                      if (val === false) return <XIcon className="w-4 h-4 text-slate-light mx-auto" />;
                      if (val === "Included") {
                        return <span className="text-meta font-semibold text-green-600">Included</span>;
                      }
                      const cls = color === "platform" ? "text-amber-700" : "text-slate";
                      return <span className={`text-meta font-medium ${cls}`}>{val}</span>;
                    };
                    const dataRow = row as Exclude<ComparisonRow, { isSection: true }>;
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                        <td className="px-5 py-3 text-sm text-navy border-t border-fog">{dataRow.feature}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(dataRow.free, "free")}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(dataRow.intel, "intel")}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(dataRow.platform, "platform")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* The missing piece of the privacy toolkit */}
        <div className="mb-14">
          {/* Section heading */}
          <div className="text-center mb-8">
            <p className="text-meta font-bold uppercase tracking-[0.09em] text-slate mb-3">
              Where we fit
            </p>
            <h2 className="font-display text-navy mb-3 leading-tight">
              The missing piece of the privacy toolkit
            </h2>
            <p className="text-sm text-slate max-w-[480px] mx-auto leading-relaxed">
              Privacy professionals rely on four well-established categories of tools.
              End User Privacy was purpose-built for the one that had no dedicated home.
            </p>
          </div>

          {/* Donut chart + legend card */}
          <div className="bg-card border border-fog rounded-2xl p-6 md:p-8 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* SVG donut chart */}
              <div className="flex items-center justify-center">
                <svg
                  viewBox="0 0 240 240"
                  className="w-full max-w-[220px]"
                  role="img"
                  aria-label="Donut chart of the privacy professional's toolkit. End User Privacy occupies the largest segment at 40 percent."
                >
                  <title>The privacy professional's toolkit — End User Privacy fills the missing piece</title>
                  {/* EUP segment: 40% */}
                  <path d="M120,24 A96,96 0 0,1 176.4,197.7 L151.7,163.7 A54,54 0 0,0 120,66 Z" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                  {/* Legal research: 15% */}
                  <path d="M176.4,197.7 A96,96 0 0,1 90.3,211.3 L103.3,171.4 A54,54 0 0,0 151.7,163.7 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Compliance management: 15% */}
                  <path d="M90.3,211.3 A96,96 0 0,1 28.7,149.7 L68.6,136.7 A54,54 0 0,0 103.3,171.4 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Privacy technology: 15% */}
                  <path d="M28.7,149.7 A96,96 0 0,1 42.3,63.6 L76.3,88.3 A54,54 0 0,0 68.6,136.7 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Professional development: 15% */}
                  <path d="M42.3,63.6 A96,96 0 0,1 120,24 L120,66 A54,54 0 0,0 76.3,88.3 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Center hole */}
                  <circle cx="120" cy="120" r="50" fill="white" />
                  {/* Center label */}
                  <text x="120" y="114" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">Privacy</text>
                  <text x="120" y="126" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">professional's</text>
                  <text x="120" y="138" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">toolkit</text>
                  {/* EUP label */}
                  <text x="191" y="90" textAnchor="middle" fontSize="11" fontWeight="500" fill="#7C2D12" fontFamily="DM Sans, sans-serif">EUP</text>
                  <text x="191" y="103" textAnchor="middle" fontSize="10" fill="#92400E" fontFamily="DM Sans, sans-serif">40%</text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    color: "bg-amber-500",
                    name: "Regulatory intelligence and action",
                    desc: "What changed, what it means for your work, and what to do — automatically, every week.",
                    nameClass: "text-amber-800",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Legal research",
                    desc: "Statutes, case law, and regulatory guidance for teams that need primary source access.",
                    nameClass: "text-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Compliance management",
                    desc: "Programme workflows, DSAR handling, consent management, and data mapping.",
                    nameClass: "text-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Privacy technology",
                    desc: "Consent banners, cookie management, preference centres, and data discovery.",
                    nameClass: "text-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Professional development",
                    desc: "Credentials, community, events, and continuing education.",
                    nameClass: "text-navy",
                  },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-2.5">
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 mt-1 ${item.color}`} />
                    <div>
                      <p className={`text-sm font-semibold leading-snug mb-0.5 ${item.nameClass}`}>
                        {item.name}
                      </p>
                      <p className="text-meta text-slate leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EUP highlight card */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 mb-5">
            <p className="text-meta font-bold uppercase tracking-[0.07em] text-amber-800 mb-1">
              End User Privacy
            </p>
            <h3 className="text-navy mb-2 leading-snug">
              The monitoring and action layer — purpose-built
            </h3>
            <p className="text-sm text-slate leading-relaxed">
              Our tools monitor 119 regulatory authorities daily, synthesise every development,
              and tell you what it means for your specific work — automatically, every week.
              Plus the compliance documents to act on it.
            </p>
          </div>

          {/* Body copy card */}
          <div className="bg-card border border-fog rounded-2xl px-6 py-5 mb-5">
            <p className="text-sm text-slate leading-relaxed mb-4">
              The privacy professional's toolkit has four well-established categories, each
              with excellent tools. Legal research databases give you access to the primary
              source when you need to read the statute. Compliance management platforms handle
              programme workflows and consent. Professional associations provide credentials and
              community. Privacy technology keeps your websites and data practices running
              correctly.
            </p>
            <div className="h-px bg-fog my-4" />
            <p className="text-sm text-slate leading-relaxed">
              Our tools monitor what is happening across the regulatory landscape
              automatically, synthesise it, and tell you what it means for your specific work.
            </p>
          </div>

          {/* Closing quote */}
          <div className="border-l-[3px] border-amber-500 bg-card border border-fog rounded-r-xl px-5 py-4">
            <p className="text-sm text-slate leading-relaxed italic">
              "End User Privacy is the monitoring and intelligence layer you add once, and
              then stop having to think about — working alongside the professional tools you
              already rely on."
            </p>
          </div>
        </div>

        {error && <p className="text-center text-warn text-sm mt-6">{error}</p>}

        {/* Free digest signup */}
        <FreeDigestSignup source="website" className="mt-10" />

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground py-3 border-t border-border mt-8">
          <span>✓ Cancel anytime</span>
          <span>✓ Secure payment via Stripe</span>
          <span>✓ No ads for subscribers</span>
        </div>
      </div>
      <Footer />
      <UIDebugOverlay label="Subscribe UI debug" />
      <SubscribeCheckoutModal
        open={checkoutOpen}
        interval={checkoutInterval}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
    </div>
  );
};

export default Subscribe;
