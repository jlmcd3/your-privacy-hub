
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExhibitTextarea } from "@/components/ExhibitTextarea";
import { AssistedInput } from "@/components/AssistedInput";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import StatuteRail from "@/components/intake/StatuteRail";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { EDPB_DPIA_GUIDANCE, EDPB_DPIA_SOURCE } from "@/components/dpia/EdpbDpiaGuidance";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";


// RC-FLIP-3 — intake option sets extracted to DPIAFramework.enums.ts so shared
// components (refine surface) import from a page-free module. Page re-exports.
export {
  DATA_CATS, TOOLS, SAFEGUARDS, JURISDICTIONS,
  LEGAL_BASES, ARTICLE_9_CONDITIONS, REASONS_TO_CONDUCT,
} from "@/pages/DPIAFramework.enums";
import {
  DATA_CATS, TOOLS, SAFEGUARDS, JURISDICTIONS,
  LEGAL_BASES, ARTICLE_9_CONDITIONS, REASONS_TO_CONDUCT,
} from "@/pages/DPIAFramework.enums";
import { ClipboardList, Zap } from 'lucide-react';
// DATA_CATS labels that are Article 9 special categories — drives the conditional Art 9(2) field.
const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data"];

// Price tiers managed by useToolPrice hook (subscriber-aware)

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

const DPIAFramework = () => {
  useToolStartedOnInteraction("dpia");

  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const sourceId = params.get("source");
  const pricing = useToolPrice("dpia_framework");

  const refine = useRefineMode("dpia_framework");
  const { meter } = useRunMeter("dpia_framework", refine.assessmentId);

  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [dataSubjects, setDataSubjects] = useState("");
  const [volume, setVolume] = useState("");
  const [processors, setProcessors] = useState<string[]>([]);
  const [otherProcessor, setOtherProcessor] = useState("");
  const [safeguards, setSafeguards] = useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [legalBasis, setLegalBasis] = useState("");
  const [article9Condition, setArticle9Condition] = useState("");
  const [necessityProportionality, setNecessityProportionality] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // EDPB template — Section 0 (Overview of the processing). All optional in this tranche.
  const [controllerContact, setControllerContact] = useState("");        // 0.1 main establishment / point of contact
  const [dpoInfo, setDpoInfo] = useState("");                            // 0.1 DPO or similar function
  const [processorObligations, setProcessorObligations] = useState("");  // 0.2 obligations & tasks
  const [processingVersion, setProcessingVersion] = useState("");        // 0.3 current version / change history
  const [launchDate, setLaunchDate] = useState("");                      // 0.4 estimated launch date
  const [endDate, setEndDate] = useState("");                            // 0.4 estimated end date / expiry
  const [dpiaTeam, setDpiaTeam] = useState("");                          // 0.5 team / RACI
  const [referenceMaterials, setReferenceMaterials] = useState("");      // 0.5 guidelines / standards
  const [reasonsToConduct, setReasonsToConduct] = useState<string[]>([]);// 0.5 reasons (multi-select)
  const [dpiaScopeNote, setDpiaScopeNote] = useState("");                // 0.5 scope in/out
  const [publicationIntent, setPublicationIntent] = useState("");        // 0.5 publish / share externally

  // EDPB template — Sections 1, 2 & 5 (controller-provided detail; consumed by the edge). All optional.
  const [secondaryUses, setSecondaryUses] = useState("");                                 // 1.1.c
  const [natureScopeContext, setNatureScopeContext] = useState("");                       // 1.1.d
  const [functionalDescription, setFunctionalDescription] = useState("");                 // 1.2
  const [supportingAssets, setSupportingAssets] = useState("");                           // 1.3
  const [codesOfConduct, setCodesOfConduct] = useState("");                               // 1.4
  const [dataMinimisationJustification, setDataMinimisationJustification] = useState(""); // 2.2.a
  const [dataQualityMeasures, setDataQualityMeasures] = useState("");                     // 2.2.b
  const [dataSubjectRightsMechanisms, setDataSubjectRightsMechanisms] = useState("");     // 2.3.b
  const [dpByDesignMeasures, setDpByDesignMeasures] = useState("");                       // 2.3.d
  const [dpoAdvice, setDpoAdvice] = useState("");                                         // 5.1
  const [dataSubjectsViewsSought, setDataSubjectsViewsSought] = useState("");             // 5.2
  const [dataSubjectsViews, setDataSubjectsViews] = useState("");                         // 5.2
  // ITEM 310 — alternatives actually considered and rejected, per processing
  // operation. Feeds the deterministic least-intrusive-means test (Art. 35(7)(b)).
  const [alternativesConsidered, setAlternativesConsidered] = useState<Array<{ processing_operation: string; alternative: string; rejection_reason: string }>>([]);

  const [activeTemplateRef, setActiveTemplateRef] = useState<string | null>(null);

  // ── Jurisdiction resolver inputs (Layer 5 — feed the deterministic resolvers) ──
  const [controllerCountry, setControllerCountry] = useState("");          // ISO-2 e.g. DE, IE, FR
  const [controllerLand, setControllerLand] = useState("");                // DE only
  const [controllerSector, setControllerSector] = useState<"private" | "public" | "federal-public" | "telecom" | "postal" | "">("");
  const [centralAdminCountry, setCentralAdminCountry] = useState("");      // for OSS
  const [euDecisionEstablishment, setEuDecisionEstablishment] = useState(""); // ISO-2 of EU est. with decision authority, blank if none
  const [transferFlows, setTransferFlows] = useState<Array<{ importer: string; destination: string; originRegime: "EU" | "UK"; dpfCertified: boolean; ukExtensionCertified: boolean }>>([]);
  const [retentionRecordType, setRetentionRecordType] = useState("");      // e.g. "payroll", "accounting"

  
  const guidanceTier = useGuidanceTier();
  const [activeRailField, setActiveRailField] = useState<"trigger" | "legal_basis" | "transfers" | null>(null);
  const hasSpecialCategory = dataCategories.some((c) => SPECIAL_CATEGORY_CATS.includes(c));
  

  const dpiaRailConfigs = {
    trigger: {
      article: "35", jurisdiction: "eu" as const, recital: 84,
      fieldLabel: "DPIA trigger — Art. 35 GDPR",
      plainSummary: "A DPIA is mandatory where processing is likely to result in high risk — particularly with new technologies, large-scale special category processing, or systematic profiling. Art. 35(3) lists three mandatory trigger categories; supervisory authorities also publish lists of additional types.",
      relatedCitations: [
        { citation: "Art. 35(3) GDPR", label: "Three mandatory DPIA triggers" },
        { citation: "Recital 89 GDPR", label: "What constitutes high risk" },
      ],
    },
    legal_basis: {
      article: "6", jurisdiction: "eu" as const, recital: 40,
      fieldLabel: "Legal basis — Art. 6(1) GDPR",
      plainSummary: "Processing requires at least one of six lawful bases. In a DPIA context, the legal basis informs the residual risk assessment — consent-based processing poses lower risk than legitimate interests where data subjects may not expect the processing. Always cite the specific sub-clause (a)–(f).",
      relatedCitations: [{ citation: "Art. 9 GDPR", label: "Additional condition for special categories" }],
    },
    transfers: {
      article: "44", jurisdiction: "eu" as const,
      fieldLabel: "International transfers — Arts. 44–49 GDPR",
      plainSummary: "Any transfer to a third country (outside EEA/UK) requires a Chapter V mechanism. The transfer itself is a processing activity that must be risk-assessed within the DPIA when it involves high-risk data. Post-Schrems II, SCCs require a documented Transfer Impact Assessment.",
      relatedCitations: [
        { citation: "Art. 46(2)(c) GDPR", label: "Standard Contractual Clauses" },
        { citation: "EDPB Recommendations 01/2020", label: "Transfer impact assessment" },
      ],
    },
  };

  const dpiaRailOpts = activeRailField ? dpiaRailConfigs[activeRailField] : null;
  const { entry: dpiaRailEntry } = useGdprRailEntry(dpiaRailOpts);

  const handleDpiaRailFocus = (field: "trigger" | "legal_basis" | "transfers") => {
    setActiveTemplateRef(null);
    setActiveRailField(field);
  };

  // EDPB template-guidance rail: builds a guidance-only RailEntry from the
  // Explainer paraphrase registry — no GDPR article fetch, no verbatim block.
  const handleTemplateRailFocus = (sectionRef: string) => {
    setActiveRailField(null);
    setActiveTemplateRef(sectionRef);
  };
  useScrollActiveRail((k) => {
    if (k === "trigger" || k === "legal_basis" || k === "transfers") {
      setActiveTemplateRef(null);
      setActiveRailField(k);
    } else if (EDPB_DPIA_GUIDANCE[k]) {
      setActiveRailField(null);
      setActiveTemplateRef(k);
    }
  });
  // WP248-PINNING (2026-08-01) — for the two WP248-anchored fields the right
  // "law" column also surfaces verbatim edpb_guidelines text (sibling hook).
  const wp248Entry = activeTemplateRef ? EDPB_DPIA_GUIDANCE[activeTemplateRef] : null;
  const edpbRailOpts = wp248Entry?.verbatimPropositionKey
    ? { guidelineRef: "WP248 rev.01", verbatimQuote: wp248Entry.guidance }
    : null;
  const { regulationText: edpbRegulationText } = useEdpbGuidelineRailEntry(edpbRailOpts);

  const templateRailEntry = useMemo(() => {
    if (!activeTemplateRef) return null;
    const g = EDPB_DPIA_GUIDANCE[activeTemplateRef];
    if (!g) return null;
    const sourceLabel = g.sourceLabel ?? EDPB_DPIA_SOURCE.label;
    const sourceUrl = g.sourceUrl ?? EDPB_DPIA_SOURCE.url;
    return {
      fieldLabel: g.verbatimPropositionKey
        ? `EDPB WP248 rev.01 · ${g.sectionTitle}`
        : `EDPB DPIA template · § ${g.sectionRef}`,
      citation: g.citation ?? `EDPB DPIA template § ${g.sectionRef}`,
      citationUrl: sourceUrl,
      plainSummary: g.guidance,
      regulationText: g.verbatimPropositionKey ? (edpbRegulationText ?? "") : "",
      templateGuidance: {
        sectionRef: g.sectionRef,
        sectionTitle: g.sectionTitle,
        guidance: g.guidance,
        paraRefs: g.paraRefs,
        sourceLabel,
        sourceUrl,
      },
    };
  }, [activeTemplateRef, edpbRegulationText]);


  const dpiaEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories", "dpia_absence", "international_transfer"],
    guidanceTier.tier === "paid"
  );

  // DPIA mandatory trigger detection — Art. 35(3), visible to all users
  const dpiaTriggers = useMemo(() => {
    const SPECIAL = ["Health / medical data", "Biometric data", "Genetic data"];
    const hasSpecial = dataCategories.some(c => SPECIAL.includes(c));
    const hasChildren = dataCategories.some(c => c.toLowerCase().includes("child"));
    const items = [
      {
        citation: "Art. 35(3)(b) GDPR",
        label: "Large-scale processing of special category data",
        triggered: hasSpecial,
        note: "Health, biometric, or genetic data selected",
      },
      {
        citation: "Art. 35(3)(a) GDPR",
        label: "Systematic and extensive profiling with significant effects",
        triggered: description.toLowerCase().includes("profil"),
        note: "Profiling activity detected in processing description",
      },
      {
        citation: "Recital 38 GDPR",
        label: "Processing children's data — heightened obligations apply",
        triggered: hasChildren,
        note: "Children's data requires particular protection under GDPR",
      },
    ].filter(i => i.triggered);
    return items;
  }, [dataCategories, description]);


  // Pre-populate from governance assessment if ?source= present
  useEffect(() => {
    if (!sourceId || !user) return;
    supabase.from("governance_assessments").select("dpia_scope, intake_data").eq("id", sourceId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const scope: any = Array.isArray(data.dpia_scope) ? data.dpia_scope[0] : data.dpia_scope;
      if (scope) {
        setName(scope.processing_activity || scope.name || "");
        if (scope.description) setDescription(scope.description);
        if (scope.purpose) setPurpose(scope.purpose);
        setPrefilled(true);
      }
      const intake: any = data.intake_data || {};
      if (Array.isArray(intake.jurisdictions)) setJurisdictions(intake.jurisdictions);
      if (Array.isArray(intake.data_categories)) setDataCategories(intake.data_categories);
    });
  }, [sourceId, user]);

  const validate = () => {
    if (!organizationName.trim()) return "Tell us the name of the organisation being assessed.";
    if (!name.trim()) return "Processing activity name is required.";
    if (description.trim().length < 100) return "Description must be at least 100 characters.";
    if (!purpose.trim()) return "Purpose is required.";
    if (!dataCategories.length) return "Select at least one data category.";
    if (!dataSubjects.trim()) return "Data subjects are required.";
    if (!volume.trim()) return "Volume and frequency required.";
    if (!jurisdictions.length) return "Select at least one jurisdiction.";
    if (!legalBasis) return "Select a legal basis.";
    if (hasSpecialCategory && !article9Condition) return "Select an Article 9(2) condition for the special-category data you indicated.";
    if (!retentionPeriod.trim()) return "Retention period is required.";
    if (!necessityProportionality.trim()) return "Describe necessity, proportionality and alternatives considered.";
    return null;
  };

  const buildIntake = () => ({
    organization_name: organizationName,
    processing_activity_name: name,
    description, purpose,
    data_categories: dataCategories,
    data_subjects: dataSubjects,
    volume_frequency: volume,
    third_party_processors: otherProcessor.trim() ? [...processors, `Other: ${otherProcessor.trim()}`] : processors,
    existing_safeguards: safeguards,
    jurisdictions,
    legal_basis_proposed: legalBasis,
    article_9_condition: hasSpecialCategory ? article9Condition : "",
    necessity_proportionality: necessityProportionality,
    retention_period: retentionPeriod,
    // EDPB template — Section 0 (carried now; consumed by the edge rebuild tranche)
    controller_contact: controllerContact,
    dpo_info: dpoInfo,
    processor_obligations: processorObligations,
    processing_version: processingVersion,
    estimated_launch_date: launchDate,
    estimated_end_date: endDate,
    dpia_team: dpiaTeam,
    reference_materials: referenceMaterials,
    reasons_to_conduct: reasonsToConduct,
    dpia_scope_note: dpiaScopeNote,
    publication_intent: publicationIntent,
    // EDPB template — Sections 1, 2 & 5
    secondary_uses: secondaryUses,
    nature_scope_context: natureScopeContext,
    functional_description: functionalDescription,
    supporting_assets: supportingAssets,
    codes_of_conduct: codesOfConduct,
    data_minimisation_justification: dataMinimisationJustification,
    data_quality_measures: dataQualityMeasures,
    data_subject_rights_mechanisms: dataSubjectRightsMechanisms,
    dp_by_design_measures: dpByDesignMeasures,
    dpo_advice: dpoAdvice,
    data_subjects_views_sought: dataSubjectsViewsSought,
    data_subjects_views: dataSubjectsViews,
    alternatives_considered: alternativesConsidered,

    // Jurisdiction resolver inputs (deterministic resolvers in run-dpia-framework)
    controller_country: controllerCountry,
    controller_land: controllerLand,
    controller_sector: controllerSector,
    central_administration_country: centralAdminCountry,
    eu_decision_establishment_country: euDecisionEstablishment,
    transfer_flows: transferFlows,
    retention_record_type: retentionRecordType,
    source_assessment_id: sourceId || null,
  });

  // Autosave: persist buildIntake() payload; restore via a setters registry.
  const draftData = useMemo(() => buildIntake(), [
    organizationName, name, description, purpose, dataCategories, dataSubjects, volume,
    processors, otherProcessor, safeguards, jurisdictions, legalBasis, article9Condition,
    necessityProportionality, retentionPeriod, controllerContact, dpoInfo, processorObligations,
    processingVersion, launchDate, endDate, dpiaTeam, referenceMaterials, reasonsToConduct,
    dpiaScopeNote, publicationIntent, secondaryUses, natureScopeContext, functionalDescription,
    supportingAssets, codesOfConduct, dataMinimisationJustification, dataQualityMeasures,
    dataSubjectRightsMechanisms, dpByDesignMeasures, dpoAdvice, dataSubjectsViewsSought,
    dataSubjectsViews, controllerCountry, controllerLand, controllerSector, centralAdminCountry,
    euDecisionEstablishment, transferFlows, retentionRecordType, alternativesConsidered,
  ]);
  const initialDraftJson = useMemo(() => JSON.stringify(draftData), []);
  const touched = useMemo(() => JSON.stringify(draftData) !== initialDraftJson, [draftData, initialDraftJson]);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
  } = useToolDraft({
    toolType: "dpia",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: 0,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: any[]) => void) => { if (Array.isArray(v)) fn(v); };
    S(d.organization_name, setOrganizationName);
    S(d.processing_activity_name, setName);
    S(d.description, setDescription);
    S(d.purpose, setPurpose);
    A(d.data_categories, setDataCategories);
    S(d.data_subjects, setDataSubjects);
    S(d.volume_frequency, setVolume);
    A(d.third_party_processors, setProcessors);
    A(d.existing_safeguards, setSafeguards);
    A(d.jurisdictions, setJurisdictions);
    S(d.legal_basis_proposed, setLegalBasis);
    S(d.article_9_condition, setArticle9Condition);
    S(d.necessity_proportionality, setNecessityProportionality);
    S(d.retention_period, setRetentionPeriod);
    S(d.controller_contact, setControllerContact);
    S(d.dpo_info, setDpoInfo);
    S(d.processor_obligations, setProcessorObligations);
    S(d.processing_version, setProcessingVersion);
    S(d.estimated_launch_date, setLaunchDate);
    S(d.estimated_end_date, setEndDate);
    S(d.dpia_team, setDpiaTeam);
    S(d.reference_materials, setReferenceMaterials);
    A(d.reasons_to_conduct, setReasonsToConduct);
    S(d.dpia_scope_note, setDpiaScopeNote);
    S(d.publication_intent, setPublicationIntent);
    S(d.secondary_uses, setSecondaryUses);
    S(d.nature_scope_context, setNatureScopeContext);
    S(d.functional_description, setFunctionalDescription);
    S(d.supporting_assets, setSupportingAssets);
    S(d.codes_of_conduct, setCodesOfConduct);
    S(d.data_minimisation_justification, setDataMinimisationJustification);
    S(d.data_quality_measures, setDataQualityMeasures);
    S(d.data_subject_rights_mechanisms, setDataSubjectRightsMechanisms);
    S(d.dp_by_design_measures, setDpByDesignMeasures);
    S(d.dpo_advice, setDpoAdvice);
    S(d.data_subjects_views_sought, setDataSubjectsViewsSought);
    S(d.data_subjects_views, setDataSubjectsViews);
    A(d.alternatives_considered, setAlternativesConsidered);
    S(d.controller_country, setControllerCountry);
    S(d.controller_land, setControllerLand);
    if (["private","public","federal-public","telecom","postal",""].includes(d.controller_sector)) setControllerSector(d.controller_sector);
    S(d.central_administration_country, setCentralAdminCountry);
    S(d.eu_decision_establishment_country, setEuDecisionEstablishment);
    A(d.transfer_flows, setTransferFlows);
    S(d.retention_record_type, setRetentionRecordType);
  };

  const handlePurchase = async () => {
    const err = validate();
    if (err) { toast({ title: "Please complete the form first", description: err, variant: "destructive" }); return; }
    if (!user) { setAuthGateOpen(true); return; }

    // For $0 (included with Platform), bypass Stripe entirely
    if (pricing.price === 0) {
      setPurchasing(true);
      // Create the row first (the run- edge requires dpia_id, not raw
      // intake_data), mirroring the server's subscriber-credit row shape,
      // then trigger generation. The result page polls until complete.
      const { data: row, error: insErr } = await supabase
        .from("dpia_frameworks")
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
        "run-dpia-framework",
        { body: { dpia_id: row.id } }
      );
      setPurchasing(false);
      if (fnErr) {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      void clearDraft();
      navigate(`/dpia-framework/result/${row.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured. Please check back soon.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet><title>{`Impact Assessment Builder · from $${pricing.subscriberPrice ?? ""} | End User Privacy`}</title></Helmet>
      {refine.isRefine && refine.intake && !refine.loading ? (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <RefinePanel
            toolType="dpia_framework"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/dpia-framework/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        </main>
      ) : (<>
      <header className="bg-brand-navy text-white py-12">

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3"><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Data Protection Impact Assessment · ${pricing.price}</span>
          <h1 className="text-hero-h1 text-white mb-3">Impact Assessment Builder <DefPopover termKey="gdpr_dpia" /></h1>
          <RequirementBadge variant="hero" tier="required" text="A DPIA is required under GDPR Article 35 before high-risk processing — large-scale special-category data, systematic profiling, or large-scale monitoring of public areas." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg">Build a defensible impact assessment for one high-risk processing activity. Your intake maps to the accountability record your DPO or counsel needs to sign off.</p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-xs italic mt-1 max-w-3xl">Need more? Add 4 additional generations for half the tool price.</p>
          <div className="mt-4"><SampleReportLink toolSlug="dpia" tone="onDark" variant="link" /></div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            GDPR Art. 35 · accountability record your DPO or counsel signs off before high-risk processing begins
          </p>
        </div>
      </header>
      <ToolAlsoAvailableRow currentTool="dpia" />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>

      
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 bg-paper">
        <ActiveClientLabel />
        <div className="p-4 bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] border-l-4 border-brand-teal rounded text-sm">
          This tool produces an Impact Assessment document — a structured starting point for your organisation's Data Protection Officer or legal counsel to complete and own. It is not a finished Data Protection Impact Assessment (DPIA) and does not satisfy the requirements of GDPR Article 35 on its own. Qualified legal review is required before relying on this document.
        </div>

        {prefilled && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
            Pre-populated from your GDPR Governance Assessment. Review and edit all fields before purchasing.
          </div>
        )}

        <IntakeMasthead
          kicker="Data Protection Impact Assessment · GDPR Art. 35"
          title="Impact Assessment Builder"
          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter
              ? (typeof meter.lockedFields?.name === "string"
                  ? (meter.lockedFields!.name as string)
                  : (typeof meter.lockedFields?.organization_name === "string"
                      ? (meter.lockedFields!.organization_name as string)
                      : undefined))
              : undefined
          }
          meter={meter ?? null}
          preRunHint="The processing activity you name below is fixed once you first generate. Everything else stays editable across your included revision runs."
        />

        <BenchLayout
          toolType="dpia"
          railEntry={templateRailEntry ?? dpiaRailEntry}
          defaultSourceUrl="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
          coachingOpenByDefault={
            !!activeRailField &&
            refine.infoNeededKeys.some(
              (k) => activeRailField === k || (activeRailField ?? "").includes(k) || k.includes(activeRailField ?? ""),
            )
          }
        >
        <form onSubmit={(e) => { e.preventDefault(); handlePurchase(); }} className="flex-1 min-w-0 space-y-6">
          <DraftRestoreBanner
            draftFound={draftFound}
            touched={touched}
            draftUpdatedAt={draftUpdatedAt}
            onResume={applyRestore}
            onDiscard={() => { void clearDraft(); }}
          />
          <RequiredLegend />


          <div className="flex items-center gap-2 pt-1 pb-1 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">1 · What are you doing?</span>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground pb-2 border-b">Art. 35 GDPR — Data Protection Impact Assessment · Recitals 84, 89–90 — when a DPIA is mandatory</p>
            <Label htmlFor="org">Organisation being assessed<Req /></Label>
            <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Acme Retail Ltd" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The controller/entity whose processing this DPIA documents.</p>
          </div>
          <div>
            <Label>Name this processing activity<Req /></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Employee location monitoring via mobile app" className="mt-2" />
          </div>
          <div>
            <Label>Describe the processing activity in detail<Req /></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe: what data is collected, how it is used, who has access, where it is stored." className="mt-2 min-h-32" />
            <IntakeGuidance className="mt-2">If this activity serves more than one purpose or use case, set each one out clearly and separately (number them, or a short paragraph each) — each purpose is analysed and reported on individually. For each, cover what data is involved, why it's needed, who can access it, where it's stored, and how long it's kept.</IntakeGuidance>
            <p className="text-xs text-muted-foreground mt-1">Min 100 characters.</p>
          </div>
          <div>
            <Label>What is the purpose of this processing?<Req /></Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Be specific. Vague purposes weaken both the legal basis and the DPIA.</p>
          </div>
          <div className="flex items-center gap-2 pt-2 pb-1 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">2 · What data, whose, how much, how long?</span>
          </div>
          <div data-rail-key="trigger" onFocus={() => handleDpiaRailFocus("trigger")}><Label>Data categories<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 — special categories trigger Art. 35(3)(b))</span> <EnforcementSignalIcon signalKey="special_categories" signals={dpiaEnforcementSignals} /></Label><div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div></div>
          {dpiaTriggers.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> DPIA triggers detected from your data categories <EnforcementSignalIcon signalKey="dpia_absence" signals={dpiaEnforcementSignals} />
              </p>
              {dpiaTriggers.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5 shrink-0">▸</span>
                  <div className="text-xs">
                    <span className="font-mono text-amber-700 dark:text-amber-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    {item.note && <span className="text-muted-foreground ml-1">— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div><Label>Who are the data subjects?<Req /> <DefPopover termKey="gdpr_personal_data" /></Label><Input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} placeholder="e.g. Employees in the UK and Ireland aged 18+" className="mt-2" /></div>
          <div><Label>Volume and frequency<Req /></Label><Input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 250 employees, continuous monitoring during working hours" className="mt-2" /></div>
          <div><Label>Retention period<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 5(1)(e) — storage limitation)</span></Label><Input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="e.g. Deleted 90 days after each verification event; no central template stored" className="mt-2" /></div>
          <div className="flex items-center gap-2 pt-2 pb-1 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">3 · Who else touches the data, and what protects it?</span>
          </div>
          <div>
            <Label>Third-party processors</Label>
            <div className="mt-2"><Pills options={TOOLS} value={processors} onChange={setProcessors} /></div>
            <Input placeholder="Other (specify)" value={otherProcessor} onChange={(e) => setOtherProcessor(e.target.value)} className="mt-2" />
          </div>
          <div><Label>Existing safeguards</Label><div className="mt-2"><Pills options={SAFEGUARDS} value={safeguards} onChange={setSafeguards} /></div></div>
          <div data-rail-key="transfers" onFocus={() => handleDpiaRailFocus("transfers")}><Label>Jurisdictions<Req /> <DefPopover termKey="gdpr_international_transfer" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–49 GDPR)</span> <EnforcementSignalIcon signalKey="international_transfer" signals={dpiaEnforcementSignals} /></Label><div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div></div>

          {/* ── Jurisdiction resolver inputs (deterministic facts) ─────────── */}
          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <p className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Establishment & transfer facts</p>
            <p className="text-xs text-muted-foreground">These structured fields drive deterministic supervisory-authority, OSS, and transfer-mechanism resolution. The report cites authorities and instruments from these inputs only — never from the model.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Controller country (ISO-2)</Label>
                <Input value={controllerCountry} onChange={(e) => setControllerCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="DE, IE, FR, UK…" className="mt-1" />
              </div>
              {controllerCountry === "DE" && (
                <div>
                  <Label className="text-xs">German Land</Label>
                  <select value={controllerLand} onChange={(e) => setControllerLand(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">Select…</option>
                    {["Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse","Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate","Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label className="text-xs">Sector</Label>
                <select value={controllerSector} onChange={(e) => setControllerSector(e.target.value as any)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Select…</option>
                  <option value="private">Private</option>
                  <option value="public">Public (Land-level)</option>
                  <option value="federal-public">Federal public body</option>
                  <option value="telecom">Telecom</option>
                  <option value="postal">Postal</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Central administration country (for OSS)</Label>
                <Input value={centralAdminCountry} onChange={(e) => setCentralAdminCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="DE, IE, CH, US…" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">EU establishment with decision authority</Label>
                <Input value={euDecisionEstablishment} onChange={(e) => setEuDecisionEstablishment(e.target.value.toUpperCase().slice(0, 2))} placeholder="ISO-2, or blank if none" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Statutory retention record type</Label>
                <Input value={retentionRecordType} onChange={(e) => setRetentionRecordType(e.target.value)} placeholder="payroll, accounting, …" className="mt-1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Third-country transfer flows</Label>
                <button type="button" onClick={() => setTransferFlows([...transferFlows, { importer: "", destination: "", originRegime: "EU", dpfCertified: false, ukExtensionCertified: false }])} className="text-xs underline text-brand-teal-text">+ Add flow</button>
              </div>
              {transferFlows.length === 0 && <p className="text-xs text-muted-foreground mt-1">No transfers added. EEA-internal flows do not need a Chapter V mechanism.</p>}
              {transferFlows.map((f, i) => (
                <div key={i} className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-2 items-end border rounded p-2 bg-background">
                  <div className="md:col-span-2"><Label className="text-xs">Importer entity</Label><Input value={f.importer} onChange={(e) => { const n = [...transferFlows]; n[i].importer = e.target.value; setTransferFlows(n); }} className="mt-1" /></div>
                  <div><Label className="text-xs">Destination (ISO-2)</Label><Input value={f.destination} onChange={(e) => { const n = [...transferFlows]; n[i].destination = e.target.value.toUpperCase().slice(0,2); setTransferFlows(n); }} className="mt-1" /></div>
                  <div><Label className="text-xs">Origin</Label><select value={f.originRegime} onChange={(e) => { const n = [...transferFlows]; n[i].originRegime = e.target.value as "EU"|"UK"; setTransferFlows(n); }} className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm"><option value="EU">EU</option><option value="UK">UK</option></select></div>
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={f.dpfCertified} onChange={(e) => { const n = [...transferFlows]; n[i].dpfCertified = e.target.checked; setTransferFlows(n); }} /> EU-US DPF</label>
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={f.ukExtensionCertified} onChange={(e) => { const n = [...transferFlows]; n[i].ukExtensionCertified = e.target.checked; setTransferFlows(n); }} /> UK Extension</label>
                  <button type="button" onClick={() => setTransferFlows(transferFlows.filter((_, j) => j !== i))} className="text-xs text-red-600 underline md:col-span-6 text-right">remove</button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 pb-1 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">4 · Is it lawful and necessary?</span>
          </div>
          <div>
            <Label>Legal basis proposed<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 6(1) GDPR — six lawful bases)</span></Label>
            <select value={legalBasis} data-rail-key="legal_basis" onChange={(e) => setLegalBasis(e.target.value)} onFocus={() => handleDpiaRailFocus("legal_basis")} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          {hasSpecialCategory && (
            <div>
              <Label>Article 9(2) condition for special-category data<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 9(2) — required in addition to the Art. 6 basis)</span></Label>
              <select value={article9Condition} onChange={(e) => setArticle9Condition(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>{ARTICLE_9_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">You selected a special category (health/medical or biometric data). Article 6 alone is not a sufficient legal basis — a separate Article 9(2) condition is required.</p>
            </div>
          )}
          <div>
            <Label>Necessity, proportionality & alternatives considered<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 35(7)(b))</span></Label>
            <Textarea value={necessityProportionality} onChange={(e) => setNecessityProportionality(e.target.value)} placeholder="Why is this processing necessary for the purpose, and what less-intrusive alternatives did you consider and why were they rejected?" className="mt-2 min-h-24" />
            <IntakeGuidance className="mt-2">Take each alternative you considered in turn and say plainly why it was rejected. Listing them separately lets the assessment weigh each one — a single general statement can't be.</IntakeGuidance>
          </div>

          {/* ITEM 310 — alternatives actually considered, per processing operation.
              Feeds the deterministic least-intrusive-means test (Art. 35(7)(b)). */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Alternatives considered and rejected <span className="text-xs text-muted-foreground font-mono">(Art. 35(7)(b))</span></Label>
              <button
                type="button"
                onClick={() => setAlternativesConsidered([...alternativesConsidered, { processing_operation: "", alternative: "", rejection_reason: "" }])}
                className="text-xs underline text-brand-teal-text"
              >+ Add alternative</button>
            </div>
            {alternativesConsidered.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">None recorded. Without at least one alternative and the reason it was rejected, the assessment cannot run the least-intrusive-means comparison and will record the point as open.</p>
            )}
            {alternativesConsidered.map((a, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-2 mt-2 p-3 rounded-md border bg-muted/20">
                <div>
                  <Label className="text-xs">Processing operation</Label>
                  <Input
                    value={a.processing_operation}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].processing_operation = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="Leave blank for the primary activity"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Alternative considered</Label>
                  <Input
                    value={a.alternative}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].alternative = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="e.g. aggregated data only"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Why it was rejected</Label>
                  <Input
                    value={a.rejection_reason}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].rejection_reason = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="Why it would not achieve the purpose"
                    className="mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAlternativesConsidered(alternativesConsidered.filter((_, j) => j !== i))}
                  className="text-xs text-red-600 underline md:col-span-3 text-right"
                >remove</button>
              </div>
            ))}
            <IntakeGuidance className="mt-2">A rejection reason that says the alternative was less useful, slower or more expensive does not establish necessity — say why it would not achieve the purpose.</IntakeGuidance>
          </div>


          {/* Optional EDPB-aligned depth — collapsed by default, feeds the generator when filled */}
          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">Optional · Fuller description detail (EDPB-aligned)</summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='1.1.c' onFocus={() => handleTemplateRailFocus('1.1.c')}>
                <Label>Secondary or compatible uses <span className="text-xs text-muted-foreground font-mono">(§ 1.1.c)</span></Label>
                <Textarea value={secondaryUses} onChange={(e) => setSecondaryUses(e.target.value)} placeholder="Any further uses of the data beyond the primary purpose, and why they are compatible with it (Art. 6(4))." className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='1.1.d' onFocus={() => handleTemplateRailFocus('1.1.d')}>
                <Label>Nature, scope &amp; context of the processing <span className="text-xs text-muted-foreground font-mono">(§ 1.1.d)</span></Label>
                <Textarea value={natureScopeContext} onChange={(e) => setNatureScopeContext(e.target.value)} placeholder="Nature (what you do with the data), scope (extent — volume, geography, duration), and context (relationship with data subjects and their expectations)." className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='1.2' onFocus={() => handleTemplateRailFocus('1.2')}>
                <Label>Functional description <span className="text-xs text-muted-foreground font-mono">(§ 1.2)</span></Label>
                <Textarea value={functionalDescription} onChange={(e) => setFunctionalDescription(e.target.value)} placeholder="How the processing works end to end: the data lifecycle from collection through use, storage, sharing and deletion." className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='1.3' onFocus={() => handleTemplateRailFocus('1.3')}>
                <Label>Means of processing, supporting assets &amp; architecture <span className="text-xs text-muted-foreground font-mono">(§ 1.3 — can be sent to an Exhibit annex)</span></Label>
                <AssistedInput
                  className="mt-2"
                  useExhibit
                  value={supportingAssets}
                  onChange={setSupportingAssets}
                  pills={ASSISTED_INPUT_REGISTRY.supportingAssets.pills}
                  placeholder="IT systems, infrastructure, applications and sub-processor systems that support the processing."
                />
              </div>
              <div data-rail-key='1.4' onFocus={() => handleTemplateRailFocus('1.4')}>
                <Label>Approved codes of conduct / certifications <span className="text-xs text-muted-foreground font-mono">(§ 1.4)</span></Label>
                <Input value={codesOfConduct} onChange={(e) => setCodesOfConduct(e.target.value)} placeholder="e.g. an approved Art. 40 code of conduct or Art. 42 certification, if any." className="mt-2" />
              </div>
            </div>
          </details>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">Optional · Compliance measures (EDPB-aligned)</summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='2.2.a' onFocus={() => handleTemplateRailFocus('2.2.a')}>
                <Label>Data minimisation — why each category is necessary <span className="text-xs text-muted-foreground font-mono">(§ 2.2.a)</span></Label>
                <Textarea value={dataMinimisationJustification} onChange={(e) => setDataMinimisationJustification(e.target.value)} placeholder="For each category of data, why it is adequate, relevant and limited to what is necessary (Art. 5(1)(c))." className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='2.2.b' onFocus={() => handleTemplateRailFocus('2.2.b')}>
                <Label>Data quality measures <span className="text-xs text-muted-foreground font-mono">(§ 2.2.b)</span></Label>
                <AssistedInput
                  className="mt-2"
                  value={dataQualityMeasures}
                  onChange={setDataQualityMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dataQualityMeasures.pills}
                  placeholder="How you keep data accurate and up to date, and correct or erase inaccuracies (Art. 5(1)(d))."
                />
              </div>
              <div data-rail-key='2.3.b' onFocus={() => handleTemplateRailFocus('2.3.b')}>
                <Label>Measures supporting data subjects' rights <span className="text-xs text-muted-foreground font-mono">(§ 2.3.b)</span></Label>
                <AssistedInput
                  className="mt-2"
                  value={dataSubjectRightsMechanisms}
                  onChange={setDataSubjectRightsMechanisms}
                  pills={ASSISTED_INPUT_REGISTRY.dataSubjectRightsMechanisms.pills}
                  placeholder="How data subjects exercise access, rectification, erasure, restriction, portability and objection — and how you handle those requests (Arts. 12–22)."
                />
              </div>
              <div data-rail-key='2.3.d' onFocus={() => handleTemplateRailFocus('2.3.d')}>
                <Label>Data protection by design &amp; by default <span className="text-xs text-muted-foreground font-mono">(§ 2.3.d)</span></Label>
                <AssistedInput
                  className="mt-2"
                  value={dpByDesignMeasures}
                  onChange={setDpByDesignMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dpByDesignMeasures.pills}
                  placeholder="Measures built into the design — pseudonymisation, minimisation and access restriction by default (Art. 25)."
                />
              </div>
            </div>
          </details>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">Optional · Consultation (DPO &amp; data subjects)</summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='5.1' onFocus={() => handleTemplateRailFocus('5.1')}>
                <Label>DPO advice <span className="text-xs text-muted-foreground font-mono">(§ 5.1)</span></Label>
                <Textarea value={dpoAdvice} onChange={(e) => setDpoAdvice(e.target.value)} placeholder="Has the DPO been consulted on this DPIA, and what is their advice / opinion? (Art. 35(2))" className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='5.2' onFocus={() => handleTemplateRailFocus('5.2')}>
                <Label>Views of data subjects or their representatives <span className="text-xs text-muted-foreground font-mono">(§ 5.2)</span></Label>
                <select value={dataSubjectsViewsSought} onChange={(e) => setDataSubjectsViewsSought(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Have you sought data subjects' views? (Art. 35(9))</option>
                  <option value="Yes — views sought">Yes — views sought</option>
                  <option value="No — not sought">No — not sought</option>
                  <option value="Planned">Planned but not yet done</option>
                  <option value="Not appropriate — justified">Not appropriate (with justification)</option>
                </select>
                <Textarea value={dataSubjectsViews} onChange={(e) => setDataSubjectsViews(e.target.value)} placeholder="If sought: how, and what views were obtained. If not: why it is not appropriate (Art. 35(9))." className="mt-2 min-h-16" />
              </div>
            </div>
          </details>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">Optional · Administrative details (EDPB Section 0)</summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')}>
                <Label>Controller — main establishment / point of contact</Label>
                <Input value={controllerContact} onChange={(e) => setControllerContact(e.target.value)} placeholder="Main establishment or representative, and the contact point for this processing" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">EDPB §0.1: identify the controller's responsible unit, main establishment or representative, and the DPO. For joint controllers, define each party's obligations.</p>
              </div>
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')}>
                <Label>DPO contact details, if applicable</Label>
                <Input value={dpoInfo} onChange={(e) => setDpoInfo(e.target.value)} placeholder="DPO name / contact, or note if none is designated" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Contact details only — the DPO's advice on this DPIA goes in the optional Consultation section above.</p>
              </div>
              <div data-rail-key='0.2' onFocus={() => handleTemplateRailFocus('0.2')}>
                <Label>Processors / sub-processors — obligations &amp; tasks</Label>
                <ExhibitTextarea value={processorObligations} onChange={setProcessorObligations} placeholder="For each processor / sub-processor, define their obligations and tasks." className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">EDPB §0.2: list every processor and sub-processor in the chain and define each one's obligations unequivocally.</p>
              </div>
              <div data-rail-key='0.3' onFocus={() => handleTemplateRailFocus('0.3')}>
                <Label>Processing — current version / change history</Label>
                <Input value={processingVersion} onChange={(e) => setProcessingVersion(e.target.value)} placeholder="e.g. v2 — added biometric step in Q1 2026" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">EDPB §0.3: the internal name (from your RoPA) plus a short history of past changes to the processing.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-rail-key='0.4' onFocus={() => handleTemplateRailFocus('0.4')}>
                  <Label>Estimated launch date</Label>
                  <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className="mt-2" />
                </div>
                <div data-rail-key='0.4' onFocus={() => handleTemplateRailFocus('0.4')}>
                  <Label>Estimated end date / expiry (if temporary)</Label>
                  <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Date or expiry condition; leave blank if ongoing" className="mt-2" />
                </div>
              </div>
              <div data-rail-key='0.5' onFocus={() => handleTemplateRailFocus('0.5')}>
                <Label>DPIA team / roles (RACI)</Label>
                <Input value={dpiaTeam} onChange={(e) => setDpiaTeam(e.target.value)} placeholder="Who is Responsible, Accountable, Consulted, Informed for this DPIA" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">EDPB §0.5: the team conducting the DPIA and their roles / responsibilities.</p>
              </div>
              <div data-rail-key='0.5' onFocus={() => handleTemplateRailFocus('0.5')}>
                <Label>Guidelines / standards used</Label>
                <Input value={referenceMaterials} onChange={(e) => setReferenceMaterials(e.target.value)} placeholder="e.g. EDPB DPIA template, WP248 rev.01, ISO 29134" className="mt-2" />
              </div>
              <div data-rail-key='0.5.reasons' onFocus={() => handleTemplateRailFocus('0.5.reasons')}>
                <Label>Reasons for conducting this DPIA</Label>
                <p className="text-meta text-muted-foreground mt-1 mb-2">EDPB §0.5: select every reason that applies — a DPIA may be a legal obligation, required by guidance, or simply beneficial.</p>
                <Pills options={REASONS_TO_CONDUCT} value={reasonsToConduct} onChange={setReasonsToConduct} />
              </div>
              <div data-rail-key='0.5.scope' onFocus={() => handleTemplateRailFocus('0.5.scope')}>
                <Label>Scope of this DPIA — what's in and what's out</Label>
                <Textarea value={dpiaScopeNote} onChange={(e) => setDpiaScopeNote(e.target.value)} placeholder="State what this assessment covers, what it deliberately excludes, and why." className="mt-2 min-h-16" />
              </div>
              <div data-rail-key='0.5.publication' onFocus={() => handleTemplateRailFocus('0.5.publication')}>
                <Label>Will the DPIA be published or shared externally?</Label>
                <select value={publicationIntent} onChange={(e) => setPublicationIntent(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>
                  <option>No</option>
                  <option>Yes — published</option>
                  <option>Yes — shared externally</option>
                </select>
                <p className="text-meta text-muted-foreground mt-1">EDPB §0.5: note publication / sharing intent; withhold sensitive security detail if you publish.</p>
              </div>
            </div>
          </details>
        </form>
        </BenchLayout>


        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/dpia-framework" />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="dpia_framework"
          userId={user?.id}
          clientId={clientId}
          intakeData={buildIntake()}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) { void clearDraft(); navigate(`/dpia-framework/result/${id}?purchased=true`); }
          }}
        />
        <ToolSamplePreview
          toolType="dpia"
          toolName="Impact Assessment Builder"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      </main>
      </>)}
    <Footer />
    </div>
  );
};

export default DPIAFramework;
