import { useEffect, useMemo, useState } from "react";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { Textarea } from "@/components/ui/textarea";
import { AssistedInput } from "@/components/AssistedInput";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import BenchLayout from "@/components/intake/BenchLayout";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { fail, type StepIssue } from "@/lib/intakeValidation";
import { buildLiaReview, liaUnresolvedRows } from "@/lib/liaReview";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { LIA_RAIL } from "@/components/lia/LIARailEntries";
import type { RailEntry } from "@/components/intake/RailEntry";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import {
  ART9_CONDITIONS,
  MARKETING_CHANNELS,
  MARKETING_CHANNELS_EXCLUSIVE,
  MARKETING_CONSENT_BASES,
  ACHIEVABLE_WITHOUT_PERSONAL_DATA,
  STATED_PURPOSE_STATUS_OPTS,
  CHILDREN_AGE_BAND_OPTS,
  BIOMETRIC_UNIQUE_ID_OPTS,
  APPROVAL_STATUS_OPTS,
  RELATIONSHIP_CATEGORY_OPTS,
  POTENTIAL_HARM_SEVERITY_OPTS,
  VULNERABLE_GROUP_OPTS,
  VULNERABLE_GROUP_EXCLUSIVE,
  HARM_OPTS,
  HARM_EXCLUSIVE,
  SAFEGUARD_OPTS,
  SAFEGUARD_EXCLUSIVE,
} from "@/pages/LIAssessment.enums";
// DOC 217 §6 (2026-09-07) — the V3 read-back (confirm / correct / stand on
// the engine's readings of free-text answers), DARK behind
// VITE_LIA_V3_READBACK_ENABLED. Not a question: every free-text Textarea
// below carries a `data-v3-field` attribute the component listens on, and
// the component mounts once, before the submit block. The engine's own
// flag (LIA_V3_ENABLED, run-li-assessment) flips independently.
import V3ReadBack from "@/components/lia/V3ReadBack";
import { LIA_V3_INTAKE_FIELDS } from "@/lib/lia/v3Fields";
import { rekeyReadings } from "@/lib/lia/v3ReadBack";

const V3_READBACK_ENABLED = import.meta.env.VITE_LIA_V3_READBACK_ENABLED === "true";


interface PreviewRow {
  id: string;
  user_id: string | null;
  organization_name: string | null;
  subject_anchor?: string | null;
  processing_description: string;
  data_categories: string[] | null;
  relationship_type: string | null;
  jurisdictions: string[] | null;
  preview_signal: any;
}

// LIA F16 / F18 (2026-09-15): the group carries an accessible name, each pill
// exposes its selected state, and an `exclusive` option ("None", "Unknown")
// clears the others when chosen and is cleared when a positive option is
// chosen — a contradictory array can no longer be produced.
const Pills = ({ options, value, onChange, labelledBy, exclusive = [] }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; labelledBy?: string; exclusive?: string[];
}) => (
  <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
    {options.map((opt) => {
      const checked = value.includes(opt);
      const toggle = () => {
        if (checked) return onChange(value.filter((v) => v !== opt));
        if (exclusive.includes(opt)) return onChange([opt]);
        return onChange([...value.filter((v) => !exclusive.includes(v)), opt]);
      };
      return (
        <button
          key={opt}
          type="button"
          aria-pressed={checked}
          onClick={toggle}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

// INTAKE-4e / LIA F06 (2026-09-15) — the harm suggestions live in a pure
// module (src/lib/liaHarmSuggestions.ts) so tests import them without the
// page. HARM_PREFILL is re-exported for callers that import it from here.
import { HARM_PREFILL, harmSuggestions } from "@/lib/liaHarmSuggestions";
export { HARM_PREFILL };

const LIAssessmentIntake = () => {

  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { clientId } = useActiveClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const pricing = useToolPrice("li_assessment");

  const [row, setRow] = useState<PreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [intakeForCheckout, setIntakeForCheckout] = useState<Record<string, unknown> | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  // LIA F22 (2026-09-15) — the read-only review between the answers and checkout.
  const [reviewOpen, setReviewOpen] = useState(false);
  // LIA F14/F18 — the fleet field-error contract.
  const fieldErrors = useFieldErrors();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errAnchor = (k: string) => ({
    "data-field": k,
    "aria-invalid": fieldErrors.isInvalid(k) ? true : undefined,
    onClickCapture: () => fieldErrors.clear(k),
  });
  // LIA F21 — the read-back gate's settlement, awaited before checkout when the flag is on.
  const [gateSettled, setGateSettled] = useState<{ nonConforming: string[] } | null>(null);
  const [awaitingGate, setAwaitingGate] = useState(false);

  // Step 2 is the account gate for the LIA: anonymous visitors get the full
  // Step 1 screening, then must create an account / subscribe to continue.
  useEffect(() => {
    if (!authLoading && !user) setAuthGateOpen(true);
  }, [authLoading, user]);

  
  const guidanceTier = useGuidanceTier();
  const [activeRailSection, setActiveRailSection] = useState<"purpose" | "necessity" | "balancing" | null>(null);
  

  const liaRailOpts = activeRailSection ? {
    article: "6",
    jurisdiction: ((row?.jurisdictions ?? []) as string[]).some(j => /uk/i.test(j))
      ? "uk" as const
      : "eu" as const,
    recital: activeRailSection === "balancing" ? 47 : undefined,
    fieldLabel: activeRailSection === "purpose"
      ? "Purpose test — Art. 6(1)(f)"
      : activeRailSection === "necessity"
      ? "Necessity test — Art. 6(1)(f)"
      : "Balancing test — Art. 6(1)(f)",
    plainSummary: activeRailSection === "purpose"
      ? "Processing is lawful where necessary for the purposes of legitimate interests pursued by the controller or a third party, except where overridden by the interests or fundamental rights of the data subject. The purpose test asks: what is the specific legitimate interest, and is it genuine and present?"
      : activeRailSection === "necessity"
      ? "The processing must be necessary to achieve the legitimate interest — not merely convenient. Where a less privacy-intrusive alternative exists that achieves the same result, the necessity test fails. You must show you have considered and rejected less intrusive alternatives."
      : "Even where a legitimate interest exists and processing is necessary, it can be overridden by the data subject's interests, rights, or freedoms. Recital 47 requires consideration of reasonable expectations, the nature of the relationship, and whether the data subject can reasonably foresee the processing at the time of collection.",
    relatedCitations: [
      { citation: "Recital 47 GDPR", label: "Reasonable expectations standard" },
      { citation: "EDPB WP29 Opinion 06/2014", label: "Legitimate interests guidance" },
    ],
  } : null;

  const { entry: sectionRailEntry } = useGdprRailEntry(liaRailOpts);

  // UPGRADE-4 ITEM 5 — per-field rail. A focused Upgrade-4 field takes the rail
  // over its section entry; blurring back to the section restores it.
  const [activeFieldRailKey, setActiveFieldRailKey] = useState<string | null>(null);
  const focusField = (key: string) => () => setActiveFieldRailKey(key);
  const fieldRailEntry = activeFieldRailKey
    ? (LIA_RAIL as Record<string, RailEntry | undefined>)[activeFieldRailKey]
    : undefined;
  const liaRailEntry = fieldRailEntry ?? sectionRailEntry;

  const handleRailFocus = (section: "purpose" | "necessity" | "balancing") => {
    setActiveRailSection(section);
    setActiveFieldRailKey(null);
  };
  useScrollActiveRail((k) => {
    if (k === "purpose" || k === "necessity" || k === "balancing" || k === "attestation") {
      if (k !== "attestation") setActiveRailSection(k);
      // LIA F08 (2026-09-15): a scroll-driven section change clears the
      // field entry so the field entry cannot outlive the question it
      // belonged to — but never while an answer control has focus (the
      // focused field's own handler owns the rail then).
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (!ae || ae === document.body) setActiveFieldRailKey(k === "attestation" ? "attestation_block" : null);
    }
  });

  const liaEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories"],
    guidanceTier.tier === "paid"
  );

  // Purpose
  const [interestHolder, setInterestHolder] = useState("");
  const [interestType, setInterestType] = useState("");
  const [statedPurpose, setStatedPurpose] = useState("");
  // LIA F11 (2026-09-15) — whether the notice wording is published, proposed or not yet drafted.
  const [statedPurposeStatus, setStatedPurposeStatus] = useState("");

  // Necessity
  const [alternatives, setAlternatives] = useState("");
  const [whyConsentNotUsed, setWhyConsentNotUsed] = useState("");
  const [dataMinimised, setDataMinimised] = useState("");

  // Balancing
  const [reasonableExpectation, setReasonableExpectation] = useState("");
  const [vulnerableSubjects, setVulnerableSubjects] = useState<string[]>([]);
  const [potentialHarm, setPotentialHarm] = useState("");
  const [safeguards, setSafeguards] = useState<string[]>([]);
  const [optOutMechanism, setOptOutMechanism] = useState("");

  // ITEM 311 — Chapter 7 rebuild. Four fields the analytic deliverables need
  // and the old form never asked for.
  const [collectionContext, setCollectionContext] = useState("");
  const [childrenDataSubjects, setChildrenDataSubjects] = useState("");
  // LIA F05 — the age range is asked, never inferred from a general Yes.
  const [childrenAgeBand, setChildrenAgeBand] = useState("");
  // LIA F12 — Art. 9(1) reaches biometric data only for unique identification.
  const [biometricUniqueIdentification, setBiometricUniqueIdentification] = useState("");
  const [controllerIsPublicAuthority, setControllerIsPublicAuthority] = useState("");
  const [publicTaskProcessing, setPublicTaskProcessing] = useState("");
  const [additionalMitigations, setAdditionalMitigations] = useState("");
  // DOC 189 (2026-09-05, CEO-approved wording; PN-L6 resolution) — the two
  // device-access questions the ePrivacy gate reads directly. Q2 is shown
  // only when Q1 is "Yes".
  const [deviceAccess, setDeviceAccess] = useState("");
  const [deviceAccessStrictlyNecessary, setDeviceAccessStrictlyNecessary] = useState("");

  // Added flexibility — core interest field, free-form companions, catch-all
  const [interestStatement, setInterestStatement] = useState("");
  const [interestHolderOther, setInterestHolderOther] = useState("");
  const [interestTypeOther, setInterestTypeOther] = useState("");
  const [reasonableExpectationDetail, setReasonableExpectationDetail] = useState("");
  const [potentialHarmDetail, setPotentialHarmDetail] = useState("");
  const [vulnerableSubjectsOther, setVulnerableSubjectsOther] = useState("");
  const [safeguardsOther, setSafeguardsOther] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // UPGRADE-4 (ITEM 2) — fields the new Purpose / Necessity / Balancing
  // deliverables and the attestation block read. All optional, so legacy rows
  // continue to validate.
  const [specificBenefit, setSpecificBenefit] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [alternativesRationale, setAlternativesRationale] = useState("");
  const [relationshipCategory, setRelationshipCategory] = useState("");
  const [scaleApprox, setScaleApprox] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [potentialHarms, setPotentialHarms] = useState<string[]>([]);
  const [optOutAvailable, setOptOutAvailable] = useState("");
  const [dpoReviewed, setDpoReviewed] = useState("");
  const [dpoReviewer, setDpoReviewer] = useState("");
  const [dpoReviewDate, setDpoReviewDate] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverPosition, setApproverPosition] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  // LIA F19 — the approval state is recorded, never inferred from blank fields.
  const [approvalStatus, setApprovalStatus] = useState("");
  const [reviewTriggers, setReviewTriggers] = useState<string[]>([]);

  // Adaptive branches
  const [statutoryRestrictions, setStatutoryRestrictions] = useState(""); // shown for marketing / advertising
  const [pseudonymisationOptions, setPseudonymisationOptions] = useState(""); // shown for analytics / research
  const [employmentSafeguards, setEmploymentSafeguards] = useState(""); // shown for employee monitoring

  // DOC 206E (2026-09-07) — N1/N4/N4b/N6. N1 shown only when hasSpecialCategory;
  // N4/N4b shown in the marketing branch (N4b only when N4 includes email/SMS);
  // N6 always shown.
  const [art9Condition, setArt9Condition] = useState("");
  const [marketingChannels, setMarketingChannels] = useState<string[]>([]);
  const [marketingConsentBasis, setMarketingConsentBasis] = useState("");
  const [achievableWithoutPersonalData, setAchievableWithoutPersonalData] = useState("");
  const [achievableWithoutPersonalDataRationale, setAchievableWithoutPersonalDataRationale] = useState("");

  // DOC 217 §6 — the read-back's submit signal (incremented at submit so the
  // component gates and reads every field once more before checkout).
  const [v3SubmitSignal, setV3SubmitSignal] = useState(0);

  // Autosave payload. LIA F01 (2026-09-15): the assessment identity is no
  // longer an answer inside the payload — useToolDraft scopes lookup, save
  // and discard to `assessmentKey` (the route id) and stores it itself, so a
  // blank form no longer counts as content and a draft from another preview
  // row is never offered or updated.
  const draftPayload = useMemo(() => ({
    interestHolder, interestType, statedPurpose, statedPurposeStatus,
    alternatives, whyConsentNotUsed, dataMinimised,
    reasonableExpectation, vulnerableSubjects, potentialHarm, safeguards, optOutMechanism,
    interestStatement, interestHolderOther, interestTypeOther,
    reasonableExpectationDetail, potentialHarmDetail, vulnerableSubjectsOther, safeguardsOther, additionalContext,
    statutoryRestrictions, pseudonymisationOptions, employmentSafeguards,
    collectionContext, childrenDataSubjects, childrenAgeBand, biometricUniqueIdentification, controllerIsPublicAuthority, publicTaskProcessing, additionalMitigations,
    deviceAccess, deviceAccessStrictlyNecessary,
    specificBenefit, beneficiary, alternativesRationale, relationshipCategory,
    scaleApprox, frequency, duration, potentialHarms, optOutAvailable,
    dpoReviewed, dpoReviewer, dpoReviewDate, approverName, approverPosition, approvalDate, approvalStatus, reviewTriggers,
    art9Condition, marketingChannels, marketingConsentBasis,
    achievableWithoutPersonalData, achievableWithoutPersonalDataRationale,
  }), [
    interestHolder, interestType, statedPurpose, statedPurposeStatus, alternatives, whyConsentNotUsed, dataMinimised,
    reasonableExpectation, vulnerableSubjects, potentialHarm, safeguards, optOutMechanism,
    interestStatement, interestHolderOther, interestTypeOther,
    reasonableExpectationDetail, potentialHarmDetail, vulnerableSubjectsOther, safeguardsOther, additionalContext,
    statutoryRestrictions, pseudonymisationOptions, employmentSafeguards,
    collectionContext, childrenDataSubjects, childrenAgeBand, biometricUniqueIdentification, controllerIsPublicAuthority, publicTaskProcessing, additionalMitigations,
    deviceAccess, deviceAccessStrictlyNecessary,
    specificBenefit, beneficiary, alternativesRationale, relationshipCategory,
    scaleApprox, frequency, duration, potentialHarms, optOutAvailable,
    dpoReviewed, dpoReviewer, dpoReviewDate, approverName, approverPosition, approvalDate, approvalStatus, reviewTriggers,
    art9Condition, marketingChannels, marketingConsentBasis,
    achievableWithoutPersonalData, achievableWithoutPersonalDataRationale,
  ]);
  const initialLiaRef = useMemo(() => JSON.stringify(draftPayload), [id]);
  const touched = useMemo(() => JSON.stringify(draftPayload) !== initialLiaRef, [draftPayload, initialLiaRef]);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft, resumeDraft, startNewDraft,
    saving: draftSaving, lastSavedAt: draftSavedAt, saveError: draftSaveError, draftChoice,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "lia",
    clientId: clientId ?? null,
    assessmentKey: id ?? null,
    data: draftPayload,
    currentStage: 0,
    enabled: !!user && touched && !!id,
  });
  const applyRestore = () => {
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: string[]) => void) => { if (Array.isArray(v)) fn(v); };
    S(d.interestHolder, setInterestHolder);
    S(d.interestType, setInterestType);
    S(d.statedPurpose, setStatedPurpose);
    S(d.statedPurposeStatus, setStatedPurposeStatus);
    S(d.childrenAgeBand, setChildrenAgeBand);
    S(d.biometricUniqueIdentification, setBiometricUniqueIdentification);
    S(d.approvalStatus, setApprovalStatus);
    S(d.alternatives, setAlternatives);
    S(d.whyConsentNotUsed, setWhyConsentNotUsed);
    S(d.dataMinimised, setDataMinimised);
    S(d.reasonableExpectation, setReasonableExpectation);
    A(d.vulnerableSubjects, setVulnerableSubjects);
    S(d.potentialHarm, setPotentialHarm);
    A(d.safeguards, setSafeguards);
    S(d.optOutMechanism, setOptOutMechanism);
    S(d.interestStatement, setInterestStatement);
    S(d.interestHolderOther, setInterestHolderOther);
    S(d.interestTypeOther, setInterestTypeOther);
    S(d.reasonableExpectationDetail, setReasonableExpectationDetail);
    S(d.potentialHarmDetail, setPotentialHarmDetail);
    S(d.vulnerableSubjectsOther, setVulnerableSubjectsOther);
    S(d.safeguardsOther, setSafeguardsOther);
    S(d.additionalContext, setAdditionalContext);
    S(d.statutoryRestrictions, setStatutoryRestrictions);
    S(d.pseudonymisationOptions, setPseudonymisationOptions);
    S(d.employmentSafeguards, setEmploymentSafeguards);
    S(d.collectionContext, setCollectionContext);
    S(d.childrenDataSubjects, setChildrenDataSubjects);
    S(d.controllerIsPublicAuthority, setControllerIsPublicAuthority);
    S(d.publicTaskProcessing, setPublicTaskProcessing);
    S(d.deviceAccess, setDeviceAccess);
    S(d.deviceAccessStrictlyNecessary, setDeviceAccessStrictlyNecessary);
    S(d.additionalMitigations, setAdditionalMitigations);
    S(d.specificBenefit, setSpecificBenefit);
    S(d.beneficiary, setBeneficiary);
    S(d.alternativesRationale, setAlternativesRationale);
    S(d.relationshipCategory, setRelationshipCategory);
    S(d.scaleApprox, setScaleApprox);
    S(d.frequency, setFrequency);
    S(d.duration, setDuration);
    A(d.potentialHarms, setPotentialHarms);
    S(d.optOutAvailable, setOptOutAvailable);
    S(d.dpoReviewed, setDpoReviewed);
    S(d.dpoReviewer, setDpoReviewer);
    S(d.dpoReviewDate, setDpoReviewDate);
    S(d.approverName, setApproverName);
    S(d.approverPosition, setApproverPosition);
    S(d.approvalDate, setApprovalDate);
    A(d.reviewTriggers, setReviewTriggers);
    // DOC 206E — N1/N4/N4b/N6.
    S(d.art9Condition, setArt9Condition);
    A(d.marketingChannels, setMarketingChannels);
    S(d.marketingConsentBasis, setMarketingConsentBasis);
    S(d.achievableWithoutPersonalData, setAchievableWithoutPersonalData);
    S(d.achievableWithoutPersonalDataRationale, setAchievableWithoutPersonalDataRationale);
    // F01 — the found draft becomes the autosave target only now.
    resumeDraft();
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);


  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-preview-li-assessment", { body: { id } });
      const row = (data as any)?.row;
      if (error || !row) {
        toast({ title: "Couldn't load preview", description: "Start again from step 1.", variant: "destructive" });
        navigate("/li-assessment");
        return;
      }
      setRow(row as PreviewRow);
      setLoading(false);
    })();
  }, [id, navigate, toast]);

  if (loading || !row) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</main>
        <Footer />
      </div>
    );
  }

  const useCaseCode: string = row.preview_signal?.use_case_code || "other";
  const dataCategories = row.data_categories || [];
  const showMarketingBranch = useCaseCode === "direct_marketing" || useCaseCode === "behavioral_advertising";
  const showAnalyticsBranch = useCaseCode === "research_analytics" || useCaseCode === "product_improvement";
  // LIA F12 (2026-09-15): the later relationship answer engages the
  // employment safeguards too; screening alone no longer decides the branch.
  const showEmploymentBranch = useCaseCode === "employee_monitoring" ||
    (row.relationship_type || "").toLowerCase().includes("employee") ||
    relationshipCategory === "Employee";
  const hasBiometric = dataCategories.includes("Biometric data");
  // The Article 9(2) question is asked whenever a category MAY be special;
  // the classification that travels is confirmed through the biometric
  // purpose question (Art. 9(1): "for the purpose of uniquely identifying").
  const hasSpecialCategory =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    hasBiometric;
  const specialCategoryConfirmed =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    (hasBiometric && biometricUniqueIdentification !== "No");
  // F03 — the use case the customer confirmed at screening, if any.
  const useCaseConfirmed: string | null = row.preview_signal?.classification?.override_code ?? null;
  // DOC 206E — N4b shows only when N4 includes email/SMS to individuals.
  const showMarketingConsentBasis = marketingChannels.includes("Email or SMS to individuals");

  // DOC 217 §6 — the free-text surface (doc 217 §1) as the read-back sees it:
  // the fifteen answers keyed by field id, with the question as displayed.
  // Built only while the flag is on; the answers are the same state the
  // intake payload below sends, read once here.
  const v3Answers: Record<string, string> = V3_READBACK_ENABLED
    ? {
      "processing_description": row.processing_description ?? "",
      "purpose_details.interest_statement": interestStatement,
      "purpose_details.stated_purpose": statedPurpose,
      "purpose_details.specific_benefit": specificBenefit,
      "purpose_details.statutory_restrictions": showMarketingBranch ? statutoryRestrictions : "",
      "necessity_details.alternatives": alternatives,
      "necessity_details.alternatives_rationale": alternativesRationale,
      "necessity_details.achievable_without_personal_data_rationale":
        achievableWithoutPersonalData === "No — personal data is required (explain why below)" ? achievableWithoutPersonalDataRationale : "",
      "necessity_details.why_consent_not_used": whyConsentNotUsed,
      "necessity_details.data_minimised": dataMinimised,
      "balancing_details.reasonable_expectation_detail": reasonableExpectationDetail,
      "balancing_details.collection_context": collectionContext,
      "balancing_details.potential_harms": potentialHarmDetail,
      "balancing_details.additional_mitigations": additionalMitigations,
      "balancing_details.additional_context": additionalContext,
    }
    : {};
  const v3Fields = V3_READBACK_ENABLED
    ? LIA_V3_INTAKE_FIELDS.map((f) => ({ field_id: f.field_id, question_text: f.question_text, answer: v3Answers[f.field_id] ?? "" }))
    : [];

  // LIA F14/F18 (2026-09-15) — every check names its field; the summary
  // outlines, scrolls to and focuses it. "Not assessed", "None identified",
  // "Unknown" and "No opt-out is available" are complete answers.
  const validate = (): StepIssue | null => {
    if (!interestHolder) return fail("interest_holder", "Tell us whose interest is being served.");
    if (!interestType) return fail("interest_type", "Tell us what type of interest this is.");
    if (!interestStatement.trim()) return fail("interest_statement", "Describe, in your own words, the legitimate interest you're relying on.");
    if (interestHolder === "Other (describe below)" && !interestHolderOther.trim()) return fail("interest_holder_other", "Name whose interest is being served.");
    if (interestType === "Other (describe below)" && !interestTypeOther.trim()) return fail("interest_type_other", "Name the type of interest.");
    if (!statedPurpose.trim()) return fail("stated_purpose", "Give the wording that states this purpose to data subjects, as published or as proposed.");
    if (!statedPurposeStatus) return fail("stated_purpose_status", "Say whether that wording is published, proposed or not yet drafted.");
    if (!alternatives.trim()) return fail("alternatives", "List the alternatives you considered — including any that would work.");
    if (hasBiometric && !biometricUniqueIdentification) return fail("biometric_unique_identification", "Say whether the biometric data is used to uniquely identify individuals — this decides whether Article 9 applies to it.");
    if (!reasonableExpectation) return fail("reasonable_expectation", "Tell us whether data subjects would reasonably expect this.");
    if (childrenDataSubjects === "Yes" && !childrenAgeBand) return fail("children_age_band", "Give the children's age range — \"Not known\" is a complete answer.");
    if (!potentialHarm) return fail("potential_harm", "Rate the worst-case impact — \"Not assessed\" is a complete answer.");
    if (!optOutMechanism.trim()) return fail("opt_out_mechanism", "Describe how data subjects object or opt out — or state that no opt-out is available.");
    // DOC 206E — N1/N4/N4b/N6, required when shown.
    if (hasSpecialCategory && !art9Condition) return fail("art9_condition", "Tell us which Article 9(2) condition applies — \"None identified\" and \"Not yet assessed\" are complete answers.");
    if (showMarketingBranch && marketingChannels.length === 0) return fail("marketing_channels", "Tell us which channels the direct marketing uses — \"None of these\" is a complete answer.");
    if (showMarketingBranch && showMarketingConsentBasis && !marketingConsentBasis) return fail("marketing_consent_basis", "Tell us what permission has been obtained for e-mail or SMS marketing.");
    if (!achievableWithoutPersonalData) return fail("achievable_without_personal_data", "Tell us whether this purpose could be achieved without personal data — \"Not assessed\" is a complete answer.");
    if (achievableWithoutPersonalData === "No — personal data is required (explain why below)" && !achievableWithoutPersonalDataRationale.trim()) {
      return fail("achievable_without_personal_data_rationale", "Explain why personal data is required.");
    }
    return null;
  };

  // LIA F17 (2026-09-15) — the payload carries an answer only while its
  // question is asked; drafts keep every value for recovery.
  const buildIntake = (): Record<string, unknown> => ({
      // Stage A (re-sent so checkout has full picture)
      organization_name: row.organization_name,
      subject_anchor: (row as any).subject_anchor ?? null,
      processing_description: row.processing_description,
      data_categories: row.data_categories,
      relationship_type: row.relationship_type,
      jurisdictions: row.jurisdictions,
      // F03 — the class the customer confirmed at screening (null when the detected class stood).
      use_case_code_confirmed: useCaseConfirmed,
      // Stage B
      stated_purpose: statedPurpose,
      alternatives_considered: alternatives,
      purpose_details: {
        specific_benefit: specificBenefit, beneficiary, interest_holder: interestHolder, interest_type: interestType, interest_statement: interestStatement,
        interest_holder_other: interestHolder === "Other (describe below)" ? interestHolderOther : "",
        interest_type_other: interestType === "Other (describe below)" ? interestTypeOther : "",
        controller_is_public_authority: controllerIsPublicAuthority,
        public_task_processing: controllerIsPublicAuthority === "Yes" ? publicTaskProcessing : "",
        // F11 — the notice wording's status travels beside the words.
        stated_purpose_status: statedPurposeStatus,
        // DOC 189 — the device-access pair; Q2 only travels when Q1 is "Yes"
        // (a hidden answer must not outlive the question that revealed it).
        device_access: deviceAccess,
        device_access_strictly_necessary: deviceAccess === "Yes" ? deviceAccessStrictlyNecessary : "",
        // DOC 206E — N4/N4b. marketing_channels null when the marketing
        // branch is hidden; marketing_consent_basis null unless N4 includes
        // email/SMS to individuals.
        marketing_channels: showMarketingBranch ? marketingChannels : null,
        marketing_consent_basis: showMarketingBranch && showMarketingConsentBasis ? marketingConsentBasis : null,
      },
      necessity_details: {
        alternatives,
        alternatives_rationale: alternativesRationale,
        why_consent_not_used: whyConsentNotUsed,
        data_minimised: dataMinimised,
        pseudonymisation_options: showAnalyticsBranch ? pseudonymisationOptions : null,
        // DOC 206E — N6. Rationale required only when the answer is "No…";
        // otherwise sent as "" (not null — the question itself is always shown).
        achievable_without_personal_data: achievableWithoutPersonalData,
        achievable_without_personal_data_rationale:
          achievableWithoutPersonalData === "No — personal data is required (explain why below)"
            ? achievableWithoutPersonalDataRationale
            : "",
      },
      balancing_details: {
        reasonable_expectation: reasonableExpectation,
        reasonable_expectation_detail: reasonableExpectationDetail,
        collection_context: collectionContext,
        children_data_subjects: childrenDataSubjects,
        // F05 — the age band travels only when children are involved.
        children_age_band: childrenDataSubjects === "Yes" ? childrenAgeBand : "",
        vulnerable_subjects: vulnerableSubjects,
        vulnerable_subjects_other: vulnerableSubjects.includes("Other") ? vulnerableSubjectsOther : "",
        potential_harm: potentialHarm,
        potential_harm_detail: potentialHarmDetail,
        safeguards,
        safeguards_other: safeguards.includes("Other") ? safeguardsOther : "",
        additional_mitigations: additionalMitigations,
        opt_out_mechanism: optOutMechanism,
        opt_out_available: optOutAvailable,
        relationship_category: relationshipCategory,
        scale_approx: scaleApprox,
        frequency,
        duration,
        potential_harms: potentialHarms,
        // F12 — the classification confirmed through the biometric purpose question.
        special_category_data: specialCategoryConfirmed,
        biometric_unique_identification: hasBiometric ? biometricUniqueIdentification : "",
        // DOC 206E — N1. null when special-category data is not indicated.
        art9_condition: hasSpecialCategory ? art9Condition : null,
        statutory_restrictions: showMarketingBranch ? statutoryRestrictions : null,
        employment_safeguards: showEmploymentBranch ? employmentSafeguards : null,
        additional_context: additionalContext,
      },
      attestation: {
        dpo_reviewed: dpoReviewed,
        dpo_reviewer: dpoReviewer,
        dpo_review_date: dpoReviewDate,
        approver_name: approverName,
        approver_position: approverPosition,
        approval_date: approvalDate,
        // F19 — recorded, never inferred from blank name/date fields.
        approval_status: approvalStatus,
        review_triggers: reviewTriggers,
      },
      // The server contract requires this literal at submission; the row's
      // lifecycle (paid, generated) is recorded by the backend, not here.
      stage: "submitted",
      // Tie back to the preview row for analytics
      preview_assessment_id: row.id,
  });

  // F22 — the review model: every active answer, from the payload itself.
  const reviewIntake = useMemo(() => (row ? buildIntake() : null), [
    row, useCaseConfirmed, statedPurpose, statedPurposeStatus, alternatives, specificBenefit, beneficiary, interestHolder, interestType, interestStatement,
    interestHolderOther, interestTypeOther, controllerIsPublicAuthority, publicTaskProcessing, deviceAccess, deviceAccessStrictlyNecessary,
    showMarketingBranch, marketingChannels, showMarketingConsentBasis, marketingConsentBasis, alternativesRationale, whyConsentNotUsed, dataMinimised,
    showAnalyticsBranch, pseudonymisationOptions, achievableWithoutPersonalData, achievableWithoutPersonalDataRationale, reasonableExpectation,
    reasonableExpectationDetail, collectionContext, childrenDataSubjects, childrenAgeBand, vulnerableSubjects, vulnerableSubjectsOther, potentialHarm,
    potentialHarmDetail, safeguards, safeguardsOther, additionalMitigations, optOutMechanism, optOutAvailable, relationshipCategory, scaleApprox,
    frequency, duration, potentialHarms, specialCategoryConfirmed, hasBiometric, biometricUniqueIdentification, hasSpecialCategory, art9Condition,
    statutoryRestrictions, showEmploymentBranch, employmentSafeguards, additionalContext, dpoReviewed, dpoReviewer, dpoReviewDate, approverName,
    approverPosition, approvalDate, approvalStatus, reviewTriggers,
  ]);
  const reviewSections = useMemo(() => (reviewIntake ? buildLiaReview(reviewIntake) : []), [reviewIntake]);
  const unresolvedRows = useMemo(() => liaUnresolvedRows(reviewSections), [reviewSections]);

  const jumpToField = (key: string) => {
    setReviewOpen(false);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const leaf = key.split(".").pop() ?? key;
      const el = document.querySelector<HTMLElement>(`[data-field="${leaf}"]`) ?? document.querySelector<HTMLElement>(`[data-field="${key}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el?.querySelector<HTMLElement>("input, textarea, select, button") ?? el)?.focus?.({ preventScroll: true });
    });
  };

  // Step 1 of submission: validate, then show the read-only review (F22).
  const handleSubmit = () => {
    const issue = validate();
    if (issue) {
      setValidationError(issue.message);
      fieldErrors.show(issue.fields, issue.message);
      setReviewOpen(false);
      return;
    }
    setValidationError(null);
    fieldErrors.clearAll();
    setReviewOpen(true);
    if (typeof window !== "undefined") window.requestAnimationFrame(() => document.getElementById("lia-review")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Step 2: from the review, generate. LIA F20 — the acknowledgment row
  // records the checkbox state as it was. LIA F21 — with the read-back flag
  // on, the gate settles BEFORE checkout opens; a flagged answer must be
  // revised or kept as written first.
  const openCheckoutWith = (intake_data: Record<string, unknown>) => {
    setIntakeForCheckout(intake_data);
    setPurchasing(true);
    setCheckoutOpen(true);
  };
  const handleGenerate = () => {
    const issue = validate();
    if (issue) {
      setValidationError(issue.message);
      fieldErrors.show(issue.fields, issue.message);
      setReviewOpen(false);
      return;
    }
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    void logToolAcknowledgment("li_assessment", user.id, row.id, { acknowledged });
    const intake_data = buildIntake();
    if (V3_READBACK_ENABLED) {
      setGateSettled(null);
      setAwaitingGate(true);
      setIntakeForCheckout(intake_data);
      setV3SubmitSignal((n) => n + 1);
      return;
    }
    openCheckoutWith(intake_data);
  };
  useEffect(() => {
    if (!awaitingGate || !gateSettled) return;
    setAwaitingGate(false);
    if (gateSettled.nonConforming.length > 0) {
      setValidationError(`${gateSettled.nonConforming.length} answer${gateSettled.nonConforming.length === 1 ? "" : "s"} ${gateSettled.nonConforming.length === 1 ? "was" : "were"} flagged by the read-back. Revise each one or choose "Keep as written", then generate again.`);
      setReviewOpen(false);
      return;
    }
    if (intakeForCheckout) openCheckoutWith(intakeForCheckout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingGate, gateSettled]);

  // The legacy submit body is retained below only as the shape reference for buildIntake().
  const legacyIntakeShapeReference = false;
  if (legacyIntakeShapeReference) {
    const intake_data: Record<string, unknown> = {
      // Stage A (re-sent so checkout has full picture)
      organization_name: row.organization_name,
      subject_anchor: (row as any).subject_anchor ?? null,
      processing_description: row.processing_description,
      data_categories: row.data_categories,
      relationship_type: row.relationship_type,
      jurisdictions: row.jurisdictions,
      // Stage B
      stated_purpose: statedPurpose,
      alternatives_considered: alternatives,
      purpose_details: {
        specific_benefit: specificBenefit, beneficiary, interest_holder: interestHolder, interest_type: interestType, interest_statement: interestStatement, interest_holder_other: interestHolderOther, interest_type_other: interestTypeOther, controller_is_public_authority: controllerIsPublicAuthority, public_task_processing: publicTaskProcessing,
        // DOC 189 — the device-access pair; Q2 only travels when Q1 is "Yes"
        // (a hidden answer must not outlive the question that revealed it).
        device_access: deviceAccess,
        device_access_strictly_necessary: deviceAccess === "Yes" ? deviceAccessStrictlyNecessary : "",
        // DOC 206E — N4/N4b. marketing_channels null when the marketing
        // branch is hidden; marketing_consent_basis null unless N4 includes
        // email/SMS to individuals.
        marketing_channels: showMarketingBranch ? marketingChannels : null,
        marketing_consent_basis: showMarketingBranch && showMarketingConsentBasis ? marketingConsentBasis : null,
      },
      necessity_details: {
        alternatives,
        alternatives_rationale: alternativesRationale,
        why_consent_not_used: whyConsentNotUsed,
        data_minimised: dataMinimised,
        pseudonymisation_options: showAnalyticsBranch ? pseudonymisationOptions : null,
        // DOC 206E — N6. Rationale required only when the answer is "No…";
        // otherwise sent as "" (not null — the question itself is always shown).
        achievable_without_personal_data: achievableWithoutPersonalData,
        achievable_without_personal_data_rationale:
          achievableWithoutPersonalData === "No — personal data is required (explain why below)"
            ? achievableWithoutPersonalDataRationale
            : "",
      },
      balancing_details: {
        reasonable_expectation: reasonableExpectation,
        reasonable_expectation_detail: reasonableExpectationDetail,
        collection_context: collectionContext,
        children_data_subjects: childrenDataSubjects,
        vulnerable_subjects: vulnerableSubjects,
        vulnerable_subjects_other: vulnerableSubjectsOther,
        potential_harm: potentialHarm,
        potential_harm_detail: potentialHarmDetail,
        safeguards,
        safeguards_other: safeguardsOther,
        additional_mitigations: additionalMitigations,
        opt_out_mechanism: optOutMechanism,
        opt_out_available: optOutAvailable,
        relationship_category: relationshipCategory,
        scale_approx: scaleApprox,
        frequency,
        duration,
        potential_harms: potentialHarms,
        special_category_data: hasSpecialCategory,
        // DOC 206E — N1. null when special-category data is not indicated.
        art9_condition: hasSpecialCategory ? art9Condition : null,
        statutory_restrictions: showMarketingBranch ? statutoryRestrictions : null,
        employment_safeguards: showEmploymentBranch ? employmentSafeguards : null,
        additional_context: additionalContext,
      },
      attestation: {
        dpo_reviewed: dpoReviewed,
        dpo_reviewer: dpoReviewer,
        dpo_review_date: dpoReviewDate,
        approver_name: approverName,
        approver_position: approverPosition,
        approval_date: approvalDate,
        review_triggers: reviewTriggers,
      },
      stage: "submitted",
      // Tie back to the preview row for analytics
      preview_assessment_id: row.id,
    };

    void intake_data;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`Full Legitimate Interests Assessment — $${pricing.price} | End User Privacy`}</title>
        <meta name="description" content="Adaptive three-part legitimate interest assessment. Defensible documentation reviewed with counsel." />
      </Helmet>
      <Navbar />

      <header className="bg-[#0d2a45] text-white py-10">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            Step 2 — Full assessment · ${pricing.price}{pricing.isSubscriber && pricing.standalonePrice > pricing.price ? ` (subscriber rate)` : ""}
          </span>
          <h1 className="text-hero-h1 text-white">Full Legitimate Interests Assessment</h1>
          <p className="text-slate-300 mt-2 text-sm">
            These questions track the EDPB's three-part test. We've already loaded what you told us in Step 1
            and adapted the rest to your use case ({row.preview_signal?.use_case_label}{useCaseConfirmed ? ", as you confirmed at screening" : ", as detected from your description"}).
          </p>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>


      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* LIA F01 (2026-09-15): the saved-draft choice stays visible after
            typing, and save status / failures are shown, not only logged. */}
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
        <IntakeGuidance>Answer as specifically as you can. Keep separate purposes, alternatives, safeguards and groups distinct. State when something is unknown, not yet decided or not applicable; do not guess. A blank answer means information was not provided, not that the activity or safeguard does not exist.</IntakeGuidance>
        {hasSpecialCategory && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-900" data-testid="lia-special-category-note">
            <strong>Important:</strong> <EnforcementSignalIcon signalKey="special_categories" signals={liaEnforcementSignals} /> You selected a data category that may be special-category data under Article 9.
            Article 6(1)(f) does not authorise special-category processing on its own; an Article 9(2) condition is needed as well.
            {hasBiometric ? " Biometric data is special-category data only when it is processed to uniquely identify individuals — the balancing section asks which applies." : ""}
            {" "}Record the Article 9(2) condition you rely on in the balancing section. "None identified" and "Not yet assessed" are honest answers the report records as open items, not as defects.
          </div>
        )}

        {/* LIA F07 (2026-09-15): the same three-column bench as the screening
            page — coaching (coachLead / coachBody / example / common mistake)
            on the left, the law on the right — so the configured guidance is
            actually displayed on the full intake. */}
        <BenchLayout toolType="lia" railEntry={liaRailEntry} defaultSourceUrl="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679">
        <div className="space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-5" data-rail-key="purpose" onFocusCapture={() => handleRailFocus("purpose")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 01</span>
            <h2 className="font-serif">Purpose test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — legitimate interests · Recital 47 — what constitutes legitimate interest</p>
            <p className="text-sm text-muted-foreground">Is the interest legitimate, specific and present?</p>
            <p className="text-sm text-muted-foreground mt-2">This stage establishes the purpose section of your assessment — the interest being pursued, who holds it, and the benefit it delivers.</p>
          </div>

          <div {...errAnchor("interest_holder")}>
            <Label htmlFor="lia-interest-holder" className="text-base">Whose interest is being served? *</Label>
            <select id="lia-interest-holder" value={interestHolder} onChange={(e) => setInterestHolder(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Our organisation only</option>
              <option>Our organisation and a third party (e.g. business partner)</option>
              <option>A third party we share data with</option>
              <option>The data subject themselves</option>
              <option>The wider public</option>
              <option>Other (describe below)</option>
            </select>
            {interestHolder === "Other (describe below)" && (
              <div {...errAnchor("interest_holder_other")}>
                <Label htmlFor="lia-interest-holder-other" className="text-xs mt-2 block">Name the party or organisation whose interest is served</Label>
                <input id="lia-interest-holder-other" value={interestHolderOther} onChange={(e) => setInterestHolderOther(e.target.value)} placeholder="Name the party or organisation" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background" />
              </div>
            )}
          </div>

          <div {...errAnchor("interest_type")}>
            <Label htmlFor="lia-interest-type" className="text-base">What type of interest is this? *</Label>
            <select id="lia-interest-type" value={interestType} onChange={(e) => setInterestType(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Commercial / revenue-related</option>
              <option>Operational / service delivery</option>
              <option>Security / fraud prevention</option>
              <option>Legal / regulatory compliance</option>
              <option>Public interest / societal benefit</option>
              <option>Research / product improvement</option>
              <option>Political / electoral campaigning</option>
              <option>Other (describe below)</option>
            </select>
            {interestType === "Other (describe below)" && (
              <div {...errAnchor("interest_type_other")}>
                <Label htmlFor="lia-interest-type-other" className="text-xs mt-2 block">Describe the type of interest</Label>
                <input id="lia-interest-type-other" value={interestTypeOther} onChange={(e) => setInterestTypeOther(e.target.value)} placeholder="Short description" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background" />
              </div>
            )}
          </div>

          <div {...errAnchor("interest_statement")}>
            <Label htmlFor="lia-interest-statement" className="text-base">In your own words, what is the legitimate interest you're relying on? *</Label>
            <p className="text-xs text-muted-foreground mt-1">State the interest you are pursuing and why it matters now. A specific interest gives the balancing section something to weigh.</p>
            <Textarea id="lia-interest-statement" value={interestStatement} data-v3-field="purpose_details.interest_statement" onFocusCapture={focusField("interest_statement")} onChange={(e) => setInterestStatement(e.target.value)} className="mt-2" rows={3} placeholder="One or two sentences" />
          </div>

          {/* ITEM 311 — Art. 6(1)(f) second subparagraph. Decided before the
              balance is reached, so it has to be on the record. */}
          <div>
            <Label htmlFor="lia-public-authority" className="text-base">Is your organisation a public authority?</Label>
            <p className="text-xs text-muted-foreground mt-1">Article 6(1)(f) is not available to public authorities for processing carried out in the performance of their tasks. Whether a body is a public authority is decided under the national law that applies to it; a private company delivering a public service is not automatically one.</p>
            <select id="lia-public-authority" value={controllerIsPublicAuthority} onFocusCapture={focusField("controller_is_public_authority")} onChange={(e) => setControllerIsPublicAuthority(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          {controllerIsPublicAuthority === "Yes" && (
            <div>
              <Label htmlFor="lia-public-task" className="text-base">Is this processing carried out in the performance of your public tasks?</Label>
              <p className="text-xs text-muted-foreground mt-1">If it is, legitimate interests is not available for it; the basis is then found under national law, usually Article 6(1)(e) or (c). Answer for the task and its legal foundation separately from your status above.</p>
              <select id="lia-public-task" value={publicTaskProcessing} onFocusCapture={focusField("public_task_processing")} onChange={(e) => setPublicTaskProcessing(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not applicable</option>
              </select>
            </div>
          )}

          {/* DOC 189 (2026-09-05, CEO-approved wording) — the ePrivacy
              availability gate's own two questions. Q1 always shown; Q2 only
              when Q1 is "Yes". The gate reads these ahead of its lexicons. */}
          <div>
            <Label htmlFor="lia-device-access" className="text-base">Does this processing store information on, or read information from, people's phones, computers or browsers?</Label>
            <p className="text-xs text-muted-foreground mt-1">Cookies, pixels and web beacons, SDK or advertising identifiers, and device or browser fingerprinting all count, whether or not the person notices. Answer for the processing described above, not for your website generally.</p>
            <select id="lia-device-access" value={deviceAccess} onFocusCapture={focusField("device_access")} onChange={(e) => setDeviceAccess(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not sure</option>
            </select>
          </div>

          {deviceAccess === "Yes" && (
            <div>
              <Label htmlFor="lia-device-necessity" className="text-base">Is that device access limited to what is strictly necessary to provide a service the person has asked for?</Label>
              <p className="text-xs text-muted-foreground mt-1">Under the EU ePrivacy rules, strictly necessary means the service the person asked for cannot be delivered without it — keeping someone signed in, remembering a basket, protecting their account. The UK rules (PECR, with the ICO's storage-and-access guidance finalised on 29 April 2026) contain further exemptions. Answer for the jurisdictions you selected; do not assume analytics, advertising or personalisation qualify under either regime.</p>
              <select id="lia-device-necessity" value={deviceAccessStrictlyNecessary} onFocusCapture={focusField("device_access_strictly_necessary")} onChange={(e) => setDeviceAccessStrictlyNecessary(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                <option>Yes — all of it is strictly necessary</option>
                <option>No — some or all of it goes further</option>
                <option>Not sure</option>
              </select>
            </div>
          )}

          <div {...errAnchor("stated_purpose")}>
            <Label htmlFor="lia-stated-purpose" className="text-base">How would you state this purpose to data subjects in a privacy notice? *</Label>
            <p className="text-xs text-muted-foreground mt-1">Give the wording as it appears, or would appear, in the notice — plain language, the same scope as the interest above — and record its status below. The transparency analysis compares this wording with the interest you described; it reads the status beside the words rather than treating proposed copy as a disclosure already made.</p>
            <Textarea id="lia-stated-purpose" value={statedPurpose} data-v3-field="purpose_details.stated_purpose" onFocusCapture={focusField("stated_purpose")} onChange={(e) => setStatedPurpose(e.target.value)} className="mt-2" rows={3} placeholder="One or two sentences" />
          </div>

          {/* LIA F11 (2026-09-15) — the wording's status, recorded rather than assumed. */}
          <div {...errAnchor("stated_purpose_status")}>
            <Label htmlFor="lia-stated-purpose-status" className="text-base">Is that wording published, proposed or not yet drafted? *</Label>
            <select id="lia-stated-purpose-status" value={statedPurposeStatus} onFocusCapture={focusField("stated_purpose")} onChange={(e) => setStatedPurposeStatus(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {STATED_PURPOSE_STATUS_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          {/* UPGRADE-4 — benefit and beneficiary */}
          <div>
            <Label htmlFor="lia-specific-benefit" className="text-base">What specific benefit does this processing deliver?</Label>
            <p className="text-xs text-muted-foreground mt-1">Name the outcome, not the activity — what changes because this processing happens.</p>
            <Textarea id="lia-specific-benefit" value={specificBenefit} data-v3-field="purpose_details.specific_benefit" onFocusCapture={focusField("specific_benefit")} onChange={(e) => setSpecificBenefit(e.target.value)} className="mt-2" rows={2}
              placeholder="One sentence" />
          </div>

          <div>
            <Label htmlFor="lia-beneficiary" className="text-base">Who receives that benefit?</Label>
            <select id="lia-beneficiary" value={beneficiary} onFocusCapture={focusField("beneficiary")} onChange={(e) => setBeneficiary(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Our business</option>
              <option>The individuals whose data is processed</option>
              <option>A third party</option>
              <option>Our business and the individuals</option>
              <option>Our business and a third party</option>
            </select>
          </div>

          {showMarketingBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label htmlFor="lia-statutory-restrictions" className="text-base">Are there sector or jurisdiction-specific restrictions?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Rules that sit on top of Article 6(1)(f) for this activity — ePrivacy or PECR rules for electronic marketing, national unfair-competition rules, restrictions on marketing to children. Left blank, the report records that no sector or jurisdiction-specific restrictions were supplied.
              </p>
              <Textarea id="lia-statutory-restrictions" value={statutoryRestrictions} data-v3-field="purpose_details.statutory_restrictions" onChange={(e) => setStatutoryRestrictions(e.target.value)} rows={2} placeholder="One line per restriction" />
            </div>
          )}

          {/* DOC 206E (N4) — direct-marketing channels (family F2). */}
          {showMarketingBranch && (
            <div className="border-l-2 border-amber-300 pl-4" {...errAnchor("marketing_channels")}>
              <Label id="lia-marketing-channels-label" className="text-base">Which channels does the direct marketing use? *</Label>
              <p className="text-xs text-muted-foreground mt-1">"None of these" is a complete answer and clears the other selections.</p>
              <div className="mt-2" onFocusCapture={focusField("marketing_channels")}>
                <Pills options={MARKETING_CHANNELS} value={marketingChannels} onChange={setMarketingChannels} labelledBy="lia-marketing-channels-label" exclusive={[MARKETING_CHANNELS_EXCLUSIVE]} />
              </div>

              {/* DOC 206E (N4b) — shown only when N4 includes email/SMS. */}
              {showMarketingConsentBasis && (
                <div className="mt-4" {...errAnchor("marketing_consent_basis")}>
                  <Label htmlFor="lia-marketing-consent-basis" className="text-base">For e-mail or SMS marketing to individuals, what permission has been obtained? *</Label>
                  <p className="text-xs text-muted-foreground mt-1">The soft opt-in routes are UK PECR reg. 22(3) and EU ePrivacy Art. 13(2) concepts with their own conditions; selecting one records the route you rely on, not that its conditions are met.</p>
                  <select id="lia-marketing-consent-basis" value={marketingConsentBasis} onFocusCapture={focusField("marketing_consent_basis")} onChange={(e) => setMarketingConsentBasis(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option value="">Select…</option>
                    {MARKETING_CONSENT_BASES.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Necessity */}
        <section className="bg-card border rounded-lg p-6 space-y-5" data-rail-key="necessity" onFocusCapture={() => handleRailFocus("necessity")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 02</span>
            <h2 className="font-serif">Necessity test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — processing must be necessary · EDPB WP29 Opinion 06/2014 — necessity standard</p>
            <p className="text-sm text-muted-foreground">Is processing necessary, and is the data minimum?</p>
            <p className="text-sm text-muted-foreground mt-2">This stage establishes the necessity section — the alternatives you tested and the limits you set on the data used.</p>
          </div>

          <div {...errAnchor("alternatives")}>
            <Label htmlFor="lia-alternatives" className="text-base">What alternatives have you considered? *</Label>
            <p className="text-xs text-muted-foreground mt-1">List each route you considered, one per line, including any that would work and any you have not yet assessed. An alternative that achieves the purpose is a finding the assessment records, not a failure.</p>
            <Textarea id="lia-alternatives" value={alternatives} data-v3-field="necessity_details.alternatives" onFocusCapture={focusField("alternatives")} onChange={(e) => setAlternatives(e.target.value)} className="mt-2" rows={3}
              placeholder="One alternative per line" />
          </div>

          {/* UPGRADE-4 — what each alternative delivers and where it falls short (LIA F15). */}
          <div>
            <Label htmlFor="lia-alternatives-rationale" className="text-base">For each alternative, why would it not achieve the purpose?</Label>
            <p className="text-xs text-muted-foreground mt-1">Take them one at a time, on separate lines. Say what each alternative achieves, what it would not deliver, and the evidence for that. If one works, say so.</p>
            <Textarea id="lia-alternatives-rationale" value={alternativesRationale} data-v3-field="necessity_details.alternatives_rationale" onFocusCapture={focusField("alternatives_rationale")} onChange={(e) => setAlternativesRationale(e.target.value)} className="mt-2" rows={3}
              placeholder={"One alternative per line: what it delivers, where it falls short"} />
          </div>

          {/* DOC 206E (N6) — achievable without personal data (family F6). */}
          <div {...errAnchor("achievable_without_personal_data")}>
            <Label htmlFor="lia-achievable" className="text-base">Could this purpose be achieved without personal data, or with anonymised or synthetic data? *</Label>
            <select id="lia-achievable" value={achievableWithoutPersonalData} onFocusCapture={focusField("achievable_without_personal_data")} onChange={(e) => setAchievableWithoutPersonalData(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {ACHIEVABLE_WITHOUT_PERSONAL_DATA.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
            {achievableWithoutPersonalData === "No — personal data is required (explain why below)" && (
              <Textarea
                aria-label="Explain why personal data is required"
                {...errAnchor("achievable_without_personal_data_rationale")}
                value={achievableWithoutPersonalDataRationale}
                data-v3-field="necessity_details.achievable_without_personal_data_rationale"
                onFocusCapture={focusField("achievable_without_personal_data_rationale")}
                onChange={(e) => setAchievableWithoutPersonalDataRationale(e.target.value)}
                className="mt-2"
                rows={2}
                placeholder="Explain why personal data is required"
              />
            )}
          </div>

          <div>
            <Label htmlFor="lia-why-consent" className="text-base">Why isn't consent appropriate here?</Label>
            <p className="text-xs text-muted-foreground mt-1">Say what you considered — consent, contract or another basis — and why the proposed basis fits. There is no hierarchy of lawful bases: a workable consent route does not by itself rule out legitimate interests, though any separate consent requirement (for example under the ePrivacy rules) still applies. Left blank, the report records that the alternatives to this basis were not described.</p>
            <Textarea id="lia-why-consent" value={whyConsentNotUsed} data-v3-field="necessity_details.why_consent_not_used" onFocusCapture={focusField("why_consent_not_used")} onChange={(e) => setWhyConsentNotUsed(e.target.value)} className="mt-2" rows={2}
              placeholder="Two or three sentences" />
          </div>

          <div>
            <Label htmlFor="lia-data-minimised" className="text-base">How have you minimised the data used?</Label>
            <p className="text-xs text-muted-foreground mt-1">Name what you excluded as well as what you kept — fields dropped, windows shortened, enrichment declined. The report records what you state here; it does not verify it.</p>
            <Textarea id="lia-data-minimised" value={dataMinimised} data-v3-field="necessity_details.data_minimised" onFocusCapture={focusField("data_minimised")} onChange={(e) => setDataMinimised(e.target.value)} className="mt-2" rows={2}
              placeholder="Two or three sentences" />
          </div>

          {showAnalyticsBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">Could pseudonymisation or aggregation achieve the same result?</Label>
              <AssistedInput
                className="mt-2"
                value={pseudonymisationOptions}
                onChange={setPseudonymisationOptions}
                pills={ASSISTED_INPUT_REGISTRY.pseudonymisationOptions.pills}
              />
            </div>
          )}
        </section>

        {/* Balancing */}
        <section className="bg-card border rounded-lg p-6 space-y-5" data-rail-key="balancing" onFocusCapture={() => handleRailFocus("balancing")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 03</span>
            <h2 className="font-serif">Balancing test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — interests or fundamental rights · Recital 47 — reasonable expectations of data subjects</p>
            <p className="text-sm text-muted-foreground">Do data subjects' interests, rights and freedoms override yours?</p>
            <p className="text-sm text-muted-foreground mt-2">This stage establishes the balancing section — expectations, impact, safeguards, and the right to object weighed against the interest.</p>
          </div>

          {/* DOC 206E (N1) — Article 9(2) condition. Shown only when
              hasSpecialCategory is true (family F3): Art. 6(1)(f) alone
              never authorises special-category data. */}
          {/* LIA F12 (2026-09-15) — Art. 9(1) reaches biometric data only when
              it is processed to uniquely identify a natural person. The
              classification is confirmed here, not assumed from the category. */}
          {hasBiometric && (
            <div {...errAnchor("biometric_unique_identification")}>
              <Label htmlFor="lia-biometric-unique" className="text-base">Is the biometric data used to uniquely identify individuals? *</Label>
              <p className="text-xs text-muted-foreground mt-1">Article 9(1) covers biometric data "for the purpose of uniquely identifying a natural person" (for example facial recognition or fingerprint matching). Biometric-derived data used for other purposes is not special-category data under Article 9, although it remains personal data.</p>
              <select id="lia-biometric-unique" value={biometricUniqueIdentification} onFocusCapture={focusField("art9_condition")} onChange={(e) => setBiometricUniqueIdentification(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                {BIOMETRIC_UNIQUE_ID_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          {hasSpecialCategory && (
            <div {...errAnchor("art9_condition")}>
              <Label htmlFor="lia-art9" className="text-base">Which Article 9(2) condition applies to the special-category data? *</Label>
              <p className="text-xs text-muted-foreground mt-1">Article 6(1)(f) does not authorise special-category data on its own; an Article 9(2) condition is needed as well. Select the condition you rely on. "None identified" and "Not yet assessed" are honest answers the report records as open items{hasBiometric ? "; if the biometric data is not used to uniquely identify individuals, select the \"Not applicable\" option" : ""}.</p>
              <select id="lia-art9" value={art9Condition} onFocusCapture={focusField("art9_condition")} onChange={(e) => setArt9Condition(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                {ART9_CONDITIONS.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          {/* UPGRADE-4 — relationship category, stated rather than inferred (LIA F16: mixed and other allowed) */}
          <div>
            <Label htmlFor="lia-relationship-category" className="text-base">What is your relationship with these individuals?</Label>
            <p className="text-xs text-muted-foreground mt-1">Recital 47 weighs reasonable expectations against the relationship. Name it here rather than leaving it to be derived; where more than one relationship applies, say so.</p>
            <select id="lia-relationship-category" value={relationshipCategory} onFocusCapture={focusField("relationship_category")} onChange={(e) => setRelationshipCategory(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {RELATIONSHIP_CATEGORY_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          <div {...errAnchor("reasonable_expectation")}>
            <Label htmlFor="lia-reasonable-expectation" className="text-base">Would data subjects reasonably expect this processing? *</Label>
            <select id="lia-reasonable-expectation" value={reasonableExpectation} onFocusCapture={focusField("reasonable_expectation")} onChange={(e) => setReasonableExpectation(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes — directly contemplated by our existing relationship</option>
              <option>Probably — disclosed in privacy notice and consistent with the relationship</option>
              <option>Maybe — they may not have anticipated this specific use</option>
              <option>Unlikely — this would surprise most data subjects</option>
              <option>No — we have no relationship with these individuals; they would not expect this</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">Give the reasoning behind that answer — the terms they accepted, the sector norm, the visibility of the control. The selection alone is a conclusion; the balancing section weighs the evidence for it. Where you are unsure, say so.</p>
            <Textarea aria-label="Reasoning behind the reasonable-expectation answer" value={reasonableExpectationDetail} data-v3-field="balancing_details.reasonable_expectation_detail" onFocusCapture={focusField("reasonable_expectation_detail")} onChange={(e) => setReasonableExpectationDetail(e.target.value)} placeholder="Two or three sentences" className="mt-2" rows={2} />
          </div>

          {/* ITEM 311 — Recital 47 turns on the relationship and the time and
              context of collection, which the enum above does not supply. */}
          <div>
            <Label htmlFor="lia-collection-context" className="text-base">When and in what setting was this data collected?</Label>
            <p className="text-xs text-muted-foreground mt-1">Recital 47 asks what the individual could expect <em>at the time and in the context of collection</em>. Describe the moment and the relationship — not what your notice says.</p>
            <Textarea id="lia-collection-context" value={collectionContext} data-v3-field="balancing_details.collection_context" onFocusCapture={focusField("collection_context")} onChange={(e) => setCollectionContext(e.target.value)} placeholder="Describe each occasion" className="mt-2" rows={3} />
          </div>

          <div>
            <Label htmlFor="lia-children" className="text-base">Are any data subjects children?</Label>
            <p className="text-xs text-muted-foreground mt-1">Article 6(1)(f) names children's interests expressly ("in particular where the data subject is a child"). This is a separate question from the Article 8 consent age.</p>
            <select id="lia-children" value={childrenDataSubjects} onFocusCapture={focusField("children_data_subjects")} onChange={(e) => setChildrenDataSubjects(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>No</option>
              <option>Yes</option>
              <option>Unknown</option>
            </select>
          </div>

          {/* LIA F05 (2026-09-15) — the age range is asked; nothing infers "under 16" from a general Yes. */}
          {childrenDataSubjects === "Yes" && (
            <div {...errAnchor("children_age_band")}>
              <Label htmlFor="lia-children-age-band" className="text-base">Which age range? *</Label>
              <p className="text-xs text-muted-foreground mt-1">Give the range you actually know. "Not known" is a complete answer; the report records the uncertainty rather than assuming an age.</p>
              <select id="lia-children-age-band" value={childrenAgeBand} onFocusCapture={focusField("children_data_subjects")} onChange={(e) => setChildrenAgeBand(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                {CHILDREN_AGE_BAND_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          <div>
            <Label id="lia-vulnerable-label" className="text-base">Are vulnerable groups involved? (select all that apply)</Label>
            <p className="text-xs text-muted-foreground mt-1">"None" is a complete answer and clears the other selections.</p>
            {/* INTAKE-4e — prefill as confirmation. LIA F05 (2026-09-15): the
                shortcut copies the age range you recorded above — "Children
                under 16" only when the range says so; otherwise the matching
                children option. Nothing is stored until you click. */}
            {childrenDataSubjects === "Yes" && childrenAgeBand && (() => {
              const target = childrenAgeBand === "Under 13" || childrenAgeBand === "13 to 15"
                ? "Children under 16"
                : childrenAgeBand === "16 to 17" ? "Children aged 16 or 17" : "Children (age range not established)";
              if (vulnerableSubjects.includes(target)) return null;
              return (
                <button
                  type="button"
                  onClick={() => setVulnerableSubjects([...vulnerableSubjects.filter((v) => v !== VULNERABLE_GROUP_EXCLUSIVE), target])}
                  className="mt-2 text-xs underline text-primary"
                >
                  Use my earlier answer — add “{target}”
                </button>
              );
            })()}
            <div className="mt-2">
              <Pills
                options={VULNERABLE_GROUP_OPTS}
                value={vulnerableSubjects}
                onChange={setVulnerableSubjects}
                labelledBy="lia-vulnerable-label"
                exclusive={[VULNERABLE_GROUP_EXCLUSIVE]}
              />
            </div>
            {vulnerableSubjects.includes("Other") && (
              <input aria-label="Name the vulnerable group" value={vulnerableSubjectsOther} onChange={(e) => setVulnerableSubjectsOther(e.target.value)} placeholder="Name the group" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>


          <div {...errAnchor("potential_harm")}>
            <Label htmlFor="lia-potential-harm" className="text-base">If something went wrong, what's the worst-case impact on data subjects? *</Label>
            <select id="lia-potential-harm" value={potentialHarm} onFocusCapture={focusField("potential_harm")} onChange={(e) => setPotentialHarm(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {POTENTIAL_HARM_SEVERITY_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-2">Describe the harms you considered and who would bear them, including any you ruled out. A severity label with no pathway behind it gives the balance nothing to weigh on the individual's side.</p>
            <Textarea aria-label="Harms considered and who would bear them" value={potentialHarmDetail} data-v3-field="balancing_details.potential_harms" onFocusCapture={focusField("potential_harms")} onChange={(e) => setPotentialHarmDetail(e.target.value)} placeholder="Two or three sentences" className="mt-2" rows={2} />
          </div>

          {/* UPGRADE-4 — how large, how often, how long */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lia-scale" className="text-base">Approximately how many people?</Label>
              <input id="lia-scale" value={scaleApprox} onFocusCapture={focusField("scale_frequency_duration")} onChange={(e) => setScaleApprox(e.target.value)} placeholder="Approximate number, or 'not known'" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label htmlFor="lia-frequency" className="text-base">How often does it run?</Label>
              <input id="lia-frequency" value={frequency} onFocusCapture={focusField("scale_frequency_duration")} onChange={(e) => setFrequency(e.target.value)} placeholder="How often" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label htmlFor="lia-duration" className="text-base">How long is the data held for this purpose?</Label>
              <input id="lia-duration" value={duration} onFocusCapture={focusField("scale_frequency_duration")} onChange={(e) => setDuration(e.target.value)} placeholder="Period" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          {/* UPGRADE-4 — harms as separate items, feeding the balance directly */}
          <div>
            <Label id="lia-harms-label" className="text-base">Which harms could this processing cause? (select all that apply)</Label>
            <p className="text-xs text-muted-foreground mt-1">"None identified" and "Unknown" are complete answers and clear the other selections.</p>
            {/* INTAKE-4e / LIA F06 (2026-09-15) — keyword matches in your
                narrative above, shown with the sentence each came from. A harm
                your narrative rules out is shown as ruled out and is never
                offered. Each suggestion is added by its own click. */}
            {potentialHarms.length === 0 && harmSuggestions(potentialHarmDetail).length > 0 && (
              <div className="mt-2 rounded-md border bg-muted/20 p-3 text-xs space-y-2" data-testid="lia-harm-suggestions">
                <p className="font-medium">Start from my earlier answer — keyword matches in your narrative, for review:</p>
                <ul className="space-y-1">
                  {harmSuggestions(potentialHarmDetail).map((s) => (
                    <li key={s.option} className="flex flex-wrap items-baseline gap-2">
                      <span className={s.negated ? "text-muted-foreground line-through" : ""}>{s.option}</span>
                      <span className="text-muted-foreground">— from “{s.sentence}”{s.negated ? " (your narrative rules this out; not suggested)" : ""}</span>
                      {!s.negated && (
                        <button type="button" className="underline text-primary" onClick={() => setPotentialHarms([...potentialHarms.filter((v) => !HARM_EXCLUSIVE.includes(v)), s.option])}>Add</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2" onFocusCapture={focusField("potential_harms")}>
              <Pills
                options={HARM_OPTS}
                value={potentialHarms}
                onChange={setPotentialHarms}
                labelledBy="lia-harms-label"
                exclusive={HARM_EXCLUSIVE}
              />
            </div>
          </div>

          <div>
            <Label id="lia-safeguards-label" className="text-base">Which safeguards are in place? (select all that apply)</Label>
            <p className="text-xs text-muted-foreground mt-1">Select only what protects this processing today. Planned measures belong in the next field with their status stated. "None in place yet" is a complete answer.</p>
            <div className="mt-2" onFocusCapture={focusField("safeguards")}>
              <Pills
                options={SAFEGUARD_OPTS}
                value={safeguards}
                onChange={setSafeguards}
                labelledBy="lia-safeguards-label"
                exclusive={[SAFEGUARD_EXCLUSIVE]}
              />
            </div>
            {safeguards.includes("Other") && (
              <input aria-label="Name the other safeguard" value={safeguardsOther} onChange={(e) => setSafeguardsOther(e.target.value)} placeholder="Name the safeguard" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>

          {/* ITEM 311 — mitigations, kept separate from safeguards. LIA F13
              (2026-09-15): EDPB Guidelines 1/2024 distinguish additional
              mitigating measures from baseline compliance without ruling
              out that a measure can go beyond the baseline. */}
          <div>
            <Label htmlFor="lia-additional-mitigations" className="text-base">What measures have you added specifically to reduce the impact on individuals?</Label>
            <p className="text-xs text-muted-foreground mt-1">Name the measures you have added for this processing beyond your baseline obligations, with their status (in place or planned). Baseline measures such as encryption, access control and retention limits belong in the safeguards list above; the assessment weighs what goes beyond the baseline, and a measure can do so in how far it is taken.</p>
            <Textarea id="lia-additional-mitigations" value={additionalMitigations} data-v3-field="balancing_details.additional_mitigations" onFocusCapture={focusField("additional_mitigations")} onChange={(e) => setAdditionalMitigations(e.target.value)} placeholder="One measure per line, with its status" className="mt-2" rows={3} />
          </div>

          <div>
            <Label htmlFor="lia-additional-context" className="text-base">Anything else about this processing we should weigh?</Label>
            <p className="text-xs text-muted-foreground mt-1">Sector rules, a pending change, a prior complaint, a dependency on a processor. Optional; left blank, the report records that no additional context was supplied.</p>
            <Textarea id="lia-additional-context" value={additionalContext} data-v3-field="balancing_details.additional_context" onFocusCapture={focusField("additional_context")} onChange={(e) => setAdditionalContext(e.target.value)} className="mt-2" rows={3} placeholder="Optional" />
          </div>

          {/* UPGRADE-4 — availability, separate from the mechanism */}
          <div>
            <Label htmlFor="lia-opt-out-available" className="text-base">Is an opt-out available to individuals?</Label>
            <p className="text-xs text-muted-foreground mt-1">Article 21(2)–(3) gives an unconditional right to object to direct marketing; other Article 21(1) objections are decided on compelling legitimate grounds. Answer for what you offer today; "No opt-out is available" is a complete answer.</p>
            <select id="lia-opt-out-available" value={optOutAvailable} onFocusCapture={focusField("opt_out_available")} onChange={(e) => setOptOutAvailable(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes — unconditional, on request, with no consequence</option>
              <option>Yes — but conditional or subject to review</option>
              <option>No opt-out is available</option>
            </select>
          </div>

          <div {...errAnchor("opt_out_mechanism")}>
            <Label className="text-base">How can data subjects object or opt out? *</Label>
            <p className="text-xs text-muted-foreground mt-1">Describe how people can exercise applicable objection rights, including where to send a request, who handles it and what happens next. Distinguish direct-marketing objections from other Article 21 objections; explain any applicable conditions rather than calling every objection unconditional.</p>
            {/* INTAKE-4e — prefill as confirmation from the availability answer
                above. Click-gated; the customer edits or replaces the text. */}
            {optOutAvailable === "No opt-out is available" && !optOutMechanism.trim() && (
              <button
                type="button"
                onClick={() => setOptOutMechanism("No opt-out is available. ")}
                className="mt-2 text-xs underline text-primary"
              >
                Start from my earlier answer
              </button>
            )}
            <div onFocusCapture={focusField("opt_out_mechanism")}>

              <AssistedInput
                className="mt-2"
                value={optOutMechanism}
                onChange={setOptOutMechanism}
                pills={ASSISTED_INPUT_REGISTRY.optOutMechanism.pills}
                placeholder="Route, effort, response time"
              />
            </div>
          </div>

          {showEmploymentBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">What safeguards address the employment power imbalance?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                The employment relationship carries an imbalance of power, so regulators expect proportionate safeguards: works-council consultation where it applies, advance transparency, no covert monitoring, and limits on use against the employee. Left blank, the report records that no safeguards were described for the power imbalance.
              </p>
              <AssistedInput
                className="mt-2"
                value={employmentSafeguards}
                onChange={setEmploymentSafeguards}
                pills={ASSISTED_INPUT_REGISTRY.employmentSafeguards.pills}
              />
            </div>
          )}
        </section>

        {/* UPGRADE-4 — attestation and review (house pattern) */}
        <section className="bg-card border rounded-lg p-6 space-y-5" data-rail-key="attestation" onFocusCapture={() => { setActiveFieldRailKey("attestation_block"); }}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 04</span>
            <h2 className="font-serif">Attestation and review</h2>
            <p className="text-sm text-muted-foreground">Who reviewed and approved this assessment, and what would cause you to run it again.</p>
            <p className="text-sm text-muted-foreground mt-2">Record whether the assessment has been reviewed, who reviewed and approved it, the relevant dates, and the events that would prompt another review. If review or approval has not happened, leave the corresponding name and date blank and record the status accurately. Missing information is reported as not provided, not as proof that no review or decision occurred.</p>
          </div>

          <div>
            <Label htmlFor="lia-dpo-reviewed" className="text-base">Has the data protection function reviewed this assessment?</Label>
            <select id="lia-dpo-reviewed" value={dpoReviewed} onChange={(e) => setDpoReviewed(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
              <option>Planned</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lia-dpo-reviewer" className="text-base">Reviewer{dpoReviewed === "Planned" ? " (planned)" : ""}</Label>
              <input id="lia-dpo-reviewer" value={dpoReviewer} onFocusCapture={focusField("attestation_dpo_review")} onChange={(e) => setDpoReviewer(e.target.value)} placeholder="Full name" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label htmlFor="lia-dpo-review-date" className="text-base">Date of review{dpoReviewed === "Planned" ? " (planned)" : ""}</Label>
              <input id="lia-dpo-review-date" type="date" value={dpoReviewDate} onChange={(e) => setDpoReviewDate(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          {/* LIA F19 (2026-09-15) — the approval state is recorded, not inferred from blank name and date fields. */}
          <div>
            <Label htmlFor="lia-approval-status" className="text-base">Approval status</Label>
            <select id="lia-approval-status" value={approvalStatus} onFocusCapture={focusField("attestation_approver")} onChange={(e) => setApprovalStatus(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {APPROVAL_STATUS_OPTS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
            {!approvalStatus && !approverName.trim() && !approvalDate && (
              <p className="text-xs text-muted-foreground mt-1">Review or approval details were not provided.</p>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lia-approver-name" className="text-base">Approved by</Label>
              <input id="lia-approver-name" value={approverName} onFocusCapture={focusField("attestation_approver")} onChange={(e) => setApproverName(e.target.value)} placeholder="Name" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label htmlFor="lia-approver-position" className="text-base">Title</Label>
              <input id="lia-approver-position" value={approverPosition} onChange={(e) => setApproverPosition(e.target.value)} placeholder="Job title" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label htmlFor="lia-approval-date" className="text-base">Date of approval</Label>
              <input id="lia-approval-date" type="date" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          <div>
            <Label id="lia-review-triggers-label" className="text-base">What would trigger a re-review? (select all that apply)</Label>
            <p className="text-xs text-muted-foreground mt-1">The triggers you select are recorded in the assessment as the circumstances the company itself has identified for early re-review.</p>
            <div className="mt-2" onFocusCapture={focusField("attestation_review_triggers")}>
              <Pills
                labelledBy="lia-review-triggers-label"
                options={[
                  "A change in the purpose of the processing",
                  "A change in the categories of data used",
                  "A new category of data subject",
                  "A change of processor or recipient",
                  "New or amended regulatory guidance",
                  "An objection or complaint from a data subject",
                  "A personal data breach affecting this processing",
                ]}
                value={reviewTriggers}
                onChange={setReviewTriggers}
              />
            </div>
          </div>
        </section>

        {/* DOC 217 §6 — the V3 read-back, mounted once (dark behind
            VITE_LIA_V3_READBACK_ENABLED). Its panels render inline under the
            field they concern; the gate runs at submit only (LIA F21: the
            page waits for it to settle before opening checkout). */}
        {V3_READBACK_ENABLED && (
          <V3ReadBack
            assessmentId={row.id}
            fields={v3Fields}
            submitSignal={v3SubmitSignal}
            closedAnswers={{
              "balancing_details.reasonable_expectation": reasonableExpectation,
              "balancing_details.potential_harm": potentialHarm,
              "balancing_details.children_data_subjects": childrenDataSubjects,
              "balancing_details.opt_out_available": optOutAvailable,
              "purpose_details.device_access": deviceAccess,
              "purpose_details.controller_is_public_authority": controllerIsPublicAuthority,
              "necessity_details.achievable_without_personal_data": achievableWithoutPersonalData,
              "balancing_details.relationship_category": relationshipCategory,
            }}
            onGateSettled={(r) => setGateSettled(r)}
          />
        )}

        {/* LIA F22 (2026-09-15) — the read-only review of every active answer,
            with Edit links and the unresolved items, before checkout. */}
        {reviewOpen && reviewIntake && (
          <section id="lia-review" className="bg-card border rounded-lg p-6 space-y-4" aria-labelledby="lia-review-heading">
            <div>
              <span className="text-xs uppercase tracking-wider text-primary font-semibold">Review</span>
              <h2 id="lia-review-heading" className="font-serif">Review your answers</h2>
              <p className="text-sm text-muted-foreground">Every answer on your current path is listed below. Use Edit to return to a question. The report analyses the information you provide; an unanswered item is recorded as not provided, and does not by itself establish or defeat compliance.</p>
            </div>
            {unresolvedRows.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-3 text-[12px]" data-testid="lia-review-unresolved">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Unanswered on your current path ({unresolvedRows.length})</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {unresolvedRows.map((r) => (
                    <li key={r.key}>{r.label} — <button type="button" className="underline" onClick={() => jumpToField(r.key)}>Edit</button></li>
                  ))}
                </ul>
              </div>
            )}
            {reviewSections.map((sec) => (
              <div key={sec.id} className="rounded-lg border divide-y text-sm">
                <p className="px-4 py-2 font-medium text-[13px] bg-muted/30">{sec.title}</p>
                {sec.rows.filter((r) => r.state !== "inactive").map((r) => (
                  <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 px-4 py-2" data-review-key={r.key} data-review-state={r.state}>
                    <div className="text-muted-foreground text-[12px]">{r.label}</div>
                    <div className={`break-words text-[13px] ${r.state === "unanswered" ? "italic text-muted-foreground" : ""}`}>{r.state === "unanswered" ? "Not provided" : r.text}</div>
                    <div><button type="button" className="text-[12px] underline text-muted-foreground" onClick={() => jumpToField(r.key)} aria-label={`Edit ${r.label}`}>Edit</button></div>
                  </div>
                ))}
              </div>
            ))}
            <p className="text-[12px] text-muted-foreground">
              Attestation: {approvalStatus || "approval status not provided"}{dpoReviewed ? `; data protection review: ${dpoReviewed}` : "; data protection review not provided"}.
            </p>
          </section>
        )}

        <section className="bg-card border rounded-lg p-6">
          <ValidationErrorSummary message={validationError} fieldKey={fieldErrors.fields[0] ?? null} className="mb-4" />
          <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />

          {!reviewOpen ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={purchasing || awaitingGate}
              className="mt-4 w-full px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              Review my answers
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={purchasing || awaitingGate}
              className="mt-4 w-full px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {awaitingGate ? "Checking your answers…" : purchasing ? "Opening checkout…" : `Generate full assessment — $${pricing.price}`}
            </button>
          )}
          {pricing.isSubscriber && pricing.standalonePrice > pricing.price && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Subscriber rate · standalone ${pricing.standalonePrice}
            </p>
          )}
        </section>
        </div>
        </BenchLayout>



        <AuthGateModal open={authGateOpen} onClose={() => { setAuthGateOpen(false); if (!user) navigate("/li-assessment"); }} redirectTo={`/li-assessment/intake/${row.id}`} {...intakeGate("li_assessment")} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="li_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={intakeForCheckout ?? {}}
          onClose={() => { setCheckoutOpen(false); setPurchasing(false); }}
          onComplete={(id, _suiteCyberId, status) => {
            setCheckoutOpen(false);
            setPurchasing(false);
            // DOC 217 §6 — intake-time readings are keyed on the preview row's
            // id; checkout inserts a NEW li_assessments row, so re-key them to
            // the paid id the engine will load them by (dark; fail-open).
            if (V3_READBACK_ENABLED && id && id !== row.id) void rekeyReadings({ from_assessment_id: row.id, to_assessment_id: id });
            if (!id) return;
            // LIA F22 (2026-09-15): only a confirmed (or included) completion
            // retires the draft and marks the result purchased; a pending
            // verification keeps the draft and says so.
            if (status === "pending") { navigate(`/li-assessment/result/${id}?purchase=pending`); return; }
            void clearDraft();
            navigate(`/li-assessment/result/${id}?purchased=true`);
          }}
        />
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessmentIntake;
