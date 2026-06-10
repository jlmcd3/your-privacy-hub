// CPPA Scope Checker — free deterministic tool, no AI, no payment.
// Determines whether CCPA/CPRA + CPPA enforcement obligations apply.


import { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PRICING_REGISTRY } from "@/config/pricing";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q1, setQ1] = useState<Q1>("");
  const [q2, setQ2] = useState<Q2>("");
  const [q3, setQ3] = useState<Q3>("");
  const [q4, setQ4] = useState<Q4>("");
  const [q5, setQ5] = useState<Q5>("");
  const [q6, setQ6] = useState<Q6>("");
  const [q7, setQ7] = useState<Q7>("");
  const [q8, setQ8] = useState<Q8>("");
  const [showResults, setShowResults] = useState(false);
  // One UUID per page load, never persisted to browser storage (per spec).
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const insertedKeyRef = useRef<string | null>(null);

  const allAnswered = q1 && q2 && q3 && q4 && q5 && q6 && q7 && q8;

  const answers = useMemo(
    () => ({ q1, q2, q3, q4, q5, q6, q7, q8 }),
    [q1, q2, q3, q4, q5, q6, q7, q8],
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
    setQ1(""); setQ2(""); setQ3(""); setQ4("");
    setQ5(""); setQ6(""); setQ7(""); setQ8("");
    setShowResults(false);
    insertedKeyRef.current = null;
  };

  return (
    <WorkspaceLayout className="bg-background">
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
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🛡️ CPPA Scope Checker · Free · No account required
          </span>
          <h1 className="font-serif mb-3">CPPA Scope Checker</h1>
          <p className="text-slate-300 text-lg">
            Find out whether the California Consumer Privacy Act (CCPA/CPRA) and CPPA
            enforcement obligations apply to your business. Takes 2 minutes.
          </p>
          <p className="text-slate-400 text-sm mt-3">
            The CPPA Audits Division stood up in February 2026. Enforcement is active.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {!showResults && (
          <div className="bg-card border rounded-lg p-6 space-y-6">
            <div>
              <Label>Q1: Does your business operate for profit and do business in California, OR collect personal information from California residents?</Label>
              <div className="mt-2">
                <Radio name="q1" options={["Yes", "No", "Unsure"]} value={q1} onChange={(v) => setQ1(v as Q1)} />
              </div>
            </div>

            <div>
              <Label>Q2: What is your business's annual gross revenue?</Label>
              <div className="mt-2">
                <Radio
                  name="q2"
                  options={["Under $25 million", "$25M–$100M", "$100M–$500M", "Over $500M", "Unsure"]}
                  value={q2}
                  onChange={(v) => setQ2(v as Q2)}
                />
              </div>
            </div>

            <div>
              <Label>Q3: How many California consumers' personal information does your business buy, sell, receive for commercial purposes, or share for cross-context behavioural advertising annually?</Label>
              <div className="mt-2">
                <Radio
                  name="q3"
                  options={["Fewer than 100,000", "100,000–1 million", "Over 1 million", "Unsure"]}
                  value={q3}
                  onChange={(v) => setQ3(v as Q3)}
                />
              </div>
            </div>

            <div>
              <Label>Q4: Does your business sell or share consumers' personal information (in any quantity)?</Label>
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

            <div>
              <Label>Q5: Does 50% or more of your annual revenue come from selling or sharing consumers' personal information?</Label>
              <div className="mt-2">
                <Radio name="q5" options={["Yes", "No", "Unsure"]} value={q5} onChange={(v) => setQ5(v as Q5)} />
              </div>
            </div>

            <div>
              <Label>Q6: Does your business process any sensitive personal information? (health data, precise geolocation, racial/ethnic origin, religious beliefs, union membership, biometric data, genetic data, sexual orientation, or citizenship/immigration status)</Label>
              <div className="mt-2">
                <Radio name="q6" options={["Yes", "No", "Unsure"]} value={q6} onChange={(v) => setQ6(v as Q6)} />
              </div>
            </div>

            <div>
              <Label>Q7: Does your business use automated decision-making technology (ADMT) to make, or factor into, decisions that have significant effects on California consumers — such as employment, credit, housing, insurance, or access to services?</Label>
              <div className="mt-2">
                <Radio name="q7" options={["Yes", "No", "In evaluation", "Unsure"]} value={q7} onChange={(v) => setQ7(v as Q7)} />
              </div>
            </div>

            <div>
              <Label>Q8: Are you registered as a data broker with the California Attorney General?</Label>
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
      </main>
      <CPPAToolsCrossLinks current="scope" />
    </WorkspaceLayout>
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

function EmailResultsCapture() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden || done) {
    return done ? (
      <p className="text-xs text-brand-teal pt-2">✓ Sent. Check your inbox.</p>
    ) : null;
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("subscribe-email", {
        body: { email, source: "cppa-scope-results" },
      });
      if (error) throw error;
      setDone(true);
      toast({ title: "Sent", description: "Your obligation map is on its way." });
    } catch (err) {
      toast({
        title: "Couldn't send",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="bg-card border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">Email me this obligation map</p>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
          aria-label="Dismiss email capture"
        >
          Dismiss
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mt-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 px-3 py-2 rounded border border-brand-cloud bg-background text-sm focus:outline-none focus:border-brand-teal"
        />
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Sending…" : "Email me"}
        </Button>
      </form>
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
        />
        <Row
          title="Sensitive Personal Information"
          deadline="In force now"
          statusLabel={status(obligationMap.sensitiveRequired, obligationMap.hasUnsure)}
          description="Consumers have the right to limit use of sensitive PI. You must honour this right and provide the required disclosure."
        />
        <Row
          title="Data Broker Registration"
          deadline="In force now — annual renewal"
          statusLabel={status(obligationMap.dataBrokerRequired, false)}
          description="Data brokers must register with the California AG annually. Failure to register can result in fines of up to $200 per day."
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

      {!isAuthed && <EmailResultsCapture />}

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
        </div>
        {obligationMap.riskAssessmentRequired && cyberRequiredConfirmed && (
          <p className="text-sm text-muted-foreground">
            Need both? The{" "}
            <Link to="/cppa" className="underline text-brand-teal">CPPA Full Audit Suite</Link>{" "}
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
    </div>
  );
}
