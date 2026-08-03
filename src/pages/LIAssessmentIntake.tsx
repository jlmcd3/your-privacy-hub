import { useEffect, useMemo, useState } from "react";
import { useToolDraft } from "@/hooks/useToolDraft";
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
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import StatuteRail from "@/components/intake/StatuteRail";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { LIA_RAIL } from "@/components/lia/LIARailEntries";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";


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

const Pills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
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

const LIAssessmentIntake = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
  const liaRailEntry =
    (activeFieldRailKey ? LIA_RAIL[activeFieldRailKey] ?? null : null) ?? sectionRailEntry;

  const handleRailFocus = (section: "purpose" | "necessity" | "balancing") => {
    setActiveRailSection(section);
    setActiveFieldRailKey(null);
  };
  useScrollActiveRail((k) => {
    if (k === "purpose" || k === "necessity" || k === "balancing") {
      setActiveRailSection(k);
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
  const [controllerIsPublicAuthority, setControllerIsPublicAuthority] = useState("");
  const [publicTaskProcessing, setPublicTaskProcessing] = useState("");
  const [additionalMitigations, setAdditionalMitigations] = useState("");

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
  const [reviewTriggers, setReviewTriggers] = useState<string[]>([]);

  // Adaptive branches
  const [statutoryRestrictions, setStatutoryRestrictions] = useState(""); // shown for marketing / advertising
  const [pseudonymisationOptions, setPseudonymisationOptions] = useState(""); // shown for analytics / research
  const [employmentSafeguards, setEmploymentSafeguards] = useState(""); // shown for employee monitoring

  // Autosave payload — includes assessment id so a stale draft from a
  // different preview row does NOT overwrite fields on the current row.
  const draftPayload = useMemo(() => ({
    assessment_id: id,
    interestHolder, interestType, statedPurpose,
    alternatives, whyConsentNotUsed, dataMinimised,
    reasonableExpectation, vulnerableSubjects, potentialHarm, safeguards, optOutMechanism,
    interestStatement, interestHolderOther, interestTypeOther,
    reasonableExpectationDetail, potentialHarmDetail, vulnerableSubjectsOther, safeguardsOther, additionalContext,
    statutoryRestrictions, pseudonymisationOptions, employmentSafeguards,
    collectionContext, childrenDataSubjects, controllerIsPublicAuthority, publicTaskProcessing, additionalMitigations,
    specificBenefit, beneficiary, alternativesRationale, relationshipCategory,
    scaleApprox, frequency, duration, potentialHarms, optOutAvailable,
    dpoReviewed, dpoReviewer, dpoReviewDate, approverName, approverPosition, approvalDate, reviewTriggers,
  }), [
    id, interestHolder, interestType, statedPurpose, alternatives, whyConsentNotUsed, dataMinimised,
    reasonableExpectation, vulnerableSubjects, potentialHarm, safeguards, optOutMechanism,
    interestStatement, interestHolderOther, interestTypeOther,
    reasonableExpectationDetail, potentialHarmDetail, vulnerableSubjectsOther, safeguardsOther, additionalContext,
    statutoryRestrictions, pseudonymisationOptions, employmentSafeguards,
    collectionContext, childrenDataSubjects, controllerIsPublicAuthority, publicTaskProcessing, additionalMitigations,
    specificBenefit, beneficiary, alternativesRationale, relationshipCategory,
    scaleApprox, frequency, duration, potentialHarms, optOutAvailable,
    dpoReviewed, dpoReviewer, dpoReviewDate, approverName, approverPosition, approvalDate, reviewTriggers,
  ]);
  const initialLiaRef = useMemo(() => JSON.stringify({ ...draftPayload, assessment_id: id }), [id]);
  const touched = useMemo(() => JSON.stringify(draftPayload) !== initialLiaRef, [draftPayload, initialLiaRef]);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
  } = useToolDraft({
    toolType: "lia",
    clientId: clientId ?? null,
    data: draftPayload,
    currentStage: 0,
    enabled: !!user && touched && !!id,
  });
  // Suppress the banner if the saved draft belongs to a different :id.
  const draftMatchesRoute = ((restoreData as any)?.assessment_id ?? id) === id;
  const applyRestore = () => {
    if (!draftMatchesRoute) return;
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: string[]) => void) => { if (Array.isArray(v)) fn(v); };
    S(d.interestHolder, setInterestHolder);
    S(d.interestType, setInterestType);
    S(d.statedPurpose, setStatedPurpose);
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
  };


  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-preview-li-assessment", { body: { id } });
      const row = (data as any)?.row;
      if (error || !row) {
        toast({ title: "Couldn't load preview", description: "Please start again.", variant: "destructive" });
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
  const showEmploymentBranch = useCaseCode === "employee_monitoring" ||
    (row.relationship_type || "").toLowerCase().includes("employee");
  const hasSpecialCategory =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    dataCategories.includes("Biometric data");

  const validate = (): string | null => {
    if (!interestHolder) return "Tell us whose interest is being served.";
    if (!interestType) return "Tell us what type of interest this is.";
    if (!interestStatement.trim()) return "Describe, in your own words, the legitimate interest you're relying on.";
    if (interestHolder === "Other (describe below)" && !interestHolderOther.trim()) return "Please specify whose interest is being served.";
    if (interestType === "Other (describe below)" && !interestTypeOther.trim()) return "Please specify the type of interest.";
    if (!statedPurpose.trim()) return "Describe how you'd state this purpose to data subjects.";
    if (!alternatives.trim()) return "Describe alternatives you've considered.";
    if (!reasonableExpectation) return "Tell us whether data subjects would reasonably expect this.";
    if (!potentialHarm) return "Estimate the potential harm severity.";
    if (!optOutMechanism.trim()) return "Describe your opt-out / objection mechanism.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: "A few more details needed", description: err, variant: "destructive" });
      return;
    }
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    // Log the acknowledgment regardless of checkbox state
    logToolAcknowledgment("li_assessment", user.id, row.id);

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
      purpose_details: { specific_benefit: specificBenefit, beneficiary, interest_holder: interestHolder, interest_type: interestType, interest_statement: interestStatement, interest_holder_other: interestHolderOther, interest_type_other: interestTypeOther, controller_is_public_authority: controllerIsPublicAuthority, public_task_processing: publicTaskProcessing },
      necessity_details: {
        alternatives,
        alternatives_rationale: alternativesRationale,
        why_consent_not_used: whyConsentNotUsed,
        data_minimised: dataMinimised,
        pseudonymisation_options: showAnalyticsBranch ? pseudonymisationOptions : null,
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

    setIntakeForCheckout(intake_data);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`Full Legitimate Interest Assessment — $${pricing.price} | End User Privacy`}</title>
        <meta name="description" content="Adaptive three-part legitimate interest assessment. Defensible documentation reviewed with counsel." />
      </Helmet>
      <Navbar />

      <header className="bg-[#0d2a45] text-white py-10">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            Step 2 — Full assessment · ${pricing.price}{pricing.isSubscriber && pricing.standalonePrice > pricing.price ? ` (subscriber rate)` : ""}
          </span>
          <h1 className="text-hero-h1 text-white">Full Legitimate Interest Assessment</h1>
          <p className="text-slate-300 mt-2 text-sm">
            These questions track the EDPB's three-part test. We've already loaded what you told us in Step 1
            and adapted the rest to your use case ({row.preview_signal?.use_case_label}).
          </p>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>


      <main className="flex-1 max-w-[860px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <DraftRestoreBanner
          draftFound={draftFound && draftMatchesRoute}
          touched={touched}
          draftUpdatedAt={draftUpdatedAt}
          onResume={applyRestore}
          onDiscard={() => { void clearDraft(); }}
        />
        <IntakeGuidance>Answer each question as specifically and completely as you can. Where several things apply — multiple alternatives, safeguards, or vulnerable groups — list them separately rather than as one lump. Anything left blank shows up as "not addressed" in your report.</IntakeGuidance>
        {hasSpecialCategory && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-900">
            <strong>Important:</strong> <EnforcementSignalIcon signalKey="special_categories" signals={liaEnforcementSignals} /> You indicated special category data is involved. Article 6(1)(f) legitimate interest
            alone is generally insufficient — Article 9 requires an additional condition. The full assessment will flag
            this and recommend the Article 9 condition you'll need.
          </div>
        )}

        {/* Purpose */}
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-5" data-rail-key="purpose" onFocusCapture={() => handleRailFocus("purpose")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 01</span>
            <h2 className="font-serif">Purpose test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — legitimate interests · Recital 47 — what constitutes legitimate interest</p>
            <p className="text-sm text-muted-foreground">Is the interest legitimate, specific and present?</p>
          </div>

          <div>
            <Label className="text-base">Whose interest is being served? *</Label>
            <select value={interestHolder} onChange={(e) => setInterestHolder(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Our organisation only</option>
              <option>Our organisation and a third party (e.g. business partner)</option>
              <option>A third party we share data with</option>
              <option>The data subject themselves</option>
              <option>The wider public</option>
              <option>Other (describe below)</option>
            </select>
            {interestHolder === "Other (describe below)" && (
              <input value={interestHolderOther} onChange={(e) => setInterestHolderOther(e.target.value)} placeholder="Whose interest? e.g. a named third party, a political campaign…" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>

          <div>
            <Label className="text-base">What type of interest is this? *</Label>
            <select value={interestType} onChange={(e) => setInterestType(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
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
              <input value={interestTypeOther} onChange={(e) => setInterestTypeOther(e.target.value)} placeholder="Describe the type of interest in your own words" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>

          <div>
            <Label className="text-base">In your own words, what is the legitimate interest you're relying on? *</Label>
            <p className="text-xs text-muted-foreground mt-1">The interest itself — e.g. "informing local voters about a candidate," "preventing payment fraud" — not how you'd word it in a notice.</p>
            <Textarea value={interestStatement} onChange={(e) => setInterestStatement(e.target.value)} className="mt-2" rows={3} />
          </div>

          {/* ITEM 311 — Art. 6(1)(f) second subparagraph. Decided before the
              balance is reached, so it has to be on the record. */}
          <div>
            <Label className="text-base">Is your organisation a public authority?</Label>
            <p className="text-xs text-muted-foreground mt-1">Article 6(1)(f) is not available to public authorities for processing carried out in the performance of their tasks.</p>
            <select value={controllerIsPublicAuthority} onChange={(e) => setControllerIsPublicAuthority(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>

          {controllerIsPublicAuthority === "Yes" && (
            <div>
              <Label className="text-base">Is this processing carried out in the performance of your public tasks?</Label>
              <p className="text-xs text-muted-foreground mt-1">If it is, legitimate interests is unavailable and Article 6(1)(e) applies instead.</p>
              <select value={publicTaskProcessing} onChange={(e) => setPublicTaskProcessing(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not applicable</option>
              </select>
            </div>
          )}

          <div>
            <Label className="text-base">How would you state this purpose to data subjects in a privacy notice? *</Label>
            <Textarea value={statedPurpose} onChange={(e) => setStatedPurpose(e.target.value)} className="mt-2" rows={3} />
          </div>

          {/* UPGRADE-4 — benefit and beneficiary */}
          <div>
            <Label className="text-base">What specific benefit does this processing deliver?</Label>
            <p className="text-xs text-muted-foreground mt-1">Name the outcome, not the activity — what changes because this processing happens.</p>
            <Textarea value={specificBenefit} onFocusCapture={focusField("specific_benefit")} onChange={(e) => setSpecificBenefit(e.target.value)} className="mt-2" rows={2}
              placeholder="e.g. Chargeback losses on new accounts fall because high-risk signups are held before activation." />
          </div>

          <div>
            <Label className="text-base">Who receives that benefit?</Label>
            <select value={beneficiary} onFocusCapture={focusField("beneficiary")} onChange={(e) => setBeneficiary(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
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
              <Label className="text-base">Are there sector or jurisdiction-specific restrictions? *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                e.g. ePrivacy / PECR consent for electronic marketing, German UWG rules, child-directed restrictions.
              </p>
              <Textarea value={statutoryRestrictions} onChange={(e) => setStatutoryRestrictions(e.target.value)} rows={2} />
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
          </div>

          <div>
            <Label className="text-base">What alternatives have you considered? *</Label>
            <Textarea value={alternatives} onChange={(e) => setAlternatives(e.target.value)} className="mt-2" rows={3}
              placeholder="e.g. We considered consent but it would yield insufficient coverage because…" />
          </div>

          {/* UPGRADE-4 — reason each alternative is inadequate */}
          <div>
            <Label className="text-base">For each alternative, why would it not achieve the purpose?</Label>
            <p className="text-xs text-muted-foreground mt-1">Take them one at a time, on separate lines. State what outcome each alternative would fail to deliver.</p>
            <Textarea value={alternativesRationale} onFocusCapture={focusField("alternatives_rationale")} onChange={(e) => setAlternativesRationale(e.target.value)} className="mt-2" rows={3}
              placeholder={"Aggregate reporting — would not identify the individual account to hold\nManual review only — would not run at signup volume"} />
          </div>

          <div>
            <Label className="text-base">Why isn't consent appropriate here?</Label>
            <Textarea value={whyConsentNotUsed} onChange={(e) => setWhyConsentNotUsed(e.target.value)} className="mt-2" rows={2}
              placeholder="Optional — strengthens the necessity record." />
          </div>

          <div>
            <Label className="text-base">How have you minimised the data used?</Label>
            <Textarea value={dataMinimised} onChange={(e) => setDataMinimised(e.target.value)} className="mt-2" rows={2}
              placeholder="e.g. We only use the last 12 months of purchase data, no demographic enrichment." />
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
          </div>

          {/* UPGRADE-4 — relationship category, stated rather than inferred */}
          <div>
            <Label className="text-base">What is your relationship with these individuals?</Label>
            <p className="text-xs text-muted-foreground mt-1">Recital 47 weighs reasonable expectations against the relationship. Name it here rather than leaving it to be derived.</p>
            <select value={relationshipCategory} onFocusCapture={focusField("relationship_category")} onChange={(e) => setRelationshipCategory(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Customer</option>
              <option>Employee</option>
              <option>Prospect</option>
              <option>Member of the public — no relationship</option>
            </select>
          </div>

          <div>
            <Label className="text-base">Would data subjects reasonably expect this processing? *</Label>
            <select value={reasonableExpectation} onChange={(e) => setReasonableExpectation(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes — directly contemplated by our existing relationship</option>
              <option>Probably — disclosed in privacy notice and consistent with the relationship</option>
              <option>Maybe — they may not have anticipated this specific use</option>
              <option>Unlikely — this would surprise most data subjects</option>
              <option>No — we have no relationship with these individuals; they would not expect this</option>
            </select>
            <Textarea value={reasonableExpectationDetail} onChange={(e) => setReasonableExpectationDetail(e.target.value)} placeholder="Optional: briefly, why would (or wouldn't) they expect it?" className="mt-2" rows={2} />
          </div>

          {/* ITEM 311 — Recital 47 turns on the relationship and the time and
              context of collection, which the enum above does not supply. */}
          <div>
            <Label className="text-base">When and in what setting was this data collected?</Label>
            <p className="text-xs text-muted-foreground mt-1">Recital 47 asks what the individual could expect <em>at the time and in the context of collection</em>. Describe the moment and the relationship — not what your notice says.</p>
            <Textarea value={collectionContext} onChange={(e) => setCollectionContext(e.target.value)} placeholder="e.g. collected at account opening in the branch, and at each transaction the customer initiates" className="mt-2" rows={3} />
          </div>

          <div>
            <Label className="text-base">Are any data subjects children?</Label>
            <p className="text-xs text-muted-foreground mt-1">Article 6(1)(f) singles out children's interests expressly.</p>
            <select value={childrenDataSubjects} onChange={(e) => setChildrenDataSubjects(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>No</option>
              <option>Yes</option>
              <option>Unknown</option>
            </select>
          </div>

          <div>
            <Label className="text-base">Are vulnerable groups involved? (select all that apply)</Label>
            <div className="mt-2">
              <Pills
                options={["Children under 16", "Patients / health context", "Employees", "Job applicants", "Financially vulnerable", "Other", "None"]}
                value={vulnerableSubjects}
                onChange={setVulnerableSubjects}
              />
            </div>
            {vulnerableSubjects.includes("Other") && (
              <input value={vulnerableSubjectsOther} onChange={(e) => setVulnerableSubjectsOther(e.target.value)} placeholder="Describe the other vulnerable group(s)" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>

          <div>
            <Label className="text-base">If something went wrong, what's the worst-case impact on data subjects? *</Label>
            <select value={potentialHarm} onChange={(e) => setPotentialHarm(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Negligible — annoyance only</option>
              <option>Limited — minor inconvenience or unwanted contact</option>
              <option>Significant — discrimination, financial loss, reputational damage</option>
              <option>Severe — physical safety, identity theft, loss of livelihood</option>
            </select>
            <Textarea value={potentialHarmDetail} onFocusCapture={focusField("potential_harms")} onChange={(e) => setPotentialHarmDetail(e.target.value)} placeholder="Optional: what specific harms did you consider (financial, reputational, autonomy, distress…)?" className="mt-2" rows={2} />
          </div>

          {/* UPGRADE-4 — how large, how often, how long */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-base">Approximately how many people?</Label>
              <input value={scaleApprox} onChange={(e) => setScaleApprox(e.target.value)} placeholder="e.g. ~40,000 signups a year" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label className="text-base">How often does it run?</Label>
              <input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. at every signup, in real time" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label className="text-base">How long is the data held for this purpose?</Label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 24 months from the score" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          {/* UPGRADE-4 — harms as separate items, feeding the balance directly */}
          <div>
            <Label className="text-base">Which harms could this processing cause? (select all that apply)</Label>
            <div className="mt-2">
              <Pills
                options={[
                  "Financial loss",
                  "Discrimination or unfair treatment",
                  "Reputational damage",
                  "Loss of autonomy or control over data",
                  "Distress or intrusion",
                  "Exclusion from a service",
                  "Physical safety risk",
                  "Identity theft or fraud exposure",
                ]}
                value={potentialHarms}
                onChange={setPotentialHarms}
              />
            </div>
          </div>

          <div>
            <Label className="text-base">Which safeguards are in place? (select all that apply)</Label>
            <div className="mt-2">
              <Pills
                options={[
                  "Encryption at rest and in transit",
                  "Pseudonymisation",
                  "Access controls / least privilege",
                  "Retention limits",
                  "Independent oversight (DPO / privacy committee)",
                  "DPIA completed",
                  "Vendor due diligence",
                  "Other",
                ]}
                value={safeguards}
                onChange={setSafeguards}
              />
            </div>
            {safeguards.includes("Other") && (
              <input value={safeguardsOther} onChange={(e) => setSafeguardsOther(e.target.value)} placeholder="Describe the other safeguard(s) in place" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            )}
          </div>

          {/* ITEM 311 — mitigations, kept separate from safeguards because
              measures the GDPR already requires do not count as mitigating
              measures in the balance. */}
          <div>
            <Label className="text-base">What measures have you added specifically to reduce the impact on individuals?</Label>
            <p className="text-xs text-muted-foreground mt-1">Only measures that go beyond what the GDPR already requires of you can shift the balance. Encryption, access control and retention limits are obligations, not mitigations.</p>
            <Textarea value={additionalMitigations} onChange={(e) => setAdditionalMitigations(e.target.value)} placeholder="e.g. an unconditional opt-out from profiling that we are not required to offer" className="mt-2" rows={3} />
          </div>

          <div>
            <Label className="text-base">Anything else about this processing we should weigh?</Label>
            <p className="text-xs text-muted-foreground mt-1">Context, constraints, or specifics the questions above didn't capture — in your own words. Optional, but it sharpens the assessment.</p>
            <Textarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} className="mt-2" rows={3} />
          </div>

          {/* UPGRADE-4 — availability, separate from the mechanism */}
          <div>
            <Label className="text-base">Is an opt-out available to individuals?</Label>
            <select value={optOutAvailable} onFocusCapture={focusField("opt_out_available")} onChange={(e) => setOptOutAvailable(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes — unconditional, on request, with no consequence</option>
              <option>Yes — but conditional or subject to review</option>
              <option>No opt-out is available</option>
            </select>
          </div>

          <div>
            <Label className="text-base">How can data subjects object or opt out? *</Label>
            <AssistedInput
              className="mt-2"
              value={optOutMechanism}
              onChange={setOptOutMechanism}
              pills={ASSISTED_INPUT_REGISTRY.optOutMechanism.pills}
              placeholder="e.g. One-click unsubscribe in every email, account-level toggle, privacy@ inbox monitored within 7 days."
            />
          </div>

          {showEmploymentBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">What safeguards address the employment power imbalance?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Regulators expect proportionate safeguards: works council consultation, transparency, no covert monitoring,
                limits on use against the employee.
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
        <section className="bg-card border rounded-lg p-6 space-y-5">
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 04</span>
            <h2 className="font-serif">Attestation and review</h2>
            <p className="text-sm text-muted-foreground">Who reviewed and approved this assessment, and what would cause you to run it again.</p>
          </div>

          <div>
            <Label className="text-base">Has the data protection function reviewed this assessment?</Label>
            <select value={dpoReviewed} onChange={(e) => setDpoReviewed(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
              <option>Planned</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-base">Reviewer</Label>
              <input value={dpoReviewer} onChange={(e) => setDpoReviewer(e.target.value)} placeholder="Name of the DPO or the person discharging that function" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label className="text-base">Date of review</Label>
              <input type="date" value={dpoReviewDate} onChange={(e) => setDpoReviewDate(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-base">Approved by</Label>
              <input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Name" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label className="text-base">Title</Label>
              <input value={approverPosition} onChange={(e) => setApproverPosition(e.target.value)} placeholder="Role and approving authority" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <Label className="text-base">Date of approval</Label>
              <input type="date" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
          </div>

          <div>
            <Label className="text-base">What would trigger a re-review? (select all that apply)</Label>
            <p className="text-xs text-muted-foreground mt-1">A standard set is applied in the report. Anything you add here is recorded alongside it.</p>
            <div className="mt-2">
              <Pills
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

        <section className="bg-card border rounded-lg p-6">
          <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />

          <button
            onClick={handleSubmit}
            disabled={purchasing}
            className="mt-4 w-full px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {purchasing ? "Redirecting to checkout…" : `Generate full assessment — $${pricing.price}`}
          </button>
          {pricing.isSubscriber && pricing.standalonePrice > pricing.price && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Subscriber rate · standalone ${pricing.standalonePrice}
            </p>
          )}
        </section>
        </div>
        <StatuteRail entry={liaRailEntry} />
        </div>



        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={`/li-assessment/intake/${row.id}`} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="li_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={intakeForCheckout ?? {}}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) { void clearDraft(); navigate(`/li-assessment/result/${id}?purchased=true`); }
          }}
        />
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessmentIntake;
