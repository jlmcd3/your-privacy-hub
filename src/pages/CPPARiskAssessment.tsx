// CPPA Privacy Risk Assessment — Module 1 intake.
// v3 (June 2026): expanded with intake questions I-1 through I-9 to feed the
// new § 7152(a)(1)–(9) Part A / § 7157 Part B generator. Branching: I-5 only
// when ADMT trigger fires; I-9 only when user has a prior DPIA.

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ToolTierNote from "@/components/tools/ToolTierNote";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { InfoPopover } from "@/components/InfoPopover";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import MethodologyBox from "@/components/cppa/MethodologyBox";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { consumeRiskPrefill } from "@/lib/riskIntakePrefill";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolDraft } from "@/hooks/useToolDraft";
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
import { useFscrCallouts } from "@/hooks/useFscrCallouts";
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
const PI_CATEGORIES = [
  "Contact identifiers (name, email, phone)",
  "Device identifiers (IP, cookies, device IDs)",
  "Internet or network activity",
  "Precise geolocation (GPS-level / specific address)",
  "General location (city, region, ZIP, IP-derived)",
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

// Categories that are sensitive PI under Cal. Civ. Code § 1798.140(ae).
// These trigger additional obligations (Q15 follow-ups, § 7152(a)(5) harm categories).
const SENSITIVE_PI_CATEGORIES = new Set([
  "Precise geolocation (GPS-level / specific address)",
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
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
  const headerLabel = isSuite ? "CPPA AUDIT READINESS · FULL SUITE (M1 + M2)" : "CPPA AUDIT READINESS · MODULE 1";
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
  const [i1bMinPi, setI1bMinPi] = useState("");              // § 7152(a)(2) minimum PI necessary
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
  const [a6Safeguards, setA6Safeguards] = useState<{ harm: string; safeguard: string; safeguard_status: string; residual: string }[]>([
    { harm: "", safeguard: "", safeguard_status: "", residual: "" },
  ]);
  const [a9ApproverName, setA9ApproverName] = useState("");
  const [a9ApproverPosition, setA9ApproverPosition] = useState("");
  const [a9ApprovalDate, setA9ApprovalDate] = useState("");
  // § 7152(a)(8) — who provided the information in the assessment.
  const [a8InformationProviders, setA8InformationProviders] = useState("");
  const [i4bSources, setI4bSources] = useState("");          // § 7152(a)(3) sources of the PI

  // TURN 1b — CPPA-STANDARD-SETTER intake additions:
  //   • publicPrivacyPolicyUrl — optional URL rendered as a record anchor
  //     in submission_summary and attestation_block. Not a source of facts.
  //   • sensitiveLocationBasis — closed enum. Any non-"Not applicable"
  //     value engages the § 7150(b)(5) trigger via
  //     computeIntakeSelectedSubsections() (deterministic resolver).
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

  const fscrCallouts = useFscrCallouts([
    "11 CCR § 7152(a)(1)",
    "11 CCR § 7152(a)(3)(G)",
    "11 CCR § 7156(a)",
    "11 CCR § 7156(b)",

  ]);

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
        triggered: q15 === "Yes" || q4.some((c) => SENSITIVE_PI_CATEGORIES.has(c)),
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
        triggered:
          q5bProfiling === "Yes — systematic observation of workers/students/applicants" ||
          q5bProfiling === "Both",
      },
      {
        citation: "11 CCR § 7150(b)(5)",
        label: "Risk assessment required — sensitive-location inference",
        triggered:
          q5bProfiling === "Yes — based on sensitive-location presence" ||
          q5bProfiling === "Both" ||
          (!!sensitiveLocationBasis &&
            sensitiveLocationBasis !== "Not applicable — no sensitive-location processing"),
      },
      {
        citation: "11 CCR § 7150(b)(6)",
        label: "Risk assessment required — processing to train ADMT or recognition technology",
        triggered:
          q18bTraining === "Yes — training ADMT for significant decisions" ||
          q18bTraining === "Yes — training facial/emotion/biometric recognition",
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
    q1, q4, q5, q15, q18, q5bProfiling, q18bTraining, sensitiveLocationBasis,
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
    }
    if (step === 2) {
      if (!q1 || !q2) return "Select the revenue band and the California consumer band.";
      if (!q5) return "Answer whether you sell or share personal information.";
      if (!q5bProfiling) return "Answer the profiling question.";
      if (!q18) return "Answer whether automated decisionmaking technology is in use.";
      if ((q18 === "Yes" || q18 === "In evaluation") && !q19) return "Describe the automated decisionmaking system and the decisions it touches.";
      if (q18 === "Yes" && !q20) return "Answer whether consumers can opt out of the automated decisionmaking.";
      if (!q18bTraining) return "Answer whether personal information is processed to train automated decisionmaking or recognition technology.";
      if (admtTriggered && (!i5AdmtLogic || !i5AdmtHumanReview)) return "Describe the automated decisionmaking logic and the human review process.";
      if (!q6Multi.length || !q7 || !q8 || !q9 || !q10) return "Complete the consumer-rights answers.";
    }
    if (step === 3) {
      if (!q4.length) return "Select the categories of personal information this activity processes.";
      if (!q15) return "Answer whether sensitive personal information is processed.";
      if (q15 === "Yes" && (!q16 || !q17)) return "Complete the sensitive personal information follow-ups.";
      if (!q15bUnder16) return "Answer whether you have actual knowledge of processing under-16 consumers' data.";
      if (!i4bSources) return "Identify where this personal information comes from.";
      if (!i3CaConsumerBand) return "Select the approximate California consumer band for this activity.";
      if (!i6Vendors) return "List the service providers, contractors, or third parties involved — or write \"None\".";
      if (!q11 || !q12 || !q13 || !q14) return "Complete the privacy-notice answers.";
      if (!i4Disclosures.length) return "Select at least one disclosure mechanism, or \"No standalone disclosure\".";
    }
    if (step === 4) {
      if (!i1bMinPi || i1bMinPi.length < 20) return "State the minimum personal information necessary for this purpose.";
      if (!i2RetentionPeriod || !i2RetentionCriteria) return "Give a retention period and the criteria that set it.";
    }
    if (step === 7) {
      if (!i7InternalContributors) return "List the internal contributor roles — or write \"None\".";
      if (!i8ExecName || !i8ExecTitle) return "Give the certifying executive's name and title.";
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) { setValidationError(err); return; }
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
          }))
        : [],
    // legacy keys preserved

    q1_revenue: q1, q2_consumers: q2, q3_sector: q3, q4_pi_categories: q4, q5_sell_share: q5,
    q6_right_know: q6Multi.join("; "), q6_right_know_multi: q6Multi, q7_right_delete: q7, q8_right_correct: q8, q9_opt_out: q9, q10_id_verification: q10,
    q11_policy_review: q11, q12_notice_at_collection: q12, q13_notice_content: q13, q14_employee_notice: q14,
    q15_sensitive_pi: q15, q16_sensitive_limit: q16, q17_sensitive_basis: q17,
    q18_admt_use: q18, q19_admt_description: q19, q20_admt_opt_out: q20,
    // new § 7152 elements
    q5b_profiling_observation: q5bProfiling,
    q5c_share_revenue_50pct: q5cShareRev,           // R1a
    // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand.
    bought_sold_shared_count: bssCount,
    q15b_under16_knowledge: q15bUnder16,
    q15c_spi_volume: q15cSpiVolume,                 // R1a
    q18b_admt_training: q18bTraining,
    i1b_min_pi: i1bMinPi,
    i4b_sources: i4bSources,
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
    a9_approver_name: a9ApproverName.trim(),
    a9_approver_position: a9ApproverPosition.trim(),
    a9_approval_date: a9ApprovalDate,
    a8_information_providers: a8InformationProviders.trim(),
    // Improvement Kit (Doc N R1): parallel assertions map, only when
    // the flag is on AND at least one designated field carries an
    // entry. Absent key = legacy semantics.
    ...(IMPROVEMENT_KIT_ENABLED && Object.keys(assertions).length > 0
      ? { assertions }
      : {}),
  }), [
    entityName, subjectAnchor,
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary, exceptionClaims, impactData,
    a2NecessitySet, a4BenefitBusiness, a4BenefitConsumer, a4BenefitOtherStakeholders, a4BenefitPublic,
    a4BenefitBusinessFact, a4BenefitConsumerFact, a4BenefitOtherStakeholdersFact, a4BenefitPublicFact,
    a5HarmPathways, a6Safeguards, a9ApproverName, a9ApproverPosition, a9ApprovalDate, a8InformationProviders,
    assertions,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,

  ]);

  // ---- Draft autosave ------------------------------------------------------
  const draftData = useMemo(() => ({
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary,
    entityName, subjectAnchor, q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,
    exceptionClaims, impactData,

  }), [
    q1, q2, q3, q4, q5, q6Multi, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
    i1Purpose, i2RetentionPeriod, i2RetentionCriteria, i2RetentionDetail, i3CaConsumerBand,
    i4Disclosures, i5AdmtLogic, i5AdmtTrainingSource, i5AdmtFairnessTesting, i5AdmtHumanReview,
    i6Vendors, i7InternalContributors, i7ExternalConsultees, i8ExecName, i8ExecTitle, i8ContactPhone, i8ContactEmail,
    i9HasDpia, i9DpiaSummary,
    entityName, subjectAnchor, q5bProfiling, q5cShareRev, bssCount, q15bUnder16, q15cSpiVolume, q18bTraining, i1bMinPi, i4bSources,
    publicPrivacyPolicyUrl, sensitiveLocationBasis,
    primaryActivityName, primaryActivityPurpose, hasSecondaryUses, secondaryActivities,
    exceptionClaims, impactData,

  ]);
  const INITIAL_DRAFT_JSON = useMemo(() => JSON.stringify({
    q1: "", q2: "", q3: "", q4: [] as string[], q5: "", q6Multi: [] as string[], q7: "", q8: "", q9: "", q10: "",
    q11: "", q12: "", q13: "", q14: "", q15: "", q16: "", q17: "", q18: "", q19: "", q20: "",
    i1Purpose: "", i2RetentionPeriod: "", i2RetentionCriteria: "", i2RetentionDetail: "",
    i3CaConsumerBand: "", i4Disclosures: [] as string[], i5AdmtLogic: "", i5AdmtTrainingSource: "",
    i5AdmtFairnessTesting: "", i5AdmtHumanReview: "", i6Vendors: "", i7InternalContributors: "",
    i7ExternalConsultees: "", i8ExecName: "", i8ExecTitle: "", i8ContactPhone: "", i8ContactEmail: "", i9HasDpia: "", i9DpiaSummary: "",
    entityName: "", subjectAnchor: "", q5bProfiling: "", q5cShareRev: "", bssCount: "", q15bUnder16: "", q15cSpiVolume: "", q18bTraining: "", i1bMinPi: "", i4bSources: "",
    publicPrivacyPolicyUrl: "", sensitiveLocationBasis: "",
    primaryActivityName: "", primaryActivityPurpose: "", hasSecondaryUses: "",
    secondaryActivities: [] as SecondaryActivity[],

    exceptionClaims: {} as Record<string, ExceptionClaim>,
    impactData: { likelihood: "", severity: "", harmTypes: [] as string[], vulnerable: "", benefitsOutweigh: "", benefitsRationale: "", cyberGaps: "", businessBenefits: "", consumerBenefits: "", stakeholderBenefits: "", safeguards: "", harmCauses: "" },
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
    if (typeof d.entityName === "string") setEntityName(d.entityName);
    if (typeof d.subjectAnchor === "string") setSubjectAnchor(d.subjectAnchor);
    if (typeof d.q5bProfiling === "string") setQ5bProfiling(d.q5bProfiling);
    if (typeof d.q5cShareRev === "string") setQ5cShareRev(d.q5cShareRev);
    if (typeof d.bssCount === "string" && (d.bssCount === "" || (BOUGHT_SOLD_SHARED_OPTS as readonly string[]).includes(d.bssCount))) setBssCount(d.bssCount);
    if (typeof d.q15bUnder16 === "string") setQ15bUnder16(d.q15bUnder16);
    if (typeof d.q15cSpiVolume === "string") setQ15cSpiVolume(d.q15cSpiVolume);
    if (typeof d.q18bTraining === "string") setQ18bTraining(d.q18bTraining);
    if (typeof d.i1bMinPi === "string") setI1bMinPi(d.i1bMinPi);
    if (typeof d.i4bSources === "string") setI4bSources(d.i4bSources);
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
    if (typeof restoreStage === "number") setStep(restoreStage);
    dismissDraft();
  };

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
    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured.", variant: "destructive" });
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
      {/* UX-1c: compact tool-landing hero (≤280px), two-line copy + one CTA row. */}
      <header className="bg-brand-ocean text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {headerLabel}
          </span>
          <h1 className="text-hero-h1 text-white mb-2">The risk assessment California now requires.</h1>
          <p className="text-slate-300 text-lg max-w-3xl mb-4">
            If you sell or share personal data, process sensitive data, or use automated decision-making — existing activities must be assessed by December 31, 2027.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#run-assessment"
              className="inline-flex flex-col items-start bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-light))] text-white font-semibold px-5 py-2.5 rounded-lg no-underline transition-colors"
            >
              <span>{`Start your assessment — $${pricing.standalonePrice}`}</span>
              <span className="text-[12px] font-normal text-white/85">{`Subscribers: $${pricing.subscriberPrice}`}</span>
            </a>
            <SampleReportLink toolSlug="cppa_risk" tone="onDark" variant="link" label="See a sample report" />
          </div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            11 CCR § 7150 · submission-ready for the Apr 1, 2028 attestation
          </p>
        </div>
      </header>
      {/* UX-1c: RequirementBadge and framework context relocated below the fold — legal text preserved intact. */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-3">
        <RequirementBadge tier="conditional" text="California (11 CCR § 7150) requires a privacy risk assessment if you sell or share personal information, process sensitive data, or use automated decision-making. Existing activities must be assessed by December 31, 2027." className="max-w-3xl" />
        <p className="text-slate-700 text-base max-w-3xl">A regulation-mapped risk assessment framework, structured 1:1 to Cal. Code Regs. tit. 11 § 7152(a)(1)–(9), pre-populated from your intake and ready for your team to review, complete, and sign.</p>
        <p className="text-slate-500 text-sm max-w-3xl">Generates two deliverables: an internal report retained for the § 7156(c) 30-day production demand, and a § 7157 Annual Submission Worksheet for the April 1, 2028 filing.</p>
        <p className="text-slate-500 text-xs italic max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
        <p className="text-slate-500 text-xs italic max-w-3xl">Need more? Add 4 additional generations for half the tool price.</p>
        <p className="text-slate-500 text-xs italic max-w-3xl">
          Built on the CPPA's final regulations and Final Statement of Reasons, paragraph-cited. This tool never invents precedent — where the agency hasn't spoken, it says so.
        </p>
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
        <ToolTierNote isCppa={true} />
      </div>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <MethodologyBox
          title="How this assessment works"
          lines={[
            "Covers the risk-assessment obligation in Article 10 of the CCPA regulations (11 CCR §§ 7150–7157).",
            "Your intake is validated before generation; contradictions are flagged with citations, never resolved for you.",
            "Output: a Part A stakeholder summary and a Part B full assessment record.",
            "This tool documents your record — it is an analytical aid, not legal advice.",
          ]}
        />
        <IntakeGuidance>Where a field asks you to describe something, be specific and complete: name the systems, the data, and the steps. Where several items apply, list each one separately. The report is only as precise as what you put in.</IntakeGuidance>
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a structured risk assessment framework aligned to the CPPA's audit regulations (11 CCR §§ 7150-7157). It is an analytical aid and does not constitute a certified audit or regulatory submission." />
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
          preRunHint="The entity and subject line you set below are fixed once you first generate. Everything else stays editable across your included generations."
        />
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
                  Set when you first generate; fixed across your revision runs. The detailed purpose below remains editable.
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
              <div data-rail-key="q5_sell_share" onFocus={() => focusRail('q5_sell_share')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you sell or share personal information for cross-context behavioural advertising? <Req /></Label><DefPopover termKey="ccba" /><EnforcementSignalIcon signalKey="sell_share" signals={enforcementSignals} /></div>
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
                  <Label htmlFor="bought_sold_shared_count">Approximately how many California consumers or households have personal information you <em>buy, sell, or share</em> annually? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(B))</span></Label>
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
              <div data-rail-key="q5b_profiling" onFocus={() => focusRail('q5b_profiling')}>
                <Label>Do you profile consumers based on systematic observation, or based on their presence in a sensitive location? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(4))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">This is a separate risk-assessment trigger from selling/sharing. It covers profiling of applicants, employees, students, or independent contractors through systematic observation (e.g. productivity or location tracking), or profiling based on presence in a sensitive location such as a health-care facility, shelter, place of worship, or domestic-violence services provider.</p>
                <div className="mt-2"><Radio name="q5b" options={["Yes — systematic observation of workers/students/applicants", "Yes — based on sensitive-location presence", "Both", "No"]} value={q5bProfiling} onChange={setQ5bProfiling} /></div>
              </div>
              {/* TURN 1b — § 7150(b)(5) sensitive-location predicate (closed enum). */}
              <div data-rail-key="sensitive_location_basis" onFocus={() => focusRail('sensitive_location_basis')}>
                <Label htmlFor="sensitive_location_basis">Do you process personal information of consumers while they are in a sensitive location? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(5))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Sensitive-location processing is a separate § 7150(b)(5) trigger. Select the location type that best describes the processing; any option other than "Not applicable" engages the trigger.</p>
                <select
                  id="sensitive_location_basis"
                  value={sensitiveLocationBasis}
                  onChange={(e) => setSensitiveLocationBasis(e.target.value)}
                  className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select…</option>
                  {SENSITIVE_LOCATION_BASIS_OPTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div data-rail-key="q18_admt" onFocus={() => focusRail('q18_admt')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you use any ADMT that makes, or materially contributes to, decisions with significant effects on consumers? <Req /></Label><DefPopover termKey="admt" /><span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(e))</span></div><p className="text-xs text-muted-foreground mt-1">"Significant effects" covers credit, housing, employment, education, and healthcare decisions.</p><div className="mt-2"><Radio name="q18" options={["Yes", "No", "In evaluation"]} value={q18} onChange={setQ18} /></div></div>
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
                </div>
              )}
              {q18 === "Yes" && (
                <div><Label>Do you provide consumers with the right to opt out of ADMT? <Req /></Label><p className="text-xs text-muted-foreground mt-1">An opt-out is required for qualifying ADMT.</p><div className="mt-2"><Radio name="q20" options={["Yes, with documented opt-out", "Planned for implementation", "No"]} value={q20} onChange={setQ20} /></div>{renderAssertion("q20_admt_opt_out")}</div>
              )}
              <div data-rail-key="q18b_admt_training" onFocus={() => focusRail('q18b_admt_training')}>
                <Label>Do you process personal information to train ADMT, facial-recognition, emotion-recognition, identity-verification, or physical/biological-identification technology? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7150(b)(5))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Training such a model is an independent risk-assessment trigger, separate from <span className="font-medium">using</span> ADMT for a decision. It applies even if the trained system is never deployed against your own consumers — for example, building or fine-tuning a facial-recognition or biometric model on collected data.</p>
                <div className="mt-2"><Radio name="q21" options={["Yes — training ADMT for significant decisions", "Yes — training facial/emotion/biometric recognition", "No"]} value={q18bTraining} onChange={setQ18bTraining} /></div>
              </div>
              {admtTriggered && (
                <div data-rail-key="i5_admt" onFocus={() => focusRail('i5_admt')} className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/40 dark:bg-amber-950/10 rounded-r">
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
              <div data-rail-key="q15_sensitive_pi" onFocus={() => focusRail('q15_sensitive_pi')}><div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Do you process any sensitive PI? <Req /></Label><DefPopover termKey="sensitive_pi" /><EnforcementSignalIcon signalKey="sensitive_pi" signals={enforcementSignals} /></div><p className="text-xs text-muted-foreground mt-1">Sensitive PI includes health, precise location, race, and more — see the definition.</p><div className="mt-2"><Radio name="q15" options={Q15_SENSITIVE_PI_OPTS} value={q15} onChange={setQ15} /></div></div>
              {q15 === "Yes" && (<>
                <div data-rail-key="q15c_spi_volume" onFocus={() => focusRail('q15c_spi_volume')}>
                  <Label>For how many California consumers do you process sensitive personal information annually? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(B))</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">Optional — this feeds the § 7120(b)(2)(B) SPI-volume cyber-audit prong. Give your best estimate for the distinct California residents whose SPI you process in a year.</p>
                  <div className="mt-2"><Radio name="q15c" options={SPI_VOLUME_OPTS} value={q15cSpiVolume} onChange={setQ15cSpiVolume} /></div>
                </div>
                <div><Label>Do you provide consumers the right to limit use of their sensitive PI? <Req /></Label><p className="text-xs text-muted-foreground mt-1">The right to limit applies when you use sensitive PI beyond what's necessary.</p><div className="mt-2"><Radio name="q16" options={["Yes, with a separate \"Limit the Use of My Sensitive PI\" link", "Yes, handled within privacy settings", "No", "Not yet implemented"]} value={q16} onChange={setQ16} /></div></div>
                <div><Label>What is your legal basis for processing sensitive PI? <Req /></Label><p className="text-xs text-muted-foreground mt-1">The lawful basis you rely on to process sensitive PI.</p><div className="mt-2"><Radio name="q17" options={["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"]} value={q17} onChange={setQ17} /></div></div>
              </>)}
              <div data-rail-key="q15b_under16" onFocus={() => focusRail('q15b_under16')}>
                <Label>Do you have actual knowledge that you process the personal information of consumers under 16? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7001(bbb))</span></Label>
                <p className="text-xs text-muted-foreground mt-1">Under the 2026 regulations, <span className="font-medium">all</span> personal information of a consumer under 16 is sensitive personal information where the business has actual knowledge of the age. Requesting age at sign-up, or willfully disregarding age, counts as actual knowledge — and pulls this processing into the sensitive-PI rules.</p>
                <div className="mt-2"><Radio name="q15b" options={["Yes — we knowingly process under-16 data", "No — we do not knowingly process under-16 data", "Unsure"]} value={q15bUnder16} onChange={setQ15bUnder16} /></div>
              </div>
              <div data-rail-key="i4b_sources" onFocus={() => focusRail('i4b_sources')}>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Where does this personal information come from? <span className="text-xs text-muted-foreground">(§ 7152(a)(3))</span></Label><StatutePopover term="Sources of the PI" summary="The operational elements of the processing must identify the sources of the personal information — for example, directly from the consumer, observed, or obtained from third parties." cite="11 CCR § 7152(a)(3)" /></div>
                <p className="text-xs text-muted-foreground mt-1">Identify each source: collected directly from the consumer, passively observed from their activity, generated/inferred by you, or obtained from third parties (data brokers, advertising or analytics partners, affiliates, public records). Note which categories come from which source.</p>
                <ExhibitTextarea className="mt-2" rows={3} value={i4bSources} onChange={setI4bSources} placeholder='Category — source, one per line' />
                {renderAssertion("i4b_sources")}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Approximately how many California consumers does this activity affect? <span className="text-xs text-muted-foreground">(§ 7152(a)(3)(D))</span></Label><StatutePopover term="California consumer count" summary="State the approximate number of consumers whose personal information the processing affects." cite="11 CCR § 7152(a)(4)(D)" /></div>
                <div className="mt-2"><Radio name="i3" options={CA_CONSUMER_BAND} value={i3CaConsumerBand} onChange={setI3CaConsumerBand} /></div>
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
            </>
          )}

          {step === 4 && (
            <>
              <h2>The minimum-necessary test, retention, and any business purposes you rely on</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(2)–(3)(B); Cal. Civ. Code §§ 1798.140(e), 1798.145 — minimisation analysis, retention, and enumerated business purposes</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers drive the minimisation analysis in the report — each element tested against the stated purpose — together with the retention plan and any enumerated business purpose the activity leans on.</p>
              <div data-rail-key="i1b_min_pi" onFocus={() => focusRail('i1b_min_pi')}>
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
                {/* A-2 — minimum-necessary candidate set */}
                <div data-rail-key="i1b_min_pi" onFocus={() => focusRail('i1b_min_pi')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Candidate personal-information elements, and whether each is necessary <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(2))</span></Label><StatutePopover term="Minimum-necessary set" summary="The assessment must identify the minimum personal information necessary to achieve the purpose; each element collected is tested against that purpose." cite="11 CCR § 7152(a)(2)" /></div>
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
              <div className="border-t pt-6 mt-6">
                <Label className="text-base font-semibold">CCPA business purposes &amp; statutory exemptions <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground mt-1">
                  These are the enumerated "business purposes" in <span className="font-mono">Cal. Civ. Code § 1798.140(e)</span> and exemptions in <span className="font-mono">§ 1798.145</span>. They permit specific internal uses or carve out specific obligations — they do <span className="font-medium">not</span> remove a § 7150 trigger from risk-assessment scope. Identify any you rely on so the report can address them; leave blank if none apply.
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
                <div data-rail-key="impact_harm_causes" onFocus={() => focusRail('impact_harm_causes')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Negative impacts, with their sources and causes <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(5)(A)–(H))</span></Label><StatutePopover term="Negative impacts" summary="Identify the negative impacts to consumers' privacy associated with the processing, and the sources and causes of those impacts." cite="11 CCR § 7152(a)(5)" /></div>
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
                </div>
                  <div data-rail-key="impact_safeguards" onFocus={() => focusRail('impact_safeguards')}>
                    <Label>Safeguards planned to address these harms <span className="text-xs text-muted-foreground font-mono">(§ 7152(a))</span></Label>
                    <p className="text-xs text-muted-foreground mt-1">Identify the safeguards you have or plan to put in place to reduce the negative impacts above — for example encryption, access controls, data minimisation at point of transfer, contractual restrictions on recipients, privacy-enhancing technologies, or de-identification. This is a required element; leaving it blank produces a fill-in in the report.</p>
                    <Textarea className="mt-2" rows={3} value={impactData.safeguards} onChange={(e) => setImpactData((d) => ({ ...d, safeguards: e.target.value }))} placeholder='One safeguard per line' />
                  </div>
                {/* A-6 — safeguards mapped to an identified impact */}
                <div data-rail-key="impact_safeguards" onFocus={() => focusRail('impact_safeguards')}>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Safeguards, mapped to the impact each one addresses <span className="text-xs text-muted-foreground">(§ 7152(a)(6))</span></Label><StatutePopover term="Safeguards" summary="Identify the safeguards the business plans to implement for the processing, including safeguards addressing the negative impacts identified under subsection (a)(5)." cite="11 CCR § 7152(a)(6)" /></div>
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
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setA6Safeguards((r) => [...r, { harm: "", safeguard: "", safeguard_status: "", residual: "" }])}>Add safeguard</Button>
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
            </>
          )}

          {step === 6 && (
            <>
              <h2>What the processing is worth, and to whom</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7152(a)(4), (a)(7) — benefits by beneficiary group and the weighing against negative impacts</p>
              <RequiredLegend />
              <p className="text-sm text-muted-foreground">These answers produce the weighing section. A benefit stated without a supporting fact from the record is carried as unevidenced, and the weighing reserves rather than concluding.</p>
                {/* A-4 — benefits, four beneficiary classes */}
                <div>
                  <div className="inline-flex items-center gap-1.5 flex-wrap"><Label>Benefits of this processing, stated specifically for each group <Req /> <span className="text-xs text-muted-foreground">(§ 7152(a)(4))</span></Label><StatutePopover term="Benefits by group" summary="Benefits to the business, the consumer, other stakeholders, and the public must be identified as applicable, and not in generic terms such as 'improving our service'." cite="11 CCR § 7152(a)(4)" /></div>
                  <p className="text-xs text-muted-foreground mt-1">Each group gets its own statement and its own supporting fact from the record. A benefit with no supporting fact is carried as unevidenced in the weighing.</p>
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Benefit to the business</Label>
                      <Textarea rows={2} value={a4BenefitBusiness} onChange={(e) => setA4BenefitBusiness(e.target.value)} placeholder="Specific outcome for the business" />
                      <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitBusinessFact} onChange={(e) => setA4BenefitBusinessFact(e.target.value)} placeholder="Fact in the record showing it" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Benefit to the consumer</Label>
                      <Textarea rows={2} value={a4BenefitConsumer} onChange={(e) => setA4BenefitConsumer(e.target.value)} placeholder="Specific outcome for the consumer" />
                      <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitConsumerFact} onChange={(e) => setA4BenefitConsumerFact(e.target.value)} placeholder="Fact in the record showing it" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Benefit to other stakeholders</Label>
                      <Textarea rows={2} value={a4BenefitOtherStakeholders} onChange={(e) => setA4BenefitOtherStakeholders(e.target.value)} placeholder="Outcome for other stakeholders" />
                      <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitOtherStakeholdersFact} onChange={(e) => setA4BenefitOtherStakeholdersFact(e.target.value)} placeholder="Fact in the record showing it" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Benefit to the public</Label>
                      <Textarea rows={2} value={a4BenefitPublic} onChange={(e) => setA4BenefitPublic(e.target.value)} placeholder="Outcome for the public" />
                      <Textarea rows={2} data-rail-key="a4_benefit_supporting_fact" onFocus={() => focusRail('a4_benefit_supporting_fact')} value={a4BenefitPublicFact} onChange={(e) => setA4BenefitPublicFact(e.target.value)} placeholder="Fact in the record showing it" />
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
                    <Button onClick={() => { if (!user) { setAuthGateOpen(true); return; } setCheckoutOpen(true); }}>
                      Purchase CPPA Suite (${suitePricing.price})
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
