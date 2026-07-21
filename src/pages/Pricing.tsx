import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Check, X, Sparkles, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRICING, INCLUDED_GENERATIONS_SHORT } from "@/config/pricing";

/**
 * /pricing — public pricing page (UX-2e T1).
 *
 * ALL prices are read from src/config/pricing.ts via PRICING.
 * Any hardcoded "$" price string in this file would be a defect.
 */

const iconProps = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

interface Row {
  feature: string;
  intelligence: string | boolean;
  professional: string | boolean;
  standalone: string | boolean;
}

// Comparison rows. All numeric price cells are pulled from PRICING at render.
const buildRows = (): Row[] => [
  {
    feature: "Daily privacy intelligence feed",
    intelligence: true,
    professional: true,
    standalone: false,
  },
  {
    feature: "Weekly Intelligence Brief",
    intelligence: true,
    professional: true,
    standalone: false,
  },
  {
    feature: "Enforcement tracker + calendar",
    intelligence: true,
    professional: true,
    standalone: true,
  },
  {
    feature: "RoPA Builder",
    intelligence: "Included",
    professional: "Included",
    standalone: "Subscriber only",
  },
  {
    feature: "US Privacy Notice Builder",
    intelligence: "Included",
    professional: "Included",
    standalone: "Subscriber only",
  },
  {
    feature: "EU / Global Privacy Notice Builder",
    intelligence: "Included",
    professional: "Included",
    standalone: "Subscriber only",
  },
  {
    feature: "Client / matter workspace",
    intelligence: false,
    professional: "Annual required",
    standalone: false,
  },
  {
    feature: "Free Smart Tool runs / year",
    intelligence: "1 (annual)",
    professional: "3 (annual)",
    standalone: "—",
  },
  {
    feature: `Biometric Compliance Check`,
    intelligence: PRICING.tools.biometric.display,
    professional: PRICING.tools.biometric.display,
    standalone: PRICING.tools.biometric.display,
  },
  {
    feature: `Breach IR Playbook`,
    intelligence: PRICING.tools.ir_playbook.display,
    professional: PRICING.tools.ir_playbook.display,
    standalone: PRICING.tools.ir_playbook.display,
  },
  {
    feature: `Custom DPA Generator`,
    intelligence: PRICING.tools.dpa.display,
    professional: PRICING.tools.dpa.display,
    standalone: PRICING.tools.dpa.display,
  },
  {
    feature: `Legitimate Interest Assessment`,
    intelligence: PRICING.tools.lia.display,
    professional: PRICING.tools.lia.display,
    standalone: PRICING.tools.lia.display,
  },
  {
    feature: `Impact Assessment Builder (DPIA)`,
    intelligence: PRICING.tools.dpia.display,
    professional: PRICING.tools.dpia.display,
    standalone: PRICING.tools.dpia.display,
  },
  {
    feature: `GDPR Governance Assessment`,
    intelligence: PRICING.tools.governance.display,
    professional: PRICING.tools.governance.display,
    standalone: PRICING.tools.governance.display,
  },
  {
    feature: `CPPA Risk Assessment`,
    intelligence: PRICING.tools.cppa_risk.display,
    professional: PRICING.tools.cppa_risk.display,
    standalone: PRICING.tools.cppa_risk.display,
  },
  {
    feature: `CPPA Cybersecurity Readiness`,
    intelligence: PRICING.tools.cppa_cyber.display,
    professional: PRICING.tools.cppa_cyber.display,
    standalone: PRICING.tools.cppa_cyber.display,
  },
  {
    feature: `CPPA Full Audit Suite`,
    intelligence: PRICING.tools.cppa_suite.display,
    professional: PRICING.tools.cppa_suite.display,
    standalone: PRICING.tools.cppa_suite.display,
  },
];

const Cell = ({ value }: { value: string | boolean }) => {
  if (value === true) return <Check {...iconProps} className="text-brand-teal inline" />;
  if (value === false) return <X {...iconProps} className="text-muted-foreground/50 inline" />;
  return <span className="text-sm text-brand-navy">{value}</span>;
};

export default function Pricing() {
  const rows = buildRows();
  const intelligence = PRICING.intelligence;
  const professional = PRICING.professional;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Pricing — End User Privacy</title>
        <meta
          name="description"
          content={`Intelligence from ${intelligence.monthly.display}/month · Professional from ${professional.monthly.display}/month · Compliance tools available standalone.`}
        />
      </Helmet>
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-brand-navy text-white py-14 px-4">
          <div className="max-w-[1100px] mx-auto text-center">
            <p className="text-eyebrow text-brand-teal-on-navy mb-3">Pricing</p>
            <h1 className="text-white mb-4">Intelligence, Professional, or per-use.</h1>
            <p className="text-blue-100 max-w-2xl mx-auto">
              Subscribe for the daily feed and weekly brief, add the client
              workspace with Professional, or buy any compliance tool
              standalone. {INCLUDED_GENERATIONS_SHORT} in every tool run.
            </p>
          </div>
        </section>

        {/* Cards */}
        <section className="max-w-[1100px] mx-auto px-4 py-12 grid gap-6 md:grid-cols-3">
          {/* Intelligence */}
          <div className="bg-card border rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-brand-teal">
              <Sparkles {...iconProps} />
              <span className="text-eyebrow">Intelligence</span>
            </div>
            <h2 className="text-brand-navy mb-2">Daily feed + weekly brief</h2>
            <div className="mb-4">
              <span className="font-display text-4xl font-bold text-brand-navy">
                {intelligence.monthly.display}
              </span>
              <span className="text-muted-foreground">/{intelligence.monthly.label}</span>
              <p className="text-meta text-muted-foreground mt-1">
                or {intelligence.annual.display}/{intelligence.annual.label} — {intelligence.annual.savingDisplay}
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Daily privacy intelligence feed</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Weekly Intelligence Brief</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> RoPA + Notice Builders included</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> 1 free Smart Tool run / year (annual)</li>
            </ul>
            <Link
              to="/subscribe?plan=intelligence"
              className="inline-flex items-center justify-center bg-brand-teal-deep text-white font-semibold px-5 py-3 rounded-lg no-underline hover:opacity-90"
            >
              Start Intelligence →
            </Link>
          </div>

          {/* Professional */}
          <div className="bg-card border-2 border-brand-teal rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 left-6 bg-brand-teal text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most complete
            </div>
            <div className="flex items-center gap-2 mb-2 text-brand-teal">
              <Sparkles {...iconProps} />
              <span className="text-eyebrow">Professional</span>
            </div>
            <h2 className="text-brand-navy mb-2">Everything + client workspace</h2>
            <div className="mb-4">
              <span className="font-display text-4xl font-bold text-brand-navy">
                {professional.monthly.display}
              </span>
              <span className="text-muted-foreground">/{professional.monthly.label}</span>
              <p className="text-meta text-muted-foreground mt-1">
                or {professional.annual.display}/{professional.annual.label} — {professional.annual.savingDisplay}
              </p>
              <p className="text-meta text-muted-foreground">
                + {professional.perClient.display}/{professional.perClient.label} per additional client
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Everything in Intelligence</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Client / matter workspace (annual)</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> 3 free Smart Tool runs / year (annual)</li>
              <li className="flex gap-2"><Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Free IR Playbook, DPA, Biometric</li>
            </ul>
            <Link
              to="/subscribe?plan=professional"
              className="inline-flex items-center justify-center bg-brand-teal-deep text-white font-semibold px-5 py-3 rounded-lg no-underline hover:opacity-90"
            >
              Start Professional →
            </Link>
          </div>

          {/* Standalone tools */}
          <div className="bg-card border rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-brand-teal">
              <Wrench {...iconProps} />
              <span className="text-eyebrow">Per-use tools</span>
            </div>
            <h2 className="text-brand-navy mb-2">Buy a single tool</h2>
            <div className="mb-4">
              <span className="font-display text-4xl font-bold text-brand-navy">
                {PRICING.tools.biometric.display}
              </span>
              <span className="text-muted-foreground"> – {PRICING.tools.cppa_suite.display}</span>
              <p className="text-meta text-muted-foreground mt-1">
                Every tool available standalone. No subscription required.
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex justify-between"><span>Biometric Check</span><span className="tabular-nums">{PRICING.tools.biometric.display}</span></li>
              <li className="flex justify-between"><span>IR Playbook</span><span className="tabular-nums">{PRICING.tools.ir_playbook.display}</span></li>
              <li className="flex justify-between"><span>DPA Generator</span><span className="tabular-nums">{PRICING.tools.dpa.display}</span></li>
              <li className="flex justify-between"><span>LIA / DPIA</span><span className="tabular-nums">{PRICING.tools.lia.display}</span></li>
              <li className="flex justify-between"><span>Governance</span><span className="tabular-nums">{PRICING.tools.governance.display}</span></li>
              <li className="flex justify-between"><span>CPPA Suite</span><span className="tabular-nums">{PRICING.tools.cppa_suite.display}</span></li>
            </ul>
            <Link
              to="/tools"
              className="inline-flex items-center justify-center border border-brand-navy text-brand-navy font-semibold px-5 py-3 rounded-lg no-underline hover:bg-brand-cloud"
            >
              Browse tools →
            </Link>
          </div>
        </section>

        {/* Comparison table */}
        <section className="max-w-[1100px] mx-auto px-4 pb-16">
          <h2 className="text-brand-navy mb-6">Compare plans</h2>
          <div className="overflow-x-auto border rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-brand-cloud/40">
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Feature</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Intelligence</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Professional</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Standalone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.feature} className={i % 2 ? "bg-brand-cloud/20" : ""}>
                    <td className="px-4 py-3 text-brand-navy">{r.feature}</td>
                    <td className="px-4 py-3"><Cell value={r.intelligence} /></td>
                    <td className="px-4 py-3"><Cell value={r.professional} /></td>
                    <td className="px-4 py-3"><Cell value={r.standalone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-meta text-muted-foreground mt-4">
            Prices shown are current retail rates from the pricing registry. This
            document is not legal advice and must be reviewed by qualified legal
            counsel before any operational use or reliance.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
