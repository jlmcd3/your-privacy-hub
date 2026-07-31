
import { useState, useMemo, useEffect } from "react";
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
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import StatuteRail from "@/components/intake/StatuteRail";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";

import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";
import { Scale, Zap } from 'lucide-react';

// Price tiers managed by useToolPrice hook (subscriber-aware)

const SECTORS = ["Technology/SaaS", "Healthcare/Life Sciences", "Financial services", "Retail/ecommerce", "Media/advertising", "Professional services", "Education", "Government/public sector", "Legal services", "Manufacturing", "Other"];
const SIZES = ["1-10", "11-50", "51-250", "251-1000", "1001+"];
const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Japan", "Other"];
const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
const SPECIAL_CATS = ["Health data", "Biometric data", "Genetic data", "Racial/ethnic origin", "Political opinions", "Religious beliefs", "Trade union membership", "Sexual orientation"];

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
      <label key={o} className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} value={o} checked={value === o} onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm">{o}</span>
      </label>
    ))}
  </div>
);

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

  // Step 2
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [specialCategory, setSpecialCategory] = useState<"" | "Yes" | "No">("");
  const [specialCategoriesList, setSpecialCategoriesList] = useState<string[]>([]);

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

  // New (intake redesign)
  const [technicalControls, setTechnicalControls] = useState("");
  const [technicalControlsList, setTechnicalControlsList] = useState<string[]>([]);
  const [dsrCapability, setDsrCapability] = useState("");
  const [dsrRightsTested, setDsrRightsTested] = useState<string[]>([]);
  const [inventoryAudit, setInventoryAudit] = useState("");
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


  const orgSizeNum = useMemo(() => {
    if (orgSize === "1-10" || orgSize === "11-50") return "small";
    return "large";
  }, [orgSize]);

  const showDpoQ = euUkData === "Yes" || orgSizeNum === "large";
  const showStep5 = euUkData === "Yes";
  const isUk = jurisdictions.includes("United Kingdom (UK GDPR)");
  const isEu = jurisdictions.includes("EU (GDPR)");
  const transferMechOptions =
    isUk && !isEu ? ["UK IDTA", "UK Addendum to EU SCCs", "UK adequacy regulations", "None"]
    : isEu && !isUk ? ["EU Standard Contractual Clauses (SCCs)", "Binding Corporate Rules", "Adequacy decision", "None"]
    : ["UK IDTA / Addendum", "EU SCCs", "Binding Corporate Rules", "Adequacy decision/regulations", "None"];
  const transferMechCite = isUk && !isEu ? "(UK IDTA / Addendum · s.119A DPA 2018)" : "(Art. 46 GDPR — SCCs/IDTA)";
  const totalSteps = showStep5 ? 6 : 5; // 5 sections + summary

  const stepValid = (): string | null => {
    if (step === 1) {
      if (!organizationName.trim()) return "Tell us the name of the organisation being assessed.";
      if (!sector || !orgSize || !jurisdictions.length || !euUkData || (!tools.length && !otherTool.trim()))
        return "Please answer all gateway questions.";
    }
    if (step === 2) {
      if (!dataCategories.length || !specialCategory) return "Please complete the data profile.";
      if (specialCategory === "Yes" && !specialCategoriesList.length) return "Select which special categories apply.";
    }
    if (step === 3) {
      if (!privacyPolicy || !dpiaStatus || !incidentResponse) return "Please complete all required questions.";
      if (showDpoQ && !dpoStatus) return "Please answer the DPO question.";
      if (!dsrCapability) return "Please answer the data subject rights question (Q12).";
      if (!inventoryAudit) return "Please answer the inventory / shadow-tool audit question (Q13).";
      if (dpiaStatus.startsWith("Yes") && !dpiaAiCoverage) return "Please answer the DPIA AI-coverage follow-up (Q10a).";
      if (privacyPolicy.startsWith("Yes") && !privacyNoticeCoverage) return "Please answer the privacy-notice coverage follow-up (Q8a).";
    }
    if (step === 4) {
      if (!trainingStatus || !toolInstruction) return "Please complete training questions.";
      if (!technicalControls) return "Please answer the technical controls question (Q16).";
      if (trainingStatus.startsWith("Yes") && !trainingAiCoverage) return "Please answer the training AI-coverage follow-up (Q14a).";
    }
    if (step === 5 && showStep5) {
      if (!dpaStatus || !transferStatus) return "Please complete transfer questions.";
      if ((dpaStatus === "Yes, all vendors" || dpaStatus === "Most vendors") && !dpaArt28Verified)
        return "Please answer the Art. 28(3) verification follow-up (Q17a).";
      if ((transferStatus === "Yes, US-based tools" || transferStatus === "Yes, other non-adequate countries") && !transferMechanism)
        return "Please answer the transfer-mechanism follow-up (Q18a).";
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


  const buildIntake = () => ({
    organization_name: organizationName,
    sector, org_size: orgSize, jurisdictions, eu_uk_data: euUkData,
    tools: otherTool.trim() ? [...tools, `Other: ${otherTool.trim()}`] : tools,
    data_categories: dataCategories,
    special_category: specialCategory, special_categories_list: specialCategoriesList,
    privacy_policy: privacyPolicy,
    privacy_notice_coverage: privacyPolicy.startsWith("Yes") ? privacyNoticeCoverage : "n/a",
    
    dpo_status: showDpoQ ? dpoStatus : "n/a",
    dpia_status: dpiaStatus, incident_response: incidentResponse,
    training_status: trainingStatus, tool_instruction: toolInstruction,
    dpa_status: showStep5 ? dpaStatus : "n/a",
    transfer_status: showStep5 ? transferStatus : "n/a",
    technical_controls: technicalControls,
    technical_controls_list: (technicalControls === "Yes — DLP/content filtering actively enforced" || technicalControls.startsWith("Partial")) ? technicalControlsList : [],
    dsr_capability: dsrCapability,
    dsr_rights_tested: dsrCapability === "Yes — documented and tested across all vendors" ? dsrRightsTested : [],
    inventory_audit: inventoryAudit,
    dpia_ai_coverage: dpiaStatus.startsWith("Yes") ? dpiaAiCoverage : "n/a",
    training_ai_coverage: trainingStatus.startsWith("Yes") ? trainingAiCoverage : "n/a",
    dpa_art28_verified: (showStep5 && (dpaStatus === "Yes, all vendors" || dpaStatus === "Most vendors")) ? dpaArt28Verified : "n/a",
    transfer_mechanism: (showStep5 && (transferStatus === "Yes, US-based tools" || transferStatus === "Yes, other non-adequate countries")) ? transferMechanism : "n/a",
    additional_context: additionalContext,
    // ITEM 313 — Art. 24(1) review + risk-calibration factors.
    measures_review_cadence: measuresReviewCadence,
    measures_last_review_date: measuresLastReviewDate,
    processing_nature: processingNature,
    processing_scope: processingScope,
    processing_context: processingContext,
    processing_purposes: processingPurposes,

  });

  const handlePurchase = async () => {
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
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { error: fnErr } = await supabase.functions.invoke(
        "run-governance-assessment",
        { body: { assessment_id: row.id } }
      );
      setPurchasing(false);
      if (fnErr) {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      void clearDraft();
      navigate(`/governance-assessment/result/${row.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured. Please check back soon.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  const intakeForCheckout = useMemo(() => buildIntake(), [
    organizationName, sector, orgSize, jurisdictions, euUkData, tools, otherTool, dataCategories,
    specialCategory, specialCategoriesList, privacyPolicy,
    dpoStatus, dpiaStatus, incidentResponse, trainingStatus, toolInstruction,
    dpaStatus, transferStatus, showDpoQ, showStep5,
    technicalControls, technicalControlsList, dsrCapability, dsrRightsTested,
    inventoryAudit, dpiaAiCoverage, trainingAiCoverage, dpaArt28Verified, transferMechanism, additionalContext,
    measuresReviewCadence, measuresLastReviewDate,
    processingNature, processingScope, processingContext, processingPurposes,

  ]);

  const initialIntakeJson = useMemo(() => JSON.stringify(buildIntake()), []);
  const touched = useMemo(() => JSON.stringify(intakeForCheckout) !== initialIntakeJson, [intakeForCheckout, initialIntakeJson]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage, clearDraft,
  } = useToolDraft({
    toolType: "governance",
    clientId: clientId ?? null,
    data: { intake: intakeForCheckout, step },
    currentStage: step,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const payload = restoreData as { intake?: any; step?: number } | null;
    const d = payload?.intake as Record<string, any> | undefined;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: any[]) => void) => { if (Array.isArray(v)) fn(v); };
    S(d.organization_name, setOrganizationName);
    S(d.sector, setSector);
    S(d.org_size, setOrgSize);
    A(d.jurisdictions, setJurisdictions);
    if (d.eu_uk_data === "" || d.eu_uk_data === "Yes" || d.eu_uk_data === "No") setEuUkData(d.eu_uk_data);
    A(d.tools, setTools);
    A(d.data_categories, setDataCategories);
    if (d.special_category === "" || d.special_category === "Yes" || d.special_category === "No") setSpecialCategory(d.special_category);
    A(d.special_categories_list, setSpecialCategoriesList);
    S(d.privacy_policy, setPrivacyPolicy);
    S(d.privacy_notice_coverage, setPrivacyNoticeCoverage);
    
    S(d.dpo_status, setDpoStatus);
    S(d.dpia_status, setDpiaStatus);
    S(d.incident_response, setIncidentResponse);
    S(d.training_status, setTrainingStatus);
    S(d.tool_instruction, setToolInstruction);
    S(d.dpa_status, setDpaStatus);
    S(d.transfer_status, setTransferStatus);
    S(d.technical_controls, setTechnicalControls);
    A(d.technical_controls_list, setTechnicalControlsList);
    S(d.dsr_capability, setDsrCapability);
    A(d.dsr_rights_tested, setDsrRightsTested);
    S(d.inventory_audit, setInventoryAudit);
    S(d.dpia_ai_coverage, setDpiaAiCoverage);
    S(d.training_ai_coverage, setTrainingAiCoverage);
    S(d.dpa_art28_verified, setDpaArt28Verified);
    S(d.transfer_mechanism, setTransferMechanism);
    S(d.additional_context, setAdditionalContext);
    S(d.measures_review_cadence, setMeasuresReviewCadence);
    S(d.measures_last_review_date, setMeasuresLastReviewDate);
    S(d.processing_nature, setProcessingNature);
    S(d.processing_scope, setProcessingScope);
    S(d.processing_context, setProcessingContext);
    S(d.processing_purposes, setProcessingPurposes);

    if (typeof restoreStage === "number") setStep(restoreStage);
    else if (typeof payload?.step === "number") setStep(payload.step);
  };

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
      plainSummary: "A DPO must be designated where processing is carried out by a public authority, where core activities consist of large-scale regular and systematic monitoring of data subjects, or where core activities consist of large-scale processing of special category data. 'Core activities' means the primary business activities, not ancillary HR or IT functions.",
      relatedCitations: [
        { citation: "Art. 38 GDPR", label: "DPO position" },
        { citation: "Art. 39 GDPR", label: "DPO tasks" },
      ],
      coachLead: "Test 'core activities' and 'large scale' honestly before selecting.",
      coachBody: "A DPO is mandatory when large-scale monitoring or special-category processing is the primary business — not ancillary HR or IT. Select on that test, whatever the org chart says.",
      goodAnswer: "An ad-tech firm whose product is behavioural tracking meets the mandatory-DPO condition. A bakery with CCTV doesn't — same technology, different core activity.",
      commonMistake: "Selecting 'appointed' for a part-time contact without Art. 38 independence and reporting lines. A title without the position doesn't satisfy Arts. 37–39.",
    },
    4: {
      article: "32", jurisdiction: "eu",
      fieldLabel: "Security and training — Art. 32 GDPR",
      plainSummary: "Controllers and processors must implement appropriate technical and organisational measures to ensure security appropriate to the risk. Art. 32(4) specifically requires steps ensuring any person acting under the controller's authority who has access to personal data processes it only on the controller's instructions.",
      relatedCitations: [{ citation: "Art. 32(4) GDPR", label: "Staff instruction obligation" }],
      coachLead: "Answer for what's running — and training that reaches everyone who touches data.",
      coachBody: "Art. 32 tests measures appropriate to the risk. Art. 32(4) requires staff to process only on instructions — working training is how that happens. Select on what's deployed, not planned.",
      goodAnswer: "A firm selects training-in-place: onboarding plus annual refreshers reach every data-touching role, and completion is tracked. Coverage and evidence, not a policy PDF.",
      commonMistake: "Counting a security policy as a measure. Art. 32 asks what is implemented; an unenforced document is a plan.",
    },
    5: {
      article: "28", jurisdiction: "eu",
      fieldLabel: "Processor contracts and transfers — Arts. 28, 46 GDPR",
      plainSummary: "Processing by a processor must be governed by a binding contract containing the eight Art. 28(3) mandatory clauses. Any transfer of personal data outside the EEA/UK additionally requires an Art. 46 mechanism — most commonly Standard Contractual Clauses.",
      relatedCitations: [
        { citation: "Art. 28(3) GDPR", label: "Eight mandatory DPA clauses" },
        { citation: "Art. 46(2)(c) GDPR", label: "Standard Contractual Clauses" },
      ],
      coachLead: "Inventory your vendors first — then answer for all of them.",
      coachBody: "Every processor needs an Art. 28(3) contract. Every transfer out of the EEA needs a Chapter V mechanism. Check the vendor list against signed DPAs and mapped routes before picking a status.",
      goodAnswer: "A company selects partial coverage: 9 of 11 vendors have DPAs, and two US transfers rely on checked DPF certifications. Counted, not assumed.",
      commonMistake: "Selecting 'covered' because the main cloud provider has a DPA. The duty is per-processor — the eleventh vendor is the finding.",
    },
  };

  const govRailOpts = !summaryStep ? (govRailConfigs[step] ?? null) : null;
  const { entry: govRailEntry } = useGdprRailEntry(govRailOpts);

  const handleGovRailFocus = () => {};

  const govEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories", "breach_notification", "dpo_absence", "dpia_absence",
     "processor_contract", "international_transfer"],
    guidanceTier.tier === "paid"
  );

  // Live GDPR regulatory footprint — deterministic, updates as user answers
  const gdprFootprint = useMemo(() => {
    const items: { citation: string; label: string; triggered: boolean; note?: string }[] = [
      {
        citation: "Art. 37 GDPR",
        label: "DPO designation may be mandatory",
        triggered: showDpoQ && dpoStatus === "No",
        note: "Large-scale processing or systematic monitoring of individuals",
      },
      {
        citation: "Art. 35 GDPR",
        label: "DPIA required before processing begins",
        triggered: specialCategory === "Yes" && orgSizeNum === "large",
        note: "Large-scale special category processing is a mandatory DPIA trigger",
      },
      {
        citation: "Art. 33 GDPR",
        label: "72-hour breach notification obligation applies",
        triggered: euUkData === "Yes",
      },
      {
        citation: "Art. 28 GDPR",
        label: "Written DPAs required with all processors",
        triggered: euUkData === "Yes" && dpaStatus !== "" && dpaStatus !== "Yes, all vendors",
        note: dpaStatus ? `Current status: ${dpaStatus}` : undefined,
      },
      {
        citation: "Arts. 44–46 GDPR",
        label: "Transfer mechanism required for non-EEA/UK processors",
        triggered: euUkData === "Yes" && (
          transferStatus.includes("US-based") || transferStatus.includes("non-adequate")
        ),
        note: "Most commonly satisfied by EU Standard Contractual Clauses",
      },
      {
        citation: "Art. 32(4) GDPR",
        label: "Staff data protection training obligation",
        triggered: euUkData === "Yes" && (
          trainingStatus === "No formal training" || trainingStatus === "Ad hoc only"
        ),
      },
    ];
    return items.filter((i) => i.triggered);
  }, [euUkData, specialCategory, orgSizeNum, dpoStatus, dpaStatus, transferStatus, trainingStatus, showDpoQ]);


  return (
    <WorkspaceLayout className="bg-paper">
      <Helmet><title>GDPR Governance Assessment | End User Privacy</title>
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
      <header className="bg-brand-navy text-white py-12">

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            <Scale aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> GDPR Governance Assessment · ${pricing.price}
          </span>
          <h1 className="text-hero-h1 text-white mb-3">GDPR Governance Assessment</h1>
          <RequirementBadge variant="hero" tier="supports" text="GDPR Article 5(2) requires you to demonstrate compliance — this assessment produces the documented evidence of that accountability." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg">A structured review of your organisation's data governance practices across ten domains — with cited enforcement decisions behind every risk finding.</p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-sm mt-3">
            {isPremium
              ? "Estimated completion time: 10-15 minutes. Your completed report will be saved to My Reports."
              : "Estimated completion time: 10-15 minutes. Sign in to save your completed report to My Reports."}
          </p>
          <div className="mt-4"><SampleReportLink toolSlug="governance" tone="onDark" variant="link" /></div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            GDPR Art. 5(2) · documented evidence that you can demonstrate compliance across ten governance domains
          </p>
        </div>
      </header>
      <ToolAlsoAvailableRow currentTool="governance" />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>

      <section className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <div className="p-4 bg-muted/50 border-l-4 border-muted-foreground/30 rounded text-sm text-muted-foreground">
          This assessment is a compliance framework tool. It identifies governance findings that should be validated against your organization's authoritative records. It does not constitute legal advice or a legal compliance opinion.
        </div>
        <div className="text-sm text-muted-foreground">
          This assessment evaluates your privacy programme against the GDPR framework (EU &amp; UK GDPR and GDPR-modelled regimes). For California (CCPA/CPRA) obligations, use the <a href="/cppa" className="underline text-primary">CPPA Assessment</a>.
        </div>

        <div className="text-sm text-muted-foreground" aria-live="polite">Step {step} of {totalSteps}</div>

        <IntakeMasthead
          kicker="GDPR Governance Assessment · Art. 5(2) accountability"
          title="GDPR Governance Assessment"
          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter && typeof meter.lockedFields?.organization_name === "string"
              ? (meter.lockedFields!.organization_name as string)
              : undefined
          }
          meter={meter ?? null}
          preRunHint="The organisation name you set below is fixed once you first generate. Everything else stays editable across your included revision runs."
        />
        <BenchLayout
          toolType="governance"
          railEntry={govRailEntry}
          defaultSourceUrl="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
        >
        <div className="flex-1 min-w-0 space-y-6" onFocus={handleGovRailFocus}>
          <DraftRestoreBanner
            draftFound={draftFound}
            touched={touched}
            draftUpdatedAt={draftUpdatedAt}
            onResume={applyRestore}
            onDiscard={() => { void clearDraft(); }}
          />
          <RequiredLegend />
          {step === 1 && (
            <>
              <h2 className="">Gateway Questions</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">GDPR Art. 3 — territorial scope · Art. 4(1) — personal data definition</p>
              <div>
                <Label htmlFor="org">Organisation being assessed<Req /></Label>
                <input id="org" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Acme Retail Ltd" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The organisation whose privacy programme this assessment evaluates.</p>
              </div>
              <div>
                <Label>Q1: Primary sector<Req /></Label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q2: Number of employees<Req /></Label>
                <select value={orgSize} onChange={(e) => setOrgSize(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q3: Jurisdictions where you operate or process personal data<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3 GDPR)</span></Label>
                <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
                {jurisdictions.includes("California (CCPA/CPRA)") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    California (CCPA/CPRA) obligations aren't graded here. Use the <a href="/cppa" className="underline text-primary">CPPA Assessment</a> for that scope — this selection still informs the GDPR transfer analysis.
                  </p>
                )}
              </div>
              <div>
                <Label>Q4: Do you process personal data of EU or UK residents?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3(2) GDPR — extra-territorial scope)</span></Label>
                <div className="mt-2"><Radio name="euuk" options={["Yes", "No"]} value={euUkData} onChange={(v) => setEuUkData(v as any)} /></div>
              </div>
              <div>
                <Label>Q5: Technology tools that process personal data<Req /></Label>
                <div className="mt-2"><Pills options={TOOLS} value={tools} onChange={setTools} /></div>
                <Input placeholder="Other (specify)" value={otherTool} onChange={(e) => setOtherTool(e.target.value)} className="mt-2" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="">Data and Processing Profile</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 4(1) — personal data · Art. 9 — special categories · Art. 6(1) — lawful basis</p>
              <div>
                <Label>Q6: Categories of personal data processed<Req /></Label>
                <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div>
              </div>
              <div>
                <Label>Q7: Do you process health, biometric, or other special category data?<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 GDPR)</span> <EnforcementSignalIcon signalKey="special_categories" signals={govEnforcementSignals} /></Label>
                <div className="mt-2"><Radio name="spec" options={["Yes", "No"]} value={specialCategory} onChange={(v) => setSpecialCategory(v as any)} /></div>
                {specialCategory === "Yes" && (
                  <div className="mt-3"><Label>Which categories?</Label><div className="mt-2"><Pills options={SPECIAL_CATS} value={specialCategoriesList} onChange={setSpecialCategoriesList} /></div></div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="">Governance Infrastructure</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 24 — controller responsibility · Art. 37 — DPO designation</p>
              <div><Label>Q8: Documented privacy policy/notice<Req /> <DefPopover termKey="gdpr_transparency" /></Label><div className="mt-2"><Radio name="pp" options={["Yes, current (reviewed in last 12 months)", "Yes, but outdated", "No"]} value={privacyPolicy} onChange={setPrivacyPolicy} /></div></div>
              {privacyPolicy.startsWith("Yes") && (
                <div><Label>Q8a: Does your published privacy notice describe all current processing activities, recipients, international transfers, retention periods, and data-subject rights for your tools?<Req /> <DefPopover termKey="gdpr_transparency" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 13–14 GDPR)</span></Label><div className="mt-2"><Radio name="pncov" options={["Yes — notice covers all current activities, transfers, retention, and rights", "Partially — some activities or tools not yet reflected", "No — notice not updated for current tools", "Unsure"]} value={privacyNoticeCoverage} onChange={setPrivacyNoticeCoverage} /></div></div>
              )}
              
              {showDpoQ && (<div><Label>Q9: Designated DPO or equivalent?<Req /> <DefPopover termKey="gdpr_dpo" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 37–39 GDPR)</span> <EnforcementSignalIcon signalKey="dpo_absence" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpo" options={["Yes, formal DPO", "Yes, informal privacy lead", "No"]} value={dpoStatus} onChange={setDpoStatus} /></div></div>)}
              <div><Label>Q10: Has any DPIA been conducted?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 35 GDPR)</span> <EnforcementSignalIcon signalKey="dpia_absence" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpia" options={["Yes, multiple DPIAs completed", "Yes, one DPIA completed", "No, none conducted", "Unsure"]} value={dpiaStatus} onChange={setDpiaStatus} /></div></div>
              {dpiaStatus.startsWith("Yes") && (
                <div><Label>Q10a: Do your DPIAs specifically cover your current AI / high-risk tools?<Req /> <DefPopover termKey="gdpr_dpia" /> <span className="text-xs text-muted-foreground font-mono">(Art. 35 GDPR)</span> <EnforcementSignalIcon signalKey="dpia_absence" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpia_ai" options={["Yes — all AI/high-risk tools assessed", "Some covered", "No — not for AI tools", "Unsure"]} value={dpiaAiCoverage} onChange={setDpiaAiCoverage} /></div></div>
              )}
              <div><Label>Q11: Incident response plan covering personal data breaches<Req /> <DefPopover termKey="gdpr_breach_notification" /> <span className="text-xs text-muted-foreground font-mono">(Art. 33 GDPR — 72 hours)</span> <EnforcementSignalIcon signalKey="breach_notification" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="ir" options={["Yes, tested in last 12 months", "Yes, but not tested", "Documented but informal", "No"]} value={incidentResponse} onChange={setIncidentResponse} /></div></div>
              <div><Label>Q12: Can you fulfil data subject rights (access, erasure, portability, rectification) across your external/cloud vendors?<Req /> <DefPopover termKey="gdpr_data_subject_rights" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 12, 15–20 GDPR)</span></Label><div className="mt-2"><Radio name="dsr" options={["Yes — documented and tested across all vendors", "Documented but not tested", "Ad hoc / not documented", "No process in place", "Unsure"]} value={dsrCapability} onChange={setDsrCapability} /></div>
                {dsrCapability === "Yes — documented and tested across all vendors" && (
                  <div className="mt-3"><Label>Which rights have you tested end-to-end?</Label><div className="mt-2"><Pills options={["Access","Erasure","Portability","Rectification"]} value={dsrRightsTested} onChange={setDsrRightsTested} /></div></div>
                )}
              </div>
              <div><Label>Q13: Is your tool/processing inventory periodically audited for unauthorised ("shadow") tools, with a formal approval process for new tools?<Req /> <DefPopover termKey="gdpr_accountability" /> <span className="text-xs text-muted-foreground font-mono">(Art. 24 GDPR)</span></Label><div className="mt-2"><Radio name="inv" options={["Yes — audited + formal approval process", "Inventory exists, no formal audit/approval", "No formal inventory", "Unsure"]} value={inventoryAudit} onChange={setInventoryAudit} /></div></div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="">Training and Technical Controls</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 32 — security of processing · Art. 32(4) — staff training obligation</p>
              <div><Label>Q14: Privacy / data protection training<Req /></Label><div className="mt-2"><Radio name="train" options={["Yes, formal onboarding + annual refresh", "Yes, onboarding only", "Ad hoc only", "No formal training"]} value={trainingStatus} onChange={setTrainingStatus} /></div></div>
              {trainingStatus.startsWith("Yes") && (
                <div><Label>Q14a: Does training specifically cover prohibited use of AI tools and data-submission risk? <span className="text-xs text-muted-foreground font-mono">(Art. 32(4) GDPR)</span></Label><div className="mt-2"><Radio name="train_ai" options={["Yes — explicitly covers AI tools", "Generally covers data handling", "No — not AI-specific", "Unsure"]} value={trainingAiCoverage} onChange={setTrainingAiCoverage} /></div></div>
              )}
              <div><Label>Q15: Instruction on what data may/may not be submitted to external technology tools<Req /></Label><div className="mt-2"><Radio name="ti" options={["Yes, written policy with specific prohibitions", "Verbal guidance only", "No instruction provided"]} value={toolInstruction} onChange={setToolInstruction} /></div></div>
              <div><Label>Q16: Technical controls — not just policy — preventing prohibited personal data being submitted to your AI/cloud tools?<Req /> <DefPopover termKey="gdpr_security_measures" /> <span className="text-xs text-muted-foreground font-mono">(Art. 32(1)(b) GDPR)</span></Label><div className="mt-2"><Radio name="tc" options={["Yes — DLP/content filtering actively enforced", "Partial — some tools or categories", "No — policy and training only", "Unsure"]} value={technicalControls} onChange={setTechnicalControls} /></div>
                {(technicalControls === "Yes — DLP/content filtering actively enforced" || technicalControls.startsWith("Partial")) && (
                  <div className="mt-3"><Label>Which controls are in place?</Label><div className="mt-2"><Pills options={["DLP rules","Content filtering","Endpoint upload restrictions","Prompt-injection detection","Approval workflow"]} value={technicalControlsList} onChange={setTechnicalControlsList} /></div></div>
                )}
              </div>
            </>
          )}

          {step === 5 && showStep5 && (
            <>
              <h2 className="">Transfer and Compliance</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 28 — processor contracts · Arts. 44–49 — international transfers · Art. 46(2)(c) — SCCs</p>
              <div><Label>Q17: DPAs signed with relevant vendors<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR)</span> <EnforcementSignalIcon signalKey="processor_contract" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpa" options={["Yes, all vendors", "Most vendors", "Some vendors", "No"]} value={dpaStatus} onChange={setDpaStatus} /></div></div>
              {(dpaStatus === "Yes, all vendors" || dpaStatus === "Most vendors") && (
                <div><Label>Q17a: Have those DPAs been verified against the Art. 28(3) mandatory clauses? <DefPopover termKey="gdpr_processor_contract" /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR)</span> <EnforcementSignalIcon signalKey="processor_contract" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpa28" options={["Yes — verified", "Partially", "Not verified", "Unsure"]} value={dpaArt28Verified} onChange={setDpaArt28Verified} /></div></div>
              )}
              <div><Label>Q18: Cross-border transfers outside EU/UK<Req /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–46 GDPR)</span> <EnforcementSignalIcon signalKey="international_transfer" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="xfer" options={["Yes, US-based tools", "Yes, other non-adequate countries", "All tools store data in EU/UK", "Unsure"]} value={transferStatus} onChange={setTransferStatus} /></div></div>
              {(transferStatus === "Yes, US-based tools" || transferStatus === "Yes, other non-adequate countries") && (
                <div><Label>Q18a: Which transfer mechanism is in place for those transfers? <DefPopover termKey="gdpr_international_transfer" /> <span className="text-xs text-muted-foreground font-mono">{transferMechCite}</span> <EnforcementSignalIcon signalKey="international_transfer" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="xfermech" options={transferMechOptions} value={transferMechanism} onChange={setTransferMechanism} /></div></div>
              )}
            </>
          )}

          {/* R1a: optional catch-all rendered on the final input step (before the summary). */}
          {!summaryStep && step === totalSteps - 1 && (
            <div className="pt-2 border-t">
              <Label htmlFor="additional_context">Additional context: anything material to your privacy program not captured above (optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">Free text. Anything you want the generator to weigh that the questions above didn't cover.</p>
              <textarea
                id="additional_context"
                className="mt-2 w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="E.g. pending re-org affecting DPO reporting line; open sub-processor shortfall under review; recent enforcement letter from a state AG."
              />
            </div>
          )}

          {summaryStep && (() => {
            const rows: { label: string; value: string }[] = [];
            const push = (label: string, value: string | string[] | undefined | null) => {
              if (value == null) return;
              if (Array.isArray(value)) {
                if (value.length === 0) return;
                rows.push({ label, value: value.join(", ") });
              } else {
                const v = String(value).trim();
                if (!v) return;
                rows.push({ label, value: v });
              }
            };
            push("Sector", sector);
            push("Organisation size", orgSize);
            push("Jurisdictions", jurisdictions);
            push("EU/UK personal data", euUkData);
            const toolsDisplay = otherTool.trim() ? [...tools, `Other: ${otherTool.trim()}`] : tools;
            push("Tools in use", toolsDisplay);
            push("Data categories", dataCategories);
            push("Special category data", specialCategory);
            if (specialCategory === "Yes") push("Special categories", specialCategoriesList);
            push("Privacy policy", privacyPolicy);
            if (privacyPolicy.startsWith("Yes")) push("Privacy notice coverage", privacyNoticeCoverage);
            
            if (showDpoQ) push("DPO appointed", dpoStatus);
            push("DPIA conducted previously", dpiaStatus);
            push("Incident response plan", incidentResponse);
            push("Employee privacy training", trainingStatus);
            push("Data submission instruction", toolInstruction);
            if (showStep5) {
              push("DPA signed with vendors", dpaStatus);
              push("Cross-border transfers", transferStatus);
            }
            push("Technical controls", technicalControls);
            push("Technical controls in place", (technicalControls === "Yes — DLP/content filtering actively enforced" || technicalControls.startsWith("Partial")) ? technicalControlsList : []);
            push("DSR fulfilment capability", dsrCapability);
            push("DSR rights tested", dsrCapability === "Yes — documented and tested across all vendors" ? dsrRightsTested : []);
            push("Inventory / shadow-tool audit", inventoryAudit);
            if (dpiaStatus.startsWith("Yes")) push("DPIA AI coverage", dpiaAiCoverage);
            if (trainingStatus.startsWith("Yes")) push("Training AI coverage", trainingAiCoverage);
            if (showStep5 && (dpaStatus === "Yes, all vendors" || dpaStatus === "Most vendors")) push("DPA Art 28(3) verified", dpaArt28Verified);
            if (showStep5 && (transferStatus === "Yes, US-based tools" || transferStatus === "Yes, other non-adequate countries")) push("Transfer mechanism", transferMechanism);
            return (
              <>
                <div>
                  <h2 className="">Review your answers</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the inputs below before running. You can go back to edit any step.
                  </p>
                </div>
                <div className="rounded-lg border bg-card divide-y">
                  {rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
                      <div className="text-sm font-medium text-muted-foreground sm:col-span-1">{r.label}</div>
                      <div className="text-sm text-foreground sm:col-span-2 break-words">{r.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-sm rounded">
                  This is a compliance framework tool, not legal advice. Findings should be validated against your organization's authoritative records before operational reliance.
                </div>
              </>
            );
          })()}

          {step > 1 && !summaryStep && gdprFootprint.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> GDPR obligations triggered by your answers
              </p>
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

          <ValidationErrorSummary message={validationError} className="mt-4" />
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>

            {!summaryStep ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button onClick={handlePurchase} disabled={purchasing || (pricing.price > 0 && !pricing.stripeConfigured)}>
                {pricing.price === 0
                  ? purchasing
                    ? "Generating…"
                    : "Generate Assessment (Free)"
                  : !pricing.stripeConfigured
                    ? `Payments Coming Soon ($${pricing.price})`
                    : purchasing
                      ? "Redirecting…"
                      : `Purchase Full Healthcheck ($${pricing.price})`}
              </Button>
            )}
          </div>
        </div>
        </BenchLayout>



        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/governance-assessment" />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="governance_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={intakeForCheckout}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) { void clearDraft(); navigate(`/governance-assessment/result/${id}?purchased=true`); }
          }}
        />
        <ToolSamplePreview
          toolType="healthcheck"
          toolName="GDPR Governance Assessment"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      </section>
      </>)}
    </WorkspaceLayout>
  );
};

export default GovernanceAssessment;
