// CPPA Scope Checker — free deterministic tool, no AI, no payment.
// Determines whether CCPA/CPRA + CPPA enforcement obligations apply.


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
import { toast } from "@/hooks/use-toast";
import { PRICING_REGISTRY } from "@/config/pricing";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import { useEnforcementSignals } from "@/hooks/useEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import StatuteRail, { type RailEntry } from "@/components/intake/StatuteRail";
import { CPPA_SCOPE_RAIL } from "@/components/cppa/CPPAScopeRailEntries";
import { fireToolStarted } from "@/lib/analyticsEvents";

type Q1 = "" | "Yes" | "No" | "Unsure";
type Q2 = "" | "Under $25 million" | "$25M–$100M" | "$100M–$500M" | "Over $500M" | "Unsure";
type Q3 = "" | "Fewer than 100,000" | "100,000–1 million" | "Over 1 million" | "Unsure";
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
type Q8 =
  | ""
  | "Yes"
  | "No — we buy or sell PI without a direct consumer relationship"
  | "No — we don't buy or sell PI";

const Radio = ({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
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

export default function CPPAScopeChecker() {
  useEffect(() => { fireToolStarted("cppa_scope"); }, []);

  const navigate = useNavigate();
  const { user } = useAuth();
  const [entityName, setEntityName] = useState("");
  const [q1, setQ1] = useState<Q1>("");
  const [q2, setQ2] = useState<Q2>("");
  const [q3, setQ3] = useState<Q3>("");
  const [q4, setQ4] = useState<Q4>("");
  const [q5, setQ5] = useState<Q5>("");
  const [q6, setQ6] = useState<Q6>("");
  const [q7, setQ7] = useState<Q7>("");
  const [q8, setQ8] = useState<Q8>("");
  const [scopeRailKey, setScopeRailKey] = useState<string | null>(null);
  const scopeRailEntry: RailEntry | null = scopeRailKey ? (CPPA_SCOPE_RAIL[scopeRailKey] ?? null) : null;
  const focusScopeRail = (k: string) => setScopeRailKey(k);
  const [showResults, setShowResults] = useState(false);
  // One UUID per page load, never persisted to browser storage (per spec).
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const insertedKeyRef = useRef<string | null>(null);

  const allAnswered = entityName.trim() && q1 && q2 && q3 && q4 && q5 && q6 && q7 && q8;

  const answers = useMemo(
    () => ({ entity_name: entityName.trim(), q1, q2, q3, q4, q5, q6, q7, q8 }),
    [entityName, q1, q2, q3, q4, q5, q6, q7, q8],
  );

  const obligationMap = useMemo(() => {
    const inScope =
      (q1 === "Yes" || q1 === "Unsure") &&
      (["$25M–$100M", "$100M–$500M", "Over $500M"].includes(q2) ||
        q2 === "Unsure" ||
        ["100,000–1 million", "Over 1 million"].includes(q3) ||
        q3 === "Unsure" ||
        [
          "Yes — we sell PI",
          "Yes — we share for targeted/behavioural advertising",
          "Both",
        ].includes(q4) ||
        q5 === "Yes");

    const cyberAuditRequired = ["$100M–$500M", "Over $500M"].includes(q2);
    const admtRequired = ["Yes", "In evaluation", "Unsure"].includes(q7);
    const sensitiveRequired = q6 === "Yes" || q6 === "Unsure";
    const dataBrokerRequired =
      q8 === "No — we buy or sell PI without a direct consumer relationship";
    const riskAssessmentRequired = inScope;
    const hasUnsure = [q1, q2, q3, q4, q5, q6, q7].includes("Unsure");

    return {
      inScope,
      cyberAuditRequired,
      admtRequired,
      sensitiveRequired,
      dataBrokerRequired,
      riskAssessmentRequired,
      hasUnsure,
    };
  }, [q1, q2, q3, q4, q5, q6, q7, q8]);

  // Live footprint — lights up as user answers, before submission.
  const liveFootprint = useMemo(() => {
    const items: { citation: string; label: string; triggered: boolean }[] = [
      {
        citation: "Cal. Civ. Code §§ 1798.100–1798.135",
        label: "CCPA/CPRA consumer rights obligations apply",
        triggered: (q1 === "Yes" || q1 === "Unsure") &&
          (["$25M–$100M", "$100M–$500M", "Over $500M", "Unsure"].includes(q2) ||
            ["100,000–1 million", "Over 1 million", "Unsure"].includes(q3)),
      },
      {
        citation: "11 CCR § 7150(b)(1)",
        label: "Risk assessment required — sell/share of PI",
        triggered: ["Yes — we sell PI", "Yes — we share for targeted/behavioural advertising", "Both"].includes(q4),
      },
      {
        citation: "11 CCR § 7152(a)(5)",
        label: "Sensitive PI handling obligations apply",
        triggered: q6 === "Yes" || q6 === "Unsure",
      },
      {
        citation: "11 CCR §§ 7001(e), 7150(b)(3)",
        label: "ADMT disclosure and opt-out required — January 1, 2027",
        triggered: ["Yes", "In evaluation", "Unsure"].includes(q7),
      },
      {
        citation: "11 CCR § 7122(a)",
        label: "Cybersecurity audit required — April 1, 2028",
        triggered: ["$100M–$500M", "Over $500M"].includes(q2),
      },
    ];
    return items.filter((i) => i.triggered);
  }, [q1, q2, q3, q4, q6, q7]);

  const scopeEnforcementSignals = useEnforcementSignals(["sell_share", "sensitive_pi"]);

  const handleCheck = () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Persist each completed check exactly once per result computation.
  // Fire-and-forget — failure must NEVER block results.
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
          obligation_map: obligationMap,
          in_scope: obligationMap.inScope,
        });
      } catch {
        // Silent — persistence must not block UX.
      }
    })();
  }, [showResults, answers, obligationMap, user?.id]);

  const reset = () => {
    setEntityName(""); setQ1(""); setQ2(""); setQ3(""); setQ4("");
    setQ5(""); setQ6(""); setQ7(""); setQ8("");
    setShowResults(false);
    insertedKeyRef.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Scope Checker — CCPA/CPRA | End User Privacy</title>
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
      <header className="bg-[#1a4a6e] text-white py-12">
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
            <p className="text-xs font-mono text-muted-foreground pb-2 border-b">Cal. Civ. Code § 1798.140(ag) — applicability thresholds · 11 CCR §§ 7120, 7150(b) — audit and risk assessment triggers</p>
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
              <Label>Q1: Does your business operate for profit and do business in California, OR collect personal information from California residents? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ag))</span></Label>
              <div className="mt-2">
                <Radio name="q1" options={["Yes", "No", "Unsure"]} value={q1} onChange={(v) => setQ1(v as Q1)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q2_revenue")}>
              <Label>Q2: What is your business's annual gross revenue? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ag)(1))</span></Label>
              <div className="mt-2">
                <Radio
                  name="q2"
                  options={["Under $25 million", "$25M–$100M", "$100M–$500M", "Over $500M", "Unsure"]}
                  value={q2}
                  onChange={(v) => setQ2(v as Q2)}
                />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q3_consumer_volume")}>
              <Label>Q3: How many California consumers' personal information does your business buy, sell, receive for commercial purposes, or share for cross-context behavioural advertising annually? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ag)(2)(A))</span></Label>
              <div className="mt-2">
                <Radio
                  name="q3"
                  options={["Fewer than 100,000", "100,000–1 million", "Over 1 million", "Unsure"]}
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
              <Label>Q5: Does 50% or more of your annual revenue come from selling or sharing consumers' personal information? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ag)(3))</span></Label>
              <div className="mt-2">
                <Radio name="q5" options={["Yes", "No", "Unsure"]} value={q5} onChange={(v) => setQ5(v as Q5)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q6_sensitive_pi")}>
              <Label>Q6: Does your business process any sensitive personal information? (health data, precise geolocation, racial/ethnic origin, religious beliefs, union membership, biometric data, genetic data, sexual orientation, or citizenship/immigration status) <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.140(ae); 11 CCR § 7152(a)(5))</span></Label>
              <span className="inline-block ml-1 align-middle"><EnforcementSignalIcon signalKey="sensitive_pi" signals={scopeEnforcementSignals} /></span>
              <div className="mt-2">
                <Radio name="q6" options={["Yes", "No", "Unsure"]} value={q6} onChange={(v) => setQ6(v as Q6)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q7_admt")}>
              <Label>Q7: Does your business use automated decision-making technology (ADMT) to make, or factor into, decisions that have significant effects on California consumers — such as employment, credit, housing, insurance, or access to services? <span className="text-xs text-muted-foreground font-mono">(11 CCR §§ 7001(e), 7001(ddd), 7150(b)(3))</span></Label>
              <div className="mt-2">
                <Radio name="q7" options={["Yes", "No", "In evaluation", "Unsure"]} value={q7} onChange={(v) => setQ7(v as Q7)} />
              </div>
            </div>

            <div onFocus={() => focusScopeRail("q8_data_broker")}>
              <Label>Q8: Are you registered as a data broker with the California Attorney General? <span className="text-xs text-muted-foreground font-mono">(Cal. Bus. & Prof. Code § 22757)</span></Label>
              <div className="mt-2">
                <Radio
                  name="q8"
                  options={[
                    "Yes",
                    "No — we buy or sell PI without a direct consumer relationship",
                    "No — we don't buy or sell PI",
                  ]}
                  value={q8}
                  onChange={(v) => setQ8(v as Q8)}
                />
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
            obligationMap={obligationMap}
            q1={q1}
            q2={q2}
            q3={q3}
            q5={q5}
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
        Saved to your account — find it any time in{" "}
        <Link to="/my-reports" className="underline hover:text-foreground">My Reports</Link>.
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
  const redirect = encodeURIComponent("/cppa/scope-checker");
  return (
    <section className="bg-card border rounded-lg p-4">
      <p className="text-sm font-medium">Save this obligation map to your account</p>
      <p className="text-xs text-muted-foreground mt-1">
        Create a free End User Privacy account to keep this result, access it from My Reports, and run additional CPPA tools.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <Link
          to={`/signup?redirect=${redirect}`}
          className="inline-flex items-center justify-center bg-brand-navy text-white font-semibold text-sm px-4 py-2 rounded-md no-underline hover:opacity-90"
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

function ResultsPanel({
  obligationMap,
  q1,
  q2,
  q3,
  q5,
  onReset,
  navigate,
  isAuthed,
}: {
  obligationMap: {
    inScope: boolean;
    cyberAuditRequired: boolean;
    admtRequired: boolean;
    sensitiveRequired: boolean;
    dataBrokerRequired: boolean;
    riskAssessmentRequired: boolean;
    hasUnsure: boolean;
  };
  q1: string;
  q2: string;
  q3: string;
  q5: string;
  onReset: () => void;
  navigate: (to: string) => void;
  isAuthed: boolean;
}) {

  // Out of scope, no Unsure: confidently out of scope
  if (!obligationMap.inScope && !obligationMap.hasUnsure) {
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
              thresholds: $25M+ revenue, 100,000+ consumers, or 50%+ revenue from data sales.
            </p>
            <p className="text-sm text-muted-foreground">
              This may change if your revenue or data volume grows, or if California enacts
              lower thresholds.
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

  const status = (required: boolean, hasUnsure: boolean) =>
    required ? (hasUnsure ? "Likely Required" : "Required") : "Not applicable";

  const Row = ({
    title,
    deadline,
    statusLabel,
    description,
    cta,
  }: {
    title: string;
    deadline: string;
    statusLabel: string;
    description: string;
    cta?: { label: string; href: string };
  }) => {
    const sevColor = statusLabel.startsWith("Required")
      ? "bg-red-100 text-red-800"
      : statusLabel.startsWith("Likely")
      ? "bg-amber-100 text-amber-800"
      : "bg-muted text-muted-foreground";
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Deadline: {deadline}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${sevColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-foreground mt-2">{description}</p>
        {cta && statusLabel !== "Not applicable" && (
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to={cta.href}>{cta.label} →</Link>
            </Button>
          </div>
        )}
      </div>
    );
  };

  const cyberRequiredConfirmed = ["$100M–$500M", "Over $500M"].includes(q2);
  const cyberStatusLabel = cyberRequiredConfirmed
    ? "Required"
    : q2 === "Unsure"
    ? "Likely Required"
    : "Not applicable";

  const thresholdSentences: string[] = [];
  const revenueMet = ["$25M–$100M", "$100M–$500M", "Over $500M"].includes(q2);
  const consumerMet = ["100,000–1 million", "Over 1 million"].includes(q3);
  const salesMet = q5 === "Yes";
  if (revenueMet) {
    thresholdSentences.push(`meets the annual revenue threshold (${q2})`);
  } else if (q2 === "Unsure") {
    thresholdSentences.push("may meet the annual revenue threshold based on your answers");
  }
  if (consumerMet) {
    thresholdSentences.push(`meets the consumer volume threshold (${q3} California consumers)`);
  } else if (q3 === "Unsure") {
    thresholdSentences.push("may meet the consumer volume threshold based on your answers");
  }
  if (salesMet) {
    thresholdSentences.push("meets the 50%+ revenue from data sales threshold");
  } else if (q5 === "Unsure") {
    thresholdSentences.push("may meet the 50%+ revenue from data sales threshold based on your answers");
  }
  const thresholdSummary =
    thresholdSentences.length > 0
      ? `Your business ${thresholdSentences.join("; and ")}.`
      : null;

  return (
    <div className="space-y-6">
      <section className="border-l-4 border-emerald-500 bg-card border rounded-lg p-6">
        <h2 className="">
          CCPA/CPRA applies — or likely applies — to your business.
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
        <Row
          title="CCPA/CPRA Full Compliance"
          deadline="In force now"
          statusLabel={status(true, obligationMap.hasUnsure)}
          description="Consumer rights, privacy notices, opt-out mechanisms, data subject request handling."
        />
        <Row
          title="Privacy Risk Assessment"
          deadline="December 31, 2027 (existing processing activities)"
          statusLabel={status(obligationMap.riskAssessmentRequired, obligationMap.hasUnsure)}
          description="Controllers processing PI posing significant risk must complete and submit risk assessments to the CPPA."
          cta={{ label: "CPPA Risk Assessment tool", href: "/cppa-risk-assessment" }}
        />
        <Row
          title="Cybersecurity Audit Certification"
          deadline="April 1, 2028 (businesses with revenue > $100M)"
          statusLabel={cyberStatusLabel}
          description="Businesses exceeding $100M annual revenue must certify completion of a cybersecurity audit to the CPPA."
          cta={
            cyberRequiredConfirmed
              ? { label: "CPPA Cybersecurity Readiness tool", href: "/cppa-cybersecurity" }
              : undefined
          }
        />
        <Row
          title="ADMT Disclosure & Opt-Out"
          deadline="January 1, 2027"
          statusLabel={status(obligationMap.admtRequired, obligationMap.hasUnsure)}
          description="Businesses using ADMT for consequential decisions about consumers must provide disclosure and an opt-out right."
          cta={
            obligationMap.admtRequired
              ? { label: "ADMT Compliance Assessment tool", href: "/cppa-admt-checker" }
              : undefined
          }
        />
        <Row
          title="Sensitive Personal Information"
          deadline="In force now"
          statusLabel={status(obligationMap.sensitiveRequired, obligationMap.hasUnsure)}
          description="Consumers have the right to limit use of sensitive PI. You must honor this right and provide the required disclosure."
        />
        <Row
          title="Data Broker Registration"
          deadline="In force now — annual renewal"
          statusLabel={status(obligationMap.dataBrokerRequired, false)}
          description="Data brokers must register annually with the California Privacy Protection Agency (CPPA) under the Delete Act. Failure to register can result in administrative fines of $200 per day."
        />
      </section>

      <section className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-sm rounded">
        {isAuthed ? (
          <>
            <p className="font-medium">Saved to your account.</p>
            <p className="mt-1">
              Find this result any time in{" "}
              <Link to="/my-reports" className="underline">My Reports</Link>.
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

      <section className="bg-card border rounded-lg p-6 space-y-3">
        <h3 className="">Next steps</h3>
        <div className="flex flex-wrap gap-3">
          {obligationMap.riskAssessmentRequired && (
            <Button onClick={() => navigate("/cppa-risk-assessment")}>
              Run CPPA Risk Assessment — Module 1 →
            </Button>
          )}
          {cyberRequiredConfirmed && (
            <Button onClick={() => navigate("/cppa-cybersecurity")}>
              Run CPPA Cybersecurity Readiness — Module 2 →
            </Button>
          )}
          {obligationMap.admtRequired && (
            <Button onClick={() => navigate("/cppa-admt-checker")}>
              Run ADMT Compliance Assessment — Module 3 →
            </Button>
          )}
        </div>
        {obligationMap.riskAssessmentRequired && cyberRequiredConfirmed && (
          <p className="text-sm text-muted-foreground">
            Need both? The{" "}
            <Link to="/cppa" className="underline text-brand-teal-text">CPPA Full Audit Suite</Link>{" "}
            covers risk assessment and cybersecurity readiness together —{" "}
            <span className="font-semibold text-foreground">
              {PRICING_REGISTRY.cppa_suite_standalone.displayPrice} (subscribers {PRICING_REGISTRY.cppa_suite_subscriber.displayPrice})
            </span>
            , versus{" "}
            <span className="font-semibold text-foreground">
              ${
                (PRICING_REGISTRY.cppa_risk_standalone.amountCents +
                  PRICING_REGISTRY.cppa_cyber_standalone.amountCents) / 100
              }
            </span>{" "}
            separately.
          </p>
        )}
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
    </div>
  );
}
