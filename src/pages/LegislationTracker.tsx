import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

type Stage = "enacted" | "passed" | "committee" | "introduced" | "proposed" | "withdrawn";

interface Bill {
  id: string; flag: string; jurisdiction: string; region: string;
  name: string; stage: Stage; introduced?: string; lastUpdated: string;
  summary: string; keyProvisions: string[];
}

// Display name -> ISO 2-letter code, jurisdiction page slug (optional), and SVG flag URL.
// Only entries with a `slug` will render the chip as a link; others fall back to a non-link chip.
const JURISDICTION_META: Record<string, { iso2: string; slug?: string; flagUrl: string }> = {
  "India":          { iso2: "IN", slug: "india",          flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_India.svg?width=40" },
  "United Kingdom": { iso2: "GB", slug: "united-kingdom", flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_the_United_Kingdom.svg?width=40" },
  "Australia":      { iso2: "AU", slug: "australia",      flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Australia.svg?width=40" },
  "Chile":          { iso2: "CL", slug: "chile",          flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Chile.svg?width=40" },
  "Brazil":         { iso2: "BR", slug: "brazil",         flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Brazil.svg?width=40" },
  "European Union": { iso2: "EU", slug: "european-union", flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Europe.svg?width=40" },
  "US Federal":     { iso2: "US",                          flagUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_the_United_States.svg?width=40" },
};

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; order: number }> = {
  enacted:    { label: "Enacted",     color: "#16a34a", bg: "#f0fdf4", order: 1 },
  passed:     { label: "Passed",      color: "#2563eb", bg: "#eff6ff", order: 2 },
  committee:  { label: "In Committee",color: "#d97706", bg: "#fffbeb", order: 3 },
  introduced: { label: "Introduced",  color: "#7c3aed", bg: "#f5f3ff", order: 4 },
  proposed:   { label: "Proposed",    color: "#94a3b8", bg: "#f8fafc", order: 5 },
  withdrawn:  { label: "Withdrawn",   color: "#dc2626", bg: "#fef2f2", order: 6 },
};

const BILLS: Bill[] = [
  {
    id:"1", flag:"🇮🇳", jurisdiction:"India", region:"Asia-Pacific",
    name:"DPDP Rules (Digital Personal Data Protection)",
    stage:"proposed", introduced:"2023-08", lastUpdated:"Mar 2026",
    summary:"Rules to operationalise the DPDP Act 2023 — covering consent managers, data fiduciaries, and the Data Protection Board.",
    keyProvisions:["Consent manager framework","Significant Data Fiduciary designation","Children's data processing rules","Cross-border transfer safeguards"],
  },
  {
    id:"2", flag:"🇺🇸", jurisdiction:"US Federal", region:"Americas",
    name:"American Privacy Rights Act (APRA)",
    stage:"committee", introduced:"2024-04", lastUpdated:"Feb 2026",
    summary:"Federal comprehensive consumer privacy bill covering data minimization, consumer rights, and preemption of state laws.",
    keyProvisions:["Data minimization requirements","Consumer access and deletion rights","Sensitive data prohibitions","Private right of action"],
  },
  {
    id:"3", flag:"🇬🇧", jurisdiction:"United Kingdom", region:"Europe",
    name:"Data (Use & Access) Act 2025 (DUAA) — Phase 2 Implementation",
    stage:"enacted", introduced:"2024-10", lastUpdated:"Feb 2026",
    summary:"Full implementation of DUAA provisions; ICO reformation into Information Commission underway.",
    keyProvisions:["Aligned UK/EU GDPR fining regimes","ICO → Information Commission transition","Enhanced DSAR procedures","Legitimate interests clarification"],
  },
  {
    id:"4", flag:"🇦🇺", jurisdiction:"Australia", region:"Asia-Pacific",
    name:"Privacy Act Reform — Tranche 2",
    stage:"introduced", introduced:"2026-01", lastUpdated:"Mar 2026",
    summary:"Second tranche of Australian Privacy Act reforms covering enhanced enforcement powers and a statutory tort for serious invasions of privacy.",
    keyProvisions:["Statutory tort for privacy invasion","Enhanced OAIC enforcement powers","Children's privacy code","Automated decision-making disclosure"],
  },
  {
    id:"5", flag:"🇨🇱", jurisdiction:"Chile", region:"Americas",
    name:"New Data Protection Law (Ley de Protección de Datos)",
    stage:"passed", introduced:"2022-03", lastUpdated:"Jan 2026",
    summary:"Chile's new comprehensive data protection law, replacing the 1999 law with GDPR-aligned rights and a new data protection agency.",
    keyProvisions:["GDPR-style consumer rights","New data protection agency (CPAP)","DPO requirements for some entities","Data breach notification (72 hours)"],
  },
  {
    id:"6", flag:"🇧🇷", jurisdiction:"Brazil", region:"Americas",
    name:"AI Regulation Bill (PL 2338/2023)",
    stage:"committee", introduced:"2023-05", lastUpdated:"Feb 2026",
    summary:"Brazil's proposed AI regulation covering high-risk systems, transparency, and enforcement by consumer protection agencies.",
    keyProvisions:["High-risk AI classification","Algorithmic impact assessments","Transparency requirements","Consumer protection enforcement"],
  },
  {
    id:"7", flag:"🇪🇺", jurisdiction:"European Union", region:"Europe",
    name:"EU Digital Omnibus Package — ePrivacy Revision",
    stage:"proposed", introduced:"2025-11", lastUpdated:"Mar 2026",
    summary:"Commission proposal to streamline EU digital regulation including targeted amendments to GDPR and ePrivacy Directive.",
    keyProvisions:["GDPR targeted amendments","ePrivacy Directive overhaul","Cookie rule simplification","Reduced compliance burden for SMEs"],
  },
];

const REGIONS = ["All Regions","Americas","Europe","Asia-Pacific"];

export default function LegislationTracker() {
  const [region, setRegion] = useState("All Regions");
  const [stage,  setStage]  = useState("All Stages");
  const [search, setSearch] = useState("");

  const filtered = BILLS
    .filter(b => region === "All Regions" || b.region === region)
    .filter(b => stage  === "All Stages"  || b.stage  === stage)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.jurisdiction.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => STAGE_CONFIG[a.stage].order - STAGE_CONFIG[b.stage].order);

  return (
    <>
      <Helmet>
        <title>Global Privacy Legislation Tracker 2026 — Bills &amp; Laws Worldwide | End User Privacy</title>
        <meta name="description" content="Track privacy bills worldwide from introduction through enactment. US state laws, EU regulations, AI Act, APAC privacy frameworks — updated in real time." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <h1 className="font-display font-bold text-navy text-2xl md:text-3xl mb-2">
            📜 Legislation Status Tracker
          </h1>
          <p className="text-slate text-sm mb-6 max-w-2xl">
            Track privacy and data protection bills globally — from introduction through committee,
            passage, and enactment. Updated as bills progress.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search bills…"
              className="bg-white border border-fog rounded-xl px-4 py-2 text-sm text-navy placeholder:text-slate-light focus:outline-none focus:border-blue/50 w-56"
            />
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${region===r?"bg-navy text-white border-navy":"bg-white text-slate border-fog hover:border-navy/20"}`}
                >{r}</button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["All Stages",...Object.keys(STAGE_CONFIG)] as string[]).map(s => {
                const cfg = s !== "All Stages" ? STAGE_CONFIG[s as Stage] : null;
                return (
                  <button key={s} onClick={() => setStage(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${stage===s?"bg-navy text-white border-navy":"bg-white text-slate border-fog hover:border-navy/20"}`}
                    style={cfg && stage===s ? { background:cfg.color, borderColor:cfg.color } : {}}
                  >
                    {s === "All Stages" ? s : STAGE_CONFIG[s as Stage].label}
                  </button>
                );
              })}
            </div>
          </div>

          <AdBanner variant="leaderboard" adSlot="eup-legislation-top" className="py-3" />

          <div className="space-y-4">
            {filtered.map(bill => {
              const cfg = STAGE_CONFIG[bill.stage];
              const meta = JURISDICTION_META[bill.jurisdiction];
              const chipInner = meta ? (
                <>
                  <img
                    src={meta.flagUrl}
                    alt={`${bill.jurisdiction} flag`}
                    loading="lazy"
                    className="w-6 h-4 object-cover rounded-[2px] shadow-sm flex-shrink-0"
                  />
                  <span className="font-mono text-[11px] font-bold text-navy tracking-wider">{meta.iso2}</span>
                </>
              ) : (
                <span className="text-base leading-none flag-emoji" aria-hidden="true">{bill.flag}</span>
              );
              return (
                <div key={bill.id} className="bg-white rounded-2xl border border-fog p-6 hover:shadow-eup-sm transition-all">
                  <div className="flex items-start gap-4">
                    {meta?.slug ? (
                      <Link
                        to={`/jurisdiction/${meta.slug}`}
                        aria-label={`View ${bill.jurisdiction} jurisdiction page`}
                        className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1 rounded-lg border border-fog bg-white hover:border-navy/30 hover:shadow-eup-sm transition-all no-underline"
                      >
                        {chipInner}
                      </Link>
                    ) : (
                      <div className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1 rounded-lg border border-fog bg-white">
                        {chipInner}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-bold text-slate uppercase tracking-wider">{bill.jurisdiction}</span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-slate-light text-[10px]">Updated {bill.lastUpdated}</span>
                      </div>
                      <h3 className="font-bold text-navy text-[15px] mb-2">{bill.name}</h3>
                      <p className="text-slate text-sm leading-relaxed mb-3">{bill.summary}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bill.keyProvisions.map((p, i) => (
                          <span key={i} className="bg-fog text-slate text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-slate py-12 text-sm">No bills match your filters.</p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
