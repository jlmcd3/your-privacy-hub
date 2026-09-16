
import { useState, useMemo, useEffect } from "react";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { RequirementBadge } from "@/components/RequirementBadge";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import StatuteRail from "@/components/intake/StatuteRail";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { GOVERNANCE_RAIL_BY_FIELD, GOVERNANCE_RAIL_BY_STEP } from "@/components/governance/GovernanceRailEntries";
import type { RailEntry } from "@/components/intake/RailEntry";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { fail, type StepIssue } from "@/lib/intakeValidation";
import { buildGovernanceReview, governanceUnresolvedRows } from "@/lib/governanceReview";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";

import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { productEyebrow } from "@/config/productEyebrow";
import { ProductHero, ProductHeroSubstrip } from "@/components/ProductHero";
import HeroPriceCta from "@/components/product/HeroPriceCta";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import CompactDisclaimer from "@/components/product/CompactDisclaimer";
import { INCLUDED_GENERATIONS_HERO } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";
import { Scale, Zap } from 'lucide-react';

// Price tiers managed by useToolPrice hook (subscriber-aware)

const SECTORS = ["Technology/SaaS", "Healthcare/Life Sciences", "Financial services", "Retail/ecommerce", "Media/advertising", "Professional services", "Education", "Government/public sector", "Legal services", "Manufacturing", "Other"];
const SIZES = ["1-10", "11-50", "51-250", "251-1000", "1001+"];
const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Japan", "Other"];
const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
// Governance master review (2026-09-15, F06) — Art. 9(1) also names
// philosophical beliefs and sex life; an "Other or unsure" route records a
// category the list does not name. Verbatim mirror of the contract list.
const SPECIAL_CATS = ["Health data", "Biometric data", "Genetic data", "Racial/ethnic origin", "Political opinions", "Religious beliefs", "Trade union membership", "Sexual orientation", "Philosophical beliefs", "Sex life", "Other or unsure which category"];
// DOC 258 (2026-09-11) — Art. 37(1)(c) elements; verbatim mirrors of the
// contract's SC_* lists (governance-assessment.ts). Keep in sync.
const SC_CORE_ACTIVITY = ["Yes — a primary activity, or inextricably part of delivering our principal products or services", "No — an ancillary or supporting activity", "Uncertain"];
const SC_POPULATION_PROPORTION = ["Yes — a significant proportion of the relevant population", "No", "Unsure"];
const SC_DURATION = ["Continuous or ongoing", "Recurring", "Long-term but for a fixed period", "Temporary or one-off", "Unknown"];
const SC_GEOGRAPHIC_SCOPE = ["Local", "National", "Several Member States or countries", "Broader than the EU/EEA and the UK", "Unknown"];
// Governance master review (2026-09-15) — verbatim mirrors of the contract.
const SPECIAL_CATEGORY_OPTS = ["Yes", "No", "Unknown"];
const TERRITORIAL_SCOPE_BASIS = ["Established in the EU or EEA", "Established in the UK", "We offer goods or services to people in the EU or UK", "We monitor the behaviour of people in the EU or UK", "None of these", "Unsure"];
const TERRITORIAL_SCOPE_EXCLUSIVE = ["None of these", "Unsure"];
const TERRITORIAL_SCOPE_POSITIVE = TERRITORIAL_SCOPE_BASIS.slice(0, 4);
const TRANSFER_STATUS_OPTS = ["Yes, US-based tools", "Yes, other non-adequate countries", "Yes, only to countries with an adequacy decision or regulations", "Yes, a mix of routes (described below)", "All tools store data in EU/UK", "Unsure"];
const INVENTORY_AUDIT_OPTS = ["Yes — audited + formal approval process", "Inventory exists and is audited, but there is no formal approval route", "Inventory exists with a formal approval route, but it is not audited", "Inventory exists, no formal audit/approval", "No formal inventory", "Unsure"];
const DSR_RIGHTS_OPTS = ["Access", "Erasure", "Portability", "Rectification", "Restriction", "Objection"];
const DSR_TESTED = "Yes — documented and tested across all vendors";
// F05 — a restored transfer mechanism is mapped onto the branch's own labels
// (the three branch lists differ); anything unmapped is cleared, never kept
// as an invisible value.
const TRANSFER_MECHANISM_ALIASES: Record<string, string[]> = {
  "EU SCCs": ["EU Standard Contractual Clauses (SCCs)"],
  "UK IDTA / Addendum": ["UK IDTA", "UK Addendum to EU SCCs"],
  "Adequacy decision/regulations": ["Adequacy decision", "UK adequacy regulations"],
};
export function normaliseTransferMechanism(value: string, options: readonly string[]): string {
  if (!value || value === "n/a") return "";
  if (options.includes(value)) return value;
  for (const [canonical, aliases] of Object.entries(TRANSFER_MECHANISM_ALIASES)) {
    if (options.includes(canonical) && aliases.includes(value)) return canonical;
    if (aliases.includes(value)) continue;
    if (value === canonical) {
      const back = aliases.find((a) => options.includes(a));
      if (back) return back;
    }
  }
  return "";
}
/** F05 — the "Other: …" entry the page folds into `tools` is restored to its own control. */
export function splitOtherTool(tools: unknown): { tools: string[]; otherTool: string } {
  const arr = Array.isArray(tools) ? tools.filter((t): t is string => typeof t === "string") : [];
  const other = arr.find((t) => t.startsWith("Other: "));
  return { tools: arr.filter((t) => !t.startsWith("Other: ")), otherTool: other ? other.slice("Other: ".length) : "" };
}

// Governance master review (2026-09-15, F14) — the group carries an
// accessible name; each pill exposes its selected state; an `exclusive`
// option clears the others and is cleared by a positive one.
const Pills = ({ options, value, onChange, labelledBy, exclusive = [] }: { options: string[]; value: string[]; onChange: (v: string[]) => void; labelledBy?: string; exclusive?: string[] }) => (
  <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
    {options.map((opt) => {
      const checked = value.includes(opt);
      const toggle = () => {
        if (checked) return onChange(value.filter((v) => v !== opt));
        if (exclusive.includes(opt)) return onChange([opt]);
        return onChange([...value.filter((v) => !exclusive.includes(v)), opt]);
      };
      return (
        <button key={opt} type="button" aria-pressed={checked} onClick={toggle}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>
          {opt}
        </button>
      );
    })}
  </div>
);

// F14 — a named radiogroup; the question Label supplies the name via `labelledBy`.
const Radio = ({ name, options, value, onChange, labelledBy }: { name: string; options: string[]; value: string; onChange: (v: string) => void; labelledBy?: string }) => (
  <div className="space-y-2" role="radiogroup" aria-labelledby={labelledBy}>
    {options.map((o) => (
      <label key={o} className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} value={o} checked={value === o} onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm">{o}</span>
      </label>
    ))}
  </div>
);

/** F04/F07 — the review step's own guidance (the rail used to show an empty card there). */
const REVIEW_RAIL_ENTRY: RailEntry = {
  fieldLabel: "Review your answers",
  citation: "Art. 5(2) GDPR — accountability",
  citationUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679",
  plainSummary: "Article 5(2) makes the controller responsible for, and able to demonstrate, compliance with the principles. The review lists every answer the report will work from; an unanswered item is recorded as not supplied, not as a finding either way.",
  regulationText: "",
  coachLead: "Check each answer against the record a reviewer could be shown.",
  coachBody: "Use Edit beside any row to return to the question. Where you marked something unknown, leave it unknown rather than choosing an answer to complete the form.",
  goodAnswerKind: "explanation",
  goodAnswer: "A complete review shows every applicable question with the answer given, marks the ones left unanswered as not supplied, and carries the date and owner of the facts where they were asked.",
  commonMistake: "Treating a blank as \"no\" or \"not applicable\". The report records a blank as information not supplied.",
};

const GovernanceAssessment = () => {
  useToolStartedOnInteraction("governance");

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("governance_assessment");
  const { isPremium } = usePremiumStatus();
  const { clientId } = useActiveClient();

  const refine = useRefineMode("governance_assessment");
  const { meter } = useRunMeter("governance_assessment", refine.assessmentId);
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Governance master review (2026-09-15, F14) — the fleet field-error contract.
  const fieldErrors = useFieldErrors();
  const errAnchor = (k: string) => ({
    "data-field": k,
    "aria-invalid": fieldErrors.isInvalid(k) ? true : undefined,
    onClickCapture: () => fieldErrors.clear(k),
  });
  // F07 — the question in view (data-rail-key) selects its own guidance.
  const [activeFieldRailKey, setActiveFieldRailKey] = useState<string | null>(null);
  useScrollActiveRail(setActiveFieldRailKey, [step]);
  // F01/F13 — the payload handed to checkout is built at the moment of action.
  const [checkoutIntake, setCheckoutIntake] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  const [purchasing, setPurchasing] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Step 1
  const [organizationName, setOrganizationName] = useState("");
  const [sector, setSector] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [euUkData, setEuUkData] = useState<"" | "Yes" | "No">("");
  const [tools, setTools] = useState<string[]>([]);
  const [otherTool, setOtherTool] = useState("");
  // Governance master review (2026-09-15, F06 / F10) — the explanatory
  // "Other" inputs and the Art. 3 territorial-scope facts.
  const [sectorOther, setSectorOther] = useState("");
  const [jurisdictionsOther, setJurisdictionsOther] = useState("");
  const [territorialScopeBasis, setTerritorialScopeBasis] = useState<string[]>([]);

  // Step 2
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [dataCategoriesOther, setDataCategoriesOther] = useState("");
  const [specialCategory, setSpecialCategory] = useState<"" | "Yes" | "No" | "Unknown">("");
  const [specialCategoriesList, setSpecialCategoriesList] = useState<string[]>([]);
  // DOC 258 — Art. 37(1)(c) elements, asked under special category "Yes".
  const [scCoreActivity, setScCoreActivity] = useState("");
  const [scCoreActivityExplanation, setScCoreActivityExplanation] = useState("");
  const [scDataSubjectsCount, setScDataSubjectsCount] = useState("");
  const [scPopulationProportion, setScPopulationProportion] = useState("");
  const [scDataVolume, setScDataVolume] = useState("");
  const [scDuration, setScDuration] = useState("");
  const [scGeographicScope, setScGeographicScope] = useState("");

  // Step 3
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [privacyNoticeCoverage, setPrivacyNoticeCoverage] = useState("");
  
  const [dpoStatus, setDpoStatus] = useState("");
  const [dpiaStatus, setDpiaStatus] = useState("");
  const [incidentResponse, setIncidentResponse] = useState("");

  // Step 4
  const [trainingStatus, setTrainingStatus] = useState("");
  const [toolInstruction, setToolInstruction] = useState("");

  // Step 5 (conditional)
  const [dpaStatus, setDpaStatus] = useState("");
  const [transferStatus, setTransferStatus] = useState("");
  // Governance master review (2026-09-15, F08) — optional structured detail
  // behind the aggregate answers.
  const [processorCount, setProcessorCount] = useState("");
  const [uncoveredVendors, setUncoveredVendors] = useState("");
  const [transferRoutes, setTransferRoutes] = useState("");

  // New (intake redesign)
  const [technicalControls, setTechnicalControls] = useState("");
  const [technicalControlsList, setTechnicalControlsList] = useState<string[]>([]);
  const [dsrCapability, setDsrCapability] = useState("");
  const [dsrRightsTested, setDsrRightsTested] = useState<string[]>([]);
  const [inventoryAudit, setInventoryAudit] = useState("");
  // DOC 162 (2026-09-03) — Art. 30(1)(f) retention periods; the element walk
  // read this key since ITEM 313 but the form never asked it.
  const [retentionScheduleStatus, setRetentionScheduleStatus] = useState("");
  const [dpiaAiCoverage, setDpiaAiCoverage] = useState("");
  const [trainingAiCoverage, setTrainingAiCoverage] = useState("");
  const [dpaArt28Verified, setDpaArt28Verified] = useState("");
  const [transferMechanism, setTransferMechanism] = useState("");

  // R1a: optional free-text catch-all rendered on the final input step.
  const [additionalContext, setAdditionalContext] = useState("");

  // ITEM 313 — Art. 24(1) inputs: review cadence + last review date (second
  // sentence), and the four factors Art. 24(1) names for risk calibration.
  const [measuresReviewCadence, setMeasuresReviewCadence] = useState("");
  const [measuresLastReviewDate, setMeasuresLastReviewDate] = useState("");
  const [processingNature, setProcessingNature] = useState("");
  const [processingScope, setProcessingScope] = useState("");
  const [processingContext, setProcessingContext] = useState("");
  const [processingPurposes, setProcessingPurposes] = useState("");
  // GOVERNANCE UPGRADE — remediation defaults applied to adverse findings.
  const [remediationOwner, setRemediationOwner] = useState("");
  const [remediationTargetDate, setRemediationTargetDate] = useState("");
  const [remediationPriority, setRemediationPriority] = useState("");
  const [remediationValidationMethod, setRemediationValidationMethod] = useState("");


  const isUk = jurisdictions.includes("United Kingdom (UK GDPR)");
  const isEu = jurisdictions.includes("EU (GDPR)");
  // Governance master review (2026-09-15, F10) — GDPR / UK GDPR applicability
  // is a territorial-scope question (Art. 3): establishment, offering goods or
  // services, or monitoring behaviour. Any of those facts, a selected EU/UK
  // jurisdiction, or the residents answer keeps the GDPR-only questions in
  // play; headcount decides nothing. The DPO question is asked whenever the
  // GDPR applies — Art. 37 turns on core activities and scale, not on staff
  // numbers, so no size band hides it.
  const scopePositive = territorialScopeBasis.some((b) => TERRITORIAL_SCOPE_POSITIVE.includes(b));
  const gdprApplies = euUkData === "Yes" || isEu || isUk || scopePositive;
  const scopeContradiction = euUkData === "No" && (isEu || isUk || scopePositive);
  const showDpoQ = gdprApplies;
  const showStep5 = gdprApplies;
  // F08 — the mechanism question opens for every transfer; verification of
  // the Art. 28(3) clauses is asked whenever any agreement exists.
  const transferMechShown = transferStatus.startsWith("Yes");
  const dpaVerifyShown = dpaStatus !== "" && dpaStatus !== "No";
  const dsrTested = dsrCapability === DSR_TESTED;
  const specialCategoryContradiction = specialCategory === "No" && (dataCategories.includes("Health or medical data") || dataCategories.includes("Biometric data"));
  const transferMechOptions =
    isUk && !isEu ? ["UK IDTA", "UK Addendum to EU SCCs", "UK adequacy regulations", "None"]
    : isEu && !isUk ? ["EU Standard Contractual Clauses (SCCs)", "Binding Corporate Rules", "Adequacy decision", "None"]
    : ["UK IDTA / Addendum", "EU SCCs", "Binding Corporate Rules", "Adequacy decision/regulations", "None"];
  const transferMechCite = isUk && !isEu ? "(UK IDTA / Addendum · s.119A DPA 2018)" : isEu && !isUk ? "(Chapter V GDPR — Arts. 45, 46, 49)" : "(Chapter V — EU GDPR and UK GDPR routes)";
  const totalSteps = showStep5 ? 6 : 5; // 5 sections + summary

  // F05 — a step restored or reached beyond the active range is clamped.
  useEffect(() => { if (step > totalSteps) setStep(totalSteps); }, [totalSteps, step]);
  // F05 — when the jurisdictions change, the recorded mechanism is re-read
  // against the branch's own labels; an unmappable value is cleared.
  useEffect(() => {
    if (!transferMechanism) return;
    const mapped = normaliseTransferMechanism(transferMechanism, transferMechOptions);
    if (mapped !== transferMechanism) setTransferMechanism(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUk, isEu]);

  // Governance master review (2026-09-15, F03/F06/F14) — every check names
  // its field; required markers and validation agree (see <Req /> on the
  // conditional follow-ups); an honest Unknown is a complete answer.
  const stepValidFor = (s: number): StepIssue | null => {
    if (s === 1) {
      if (!organizationName.trim()) return fail("organization_name", "Name the organisation this assessment covers.");
      if (!sector) return fail("sector", "Select the primary sector.");
      if (sector === "Other" && !sectorOther.trim()) return fail("sector_other", "Describe the sector.");
      if (!orgSize) return fail("org_size", "Select the number of employees.");
      if (!jurisdictions.length) return fail("jurisdictions", "Select at least one jurisdiction.");
      if (jurisdictions.includes("Other") && !jurisdictionsOther.trim()) return fail("jurisdictions_other", "Name the other jurisdiction(s).");
      if (!euUkData) return fail("eu_uk_data", "Answer whether you process personal data of people in the EU or UK.");
      if (scopeContradiction) return fail("eu_uk_data", "You selected an EU or UK jurisdiction (or an Article 3 fact) but answered No here. Resolve the two answers — the GDPR questions stay in scope until they agree.");
      if (!tools.length && !otherTool.trim()) return fail("tools", "Select at least one technology tool, or name another tool.");
    }
    if (s === 2) {
      if (!dataCategories.length) return fail("data_categories", "Select the categories of personal data you process.");
      if (dataCategories.includes("Other") && !dataCategoriesOther.trim()) return fail("data_categories_other", "Describe the other category of personal data.");
      if (!specialCategory) return fail("special_category", "Answer the special-category question — \"Unknown\" is a complete answer.");
      if (specialCategory === "Yes" && !specialCategoriesList.length) return fail("special_categories_list", "Select which special categories apply — \"Other or unsure which category\" is a complete answer.");
      if (specialCategory === "Yes" && !scCoreActivity) return fail("sc_core_activity", "Answer whether the special-category processing is a core activity — \"Uncertain\" is a complete answer.");
      if (specialCategory === "Yes" && !scPopulationProportion) return fail("sc_population_proportion", "Answer whether a significant proportion of the population is covered — \"Unsure\" is a complete answer.");
      if (specialCategory === "Yes" && !scDuration) return fail("sc_duration", "Answer how long the processing runs — \"Unknown\" is a complete answer.");
      if (specialCategory === "Yes" && !scGeographicScope) return fail("sc_geographic_scope", "Answer the geographical scope — \"Unknown\" is a complete answer.");
    }
    if (s === 3) {
      if (!privacyPolicy) return fail("privacy_policy", "Answer the privacy notice question.");
      if (privacyPolicy.startsWith("Yes") && !privacyNoticeCoverage) return fail("privacy_notice_coverage", "Answer whether your published notice describes all current processing — \"Unsure\" is a complete answer.");
      if (showDpoQ && !dpoStatus) return fail("dpo_status", "Answer whether a data protection officer or equivalent is designated.");
      if (!dpiaStatus) return fail("dpia_status", "Answer the DPIA question — \"Unsure\" is a complete answer.");
      if (dpiaStatus.startsWith("Yes") && !dpiaAiCoverage) return fail("dpia_ai_coverage", "Answer whether your DPIAs cover your current AI and high-risk tools — \"Unsure\" is a complete answer.");
      if (!incidentResponse) return fail("incident_response", "Answer the incident-response question.");
      if (!dsrCapability) return fail("dsr_capability", "Answer whether you can fulfil data subject rights across your vendors — \"Unsure\" is a complete answer.");
      if (dsrTested && !dsrRightsTested.length) return fail("dsr_rights_tested", "You reported tested rights handling — select at least one right you have tested end-to-end.");
      if (!inventoryAudit) return fail("inventory_audit", "Answer the inventory question — \"Unsure\" is a complete answer.");
      if (!retentionScheduleStatus) return fail("retention_schedule_status", "Answer whether retention periods are documented for each category of data — \"Unsure\" is a complete answer.");
    }
    if (s === 4) {
      if (!trainingStatus) return fail("training_status", "Answer the training question.");
      if (trainingStatus.startsWith("Yes") && !trainingAiCoverage) return fail("training_ai_coverage", "Answer whether training covers AI tools and data-submission risk — \"Unsure\" is a complete answer.");
      if (!toolInstruction) return fail("tool_instruction", "Answer the tool-instruction question.");
      if (!technicalControls) return fail("technical_controls", "Answer whether technical controls, not only policy, restrict what reaches your tools — \"Unsure\" is a complete answer.");
    }
    if (s === 5 && showStep5) {
      if (!dpaStatus) return fail("dpa_status", "Answer the processor-contract question.");
      if (dpaVerifyShown && !dpaArt28Verified) return fail("dpa_art28_verified", "Answer whether those contracts have been verified against the Art. 28(3) clauses — \"Unsure\" is a complete answer.");
      if (!transferStatus) return fail("transfer_status", "Answer the cross-border transfer question — \"Unsure\" is a complete answer.");
      if (transferMechShown && !transferMechanism) return fail("transfer_mechanism", "Name the Chapter V basis for those transfers — \"None\" is a complete answer the report records as a gap.");
    }
    return null;
  };
  const stepValid = (): StepIssue | null => stepValidFor(step);

  /** F03 — the first incomplete applicable step, for every completion route. */
  const firstIncompleteStep = (): { step: number; issue: StepIssue } | null => {
    for (let s = 1; s <= totalSteps - 1; s++) {
      const issue = stepValidFor(s);
      if (issue) return { step: s, issue };
    }
    return null;
  };
  /** F03 — one guard for Next, the summary button and the sample-panel button. */
  const gate = (): boolean => {
    const bad = firstIncompleteStep();
    if (!bad) { setValidationError(null); fieldErrors.clearAll(); return true; }
    setStep(bad.step);
    setValidationError(bad.issue.message);
    fieldErrors.show(bad.issue.fields, bad.issue.message);
    return false;
  };

  const next = () => {
    const issue = stepValid();
    if (issue) { setValidationError(issue.message); fieldErrors.show(issue.fields, issue.message); return; }
    // Mid-intake account gate: stop anonymous visitors entering the final
    // input step (the one before the summary).
    if (!user && step + 1 === totalSteps - 1) { setAuthGateOpen(true); return; }
    setValidationError(null);
    fieldErrors.clearAll();
    setStep((s) => s + 1);
  };
  const back = () => { setValidationError(null); fieldErrors.clearAll(); setStep((s) => Math.max(1, s - 1)); };


  const buildIntake = () => ({
    organization_name: organizationName,
    sector, org_size: orgSize, jurisdictions, eu_uk_data: euUkData,
    // Governance master review (2026-09-15, F06 / F10) — the explanatory
    // "Other" inputs travel only while their option is selected; the Art. 3
    // facts travel as given.
    sector_other: sector === "Other" ? sectorOther : "",
    jurisdictions_other: jurisdictions.includes("Other") ? jurisdictionsOther : "",
    territorial_scope_basis: territorialScopeBasis,
    tools: otherTool.trim() ? [...tools, `Other: ${otherTool.trim()}`] : tools,
    data_categories: dataCategories,
    data_categories_other: dataCategories.includes("Other") ? dataCategoriesOther : "",
    // Batch b83ea3c4 (2026-09-05): the pills are only shown on "Yes"; a list
    // left over from an earlier "Yes" must not travel with a "No" (same rule
    // as privacy_notice_coverage below).
    special_category: specialCategory, special_categories_list: specialCategory === "Yes" ? specialCategoriesList : [],
    // DOC 258 — Art. 37(1)(c) elements travel only with a "Yes".
    sc_core_activity: specialCategory === "Yes" ? scCoreActivity : "n/a",
    sc_core_activity_explanation: specialCategory === "Yes" ? scCoreActivityExplanation : "",
    sc_data_subjects_count: specialCategory === "Yes" ? scDataSubjectsCount : "",
    sc_population_proportion: specialCategory === "Yes" ? scPopulationProportion : "n/a",
    sc_data_volume: specialCategory === "Yes" ? scDataVolume : "",
    sc_duration: specialCategory === "Yes" ? scDuration : "n/a",
    sc_geographic_scope: specialCategory === "Yes" ? scGeographicScope : "n/a",
    privacy_policy: privacyPolicy,
    privacy_notice_coverage: privacyPolicy.startsWith("Yes") ? privacyNoticeCoverage : "n/a",
    
    dpo_status: showDpoQ ? dpoStatus : "n/a",
    dpia_status: dpiaStatus, incident_response: incidentResponse,
    training_status: trainingStatus, tool_instruction: toolInstruction,
    dpa_status: showStep5 ? dpaStatus : "n/a",
    // F08 — optional detail behind the aggregate answers.
    processor_count: showStep5 ? processorCount : "",
    uncovered_vendors: showStep5 ? uncoveredVendors : "",
    transfer_status: showStep5 ? transferStatus : "n/a",
    transfer_routes: showStep5 ? transferRoutes : "",
    technical_controls: technicalControls,
    technical_controls_list: (technicalControls === "Yes — DLP/content filtering actively enforced" || technicalControls.startsWith("Partial")) ? technicalControlsList : [],
    dsr_capability: dsrCapability,
    dsr_rights_tested: dsrTested ? dsrRightsTested : [],
    inventory_audit: inventoryAudit,
    retention_schedule_status: retentionScheduleStatus,
    dpia_ai_coverage: dpiaStatus.startsWith("Yes") ? dpiaAiCoverage : "n/a",
    training_ai_coverage: trainingStatus.startsWith("Yes") ? trainingAiCoverage : "n/a",
    dpa_art28_verified: (showStep5 && dpaVerifyShown) ? dpaArt28Verified : "n/a",
    transfer_mechanism: (showStep5 && transferMechShown) ? transferMechanism : "n/a",
    additional_context: additionalContext,
    // ITEM 313 — Art. 24(1) review + risk-calibration factors.
    measures_review_cadence: measuresReviewCadence,
    measures_last_review_date: measuresLastReviewDate,
    processing_nature: processingNature,
    processing_scope: processingScope,
    processing_context: processingContext,
    processing_purposes: processingPurposes,
    // GOVERNANCE UPGRADE — remediation defaults (flat keys + the object the
    // deliverables builder reads). Never invented: blank stays blank.
    remediation_default_owner: remediationOwner,
    remediation_default_target_date: remediationTargetDate,
    remediation_default_priority: remediationPriority,
    remediation_default_validation_method: remediationValidationMethod,
    remediation_defaults: {
      accountable_owner: remediationOwner,
      target_date: remediationTargetDate,
      priority: remediationPriority,
      validation_method: remediationValidationMethod,
    },

  });

  const handlePurchase = async () => {
    // F03 — every completion route revalidates every applicable step first.
    if (!gate()) return;
    if (!user) { setAuthGateOpen(true); return; }

    // For $0 (included with Platform), bypass Stripe entirely
    if (pricing.price === 0) {
      setPurchasing(true);
      // Create the row first (the run- edge requires assessment_id, not raw
      // intake_data), mirroring the server's subscriber-credit row shape,
      // then trigger generation. The result page polls until complete.
      const { data: row, error: insErr } = await supabase
        .from("governance_assessments")
        .insert({
          user_id: user.id,
          client_id: clientId ?? null,
          status: "pending",
          intake_data: buildIntake(),
          purchased_as_standalone: false,
          is_subscriber_credit: true,
          purchase_price_cents: 0,
        })
        .select("id")
        .single();
      if (insErr || !row) {
        setPurchasing(false);
        toast({ title: "Generation failed", description: "Try again.", variant: "destructive" });
        return;
      }
      const { error: fnErr } = await supabase.functions.invoke(
        "run-governance-assessment",
        { body: { assessment_id: row.id } }
      );
      setPurchasing(false);
      if (fnErr) {
        toast({ title: "Generation failed", description: "Try again.", variant: "destructive" });
        return;
      }
      void clearDraft();
      navigate(`/governance-assessment/result/${row.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured — check back soon.", variant: "destructive" });
      return;
    }
    // F01 — checkout receives the payload built from the current answers at
    // the moment of action, never a memo that may lag an edit.
    setCheckoutIntake(buildIntake());
    setPurchasing(true);
    setCheckoutOpen(true);
  };

  // Governance master review (2026-09-15, F01) — every payload dependency is
  // listed (six were missing: privacy_notice_coverage, retention_schedule_status
  // and the four remediation defaults), so the draft and the review never
  // carry a stale answer.
  const intakeForCheckout = useMemo(() => buildIntake(), [
    organizationName, sector, sectorOther, orgSize, jurisdictions, jurisdictionsOther, territorialScopeBasis, euUkData, tools, otherTool, dataCategories, dataCategoriesOther,
    specialCategory, specialCategoriesList, scCoreActivity, scCoreActivityExplanation, scDataSubjectsCount, scPopulationProportion, scDataVolume, scDuration, scGeographicScope, privacyPolicy, privacyNoticeCoverage,
    dpoStatus, dpiaStatus, incidentResponse, trainingStatus, toolInstruction,
    dpaStatus, transferStatus, processorCount, uncoveredVendors, transferRoutes, showDpoQ, showStep5, dpaVerifyShown, transferMechShown, dsrTested,
    technicalControls, technicalControlsList, dsrCapability, dsrRightsTested,
    inventoryAudit, retentionScheduleStatus, dpiaAiCoverage, trainingAiCoverage, dpaArt28Verified, transferMechanism, additionalContext,
    measuresReviewCadence, measuresLastReviewDate,
    processingNature, processingScope, processingContext, processingPurposes,
    remediationOwner, remediationTargetDate, remediationPriority, remediationValidationMethod,
  ]);
  // F04 — the review is built from the same payload the page submits.
  const reviewSections = useMemo(() => buildGovernanceReview(intakeForCheckout as Record<string, unknown>), [intakeForCheckout]);
  const unresolvedRows = useMemo(() => governanceUnresolvedRows(reviewSections), [reviewSections]);
  const REVIEW_SECTION_STEP: Record<string, number> = { scope: 1, data: 2, governance: 3, measures: 4, processors: 5, context: totalSteps - 1 };
  const jumpToStep = (target: number, key: string) => {
    setStep(Math.min(Math.max(1, target), totalSteps));
    setValidationError(null);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`) ?? document.querySelector<HTMLElement>(`[data-rail-key="${key}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  };

  const initialIntakeJson = useMemo(() => JSON.stringify(buildIntake()), []);
  const touched = useMemo(() => JSON.stringify(intakeForCheckout) !== initialIntakeJson, [intakeForCheckout, initialIntakeJson]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage, clearDraft, resumeDraft, startNewDraft,
    saving: draftSaving, lastSavedAt: draftSavedAt, saveError: draftSaveError, draftChoice,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "governance",
    clientId: clientId ?? null,
    data: { intake: intakeForCheckout, step },
    currentStage: step,
    enabled: !!user && touched,
  });
  // Governance master review (2026-09-15, F05) — a restored value must be a
  // value the active branch can show: "n/a" sentinels become unanswered, an
  // option that no list carries is dropped, the folded "Other: …" tool is
  // restored to its own control, and the step is clamped.
  const applyRestore = () => {
    const payload = restoreData as { intake?: any; step?: number } | null;
    const d = payload?.intake as Record<string, any> | undefined;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: any[]) => void) => { if (Array.isArray(v)) fn(v); };
    const E = (v: any, opts: readonly string[], fn: (x: string) => void) => { if (typeof v === "string") fn(v !== "n/a" && opts.includes(v) ? v : ""); };
    S(d.organization_name, setOrganizationName);
    E(d.sector, SECTORS, setSector);
    S(d.sector_other, setSectorOther);
    E(d.org_size, SIZES, setOrgSize);
    A(d.jurisdictions, setJurisdictions);
    S(d.jurisdictions_other, setJurisdictionsOther);
    A(d.territorial_scope_basis, setTerritorialScopeBasis);
    if (d.eu_uk_data === "" || d.eu_uk_data === "Yes" || d.eu_uk_data === "No") setEuUkData(d.eu_uk_data);
    const split = splitOtherTool(d.tools);
    setTools(split.tools);
    if (split.otherTool) setOtherTool(split.otherTool);
    A(d.data_categories, setDataCategories);
    S(d.data_categories_other, setDataCategoriesOther);
    if (d.special_category === "" || d.special_category === "Yes" || d.special_category === "No" || d.special_category === "Unknown") setSpecialCategory(d.special_category);
    A(d.special_categories_list, setSpecialCategoriesList);
    const N = (v: any) => (typeof v === "string" && v !== "n/a" ? v : "");
    S(N(d.sc_core_activity), setScCoreActivity);
    S(N(d.sc_core_activity_explanation), setScCoreActivityExplanation);
    S(N(d.sc_data_subjects_count), setScDataSubjectsCount);
    S(N(d.sc_population_proportion), setScPopulationProportion);
    S(N(d.sc_data_volume), setScDataVolume);
    S(N(d.sc_duration), setScDuration);
    S(N(d.sc_geographic_scope), setScGeographicScope);
    S(d.privacy_policy, setPrivacyPolicy);
    S(N(d.privacy_notice_coverage), setPrivacyNoticeCoverage);
    S(N(d.dpo_status), setDpoStatus);
    S(d.dpia_status, setDpiaStatus);
    S(d.incident_response, setIncidentResponse);
    S(d.training_status, setTrainingStatus);
    S(d.tool_instruction, setToolInstruction);
    S(N(d.dpa_status), setDpaStatus);
    S(N(d.transfer_status), setTransferStatus);
    S(d.processor_count, setProcessorCount);
    S(d.uncovered_vendors, setUncoveredVendors);
    S(d.transfer_routes, setTransferRoutes);
    S(d.technical_controls, setTechnicalControls);
    A(d.technical_controls_list, setTechnicalControlsList);
    S(d.dsr_capability, setDsrCapability);
    A(d.dsr_rights_tested, setDsrRightsTested);
    E(d.inventory_audit, INVENTORY_AUDIT_OPTS, setInventoryAudit);
    S(d.retention_schedule_status, setRetentionScheduleStatus);
    S(N(d.dpia_ai_coverage), setDpiaAiCoverage);
    S(N(d.training_ai_coverage), setTrainingAiCoverage);
    S(N(d.dpa_art28_verified), setDpaArt28Verified);
    // The mechanism is mapped onto the branch the restored jurisdictions select.
    {
      const js: string[] = Array.isArray(d.jurisdictions) ? d.jurisdictions : [];
      const uk = js.includes("United Kingdom (UK GDPR)"); const eu = js.includes("EU (GDPR)");
      const opts = uk && !eu ? ["UK IDTA", "UK Addendum to EU SCCs", "UK adequacy regulations", "None"]
        : eu && !uk ? ["EU Standard Contractual Clauses (SCCs)", "Binding Corporate Rules", "Adequacy decision", "None"]
        : ["UK IDTA / Addendum", "EU SCCs", "Binding Corporate Rules", "Adequacy decision/regulations", "None"];
      setTransferMechanism(normaliseTransferMechanism(N(d.transfer_mechanism), opts));
    }
    S(d.additional_context, setAdditionalContext);
    S(d.measures_review_cadence, setMeasuresReviewCadence);
    S(d.measures_last_review_date, setMeasuresLastReviewDate);
    S(d.remediation_default_owner, setRemediationOwner);
    S(d.remediation_default_target_date, setRemediationTargetDate);
    S(d.remediation_default_priority, setRemediationPriority);
    S(d.remediation_default_validation_method, setRemediationValidationMethod);
    S(d.processing_nature, setProcessingNature);
    S(d.processing_scope, setProcessingScope);
    S(d.processing_context, setProcessingContext);
    S(d.processing_purposes, setProcessingPurposes);

    const restoredStep = typeof restoreStage === "number" ? restoreStage : typeof payload?.step === "number" ? payload.step : 1;
    // Clamped to the widest possible range here; the effect above narrows it
    // once the restored answers decide how many steps there are.
    setStep(Math.min(Math.max(1, Math.round(restoredStep)), 6));
    // F02 — the found draft becomes the autosave target only now.
    resumeDraft();
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

  const summaryStep = step === totalSteps;

  
  const guidanceTier = useGuidanceTier();
  

  const govRailConfigs: Record<number, Parameters<typeof useGdprRailEntry>[0]> = {
    1: {
      article: "3", jurisdiction: "eu",
      fieldLabel: "Territorial scope — Art. 3 GDPR",
      plainSummary: "GDPR applies to any organisation established in the EU/EEA, and to any organisation outside the EU that offers goods or services to EU residents or monitors their behaviour. US, UK, and other non-EU companies processing EU resident data are subject to GDPR regardless of where they are based.",
      relatedCitations: [{ citation: "Art. 3(2) GDPR", label: "Extra-territorial application" }],
      coachLead: "Answer from where your data subjects are — not where you're incorporated.",
      coachBody: "Art. 3 reaches non-EU organisations that offer goods or services to people in the EU, or monitor their behaviour. Check order destinations, analytics, and ad targeting first.",
      goodAnswer: "A US retailer ships to France and runs EU-targeted ads. It selects EU-applicable with no EU entity at all — Art. 3(2) attaches to the offering, not the office.",
      commonMistake: "Selecting not-applicable because there's no EU office. For online businesses, extra-territorial scope is the rule, not the exception.",
    },
    2: {
      article: "9", jurisdiction: "eu", recital: 51,
      fieldLabel: "Special categories — Art. 9 GDPR",
      plainSummary: "Processing special category data is prohibited unless one of ten Art. 9(2) conditions applies. The most common for commercial organisations are explicit consent (Art. 9(2)(a)) and substantial public interest under domestic law (Art. 9(2)(g)). Processing without a valid Art. 9(2) condition is an absolute prohibition — not subject to balancing.",
      relatedCitations: [{ citation: "Art. 9(2) GDPR", label: "Permitted processing conditions" }],
      coachLead: "Check the Art. 9 list against what systems hold — inferences included.",
      coachBody: "Special categories include health, biometrics used for identification, race and ethnicity, and more. Data that reveals them counts. Look at real fields and derived segments, not intended uses.",
      goodAnswer: "A wellness app selects health data because sleep and heart-rate metrics reveal health — even though it never asks a medical question.",
      commonMistake: "Answering from questionnaire fields alone. A 'pregnancy interest' segment derived from behaviour reveals special-category data.",
    },
    3: {
      article: "37", jurisdiction: "eu",
      fieldLabel: "Data Protection Officer — Arts. 37–39 GDPR",
      plainSummary: "A DPO must be designated where processing is carried out by a public authority or body; where the core activities consist of processing that requires regular and systematic monitoring of data subjects on a large scale; or where the core activities consist of large-scale processing of special categories of data or of criminal-conviction data (Art. 37(1)(a)–(c)). 'Core activities' are the primary activities and those inextricably part of delivering them, not purely ancillary functions; staff headcount is not a criterion.",
      relatedCitations: [
        { citation: "Art. 38 GDPR", label: "DPO position" },
        { citation: "Art. 39 GDPR", label: "DPO tasks" },
      ],
      coachLead: "Test each Art. 37(1) limb separately — public authority, large-scale monitoring, large-scale special-category processing — against your actual activities.",
      coachBody: "Ask whether the processing is a core activity (primary, or inextricably part of delivering your services) and whether it is large-scale on the EDPB factors: number of data subjects, volume and range of data, duration, geographical extent. Record what you find, including uncertainty; designation, the DPO's position and their tasks are separate facts.",
      goodAnswer: "A firm records: 'Behavioural analytics is our product (core); around 2 million EU users, continuous, EU-wide (large-scale) — Art. 37(1)(b) is met, and a DPO with an independent reporting line is designated.' The record separates the core-activity test, the scale factors and the position.",
      goodAnswerKind: "example" as const,
      commonMistake: "Selecting 'appointed' for a part-time contact without Art. 38 independence and reporting lines. A title without the position doesn't satisfy Arts. 37–39.",
    },
    4: {
      article: "32", jurisdiction: "eu",
      fieldLabel: "Security and instruction — Art. 32 GDPR",
      plainSummary: "Controllers and processors must implement appropriate technical and organisational measures to ensure security appropriate to the risk. Art. 32(4) requires steps ensuring that any natural person acting under the authority of the controller or processor who has access to personal data does not process it except on instructions from the controller; training is one way an organisation meets that duty, not the duty itself.",
      relatedCitations: [{ citation: "Art. 32(4) GDPR", label: "Instruction duty" }],
      coachLead: "Explain how staff receive and follow data-processing instructions, including relevant training.",
      coachBody: "Art. 32 tests measures appropriate to the risk. Art. 32(4) is about staff processing only on instructions; record how instructions are given and followed, and what is implemented as against planned.",
      goodAnswer: "A firm selects training-in-place: onboarding plus annual refreshers reach every data-touching role, and completion is tracked. Coverage and evidence, not a policy PDF.",
      commonMistake: "Counting a security policy as a measure. Art. 32 asks what is implemented; an unenforced document is a plan.",
    },
    5: {
      article: "28", jurisdiction: "eu",
      fieldLabel: "Processor contracts and transfers — Art. 28, Chapter V GDPR",
      plainSummary: "Processing by a processor must be governed by a binding contract containing the Art. 28(3) mandatory terms. A transfer of personal data to a third country needs a Chapter V basis: an adequacy decision (Art. 45), appropriate safeguards such as SCCs or BCRs (Art. 46), or a derogation (Art. 49). Under the UK GDPR the routes are UK adequacy regulations, the IDTA or UK Addendum, and the equivalent derogations. EU and UK routes are assessed separately.",
      relatedCitations: [
        { citation: "Art. 28(3) GDPR", label: "Mandatory processor-contract terms" },
        { citation: "Arts. 45, 46, 49 GDPR", label: "Chapter V transfer bases" },
      ],
      coachLead: "Identify the applicable Chapter V basis for each transfer.",
      coachBody: "Every processor needs an Art. 28(3) contract. For each route out of the EU/EEA or the UK, name the basis that carries it — adequacy, safeguards or a derogation — and check the vendor list against signed agreements before picking a status.",
      goodAnswer: "A company selects partial coverage: 9 of 11 vendors have DPAs, and two US transfers rely on checked DPF certifications. Counted, not assumed.",
      commonMistake: "Selecting 'covered' because the main cloud provider has a DPA. The duty is per-processor — the eleventh vendor is the finding.",
    },
  };

  const govRailOpts = !summaryStep ? (govRailConfigs[step] ?? null) : null;
  const { entry: govRailEntryBase } = useGdprRailEntry(govRailOpts);
  // GOVERNANCE UPGRADE ITEM 4 — overlay the ICO Data Protection Audit Framework
  // (Oct 2024) template guidance onto the statutorily-resolved rail entry.
  // Presentation only: the statutory text still comes from useGdprRailEntry.
  //
  // Governance master review (2026-09-15, F07) — the question in view (its
  // wrapper carries data-rail-key = payload key) selects its own entry from
  // GOVERNANCE_RAIL_BY_FIELD; the step entry is the fallback; the review step
  // has its own entry instead of an empty card.
  const govRailEntry = useMemo(() => {
    if (summaryStep) return REVIEW_RAIL_ENTRY;
    const overlay = GOVERNANCE_RAIL_BY_STEP[step];
    const fieldEntry = activeFieldRailKey ? GOVERNANCE_RAIL_BY_FIELD[activeFieldRailKey] : undefined;
    if (fieldEntry) {
      return { ...fieldEntry, templateGuidance: fieldEntry.templateGuidance ?? overlay?.templateGuidance };
    }
    if (!govRailEntryBase) return overlay ?? null;
    if (!overlay) return govRailEntryBase;
    return {
      ...govRailEntryBase,
      templateGuidance: govRailEntryBase.templateGuidance ?? overlay.templateGuidance,
    };
  }, [govRailEntryBase, step, summaryStep, activeFieldRailKey]);

  const govEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories", "breach_notification", "dpo_absence", "dpia_absence",
     "processor_contract", "international_transfer"],
    guidanceTier.tier === "paid"
  );

  // Live GDPR footprint — Governance master review (2026-09-15, F10 / F11):
  // provisional, factor-specific prompts from the facts actually recorded.
  // Headcount decides nothing; each item says what to check and why, never
  // that an obligation is established. The report's own analysis governs.
  const gdprFootprint = useMemo(() => {
    const scCore = scCoreActivity.startsWith("Yes");
    const scScale = scPopulationProportion.startsWith("Yes") || scDuration === "Continuous or ongoing" || scGeographicScope.startsWith("Several") || scGeographicScope.startsWith("Broader");
    const items: { citation: string; label: string; triggered: boolean; note?: string }[] = [
      {
        citation: "Art. 37 GDPR",
        label: "Check whether a DPO must be designated",
        triggered: gdprApplies && (sector === "Government/public sector" || (specialCategory === "Yes" && (scCore || scScale))),
        note: sector === "Government/public sector"
          ? "Art. 37(1)(a): processing by a public authority or body — the designation limb that does not depend on scale"
          : "Art. 37(1)(c): core activities consisting of large-scale special-category processing — decided on core activity and the scale factors you recorded, not on staff numbers",
      },
      {
        citation: "Art. 35 GDPR",
        label: "Check whether a DPIA is required: this depends on the processing and likely risk, not staff headcount alone.",
        triggered: gdprApplies && specialCategory === "Yes",
        note: scScale
          ? "Art. 35(3)(b) lists large-scale special-category processing as a trigger; your scale answers point that way — the report tests them"
          : "Art. 35(3)(b) lists large-scale special-category processing; your scale answers do not by themselves establish large scale — the report records what they show",
      },
      {
        citation: "Art. 33 GDPR",
        label: "Assess whether the facts trigger notification and the applicable deadline.",
        triggered: gdprApplies && incidentResponse !== "" && incidentResponse !== "Yes, tested in last 12 months",
        note: "Art. 33(1): notify the supervisory authority without undue delay and, where feasible, within 72 hours of awareness, unless the breach is unlikely to result in a risk; a processor notifies the controller (Art. 33(2))",
      },
      {
        citation: "Art. 28 GDPR",
        label: "Check that every processor is under an Art. 28(3) contract",
        triggered: gdprApplies && dpaStatus !== "" && dpaStatus !== "Yes, all vendors",
        note: dpaStatus ? `Current status: ${dpaStatus}` : undefined,
      },
      {
        citation: "Arts. 44–49 GDPR",
        label: "Identify the applicable Chapter V basis for each transfer",
        triggered: gdprApplies && transferStatus.startsWith("Yes"),
        note: isUk && isEu
          ? "EU and UK routes are assessed separately: Art. 45 adequacy / UK adequacy regulations; Art. 46 safeguards (EU SCCs; UK IDTA or Addendum); Art. 49 derogations"
          : isUk ? "UK GDPR routes: UK adequacy regulations; the IDTA or UK Addendum; the derogations"
          : "Art. 45 adequacy decision; Art. 46 appropriate safeguards (for example SCCs or BCRs); Art. 49 derogations",
      },
      {
        citation: "Art. 32(4) GDPR",
        label: "Explain how staff receive and follow data-processing instructions, including relevant training.",
        triggered: gdprApplies && (trainingStatus === "No formal training" || trainingStatus === "Ad hoc only"),
        note: "Art. 32(4): persons acting under the controller's authority process personal data only on its instructions — training is one way of meeting that, not the duty itself",
      },
    ];
    return items.filter((i) => i.triggered);
  }, [gdprApplies, sector, specialCategory, scCoreActivity, scPopulationProportion, scDuration, scGeographicScope, incidentResponse, dpaStatus, transferStatus, trainingStatus, isUk, isEu]);


  return (
    <WorkspaceLayout className="bg-paper">
      <Helmet><title>GDPR Accountability Assessment | End User Privacy</title>
        <meta name="description" content="Score your privacy programme against the GDPR framework — with cited enforcement decisions behind every risk finding and recommended action." /></Helmet>
      {refine.isRefine && refine.intake && !refine.loading ? (
        <section className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <RefinePanel
            toolType="governance_assessment"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/governance-assessment/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        </section>
      ) : (<>
      {/* PRE-INTAKE REDESIGN (2026-08-26): nav-only chip, name-led hero with
          the 4-generations support line and the standardized price/CTA block;
          the legal trigger and framework scope move into the card band; the
          disclaimer is compressed with a Legal notes disclosure. */}
      <ProductHero
        geography="gdpr"
        eyebrowLabel={<><Scale aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {productEyebrow("governance")}</>}
        title="GDPR Accountability Assessment"
        valueProposition="Review 10 GDPR accountability domains in about 10–15 minutes and receive prioritized findings backed by regulator authority."
        citationLine="GDPR Art. 5(2) · 10 governance domains · Cited enforcement decisions"
        showIntakeCta={false}
      >
        <HeroPriceCta
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber && pricing.price === pricing.subscriberPrice}
          primaryLabel="Start Accountability Assessment"
          toolSlug="governance"
          sampleSlug="governance"
        />
      </ProductHero>

      <ProductHeroSubstrip generationsLine={INCLUDED_GENERATIONS_HERO} />

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Why it matters",
            tone: "amber",
            body: "Article 5(2) requires organisations to demonstrate compliance, not merely state it. This assessment turns your governance practices into a documented accountability record.",
          },
          {
            title: "What you receive",
            body: "A 10-domain review of privacy governance, prioritized gaps, regulator-cited findings, and recommended next actions. Typical intake: 10–15 minutes.",
          },
          {
            title: "Coverage",
            body: (
              <>EU &amp; UK GDPR and GDPR-modelled regimes. For California (CCPA/CPRA), use the <a href="/cppa" className="underline text-primary">CPPA Assessment</a>.</>
            ),
          },
          {
            title: "Why trust it",
            body: "Findings are mapped to current EDPB guidance and cited enforcement decisions, so each risk conclusion has visible regulator authority behind it.",
          },
        ]}
      />

      <ToolAlsoAvailableRow currentTool="governance" />

      <section className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <CompactDisclaimer
          line="Compliance framework tool — validate findings against your records; not legal advice."
          addition="This assessment is a compliance framework tool. It identifies governance findings that should be validated against your organization's authoritative records. It does not constitute legal advice or a legal compliance opinion."
        />

        <IntakeMasthead
          kicker="GDPR Accountability · Art. 5(2)"
          stepLabel={`Step ${step} of ${totalSteps}`}
          title="GDPR Accountability Assessment"

          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter && typeof meter.lockedFields?.organization_name === "string"
              ? (meter.lockedFields!.organization_name as string)
              : undefined
          }
          meter={meter ?? null}
          preRunHint={REVISIONS_ENABLED ? "Organisation name locks after the first generation; other answers remain editable across included generations." : undefined}
        />
        <BenchLayout
          toolType="governance"
          railEntry={govRailEntry}
          defaultSourceUrl="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
        >
        <div className="flex-1 min-w-0 space-y-6">
          {/* Governance F02 (2026-09-15): the saved-draft choice is explicit
              and stays visible after typing; save status is shown. */}
          <DraftRestoreBanner
            draftFound={draftFound}
            touched={touched}
            draftUpdatedAt={draftUpdatedAt}
            draftChoice={draftChoice}
            onResume={applyRestore}
            onKeepSeparate={startNewDraft}
            onDiscard={() => { void clearDraft(); }}
            saving={draftSaving}
            lastSavedAt={draftSavedAt}
            saveError={draftSaveError}
          />
          <RequiredLegend />
          {step === 1 && (
            <>
              <h2 className="">Scope and footprint</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">GDPR Art. 3 — territorial scope · Art. 4(1) — personal data definition</p>
              <p className="text-sm text-muted-foreground">This section fixes the perimeter the report is written inside: which entity is assessed, which regimes reach it, and which systems touch personal data. Every later finding is measured against this boundary.</p>
              <div data-rail-key="organization_name" {...errAnchor("organization_name")}>
                <Label htmlFor="org">Organisation being assessed<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">The legal entity whose privacy programme this assessment evaluates — not the group, unless the group is the entity under review.</p>
                <input id="org" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Legal entity name" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
              </div>
              <div data-rail-key="sector" {...errAnchor("sector")}>
                <Label htmlFor="gov_sector">Primary sector<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">The sector of the operations being assessed. It sets the risk context the findings are weighed against.</p>
                <select id="gov_sector" value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {sector === "Other" && (
                  <div className="mt-2" {...errAnchor("sector_other")}>
                    <Label htmlFor="gov_sector_other" className="text-xs">Describe the sector<Req /></Label>
                    <Input id="gov_sector_other" value={sectorOther} onChange={(e) => setSectorOther(e.target.value)} className="mt-1" placeholder="The sector in your own words" />
                  </div>
                )}
              </div>
              <div data-rail-key="org_size" {...errAnchor("org_size")}>
                <Label htmlFor="gov_size">Number of employees<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">Headcount of the entity under assessment. It gives the report context for its remediation plan; it does not decide which legal duties apply — those follow from the processing you describe.</p>
                <select id="gov_size" value={orgSize} onChange={(e) => setOrgSize(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div data-rail-key="jurisdictions" {...errAnchor("jurisdictions")}>
                <Label id="gov_jurisdictions_label">Jurisdictions where you operate or process personal data<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3 GDPR)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">Answer from where your data subjects are, not from where you are incorporated. Art. 3(2) reaches organisations with no European establishment at all.</p>
                <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} labelledBy="gov_jurisdictions_label" /></div>
                {jurisdictions.includes("Other") && (
                  <div className="mt-2" {...errAnchor("jurisdictions_other")}>
                    <Label htmlFor="gov_jurisdictions_other" className="text-xs">Name the other jurisdiction(s)<Req /></Label>
                    <Input id="gov_jurisdictions_other" value={jurisdictionsOther} onChange={(e) => setJurisdictionsOther(e.target.value)} className="mt-1" placeholder="Country or regime" />
                  </div>
                )}
                {jurisdictions.includes("California (CCPA/CPRA)") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    California (CCPA/CPRA) obligations aren't graded here. Use the <a href="/cppa" className="underline text-primary">CPPA Assessment</a> for that scope — this selection still informs the GDPR transfer analysis.
                  </p>
                )}
              </div>
              <div data-rail-key="eu_uk_data" {...errAnchor("eu_uk_data")}>
                <Label id="gov_euuk_label">Do you process personal data of people in the EU or UK?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3 GDPR — territorial scope)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">Where the people are is one fact; whether the GDPR or UK GDPR reaches you turns on Art. 3 — an establishment in the EU/EEA or the UK, offering goods or services to people there, or monitoring their behaviour. Record the facts you know below; the GDPR-specific questions stay in scope while any of them applies.</p>
                {/* INTAKE-4f — prefill as confirmation from the jurisdictions
                    answer above. Click-gated; the stored value is unchanged. */}
                {!euUkData && (jurisdictions.includes("EU (GDPR)") || jurisdictions.includes("United Kingdom (UK GDPR)")) && (
                  <button type="button" onClick={() => setEuUkData("Yes")} className="mt-2 block text-xs underline text-primary">
                    Use my earlier answer — you selected an EU/UK jurisdiction
                  </button>
                )}
                <div className="mt-2"><Radio name="euuk" options={["Yes", "No"]} value={euUkData} onChange={(v) => setEuUkData(v as any)} labelledBy="gov_euuk_label" /></div>
                {scopeContradiction && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300" data-testid="gov-scope-contradiction">
                    You selected an EU or UK jurisdiction, or an Article 3 fact, and answered No here. The two answers conflict; the GDPR questions remain in scope until they agree.
                  </p>
                )}
                <div className="mt-3" data-rail-key="territorial_scope_basis">
                  <Label id="gov_scope_basis_label" className="text-sm">Which of these apply to your organisation? <span className="text-xs text-muted-foreground font-normal">(Art. 3 facts — select all that apply)</span></Label>
                  <p className="text-meta text-muted-foreground mt-1">"None of these" and "Unsure" are complete answers and clear the other selections.</p>
                  <div className="mt-2"><Pills options={TERRITORIAL_SCOPE_BASIS} value={territorialScopeBasis} onChange={setTerritorialScopeBasis} labelledBy="gov_scope_basis_label" exclusive={TERRITORIAL_SCOPE_EXCLUSIVE} /></div>
                </div>
              </div>

              <div data-rail-key="tools" {...errAnchor("tools")}>
                <Label id="gov_tools_label">Technology tools that process personal data<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">Select what is actually in use, including tools adopted by individual teams. Anything omitted here is outside every finding in the report.</p>
                <div className="mt-2"><Pills options={TOOLS} value={tools} onChange={setTools} labelledBy="gov_tools_label" /></div>
                <Label htmlFor="gov_other_tool" className="mt-2 block text-xs">Another tool not listed</Label>
                <Input id="gov_other_tool" placeholder="Other tool" value={otherTool} onChange={(e) => setOtherTool(e.target.value)} className="mt-1" />
              </div>
            </>

          )}

          {step === 2 && (
            <>
              <h2 className="">Data and processing profile</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 4(1) — personal data · Art. 9 — special categories · Art. 6(1) — lawful basis</p>
              <p className="text-sm text-muted-foreground">This section establishes what the programme actually holds. The record of processing in the report is built from these categories, and special categories change which duties attach.</p>
              <div data-rail-key="data_categories" {...errAnchor("data_categories")}>
                <Label id="gov_datacats_label">Categories of personal data processed<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">Include data that exists in the systems and data you derive. An enrichment segment is processing just as much as a form field.</p>
                <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} labelledBy="gov_datacats_label" /></div>
                {dataCategories.includes("Other") && (
                  <div className="mt-2" {...errAnchor("data_categories_other")}>
                    <Label htmlFor="gov_datacats_other" className="text-xs">Describe the other category<Req /></Label>
                    <Input id="gov_datacats_other" value={dataCategoriesOther} onChange={(e) => setDataCategoriesOther(e.target.value)} className="mt-1" placeholder="The category in your own words" />
                  </div>
                )}
              </div>
              <div data-rail-key="special_category" {...errAnchor("special_category")}>
                <Label id="gov_special_label">Do you process health, biometric, or other special category data?<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 GDPR)</span> <EnforcementSignalIcon signalKey="special_categories" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Data that reveals a special category counts, even where it was never asked for. Biometric data is special-category data when it is processed to uniquely identify a person. Processing needs an Art. 9(2) condition. "Unknown" is a complete answer; the report records the classification as open.</p>
                {/* INTAKE-4f — prefill as confirmation from the data-category
                    answer above. Click-gated; the stored value is unchanged.
                    Governance F17 (2026-09-15): the basis of the suggestion is
                    stated, and biometric data is qualified by its purpose. */}
                {!specialCategory && (dataCategories.includes("Health or medical data") || dataCategories.includes("Biometric data")) && (
                  <div className="mt-2 text-xs">
                    <button type="button" onClick={() => setSpecialCategory("Yes")} className="block underline text-primary">
                      Use my earlier answer — you selected health or biometric data
                    </button>
                    <p className="text-muted-foreground mt-1">Health data is special-category data. Biometric data counts only when it is used to uniquely identify individuals — if yours is not, answer No or Unknown instead.</p>
                  </div>
                )}
                <div className="mt-2"><Radio name="spec" options={SPECIAL_CATEGORY_OPTS} value={specialCategory} onChange={(v) => setSpecialCategory(v as any)} labelledBy="gov_special_label" /></div>
                {specialCategoryContradiction && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-300" data-testid="gov-special-contradiction">
                    You selected health or biometric data above and answered No here. Health data is special-category data; biometric data is when used to uniquely identify people. Check the two answers — the report records both as given.
                  </p>
                )}

                {specialCategory === "Yes" && (
                  <>
                  <div className="mt-3" data-rail-key="special_categories_list" {...errAnchor("special_categories_list")}><Label id="gov_special_list_label">Which categories?<Req /></Label><div className="mt-2"><Pills options={SPECIAL_CATS} value={specialCategoriesList} onChange={setSpecialCategoriesList} labelledBy="gov_special_list_label" /></div></div>
                  {/* DOC 258 — Art. 37(1)(c) is conjunctive: core activity AND large scale (WP243 rev.01 §§ 2.1.2–2.1.3). */}
                  <div className="mt-4" data-rail-key="sc_core_activity" {...errAnchor("sc_core_activity")}><Label id="gov_sc_core_label">Is processing this special-category data a primary activity of the organisation, or inextricably connected with delivering your principal products or services?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 37(1)(c))</span></Label>
                    <p className="text-meta text-muted-foreground mt-1">Ancillary functions — staff health records, payroll, IT support — are not core activities even in a large organisation; a health-technology service whose product is the health data is. "Uncertain" is a complete answer.</p>
                    <div className="mt-2"><Radio name="sc_core" options={SC_CORE_ACTIVITY} value={scCoreActivity} onChange={setScCoreActivity} labelledBy="gov_sc_core_label" /></div>
                    <Label htmlFor="sc_core_expl" className="mt-3 block">Briefly, what is the activity and why is it primary or ancillary?</Label>
                    <textarea id="sc_core_expl" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={scCoreActivityExplanation} onChange={(e) => setScCoreActivityExplanation(e.target.value)} />
                  </div>
                  <div className="mt-4" data-rail-key="sc_data_subjects_count"><Label htmlFor="sc_count">Approximately how many individuals' special-category data do you process in a year?</Label>
                    <Input id="sc_count" placeholder="e.g. 74,000, or 'not known'" value={scDataSubjectsCount} onChange={(e) => setScDataSubjectsCount(e.target.value)} className="mt-2" />
                  </div>
                  <div className="mt-4" data-rail-key="sc_population_proportion" {...errAnchor("sc_population_proportion")}><Label id="gov_sc_prop_label">Is that a significant proportion of the relevant population (for example, your customers, patients or the public in a region)?<Req /></Label>
                    <div className="mt-2"><Radio name="sc_prop" options={SC_POPULATION_PROPORTION} value={scPopulationProportion} onChange={setScPopulationProportion} labelledBy="gov_sc_prop_label" /></div>
                  </div>
                  <div className="mt-4" data-rail-key="sc_data_volume"><Label htmlFor="sc_volume">What volume and range of special-category data is involved?</Label>
                    <textarea id="sc_volume" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={scDataVolume} onChange={(e) => setScDataVolume(e.target.value)} placeholder="e.g. full clinical records with diagnoses and prescriptions; or a single vaccination status flag" />
                  </div>
                  <div className="mt-4" data-rail-key="sc_duration" {...errAnchor("sc_duration")}><Label id="gov_sc_dur_label">How long does the processing run?<Req /></Label>
                    <div className="mt-2"><Radio name="sc_dur" options={SC_DURATION} value={scDuration} onChange={setScDuration} labelledBy="gov_sc_dur_label" /></div>
                  </div>
                  <div className="mt-4" data-rail-key="sc_geographic_scope" {...errAnchor("sc_geographic_scope")}><Label id="gov_sc_geo_label">What is the geographical scope of the processing?<Req /></Label>
                    <div className="mt-2"><Radio name="sc_geo" options={SC_GEOGRAPHIC_SCOPE} value={scGeographicScope} onChange={setScGeographicScope} labelledBy="gov_sc_geo_label" /></div>
                  </div>
                  </>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="">Governance infrastructure</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 24 — controller responsibility · Art. 37 — DPO designation</p>
              <p className="text-sm text-muted-foreground">This section establishes whether the accountability machinery exists: transparency, a designated owner, impact assessment, breach response, rights fulfilment, and an inventory. These become the report's core accountability findings.</p>
              <div data-rail-key="privacy_policy" {...errAnchor("privacy_policy")}><Label id="gov_pp_label">Documented privacy policy or notice<Req /> <DefPopover termKey="gdpr_transparency" /></Label>
                <p className="text-meta text-muted-foreground mt-1">A published notice that reflects current processing. This assessment treats a notice not reviewed in the last 12 months as due for review; that is a product criterion for the finding, not a legal expiry rule.</p>
                <div className="mt-2"><Radio name="pp" options={["Yes, current (reviewed in last 12 months)", "Yes, but outdated", "No"]} value={privacyPolicy} onChange={setPrivacyPolicy} labelledBy="gov_pp_label" /></div></div>
              {privacyPolicy.startsWith("Yes") && (
                <div data-rail-key="privacy_notice_coverage" {...errAnchor("privacy_notice_coverage")}><Label id="gov_pncov_label">Does your published notice describe all current processing, recipients, international transfers, retention periods, and rights?<Req /> <DefPopover termKey="gdpr_transparency" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 13–14 GDPR)</span></Label>
                  <p className="text-meta text-muted-foreground mt-1">Arts. 13–14 list each element separately; Art. 13 applies when you collect from the person, Art. 14 (with its own timing in Art. 14(3)) when you obtain the data elsewhere. A notice missing one element is incomplete even where the rest is accurate.</p>
                  <div className="mt-2"><Radio name="pncov" options={["Yes — notice covers all current activities, transfers, retention, and rights", "Partially — some activities or tools not yet reflected", "No — notice not updated for current tools", "Unsure"]} value={privacyNoticeCoverage} onChange={setPrivacyNoticeCoverage} labelledBy="gov_pncov_label" /></div></div>
              )}

              {showDpoQ && (<div data-rail-key="dpo_status" {...errAnchor("dpo_status")}><Label id="gov_dpo_label">Is a data protection officer or equivalent designated?<Req /> <DefPopover termKey="gdpr_dpo" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 37–39 GDPR)</span> <EnforcementSignalIcon signalKey="dpo_absence" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Whether designation is mandatory turns on Art. 37(1): a public authority, or core activities of large-scale monitoring or large-scale special-category processing — not on headcount. Arts. 38–39 test the position, not the title: reporting line, resourcing, and freedom from conflicting duties.</p>
                <div className="mt-2"><Radio name="dpo" options={["Yes, formal DPO", "Yes, informal privacy lead", "No"]} value={dpoStatus} onChange={setDpoStatus} labelledBy="gov_dpo_label" /></div></div>)}
              <div data-rail-key="dpia_status" {...errAnchor("dpia_status")}><Label id="gov_dpia_label">Has any data protection impact assessment been conducted?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 35 GDPR)</span> <EnforcementSignalIcon signalKey="dpia_absence" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Count completed assessments, not planned ones. Art. 35 requires the assessment before the processing begins.</p>
                <div className="mt-2"><Radio name="dpia" options={["Yes, multiple DPIAs completed", "Yes, one DPIA completed", "No, none conducted", "Unsure"]} value={dpiaStatus} onChange={setDpiaStatus} labelledBy="gov_dpia_label" /></div></div>
              {dpiaStatus.startsWith("Yes") && (
                <div data-rail-key="dpia_ai_coverage" {...errAnchor("dpia_ai_coverage")}><Label id="gov_dpia_ai_label">Do those assessments cover your current AI and high-risk tools?<Req /> <DefPopover termKey="gdpr_dpia" /> <span className="text-xs text-muted-foreground font-mono">(Art. 35 GDPR)</span> <EnforcementSignalIcon signalKey="dpia_absence" signals={govEnforcementSignals} /></Label>
                  <p className="text-meta text-muted-foreground mt-1">Check each assessment's scope and version against the tool as deployed. An assessment written before a tool was adopted can still cover it if the processing it describes has not materially changed; a material change calls for a review (Art. 35(11)).</p>
                  <div className="mt-2"><Radio name="dpia_ai" options={["Yes — all AI/high-risk tools assessed", "Some covered", "No — not for AI tools", "Unsure"]} value={dpiaAiCoverage} onChange={setDpiaAiCoverage} labelledBy="gov_dpia_ai_label" /></div></div>
              )}
              <div data-rail-key="incident_response" {...errAnchor("incident_response")}><Label id="gov_ir_label">Incident response plan covering personal data breaches<Req /> <DefPopover termKey="gdpr_breach_notification" /> <span className="text-xs text-muted-foreground font-mono">(Art. 33 GDPR)</span> <EnforcementSignalIcon signalKey="breach_notification" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Art. 33(1) requires notification to the supervisory authority without undue delay and, where feasible, within 72 hours of awareness, unless the breach is unlikely to result in a risk to people. An untested plan and a tested plan answer different questions about whether that clock can be met.</p>
                <div className="mt-2"><Radio name="ir" options={["Yes, tested in last 12 months", "Yes, but not tested", "Documented but informal", "No"]} value={incidentResponse} onChange={setIncidentResponse} labelledBy="gov_ir_label" /></div></div>
              <div data-rail-key="dsr_capability" {...errAnchor("dsr_capability")}><Label id="gov_dsr_label">If someone asked for their data, could you find it, hand it over, or delete it — including data your vendors hold?<Req /> <DefPopover termKey="gdpr_data_subject_rights" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 12, 15–22 GDPR)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">This covers access, deletion, a copy to take elsewhere, correction, restriction and objection. It includes data sitting with your suppliers and cloud tools. Answer on what you have actually done, not on what the procedure says.</p>

                <div className="mt-2"><Radio name="dsr" options={["Yes — documented and tested across all vendors", "Documented but not tested", "Ad hoc / not documented", "No process in place", "Unsure"]} value={dsrCapability} onChange={setDsrCapability} labelledBy="gov_dsr_label" /></div>
                {dsrTested && (
                  <div className="mt-3" data-rail-key="dsr_rights_tested" {...errAnchor("dsr_rights_tested")}><Label id="gov_dsr_rights_label">Which rights have you tested end-to-end?<Req /></Label>
                    <p className="text-meta text-muted-foreground mt-1">Select only the rights you have actually exercised through the process; the report reconciles this list with the tested claim above.</p>
                    <div className="mt-2"><Pills options={DSR_RIGHTS_OPTS} value={dsrRightsTested} onChange={setDsrRightsTested} labelledBy="gov_dsr_rights_label" /></div></div>
                )}
              </div>
              <div data-rail-key="inventory_audit" {...errAnchor("inventory_audit")}><Label id="gov_inv_label">Is your tool and processing inventory audited for unauthorised tools, with an approval route for new ones?<Req /> <DefPopover termKey="gdpr_accountability" /> <span className="text-xs text-muted-foreground font-mono">(Art. 24 GDPR)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">Two separate facts: whether the inventory is checked against reality, and whether adopting a new tool passes through a gate. Choose the answer that matches your position on both.</p>
                <div className="mt-2"><Radio name="inv" options={INVENTORY_AUDIT_OPTS} value={inventoryAudit} onChange={setInventoryAudit} labelledBy="gov_inv_label" /></div></div>
              {/* DOC 162 (2026-09-03) — Art. 30(1)(f). The record of processing must state, where possible,
                  the envisaged time limits for erasure of each category of data; the assessment's Art. 30
                  element walk reads this answer, and until now nothing on the form supplied it. */}
              <div data-rail-key="retention_schedule_status" {...errAnchor("retention_schedule_status")}><Label id="gov_retention_label">Are retention periods documented for each category of personal data?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 30(1)(f) GDPR)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">Article 30(1)(f) asks the record of processing to state, where possible, the envisaged time limit for erasing each category of data. Your assessment reads this answer for that element: documented periods evidence it, partial documentation leaves it open for the categories without a period, and none leaves the element unmet.</p>
                <div className="mt-2"><Radio name="retention" options={["Yes — retention periods documented for each category of data", "Partially — documented for some categories only", "No — no documented retention periods", "Unsure"]} value={retentionScheduleStatus} onChange={setRetentionScheduleStatus} labelledBy="gov_retention_label" /></div></div>

            </>
          )}

          {step === 4 && (
            <>
              <h2 className="">Measures, training and remediation</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 32 — security of processing · Art. 32(4) — instruction duty</p>
              <p className="text-sm text-muted-foreground">This section establishes what is actually running — the measures, who they reach, and how they are kept current. It also sets the defaults the report applies to every remediation action it generates.</p>
              <div data-rail-key="training_status" {...errAnchor("training_status")}><Label id="gov_train_label">Privacy and data protection training<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">Answer on coverage and cadence together: who receives it, and how often. Art. 32(4) requires staff to process personal data only on the controller's instructions; training is one way an organisation meets that duty. Explain how staff receive and follow data-processing instructions, including relevant training.</p>
                <div className="mt-2"><Radio name="train" options={["Yes, formal onboarding + annual refresh", "Yes, onboarding only", "Ad hoc only", "No formal training"]} value={trainingStatus} onChange={setTrainingStatus} labelledBy="gov_train_label" /></div></div>
              {trainingStatus.startsWith("Yes") && (
                <div data-rail-key="training_ai_coverage" {...errAnchor("training_ai_coverage")}><Label id="gov_train_ai_label">Does training cover prohibited use of AI tools and data-submission risk?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 32(4) GDPR)</span></Label>
                  <p className="text-meta text-muted-foreground mt-1">General data-handling training and tool-specific training are different things. Answer on what the material actually names; "Unsure" is a complete answer.</p>
                  <div className="mt-2"><Radio name="train_ai" options={["Yes — explicitly covers AI tools", "Generally covers data handling", "No — not AI-specific", "Unsure"]} value={trainingAiCoverage} onChange={setTrainingAiCoverage} labelledBy="gov_train_ai_label" /></div></div>
              )}
              <div data-rail-key="tool_instruction" {...errAnchor("tool_instruction")}><Label id="gov_ti_label">Instruction on what data may and may not be submitted to external technology tools<Req /></Label>
                <p className="text-meta text-muted-foreground mt-1">A written prohibition and verbal guidance evidence differently. Answer on what a reviewer could be shown.</p>
                <div className="mt-2"><Radio name="ti" options={["Yes, written policy with specific prohibitions", "Verbal guidance only", "No instruction provided"]} value={toolInstruction} onChange={setToolInstruction} labelledBy="gov_ti_label" /></div></div>
              <div data-rail-key="technical_controls" {...errAnchor("technical_controls")}><Label id="gov_tc_label">Do technical controls, not only policy, stop prohibited personal data reaching your AI and cloud tools?<Req /> <DefPopover termKey="gdpr_security_measures" /> <span className="text-xs text-muted-foreground font-mono">(Art. 32(1) GDPR)</span></Label>
                <p className="text-meta text-muted-foreground mt-1">Art. 32 asks for technical and organisational measures appropriate to the risk, and tests what is implemented. A policy is an organisational measure; this question asks separately whether a technical restriction also exists, and distinguishes implemented from planned controls.</p>
                <div className="mt-2"><Radio name="tc" options={["Yes — DLP/content filtering actively enforced", "Partial — some tools or categories", "No — policy and training only", "Unsure"]} value={technicalControls} onChange={setTechnicalControls} labelledBy="gov_tc_label" /></div>
                {(technicalControls === "Yes — DLP/content filtering actively enforced" || technicalControls.startsWith("Partial")) && (
                  <div className="mt-3" data-rail-key="technical_controls_list"><Label id="gov_tc_list_label">Which controls are in place?</Label><div className="mt-2"><Pills options={["DLP rules","Content filtering","Endpoint upload restrictions","Prompt-injection detection","Approval workflow"]} value={technicalControlsList} onChange={setTechnicalControlsList} labelledBy="gov_tc_list_label" /></div></div>
                )}
              </div>
              {/* ITEM 313 — Art. 24(1): risk-calibration factors + the review-and-update sentence. */}
              <div className="pt-2 border-t space-y-4">
                <p className="text-sm text-muted-foreground">Art. 24(1) calibrates the measures against the nature, scope, context and purposes of the processing, and requires them to be reviewed and updated. The four descriptions below are what the report calibrates its findings against; left blank, it records that the calibration factors were not stated.</p>
                <div data-rail-key="measures_review_cadence">
                  <Label id="gov_cadence_label">How often is the set of technical and organisational measures reviewed? <span className="text-xs text-muted-foreground font-mono">(Art. 24(1) GDPR — "Those measures shall be reviewed and updated where necessary")</span></Label>
                  <p className="text-meta text-muted-foreground mt-1">A defined cadence and a review that happens on change are different answers. Choose the one the organisation actually operates.</p>
                  <div className="mt-2"><Radio name="review_cadence" options={["Annually or more often", "Every 1–2 years", "Less often than every 2 years", "On material change only", "No defined cadence", "Unsure"]} value={measuresReviewCadence} onChange={setMeasuresReviewCadence} labelledBy="gov_cadence_label" /></div>
                </div>
                <div data-rail-key="measures_last_review_date">
                  <Label htmlFor="measures_last_review_date">Date the measures were last reviewed</Label>
                  <p className="text-meta text-muted-foreground mt-1">Optional. Left blank, the report cannot test currency and says the review date was not recorded.</p>
                  <Input id="measures_last_review_date" type="date" className="mt-2" value={measuresLastReviewDate} onChange={(e) => setMeasuresLastReviewDate(e.target.value)} />
                </div>
                <div data-rail-key="processing_nature">
                  <Label htmlFor="processing_nature">Nature of the processing <span className="text-xs text-muted-foreground font-mono">(Art. 24(1) GDPR)</span></Label>
                  <p className="text-xs text-muted-foreground mt-1">What is done to the data — collection, profiling, monitoring, automated decisions, disclosure. State each operation separately rather than as one summary.</p>
                  <textarea id="processing_nature" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={processingNature} onChange={(e) => setProcessingNature(e.target.value)} placeholder="Two or three sentences" />
                </div>
                <div data-rail-key="processing_scope">
                  <Label htmlFor="processing_scope">Scope of the processing</Label>
                  <p className="text-xs text-muted-foreground mt-1">How much, how many data subjects, how often, over what geography and retention period. Numbers make the scope testable; adjectives do not.</p>
                  <textarea id="processing_scope" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={processingScope} onChange={(e) => setProcessingScope(e.target.value)} placeholder="Two or three sentences" />
                </div>
                <div data-rail-key="processing_context">
                  <Label htmlFor="processing_context">Context of the processing</Label>
                  <p className="text-xs text-muted-foreground mt-1">The relationship with the data subjects, what they expect, any imbalance of power, any vulnerability. Employees and anonymous visitors sit in different contexts.</p>
                  <textarea id="processing_context" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={processingContext} onChange={(e) => setProcessingContext(e.target.value)} placeholder="Two or three sentences" />
                </div>
                <div data-rail-key="processing_purposes">
                  <Label htmlFor="processing_purposes">Purposes of the processing</Label>
                  <p className="text-xs text-muted-foreground mt-1">Why the data is processed, stated specifically enough to test necessity against. "Business purposes" cannot be tested; a named purpose can.</p>
                  <textarea id="processing_purposes" className="mt-2 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={processingPurposes} onChange={(e) => setProcessingPurposes(e.target.value)} placeholder="Two or three sentences" />
                </div>
              </div>
              {/* GOVERNANCE UPGRADE — remediation defaults. Applied to every
                  adverse finding unless a finding-specific entry overrides them.
                  Left blank, the report says so rather than inventing a plan. */}
              <div className="pt-2 border-t space-y-4">
                <p className="text-sm text-muted-foreground">These four defaults are applied to every adverse finding in the remediation plan. Left blank, the report records that no default owner, date, priority or validation method was supplied in this assessment, and leaves those fields for you to complete, rather than inventing a plan.</p>
                <div data-rail-key="remediation_default_owner">
                  <Label htmlFor="remediation_default_owner">Who is accountable for remediation?</Label>
                  <p className="text-xs text-muted-foreground mt-1">A single standing role a reviewer can locate months later. Applied to each adverse finding unless one carries its own owner.</p>
                  <Input id="remediation_default_owner" className="mt-2" value={remediationOwner} onChange={(e) => setRemediationOwner(e.target.value)} placeholder="Role or name" />
                </div>
                <div data-rail-key="remediation_default_target_date">
                  <Label htmlFor="remediation_default_target_date">Default target date for remediation</Label>
                  <p className="text-xs text-muted-foreground mt-1">A real calendar date, ideally aligned to an existing planning cycle. Left blank, actions carry no review horizon.</p>
                  <Input id="remediation_default_target_date" type="date" className="mt-2" value={remediationTargetDate} onChange={(e) => setRemediationTargetDate(e.target.value)} />
                </div>
                <div data-rail-key="remediation_default_priority">
                  <Label id="gov_rem_priority_label">Default remediation priority</Label>
                  <p className="text-xs text-muted-foreground mt-1">A sequencing label for your own plan, not a statutory severity. Individual findings can be raised above the default.</p>
                  <div className="mt-2"><Radio name="rem_priority" options={["Critical — remediate now", "High — remediate this quarter", "Medium — remediate this year", "Low — monitor"]} value={remediationPriority} onChange={setRemediationPriority} labelledBy="gov_rem_priority_label" /></div>
                </div>
                <div data-rail-key="remediation_default_validation_method">
                  <Label id="gov_rem_validation_label">How will remediation be validated?</Label>
                  <p className="text-xs text-muted-foreground mt-1">The method names how completion will be evidenced; record the artefact and the reviewer in additional context if you want them carried into the plan. Left blank, the report records that no validation method was supplied.</p>
                  <div className="mt-2"><Radio name="rem_validation" options={["Documentary evidence review", "Control re-test by a second reviewer", "Internal audit sample", "External audit or assurance report", "Management sign-off against the artifact"]} value={remediationValidationMethod} onChange={setRemediationValidationMethod} labelledBy="gov_rem_validation_label" /></div>
                </div>
              </div>

            </>

          )}

          {step === 5 && showStep5 && (
            <>
              <h2 className="">Processors and international transfers</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 28 — processor contracts · Arts. 44–49 — international transfers (Chapter V)</p>
              <p className="text-sm text-muted-foreground">This section records your position across your supply chain. Each processor and each transfer route carries its own duty. The report works from the answers you give here: it can count vendors and routes only where you identify them, so use the optional detail fields to name what the aggregate answers leave out.</p>
              <div data-rail-key="dpa_status" {...errAnchor("dpa_status")}><Label id="gov_dpa_label">Data processing agreements signed with relevant vendors<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR)</span> <EnforcementSignalIcon signalKey="processor_contract" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Answer from a counted vendor list. The duty attaches per processor, so the uncovered vendor is the finding.</p>
                <div className="mt-2"><Radio name="dpa" options={["Yes, all vendors", "Most vendors", "Some vendors", "No"]} value={dpaStatus} onChange={setDpaStatus} labelledBy="gov_dpa_label" /></div>
                {dpaStatus && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div data-rail-key="processor_count">
                      <Label htmlFor="gov_processor_count" className="text-xs">How many processors are in scope? <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input id="gov_processor_count" value={processorCount} onChange={(e) => setProcessorCount(e.target.value)} className="mt-1" placeholder="A number, or 'not counted'" />
                    </div>
                    {dpaStatus !== "Yes, all vendors" && (
                      <div data-rail-key="uncovered_vendors">
                        <Label htmlFor="gov_uncovered_vendors" className="text-xs">Which vendors have no signed agreement? <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <textarea id="gov_uncovered_vendors" className="mt-1 w-full min-h-10 px-3 py-2 rounded-md border border-input bg-background text-sm" value={uncoveredVendors} onChange={(e) => setUncoveredVendors(e.target.value)} placeholder="One vendor per line" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {dpaVerifyShown && (
                <div data-rail-key="dpa_art28_verified" {...errAnchor("dpa_art28_verified")}><Label id="gov_dpa28_label">Have those agreements been verified against the Art. 28(3) mandatory clauses?<Req /> <DefPopover termKey="gdpr_processor_contract" /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR)</span> <EnforcementSignalIcon signalKey="processor_contract" signals={govEnforcementSignals} /></Label>
                  <p className="text-meta text-muted-foreground mt-1">Art. 28(3) lists the terms every processor contract must contain. A signed vendor template is not verification until someone has read it against that list; answer for the agreements you have, however many.</p>
                  <div className="mt-2"><Radio name="dpa28" options={["Yes — verified", "Partially", "Not verified", "Unsure"]} value={dpaArt28Verified} onChange={setDpaArt28Verified} labelledBy="gov_dpa28_label" /></div></div>
              )}
              <div data-rail-key="transfer_status" {...errAnchor("transfer_status")}><Label id="gov_xfer_label">Cross-border transfers outside the EU or UK<Req /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–49 GDPR)</span> <EnforcementSignalIcon signalKey="international_transfer" signals={govEnforcementSignals} /></Label>
                <p className="text-meta text-muted-foreground mt-1">Remote support access and cloud backups are transfers too, not only where data is primarily stored. "All tools store data in EU/UK" is only accurate if remote access from outside the EU/UK does not occur either.</p>
                <div className="mt-2"><Radio name="xfer" options={TRANSFER_STATUS_OPTS} value={transferStatus} onChange={setTransferStatus} labelledBy="gov_xfer_label" /></div>
                {transferStatus.startsWith("Yes") && (
                  <div className="mt-3" data-rail-key="transfer_routes">
                    <Label htmlFor="gov_transfer_routes" className="text-xs">Describe the routes: which vendors or group companies, to which countries, by which mechanism <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <textarea id="gov_transfer_routes" className="mt-1 w-full min-h-16 px-3 py-2 rounded-md border border-input bg-background text-sm" value={transferRoutes} onChange={(e) => setTransferRoutes(e.target.value)} placeholder="One route per line" />
                  </div>
                )}
              </div>
              {transferMechShown && (
                <div data-rail-key="transfer_mechanism" {...errAnchor("transfer_mechanism")}><Label id="gov_xfermech_label">Which Chapter V basis carries those transfers?<Req /> <DefPopover termKey="gdpr_international_transfer" /> <span className="text-xs text-muted-foreground font-mono">{transferMechCite}</span> <EnforcementSignalIcon signalKey="international_transfer" signals={govEnforcementSignals} /></Label>
                  <p className="text-meta text-muted-foreground mt-1">Identify the applicable Chapter V basis for each transfer. Where routes rely on different bases, choose the one covering most of them and describe the others in the routes box above; "None" is a complete answer the report records as a gap.</p>
                  <div className="mt-2"><Radio name="xfermech" options={transferMechOptions} value={transferMechanism} onChange={setTransferMechanism} labelledBy="gov_xfermech_label" /></div></div>
              )}
            </>
          )}


          {/* R1a: optional catch-all rendered on the final input step (before the summary). */}
          {!summaryStep && step === totalSteps - 1 && (
            <div className="pt-2 border-t" data-rail-key="additional_context">
              <Label htmlFor="additional_context">Anything material to your privacy programme not captured above <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <p className="text-xs text-muted-foreground mt-1">Free text the generator weighs alongside your answers. The things that change a finding are usually in motion rather than settled: a re-organisation affecting the reporting line of the person accountable for data protection, a sub-processor shortfall already under review, correspondence from a regulator. Left blank, the report works from the answers above only.</p>
              <textarea
                id="additional_context"
                className="mt-2 w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="A few sentences"
              />

            </div>
          )}

          {summaryStep && (
            <>
              <div>
                <h2 className="">Review your answers</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Every answer on your current path is listed below, including optional details and anything you marked unknown. Use Edit beside a section or a row to change it. An unanswered item is recorded as not supplied — not as "no" or "not applicable".
                </p>
              </div>
              {/* Governance F04 (2026-09-15) — built from the same payload the page submits. */}
              {unresolvedRows.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-3 text-[12px]" data-testid="gov-review-unresolved">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Not supplied on your current path ({unresolvedRows.length})</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {unresolvedRows.map((r) => (
                      <li key={r.key}>{r.label} — <button type="button" className="underline" onClick={() => jumpToStep(REVIEW_SECTION_STEP[reviewSections.find((s) => s.rows.includes(r))?.id ?? "scope"] ?? 1, r.key)}>Edit</button></li>
                    ))}
                  </ul>
                </div>
              )}
              {reviewSections.map((sec) => (
                <section key={sec.id} className="rounded-lg border bg-card text-sm" aria-labelledby={`gov-review-${sec.id}`}>
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
                    <h3 id={`gov-review-${sec.id}`} className="font-medium text-[13px]">{sec.title}</h3>
                    <Button type="button" size="sm" variant="ghost" onClick={() => jumpToStep(REVIEW_SECTION_STEP[sec.id] ?? 1, sec.rows[0]?.key ?? "")}>Edit section</Button>
                  </div>
                  <div className="divide-y">
                    {sec.rows.filter((r) => r.state !== "inactive").map((r) => (
                      <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 px-4 py-2" data-review-key={r.key} data-review-state={r.state}>
                        <div className="text-muted-foreground text-[12px]">{r.label}</div>
                        <div className={`break-words text-[13px] ${r.state === "unanswered" ? "italic text-muted-foreground" : ""}`}>{r.state === "unanswered" ? "Not supplied" : r.text}</div>
                        <div><button type="button" className="text-[12px] underline text-muted-foreground" onClick={() => jumpToStep(REVIEW_SECTION_STEP[sec.id] ?? 1, r.key)} aria-label={`Edit ${r.label}`}>Edit</button></div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-sm rounded">
                This is a compliance framework tool, not legal advice. Findings should be validated against your organization's authoritative records before operational reliance.
              </div>
            </>
          )}

          {step > 1 && !summaryStep && gdprFootprint.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> GDPR points to check, from your answers so far
              </p>
              <p className="text-[11px] text-muted-foreground">Provisional prompts drawn from the facts recorded above. None of them is a determination; the report's analysis governs.</p>
              {gdprFootprint.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 shrink-0">▸</span>
                  <div className="text-xs">
                    <span className="font-mono text-blue-700 dark:text-blue-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    {item.note && <span className="text-muted-foreground ml-1">— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ValidationErrorSummary message={validationError} fieldKey={fieldErrors.fields[0] ?? null} className="mt-4" />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>

            {!summaryStep ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button onClick={handlePurchase} disabled={purchasing || (pricing.price > 0 && !pricing.stripeConfigured)}>
                {pricing.price === 0
                  ? purchasing
                    ? "Generating…"
                    : "Generate GDPR Accountability Assessment (included)"
                  : !pricing.stripeConfigured
                    ? `Payments Coming Soon ($${pricing.price})`
                    : purchasing
                      ? "Opening checkout…"
                      : `Purchase GDPR Accountability Assessment ($${pricing.price})`}
              </Button>
            )}
          </div>
        </div>
        </BenchLayout>



        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/governance-assessment" {...intakeGate("governance")} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="governance_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={checkoutIntake ?? intakeForCheckout}
          onClose={() => { setCheckoutOpen(false); setPurchasing(false); }}
          onComplete={(id, _suiteCyberId, status) => {
            setCheckoutOpen(false);
            setPurchasing(false);
            if (!id) return;
            // Governance F13 (2026-09-15): a pending verification keeps the
            // draft and does not mark the result as purchased.
            if (status === "pending") { navigate(`/governance-assessment/result/${id}?purchase=pending`); return; }
            void clearDraft();
            navigate(`/governance-assessment/result/${id}?purchased=true`);
          }}
        />
        {/* Governance F03 / F19 (2026-09-15): before the review step the
            panel continues the intake (through the same all-step guard);
            purchase is offered on the review step only. */}
        <ToolSamplePreview
          toolType="healthcheck"
          toolName="GDPR Accountability Assessment"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={summaryStep ? handlePurchase : () => { if (gate()) setStep(totalSteps); }}
          purchasing={purchasing}
          ctaLabel={summaryStep ? undefined : "Continue your assessment"}
          ctaHelper={summaryStep ? undefined : "Complete the remaining steps and review your answers; the purchase option appears on the review step."}
        />
      </section>
      </>)}
    </WorkspaceLayout>
  );
};

export default GovernanceAssessment;
