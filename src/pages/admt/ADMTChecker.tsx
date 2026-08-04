// src/pages/admt/ADMTChecker.tsx
// ADMT Compliance Assessment — Module 3
// Four-step intake: (1) ADMT Inventory, (2) Pre-Use Notice, (3) Opt-Out, (4) Access Rights
// Signature feature: StatuteRail — persistent right column showing verbatim
// regulation text, plain summary, and FSOR context for every field.

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Label as UILabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { useRunMeter } from "@/hooks/useRunMeter";
import { ExhibitTextarea, isExhibit } from "@/components/ExhibitTextarea";
import { AssistedInput } from "@/components/AssistedInput";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import ToolTierNote from "@/components/tools/ToolTierNote";
import ToolCTABlock from "@/components/ToolCTABlock";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import { useToolDraft } from "@/hooks/useToolDraft";
import StatuteRail from "@/components/intake/StatuteRail";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { ChoiceRadio } from "@/components/intake/ChoiceRadio";
import { ChoiceWithOther } from "@/components/intake/ChoiceWithOther";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
import type { RailEntry } from "@/components/intake/StatuteRail";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import MethodologyBox from "@/components/cppa/MethodologyBox";

const SIGNIFICANT_DECISION_DOMAINS = [
  "Financial or lending services (credit decisions, loans, accounts)",
  "Housing (rental or purchase eligibility)",
  "Education enrollment or opportunities (admission, credentials, suspension)",
  "Hiring or admission decisions",
  "Work allocation, scheduling, or compensation",
  "Promotion, demotion, suspension, or termination",
  "Healthcare services (diagnosis, treatment, care eligibility)",
];

const HUMAN_REVIEW_OPTIONS = [
  "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
  "Partial — reviewer sees the output but cannot override it",
  "No — fully automated, no human review",
  "Not applicable / unsure",
];

const NOTICE_DELIVERY_OPTIONS = [
  "Included in our Notice at Collection",
  "Separate standalone Pre-use Notice",
  "In-app just-in-time notice before data collection",
  "Account-creation or onboarding flow",
  "We have not yet provided a Pre-use Notice",
];

const OPT_OUT_METHODS = [
  "Interactive online form linked from the Pre-use Notice",
  "Toll-free phone number",
  "Designated email address",
  "In-person form",
  "Mail-based form",
];

const OPT_OUT_EXCEPTIONS = [
  "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
  "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
  "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination",
  "No exception — we provide a full opt-out right",
];

// admt_detail (nested object intake) — enum leaves live in a sibling module
// so the refine surface's structured editor can import them without pulling
// this page (and thus RefinePanel) back in a cycle.
export {
  ADMT_VENDOR_STATUS_OPTS,
  ADMT_VENDOR_DOCS_OPTS,
  ADMT_YES_NO_OPTS,
  ADMT_YES_NO_UNSURE_OPTS,
  ADMT_HOSTING_OPTS,
  ADMT_MODEL_TYPE_OPTS,
  ADMT_DECISION_EFFECT_OPTS,
  ADMT_DECISION_CADENCE_OPTS,
  ADMT_SOLE_FACTOR_OPTS,
  ADMT_SOLELY_ADVERTISING_OPTS,
  ADMT_AFFECTED_POPULATION_BAND_OPTS,
  ADMT_ROLE_ROSTER_OPTS,
  ADMT_SOLE_USE_ATTESTATION_OPTS,
  ADMT_NONDISCRIM_TESTING_OPTS,
} from "./ADMTChecker.enums";
import {
  ADMT_VENDOR_STATUS_OPTS,
  ADMT_VENDOR_DOCS_OPTS,
  ADMT_YES_NO_UNSURE_OPTS,
  ADMT_HOSTING_OPTS,
  ADMT_MODEL_TYPE_OPTS,
  ADMT_DECISION_EFFECT_OPTS,
  ADMT_DECISION_CADENCE_OPTS,
  ADMT_SOLE_FACTOR_OPTS,
  ADMT_SOLELY_ADVERTISING_OPTS,
  ADMT_AFFECTED_POPULATION_BAND_OPTS,
  ADMT_ROLE_ROSTER_OPTS,
  ADMT_SOLE_USE_ATTESTATION_OPTS,
  ADMT_NONDISCRIM_TESTING_OPTS,
} from "./ADMTChecker.enums";
const SOLE_USE_ATTESTATION_OPTIONS = ADMT_SOLE_USE_ATTESTATION_OPTS;
const NONDISCRIM_TESTING_OPTIONS = ADMT_NONDISCRIM_TESTING_OPTS;
import { AlertTriangle } from 'lucide-react';

function formatRelativeTime(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// Deselect-capable single-select; aliased to the shared ChoiceRadio.
// The legacy `name` prop is accepted and ignored.
const Radio = ChoiceRadio;

// Serif-styled field label (Prompt 4.1c). Tiny sub-labels pass their own
// `text-[12px]` etc., which override the base via cn's later-wins merge.
const Label = ({ className, ...props }: ComponentProps<typeof UILabel>) => (
  <UILabel
    className={cn("font-serif-text font-semibold text-[16.5px] text-brand-navy", className)}
    {...props}
  />
);

const STEP_TITLES: Record<number, string> = {
  1: "Does the ADMT law apply to you?",
  2: "Do people get the right heads-up?",
  3: "Can people say no?",
  4: "Can people see how it worked?",
  5: "Review your answers",
};

const Pills = ({
  options, value, onChange, onFocus,
}: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; onFocus?: () => void;
}) => (
  <div className="flex flex-wrap gap-2" onFocus={onFocus}>
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button
          key={opt} type="button"
          onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors text-left ${
            checked
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-input"
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

// Progressive disclosure for optional clusters. The value line states, in plain
// words, what the report does NOT say if the cluster is left closed.
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



export default function ADMTChecker() {
  useToolStartedOnInteraction("cppa_admt");
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_admt" as any);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const refine = useRefineMode("cppa_admt");
  const { meter } = useRunMeter("cppa_admt", refine.assessmentId);
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalSteps = 5;

  const [activeRailKey, setActiveRailKey] = useState<string | null>(null);
  const activeRailEntry: RailEntry | null =
    activeRailKey ? (ADMT_RAIL[activeRailKey] ?? null) : null;
  const focus = (key: string) => setActiveRailKey(key);

  // Default rail entry for the first question on each step — updates the rail
  // automatically when the user advances/goes back, so it never shows stale
  // guidance from the previous page.
  const STEP_DEFAULT_RAIL_KEY: Record<number, string | null> = {
    1: "scope_does_business_use_admt",
    2: "notice_timing",
    3: "optout_exception_human_appeal",
    4: "access_logic_disclosure",
  };
  useEffect(() => {
    setActiveRailKey(STEP_DEFAULT_RAIL_KEY[step] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Update the active rail entry as the user scrolls up/down the form.
  useScrollActiveRail(setActiveRailKey, [step]);

  // Step 1
  const [organizationName, setOrganizationName] = useState("");
  const [systemName, setSystemName] = useState("");
  const [systemType, setSystemType] = useState("");
  const [systemDescription, setSystemDescription] = useState("");
  const [decisionDomains, setDecisionDomains] = useState<string[]>([]);
  const [humanReview, setHumanReview] = useState("");
  const [trainingDataUse, setTrainingDataUse] = useState("");
  const [profilingUse, setProfilingUse] = useState("");
  // Step 1 additions
  const [caConsumerCount, setCaConsumerCount] = useState("");
  const [thirdPartyAdmt, setThirdPartyAdmt] = useState("");
  const [admtSystemCount, setAdmtSystemCount] = useState("");
  // TURN 2 — new intake fields
  const [affectedPopulationBand, setAffectedPopulationBand] = useState("");
  const [roleRoster, setRoleRoster] = useState<string[]>([]);
  // prior_access_requests_12mo removed (RC-P6): § 7222(j) threshold is framework-level, not per-consumer.

  // Step 2
  const [noticeDelivery, setNoticeDelivery] = useState<string[]>([]);
  const [noticeHasSpecificPurpose, setNoticeHasSpecificPurpose] = useState("");
  const [noticePurposeText, setNoticePurposeText] = useState("");
  const [noticeHasOptOutDesc, setNoticeHasOptOutDesc] = useState("");
  const [noticeHasAccessDesc, setNoticeHasAccessDesc] = useState("");
  const [noticeHasAntiRetaliation, setNoticeHasAntiRetaliation] = useState("");
  const [noticeHasHowItWorks, setNoticeHasHowItWorks] = useState("");
  const [noticeHasAlternativeProcess, setNoticeHasAlternativeProcess] = useState("");
  // UPGRADE-3 ITEM 1 — the ACTUAL published pre-use notice, pasted whole.
  // § 7220(c) elements are TESTED against these words, not asserted about.
  const [noticeFullText, setNoticeFullText] = useState("");

  // Step 3
  const [optOutException, setOptOutException] = useState("");
  const [optOutMethods, setOptOutMethods] = useState<string[]>([]);
  const [optOutLinkTitle, setOptOutLinkTitle] = useState("");
  const [optOutNoCookieBanner, setOptOutNoCookieBanner] = useState("");
  const [optOutNoAccountRequired, setOptOutNoAccountRequired] = useState("");
  const [optOutConfirmationMechanism, setOptOutConfirmationMechanism] = useState("");
  const [optOutAppealProcess, setOptOutAppealProcess] = useState("");
  const [optOutFairnessDoc, setOptOutFairnessDoc] = useState("");
  // Step 3 additions
  const [optOut15DayProcess, setOptOut15DayProcess] = useState("");

  // Step 4
  const [accessSubmissionMethods, setAccessSubmissionMethods] = useState("");
  const [accessVerificationProcess, setAccessVerificationProcess] = useState("");
  const [accessLogicDisclosure, setAccessLogicDisclosure] = useState("");
  const [accessOutcomeDisclosure, setAccessOutcomeDisclosure] = useState("");
  const [accessResponseTimeline, setAccessResponseTimeline] = useState("");
  const [accessTradeSecretPolicy, setAccessTradeSecretPolicy] = useState("");
  // UPGRADE-3 ITEM 3 — § 7222(b) explanation-readiness (five elements).
  const [accessReadiness, setAccessReadiness] = useState<Record<string, string>>({});
  const setAR = (k: string, v: string) => setAccessReadiness((p) => ({ ...p, [k]: v }));

  // Article 11 detail fields (G1–G7) — kept in one nested object to avoid per-field bookkeeping.
  // ITEM 308 — element-by-element transcription of the published pre-use notice.
  const [noticeElementText, setNoticeElementText] = useState<Record<string, string>>({});
  const setNET = (k: string, v: string) => setNoticeElementText((p) => ({ ...p, [k]: v }));
  const [adv, setAdv] = useState<Record<string, any>>({});
  const setA = (k: string, v: any) => setAdv((a) => ({ ...a, [k]: v }));

  const provideOptOut =
    !optOutException.startsWith("Human appeal") &&
    !optOutException.startsWith("Hiring") &&
    !optOutException.startsWith("Work allocation");

  const admtScopeVerdict = useMemo(() => {
    const hasSignificant = decisionDomains.length > 0;
    const answeredHuman = !!humanReview;
    if (!hasSignificant && !answeredHuman) return null;
    const humanQualifies =
      humanReview.startsWith("Yes — reviewer knows") ||
      (adv.hi_trained === "Yes" && adv.hi_reviews_other_info === "Yes" && adv.hi_authority_override === "Yes");
    if (!hasSignificant)
      return { level: "out", title: "Article 11 ADMT obligations may not apply yet",
        body: "You haven't indicated a significant decision (a provision/denial of financial, housing, education, employment, or healthcare). Advertising and ordinary profiling are excluded. If this system doesn't gate one of those, the ADMT notice/opt-out/access duties may not attach — keep this reasoning on file." } as const;
    if (humanQualifies)
      return { level: "out", title: "A qualifying human reviewer appears to be in the loop",
        body: "Because your reviewer can interpret the output, reviews it with other information, AND can change the outcome before it issues, the system may not “substantially replace” human decisionmaking under § 7001(e). Article 11 may not apply — document this and confirm with counsel. You can stop here." } as const;
    return { level: "in", title: "Article 11 ADMT obligations appear to apply",
      body: "Your system makes a significant decision and no qualifying human reviewer overrides it before it issues, so it “substantially replaces” human decisionmaking. You'll need a pre-use notice, an opt-out, and an access process — the remaining steps check each. (Preliminary read; your report confirms it.)" } as const;
  }, [decisionDomains, humanReview, adv]);

  const stepValid = (): string | null => {
    if (step === 1) {
      if (!organizationName.trim()) return "Name the organization running this assessment.";
      if (!systemName.trim()) return "Name the ADMT system.";
      if (!systemDescription || systemDescription.length < 30)
        return "Describe what the system does — at least 30 characters.";
      if (!decisionDomains.length)
        return "Select the decision domains this system affects.";
      if (!humanReview) return "Describe the human review applied to this system's outputs.";
    }
    if (step === 2) {
      if (!noticeDelivery.length) return "Select how the Pre-use Notice reaches consumers.";
      if (!noticeHasSpecificPurpose) return "Answer whether the notice states a specific purpose.";
      if (noticeHasSpecificPurpose === "Yes" && !noticePurposeText.trim())
        return "Provide the specific purpose statement as published.";
      if (!noticeHasOptOutDesc) return "Answer whether the notice describes the opt-out right.";
      if (!noticeHasAccessDesc) return "Answer whether the notice describes the access right.";
      if (!noticeHasAntiRetaliation)
        return "Answer whether the notice includes the anti-retaliation statement.";
      if (!noticeHasHowItWorks) return "Answer whether the notice explains how the ADMT works.";
    }
    if (step === 3) {
      if (!optOutException)
        return "Select either an opt-out right or the exception relied on.";
      if (provideOptOut && optOutMethods.length < 2)
        return "You must provide at least two designated opt-out methods (§ 7221(c)).";
      if (
        provideOptOut &&
        optOutMethods.includes("Interactive online form linked from the Pre-use Notice") &&
        !optOutLinkTitle.trim()
      )
        return "Give the title of the opt-out link (§ 7221(c)(1)).";
      if (provideOptOut && !optOutConfirmationMechanism)
        return "Describe how a consumer confirms an opt-out was processed (§ 7221(h)).";
      if (optOutException.startsWith("Human appeal") && !optOutAppealProcess.trim())
        return "Describe the human appeal process (§ 7221(b)(1)).";
      if ((optOutException.startsWith("Hiring") || optOutException.startsWith("Work")) && !optOutFairnessDoc.trim())
        return "Describe the non-discrimination testing documentation (§ 7221(b)(2)-(3)).";
    }
    if (step === 4) {
      if (!accessSubmissionMethods.trim()) return "Describe how consumers submit access requests.";
      if (!accessVerificationProcess.trim())
        return "Describe the identity verification applied to access requests.";
      if (!accessLogicDisclosure.trim())
        return "Describe the logic information disclosed in access responses.";
      if (!accessOutcomeDisclosure.trim())
        return "Describe the outcome information disclosed in access responses.";
      if (!accessResponseTimeline) return "Select the response timeline.";

    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setStep((s) => s + 1);
  };
  const back = () => { setValidationError(null); setStep((s) => Math.max(1, s - 1)); };


  const intake = useMemo(
    () => ({
      organization_name: organizationName,
      system_name: systemName,
      system_type: systemType,
      system_description: systemDescription,
      decision_domains: decisionDomains,
      human_review: humanReview,
      training_data_use: trainingDataUse,
      profiling_use: profilingUse,
      notice_delivery: noticeDelivery,
      notice_has_specific_purpose: noticeHasSpecificPurpose,
      notice_purpose_text: noticePurposeText,
      notice_element_text: noticeElementText,
      notice_full_text: noticeFullText,
      notice_has_opt_out_desc: noticeHasOptOutDesc,
      notice_has_access_desc: noticeHasAccessDesc,
      notice_has_anti_retaliation: noticeHasAntiRetaliation,
      notice_has_how_it_works: noticeHasHowItWorks,
      notice_has_alternative_process: noticeHasAlternativeProcess,
      opt_out_exception: optOutException,
      opt_out_methods: optOutMethods,
      opt_out_link_title: optOutLinkTitle,
      opt_out_no_cookie_banner: optOutNoCookieBanner,
      opt_out_no_account_required: optOutNoAccountRequired,
      opt_out_confirmation_mechanism: optOutConfirmationMechanism,
      opt_out_appeal_process: optOutAppealProcess,
      opt_out_fairness_doc: optOutFairnessDoc,
      access_submission_methods: accessSubmissionMethods,
      access_verification_process: accessVerificationProcess,
      access_logic_disclosure: accessLogicDisclosure,
      access_outcome_disclosure: accessOutcomeDisclosure,
      access_response_timeline: accessResponseTimeline,
      access_trade_secret_policy: accessTradeSecretPolicy,
      access_readiness: accessReadiness,
      ca_consumer_count: caConsumerCount,
      third_party_admt: thirdPartyAdmt,
      admt_system_count: admtSystemCount,
      // TURN 2 — new intake fields
      affected_population_band: affectedPopulationBand,
      role_roster: roleRoster,
      // prior_access_requests_12mo removed (RC-P6).
      opt_out_15_day_process: optOut15DayProcess,
      admt_detail: adv,
    }),
    [
      organizationName, systemName, systemType, systemDescription, decisionDomains, humanReview,
      trainingDataUse, profilingUse, noticeDelivery, noticeHasSpecificPurpose,
      noticePurposeText, noticeElementText, noticeFullText, noticeHasOptOutDesc, noticeHasAccessDesc,
      noticeHasAntiRetaliation, noticeHasHowItWorks, noticeHasAlternativeProcess,
      optOutException, optOutMethods, optOutLinkTitle, optOutNoCookieBanner,
      optOutNoAccountRequired, optOutConfirmationMechanism, optOutAppealProcess,
      optOutFairnessDoc, accessSubmissionMethods, accessVerificationProcess,
      accessLogicDisclosure, accessOutcomeDisclosure, accessResponseTimeline,
      accessTradeSecretPolicy, accessReadiness,
      caConsumerCount, thirdPartyAdmt, admtSystemCount, affectedPopulationBand, roleRoster, optOut15DayProcess, adv,
    ],
  );

  const draftData = intake;
  const INITIAL_DRAFT = useMemo(
    () =>
      JSON.stringify({
        organizationName: "", systemName: "", systemType: "", systemDescription: "", decisionDomains: [],
        humanReview: "", trainingDataUse: "", profilingUse: "",
        noticeDelivery: [], noticeHasSpecificPurpose: "", noticePurposeText: "",
        noticeHasOptOutDesc: "", noticeHasAccessDesc: "", noticeHasAntiRetaliation: "",
        noticeHasHowItWorks: "", noticeHasAlternativeProcess: "",
        optOutException: "", optOutMethods: [], optOutLinkTitle: "",
        optOutNoCookieBanner: "", optOutNoAccountRequired: "",
        optOutConfirmationMechanism: "", optOutAppealProcess: "", optOutFairnessDoc: "",
        accessSubmissionMethods: "", accessVerificationProcess: "",
        accessLogicDisclosure: "", accessOutcomeDisclosure: "",
        accessResponseTimeline: "", accessTradeSecretPolicy: "",
      }),
    [],
  );
  const touched =
    JSON.stringify({
      organizationName, systemName, systemType, systemDescription, decisionDomains, humanReview,
      trainingDataUse, profilingUse, noticeDelivery, noticeHasSpecificPurpose,
      noticePurposeText, noticeElementText, noticeHasOptOutDesc, noticeHasAccessDesc,
      noticeHasAntiRetaliation, noticeHasHowItWorks, noticeHasAlternativeProcess,
      optOutException, optOutMethods, optOutLinkTitle, optOutNoCookieBanner,
      optOutNoAccountRequired, optOutConfirmationMechanism, optOutAppealProcess,
      optOutFairnessDoc, accessSubmissionMethods, accessVerificationProcess,
      accessLogicDisclosure, accessOutcomeDisclosure, accessResponseTimeline,
      accessTradeSecretPolicy,
    }) !== INITIAL_DRAFT;

  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage,
    saving: draftSaving, lastSavedAt, clearDraft, dismissDraft,
  } = useToolDraft({
    toolType: "cppa_admt",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: step,
    enabled: !!user && touched,
  });

  const applyRestore = () => {
    const d = restoreData as Record<string, any> | null;
    if (!d) return;
    if (typeof d.organization_name === "string") setOrganizationName(d.organization_name);
    if (typeof d.system_name === "string") setSystemName(d.system_name);
    if (typeof d.system_type === "string") setSystemType(d.system_type);
    if (typeof d.system_description === "string") setSystemDescription(d.system_description);
    if (Array.isArray(d.decision_domains)) setDecisionDomains(d.decision_domains);
    if (typeof d.human_review === "string") setHumanReview(d.human_review);
    if (typeof d.training_data_use === "string") setTrainingDataUse(d.training_data_use);
    if (typeof d.profiling_use === "string") setProfilingUse(d.profiling_use);
    if (Array.isArray(d.notice_delivery)) setNoticeDelivery(d.notice_delivery);
    if (typeof d.notice_has_specific_purpose === "string") setNoticeHasSpecificPurpose(d.notice_has_specific_purpose);
    if (typeof d.notice_purpose_text === "string") setNoticePurposeText(d.notice_purpose_text);
    if (d.notice_element_text && typeof d.notice_element_text === "object") setNoticeElementText(d.notice_element_text as Record<string, string>);
    if (typeof d.notice_full_text === "string") setNoticeFullText(d.notice_full_text);
    if (typeof d.notice_has_opt_out_desc === "string") setNoticeHasOptOutDesc(d.notice_has_opt_out_desc);
    if (typeof d.notice_has_access_desc === "string") setNoticeHasAccessDesc(d.notice_has_access_desc);
    if (typeof d.notice_has_anti_retaliation === "string") setNoticeHasAntiRetaliation(d.notice_has_anti_retaliation);
    if (typeof d.notice_has_how_it_works === "string") setNoticeHasHowItWorks(d.notice_has_how_it_works);
    if (typeof d.notice_has_alternative_process === "string") setNoticeHasAlternativeProcess(d.notice_has_alternative_process);
    if (typeof d.opt_out_exception === "string") setOptOutException(d.opt_out_exception);
    if (Array.isArray(d.opt_out_methods)) setOptOutMethods(d.opt_out_methods);
    if (typeof d.opt_out_link_title === "string") setOptOutLinkTitle(d.opt_out_link_title);
    if (typeof d.opt_out_no_cookie_banner === "string") setOptOutNoCookieBanner(d.opt_out_no_cookie_banner);
    if (typeof d.opt_out_no_account_required === "string") setOptOutNoAccountRequired(d.opt_out_no_account_required);
    if (typeof d.opt_out_confirmation_mechanism === "string") setOptOutConfirmationMechanism(d.opt_out_confirmation_mechanism);
    if (typeof d.opt_out_appeal_process === "string") setOptOutAppealProcess(d.opt_out_appeal_process);
    if (typeof d.opt_out_fairness_doc === "string") setOptOutFairnessDoc(d.opt_out_fairness_doc);
    if (typeof d.access_submission_methods === "string") setAccessSubmissionMethods(d.access_submission_methods);
    if (typeof d.access_verification_process === "string") setAccessVerificationProcess(d.access_verification_process);
    if (typeof d.access_logic_disclosure === "string") setAccessLogicDisclosure(d.access_logic_disclosure);
    if (typeof d.access_outcome_disclosure === "string") setAccessOutcomeDisclosure(d.access_outcome_disclosure);
    if (typeof d.access_response_timeline === "string") setAccessResponseTimeline(d.access_response_timeline);
    if (typeof d.access_trade_secret_policy === "string") setAccessTradeSecretPolicy(d.access_trade_secret_policy);
    if (d.access_readiness && typeof d.access_readiness === "object") setAccessReadiness(d.access_readiness as Record<string, string>);
    if (typeof d.ca_consumer_count === "string") setCaConsumerCount(d.ca_consumer_count);
    if (typeof d.third_party_admt === "string") setThirdPartyAdmt(d.third_party_admt);
    if (typeof d.opt_out_15_day_process === "string") setOptOut15DayProcess(d.opt_out_15_day_process);
    if (typeof d.admt_system_count === "string") setAdmtSystemCount(d.admt_system_count);
    if (typeof d.affected_population_band === "string") setAffectedPopulationBand(d.affected_population_band);
    if (Array.isArray(d.role_roster)) setRoleRoster(d.role_roster.filter((x: unknown) => typeof x === "string"));
    // d.prior_access_requests_12mo (legacy drafts) intentionally ignored — field removed (RC-P6).
    if (d.admt_detail && typeof d.admt_detail === "object") setAdv(d.admt_detail);
    if (typeof restoreStage === "number") setStep(restoreStage);
    dismissDraft();
  };

  // Auto-restore when arriving via "Continue" from My Reports (?resume=1).
  const [admtSearchParams] = useSearchParams();
  const autoResumedRef = useRef(false);
  const shouldAutoResume = admtSearchParams.get("resume") === "1";
  useEffect(() => {
    if (!shouldAutoResume) return;
    if (autoResumedRef.current) return;
    if (!draftFound || !restoreData || touched) return;
    autoResumedRef.current = true;
    applyRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoResume, draftFound, restoreData, touched]);

  const handlePurchase = () => {
    if (!user) { setAuthGateOpen(true); return; }
    if (!pricing.stripeConfigured) {
      toast({
        title: "Payments unavailable",
        description: "Payments are not yet configured.",
        variant: "destructive",
      });
      return;
    }
    setCheckoutOpen(true);
  };

  const isReview = step === totalSteps;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>ADMT Compliance Assessment (Module 3) | End User Privacy</title>
        <meta name="description" content="California ADMT compliance assessment covering pre-use notice, opt-out, and access rights under 11 CCR §§ 7200–7222. January 1, 2027 deadline." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-admt-checker" />
      </Helmet>

      <header className="bg-brand-ocean text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            CPPA AUDIT READINESS · MODULE 3 · ${pricing.price}
          </span>
          <h1 className="text-hero-h1 text-white mb-3">ADMT Compliance Assessment</h1>
          <RequirementBadge variant="hero" tier="conditional" text="If you use automated decision-making for significant decisions — hiring, lending, housing, healthcare — California requires pre-use notice, an opt-out, and a risk assessment by January 1, 2027." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            Assess your automated decisionmaking against the CPPA's final regulations — pre-use notice, opt-out, and access rights. You get a gap report with specific remediation steps for each deficit, cited to the rule.
          </p>
          <p className="text-slate-400 text-sm mt-3 max-w-3xl">
            Compliance deadline: <strong className="text-amber-300">January 1, 2027</strong> for businesses already using ADMT for significant decisions.
          </p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-xs italic mt-1 max-w-3xl">Need more? Add 4 additional generations for half the tool price.</p>
          <ToolCTABlock
            toolSlug="admt"
            ctaPosition="hero"
            onDark
            pagePath="/cppa-admt-checker"
            primaryLabel={`Start an ADMT Compliance Assessment — $${pricing.price}`}
          />
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            11 CCR §§ 7200–7222 · pre-use notice, opt-out, and access rights on the Jan 1, 2027 clock
          </p>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
        <ToolTierNote isCppa={true} />
      </div>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MethodologyBox
          className="mb-4"
          title="Scope first"
          lines={[
            "Applies only where automated decisionmaking technology makes a significant decision as defined by the regulations.",
            "The checker gates every finding on that scope determination — ordinary advertising or personalization is not treated as a significant decision.",
            "Deadline context: ADMT disclosure obligations begin January 1, 2027.",
          ]}
        />
        <IntakeGuidance className="mb-4">Describe each automated decision-making system specifically and separately: what it decides, on what data, and the human-review step. If you run several systems, give each its own description rather than merging them.</IntakeGuidance>
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a compliance gap analysis for your ADMT systems under 11 CCR Article 11 (§§ 7200–7222). It is an analytical aid, not legal advice. Review all output with qualified California privacy counsel before relying on it for regulatory submissions." />

        {refine.isRefine && refine.intake && !refine.loading && (
          <RefinePanel
            toolType="cppa_admt"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/cppa-admt-checker/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        )}
        {!refine.isRefine && (<>

        {draftFound && !touched && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-brand-teal/40 bg-[hsl(var(--cobalt)/0.06)] text-sm mb-4">
            <div>You have a saved draft{draftUpdatedAt ? ` from ${formatRelativeTime(draftUpdatedAt)}` : ""}.</div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={applyRestore}>Resume draft</Button>
              <Button size="sm" variant="ghost" onClick={() => void clearDraft()}>Discard</Button>
            </div>
          </div>
        )}

        <IntakeMasthead
          kicker="CPPA ADMT Checker · 11 CCR Article 11 (§§ 7200–7222)"
          title={STEP_TITLES[step] ?? `Step ${step}`}
          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter
              ? (typeof meter.lockedFields?.system_name === "string"
                  ? (meter.lockedFields!.system_name as string)
                  : (typeof meter.lockedFields?.organization_name === "string"
                      ? (meter.lockedFields!.organization_name as string)
                      : undefined))
              : undefined
          }
          meter={meter ?? null}
          preRunHint="The subject you set below is fixed once you first generate. Everything else stays editable across your 4 included generations."
        />

        <div className="mt-3 rounded-md border border-brand-teal/30 bg-brand-cloud/40 p-3 text-sm">
          <span className="font-semibold text-brand-navy">Also need Risk (M1) + Cybersecurity (M2)?</span>{" "}
          <span className="text-muted-foreground">
            ADMT is standalone. If you triggered M1 and M2 in the Scope Checker, the{" "}
          </span>
          <a href="/cppa-risk-assessment?suite=true" className="text-brand-teal-text underline">
            CPPA Full Audit Suite
          </a>
          <span className="text-muted-foreground"> bundles them at a discount.</span>
        </div>

        <div className="text-sm text-muted-foreground my-4" aria-live="polite">Step {step} of {totalSteps}</div>

        <BenchLayout
          toolType="admt"
          railEntry={activeRailEntry}
          defaultSourceUrl="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf"
          corpusBlock={
            activeRailEntry?.enforcementNote ? (
              <p className="text-body-small text-ink leading-relaxed">
                {activeRailEntry.enforcementNote}
              </p>
            ) : undefined
          }
          coachingOpenByDefault={
            !!activeRailKey &&
            refine.infoNeededKeys.some(
              (k) => activeRailKey === k || activeRailKey.includes(k) || k.includes(activeRailKey),
            )
          }
        >
          <div className="space-y-6">

              {step === 1 && (
                <>
                 <h2 className="font-serif text-xl">Step 1 · Does the ADMT law apply to you?</h2>
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> whether this system makes a <em>significant decision</em> with no meaningful human involvement — the two things that trigger California's ADMT rules.</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR §§ 7001(e), 7001(ddd), 7200(a)</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the applicability determination at the front of your report — the finding that decides whether every obligation in §§ 7220–7222 reaches this system at all.</p>

                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    Complete one assessment per ADMT system. If you use multiple ADMT systems for significant decisions, run the checker once per system. Each system requires its own pre-use notice, opt-out mechanism, and access right process.
                  </p>

                  <details className="rounded-md border bg-muted/20 p-4">
                    <summary className="cursor-pointer text-sm font-medium select-none">See a worked example (a loan-approval engine)</summary>
                    <div className="mt-3 space-y-2 text-[13px] text-muted-foreground leading-relaxed">
                      <p><span className="font-medium text-foreground">Organization:</span> Acme Lending, Inc.</p>
                      <p><span className="font-medium text-foreground">System:</span> "ScoreEngine v3.2" — a gradient-boosted model that scores consumer loan applications 0–100 from credit history, income, and debt-to-income ratio.</p>
                      <p><span className="font-medium text-foreground">Significant decision:</span> financial / lending services — the score gates loan approval or denial.</p>
                      <p><span className="font-medium text-foreground">Human review:</span> applications scoring under 40 are auto-declined with no one able to override before the decision issues — so there is no meaningful human involvement, and the ADMT rules apply.</p>
                      <p className="italic">The field examples throughout this form refer back to this scenario.</p>
                    </div>
                  </details>

                  <div>
                    <Label>
                      Which organization is running this assessment? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      The business that is the CCPA-responsible "business" for this ADMT — the entity whose compliance this report documents.
                    </p>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g. Acme Lending, Inc."
                    />
                  </div>

                  <div>
                    <Label data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}>
                      System name <Req />
                    </Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}
                      placeholder="e.g. Loan Approval Engine, Resume Screening Tool, Fraud Score Model"
                    />
                  </div>

                  <div>
                    <Label>System type (optional)</Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={systemType}
                      onChange={(e) => setSystemType(e.target.value)}
                      placeholder="e.g. ML model, rules-based engine, third-party vendor API"
                    />
                  </div>

                  <div>
                    <Label data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}>
                      What does this system decide, and how? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe what the system processes, what output it generates, and how that output is used to make a decision about a consumer. Avoid generic descriptions — be specific about the decision and the consumer it affects.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={4}
                      value={systemDescription}
                      onChange={(e) => setSystemDescription(e.target.value)}
                      data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}
                      placeholder='e.g. "A gradient-boosted model that scores loan applications 0–100 based on credit history, income, and debt ratio. Scores below 40 are automatically declined without human review."'
                    />
                  </div>

                  <div>
                    <Label>
                      Are you using any third-party tools or APIs that make, or materially contribute to, this decision? <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      You remain the responsible business even when the decision runs on someone else's model. Name each third-party system involved; answering opens the vendor questions.
                    </p>
                    <ExhibitTextarea
                      className="mt-2"
                      rows={2}
                      value={thirdPartyAdmt}
                      onChange={setThirdPartyAdmt}
                      placeholder="One system per line"
                    />
                  </div>


                  {thirdPartyAdmt.trim() && !isExhibit(thirdPartyAdmt) && (
                    <div className="rounded-md border bg-muted/20 p-4 space-y-3" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>
                      <p className="text-[11px] italic text-muted-foreground">You're seeing this because you named a third-party ADMT system above.</p>
                      <p className="text-[12px] font-semibold">Vendor and downstream-recipient detail</p>
                      <p className="text-[12px] text-muted-foreground">You remain the responsible business. Where a vendor makes ADMT trained on personal information available to you for significant decisions, the vendor must supply the facts you need for your own risk assessment (§ 7150(b)(6), § 7153).</p>
                      <div>
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Vendor's role under the CCPA</Label>
                        <div className="mt-1"><Radio name="v_status" options={ADMT_VENDOR_STATUS_OPTS} value={adv.vendor_status || ""} onChange={(v) => setA("vendor_status", v)} /></div>
                      </div>
                      <div>
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Vendor documentation on file (select all that apply)</Label>
                        <div className="mt-1"><Pills options={ADMT_VENDOR_DOCS_OPTS} value={adv.vendor_docs || []} onChange={(v) => setA("vendor_docs", v)} /></div>
                      </div>
                      <div>
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Do your vendor contracts include these obligations?</Label>
                        <div className="mt-1 space-y-1">
                          {[["v_audit", "Audit and monitoring rights"], ["v_assist", "Assistance with consumer access requests"], ["v_optout", "Opt-out propagation downstream"], ["v_appeal", "Appeal and human-review support"], ["v_incident", "Incident notification"]].map(([k, label]) => (
                            <div key={k} className="flex items-center justify-between gap-3">
                              <span className="text-[12px]">{label}</span>
                              <span className="shrink-0"><Radio name={k} options={["Yes", "No"]} value={adv[k] || ""} onChange={(val) => setA(k, val)} /></span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Does the vendor make this ADMT available to other businesses?</Label>
                        <p className="text-[11px] text-muted-foreground">If it does, the recipient-facts obligation under § 7150(b)(6) and § 7153 is engaged.</p>
                        <div className="mt-1"><Radio name="v_avail" options={ADMT_YES_NO_UNSURE_OPTS} value={adv.vendor_makes_available || ""} onChange={(v) => setA("vendor_makes_available", v)} /></div>
                      </div>
                      <div>
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Vendor training-data and model-improvement rights, and sub-processors</Label>
                        <AssistedInput
                          className="mt-1"
                          rows={2}
                          useExhibit
                          value={adv.vendor_training_rights || ""}
                          onChange={(v) => setA("vendor_training_rights", v)}
                          pills={ASSISTED_INPUT_REGISTRY.admt_vendor_training_rights.pills}
                          placeholder="Rights first, then sub-processors by name"
                        />
                      </div>
                    </div>

                  )}

                  <OptionalCluster
                    title="Scale and internal ownership"
                    valueLine="Left closed, the report sizes your exposure as unstated and names no internal owner for this system; nothing is inferred on your behalf."
                  >
                    <div>
                      <Label>Approximate number of California consumers this system makes decisions about each year</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sizes the exposure the report describes. A range is fine.
                      </p>
                      <input
                        className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={caConsumerCount}
                        onChange={(e) => setCaConsumerCount(e.target.value)}
                        placeholder="A number or a range"
                      />
                    </div>

                    <div>
                      <Label>How many distinct ADMT systems does your business run for significant decisions?</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        More than one system may let you publish a single consolidated pre-use notice under § 7220(e) instead of one per system.
                      </p>
                      <input
                        className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={admtSystemCount}
                        onChange={(e) => setAdmtSystemCount(e.target.value)}
                        placeholder="A whole number"
                      />
                    </div>

                    <div data-rail-key="affected_population_band" onFocus={() => focus("affected_population_band")}>
                      <Label data-rail-key="affected_population_band" onFocus={() => focus("affected_population_band")}>Affected-population band <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(D))</span></Label>
                      <p className="text-xs text-muted-foreground mt-1">The band the report uses when it describes how many Californians this system reaches.</p>
                      <div className="mt-2">
                        <Pills
                          options={ADMT_AFFECTED_POPULATION_BAND_OPTS}
                          value={affectedPopulationBand ? [affectedPopulationBand] : []}
                          onChange={(vals) => setAffectedPopulationBand(vals[vals.length - 1] || "")}
                        />
                      </div>
                    </div>

                    <div data-rail-key="role_roster" onFocus={() => focus("role_roster")}>
                      <Label data-rail-key="role_roster" onFocus={() => focus("role_roster")}>Internal roles with defined responsibilities for this ADMT <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7157(c))</span></Label>
                      <p className="text-xs text-muted-foreground mt-1">Select every role that already holds a defined responsibility for this system.</p>
                      <div className="mt-2">
                        <Pills
                          options={ADMT_ROLE_ROSTER_OPTS}
                          value={roleRoster}
                          onChange={setRoleRoster}
                        />
                      </div>
                    </div>
                  </OptionalCluster>








                  <div>
                    <Label data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}>
                      What significant decision(s) does this system make or materially contribute to? <DefPopover termKey="significant_decision" /> <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all that apply — or none, if this system only affects advertising or ordinary profiling. <span className="font-medium text-foreground">Why we ask:</span> only these specific decisions trigger the ADMT rules; advertising is expressly excluded.</p>
                    <div className="mt-2">
                      <Pills
                        options={SIGNIFICANT_DECISION_DOMAINS}
                        value={decisionDomains}
                        onChange={setDecisionDomains}
                        data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}
                      />
                    </div>
                    <textarea
                      className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                      value={adv.decision_domains_other || ""}
                      onChange={(e) => setA("decision_domains_other", e.target.value)}
                      data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}
                      placeholder="Describe it in one sentence"
                    />
                  </div>

                  <div className="rounded-md border bg-muted/20 p-4 space-y-3" data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}>
                    <p className="text-[12px] font-semibold">System &amp; decision detail (optional)</p>
                    <p className="text-[12px] text-muted-foreground">Helps an auditor identify the exact system and decision under review, and shapes the access-response analysis.</p>
                    <div>
                      <Label className="text-[12px]">Vendor / product name &amp; version</Label>
                      <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.vendor_product || ""} onChange={(e) => setA("vendor_product", e.target.value)} placeholder="Product name and version" />
                    </div>
                    <div>
                      <Label className="text-[12px]">Where is the system hosted?</Label>
                      <div className="mt-1"><Radio name="adv_hosting" options={ADMT_HOSTING_OPTS} value={adv.hosting || ""} onChange={(v) => setA("hosting", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-[12px]">Model type (select all that apply)</Label>
                      <div className="mt-1"><Pills options={ADMT_MODEL_TYPE_OPTS} value={adv.model_types || []} onChange={(v) => setA("model_types", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-[12px]">What does the decision actually do? (select all)</Label>
                      <div className="mt-1"><Pills options={ADMT_DECISION_EFFECT_OPTS} value={adv.decision_effects || []} onChange={(v) => setA("decision_effects", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-[12px]">Decision cadence</Label>
                      <div className="mt-1"><Radio name="adv_cadence" options={ADMT_DECISION_CADENCE_OPTS} value={adv.decision_cadence || ""} onChange={(v) => setA("decision_cadence", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-[12px]">Is the ADMT output the sole factor in the decision?</Label>
                      <div className="mt-1"><Radio name="adv_sole" options={ADMT_SOLE_FACTOR_OPTS} value={adv.sole_factor || ""} onChange={(v) => setA("sole_factor", v)} /></div>
                    </div>
                    {adv.sole_factor && !adv.sole_factor.startsWith("Sole") && (
                      <div>
                        <Label className="text-[12px]">What other factors feed the decision, and how are they weighted?</Label>
                        <Textarea className="mt-1" rows={2} value={adv.other_factors || ""} onChange={(e) => setA("other_factors", e.target.value)} placeholder="One factor per line" />
                      </div>
                    )}
                    <div>
                      <Label className="text-[12px]">Will the output be used to feed future significant decisions? (§ 7222(b))</Label>
                      <div className="mt-1"><Radio name="adv_future" options={ADMT_YES_NO_UNSURE_OPTS} value={adv.feeds_future_decisions || ""} onChange={(v) => setA("feeds_future_decisions", v)} /></div>
                    </div>
                    <div>
                      <Label className="text-[12px]">Is this system used solely for advertising?</Label>
                      <p className="text-[11px] text-muted-foreground">Advertising is excluded from "significant decision" — a Yes here means Article 11 ADMT obligations do not attach.</p>
                      <div className="mt-1"><Radio name="adv_ads" options={ADMT_SOLELY_ADVERTISING_OPTS} value={adv.solely_advertising || ""} onChange={(v) => setA("solely_advertising", v)} /></div>
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="scope_human_involvement" onFocus={() => focus("scope_human_involvement")}>
                      Human review of system outputs <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the option that best describes how human review works for this system's outputs. Under § 7001(e)(1), 'human involvement' requires the reviewer to know how to interpret the output, review it plus other relevant information, and have the authority to change the decision. <DefPopover termKey="meaningful_human_involvement" />
                    </p>
                    <div className="mt-2">
                      <Radio
                        name="human_review"
                        options={HUMAN_REVIEW_OPTIONS}
                        value={humanReview}
                        onChange={setHumanReview}
                        data-rail-key="scope_human_involvement" onFocus={() => focus("scope_human_involvement")}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-4 space-y-3" data-rail-key="scope_human_involvement" onFocus={() => focus("scope_human_involvement")}>
                    <p className="text-[11px] italic text-muted-foreground">You're seeing this because how much a human is involved decides whether the law applies at all — it's worth a moment.</p>
                    <p className="text-[12px] font-semibold">Human-involvement self-test (§ 7001(e)(1))</p>
                    <p className="text-[12px] text-muted-foreground">This is the gate for the entire regime: if a qualifying human is in the loop, the system does not "substantially replace" human decisionmaking and Article 11 obligations may not attach.</p>
                    <div>
                      <Label className="text-[12px]">Is a human reviewer involved in the decision?</Label>
                      <div className="mt-1"><Radio name="hi_present" options={["Yes — on every decision", "Sometimes / on a subset", "No — fully automated"]} value={adv.hi_reviewer_present || ""} onChange={(v) => setA("hi_reviewer_present", v)} /></div>
                    </div>
                    {adv.hi_reviewer_present && !adv.hi_reviewer_present.startsWith("No") && (
                      <>
                        <div>
                          <Label className="text-[12px]">Reviewer role / title</Label>
                          <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.hi_reviewer_role || ""} onChange={(e) => setA("hi_reviewer_role", e.target.value)} placeholder="e.g. Senior Underwriter; Hiring Manager" />
                        </div>
                        <div>
                          <Label className="text-[12px]">At what stage does the reviewer act?</Label>
                          <div className="mt-1"><Radio name="hi_stage" options={["Before the decision is issued", "After the decision (review of completed decisions)", "Appeal only"]} value={adv.hi_stage || ""} onChange={(v) => setA("hi_stage", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Does the reviewer know how to interpret the ADMT output? (§ 7001(e)(1)(A))</Label>
                          <div className="mt-1"><Radio name="hi_trained" options={["Yes", "No"]} value={adv.hi_trained || ""} onChange={(v) => setA("hi_trained", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Does the reviewer review the output plus other relevant information? (§ 7001(e)(1)(B))</Label>
                          <div className="mt-1"><Radio name="hi_other" options={["Yes", "No"]} value={adv.hi_reviews_other_info || ""} onChange={(v) => setA("hi_reviews_other_info", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Does the reviewer have authority to change the decision? (§ 7001(e)(1)(C))</Label>
                          <div className="mt-1"><Radio name="hi_auth" options={["Yes", "No"]} value={adv.hi_authority_override || ""} onChange={(v) => setA("hi_authority_override", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Actual override rate, last 12 months (optional)</Label>
                          <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.hi_override_rate || ""} onChange={(e) => setA("hi_override_rate", e.target.value)} placeholder="e.g. 8%" />
                        </div>
                        {adv.hi_reviewer_present && (
                          <div className={`p-3 rounded text-[12px] ${adv.hi_trained === "Yes" && adv.hi_reviews_other_info === "Yes" && adv.hi_authority_override === "Yes" && (adv.hi_stage || "").startsWith("Before") ? "bg-green-50 border border-green-200 text-green-900 dark:bg-green-950/20 dark:text-green-200" : "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"}`}>
                            {adv.hi_trained === "Yes" && adv.hi_reviews_other_info === "Yes" && adv.hi_authority_override === "Yes" && (adv.hi_stage || "").startsWith("Before")
                              ? "Based on your answers, this likely qualifies as human involvement under § 7001(e)(1) — the system may not 'substantially replace' human decisionmaking, so Article 11 ADMT obligations may not attach. Confirm with counsel."
                              : "Based on your answers, this likely does NOT qualify as human involvement under § 7001(e)(1) — all three elements (interpret, review-plus-other-info, authority-to-change) must be present and applied before the decision. Article 11 obligations (notice, opt-out, access) therefore apply."}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {admtScopeVerdict && (
                    <div className={`rounded-md border p-4 ${admtScopeVerdict.level === "in" ? "border-cobalt/40 bg-[hsl(var(--cobalt)/0.06)]" : "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"}`}>
                      <p className="text-sm font-semibold">{admtScopeVerdict.title}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{admtScopeVerdict.body}</p>
                      <p className="text-[11px] text-muted-foreground mt-2 italic">This is a preliminary, on-screen read of scope. Your generated report contains the authoritative, regulation-cited determination.</p>
                    </div>
                  )}

                  <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-4">
                    <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      Additional risk assessment triggers (§ 7150)
                    </p>
                    <p className="text-[12px] text-muted-foreground mb-3">
                      A risk assessment is required not only when using ADMT for significant decisions, but also if you use personal information to train ADMT, or use automated processing for profiling. Answer these to ensure your risk assessment scope is complete.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[12px]">Do you use personal information to train any ADMT system? (§ 7153)</Label>
                        <div className="mt-1">
                          <Radio
                            name="training_data"
                            options={["Yes", "No"]}
                            value={trainingDataUse}
                            onChange={setTrainingDataUse}
                            data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[12px]">Do you use automated processing to profile consumers (predict behavior, preferences, or characteristics) even without making a 'significant decision'?</Label>
                        <div className="mt-1">
                          <Radio
                            name="profiling"
                            options={["Yes", "No"]}
                            value={profilingUse}
                            onChange={setProfilingUse}
                            data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                 <h2 className="font-serif text-xl">Step 2 · Do people get the right heads-up?</h2>
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> before you use ADMT for a significant decision, you must tell people — in specific terms, at or before you use it — what it does and how to opt out.</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR §§ 7220(b)–(c)</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the pre-use notice section of your report — an element-by-element test of what you publish against the six things § 7220(c) requires it to say.</p>

                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    The Pre-use Notice must be provided prominently at or before the point you collect PI for ADMT use (§ 7220(b)). If you've already collected the PI for another purpose and now plan to use ADMT, you must provide the notice before starting ADMT processing.
                  </p>

                  <div>
                    <Label data-rail-key="notice_timing" onFocus={() => focus("notice_timing")}>
                      How do you deliver the Pre-use Notice to consumers? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all methods used.</p>
                    <div className="mt-2">
                      <Pills
                        options={NOTICE_DELIVERY_OPTIONS}
                        value={noticeDelivery}
                        onChange={setNoticeDelivery}
                        data-rail-key="notice_timing" onFocus={() => focus("notice_timing")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_specific_purpose" onFocus={() => focus("notice_specific_purpose")}>
                      Does your Pre-use Notice state the specific purpose for ADMT use in plain language? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generic language like "to make a significant decision" or "to improve our services" does not satisfy § 7220(c)(1). The notice must name the actual decision.
                    </p>
                    <div className="mt-2">
                      <Radio
                        name="notice_specific_purpose"
                        options={["Yes", "No — uses generic language", "We have not yet created a Pre-use Notice"]}
                        value={noticeHasSpecificPurpose}
                        onChange={setNoticeHasSpecificPurpose}
                        data-rail-key="notice_specific_purpose" onFocus={() => focus("notice_specific_purpose")}
                      />
                    </div>
                    {noticeHasSpecificPurpose === "Yes" && (
                      <div className="mt-3">
                        <Label className="text-[12px]">Paste your specific purpose statement as it appears in the notice:</Label>
                        <Textarea
                          className="mt-1"
                          rows={3}
                          value={noticePurposeText}
                          onChange={(e) => setNoticePurposeText(e.target.value)}
                          data-rail-key="notice_specific_purpose" onFocus={() => focus("notice_specific_purpose")}
                          placeholder="Paste the exact text from your Pre-use Notice here…"
                        />
                      </div>
                    )}
                  </div>

                  {/* UPGRADE-3 ITEM 1 — the whole published notice, verbatim.
                      Where an element is not transcribed below, the report
                      locates the relevant passage in this text and tests it. */}
                  <div className="border-l-4 border-brand-teal/60 pl-4 py-2 rounded-r bg-muted/30">
                    <Label className="text-[12px] font-semibold" data-rail-key="notice_full_text" onFocus={() => focus("notice_full_text")}>
                      Paste your published Pre-use Notice in full
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      Paste the notice exactly as consumers see it. Your report quotes these words back and tests each § 7220(c) element against them. Leave blank if you have not published a notice yet — the report will say so rather than assume.
                    </p>
                    <Textarea
                      rows={8}
                      value={noticeFullText}
                      onChange={(e) => setNoticeFullText(e.target.value)}
                      data-rail-key="notice_full_text" onFocus={() => focus("notice_full_text")}
                      placeholder="Paste the complete text of your published pre-use notice here…"
                    />
                  </div>

                  {/* ITEM 308 — published pre-use notice text, element by element.
                      Without the actual words, § 7220(c) adequacy can only be asserted. */}
                  <div className="border-l-4 border-brand-teal/60 pl-4 py-2 rounded-r bg-muted/30">
                    <p className="text-[12px] font-semibold mb-1" data-rail-key="notice_element_text" onFocus={() => focus("notice_element_text")}>
                      Paste your published Pre-use Notice, element by element
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Optional but strongly recommended: we assess each § 7220(c) element against the words you actually publish. Leave an element blank if your notice does not cover it.
                    </p>
                    <div className="space-y-3">
                      {[
                        ["purpose", "Specific purpose for using the ADMT"],
                        ["optout", "Right to opt out, and how to submit the request"],
                        ["access", "Right to access ADMT, and how to submit the request"],
                        ["antiretaliation", "Prohibition on retaliation for exercising CCPA rights"],
                        ["howworks_inputs", "How the ADMT processes personal information (inputs)"],
                        ["howworks_output", "Type of output, and how it is used in the decision"],
                        ["altprocess", "Alternative process for consumers who opt out"],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <Label className="text-[12px]">{label}</Label>
                          <Textarea
                            className="mt-1"
                            rows={2}
                            value={noticeElementText[k] || ""}
                            onChange={(e) => setNET(k, e.target.value)}
                            data-rail-key="notice_element_text"
                            onFocus={() => focus("notice_element_text")}
                            placeholder="Paste the exact wording from your published notice…"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_opt_out_description" onFocus={() => focus("notice_opt_out_description")}>
                      Does your notice describe the consumer's right to opt out and how to submit a request? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_opt_out"
                        options={["Yes — with specific opt-out instructions", "Mentions opt-out but without clear instructions", "No", "We rely on an exception and describe appeal rights instead"]}
                        value={noticeHasOptOutDesc}
                        onChange={setNoticeHasOptOutDesc}
                        data-rail-key="notice_opt_out_description" onFocus={() => focus("notice_opt_out_description")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_access_right_description" onFocus={() => focus("notice_access_right_description")}>
                      Does your notice describe the consumer's right to access ADMT information and how to submit a request? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_access"
                        options={["Yes", "No", "Not yet"]}
                        value={noticeHasAccessDesc}
                        onChange={setNoticeHasAccessDesc}
                        data-rail-key="notice_access_right_description" onFocus={() => focus("notice_access_right_description")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_anti_retaliation" onFocus={() => focus("notice_anti_retaliation")}>
                      Does your notice state that the business is prohibited from retaliating against consumers for exercising CCPA rights? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_anti_ret"
                        options={["Yes", "No", "Not yet"]}
                        value={noticeHasAntiRetaliation}
                        onChange={setNoticeHasAntiRetaliation}
                        data-rail-key="notice_anti_retaliation" onFocus={() => focus("notice_anti_retaliation")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_how_admt_works" onFocus={() => focus("notice_how_admt_works")}>
                      Does your notice include additional information about how the ADMT works? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required content: categories of PI that affect the output; type of output; how output is used in the decision; alternative process if consumer opts out (§ 7220(c)(5)).
                    </p>
                    <div className="mt-2">
                      <Radio
                        name="notice_how_works"
                        options={[
                          "Yes — included inline in the notice",
                          "Yes — via hyperlink or layered notice",
                          "Partial — some elements missing",
                          "No",
                          "Not yet",
                        ]}
                        value={noticeHasHowItWorks}
                        onChange={setNoticeHasHowItWorks}
                        data-rail-key="notice_how_admt_works" onFocus={() => focus("notice_how_admt_works")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="notice_how_admt_works" onFocus={() => focus("notice_how_admt_works")}>
                      Does the notice describe what happens to consumers who opt out — the alternative decision-making process?
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_alt_process"
                        options={["Yes", "No", "Not applicable — we rely on an opt-out exception"]}
                        value={noticeHasAlternativeProcess}
                        onChange={setNoticeHasAlternativeProcess}
                        data-rail-key="notice_how_admt_works" onFocus={() => focus("notice_how_admt_works")}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                 <h2 className="font-serif text-xl">Step 3 · Can people say no?</h2>
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> consumers can opt out of ADMT for significant decisions unless a narrow exception applies — and if it applies, you must offer at least two ways to opt out.</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR § 7221</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the opt-out section of your report — whether your opt-out mechanism, or the exception you rely on instead, holds under § 7221.</p>

                  <RequiredLegend />

                  <div>
                    <Label data-rail-key="optout_exception_human_appeal" onFocus={() => focus("optout_exception_human_appeal")}>
                      Are you providing a full opt-out right, or relying on an exception? <DefPopover termKey="admt_opt_out" /> <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Why we ask:</span> the opt-out only has to be honored if no exception applies — this tells us which path (full opt-out vs. exception) the rest of this step follows.</p>
                    <div className="mt-2">
                      <ChoiceWithOther
                        options={OPT_OUT_EXCEPTIONS}
                        value={optOutException}
                        onChange={setOptOutException}
                        otherText={adv.opt_out_exception_other || ""}
                        onOtherText={(v) => setA("opt_out_exception_other", v)}
                        data-rail-key="optout_exception_human_appeal" onFocus={() => focus("optout_exception_human_appeal")}
                        placeholder="A short paragraph in your own words"
                      />
                    </div>
                  </div>

                  {optOutException.startsWith("Human appeal") && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30 dark:bg-amber-950/10 rounded-r">
                      <p className="text-[12px] font-semibold mb-2">Human appeal exception — documentation required</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        To qualify, the designated human reviewer must: know how to interpret the output; review it plus any information the consumer provides; and have the authority to change the decision (§ 7221(b)(1)(A)).
                      </p>
                      <Label className="text-[12px]">
                        Describe your human appeal process in detail <Req />
                      </Label>
                      <Textarea
                        className="mt-2"
                        rows={4}
                        value={optOutAppealProcess}
                        onChange={(e) => setOptOutAppealProcess(e.target.value)}
                        data-rail-key="optout_exception_human_appeal" onFocus={() => focus("optout_exception_human_appeal")}
                        placeholder="A short paragraph"
                      />
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <p className="text-[12px] font-semibold">Appeal mechanics (feeds the § 7221(b)(1) three-part test)</p>
                        <div>
                          <Label className="text-[12px]">Appeal reviewer role / title</Label>
                          <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.appeal_reviewer_role || ""} onChange={(e) => setA("appeal_reviewer_role", e.target.value)} placeholder="e.g. Adverse Action Review Officer" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[12px]">Trained to interpret output?</Label><div className="mt-1"><Radio name="ap_trained" options={["Yes", "No"]} value={adv.appeal_trained || ""} onChange={(v) => setA("appeal_trained", v)} /></div></div>
                          <div><Label className="text-[12px]">Authority to overturn?</Label><div className="mt-1"><Radio name="ap_auth" options={["Yes", "No"]} value={adv.appeal_authority_overturn || ""} onChange={(v) => setA("appeal_authority_overturn", v)} /></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[12px]" data-rail-key="appeal_step_count" onFocus={() => focus("appeal_step_count")}>Steps from decision to human reviewer</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.appeal_step_count || ""} onChange={(e) => setA("appeal_step_count", e.target.value)} data-rail-key="appeal_step_count" onFocus={() => focus("appeal_step_count")} placeholder="e.g. 2 (submit form → reviewer decides)" /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">What may the consumer submit on appeal? (select all)</Label>
                          <div className="mt-1"><Pills options={["Free-text statement", "Supporting documents", "Witness statements"]} value={adv.appeal_consumer_submit || []} onChange={(v) => setA("appeal_consumer_submit", v)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[12px]">Target response timeline</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.appeal_timeline || ""} onChange={(e) => setA("appeal_timeline", e.target.value)} placeholder="e.g. 10 business days" /></div>
                          <div><Label className="text-[12px]">Reversal rate, 12 mo (optional)</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.appeal_reversal_rate || ""} onChange={(e) => setA("appeal_reversal_rate", e.target.value)} placeholder="e.g. 12%" /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Appeal outcome categories (select all)</Label>
                          <div className="mt-1"><Pills options={["Uphold", "Reverse", "Modify", "Remand"]} value={adv.appeal_outcomes || []} onChange={(v) => setA("appeal_outcomes", v)} /></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(optOutException.startsWith("Hiring") || optOutException.startsWith("Work")) && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30 dark:bg-amber-950/10 rounded-r">
                      <p className="text-[12px] font-semibold mb-2">Non-discrimination documentation required</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        This exception only applies if the ADMT 'works for the business's purpose and does not unlawfully discriminate based upon protected characteristics' (§ 7221(b)(2)(B), (b)(3)(B)). You must have documented evidence.
                      </p>
                      <div className="mb-4 space-y-3">
                        <div>
                          <Label className="text-[12px]" data-rail-key="sole_use_attestation" onFocus={() => focus("sole_use_attestation")}>Is the ADMT used solely to assess the person's ability to perform at work or in an educational program?</Label>
                          <div className="mt-1"><Radio name="sole_use_attestation" options={SOLE_USE_ATTESTATION_OPTIONS} value={adv.sole_use_attestation || ""} onChange={(v) => setA("sole_use_attestation", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]" data-rail-key="nondiscrimination_testing" onFocus={() => focus("nondiscrimination_testing")}>Do you hold a non-discrimination testing record for this ADMT?</Label>
                          <div className="mt-1"><Radio name="nondiscrimination_testing" options={NONDISCRIM_TESTING_OPTIONS} value={adv.nondiscrimination_testing || ""} onChange={(v) => setA("nondiscrimination_testing", v)} /></div>
                        </div>
                      </div>
                      <Label className="text-[12px]">Describe your fairness and non-discrimination testing <Req /></Label>
                      <AssistedInput
                        className="mt-2"
                        rows={3}
                        value={optOutFairnessDoc}
                        onChange={setOptOutFairnessDoc}
                        pills={ASSISTED_INPUT_REGISTRY.opt_out_fairness_doc.pills}
                        placeholder="A few sentences"
                      />
                      <div className="mt-4 space-y-3 border-t pt-3">
                        <p className="text-[12px] font-semibold">Validity &amp; non-discrimination detail (§ 7221(b)(2)(B), (b)(3)(B))</p>
                        <p className="text-[12px] text-muted-foreground">This exception only holds if the ADMT works for its purpose AND does not unlawfully discriminate, with evidence.</p>
                        <div>
                          <Label className="text-[12px]">Protected characteristics tested (select all)</Label>
                          <div className="mt-1"><Pills options={["Race", "Sex / gender", "Age", "Disability", "National origin", "Religion", "Veteran status", "Pregnancy", "Genetic info"]} value={adv.bias_protected_chars || []} onChange={(v) => setA("bias_protected_chars", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Proxy variables identified &amp; how mitigated</Label>
                          <Textarea className="mt-1" rows={2} value={adv.bias_proxy_vars || ""} onChange={(e) => setA("bias_proxy_vars", e.target.value)} placeholder="One variable per line" />
                        </div>
                        <div>
                          <Label className="text-[12px]">Fairness-testing cadence</Label>
                          <div className="mt-1"><Radio name="bias_cadence" options={["Pre-deployment + ongoing monitoring", "Pre-deployment only", "Vendor-supplied only", "None"]} value={adv.bias_testing_cadence || ""} onChange={(v) => setA("bias_testing_cadence", v)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[12px]">Last test date</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.bias_last_test || ""} onChange={(e) => setA("bias_last_test", e.target.value)} placeholder="e.g. 03/2026" /></div>
                          <div><Label className="text-[12px]">Next test date</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.bias_next_test || ""} onChange={(e) => setA("bias_next_test", e.target.value)} placeholder="e.g. 03/2027" /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Adverse-impact analysis performed?</Label>
                          <div className="mt-1"><Radio name="bias_adverse" options={["Yes", "No", "Vendor-supplied"]} value={adv.bias_adverse_impact || ""} onChange={(v) => setA("bias_adverse_impact", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Outcome distribution / false-positive &amp; false-negative rates by group</Label>
                          <ExhibitTextarea className="mt-1" rows={2} value={adv.bias_outcome_summary || ""} onChange={(v) => setA("bias_outcome_summary", v)} placeholder="One line per group, or attach as an Exhibit" />
                        </div>
                      </div>
                    </div>
                  )}

                  {provideOptOut && (
                    <>
                      <div>
                        <Label data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}>
                          Opt-out submission methods provided <Req />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select all methods you provide. You must provide at least two. At least one must match how you primarily interact with consumers. Online businesses must provide an interactive online form.
                        </p>
                        <div className="mt-2">
                          <Pills
                            options={OPT_OUT_METHODS}
                            value={optOutMethods}
                            onChange={setOptOutMethods}
                            data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}
                          />
                        </div>
                        {optOutMethods.length > 0 && optOutMethods.length < 2 && (
                          <p className="text-xs text-destructive mt-2">
                            <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> § 7221(c) requires at least two designated methods. Please add another method.
                          </p>
                        )}
                      </div>

                      {optOutMethods.includes("Interactive online form linked from the Pre-use Notice") && (
                        <div>
                          <Label data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}>
                            Opt-out link title (as it appears in your Pre-use Notice) <Req />
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            § 7221(c)(1) requires the link title to state what the consumer is opting out of, e.g. "Opt-out of Automated Decisionmaking Technology." Generic labels like "Your Privacy Choices" are not sufficient.
                          </p>
                          <input
                            className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={optOutLinkTitle}
                            onChange={(e) => setOptOutLinkTitle(e.target.value)}
                            data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}
                            placeholder='e.g. "Opt-out of Automated Decisionmaking Technology"'
                          />
                        </div>
                      )}

                      <div>
                        <Label data-rail-key="optout_timing_response" onFocus={() => focus("optout_timing_response")}>
                          Opt-out confirmation mechanism <Req />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          § 7221(h) requires you to provide a means by which consumers can confirm their opt-out was processed.
                        </p>
                        <input
                          className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={optOutConfirmationMechanism}
                          onChange={(e) => setOptOutConfirmationMechanism(e.target.value)}
                          data-rail-key="optout_timing_response" onFocus={() => focus("optout_timing_response")}
                          placeholder="Channel, then timing"
                        />
                      </div>

                      {provideOptOut && (
                        <div>
                          <Label>
                            Operational opt-out process: how do you action an opt-out request within 15 business days?
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            § 7221(e)–(g) requires you to cease ADMT processing for that consumer within 15 business days of receiving an opt-out request, AND notify all service providers and contractors to do the same. Describe your process.
                          </p>
                          <Textarea
                            className="mt-2"
                            rows={3}
                            value={optOut15DayProcess}
                            onChange={(e) => setOptOut15DayProcess(e.target.value)}
                            data-rail-key="optout_15_day_process" onFocus={() => focus("optout_15_day_process")}
                            placeholder="A few sentences: who receives it, what they do, by when, and who else is told"
                          />

                        </div>
                      )}



                      <div className="rounded-md border p-4 space-y-3 bg-muted/20">
                        <p className="text-[12px] font-semibold">Confirm opt-out process compliance</p>
                        <div>
                          <Label className="text-[12px]">Confirm: cookie banners are NOT your sole opt-out method (§ 7221(c)(4))</Label>
                          <div className="mt-1">
                            <Radio
                              name="no_cookie"
                              options={["Confirmed — we provide at least one ADMT-specific opt-out method in addition", "Cookie banner is currently our only method (gap)"]}
                              value={optOutNoCookieBanner}
                              onChange={setOptOutNoCookieBanner}
                              data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Confirm: you do not require account creation to submit an opt-out (§ 7221(e))</Label>
                          <div className="mt-1">
                            <Radio
                              name="no_account"
                              options={["Confirmed — no account required", "Account is currently required (gap)"]}
                              value={optOutNoAccountRequired}
                              onChange={setOptOutNoAccountRequired}
                              data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                 <h2 className="font-serif text-xl">Step 4 · Can people see how it worked?</h2>
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> consumers can ask what the ADMT did and why — you must be able to explain the output, the logic, and any human reviewer's role.</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR § 7222</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the access-and-appeal section of your report — whether you can actually answer a consumer who asks what the ADMT did to them, and what you would withhold.</p>

                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    Consumers have the right to request information about your use of ADMT with respect to them (§ 7222). Unlike opt-out, access requests require identity verification. You must respond within 45 days.
                  </p>

                  {/* UPGRADE-3 ITEM 3 — § 7222(b) explanation readiness. */}
                  <div className="border-l-4 border-brand-teal/60 pl-4 py-2 rounded-r bg-muted/30">
                    <p className="text-[12px] font-semibold mb-1" data-rail-key="access_readiness" onFocus={() => focus("access_readiness")}>
                      Can you produce each required explanation on request?
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      § 7222(b) enumerates what the consumer is entitled to be told. For each element, say whether you can produce it today and by what process. Where you cannot, your report records the shortfall rather than assuming readiness.
                    </p>
                    <div className="space-y-4">
                      {[
                        ["b1_purpose", "The specific purpose you used the ADMT for, as to that consumer (§ 7222(b)(1))"],
                        ["b2_logic", "The logic of the ADMT, including its assumptions and limitations (§ 7222(b)(2))"],
                        ["b3_output_use", "The output produced, and how you used it in the decision (§ 7222(b)(3))"],
                        ["b3_outcome", "The outcome of the decisionmaking process for that consumer (§ 7222(b)(3))"],
                        ["b3_human_role", "The role any human played in the decisionmaking process (§ 7222(b)(3))"],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <Label className="text-[12px]" data-rail-key={`access_readiness_${k}`} onFocus={() => focus(`access_readiness_${k}`)}>{label}</Label>
                          <div className="mt-1">
                            <Radio
                              name={`ar_${k}`}
                              options={[
                                "Yes — we can produce this today",
                                "Partially — we can produce some of it",
                                "No — we cannot produce this today",
                                "Unsure",
                              ]}
                              value={accessReadiness[`${k}_ready`] || ""}
                              onChange={(v) => setAR(`${k}_ready`, v)}
                            />
                          </div>
                          <input
                            className="mt-2 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                            value={accessReadiness[`${k}_process`] || ""}
                            onChange={(e) => setAR(`${k}_process`, e.target.value)}
                            placeholder="One sentence"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}>
                      Submission methods for access requests <DefPopover termKey="admt_access_right" /> <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      You may use existing right-to-know methods (§ 7222(d)). Methods must be easy to use and must not use dark patterns.
                    </p>
                    <AssistedInput
                      className="mt-2"
                      rows={2}
                      value={accessSubmissionMethods}
                      onChange={setAccessSubmissionMethods}
                      pills={ASSISTED_INPUT_REGISTRY.access_submission_methods.pills}
                      placeholder="One method per line"
                    />
                  </div>

                  <div>
                    <Label data-rail-key="access_verification" onFocus={() => focus("access_verification")}>
                      Identity verification process for access requests <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Access requests require verification under Article 5. If you cannot verify identity, you must tell the consumer — you cannot silently deny.
                    </p>
                    <AssistedInput
                      className="mt-2"
                      rows={2}
                      value={accessVerificationProcess}
                      onChange={setAccessVerificationProcess}
                      pills={ASSISTED_INPUT_REGISTRY.access_verification_process.pills}
                      placeholder="A few sentences"
                    />
                  </div>

                  <div>
                    <Label data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}>
                      What ADMT logic information do you disclose in your access responses? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required: how the ADMT processed the consumer's PI to generate the output; parameters that generated the output; the specific output with respect to this consumer (§ 7222(b)(2)). Trade secrets may be withheld.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={3}
                      value={accessLogicDisclosure}
                      onChange={(e) => setAccessLogicDisclosure(e.target.value)}
                      data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}
                      placeholder="What you disclose, then what you withhold"
                    />
                  </div>

                  <div>
                    <Label data-rail-key="access_outcome_disclosure" onFocus={() => focus("access_outcome_disclosure")}>
                      What decision outcome information do you disclose in your access responses? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required: how the output was used in the significant decision; whether it was the sole factor; other factors; human's role if any; future use of the output if applicable (§ 7222(b)(3)).
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={3}
                      value={accessOutcomeDisclosure}
                      onChange={(e) => setAccessOutcomeDisclosure(e.target.value)}
                      data-rail-key="access_outcome_disclosure" onFocus={() => focus("access_outcome_disclosure")}
                      placeholder="What you disclose, then what you withhold"
                    />
                  </div>

                  <div>
                    <Label data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}>
                      Response timeline for access requests <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="access_timeline"
                        options={[
                          "Within 45 calendar days (standard)",
                          "Within 45 days with documented 45-day extension capability",
                          "Our process is not yet defined",
                        ]}
                        value={accessResponseTimeline}
                        onChange={setAccessResponseTimeline}
                        data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}
                      />
                    </div>
                  </div>

                  {/* prior_access_requests_12mo question removed (RC-P6): § 7222(j) threshold applies at framework level and is now framed as a monitoring threshold in the report, not conditioned on a per-consumer count. */}

                  <OptionalCluster
                    title="Withholding and denial policy"
                    valueLine="Left unanswered, the report records no advance policy on what you withhold or deny, and treats every § 7222(c) call as one you will make under time pressure."
                  >
                    <div>
                      <Label data-rail-key="access_trade_secret_policy" onFocus={() => focus("access_trade_secret_policy")}>
                        Trade secret and security information policy
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        § 7222(c) lets you withhold trade secrets (Civil Code § 3426.1(d)) and information whose release would compromise security. Name each category you would withhold and the ground for it.
                      </p>
                      <Textarea
                        className="mt-2"
                        rows={2}
                        value={accessTradeSecretPolicy}
                        onChange={(e) => setAccessTradeSecretPolicy(e.target.value)}
                        data-rail-key="access_trade_secret_policy" onFocus={() => focus("access_trade_secret_policy")}
                        placeholder="One category per line, each with its ground"
                      />
                    </div>

                    <div>
                      <Label data-rail-key="access_secure_transmission" onFocus={() => focus("access_secure_transmission")}>
                        How do you securely transmit the access response?
                      </Label>
                      <div className="mt-2">
                        <Radio name="access_secure_tx" options={["Encrypted self-service portal", "Encrypted email", "Postal mail", "Not yet defined"]} value={adv.access_secure_transmission || ""} onChange={(v) => setA("access_secure_transmission", v)} data-rail-key="access_secure_transmission" onFocus={() => focus("access_secure_transmission")} />
                      </div>
                    </div>

                    <div>
                      <Label data-rail-key="access_denial_basis" onFocus={() => focus("access_denial_basis")}>
                        If you would partially or fully deny an access request, on what basis?
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        § 7222 permits denial only on specific grounds — a conflict with federal or state law, an enumerated CCPA exception, trade secret (Civil Code § 3426.1(d)), or a substantial security risk.
                      </p>
                      <ExhibitTextarea className="mt-2" rows={2} value={adv.access_denial_basis || ""} onChange={(v) => setA("access_denial_basis", v)} placeholder="One ground per line" />
                    </div>
                  </OptionalCluster>

                </>
              )}

              {isReview && (
                <>
                  <h2 className="font-serif text-xl">Review your answers</h2>
                  <p className="text-sm text-muted-foreground">
                    Review before submitting. The checker will generate a gap analysis with specific remediation steps cited to the regulation.
                  </p>
                  <div className="rounded-lg border bg-card divide-y text-sm">
                    {(
                      [
                        ["System name", systemName],
                        ["System description", systemDescription],
                        ["Significant decision domains", decisionDomains.join("; ")],
                        ["Human review", humanReview],
                        ["Training data use", trainingDataUse],
                        ["Profiling use", profilingUse],
                        ["Notice delivery", noticeDelivery.join("; ")],
                        ["Notice — specific purpose", noticeHasSpecificPurpose],
                        ...(noticePurposeText ? [["Notice — purpose text", noticePurposeText]] : []),
                        ["Notice — opt-out description", noticeHasOptOutDesc],
                        ["Notice — access description", noticeHasAccessDesc],
                        ["Notice — anti-retaliation", noticeHasAntiRetaliation],
                        ["Notice — how ADMT works", noticeHasHowItWorks],
                        ["Notice — alternative process", noticeHasAlternativeProcess],
                        ["Opt-out approach", optOutException],
                        ...(provideOptOut
                          ? [
                              ["Opt-out methods", optOutMethods.join("; ")],
                              ...(optOutLinkTitle ? [["Opt-out link title", optOutLinkTitle]] : []),
                              ["Opt-out confirmation", optOutConfirmationMechanism],
                              ["No cookie-banner-only", optOutNoCookieBanner],
                              ["No account required", optOutNoAccountRequired],
                            ]
                          : []),
                        ...(optOutAppealProcess ? [["Appeal process", optOutAppealProcess]] : []),
                        ...(optOutFairnessDoc ? [["Fairness testing", optOutFairnessDoc]] : []),
                        ["Access submission methods", accessSubmissionMethods],
                        ["Access verification", accessVerificationProcess],
                        ["Access — logic disclosure", accessLogicDisclosure],
                        ["Access — outcome disclosure", accessOutcomeDisclosure],
                        ["Access response timeline", accessResponseTimeline],
                        ...(accessTradeSecretPolicy ? [["Trade secret policy", accessTradeSecretPolicy]] : []),
                        ...(caConsumerCount ? [["CA consumers (approx.)", caConsumerCount]] : []),
                        ...(thirdPartyAdmt ? [["Third-party ADMT tools", thirdPartyAdmt]] : []),
                        ...(optOut15DayProcess ? [["15-day opt-out process", optOut15DayProcess]] : []),
                        ...(admtSystemCount ? [["ADMT systems operated", admtSystemCount]] : []),
                        // Prior access requests (12 mo.) row removed (RC-P6).
                      ] as [string, string][]
                    )
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
                          <div className="text-muted-foreground text-[12px] sm:col-span-1">{label}</div>
                          <div className="sm:col-span-2 break-words text-[13px]">{value}</div>
                        </div>
                      ))}
                  </div>
                </>
              )}

              <ValidationErrorSummary message={validationError} className="mt-4" />
              <div className="flex justify-between pt-4 border-t flex-wrap gap-3 items-center">
                <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>

                <div className="flex items-center gap-3 ml-auto">
                  {user &&
                    (draftSaving ? (
                      <span className="text-[11px] text-muted-foreground">Saving…</span>
                    ) : lastSavedAt ? (
                      <span className="text-[11px] text-muted-foreground">
                        Draft saved {formatRelativeTime(lastSavedAt)}
                      </span>
                    ) : null)}
                  {!isReview ? (
                    <Button
                      onClick={next}
                      className="bg-teal-action hover:bg-[hsl(var(--teal-action-hover))] text-white"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePurchase}
                      disabled={!pricing.stripeConfigured}
                      className="bg-teal-action hover:bg-[hsl(var(--teal-action-hover))] text-white"
                    >
                      {!pricing.stripeConfigured
                        ? `Payments Coming Soon ($${pricing.price})`
                        : `Run ADMT Compliance Assessment ($${pricing.price})`}
                    </Button>
                  )}
                </div>
              </div>
          </div>
        </BenchLayout>
        </>)}

      </main>

      <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/cppa-admt-checker" />
      <ToolCheckoutModal
        open={checkoutOpen}
        toolType={"cppa_admt" as any}
        userId={user?.id}
        clientId={clientId}
        intakeData={intake}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (!id) return;
          void clearDraft();
          navigate(`/cppa-admt-checker/result/${id}?purchased=true`);
        }}
      />
    <Footer />
    </div>
  );
}
