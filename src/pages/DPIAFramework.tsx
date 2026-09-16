
import { useState, useEffect, useMemo } from "react";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";
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
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { productEyebrow } from "@/config/productEyebrow";
import { ProductHero, ProductHeroSubstrip } from "@/components/ProductHero";
import HeroPriceCta from "@/components/product/HeroPriceCta";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import { INCLUDED_GENERATIONS_HERO } from "@/config/pricing";
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
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";
// ITEM 381 — intake completeness coach (Layer 1), per-product flag, default off.
import IntakeCoachStep from "@/components/intake/IntakeCoachStep";
import { isIntakeCoachEnabled } from "@/config/intakeCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
// DPIA Intake Master Review (2026-09-15) — field-linked errors, the pure
// intake helpers (screening, special-category status, transfer rows), and
// the picker sentinels.
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { fail, rowKey, type StepIssue } from "@/lib/intakeValidation";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";
import { EDPB_GUIDANCE_STATUS_NOTE } from "@/components/dpia/EdpbDpiaGuidance";
import { COUNTRY_OTHER_VALUE, COUNTRY_UNKNOWN_VALUE } from "@/components/dpia/CountryPicker";
import {
  dpiaScreeningPrompts, specialCategoryStatus, art9Asked, art9PayloadValue, ART9_NOT_APPLICABLE_BIOMETRIC,
  SPECIAL_CATEGORY_CATS, splitOtherProcessor, normaliseTransferRows, transferRowsIssue, emptyTransferRow,
  transferRowMissing, normaliseAlternativeRows, alternativesIssue, TRANSFER_PRESENCE_YES, TRANSFER_PRESENCE_NO,
  type TransferRow, type AlternativeRow,
} from "@/lib/dpiaIntake";


// RC-FLIP-3 — intake option sets extracted to DPIAFramework.enums.ts so shared
// components (refine surface) import from a page-free module. Page re-exports.
export {
  DATA_CATS, TOOLS, SAFEGUARDS, JURISDICTIONS,
  LEGAL_BASES, ARTICLE_9_CONDITIONS, REASONS_TO_CONDUCT,
  AUTOMATED_DECISION_NATURE,
} from "@/pages/DPIAFramework.enums";
import {
  DATA_CATS, TOOLS, SAFEGUARDS, JURISDICTIONS,
  LEGAL_BASES, ARTICLE_9_CONDITIONS, REASONS_TO_CONDUCT,
  IMAGERY_CAPTURE, IMAGERY_SPACES, AUTOMATED_DECISION_NATURE,
  BIOMETRIC_UNIQUE_ID, TRANSFER_PRESENCE, PROCESSING_END_STATUS, ALTERNATIVE_OUTCOMES,
  SAFEGUARDS_EXCLUSIVE, CONTROLLER_SECTOR_OPTS,
} from "@/pages/DPIAFramework.enums";
import { ClipboardList, Zap } from 'lucide-react';
// DATA_CATS labels that can put Art. 9 in play (shared with src/lib/dpiaIntake.ts;
// F08: biometric data is special-category only when used to uniquely identify).
void SPECIAL_CATEGORY_CATS;

// Price tiers managed by useToolPrice hook (subscriber-aware)

// DPIA master review (2026-09-15, F21) — the group carries an accessible
// name; each pill exposes its selected state; an `exclusive` option clears
// the others and is cleared by a positive one (F10 "None").
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

/** F07 — open every <details> ancestor of the flagged question so the focus can land on it. */
function revealFieldAncestors(key: string) {
  if (typeof document === "undefined") return;
  const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape : (s: string) => s.replace(/["\\]/g, "\\$&");
  const base = key.indexOf("[") === -1 ? key : key.slice(0, key.indexOf("["));
  const el = document.querySelector<HTMLElement>(`[data-field="${esc(key)}"]`) ?? document.querySelector<HTMLElement>(`[data-field="${esc(base)}"]`);
  let node: HTMLElement | null = el;
  while (node) {
    const details = node.closest("details");
    if (!details) break;
    details.open = true;
    node = details.parentElement;
  }
}

/**
 * F13 — intentional shared rail mappings, recorded rather than implied. A
 * field whose data-rail-key names a LOCAL entry (DPIA_RAIL) instead of the
 * EDPB template key covering the same paragraph:
 *   dpia_scope_note        → local entry (template 0.5.scope covers the same § 0.5 paragraph)
 *   data_subjects_views    → local entry (template 5.2)
 *   dpia_approval          → local entry (template 0.5.validation)
 * The team / RACI question maps to the template's own 0.5.team entry.
 */
const RAIL_KEY_ALIASES = { dpia_scope_note: "0.5.scope", data_subjects_views: "5.2", dpia_approval: "0.5.validation" } as const;
void RAIL_KEY_ALIASES;

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
  // DPIA master review (2026-09-15, F08) — the "Other" description and the
  // Art. 9(1) biometric-purpose answer.
  const [dataCategoriesOther, setDataCategoriesOther] = useState("");
  const [biometricUniqueId, setBiometricUniqueId] = useState("");
  const [dataSubjects, setDataSubjects] = useState("");
  const [volume, setVolume] = useState("");
  const [processors, setProcessors] = useState<string[]>([]);
  const [otherProcessor, setOtherProcessor] = useState("");
  const [safeguards, setSafeguards] = useState<string[]>([]);
  const [safeguardsOther, setSafeguardsOther] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [legalBasis, setLegalBasis] = useState("");
  const [article9Condition, setArticle9Condition] = useState("");
  const [necessityProportionality, setNecessityProportionality] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  // DOC 160 (2026-09-03) — the DOC 131 imagery-capture typed facts, wired to
  // the form (contract keys since 2026-09-01; the UI wiring was open).
  const [imageryCapture, setImageryCapture] = useState("");
  const [imageryCaptureSpaces, setImageryCaptureSpaces] = useState("");
  const [imageryCaptureDetail, setImageryCaptureDetail] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // ITEM 381 — the review step is advisory and shown at most once per run.
  // DPIA F19 (2026-09-15): it can be reopened on request after edits.
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachSeen, setCoachSeen] = useState(false);
  // F07 — the fleet field-error contract.
  const fieldErrors = useFieldErrors();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errAnchor = (k: string) => ({
    "data-field": k,
    "aria-invalid": fieldErrors.isInvalid(k) ? true : undefined,
    onClickCapture: () => fieldErrors.clear(k),
  });
  // F03 — the narrative an exhibit sentinel replaced, owned by the page so
  // it survives remounts and draft round-trips.
  const [processorObligationsStash, setProcessorObligationsStash] = useState("");
  const [supportingAssetsStash, setSupportingAssetsStash] = useState("");

  // EDPB template — Section 0 (Overview of the processing). All optional in this tranche.
  const [controllerContact, setControllerContact] = useState("");        // 0.1 main establishment / point of contact
  const [dpoInfo, setDpoInfo] = useState("");                            // 0.1 DPO or similar function
  const [processorObligations, setProcessorObligations] = useState("");  // 0.2 obligations & tasks
  const [processingVersion, setProcessingVersion] = useState("");        // 0.3 current version / change history
  const [launchDate, setLaunchDate] = useState("");                      // 0.4 estimated launch date
  const [processingEndStatus, setProcessingEndStatus] = useState("");    // F11 — ongoing / temporary / undecided
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
  // DOC 259A §5.1 — shown only when a selected reason is an evaluation/
  // scoring, automated-decision-making, or systematic-extensive-evaluation
  // reason; decides whether the Art. 22 risk (r8) or the scoring-informs-
  // human-decisions risk (r8b) is carried.
  const [automatedDecisionNature, setAutomatedDecisionNature] = useState("");
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
  const [alternativesConsidered, setAlternativesConsidered] = useState<AlternativeRow[]>([]);
  // INTAKE-4d — CEO-approved addition. Residual risk after the safeguards (Art. 35(7)(d)).
  const [residualRisks, setResidualRisks] = useState("");

  const [activeTemplateRef, setActiveTemplateRef] = useState<string | null>(null);

  // ── Jurisdiction resolver inputs (Layer 5 — feed the deterministic resolvers) ──
  const [controllerCountry, setControllerCountry] = useState("");          // ISO-2 e.g. DE, IE, FR, GB — or OTHER / UNKNOWN (F06)
  const [controllerCountryOther, setControllerCountryOther] = useState(""); // F06 — the country named when OTHER
  const [controllerLand, setControllerLand] = useState("");                // DE only
  const [controllerSector, setControllerSector] = useState<"private" | "public" | "federal-public" | "telecom" | "postal" | "">("");
  const [controllerIndustry, setControllerIndustry] = useState("");        // F06 — industry, separate from regulator routing
  const [centralAdminCountry, setCentralAdminCountry] = useState("");      // for OSS
  const [euDecisionEstablishment, setEuDecisionEstablishment] = useState(""); // ISO-2 of EU est. with decision authority; "" = no; UNKNOWN = not sure
  // F05 / F11 — the contract's own row schema; presence is an explicit answer.
  const [transferPresence, setTransferPresence] = useState("");
  const [transferFlows, setTransferFlows] = useState<TransferRow[]>([]);
  const [retentionRecordType, setRetentionRecordType] = useState("");      // e.g. "payroll", "accounting"

  
  const guidanceTier = useGuidanceTier();
  const [activeRailField, setActiveRailField] = useState<"trigger" | "legal_basis" | "transfers" | null>(null);
  // F08 — health data is special-category as such; biometric data only when
  // used to uniquely identify a person; an unstated purpose keeps Art. 9 open.
  const specialStatus = specialCategoryStatus(dataCategories, biometricUniqueId);
  const hasSpecialCategory = art9Asked(specialStatus);
  const biometricSelected = dataCategories.includes("Biometric data");
  // F15 — the regime the fetched-law rail shows follows the jurisdictions selected.
  const ukSelected = jurisdictions.includes("United Kingdom (UK GDPR)");
  const euSelected = jurisdictions.includes("EU (GDPR)");
  const railJurisdiction: "eu" | "uk" = ukSelected && !euSelected ? "uk" : "eu";
  const regimeLabel = ukSelected && euSelected ? "GDPR and UK GDPR" : ukSelected ? "UK GDPR" : "GDPR";
  // DOC 259A §5.1 — same regex the contract triggers on: reasons_to_conduct
  // contains an evaluation/scoring, automated-decision-making, or
  // systematic-extensive-evaluation reason.
  const hasAutomatedDecisionReason = reasonsToConduct.some((r) =>
    /Evaluation or scoring|Automated decision-making|Systematic, extensive evaluation/.test(r));
  

  // DPIA master review (2026-09-15, F15) — the regime is selected and
  // labelled from the jurisdictions the customer chose; no legal basis is
  // ranked against another; the EEA and the UK are distinct origins.
  const dpiaRailConfigs = {
    trigger: {
      article: "35", jurisdiction: railJurisdiction, recital: 84,
      fieldLabel: `DPIA trigger — Art. 35 ${regimeLabel}`,
      plainSummary: `A DPIA is required where processing is likely to result in a high risk to the rights and freedoms of natural persons (Art. 35(1)). Art. 35(3) names three cases in which it is required in particular: systematic and extensive evaluation based on automated processing, including profiling, with legal or similarly significant effects; large-scale processing of special-category or criminal-conviction data; and large-scale systematic monitoring of a publicly accessible area. Supervisory authorities publish further lists (Art. 35(4)). Shown for the ${regimeLabel}${ukSelected && euSelected ? "; the two texts are aligned on this article" : ""}.`,
      relatedCitations: [
        { citation: "Art. 35(3) GDPR", label: "The three named cases" },
        { citation: "Recital 89 GDPR", label: "Why prior assessment replaced general notification" },
        { citation: "Recital 91 GDPR", label: "Large-scale processing and monitoring" },
      ],
      coachLead: "Record the facts each Art. 35(3) case turns on — scale, systematic character, effects — rather than the conclusion.",
      coachBody: "The screening prompts on the page are checks, not findings. The report tests the facts you record in the description, volume, data-subject and imagery answers against each case.",
      goodAnswer: "Art. 35(3)(b) is engaged by special-category processing that is LARGE-SCALE; the EDPB's factors are the number of data subjects, the volume and range of data, the duration and the geographical extent. Recording those four facts lets the report say which way the case falls; naming the category alone does not.",
      goodAnswerKind: "explanation" as const,
    },
    legal_basis: {
      article: "6", jurisdiction: railJurisdiction, recital: 40,
      fieldLabel: `Legal basis — Art. 6(1) ${regimeLabel}`,
      plainSummary: `Processing is lawful only if at least one of the six Art. 6(1) bases applies. Each basis has its own conditions: consent must be freely given, specific, informed and unambiguous (Art. 4(11), Art. 7); contract, legal obligation, vital interests and public task each require the processing to be necessary for the stated end; legitimate interests require the balancing test in Art. 6(1)(f). The DPIA records the basis proposed and analyses it; it does not rank one basis as safer than another. Shown for the ${regimeLabel}.`,
      relatedCitations: [
        { citation: "Art. 9 GDPR", label: "Additional condition for special categories" },
        { citation: "Art. 7 GDPR", label: "Conditions for consent" },
      ],
      coachLead: "Name the one basis you would defend, and cite its sub-clause.",
      coachBody: "State why the processing is necessary for that basis's end. Where special-category data is involved, the Art. 9(2) condition is a separate answer below.",
      goodAnswer: "A lawful basis is a legal characterisation of the processing, not a risk rating. Under Art. 6(1)(f) the controller must show the interest is legitimate, the processing is necessary for it, and the interest is not overridden by the data subjects' interests or rights; under Art. 6(1)(a) the controller must be able to demonstrate valid consent (Art. 7(1)).",
      goodAnswerKind: "explanation" as const,
    },
    transfers: {
      article: "44", jurisdiction: railJurisdiction,
      fieldLabel: `International transfers — Chapter V ${regimeLabel}`,
      plainSummary: `A transfer of personal data to a third country needs a Chapter V basis: an adequacy decision (Art. 45), appropriate safeguards such as SCCs or BCRs (Art. 46), or a derogation (Art. 49). The EEA and the UK are distinct origins with distinct routes: a UK-origin flow relies on UK adequacy regulations, the IDTA or UK Addendum, or the UK Extension to the EU–US DPF; an EU-origin flow relies on the Commission's decisions, the 2021 SCCs, or the EU–US DPF. Flows between the EEA and the UK are covered by adequacy in both directions. Shown for the ${regimeLabel}.`,
      relatedCitations: [
        { citation: "Art. 45 GDPR", label: "Adequacy decisions" },
        { citation: "Art. 46(2)(c) GDPR", label: "Standard Contractual Clauses" },
        { citation: "EDPB Recommendations 01/2020", label: "Supplementary measures and transfer assessment" },
      ],
      coachLead: "Record each route separately: who receives the data, in which country, sent from the EEA or from the UK.",
      coachBody: "The report names a Chapter V basis for each complete row from its destination, origin and certification facts. Remote access, backups and group companies are routes too.",
      goodAnswer: "A US importer certified under the EU–US Data Privacy Framework is an adequacy-covered destination for EU-origin data (Art. 45); the same importer needs the UK Extension certification for UK-origin data. Where no adequacy applies, Art. 46 safeguards carry the transfer, with a transfer impact or risk assessment documented.",
      goodAnswerKind: "explanation" as const,
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
    // DPIA master review (2026-09-15, F12 / F14): the completion advice goes
    // to the coaching surface (coachLead / coachBody); the template text
    // appears once, in the template block; a WP248 quotation is headed as
    // guidance, never as regulation text; nothing is repeated as a summary.
    return {
      fieldLabel: g.verbatimPropositionKey
        ? `EDPB WP248 rev.01 · ${g.sectionTitle}`
        : `EDPB DPIA template · § ${g.sectionRef} ${g.sectionTitle}`,
      citation: g.citation ?? `EDPB DPIA template § ${g.sectionRef} (consultation version)`,
      citationUrl: sourceUrl,
      plainSummary: g.verbatimPropositionKey
        ? "The EDPB-endorsed WP248 rev.01 guidelines, quoted verbatim below, set the criteria the report applies to this question."
        : EDPB_GUIDANCE_STATUS_NOTE,
      regulationText: g.verbatimPropositionKey ? (edpbRegulationText ?? "") : "",
      regulationTextKind: "guidance" as const,
      regulationTextHeading: "EDPB WP248 rev.01 (verbatim guidance)",
      coachLead: g.coachLead,
      coachBody: g.coachBody,
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

  // DPIA master review (2026-09-15, F01) — potential Art. 35 triggers to
  // CHECK, from the shared data-category labels, with clause-scoped negation
  // ("we do not perform profiling" raises nothing). A prompt is a screening
  // cue; the deciding facts (scale, systematic character, effects) are not
  // in it, so nothing here states that a trigger is satisfied.
  const screening = useMemo(() => dpiaScreeningPrompts({
    dataCategories, description, biometricAnswer: biometricUniqueId, reasonsToConduct,
    imageryCapture, imageryCaptureSpaces,
  }), [dataCategories, description, biometricUniqueId, reasonsToConduct, imageryCapture, imageryCaptureSpaces]);


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

  // DPIA master review (2026-09-15, F07) — every check names its field; the
  // required markers, the contract's conditional triggers and this check
  // agree; an honest "Not sure" / "Not yet established" is a complete answer.
  const validate = (): StepIssue | null => {
    if (!organizationName.trim()) return fail("organization_name", "Tell us the name of the organisation being assessed.");
    if (!name.trim()) return fail("processing_activity_name", "Processing activity name is required.");
    if (description.trim().length < 100) return fail("description", "Describe what happens to the data in at least 100 characters — the analysis works from this account.");
    if (!purpose.trim()) return fail("purpose", "Purpose is required.");
    if (!dataCategories.length) return fail("data_categories", "Select at least one data category.");
    if (dataCategories.includes("Other") && !dataCategoriesOther.trim()) return fail("data_categories_other", "Describe the other category of personal data.");
    if (biometricSelected && !biometricUniqueId) return fail("biometric_unique_identification", "Say whether the biometric data is used to uniquely identify people — \"Not sure\" is a complete answer.");
    if (!dataSubjects.trim()) return fail("data_subjects", "Data subjects are required.");
    if (!volume.trim()) return fail("volume_frequency", "Volume and frequency required.");
    if (!jurisdictions.length) return fail("jurisdictions", "Select at least one jurisdiction.");
    if (!legalBasis) return fail("legal_basis_proposed", "Select a legal basis.");
    if (hasSpecialCategory && !article9Condition) return fail("article_9_condition", "Select the Article 9(2) condition you rely on for the special-category data — \"Not yet established\" is a complete answer.");
    if (imageryCapture && imageryCapture !== IMAGERY_CAPTURE[0] && !imageryCaptureSpaces) return fail("imagery_capture_spaces", "Say where the imagery is captured — Article 35(3)(c) turns on it.");
    if (!retentionPeriod.trim()) return fail("retention_period", "Retention period is required.");
    if (!necessityProportionality.trim()) return fail("necessity_proportionality", "Describe necessity, proportionality and alternatives considered.");
    if (hasAutomatedDecisionReason && !automatedDecisionNature) return fail("automated_decision_nature", "Say whether decisions are taken solely by automated means or with meaningful human review — the reason you selected turns on it.");
    if (controllerCountry === "DE" && !controllerLand) return fail("controller_land", "Select the German state (Land), or \"Not sure which Land\" — the competent authority depends on it.");
    if (controllerCountry === COUNTRY_OTHER_VALUE && !controllerCountryOther.trim()) return fail("controller_country_other", "Name the country your organisation is established in.");
    const tx = transferRowsIssue(transferFlows, transferPresence);
    if (tx) return fail(tx.index < 0 ? "transfer_presence" : rowKey("transfer_flows", tx.index, tx.field), tx.message);
    const alt = alternativesIssue(alternativesConsidered);
    if (alt) return fail(rowKey("alternatives_considered", alt.index, alt.field), alt.message);
    return null;
  };
  /** F07 — flag, reveal (open any containing group) and focus the first failing question. */
  const showIssue = (issue: StepIssue) => {
    setValidationError(issue.message);
    for (const k of issue.fields) revealFieldAncestors(k);
    fieldErrors.show(issue.fields, issue.message);
  };

  const buildIntake = () => ({
    organization_name: organizationName,
    processing_activity_name: name,
    description, purpose,
    data_categories: dataCategories,
    // DPIA master review (2026-09-15, F08) — hidden branch values travel blank.
    data_categories_other: dataCategories.includes("Other") ? dataCategoriesOther : "",
    biometric_unique_identification: biometricSelected ? biometricUniqueId : "",
    // DOC 160 — imagery-capture typed facts; spaces is hidden-empty unless capture is reported.
    imagery_capture: imageryCapture,
    imagery_capture_spaces: imageryCapture && imageryCapture !== IMAGERY_CAPTURE[0] ? imageryCaptureSpaces : "",
    imagery_capture_detail: imageryCaptureDetail,
    data_subjects: dataSubjects,
    volume_frequency: volume,
    third_party_processors: otherProcessor.trim() ? [...processors, `Other: ${otherProcessor.trim()}`] : processors,
    existing_safeguards: safeguards,
    safeguards_other: safeguardsOther,
    jurisdictions,
    legal_basis_proposed: legalBasis,
    // F08 — a biometric "No" travels the explicit not-applicable answer, never a blank.
    article_9_condition: art9PayloadValue(specialStatus, article9Condition),
    necessity_proportionality: necessityProportionality,
    retention_period: retentionPeriod,
    // EDPB template — Section 0 (carried now; consumed by the edge rebuild tranche)
    controller_contact: controllerContact,
    dpo_info: dpoInfo,
    processor_obligations: processorObligations,
    processing_version: processingVersion,
    estimated_launch_date: launchDate,
    // F11 — ongoing / temporary / undecided is stated, never inferred from a blank date.
    processing_end_status: processingEndStatus,
    estimated_end_date: endDate,
    dpia_team: dpiaTeam,
    dpia_prepared_by: dpiaPreparedBy,
    dpia_approved_by_name: dpiaApprovedByName,
    dpia_approved_by_title: dpiaApprovedByTitle,
    dpia_approval_date: dpiaApprovalDate,
    dpia_signoff_basis: dpiaSignoffBasis,
    reference_materials: referenceMaterials,
    reasons_to_conduct: reasonsToConduct,
    // DOC 259A §5.1 — omitted (undefined) rather than an empty string when no
    // qualifying reason is selected, matching the contract's optional key.
    ...(hasAutomatedDecisionReason ? { automated_decision_nature: automatedDecisionNature } : {}),
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
    // Rows are emitted as plain JSON objects (outcome only when recorded).
    alternatives_considered: alternativesConsidered.map((a) => ({ processing_operation: a.processing_operation, alternative: a.alternative, rejection_reason: a.rejection_reason, ...(a.outcome ? { outcome: a.outcome } : {}) })),
    residual_risks: residualRisks,

    // Jurisdiction resolver inputs (deterministic resolvers in run-dpia-framework)
    // F04 / F06 — a hidden Land travels blank; OTHER carries its description;
    // industry is separate from the regulator-routing sector.
    controller_country: controllerCountry,
    controller_country_other: controllerCountry === COUNTRY_OTHER_VALUE ? controllerCountryOther : "",
    controller_land: controllerCountry === "DE" ? controllerLand : "",
    controller_sector: controllerSector,
    controller_industry: controllerIndustry,
    central_administration_country: centralAdminCountry,
    eu_decision_establishment_country: euDecisionEstablishment,
    // F05 / F11 — the contract's row schema; presence is explicit.
    transfer_presence: transferPresence,
    transfer_flows: transferFlows.map((f) => ({ recipient: f.recipient, destination_country: f.destination_country, origin_regime: f.origin_regime, transfer_mechanism: f.transfer_mechanism, dpf_certified: f.dpf_certified, uk_extension_certified: f.uk_extension_certified, notes: f.notes })),
    retention_record_type: retentionRecordType,
    source_assessment_id: sourceId || null,
  });

  // Autosave: persist buildIntake() payload; restore via a setters registry.
  // DPIA F03 (2026-09-15): the draft also carries the page-only exhibit
  // stash under `_draft`, so a narrative replaced by an exhibit sentinel
  // survives a reload; the checkout payload is buildIntake() alone.
  const draftData = useMemo(() => ({
    ...buildIntake(),
    _draft: { processor_obligations_stash: processorObligationsStash, supporting_assets_stash: supportingAssetsStash },
  }), [
    organizationName, name, description, purpose, dataCategories, dataCategoriesOther, biometricUniqueId, dataSubjects, volume,
    processors, otherProcessor, safeguards, safeguardsOther, jurisdictions, legalBasis, article9Condition, specialStatus,
    imageryCapture, imageryCaptureSpaces, imageryCaptureDetail,
    necessityProportionality, retentionPeriod, controllerContact, dpoInfo, processorObligations,
    processingVersion, launchDate, processingEndStatus, endDate, dpiaTeam, dpiaPreparedBy, dpiaApprovedByName,
    dpiaApprovedByTitle, dpiaApprovalDate, dpiaSignoffBasis, referenceMaterials, reasonsToConduct,
    automatedDecisionNature,
    dpiaScopeNote, publicationIntent, secondaryUses, natureScopeContext, functionalDescription,
    supportingAssets, codesOfConduct, dataMinimisationJustification, dataQualityMeasures,
    dataSubjectRightsMechanisms, dpByDesignMeasures, dpoAdvice, dataSubjectsViewsSought,
    dataSubjectsViews, controllerCountry, controllerCountryOther, controllerLand, controllerSector, controllerIndustry, centralAdminCountry,
    euDecisionEstablishment, transferPresence, transferFlows, retentionRecordType, alternativesConsidered, residualRisks,
    processorObligationsStash, supportingAssetsStash,
  ]);
  const initialDraftJson = useMemo(() => JSON.stringify(draftData), []);
  const touched = useMemo(() => JSON.stringify(draftData) !== initialDraftJson, [draftData, initialDraftJson]);
  // DPIA F02 (2026-09-15) — a refine run or a governance-sourced start scopes
  // the draft to that assessment; otherwise the found row is adopted only on
  // Resume, and typing before the choice saves to a separate row.
  const draftKey = refine.assessmentId ?? (sourceId ? `dpia-source:${sourceId}` : null);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft, resumeDraft, startNewDraft,
    saving: draftSaving, lastSavedAt: draftSavedAt, saveError: draftSaveError, draftChoice,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "dpia",
    clientId: clientId ?? null,
    assessmentKey: draftKey,
    data: draftData,
    currentStage: 0,
    enabled: !!user && touched,
  });
  // F04 / F05 — a restored value is checked against the shape and the
  // options the page can show; nothing is silently dropped: legacy rows are
  // read losslessly and the folded "Other: …" supplier returns to its control.
  const applyRestore = () => {
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    const S = (v: any, fn: (x: string) => void) => { if (typeof v === "string") fn(v); };
    const A = (v: any, fn: (x: any[]) => void) => { if (Array.isArray(v)) fn(v); };
    const E = (v: any, opts: readonly string[], fn: (x: string) => void) => { if (typeof v === "string") fn(opts.includes(v) ? v : ""); };
    S(d.organization_name, setOrganizationName);
    S(d.processing_activity_name, setName);
    S(d.description, setDescription);
    S(d.purpose, setPurpose);
    A(d.data_categories, setDataCategories);
    S(d.data_categories_other, setDataCategoriesOther);
    E(d.biometric_unique_identification, BIOMETRIC_UNIQUE_ID, setBiometricUniqueId);
    S(d.imagery_capture, setImageryCapture);
    S(d.imagery_capture_spaces, setImageryCaptureSpaces);
    S(d.imagery_capture_detail, setImageryCaptureDetail);
    S(d.data_subjects, setDataSubjects);
    S(d.volume_frequency, setVolume);
    {
      const split = splitOtherProcessor(d.third_party_processors);
      setProcessors(split.processors);
      if (split.otherProcessor) setOtherProcessor(split.otherProcessor);
    }
    A(d.existing_safeguards, setSafeguards);
    S(d.safeguards_other, setSafeguardsOther);
    A(d.jurisdictions, setJurisdictions);
    S(d.legal_basis_proposed, setLegalBasis);
    // The automatic not-applicable answer is derived, so it is not restored as a selection.
    if (typeof d.article_9_condition === "string") setArticle9Condition(d.article_9_condition === ART9_NOT_APPLICABLE_BIOMETRIC ? "" : d.article_9_condition);
    S(d.necessity_proportionality, setNecessityProportionality);
    S(d.retention_period, setRetentionPeriod);
    S(d.controller_contact, setControllerContact);
    S(d.dpo_info, setDpoInfo);
    S(d.processor_obligations, setProcessorObligations);
    S(d.processing_version, setProcessingVersion);
    S(d.estimated_launch_date, setLaunchDate);
    E(d.processing_end_status, PROCESSING_END_STATUS, setProcessingEndStatus);
    S(d.estimated_end_date, setEndDate);
    S(d.dpia_team, setDpiaTeam);
    S(d.dpia_prepared_by, setDpiaPreparedBy);
    S(d.dpia_approved_by_name, setDpiaApprovedByName);
    S(d.dpia_approved_by_title, setDpiaApprovedByTitle);
    S(d.dpia_approval_date, setDpiaApprovalDate);
    S(d.dpia_signoff_basis, setDpiaSignoffBasis);
    S(d.reference_materials, setReferenceMaterials);
    A(d.reasons_to_conduct, setReasonsToConduct);
    S(d.automated_decision_nature, setAutomatedDecisionNature);
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
    setAlternativesConsidered(normaliseAlternativeRows(d.alternatives_considered));
    S(d.residual_risks, setResidualRisks);
    S(d.controller_country, (v) => setControllerCountry(v.toUpperCase()));
    S(d.controller_country_other, setControllerCountryOther);
    S(d.controller_land, setControllerLand);
    // F06 — a legacy industry word in controller_sector is kept as the industry, visibly.
    if (["private","public","federal-public","telecom","postal",""].includes(d.controller_sector)) setControllerSector(d.controller_sector);
    else if (typeof d.controller_sector === "string" && d.controller_sector) { setControllerSector(""); setControllerIndustry((prev) => prev || d.controller_sector); }
    S(d.controller_industry, setControllerIndustry);
    S(d.central_administration_country, (v) => setCentralAdminCountry(v.toUpperCase()));
    S(d.eu_decision_establishment_country, (v) => setEuDecisionEstablishment(v.toUpperCase()));
    E(d.transfer_presence, TRANSFER_PRESENCE, setTransferPresence);
    setTransferFlows(normaliseTransferRows(d.transfer_flows));
    S(d.retention_record_type, setRetentionRecordType);
    // F03 — the exhibit stash rides the draft only.
    const stash = (d._draft && typeof d._draft === "object" ? d._draft : {}) as Record<string, unknown>;
    S(stash.processor_obligations_stash, setProcessorObligationsStash);
    S(stash.supporting_assets_stash, setSupportingAssetsStash);
    // F02 — the found draft becomes the autosave target only now.
    resumeDraft();
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

  const handlePurchase = async () => {
    const issue = validate();
    // F07 — the failing question is named, highlighted, revealed and focused;
    // the summary above the action offers a link back to it.
    if (issue) { showIssue(issue); toast({ title: "One question needs an answer", description: issue.message, variant: "destructive" }); return; }
    setValidationError(null);
    fieldErrors.clearAll();
    if (!user) { setAuthGateOpen(true); return; }

    // ITEM 381 — advisory review step, before checkout and without altering it.
    // Flag off ⇒ this branch is never taken and the flow is unchanged.
    if (isIntakeCoachEnabled("dpia") && !coachSeen) {
      setCoachSeen(true);
      setCoachOpen(true);
      return;
    }

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
        toast({ title: "Generation failed", description: "Try again.", variant: "destructive" });
        return;
      }
      const { error: fnErr } = await supabase.functions.invoke(
        "run-dpia-framework",
        { body: { dpia_id: row.id } }
      );
      setPurchasing(false);
      if (fnErr) {
        toast({ title: "Generation failed", description: "Try again.", variant: "destructive" });
        return;
      }
      void clearDraft();
      navigate(`/dpia-framework/result/${row.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured — check back soon.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet><title>{`Data Protection Impact Assessment (DPIA) · from $${pricing.subscriberPrice ?? ""} | End User Privacy`}</title></Helmet>
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
      {/* PRE-INTAKE REDESIGN (2026-08-26): nav-only chip, name-led hero with
          the 4-generations support line and the standardized price/CTA block;
          the legal trigger and the DPO-ownership expectation move into the
          card band; the top-up offer leaves the initial purchase path. */}
      <ProductHero
        geography="gdpr"
        eyebrowLabel={<><ClipboardList aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {productEyebrow("dpia")}</>}
        title={<>Data Protection Impact Assessment (DPIA) <DefPopover termKey="gdpr_dpia" /></>}
        valueProposition="Build an EDPB-structured DPIA for one high-risk processing activity, ready for DPO or counsel review."
        citationLine="GDPR Art. 35 · EDPB-structured impact assessment · Regulator guidance cited throughout"
        showIntakeCta={false}
      >
        <HeroPriceCta
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber && pricing.price === pricing.subscriberPrice}
          primaryLabel="Start DPIA"
          toolSlug="dpia"
          sampleSlug="dpia"
        />
      </ProductHero>

      <ProductHeroSubstrip generationsLine={INCLUDED_GENERATIONS_HERO} />

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Does this assessment apply to you?",
            tone: "amber",
            body: "A DPIA is required before high-risk processing, including large-scale special-category data, systematic profiling, or large-scale public-area monitoring (GDPR Article 35).",
          },
          {
            title: "What you receive",
            body: "A structured Article 35 assessment for one processing activity, pre-populated from your answers and organised for necessity and proportionality, risks, safeguards, residual risk, consultation, and sign-off.",
          },
          {
            title: "Built for DPO and counsel review",
            body: "A review-ready assessment record with the facts, analysis, open issues, and sign-off fields your DPO or counsel needs to finalise. It does not satisfy Article 35 on its own — qualified legal review is required before you rely on it.",
          },
          {
            title: "Why trust it",
            body: "Built on GDPR Article 35 and EDPB impact-assessment guidance, with regulator authority cited in the analysis.",
          },
        ]}
      />


      <ToolAlsoAvailableRow currentTool="dpia" />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 bg-paper">
        <ActiveClientLabel />

        {prefilled && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
            Pre-populated from your GDPR Accountability Assessment. Review and edit all fields before purchasing.
          </div>
        )}

        <IntakeMasthead
          kicker="Data Protection Impact Assessment · GDPR Art. 35"
          title="Data Protection Impact Assessment (DPIA)"
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
          preRunHint={REVISIONS_ENABLED ? "Processing activity locks after the first generation; other answers remain editable across included generations." : undefined}
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
          {/* DPIA F02 (2026-09-15): the saved-draft choice is explicit and
              stays visible after typing; save status is shown. */}
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

          {/* ═══ STAGE 1 — WHAT & WHO ══════════════════════════════════ */}
          <div className="pt-1 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">1 · What you are doing, and who is doing it</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the activity your assessment is about and the organisation accountable for it.</p>
          </div>

          <div {...errAnchor("organization_name")}>
            <Label htmlFor="org">Which organisation is this assessment for?<Req /></Label>
            <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Acme Retail Ltd" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The organisation that decides why and how the data is used. That name appears throughout your assessment as the accountable party.</p>
          </div>

          <div data-rail-key="name" onFocus={() => handleLocalRailFocus("name")} {...errAnchor("processing_activity_name")}>
            <Label htmlFor="dpia_name">What do you call this processing activity?<Req /></Label>
            <Input id="dpia_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Employee location monitoring" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">One activity, named the way your organisation refers to it. A good answer names the processing rather than the project — the population and the method usually make it clear. This name is fixed once you generate, and everything else stays editable until you generate.</p>
          </div>

          <div data-rail-key="description" onFocus={() => handleLocalRailFocus("description")} {...errAnchor("description")}>
            <Label htmlFor="dpia_description">What happens to the data, step by step?<Req /></Label>
            <Textarea id="dpia_description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="At least 100 characters" className="mt-2 min-h-32" />
            <p className="text-meta text-muted-foreground mt-1">Walk the data through the system: what is collected and from whom, what happens at each step, who can see it, where it is stored, and how long it is kept. A strong answer uses numbers and names rather than adjectives — "a location ping every five minutes during rostered shifts, stored 90 days in EU-hosted storage, visible to two rostering managers". This description is the main factual base for the risks the assessment analyses (Art. 35(7)(a)); the later answers add to it, and anything described nowhere is recorded as not supplied.</p>
            <IntakeGuidance className="mt-2">If this activity serves more than one purpose or use case, set each one out clearly and separately (number them, or a short paragraph each) — each purpose is analysed and reported on individually.</IntakeGuidance>
          </div>

          <div data-rail-key="purpose" onFocus={() => handleLocalRailFocus("purpose")} {...errAnchor("purpose")}>
            <Label htmlFor="dpia_purpose">Why are you doing this?<Req /></Label>
            <Textarea id="dpia_purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The outcome the processing exists to achieve. A strong answer gives one purpose per paragraph and, for each, what data it needs and how long that data is kept — "(1) shift-attendance verification, ping data, 90 days; (2) route planning, aggregated paths only, 12 months". Each purpose you state is tested separately for necessity, so a bundled purpose produces a weaker analysis of all of them.</p>
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add the administrative details</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering these administrative details lets your assessment identify the controller, the timeline and the reason it was carried out. Skipped, each of them is recorded as not supplied.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')}>
                <Label htmlFor="dpia_controller_contact">Who is the contact point for this processing?</Label>
                <Input id="dpia_controller_contact" value={controllerContact} onChange={(e) => setControllerContact(e.target.value)} placeholder="Head of Operations, Dublin" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The unit, main establishment or representative answerable for this activity, and how to reach them. Where two organisations decide the purposes together, name both and say what each is responsible for. Skipped, your assessment records the contact point as not stated.</p>
              </div>
              <div data-rail-key='0.1' onFocus={() => handleTemplateRailFocus('0.1')} data-field="dpo_info">
                <Label htmlFor="dpia_dpo_info">Who is your data protection officer?</Label>
                <Input id="dpia_dpo_info" name="dpo_info" autoComplete="off" value={dpoInfo} onChange={(e) => setDpoInfo(e.target.value)} placeholder="Name and email" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Contact details only. Whether the officer has advised on this assessment belongs in the consultation questions at stage 4. Skipped, your assessment records the officer's details as not supplied.</p>
              </div>
              <div data-rail-key='0.3' onFocus={() => handleTemplateRailFocus('0.3')}>
                <Label htmlFor="dpia_processing_version">Which version of this processing are you assessing?</Label>
                <Input id="dpia_processing_version" value={processingVersion} onChange={(e) => setProcessingVersion(e.target.value)} placeholder="v2 — added a step" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The internal name or version you use in your record of processing, plus a short note of what has changed since the last one. It lets a reader tell which version of the activity was assessed. Skipped, your assessment records no version history.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-rail-key='0.4' onFocus={() => handleTemplateRailFocus('0.4')} data-field="estimated_launch_date">
                  <Label htmlFor="dpia_launch_date">When does the processing start?</Label>
                  <Input id="dpia_launch_date" name="estimated_launch_date" type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className="mt-2" />
                  <p className="text-meta text-muted-foreground mt-1">An assessment is carried out before the processing begins, so this date shows the sequence. Skipped, your assessment records the start date as not supplied.</p>
                </div>
                <div data-rail-key="processing_end_status" onFocus={() => handleLocalRailFocus("processing_end_status")}>
                  {/* DPIA F11 (2026-09-15): ongoing, temporary and undecided are
                      stated; a blank end date is never read as "ongoing". */}
                  <Label htmlFor="dpia_end_status">Is the processing ongoing or temporary?</Label>
                  <select id="dpia_end_status" value={processingEndStatus} onChange={(e) => setProcessingEndStatus(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option value="">Not answered</option>{PROCESSING_END_STATUS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  {(processingEndStatus === PROCESSING_END_STATUS[1] || (!processingEndStatus && endDate)) && (
                    <>
                      <Label htmlFor="dpia_end_date" className="mt-2 block text-xs">When does it end?</Label>
                      <Input id="dpia_end_date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Date or condition" className="mt-1" />
                    </>
                  )}
                  <p className="text-meta text-muted-foreground mt-1">For temporary processing, give the date or the condition that ends it — for example the close of a pilot. Skipped, your assessment records the duration as not supplied; it does not assume the processing is ongoing.</p>
                </div>
              </div>
              <div data-rail-key='0.5.reasons' onFocus={() => handleTemplateRailFocus('0.5.reasons')}>
                <Label id="dpia_reasons_label">Why are you carrying out this assessment?</Label>
                <p className="text-meta text-muted-foreground mt-1 mb-2">Every reason that applies. Some make an assessment a legal requirement, others make it advisable — recording which applies to you shows the reader why the document exists. Skipped, your assessment records the reason as not supplied.</p>
                <Pills
                  labelledBy="dpia_reasons_label"
                  options={REASONS_TO_CONDUCT}
                  value={reasonsToConduct}
                  onChange={(next) => {
                    setReasonsToConduct(next);
                    const stillQualifies = next.some((r) =>
                      /Evaluation or scoring|Automated decision-making|Systematic, extensive evaluation/.test(r));
                    if (!stillQualifies) setAutomatedDecisionNature("");
                  }}
                />
              </div>
              {/* DOC 259A §5.1 — asked only when a selected reason is an
                  evaluation/scoring, automated-decision-making, or
                  systematic-extensive-evaluation reason. Decides whether the
                  Art. 22 risk (r8) or the scoring-informs-human-decisions
                  risk (r8b) is carried. */}
              {hasAutomatedDecisionReason && (
                <div data-rail-key="automated_decision_nature" onFocus={() => handleLocalRailFocus("automated_decision_nature")} {...errAnchor("automated_decision_nature")}>
                  <Label htmlFor="dpia_adm_nature">Are decisions with legal or similarly significant effects taken solely by automated means, or does a person with authority review each decision before it takes effect?<Req /></Label>
                  <select id="dpia_adm_nature" value={automatedDecisionNature} onChange={(e) => setAutomatedDecisionNature(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option value="">Not answered</option>{AUTOMATED_DECISION_NATURE.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <p className="text-meta text-muted-foreground mt-1">This answer decides which automated-decision risk your assessment carries: a solely automated decision engages Article 22, while a person who can change the outcome before it takes effect keeps the decision outside Article 22's scope.</p>
                </div>
              )}
              <div data-rail-key="dpia_scope_note" onFocus={() => handleLocalRailFocus("dpia_scope_note")}>
                <Label htmlFor="dpia_scope_note">What does this assessment cover, and what does it leave out?</Label>
                <Textarea id="dpia_scope_note" value={dpiaScopeNote} onChange={(e) => setDpiaScopeNote(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The boundary of the assessment. A strong answer states both sides — "covers location capture, storage and rostering use; excludes the payroll integration, which has its own assessment". Naming the exclusions shows they were a considered decision rather than an oversight. Skipped, your assessment records the scope as open.</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 2 — DATA & FLOWS ════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">2 · The data, the people, and where it flows</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes what data is involved, whose it is, how long you hold it and where it travels — the facts the risk analysis works on.</p>
          </div>

          <div data-rail-key="trigger" onFocus={() => handleDpiaRailFocus("trigger")} {...errAnchor("data_categories")}>
            <Label id="dpia_datacats_label">What kinds of data does this involve?<Req /> <DefPopover termKey="gdpr_special_categories" /> <EnforcementSignalIcon signalKey="special_categories" signals={dpiaEnforcementSignals} /></Label>
            <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} labelledBy="dpia_datacats_label" /></div>
            <p className="text-meta text-muted-foreground mt-1">Every category the activity touches, including anything collected but rarely used. Health data is a special category (Art. 9); biometric data is one when it is used to uniquely identify a person, so you are asked that when you select it. Where a special category applies, the Art. 9(2) condition is asked at stage 3.</p>
            {dataCategories.includes("Other") && (
              <div className="mt-2" data-rail-key="data_categories_other" onFocus={(e) => { e.stopPropagation(); handleLocalRailFocus("data_categories_other"); }} {...errAnchor("data_categories_other")}>
                <Label htmlFor="dpia_datacats_other" className="text-xs">Describe the other category<Req /></Label>
                <Input id="dpia_datacats_other" value={dataCategoriesOther} onChange={(e) => setDataCategoriesOther(e.target.value)} className="mt-1" placeholder="The kind of information about people, in your own words" />
                <p className="text-meta text-muted-foreground mt-1">If this category could reveal a special category (racial or ethnic origin, political opinions, religious or philosophical beliefs, trade-union membership, genetic data, sex life or sexual orientation), say so here; the report records it as a classification to confirm.</p>
              </div>
            )}
          </div>
          {biometricSelected && (
            <div data-rail-key="biometric_unique_identification" onFocus={() => handleLocalRailFocus("biometric_unique_identification")} {...errAnchor("biometric_unique_identification")}>
              <Label htmlFor="dpia_biometric_purpose">Is the biometric data used to uniquely identify individuals?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 9(1) GDPR)</span></Label>
              <select id="dpia_biometric_purpose" value={biometricUniqueId} onChange={(e) => setBiometricUniqueId(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Not answered</option>{BIOMETRIC_UNIQUE_ID.map((o) => <option key={o}>{o}</option>)}
              </select>
              <p className="text-meta text-muted-foreground mt-1">Biometric data is special-category data only when processed for the purpose of uniquely identifying a natural person — face or fingerprint matching, for example. Heart-rate, gait or attention measurements that identify no one are personal data but not special-category data. "Not sure" keeps the Art. 9 question open; the report records the classification as to be confirmed.</p>
            </div>
          )}
          {(screening.prompts.length > 0 || screening.negated.length > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5" data-testid="dpia-screening">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                <Zap aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Possible Article 35 triggers to check <EnforcementSignalIcon signalKey="dpia_absence" signals={dpiaEnforcementSignals} />
              </p>
              <p className="text-[11px] text-muted-foreground">Screening prompts from the facts recorded so far. None is a finding that a trigger is met; the report tests the facts you record.</p>
              {screening.prompts.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5 shrink-0">▸</span>
                  <div className="text-xs">
                    <span className="font-mono text-amber-700 dark:text-amber-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    <span className="text-muted-foreground ml-1">— raised because {item.basis}.</span>
                    <span className="block text-muted-foreground mt-0.5">{item.stillNeeded}</span>
                  </div>
                </div>
              ))}
              {screening.negated.length > 0 && (
                <p className="text-[11px] text-muted-foreground" data-testid="dpia-screening-negated">
                  Your description mentions {screening.negated.map((n) => `"${n}…"`).join(", ")} only in negated form ("does not", "no"), so no prompt is raised on that wording.
                </p>
              )}
            </div>
          )}
          {/* DOC 160 (2026-09-03) — the imagery-capture typed facts. Contract keys
              since DOC 131; the deterministic Art. 35(3)(c) fact-walk and the
              identifiable-imagery risk read them, so the form now asks them. */}
          <div data-rail-key="imagery_capture" onFocus={() => handleLocalRailFocus("imagery_capture")}>
            <Label htmlFor="dpia_imagery_capture">Does the activity capture imagery or video of identifiable people?</Label>
            <select id="dpia_imagery_capture" value={imageryCapture} onChange={(e) => { setImageryCapture(e.target.value); if (!e.target.value || e.target.value === IMAGERY_CAPTURE[0]) { setImageryCaptureSpaces(""); setImageryCaptureDetail(""); } }} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Not answered</option>{IMAGERY_CAPTURE.map((o) => <option key={o}>{o}</option>)}
            </select>
            <p className="text-meta text-muted-foreground mt-1">Photographs, CCTV, body-worn or dashboard cameras, recorded video calls and screenshots all count. Choose "subjects" when the people are what the imagery is for, and "incidentally" when they appear in the frame without being its subject — passers-by, colleagues in the background. Your assessment reads this answer to decide whether Article 35(3)(c) applies and to add the identifiable-imagery risk to the register. Skipped, that risk is not added and the Article 35(3)(c) analysis is not shown.</p>
          </div>
          {imageryCapture && imageryCapture !== IMAGERY_CAPTURE[0] && (
            <div data-rail-key="imagery_capture_spaces" onFocus={() => handleLocalRailFocus("imagery_capture_spaces")} {...errAnchor("imagery_capture_spaces")}>
              <Label htmlFor="dpia_imagery_spaces">Where is the imagery captured?<Req /></Label>
              <select id="dpia_imagery_spaces" value={imageryCaptureSpaces} onChange={(e) => setImageryCaptureSpaces(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Not answered</option>{IMAGERY_SPACES.map((o) => <option key={o}>{o}</option>)}
              </select>
              <p className="text-meta text-muted-foreground mt-1">A publicly accessible space is one the public can enter — a street, a shop floor, a station concourse, a car park — whether or not it is privately owned. Article 35(3)(c) turns on this answer: systematic monitoring of a publicly accessible area on a large scale requires an assessment by law, and monitoring confined to private or controlled premises is tested under the general Article 35(1) rule instead.</p>
            </div>
          )}
          {/* QA batch 2026-09-05 (DPIA 02, CEO-approved) — the optional detail box
              (cameras, positions, footage retention) only makes sense when imagery
              IS captured; it used to appear after "No imagery" too. The contract
              leaf is optional, so hiding it changes nothing in the gate. */}
          {imageryCapture && imageryCapture !== IMAGERY_CAPTURE[0] && (
            <div data-rail-key="imagery_capture_detail" onFocus={() => handleLocalRailFocus("imagery_capture_detail")}>
              <Label htmlFor="dpia_imagery_detail">Anything the reader should know about the imagery?</Label>
              <Textarea id="dpia_imagery_detail" value={imageryCaptureDetail} onChange={(e) => setImageryCaptureDetail(e.target.value)} className="mt-2 min-h-16" placeholder="Fixed cameras at three entrances, footage kept 30 days, faces blurred before review" />
              <p className="text-meta text-muted-foreground mt-1">Optional. The cameras and their positions, how long footage is kept, whether faces are blurred or redacted before anyone reviews it, and who can view it. Your assessment quotes this in the Article 35(3)(c) analysis as context; it does not change the finding.</p>
            </div>
          )}
          <div data-rail-key="data_subjects" onFocus={() => handleLocalRailFocus("data_subjects")} {...errAnchor("data_subjects")}>
            <Label htmlFor="dpia_data_subjects">Whose data is it?<Req /> <DefPopover termKey="gdpr_personal_data" /></Label>
            <Input id="dpia_data_subjects" value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} placeholder="UK and Irish employees" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The people the data is about, how many of them, and anything that makes them harder placed to object — children, staff, patients. A strong answer reads "around 250 delivery drivers employed in the UK and Ireland, all adults, plus roughly 40 agency staff". Your assessment weighs harm against this population, so a vaguer answer produces a vaguer severity finding.</p>
          </div>
          <div data-rail-key="volume_frequency" onFocus={() => handleLocalRailFocus("volume_frequency")} {...errAnchor("volume_frequency")}>
            <Label htmlFor="dpia_volume">How much data, and how often?<Req /></Label>
            <Input id="dpia_volume" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="250 staff, every 5 minutes" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">One answer with two parts: the scale and the cadence. A complete answer carries both as numbers — "around 250 staff, one location ping every five minutes during shifts, roughly 24,000 records a day". Scale and cadence are what decide whether the processing counts as large-scale or as systematic monitoring, and adjectives cannot be measured against those thresholds (Art. 35(3)).</p>
          </div>
          <div data-coach-field="retention_period" data-rail-key="retention_period" onFocus={() => handleLocalRailFocus("retention_period")} {...errAnchor("retention_period")}>
            <Label htmlFor="dpia_retention">How long do you keep the data, and why that long?<Req /></Label>
            <Input id="dpia_retention" value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="24 months, then deleted" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The period, the reason for it, and what happens when it ends. A strong answer ties the number to something — "24 months, matching our audit cycle, then automatic deletion; aggregated figures with no identifiers are kept indefinitely". Your assessment tests whether the period is longer than the purpose needs, which it can only do when a reason is on the record (Art. 5(1)(e)).</p>
          </div>
          <div data-rail-key="transfers" onFocus={() => handleDpiaRailFocus("transfers")} {...errAnchor("jurisdictions")}>
            <Label id="dpia_jurisdictions_label">Which privacy laws apply to this processing?<Req /> <DefPopover termKey="gdpr_international_transfer" /> <EnforcementSignalIcon signalKey="international_transfer" signals={dpiaEnforcementSignals} /></Label>
            <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} labelledBy="dpia_jurisdictions_label" /></div>
            <p className="text-meta text-muted-foreground mt-1">Every regime the activity reaches — where the people are, where your organisation is, and where the data ends up. The GDPR and the UK GDPR are analysed separately where both are selected; other regimes are recorded so the report states what it did not assess.</p>
          </div>

          {/* DPIA master review (2026-09-15, F05 / F06 / F11): transfer presence
              is an explicit answer; each row carries the contract's own keys;
              the origin is confirmed, never defaulted; a certification box is
              shown only where it can apply; an incomplete row is marked. */}
          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3" data-rail-key="transfers">
            <div data-rail-key="transfer_presence" onFocus={() => handleLocalRailFocus("transfer_presence")} {...errAnchor("transfer_presence")}>
              <Label htmlFor="dpia_transfer_presence" className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Does the data leave the EEA or the UK?</Label>
              <select id="dpia_transfer_presence" value={transferPresence} onChange={(e) => setTransferPresence(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Not answered</option>{TRANSFER_PRESENCE.map((o) => <option key={o}>{o}</option>)}
              </select>
              <p className="text-meta text-muted-foreground mt-1">Remote support access, backups and your own group companies count. "No" is an affirmative answer that all processing stays within the EEA and the UK; "Not yet assessed" records the point as open. Flows between the EEA and the UK are transfers with an adequacy basis — record them too.</p>
            </div>
            {transferPresence === TRANSFER_PRESENCE_YES && (
              <div className="flex items-center justify-between">
                <p className="text-meta text-muted-foreground">One entry for every organisation outside the origin region that receives the data. Your assessment names the Chapter V basis for each complete entry.</p>
                <button type="button" onClick={() => setTransferFlows([...transferFlows, emptyTransferRow()])} className="text-xs underline text-brand-teal-text shrink-0">+ Add a transfer</button>
              </div>
            )}
            {transferFlows.length > 0 && transferPresence !== TRANSFER_PRESENCE_YES && (
              <p className="text-xs text-amber-800 dark:text-amber-300">{transferFlows.length} transfer{transferFlows.length === 1 ? "" : "s"} listed below{transferPresence === TRANSFER_PRESENCE_NO ? ", but the answer above says no data leaves the EEA or the UK" : transferPresence ? ", but the answer above says transfers are not yet assessed" : ""}. Answer "Yes" above if the transfers are real, or remove them.</p>
            )}
            {transferFlows.map((f, i) => {
              const missing = transferRowMissing(f);
              const set = (patch: Partial<TransferRow>) => { const n = [...transferFlows]; n[i] = { ...n[i], ...patch }; setTransferFlows(n); };
              const usDest = f.destination_country === "US";
              return (
                <div key={i} className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-2 items-end border rounded p-2 bg-background" data-field={`transfer_flows[${i}]`} data-testid="dpia-transfer-row">
                  <div className="md:col-span-2" {...errAnchor(`transfer_flows[${i}].recipient`)}><Label htmlFor={`flow-recipient-${i}`} className="text-xs">Who receives the data?</Label><Input id={`flow-recipient-${i}`} value={f.recipient} onChange={(e) => set({ recipient: e.target.value })} placeholder="Acme Inc" className="mt-1" /></div>
                  <div {...errAnchor(`transfer_flows[${i}].destination_country`)}><Label htmlFor={`flow-dest-${i}`} className="text-xs">Which country?</Label><CountryPicker id={`flow-dest-${i}`} value={f.destination_country} onChange={(v) => set({ destination_country: v, dpf_certified: v === "US" ? f.dpf_certified : false, uk_extension_certified: v === "US" ? f.uk_extension_certified : false })} emptyLabel="Country" allowOther allowUnknown className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm" /></div>
                  <div {...errAnchor(`transfer_flows[${i}].origin_regime`)}><Label htmlFor={`flow-origin-${i}`} className="text-xs">Sent from</Label><select id={`flow-origin-${i}`} value={f.origin_regime} onChange={(e) => set({ origin_regime: e.target.value as TransferRow["origin_regime"] })} className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm"><option value="">Choose…</option><option value="EU">The EU / EEA</option><option value="UK">The UK</option></select></div>
                  <div className="md:col-span-2"><Label htmlFor={`flow-mech-${i}`} className="text-xs">Basis or safeguard relied on <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id={`flow-mech-${i}`} value={f.transfer_mechanism} onChange={(e) => set({ transfer_mechanism: e.target.value })} placeholder="e.g. EU SCCs (2021) with TIA; UK IDTA; adequacy" className="mt-1" /></div>
                  {usDest && f.origin_regime === "EU" && (
                    <label className="text-xs flex items-center gap-1 md:col-span-3"><input type="checkbox" checked={f.dpf_certified} onChange={(e) => set({ dpf_certified: e.target.checked })} /> The importer is certified under the EU–US Data Privacy Framework</label>
                  )}
                  {usDest && f.origin_regime === "UK" && (
                    <label className="text-xs flex items-center gap-1 md:col-span-3"><input type="checkbox" checked={f.uk_extension_certified} onChange={(e) => set({ uk_extension_certified: e.target.checked })} /> The importer is certified under the UK Extension to the EU–US Data Privacy Framework</label>
                  )}
                  <div className="md:col-span-3"><Label htmlFor={`flow-notes-${i}`} className="text-xs">Notes <span className="font-normal text-muted-foreground">(optional; name the country here if you chose "Another country not listed")</span></Label><Input id={`flow-notes-${i}`} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Hosting region, purpose of the flow" className="mt-1" /></div>
                  <div className="md:col-span-6 flex items-center justify-between">
                    {missing.length > 0 ? <span className="text-xs text-amber-800 dark:text-amber-300">Incomplete — still needed: {missing.map((m) => m === "recipient" ? "recipient" : m === "destination_country" ? "country" : "origin").join(", ")}. The report cannot name a basis for this row until then.</span> : <span className="text-xs text-muted-foreground">Complete.</span>}
                    <button type="button" onClick={() => setTransferFlows(transferFlows.filter((_, j) => j !== i))} className="text-xs text-red-600 underline">remove</button>
                  </div>
                </div>
              );
            })}
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add detail about suppliers, systems and further uses</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering these supplier and system details lets your assessment analyse your supply chain, your systems and your secondary uses instead of recording each as not supplied.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='0.2'>
                <Label id="dpia_processors_label">Which suppliers handle the data for you?</Label>
                <div className="mt-2"><Pills options={TOOLS} value={processors} onChange={setProcessors} labelledBy="dpia_processors_label" /></div>
                <Label htmlFor="dpia_other_processor" className="mt-2 block text-xs">Another supplier not listed</Label>
                <Input id="dpia_other_processor" placeholder="Another supplier" value={otherProcessor} onChange={(e) => setOtherProcessor(e.target.value)} className="mt-1" />
                <p className="text-meta text-muted-foreground mt-1">Any organisation that processes the data on your instructions, including hosting and support providers. Skipped, your assessment records the supply chain as not supplied.</p>
              </div>
              <div data-rail-key='0.2' onFocus={() => handleTemplateRailFocus('0.2')}>
                <Label htmlFor="dpia_processor_obligations">What is each supplier responsible for?</Label>
                {/* F03 — the narrative an exhibit replaces is kept by the page and the draft. */}
                <ExhibitTextarea id="dpia_processor_obligations" value={processorObligations} onChange={setProcessorObligations} stash={processorObligationsStash} onStash={setProcessorObligationsStash} placeholder="One supplier per line" className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Each supplier and sub-supplier in the chain and the task it performs — "Acme Hosting: EU storage and backup; no access to identifiable records". Naming the obligations lets your assessment test whether the chain is defined; skipped, it records the obligations as open.</p>
              </div>
              <div data-rail-key='1.1.c' onFocus={() => handleTemplateRailFocus('1.1.c')}>
                <Label htmlFor="dpia_secondary_uses">Do you use the data for anything beyond the main purpose?</Label>
                <Textarea id="dpia_secondary_uses" value={secondaryUses} onChange={(e) => setSecondaryUses(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Any further use — analytics, product improvement, training a model — and why it fits with the purpose the data was collected for. A strong answer connects the two: "aggregated route statistics for capacity planning, which uses no identifiers and serves the same operational purpose". Skipped, your assessment records further uses as open (Art. 6(4)).</p>
              </div>
              <div data-rail-key='1.1.d' onFocus={() => handleTemplateRailFocus('1.1.d')}>
                <Label htmlFor="dpia_nature_scope_context">What is the wider context of this processing?</Label>
                <Textarea id="dpia_nature_scope_context" value={natureScopeContext} onChange={(e) => setNatureScopeContext(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Your relationship with the people involved and what they would reasonably expect — how far the processing extends in place and time, and whether it is routine in your sector. A strong answer might read "staff are told at hire and monthly thereafter; comparable monitoring is standard in logistics; the app runs only during shifts". Skipped, your assessment records the context as open.</p>
              </div>
              <div data-coach-field="functional_description" data-rail-key='1.2' onFocus={() => handleTemplateRailFocus('1.2')}>
                <Label htmlFor="dpia_functional_description">How does the processing work from end to end?</Label>
                {!functionalDescription.trim() && description.trim().length > 40 && (
                  <div className="mt-2 rounded-md border bg-muted/30 p-3">
                    <p className="text-meta text-muted-foreground">You already described the steps earlier. Copy that answer here and confirm or edit it, or write a fresh one.</p>
                    <button type="button" onClick={() => setFunctionalDescription(description)} className="text-xs underline text-brand-teal-text mt-1">Use my earlier answer</button>
                  </div>
                )}
                <Textarea id="dpia_functional_description" value={functionalDescription} onChange={(e) => setFunctionalDescription(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The life of the data in sequence: collection, use, storage, sharing, deletion. A strong answer follows one record all the way through, naming the system at each hop. Skipped, your assessment records the data flow as open.</p>
              </div>
              <div data-coach-field="supporting_assets" data-rail-key='1.3' onFocus={() => handleTemplateRailFocus('1.3')}>
                {/* F21: no htmlFor here — this AssistedInput renders with
                    `useExhibit`, and <ExhibitTextarea> consumes `id` for its
                    exhibit radio rather than the textarea, so an htmlFor would
                    label (and on click toggle) the exhibit choice. */}
                <Label>Which systems and infrastructure support it?</Label>
                <AssistedInput
                  className="mt-2"
                  useExhibit
                  exhibitStash={supportingAssetsStash}
                  onExhibitStash={setSupportingAssetsStash}
                  value={supportingAssets}
                  onChange={setSupportingAssets}
                  pills={ASSISTED_INPUT_REGISTRY.supportingAssets.pills}
                  placeholder="One system per line"
                />
                <p className="text-meta text-muted-foreground mt-1">Applications, databases, devices, hosting and any supplier systems in the chain. A long list can be sent to an exhibit annex so it does not crowd the body of the report. Skipped, your assessment records the supporting systems as open.</p>
              </div>
              <div>
                <Label htmlFor="dpia_retention_record_type">Is there a statutory retention rule for these records?</Label>
                <Input id="dpia_retention_record_type" value={retentionRecordType} onChange={(e) => setRetentionRecordType(e.target.value)} placeholder="payroll" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">The record type where a national law sets the retention period — payroll or accounting records, for instance. Naming the type lets your assessment check whether a statutory rule it knows for your country applies; where none is on its record it says so rather than inventing one. Skipped, your assessment records no statutory retention rule as supplied.</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 3 — LEGAL BASIS ═════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">3 · The legal basis, and why the processing is necessary</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the lawful basis you rely on, whether the processing is necessary for the purpose, and which authority oversees you.</p>
          </div>

          <div {...errAnchor("legal_basis_proposed")}>
            <Label htmlFor="dpia_legal_basis">Which lawful basis do you rely on?<Req /></Label>
            <select id="dpia_legal_basis" value={legalBasis} data-rail-key="legal_basis" onChange={(e) => setLegalBasis(e.target.value)} onFocus={() => handleDpiaRailFocus("legal_basis")} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Not answered</option>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}
            </select>
            <p className="text-meta text-muted-foreground mt-1">One of the six bases in the law, and the one you would actually defend. Consent has to be freely given, which is hard to show where the people involved work for you; legitimate interest asks you to weigh your interest against theirs. Your assessment analyses the basis you name here and no other (Art. 6(1)).</p>
          </div>
          {hasSpecialCategory && (
            <div {...errAnchor("article_9_condition")}>
              <p className="text-meta text-muted-foreground mb-2">{specialStatus === "open"
                ? "You named biometric data and have not yet said whether it identifies people. If it does, processing it lawfully needs an Art. 9(2) condition on top of the basis above; choose the condition, or \"Not yet established\"."
                : "You named a special category of data. Processing it lawfully needs an Art. 9(2) condition on top of the basis above."}</p>
              <Label htmlFor="dpia_art9">Which Article 9(2) condition do you rely on?<Req /></Label>
              <select id="dpia_art9" value={article9Condition} onChange={(e) => setArticle9Condition(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Not answered</option>{ARTICLE_9_CONDITIONS.filter((c) => c !== ART9_NOT_APPLICABLE_BIOMETRIC).map((c) => <option key={c}>{c}</option>)}
              </select>
              <p className="text-meta text-muted-foreground mt-1">Employment-law and explicit-consent conditions are the common ones in a workplace setting. Your assessment records the condition you select beside the lawful basis (Art. 9(2)); selecting it records your position and does not establish that the condition is satisfied. "Not yet established" records the point as open.</p>
            </div>
          )}
          {specialStatus === "not_established" && (
            <p className="text-meta text-muted-foreground" data-testid="dpia-art9-not-applicable">Recorded for the Art. 9 question: {ART9_NOT_APPLICABLE_BIOMETRIC}. Change the biometric-purpose answer at stage 2 if that is not right.</p>
          )}
          <div data-coach-field="necessity_proportionality" {...errAnchor("necessity_proportionality")}>
            <Label htmlFor="dpia_necessity">Why is this processing necessary, and what else did you consider?<Req /></Label>
            <Textarea id="dpia_necessity" value={necessityProportionality} onChange={(e) => setNecessityProportionality(e.target.value)} className="mt-2 min-h-24" />
            <p className="text-meta text-muted-foreground mt-1">Why the purpose cannot reasonably be met with less data or a lighter method, and what less intrusive options you looked at. A strong answer takes each option in turn: "manual shift sign-in was tested for six months and left 18% of shifts unverified, so it does not achieve the purpose". Your assessment compares the options you record here; a single general statement leaves it nothing to compare (Art. 35(7)(b)).</p>
          </div>

          <div data-field="alternatives_considered">
            <div className="flex items-center justify-between">
              <Label id="dpia_alternatives_label">Which alternatives did you consider, and what came of them?</Label>
              <button
                type="button"
                onClick={() => setAlternativesConsidered([...alternativesConsidered, { processing_operation: "", alternative: "", rejection_reason: "" }])}
                className="text-xs underline text-brand-teal-text"
              >+ Add an alternative</button>
            </div>
            {/* DPIA F09 (2026-09-15): the copy action is labelled for what it
                does; the necessity answer is kept; the row is a draft until an
                option is named; an alternative may be viable. */}
            {alternativesConsidered.length === 0 && necessityProportionality.trim().length > 40 && (
              <div className="mt-2 rounded-md border bg-muted/30 p-3">
                <p className="text-meta text-muted-foreground">Your necessity answer may already describe the options you looked at. You can copy it into a draft row as notes, then name the option and record what came of it. Your necessity answer itself is unchanged.</p>
                <button type="button" onClick={() => setAlternativesConsidered([{ processing_operation: "", alternative: "", rejection_reason: necessityProportionality }])} className="text-xs underline text-brand-teal-text mt-1">Copy my necessity notes into a draft row</button>
              </div>
            )}
            <p className="text-meta text-muted-foreground mt-1">One entry per option you looked at. For a rejected option, the reason has to say why it would not achieve the purpose — that it was slower or dearer does not establish necessity. An option that would work can be recorded as viable or adopted in part; you are not asked to invent a rejection. Without at least one named alternative, the assessment cannot run the least-intrusive-means comparison and records the point as not supplied.</p>
            {alternativesConsidered.map((a, i) => {
              const set = (patch: Partial<AlternativeRow>) => { const n = [...alternativesConsidered]; n[i] = { ...n[i], ...patch }; setAlternativesConsidered(n); };
              const rejected = !a.outcome || /^Rejected/.test(a.outcome);
              const draft = !a.alternative.trim() && !!a.rejection_reason.trim();
              return (
                <div key={i} className="grid md:grid-cols-3 gap-2 mt-2 p-3 rounded-md border bg-muted/20" data-field={`alternatives_considered[${i}]`} data-draft-row={draft || undefined}>
                  {draft && <p className="md:col-span-3 text-xs text-amber-800 dark:text-amber-300">Draft row — name the option this note is about, or remove the row.</p>}
                  <div>
                    <Label htmlFor={`alt-op-${i}`} className="text-xs">Which part of the processing?</Label>
                    <Input id={`alt-op-${i}`} value={a.processing_operation} onChange={(e) => set({ processing_operation: e.target.value })} placeholder="Blank for the whole" className="mt-1" />
                  </div>
                  <div {...errAnchor(`alternatives_considered[${i}].alternative`)}>
                    <Label htmlFor={`alt-alt-${i}`} className="text-xs">What was the alternative?</Label>
                    <Input id={`alt-alt-${i}`} value={a.alternative} onChange={(e) => set({ alternative: e.target.value })} placeholder="Aggregated data only" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor={`alt-outcome-${i}`} className="text-xs">What came of it?</Label>
                    <select id={`alt-outcome-${i}`} value={a.outcome ?? ""} onChange={(e) => set({ outcome: e.target.value || undefined })} className="mt-1 w-full h-10 px-2 rounded-md border border-input bg-background text-sm">
                      <option value="">Rejected (default)</option>{ALTERNATIVE_OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3" {...errAnchor(`alternatives_considered[${i}].rejection_reason`)}>
                    <Label htmlFor={`alt-reason-${i}`} className="text-xs">{rejected ? "Why would it not achieve the purpose?" : "Notes on this alternative"}{rejected && <Req />}</Label>
                    <Textarea id={`alt-reason-${i}`} value={a.rejection_reason} onChange={(e) => set({ rejection_reason: e.target.value })} placeholder={rejected ? "Misses 18% of shifts, so it does not achieve attendance verification" : "What would change if it were adopted"} className="mt-1 min-h-12" />
                  </div>
                  <button type="button" onClick={() => setAlternativesConsidered(alternativesConsidered.filter((_, j) => j !== i))} className="text-xs text-red-600 underline md:col-span-3 text-right">remove</button>
                </div>
              );
            })}
          </div>

          <div data-coach-field="residual_risks">
            <Label htmlFor="dpia_residual_risks">What risk is left after your safeguards?</Label>
            <Textarea id="dpia_residual_risks" value={residualRisks} onChange={(e) => setResidualRisks(e.target.value)} className="mt-2 min-h-20" />
            <p className="text-meta text-muted-foreground mt-1">The risk that remains once the measures you have listed are in place, and whether your organisation accepts it. A strong answer is specific — "a false flag could still reach an occupational-health adviser; accepted because every flag is reviewed by a person before any contact". Skipped, your assessment records the residual risk as open (Art. 35(7)(d)).</p>
          </div>



          <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <p className="text-sm font-semibold text-[hsl(var(--brand-navy))]">Where your organisation sits</p>
            <p className="text-meta text-muted-foreground">Where decisions about this processing are made determines which authority oversees you and whether one authority can handle the whole file. Your assessment names the authority and the transfer safeguards from these answers only.</p>
            {/* DPIA master review (2026-09-15, F06): the picker offers "Another
                country" and "Not sure"; the Land is never defaulted to the
                federal authority; industry is separate from regulator routing;
                the deciding-office question lists EU/EEA countries only, since
                only an establishment in the Union can be the main establishment. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div data-rail-key="controller_country" onFocus={() => handleLocalRailFocus("controller_country")} {...errAnchor("controller_country")}>
                <Label htmlFor="controller-country" className="text-xs">Where is your organisation established?</Label>
                <CountryPicker id="controller-country" value={controllerCountry} onChange={(v) => { setControllerCountry(v); if (v !== "DE") setControllerLand(""); }} allowOther allowUnknown className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The country your organisation operates from. "Not sure" records the point as open; skipped, your assessment cannot name a supervisory authority and says so.</p>
                {controllerCountry === COUNTRY_OTHER_VALUE && (
                  <div className="mt-2" {...errAnchor("controller_country_other")}>
                    <Label htmlFor="controller-country-other" className="text-xs">Which country?<Req /></Label>
                    <Input id="controller-country-other" value={controllerCountryOther} onChange={(e) => setControllerCountryOther(e.target.value)} className="mt-1" placeholder="Country name" />
                  </div>
                )}
              </div>
              {controllerCountry === "DE" && (
                <div {...errAnchor("controller_land")}>
                  <Label htmlFor="controller-land" className="text-xs">Which German state (Land) is your organisation based in?<Req /></Label>
                  <select id="controller-land" value={controllerLand} onChange={(e) => setControllerLand(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="">Not answered</option>
                    {GERMAN_LAENDER.map((l) => <option key={l}>{l}</option>)}
                    <option value="Unknown">Not sure which Land</option>
                  </select>
                  <p className="text-meta text-muted-foreground mt-1">Germany has a separate authority for each state, so the state decides which one oversees a private-sector controller. "Not sure" records the competent Land authority as still to be identified; your assessment never defaults it to the federal authority.</p>
                </div>
              )}
              <div>
                <Label htmlFor="controller-sector" className="text-xs">What kind of organisation is it?</Label>
                <select id="controller-sector" value={controllerSector} onChange={(e) => setControllerSector(e.target.value as any)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Not answered</option>
                  {CONTROLLER_SECTOR_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-meta text-muted-foreground mt-1">This decides which regulator's remit applies — some sectors answer to a specialist authority. Skipped, your assessment treats the routing as open.</p>
                <div data-rail-key="controller_industry" onFocus={() => handleLocalRailFocus("controller_industry")}>
                  <Label htmlFor="controller-industry" className="mt-2 block text-xs">Industry <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="controller-industry" value={controllerIndustry} onChange={(e) => setControllerIndustry(e.target.value)} className="mt-1" placeholder="e.g. insurance, healthcare, logistics" />
                </div>
              </div>
              <div data-rail-key="central_administration_country" onFocus={() => handleLocalRailFocus("central_administration_country")}>
                <Label htmlFor="central-admin-country" className="text-xs">Where are decisions about this processing made?</Label>
                <CountryPicker id="central-admin-country" value={centralAdminCountry} onChange={setCentralAdminCountry} allowOther allowUnknown className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The place where your organisation decides what the processing is for and how it runs — not the largest office. Where that place is in the EU/EEA, one lead authority can handle the whole file. Skipped, your assessment falls back to the country above (Art. 4(16)(a)).</p>
              </div>
              <div data-rail-key="eu_decision_establishment_country" onFocus={() => handleLocalRailFocus("eu_decision_establishment_country")}>
                <Label htmlFor="eu-decision-country" className="text-xs">Does an office in the EU/EEA make those decisions instead?</Label>
                <CountryPicker id="eu-decision-country" scope="eea" allowUnknown value={euDecisionEstablishment} onChange={setEuDecisionEstablishment} emptyLabel="No — decisions are made elsewhere" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">For groups run from outside the Union: an establishment in the EU/EEA counts only where it genuinely decides the purposes and means and can put them into effect, not where it carries out head-office instructions (Art. 4(16)(a)). "No" records that no such establishment exists; "Not sure" records the point as open. The UK is outside the Union, so it is not offered here.</p>
              </div>
            </div>
          </div>

          {/* ═══ STAGE 4 — RISKS & SAFEGUARDS ══════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">4 · What protects the data, and who has been consulted</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the measures already in place and the advice you have taken — together they set the residual risk your assessment reports.</p>
          </div>

          <div data-rail-key='4.1.c' onFocus={() => handleTemplateRailFocus('4.1.c')}>
            <Label id="dpia_safeguards_label">What already protects this data?</Label>
            <div className="mt-2"><Pills options={SAFEGUARDS} value={safeguards} onChange={setSafeguards} labelledBy="dpia_safeguards_label" exclusive={SAFEGUARDS_EXCLUSIVE} /></div>
            <p className="text-meta text-muted-foreground mt-1">Measures that are live today, not ones you plan to add. Your assessment records each measure against the risks it addresses and states the residual position; it does not assume that a measure lowers severity, and a measure not recorded here is not considered. "None" clears the others.</p>
            <div data-rail-key="safeguards_other" onFocus={(e) => { e.stopPropagation(); handleLocalRailFocus("safeguards_other"); }}>
              <Label htmlFor="dpia_safeguards_other" className="mt-2 block text-xs">Other measures in place <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="dpia_safeguards_other" value={safeguardsOther} onChange={(e) => setSafeguardsOther(e.target.value)} className="mt-1 min-h-12" placeholder="One measure per line, and the harm it addresses" />
            </div>
          </div>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add your protective measures in detail</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering these measures in detail lets your assessment analyse why each kind of data is needed, how you keep it accurate, how people exercise their rights, and what is built into the design. Skipped, each is recorded as not supplied.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-rail-key='2.2.a' onFocus={() => handleTemplateRailFocus('2.2.a')}>
                <Label htmlFor="dpia_data_minimisation">Why is each kind of data you collect needed?</Label>
                <Textarea id="dpia_data_minimisation" value={dataMinimisationJustification} onChange={(e) => setDataMinimisationJustification(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Take the categories you named at stage 2 and give the reason each one is there — "vehicle registration is needed to match a ping to a shift; home address is not collected". Your assessment tests each category against its stated reason; skipped, it records the minimisation position as open (Art. 5(1)(c)).</p>
              </div>

              <div data-rail-key='2.2.b' onFocus={() => handleTemplateRailFocus('2.2.b')}>
                <Label htmlFor="dpia_data_quality_measures">How do you keep the data accurate and up to date?</Label>
                <AssistedInput
                  id="dpia_data_quality_measures"
                  className="mt-2"
                  value={dataQualityMeasures}
                  onChange={setDataQualityMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dataQualityMeasures.pills}
                  placeholder="One measure per line"
                />
                <p className="text-meta text-muted-foreground mt-1">The checks that catch wrong data and the route by which it is corrected or erased. A strong answer names the check and its frequency — "staff records reconciled against the HR system each month; drivers can flag an incorrect shift in the app". Skipped, your assessment records data quality as open (Art. 5(1)(d)).</p>
              </div>
              <div data-rail-key='2.3.b' onFocus={() => handleTemplateRailFocus('2.3.b')}>
                <Label htmlFor="dpia_rights_mechanisms">How can people exercise their rights over this data?</Label>
                <AssistedInput
                  id="dpia_rights_mechanisms"
                  className="mt-2"
                  value={dataSubjectRightsMechanisms}
                  onChange={setDataSubjectRightsMechanisms}
                  pills={ASSISTED_INPUT_REGISTRY.dataSubjectRightsMechanisms.pills}
                  placeholder="One route per line"
                />
                <p className="text-meta text-muted-foreground mt-1">How someone asks for a copy, a correction, deletion, or objects — and how you handle the request once it arrives. A strong answer names the route and the deadline: "requests to privacy@ are logged and answered within one month". Skipped, your assessment records the rights mechanisms as open (Arts. 12–22).</p>
              </div>
              <div data-rail-key='2.3.d' onFocus={() => handleTemplateRailFocus('2.3.d')}>
                <Label htmlFor="dpia_dp_by_design">What protections are built into the design?</Label>
                <AssistedInput
                  id="dpia_dp_by_design"
                  className="mt-2"
                  value={dpByDesignMeasures}
                  onChange={setDpByDesignMeasures}
                  pills={ASSISTED_INPUT_REGISTRY.dpByDesignMeasures.pills}
                  placeholder="One measure per line"
                />
                <p className="text-meta text-muted-foreground mt-1">Protection that the system applies by default rather than by policy — identifiers stripped at collection, access closed unless granted, tracking off outside shifts. Skipped, your assessment records the design measures as open (Art. 25).</p>
              </div>
              <div data-rail-key='1.4' onFocus={() => handleTemplateRailFocus('1.4')}>
                <Label htmlFor="dpia_codes_of_conduct">Do you follow an approved code of conduct or hold a certification?</Label>
                <Input id="dpia_codes_of_conduct" value={codesOfConduct} onChange={(e) => setCodesOfConduct(e.target.value)} placeholder="Name of the scheme" className="mt-2" />
                <p className="text-meta text-muted-foreground mt-1">Formally approved schemes only — an approved code of conduct or a certification issued under the regulation. General standards you follow internally belong with your design measures above. Skipped, your assessment records that none is on the record (Arts. 40, 42).</p>
              </div>
            </div>
          </details>

          <details className="rounded-md border bg-muted/20 [&>summary]:cursor-pointer">
            <summary className="px-4 py-3 text-sm text-[hsl(var(--brand-navy))]">
              <span className="font-semibold">Add the advice you have taken</span>
              <span className="block text-meta font-normal text-muted-foreground mt-1">Answering these consultation questions lets your assessment record the officer's advice and the views of the people affected. Skipped, both are recorded as not supplied; Art. 35(9) expects the views of data subjects to be sought where appropriate, so the report notes that no position was recorded.</span>
            </summary>
            <div className="px-4 pb-4 pt-3 border-t space-y-4">
              <div data-coach-field="dpo_advice" data-rail-key='5.1' onFocus={() => handleTemplateRailFocus('5.1')}>
                <Label htmlFor="dpia_dpo_advice">What has your data protection officer advised?</Label>
                <Textarea id="dpia_dpo_advice" value={dpoAdvice} onChange={(e) => setDpoAdvice(e.target.value)} className="mt-2 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">The advice given on this assessment, and what you did with it. A strong answer records both sides — "the officer advised limiting tracking to rostered hours; this was adopted before launch". Where you departed from the advice, your reason belongs here too. Skipped, your assessment records the officer's advice as open (Art. 35(2)).</p>
              </div>
              <div data-coach-field="data_subjects_views" data-rail-key="data_subjects_views" onFocus={() => handleLocalRailFocus("data_subjects_views")}>
                <Label htmlFor="dpia_views_sought">Have you asked the people affected what they think?</Label>
                <select id="dpia_views_sought" value={dataSubjectsViewsSought} onChange={(e) => setDataSubjectsViewsSought(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Not answered</option>
                  <option value="Yes — views sought">Yes — views sought</option>
                  <option value="No — not sought">No — not sought</option>
                  <option value="Planned">Planned but not yet done</option>
                  <option value="Not appropriate — justified">Not appropriate (with justification)</option>
                </select>
                <Label htmlFor="dpia_views_detail" className="mt-2 block text-xs">What was asked, what came back, or why asking is not appropriate</Label>
                <Textarea id="dpia_views_detail" value={dataSubjectsViews} onChange={(e) => setDataSubjectsViews(e.target.value)} className="mt-1 min-h-16" />
                <p className="text-meta text-muted-foreground mt-1">Where views were sought: how you asked and what came back. Where they were not: why asking is not appropriate. A strong answer shows the effect — "consulted the works council in March; two objections about out-of-hours tracking led to tracking being limited to rostered shifts". Art. 35(9) expects views to be sought where appropriate, so where they were not, the reason is what the record needs; left blank, your assessment records the position as not supplied.</p>
              </div>
            </div>
          </details>

          {/* ═══ STAGE 5 — SIGN-OFF ════════════════════════════════════ */}
          <div className="pt-2 pb-2 border-b">
            <span className="text-sm font-semibold text-[hsl(var(--brand-navy))]">5 · Who prepared this, and who approves it</span>
            <p className="text-meta text-muted-foreground mt-1">This stage establishes the accountability record: the people behind the assessment and the official who accepts it as complete. Left blank, your assessment still generates; it records the preparers and the approver as not supplied and states that the attestation is incomplete on that point.</p>
          </div>

          <div data-rail-key="dpia_prepared_by" onFocus={() => handleLocalRailFocus("dpia_prepared_by")}>
            <Label htmlFor="dpia_prepared_by">Who prepared this assessment?</Label>
            <Textarea id="dpia_prepared_by" value={dpiaPreparedBy} onChange={(e) => setDpiaPreparedBy(e.target.value)} placeholder="One person per line" className="mt-2 min-h-20" />
            <p className="text-meta text-muted-foreground mt-1">Each person and the role they held, one per line — "A. Okonjo — Privacy Counsel; R. Lindqvist — Head of Platform Engineering; D. Dasher — data protection officer". A department name records no one. Left empty, your assessment records that the people who prepared it are not identified; it does not block generation.</p>
          </div>
          <div data-rail-key='0.5.team' onFocus={() => handleTemplateRailFocus('0.5.team')}>
            <Label htmlFor="dpia_team">Who is responsible, accountable, consulted and informed?</Label>
            <Input id="dpia_team" value={dpiaTeam} onChange={(e) => setDpiaTeam(e.target.value)} placeholder="Names against each role" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">A formal split of responsibility where your organisation uses one: who owns the work, who answers for it, who was asked, who was told. Skipped, your assessment relies on the names above alone.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")}>
              <Label htmlFor="dpia_approved_by_name">Who approves this assessment as complete?</Label>
              <Input id="dpia_approved_by_name" value={dpiaApprovedByName} onChange={(e) => setDpiaApprovedByName(e.target.value)} placeholder="M. Ferrante" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">The official who can accept the remaining risk for your organisation. Left empty, your assessment records the approver as not supplied.</p>
            </div>
            <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")}>
              <Label htmlFor="dpia_approved_by_title">What is that person's title?</Label>
              <Input id="dpia_approved_by_title" value={dpiaApprovedByTitle} onChange={(e) => setDpiaApprovedByTitle(e.target.value)} placeholder="Managing Director" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">The capacity they approve in — it is what shows they had the authority. Left empty, your assessment lists the title as outstanding.</p>
            </div>
          </div>
          <div data-rail-key="dpia_approval" onFocus={() => handleLocalRailFocus("dpia_approval")} data-field="dpia_approval_date">
            <Label htmlFor="dpia_approval_date">When was it formally approved?</Label>
            <Input id="dpia_approval_date" name="dpia_approval_date" type="date" value={dpiaApprovalDate} onChange={(e) => setDpiaApprovalDate(e.target.value)} className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The date approval was given, which is a separate event from the day the document was finished. Left empty, your assessment lists the approval date as outstanding.</p>
          </div>
          <div data-coach-field="dpia_signoff_basis" data-rail-key="dpia_signoff_basis" onFocus={() => handleLocalRailFocus("dpia_signoff_basis")}>
            <Label htmlFor="dpia_signoff_basis">What does the approval rest on?</Label>
            <Textarea id="dpia_signoff_basis" value={dpiaSignoffBasis} onChange={(e) => setDpiaSignoffBasis(e.target.value)} className="mt-2 min-h-16" />
            <p className="text-meta text-muted-foreground mt-1">The reasoning behind the signature: which sections were reviewed, which remaining risks were accepted, and any condition attached. A strong answer is specific — "sections 3 and 4 reviewed on 12 April 2026; two moderate residual risks accepted; conditional on the 30-day deletion job being verified in production before launch". "Approved subject to compliance" records no decision. Left empty, your assessment lists the basis for sign-off as outstanding.</p>
          </div>
          <div data-rail-key='0.5' onFocus={() => handleTemplateRailFocus('0.5')}>
            <Label htmlFor="dpia_reference_materials">Which guidance or standards did you follow?</Label>
            <Input id="dpia_reference_materials" value={referenceMaterials} onChange={(e) => setReferenceMaterials(e.target.value)} placeholder="ISO 29134" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">Any template, regulator guidance or standard you worked from. Skipped, your assessment records the reference materials as open.</p>
          </div>
          <div data-rail-key='0.5.publication' onFocus={() => handleTemplateRailFocus('0.5.publication')}>
            <Label htmlFor="dpia_publication_intent">Will you publish or share this assessment?</Label>
            <select id="dpia_publication_intent" value={publicationIntent} onChange={(e) => setPublicationIntent(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Not answered</option>
              <option>No</option>
              <option>Yes — published</option>
              <option>Yes — shared externally</option>
            </select>
            <p className="text-meta text-muted-foreground mt-1">Publishing an assessment builds trust, and it is worth holding back detailed security information if you do. Skipped, your assessment records the publication intent as not supplied.</p>
          </div>

          {/* DPIA F07 / F19 (2026-09-15): the failing question is named with a
              link back to it; the advisory completeness review can be reopened
              after edits (it checks seven configured questions, not every answer). */}
          <ValidationErrorSummary message={validationError} fieldKey={fieldErrors.fields[0] ?? null} className="mt-2" />
          {isIntakeCoachEnabled("dpia") && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <span>Before you purchase, an advisory review checks seven of these questions for brief or unanswered entries. It is not a review of every answer or of the report's findings.</span>
              <button type="button" className="underline text-brand-teal-text shrink-0" onClick={() => setCoachOpen(true)} data-testid="dpia-coach-reopen">{coachSeen ? "Review those questions again" : "Review those questions now"}</button>
            </div>
          )}

        </form>
        </BenchLayout>


        <IntakeCoachStep
          open={coachOpen}
          product="dpia"
          userId={user?.id}
          referenceKind={draftKey ? "dpia_assessment" : "dpia_intake"}
          referenceId={draftKey ?? clientId ?? null}
          contract={COACH_CONTRACTS.dpia}
          intake={buildIntake()}
          onClose={() => setCoachOpen(false)}
          onContinue={() => { setCoachOpen(false); void handlePurchase(); }}
        />
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/dpia-framework" {...intakeGate("dpia")} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="dpia_framework"
          userId={user?.id}
          clientId={clientId}
          intakeData={buildIntake()}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, _suiteCyberId, status) => {
            setCheckoutOpen(false);
            if (!id) return;
            // A pending verification keeps the draft and does not mark the result as purchased.
            if (status === "pending") { navigate(`/dpia-framework/result/${id}?purchase=pending`); return; }
            void clearDraft();
            navigate(`/dpia-framework/result/${id}?purchased=true`);
          }}
        />
        <ToolSamplePreview
          toolType="dpia"
          toolName="Data Protection Impact Assessment (DPIA)"
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
