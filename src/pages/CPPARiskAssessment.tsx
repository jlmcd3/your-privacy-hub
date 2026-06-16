// CPPA Privacy Risk Assessment — Module 1 intake.
// v3 (June 2026): expanded with intake questions I-1 through I-9 to feed the
// new § 7152(a)(1)–(9) Part A / § 7157 Part B generator. Branching: I-5 only
// when ADMT trigger fires; I-9 only when user has a prior DPIA.

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ToolTierNote from "@/components/tools/ToolTierNote";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { InfoPopover } from "@/components/InfoPopover";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { useToolDraft } from "@/hooks/useToolDraft";

function formatRelativeTime(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

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

// I-3: California-consumer count band (§ 4D).
const CA_CONSUMER_BAND = [
  "Fewer than 10,000",
  "10,000–100,000",
  "100,000–1,000,000",
  "More than 1,000,000",
  "Unsure",
];

// I-4: disclosure mechanisms (§ 4E).
const DISCLOSURE_MECHANISMS = [
  "Notice at Collection",
  "Privacy policy",
  "Just-in-time notice",
  "Consent screen",
  "Account-settings disclosure",
  "Contract / terms of service",
  "No standalone disclosure",
];

// I-2: retention criteria type (§ 4B).
const RETENTION_CRITERIA = [
  "Fixed period from collection",
  "Duration of account / relationship",
  "Statutory or regulatory retention requirement",
  "Until purpose is fulfilled, then deletion",
  "Other criteria (described below)",
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


// Step 6 statute popover helper — one-line plain-language summary with citation.
function StatutePopover({ term, summary, cite }: { term: string; summary: string; cite: string }) {
  return (
    <InfoPopover term={term} cite={cite}>
      <p><span className="font-mono text-[11px] mr-1">(summary)</span>{summary}</p>
    </InfoPopover>
  );
}

export default function CPPARiskAssessment() {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_risk_assessment");
  const [searchParams] = useSearchParams();
  const isSuite = searchParams.get("suite") === "true";
  const suitePricing = useToolPrice("cppa_suite");
  const activePricing = isSuite ? suitePricing : pricing;
  const headerLabel = isSuite ? "CPPA AUDIT READINESS · FULL SUITE (M1 + M2)" : "CPPA AUDIT READINESS · MODULE 1";
  const displayPrice = activePricing.price;

  const [step, setStep] = useState(1);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Step 1 — Business Profile
  const [q1, setQ1] = useState(""); const [q2, setQ2] = useState(""); const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState<string[]>([]); const [q5, setQ5] = useState("");
  // Step 2 — Consumer Rights
  const [q6Multi, setQ6Multi] = useState<string[]>([]); const [q7, setQ7] = useState(""); const [q8, setQ8] = useState("");
  const [q9, setQ9] = useState(""); const [q10, setQ10] = useState("");
  // Step 3 — Notices
  const [q11, setQ11] = useState(""); const [q12, setQ12] = useState("");
  const [q13, setQ13] = useState(""); const [q14, setQ14] = useState("");
  // Step 4 — Sensitive PI
  const [q15, setQ15] = useState(""); const [q16, setQ16] = useState(""); const [q17, setQ17] = useState("");
  // Step 5 — ADMT
  const [q18, setQ18] = useState(""); const [q19, setQ19] = useState(""); const [q20, setQ20] = useState("");

  // Step 6 — Risk Assessment Specifics (NEW: I-1 through I-9)
  const [i1Purpose, setI1Purpose] = useState("");                 // I-1: specific purpose (§ 2)
  const [i2RetentionPeriod, setI2RetentionPeriod] = useState(""); // I-2 (§ 4B)
  const [i2RetentionCriteria, setI2RetentionCriteria] = useState("");
  const [i2RetentionDetail, setI2RetentionDetail] = useState("");
  const [i3CaConsumerBand, setI3CaConsumerBand] = useState("");   // I-3 (§ 4D)
  const [i4Disclosures, setI4Disclosures] = useState<string[]>([]); // I-4 (§ 4E)
  // I-5 ADMT specifics — only when ADMT trigger fires
  const [i5AdmtLogic, setI5AdmtLogic] = useState("");
  const [i5AdmtTrainingSource, setI5AdmtTrainingSource] = useState("");
  const [i5AdmtFairnessTesting, setI5AdmtFairnessTesting] = useState("");
  const [i5AdmtHumanReview, setI5AdmtHumanReview] = useState("");
  // I-6: vendors / service providers / contractors (§ 4F + Appx B)
  const [i6Vendors, setI6Vendors] = useState("");
  // I-7: contributors and consultees (§ 9)
  const [i7InternalContributors, setI7InternalContributors] = useState("");
  const [i7ExternalConsultees, setI7ExternalConsultees] = useState("");
  // I-8: certifying executive (§ 0 + § 10 + Part B)
  const [i8ExecName, setI8ExecName] = useState("");
  const [i8ExecTitle, setI8ExecTitle] = useState("");
  const [i8ContactPhone, setI8ContactPhone] = useState("");
  const [i8ContactEmail, setI8ContactEmail] = useState("");
  // I-9: existing DPIA?
  const [i9HasDpia, setI9HasDpia] = useState("");
  const [i9DpiaSummary, setI9DpiaSummary] = useState("");

  const totalSteps = 7; // 6 input steps + summary

  // ADMT trigger fires when § 7150(b)(3) or (b)(6) implicated.
  // From Step 5: q18 === "Yes".
  const admtTriggered = q18 === "Yes" || q18 === "In evaluation";

  const stepValid = (): string | null => {
    if (step === 1 && (!q1 || !q2 || !q3 || !q4.length || !q5)) return "Please complete the business profile.";
    if (step === 2 && (!q6Multi.length || !q7 || !q8 || !q9 || !q10)) return "Please complete consumer rights questions.";
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
    if (step === 6) {
      if (!i1Purpose || i1Purpose.length < 30) return "I-1: Please describe the specific processing purpose (at least 30 characters).";
      if (!i2RetentionPeriod || !i2RetentionCriteria) return "I-2: Please provide a retention period and criteria.";
      if (!i3CaConsumerBand) return "I-3: Please select the approximate California consumer band.";
      if (!i4Disclosures.length) return "I-4: Please select at least one disclosure mechanism (or 'No standalone disclosure').";
      if (admtTriggered && (!i5AdmtLogic || !i5AdmtHumanReview)) return "I-5: ADMT logic and human review fields are required.";
      if (!i6Vendors) return "I-6: List service providers / contractors / third parties (or write 'None').";
      if (!i7InternalContributors) return "I-7: List internal contributor roles (or write 'None').";
      if (!i8ExecName || !i8ExecTitle) return "I-8: Certifying executive name and title are required.";
      if (!i9HasDpia) return "I-9: Please answer whether an existing DPIA exists.";
      if (i9HasDpia === "Yes" && !i9DpiaSummary) return "I-9: Please summarise the existing DPIA.";
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
    // legacy keys preserved
    q1_revenue: q1, q2_consumers: q2, q3_sector: q3, q4_pi_categories: q4, q5_sell_share: q5,
    q6_right_know: q6Multi.join("; "), q6_right_know_multi: q6Multi, q7_right_delete: q7, q8_right_correct: q8, q9_opt_out: q9, q10_id_verification: q10,
    q11_policy_review: q11, q12_notice_at_collection: q12, q13_notice_content: q13, q14_employee_notice: q14,
    q15_sensitive_pi: q15, q16_sensitive_limit: q16, q17_sensitive_basis: q17,
    q18_admt_use: q18, q19_admt_description: q19, q20_admt_opt_out: q20,
    // v3 additions (I-1 through I-9)
    i1_processing_purpose: i1Purpose,
    i2_retention_period: i2RetentionPeriod,
    i2_retention_criteria: i2RetentionCriteria,
    i2_retention_detail: i2RetentionDetail,
    i3_ca_consumer_band: i3CaConsumerBand,
    i4_disclosure_mechanisms: i4Disclosures,
    i5_admt_logic: i5AdmtLogic,
    i5_admt_training_source: i5AdmtTrainingSource,
    i5_admt_fairness_testing: i5AdmtFairnessTesting,
    i5_admt_human_review: i5AdmtHumanReview,
    i6_vendors: i6Vendors,
    i7_internal_contributors: i7InternalContributors,
    i7_external_consultees: i7ExternalConsultees,
    i8_certifying_exec_name: i8ExecName,
    i8_certifying_exec_title: i8ExecTitle,
    i8_contact_phone: i8ContactPhone,
    i8_contact_email: i8ContactEmail,
    i9_has_existing_dpia: i9HasDpia,
    i9_existing_dpia_summary: i9DpiaSummary,
  }), [
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary,
  ]);

  // ---- Draft autosave ------------------------------------------------------
  const draftData = useMemo(() => ({
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary,
  }), [
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary,
  ]);
  const INITIAL_DRAFT_JSON = useMemo(() => JSON.stringify({
    q1: "", q2: "", q3: "", q4: [] as string[], q5: "", q6Multi: [] as string[], q7: "", q8: "", q9: "", q10: "",
    q11: "", q12: "", q13: "", q14: "", q15: "", q16: "", q17: "", q18: "", q19: "", q20: "",
    i1Purpose: "", i2RetentionPeriod: "", i2RetentionCriteria: "", i2RetentionDetail: "",
    i3CaConsumerBand: "", i4Disclosures: [] as string[], i5AdmtLogic: "", i5AdmtTrainingSource: "",
    i5AdmtFairnessTesting: "", i5AdmtHumanReview: "", i6Vendors: "", i7InternalContributors: "",
    i7ExternalConsultees: "", i8ExecName: "", i8ExecTitle: "", i8ContactPhone: "", i8ContactEmail: "", i9HasDpia: "", i9DpiaSummary: "",
  }), []);
  const touched = useMemo(() => JSON.stringify(draftData) !== INITIAL_DRAFT_JSON, [draftData, INITIAL_DRAFT_JSON]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage,
    saving: draftSaving, lastSavedAt, clearDraft, dismissDraft,
  } = useToolDraft({
    toolType: "cppa_risk",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: step,
    enabled: !!user && touched,
  });

  const applyRestore = () => {
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    if (typeof d.q1 === "string") setQ1(d.q1);
    if (typeof d.q2 === "string") setQ2(d.q2);
    if (typeof d.q3 === "string") setQ3(d.q3);
    if (Array.isArray(d.q4)) setQ4(d.q4);
    if (typeof d.q5 === "string") setQ5(d.q5);
    if (Array.isArray(d.q6Multi)) setQ6Multi(d.q6Multi);
    if (typeof d.q7 === "string") setQ7(d.q7);
    if (typeof d.q8 === "string") setQ8(d.q8);
    if (typeof d.q9 === "string") setQ9(d.q9);
    if (typeof d.q10 === "string") setQ10(d.q10);
    if (typeof d.q11 === "string") setQ11(d.q11);
    if (typeof d.q12 === "string") setQ12(d.q12);
    if (typeof d.q13 === "string") setQ13(d.q13);
    if (typeof d.q14 === "string") setQ14(d.q14);
    if (typeof d.q15 === "string") setQ15(d.q15);
    if (typeof d.q16 === "string") setQ16(d.q16);
    if (typeof d.q17 === "string") setQ17(d.q17);
    if (typeof d.q18 === "string") setQ18(d.q18);
    if (typeof d.q19 === "string") setQ19(d.q19);
    if (typeof d.q20 === "string") setQ20(d.q20);
    if (typeof d.i1Purpose === "string") setI1Purpose(d.i1Purpose);
    if (typeof d.i2RetentionPeriod === "string") setI2RetentionPeriod(d.i2RetentionPeriod);
    if (typeof d.i2RetentionCriteria === "string") setI2RetentionCriteria(d.i2RetentionCriteria);
    if (typeof d.i2RetentionDetail === "string") setI2RetentionDetail(d.i2RetentionDetail);
    if (typeof d.i3CaConsumerBand === "string") setI3CaConsumerBand(d.i3CaConsumerBand);
    if (Array.isArray(d.i4Disclosures)) setI4Disclosures(d.i4Disclosures);
    if (typeof d.i5AdmtLogic === "string") setI5AdmtLogic(d.i5AdmtLogic);
    if (typeof d.i5AdmtTrainingSource === "string") setI5AdmtTrainingSource(d.i5AdmtTrainingSource);
    if (typeof d.i5AdmtFairnessTesting === "string") setI5AdmtFairnessTesting(d.i5AdmtFairnessTesting);
    if (typeof d.i5AdmtHumanReview === "string") setI5AdmtHumanReview(d.i5AdmtHumanReview);
    if (typeof d.i6Vendors === "string") setI6Vendors(d.i6Vendors);
    if (typeof d.i7InternalContributors === "string") setI7InternalContributors(d.i7InternalContributors);
    if (typeof d.i7ExternalConsultees === "string") setI7ExternalConsultees(d.i7ExternalConsultees);
    if (typeof d.i8ExecName === "string") setI8ExecName(d.i8ExecName);
    if (typeof d.i8ExecTitle === "string") setI8ExecTitle(d.i8ExecTitle);
    if (typeof d.i8ContactPhone === "string") setI8ContactPhone(d.i8ContactPhone);
    if (typeof d.i8ContactEmail === "string") setI8ContactEmail(d.i8ContactEmail);
    if (typeof d.i9HasDpia === "string") setI9HasDpia(d.i9HasDpia);
    if (typeof d.i9DpiaSummary === "string") setI9DpiaSummary(d.i9DpiaSummary);
    if (typeof restoreStage === "number") setStep(restoreStage);
    dismissDraft();
  };

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
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Privacy Risk Assessment — Module 1 | End User Privacy</title>
        <meta name="description" content="California CPPA risk assessment mapped 1:1 to § 7152(a)(1)–(9). Generates a regulation-mapped framework pre-populated from your intake, ready for executive sign-off." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-risk-assessment" />
      </Helmet>
      <header className="bg-[#1a4a6e] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {headerLabel} · ${displayPrice}
          </span>
          <h1 className="font-serif mb-3">CPPA Privacy Risk Assessment</h1>
          <p className="text-slate-300 text-lg">A regulation-mapped risk assessment framework, structured 1:1 to Cal. Code Regs. tit. 11 § 7152(a)(1)–(9), pre-populated from your intake and ready for your team to review, complete, and sign.</p>
          <p className="text-slate-400 text-sm mt-3">Generates two deliverables: an internal report retained for the § 7156(c) 30-day production demand, and a § 7157 Annual Submission Worksheet for the April 1, 2028 filing.</p>
          <p className="text-slate-400 text-xs italic mt-2">
            Built on the CPPA's final regulations and Final Statement of Reasons, paragraph-cited. This tool never invents precedent — where the agency hasn't spoken, it says so.
          </p>
          <div className="mt-4"><SampleReportLink toolSlug="cppa_risk" tone="onDark" variant="link" /></div>
        </div>
      </header>
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
        <ToolTierNote isCppa={true} />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a structured risk assessment framework aligned to the CPPA's audit regulations (11 CCR §§ 7150-7157). It is an analytical aid, not legal advice, and does not constitute a certified audit or regulatory submission. Review all output with qualified counsel before relying on it." />
        {draftFound && !touched && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-brand-teal/40 bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] text-sm">
            <div className="text-foreground">
              You have a saved draft{draftUpdatedAt ? ` from ${formatRelativeTime(draftUpdatedAt)}` : ""}.
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={applyRestore}>Resume draft</Button>
              <Button size="sm" variant="ghost" onClick={() => { void clearDraft(); }}>Discard</Button>
            </div>
          </div>
        )}
        <div className="text-sm text-muted-foreground">Step {step} of {totalSteps}</div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          {step === 1 && (
            <>
              <h2>Step 1 — Business Profile</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Cal. Civ. Code § 1798.140(ag) — CCPA/CPRA business definition and applicability thresholds</p>
              <RequiredLegend />
              <div><Label>Q1: Annual gross revenue <Req /></Label><div className="mt-2"><Radio name="q1" options={REVENUE_OPTS} value={q1} onChange={setQ1} /></div></div>
              <div><Label>Q2: Number of California consumers whose PI you process annually <Req /></Label><div className="mt-2"><Radio name="q2" options={CONSUMER_OPTS} value={q2} onChange={setQ2} /></div></div>
              <div><Label>Q3: Primary business sector <Req /></Label>
                <select value={q3} onChange={(e) => setQ3(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Q4: Categories of personal information processed <Req /></Label><div className="mt-2"><Pills options={PI_CATEGORIES} value={q4} onChange={setQ4} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q5: Do you sell or share personal information for cross-context behavioural advertising? <Req /></Label><DefPopover termKey="ccba" /></div>
                <div className="mt-2"><Radio name="q5" options={["Yes — sell only", "Yes — share for advertising only", "Both", "No"]} value={q5} onChange={setQ5} /></div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Step 2 — Consumer Rights Infrastructure</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Cal. Civ. Code §§ 1798.100–1798.135 — consumer rights obligations</p>
              <RequiredLegend />
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q6: Right to Know / Access mechanism <Req /></Label><DefPopover termKey="right_to_know" /></div>
                <p className="text-xs text-muted-foreground mt-1">Select all that apply.</p>
                <div className="mt-2">
                  <Pills
                    options={["Online form with identity verification", "Email or written request process", "In-app account settings", "No formal process in place"]}
                    value={q6Multi}
                    onChange={(v) => {
                      const NO = "No formal process in place";
                      const wasNo = q6Multi.includes(NO);
                      const hasNo = v.includes(NO);
                      if (hasNo && !wasNo) {
                        setQ6Multi([NO]);
                      } else if (hasNo && v.length > 1) {
                        setQ6Multi(v.filter((x) => x !== NO));
                      } else {
                        setQ6Multi(v);
                      }
                    }}
                  />
                </div>
              </div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q7: Right to Deletion mechanism <Req /></Label><DefPopover termKey="right_to_delete" /></div><div className="mt-2"><Radio name="q7" options={["Automated deletion with confirmation", "Manual process, documented", "Case-by-case handling", "No formal process"]} value={q7} onChange={setQ7} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q8: Right to Correction mechanism <Req /></Label><DefPopover termKey="right_to_correct" /></div><div className="mt-2"><Radio name="q8" options={["Online self-service", "Handled via support", "No formal process"]} value={q8} onChange={setQ8} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q9: Right to Opt-Out — do you have a "Do Not Sell or Share" link? <Req /></Label><DefPopover termKey="right_to_opt_out" /></div><div className="mt-2"><Radio name="q9" options={["Yes, prominently on homepage", "Yes, but in footer only", "In progress", "No"]} value={q9} onChange={setQ9} /></div></div>
              <div><Label>Q10: Identity verification for rights requests <Req /></Label><div className="mt-2"><Radio name="q10" options={["Documented verification process matching CPPA guidance", "Informal verification", "No verification process"]} value={q10} onChange={setQ10} /></div></div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Step 3 — Privacy Notices</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Cal. Civ. Code §§ 1798.100(a), 1798.130; 11 CCR § 7003 — notice requirements</p>
              <RequiredLegend />
              <div><Label>Q11: Privacy policy last reviewed/updated <Req /></Label><div className="mt-2"><Radio name="q11" options={["Within 12 months", "12–24 months ago", "Over 24 months ago", "No privacy policy"]} value={q11} onChange={setQ11} /></div></div>
              <div><Label>Q12: Notice at Collection (displayed before or at time of data collection) <Req /></Label><div className="mt-2"><Radio name="q12" options={["Yes, covers all collection points", "Yes, partial coverage", "No"]} value={q12} onChange={setQ12} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q13: Do your notices include the categories of PI collected, the purpose, and the right to opt-out? <Req /></Label><DefPopover termKey="notice_at_collection" /></div><div className="mt-2"><Radio name="q13" options={["Yes, all three", "Some elements", "No"]} value={q13} onChange={setQ13} /></div></div>
              <div><Label>Q14: For employees/job applicants — do you provide a separate California-specific notice? <Req /></Label><div className="mt-2"><Radio name="q14" options={["Yes", "No — we use our general privacy policy", "Not applicable (no CA employees)"]} value={q14} onChange={setQ14} /></div></div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>Step 4 — Sensitive Personal Information</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Cal. Civ. Code § 1798.140(ae); 11 CCR § 7152(a)(5) — sensitive PI definition and obligations</p>
              <RequiredLegend />
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q15: Do you process any sensitive PI? <Req /></Label><DefPopover termKey="sensitive_pi" /></div><div className="mt-2"><Radio name="q15" options={["Yes", "No", "Unsure"]} value={q15} onChange={setQ15} /></div></div>
              {q15 === "Yes" && (<>
                <div><Label>Q16: Do you provide consumers the right to limit use of their sensitive PI? <Req /></Label><div className="mt-2"><Radio name="q16" options={["Yes, with a separate \"Limit the Use of My Sensitive PI\" link", "Yes, handled within privacy settings", "No", "Not yet implemented"]} value={q16} onChange={setQ16} /></div></div>
                <div><Label>Q17: What is your legal basis for processing sensitive PI? <Req /></Label><div className="mt-2"><Radio name="q17" options={["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"]} value={q17} onChange={setQ17} /></div></div>
              </>)}
            </>
          )}

          {step === 5 && (
            <>
              <div className="inline-flex items-center gap-1.5 flex-wrap"><h2>Step 5 — Automated Decision-Making Technology (ADMT)</h2><DefPopover termKey="admt" /></div>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR §§ 7001(e), 7001(ddd), 7150(b)(3), 7150(b)(6) — ADMT definition and risk assessment triggers</p>
              <RequiredLegend />
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Q18: Do you use any ADMT that makes, or materially contributes to, decisions with significant effects on consumers? <Req /></Label><DefPopover termKey="admt" /></div><div className="mt-2"><Radio name="q18" options={["Yes", "No", "In evaluation"]} value={q18} onChange={setQ18} /></div></div>
              {(q18 === "Yes" || q18 === "In evaluation") && (
                <div><Label>Q19: Describe the ADMT system and its decisions <Req /></Label>
                  <Textarea value={q19} onChange={(e) => setQ19(e.target.value)} rows={3} placeholder="E.g. Credit scoring algorithm, automated fraud detection, hiring screening software…" className="mt-2" />
                  <p className="text-[11px] text-muted-foreground mt-1">Examples: an automated résumé-screening tool that ranks or rejects job applicants · a credit-decisioning model that sets limits without human review · worker-productivity scoring that drives scheduling or discipline decisions.</p>
                </div>
              )}
              {q18 === "Yes" && (
                <div><Label>Q20: Do you provide consumers with the right to opt out of ADMT? <Req /></Label><div className="mt-2"><Radio name="q20" options={["Yes, with documented opt-out", "Planned for implementation", "No"]} value={q20} onChange={setQ20} /></div></div>
              )}
            </>
          )}


          {step === 6 && (
            <>
              <h2>Step 6 — Risk Assessment Specifics</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR §§ 7152(a)(1)–(9), 7156(b), 7157 — mandatory risk assessment content requirements</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">
                These questions feed § 7152(a)(1)–(9) Part A and the § 7157 Annual Submission Worksheet. Fields left blank in the generated report will be marked as fill-ins for your team to complete in the review pane before executive sign-off.
              </p>

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-1: Specific processing purpose <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(1))</span></Label><StatutePopover term="I-1 · Specific purpose" summary="The assessment must state the specific purpose of the processing; generic purposes such as 'improving services' are insufficient." cite="11 CCR § 7152(a)(2)" /></div>
                <p className="text-xs text-muted-foreground mt-1">
                  Describe what you do with the personal information, who it relates to, and what business outcome it supports. Avoid generic phrases such as "improve services," "for security purposes," "analytics," or "as described in our privacy policy" — these will be flagged by the validator.
                </p>
                <Textarea
                  value={i1Purpose}
                  onChange={(e) => setI1Purpose(e.target.value)}
                  rows={4}
                  placeholder='E.g. "To present personalised product recommendations to registered users based on their 12-month purchase history on the platform, using collaborative filtering applied to purchase transaction data."'
                  className="mt-2"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-2: Retention period and criteria <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(B))</span></Label><StatutePopover term="I-2 · Retention period" summary="State how long each category of personal information will be retained, or the criteria used to determine that period." cite="11 CCR § 7152(a)(4)(B)" /></div>
                <input
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={i2RetentionPeriod}
                  onChange={(e) => setI2RetentionPeriod(e.target.value)}
                  placeholder="E.g. 24 months from collection; 7 years after relationship ends"
                />
                <select
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={i2RetentionCriteria}
                  onChange={(e) => setI2RetentionCriteria(e.target.value)}
                >
                  <option value="">Retention criteria…</option>
                  {RETENTION_CRITERIA.map((c) => <option key={c}>{c}</option>)}
                </select>
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={i2RetentionDetail}
                  onChange={(e) => setI2RetentionDetail(e.target.value)}
                  placeholder="Optional: cite the statutory/regulatory basis or describe 'Other criteria'."
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-3: Approximate number of California consumers affected by this activity <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(D))</span></Label><StatutePopover term="I-3 · California consumer count" summary="State the approximate number of consumers whose personal information the processing affects." cite="11 CCR § 7152(a)(4)(D)" /></div>
                <div className="mt-2"><Radio name="i3" options={CA_CONSUMER_BAND} value={i3CaConsumerBand} onChange={setI3CaConsumerBand} /></div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-4: How are consumers informed of this processing activity? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(E))</span></Label><StatutePopover term="I-4 · Disclosure mechanisms" summary="Identify the disclosures made to consumers about the processing and how they are provided." cite="11 CCR § 7152(a)(4)(E)" /></div>
                <p className="text-xs text-muted-foreground mt-1">Select every mechanism that applies. The report will map your selections against the conspicuousness requirements of § 7003.</p>
                <div className="mt-2"><Pills options={DISCLOSURE_MECHANISMS} value={i4Disclosures} onChange={setI4Disclosures} /></div>
              </div>

              {admtTriggered && (
                <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/40 dark:bg-amber-950/10 rounded-r">
                  <Label className="font-semibold">I-5: ADMT specifics (required because you indicated ADMT use) <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(G))</span></Label>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium">ADMT logic summary <Req /></span>
                      <InfoPopover term="Examples" cite="Illustrative examples — not exhaustive">
                        <div className="space-y-1">
                          <p>A gradient-boosted model scores loan applications 0–100; scores below 40 are auto-declined.</p>
                          <p>A scheduling algorithm assigns shifts based on predicted productivity.</p>
                        </div>
                      </InfoPopover>
                    </div>
                    <Textarea rows={3} value={i5AdmtLogic} onChange={(e) => setI5AdmtLogic(e.target.value)} placeholder="ADMT logic summary — what the system decides and how *" />
                  </div>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium">Training-data source(s)</span>
                      <InfoPopover term="Examples" cite="Illustrative examples — not exhaustive">
                        <div className="space-y-1">
                          <p>Five years of internal application outcomes.</p>
                          <p>Third-party credit bureau data.</p>
                        </div>
                      </InfoPopover>
                    </div>
                    <Textarea rows={2} value={i5AdmtTrainingSource} onChange={(e) => setI5AdmtTrainingSource(e.target.value)} placeholder="Training-data source(s)" />
                  </div>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium">Fairness / bias testing approach</span>
                      <InfoPopover term="Examples" cite="Illustrative examples — not exhaustive">
                        <div className="space-y-1">
                          <p>Annual disparate-impact analysis across protected classes.</p>
                          <p>Score-threshold parity review by an external auditor.</p>
                        </div>
                      </InfoPopover>
                    </div>
                    <Textarea rows={2} value={i5AdmtFairnessTesting} onChange={(e) => setI5AdmtFairnessTesting(e.target.value)} placeholder="Fairness / bias testing approach" />
                  </div>
                  <div className="mt-2">
                    <div className="inline-flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium">Human review process for outputs <Req /></span>
                      <InfoPopover term="Examples" cite="Illustrative examples — not exhaustive">
                        <div className="space-y-1">
                          <p>Borderline scores routed to an underwriter.</p>
                          <p>Consumers may request human reconsideration of any automated decision.</p>
                        </div>
                      </InfoPopover>
                    </div>
                    <Textarea rows={2} value={i5AdmtHumanReview} onChange={(e) => setI5AdmtHumanReview(e.target.value)} placeholder="Human review process for outputs *" />
                  </div>
                </div>
              )}

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-6: Service providers, contractors, third parties involved <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(F))</span></Label><StatutePopover term="I-6 · Vendors / service providers" summary="Identify the service providers, contractors, and third parties to whom personal information is disclosed for this processing." cite="11 CCR § 7152(a)(4)(F)" /></div>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={i6Vendors}
                  onChange={(e) => setI6Vendors(e.target.value)}
                  placeholder='One per line: "Vendor name — role — PI categories shared". Write "None" if none.'
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-7: Internal contributors and external consultees <Req /> <span className="text-xs text-muted-foreground">(§§ 7151, 7152(a)(8))</span></Label><StatutePopover term="I-7 · Contributors and consultees" summary="Identify the individuals and roles who contributed to or were consulted in preparing the risk assessment." cite="11 CCR § 7152(a)(9)" /></div>
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={i7InternalContributors}
                  onChange={(e) => setI7InternalContributors(e.target.value)}
                  placeholder="Internal — roles (e.g. Privacy lead, CISO, Legal, Business owner)"
                />
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={i7ExternalConsultees}
                  onChange={(e) => setI7ExternalConsultees(e.target.value)}
                  placeholder="External — counsel, auditors, regulator engagement (optional)"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>I-8: Certifying executive name <Req /> <span className="text-xs text-muted-foreground">(§ 7157(b)(5))</span></Label><StatutePopover term="I-8 · Certifying executive" summary="The risk assessment must be certified by an executive responsible for oversight of the processing." cite="11 CCR § 7157" /></div>
                  <input className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={i8ExecName} onChange={(e) => setI8ExecName(e.target.value)} placeholder="Full legal name" />
                </div>
                <div>
                  <Label>Certifying executive title <Req /></Label>
                  <input className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={i8ExecTitle} onChange={(e) => setI8ExecTitle(e.target.value)} placeholder="E.g. Chief Privacy Officer" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 flex-wrap">
                    <Label>Contact phone <span className="text-xs text-muted-foreground">(§ 7157(b)(1))</span></Label>
                  </div>
                  <input
                    className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={i8ContactPhone}
                    onChange={(e) => setI8ContactPhone(e.target.value)}
                    placeholder="E.g. +1 415 555 0100"
                    type="tel"
                  />
                </div>
                <div>
                  <Label>Contact email <span className="text-xs text-muted-foreground">(§ 7157(b)(1))</span></Label>
                  <input
                    className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={i8ContactEmail}
                    onChange={(e) => setI8ContactEmail(e.target.value)}
                    placeholder="E.g. privacy@company.com"
                    type="email"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Required by § 7157(b)(1) for the annual submission to the CPPA. The CPPA may contact this person about the filing.
              </p>

              <div>
                <Label>I-9: Is there an existing GDPR DPIA (or other PIA) for this activity? <Req /> <span className="text-xs text-muted-foreground">(§ 7156(b))</span></Label>
                <div className="mt-2"><Radio name="i9" options={["Yes", "No"]} value={i9HasDpia} onChange={setI9HasDpia} /></div>
                {i9HasDpia === "Yes" && (
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={i9DpiaSummary}
                    onChange={(e) => setI9DpiaSummary(e.target.value)}
                    placeholder="Brief summary: framework, scope, date — Appendix E will map § 7152 elements already covered."
                  />
                )}
              </div>
            </>
          )}

          {summaryStep && <SummaryTable intake={intake} />}

          <div className="flex justify-between pt-4 border-t flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>
            <div className="flex items-center gap-3 ml-auto">
              {user && (
                draftSaving ? (
                  <span className="text-[11px] text-muted-foreground">Saving…</span>
                ) : lastSavedAt ? (
                  <span className="text-[11px] text-muted-foreground">Draft saved {formatRelativeTime(lastSavedAt)}</span>
                ) : null
              )}
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
        </div>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool. It does not constitute legal advice and is not a substitute for review by qualified California privacy counsel.
        </p>

        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-risk-assessment?suite=true" : "/cppa-risk-assessment"} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_risk_assessment"}
          userId={user?.id}
          clientId={clientId}
          intakeData={intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            void clearDraft();
            if (isSuite && suiteCyberId) {
              navigate(`/cppa-suite/result?risk_id=${id}&cyber_id=${suiteCyberId}&purchased=true`);
            } else if (isSuite && !suiteCyberId) {
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            } else {
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            }
          }}
        />
      </main>
      <CPPAToolsCrossLinks current="risk" />
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
  push("CA consumers (business-wide)", intake.q2_consumers);
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

  push("I-1 Processing purpose (specific)", intake.i1_processing_purpose);
  push("I-2 Retention period", intake.i2_retention_period);
  push("I-2 Retention criteria", intake.i2_retention_criteria);
  push("I-2 Retention detail", intake.i2_retention_detail);
  push("I-3 CA consumers for this activity", intake.i3_ca_consumer_band);
  push("I-4 Disclosure mechanisms", intake.i4_disclosure_mechanisms);
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") {
    push("I-5 ADMT logic", intake.i5_admt_logic);
    push("I-5 ADMT training source", intake.i5_admt_training_source);
    push("I-5 ADMT fairness testing", intake.i5_admt_fairness_testing);
    push("I-5 ADMT human review", intake.i5_admt_human_review);
  }
  push("I-6 Service providers / vendors", intake.i6_vendors);
  push("I-7 Internal contributors", intake.i7_internal_contributors);
  push("I-7 External consultees", intake.i7_external_consultees);
  push("I-8 Certifying executive", `${intake.i8_certifying_exec_name ?? ""} — ${intake.i8_certifying_exec_title ?? ""}`);
  push("I-9 Existing DPIA?", intake.i9_has_existing_dpia);
  if (intake.i9_has_existing_dpia === "Yes") push("I-9 DPIA summary", intake.i9_existing_dpia_summary);

  return (
    <>
      <h2>Review your answers</h2>
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
