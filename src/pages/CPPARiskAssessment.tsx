// CPPA Privacy Risk Assessment — Module 1 intake.
// v3 (June 2026): expanded with intake questions I-1 through I-9 to feed the
// new § 7152(a)(1)–(9) Part A / § 7157 Part B generator. Branching: I-5 only
// when ADMT trigger fires; I-9 only when user has a prior DPIA.

import { useEffect, useMemo, useRef, useState } from "react";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  clearSuiteHandoff,
  nextSuiteStep,
  readSuiteHandoff,
  saveSuiteModule,
  suiteCheckoutIntake,
} from "@/lib/suiteIntakeHandoff";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExhibitTextarea } from "@/components/ExhibitTextarea";
import { AssistedInput } from "@/components/AssistedInput";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
// ITEM 381 — intake completeness coach (Layer 1), per-product flag, default off.
import IntakeCoachStep from "@/components/intake/IntakeCoachStep";
import { isIntakeCoachEnabled } from "@/config/intakeCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { useActiveClient } from "@/hooks/useActiveClient";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { InfoPopover } from "@/components/InfoPopover";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import { ProductHero } from "@/components/ProductHero";
import SuiteSelector from "@/components/product/SuiteSelector";
import HeroPriceCta from "@/components/product/HeroPriceCta";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import HowItWorksRow from "@/components/product/HowItWorksRow";
import SuiteCrossSellStrip from "@/components/product/SuiteCrossSellStrip";
import CompactDisclaimer from "@/components/product/CompactDisclaimer";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { INCLUDED_GENERATIONS_HERO } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { consumeRiskPrefill } from "@/lib/riskIntakePrefill";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import StatuteRail from "@/components/intake/StatuteRail";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { CPPA_RISK_RAIL } from "@/components/cppa/CPPARiskRailEntries";
import type { RailEntry } from "@/components/intake/StatuteRail";
import {
  IMPROVEMENT_KIT_ENABLED,
  IMPROVEMENT_KIT_DESIGNATED_FIELDS,
  type AssertionMap,
} from "@/config/improvementKit";
import { CheckCircle2, Zap } from 'lucide-react';
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { AssertionLevel } from "@/components/cppa/AssertionLevel";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";

const CPPA_RISK_STEP_TITLES: Record<number, string> = {
  1: "The activity you are assessing",
  2: "Why an assessment is required",
  3: "The information, its sources, and its recipients",
  4: "Minimum necessary, retention, and business purposes",
  5: "Negative impacts and safeguards",
  6: "Benefits and the weighing",
  7: "Preparation and sign-off",
  8: "Review your answers",
};
import { useEnforcementSignals } from "@/hooks/useEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import { CPPA_RISK_FSOR_CALLOUTS } from "@/components/cppa/CPPARiskFsorCallouts";
import { FscrCallout } from "@/components/FscrCallout";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";

function formatRelativeTime(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// RC-FLIP-3 — T-class banded option sets extracted to CPPARiskAssessment.enums.ts
// so shared components (refine surface) import from a page-free module. Page
// re-exports so existing intake-page consumers are unchanged.
export {
  REVENUE_OPTS,
  CONSUMER_OPTS,
  BOUGHT_SOLD_SHARED_OPTS,
  SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS,
  Q5_SELL_SHARE_OPTS,
  Q15_SENSITIVE_PI_OPTS,
  SENSITIVE_LOCATION_BASIS_OPTS,
} from "@/pages/CPPARiskAssessment.enums";
import {
  REVENUE_OPTS,
  CONSUMER_OPTS,
  BOUGHT_SOLD_SHARED_OPTS,
  SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS,
  Q5_SELL_SHARE_OPTS,
  Q15_SENSITIVE_PI_OPTS,
  SENSITIVE_LOCATION_BASIS_OPTS,
} from "@/pages/CPPARiskAssessment.enums";
const SECTORS = ["Technology/SaaS", "Healthcare/Life Sciences", "Financial services", "Retail/ecommerce", "Media/advertising", "Professional services", "Education", "Government/public sector", "Legal services", "Manufacturing", "Other"];
// DOC 157 (2026-09-03, model-vs-law build) — four § 7001(bbb)(1) categories
// the list lacked ((A) government identifiers, (B) account credentials,
// (E) message contents, (G) neural data) and the sexual-orientation /
// gender-identity split (only sexual orientation is sensitive). Verbatim
// copy in _shared/intake-contracts/cppa-risk-assessment.ts (parity pinned).
const PI_CATEGORIES = [
  "Contact identifiers (name, email, phone)",
  "Government identifiers (SSN, driver's license, state ID, passport number)",
  "Device identifiers (IP, cookies, device IDs)",
  "Internet or network activity",
  "Contents of mail, email, or text messages",
  "Precise geolocation (GPS-level / specific address)",
  "General location (city, region, ZIP, IP-derived)",
  "Financial information",
  "Account log-in or financial-account credentials",
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Neural data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
  "Sexual orientation",
  "Gender identity",
  "Citizenship or immigration status",
  "Employment information",
  "Education information",
  "Children's data (under 16)",
  "Other",
];

// Categories that are sensitive PI under Cal. Civ. Code § 1798.140(ae) and
// 11 CCR § 7001(bbb) (which adds under-16 data with actual knowledge).
// These trigger additional obligations (Q15 follow-ups, § 7152(a)(5) harm categories).
const SENSITIVE_PI_CATEGORIES = new Set([
  "Government identifiers (SSN, driver's license, state ID, passport number)",
  "Account log-in or financial-account credentials",
  "Contents of mail, email, or text messages",
  "Precise geolocation (GPS-level / specific address)",
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Neural data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
  "Sexual orientation",
  "Sexual orientation or gender identity",
  "Children's data (under 16)",
]);

// ITEM 275 — § 7156(a) comparable-set divergence dimensions. Each secondary
// use is compared against the primary activity across the five dimensions the
// § 7156(a)(1) Business E example turns on (same information, same purpose,
// same way/technology, same consumers, similar privacy risks).
export const DIVERGENCE_OPTS = ["Same", "Different", "Not sure"] as const;
export const MAX_SECONDARY_ACTIVITIES = 5;

export const DIVERGENCE_DIMENSIONS = [
  { key: "data", label: "The personal information used" },
  { key: "purpose", label: "The purpose of the processing" },
  { key: "systems", label: "The systems, technology, and service providers used" },
  { key: "people", label: "The consumers whose information is processed" },
  { key: "risks", label: "The risks to consumers' privacy and the safeguards applied" },
] as const;
export const HAS_SECONDARY_USES_OPTS = [
  "No — this data is used for this activity only",
  "Yes — there are other uses",
] as const;
export type SecondaryActivity = {
  name: string;
  purpose: string;
  divergence: Record<string, string>;
  // RK3-D (doc 33 D-L3) — per-row Class C→B operands; optional so old drafts
  // restore cleanly.
  relation_to_primary?: string;
  disclosed_in_notice?: string;
};

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


const Pills = ({ options, value, onChange, sensitiveSet }: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  sensitiveSet?: Set<string>;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      const isSensitive = sensitiveSet?.has(opt) ?? false;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          title={isSensitive ? "Sensitive PI under Cal. Civ. Code § 1798.140(ae) — triggers additional obligations" : undefined}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            checked
              ? isSensitive
                ? "bg-red-600 text-white border-red-600"
                : "bg-primary text-primary-foreground border-primary"
              : isSensitive
              ? "bg-background hover:bg-red-50 border-red-300 text-red-700"
              : "bg-background hover:bg-muted border-input"
          }`}
        >
          {opt}
          {isSensitive && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">Sensitive</span>}
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


// Eight "business purposes" / statutory exemptions enumerated in CCPA itself
// (Cal. Civ. Code § 1798.140(e) "business purpose" list and § 1798.145 exemptions).
// These do NOT remove a § 7150 trigger from risk-assessment scope on their own;
// they describe permitted internal uses or carve-outs from specific obligations.
// Rail key (railKey) maps to CPPA_RISK_RAIL entries with verbatim statutory text.
export const CPPA_EXCEPTIONS: { key: string; label: string; cite: string; railKey: string }[] = [
  { key: "fraud_detection",   label: "Fraud prevention / detection",                       cite: "Cal. Civ. Code § 1798.140(e)(2)", railKey: "exc_fraud_detection" },
  { key: "security_integrity", label: "Security & integrity of systems and data",          cite: "Cal. Civ. Code § 1798.140(e)(2)", railKey: "exc_security_integrity" },
  { key: "debugging",         label: "Debugging to identify and repair errors",            cite: "Cal. Civ. Code § 1798.140(e)(3)", railKey: "exc_debugging" },
  { key: "transient_use",     label: "Transient / short-term use (no profile built)",      cite: "Cal. Civ. Code § 1798.140(e)(4)", railKey: "exc_transient_use" },
  { key: "internal_research", label: "Internal research for technological development",    cite: "Cal. Civ. Code § 1798.140(e)(8)", railKey: "exc_internal_research" },
  { key: "employment_context", label: "Employment-context processing",                     cite: "No current statutory exemption (former § 1798.145(m) inoperative since January 1, 2023) — additional information required", railKey: "exc_employment_context" },
  { key: "legal_compliance",  label: "Compliance with a legal obligation",                 cite: "Cal. Civ. Code § 1798.145(a)(1)", railKey: "exc_legal_compliance" },
  { key: "consumer_request",  label: "Performing a service the consumer requested",        cite: "Cal. Civ. Code § 1798.140(e)(1)", railKey: "exc_consumer_request" },
];

// § 7152(a)(5) negative-impact examples + impact-assessment scales live in a
// sibling module so the refine surface's structured editor can import them
// without pulling this page (and thus RefinePanel) back in a cycle.
export {
  HARM_TYPES,
  IMPACT_LIKELIHOOD_OPTS,
  IMPACT_SEVERITY_OPTS,
  IMPACT_BENEFITS_OUTWEIGH_OPTS,
  IMPACT_CYBER_GAPS_OPTS,
} from "./CPPARiskAssessment.enums";
import {
  HARM_TYPES,
  IMPACT_LIKELIHOOD_OPTS,
  IMPACT_SEVERITY_OPTS,
  IMPACT_BENEFITS_OUTWEIGH_OPTS,
  IMPACT_CYBER_GAPS_OPTS,
} from "./CPPARiskAssessment.enums";
// ITEM 305 — analytic-deliverable intake option sets (§ 7152(a)(2), (a)(4),
// (a)(5), (a)(6), (a)(7)). Authored in the .enums module; never re-declared.
import {
  NECESSITY_STATUS_OPTS,
  HARM_PATHWAY_OPTS,
  HARM_LIKELIHOOD_OPTS,
  HARM_SEVERITY_OPTS,
  SAFEGUARD_STATUS_OPTS,
  CONSUMER_INTERACTION_METHOD_OPTS,
  PROCESSING_STATUS_OPTS,
  HARM_CATEGORY_REVIEW_STATUS_OPTS,
  FINAL_PROCESSING_DECISION_PLANNED_OPTS,
  FINAL_PROCESSING_DECISION_ONGOING_OPTS,
  REVIEWER_ROLE_OPTS,
} from "./CPPARiskAssessment.enums";
// RK3-D (doc 33 D-L3) — Class C→B conversion option sets (single source of
// truth; verbatim copies mirrored in the intake contract, parity pinned).
import {
  PURPOSE_SPECIFICITY_FACTS_OPTS,
  OUT_OF_SCOPE_CONFIRMATION_OPTS,
  COMPARABLE_PROCESSING_STATUS_OPTS,
  CONSUMER_RELATIONSHIP_CONTEXT_OPTS,
  SOURCE_CATEGORY_OPTS,
  VENDOR_DEPENDENCY_OPTS,
  EXPECTATION_CHECK_OPTS,
  CHOICE_ARCHITECTURE_CHECK_OPTS,
  ADMT_ROLE_TYPE_OPTS,
  SIGNIFICANT_DECISION_CATEGORY_OPTS,
  HOUSING_DECISION_BASIS_OPTS,
  ADMT_LOGIC_DOCUMENTED_OPTS,
  HUMAN_REVIEW_FACTS_OPTS,
  ADMT_TESTING_FACTS_OPTS,
  RISK_INTERDEPENDENCY_OPTS,
  BENEFIT_MAGNITUDE_BASIS_OPTS,
  SECONDARY_RELATION_OPTS,
  SECONDARY_DISCLOSED_OPTS,
  RECIPIENT_CONTRACT_OPTS,
  SAFEGUARD_EFFECTIVENESS_BASIS_OPTS,
  PLANNED_TIMELINE_OPTS,
} from "./CPPARiskAssessment.enums";

// Progressive disclosure for optional clusters. The value line states what the
// report does when the cluster is left closed — never a nudge to fill it in.
function OptionalCluster({ title, valueLine, children }: { title: string; valueLine: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t pt-6 mt-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-base font-semibold">{title} <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{valueLine}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : `Add ${title.toLowerCase()}`}
        </Button>
      </div>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

// Step 6 statute popover helper — one-line plain-language summary with citation.
function StatutePopover({ term, summary, cite }: { term: string; summary: string; cite: string }) {
  return (
    <InfoPopover term={term} cite={cite}>
      <p><span className="font-mono text-body-tiny mr-1">(summary)</span>{summary}</p>
    </InfoPopover>
  );
}

export default function CPPARiskAssessment() {
  useToolStartedOnInteraction("cppa_risk");

  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_risk_assessment");
  const [searchParams] = useSearchParams();
  const isSuite = searchParams.get("suite") === "true";
  const suitePricing = useToolPrice("cppa_suite");
  const activePricing = isSuite ? suitePricing : pricing;
  const headerLabel = isSuite ? "FULL AUDIT SUITE · MODULE 1 OF 2" : "CPPA AUDIT READINESS · MODULE 1";
  const displayPrice = activePricing.price;

  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const refine = useRefineMode("cppa_risk_assessment");
  const { isPro } = useSubscriptionTier();
  // Doc Q: highlighting is gated on both the Kit flag AND the Pro check.
  // Intelligence / non-Pro re-runs render the intake exactly as today.
  const resolveHighlightingEnabled = IMPROVEMENT_KIT_ENABLED && isPro;
  const { meter } = useRunMeter("cppa_risk_assessment", refine.assessmentId);
  const topRef = useRef<HTMLDivElement>(null);
  // SWEEP-2 T14: skip the scroll on initial mount; only scroll when the
  // step actually changes so the page does not auto-jump on first load.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // ITEM 381 — the review step is advisory and shown at most once per run.
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachSeen, setCoachSeen] = useState(false);

  // Step 1 — Business Profile
  const [entityName, setEntityName] = useState("");
  const [subjectAnchor, setSubjectAnchor] = useState("");
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
  // PN-CORPUS-L-RISK-1 — § 7150(b)(2)(A) personnel carve-out.
  const [q15dHrCarveout, setQ15dHrCarveout] = useState("");
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
  const [materialChangeSincePrior, setMaterialChangeSincePrior] = useState("");
  const [i9DpiaSummary, setI9DpiaSummary] = useState("");
  // RK3-A2 g4 — PN-RK7 SPI employment-exception facts (conditional on employment basis)
  const [spiEmploymentExceptionFacts, setSpiEmploymentExceptionFacts] = useState("");
  // RK3-A2 g3 — § 7153 branch (conditional on q18 === "Yes")
  const [admtMadeAvailableToOtherBusiness, setAdmtMadeAvailableToOtherBusiness] = useState("");
  const [admtProviderTrainedUsingPi, setAdmtProviderTrainedUsingPi] = useState("");
  const [recipientBusinessUsesAdmtForSignificantDecision, setRecipientBusinessUsesAdmtForSignificantDecision] = useState("");
  // RK3-A2 g2 — § 7152(a)(3)(G) ADMT branch extensions (conditional on admtTriggered)
  const [admtOperationalRole, setAdmtOperationalRole] = useState("");
  const [admtAssumptionsLimitations, setAdmtAssumptionsLimitations] = useState("");
  const [admtOutput, setAdmtOutput] = useState("");
  const [admtOutputUse, setAdmtOutputUse] = useState("");
  const [admtConsumerEffect, setAdmtConsumerEffect] = useState("");
  // RK3-A2 g1 — § RAF 7155 processing status + assessment timeline
  const [processingStatus, setProcessingStatus] = useState("");
  const [processingStartDate, setProcessingStartDate] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [priorRiskAssessmentDate, setPriorRiskAssessmentDate] = useState("");
  const [materialChangeDate, setMaterialChangeDate] = useState("");
  const [materialChangeDescription, setMaterialChangeDescription] = useState("");

  // § 7152 exceptions + impact (optional). R1a: each claimed exception may carry two additional
  // optional free-text fields — authority_basis and retention_period — so the generator can
  // address specific statutory anchors and retention windows tied to the exception's purpose.
  // Absent keys are legal in old drafts (see applyRestore).
  type ExceptionClaim = { claimed: boolean; scope: string; safeguards: string; authority_basis?: string; retention_period?: string };
  const [exceptionClaims, setExceptionClaims] = useState<Record<string, ExceptionClaim>>({});
  const [impactData, setImpactData] = useState<{ likelihood: string; severity: string; harmTypes: string[]; vulnerable: string; benefitsOutweigh: string; benefitsRationale: string; cyberGaps: string; businessBenefits: string; consumerBenefits: string; stakeholderBenefits: string; safeguards: string; harmCauses: string }>({ likelihood: "", severity: "", harmTypes: [], vulnerable: "", benefitsOutweigh: "", benefitsRationale: "", cyberGaps: "", businessBenefits: "", consumerBenefits: "", stakeholderBenefits: "", safeguards: "", harmCauses: "" });

  // New § 7152 data elements (see EUP gap analysis). Each persists via draft (Prompt 2/3).
  const [q5bProfiling, setQ5bProfiling] = useState("");      // § 7150(b)(4) systematic-observation / sensitive-location profiling trigger
  const [q5cShareRev, setQ5cShareRev] = useState("");        // R1a: § 1798.140(d)(1)(C) / § 7120(b)(1) 50%-revenue prong
  // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand: consumers/households
  // whose PI is bought, sold, or shared annually. Optional; unanswered flows
  // to information_needed via the (B)-gap gate.
  const [bssCount, setBssCount] = useState("");
  const [q15bUnder16, setQ15bUnder16] = useState("");        // § 7001(bbb) under-16 actual-knowledge -> SPI elevation
  const [q15cSpiVolume, setQ15cSpiVolume] = useState("");    // R1a: § 7120(b)(2)(B) SPI volume band
  const [q18bTraining, setQ18bTraining] = useState("");      // § 7150(b)(6) training ADMT / facial / emotion / biometric
  // DOC 157 (2026-09-03) — categorical § 7001(ddd) answer (which kind of
  // decision the ADMT makes) and the § 7001(ddd)(2) housing basis.
  const [q19aDecisionCategories, setQ19aDecisionCategories] = useState<string[]>([]);
  const [q19bHousingBasis, setQ19bHousingBasis] = useState("");
  const [i1bMinPi, setI1bMinPi] = useState("");              // § 7152(a)(2) minimum PI necessary
  // ── RK3-A1 (Intake Contract v2.0 §1, doc 31 §2c) — § 7152(a)(3)(A)
  // processing record. `processing_methods` is the CANONICAL structured
  // record of the planned methods for collecting, using, disclosing,
  // retaining, and otherwise processing PI ("N/A" where a stage does not
  // occur). entry_point and result are EUP support facts that orient the
  // Spine 4.3 §II.A operational narrative. ───────────────────────────────
  const [processingEntryPoint, setProcessingEntryPoint] = useState("");
  const [processingMethods, setProcessingMethods] = useState<{ collection_method: string; use_method: string; disclosure_method: string; retention_method: string; other_processing_method: string }>({ collection_method: "", use_method: "", disclosure_method: "", retention_method: "", other_processing_method: "" });
  const [processingResult, setProcessingResult] = useState("");
  // RK3-A1 g2 — § 7152(a)(3)(C) interaction method + purpose,
  // § 7152(a)(3)(D) approximate CA consumers (number or stated range).
  const [consumerInteractionMethod, setConsumerInteractionMethod] = useState("");
  const [consumerInteractionPurpose, setConsumerInteractionPurpose] = useState("");
  const [approximateCaConsumers, setApproximateCaConsumers] = useState("");
  // RK3-A1 g3 — § 7152(a)(3)(B) CANONICAL per-category retention record.
  // One row per activity-specific PI category: a period, or the criteria
  // that determine it when the period is unknown. i2_* stays the overall
  // summary; this matrix is the record the report renders (Spine 4.3 App. A).
  const [retentionByPiCategory, setRetentionByPiCategory] = useState<{ pi_category: string; retention_period: string; retention_criteria: string }[]>([
    { pi_category: "", retention_period: "", retention_criteria: "" },
  ]);
  // RK3-A1 g4 — § 7152(a)(3)(E) CANONICAL activity-disclosure record: what
  // consumers were or will be told about THIS processing and how. The
  // i4_disclosure_mechanisms pills stay as the mechanism summary.
  const [activityDisclosures, setActivityDisclosures] = useState<{ disclosure_content: string; disclosure_method: string; status: string; timing_or_location: string }[]>([
    { disclosure_content: "", disclosure_method: "", status: "", timing_or_location: "" },
  ]);
  // RK3-A1 g5 — § 7152(a)(3)(F) CANONICAL recipient record. One row per
  // recipient: name-or-category, type (the type matters: disclosure to a
  // third party for its own use is a sale/share), PI categories made
  // available, and the purpose of the disclosure. Explicit-None follows the
  // exceptions_intake emptyIsAnswer pattern: the declared toggle emits []
  // as a substantive negative answer. i6_vendors stays the legacy summary.
  const [recipientRows, setRecipientRows] = useState<{ recipient_name_or_category: string; recipient_type: string; pi_categories_made_available: string[]; disclosure_purpose: string; contractual_protections: string }[]>([
    { recipient_name_or_category: "", recipient_type: "", pi_categories_made_available: [], disclosure_purpose: "", contractual_protections: "" },
  ]);
  const [recipientsNoneDeclared, setRecipientsNoneDeclared] = useState(false);
  // RK3-A1 g6 — § 7152(a)(4) benefit gates: the customer is never forced to
  // invent a benefit. "No" is a substantive answer ("no distinct benefit
  // identified" for that class); unanswered stays "" (omission over
  // invention). "Yes" requires the statement + supporting fact.
  const [benefitBusinessIdentified, setBenefitBusinessIdentified] = useState("");
  const [benefitConsumerIdentified, setBenefitConsumerIdentified] = useState("");
  const [benefitOtherStakeholdersIdentified, setBenefitOtherStakeholdersIdentified] = useState("");
  const [benefitPublicIdentified, setBenefitPublicIdentified] = useState("");
  // RK3-A1 g6 — § 7151 operational-participation record: employees whose job
  // duties include participating in the covered processing were included in
  // the assessment process. Distinct from the § 7152(a)(8) provider list.
  const [sectionParticipants, setSectionParticipants] = useState<{ name: string; role: string; processing_responsibility: string; participation_confirmed: boolean }[]>([
    { name: "", role: "", processing_responsibility: "", participation_confirmed: false },
  ]);
  // ── ITEM 305 — analytic-deliverable intake state ───────────────────
  const [a2NecessitySet, setA2NecessitySet] = useState<{ element: string; necessity: string; justification: string }[]>([
    { element: "", necessity: "", justification: "" },
  ]);
  const [a4BenefitBusiness, setA4BenefitBusiness] = useState("");
  const [a4BenefitConsumer, setA4BenefitConsumer] = useState("");
  const [a4BenefitOtherStakeholders, setA4BenefitOtherStakeholders] = useState("");
  const [a4BenefitPublic, setA4BenefitPublic] = useState("");
  // UPGRADE-2 (ITEM 4) — the record fact that supports each stated benefit.
  // § 7152(a)(4) benefits are weighed, not asserted; without a supporting
  // fact the weighing reserves rather than concluding.
  const [a4BenefitBusinessFact, setA4BenefitBusinessFact] = useState("");
  const [a4BenefitConsumerFact, setA4BenefitConsumerFact] = useState("");
  const [a4BenefitOtherStakeholdersFact, setA4BenefitOtherStakeholdersFact] = useState("");
  const [a4BenefitPublicFact, setA4BenefitPublicFact] = useState("");
  // UPGRADE-2 (ITEM 4) — the pathway triple (data / actor / route) and the
  // per-safeguard residual-risk statement required by § 7152(a)(5)-(6).
  const [a5HarmPathways, setA5HarmPathways] = useState<{ harm: string; data_involved: string; actor: string; source: string; cause: string; likelihood: string; severity: string }[]>([
    { harm: "", data_involved: "", actor: "", source: "", cause: "", likelihood: "", severity: "" },
  ]);
  const [a6Safeguards, setA6Safeguards] = useState<{ harm: string; safeguard: string; safeguard_status: string; residual: string; risk_pathway_ids: string[]; effectiveness_basis: string; planned_timeline: string }[]>([
    { harm: "", safeguard: "", safeguard_status: "", residual: "", risk_pathway_ids: [], effectiveness_basis: "", planned_timeline: "" },
  ]);
  // RK3-A3 g1 — harm-category review-status tracker (EUP internal QA, never printed)
  const [harmCategoryReviewStatus, setHarmCategoryReviewStatus] = useState<Record<string, string>>({});
  // RK3-A3 g3 — finalization stage state (doc 31 §3 — NEW-F fields)
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalProcessingDecision, setFinalProcessingDecision] = useState("");
  const [finalProcessingDecisionNotes, setFinalProcessingDecisionNotes] = useState("");
  const [assessmentReviewersApprovers, setAssessmentReviewersApprovers] = useState<{ name: string; position: string; role: string }[]>([
    { name: "", position: "", role: "" },
  ]);
  const [approverAuthorityConfirmed, setApproverAuthorityConfirmed] = useState("");
  const [approverAuthorityBasis, setApproverAuthorityBasis] = useState("");
  const [finalizationFollowUpResolved, setFinalizationFollowUpResolved] = useState("");
  const [a9ApproverName, setA9ApproverName] = useState("");
  const [a9ApproverPosition, setA9ApproverPosition] = useState("");
  const [a9ApprovalDate, setA9ApprovalDate] = useState("");
  // § 7152(a)(8) — who provided the information in the assessment.
  const [a8InformationProviders, setA8InformationProviders] = useState("");
  const [i4bSources, setI4bSources] = useState("");          // § 7152(a)(3) sources of the PI

  // TURN 1b — CPPA-STANDARD-SETTER intake additions:
  //   • publicPrivacyPolicyUrl — optional URL rendered as a record anchor
  //     in submission_summary and attestation_block. Not a source of facts.
  //   • sensitiveLocationBasis — TURN 1c (2026-08-26): a direct Yes/No
  //     question on the statute's actual element (inference FROM presence
  //     at a sensitive location), not a location-type picker. "Yes"
  //     engages the § 7150(b)(5) trigger via computeIntakeSelectedSubsections()
  //     (deterministic resolver); any other value does not.
  const [publicPrivacyPolicyUrl, setPublicPrivacyPolicyUrl] = useState("");
  const [sensitiveLocationBasis, setSensitiveLocationBasis] = useState("");

  // ITEM 275 — REDESIGN STEP 1: primary-activity identification + the
  // § 7156(a) comparable-set fork. The tool NEVER green-lights bundling;
  // divergence answers only surface the comparable-set standard and reserve
  // the determination to the user and their counsel.
  const [primaryActivityName, setPrimaryActivityName] = useState("");
  const [primaryActivityPurpose, setPrimaryActivityPurpose] = useState("");
  const [hasSecondaryUses, setHasSecondaryUses] = useState("");
  const [secondaryActivities, setSecondaryActivities] = useState<SecondaryActivity[]>([]);

  // ── RK3-D (doc 33 D-L3) — Class C→B conversion operands. One grouped state
  // object (the impactData pattern): each answer is a typed fact the report's
  // factor engine consumes through a ratified determination table; the enum
  // carries the judgment, the table carries the law. ────────────────────────
  type Rk3dOperands = {
    purpose_specificity_facts: string[];
    out_of_scope_confirmation: string;
    out_of_scope_activities: string;
    comparable_processing_status: string;
    comparable_processing_basis: string;
    consumer_relationship_context: string;
    source_categories: string[];
    vendor_dependency: string;
    essential_vendors: string;
    expectation_check: string[];
    choice_architecture_check: string[];
    admt_role_type: string;
    admt_logic_documented: string;
    human_review_facts: string[];
    admt_testing_facts: string[];
    risk_interdependency_check: string;
    compounding_pathways: string[];
    benefit_business_magnitude_basis: string;
    benefit_consumer_magnitude_basis: string;
    benefit_other_stakeholders_magnitude_basis: string;
    benefit_public_magnitude_basis: string;
  };
  const RK3D_EMPTY: Rk3dOperands = {
    purpose_specificity_facts: [],
    out_of_scope_confirmation: "",
    out_of_scope_activities: "",
    comparable_processing_status: "",
    comparable_processing_basis: "",
    consumer_relationship_context: "",
    source_categories: [],
    vendor_dependency: "",
    essential_vendors: "",
    expectation_check: [],
    choice_architecture_check: [],
    admt_role_type: "",
    admt_logic_documented: "",
    human_review_facts: [],
    admt_testing_facts: [],
    risk_interdependency_check: "",
    compounding_pathways: [],
    benefit_business_magnitude_basis: "",
    benefit_consumer_magnitude_basis: "",
    benefit_other_stakeholders_magnitude_basis: "",
    benefit_public_magnitude_basis: "",
  };
  const [rk3d, setRk3d] = useState<Rk3dOperands>(RK3D_EMPTY);
  const setRk3dField = <K extends keyof Rk3dOperands>(k: K, v: Rk3dOperands[K]) =>
    setRk3d((prev) => ({ ...prev, [k]: v }));


  // Improvement Kit (Doc N R1): parallel assertion map only — never
  // mutates existing field values. When flag off or designated list
  // empty, this stays empty and is omitted from intake_data.
  const [assertions, setAssertions] = useState<AssertionMap>({});

  /**
   * Render the AssertionLevel control under a designated evidence-heavy
   * question. Returns null when the flag is off OR the field is not in
   * the designated list (Katherine P4). Callers embed as:
   *   {renderAssertion("i6_vendors")}
   */
  const renderAssertion = (fieldId: string) => {
    if (!IMPROVEMENT_KIT_ENABLED) return null;
    if (!IMPROVEMENT_KIT_DESIGNATED_FIELDS.includes(fieldId)) return null;
    return (
      <AssertionLevel
        fieldId={fieldId}
        value={assertions[fieldId]}
        onChange={(next) => {
          setAssertions((prev) => {
            const copy = { ...prev };
            if (next === undefined) {
              delete copy[fieldId];
            } else {
              copy[fieldId] = next;
            }
            return copy;
          });
        }}
      />
    );
  };


  const totalSteps = 8; // 7 input stages + summary

  // ADMT trigger fires when § 7150(b)(3) or (b)(6) implicated.
  // From Step 5: q18 === "Yes".
  const admtTriggered = q18 === "Yes" || q18 === "In evaluation";
  // DOC 157 (2026-09-03) — the categorical § 7001(ddd) block, rendered under
  // the ADMT description and, for a trained-but-not-used model, under q18b.
  const renderDecisionCategoryBlock = (stem: string) => (
    <div className="mt-3" data-rail-key="q19a_decision_categories" onFocus={() => focusRail('q19a_decision_categories')}>
      <Label>{stem} <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(ddd))</span></Label>
      <p className="text-xs text-muted-foreground mt-1">Select every category that applies. A "significant decision" is one "that results in the provision or denial of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services"; it "does not include advertising to a consumer." "None of these categories" and "Advertising only" are complete answers.</p>
      <div className="mt-2"><Pills options={[...SIGNIFICANT_DECISION_CATEGORY_OPTS]} value={q19aDecisionCategories} onChange={(v: string[]) => setQ19aDecisionCategories(v)} /></div>
      {q19aDecisionCategories.includes(SIGNIFICANT_DECISION_CATEGORY_OPTS[1]) && (
        <div className="mt-3">
          <Label className="text-sm">Is the housing decision based solely on the availability or vacancy of the housing, or on the successful receipt of payment for it? <Req /> <span className="text-xs text-muted-foreground font-mono">(§ 7001(ddd)(2))</span></Label>
          <p className="text-xs text-muted-foreground mt-1">Under § 7001(ddd)(2), "the use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision."</p>
          <div className="mt-2"><Radio name="q19b_housing_basis" options={[...HOUSING_DECISION_BASIS_OPTS]} value={q19bHousingBasis} onChange={setQ19bHousingBasis} /></div>
        </div>
      )}
    </div>
  );

  const [activeRiskRailKey, setActiveRiskRailKey] = useState<string | null>(null);
  const activeRiskRailEntry: RailEntry | null = activeRiskRailKey ? (CPPA_RISK_RAIL[activeRiskRailKey] ?? null) : null;
  const focusRail = (key: string) => setActiveRiskRailKey(key);

  // Default rail entry for the first question on each step — updates the rail
  // automatically when the user advances/goes back, so it never shows stale
  // guidance from the previous page.
  const STEP_DEFAULT_RAIL_KEY: Record<number, string | null> = {
    1: "primary_activity",
    2: "q1_revenue",
    3: "q4_pi_categories",
    4: "i1b_min_pi",
    5: "impact_harm_causes",
    6: "impact_benefits",
    7: "a8_information_providers",
  };
  useEffect(() => {
    setActiveRiskRailKey(STEP_DEFAULT_RAIL_KEY[step] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Update the active rail entry as the user scrolls up/down the form.
  useScrollActiveRail(setActiveRiskRailKey, [step]);

  const enforcementSignals = useEnforcementSignals(["sell_share", "opt_out_link", "sensitive_pi"]);

  // PHASE 2 corpus program (2026-08-22, doc 49 A.2.3(b)) — the FSOR
  // callouts are PINNED constants now (CPPARiskFsorCallouts.ts, parity-
  // tested against the Risk CAM), not a live unpinned fetch. Same three
  // callouts render as before; "11 CCR § 7156(a)" never had a view row
  // and never rendered, so nothing is lost by dropping the request.
  const fscrCallouts = CPPA_RISK_FSOR_CALLOUTS;

  // Regulatory footprint — derived deterministically from current answers.
  // Updates in real time as the user fills in the form.
  const regulatoryFootprint = useMemo(() => {
    const items: { citation: string; label: string; triggered: boolean; note?: string }[] = [
      {
        citation: "11 CCR § 7150(b)(1)",
        label: "Risk assessment required — sell/share activities",
        triggered: ["Yes — sell only", "Yes — share for advertising only", "Both"].includes(q5),
      },
      {
        citation: "11 CCR § 7150(b)(2)",
        label: "Risk assessment required — sensitive PI processing",
        // PN-CORPUS-L-RISK-1 — the § 7150(b)(2)(A) personnel carve-out
        // removes solely-personnel-purposes SPI processing from this
        // trigger; mirrors the deterministic gate in gate-eval.ts.
        triggered: (q15 === "Yes" || q4.some((c) => SENSITIVE_PI_CATEGORIES.has(c))) &&
          q15dHrCarveout !== "Yes — solely for those personnel purposes",
      },
      // ITEM 275 BUILD 3 — six-prong realignment. (b)(3) and (b)(6) are
      // separate prongs with separate triggers; (b)(4) and (b)(5) were absent.
      {
        citation: "11 CCR § 7150(b)(3)",
        label: "Risk assessment required — ADMT for a significant decision",
        triggered: q18 === "Yes" || q18 === "In evaluation",
      },
      {
        citation: "11 CCR § 7150(b)(4)",
        label: "Risk assessment required — systematic-observation inference (work or education context)",
        // TURN 1d (2026-08-26) — q5b is now a direct Yes/No on the (b)(4)
        // inference-from-systematic-observation element.
        triggered: q5bProfiling === "Yes",
      },
      {
        citation: "11 CCR § 7150(b)(5)",
        label: "Risk assessment required — sensitive-location inference",
        // TURN 1c/1d (2026-08-26) — this trigger resolves SOLELY from the
        // dedicated Yes/No sensitive_location_basis question. The former
        // q5b OR-clauses were the fleet-audit finding-1 loophole: they fed
        // this trigger without the inference caveat and are retired.
        triggered: sensitiveLocationBasis === "Yes",
      },
      {
        citation: "11 CCR § 7150(b)(6)",
        label: "Risk assessment required — processing to train ADMT or recognition technology",
        // DOC 157 — either "Yes" option (the relabelled second limb and the
        // retired literal both start with "Yes").
        triggered: q18bTraining.startsWith("Yes"),
      },
      {
        // Thresholds live at § 7120(b); the first-report timing cohorts live
        // at § 7121(a). The prior "§ 7122(a)" line was a stale citation.
        citation: "11 CCR §§ 7120(b), 7121(a)",
        label: "Cybersecurity audit may be required (Module 2)",
        triggered: ["$50M to $100M", "Over $100M"].includes(q1),
        note:
          q1 === "Over $100M"
            ? "First audit report due April 1, 2028 for revenue over $100M (§ 7121(a)(1))"
            : "First audit report due April 1, 2029 for revenue of $50M–$100M (§ 7121(a)(2))",
      },
      {
        citation: "Cal. Civ. Code §§ 1798.120, 1798.135(a)",
        label: "Do Not Sell or Share link required",
        triggered: ["Yes — sell only", "Yes — share for advertising only", "Both"].includes(q5),
      },
      {
        citation: "Cal. Civ. Code § 1798.140(ae)",
        label: "Sensitive PI limit right must be offered",
        triggered: q15 === "Yes",
      },
      // ITEM 275 BUILD 2(c) — comparable-set reactive line.
      // ITEM 319 ADDENDUM — DIRECTIVE POSTURE. This is a FIFTH encoding of the
      // same § 7156(a) call, not on the dispatch's list of four but visible on
      // the same screen as the helper text and the rail, so it moves with them.
      // Its trigger already matches the shipped threshold (any dimension
      // "Different" or "Not sure"); only the framing changes. Still a
      // recommendation, never "required" — see spec § 2R.5 exception.
      {
        citation: "11 CCR § 7156(a)",
        label:
          "Multiple distinct uses reported — a separate risk assessment is recommended for each use that differs or has unresolved comparison dimensions (comparable-set standard)",
        triggered:
          hasSecondaryUses === "Yes — there are other uses" &&
          secondaryActivities.some((a) =>
            Object.values(a.divergence ?? {}).some((v) => v === "Different" || v === "Not sure"),
          ),
        note: "this tool's recommendation on your record, not a statement of what the law requires",
      },

    ];
    return items.filter((i) => i.triggered);
  }, [
    q1, q4, q5, q15, q15dHrCarveout, q18, q5bProfiling, q18bTraining, sensitiveLocationBasis,
    hasSecondaryUses, secondaryActivities,
  ]);


  const stepValid = (): string | null => {
    if (step === 1) {
      if (!primaryActivityName.trim()) return "Name the processing activity you are assessing.";
      if (primaryActivityPurpose.trim().length < 10) return "Describe in one sentence what this activity does with personal information (at least 10 characters).";
      if (!hasSecondaryUses) return "Answer whether the same data is used for any other distinct purpose, product, or audience.";
      if (!entityName.trim() || !subjectAnchor.trim()) return "Give the entity name and the one-line subject of this assessment.";
      if (!q3) return "Select the sector this activity belongs to.";
      if (!i1Purpose || i1Purpose.length < 30) return "Describe the specific purpose of this processing (at least 30 characters).";
      if (!i9HasDpia) return "Answer whether an existing data protection impact assessment covers this activity.";
      if (i9HasDpia === "Yes" && !i9DpiaSummary) return "Summarise the existing impact assessment — its title, date, and scope.";
      if (!materialChangeSincePrior) return "Answer whether this activity has changed materially since the last assessment.";
      // RK3-A1 — § 7152(a)(3)(A) processing record (form-required for new
      // submissions; optional at the data layer for legacy rows).
      if (!processingEntryPoint.trim()) return "Say where personal information first enters this activity.";
      if (Object.values(processingMethods).some((v) => !v.trim())) return "Complete all five processing-method entries — write \"N/A\" for any stage that does not occur.";
      if (!processingResult.trim()) return "Say what this activity produces or supports — a decision, score, recommendation, service action, or operational outcome.";
      // RK3-D (doc 33 D-L3) — form-required for new submissions; data-layer optional.
      if (!rk3d.purpose_specificity_facts.length) return "Check what the stated purpose itself identifies — \"None of the above\" is a complete answer.";
      if (!rk3d.out_of_scope_confirmation) return "Answer whether this same information is processed for anything outside the stated purpose — \"Unsure\" is a complete answer.";
      if (!rk3d.comparable_processing_status) return "Answer whether this assessment covers a single activity or a set of similar activities.";
      if (hasSecondaryUses === "Yes — there are other uses") {
        const rows = secondaryActivities;
        if (rows.some((a) => !a.relation_to_primary)) return "For each other use, say how it relates to the primary purpose.";
        if (rows.some((a) => !a.disclosed_in_notice)) return "For each other use, say whether it is disclosed at or before collection.";
      }
    }
    if (step === 2) {
      if (!q1 || !q2) return "Select the revenue band and the California consumer band.";
      if (!q5) return "Answer whether you sell or share personal information.";
      if (!q5bProfiling) return "Answer the profiling question.";
      if (!q18) return "Answer whether automated decisionmaking technology is in use.";
      if ((q18 === "Yes" || q18 === "In evaluation") && !q19) return "Describe the automated decisionmaking system and the decisions it touches.";
      // DOC 157 — the categorical § 7001(ddd) answer is required whenever the
      // ADMT questions are open, and when q18b names significant-decision
      // training for a model that is not itself in use.
      if ((admtTriggered || q18bTraining === "Yes — training ADMT for significant decisions") && !q19aDecisionCategories.length) return "Select which kind of decision the automated decisionmaking technology makes or will make — \"None of these categories\" is a complete answer.";
      if (q19aDecisionCategories.includes(SIGNIFICANT_DECISION_CATEGORY_OPTS[1]) && !q19bHousingBasis) return "Answer whether the housing decision is based solely on availability, vacancy, or receipt of payment.";
      if (q18 === "Yes" && !q20) return "Answer whether consumers can opt out of the automated decisionmaking.";
      if (!q18bTraining) return "Answer whether personal information is processed to train automated decisionmaking or recognition technology.";
      if (admtTriggered && (!i5AdmtLogic || !i5AdmtHumanReview)) return "Describe the automated decisionmaking logic and the human review process.";
      // RK3-D (doc 33 D-L3) — typed ADMT operands, required when ADMT applies.
      if (admtTriggered) {
        if (!rk3d.admt_role_type) return "Classify the ADMT's role in the decision — \"Unsure\" is a complete answer.";
        if (!rk3d.admt_logic_documented) return "Say how the ADMT's logic is documented — \"Unsure\" is a complete answer.";
        if (!rk3d.human_review_facts.length) return "Select what can be confirmed about the human review — \"There is no human review\" is a complete answer.";
        if (!rk3d.admt_testing_facts.length) return "Select what describes the ADMT's testing record — \"No testing has been performed or confirmed\" is a complete answer.";
      }
      if (!q6Multi.length || !q7 || !q8 || !q9 || !q10) return "Complete the consumer-rights answers.";
      // RK3-D (doc 33 D-L3) — choice-architecture confirmations.
      if (!rk3d.choice_architecture_check.length) return "Select what you can confirm about how consumers are asked to permit the processing — \"None of the above can be confirmed\" is a complete answer.";
    }
    if (step === 3) {
      if (!q4.length) return "Select the categories of personal information this activity processes.";
      if (!q15) return "Answer whether sensitive personal information is processed.";
      if (q15 === "Yes" && (!q16 || !q17 || !q15dHrCarveout)) return "Complete the sensitive personal information follow-ups.";
      if (!q15bUnder16) return "Answer whether you have actual knowledge of processing under-16 consumers' data.";
      if (!i4bSources) return "Identify where this personal information comes from.";
      if (!i3CaConsumerBand) return "Select the approximate California consumer band for this activity.";
      // RK3-A1 g2 — § 7152(a)(3)(C)/(D) (form-required; data-layer optional).
      if (!consumerInteractionMethod) return "Select how your business interacts with the consumers this activity affects.";
      if (!consumerInteractionPurpose.trim()) return "Say why the consumer interacts with your business in this context.";
      if (!approximateCaConsumers.trim()) return "Give the approximate number of California consumers — a number or a range.";
      if (!i6Vendors) return "List the service providers, contractors, or third parties involved — or write \"None\".";
      if (!q11 || !q12 || !q13 || !q14) return "Complete the privacy-notice answers.";
      if (!i4Disclosures.length) return "Select at least one disclosure mechanism, or \"No standalone disclosure\".";
      // RK3-A1 g4 — § 7152(a)(3)(E): each disclosure row needs content,
      // method, and Made/Planned status (form-required; data-layer optional).
      {
        const rows = activityDisclosures.filter((r) => r.disclosure_content.trim() || r.disclosure_method || r.status);
        if (rows.length === 0) return "Record at least one disclosure — what consumers are or will be told about this activity and how.";
        if (rows.some((r) => !r.disclosure_content.trim())) return "Every disclosure row needs the content — what consumers are or will be told.";
        if (rows.some((r) => !r.disclosure_method)) return "Every disclosure row needs a method — how the disclosure is or will be made.";
        if (rows.some((r) => !r.status)) return "Mark each disclosure as Made or Planned.";
      }
      // RK3-A1 g5 — § 7152(a)(3)(F): recipient rows, or the explicit
      // no-recipients declaration (form-required; data-layer optional).
      if (!recipientsNoneDeclared) {
        const rows = recipientRows.filter((r) => r.recipient_name_or_category.trim() || r.recipient_type || r.pi_categories_made_available.length || r.disclosure_purpose.trim());
        if (rows.length === 0) return "Add at least one recipient — or check the box declaring that no service provider, contractor, or third party receives this information.";
        if (rows.some((r) => !r.recipient_name_or_category.trim())) return "Every recipient row needs a name or category.";
        if (rows.some((r) => !r.recipient_type)) return "Classify each recipient: service provider, contractor, or third party.";
        if (rows.some((r) => !r.pi_categories_made_available.length)) return "Select the personal-information categories made available to each recipient.";
        if (rows.some((r) => !r.disclosure_purpose.trim())) return "State the purpose of the disclosure to each recipient.";
        // RK3-D (doc 33 D-L3) — per-row contractual protections.
        if (rows.some((r) => !r.contractual_protections)) return "Select the contractual-protection status for each recipient — \"Unsure\" is a complete answer.";
      }
      // RK3-D (doc 33 D-L3) — sources, relationship, expectations, vendor dependency.
      if (!rk3d.source_categories.length) return "Select the source categories this information comes through.";
      if (!rk3d.consumer_relationship_context) return "Say who the affected consumers are in relation to your business.";
      if (!rk3d.expectation_check.length) return "Select which processing facts apply — \"None of the above apply\" is a complete answer.";
      if (!rk3d.vendor_dependency) return "Answer whether any recipient or vendor is essential to the processing — \"Unsure\" is a complete answer.";
    }
    if (step === 4) {
      if (!i1bMinPi || i1bMinPi.length < 20) return "State the minimum personal information necessary for this purpose.";
      if (!i2RetentionPeriod || !i2RetentionCriteria) return "Give a retention period and the criteria that set it.";
      // RK3-A1 g3 — § 7152(a)(3)(B): each row needs a category plus a period
      // or the criteria that determine it (form-required; data-layer optional).
      {
        const rows = retentionByPiCategory.filter((r) => r.pi_category || r.retention_period.trim() || r.retention_criteria);
        if (rows.length === 0) return "Add at least one per-category retention row — the categories this activity processes each need a retention period or the criteria that determine it.";
        if (rows.some((r) => !r.pi_category)) return "Every retention row needs a personal-information category.";
        if (rows.some((r) => !r.retention_period.trim() && !r.retention_criteria)) return "Every retention row needs a period — or, if the period is unknown, the criteria that determine it.";
      }
    }
    if (step === 5) {
      // RK3-D (doc 33 D-L3) — pathway interdependency + per-safeguard-row
      // typed operands (form-required for new submissions; data-layer optional).
      const a5rows = a5HarmPathways.filter((r) => r.harm);
      if (a5rows.length && !rk3d.risk_interdependency_check) return "Answer whether the identified impacts operate independently or could compound each other — \"Unsure\" is a complete answer.";
      if (rk3d.risk_interdependency_check === "Two or more identified pathways could compound each other" && rk3d.compounding_pathways.length < 2) {
        return "Select at least two pathways that could compound each other.";
      }
      const a6rows = a6Safeguards.filter((r) => r.harm && (r.safeguard.trim() || r.safeguard_status));
      if (a6rows.some((r) => !r.effectiveness_basis)) return "Select the effectiveness evidence for each safeguard — \"No effectiveness evidence\" is a complete answer.";
      if (a6rows.some((r) => r.safeguard_status === "Planned, not yet implemented" && !r.planned_timeline)) return "Give the committed timeline for each planned safeguard — \"No committed timeline\" is a complete answer.";
    }
    if (step === 6) {
      // RK3-A1 g6 — § 7152(a)(4) benefit gates: every class answered; "Yes"
      // requires the statement and its supporting fact. Never force a benefit.
      const gates: [string, string, string, string, string][] = [
        [benefitBusinessIdentified, a4BenefitBusiness, a4BenefitBusinessFact, rk3d.benefit_business_magnitude_basis, "business"],
        [benefitConsumerIdentified, a4BenefitConsumer, a4BenefitConsumerFact, rk3d.benefit_consumer_magnitude_basis, "consumer"],
        [benefitOtherStakeholdersIdentified, a4BenefitOtherStakeholders, a4BenefitOtherStakeholdersFact, rk3d.benefit_other_stakeholders_magnitude_basis, "other-stakeholder"],
        [benefitPublicIdentified, a4BenefitPublic, a4BenefitPublicFact, rk3d.benefit_public_magnitude_basis, "public"],
      ];
      for (const [gate, text, fact, basis, label] of gates) {
        if (!gate) return `Answer whether a distinct ${label} benefit is identified — "No" is a complete answer.`;
        if (gate === "Yes" && !text.trim()) return `Describe the ${label} benefit you identified.`;
        if (gate === "Yes" && !fact.trim()) return `Give the fact in the record supporting the ${label} benefit.`;
        // RK3-D (doc 33 D-L3) — magnitude basis; "No basis stated" is a complete answer.
        if (gate === "Yes" && !basis) return `Say what kind of basis the ${label} benefit statement gives for its size — "No basis stated" is a complete answer.`;
      }
    }
    if (step === 7) {
      if (!i7InternalContributors) return "List the internal contributor roles — or write \"None\".";
      // RK3-A1 g6 — § 7151: the participation record needs at least one
      // complete, confirmed row (form-required; data-layer optional).
      {
        const rows = sectionParticipants.filter((r) => r.name.trim() || r.role.trim() || r.processing_responsibility.trim());
        if (rows.length === 0) return "Record the employees whose job duties include participating in this processing — § 7151 requires their inclusion in the assessment process.";
        if (rows.some((r) => !r.name.trim() || !r.role.trim())) return "Every participation row needs a name and a role or title.";
        if (rows.some((r) => !r.processing_responsibility.trim())) return "State each participant's responsibility in the processing.";
        if (rows.some((r) => !r.participation_confirmed)) return "Confirm each listed employee's participation in the assessment process.";
      }
      if (!i8ExecName || !i8ExecTitle) return "Give the certifying executive's name and title.";
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) { setValidationError(err); return; }
    // Mid-intake account gate: anonymous visitors stop one step before the
    // summary (2026-09-04 policy). Answers survive the signup round-trip in
    // sessionStorage via useToolDraft's anonymous capture.
    if (!user && step + 1 === totalSteps - 1) { setAuthGateOpen(true); return; }
    setValidationError(null);
    setStep((s) => s + 1);
  };
  const back = () => { setValidationError(null); setStep((s) => Math.max(1, s - 1)); };


  const intake = useMemo(() => ({
    entity_name: entityName.trim(),
    subject_anchor: subjectAnchor.trim(),
    // ITEM 275 — primary activity + § 7156(a) comparable-set fork.
    // Skip-tolerance: unnamed secondary rows get a positional placeholder and
    // unanswered divergence comparisons default to "Not sure".
    primary_activity_name: primaryActivityName.trim(),
    primary_activity_purpose: primaryActivityPurpose.trim(),
    has_secondary_uses: hasSecondaryUses,
    secondary_activities:
      hasSecondaryUses === "Yes — there are other uses"
        ? secondaryActivities.map((a, idx) => ({
            name: a.name.trim() || `Additional use #${idx + 1} (not described)`,
            purpose: a.purpose.trim(),
            divergence: Object.fromEntries(
              DIVERGENCE_DIMENSIONS.map((d) => [d.key, a.divergence?.[d.key] || "Not sure"]),
            ),
            // RK3-D (doc 33 D-L3) — per-row secondary-use operands.
            relation_to_primary: a.relation_to_primary || undefined,
            disclosed_in_notice: a.disclosed_in_notice || undefined,
          }))
        : [],
    // legacy keys preserved

    q1_revenue: q1, q2_consumers: q2, q3_sector: q3, q4_pi_categories: q4, q5_sell_share: q5,
    q6_right_know: q6Multi.join("; "), q6_right_know_multi: q6Multi, q7_right_delete: q7, q8_right_correct: q8, q9_opt_out: q9, q10_id_verification: q10,
    q11_policy_review: q11, q12_notice_at_collection: q12, q13_notice_content: q13, q14_employee_notice: q14,
    q15_sensitive_pi: q15, q16_sensitive_limit: q16, q17_sensitive_basis: q17,
    q15d_hr_carveout: q15dHrCarveout,
    q18_admt_use: q18, q19_admt_description: q19, q20_admt_opt_out: q20,
    // new § 7152 elements
    q5b_profiling_observation: q5bProfiling,
    q5c_share_revenue_50pct: q5cShareRev,           // R1a
    // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand.
    bought_sold_shared_count: bssCount,
    q15b_under16_knowledge: q15bUnder16,
    q15c_spi_volume: q15cSpiVolume,                 // R1a
    q18b_admt_training: q18bTraining,
    // DOC 157 — categorical § 7001(ddd) answer; q19b undefined when blank.
    q19a_decision_categories: q19aDecisionCategories,
    q19b_housing_basis: q19bHousingBasis || undefined,
    i1b_min_pi: i1bMinPi,
    i4b_sources: i4bSources,
    // RK3-A1 — § 7152(a)(3)(A) processing record (Intake Contract v2.0 §1).
    processing_entry_point: processingEntryPoint.trim(),
    processing_methods: processingMethods,
    processing_result: processingResult.trim(),
    // RK3-A1 g2 — § 7152(a)(3)(C)/(D) interaction + scale.
    consumer_interaction_method: consumerInteractionMethod,
    consumer_interaction_purpose: consumerInteractionPurpose.trim(),
    approximate_ca_consumers: approximateCaConsumers.trim(),
    // RK3-A1 g3 — § 7152(a)(3)(B) canonical per-category retention record.
    // Rows without a category are dropped (the builder degrades honestly).
    retention_by_pi_category: retentionByPiCategory.filter((r) => r.pi_category),
    // RK3-A1 g4 — § 7152(a)(3)(E) canonical activity-disclosure record.
    activity_disclosures: activityDisclosures.filter((r) => r.disclosure_content.trim()),
    // RK3-A1 g5 — § 7152(a)(3)(F) canonical recipient record. Explicit-None
    // emits [] (emptyIsAnswer) with the declared flag alongside it.
    recipients: recipientsNoneDeclared ? [] : recipientRows.filter((r) => r.recipient_name_or_category.trim()),
    recipients_none_declared: recipientsNoneDeclared,
    // RK3-A1 g6 — § 7152(a)(4) benefit gates ("No" = no distinct benefit
    // identified; "" = unanswered) + § 7151 participation record.
    benefit_business_identified: benefitBusinessIdentified,
    benefit_consumer_identified: benefitConsumerIdentified,
    benefit_other_stakeholders_identified: benefitOtherStakeholdersIdentified,
    benefit_public_identified: benefitPublicIdentified,
    section_7151_operational_participants: sectionParticipants.filter((r) => r.name.trim()),
    // TURN 1b — new intake fields (flow through submission_summary + § 7150(b)(5) resolver).
    public_privacy_policy_url: publicPrivacyPolicyUrl.trim(),
    sensitive_location_basis: sensitiveLocationBasis,
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
    material_change_since_prior: materialChangeSincePrior,
    // RK3-A2 g1 — § RAF 7155 timing; undefined when blank so legacy rows stay valid
    processing_status: processingStatus || undefined,
    processing_start_date: processingStartDate || undefined,
    planned_start_date: plannedStartDate || undefined,
    prior_risk_assessment_date: priorRiskAssessmentDate || undefined,
    material_change_date: materialChangeDate || undefined,
    material_change_description: materialChangeDescription || undefined,
    // RK3-A2 g4 — PN-RK7 SPI employment-exception facts; undefined when blank
    spi_employment_exception_facts: spiEmploymentExceptionFacts || undefined,
    // RK3-A2 g3 — § 7153 branch; undefined when blank
    admt_made_available_to_other_business: admtMadeAvailableToOtherBusiness || undefined,
    admt_provider_trained_using_pi: admtProviderTrainedUsingPi || undefined,
    recipient_business_uses_admt_for_significant_decision: recipientBusinessUsesAdmtForSignificantDecision || undefined,
    // RK3-A2 g2 — § 7152(a)(3)(G) ADMT branch extensions; undefined when blank
    admt_operational_role: admtOperationalRole || undefined,
    admt_assumptions_limitations: admtAssumptionsLimitations || undefined,
    admt_output: admtOutput || undefined,
    admt_output_use: admtOutputUse || undefined,
    admt_consumer_effect: admtConsumerEffect || undefined,
    exceptions_intake: exceptionClaims,
    impact_intake: impactData,
    // ITEM 305 — operands of the five per-activity analytic deliverables.
    // Empty rows are dropped so the builder degrades honestly rather than
    // receiving blank records it would have to treat as answered.
    a2_necessity_set: a2NecessitySet.filter((r) => r.element.trim() || r.necessity),
    a4_benefit_business: a4BenefitBusiness.trim(),
    a4_benefit_consumer: a4BenefitConsumer.trim(),
    a4_benefit_other_stakeholders: a4BenefitOtherStakeholders.trim(),
    a4_benefit_public: a4BenefitPublic.trim(),
    a4_benefit_business_fact: a4BenefitBusinessFact.trim(),
    a4_benefit_consumer_fact: a4BenefitConsumerFact.trim(),
    a4_benefit_other_stakeholders_fact: a4BenefitOtherStakeholdersFact.trim(),
    a4_benefit_public_fact: a4BenefitPublicFact.trim(),
    a5_harm_pathways: a5HarmPathways.filter((r) => r.harm),
    a6_safeguards: a6Safeguards.filter((r) => r.harm && (r.safeguard.trim() || r.safeguard_status)),
    harm_category_review_status: Object.keys(harmCategoryReviewStatus).length
      ? HARM_PATHWAY_OPTS.map((cat) => ({ harm_category: cat, review_status: harmCategoryReviewStatus[cat] || "" })).filter((r) => r.review_status)
      : undefined,
    a9_approver_name: a9ApproverName.trim(),
    a9_approver_position: a9ApproverPosition.trim(),
    a9_approval_date: a9ApprovalDate,
    a8_information_providers: a8InformationProviders.trim(),
    // RK3-D (doc 33 D-L3) — Class C→B operands; blank/empty answers emit
    // undefined so legacy semantics are preserved and the record-complete
    // gate reads honest absence, never a defaulted answer.
    purpose_specificity_facts: rk3d.purpose_specificity_facts.length ? rk3d.purpose_specificity_facts : undefined,
    out_of_scope_confirmation: rk3d.out_of_scope_confirmation || undefined,
    out_of_scope_activities: rk3d.out_of_scope_activities.trim() || undefined,
    comparable_processing_status: rk3d.comparable_processing_status || undefined,
    comparable_processing_basis: rk3d.comparable_processing_basis.trim() || undefined,
    consumer_relationship_context: rk3d.consumer_relationship_context || undefined,
    source_categories: rk3d.source_categories.length ? rk3d.source_categories : undefined,
    vendor_dependency: rk3d.vendor_dependency || undefined,
    essential_vendors: rk3d.essential_vendors.trim() || undefined,
    expectation_check: rk3d.expectation_check.length ? rk3d.expectation_check : undefined,
    choice_architecture_check: rk3d.choice_architecture_check.length ? rk3d.choice_architecture_check : undefined,
    admt_role_type: rk3d.admt_role_type || undefined,
    admt_logic_documented: rk3d.admt_logic_documented || undefined,
    human_review_facts: rk3d.human_review_facts.length ? rk3d.human_review_facts : undefined,
    admt_testing_facts: rk3d.admt_testing_facts.length ? rk3d.admt_testing_facts : undefined,
    risk_interdependency_check: rk3d.risk_interdependency_check || undefined,
    compounding_pathways: rk3d.compounding_pathways.length ? rk3d.compounding_pathways : undefined,
    benefit_business_magnitude_basis: rk3d.benefit_business_magnitude_basis || undefined,
    benefit_consumer_magnitude_basis: rk3d.benefit_consumer_magnitude_basis || undefined,
    benefit_other_stakeholders_magnitude_basis: rk3d.benefit_other_stakeholders_magnitude_basis || undefined,
    benefit_public_magnitude_basis: rk3d.benefit_public_magnitude_basis || undefined,
    // Improvement Kit (Doc N R1): parallel assertions map, only when
    // the flag is on AND at least one designated field carries an
    // entry. Absent key = legacy semantics.
    ...(IMPROVEMENT_KIT_ENABLED && Object.keys(assertions).length > 0
      ? { assertions }
      : {}),
  }), [
    entityName, subjectAnchor,
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q15dHrCarveout, q18, q19, q20,
    q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    q19aDecisionCategories, q19bHousingBasis,
    processingEntryPoint, processingMethods, processingResult,
    consumerInteractionMethod, consumerInteractionPurpose, approximateCaConsumers,
    retentionByPiCategory, activityDisclosures, recipientRows, recipientsNoneDeclared,
    benefitBusinessIdentified, benefitConsumerIdentified, benefitOtherStakeholdersIdentified, benefitPublicIdentified,
    sectionParticipants,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary, materialChangeSincePrior, exceptionClaims, impactData,
    processingStatus, processingStartDate, plannedStartDate, priorRiskAssessmentDate, materialChangeDate, materialChangeDescription,
    admtOperationalRole, admtAssumptionsLimitations, admtOutput, admtOutputUse, admtConsumerEffect,
    admtMadeAvailableToOtherBusiness, admtProviderTrainedUsingPi, recipientBusinessUsesAdmtForSignificantDecision,
    spiEmploymentExceptionFacts,
    a2NecessitySet, a4BenefitBusiness, a4BenefitConsumer, a4BenefitOtherStakeholders, a4BenefitPublic,
    a4BenefitBusinessFact, a4BenefitConsumerFact, a4BenefitOtherStakeholdersFact, a4BenefitPublicFact,
    a5HarmPathways, a6Safeguards, harmCategoryReviewStatus, a9ApproverName, a9ApproverPosition, a9ApprovalDate, a8InformationProviders,
    assertions,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,
    rk3d,

  ]);

  // ---- Draft autosave ------------------------------------------------------
  const draftData = useMemo(() => ({
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q15dHrCarveout, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary, materialChangeSincePrior,
    processingStatus, processingStartDate, plannedStartDate, priorRiskAssessmentDate, materialChangeDate, materialChangeDescription,
    admtOperationalRole, admtAssumptionsLimitations, admtOutput, admtOutputUse, admtConsumerEffect,
    admtMadeAvailableToOtherBusiness, admtProviderTrainedUsingPi, recipientBusinessUsesAdmtForSignificantDecision,
    spiEmploymentExceptionFacts,
    entityName, subjectAnchor, q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    processingEntryPoint, processingMethods, processingResult,
    consumerInteractionMethod, consumerInteractionPurpose, approximateCaConsumers,
    retentionByPiCategory, activityDisclosures, recipientRows, recipientsNoneDeclared,
    benefitBusinessIdentified, benefitConsumerIdentified, benefitOtherStakeholdersIdentified, benefitPublicIdentified,
    sectionParticipants,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,
    exceptionClaims, impactData, harmCategoryReviewStatus,
    finalProcessingDecision, finalProcessingDecisionNotes, q19aDecisionCategories, q19bHousingBasis,
    assessmentReviewersApprovers, approverAuthorityConfirmed, approverAuthorityBasis,
    finalizationFollowUpResolved,
    rk3d,
    // QA round two (RA-A-05, High, 2026-09-06) — the ITEM 305 / UPGRADE-2
    // analytic deliverables were never written to the draft, so Save/Resume
    // silently dropped every § 7152(a)(2)/(4)/(5)/(6) narrative while leaving
    // the Yes gates and magnitude-basis selections that depend on them
    // selected — an assessment asserting benefits whose supporting evidence
    // had vanished. The § 7152(a)(8)-(9) provider and approver fields were
    // lost the same way, which is how a recorded approver could disappear
    // between drafting and generation. Every canonical answer field in this
    // component is now in the draft; the only state left out is UI state
    // (open/step/validationError/authGateOpen/checkoutOpen/coachOpen/
    // coachSeen/finalizationOpen/activeRiskRailKey), and `step` travels
    // separately as currentStage.
    a2NecessitySet,
    a4BenefitBusiness, a4BenefitConsumer, a4BenefitOtherStakeholders, a4BenefitPublic,
    a4BenefitBusinessFact, a4BenefitConsumerFact, a4BenefitOtherStakeholdersFact, a4BenefitPublicFact,
    a5HarmPathways, a6Safeguards,
    a8InformationProviders, a9ApproverName, a9ApproverPosition, a9ApprovalDate,
    assertions,

  }), [
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q15dHrCarveout, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary, materialChangeSincePrior,
    processingStatus, processingStartDate, plannedStartDate, priorRiskAssessmentDate, materialChangeDate, materialChangeDescription,
    admtOperationalRole, admtAssumptionsLimitations, admtOutput, admtOutputUse, admtConsumerEffect,
    admtMadeAvailableToOtherBusiness, admtProviderTrainedUsingPi, recipientBusinessUsesAdmtForSignificantDecision,
    spiEmploymentExceptionFacts,
    entityName, subjectAnchor, q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    processingEntryPoint, processingMethods, processingResult,
    consumerInteractionMethod, consumerInteractionPurpose, approximateCaConsumers,
    retentionByPiCategory, activityDisclosures, recipientRows, recipientsNoneDeclared,
    benefitBusinessIdentified, benefitConsumerIdentified, benefitOtherStakeholdersIdentified, benefitPublicIdentified,
    sectionParticipants,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,
    exceptionClaims, impactData, harmCategoryReviewStatus,
    finalProcessingDecision, finalProcessingDecisionNotes, q19aDecisionCategories, q19bHousingBasis,
    assessmentReviewersApprovers, approverAuthorityConfirmed, approverAuthorityBasis,
    finalizationFollowUpResolved,
    rk3d,
    a2NecessitySet,
    a4BenefitBusiness, a4BenefitConsumer, a4BenefitOtherStakeholders, a4BenefitPublic,
    a4BenefitBusinessFact, a4BenefitConsumerFact, a4BenefitOtherStakeholdersFact, a4BenefitPublicFact,
    a5HarmPathways, a6Safeguards,
    a8InformationProviders, a9ApproverName, a9ApproverPosition, a9ApprovalDate,
    assertions,

  ]);
  const INITIAL_DRAFT_JSON = useMemo(() => JSON.stringify({
    q1: "", q2: "", q3: "", q4: [] as string[], q5: "", q6Multi: [] as string[], q7: "", q8: "", q9: "", q10: "",
    q11: "", q12: "", q13: "", q14: "", q15: "", q16: "", q17: "", q18: "", q19: "", q20: "",
    i1Purpose: "", i2RetentionPeriod: "", i2RetentionCriteria: "", i2RetentionDetail: "",
    i3CaConsumerBand: "", i4Disclosures: [] as string[], i5AdmtLogic: "", i5AdmtTrainingSource: "",
    i5AdmtFairnessTesting: "", i5AdmtHumanReview: "", i6Vendors: "", i7InternalContributors: "",
    i7ExternalConsultees: "", i8ExecName: "", i8ExecTitle: "", i8ContactPhone: "", i8ContactEmail: "", i9HasDpia: "", i9DpiaSummary: "", materialChangeSincePrior: "",
    processingStatus: "", processingStartDate: "", plannedStartDate: "", priorRiskAssessmentDate: "", materialChangeDate: "", materialChangeDescription: "",
    admtOperationalRole: "", admtAssumptionsLimitations: "", admtOutput: "", admtOutputUse: "", admtConsumerEffect: "",
    admtMadeAvailableToOtherBusiness: "", admtProviderTrainedUsingPi: "", recipientBusinessUsesAdmtForSignificantDecision: "",
    spiEmploymentExceptionFacts: "",
    entityName: "", subjectAnchor: "", q5bProfiling: "", q5cShareRev: "", bssCount: "", q15bUnder16: "", q15cSpiVolume: "", q18bTraining: "", i1bMinPi: "", i4bSources: "",
    processingEntryPoint: "", processingMethods: { collection_method: "", use_method: "", disclosure_method: "", retention_method: "", other_processing_method: "" }, processingResult: "",
    consumerInteractionMethod: "", consumerInteractionPurpose: "", approximateCaConsumers: "",
    retentionByPiCategory: [{ pi_category: "", retention_period: "", retention_criteria: "" }],
    activityDisclosures: [{ disclosure_content: "", disclosure_method: "", status: "", timing_or_location: "" }],
    recipientRows: [{ recipient_name_or_category: "", recipient_type: "", pi_categories_made_available: [] as string[], disclosure_purpose: "", contractual_protections: "" }],
    recipientsNoneDeclared: false,
    benefitBusinessIdentified: "", benefitConsumerIdentified: "", benefitOtherStakeholdersIdentified: "", benefitPublicIdentified: "",
    sectionParticipants: [{ name: "", role: "", processing_responsibility: "", participation_confirmed: false }],
    publicPrivacyPolicyUrl: "", sensitiveLocationBasis: "",
    primaryActivityName: "", primaryActivityPurpose: "", hasSecondaryUses: "",
    secondaryActivities: [] as SecondaryActivity[],

    exceptionClaims: {} as Record<string, ExceptionClaim>,
    impactData: { likelihood: "", severity: "", harmTypes: [] as string[], vulnerable: "", benefitsOutweigh: "", benefitsRationale: "", cyberGaps: "", businessBenefits: "", consumerBenefits: "", stakeholderBenefits: "", safeguards: "", harmCauses: "" },
    harmCategoryReviewStatus: {} as Record<string, string>,
    finalProcessingDecision: "",
    finalProcessingDecisionNotes: "",
    q19aDecisionCategories: [] as string[],
    q19bHousingBasis: "",
    assessmentReviewersApprovers: [{ name: "", position: "", role: "" }] as { name: string; position: string; role: string }[],
    approverAuthorityConfirmed: "",
    approverAuthorityBasis: "",
    finalizationFollowUpResolved: "",
    rk3d: RK3D_EMPTY,
  }), []);
  // QA batch 2026-09-05 (RA 01) — `touched` compared the live draft against
  // INITIAL_DRAFT_JSON, a HAND-MAINTAINED empty snapshot that had drifted from
  // draftData (q15dHrCarveout was in one and not the other). The comparison
  // was therefore always true: the blank first render autosaved over the
  // customer's server draft, the Resume banner never showed and ?resume=1
  // never fired. The baseline is now the first render of draftData itself;
  // INITIAL_DRAFT_JSON stays as documentation of the empty shape only.
  void INITIAL_DRAFT_JSON;
  const initialDraftJsonRef = useRef<string | null>(null);
  if (initialDraftJsonRef.current === null) initialDraftJsonRef.current = JSON.stringify(draftData);
  const touched = useMemo(() => JSON.stringify(draftData) !== initialDraftJsonRef.current, [draftData]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage,
    saving: draftSaving, lastSavedAt, clearDraft, dismissDraft,
    autoRestoreToken,
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
    if (typeof d.q1 === "string") {
      // Legacy value "$25M–$100M" is not in the new REVENUE_OPTS; clear so
      // the radio renders unselected and the user re-answers with a clean
      // band (mirrors the CONSUMER_OPTS split shipped earlier today).
      setQ1(REVENUE_OPTS.includes(d.q1) ? d.q1 : "");
    }
    if (typeof d.q2 === "string") {
      // Guard against legacy straddling band "100,000–1 million" (no longer in
      // CONSUMER_OPTS). Restoring an unknown value would render the radio
      // unselected — clear it explicitly so the user must re-answer.
      setQ2(CONSUMER_OPTS.includes(d.q2) ? d.q2 : "");
    }
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
    if (typeof d.q15dHrCarveout === "string") setQ15dHrCarveout(d.q15dHrCarveout);
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
    if (typeof d.materialChangeSincePrior === "string") setMaterialChangeSincePrior(d.materialChangeSincePrior);
    if (typeof d.processingStatus === "string") setProcessingStatus(d.processingStatus);
    if (typeof d.processingStartDate === "string") setProcessingStartDate(d.processingStartDate);
    if (typeof d.plannedStartDate === "string") setPlannedStartDate(d.plannedStartDate);
    if (typeof d.priorRiskAssessmentDate === "string") setPriorRiskAssessmentDate(d.priorRiskAssessmentDate);
    if (typeof d.materialChangeDate === "string") setMaterialChangeDate(d.materialChangeDate);
    if (typeof d.materialChangeDescription === "string") setMaterialChangeDescription(d.materialChangeDescription);
    if (typeof d.admtOperationalRole === "string") setAdmtOperationalRole(d.admtOperationalRole);
    if (typeof d.admtAssumptionsLimitations === "string") setAdmtAssumptionsLimitations(d.admtAssumptionsLimitations);
    if (typeof d.admtOutput === "string") setAdmtOutput(d.admtOutput);
    if (typeof d.admtOutputUse === "string") setAdmtOutputUse(d.admtOutputUse);
    if (typeof d.admtConsumerEffect === "string") setAdmtConsumerEffect(d.admtConsumerEffect);
    if (typeof d.admtMadeAvailableToOtherBusiness === "string") setAdmtMadeAvailableToOtherBusiness(d.admtMadeAvailableToOtherBusiness);
    if (typeof d.admtProviderTrainedUsingPi === "string") setAdmtProviderTrainedUsingPi(d.admtProviderTrainedUsingPi);
    if (typeof d.recipientBusinessUsesAdmtForSignificantDecision === "string") setRecipientBusinessUsesAdmtForSignificantDecision(d.recipientBusinessUsesAdmtForSignificantDecision);
    if (typeof d.spiEmploymentExceptionFacts === "string") setSpiEmploymentExceptionFacts(d.spiEmploymentExceptionFacts);
    if (typeof d.entityName === "string") setEntityName(d.entityName);
    if (typeof d.subjectAnchor === "string") setSubjectAnchor(d.subjectAnchor);
    if (typeof d.q5bProfiling === "string") setQ5bProfiling(d.q5bProfiling);
    if (typeof d.q5cShareRev === "string") setQ5cShareRev(d.q5cShareRev);
    if (typeof d.bssCount === "string" && (d.bssCount === "" || (BOUGHT_SOLD_SHARED_OPTS as readonly string[]).includes(d.bssCount))) setBssCount(d.bssCount);
    if (typeof d.q15bUnder16 === "string") setQ15bUnder16(d.q15bUnder16);
    if (typeof d.q15cSpiVolume === "string") setQ15cSpiVolume(d.q15cSpiVolume);
    if (typeof d.q18bTraining === "string") setQ18bTraining(d.q18bTraining);
    if (Array.isArray(d.q19aDecisionCategories)) setQ19aDecisionCategories(d.q19aDecisionCategories.filter((x: unknown) => typeof x === "string"));
    if (typeof d.q19bHousingBasis === "string") setQ19bHousingBasis(d.q19bHousingBasis);
    if (typeof d.i1bMinPi === "string") setI1bMinPi(d.i1bMinPi);
    if (typeof d.i4bSources === "string") setI4bSources(d.i4bSources);
    // RK3-A1 — absent keys are legal in pre-RK3 drafts.
    if (typeof d.processingEntryPoint === "string") setProcessingEntryPoint(d.processingEntryPoint);
    if (d.processingMethods && typeof d.processingMethods === "object") {
      const m = d.processingMethods as Record<string, unknown>;
      setProcessingMethods({
        collection_method: typeof m.collection_method === "string" ? m.collection_method : "",
        use_method: typeof m.use_method === "string" ? m.use_method : "",
        disclosure_method: typeof m.disclosure_method === "string" ? m.disclosure_method : "",
        retention_method: typeof m.retention_method === "string" ? m.retention_method : "",
        other_processing_method: typeof m.other_processing_method === "string" ? m.other_processing_method : "",
      });
    }
    if (typeof d.processingResult === "string") setProcessingResult(d.processingResult);
    if (typeof d.consumerInteractionMethod === "string") setConsumerInteractionMethod(d.consumerInteractionMethod);
    if (typeof d.consumerInteractionPurpose === "string") setConsumerInteractionPurpose(d.consumerInteractionPurpose);
    if (typeof d.approximateCaConsumers === "string") setApproximateCaConsumers(d.approximateCaConsumers);
    if (Array.isArray(d.retentionByPiCategory) && d.retentionByPiCategory.length > 0) {
      setRetentionByPiCategory(
        d.retentionByPiCategory.map((r: any) => ({
          pi_category: typeof r?.pi_category === "string" ? r.pi_category : "",
          retention_period: typeof r?.retention_period === "string" ? r.retention_period : "",
          retention_criteria: typeof r?.retention_criteria === "string" ? r.retention_criteria : "",
        })),
      );
    }
    if (Array.isArray(d.activityDisclosures) && d.activityDisclosures.length > 0) {
      setActivityDisclosures(
        d.activityDisclosures.map((r: any) => ({
          disclosure_content: typeof r?.disclosure_content === "string" ? r.disclosure_content : "",
          disclosure_method: typeof r?.disclosure_method === "string" ? r.disclosure_method : "",
          status: typeof r?.status === "string" ? r.status : "",
          timing_or_location: typeof r?.timing_or_location === "string" ? r.timing_or_location : "",
        })),
      );
    }
    if (Array.isArray(d.recipientRows) && d.recipientRows.length > 0) {
      setRecipientRows(
        d.recipientRows.map((r: any) => ({
          recipient_name_or_category: typeof r?.recipient_name_or_category === "string" ? r.recipient_name_or_category : "",
          recipient_type: typeof r?.recipient_type === "string" ? r.recipient_type : "",
          pi_categories_made_available: Array.isArray(r?.pi_categories_made_available) ? r.pi_categories_made_available.filter((c: unknown) => typeof c === "string") : [],
          disclosure_purpose: typeof r?.disclosure_purpose === "string" ? r.disclosure_purpose : "",
          contractual_protections: typeof r?.contractual_protections === "string" ? r.contractual_protections : "",
        })),
      );
    }
    if (typeof d.recipientsNoneDeclared === "boolean") setRecipientsNoneDeclared(d.recipientsNoneDeclared);
    if (typeof d.benefitBusinessIdentified === "string") setBenefitBusinessIdentified(d.benefitBusinessIdentified);
    if (typeof d.benefitConsumerIdentified === "string") setBenefitConsumerIdentified(d.benefitConsumerIdentified);
    if (typeof d.benefitOtherStakeholdersIdentified === "string") setBenefitOtherStakeholdersIdentified(d.benefitOtherStakeholdersIdentified);
    if (typeof d.benefitPublicIdentified === "string") setBenefitPublicIdentified(d.benefitPublicIdentified);
    if (Array.isArray(d.sectionParticipants) && d.sectionParticipants.length > 0) {
      setSectionParticipants(
        d.sectionParticipants.map((r: any) => ({
          name: typeof r?.name === "string" ? r.name : "",
          role: typeof r?.role === "string" ? r.role : "",
          processing_responsibility: typeof r?.processing_responsibility === "string" ? r.processing_responsibility : "",
          participation_confirmed: r?.participation_confirmed === true,
        })),
      );
    }
    if (typeof d.publicPrivacyPolicyUrl === "string") setPublicPrivacyPolicyUrl(d.publicPrivacyPolicyUrl);
    if (typeof d.sensitiveLocationBasis === "string") setSensitiveLocationBasis(d.sensitiveLocationBasis);
    // ITEM 275 — absent keys are legal in pre-Item-275 drafts.
    if (typeof d.primaryActivityName === "string") setPrimaryActivityName(d.primaryActivityName);
    if (typeof d.primaryActivityPurpose === "string") setPrimaryActivityPurpose(d.primaryActivityPurpose);
    if (typeof d.hasSecondaryUses === "string" && (HAS_SECONDARY_USES_OPTS as readonly string[]).includes(d.hasSecondaryUses)) setHasSecondaryUses(d.hasSecondaryUses);
    if (Array.isArray(d.secondaryActivities)) {
      setSecondaryActivities(
        d.secondaryActivities.slice(0, MAX_SECONDARY_ACTIVITIES).map((a: any) => ({
          name: typeof a?.name === "string" ? a.name : "",
          purpose: typeof a?.purpose === "string" ? a.purpose : "",
          divergence: a?.divergence && typeof a.divergence === "object" ? a.divergence : {},
        })),
      );
    }

    if (d.exceptionClaims && typeof d.exceptionClaims === "object") setExceptionClaims(d.exceptionClaims);
    if (d.impactData && typeof d.impactData === "object") setImpactData((prev) => ({ ...prev, ...d.impactData }));
    if (d.harmCategoryReviewStatus && typeof d.harmCategoryReviewStatus === "object") setHarmCategoryReviewStatus(d.harmCategoryReviewStatus as Record<string, string>);
    if (typeof d.finalProcessingDecision === "string") setFinalProcessingDecision(d.finalProcessingDecision);
    if (typeof d.finalProcessingDecisionNotes === "string") setFinalProcessingDecisionNotes(d.finalProcessingDecisionNotes);
    if (Array.isArray(d.assessmentReviewersApprovers)) setAssessmentReviewersApprovers(d.assessmentReviewersApprovers);
    if (typeof d.approverAuthorityConfirmed === "string") setApproverAuthorityConfirmed(d.approverAuthorityConfirmed);
    if (typeof d.approverAuthorityBasis === "string") setApproverAuthorityBasis(d.approverAuthorityBasis);
    if (typeof d.finalizationFollowUpResolved === "string") setFinalizationFollowUpResolved(d.finalizationFollowUpResolved);
    // RK3-D (doc 33 D-L3) — grouped operand object; old drafts without it, or
    // with a partial shape, merge over the empty defaults.
    if (d.rk3d && typeof d.rk3d === "object") setRk3d({ ...RK3D_EMPTY, ...d.rk3d });
    // QA round two (RA-A-05, High) — ITEM 305 / UPGRADE-2 analytic
    // deliverables and the § 7152(a)(8)-(9) provider/approver fields.
    // Absent keys are legal in drafts saved before this fix.
    if (Array.isArray(d.a2NecessitySet) && d.a2NecessitySet.length > 0) {
      setA2NecessitySet(
        d.a2NecessitySet.map((r: any) => ({
          element: typeof r?.element === "string" ? r.element : "",
          necessity: typeof r?.necessity === "string" ? r.necessity : "",
          justification: typeof r?.justification === "string" ? r.justification : "",
        })),
      );
    }
    if (typeof d.a4BenefitBusiness === "string") setA4BenefitBusiness(d.a4BenefitBusiness);
    if (typeof d.a4BenefitConsumer === "string") setA4BenefitConsumer(d.a4BenefitConsumer);
    if (typeof d.a4BenefitOtherStakeholders === "string") setA4BenefitOtherStakeholders(d.a4BenefitOtherStakeholders);
    if (typeof d.a4BenefitPublic === "string") setA4BenefitPublic(d.a4BenefitPublic);
    if (typeof d.a4BenefitBusinessFact === "string") setA4BenefitBusinessFact(d.a4BenefitBusinessFact);
    if (typeof d.a4BenefitConsumerFact === "string") setA4BenefitConsumerFact(d.a4BenefitConsumerFact);
    if (typeof d.a4BenefitOtherStakeholdersFact === "string") setA4BenefitOtherStakeholdersFact(d.a4BenefitOtherStakeholdersFact);
    if (typeof d.a4BenefitPublicFact === "string") setA4BenefitPublicFact(d.a4BenefitPublicFact);
    if (Array.isArray(d.a5HarmPathways) && d.a5HarmPathways.length > 0) {
      setA5HarmPathways(
        d.a5HarmPathways.map((r: any) => ({
          harm: typeof r?.harm === "string" ? r.harm : "",
          data_involved: typeof r?.data_involved === "string" ? r.data_involved : "",
          actor: typeof r?.actor === "string" ? r.actor : "",
          source: typeof r?.source === "string" ? r.source : "",
          cause: typeof r?.cause === "string" ? r.cause : "",
          likelihood: typeof r?.likelihood === "string" ? r.likelihood : "",
          severity: typeof r?.severity === "string" ? r.severity : "",
        })),
      );
    }
    if (Array.isArray(d.a6Safeguards) && d.a6Safeguards.length > 0) {
      setA6Safeguards(
        d.a6Safeguards.map((r: any) => ({
          harm: typeof r?.harm === "string" ? r.harm : "",
          safeguard: typeof r?.safeguard === "string" ? r.safeguard : "",
          safeguard_status: typeof r?.safeguard_status === "string" ? r.safeguard_status : "",
          residual: typeof r?.residual === "string" ? r.residual : "",
          risk_pathway_ids: Array.isArray(r?.risk_pathway_ids)
            ? r.risk_pathway_ids.filter((x: unknown) => typeof x === "string")
            : [],
          effectiveness_basis: typeof r?.effectiveness_basis === "string" ? r.effectiveness_basis : "",
          planned_timeline: typeof r?.planned_timeline === "string" ? r.planned_timeline : "",
        })),
      );
    }
    if (typeof d.a8InformationProviders === "string") setA8InformationProviders(d.a8InformationProviders);
    if (typeof d.a9ApproverName === "string") setA9ApproverName(d.a9ApproverName);
    if (typeof d.a9ApproverPosition === "string") setA9ApproverPosition(d.a9ApproverPosition);
    if (typeof d.a9ApprovalDate === "string") setA9ApprovalDate(d.a9ApprovalDate);
    if (d.assertions && typeof d.assertions === "object" && !Array.isArray(d.assertions)) {
      setAssertions(d.assertions as AssertionMap);
    }
    if (typeof restoreStage === "number") setStep(restoreStage);
    dismissDraft();
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

  // ITEM 321 (PROMPT C) — arriving from a § 7156(a) follow-up panel
  // (?prefill=1): the recommended secondary activity becomes the PRIMARY
  // activity of this new assessment. Consumed once, then cleared.
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("prefill") !== "1") return;
    if (prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    const pre = consumeRiskPrefill();
    if (!pre) return;
    setPrimaryActivityName(pre.primary_activity_name);
    setPrimaryActivityPurpose(pre.primary_activity_purpose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-restore when arriving via "Continue" from My Reports (?resume=1).
  const autoResumedRef = useRef(false);
  const shouldAutoResume = searchParams.get("resume") === "1";
  useEffect(() => {
    if (!shouldAutoResume) return;
    if (autoResumedRef.current) return;
    if (!draftFound || !restoreData || touched) return;
    autoResumedRef.current = true;
    applyRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoResume, draftFound, restoreData, touched]);

  const summaryStep = step === totalSteps;


  const handlePurchase = () => {
    if (!user) { setAuthGateOpen(true); return; }
    // ITEM 381 — advisory review step, before checkout and without altering it.
    // Flag off ⇒ this branch is never taken and the flow is unchanged.
    if (isIntakeCoachEnabled("cppa_risk") && !coachSeen) {
      setCoachSeen(true);
      setCoachOpen(true);
      return;
    }
    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  // QA round two (R2 RA A 04, Medium) — the coach's "Jump to this question"
  // closed the dialog and left the form at step 8. Only the CURRENT step is in
  // the DOM, so the card's anchor did not exist and IntakeCoachStep's
  // querySelector returned null. This maps each coach anchor to the step that
  // renders it (verified against the `{step === N && (` blocks in this file);
  // the coach switches step first, then scrolls and focuses.
  const jumpToCoachStep = (selector: string): boolean => {
    const anchor = selector.match(/data-coach-field="([^"]+)"/)?.[1];
    if (!anchor) return false;
    const stepForAnchor: Record<string, number> = {
      i5_admt_logic: 2,
      i1b_min_pi: 4,
      exceptions_intake: 4,
      a5_harm_pathways: 5,
      a6_safeguards: 5,
      a4_benefits: 6,
    };
    const target = stepForAnchor[anchor];
    if (!target || target === step) return false;
    setStep(target);
    return true;
  };

  // ── QA round two (SUITE-A-02, High) — CPPA Suite two-module hand-off ──
  // The bundle is two assessments. Buying it from this page alone wrote the
  // Risk answers into BOTH rows, so the paid Cybersecurity report came back
  // "Insufficient basis to assess, 0/100, all 18 controls not assessable" —
  // a score that reflected the missing questionnaire, not the customer's
  // controls. Module 2 is collected first; only then is checkout opened, with
  // an explicit per-module envelope that create-tool-checkout also enforces.
  const suiteModules = useMemo(
    () => (isSuite ? { ...readSuiteHandoff(), risk_assessment: intake as Record<string, unknown> } : {}),
    [isSuite, intake],
  );
  const suiteNextStep = useMemo(
    () => (isSuite ? nextSuiteStep(suiteModules) : null),
    [isSuite, suiteModules],
  );
  const handleSuiteContinue = () => {
    if (!user) { setAuthGateOpen(true); return; }
    saveSuiteModule("risk_assessment", intake as Record<string, unknown>);
    if (suiteNextStep) {
      navigate(suiteNextStep.path);
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Privacy Risk Assessment (Module 1) | End User Privacy</title>
        <meta name="description" content="California CPPA risk assessment mapped 1:1 to § 7152(a)(1)–(9). Generates a regulation-mapped framework pre-populated from your intake, ready for executive sign-off." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-risk-assessment" />
      </Helmet>
      {/* PRE-INTAKE REDESIGN (2026-08-26): suite selector → name-led hero with
          the standardized price/CTA block → sales-proof card band → compact
          how-it-works row → shared suite cross-sell → compressed disclaimer.
          Intake guidance and the client selector move to the intake boundary. */}
      <SuiteSelector active="m1" />
      <ProductHero
        geography="us"
        eyebrowLabel={headerLabel}
        title="CPPA Privacy Risk Assessment"
        valueProposition={INCLUDED_GENERATIONS_HERO}
        citationLine="11 CCR §§ 7150–7157 · Built from the CPPA final regulations and Final Statement of Reasons"
        showIntakeCta={false}
      >
        <HeroPriceCta
          standalonePrice={activePricing.standalonePrice}
          subscriberPrice={activePricing.subscriberPrice}
          isSubscriber={activePricing.isSubscriber && activePricing.price === activePricing.subscriberPrice}
          primaryLabel={isSuite ? "Start Full Audit Suite" : "Start Risk Assessment"}
          toolSlug="cppa_risk"
          sampleSlug="cppa_risk"
        />
      </ProductHero>

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Does this assessment apply to you?",
            tone: "amber",
            body: (
              <>
                <p>A CPPA risk assessment is required for covered processing involving the sale or share of personal information, sensitive personal information, or automated decision-making. Existing covered activities must be assessed by Dec. 31, 2027.</p>
                <p className="mt-2">Annual submissions to the CPPA begin with the April 1, 2028 filing.</p>
              </>
            ),
          },
          {
            title: "What you receive",
            body: "A regulation-mapped assessment record structured 1:1 to 11 CCR § 7152(a)(1)–(9), pre-populated from your intake and organized for internal review, completion, and sign-off.",
          },
          {
            title: "Two compliance deliverables",
            body: (
              <ol className="list-decimal list-inside space-y-1">
                <li>Your internal risk-assessment record for the § 7156(c) production requirement.</li>
                <li>A § 7157 Annual Submission Worksheet for the April 1 filing.</li>
              </ol>
            ),
          },
          {
            title: "Why trust the analysis",
            body: "Compiled with reference to the statute, the regulations, and the regulator's own commentary and guidance — the CPPA's final regulations and Final Statement of Reasons, cited at paragraph level. Where the agency has not spoken, the report says so.",
          },
        ]}
      />

      <HowItWorksRow
        className="mt-4"
        items={[
          "Covers the risk-assessment obligation in Article 10 of the CCPA regulations (11 CCR §§ 7150–7157).",
          "Your intake is validated before generation; contradictions are flagged with citations, never resolved for you.",
          "Generates a Part A stakeholder summary and a Part B full assessment record.",
        ]}
      />

      <SuiteCrossSellStrip className="mt-4" />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <CompactDisclaimer
          line="Analytical aid only — not legal advice, a certified audit, or a regulatory submission."
          addition="This tool produces a structured risk assessment framework aligned to the CPPA's audit regulations (11 CCR §§ 7150-7157). It is an analytical aid and does not constitute a certified audit or regulatory submission."
        />
        {refine.isRefine && refine.intake && !refine.loading && (
          <RefinePanel
            toolType="cppa_risk_assessment"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/cppa-risk-assessment/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
            resolveFields={refine.resolveFields}
            resolveHighlightingEnabled={resolveHighlightingEnabled}
          />
        )}
        {!refine.isRefine && (<></>)}
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
        {!refine.isRefine && (<>
        <IntakeMasthead
          kicker="CPPA Privacy Risk Assessment · Cal. Code Regs. tit. 11 §§ 7150–7157"
          title={CPPA_RISK_STEP_TITLES[step] ?? `Step ${step}`}
          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter
              ? (typeof meter.lockedFields?.entity_name === "string"
                  ? (meter.lockedFields!.entity_name as string)
                  : (typeof meter.lockedFields?.subject_anchor === "string"
                      ? (meter.lockedFields!.subject_anchor as string)
                      : undefined))
              : undefined
          }
          meter={meter ?? null}
          preRunHint={REVISIONS_ENABLED ? "Entity and subject lock after the first generation; other answers remain editable across included generations." : undefined}
          clientSlot={<ActiveClientLabel variant="masthead" />}
        />
        <IntakeGuidance className="mt-3">For a more precise report, name the systems, data, and steps; list multiple items separately.</IntakeGuidance>
        <div ref={topRef} className="text-sm text-muted-foreground my-4" aria-live="polite">Step {step} of {totalSteps}</div>

        <BenchLayout
          toolType="cppa_risk"
          railEntry={activeRiskRailEntry}
          defaultSourceUrl="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf"
          coachingOpenByDefault={
            !!activeRiskRailKey &&
            refine.infoNeededKeys.some(
              (k) => activeRiskRailKey === k || activeRiskRailKey.includes(k) || k.includes(activeRiskRailKey),
            )
          }
        >
        <div className="space-y-6">
          {step === 1 && (
            <>
              <h2>The activity you are assessing</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR §§ 7150(a), 7152(a)(1), 7155(a)(1), 7156 — identifying the processing under assessment</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers open the report: they name the activity, state its purpose, and fix the entity and subject line that appear on every page of the assessment and on the annual submission worksheet.</p>
              <div data-rail-key="primary_activity" onFocus={() => focusRail('primary_activity')}>
                <Label htmlFor="primary_activity_name">What should we call the processing activity you're assessing today? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(a))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">A short working name for this one activity. It is the subject of this assessment and appears throughout the report.</p>
                <input
                  id="primary_activity_name"
                  type="text"
                  value={primaryActivityName}
                  onChange={(e) => setPrimaryActivityName(e.target.value)}
                  onFocus={() => focusRail('primary_activity')}
                  placeholder="e.g., Loyalty-program personalisation"
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                />
              </div>
              <div data-rail-key="primary_activity" onFocus={() => focusRail('primary_activity')}>
                <Label htmlFor="primary_activity_purpose">In one sentence, what does this activity do with personal information? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7155(a)(1))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Describe what is done with the information — the operation, not the business justification.</p>
                <textarea
                  id="primary_activity_purpose"
                  value={primaryActivityPurpose}
                  onChange={(e) => setPrimaryActivityPurpose(e.target.value)}
                  onFocus={() => focusRail('primary_activity')}
                  rows={2}
                  placeholder="One sentence"
                  className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              {/* RK3-A1 (Intake Contract v2.0 §1) — § 7152(a)(3)(A) processing
                  record: where PI enters, the five planned processing methods,
                  and what the activity produces. Feeds Spine 4.3 §II.A and the
                  DERIVED lifecycle narrative. */}
              <div data-rail-key="processing_record" onFocus={() => focusRail('processing_record')}>
                <Label htmlFor="processing_entry_point">Where does personal information first enter this activity? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(A))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">The first point of collection or receipt — a form, an app screen, a call, a file from another system, a purchase from another business.</p>
                <textarea
                  id="processing_entry_point"
                  value={processingEntryPoint}
                  onChange={(e) => setProcessingEntryPoint(e.target.value)}
                  onFocus={() => focusRail('processing_record')}
                  rows={2}
                  placeholder="e.g., Members type their name, mailing address, and birth month into the loyalty sign-up form at the register."
                  className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              <div data-rail-key="processing_record" onFocus={() => focusRail('processing_record')}>
                <Label>How is the information collected, used, disclosed, retained, and otherwise processed? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(A))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">One line per stage. Write “N/A” for any stage that does not occur in this activity.</p>
                <div className="mt-2 space-y-3">
                  {([
                    ["collection_method", "Collected", "e.g., Typed into the sign-up form by the member at the register."],
                    ["use_method", "Used", "e.g., Matched against the store calendar to print a birthday coupon batch each month."],
                    ["disclosure_method", "Disclosed", "e.g., Sent to the print-and-mail vendor as a monthly address file — or N/A."],
                    ["retention_method", "Retained", "e.g., Held in the loyalty database while the membership stays active."],
                    ["other_processing_method", "Otherwise processed", "e.g., N/A."],
                  ] as const).map(([mkey, mlabel, mplaceholder]) => (
                    <div key={mkey}>
                      <Label htmlFor={`processing_methods_${mkey}`} className="text-xs">{mlabel}</Label>
                      <input
                        id={`processing_methods_${mkey}`}
                        type="text"
                        value={processingMethods[mkey]}
                        onChange={(e) => setProcessingMethods((prev) => ({ ...prev, [mkey]: e.target.value }))}
                        onFocus={() => focusRail('processing_record')}
                        placeholder={mplaceholder}
                        className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div data-rail-key="processing_record" onFocus={() => focusRail('processing_record')}>
                <Label htmlFor="processing_result">What does this activity produce or support? <Req /></Label>
                <p className="text-xs text-muted-foreground mt-1">The output — a decision, score, recommendation, service action, or operational outcome. This connects the processing to its benefits and its risk pathways.</p>
                <textarea
                  id="processing_result"
                  value={processingResult}
                  onChange={(e) => setProcessingResult(e.target.value)}
                  onFocus={() => focusRail('processing_record')}
                  rows={2}
                  placeholder="e.g., A printed birthday coupon mailed to each member during their birth month."
                  className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>

              {/* RK3-D (doc 33 D-L3) — purpose-specificity facets. The report
                  bands the purpose on this typed answer; the honest answer is
                  what the stated purpose itself identifies. */}
              <div>
                <Label>Which of the following does your stated purpose itself identify? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(1))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Check only what the purpose statement above actually names — the report evaluates the purpose's precision on this answer. "None of the above" is a complete answer.</p>
                <div className="mt-2">
                  <Pills
                    options={[...PURPOSE_SPECIFICITY_FACTS_OPTS]}
                    value={rk3d.purpose_specificity_facts}
                    onChange={(v: string[]) => {
                      const NONE = "None of the above";
                      const wasNone = rk3d.purpose_specificity_facts.includes(NONE);
                      const hasNone = v.includes(NONE);
                      if (hasNone && !wasNone) setRk3dField("purpose_specificity_facts", [NONE]);
                      else if (hasNone && v.length > 1) setRk3dField("purpose_specificity_facts", v.filter((x) => x !== NONE));
                      else setRk3dField("purpose_specificity_facts", v);
                    }}
                  />
                </div>
              </div>

              <div data-rail-key="comparable_set" onFocus={() => focusRail('comparable_set')}>
                <Label>
                  Beyond {primaryActivityName.trim() || "this activity"}, does your company use this same data for any other distinct purpose, product, or audience? <Req />{" "}
                  <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7156(a))</span>
                </Label>
                <div className="inline-flex items-center gap-1.5 flex-wrap mt-1">
                  <DefPopover termKey="comparable_set" />
                </div>
                {/* ITEM 319 ADDENDUM — DIRECTIVE POSTURE. This helper text must
                    describe the SAME behaviour as the report's § 7156(a)
                    section and the follow-up panel (any-divergence threshold,
                    see `secondaryRecommendation`). Reserved-to-counsel framing
                    was removed here deliberately; do not restore it without
                    also changing the composer, the rail, and spec § 2R.5. */}
                <p className="text-xs text-muted-foreground mt-1">
                  A single risk assessment may cover a “comparable set” of processing activities — similar activities presenting similar risks to consumers’ privacy. You’ll compare each additional use against this activity on five dimensions; if any one of them differs, this tool recommends a separate risk assessment for that use, and if any is unresolved it recommends one unless you confirm the dimension is the same. That is this tool’s recommendation on the record you give it, not a statement of what the law requires, and it does not replace review by your counsel.
                </p>

                <div className="mt-2">
                  <Radio
                    name="has_secondary_uses"
                    options={[...HAS_SECONDARY_USES_OPTS]}
                    value={hasSecondaryUses}
                    onChange={(v) => {
                      setHasSecondaryUses(v);
                      if (v === "Yes — there are other uses" && secondaryActivities.length === 0) {
                        setSecondaryActivities([{ name: "", purpose: "", divergence: {} }]);
                      }
                    }}
                  />
                </div>
                <div className="mt-3">
                  <FscrCallout citation="11 CCR § 7156(a)" callouts={fscrCallouts} />
                </div>
              </div>

              {hasSecondaryUses === "Yes — there are other uses" && (
                <div className="space-y-4">
                  {secondaryActivities.map((act, idx) => (
                    <div
                      key={idx}
                      data-rail-key="comparable_set"
                      onFocus={() => focusRail('comparable_set')}
                      className="rounded-lg border border-input p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Other use #{idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => setSecondaryActivities((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Remove
                        </button>
                      </div>
                      <div>
                        <Label htmlFor={`secondary_name_${idx}`}>What is this other use called?</Label>
                        <input
                          id={`secondary_name_${idx}`}
                          type="text"
                          value={act.name}
                          onChange={(e) =>
                            setSecondaryActivities((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, name: e.target.value } : a)),
                            )
                          }
                          onFocus={() => focusRail('comparable_set')}
                          placeholder="e.g., Fraud screening"
                          className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`secondary_purpose_${idx}`}>In one line, what does this other use do with the information?</Label>
                        <input
                          id={`secondary_purpose_${idx}`}
                          type="text"
                          value={act.purpose}
                          onChange={(e) =>
                            setSecondaryActivities((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, purpose: e.target.value } : a)),
                            )
                          }
                          onFocus={() => focusRail('comparable_set')}
                          placeholder="e.g., We score transactions to hold suspected fraudulent orders."
                          className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                        />
                      </div>
                      {/* RK3-D (doc 33 D-L3) — per-row secondary-use operands. */}
                      <div>
                        <Label>How does this other use relate to the primary purpose? <Req /></Label>
                        <div className="mt-1.5">
                          <Radio
                            name={`secondary_relation_${idx}`}
                            options={[...SECONDARY_RELATION_OPTS]}
                            value={act.relation_to_primary ?? ""}
                            onChange={(v) =>
                              setSecondaryActivities((prev) =>
                                prev.map((a, i) => (i === idx ? { ...a, relation_to_primary: v } : a)),
                              )
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Is this other use disclosed to consumers at or before collection? <Req /></Label>
                        <div className="mt-1.5">
                          <Radio
                            name={`secondary_disclosed_${idx}`}
                            options={[...SECONDARY_DISCLOSED_OPTS]}
                            value={act.disclosed_in_notice ?? ""}
                            onChange={(v) =>
                              setSecondaryActivities((prev) =>
                                prev.map((a, i) => (i === idx ? { ...a, disclosed_in_notice: v } : a)),
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-medium">
                          Compared with {primaryActivityName.trim() || "the activity you are assessing"}, is each of these the same or different?
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          § 7156(a) treats a set as comparable only where the activities are similar and present similar risks to consumers’ privacy — the § 7156(a)(1) example turns on collecting the same information in the same way for the same purpose. Unanswered comparisons are recorded as “Not sure”.
                        </p>
                        <div className="mt-3 space-y-3">
                          {DIVERGENCE_DIMENSIONS.map((dim) => (
                            <div key={dim.key}>
                              <Label>{dim.label}</Label>
                              <div className="mt-1.5">
                                <Radio
                                  name={`divergence_${idx}_${dim.key}`}
                                  options={[...DIVERGENCE_OPTS]}
                                  value={act.divergence?.[dim.key] ?? ""}
                                  onChange={(v) =>
                                    setSecondaryActivities((prev) =>
                                      prev.map((a, i) =>
                                        i === idx
                                          ? { ...a, divergence: { ...(a.divergence ?? {}), [dim.key]: v } }
                                          : a,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {secondaryActivities.length < MAX_SECONDARY_ACTIVITIES && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSecondaryActivities((prev) => [...prev, { name: "", purpose: "", divergence: {} }])
                      }
                    >
                      Add another
                    </Button>
                  )}
                </div>
              )}
              {/* RK3-D (doc 33 D-L3) — out-of-scope confirmation + comparable-set
                  status. Both are typed scope facts the report's Section I
                  factors consume. */}
              <div>
                <Label>Outside the stated purpose and any uses listed above, is this same information processed for anything else? <Req /></Label>
                <p className="text-xs text-muted-foreground mt-1">"Unsure" is a complete answer — the report records it as an open follow-up rather than assuming the favorable answer.</p>
                <div className="mt-2"><Radio name="out_of_scope_confirmation" options={[...OUT_OF_SCOPE_CONFIRMATION_OPTS]} value={rk3d.out_of_scope_confirmation} onChange={(v) => setRk3dField("out_of_scope_confirmation", v)} /></div>
                {rk3d.out_of_scope_confirmation === "The affected information is also processed for other activities not covered by this assessment" && (
                  <div className="mt-2">
                    <Label className="text-sm">Briefly describe those other activities</Label>
                    <Textarea className="mt-2" rows={2} value={rk3d.out_of_scope_activities} onChange={(e) => setRk3dField("out_of_scope_activities", e.target.value)} placeholder="e.g., Aggregate analytics for network planning; a separate marketing program" />
                  </div>
                )}
              </div>
              <div>
                <Label>Does this assessment cover a single activity, or a set of similar activities? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7156(a))</span></Label>
                <div className="mt-2"><Radio name="comparable_processing_status" options={[...COMPARABLE_PROCESSING_STATUS_OPTS]} value={rk3d.comparable_processing_status} onChange={(v) => setRk3dField("comparable_processing_status", v)} /></div>
                {rk3d.comparable_processing_status === "This assessment covers a set of similar activities presenting similar risks" && (
                  <div className="mt-2">
                    <Label className="text-sm">State the basis for treating the activities as a comparable set</Label>
                    <Textarea className="mt-2" rows={2} value={rk3d.comparable_processing_basis} onChange={(e) => setRk3dField("comparable_processing_basis", e.target.value)} placeholder="e.g., Each activity collects the same information in the same way for the same purpose across our three regional storefronts." />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="entity_name">Entity name <span className="text-xs text-muted-foreground">(legal business name as it will appear on the report and § 7157 worksheet)</span></Label>
                <input
                  id="entity_name"
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="e.g., Acme Retail, Inc."
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  autoComplete="organization"
                />
              </div>
              <div data-rail-key="subject_anchor" onFocus={() => focusRail('subject_anchor')}>
                <Label htmlFor="subject_anchor">In one line: what processing does this assessment cover? <Req /></Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Set when you first generate; fixed thereafter. The detailed purpose below remains editable.
                </p>
                <input
                  id="subject_anchor"
                  type="text"
                  value={subjectAnchor}
                  onChange={(e) => setSubjectAnchor(e.target.value)}
                  placeholder="e.g., Fraud screening of new account signups"
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                />
              </div>
              <div data-rail-key="q3_sector" onFocus={() => focusRail('q3_sector')}><Label>What is your primary business sector? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(a))</span></Label>
                <select value={q3} onChange={(e) => setQ3(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div data-rail-key="i1_purpose" onFocus={() => focusRail('i1_purpose')}>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>What is the specific purpose of this processing activity? <span className="text-xs text-muted-foreground">(§ 7152(a)(1))</span></Label><StatutePopover term="Specific purpose" summary="The assessment must state the specific purpose of the processing; generic purposes such as 'improving services' are insufficient." cite="11 CCR § 7152(a)(2)" /></div>
                <p className="text-xs text-muted-foreground mt-1">
                  Describe what you do with the personal information, who it relates to, and what business outcome it supports. Avoid generic phrases such as "improve services," "for security purposes," "analytics," or "as described in our privacy policy" — these will be flagged by the validator.
                </p>
                <Textarea
                  value={i1Purpose}
                  onChange={(e) => setI1Purpose(e.target.value)}
                  rows={4}
                  placeholder='Purpose, data used, outcome'
                  className="mt-2"
                />
                <FscrCallout citation="11 CCR § 7152(a)(1)" callouts={fscrCallouts} />
              </div>
              {/* TURN 1b — public privacy-policy URL (optional record anchor). */}
              <div data-rail-key="public_privacy_policy_url">
                <Label htmlFor="public_privacy_policy_url">Public privacy-policy URL <span className="text-xs text-muted-foreground">(optional — rendered as a record anchor in the submission summary and attestation block)</span></Label>
                <input
                  id="public_privacy_policy_url"
                  type="url"
                  value={publicPrivacyPolicyUrl}
                  onChange={(e) => setPublicPrivacyPolicyUrl(e.target.value)}
                  placeholder="https://example.com/privacy"
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  inputMode="url"
                  autoComplete="url"
                />
                <p className="text-xs text-muted-foreground mt-1">This is a locator only. The assessment does not treat the linked policy as a source of facts.</p>
              </div>
              {/* RK3-A2 g1 — § RAF 7155 processing status and assessment timeline.
                  Conditional date fields branch on the status selection; the
                  prior-assessment date anchors the Spine 4.3 §I.A timeline. */}
              <div data-rail-key="timing_and_status" onFocus={() => focusRail('timing_and_status')}>
                <Label>What is the current status of this processing activity? <span className="text-xs text-muted-foreground font-mono">(§ RAF 7155)</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Planned: not yet operational. Ongoing: currently live. Discontinued: no longer active but within the assessment window.</p>
                <div className="mt-2"><Radio name="processing_status" options={[...PROCESSING_STATUS_OPTS]} value={processingStatus} onChange={setProcessingStatus} /></div>
                {(processingStatus === "Ongoing" || processingStatus === "Discontinued") && (
                  <div className="mt-3">
                    <Label className="text-sm">When did this processing start? <span className="text-xs text-muted-foreground">(approximate is fine)</span></Label>
                    <input type="date" className="mt-2 block w-48 h-10 px-3 rounded-md border border-input bg-background" value={processingStartDate} onChange={(e) => setProcessingStartDate(e.target.value)} onFocus={() => focusRail('timing_and_status')} />
                  </div>
                )}
                {processingStatus === "Planned" && (
                  <div className="mt-3">
                    <Label className="text-sm">When is this processing expected to begin? <span className="text-xs text-muted-foreground">(approximate is fine)</span></Label>
                    <input type="date" className="mt-2 block w-48 h-10 px-3 rounded-md border border-input bg-background" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} onFocus={() => focusRail('timing_and_status')} />
                  </div>
                )}
                <div className="mt-3">
                  <Label className="text-sm">Date of the most recent prior risk assessment for this activity <span className="text-xs text-muted-foreground">(if any — leave blank if this is the first)</span></Label>
                  <input type="date" className="mt-2 block w-48 h-10 px-3 rounded-md border border-input bg-background" value={priorRiskAssessmentDate} onChange={(e) => setPriorRiskAssessmentDate(e.target.value)} onFocus={() => focusRail('timing_and_status')} />
                </div>
              </div>
              <div data-rail-key="i9_dpia" onFocus={() => focusRail('i9_dpia')}>
                <Label>Is there an existing GDPR DPIA (or other PIA) for this activity? <span className="text-xs text-muted-foreground">(§ 7156(b))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">If a GDPR DPIA exists, we'll map what it already covers.</p><div className="mt-2"><Radio name="i9" options={["Yes", "No"]} value={i9HasDpia} onChange={setI9HasDpia} /></div>
                <FscrCallout citation="11 CCR § 7156(b)" callouts={fscrCallouts} />
                {i9HasDpia === "Yes" && (
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={i9DpiaSummary}
                    onChange={(e) => setI9DpiaSummary(e.target.value)}
                    placeholder="Title, date, scope"
                  />
                )}
                {renderAssertion("i9_existing_dpia_summary")}
              </div>
              <div data-rail-key="material_change_since_prior" onFocus={() => focusRail('material_change_since_prior')}>
                <Label>Has this processing activity changed materially since the last assessment? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7155(a)(3))</span></Label>
                {/* DOC 157 (2026-09-03) — the regulation's own three-part test. */}
                <p className="text-xs text-muted-foreground mt-1">A change is material under § 7155(a)(3) "if it creates new negative impacts or increases the magnitude or likelihood of previously identified negative impacts as set forth in section 7152, subsection (a)(5), or diminishes the effectiveness of the safeguards as set forth in section 7152, subsection (a)(6)" — for example a change to the purpose, to the minimum personal information necessary, or to the risks raised by consumers. A material change requires the assessment to be updated "as soon as feasibly possible, but no later than 45 calendar days from the date of the material change." If this is the first assessment of this activity, answer "No".</p>
                <div className="mt-2"><Radio name="material_change_since_prior" options={["Yes", "No"]} value={materialChangeSincePrior} onChange={setMaterialChangeSincePrior} /></div>
                {materialChangeSincePrior === "Yes" && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label className="text-sm">When did the material change take effect? <span className="text-xs text-muted-foreground">(approximate is fine)</span></Label>
                      <input type="date" className="mt-2 block w-48 h-10 px-3 rounded-md border border-input bg-background" value={materialChangeDate} onChange={(e) => setMaterialChangeDate(e.target.value)} onFocus={() => focusRail('material_change_since_prior')} />
                    </div>
                    <div>
                      <Label className="text-sm">Briefly describe what changed <span className="text-xs text-muted-foreground">(§ 7155(a)(3))</span></Label>
                      <Textarea className="mt-2" rows={2} value={materialChangeDescription} onChange={(e) => setMaterialChangeDescription(e.target.value)} onFocus={() => focusRail('material_change_since_prior')} placeholder="e.g., Added biometric scanning at point of sale; expanded recipient list to include fulfilment partner." />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Why an assessment is required, and how consumers reach you</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR §§ 7150(b)(1)–(6), 7120(b); Cal. Civ. Code §§ 1798.100–1798.140 — triggers, thresholds, and rights infrastructure</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers produce the section of the report that establishes why the assessment is required and records the rights machinery a regulator will test first.</p>
              <div data-rail-key="q1_revenue" onFocus={() => focusRail('q1_revenue')}><Label>What is your business's annual gross revenue? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(ag)(1))</span></Label><p className="text-xs text-muted-foreground mt-1">Total worldwide gross revenue from all sources — not just California.</p><div className="mt-2"><Radio name="q1" options={REVENUE_OPTS} value={q1} onChange={setQ1} /></div></div>
              <div data-rail-key="q2_consumers" onFocus={() => focusRail('q2_consumers')}><Label>How many California consumers' personal information do you process in a year? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(ag)(2)(A))</span></Label><p className="text-xs text-muted-foreground mt-1">Your best estimate of distinct California residents across all processing.</p><div className="mt-2"><Radio name="q2" options={CONSUMER_OPTS} value={q2} onChange={setQ2} /></div></div>
              {/* DOC 157 (2026-09-03) — "sell" is not limited to advertising
                  (Cal. Civ. Code § 1798.140(ad): any disclosure for monetary or
                  other valuable consideration); only "share" (ah) is the
                  cross-context behavioral advertising concept. */}
              <div data-rail-key="q5_sell_share" onFocus={() => focusRail('q5_sell_share')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you sell personal information (disclose it for money or other valuable consideration), or share it for cross-context behavioural advertising? <Req /></Label><DefPopover termKey="ccba" /><EnforcementSignalIcon signalKey="sell_share" signals={enforcementSignals} /></div>
                <p className="text-xs text-muted-foreground mt-1">"Sell" and "share" have specific CCPA meanings — tap the definition icon.</p><div className="mt-2"><Radio name="q5" options={Q5_SELL_SHARE_OPTS} value={q5} onChange={setQ5} /></div>
              </div>
              {q5 && q5 !== "No" && (
                <div data-rail-key="q5c_share_revenue_50pct" onFocus={() => focusRail('q5c_share_revenue_50pct')}>
                  <Label>Does 50% or more of your annual gross revenue derive from selling or sharing personal information? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(C) / 11 CCR § 7120(b)(1))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">Optional — this feeds the covered-business test for the § 7120(b)(1) 50%-revenue prong. Skip if you're unsure or the number isn't material.</p>
                  <div className="mt-2"><Radio name="q5c" options={SHARE_REVENUE_50PCT_OPTS} value={q5cShareRev} onChange={setQ5cShareRev} /></div>
                </div>
              )}
              {/* T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand: bought/sold/shared count.
                  Optional; asked only when q5_sell_share is affirmative because the
                  (B) covered-business prong only resolves against a sell/share operand.
                  Unanswered flows to information_needed via the (B)-gap gate. */}
              {q5 && q5 !== "No" && (
                <div data-rail-key="bought_sold_shared_count" onFocus={() => focusRail('bought_sold_shared_count')}>
                  <Label htmlFor="bought_sold_shared_count">About how many California consumers or households' personal information do you <em>buy, sell, or share</em> each year? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(B))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">Optional — this is the operand for the § 1798.140(d)(1)(B) covered-business prong. If left blank, the assessment will list it as an outstanding item rather than assume a value.</p>
                  <select
                    id="bought_sold_shared_count"
                    value={bssCount}
                    onChange={(e) => setBssCount(e.target.value)}
                    className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Select…</option>
                    {BOUGHT_SOLD_SHARED_OPTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {/* TURN 1d (2026-08-26, fleet intake audit findings 1+2) — q5b is
                  now a direct Yes/No on the § 7150(b)(4) element ONLY. The
                  retired 4-option enum did two wrong things: (a) its
                  "sensitive-location presence"/"Both" options fed the
                  § 7150(b)(5) gate WITHOUT the inference caveat the TURN 1c
                  sensitive_location_basis redesign added — a second door into
                  the exact false positive that redesign closed; (b) its
                  observation option never required the record to describe an
                  inference at all, so bare monitoring (clock-in logs) could
                  read as the trigger. § 7150(b)(5) now resolves solely from
                  the dedicated sensitive_location_basis question below. */}
              <div data-rail-key="q5b_profiling" onFocus={() => focusRail('q5b_profiling')}>
                <Label>Does the automated processing derive any personal attributes of your workers, students, or applicants — like their performance, reliability, health, or behavior — based on systematic observation of them? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(4))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">This is a separate risk-assessment trigger covering educational-program applicants, job applicants, students, employees, and independent contractors. Answer "Yes" only where the observation itself feeds an inference about the person — for example productivity, keystroke, or location tracking used to score performance or reliability. Bare record-keeping (e.g. clock-in/out logs kept as records) with no characteristic derived from it is not this trigger.</p>
                <div className="mt-2"><Radio name="q5b" options={["Yes", "No"]} value={q5bProfiling} onChange={setQ5bProfiling} /></div>
              </div>
              {/* TURN 1c (2026-08-26, CEO-directed redesign) — § 7150(b)(5) is a
                  direct Yes/No question on the statute's actual element
                  (inference FROM presence), not a location-type picker. The
                  prior 9-option enum let a business that merely OPERATES a
                  sensitive-location-type facility (e.g. a healthcare
                  analytics vendor processing hospital-sourced clinical data)
                  engage the trigger by naming its sector, with no requirement
                  that the record describe any actual presence-based
                  inference — see the CEO's redesign directive, 2026-08-26. */}
              <div data-rail-key="sensitive_location_basis" onFocus={() => focusRail('sensitive_location_basis')}>
                <Label>Does the automated processing derive any personal attributes of users, like their intelligence, health, or behavior, based on their presence in a sensitive location, such as a school, medical facility, or place of worship? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(5))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">This is a separate § 7150(b)(5) trigger. Answer "Yes" only where the processing draws a conclusion about a consumer FROM their detected presence at the location — not merely because your business operates at, or handles data from, a location of this type. The regulation lists the sensitive locations (healthcare facilities including hospitals, doctors' offices, urgent care facilities, and community health clinics; pharmacies; domestic violence shelters; food pantries; housing/emergency shelters; educational institutions; political party offices; legal services offices; union offices; and places of worship) and excludes "a business using a consumer's personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location."</p>
                <div className="mt-2"><Radio name="sensitive_location_basis" options={SENSITIVE_LOCATION_BASIS_OPTS} value={sensitiveLocationBasis} onChange={setSensitiveLocationBasis} /></div>
              </div>
              {/* DOC 157 (2026-09-03) — the stem carries the ADOPTED § 7001(e)
                  definition (the draft-era "materially contributes" wording is
                  retired); which kind of decision the system makes, and so
                  whether § 7150(b)(3) is engaged, is recorded in the
                  categorical question that follows the description. */}
              <div data-rail-key="q18_admt" onFocus={() => focusRail('q18_admt')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you use automated decisionmaking technology — technology that processes personal information and uses computation to replace or substantially replace human decisionmaking — for decisions about consumers? <Req /></Label><DefPopover termKey="admt" /><span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(e))</span></div><p className="text-xs text-muted-foreground mt-1">Answer "Yes" for any deployed use. The questions that follow record which kind of decision the system makes; § 7150(b)(3) applies when that decision is a significant decision under § 7001(ddd) (financial or lending services, housing, education, employment or independent contracting, or healthcare).</p><div className="mt-2"><Radio name="q18" options={["Yes", "No", "In evaluation"]} value={q18} onChange={setQ18} /></div></div>
              {(q18 === "Yes" || q18 === "In evaluation") && (
                <div><Label>Describe the ADMT system and its decisions <Req /></Label>
                  <div className="mt-2"><AssistedInput
                    value={q19}
                    onChange={setQ19}
                    pills={ASSISTED_INPUT_REGISTRY.q19_admt_description.pills}
                    rows={3}
                    placeholder="System, inputs, decision"
                    assertionSlot={renderAssertion("q19_admt_description")}
                  /></div>
                  <p className="text-body-tiny text-muted-foreground mt-1">Examples: an automated résumé-screening tool that ranks or rejects job applicants · a credit-decisioning model that sets limits without human review · worker-productivity scoring that drives scheduling or discipline decisions.</p>
                  {renderDecisionCategoryBlock("Which kind of decision does the automated decisionmaking technology make or contribute to?")}
                </div>
              )}
              {q18 === "Yes" && (
                <div><Label>Do you provide consumers with the right to opt out of ADMT? <Req /></Label><p className="text-xs text-muted-foreground mt-1">An opt-out is required for qualifying ADMT.</p><div className="mt-2"><Radio name="q20" options={["Yes, with documented opt-out", "Planned for implementation", "No"]} value={q20} onChange={setQ20} /></div>{renderAssertion("q20_admt_opt_out")}</div>
              )}
              {/* RK3-A2 g3 — § 7153 branch. Records whether this business makes
                  its ADMT available to another business, triggering the § 7153
                  risk-assessment obligation on the receiving side. */}
              {q18 === "Yes" && (
                <div data-rail-key="admt_section_7153" onFocus={() => focusRail('admt_section_7153')} className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50/40 dark:bg-blue-950/10 rounded-r space-y-3">
                  <Label className="font-semibold">§ 7153 — ADMT made available to another business <span className="text-xs text-muted-foreground">(conditional)</span></Label>
                  {/* DOC 157 (2026-09-03) — § 7153 stated as written: a duty to
                      provide facts to the recipient-business, not a
                      risk-assessment trigger. */}
                  <p className="text-xs text-muted-foreground">Under § 7153(a), a business that makes ADMT available to another business to make a significant decision "must provide to the recipient-business all facts available to the business that are necessary for the recipient-business to conduct its own risk assessment"; § 7153(b) limits this to ADMT trained using personal information. Answer these questions if this ADMT is or will be made available to another business.</p>
                  <div>
                    <Label className="text-sm">Do you make this ADMT available to another business?</Label>
                    <div className="mt-2"><Radio name="admt_made_available" options={["Yes", "No"]} value={admtMadeAvailableToOtherBusiness} onChange={setAdmtMadeAvailableToOtherBusiness} /></div>
                  </div>
                  {admtMadeAvailableToOtherBusiness === "Yes" && (
                    <>
                      <div>
                        <Label className="text-sm">Was this ADMT trained using personal information provided by the recipient business?</Label>
                        <div className="mt-2"><Radio name="admt_provider_trained" options={["Yes", "No", "Unknown"]} value={admtProviderTrainedUsingPi} onChange={setAdmtProviderTrainedUsingPi} /></div>
                      </div>
                      <div>
                        <Label className="text-sm">Does the recipient business use this ADMT to make significant decisions about consumers?</Label>
                        <div className="mt-2"><Radio name="recipient_uses_admt" options={["Yes", "No", "Unknown"]} value={recipientBusinessUsesAdmtForSignificantDecision} onChange={setRecipientBusinessUsesAdmtForSignificantDecision} /></div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div data-rail-key="q18b_admt_training" onFocus={() => focusRail('q18b_admt_training')}>
                {/* DOC 157 (2026-09-03) — the stem, cite, and second option now
                    track the adopted § 7150(b)(6): both limbs, and the
                    "intends to use" standard (using, plans to use, permits or
                    plans to permit others to use, advertises or markets, or
                    plans to advertise or market the use). The former cite
                    "(b)(5)" was wrong. */}
                <Label>Do you process personal information that your business uses, plans to use, permits or plans to permit others to use, or advertises or markets for use, to train either (a) ADMT for a significant decision about a consumer, or (b) facial-recognition, emotion-recognition, or other technology that verifies a consumer's identity or performs physical or biological identification or profiling? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(6))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Training such a model is an independent risk-assessment trigger, separate from <span className="font-medium">using</span> ADMT for a decision. It applies even if the trained system is never deployed against your own consumers, and it applies where another party trains on data you permit them to use. "Train" means "the process through which a technology discovers underlying patterns, learns a series of actions, or is taught to generate a desired output" — for example adjusting the parameters of an algorithm, improving the algorithm that determines how a model learns, or iterating the datasets fed into it (§ 7001(fff)).</p>
                <div className="mt-2"><Radio name="q21" options={["Yes — training ADMT for significant decisions", "Yes — training facial-recognition, emotion-recognition, identity-verification, or physical or biological identification or profiling technology", "No"]} value={q18bTraining} onChange={setQ18bTraining} /></div>
                {q18 !== "Yes" && q18 !== "In evaluation" && q18bTraining === "Yes — training ADMT for significant decisions" && (
                  renderDecisionCategoryBlock("Which kind of decision will the technology being trained make or contribute to?")
                )}
              </div>
              {admtTriggered && (
                <div data-coach-field="i5_admt_logic" data-rail-key="i5_admt" onFocus={() => focusRail('i5_admt')} className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/40 dark:bg-amber-950/10 rounded-r">
                  <Label className="font-semibold">Automated decisionmaking specifics <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(G))</span></Label>
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
                    <Textarea rows={3} value={i5AdmtLogic} onChange={(e) => setI5AdmtLogic(e.target.value)} placeholder="What it decides, and how" />
                    {renderAssertion("i5_admt_logic")}
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
                    <AssistedInput
                      value={i5AdmtTrainingSource}
                      onChange={setI5AdmtTrainingSource}
                      pills={ASSISTED_INPUT_REGISTRY.i5_admt_training_source.pills}
                      rows={2}
                      placeholder="Training-data source(s)"
                      assertionSlot={renderAssertion("i5_admt_training_source")}
                    />
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
                    <AssistedInput
                      value={i5AdmtFairnessTesting}
                      onChange={setI5AdmtFairnessTesting}
                      pills={ASSISTED_INPUT_REGISTRY.i5_admt_fairness_testing.pills}
                      rows={2}
                      placeholder="Fairness / bias testing approach"
                      assertionSlot={renderAssertion("i5_admt_fairness_testing")}
                    />
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
                    <AssistedInput
                      value={i5AdmtHumanReview}
                      onChange={setI5AdmtHumanReview}
                      pills={ASSISTED_INPUT_REGISTRY.i5_admt_human_review.pills}
                      rows={2}
                      placeholder="Who reviews, and what they can change"
                      assertionSlot={renderAssertion("i5_admt_human_review")}
                    />
                  </div>
                  <FscrCallout citation="11 CCR § 7152(a)(3)(G)" callouts={fscrCallouts} />
                  {/* RK3-A2 g2 — § 7152(a)(3)(G)(i)/(ii) extended ADMT record.
                      operational_role, assumptions_limitations, output, output_use,
                      and consumer_effect deepen the existing i5 ADMT fields. */}
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900 space-y-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Extended ADMT record (§ 7152(a)(3)(G)(i)–(ii))</p>
                    <div>
                      <Label className="text-sm">What operational role does this ADMT system play in this processing activity?</Label>
                      <Textarea className="mt-2" rows={2} value={admtOperationalRole} onChange={(e) => setAdmtOperationalRole(e.target.value)} onFocus={() => focusRail('i5_admt')} placeholder="e.g., Scores each applicant 0–100; scores below 40 trigger an automatic decline before any human reviewer sees the file." />
                    </div>
                    <div>
                      <Label className="text-sm">What are the key assumptions and known limitations of this ADMT system?</Label>
                      <Textarea className="mt-2" rows={2} value={admtAssumptionsLimitations} onChange={(e) => setAdmtAssumptionsLimitations(e.target.value)} onFocus={() => focusRail('i5_admt')} placeholder="e.g., Assumes applicant-reported income is accurate; does not account for seasonal employment patterns; trained on data from 2018–2022." />
                    </div>
                    <div>
                      <Label className="text-sm">What does this ADMT system output?</Label>
                      <Textarea className="mt-2" rows={2} value={admtOutput} onChange={(e) => setAdmtOutput(e.target.value)} onFocus={() => focusRail('i5_admt')} placeholder="e.g., A numeric score and a risk tier (Green / Amber / Red)." />
                    </div>
                    <div>
                      <Label className="text-sm">How is the ADMT output used in this activity?</Label>
                      <Textarea className="mt-2" rows={2} value={admtOutputUse} onChange={(e) => setAdmtOutputUse(e.target.value)} onFocus={() => focusRail('i5_admt')} placeholder="e.g., Green = auto-approve; Amber = route to underwriter; Red = auto-decline." />
                    </div>
                    <div>
                      <Label className="text-sm">What effect does the ADMT output have on consumers?</Label>
                      <Textarea className="mt-2" rows={2} value={admtConsumerEffect} onChange={(e) => setAdmtConsumerEffect(e.target.value)} onFocus={() => focusRail('i5_admt')} placeholder="e.g., Consumers in the Red tier are denied credit and receive an adverse action notice." />
                    </div>
                  </div>
                  {/* RK3-D (doc 33 D-L3) — typed ADMT operands. Each carries a
                      judgment into typed facts the report's ratified ADMT
                      tables consume; "Unsure" / "cannot be confirmed" is a
                      complete answer and is treated conservatively. */}
                  <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900 space-y-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Typed ADMT determinations (RK3-D)</p>
                    <div>
                      <Label className="text-sm">What role does the ADMT play in the decision? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001)</span></Label>
                      <div className="mt-2"><Radio name="admt_role_type" options={[...ADMT_ROLE_TYPE_OPTS]} value={rk3d.admt_role_type} onChange={(v) => setRk3dField("admt_role_type", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-sm">How is the ADMT's logic documented? <Req /></Label>
                      <div className="mt-2"><Radio name="admt_logic_documented" options={[...ADMT_LOGIC_DOCUMENTED_OPTS]} value={rk3d.admt_logic_documented} onChange={(v) => setRk3dField("admt_logic_documented", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-sm">Which of the following describe the human review, if any? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(ddd))</span></Label>
                      <p className="text-xs text-muted-foreground mt-1">Select all that can be confirmed. These three facts are the elements of effective human involvement.</p>
                      <div className="mt-2">
                        <Pills
                          options={[...HUMAN_REVIEW_FACTS_OPTS]}
                          value={rk3d.human_review_facts}
                          onChange={(v: string[]) => {
                            const EXCLUSIVE = ["None of the above can be confirmed", "There is no human review"];
                            const added = v.find((x) => EXCLUSIVE.includes(x) && !rk3d.human_review_facts.includes(x));
                            if (added) setRk3dField("human_review_facts", [added]);
                            else setRk3dField("human_review_facts", v.filter((x) => !EXCLUSIVE.includes(x) || v.length === 1));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Which of the following describe the ADMT's testing record? <Req /></Label>
                      <div className="mt-2">
                        <Pills
                          options={[...ADMT_TESTING_FACTS_OPTS]}
                          value={rk3d.admt_testing_facts}
                          onChange={(v: string[]) => {
                            const NONE = "No testing has been performed or confirmed";
                            const wasNone = rk3d.admt_testing_facts.includes(NONE);
                            const hasNone = v.includes(NONE);
                            if (hasNone && !wasNone) setRk3dField("admt_testing_facts", [NONE]);
                            else if (hasNone && v.length > 1) setRk3dField("admt_testing_facts", v.filter((x) => x !== NONE));
                            else setRk3dField("admt_testing_facts", v);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>How can consumers request access to the personal information you hold? <Req /></Label><DefPopover termKey="right_to_know" /></div>
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
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>How can consumers request deletion of their personal information? <Req /></Label><DefPopover termKey="right_to_delete" /></div><p className="text-xs text-muted-foreground mt-1">Describe the deletion request path and how you confirm it's done.</p><div className="mt-2"><Radio name="q7" options={["Automated deletion with confirmation", "Manual process, documented", "Case-by-case handling", "No formal process"]} value={q7} onChange={setQ7} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>How can consumers request correction of inaccurate personal information? <Req /></Label><DefPopover termKey="right_to_correct" /></div><p className="text-xs text-muted-foreground mt-1">How a consumer flags an error and how you correct it.</p><div className="mt-2"><Radio name="q8" options={["Online self-service", "Handled via support", "No formal process"]} value={q8} onChange={setQ8} /></div></div>
              <div data-rail-key="q9_opt_out" onFocus={() => focusRail('q9_opt_out')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Right to Opt-Out — do you have a "Do Not Sell or Share" link? <Req /></Label><DefPopover termKey="right_to_opt_out" /><EnforcementSignalIcon signalKey="opt_out_link" signals={enforcementSignals} /></div><p className="text-xs text-muted-foreground mt-1">A "Do Not Sell or Share" link is required if you sell or share PI.</p><div className="mt-2"><Radio name="q9" options={["Yes, prominently on homepage", "Yes, but in footer only", "In progress", "No"]} value={q9} onChange={setQ9} /></div></div>
              <div data-rail-key="q10_verification" onFocus={() => focusRail('q10_verification')}><Label>How do you verify the identity of consumers who submit rights requests? <span className="text-xs text-muted-foreground font-mono">(11 CCR §§ 7060–7062)</span></Label><p className="text-xs text-muted-foreground mt-1">The process you use to confirm a requester is who they claim to be.</p><div className="mt-2"><Radio name="q10" options={["Documented verification process matching CPPA guidance", "Informal verification", "No verification process"]} value={q10} onChange={setQ10} /></div></div>
              {/* RK3-D (doc 33 D-L3) — choice-architecture confirmations. */}
              <div>
                <Label>Which of the following can you confirm about how consumers are asked to permit this processing? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7004)</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Select only what you can confirm. An unconfirmed item is treated conservatively in the report — "None of the above can be confirmed" is a complete answer.</p>
                <div className="mt-2">
                  <Pills
                    options={[...CHOICE_ARCHITECTURE_CHECK_OPTS]}
                    value={rk3d.choice_architecture_check}
                    onChange={(v: string[]) => {
                      const NONE = "None of the above can be confirmed";
                      const wasNone = rk3d.choice_architecture_check.includes(NONE);
                      const hasNone = v.includes(NONE);
                      if (hasNone && !wasNone) setRk3dField("choice_architecture_check", [NONE]);
                      else if (hasNone && v.length > 1) setRk3dField("choice_architecture_check", v.filter((x) => x !== NONE));
                      else setRk3dField("choice_architecture_check", v);
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>The information, where it comes from, and who sees it</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(3); Cal. Civ. Code §§ 1798.100(a), 1798.130 — operational elements of the processing</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers become the operational record in the report: the categories in play, their sources, the recipients, and the disclosures consumers actually see.</p>
              <div data-rail-key="q4_pi_categories" onFocus={() => focusRail('q4_pi_categories')}>
                <Label>Which categories of personal information do you process? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(2))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Categories marked <span className="text-red-600 font-semibold">Sensitive</span> trigger additional obligations under Cal. Civ. Code § 1798.140(ae) and will auto-advance Q15.</p>
                <div className="mt-2">
                  <Pills
                    options={PI_CATEGORIES}
                    value={q4}
                    sensitiveSet={SENSITIVE_PI_CATEGORIES}
                    onChange={(v) => {
                      setQ4(v);
                      const hasSensitive = v.some((cat) => SENSITIVE_PI_CATEGORIES.has(cat));
                      if (hasSensitive && q15 === "") setQ15("Yes");
                    }}
                  />
                </div>
                {renderAssertion("q4_pi_categories")}
              </div>
              <div data-rail-key="q15_sensitive_pi" onFocus={() => focusRail('q15_sensitive_pi')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you process any sensitive PI? <Req /></Label><DefPopover termKey="sensitive_pi" /><EnforcementSignalIcon signalKey="sensitive_pi" signals={enforcementSignals} /></div><p className="text-xs text-muted-foreground mt-1">Sensitive PI includes government identifiers, account credentials, precise geolocation, race or ethnicity, health, biometrics, genetic and neural data, message contents, and more — see the definition. Under 11 CCR § 7001(bbb)(4) it also includes all personal information of consumers you have actual knowledge are under 16 (the next question); a "Yes" there engages the § 7150(b)(2) trigger on its own.</p><div className="mt-2"><Radio name="q15" options={Q15_SENSITIVE_PI_OPTS} value={q15} onChange={setQ15} /></div></div>
              {q15 === "Yes" && (<>
                <div data-rail-key="q15c_spi_volume" onFocus={() => focusRail('q15c_spi_volume')}>
                  <Label>For how many California consumers do you process sensitive personal information annually? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(B))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">Optional — this feeds the § 7120(b)(2)(B) SPI-volume cyber-audit prong. Give your best estimate for the distinct California residents whose SPI you process in a year.</p>
                  <div className="mt-2"><Radio name="q15c" options={SPI_VOLUME_OPTS} value={q15cSpiVolume} onChange={setQ15cSpiVolume} /></div>
                </div>
                <div><Label>Do you provide consumers the right to limit use of their sensitive PI? <Req /></Label><p className="text-xs text-muted-foreground mt-1">The right to limit applies when you use sensitive PI beyond what's necessary.</p><div className="mt-2"><Radio name="q16" options={["Yes, with a separate \"Limit the Use of My Sensitive PI\" link", "Yes, handled within privacy settings", "No", "Not yet implemented"]} value={q16} onChange={setQ16} /></div></div>
                <div><Label>What is your legal basis for processing sensitive PI? <Req /></Label><p className="text-xs text-muted-foreground mt-1">The lawful basis you rely on to process sensitive PI.</p><div className="mt-2"><Radio name="q17" options={["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"]} value={q17} onChange={setQ17} /></div></div>
                {/* PN-CORPUS-L-RISK-1 — § 7150(b)(2)(A) personnel carve-out. */}
                <div data-rail-key="q15d_hr_carveout" onFocus={() => focusRail('q15d_hr_carveout')}>
                  <Label>Is the sensitive PI in this activity solely that of your employees or independent contractors, used solely and specifically for administering compensation, employment authorization, employment benefits, legally required reasonable accommodation, or legally required wage reporting? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(2)(A))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">Section 7150(b)(2)(A) exempts sensitive-PI processing done solely and specifically for these routine personnel purposes from the § 7150(b)(2) risk-assessment trigger. Any other processing of consumers' sensitive PI remains subject to the requirement — if this activity also processes consumer sensitive PI, or uses the personnel data for anything beyond these purposes, answer "No".</p>
                  <div className="mt-2"><Radio name="q15d" options={["Yes — solely for those personnel purposes", "No — processed for other purposes as well", "Not applicable — no employee or contractor sensitive PI"]} value={q15dHrCarveout} onChange={setQ15dHrCarveout} /></div>
                </div>
                {/* RK3-A2 g4 — PN-RK7 SPI employment-exception facts.
                    The former § 1798.145(m) employment exemption expired
                    2023-01-01; where "Employment contract" is the claimed basis,
                    the assessment must document the facts establishing strict
                    necessity for the employment relationship. */}
                {q17 === "Employment contract" && (
                  <div data-rail-key="spi_employment_exception" onFocus={() => focusRail('spi_employment_exception')} className="mt-3 pl-4 border-l-4 border-rose-400 py-2 bg-rose-50/40 dark:bg-rose-950/10 rounded-r">
                    <Label className="text-sm font-semibold">Employment-basis justification (PN-RK7) <span className="text-xs text-muted-foreground">(required for employment basis)</span></Label>
                    <p className="text-xs text-muted-foreground mt-1">The former § 1798.145(m) employment exemption expired January 1, 2023 and is no longer operative. Where an employment contract is the claimed basis, the assessment must state the specific facts showing that the processing of this sensitive PI is strictly necessary for the employment relationship — what the PI is, why it is necessary (not merely useful), and what the alternative would be if the employee or contractor did not consent.</p>
                    <Textarea className="mt-2" rows={4} value={spiEmploymentExceptionFacts} onChange={(e) => setSpiEmploymentExceptionFacts(e.target.value)} onFocus={() => focusRail('spi_employment_exception')} placeholder="e.g., Biometric time-and-attendance data (fingerprint scans) is necessary to comply with the time-record requirements of the California Labor Code and to prevent buddy-punching fraud. No adequate non-biometric alternative exists at our facility size and shift-pattern complexity. Employees are informed in their offer letter and at onboarding." />
                  </div>
                )}
              </>)}
              <div data-rail-key="q15b_under16" onFocus={() => focusRail('q15b_under16')}>
                <Label>Do you know that you collect personal information from consumers under 16? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(bbb))</span></Label><p className="text-xs text-muted-foreground mt-1">"Actual knowledge" is the legal standard — meaning your business is actually aware, not merely on notice. This includes knowledge gained from age screening, account data, or other direct signals.</p>
                <p className="text-xs text-muted-foreground mt-1">Under the 2026 regulations, <span className="font-medium">all</span> personal information of a consumer under 16 is sensitive personal information where the business has actual knowledge of the age. Requesting age at sign-up, or willfully disregarding age, counts as actual knowledge — and pulls this processing into the sensitive-PI rules.</p>
                <div className="mt-2"><Radio name="q15b" options={["Yes — we knowingly process under-16 data", "No — we do not knowingly process under-16 data", "Unsure"]} value={q15bUnder16} onChange={setQ15bUnder16} /></div>
              </div>
              <div data-rail-key="i4b_sources" onFocus={() => focusRail('i4b_sources')}>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Where does this personal information come from? <span className="text-xs text-muted-foreground">(§ 7152(a)(3))</span></Label><StatutePopover term="Sources of the PI" summary="The operational elements of the processing must identify the sources of the personal information — for example, directly from the consumer, observed, or obtained from third parties." cite="11 CCR § 7152(a)(3)" /></div>
                <p className="text-xs text-muted-foreground mt-1">Identify each source: collected directly from the consumer, passively observed from their activity, generated/inferred by you, or obtained from third parties (data brokers, advertising or analytics partners, affiliates, public records). Note which categories come from which source.</p>
                <ExhibitTextarea className="mt-2" rows={3} value={i4bSources} onChange={setI4bSources} placeholder='Category — source, one per line' />
                {renderAssertion("i4b_sources")}
              </div>
              {/* RK3-D (doc 33 D-L3) — typed source categories; the report's
                  source-risk table reads these, the free text above stays as
                  the descriptive record. */}
              <div>
                <Label>For the record: which source categories apply? <Req /></Label>
                <p className="text-xs text-muted-foreground mt-1">Select every category the information actually comes through.</p>
                <div className="mt-2"><Pills options={[...SOURCE_CATEGORY_OPTS]} value={rk3d.source_categories} onChange={(v: string[]) => setRk3dField("source_categories", v)} /></div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Approximately how many California consumers does this activity affect? <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(D))</span></Label><StatutePopover term="California consumer count" summary="State the approximate number of consumers whose personal information the processing affects." cite="11 CCR § 7152(a)(4)(D)" /></div>
                <div className="mt-2"><Radio name="i3" options={CA_CONSUMER_BAND} value={i3CaConsumerBand} onChange={setI3CaConsumerBand} /></div>
              </div>
              {/* RK3-A1 g2 — § 7152(a)(3)(D) activity-specific estimate (the band
                  above stays for screening/analytics) + § 7152(a)(3)(C)
                  interaction method and purpose. */}
              <div data-rail-key="consumer_interaction" onFocus={() => focusRail('consumer_interaction')}>
                <Label htmlFor="approximate_ca_consumers">State that approximate number for the record — a number or a range. <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(D))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">The assessment record carries your stated figure, not just the band — e.g., “about 45,000” or “40,000–60,000”.</p>
                <input
                  id="approximate_ca_consumers"
                  type="text"
                  value={approximateCaConsumers}
                  onChange={(e) => setApproximateCaConsumers(e.target.value)}
                  onFocus={() => focusRail('consumer_interaction')}
                  placeholder="e.g., 40,000–60,000"
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                />
              </div>
              <div data-rail-key="consumer_interaction" onFocus={() => focusRail('consumer_interaction')}>
                <Label>How does your business interact with the consumers this activity affects? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(C))</span></Label>
                <div className="mt-2"><Radio name="consumer_interaction_method" options={[...CONSUMER_INTERACTION_METHOD_OPTS]} value={consumerInteractionMethod} onChange={setConsumerInteractionMethod} /></div>
              </div>
              {/* RK3-D (doc 33 D-L3) — relationship context; frames the
                  expectation and coercion analyses. */}
              <div>
                <Label>Who are the affected consumers, in relation to your business? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7002(b))</span></Label>
                <div className="mt-2"><Radio name="consumer_relationship_context" options={[...CONSUMER_RELATIONSHIP_CONTEXT_OPTS]} value={rk3d.consumer_relationship_context} onChange={(v) => setRk3dField("consumer_relationship_context", v)} /></div>
              </div>
              {/* RK3-D (doc 33 D-L3) — § 7002(b)-factor expectation markers. */}
              <div>
                <Label>Which of the following apply to this processing? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7002(b))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">These facts frame what a consumer can reasonably expect. Select all that apply — "None of the above apply" is a complete answer.</p>
                <div className="mt-2">
                  <Pills
                    options={[...EXPECTATION_CHECK_OPTS]}
                    value={rk3d.expectation_check}
                    onChange={(v: string[]) => {
                      const NONE = "None of the above apply";
                      const wasNone = rk3d.expectation_check.includes(NONE);
                      const hasNone = v.includes(NONE);
                      if (hasNone && !wasNone) setRk3dField("expectation_check", [NONE]);
                      else if (hasNone && v.length > 1) setRk3dField("expectation_check", v.filter((x) => x !== NONE));
                      else setRk3dField("expectation_check", v);
                    }}
                  />
                </div>
              </div>
              <div data-rail-key="consumer_interaction" onFocus={() => focusRail('consumer_interaction')}>
                <Label htmlFor="consumer_interaction_purpose">Why does the consumer interact with your business in this context? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(C))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">The consumer's side of the transaction — e.g., to buy a product, use a service, apply for a job. Separate from the processing purpose. If there is no direct interaction, say how the information reaches you instead.</p>
                <textarea
                  id="consumer_interaction_purpose"
                  value={consumerInteractionPurpose}
                  onChange={(e) => setConsumerInteractionPurpose(e.target.value)}
                  onFocus={() => focusRail('consumer_interaction')}
                  rows={2}
                  placeholder="e.g., Members join the loyalty program at the register to collect points on their grocery shopping."
                  className="mt-2 w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap" data-rail-key="i6_recipients" onFocus={() => focusRail('i6_recipients')}><Label>Which service providers, contractors, or third parties are involved? <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(F))</span></Label><StatutePopover term="Recipients of the PI" summary="Identify the recipients of the personal information — service providers, contractors, and third parties — together with their category and the purpose of each disclosure." cite="11 CCR § 7152(a)(3)(F)" /></div>
                <p className="text-xs text-muted-foreground mt-1">For each recipient, note its category — <span className="font-medium">service provider</span>, <span className="font-medium">contractor</span>, or <span className="font-medium">third party</span> — and the purpose of the disclosure. The category matters: disclosure to a third party for its own use is a sale or share.</p>
                <ExhibitTextarea
                  className="mt-2"
                  rows={3}
                  value={i6Vendors}
                  onChange={setI6Vendors}
                  placeholder='Name — role — data shared'
                />
                {renderAssertion("i6_vendors")}
              </div>
              {/* RK3-A1 g5 — § 7152(a)(3)(F) canonical recipient record. The
                  free-text list above stays as the legacy summary. */}
              <div data-rail-key="recipients_record" onFocus={() => focusRail('recipients_record')}>
                <Label>For the record: each recipient, its type, the categories it receives, and why. <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(F))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">One row per recipient. The type matters: disclosure to a third party for its own use is a sale or share.</p>
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={recipientsNoneDeclared}
                    onChange={(e) => setRecipientsNoneDeclared(e.target.checked)}
                    onFocus={() => focusRail('recipients_record')}
                  />
                  <span>No service provider, contractor, or third party receives or has access to personal information in this activity.</span>
                </label>
                {!recipientsNoneDeclared && (
                  <>
                    <div className="mt-2 space-y-2">
                      {recipientRows.map((row, idx) => (
                        <div key={idx} className="rounded-lg border border-input p-3 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-muted-foreground">Recipient #{idx + 1}</p>
                            <button
                              type="button"
                              onClick={() => setRecipientRows((prev) => prev.filter((_, i) => i !== idx))}
                              disabled={recipientRows.length === 1}
                              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid gap-2 xl:grid-cols-[1.2fr_0.9fr] items-start">
                            <input
                              className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                              value={row.recipient_name_or_category}
                              onChange={(e) => setRecipientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, recipient_name_or_category: e.target.value } : r)))}
                              onFocus={() => focusRail('recipients_record')}
                              placeholder="Name or category — e.g., Print-and-mail vendor"
                            />
                            <select
                              className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                              value={row.recipient_type}
                              onChange={(e) => setRecipientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, recipient_type: e.target.value } : r)))}
                              onFocus={() => focusRail('recipients_record')}
                            >
                              <option value="">Type…</option>
                              <option>Service provider</option>
                              <option>Contractor</option>
                              <option>Third party</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Categories made available to this recipient:</p>
                            <div className="mt-1"><Pills options={q4.length ? q4 : PI_CATEGORIES} value={row.pi_categories_made_available} onChange={(next: string[]) => setRecipientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, pi_categories_made_available: next } : r)))} /></div>
                          </div>
                          <input
                            className="h-10 px-3 rounded-md border border-input bg-background w-full"
                            value={row.disclosure_purpose}
                            onChange={(e) => setRecipientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, disclosure_purpose: e.target.value } : r)))}
                            onFocus={() => focusRail('recipients_record')}
                            placeholder="Purpose of the disclosure — e.g., Printing and mailing the monthly coupon batch"
                          />
                          {/* RK3-D (doc 33 D-L3) — contractual-protection status. */}
                          <select
                            className="h-10 px-3 rounded-md border border-input bg-background w-full"
                            value={row.contractual_protections || ""}
                            onChange={(e) => setRecipientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, contractual_protections: e.target.value } : r)))}
                            onFocus={() => focusRail('recipients_record')}
                          >
                            <option value="">Contractual protections…</option>
                            {RECIPIENT_CONTRACT_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecipientRows((prev) => [...prev, { recipient_name_or_category: "", recipient_type: "", pi_categories_made_available: [], disclosure_purpose: "", contractual_protections: "" }])}
                      className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                    >
                      + Add a recipient
                    </button>
                  </>
                )}
              </div>
              {/* RK3-D (doc 33 D-L3) — vendor dependency. */}
              <div>
                <Label>Is any recipient or vendor essential to this processing? <Req /></Label>
                <p className="text-xs text-muted-foreground mt-1">"Essential" means the processing could not continue without them. "Unsure" is a complete answer.</p>
                <div className="mt-2"><Radio name="vendor_dependency" options={[...VENDOR_DEPENDENCY_OPTS]} value={rk3d.vendor_dependency} onChange={(v) => setRk3dField("vendor_dependency", v)} /></div>
                {rk3d.vendor_dependency === "One or more vendors are essential — the processing could not continue without them" && (
                  <div className="mt-2">
                    <Label className="text-sm">Name the essential vendors and what each provides</Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={rk3d.essential_vendors}
                      onChange={(e) => setRk3dField("essential_vendors", e.target.value)}
                      placeholder="e.g., Acme Cloud (hosting) and DataCo (identity verification)"
                    />
                  </div>
                )}
              </div>
              <div><Label>When was your privacy policy last reviewed or updated? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.130(a)(5))</span></Label><p className="text-xs text-muted-foreground mt-1">CCPA expects a review at least every 12 months.</p><div className="mt-2"><Radio name="q11" options={["Within 12 months", "12–24 months ago", "Over 24 months ago", "No privacy policy"]} value={q11} onChange={setQ11} /></div>{renderAssertion("q11_policy_review")}</div>
              <div><Label>Do you show a notice at collection at or before the point you collect PI? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.100(a))</span></Label><p className="text-xs text-muted-foreground mt-1">The short notice shown where data is collected — separate from the full policy.</p><div className="mt-2"><Radio name="q12" options={["Yes, covers all collection points", "Yes, partial coverage", "No"]} value={q12} onChange={setQ12} /></div></div>
              <div><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do your notices include the categories of PI collected, the purpose, and the right to opt-out? <Req /></Label><DefPopover termKey="notice_at_collection" /></div><p className="text-xs text-muted-foreground mt-1">Notice at collection must state categories, purpose, and the opt-out right.</p><div className="mt-2"><Radio name="q13" options={["Yes, all three", "Some elements", "No"]} value={q13} onChange={setQ13} /></div></div>
              <div><Label>For employees/job applicants — do you provide a separate California-specific notice? <span className="text-xs text-muted-foreground font-mono">(Cal. Civ. Code § 1798.100(a))</span></Label><p className="text-xs text-muted-foreground mt-1">California employees and job applicants need their own notice.</p><div className="mt-2"><Radio name="q14" options={["Yes", "No — we use our general privacy policy", "Not applicable (no CA employees)"]} value={q14} onChange={setQ14} /></div></div>
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>How are consumers informed of this processing activity? <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(E))</span></Label><StatutePopover term="Disclosure mechanisms" summary="Identify the disclosures made to consumers about the processing and how they are provided." cite="11 CCR § 7152(a)(4)(E)" /></div>
                <p className="text-xs text-muted-foreground mt-1">Select every mechanism that applies. The report will map your selections against the conspicuousness requirements of § 7003.</p>
                <div className="mt-2"><Pills options={DISCLOSURE_MECHANISMS} value={i4Disclosures} onChange={setI4Disclosures} /></div>
                {renderAssertion("i4_disclosure_mechanisms")}
              </div>
              {/* RK3-A1 g4 — § 7152(a)(3)(E) canonical activity-disclosure
                  record: content + method + Made/Planned per disclosure. The
                  mechanism pills above stay as the summary. */}
              <div data-rail-key="activity_disclosures" onFocus={() => focusRail('activity_disclosures')}>
                <Label>For this activity, what are consumers told — or will they be told — and how? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(E))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">One row per material disclosure: the substance of what is said, how it is or will be delivered, and whether it is already made or still planned.</p>
                <div className="mt-2 space-y-2">
                  {activityDisclosures.map((row, idx) => (
                    <div key={idx} className="rounded-lg border border-input p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-muted-foreground">Disclosure #{idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => setActivityDisclosures((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={activityDisclosures.length === 1}
                          className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={row.disclosure_content}
                        onChange={(e) => setActivityDisclosures((prev) => prev.map((r, i) => (i === idx ? { ...r, disclosure_content: e.target.value } : r)))}
                        onFocus={() => focusRail('activity_disclosures')}
                        rows={2}
                        placeholder="What consumers are or will be told — e.g., “The sign-up form states that name, address, and birth month are used to mail a birthday coupon.”"
                        className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      />
                      <div className="grid gap-2 xl:grid-cols-[1.2fr_0.8fr_1fr] items-start">
                        <select
                          className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                          value={row.disclosure_method}
                          onChange={(e) => setActivityDisclosures((prev) => prev.map((r, i) => (i === idx ? { ...r, disclosure_method: e.target.value } : r)))}
                          onFocus={() => focusRail('activity_disclosures')}
                        >
                          <option value="">How it is made…</option>
                          {DISCLOSURE_MECHANISMS.filter((m) => m !== "No standalone disclosure").map((m) => <option key={m}>{m}</option>)}
                          <option>Other (describe in the content)</option>
                        </select>
                        <select
                          className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                          value={row.status}
                          onChange={(e) => setActivityDisclosures((prev) => prev.map((r, i) => (i === idx ? { ...r, status: e.target.value } : r)))}
                          onFocus={() => focusRail('activity_disclosures')}
                        >
                          <option value="">Made or planned…</option>
                          <option>Made</option>
                          <option>Planned</option>
                        </select>
                        <input
                          className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                          value={row.timing_or_location}
                          onChange={(e) => setActivityDisclosures((prev) => prev.map((r, i) => (i === idx ? { ...r, timing_or_location: e.target.value } : r)))}
                          onFocus={() => focusRail('activity_disclosures')}
                          placeholder="Timing / location (optional)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActivityDisclosures((prev) => [...prev, { disclosure_content: "", disclosure_method: "", status: "", timing_or_location: "" }])}
                  className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                >
                  + Add a disclosure
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2>The minimum-necessary test, retention, and any business purposes you rely on</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(2)–(3)(B); Cal. Civ. Code §§ 1798.140(e), 1798.145 — minimisation analysis, retention, and enumerated business purposes</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers drive the minimisation analysis in the report — each element tested against the stated purpose — together with the retention plan and any enumerated business purpose the activity leans on.</p>
              <div data-coach-field="i1b_min_pi" data-rail-key="i1b_min_pi" onFocus={() => focusRail('i1b_min_pi')}>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>What is the minimum personal information necessary to achieve this purpose? <span className="text-xs text-muted-foreground">(§ 7152(a)(2))</span></Label><StatutePopover term="Minimum PI necessary" summary="The assessment must identify the minimum personal information necessary to achieve the purpose, reflecting the CCPA's data-minimisation principle." cite="11 CCR § 7152(a)(2)" /></div>
                <p className="text-xs text-muted-foreground mt-1">Name the specific data elements you actually need for the purpose above, and note any you collect today that are <span className="font-medium">not</span> strictly necessary. If a less-identifying alternative (de-identified, aggregated, or shorter-retained data) could achieve the same purpose, say so — § 7152(a)(2) requires this minimisation analysis.</p>
                <ExhibitTextarea className="mt-2" rows={3} value={i1bMinPi} onChange={setI1bMinPi} placeholder='Elements needed, and elements not needed' />
                {renderAssertion("i1b_min_pi")}
              </div>
              <div data-rail-key="i2_retention" onFocus={() => focusRail('i2_retention')}>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>How long will you keep this data, and how is that period set? <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(B))</span></Label><StatutePopover term="Retention period" summary="State how long each category of personal information will be retained, or the criteria used to determine that period." cite="11 CCR § 7152(a)(4)(B)" /></div>
                <input
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={i2RetentionPeriod}
                  onChange={(e) => setI2RetentionPeriod(e.target.value)}
                  placeholder="E.g. 24 months from collection; 7 years after relationship ends"
                />
                {renderAssertion("i2_retention_period")}
                <select
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={i2RetentionCriteria}
                  onChange={(e) => setI2RetentionCriteria(e.target.value)}
                >
                  <option value="">Retention criteria…</option>
                  {RETENTION_CRITERIA.map((c) => <option key={c}>{c}</option>)}
                </select>
                {renderAssertion("i2_retention_criteria")}
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={i2RetentionDetail}
                  onChange={(e) => setI2RetentionDetail(e.target.value)}
                  placeholder="Statutory basis, or other criteria"
                />
                {renderAssertion("i2_retention_detail")}
              </div>
              {/* RK3-A1 g3 — § 7152(a)(3)(B) canonical per-category retention
                  record. The i2 fields above stay as the overall summary. */}
              <div data-rail-key="retention_by_category" onFocus={() => focusRail('retention_by_category')}>
                <Label>For each category of personal information, how long is it kept? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(B))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">One row per category this activity processes. Give the period — or, if the period is not known, the criteria used to determine it.</p>
                <div className="mt-2 space-y-2">
                  {retentionByPiCategory.map((row, idx) => (
                    <div key={idx} className="grid gap-2 xl:grid-cols-[1.2fr_1fr_1fr_auto] items-start">
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                        value={row.pi_category}
                        onChange={(e) => setRetentionByPiCategory((prev) => prev.map((r, i) => (i === idx ? { ...r, pi_category: e.target.value } : r)))}
                        onFocus={() => focusRail('retention_by_category')}
                      >
                        <option value="">Category…</option>
                        {(q4.length ? q4 : PI_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input
                        className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                        value={row.retention_period}
                        onChange={(e) => setRetentionByPiCategory((prev) => prev.map((r, i) => (i === idx ? { ...r, retention_period: e.target.value } : r)))}
                        onFocus={() => focusRail('retention_by_category')}
                        placeholder="Period — e.g., 24 months"
                      />
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                        value={row.retention_criteria}
                        onChange={(e) => setRetentionByPiCategory((prev) => prev.map((r, i) => (i === idx ? { ...r, retention_criteria: e.target.value } : r)))}
                        onFocus={() => focusRail('retention_by_category')}
                      >
                        <option value="">Criteria (if period unknown)…</option>
                        {RETENTION_CRITERIA.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setRetentionByPiCategory((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={retentionByPiCategory.length === 1}
                        className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40 h-10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRetentionByPiCategory((prev) => [...prev, { pi_category: "", retention_period: "", retention_criteria: "" }])}
                  className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                >
                  + Add a category row
                </button>
              </div>
                {/* A-2 — minimum-necessary candidate set */}
                <div data-rail-key="i1b_min_pi" onFocus={() => focusRail('i1b_min_pi')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Which data elements do you collect, and is each one necessary for your stated purpose? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(2))</span></Label><StatutePopover term="Minimum-necessary set" summary="The assessment must identify the minimum personal information necessary to achieve the purpose; each element collected is tested against that purpose." cite="11 CCR § 7152(a)(2)" /></div>
                  <p className="text-xs text-muted-foreground mt-1">List each data element this activity collects. Mark the ones that are not necessary — they become minimisation findings in the report.</p>
                  <div className="mt-2 space-y-2">
                    {a2NecessitySet.map((row, idx) => (
                      <div key={idx} className="grid gap-2 xl:grid-cols-[1fr_1fr_1.4fr] items-start">
                        <input
                          className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                          value={row.element}
                          onChange={(e) => setA2NecessitySet((rows) => rows.map((r, i) => i === idx ? { ...r, element: e.target.value } : r))}
                          placeholder="Data element (e.g. precise geolocation)"
                        />
                        <select
                          className="h-10 px-3 rounded-md border border-input bg-background"
                          value={row.necessity}
                          onChange={(e) => setA2NecessitySet((rows) => rows.map((r, i) => i === idx ? { ...r, necessity: e.target.value } : r))}
                        >
                          <option value="">Necessary to the purpose?…</option>
                          {NECESSITY_STATUS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input
                          className="h-10 px-3 rounded-md border border-input bg-background"
                          value={row.justification}
                          onChange={(e) => setA2NecessitySet((rows) => rows.map((r, i) => i === idx ? { ...r, justification: e.target.value } : r))}
                          placeholder="Reason this element is here"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setA2NecessitySet((r) => [...r, { element: "", necessity: "", justification: "" }])}>Add element</Button>
                    {a2NecessitySet.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setA2NecessitySet((r) => r.slice(0, -1))}>Remove last</Button>
                    )}
                  </div>
                </div>
              <OptionalCluster title="Business purposes and statutory exemptions" valueLine="Left unclaimed, the report records no enumerated business purpose for this activity; nothing is inferred on your behalf.">
              {/* === CCPA business purposes / statutory exemptions (optional) — moved to follow retention === */}
              <div data-coach-field="exceptions_intake" className="border-t pt-6 mt-6">
                <Label className="text-base font-semibold">CCPA business purposes &amp; statutory exemptions <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Check any that apply to this activity; leave blank if none do. These are the "business purposes" listed in <span className="font-mono">Cal. Civ. Code § 1798.140(e)</span> and the exemptions in <span className="font-mono">§ 1798.145</span> — they permit specific internal uses or carve out specific obligations, but they do <span className="font-medium">not</span> remove a § 7150 risk-assessment trigger.
                </p>
                <div className="mt-3 space-y-3">
                  {CPPA_EXCEPTIONS.map((ex) => {
                    const cur: ExceptionClaim = exceptionClaims[ex.key] ?? { claimed: false, scope: "", safeguards: "", authority_basis: "", retention_period: "" };
                    return (
                      <div key={ex.key} className="rounded border p-3" data-rail-key={ex.railKey} onFocus={() => focusRail(ex.railKey)} onClick={() => focusRail(ex.railKey)}>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={cur.claimed}
                            onChange={(e) => setExceptionClaims((m) => ({ ...m, [ex.key]: { ...cur, claimed: e.target.checked } }))}
                          />
                          <span className="text-sm font-medium">{ex.label} <span className="text-xs text-muted-foreground font-mono">({ex.cite})</span></span>
                        </label>
                        {cur.claimed && (
                          <div className="mt-2 space-y-2 pl-6">
                            <Textarea
                              rows={2}
                              value={cur.scope}
                              onChange={(e) => setExceptionClaims((m) => ({ ...m, [ex.key]: { ...cur, scope: e.target.value } }))}
                              placeholder="Activity and data covered"
                            />
                            <Textarea
                              rows={2}
                              value={cur.safeguards}
                              onChange={(e) => setExceptionClaims((m) => ({ ...m, [ex.key]: { ...cur, safeguards: e.target.value } }))}
                              placeholder="Documented safeguards"
                            />
                            <Textarea
                              rows={2}
                              value={cur.authority_basis ?? ""}
                              onChange={(e) => setExceptionClaims((m) => ({ ...m, [ex.key]: { ...cur, authority_basis: e.target.value } }))}
                              placeholder="Statutes or rules relied on"
                            />
                            <Textarea
                              rows={2}
                              value={cur.retention_period ?? ""}
                              onChange={(e) => setExceptionClaims((m) => ({ ...m, [ex.key]: { ...cur, retention_period: e.target.value } }))}
                              placeholder="Retention period for this purpose"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {renderAssertion("exceptions_intake")}
              </div>
              </OptionalCluster>
            </>
          )}

          {step === 5 && (
            <>
              <h2>The negative impacts, and the safeguards that meet them</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(5)–(6) — negative impacts, their sources and causes, and the safeguards addressing them</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers build the impacts analysis: each impact with its source and cause, the safeguard mapped to it, and the risk that remains once the safeguard is in place. An impact with no safeguard is reported as unaddressed.</p>
                  <div>
                    <Label>Likelihood of harm to consumers</Label>
                    <div className="mt-2"><Radio name="impact_likelihood" options={IMPACT_LIKELIHOOD_OPTS} value={impactData.likelihood} onChange={(v) => setImpactData((d) => ({ ...d, likelihood: v }))} /></div>
                  </div>
                  <div>
                    <Label>Severity of harm if it occurs</Label>
                    <div className="mt-2"><Radio name="impact_severity" options={IMPACT_SEVERITY_OPTS} value={impactData.severity} onChange={(v) => setImpactData((d) => ({ ...d, severity: v }))} /></div>
                  </div>
                  <div data-rail-key="impact_harm_causes" onFocus={() => focusRail('impact_harm_causes')}>
                    <Label>Types of harm that could result <span className="text-xs text-muted-foreground font-mono">(§ 7152(a)(5))</span></Label>
                    <div className="mt-2"><Pills options={HARM_TYPES} value={impactData.harmTypes} onChange={(v) => setImpactData((d) => ({ ...d, harmTypes: v }))} /></div>
                    <p className="text-xs text-muted-foreground mt-2">For the harms selected above, describe their <span className="font-medium">sources and causes</span> — what about this processing creates each harm. § 7152(a)(5) requires the assessment to identify the sources and causes of negative impacts, not just the harms.</p>
                    <Textarea className="mt-2" rows={3} value={impactData.harmCauses} onChange={(e) => setImpactData((d) => ({ ...d, harmCauses: e.target.value }))} placeholder='Source and cause of each impact' />
                  </div>
                {/* A-5 — harm pathways against the statutory catalogue */}
                <div data-coach-field="a5_harm_pathways" data-rail-key="impact_harm_causes" onFocus={() => focusRail('impact_harm_causes')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>What negative impacts could this processing cause, and what causes each one? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(5)(A)–(H))</span></Label><StatutePopover term="Negative impacts" summary="Identify the negative impacts to consumers' privacy associated with the processing, and the sources and causes of those impacts." cite="11 CCR § 7152(a)(5)" /></div>
                  <p className="text-xs text-muted-foreground mt-1">One row per impact. The source is where the impact comes from; the cause is what about this processing produces it.</p>
                  <div className="mt-2 space-y-3">
                    {a5HarmPathways.map((row, idx) => (
                      <div key={idx} className="rounded-md border border-input p-3 space-y-2">
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={row.harm}
                          onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, harm: e.target.value } : r))}
                        >
                          <option value="">Select the statutory impact category…</option>
                          {HARM_PATHWAY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Textarea rows={2} value={row.data_involved} onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, data_involved: e.target.value } : r))} placeholder="Data elements exposed" />
                        <Textarea rows={2} value={row.actor} onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, actor: e.target.value } : r))} placeholder="Who or what acts on the data" />
                        <Textarea rows={2} value={row.source} onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, source: e.target.value } : r))} placeholder="Where the impact comes from" />
                        <Textarea rows={2} value={row.cause} onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, cause: e.target.value } : r))} placeholder="What produces the impact" />
                        <div className="grid gap-2 md:grid-cols-2">
                          <select
                            className="h-10 px-3 rounded-md border border-input bg-background"
                            value={row.likelihood}
                            onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, likelihood: e.target.value } : r))}
                          >
                            <option value="">Likelihood…</option>
                            {HARM_LIKELIHOOD_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <select
                            className="h-10 px-3 rounded-md border border-input bg-background"
                            value={row.severity}
                            onChange={(e) => setA5HarmPathways((rows) => rows.map((r, i) => i === idx ? { ...r, severity: e.target.value } : r))}
                          >
                            <option value="">Severity…</option>
                            {HARM_SEVERITY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setA5HarmPathways((r) => [...r, { harm: "", data_involved: "", actor: "", source: "", cause: "", likelihood: "", severity: "" }])}>Add impact</Button>
                    {a5HarmPathways.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setA5HarmPathways((r) => r.slice(0, -1))}>Remove last</Button>
                    )}
                  </div>
                  {/* RK3-D (doc 33 D-L3) — pathway interdependency. */}
                  <div className="mt-4">
                    <Label>Do the impacts above operate independently, or could any compound each other? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7154)</span></Label>
                    <p className="text-xs text-muted-foreground mt-1">Impacts compound when one occurring makes another more likely or more severe — for example, a breach that also exposes information enabling reputational harm.</p>
                    <div className="mt-2"><Radio name="risk_interdependency_check" options={[...RISK_INTERDEPENDENCY_OPTS]} value={rk3d.risk_interdependency_check} onChange={(v) => setRk3dField("risk_interdependency_check", v)} /></div>
                    {rk3d.risk_interdependency_check === "Two or more identified pathways could compound each other" && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Select the pathways that could compound each other (at least two):</p>
                        <Pills options={[...HARM_PATHWAY_OPTS]} value={rk3d.compounding_pathways} onChange={(v: string[]) => setRk3dField("compounding_pathways", v)} />
                      </div>
                    )}
                  </div>
                </div>
                  <div data-rail-key="impact_safeguards" onFocus={() => focusRail('impact_safeguards')}>
                    <Label>Safeguards planned to address these harms <span className="text-xs text-muted-foreground font-mono">(§ 7152(a))</span></Label>
                    <p className="text-xs text-muted-foreground mt-1">Identify the safeguards you have or plan to put in place to reduce the negative impacts above — for example encryption, access controls, data minimisation at point of transfer, contractual restrictions on recipients, privacy-enhancing technologies, or de-identification. This is a required element; leaving it blank produces a fill-in in the report.</p>
                    <Textarea className="mt-2" rows={3} value={impactData.safeguards} onChange={(e) => setImpactData((d) => ({ ...d, safeguards: e.target.value }))} placeholder='One safeguard per line' />
                  </div>
                {/* A-6 — safeguards mapped to an identified impact */}
                <div data-coach-field="a6_safeguards" data-rail-key="impact_safeguards" onFocus={() => focusRail('impact_safeguards')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>What safeguards address each impact above? <span className="text-xs text-muted-foreground">(§ 7152(a)(6))</span></Label><StatutePopover term="Safeguards" summary="Identify the safeguards the business plans to implement for the processing, including safeguards addressing the negative impacts identified under subsection (a)(5)." cite="11 CCR § 7152(a)(6)" /></div>
                  <p className="text-xs text-muted-foreground mt-1">Each safeguard must name the impact it addresses. An impact with no safeguard is reported as unaddressed.</p>
                  <div className="mt-2 space-y-3">
                    {a6Safeguards.map((row, idx) => (
                      <div key={idx} className="rounded-md border border-input p-3 space-y-2">
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={row.harm}
                          onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, harm: e.target.value } : r))}
                        >
                          <option value="">Impact addressed…</option>
                          {HARM_PATHWAY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Textarea rows={2} value={row.safeguard} onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, safeguard: e.target.value } : r))} placeholder="The safeguard" />
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={row.safeguard_status}
                          onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, safeguard_status: e.target.value } : r))}
                        >
                          <option value="">Implementation status…</option>
                          {SAFEGUARD_STATUS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Textarea rows={2} value={row.residual} onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, residual: e.target.value } : r))} placeholder="Risk remaining afterwards" />
                        {/* RK3-D (doc 33 D-L3) — effectiveness evidence + planned timeline. */}
                        <select
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={row.effectiveness_basis || ""}
                          onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, effectiveness_basis: e.target.value } : r))}
                        >
                          <option value="">Effectiveness evidence…</option>
                          {SAFEGUARD_EFFECTIVENESS_BASIS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        {row.safeguard_status === "Planned, not yet implemented" && (
                          <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={row.planned_timeline || ""}
                            onChange={(e) => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, planned_timeline: e.target.value } : r))}
                          >
                            <option value="">Committed timeline…</option>
                            {PLANNED_TIMELINE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Which harm pathways does this safeguard address? (optional)</p>
                          <div className="flex flex-wrap gap-1">
                            {HARM_PATHWAY_OPTS.map((opt) => {
                              const checked = (row.risk_pathway_ids || []).includes(opt);
                              return (
                                <button key={opt} type="button"
                                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
                                  onClick={() => setA6Safeguards((rows) => rows.map((r, i) => i === idx ? { ...r, risk_pathway_ids: checked ? (r.risk_pathway_ids || []).filter((x) => x !== opt) : [...(r.risk_pathway_ids || []), opt] } : r))}>
                                  {opt.slice(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setA6Safeguards((r) => [...r, { harm: "", safeguard: "", safeguard_status: "", residual: "", risk_pathway_ids: [], effectiveness_basis: "", planned_timeline: "" }])}>Add safeguard</Button>
                    {a6Safeguards.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setA6Safeguards((r) => r.slice(0, -1))}>Remove last</Button>
                    )}
                  </div>
                </div>
                  <div>
                    <Label>Have you identified cybersecurity gaps relevant to this processing?</Label>
                    <div className="mt-2"><Radio name="impact_cyber" options={IMPACT_CYBER_GAPS_OPTS} value={impactData.cyberGaps} onChange={(v) => setImpactData((d) => ({ ...d, cyberGaps: v }))} /></div>
                  </div>
              <OptionalCluster title="Vulnerable populations" valueLine="Left blank, the report does not attribute impacts to any specific population.">
                  <div>
                    <Label>Vulnerable populations affected (if any)</Label>
                    <Textarea className="mt-2" rows={2} value={impactData.vulnerable} onChange={(e) => setImpactData((d) => ({ ...d, vulnerable: e.target.value }))} placeholder="Population, and how affected" />
                  </div>
              </OptionalCluster>
              {/* RK3-A3 g1 — harm_category_review_status: internal QA tracker (never printed) */}
              <OptionalCluster title="Harm-category QA tracker" valueLine="Internal only — tracks which harm categories have been reviewed. Never printed.">
                <div data-rail-key="harm_review_status" onFocus={() => focusRail('harm_review_status')}>
                  <p className="text-xs text-muted-foreground mb-2">For each harm category, record whether you identified at least one pathway, considered it and found none applicable, or have not yet assessed it.</p>
                  <div className="space-y-2">
                    {HARM_PATHWAY_OPTS.map((cat) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{cat.slice(0, 3)}</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate" title={cat}>{cat.slice(4)}</span>
                        <select
                          className="h-8 text-xs px-2 rounded-md border border-input bg-background"
                          value={harmCategoryReviewStatus[cat] || ""}
                          onChange={(e) => setHarmCategoryReviewStatus((s) => ({ ...s, [cat]: e.target.value }))}
                        >
                          <option value="">—</option>
                          {HARM_CATEGORY_REVIEW_STATUS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </OptionalCluster>
            </>
          )}

          {step === 6 && (
            <>
              <h2>What the processing is worth, and to whom</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(4), (a)(7) — benefits by beneficiary group and the weighing against negative impacts</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers produce the weighing section. A benefit stated without a supporting fact from the record is carried as unevidenced, and the weighing reserves rather than concluding.</p>
                {/* A-4 — benefits, four beneficiary classes */}
                <div data-coach-field="a4_benefits">
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Who benefits from this processing, and how — for each group? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(4))</span></Label><StatutePopover term="Benefits by group" summary="Benefits to the business, the consumer, other stakeholders, and the public must be identified as applicable, and not in generic terms such as 'improving our service'." cite="11 CCR § 7152(a)(4)" /></div>
                  <p className="text-xs text-muted-foreground mt-1">Each group gets its own statement and its own supporting fact from the record. A benefit with no supporting fact is carried as unevidenced in the weighing.</p>
                  {/* RK3-A1 g6 — the gate never forces a benefit: "No" records
                      "no distinct benefit identified" for the class, and the
                      statement + fact appear only on "Yes". */}
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Is a distinct benefit to the business identified? <Req /></Label>
                      <Radio name="benefit_business_identified" options={["Yes", "No"]} value={benefitBusinessIdentified} onChange={setBenefitBusinessIdentified} />
                      {benefitBusinessIdentified === "Yes" && (
                        <>
                          <Textarea rows={2} value={a4BenefitBusiness} onChange={(e) => setA4BenefitBusiness(e.target.value)} placeholder="Specific outcome for the business" />
                          <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitBusinessFact} onChange={(e) => setA4BenefitBusinessFact(e.target.value)} placeholder="Fact in the record showing it" />
                          {/* RK3-D (doc 33 D-L3) — magnitude basis. */}
                          <div><p className="text-xs text-muted-foreground mb-1">What kind of basis does the statement give for the benefit's size?</p><Radio name="benefit_business_magnitude_basis" options={[...BENEFIT_MAGNITUDE_BASIS_OPTS]} value={rk3d.benefit_business_magnitude_basis} onChange={(v) => setRk3dField("benefit_business_magnitude_basis", v)} /></div>
                        </>
                      )}
                      {benefitBusinessIdentified === "No" && (
                        <p className="text-xs text-muted-foreground">Recorded: no distinct business benefit identified. The weighing gives this class no affirmative weight.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Is a distinct benefit to the consumer identified? <Req /></Label>
                      <Radio name="benefit_consumer_identified" options={["Yes", "No"]} value={benefitConsumerIdentified} onChange={setBenefitConsumerIdentified} />
                      {benefitConsumerIdentified === "Yes" && (
                        <>
                          <Textarea rows={2} value={a4BenefitConsumer} onChange={(e) => setA4BenefitConsumer(e.target.value)} placeholder="Specific outcome for the consumer" />
                          <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitConsumerFact} onChange={(e) => setA4BenefitConsumerFact(e.target.value)} placeholder="Fact in the record showing it" />
                          <div><p className="text-xs text-muted-foreground mb-1">What kind of basis does the statement give for the benefit's size?</p><Radio name="benefit_consumer_magnitude_basis" options={[...BENEFIT_MAGNITUDE_BASIS_OPTS]} value={rk3d.benefit_consumer_magnitude_basis} onChange={(v) => setRk3dField("benefit_consumer_magnitude_basis", v)} /></div>
                        </>
                      )}
                      {benefitConsumerIdentified === "No" && (
                        <p className="text-xs text-muted-foreground">Recorded: no distinct consumer benefit identified. The weighing gives this class no affirmative weight.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Is a distinct benefit to other stakeholders identified? <Req /></Label>
                      <Radio name="benefit_other_stakeholders_identified" options={["Yes", "No"]} value={benefitOtherStakeholdersIdentified} onChange={setBenefitOtherStakeholdersIdentified} />
                      {benefitOtherStakeholdersIdentified === "Yes" && (
                        <>
                          <Textarea rows={2} value={a4BenefitOtherStakeholders} onChange={(e) => setA4BenefitOtherStakeholders(e.target.value)} placeholder="Outcome for other stakeholders" />
                          <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitOtherStakeholdersFact} onChange={(e) => setA4BenefitOtherStakeholdersFact(e.target.value)} placeholder="Fact in the record showing it" />
                          <div><p className="text-xs text-muted-foreground mb-1">What kind of basis does the statement give for the benefit's size?</p><Radio name="benefit_other_stakeholders_magnitude_basis" options={[...BENEFIT_MAGNITUDE_BASIS_OPTS]} value={rk3d.benefit_other_stakeholders_magnitude_basis} onChange={(v) => setRk3dField("benefit_other_stakeholders_magnitude_basis", v)} /></div>
                        </>
                      )}
                      {benefitOtherStakeholdersIdentified === "No" && (
                        <p className="text-xs text-muted-foreground">Recorded: no distinct other-stakeholder benefit identified.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Is a distinct benefit to the public identified? <Req /></Label>
                      <Radio name="benefit_public_identified" options={["Yes", "No"]} value={benefitPublicIdentified} onChange={setBenefitPublicIdentified} />
                      {benefitPublicIdentified === "Yes" && (
                        <>
                          <Textarea rows={2} value={a4BenefitPublic} onChange={(e) => setA4BenefitPublic(e.target.value)} placeholder="Outcome for the public" />
                          <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitPublicFact} onChange={(e) => setA4BenefitPublicFact(e.target.value)} placeholder="Fact in the record showing it" />
                          <div><p className="text-xs text-muted-foreground mb-1">What kind of basis does the statement give for the benefit's size?</p><Radio name="benefit_public_magnitude_basis" options={[...BENEFIT_MAGNITUDE_BASIS_OPTS]} value={rk3d.benefit_public_magnitude_basis} onChange={(v) => setRk3dField("benefit_public_magnitude_basis", v)} /></div>
                        </>
                      )}
                      {benefitPublicIdentified === "No" && (
                        <p className="text-xs text-muted-foreground">Recorded: no distinct public benefit identified.</p>
                      )}
                    </div>
                  </div>
                </div>
                  <div data-rail-key="impact_benefits" onFocus={() => focusRail('impact_benefits')}>
                    <Label>Do the benefits of this processing outweigh the risks to consumers?</Label>
                    <div className="mt-2"><Radio name="impact_benefits" options={IMPACT_BENEFITS_OUTWEIGH_OPTS} value={impactData.benefitsOutweigh} onChange={(v) => setImpactData((d) => ({ ...d, benefitsOutweigh: v }))} /></div>
                    <Textarea className="mt-2" rows={3} value={impactData.benefitsRationale} onChange={(e) => setImpactData((d) => ({ ...d, benefitsRationale: e.target.value }))} placeholder="How the benefits weigh against the impacts" />
                  </div>
              <OptionalCluster title="Summary benefit statements" valueLine="These are optional summaries. Left blank, the report relies on the per-group benefits above and lists nothing further.">
                  <div data-rail-key="impact_benefits" onFocus={() => focusRail('impact_benefits')}>
                    <Label>Benefits of this processing <span className="text-xs text-muted-foreground font-mono">(§ 7152(a)(4))</span></Label>
                    <p className="text-xs text-muted-foreground mt-1">§ 7152(a)(4) requires the benefits to be identified <span className="font-medium">specifically</span> for each group — generic descriptions are not permitted. Complete each that applies.</p>
                    <div className="mt-2 space-y-2">
                      <Textarea rows={2} value={impactData.businessBenefits} onChange={(e) => setImpactData((d) => ({ ...d, businessBenefits: e.target.value }))} placeholder="Summary of the business benefit" />
                      <Textarea rows={2} value={impactData.consumerBenefits} onChange={(e) => setImpactData((d) => ({ ...d, consumerBenefits: e.target.value }))} placeholder="Summary of the consumer benefit" />
                      <Textarea rows={2} value={impactData.stakeholderBenefits} onChange={(e) => setImpactData((d) => ({ ...d, stakeholderBenefits: e.target.value }))} placeholder="Summary of any wider benefit" />
                    </div>
                  </div>
              </OptionalCluster>
            </>
          )}

          {step === 7 && (
            <>
              <h2>Who prepared this, and who signs it</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR §§ 7151, 7152(a)(8)–(9), 7157(b) — contributors, approval record, and the certifying executive</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers close the report: the people who supplied the facts, the person who approved the assessment, and the executive who certifies it on the annual submission worksheet.</p>
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Who contributed to or was consulted in preparing this assessment? <span className="text-xs text-muted-foreground">(§§ 7151, 7152(a)(8))</span></Label><StatutePopover term="Contributors and consultees" summary="Identify the individuals and roles who contributed to or were consulted in preparing the risk assessment." cite="11 CCR § 7152(a)(9)" /></div>
                <div className="mt-2"><AssistedInput
                  value={i7InternalContributors}
                  onChange={setI7InternalContributors}
                  pills={ASSISTED_INPUT_REGISTRY.i7_internal_contributors.pills}
                  rows={2}
                  useExhibit
                  placeholder="Internal roles"
                  assertionSlot={renderAssertion("i7_internal_contributors")}
                /></div>
                {/* RK3-A1 g6 — § 7151(a) participation record, placed with the
                    contributor questions it is distinct from. */}
                <div className="mt-4" data-rail-key="section_7151_participation" onFocus={() => focusRail('section_7151_participation')}>
                  <Label>Which employees' job duties include participating in this processing? <Req /> <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7151(a))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">§ 7151(a) requires these employees to be included in the risk-assessment process. This is a participation record, separate from the § 7152(a)(8) list of who provided information.</p>
                  <div className="mt-2 space-y-2">
                    {sectionParticipants.map((row, idx) => (
                      <div key={idx} className="rounded-lg border border-input p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-muted-foreground">Participant #{idx + 1}</p>
                          <button
                            type="button"
                            onClick={() => setSectionParticipants((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={sectionParticipants.length === 1}
                            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid gap-2 xl:grid-cols-2 items-start">
                          <input
                            className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                            value={row.name}
                            onChange={(e) => setSectionParticipants((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                            onFocus={() => focusRail('section_7151_participation')}
                            placeholder="Name"
                          />
                          <input
                            className="h-10 px-3 rounded-md border border-input bg-background min-w-0"
                            value={row.role}
                            onChange={(e) => setSectionParticipants((prev) => prev.map((r, i) => (i === idx ? { ...r, role: e.target.value } : r)))}
                            onFocus={() => focusRail('section_7151_participation')}
                            placeholder="Title or role"
                          />
                        </div>
                        <input
                          className="h-10 px-3 rounded-md border border-input bg-background w-full"
                          value={row.processing_responsibility}
                          onChange={(e) => setSectionParticipants((prev) => prev.map((r, i) => (i === idx ? { ...r, processing_responsibility: e.target.value } : r)))}
                          onFocus={() => focusRail('section_7151_participation')}
                          placeholder="Responsibility in the processing — e.g., Runs the monthly coupon batch job"
                        />
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={row.participation_confirmed}
                            onChange={(e) => setSectionParticipants((prev) => prev.map((r, i) => (i === idx ? { ...r, participation_confirmed: e.target.checked } : r)))}
                            onFocus={() => focusRail('section_7151_participation')}
                          />
                          <span className="text-xs text-muted-foreground">This employee was included in the risk-assessment process for this activity.</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSectionParticipants((prev) => [...prev, { name: "", role: "", processing_responsibility: "", participation_confirmed: false }])}
                    className="mt-2 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                  >
                    + Add a participant
                  </button>
                </div>
                <div className="mt-2"><AssistedInput
                  value={i7ExternalConsultees}
                  onChange={setI7ExternalConsultees}
                  pills={ASSISTED_INPUT_REGISTRY.i7_external_consultees.pills}
                  rows={2}
                  useExhibit
                  placeholder="External advisers"
                  assertionSlot={renderAssertion("i7_external_consultees")}
                /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Who is the executive certifying this assessment? <span className="text-xs text-muted-foreground">(§ 7157(b)(5))</span></Label><StatutePopover term="Certifying executive" summary="The risk assessment must be certified by an executive responsible for oversight of the processing." cite="11 CCR § 7157" /></div>
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
                {/* A-9 — review and approval record */}
                <div>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Who reviewed and approved this assessment? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(9))</span></Label><StatutePopover term="Review and approval" summary="The assessment must record the date it was reviewed and approved and the names and positions of those who reviewed or approved it; the approver must have authority to participate in deciding whether the processing is initiated." cite="11 CCR § 7152(a)(9)" /></div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input className="h-10 px-3 rounded-md border border-input bg-background" value={a9ApproverName} onChange={(e) => setA9ApproverName(e.target.value)} placeholder="Approver name" />
                    <input className="h-10 px-3 rounded-md border border-input bg-background" value={a9ApproverPosition} onChange={(e) => setA9ApproverPosition(e.target.value)} placeholder="Approver position" />
                    <input type="date" className="h-10 px-3 rounded-md border border-input bg-background" value={a9ApprovalDate} onChange={(e) => setA9ApprovalDate(e.target.value)} />
                  </div>
                  <div className="mt-3">
                    <Label>Who provided the information in this assessment? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(8))</span></Label>
                    <Textarea className="mt-2" rows={2} value={a8InformationProviders} onChange={(e) => setA8InformationProviders(e.target.value)} placeholder="Names and positions" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Legal counsel who provided legal advice is excluded from this record by § 7152(a)(8)-(9).</p>
                </div>
            </>
          )}


          {summaryStep && <SummaryTable intake={intake} />}

          {/* RK3-A3 g3 — finalization stage (doc 31 §3 — NEW-F fields, § 7152(a)(7)+(9)) */}
          {summaryStep && (
            <div className="mt-4 rounded-lg border border-border" data-rail-key="finalization_stage" onFocus={() => focusRail('finalization_stage')}>
              <button
                type="button"
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/40 rounded-lg"
                onClick={() => setFinalizationOpen((v) => !v)}
              >
                <span className="font-semibold text-sm">Finalization stage — record the processing decision and approval</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{finalizationOpen ? "Hide ▲" : "Show ▼"}</span>
              </button>
              {finalizationOpen && (
                <div className="border-t px-4 py-4 space-y-5">
                  <p className="text-xs text-muted-foreground">Complete after the risk analysis has been reviewed. These fields satisfy 11 CCR § 7152(a)(7) and (a)(9). Internal only — not submitted until the record is finalized.</p>

                  {/* final_processing_decision */}
                  <div>
                    <Label>Final processing decision <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(7))</span></Label>
                    <select
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={finalProcessingDecision}
                      onChange={(e) => setFinalProcessingDecision(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(processingStatus === "Planned"
                        ? FINAL_PROCESSING_DECISION_PLANNED_OPTS
                        : FINAL_PROCESSING_DECISION_ONGOING_OPTS
                      ).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* final_processing_decision_notes */}
                  <div>
                    <Label>Decision notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={finalProcessingDecisionNotes}
                      onChange={(e) => setFinalProcessingDecisionNotes(e.target.value)}
                      placeholder="Rationale, conditions, or context for the decision"
                    />
                  </div>

                  {/* assessment_reviewers_approvers repeater */}
                  <div>
                    <Label>Assessment reviewers and approvers <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(9))</span></Label>
                    <div className="mt-2 space-y-2">
                      {assessmentReviewersApprovers.map((row, idx) => (
                        <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] items-center">
                          <input
                            className="h-10 px-3 rounded-md border border-input bg-background"
                            value={row.name}
                            onChange={(e) => setAssessmentReviewersApprovers((prev) => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                            placeholder="Name"
                          />
                          <input
                            className="h-10 px-3 rounded-md border border-input bg-background"
                            value={row.position}
                            onChange={(e) => setAssessmentReviewersApprovers((prev) => prev.map((r, i) => i === idx ? { ...r, position: e.target.value } : r))}
                            placeholder="Position / title"
                          />
                          <select
                            className="h-10 px-3 rounded-md border border-input bg-background"
                            value={row.role}
                            onChange={(e) => setAssessmentReviewersApprovers((prev) => prev.map((r, i) => i === idx ? { ...r, role: e.target.value } : r))}
                          >
                            <option value="">Role…</option>
                            {REVIEWER_ROLE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {assessmentReviewersApprovers.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-destructive px-2"
                              onClick={() => setAssessmentReviewersApprovers((prev) => prev.filter((_, i) => i !== idx))}
                            >Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={() => setAssessmentReviewersApprovers((prev) => [...prev, { name: "", position: "", role: "" }])}
                    >+ Add reviewer / approver</button>
                  </div>

                  {/* approver_authority_confirmed */}
                  <div>
                    <Label>Does the approver have authority to authorize initiation / continuation of this processing? <Req /></Label>
                    <select
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={approverAuthorityConfirmed}
                      onChange={(e) => setApproverAuthorityConfirmed(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {/* approver_authority_basis */}
                  <div>
                    <Label>Basis for approver authority <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={approverAuthorityBasis}
                      onChange={(e) => setApproverAuthorityBasis(e.target.value)}
                      placeholder="e.g., CFO per board resolution, VP Privacy per delegation policy"
                    />
                  </div>

                  {/* D10 restaged: a9_approval_date */}
                  <div>
                    <Label>Approval date <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(9) — D10 restaged)</span></Label>
                    <input
                      type="date"
                      className="mt-2 h-10 px-3 rounded-md border border-input bg-background"
                      value={a9ApprovalDate}
                      onChange={(e) => setA9ApprovalDate(e.target.value)}
                    />
                  </div>

                  {/* D10 restaged: a8_information_providers */}
                  <div>
                    <Label>Who provided the information in this assessment? <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(8) — D10 restaged)</span></Label>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={a8InformationProviders}
                      onChange={(e) => setA8InformationProviders(e.target.value)}
                      placeholder="Names and positions — legal counsel excluded per § 7152(a)(8)-(9)"
                    />
                  </div>

                  {/* finalization_required_follow_up_resolved */}
                  <div>
                    <Label>Have all required follow-up items been resolved or formally deferred? <Req /></Label>
                    <select
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={finalizationFollowUpResolved}
                      onChange={(e) => setFinalizationFollowUpResolved(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {!summaryStep && regulatoryFootprint.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Regulatory exposure, updated from your answers
              </p>
              {regulatoryFootprint.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5 shrink-0"><CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
                  <div className="text-xs">
                    <span className="font-mono text-blue-700 dark:text-blue-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    {item.note && <span className="text-muted-foreground ml-1">— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <ValidationErrorSummary message={validationError} className="mt-4" />
          <div className="flex justify-between pt-4 border-t flex-wrap gap-3 items-center">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>

            <div className="flex items-center gap-3 ml-auto">
              {user && (
                draftSaving ? (
                  <span className="text-body-tiny text-muted-foreground">Saving…</span>
                ) : lastSavedAt ? (
                  <span className="text-body-tiny text-muted-foreground">Draft saved {formatRelativeTime(lastSavedAt)}</span>
                ) : null
              )}
              {!summaryStep ? (
                <Button onClick={next}>Next</Button>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {isSuite ? (
                    /* QA round two (SUITE-A-02, High) — this used to open
                       checkout on the Risk answers alone, and both bundle rows
                       were written with them, so the paid Cybersecurity report
                       said "Insufficient basis to assess, 0/100". Module 2 is
                       now collected before the bundle can be bought. */
                    <Button onClick={handleSuiteContinue}>
                      {suiteNextStep
                        ? `Continue to ${suiteNextStep.label}`
                        : `Purchase CPPA Suite ($${suitePricing.price})`}
                    </Button>
                  ) : (
                    <Button onClick={handlePurchase} disabled={!pricing.stripeConfigured}>
                      {!pricing.stripeConfigured ? `Payments Coming Soon ($${displayPrice})` : `Run CPPA Risk Assessment ($${displayPrice})`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </BenchLayout>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool aligned to the CPPA audit regulations (11 CCR §§ 7150-7157); the page-level disclaimer above governs its status.
        </p>

        <IntakeCoachStep
          open={coachOpen}
          product="cppa_risk"
          userId={user?.id}
          referenceKind="cppa_risk_intake"
          referenceId={clientId ?? null}
          contract={COACH_CONTRACTS.cppa_risk}
          intake={intake}
          onClose={() => setCoachOpen(false)}
          onContinue={() => { setCoachOpen(false); handlePurchase(); }}
          onJumpToStep={jumpToCoachStep}
        />
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-risk-assessment?suite=true" : "/cppa-risk-assessment"} {...intakeGate("cppa_risk")} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_risk_assessment"}
          userId={user?.id}
          clientId={clientId}
          intakeData={isSuite ? suiteCheckoutIntake(suiteModules) : intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            void clearDraft();
            if (isSuite) clearSuiteHandoff();
            if (isSuite && suiteCyberId) {
              navigate(`/cppa-suite/result?risk_id=${id}&cyber_id=${suiteCyberId}&purchased=true`);
            } else if (isSuite && !suiteCyberId) {
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            } else {
              navigate(`/cppa-risk-assessment/result/${id}?purchased=true`);
            }
          }}
        />
        </>)}
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

  push("Specific processing purpose", intake.i1_processing_purpose);
  push("Retention period", intake.i2_retention_period);
  push("Retention criteria", intake.i2_retention_criteria);
  push("Retention detail", intake.i2_retention_detail);
  push("California consumers for this activity", intake.i3_ca_consumer_band);
  push("Disclosure mechanisms", intake.i4_disclosure_mechanisms);
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") {
    push("Automated decisionmaking logic", intake.i5_admt_logic);
    push("Training-data source", intake.i5_admt_training_source);
    push("Fairness testing", intake.i5_admt_fairness_testing);
    push("Human review process", intake.i5_admt_human_review);
  }
  push("Service providers and third parties", intake.i6_vendors);
  push("Internal contributors", intake.i7_internal_contributors);
  push("External consultees", intake.i7_external_consultees);
  push("Certifying executive", `${intake.i8_certifying_exec_name ?? ""} — ${intake.i8_certifying_exec_title ?? ""}`);
  push("Existing impact assessment", intake.i9_has_existing_dpia);
  if (intake.i9_has_existing_dpia === "Yes") push("Existing impact assessment summary", intake.i9_existing_dpia_summary);

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
