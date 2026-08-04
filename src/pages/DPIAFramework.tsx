
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
import { useEdpbGuidelineRailEntry } from "@/hooks/useEdpbGuidelineRailEntry";

import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { EDPB_DPIA_GUIDANCE, EDPB_DPIA_SOURCE } from "@/components/dpia/EdpbDpiaGuidance";
import { DPIA_RAIL } from "@/components/dpia/DPIARailEntries";
import { CountryPicker } from "@/components/dpia/CountryPicker";
import { GERMAN_LAENDER } from "@/components/dpia/countries";
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
  // DPIA UPGRADE ITEM 2 — EDPB template v1.0 § 0.5 ¶6 and ¶10. All optional.
  const [dpiaPreparedBy, setDpiaPreparedBy] = useState("");              // 0.5 ¶6 who prepared
  const [dpiaApprovedByName, setDpiaApprovedByName] = useState("");      // 0.5 ¶10 approver
  const [dpiaApprovedByTitle, setDpiaApprovedByTitle] = useState("");    // 0.5 ¶10 title
  const [dpiaApprovalDate, setDpiaApprovalDate] = useState("");          // 0.5 ¶10 date
  const [dpiaSignoffBasis, setDpiaSignoffBasis] = useState("");          // 0.5 ¶10 basis
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

  // INTAKE GOLD STANDARD (register v1.2, G12) — the rail is the tutor. Fields
  // with no statute/template rail of their own now surface the DPIA coaching
  // entries, which were authored but never wired to the surface.
  const [activeLocalRailKey, setActiveLocalRailKey] = useState<string | null>(null);
  const localRailEntry = activeLocalRailKey ? (DPIA_RAIL[activeLocalRailKey] ?? null) : null;
  const handleLocalRailFocus = (key: string) => {
    setActiveRailField(null);
    setActiveTemplateRef(null);
    setActiveLocalRailKey(key);
  };

  const handleDpiaRailFocus = (field: "trigger" | "legal_basis" | "transfers") => {
    setActiveTemplateRef(null);
    setActiveLocalRailKey(null);
    setActiveRailField(field);
  };

  // EDPB template-guidance rail: builds a guidance-only RailEntry from the
  // Explainer paraphrase registry — no GDPR article fetch, no verbatim block.
  const handleTemplateRailFocus = (sectionRef: string) => {
    setActiveRailField(null);
    setActiveLocalRailKey(null);
    setActiveTemplateRef(sectionRef);
  };

  useScrollActiveRail((k) => {
    if (k === "trigger" || k === "legal_basis" || k === "transfers") {
      setActiveTemplateRef(null);
      setActiveLocalRailKey(null);
      setActiveRailField(k);
    } else if (EDPB_DPIA_GUIDANCE[k]) {
      setActiveRailField(null);
      setActiveLocalRailKey(null);
      setActiveTemplateRef(k);
    } else if (DPIA_RAIL[k]) {
      setActiveRailField(null);
      setActiveTemplateRef(null);
      setActiveLocalRailKey(k);
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
    dpia_prepared_by: dpiaPreparedBy,
    dpia_approved_by_name: dpiaApprovedByName,
    dpia_approved_by_title: dpiaApprovedByTitle,
    dpia_approval_date: dpiaApprovalDate,
    dpia_signoff_basis: dpiaSignoffBasis,
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
    processingVersion, launchDate, endDate, dpiaTeam, dpiaPreparedBy, dpiaApprovedByName,
    dpiaApprovedByTitle, dpiaApprovalDate, dpiaSignoffBasis, referenceMaterials, reasonsToConduct,
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
    S(d.dpia_prepared_by, setDpiaPreparedBy);
    S(d.dpia_approved_by_name, setDpiaApprovedByName);
    S(d.dpia_approved_by_title, setDpiaApprovedByTitle);
    S(d.dpia_approval_date, setDpiaApprovalDate);
    S(d.dpia_signoff_basis, setDpiaSignoffBasis);
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
          railEntry={templateRailEntry ?? dpiaRailEntry ?? localRailEntry}
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

          {/* ═══ STAGE 1 — WHAT & WHO ══════════════════════════════════ */}
          <div className="pt-1 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">1 · What you are doing, and who is doing it</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the activity your assessment is about and the organisation accountable for it.</p>
          </div>

          <div>
            <Label htmlFor="org">Which organisation is this assessment for?<Req /></Label>
            <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Acme Retail Ltd" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The organisation that decides why and how the data is used. That name appears throughout your assessment as the accountable party.</p>
          </div>

          <div data-rail-key="name" onFocus={() => handleLocalRailFocus("name")}>
            <Label>What do you call this processing activity?<Req /></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Employee location monitoring" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">One activity, named the way your organisation refers to it. A good answer names the processing rather than the project — the population and the method usually make it clear. This name is fixed once you generate, and everything else stays editable across your revision runs.</p>
          </div>

          <div data-rail-key="description" onFocus={() => handleLocalRailFocus("description")}>
            <Label>What happens to the data, step by step?<Req /></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="At least 100 characters" className="mt-2 min-h-32" />
            <p className="text-meta text-muted-foreground mt-1">Walk the data through the system: what is collected and from whom, what happens at each step, who can see it, where it is stored, and how long it is kept. A strong answer uses numbers and names rather than adjectives — "a location ping every five minutes during rostered shifts, stored 90 days in EU-hosted storage, visible to two rostering managers". This description is the factual base for every risk the assessment analyses, so anything missing here cannot be analysed later (Art. 35(7)(a)).</p>
            <IntakeGuidance className="mt-2">If this activity serves more than one purpose or use case, set each one out clearly and separately (number them, or a short paragraph each) — each purpose is analysed and reported on individually.</IntakeGuidance>
          </div>

          <div data-rail-key="purpose" onFocus={() => handleLocalRailFocus("purpose")}>
            <Label>Why are you doing this?<Req /></Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The outcome the processing exists to achieve. A strong answer gives one purpose per paragraph and, for each, what data it needs and how long that data is kept — "(1) shift-attendance verification, ping data, 90 days; (2) route planning, aggregated paths only, 12 months". Each purpose you state is tested separately for necessity, so a bundled purpose produces a weaker analysis of all of them.</p>
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add the administrative details</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering the next seven lets your assessment identify the controller, the timeline and the reason it was carried out. Skipped, each of them is recorded as open.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')}>
                <Label>Who is the contact point for this processing?</Label>
                <Input value={controllerContact} onChange={(e) => setControllerContact(e.target.value)} placeholder="Head of Operations, Dublin" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The unit, main establishment or representative answerable for this activity, and how to reach them. Where two organisations decide the purposes together, name both and say what each is responsible for. Skipped, your assessment records the contact point as not stated.</p>
              </div>
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')}>
                <Label>Who is your data protection officer?</Label>
                <Input value={dpoInfo} onChange={(e) => setDpoInfo(e.target.value)} placeholder="Name and email" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Contact details only. Whether the officer has advised on this assessment belongs in the consultation questions at stage 4. Skipped, your assessment records that no officer is identified on the record.</p>
              </div>
              <div data-rail-key='0.3' onFocus={() => handleTemplateRailFocus('0.3')}>
                <Label>Which version of this processing are you assessing?</Label>
                <Input value={processingVersion} onChange={(e) => setProcessingVersion(e.target.value)} placeholder="v2 — added a step" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The internal name or version you use in your record of processing, plus a short note of what has changed since the last one. It lets a reader tell which version of the activity was assessed. Skipped, your assessment records no version history.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-rail-key='0.4' onFocus={() => handleTemplateRailFocus('0.4')}>
                  <Label>When does the processing start?</Label>
                  <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className="mt-2" />
                  <p className="text-meta text-muted-foreground mt-1">An assessment is carried out before the processing begins, so this date shows the sequence. Skipped, your assessment records the start date as open.</p>
                </div>
                <div data-rail-key='0.4' onFocus={() => handleTemplateRailFocus('0.4')}>
                  <Label>When does it end, if it is temporary?</Label>
                  <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Date or condition" className="mt-2" />
                  <p className="text-meta text-muted-foreground mt-1">A date, or the condition that ends it — for example the close of a pilot. Ongoing processing needs no answer here. Skipped, your assessment records the activity as open-ended.</p>
                </div>
              </div>
              <div data-rail-key='0.5.reasons' onFocus={() => handleTemplateRailFocus('0.5.reasons')}>
                <Label>Why are you carrying out this assessment?</Label>
                <p className="text-meta text-muted-foreground mt-1 mb-2">Every reason that applies. Some make an assessment a legal requirement, others make it advisable — recording which applies to you shows the reader why the document exists. Skipped, your assessment records the reason as open.</p>
                <Pills options={REASONS_TO_CONDUCT} value={reasonsToConduct} onChange={setReasonsToConduct} />
              </div>
              <div data-rail-key="dpia_scope_note" onFocus={() => handleLocalRailFocus("dpia_scope_note")}>
                <Label>What does this assessment cover, and what does it leave out?</Label>
                <Textarea value={dpiaScopeNote} onChange={(e) => setDpiaScopeNote(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The boundary of the assessment. A strong answer states both sides — "covers location capture, storage and rostering use; excludes the payroll integration, which has its own assessment". Naming the exclusions shows they were a considered decision rather than an oversight. Skipped, your assessment records the scope as open.</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 2 — DATA & FLOWS ════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">2 · The data, the people, and where it flows</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes what data is involved, whose it is, how long you hold it and where it travels — the facts the risk analysis works on.</p>
          </div>

          <div data-rail-key="trigger" onFocus={() => handleDpiaRailFocus("trigger")}>
            <Label>What kinds of data does this involve?<Req /> <DefPopover termKey="gdpr_special_categories" /> <EnforcementSignalIcon signalKey="special_categories" signals={dpiaEnforcementSignals} /></Label>
            <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div>
            <p className="text-meta text-muted-foreground mt-1">Every category the activity touches, including anything collected but rarely used. Health and biometric data are treated as special categories and need a second legal basis, which appears at stage 3 once you name them (Art. 9).</p>
          </div>
          {dpiaTriggers.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Assessment triggers found in the data you named <EnforcementSignalIcon signalKey="dpia_absence" signals={dpiaEnforcementSignals} />
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
          <div data-rail-key="data_subjects" onFocus={() => handleLocalRailFocus("data_subjects")}>
            <Label>Whose data is it?<Req /> <DefPopover termKey="gdpr_personal_data" /></Label>
            <Input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} placeholder="UK and Irish employees" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The people the data is about, how many of them, and anything that makes them harder placed to object — children, staff, patients. A strong answer reads "around 250 delivery drivers employed in the UK and Ireland, all adults, plus roughly 40 agency staff". Your assessment weighs harm against this population, so a vaguer answer produces a vaguer severity finding.</p>
          </div>
          <div data-rail-key="volume_frequency" onFocus={() => handleLocalRailFocus("volume_frequency")}>
            <Label>How much data, and how often?<Req /></Label>
            <Input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="250 staff, every 5 minutes" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">One answer with two parts: the scale and the cadence. A complete answer carries both as numbers — "around 250 staff, one location ping every five minutes during shifts, roughly 24,000 records a day". Scale and cadence are what decide whether the processing counts as large-scale or as systematic monitoring, and adjectives cannot be measured against those thresholds (Art. 35(3)).</p>
          </div>
          <div data-rail-key="retention_period" onFocus={() => handleLocalRailFocus("retention_period")}>
            <Label>How long do you keep the data, and why that long?<Req /></Label>
            <Input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="24 months, then deleted" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The period, the reason for it, and what happens when it ends. A strong answer ties the number to something — "24 months, matching our audit cycle, then automatic deletion; aggregated figures with no identifiers are kept indefinitely". Your assessment tests whether the period is longer than the purpose needs, which it can only do when a reason is on the record (Art. 5(1)(e)).</p>
          </div>
          <div data-rail-key="transfers" onFocus={() => handleDpiaRailFocus("transfers")}>
            <Label>Which privacy laws apply to this processing?<Req /> <DefPopover termKey="gdpr_international_transfer" /> <EnforcementSignalIcon signalKey="international_transfer" signals={dpiaEnforcementSignals} /></Label>
            <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
            <p className="text-meta text-muted-foreground mt-1">Every regime the activity reaches — where the people are, where your organisation is, and where the data ends up. Your assessment analyses the transfer rules of each regime you name here (Arts. 44–49).</p>
          </div>

          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Does the data leave the EEA or the UK?</Label>
              <button type="button" onClick={() => setTransferFlows([...transferFlows, { importer: "", destination: "", originRegime: "EU", dpfCertified: false, ukExtensionCertified: false }])} className="text-xs underline text-brand-teal-text">+ Add a transfer</button>
            </div>
            <p className="text-meta text-muted-foreground">One entry for each organisation outside the EEA or the UK that receives the data, including your own group companies and your suppliers' data centres. Your assessment names the transfer safeguard for each entry from what you record here. With none recorded, your assessment states that no cross-border transfer is on the record. Data that stays inside the EEA needs no entry.</p>
            {transferFlows.map((f, i) => (
              <div key={i} className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-2 items-end border rounded p-2 bg-background">
                <div className="md:col-span-2"><Label className="text-xs">Who receives the data?</Label><Input value={f.importer} onChange={(e) => { const n = [...transferFlows]; n[i].importer = e.target.value; setTransferFlows(n); }} placeholder="Acme Inc" className="mt-1" /></div>
                <div><Label className="text-xs">Which country?</Label><CountryPicker id={`flow-dest-${i}`} value={f.destination} onChange={(v) => { const n = [...transferFlows]; n[i].destination = v; setTransferFlows(n); }} emptyLabel="Country" className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm" /></div>
                <div><Label className="text-xs">Sent from</Label><select value={f.originRegime} onChange={(e) => { const n = [...transferFlows]; n[i].originRegime = e.target.value as "EU"|"UK"; setTransferFlows(n); }} className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm"><option value="EU">EU</option><option value="UK">UK</option></select></div>
                <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={f.dpfCertified} onChange={(e) => { const n = [...transferFlows]; n[i].dpfCertified = e.target.checked; setTransferFlows(n); }} /> Certified under the EU–US Data Privacy Framework</label>
                <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={f.ukExtensionCertified} onChange={(e) => { const n = [...transferFlows]; n[i].ukExtensionCertified = e.target.checked; setTransferFlows(n); }} /> Certified under the UK extension to that framework</label>
                <button type="button" onClick={() => setTransferFlows(transferFlows.filter((_, j) => j !== i))} className="text-xs text-red-600 underline md:col-span-6 text-right">remove</button>
              </div>
            ))}
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add detail about suppliers, systems and further uses</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering the next seven lets your assessment analyse your supply chain, your systems and your secondary uses instead of recording each as open.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div>
                <Label>Which suppliers handle the data for you?</Label>
                <div className="mt-2"><Pills options={TOOLS} value={processors} onChange={setProcessors} /></div>
                <Input placeholder="Another supplier" value={otherProcessor} onChange={(e) => setOtherProcessor(e.target.value)} className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Any organisation that processes the data on your instructions, including hosting and support providers. Skipped, your assessment records the supply chain as open.</p>
              </div>
              <div data-rail-key='0.2' onFocus={() => handleTemplateRailFocus('0.2')}>
                <Label>What is each supplier responsible for?</Label>
                <ExhibitTextarea value={processorObligations} onChange={setProcessorObligations} placeholder="One supplier per line" className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Each supplier and sub-supplier in the chain and the task it performs — "Acme Hosting: EU storage and backup; no access to identifiable records". Naming the obligations lets your assessment test whether the chain is defined; skipped, it records the obligations as open.</p>
              </div>
              <div data-rail-key='1.1.c' onFocus={() => handleTemplateRailFocus('1.1.c')}>
                <Label>Do you use the data for anything beyond the main purpose?</Label>
                <Textarea value={secondaryUses} onChange={(e) => setSecondaryUses(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Any further use — analytics, product improvement, training a model — and why it fits with the purpose the data was collected for. A strong answer connects the two: "aggregated route statistics for capacity planning, which uses no identifiers and serves the same operational purpose". Skipped, your assessment records further uses as open (Art. 6(4)).</p>
              </div>
              <div data-rail-key='1.1.d' onFocus={() => handleTemplateRailFocus('1.1.d')}>
                <Label>What is the wider context of this processing?</Label>
                <Textarea value={natureScopeContext} onChange={(e) => setNatureScopeContext(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Your relationship with the people involved and what they would reasonably expect — how far the processing extends in place and time, and whether it is routine in your sector. A strong answer might read "staff are told at hire and monthly thereafter; comparable monitoring is standard in logistics; the app runs only during shifts". Skipped, your assessment records the context as open.</p>
              </div>
              <div data-rail-key='1.2' onFocus={() => handleTemplateRailFocus('1.2')}>
                <Label>How does the processing work from end to end?</Label>
                <Textarea value={functionalDescription} onChange={(e) => setFunctionalDescription(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The life of the data in sequence: collection, use, storage, sharing, deletion. A strong answer follows one record all the way through, naming the system at each hop. Skipped, your assessment records the data flow as open.</p>
              </div>
              <div data-rail-key='1.3' onFocus={() => handleTemplateRailFocus('1.3')}>
                <Label>Which systems and infrastructure support it?</Label>
                <AssistedInput
                  className="mt-2"
                  useExhibit
                  value={supportingAssets}
                  onChange={setSupportingAssets}
                  pills={ASSISTED_INPUT_REGISTRY.supportingAssets.pills}
                  placeholder="One system per line"
                />
                <p className="text-meta text-muted-foreground mt-1">Applications, databases, devices, hosting and any supplier systems in the chain. A long list can be sent to an exhibit annex so it does not crowd the body of the report. Skipped, your assessment records the supporting systems as open.</p>
              </div>
              <div>
                <Label>Is there a statutory retention rule for these records?</Label>
                <Input value={retentionRecordType} onChange={(e) => setRetentionRecordType(e.target.value)} placeholder="payroll" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The record type where a national law sets the retention period — payroll or accounting records, for instance. Naming the type lets your assessment resolve the statutory minimum rather than treating your period as freely chosen. Skipped, your assessment records no statutory retention rule.</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 3 — LEGAL BASIS ═════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">3 · The legal basis, and why the processing is necessary</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the lawful basis you rely on, whether the processing is necessary for the purpose, and which authority oversees you.</p>
          </div>

          <div>
            <Label>Which lawful basis do you rely on?<Req /></Label>
            <select value={legalBasis} data-rail-key="legal_basis" onChange={(e) => setLegalBasis(e.target.value)} onFocus={() => handleDpiaRailFocus("legal_basis")} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Not answered</option>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}
            </select>
            <p className="text-meta text-muted-foreground mt-1">One of the six bases in the law, and the one you would actually defend. Consent has to be freely given, which is hard to show where the people involved work for you; legitimate interest asks you to weigh your interest against theirs. Your assessment analyses the basis you name here and no other (Art. 6(1)).</p>
          </div>
          {hasSpecialCategory && (
            <div>
              <p className="text-meta text-muted-foreground mb-2">You named health or biometric data, which the law treats as special. Processing it lawfully needs a second condition on top of the basis above.</p>
              <Label>Which condition allows you to use health or biometric data?<Req /></Label>
              <select value={article9Condition} onChange={(e) => setArticle9Condition(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Not answered</option>{ARTICLE_9_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <p className="text-meta text-muted-foreground mt-1">Employment-law and explicit-consent conditions are the common ones in a workplace setting. Your assessment records this condition alongside the lawful basis (Art. 9(2)).</p>
            </div>
          )}
          <div>
            <Label>Why is this processing necessary, and what else did you consider?<Req /></Label>
            <Textarea value={necessityProportionality} onChange={(e) => setNecessityProportionality(e.target.value)} className="mt-2 min-h-24" />
            <p className="text-meta text-muted-foreground mt-1">Why the purpose cannot reasonably be met with less data or a lighter method, and what less intrusive options you looked at. A strong answer takes each option in turn: "manual shift sign-in was tested for six months and left 18% of shifts unverified, so it does not achieve the purpose". Your assessment compares the options you record here; a single general statement leaves it nothing to compare (Art. 35(7)(b)).</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Which alternatives did you reject, and why?</Label>
              <button
                type="button"
                onClick={() => setAlternativesConsidered([...alternativesConsidered, { processing_operation: "", alternative: "", rejection_reason: "" }])}
                className="text-xs underline text-brand-teal-text"
              >+ Add an alternative</button>
            </div>
            <p className="text-meta text-muted-foreground mt-1">One entry per option you looked at and set aside. A reason that says the alternative was slower or dearer does not establish necessity — the reason has to say why it would not achieve the purpose. Without at least one alternative and its rejection reason, the assessment cannot run the least-intrusive-means comparison and will record the point as open.</p>
            {alternativesConsidered.map((a, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-2 mt-2 p-3 rounded-md border bg-muted/20">
                <div>
                  <Label className="text-xs">Which part of the processing?</Label>
                  <Input
                    value={a.processing_operation}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].processing_operation = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="Blank for the whole"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">What was the alternative?</Label>
                  <Input
                    value={a.alternative}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].alternative = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="Aggregated data only"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Why did it not work?</Label>
                  <Input
                    value={a.rejection_reason}
                    onChange={(e) => { const n = [...alternativesConsidered]; n[i].rejection_reason = e.target.value; setAlternativesConsidered(n); }}
                    placeholder="Misses 18% of shifts"
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
          </div>



          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <p className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Where your organisation sits</p>
            <p className="text-meta text-muted-foreground">Where decisions about this processing are made determines which authority oversees you and whether one authority can handle the whole file. Your assessment names the authority and the transfer safeguards from these answers only.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div data-rail-key="controller_country" onFocus={() => handleLocalRailFocus("controller_country")}>
                <Label className="text-xs">Where is your organisation established?</Label>
                <CountryPicker id="controller-country" value={controllerCountry} onChange={setControllerCountry} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The country your organisation operates from. Skipped, your assessment cannot name a supervisory authority and records the point as open.</p>
              </div>
              {controllerCountry === "DE" && (
                <div>
                  <Label className="text-xs">Which German state (Land) is your organisation based in?</Label>
                  <select value={controllerLand} onChange={(e) => setControllerLand(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">Not answered</option>
                    {GERMAN_LAENDER.map((l) => <option key={l}>{l}</option>)}
                  </select>
                  <p className="text-meta text-muted-foreground mt-1">Germany has a separate authority for each state, so the state decides which one oversees you. Skipped, your assessment names the federal position only.</p>
                </div>
              )}
              <div>
                <Label className="text-xs">What kind of organisation is it?</Label>
                <select value={controllerSector} onChange={(e) => setControllerSector(e.target.value as any)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Not answered</option>
                  <option value="private">A private company</option>
                  <option value="public">A public body (state or regional)</option>
                  <option value="federal-public">A national government body</option>
                  <option value="telecom">A telecoms provider</option>
                  <option value="postal">A postal provider</option>
                </select>
                <p className="text-meta text-muted-foreground mt-1">Some sectors answer to a specialist regulator rather than the general one. Skipped, your assessment treats the sector as open.</p>
              </div>
              <div data-rail-key="central_administration_country" onFocus={() => handleLocalRailFocus("central_administration_country")}>
                <Label className="text-xs">Where are decisions about this processing made?</Label>
                <CountryPicker id="central-admin-country" value={centralAdminCountry} onChange={setCentralAdminCountry} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The place where your organisation decides what the processing is for and how it runs — not the largest office. Where that place is in Europe, one lead authority can handle the whole file. Skipped, your assessment falls back to the country above (Art. 4(16)(a)).</p>
              </div>
              <div data-rail-key="eu_decision_establishment_country" onFocus={() => handleLocalRailFocus("eu_decision_establishment_country")}>
                <Label className="text-xs">Does a European office make those decisions instead?</Label>
                <CountryPicker id="eu-decision-country" value={euDecisionEstablishment} onChange={setEuDecisionEstablishment} emptyLabel="No — decisions are made elsewhere" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">For groups run from outside Europe: a European office counts only where it genuinely decides the purposes and can put them into effect, not where it carries out head-office instructions. Left as no, your assessment treats the place above as the deciding one.</p>
              </div>
            </div>
          </div>

          {/* ═══ STAGE 4 — RISKS & SAFEGUARDS ══════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">4 · What protects the data, and who has been consulted</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the measures already in place and the advice you have taken — together they set the residual risk your assessment reports.</p>
          </div>

          <div data-rail-key='4.1.c' onFocus={() => handleTemplateRailFocus('4.1.c')}>
            <Label>What already protects this data?</Label>
            <div className="mt-2"><Pills options={SAFEGUARDS} value={safeguards} onChange={setSafeguards} /></div>
            <p className="text-meta text-muted-foreground mt-1">Measures that are live today, not ones you plan to add. Each one lowers the severity your assessment appraises for the risks it identifies; a measure not recorded here is not counted.</p>
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add your protective measures in detail</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering the next five lets your assessment analyse why each kind of data is needed, how you keep it accurate, how people exercise their rights, and what is built into the design. Skipped, each is recorded as open.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='2.2.a' onFocus={() => handleTemplateRailFocus('2.2.a')}>
                <Label>Why is each kind of data you collect needed?</Label>
                <Textarea value={dataMinimisationJustification} onChange={(e) => setDataMinimisationJustification(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Take the categories you named at stage 2 and give the reason each one is there — "vehicle registration is needed to match a ping to a shift; home address is not collected". Your assessment tests each category against its stated reason; skipped, it records the minimisation position as open (Art. 5(1)(c)).</p>
              </div>

              <div data-rail-key='2.2.b' onFocus={() => handleTemplateRailFocus('2.2.b')}>
                <Label>How do you keep the data accurate and up to date?</Label>
                <AssistedInput
                  className="mt-2"
                  value={dataQualityMeasures}
                  onChange={setDataQualityMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dataQualityMeasures.pills}
                  placeholder="One measure per line"
                />
                <p className="text-meta text-muted-foreground mt-1">The checks that catch wrong data and the route by which it is corrected or erased. A strong answer names the check and its frequency — "staff records reconciled against the HR system each month; drivers can flag an incorrect shift in the app". Skipped, your assessment records data quality as open (Art. 5(1)(d)).</p>
              </div>
              <div data-rail-key='2.3.b' onFocus={() => handleTemplateRailFocus('2.3.b')}>
                <Label>How can people exercise their rights over this data?</Label>
                <AssistedInput
                  className="mt-2"
                  value={dataSubjectRightsMechanisms}
                  onChange={setDataSubjectRightsMechanisms}
                  pills={ASSISTED_INPUT_REGISTRY.dataSubjectRightsMechanisms.pills}
                  placeholder="One route per line"
                />
                <p className="text-meta text-muted-foreground mt-1">How someone asks for a copy, a correction, deletion, or objects — and how you handle the request once it arrives. A strong answer names the route and the deadline: "requests to privacy@ are logged and answered within one month". Skipped, your assessment records the rights mechanisms as open (Arts. 12–22).</p>
              </div>
              <div data-rail-key='2.3.d' onFocus={() => handleTemplateRailFocus('2.3.d')}>
                <Label>What protections are built into the design?</Label>
                <AssistedInput
                  className="mt-2"
                  value={dpByDesignMeasures}
                  onChange={setDpByDesignMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dpByDesignMeasures.pills}
                  placeholder="One measure per line"
                />
                <p className="text-meta text-muted-foreground mt-1">Protection that the system applies by default rather than by policy — identifiers stripped at collection, access closed unless granted, tracking off outside shifts. Skipped, your assessment records the design measures as open (Art. 25).</p>
              </div>
              <div data-rail-key='1.4' onFocus={() => handleTemplateRailFocus('1.4')}>
                <Label>Do you follow an approved code of conduct or hold a certification?</Label>
                <Input value={codesOfConduct} onChange={(e) => setCodesOfConduct(e.target.value)} placeholder="Name of the scheme" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Formally approved schemes only — an approved code of conduct or a certification issued under the regulation. General standards you follow internally belong with your design measures above. Skipped, your assessment records that none is on the record (Arts. 40, 42).</p>
              </div>
            </div>
          </details>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add the advice you have taken</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering the next two lets your assessment record the officer's advice and the views of the people affected. Skipped, both are recorded as open, and the law treats the second as a step that needs explaining.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='5.1' onFocus={() => handleTemplateRailFocus('5.1')}>
                <Label>What has your data protection officer advised?</Label>
                <Textarea value={dpoAdvice} onChange={(e) => setDpoAdvice(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The advice given on this assessment, and what you did with it. A strong answer records both sides — "the officer advised limiting tracking to rostered hours; this was adopted before launch". Where you departed from the advice, your reason belongs here too. Skipped, your assessment records the officer's advice as open (Art. 35(2)).</p>
              </div>
              <div data-rail-key="data_subjects_views" onFocus={() => handleLocalRailFocus("data_subjects_views")}>
                <Label>Have you asked the people affected what they think?</Label>
                <select value={dataSubjectsViewsSought} onChange={(e) => setDataSubjectsViewsSought(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Not answered</option>
                  <option value="Yes — views sought">Yes — views sought</option>
                  <option value="No — not sought">No — not sought</option>
                  <option value="Planned">Planned but not yet done</option>
                  <option value="Not appropriate — justified">Not appropriate (with justification)</option>
                </select>
                <Textarea value={dataSubjectsViews} onChange={(e) => setDataSubjectsViews(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Where views were sought: how you asked and what came back. Where they were not: why asking is not appropriate. A strong answer shows the effect — "consulted the works council in March; two objections about out-of-hours tracking led to tracking being limited to rostered shifts". Consultation is the expected course and not consulting is what needs a reason, so silence here is recorded as an unexplained omission (Art. 35(9)).</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 5 — SIGN-OFF ════════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">5 · Who prepared this, and who approves it</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the accountability record: the people behind the assessment and the official who accepts it as complete. Without entries here your assessment names no one and records the attestation as incomplete.</p>
          </div>

          <div data-rail-key="dpia_prepared_by" onFocus={() => handleLocalRailFocus("dpia_prepared_by")}>
            <Label>Who prepared this assessment?</Label>
            <Textarea value={dpiaPreparedBy} onChange={(e) => setDpiaPreparedBy(e.target.value)} placeholder="One person per line" className="mt-2 min-h-20" />
            <p className="text-meta text-muted-foreground mt-1">Each person and the role they held, one per line — "A. Okonjo — Privacy Counsel; R. Lindqvist — Head of Platform Engineering; D. Dasher — data protection officer". A department name records no one. Left empty, your assessment states that the team who prepared it is not identified and marks the record insufficient on that point (Art. 35(7)).</p>
          </div>
          <div data-rail-key='0.5' onFocus={() => handleTemplateRailFocus('0.5')}>
            <Label>Who is responsible, accountable, consulted and informed?</Label>
            <Input value={dpiaTeam} onChange={(e) => setDpiaTeam(e.target.value)} placeholder="Names against each role" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">A formal split of responsibility where your organisation uses one: who owns the work, who answers for it, who was asked, who was told. Skipped, your assessment relies on the names above alone.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")}>
              <Label>Who approves this assessment as complete?</Label>
              <Input value={dpiaApprovedByName} onChange={(e) => setDpiaApprovedByName(e.target.value)} placeholder="M. Ferrante" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">The official who can accept the remaining risk for your organisation. Left empty, your assessment records it as not formally validated.</p>
            </div>
            <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")}>
              <Label>What is that person's title?</Label>
              <Input value={dpiaApprovedByTitle} onChange={(e) => setDpiaApprovedByTitle(e.target.value)} placeholder="Managing Director" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">The capacity they approve in — it is what shows they had the authority. Left empty, your assessment lists the title as outstanding.</p>
            </div>
          </div>
          <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")}>
            <Label>When was it formally approved?</Label>
            <Input type="date" value={dpiaApprovalDate} onChange={(e) => setDpiaApprovalDate(e.target.value)} className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The date approval was given, which is a separate event from the day the document was finished. Left empty, your assessment lists the approval date as outstanding.</p>
          </div>
          <div data-rail-key="dpia_signoff_basis" onFocus={() => handleLocalRailFocus("dpia_signoff_basis")}>
            <Label>What does the approval rest on?</Label>
            <Textarea value={dpiaSignoffBasis} onChange={(e) => setDpiaSignoffBasis(e.target.value)} className="mt-2 min-h-16" />
            <p className="text-meta text-muted-foreground mt-1">The reasoning behind the signature: which sections were reviewed, which remaining risks were accepted, and any condition attached. A strong answer is specific — "sections 3 and 4 reviewed on 12 April 2026; two moderate residual risks accepted; conditional on the 30-day deletion job being verified in production before launch". "Approved subject to compliance" records no decision. Left empty, your assessment lists the basis for sign-off as outstanding.</p>
          </div>
          <div data-rail-key='0.5' onFocus={() => handleTemplateRailFocus('0.5')}>
            <Label>Which guidance or standards did you follow?</Label>
            <Input value={referenceMaterials} onChange={(e) => setReferenceMaterials(e.target.value)} placeholder="ISO 29134" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">Any template, regulator guidance or standard you worked from. Skipped, your assessment records the reference materials as open.</p>
          </div>
          <div data-rail-key='0.5.publication' onFocus={() => handleTemplateRailFocus('0.5.publication')}>
            <Label>Will you publish or share this assessment?</Label>
            <select value={publicationIntent} onChange={(e) => setPublicationIntent(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Not answered</option>
              <option>No</option>
              <option>Yes — published</option>
              <option>Yes — shared externally</option>
            </select>
            <p className="text-meta text-muted-foreground mt-1">Publishing an assessment builds trust, and it is worth holding back detailed security information if you do. Skipped, your assessment records the publication intent as open.</p>
          </div>

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
