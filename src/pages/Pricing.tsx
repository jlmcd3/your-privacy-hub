import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Sparkles, Wrench, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRICING, PRICING_REGISTRY } from "@/config/pricing";

/**
 * /pricing — public pricing page.
 *
 * ALL prices are read from src/config/pricing.ts (PRICING + PRICING_REGISTRY).
 * Structure mirrors the canonical EndUserPrivacy Price List document:
 *   1. Subscription plans (cards)
 *   2. Smart Tools — per-use (Standalone / Subscriber / Annual Credit / +4 Top-Up)
 *   3. Included / Layer-1 tools (Standalone / Subscriber Access)
 */

const iconProps = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

const reg = PRICING_REGISTRY as Record<string, { displayPrice: string; amountCents: number }>;
const price = (key: string) => reg[key]?.displayPrice ?? "—";

interface SmartToolRow {
  tool: string;
  standaloneKey: string;
  subscriberKey: string;
  annualCredit: string;
  topupKey: string | null;
}

const SMART_TOOL_ROWS: SmartToolRow[] = [
  {
    tool: "GDPR Governance Assessment",
    standaloneKey: "hc_standalone_v2",
    subscriberKey: "hc_subscriber_v2",
    annualCredit: "1 credit / yr",
    topupKey: "governance_topup_v1",
  },
  {
    tool: "Legitimate Interest Assessment (LIA)",
    standaloneKey: "li_standalone_v2",
    subscriberKey: "li_subscriber_v2",
    annualCredit: "1 credit / yr",
    topupKey: "li_topup_v1",
  },
  {
    tool: "Impact Assessment Builder (DPIA)",
    standaloneKey: "dpia_standalone_v2",
    subscriberKey: "dpia_subscriber_v2",
    annualCredit: "1 credit / yr",
    topupKey: "dpia_topup_v1",
  },
  {
    tool: "CPPA Risk Assessment — Module 1",
    standaloneKey: "cppa_risk_standalone",
    subscriberKey: "cppa_risk_subscriber",
    annualCredit: "Not eligible",
    topupKey: "cppa_risk_topup_v1",
  },
  {
    tool: "CPPA Cybersecurity Readiness — Module 2",
    standaloneKey: "cppa_cyber_standalone",
    subscriberKey: "cppa_cyber_subscriber",
    annualCredit: "Not eligible",
    topupKey: "cppa_cybersecurity_topup_v1",
  },
  {
    tool: "CPPA Full Audit Suite (Modules 1 + 2)",
    standaloneKey: "cppa_suite_standalone",
    subscriberKey: "cppa_suite_subscriber",
    annualCredit: "Not eligible",
    topupKey: null,
  },
  {
    tool: "ADMT Compliance Assessment — Module 3",
    standaloneKey: "cppa_admt_standalone",
    subscriberKey: "cppa_admt_subscriber",
    annualCredit: "Not eligible",
    topupKey: "cppa_admt_topup_v1",
  },
];

interface IncludedRow {
  tool: string;
  standalone: string;
  access: string;
}

const INCLUDED_ROWS: IncludedRow[] = [
  { tool: "Custom DPA Generator", standalone: PRICING.tools.dpa.display, access: "Free for all active subscribers" },
  {
    tool: "Incident Response Playbook",
    standalone: PRICING.tools.ir_playbook.display,
    access: "Free for all active subscribers",
  },
  {
    tool: "Biometric Compliance Check",
    standalone: PRICING.tools.biometric.display,
    access: "Free for all active subscribers",
  },
  { tool: "RoPA Builder — Initial Generation", standalone: "—", access: "Subscriber-only (free)" },
  { tool: "RoPA Builder — Annual Refresh", standalone: "—", access: "Subscriber-only (free)" },
  { tool: "US Privacy Notice Builder", standalone: "—", access: "Subscriber-only (free)" },
  { tool: "EU & Global Privacy Notice Builder", standalone: "—", access: "Subscriber-only (free)" },
  { tool: "CPPA Scope Checker", standalone: "Free", access: "Free (no account required)" },
];

export default function Pricing() {
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
              Subscribe for the daily feed and weekly brief, add the client workspace with Professional, or buy select
              compliance tools standalone. 4 generations included for select tools.
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
              <span className="font-display text-4xl font-bold text-brand-navy">{intelligence.monthly.display}</span>
              <span className="text-muted-foreground">/{intelligence.monthly.label}</span>
              <p className="text-meta text-muted-foreground mt-1">
                or {intelligence.annual.display}/{intelligence.annual.label} — {intelligence.annual.savingDisplay}
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Daily privacy intelligence feed
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Weekly Intelligence Brief
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> RoPA + Notice Builders included
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> 1 free Smart Tool run / year
                (annual)
              </li>
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
              <span className="font-display text-4xl font-bold text-brand-navy">{professional.monthly.display}</span>
              <span className="text-muted-foreground">/{professional.monthly.label}</span>
              <p className="text-meta text-muted-foreground mt-1">
                or {professional.annual.display}/{professional.annual.label} — {professional.annual.savingDisplay}
              </p>
              <p className="text-meta text-muted-foreground">
                + {professional.perClient.display}/{professional.perClient.label} per additional client
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Everything in Intelligence
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Client / matter workspace (annual)
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> 3 free Smart Tool runs / year
                (annual)
              </li>
              <li className="flex gap-2">
                <Check {...iconProps} className="text-brand-teal mt-0.5 shrink-0" /> Free IR Playbook, DPA, Biometric
              </li>
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
              <span className="font-display text-4xl font-bold text-brand-navy">{PRICING.tools.biometric.display}</span>
              <span className="text-muted-foreground"> – {PRICING.tools.cppa_suite.display}</span>
              <p className="text-meta text-muted-foreground mt-1">
                Every tool available standalone. No subscription required.
              </p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex justify-between">
                <span>Biometric Check</span>
                <span className="tabular-nums">{PRICING.tools.biometric.display}</span>
              </li>
              <li className="flex justify-between">
                <span>IR Playbook</span>
                <span className="tabular-nums">{PRICING.tools.ir_playbook.display}</span>
              </li>
              <li className="flex justify-between">
                <span>DPA Generator</span>
                <span className="tabular-nums">{PRICING.tools.dpa.display}</span>
              </li>
              <li className="flex justify-between">
                <span>LIA / DPIA</span>
                <span className="tabular-nums">{PRICING.tools.lia.display}</span>
              </li>
              <li className="flex justify-between">
                <span>Governance</span>
                <span className="tabular-nums">{PRICING.tools.governance.display}</span>
              </li>
              <li className="flex justify-between">
                <span>CPPA Suite</span>
                <span className="tabular-nums">{PRICING.tools.cppa_suite.display}</span>
              </li>
            </ul>
            <Link
              to="/tools"
              className="inline-flex items-center justify-center border border-brand-navy text-brand-navy font-semibold px-5 py-3 rounded-lg no-underline hover:bg-brand-cloud"
            >
              Browse tools →
            </Link>
          </div>
        </section>

        {/* Smart Tools — per-use */}
        <section className="max-w-[1100px] mx-auto px-4 pb-8">
          <h2 className="text-brand-navy mb-2">Smart Tools — per-use</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
            Standalone = full price for non-subscribers or subscribers without an available annual credit. Subscriber =
            per-use price for active subscribers. Annual Credit shows the free-run allowance included with Professional
            Annual (3 credits/yr) and Intelligence Annual (1 credit/yr). +4 Top-Up adds four extra generations to an
            existing report at half the standalone price.
          </p>
          <div className="overflow-x-auto border rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-brand-cloud/40">
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Tool</th>
                  <th className="text-right px-4 py-3 font-semibold text-brand-navy">Standalone</th>
                  <th className="text-right px-4 py-3 font-semibold text-brand-navy">Subscriber</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Annual Credit</th>
                  <th className="text-right px-4 py-3 font-semibold text-brand-navy">+4 Top-Up</th>
                </tr>
              </thead>
              <tbody>
                {SMART_TOOL_ROWS.map((r, i) => (
                  <tr key={r.tool} className={i % 2 ? "bg-brand-cloud/20" : ""}>
                    <td className="px-4 py-3 text-brand-navy">{r.tool}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-navy">{price(r.standaloneKey)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-navy">{price(r.subscriberKey)}</td>
                    <td className="px-4 py-3 text-brand-navy">{r.annualCredit}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-navy">
                      {r.topupKey ? price(r.topupKey) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Included / Layer-1 */}
        <section className="max-w-[1100px] mx-auto px-4 pb-16">
          <h2 className="text-brand-navy mb-2">Included / Layer-1 tools</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
            Free with any active subscription (monthly or annual). Standalone prices shown where the tool is also sold à
            la carte.
          </p>
          <div className="overflow-x-auto border rounded-2xl bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-brand-cloud/40">
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Tool</th>
                  <th className="text-right px-4 py-3 font-semibold text-brand-navy">Standalone</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-navy">Subscriber Access</th>
                </tr>
              </thead>
              <tbody>
                {INCLUDED_ROWS.map((r, i) => (
                  <tr key={r.tool} className={i % 2 ? "bg-brand-cloud/20" : ""}>
                    <td className="px-4 py-3 text-brand-navy">{r.tool}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-navy">{r.standalone}</td>
                    <td className="px-4 py-3 text-brand-navy">{r.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-meta text-muted-foreground mt-4">
            Prices shown are current retail rates from the pricing registry. This document is not legal advice and must
            be reviewed by qualified legal counsel before any operational use or reliance.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
