// CPPA Scope Checker — free deterministic tool, no AI, no payment.
// Determines whether CCPA/CPRA + CPPA enforcement obligations apply.
//
// Legal-logic correction pass (2026-07-19):
//   • Q2 revenue: CPI-adjusted threshold $26,625,000 per Cal. Civ. Code
//     § 1798.140(d)(1)(A) (formerly (ag)(1)(A)) — CPPA CPI adjustment table,
//     effective 2025-01-01. https://cppa.ca.gov/regulations/cpi_adjustment.html
//   • Q_processing_250k / Q_processing_spi_50k added to evaluate 11 CCR § 7120(b)
//     cybersecurity-audit scope separately from the business prong.
//   • Cyber deadlines per 11 CCR § 7121 (final text): >$100M → 2028-04-01,
//     $50M–$100M → 2029-04-01, <$50M → 2030-04-01.
//   • Risk assessment applicability evaluated deterministically over § 7150
//     triggers (sale/share, sensitive-PI processing, ADMT for significant
//     decisions) — never coerced from bare business status.
//   • Data-broker Q split into (a) meets-definition (Cal. Civ. Code
//     § 1798.99.80(d), Delete Act) and (b) CPPA registration status. § 22757
//     removed.
//   • Legacy Q2 band "$25M–$100M" now triggers an explicit confirmation
//     step rather than silently satisfying the revenue prong.
//   • Tri-state outcomes surface throughout: Required / Not triggered on your
//     answers / Review with counsel (insufficient facts). "Unsure" is never
//     converted into "Required" or "Not required."


import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_REGISTRY } from "@/config/pricing";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import { useEnforcementSignals } from "@/hooks/useEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import StatuteRail, { type RailEntry } from "@/components/intake/StatuteRail";
import { CPPA_SCOPE_RAIL } from "@/components/cppa/CPPAScopeRailEntries";
import { useToolStartedOnInteraction, fireEmailCaptured } from "@/lib/analyticsEvents";
import { useConversionEvent } from "@/hooks/useConversionEvent";

// CPI-adjusted revenue threshold, § 1798.140(d)(1)(A). Effective 2025-01-01.
export const CCPA_REVENUE_THRESHOLD_USD = 26_625_000;

// Live Q2 bands isolate the $26.625M line and the $50M cyber-deadline line.
export const Q2_OPTS = [
  "Under $26.625 million",
  "$26.625M–$50M",
  "$50M–$100M",
  "$100M–$500M",
  "Over $500M",
  "Unsure",
] as const;

// Legacy Q2 values kept in the type for backwards-compatible saved sessions.
// "$25M–$100M" straddles the CPI-adjusted threshold and is handled with an
// explicit confirmation UI — NEVER silently reclassified.
type Q2Live = (typeof Q2_OPTS)[number];
type Q2Legacy = "Under $25 million" | "$25M–$100M";
type Q2 = "" | Q2Live | Q2Legacy;

type Q1 = "" | "Yes" | "No" | "Unsure";
// Q3 accepts new bands and the legacy straddling band ("100,000–1 million").
type Q3 =
  | ""
  | "Fewer than 100,000"
  | "100,000–249,999"
  | "250,000–1 million"
  | "100,000–1 million"
  | "Over 1 million"
  | "Unsure";
type Q4 =
  | ""
  | "Yes — we sell PI"
  | "Yes — we share for targeted/behavioural advertising"
  | "Both"
  | "No"
  | "Unsure";
type Q5 = "" | "Yes" | "No" | "Unsure";
type Q6 = "" | "Yes" | "No" | "Unsure";
type Q7 = "" | "Yes" | "No" | "In evaluation" | "Unsure";
type YNU = "" | "Yes" | "No" | "Unsure";
type Q8a = YNU;
type Q8b = "" | "Yes" | "No" | "N/A — not a data broker";
type LegacyConfirm = "" | "AboveThreshold" | "BelowThreshold" | "Unsure";

const Radio = ({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    {options.map((o) => (
      <label key={o} className="flex items-start gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          value={o}
          checked={value === o}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
        <span className="text-sm">{o}</span>
      </label>
    ))}
  </div>
);

// ── Deterministic evaluators (pure; unit-testable) ──────────────────────────
type TriState = "required" | "not_triggered_on_answers" | "needs_counsel_review";

export function evaluateRevenueProng(q2: Q2, legacyConfirm: LegacyConfirm): {
  met: boolean;
  unsure: boolean;
  needsConfirmation: boolean;
} {
  // Legacy: "$25M–$100M" straddles $26.625M. Do not decide without confirmation.
  if (q2 === "$25M–$100M") {
    if (legacyConfirm === "AboveThreshold") return { met: true, unsure: false, needsConfirmation: false };
    if (legacyConfirm === "BelowThreshold") return { met: false, unsure: false, needsConfirmation: false };
    if (legacyConfirm === "Unsure") return { met: false, unsure: true, needsConfirmation: false };
    return { met: false, unsure: false, needsConfirmation: true };
  }
  if (q2 === "Unsure") return { met: false, unsure: true, needsConfirmation: false };
  if (q2 === "Under $26.625 million" || q2 === "Under $25 million" || q2 === "") {
    return { met: false, unsure: q2 === "", needsConfirmation: false };
  }
  // All remaining live bands are ≥ $26.625M.
  return { met: true, unsure: false, needsConfirmation: false };
}

export function evaluateSection7150Triggers(args: {
  q4: Q4;
  q6: Q6;
  q7: Q7;
}): { result: TriState; triggeringFacts: { fact: string; pinpoint: string }[] } {
  const positives: { fact: string; pinpoint: string }[] = [];
  if (["Yes — we sell PI", "Yes — we share for targeted/behavioural advertising", "Both"].includes(args.q4)) {
    positives.push({ fact: "Selling or sharing personal information", pinpoint: "11 CCR § 7150(b)(1)" });
  }
  if (args.q6 === "Yes") {
    positives.push({ fact: "Processing sensitive personal information", pinpoint: "11 CCR § 7150(b)(2)" });
  }
  if (args.q7 === "Yes" || args.q7 === "In evaluation") {
    positives.push({ fact: "Using ADMT for a significant decision concerning a consumer", pinpoint: "11 CCR § 7150(b)(3)" });
  }
  if (positives.length > 0) return { result: "required", triggeringFacts: positives };
  const anyUnsure = args.q4 === "Unsure" || args.q6 === "Unsure" || args.q7 === "Unsure";
  return { result: anyUnsure ? "needs_counsel_review" : "not_triggered_on_answers", triggeringFacts: [] };
}

export function evaluateSection7120Scope(args: {
  q1: Q1;
  revenueMet: boolean;
  revenueUnsure: boolean;
  q3: Q3; // 100k+ consumers prong
  q5: Q5; // 50%+ revenue from sale/share
  q9_250k: YNU; // ≥250,000 consumers/households PI processed
  q10_spi_50k: YNU; // ≥50,000 consumers' SPI processed
}): { scope: TriState; triggeringFacts: { fact: string; pinpoint: string }[] } {
  const consumerProngMet = ["100,000–249,999", "250,000–1 million", "100,000–1 million", "Over 1 million"].includes(args.q3);
  const consumerProngUnsure = args.q3 === "Unsure";
  const saleShareMet = args.q5 === "Yes";
  const saleShareUnsure = args.q5 === "Unsure";
  // A "business" for § 7120 purposes exists if ANY of the three CCPA prongs is met.
  const isBusiness =
    (args.q1 === "Yes" || args.q1 === "Unsure") &&
    (args.revenueMet || consumerProngMet || saleShareMet);
  const isBusinessUnsure =
    (args.q1 === "Unsure") ||
    (!isBusiness &&
      (args.revenueUnsure || consumerProngUnsure || saleShareUnsure));

  const facts: { fact: string; pinpoint: string }[] = [];
  // § 7120(b) processing triggers (task body values).
  if (args.q9_250k === "Yes") {
    facts.push({
      fact: "Processed the personal information of ≥250,000 California consumers or households in the preceding calendar year",
      pinpoint: "11 CCR § 7120(b)(1)",
    });
  }
  if (args.q10_spi_50k === "Yes") {
    facts.push({
      fact: "Processed the sensitive personal information of ≥50,000 California consumers in the preceding calendar year",
      pinpoint: "11 CCR § 7120(b)(2)",
    });
  }
  if (saleShareMet) {
    facts.push({
      fact: "Derives ≥50% of annual revenue from selling or sharing personal information",
      pinpoint: "11 CCR § 7120(b) (sale/share-revenue prong)",
    });
  }

  if (facts.length > 0 && isBusiness) return { scope: "required", triggeringFacts: facts };
  const processingUnsure = args.q9_250k === "Unsure" || args.q10_spi_50k === "Unsure";
  if (isBusinessUnsure || processingUnsure) return { scope: "needs_counsel_review", triggeringFacts: facts };
  return { scope: "not_triggered_on_answers", triggeringFacts: [] };
}

export function cyberDeadline(q2: Q2, legacyConfirm: LegacyConfirm): {
  label: string;
  needsBandConfirmation: boolean;
} {
  // 11 CCR § 7121 phased deadlines.
  if (q2 === "$100M–$500M" || q2 === "Over $500M") return { label: "April 1, 2028", needsBandConfirmation: false };
  if (q2 === "$50M–$100M") return { label: "April 1, 2029", needsBandConfirmation: false };
  if (q2 === "$26.625M–$50M" || q2 === "Under $26.625 million" || q2 === "Under $25 million") return { label: "April 1, 2030", needsBandConfirmation: false };
  if (q2 === "$25M–$100M") {
    if (legacyConfirm === "AboveThreshold") return { label: "April 1, 2029 or April 1, 2028 (confirm exact band)", needsBandConfirmation: true };
    if (legacyConfirm === "BelowThreshold") return { label: "April 1, 2030", needsBandConfirmation: false };
    return { label: "Confirm exact revenue band to determine deadline", needsBandConfirmation: true };
  }
  return { label: "Confirm revenue band to determine deadline", needsBandConfirmation: true };
}

export default function CPPAScopeChecker() {
  useToolStartedOnInteraction("cppa_scope");

  const navigate = useNavigate();
  const { user } = useAuth();
  const [entityName, setEntityName] = useState("");
  const [q1, setQ1] = useState<Q1>("");
  const [q2, setQ2] = useState<Q2>("");
  const [q2LegacyConfirm, setQ2LegacyConfirm] = useState<LegacyConfirm>("");
  const [q3, setQ3] = useState<Q3>("");
  const [q4, setQ4] = useState<Q4>("");
  const [q5, setQ5] = useState<Q5>("");
  const [q6, setQ6] = useState<Q6>("");
  const [q7, setQ7] = useState<Q7>("");
  const [q9_250k, setQ9] = useState<YNU>("");
  const [q10_spi_50k, setQ10] = useState<YNU>("");
  const [q8a, setQ8a] = useState<Q8a>(""); // Meets Delete Act definition
  const [q8b, setQ8b] = useState<Q8b>(""); // Registered with CPPA
  const [scopeRailKey, setScopeRailKey] = useState<string | null>(null);
  const scopeRailEntry: RailEntry | null = scopeRailKey ? (CPPA_SCOPE_RAIL[scopeRailKey] ?? null) : null;
  const focusScopeRail = (k: string) => setScopeRailKey(k);
  const [showResults, setShowResults] = useState(false);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const insertedKeyRef = useRef<string | null>(null);

  // Revenue prong evaluator (used by inScope + § 7120).
  const revenue = useMemo(() => evaluateRevenueProng(q2, q2LegacyConfirm), [q2, q2LegacyConfirm]);

  // Legacy Q2 must be confirmed before we permit result computation.
  const revenueBlocksResults = revenue.needsConfirmation;

  const allAnswered = Boolean(
    entityName.trim() &&
      q1 &&
      q2 &&
      q3 &&
      q4 &&
      q5 &&
      q6 &&
      q7 &&
      q9_250k &&
      q10_spi_50k &&
      q8a &&
      q8b &&
      !revenueBlocksResults,
  );

  const answers = useMemo(
    () => ({
      entity_name: entityName.trim(),
      q1,
      q2,
      q2_legacy_confirm: q2LegacyConfirm,
      q3,
      q4,
      q5,
      q6,
      q7,
      q9_250k,
      q10_spi_50k,
      q8a_meets_definition: q8a,
      q8b_registered_cppa: q8b,
    }),
    [entityName, q1, q2, q2LegacyConfirm, q3, q4, q5, q6, q7, q9_250k, q10_spi_50k, q8a, q8b],
  );

  const evaluation = useMemo(() => {
    const consumerProngMet = ["100,000–249,999", "250,000–1 million", "100,000–1 million", "Over 1 million"].includes(q3);
    const consumerProngUnsure = q3 === "Unsure";
    const saleShareMet = q5 === "Yes";
    const saleShareUnsure = q5 === "Unsure";

    const inScopeConfident =
      (q1 === "Yes") && (revenue.met || consumerProngMet || saleShareMet);
    const inScopeUnsure =
      q1 === "Unsure" ||
      (!inScopeConfident && (revenue.unsure || consumerProngUnsure || saleShareUnsure));

    const cyber = evaluateSection7120Scope({
      q1,
      revenueMet: revenue.met,
      revenueUnsure: revenue.unsure,
      q3,
      q5,
      q9_250k,
      q10_spi_50k,
    });
    const ra = evaluateSection7150Triggers({ q4, q6, q7 });
    const deadline = cyberDeadline(q2, q2LegacyConfirm);

    // Sensitive PI: independent operational duty (Right to Limit) — not gated
    // by significant-risk analysis. Kept as tri-state on q6 alone.
    let sensitiveResult: TriState;
    if (q6 === "Yes") sensitiveResult = "required";
    else if (q6 === "Unsure") sensitiveResult = "needs_counsel_review";
    else sensitiveResult = "not_triggered_on_answers";

    // ADMT disclosure/opt-out is triggered by significant-decision use (q7).
    let admtResult: TriState;
    if (q7 === "Yes" || q7 === "In evaluation") admtResult = "required";
    else if (q7 === "Unsure") admtResult = "needs_counsel_review";
    else admtResult = "not_triggered_on_answers";

    // Data broker: separate meets-definition from registration.
    let brokerObligation: TriState;
    if (q8a === "Yes") brokerObligation = "required";
    else if (q8a === "Unsure") brokerObligation = "needs_counsel_review";
    else brokerObligation = "not_triggered_on_answers";

    return {
      inScopeConfident,
      inScopeUnsure,
      inScope: inScopeConfident || inScopeUnsure, // for coarse gating (legacy field)
      cyberScope: cyber.scope,
      cyberFacts: cyber.triggeringFacts,
      cyberDeadline: deadline,
      riskAssessment: ra.result,
      riskAssessmentFacts: ra.triggeringFacts,
      sensitiveResult,
      admtResult,
      brokerObligation,
      brokerRegistered: q8b,
    };
  }, [q1, q2, q2LegacyConfirm, q3, q4, q5, q6, q7, q8a, q8b, q9_250k, q10_spi_50k, revenue]);

  const liveFootprint = useMemo(() => {
    const items: { citation: string; label: string; triggered: boolean }[] = [
      {
        citation: "Cal. Civ. Code §§ 1798.100–1798.135",
        label: "CCPA/CPRA consumer rights obligations apply",
        triggered: evaluation.inScopeConfident,
      },
      {
        citation: "11 CCR § 7150(b)(1)",
        label: "Risk assessment triggered — sale or share of PI",
        triggered: ["Yes — we sell PI", "Yes — we share for targeted/behavioural advertising", "Both"].includes(q4),
      },
      {
        citation: "11 CCR § 7150(b)(2)",
        label: "Risk assessment triggered — sensitive PI processing",
        triggered: q6 === "Yes",
      },
      {
        citation: "11 CCR § 7150(b)(3)",
        label: "Risk assessment triggered — ADMT for a significant decision",
        triggered: q7 === "Yes" || q7 === "In evaluation",
      },
      {
        citation: "11 CCR § 7120(b)",
        label: "Cybersecurity audit scope triggered by your answers",
        triggered: evaluation.cyberScope === "required",
      },
    ];
    return items.filter((i) => i.triggered);
  }, [evaluation.inScopeConfident, evaluation.cyberScope, q4, q6, q7]);

  const scopeEnforcementSignals = useEnforcementSignals(["sell_share", "sensitive_pi"]);

  const handleCheck = () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!showResults) return;
    const key = JSON.stringify(answers);
    if (insertedKeyRef.current === key) return;
    insertedKeyRef.current = key;
    (async () => {
      try {
        await supabase.from("cppa_scope_checks" as any).insert({
          user_id: user?.id ?? null,
          session_id: sessionIdRef.current,
          answers,
          obligation_map: evaluation,
          in_scope: evaluation.inScopeConfident,
        });
      } catch {
        /* silent — persistence must not block UX */
      }
    })();
  }, [showResults, answers, evaluation, user?.id]);

  const reset = () => {
    setEntityName("");
    setQ1(""); setQ2(""); setQ2LegacyConfirm(""); setQ3(""); setQ4("");
    setQ5(""); setQ6(""); setQ7(""); setQ9(""); setQ10(""); setQ8a(""); setQ8b("");
    setShowResults(false);
    insertedKeyRef.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Scope Checker (CCPA/CPRA) | End User Privacy</title>
        <meta
          name="description"
          content="Free 2-minute CCPA/CPRA scope check. Determine whether the California Consumer Privacy Act and CPPA enforcement obligations apply to your business. No account, no payment."
        />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-scope-checker" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "CPPA Scope Checker",
          description: "Free deterministic check for CCPA/CPRA applicability and CPPA enforcement scope.",
          brand: { "@type": "Brand", name: "End User Privacy" },
          url: "https://enduserprivacy.com/cppa-scope-checker",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        })}</script>
      </Helmet>
      <header className="bg-brand-ocean text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🛡️ CPPA Scope Checker · Free · No account required
          </span>
          <h1 className="text-hero-h1 text-white mb-3">CPPA Scope Checker</h1>
          <RequirementBadge variant="hero" tier="free" text="Free. Find out which CPPA obligations — risk assessment, cybersecurity audit, ADMT — apply to your business, and by when." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg">
            Find out whether the California Consumer Privacy Act (CCPA/CPRA) and CPPA
            enforcement obligations apply to your business. Takes 2 minutes.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            The CPPA Audits Division stood up in February 2026. Enforcement is active.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ToolDisclaimer addition="This checker provides an indicative obligation map based on your answers. Applicability thresholds under the CCPA/CPRA are fact-specific; confirm scope conclusions with qualified counsel." />
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
        {!showResults && (
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <p className="text-xs font-mono text-muted-foreground pb-2 border-b">Cal. Civ. Code § 1798.140(d)(1) — applicability thresholds · 11 CCR §§ 7120, 7150 — audit and risk-assessment triggers</p>
            <div>
              <Label>Entity name <span className="text-xs text-muted-foreground">(legal business name; printed on the obligation map)</span></Label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g., Acme Retail, Inc."
                className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                autoComplete="organization"
              />
            </div>
            <div onFocus={() => focusScopeRail("q1_california_nexus")}>
              <Label>Q1: Does your business operate for profit and do business in California, OR collect personal information from California residents? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(d))</span></Label>
              <div className="mt-2">
                <Radio name="q1" options={["Yes", "No", "Unsure"]} value={q1} onChange={(v) => setQ1(v as Q1)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q2_revenue")}>
              <Label>Q2: What was your business's <strong>prior-calendar-year</strong> annual gross revenue (worldwide)? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(d)(1)(A) — CPI-adjusted threshold $26,625,000, effective 2025-01-01)</span></Label>
              <div className="mt-2">
                <Radio
                  name="q2"
                  options={Q2_OPTS}
                  value={q2 === "$25M–$100M" || q2 === "Under $25 million" ? "" : q2}
                  onChange={(v) => { setQ2(v as Q2); setQ2LegacyConfirm(""); }}
                />
                {(q2 === "$25M–$100M" || q2 === "Under $25 million") && (
                  <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Legacy answer detected — please confirm against the CPI-adjusted $26,625,000 threshold
                    </p>
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      The threshold was raised from $25,000,000 to $26,625,000 (CPI adjustment, effective 2025-01-01, per Cal. Civ. Code § 1798.140(d)(1)(A)). Your saved answer spans the new line. Was prior-calendar-year gross revenue at or above $26,625,000?
                    </p>
                    <Radio
                      name="q2_legacy_confirm"
                      options={[
                        "AboveThreshold",
                        "BelowThreshold",
                        "Unsure",
                      ]}
                      value={q2LegacyConfirm}
                      onChange={(v) => setQ2LegacyConfirm(v as LegacyConfirm)}
                    />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Or clear and re-answer Q2 with a current band above.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q3_consumer_volume")}>
              <Label>Q3: How many California consumers' or households' personal information does your business buy, sell, share, or receive for commercial purposes annually? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(d)(1)(B))</span></Label>
              <div className="mt-2">
                <Radio
                  name="q3"
                  options={["Fewer than 100,000", "100,000–249,999", "250,000–1 million", "Over 1 million", "Unsure"]}
                  value={q3}
                  onChange={(v) => setQ3(v as Q3)}
                />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q4_sell_share")}>
              <Label>Q4: Does your business sell or share consumers' personal information (in any quantity)? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.120; 11 CCR § 7150(b)(1))</span></Label>
              <span className="inline-block ml-1 align-middle"><EnforcementSignalIcon signalKey="sell_share" signals={scopeEnforcementSignals} /></span>
              <div className="mt-2">
                <Radio
                  name="q4"
                  options={[
                    "Yes — we sell PI",
                    "Yes — we share for targeted/behavioural advertising",
                    "Both",
                    "No",
                    "Unsure",
                  ]}
                  value={q4}
                  onChange={(v) => setQ4(v as Q4)}
                />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q5_50pct_revenue")}>
              <Label>Q5: Does 50% or more of your annual revenue come from selling or sharing consumers' personal information? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(d)(1)(C))</span></Label>
              <div className="mt-2">
                <Radio name="q5" options={["Yes", "No", "Unsure"]} value={q5} onChange={(v) => setQ5(v as Q5)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q6_sensitive_pi")}>
              <Label>Q6: Does your business process any sensitive personal information? (health data, precise geolocation, racial/ethnic origin, religious beliefs, union membership, biometric data, genetic data, sexual orientation, or citizenship/immigration status) <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ae); 11 CCR § 7150(b)(2))</span></Label>
              <span className="inline-block ml-1 align-middle"><EnforcementSignalIcon signalKey="sensitive_pi" signals={scopeEnforcementSignals} /></span>
              <div className="mt-2">
                <Radio name="q6" options={["Yes", "No", "Unsure"]} value={q6} onChange={(v) => setQ6(v as Q6)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q7_admt")}>
              <Label>Q7: Does your business use automated decision-making technology (ADMT) to make, or factor into, a <strong>significant decision</strong> about a California consumer — such as employment, credit, housing, insurance, healthcare, education, or access to essential goods/services? <span className="text-xs text-muted-foreground font-mono">(11 CCR §§ 7001(e), 7150(b)(3))</span></Label>
              <div className="mt-2">
                <Radio name="q7" options={["Yes", "No", "In evaluation", "Unsure"]} value={q7} onChange={(v) => setQ7(v as Q7)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q9_processing_250k")}>
              <Label>Q9: In the preceding calendar year, did your business process the personal information of <strong>250,000 or more</strong> California consumers or households? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7120(b)(1))</span></Label>
              <div className="mt-2">
                <Radio name="q9" options={["Yes", "No", "Unsure"]} value={q9_250k} onChange={(v) => setQ9(v as YNU)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q10_processing_spi_50k")}>
              <Label>Q10: In the preceding calendar year, did your business process the <strong>sensitive personal information</strong> of <strong>50,000 or more</strong> California consumers? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7120(b)(2))</span></Label>
              <div className="mt-2">
                <Radio name="q10" options={["Yes", "No", "Unsure"]} value={q10_spi_50k} onChange={(v) => setQ10(v as YNU)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q8a_data_broker_definition")}>
              <Label>Q8a: Does your business meet the <strong>data-broker definition</strong> — knowingly collect and sell to third parties the personal information of California consumers with whom it does not have a direct relationship? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.99.80(d) — Delete Act)</span></Label>
              <div className="mt-2">
                <Radio name="q8a" options={["Yes", "No", "Unsure"]} value={q8a} onChange={(v) => setQ8a(v as Q8a)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q8b_data_broker_registered")}>
              <Label>Q8b: Is your business currently <strong>registered as a data broker with the California Privacy Protection Agency</strong>? <span className="text-xs text-muted-foreground font-mono">(Delete Act — CPPA registry, Cal. Civ. Code §§ 1798.99.80–1798.99.89; registry at <a className="underline" href="https://cppa.ca.gov/data_brokers/" target="_blank" rel="noopener noreferrer">cppa.ca.gov/data_brokers</a>)</span></Label>
              <div className="mt-2">
                <Radio name="q8b" options={["Yes", "No", "N/A — not a data broker"]} value={q8b} onChange={(v) => setQ8b(v as Q8b)} />
              </div>
            </div>

            {liveFootprint.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                  ⚡ Obligations triggered by your answers so far
                </p>
                {liveFootprint.map((item) => (
                  <div key={item.citation} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                    <div className="text-xs">
                      <span className="font-mono text-blue-700 dark:text-blue-400 font-medium">{item.citation}</span>
                      <span className="text-foreground ml-2">{item.label}</span>
                    </div>
                  </div>
                ))}
                <p className="text-body-tiny text-muted-foreground pt-1">Complete all questions and click Check my scope for the full obligation map.</p>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleCheck} disabled={!allAnswered}>
                Check my scope →
              </Button>
            </div>
          </div>
        )}

        {showResults && (
          <ResultsPanel
            evaluation={evaluation}
            q1={q1}
            q2={q2}
            q3={q3}
            q5={q5}
            revenueMet={revenue.met}
            onReset={reset}
            navigate={navigate}
            isAuthed={!!user}
          />
        )}
        </div>
        <StatuteRail entry={scopeRailEntry} defaultSourceUrl="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf" />
        </div>
      </main>
      <CPPAToolsCrossLinks current="scope" />
    <Footer />
    </div>
  );
}

function SavedNote({ isAuthed }: { isAuthed: boolean }) {
  if (isAuthed) {
    return (
      <p className="text-xs text-muted-foreground italic pt-3 border-t">
        Saved to your account. Find it any time in{" "}
        <Link to="/dashboard/reports" className="underline hover:text-foreground">My Reports</Link>.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground italic pt-3 border-t">
      <Link to="/signup" className="underline hover:text-foreground">Create a free account</Link>{" "}
      to keep this result and see it in My Reports.
    </p>
  );
}

function CreateAccountPrompt() {
  const redirect = encodeURIComponent("/cppa-scope-checker");
  const fireConversion = useConversionEvent();
  return (
    <section className="bg-card border rounded-lg p-4">
      <p className="text-sm font-medium">Save this obligation map to your account</p>
      <p className="text-xs text-muted-foreground mt-1">
        Create a free End User Privacy account to keep this result, access it from My Reports, and run additional CPPA tools.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <Link
          to={`/signup?redirect=${redirect}`}
          onClick={() =>
            fireConversion("signup_initiated", {
              referrer_path: "/cppa-scope-checker",
              utm_source: "",
              utm_campaign: "",
              variant: "page-load",
            })
          }
          className="inline-flex items-center justify-center bg-teal-action hover:bg-teal-action-hover text-white font-semibold text-sm px-4 py-2 rounded-md no-underline"
        >
          Create free account
        </Link>
        <Link
          to={`/login?redirect=${redirect}`}
          className="inline-flex items-center justify-center border border-border text-sm font-semibold px-4 py-2 rounded-md no-underline hover:bg-muted"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

type Evaluation = {
  inScopeConfident: boolean;
  inScopeUnsure: boolean;
  inScope: boolean;
  cyberScope: TriState;
  cyberFacts: { fact: string; pinpoint: string }[];
  cyberDeadline: { label: string; needsBandConfirmation: boolean };
  riskAssessment: TriState;
  riskAssessmentFacts: { fact: string; pinpoint: string }[];
  sensitiveResult: TriState;
  admtResult: TriState;
  brokerObligation: TriState;
  brokerRegistered: Q8b;
};

const STATUS_LABEL: Record<TriState, string> = {
  required: "Required",
  not_triggered_on_answers: "Not triggered on your answers",
  needs_counsel_review: "Review with counsel — insufficient facts",
};

function statusPill(status: TriState) {
  const cls =
    status === "required"
      ? "bg-red-100 text-red-800"
      : status === "needs_counsel_review"
      ? "bg-amber-100 text-amber-800"
      : "bg-muted text-muted-foreground";
  return <span className={`text-xs font-medium px-2 py-1 rounded ${cls}`}>{STATUS_LABEL[status]}</span>;
}

function ResultsPanel({
  evaluation,
  q1,
  q2,
  q3,
  q5,
  revenueMet,
  onReset,
  navigate,
  isAuthed,
}: {
  evaluation: Evaluation;
  q1: string;
  q2: string;
  q3: string;
  q5: string;
  revenueMet: boolean;
  onReset: () => void;
  navigate: (to: string) => void;
  isAuthed: boolean;
}) {
  // Out of scope, no Unsure: confidently out of scope
  if (!evaluation.inScope) {
    const isGeoOut = q1 === "No";
    return (
      <div className="bg-card border rounded-lg p-8 space-y-4">
        <h2 className="">
          Based on your answers, CCPA/CPRA likely does not apply to you.
        </h2>
        {isGeoOut ? (
          <p className="text-foreground">
            The CCPA/CPRA applies to businesses that do business in California or collect
            personal information from California residents. Based on your answers, your
            business does not appear to fall within California's jurisdiction. This may
            change if you begin operating in California or serving California customers.
          </p>
        ) : (
          <>
            <p className="text-foreground">
              Your business does not appear to meet any of the three CCPA/CPRA applicability
              thresholds under Cal. Civ. Code § 1798.140(d)(1): $26,625,000+ annual gross
              revenue (CPI-adjusted, effective 2025-01-01), 100,000+ California consumers or
              households, or 50%+ revenue from selling or sharing personal information.
            </p>
            <p className="text-sm text-muted-foreground">
              This may change if your revenue or data volume grows, or if California re-adjusts
              the CPI threshold in a future odd-numbered year.
            </p>
          </>
        )}
        <SavedNote isAuthed={isAuthed} />
        <p className="text-xs text-muted-foreground italic pt-1">
          This is a preliminary scope indicator based on your self-reported answers.
          It is not legal advice.
        </p>
        <Button variant="outline" onClick={onReset}>
          Start over
        </Button>
      </div>
    );
  }

  const consumerMet = ["100,000–249,999", "250,000–1 million", "100,000–1 million", "Over 1 million"].includes(q3);
  const salesMet = q5 === "Yes";
  const thresholdSentences: string[] = [];
  if (revenueMet) thresholdSentences.push(`meets the annual revenue threshold ($26,625,000, § 1798.140(d)(1)(A))`);
  if (consumerMet) thresholdSentences.push(`meets the consumer volume threshold (${q3} California consumers/households, § 1798.140(d)(1)(B))`);
  if (salesMet) thresholdSentences.push(`meets the 50%+ revenue from data sales threshold (§ 1798.140(d)(1)(C))`);
  const thresholdSummary =
    thresholdSentences.length > 0
      ? `Your business ${thresholdSentences.join("; and ")}.`
      : evaluation.inScopeUnsure
      ? "One or more applicability facts were marked 'Unsure' — treat CCPA/CPRA scope as review-required until confirmed."
      : null;

  const CyberRow = () => (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold">Cybersecurity Audit (11 CCR §§ 7120–7123)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deadline: {evaluation.cyberScope === "required" ? evaluation.cyberDeadline.label : "n/a until scope confirmed"}
          </p>
        </div>
        {statusPill(evaluation.cyberScope)}
      </div>
      {evaluation.cyberFacts.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {evaluation.cyberFacts.map((f) => (
            <li key={f.pinpoint}>
              <span className="font-mono text-muted-foreground">{f.pinpoint}</span>
              <span className="text-foreground ml-2">{f.fact}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-foreground mt-2">
        A business must complete an annual cybersecurity audit under 11 CCR § 7120(b) if it processes PI presenting significant risk — met by (i) processing PI of ≥250,000 consumers/households, (ii) processing sensitive PI of ≥50,000 consumers, or (iii) deriving ≥50% of revenue from selling/sharing PI. Deadlines under 11 CCR § 7121 are phased by prior-year gross revenue: &gt;$100M → April 1, 2028; $50M–$100M → April 1, 2029; &lt;$50M → April 1, 2030.
      </p>
      {evaluation.cyberScope === "required" && (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link to="/cppa-cybersecurity">CPPA Cybersecurity Readiness tool →</Link>
          </Button>
        </div>
      )}
    </div>
  );

  const RaRow = () => (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold">Privacy Risk Assessment (11 CCR § 7150)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deadline: December 31, 2027 (existing processing activities)
          </p>
        </div>
        {statusPill(evaluation.riskAssessment)}
      </div>
      {evaluation.riskAssessmentFacts.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {evaluation.riskAssessmentFacts.map((f) => (
            <li key={f.pinpoint}>
              <span className="font-mono text-muted-foreground">{f.pinpoint}</span>
              <span className="text-foreground ml-2">{f.fact}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-foreground mt-2">
        Risk-assessment duty attaches only where processing presents significant risk under 11 CCR § 7150(b) — sale/share of PI, sensitive-PI processing, or ADMT for a significant decision. Business-covered status alone does not trigger it.
      </p>
      {evaluation.riskAssessment === "required" && (
        <div className="mt-3">
          <Button asChild size="sm" variant="outline">
            <Link to="/cppa-risk-assessment">CPPA Risk Assessment tool →</Link>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="border-l-4 border-emerald-500 bg-card border rounded-lg p-6">
        <h2 className="">
          {evaluation.inScopeConfident
            ? "CCPA/CPRA applies to your business."
            : "CCPA/CPRA likely applies — one or more answers were marked 'Unsure'."}
        </h2>
        {thresholdSummary && (
          <p className="text-sm text-foreground mt-2">{thresholdSummary}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          The CPPA Audits Division formally stood up in February 2026 and is actively
          scheduling compliance audits.
        </p>
      </section>

      <section className="space-y-3">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">CCPA/CPRA Full Compliance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Deadline: In force now</p>
            </div>
            {statusPill(evaluation.inScopeConfident ? "required" : "needs_counsel_review")}
          </div>
          <p className="text-sm text-foreground mt-2">Consumer rights, privacy notices, opt-out mechanisms, data subject request handling.</p>
        </div>

        <RaRow />
        <CyberRow />

        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">ADMT Disclosure &amp; Opt-Out (11 CCR § 7001(e), § 7150(b)(3))</p>
              <p className="text-xs text-muted-foreground mt-0.5">Deadline: January 1, 2027</p>
            </div>
            {statusPill(evaluation.admtResult)}
          </div>
          <p className="text-sm text-foreground mt-2">Businesses using ADMT for a significant decision about a consumer must provide pre-use notice and an opt-out right.</p>
          {evaluation.admtResult === "required" && (
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link to="/cppa-admt-checker">ADMT Compliance Assessment tool →</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">Sensitive Personal Information — Right to Limit</p>
              <p className="text-xs text-muted-foreground mt-0.5">Deadline: In force now</p>
            </div>
            {statusPill(evaluation.sensitiveResult)}
          </div>
          <p className="text-sm text-foreground mt-2">Consumers have the right to limit the use of sensitive PI. You must honor this right and provide the required disclosure.</p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">Data-Broker Registration (Delete Act)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Deadline: In force now — annual renewal with the CPPA</p>
            </div>
            {statusPill(evaluation.brokerObligation)}
          </div>
          <p className="text-sm text-foreground mt-2">
            Businesses that meet the data-broker definition (Cal. Civ. Code § 1798.99.80(d)) must register annually with the California Privacy Protection Agency under the Delete Act (Cal. Civ. Code §§ 1798.99.80–1798.99.89). Registration is a separate compliance obligation; it does not itself determine general CCPA/CPRA applicability.
          </p>
          {evaluation.brokerObligation === "required" && (
            <p className="text-sm mt-2">
              <strong>CPPA registration status you reported:</strong>{" "}
              {evaluation.brokerRegistered === "Yes" && "Registered."}
              {evaluation.brokerRegistered === "No" && (
                <span className="text-red-700">Not registered — administrative fines apply for each day of unregistered activity. Register at cppa.ca.gov/data_brokers.</span>
              )}
              {evaluation.brokerRegistered === "N/A — not a data broker" && "N/A per your answer."}
            </p>
          )}
        </div>
      </section>

      <section className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-sm rounded">
        {isAuthed ? (
          <>
            <p className="font-medium">Saved to your account.</p>
            <p className="mt-1">
              Find this result any time in{" "}
              <Link to="/dashboard/reports" className="underline">My Reports</Link>.
              For a formal, downloadable assessment use the CPPA Risk Assessment or CPPA Cybersecurity Readiness tools.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">
              <Link to="/signup" className="underline">Create a free account</Link> to keep this result and see it in My Reports.
            </p>
            <p className="mt-1">Run it again any time. For a formal, downloadable assessment use the CPPA Risk Assessment or CPPA Cybersecurity Readiness tools.</p>
          </>
        )}
      </section>

      {!isAuthed && <CreateAccountPrompt />}

      <section className="p-4 border-l-4 border-brand-teal bg-slate-50 dark:bg-slate-900/40 text-sm rounded">
        This is a preliminary scope indicator based on your self-reported answers. It is
        not legal advice. Confirm your obligations with qualified legal counsel.
      </section>

      {evaluation.riskAssessment === "required" && evaluation.cyberScope === "required" && (
        <section className="rounded-lg border-2 border-brand-teal bg-brand-cloud/40 p-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-teal-text font-semibold">
            Recommended: you triggered 2+ modules
          </p>
          <h3 className="font-serif text-2xl text-brand-navy">CPPA Full Audit Suite (M1 + M2)</h3>
          <p className="text-sm text-foreground">
            Covers Risk Assessment (Module 1) and Cybersecurity Readiness (Module 2) together,{" "}
            <span className="font-semibold">
              {PRICING_REGISTRY.cppa_suite_standalone.displayPrice}
            </span>{" "}
            standalone (subscribers {PRICING_REGISTRY.cppa_suite_subscriber.displayPrice}), versus{" "}
            <span className="font-semibold">
              ${
                (PRICING_REGISTRY.cppa_risk_standalone.amountCents +
                  PRICING_REGISTRY.cppa_cyber_standalone.amountCents) / 100
              }
            </span>{" "}
            purchased separately.
          </p>
          <Button onClick={() => navigate("/cppa-risk-assessment?suite=true")}>
            Start CPPA Full Suite →
          </Button>
        </section>
      )}

      <section className="bg-card border rounded-lg p-6 space-y-3">
        <h3 className="">Next steps</h3>
        <div className="flex flex-wrap gap-3">
          {evaluation.riskAssessment === "required" && (
            <Button onClick={() => navigate("/cppa-risk-assessment")}>
              Run CPPA Risk Assessment (Module 1) · {PRICING_REGISTRY.cppa_risk_standalone.displayPrice} →
            </Button>
          )}
          {evaluation.cyberScope === "required" && (
            <Button variant="outline" onClick={() => navigate("/cppa-cybersecurity")}>
              Run CPPA Cybersecurity Readiness (Module 2) · {PRICING_REGISTRY.cppa_cyber_standalone.displayPrice} →
            </Button>
          )}
          {evaluation.admtResult === "required" && (
            <Button variant="outline" onClick={() => navigate("/cppa-admt-checker")}>
              Run ADMT Compliance Assessment (Module 3) · {PRICING_REGISTRY.cppa_admt_standalone.displayPrice} →
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground italic">
          When you complete a risk assessment here, we track your § 7155(a) triennial review date for you — it goes straight into your Obligations Register.
        </p>
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground underline hover:text-foreground bg-transparent border-none cursor-pointer p-0"
        >
          Start over
        </button>
      </section>

      {!isAuthed && <CPPAUpdatesCapture />}
    </div>
  );
}

function CPPAUpdatesCapture() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.toLowerCase().trim();
    if (!clean) return;
    try {
      await (supabase as any)
        .from("email_signups")
        .insert({ email: clean, source: "cppa_scope_updates" });
      fireEmailCaptured("cppa_scope_updates");
    } catch {
      /* silent */
    }
    setSent(true);
  };
  if (sent) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <p className="text-sm font-medium text-brand-navy">Subscribed to CPPA regulatory updates.</p>
        <p className="text-xs text-muted-foreground mt-1">
          You'll receive periodic CPPA rulemaking and enforcement updates. Your obligation-map results were not emailed; create a free account above to save them.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-lg border bg-card p-6 space-y-3">
      <div>
        <p className="text-sm font-semibold text-brand-navy">Track CPPA rulemaking and enforcement</p>
        <p className="text-xs text-muted-foreground mt-1">
          Periodic email updates on CPPA regulations, deadlines, and enforcement actions.
          <span className="block mt-1 italic">We do not email your obligation-map results. To save results, create a free account above.</span>
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
          autoComplete="email"
        />
        <Button type="submit">Subscribe to CPPA updates</Button>
      </form>
    </section>
  );
}
