// CPPA Privacy Risk Assessment — Module 1 intake. 5-step wizard + summary.

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ToolTierNote from "@/components/tools/ToolTierNote";

const REVENUE_OPTS = ["Under $25M", "$25M–$100M", "$100M–$500M", "Over $500M"];
const CONSUMER_OPTS = ["Fewer than 100,000", "100,000–1 million", "1–10 million", "Over 10 million", "Unsure"];
const SECTORS = ["Technology/SaaS", "Healthcare/Life Sciences", "Financial services", "Retail/ecommerce", "Media/advertising", "Professional services", "Education", "Government/public sector", "Legal services", "Manufacturing", "Other"];
const PI_CATEGORIES = [
  "Contact identifiers (name, email, phone)",
  "Device identifiers (IP, cookies, device IDs)",
  "Internet or network activity",
  "Geolocation data",
  "Financial information",
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
  "Sexual orientation or gender identity",
  "Citizenship or immigration status",
  "Employment information",
  "Education information",
  "Children's data (under 16)",
  "Other",
];

const Pills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button key={opt} type="button" onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>
          {opt}
        </button>
      );
    })}
  </div>
);

const Radio = ({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    {options.map((o) => (
      <label key={o} className="flex items-start gap-2 cursor-pointer">
        <input type="radio" name={name} value={o} checked={value === o} onChange={(e) => onChange(e.target.value)} className="mt-1" />
        <span className="text-sm">{o}</span>
      </label>
    ))}
  </div>
);

export default function CPPARiskAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_risk_assessment");
  const [searchParams] = useSearchParams();
  const isSuite = searchParams.get("suite") === "true";
  const suitePricing = useToolPrice("cppa_suite");
  // v7: render the price the *current viewer* will pay (Intelligence 20% off,
  // Professional 25% off, free/anon = standalone). Switch to Suite pricing
  // when the intake was launched in suite mode.
  const activePricing = isSuite ? suitePricing : pricing;
  const headerLabel = isSuite ? "CPPA AUDIT READINESS · FULL SUITE (M1 + M2)" : "CPPA AUDIT READINESS · MODULE 1";
  const displayPrice = activePricing.price;

  const [step, setStep] = useState(1);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Step 1
  const [q1, setQ1] = useState(""); // revenue
  const [q2, setQ2] = useState(""); // consumers
  const [q3, setQ3] = useState(""); // sector
  const [q4, setQ4] = useState<string[]>([]); // PI categories
  const [q5, setQ5] = useState(""); // sell/share
  // Step 2
  const [q6, setQ6] = useState(""); const [q7, setQ7] = useState(""); const [q8, setQ8] = useState("");
  const [q9, setQ9] = useState(""); const [q10, setQ10] = useState("");
  // Step 3
  const [q11, setQ11] = useState(""); const [q12, setQ12] = useState("");
  const [q13, setQ13] = useState(""); const [q14, setQ14] = useState("");
  // Step 4
  const [q15, setQ15] = useState(""); const [q16, setQ16] = useState(""); const [q17, setQ17] = useState("");
  // Step 5
  const [q18, setQ18] = useState(""); const [q19, setQ19] = useState(""); const [q20, setQ20] = useState("");

  const totalSteps = 6; // 5 steps + summary

  const stepValid = (): string | null => {
    if (step === 1 && (!q1 || !q2 || !q3 || !q4.length || !q5)) return "Please complete the business profile.";
    if (step === 2 && (!q6 || !q7 || !q8 || !q9 || !q10)) return "Please complete consumer rights questions.";
    if (step === 3 && (!q11 || !q12 || !q13 || !q14)) return "Please complete privacy notice questions.";
    if (step === 4) {
      if (!q15) return "Please answer Q15.";
      if (q15 === "Yes" && (!q16 || !q17)) return "Please complete sensitive PI follow-ups.";
    }
    if (step === 5) {
      if (!q18) return "Please answer Q18.";
      if ((q18 === "Yes" || q18 === "In evaluation") && !q19) return "Please describe the ADMT system.";
      if (q18 === "Yes" && !q20) return "Please answer Q20.";
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) { toast({ title: "Required", description: err, variant: "destructive" }); return; }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const intake = useMemo(() => ({
    q1_revenue: q1, q2_consumers: q2, q3_sector: q3, q4_pi_categories: q4, q5_sell_share: q5,
    q6_right_know: q6, q7_right_delete: q7, q8_right_correct: q8, q9_opt_out: q9, q10_id_verification: q10,
    q11_policy_review: q11, q12_notice_at_collection: q12, q13_notice_content: q13, q14_employee_notice: q14,
    q15_sensitive_pi: q15, q16_sensitive_limit: q16, q17_sensitive_basis: q17,
    q18_admt_use: q18, q19_admt_description: q19, q20_admt_opt_out: q20,
  }), [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20]);

  const summaryStep = step === totalSteps;

  const handlePurchase = () => {
    if (!user) { setAuthGateOpen(true); return; }
    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Privacy Risk Assessment — Module 1 | End User Privacy</title>
        <meta name="description" content="California CPPA risk assessment structured to the agency's regulations — domain findings supported by cited CPPA and AG enforcement context." /></Helmet>
      <Navbar />
      <DashboardSubnav />
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {headerLabel} · ${displayPrice}
          </span>
          <h1 className="font-serif mb-3">CPPA Privacy Risk Assessment</h1>
          <p className="text-slate-300 text-lg">A structured assessment of your organisation's CCPA/CPRA compliance posture mapped to the CPPA's enforcement priorities. Generates a compliance gap report with remediation guidance.</p>
          <p className="text-slate-400 text-sm mt-3">Required for businesses processing personal information posing significant risk. Submission deadline: December 31, 2027.</p>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          <ToolTierNote isCppa={true} />
        </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <div className="text-sm text-muted-foreground">Step {step} of {totalSteps}</div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          {step === 1 && (
            <>
              <h2 className="">Step 1 — Business Profile</h2>
              <div><Label>Q1: Annual gross revenue *</Label><div className="mt-2"><Radio name="q1" options={REVENUE_OPTS} value={q1} onChange={setQ1} /></div></div>
              <div><Label>Q2: Number of California consumers whose PI you process annually *</Label><div className="mt-2"><Radio name="q2" options={CONSUMER_OPTS} value={q2} onChange={setQ2} /></div></div>
              <div><Label>Q3: Primary business sector *</Label>
                <select value={q3} onChange={(e) => setQ3(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Q4: Categories of personal information processed *</Label><div className="mt-2"><Pills options={PI_CATEGORIES} value={q4} onChange={setQ4} /></div></div>
              <div><Label>Q5: Do you sell or share personal information for cross-context behavioural advertising? *</Label>
                <div className="mt-2"><Radio name="q5" options={["Yes — sell only", "Yes — share for advertising only", "Both", "No"]} value={q5} onChange={setQ5} /></div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="">Step 2 — Consumer Rights Infrastructure</h2>
              <div><Label>Q6: Right to Know / Access mechanism *</Label><div className="mt-2"><Radio name="q6" options={["Online form with identity verification", "Email or written request process", "In-app account settings", "No formal process in place"]} value={q6} onChange={setQ6} /></div></div>
              <div><Label>Q7: Right to Deletion mechanism *</Label><div className="mt-2"><Radio name="q7" options={["Automated deletion with confirmation", "Manual process, documented", "Case-by-case handling", "No formal process"]} value={q7} onChange={setQ7} /></div></div>
              <div><Label>Q8: Right to Correction mechanism *</Label><div className="mt-2"><Radio name="q8" options={["Online self-service", "Handled via support", "No formal process"]} value={q8} onChange={setQ8} /></div></div>
              <div><Label>Q9: Right to Opt-Out — do you have a "Do Not Sell or Share" link? *</Label><div className="mt-2"><Radio name="q9" options={["Yes, prominently on homepage", "Yes, but in footer only", "In progress", "No"]} value={q9} onChange={setQ9} /></div></div>
              <div><Label>Q10: Identity verification for rights requests *</Label><div className="mt-2"><Radio name="q10" options={["Documented verification process matching CPPA guidance", "Informal verification", "No verification process"]} value={q10} onChange={setQ10} /></div></div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="">Step 3 — Privacy Notices</h2>
              <div><Label>Q11: Privacy policy last reviewed/updated *</Label><div className="mt-2"><Radio name="q11" options={["Within 12 months", "12–24 months ago", "Over 24 months ago", "No privacy policy"]} value={q11} onChange={setQ11} /></div></div>
              <div><Label>Q12: Notice at Collection (displayed before or at time of data collection) *</Label><div className="mt-2"><Radio name="q12" options={["Yes, covers all collection points", "Yes, partial coverage", "No"]} value={q12} onChange={setQ12} /></div></div>
              <div><Label>Q13: Do your notices include the categories of PI collected, the purpose, and the right to opt-out? *</Label><div className="mt-2"><Radio name="q13" options={["Yes, all three", "Some elements", "No"]} value={q13} onChange={setQ13} /></div></div>
              <div><Label>Q14: For employees/job applicants — do you provide a separate California-specific notice? *</Label><div className="mt-2"><Radio name="q14" options={["Yes", "No — we use our general privacy policy", "Not applicable (no CA employees)"]} value={q14} onChange={setQ14} /></div></div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="">Step 4 — Sensitive Personal Information</h2>
              <div><Label>Q15: Do you process any sensitive PI? *</Label><div className="mt-2"><Radio name="q15" options={["Yes", "No", "Unsure"]} value={q15} onChange={setQ15} /></div></div>
              {q15 === "Yes" && (<>
                <div><Label>Q16: Do you provide consumers the right to limit use of their sensitive PI? *</Label><div className="mt-2"><Radio name="q16" options={["Yes, with a separate \"Limit the Use of My Sensitive PI\" link", "Yes, handled within privacy settings", "No", "Not yet implemented"]} value={q16} onChange={setQ16} /></div></div>
                <div><Label>Q17: What is your legal basis for processing sensitive PI? *</Label><div className="mt-2"><Radio name="q17" options={["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"]} value={q17} onChange={setQ17} /></div></div>
              </>)}
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="">Step 5 — Automated Decision-Making Technology (ADMT)</h2>
              <div><Label>Q18: Do you use any ADMT that makes, or materially contributes to, decisions with significant effects on consumers? *</Label><div className="mt-2"><Radio name="q18" options={["Yes", "No", "In evaluation"]} value={q18} onChange={setQ18} /></div></div>
              {(q18 === "Yes" || q18 === "In evaluation") && (
                <div><Label>Q19: Describe the ADMT system and its decisions *</Label>
                  <Textarea value={q19} onChange={(e) => setQ19(e.target.value)} rows={3} placeholder="E.g. Credit scoring algorithm, automated fraud detection, hiring screening software..." className="mt-2" />
                </div>
              )}
              {q18 === "Yes" && (
                <div><Label>Q20: Do you provide consumers with the right to opt out of ADMT? *</Label><div className="mt-2"><Radio name="q20" options={["Yes, with documented opt-out", "Planned for implementation", "No"]} value={q20} onChange={setQ20} /></div></div>
              )}
            </>
          )}

          {summaryStep && <SummaryTable intake={intake} />}

          <div className="flex justify-between pt-4 border-t flex-wrap gap-3">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>
            {!summaryStep ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {isSuite ? (
                  <Button onClick={() => { if (!user) { setAuthGateOpen(true); return; } setCheckoutOpen(true); }}>
                    Purchase CPPA Suite — ${suitePricing.price}
                  </Button>
                ) : (
                  <Button onClick={handlePurchase} disabled={!pricing.stripeConfigured}>
                    {!pricing.stripeConfigured ? `Payments Coming Soon — $${displayPrice}` : `Run CPPA Risk Assessment — $${displayPrice}`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool mapped to CPPA enforcement priorities. It does not constitute legal advice. Output should be reviewed with qualified legal counsel.
        </p>

        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-risk-assessment?suite=true" : "/cppa-risk-assessment"} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_risk_assessment"}
          userId={user?.id}
          intakeData={intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            if (isSuite && suiteCyberId) {
              navigate(`/cppa-suite/result?risk_id=${id}&cyber_id=${suiteCyberId}&purchased=true`);
            } else if (isSuite && !suiteCyberId) {
              // cyber_id missing — fall back to risk result as a safety net
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            } else {
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            }
          }}
        />
      </main>
      <Footer />
    </div>
  );
}

function SummaryTable({ intake }: { intake: Record<string, any> }) {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: any) => {
    if (value == null || value === "") return;
    rows.push({ label, value: Array.isArray(value) ? value.join(", ") : String(value) });
  };
  push("Annual revenue", intake.q1_revenue);
  push("CA consumers", intake.q2_consumers);
  push("Sector", intake.q3_sector);
  push("PI categories", intake.q4_pi_categories);
  push("Sell or share PI", intake.q5_sell_share);
  push("Right to Know", intake.q6_right_know);
  push("Right to Delete", intake.q7_right_delete);
  push("Right to Correct", intake.q8_right_correct);
  push("Opt-out link", intake.q9_opt_out);
  push("Identity verification", intake.q10_id_verification);
  push("Policy review cadence", intake.q11_policy_review);
  push("Notice at collection", intake.q12_notice_at_collection);
  push("Notice content", intake.q13_notice_content);
  push("Employee notice", intake.q14_employee_notice);
  push("Sensitive PI processed", intake.q15_sensitive_pi);
  if (intake.q15_sensitive_pi === "Yes") {
    push("Right to limit sensitive PI", intake.q16_sensitive_limit);
    push("Sensitive PI legal basis", intake.q17_sensitive_basis);
  }
  push("ADMT in use", intake.q18_admt_use);
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") {
    push("ADMT description", intake.q19_admt_description);
  }
  if (intake.q18_admt_use === "Yes") push("ADMT opt-out", intake.q20_admt_opt_out);

  return (
    <>
      <h2 className="">Review your answers</h2>
      <div className="rounded-lg border bg-card divide-y">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <div className="text-sm font-medium text-muted-foreground sm:col-span-1">{r.label}</div>
            <div className="text-sm text-foreground sm:col-span-2 break-words">{r.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
