import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AdBanner from "@/components/AdBanner";
import { GLOBAL_STATUTES } from "@/data/global_statutes";

const DIMENSIONS = [
  { key: "hasLaw",          label: "Comprehensive Privacy Law",      type: "bool"   },
  { key: "yearEnacted",     label: "Year Enacted / In Force",        type: "text"   },
  { key: "regulator",       label: "Primary Regulator",              type: "text"   },
  { key: "dpo",             label: "DPO Required",                   type: "bool"   },
  { key: "breachNotif",     label: "Breach Notification Required",   type: "bool"   },
  { key: "breachDeadline",  label: "Breach Notification Deadline",   type: "text"   },
  { key: "rightAccess",     label: "Right of Access",                type: "bool"   },
  { key: "rightErasure",    label: "Right to Erasure",               type: "bool"   },
  { key: "rightPortability",label: "Data Portability",               type: "bool"   },
  { key: "crossBorder",     label: "Cross-Border Transfer Rules",    type: "bool"   },
  { key: "gdprAdequacy",    label: "EU Adequacy Decision",           type: "bool"   },
  { key: "maxFine",         label: "Max Fine",                       type: "text"   },
  { key: "aiRules",         label: "AI-Specific Rules",              type: "bool"   },
  { key: "childrenRules",   label: "Children's Data Rules",          type: "bool"   },
];

const COMPARISON_DATA: Record<string, Record<string, any>> = {
  "european-union": {
    name: "European Union", flag: "🇪🇺",
    hasLaw: true, yearEnacted: "2018 (GDPR)", regulator: "EDPB + National DPAs",
    dpo: true, breachNotif: true, breachDeadline: "72 hours",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: true, gdprAdequacy: true,
    maxFine: "€20M or 4% global turnover",
    aiRules: true, childrenRules: true,
  },
  "united-kingdom": {
    name: "United Kingdom", flag: "🇬🇧",
    hasLaw: true, yearEnacted: "2018 (UK GDPR)", regulator: "ICO",
    dpo: true, breachNotif: true, breachDeadline: "72 hours",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: true, gdprAdequacy: false,
    maxFine: "£17.5M or 4% global turnover",
    aiRules: false, childrenRules: true,
  },
  "united-states": {
    name: "United States", flag: "🇺🇸",
    hasLaw: false, yearEnacted: "No federal law (sector laws)", regulator: "FTC + State AGs",
    dpo: false, breachNotif: true, breachDeadline: "Varies by state (30–90 days)",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: false, gdprAdequacy: true,
    maxFine: "Varies (CCPA: $7,500/intentional violation)",
    aiRules: false, childrenRules: true,
  },
  "brazil": {
    name: "Brazil", flag: "🇧🇷",
    hasLaw: true, yearEnacted: "2020 (LGPD)", regulator: "ANPD",
    dpo: true, breachNotif: true, breachDeadline: "72 hours",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: true, gdprAdequacy: false,
    maxFine: "2% of Brazil revenue up to R$50M",
    aiRules: false, childrenRules: true,
  },
  "canada": {
    name: "Canada", flag: "🇨🇦",
    hasLaw: true, yearEnacted: "2000 (PIPEDA)", regulator: "OPC",
    dpo: false, breachNotif: true, breachDeadline: "As soon as feasible",
    rightAccess: true, rightErasure: false, rightPortability: false,
    crossBorder: true, gdprAdequacy: true,
    maxFine: "CAD 100K (PIPEDA)",
    aiRules: false, childrenRules: false,
  },
  "australia": {
    name: "Australia", flag: "🇦🇺",
    hasLaw: true, yearEnacted: "1988 (reformed 2024)", regulator: "OAIC",
    dpo: false, breachNotif: true, breachDeadline: "30 days",
    rightAccess: true, rightErasure: false, rightPortability: false,
    crossBorder: true, gdprAdequacy: false,
    maxFine: "AUD 50M or 30% of turnover",
    aiRules: false, childrenRules: false,
  },
  "china": {
    name: "China", flag: "🇨🇳",
    hasLaw: true, yearEnacted: "2021 (PIPL)", regulator: "CAC / MPS / SAMR",
    dpo: true, breachNotif: true, breachDeadline: "Immediately",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: true, gdprAdequacy: false,
    maxFine: "CNY 50M or 5% of annual revenue",
    aiRules: true, childrenRules: true,
  },
  "japan": {
    name: "Japan", flag: "🇯🇵",
    hasLaw: true, yearEnacted: "2003 (APPI, revised 2022)", regulator: "PPC",
    dpo: false, breachNotif: true, breachDeadline: "30 days",
    rightAccess: true, rightErasure: true, rightPortability: false,
    crossBorder: true, gdprAdequacy: true,
    maxFine: "JPY 100M",
    aiRules: false, childrenRules: false,
  },
  "south-korea": {
    name: "South Korea", flag: "🇰🇷",
    hasLaw: true, yearEnacted: "2011 (PIPA)", regulator: "PIPC",
    dpo: true, breachNotif: true, breachDeadline: "72 hours",
    rightAccess: true, rightErasure: true, rightPortability: true,
    crossBorder: true, gdprAdequacy: false,
    maxFine: "3% of annual revenue",
    aiRules: false, childrenRules: true,
  },
  "india": {
    name: "India", flag: "🇮🇳",
    hasLaw: false, yearEnacted: "DPDP Act 2023 (rules pending)", regulator: "Data Protection Board (pending)",
    dpo: false, breachNotif: true, breachDeadline: "TBD (rules pending)",
    rightAccess: true, rightErasure: true, rightPortability: false,
    crossBorder: false, gdprAdequacy: false,
    maxFine: "INR 250 crore (≈$30M)",
    aiRules: false, childrenRules: true,
  },
};

const ALL_SLUGS = Object.keys(COMPARISON_DATA);

function Cell({ type, value, slug, dimKey }: { type: string; value: any; slug: string; dimKey: string }) {
  if (type === "bool") {
    if (value === true) {
      const statute = GLOBAL_STATUTES[`${slug}:${dimKey}`];
      if (statute) {
        return (
          <span className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={statute.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label={`${statute.cite} — click to view statute`}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs font-mono">
                <p>{statute.cite}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Click to view statute ↗</p>
              </TooltipContent>
            </Tooltip>
          </span>
        );
      }
      return <span className="flex justify-center"><Check className="w-4 h-4 text-green-500" /></span>;
    }
    if (value === false) return <span className="flex justify-center"><X className="w-4 h-4 text-red-400" /></span>;
    return <span className="flex justify-center"><Minus className="w-4 h-4 text-muted-foreground" /></span>;
  }
  return <span className="text-[12px] text-foreground">{value ?? "—"}</span>;
}

export default function GlobalJurisdictionComparison() {
  const [selected, setSelected] = useState<string[]>(["european-union", "united-kingdom", "united-states"]);

  const toggle = (slug: string) => {
    setSelected(prev =>
      prev.includes(slug)
        ? prev.length > 1 ? prev.filter(s => s !== slug) : prev
        : prev.length < 5 ? [...prev, slug] : prev
    );
  };

  const cols = selected.map(s => ({ slug: s, ...COMPARISON_DATA[s] })).filter(Boolean);

  return (
    <>
      <Helmet>
        <title>Compare Privacy Laws by Jurisdiction | EndUserPrivacy</title>
        <meta name="description" content="Side-by-side comparison of global privacy laws across 10+ jurisdictions. Compare GDPR, LGPD, PIPL, CCPA and more." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar />
        <Navbar />
        <main className="flex-1 max-w-[1280px] mx-auto px-4 md:px-8 py-8 w-full">
          <h1 className="font-display font-bold text-foreground text-2xl md:text-3xl mb-2">
            Jurisdiction Comparison
          </h1>
          <p className="text-muted-foreground text-sm mb-1">
            Compare up to 5 jurisdictions side by side. Select from the list below.
          </p>
          <p className="text-muted-foreground/80 text-xs mb-6">
            Hover any ✓ to see the statute citation. Click to open the law.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 p-4 bg-muted rounded-2xl">
            {ALL_SLUGS.map(slug => {
              const j = COMPARISON_DATA[slug];
              const active = selected.includes(slug);
              return (
                <button
                  key={slug}
                  onClick={() => toggle(slug)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  <span className="flag-emoji">{j.flag}</span> {j.name}
                  {active && <span className="ml-0.5 opacity-70">✓</span>}
                </button>
              );
            })}
          </div>
          <AdBanner variant="leaderboard" adSlot="eup-jurisdcomp-top" className="py-3" />

          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-primary-foreground/60 w-48">
                    Dimension
                  </th>
                  {cols.map(j => (
                    <th key={j.name} className="px-4 py-3 text-center min-w-[140px]">
                      <div className="text-lg flag-emoji">{j.flag}</div>
                      <div className="text-primary-foreground font-bold text-[13px]">{j.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((dim, i) => (
                  <tr key={dim.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                    <td className="px-5 py-3 text-[12px] font-semibold text-muted-foreground border-r border-border">
                      {dim.label}
                    </td>
                    {cols.map(j => (
                      <td key={j.name} className="px-4 py-3 text-center">
                        <Cell type={dim.type} value={j[dim.key]} slug={j.slug} dimKey={dim.key} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground text-xs mt-4 text-center">
            Hover any ✓ to see the applicable statute or article. Click to open the source law in a new tab. Data reflects best available information as of March 2026.
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
}
