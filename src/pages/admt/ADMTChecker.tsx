// src/pages/admt/ADMTChecker.tsx
// ADMT Compliance Assessment — Module 3
// Four-step intake: (1) ADMT Inventory, (2) Pre-Use Notice, (3) Opt-Out, (4) Access Rights
// Signature feature: StatuteRail — persistent right column showing verbatim
// regulation text, plain summary, and FSOR context for every field.

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { INCLUDED_GENERATIONS_HERO } from "@/config/pricing";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ProductHero } from "@/components/ProductHero";
import SuiteSelector from "@/components/product/SuiteSelector";
import HeroPriceCta from "@/components/product/HeroPriceCta";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import HowItWorksRow from "@/components/product/HowItWorksRow";
import SuiteCrossSellStrip from "@/components/product/SuiteCrossSellStrip";
import CompactDisclaimer from "@/components/product/CompactDisclaimer";
import { Button } from "@/components/ui/button";
import { Label as UILabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { useRunMeter } from "@/hooks/useRunMeter";
// DOC 158 (2026-09-03, ADMT model-vs-law build) — the three new option sets.
import { ADMT_HOUSING_DECISION_BASIS_OPTS, NOTICE_TIMING_OPTS, OPT_OUT_HANDLING_OPTS } from "./ADMTChecker.enums";
import { ExhibitTextarea, isExhibit } from "@/components/ExhibitTextarea";
import { AssistedInput } from "@/components/AssistedInput";
import { ASSISTED_INPUT_REGISTRY } from "@/config/assistedInput";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ActiveClientLabel from "@/components/ActiveClientLabel";
// S17 — the page shadows these with step-aware versions (see inside the component).
import { Req as RequiredStar, RequiredLegend as RequiredLegendMark } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import StatuteRail from "@/components/intake/StatuteRail";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { ChoiceRadio } from "@/components/intake/ChoiceRadio";
import { ChoiceWithOther } from "@/components/intake/ChoiceWithOther";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
// ADMT master review (2026-09-15) — one scope resolver
// mirrored from the engine (F01), the opt-out path classifier (F06), the
// honest population-band suggestion (F02), the fleet field-error contract
// (F14), the complete review model (F08) and the register's copy (S01–S18).
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { fail, type StepIssue } from "@/lib/intakeValidation";
import { resolveAdmtScope } from "@/lib/admtScopeMirror";
import { isEmploymentException, resolveAdmtOptOutPath, showsOptOutMechanics } from "@/lib/admtOptOutPath";
import { describeBandSuggestion, suggestPopulationBand } from "@/lib/admtPopulationBand";
import { buildAdmtReview, type ReviewRow } from "@/lib/admtReview";
import { ADMT_COPY } from "./admtCopy";
import { NOTICE_ELEMENT_RAIL, draftHasRecognisedAnswers, normaliseAdmtDraft } from "./admtDraft";
import { OTHER_OPTION as OPT_OUT_OTHER_OPTION } from "@/components/intake/ChoiceWithOther";
import type { RailEntry } from "@/components/intake/StatuteRail";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";

const SIGNIFICANT_DECISION_DOMAINS = [
  "Financial or lending services (credit decisions, loans, accounts)",
  "Housing (rental or purchase eligibility)",
  "Education enrollment or opportunities (admission, credentials, suspension)",
  "Hiring or admission decisions",
  "Work allocation, scheduling, or compensation",
  "Promotion, demotion, suspension, or termination",
  "Healthcare services (diagnosis, treatment, care eligibility)",
  // DOC 158 (2026-09-03) — the explicit negative (verbatim copy in
  // _shared/intake-contracts/cppa-admt.ts).
  "None of these categories — the decision is outside every § 7001(ddd) category",
];
const ADMT_NONE_DOMAIN = SIGNIFICANT_DECISION_DOMAINS[7];
const ADMT_HOUSING_DOMAIN = SIGNIFICANT_DECISION_DOMAINS[1];

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
  ADMT_SOLE_USE_ATTESTATION_WORK_OPTS,
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
  ADMT_SOLE_USE_ATTESTATION_WORK_OPTS,
  ADMT_NONDISCRIM_TESTING_OPTS,
} from "./ADMTChecker.enums";
const SOLE_USE_ATTESTATION_OPTIONS = ADMT_SOLE_USE_ATTESTATION_OPTS;
const SOLE_USE_ATTESTATION_WORK_OPTIONS = ADMT_SOLE_USE_ATTESTATION_WORK_OPTS;
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

// ADMT master review (2026-09-15, F01/F14) — the rail key and the field-error
// anchor the page passes are forwarded to the group (they were dropped).
const Pills = ({
  options, value, onChange, onFocus, ...rest
}: {
  options: string[]; value: string[]; onChange: (v: string[]) => void; onFocus?: () => void;
} & Omit<ComponentProps<"div">, "onChange" | "onFocus">) => (
  <div className="flex flex-wrap gap-2" onFocus={onFocus} {...rest}>
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
// ADMT master review (2026-09-15, S16) — Expand/Collapse with an answer
// count; collapsing hides the questions and keeps their answers; "optional"
// is optional for intake completion, not a statement about the legal duty.
function OptionalCluster({ title, valueLine, answered = 0, children }: { title: string; valueLine: string; answered?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t pt-6 mt-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-base font-semibold">{title} <span className="text-xs font-normal text-muted-foreground">(optional for completing the intake)</span></Label>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{valueLine}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{ADMT_COPY.optionalPanelHint}</p>
        </div>
        <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Collapse" : `Expand${answered > 0 ? ` (${answered} answered)` : ""}`}
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
  // F02 — the band is suggested, never written into the field unconfirmed.
  const [bandTouched, setBandTouched] = useState(false);
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
  // DOC 158 — § 7220(b)(2) timing and the § 7221(f)/(i)/(j)/(k)/(m) handling duties.
  const [noticeTiming, setNoticeTiming] = useState("");
  const [optOutHandling, setOptOutHandling] = useState<string[]>([]);
  const setA = (k: string, v: any) => setAdv((a) => ({ ...a, [k]: v }));

  // ── INTAKE-4c — PREFILL BLOCK ────────────────────────────────────────────
  // Every row below keeps its own key, its own options, and its own stored
  // value. Where an earlier answer supplies the same fact we seed the later
  // row once, while it is still untouched, and present it as a confirmation.
  // No row is merged into another, and a customer edit ends the prefill for
  // that row permanently.
  const [prefillTouched, setPrefillTouched] = useState<Record<string, boolean>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const markTouched = (k: string) => setPrefillTouched((p) => (p[k] ? p : { ...p, [k]: true }));
  const markPrefilled = (k: string) => setPrefilled((p) => (p[k] ? p : { ...p, [k]: true }));
  /** ADMT master review (2026-09-15, F02–F05) — a system-filled value the customer has not confirmed or edited. */
  const isProvisional = (k: string) => !!prefilled[k] && !prefillTouched[k];
  /** A provisional value is not the customer's answer: it travels blank. */
  const unlessProvisional = (k: string, v: string) => (isProvisional(k) ? "" : v);
  /** Keep: the customer adopts the suggested value as their own answer. */
  const confirmPrefill = (k: string) => markTouched(k);

  // ADMT master review (2026-09-15, F14) — the fleet field-error contract.
  const fieldErrors = useFieldErrors();
  const errAnchor = (k: string) => ({
    "data-field": k,
    "aria-invalid": fieldErrors.isInvalid(k) ? true : undefined,
    onClickCapture: () => fieldErrors.clear(k),
  });

  // ADMT master review (2026-09-15, F19) — the narrative behind an exhibit
  // choice is kept in the draft, not in a component ref, so a step change,
  // a collapsed panel or a reload while the exhibit is selected keeps it.
  const [exhibitStash, setExhibitStash] = useState<Record<string, string>>({});
  const stashFor = (k: string) => ({
    stash: exhibitStash[k] ?? "",
    onStash: (t: string) => setExhibitStash((s) => ({ ...s, [k]: t })),
  });

  // ADMT master review (2026-09-15, F17) — a resumed draft that restores no
  // recognised field says so instead of silently clearing the banner.
  const [restoreWarning, setRestoreWarning] = useState<string | null>(null);
  const [noticePreviewOpen, setNoticePreviewOpen] = useState(false);

  // ── ADMT master review (2026-09-15, F02–F05) — THE PROVISIONAL CONVENTION ─
  // Nothing derived from another answer is written into a field and treated
  // as the customer's assertion. A suggestion is shown as provisional, an
  // explicit action adopts it, editing or a Keep action confirms it, and an
  // unconfirmed suggestion travels blank (unlessProvisional, in the payload).
  //
  // F02 — the affected-population band is SUGGESTED from the count; the
  // parser keeps the estimate intact (no digit-joining, no sign or decimal
  // stripping) and suggests only when the whole estimate sits in one band.
  const bandSuggestion = useMemo(() => suggestPopulationBand(caConsumerCount), [caConsumerCount]);
  const confirmSuggestedBand = () => {
    if (bandSuggestion.kind !== "band") return;
    setBandTouched(true);
    setAffectedPopulationBand(bandSuggestion.band);
  };
  // F03 — the coverage question (hi_reviewer_present) is never seeded from
  // the authority answer (human_review): a reviewer may see every decision
  // without being able to change any of them. Both stay independent.
  // F05 — a readiness process sentence is not a consumer explanation; the
  // customer may start from it, provisionally, by an explicit action.
  const startDisclosureFromProcess = (field: "accessLogicDisclosure" | "accessOutcomeDisclosure") => {
    const seed = ((field === "accessLogicDisclosure" ? accessReadiness.b2_logic_process : accessReadiness.b3_outcome_process) || "").trim();
    if (!seed) return;
    if (field === "accessLogicDisclosure") setAccessLogicDisclosure(seed); else setAccessOutcomeDisclosure(seed);
    markPrefilled(field);
    setPrefillTouched((p) => ({ ...p, [field]: false }));
  };
  // F04 — assembled excerpts are previewed and adopted by an explicit action,
  // labelled as excerpts, provisional until confirmed as the complete notice.
  const noticeElementsJoined = useMemo(
    () => Object.values(noticeElementText).map((v) => (v || "").trim()).filter(Boolean).join("\n\n"),
    [noticeElementText],
  );
  const adoptAssembledNotice = () => {
    if (!noticeElementsJoined) return;
    setNoticeFullText(noticeElementsJoined);
    markPrefilled("noticeFullText");
    setPrefillTouched((p) => ({ ...p, noticeFullText: false }));
    setNoticePreviewOpen(false);
  };
  const noticeElementsNotInFullText = useMemo(() => {
    if (!noticeFullText.trim()) return [] as string[];
    return Object.entries(noticeElementText)
      .filter(([, v]) => (v || "").trim() && !noticeFullText.includes((v || "").trim()))
      .map(([k]) => k);
  }, [noticeFullText, noticeElementText]);
  // vendor_product — the named third-party system supplies a provisional
  // product name; an exhibit placeholder is never a product name.
  useEffect(() => {
    if (prefillTouched.vendor_product || adv.vendor_product || isExhibit(thirdPartyAdmt)) return;
    const first = thirdPartyAdmt.split("\n").map((s) => s.trim()).filter(Boolean)[0];
    if (!first) return;
    setA("vendor_product", first);
    markPrefilled("vendor_product");
  }, [thirdPartyAdmt, adv.vendor_product, prefillTouched.vendor_product]);
  // ─────────────────────────────────────────────────────────────────────────

  // ADMT master review (2026-09-15, F06) — the opt-out path mirrors the
  // engine's classifier: "Other" and unrecognised text are UNRESOLVED, never
  // the full opt-out path. The full-opt-out questions are shown for the full
  // path and, as optional facts, for an unresolved one.
  const optOutPath = resolveAdmtOptOutPath(optOutException);
  const provideOptOut = showsOptOutMechanics(optOutPath);
  const onEmploymentException = isEmploymentException(optOutPath);
  const onFullOptOut = optOutPath === "FULL_OPT_OUT";
  // CEO item 1 (2026-09-16) — the § 7221(b)(3)(A) branch asks its own
  // sole-use question with its own Yes string. A Yes given to the other
  // branch's question is not a Yes to this one, so it is cleared (No and
  // Unsure are shared and stay) when the exception selection changes.
  const onWorkException = optOutPath === "WORK_ALLOCATION_COMP_EXCEPTION";
  const soleUseOptions = onWorkException ? SOLE_USE_ATTESTATION_WORK_OPTIONS : SOLE_USE_ATTESTATION_OPTIONS;
  useEffect(() => {
    if (!onEmploymentException) return;
    const v = adv.sole_use_attestation;
    if (v && !soleUseOptions.includes(v)) setA("sole_use_attestation", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optOutPath]);

  // ADMT master review (2026-09-15, F01) — ONE scope resolver, mirrored from
  // the engine (tests/edge/run-admt-checker-v2/scope-mirror-parity.test.ts):
  // four states, facts named, nothing chosen silently.
  const scope = useMemo(() => resolveAdmtScope({ decisionDomains, humanReview, detail: adv }), [decisionDomains, humanReview, adv]);
  const dutiesOptional = scope.dutiesMayNotAttach;
  const admtScopeVerdict = useMemo(() => {
    const answeredAnything = decisionDomains.length > 0 || !!humanReview || !!adv.solely_advertising;
    if (!answeredAnything) return null;
    switch (scope.state) {
      case "INCONSISTENT_RECORD":
        return { level: "conflict", title: "Your Step 1 answers conflict — resolve them before the scope finding can be reached", body: scope.contradictions.join(" "), facts: scope.facts } as const;
      case "NOT_YET_ANSWERED":
        return { level: "incomplete", title: "Scope not yet determined", body: `${ADMT_COPY.scopeIncomplete} Still needed: ${scope.missing.join("; ")}.`, facts: scope.facts } as const;
      case "OUT_OF_SCOPE":
        return {
          level: "out",
          title: scope.categoricalNone || scope.clearAdvertisingExclusion || scope.housingExcluded ? ADMT_COPY.scopeNoSignificantDecisionTitle : ADMT_COPY.scopeQualifyingReviewerTitle,
          body: `${scope.categoricalNone || scope.clearAdvertisingExclusion || scope.housingExcluded
            ? "On your answers the decision is not a significant decision under § 7001(ddd), so the Article 11 notice, opt-out and access duties may not attach. Steps 2–4 are optional for this system; answer what you actually provide and keep this reasoning on file."
            : "On your answers a qualifying human reviewer is in the loop before the decision issues, so the system may not \u201csubstantially replace\u201d human decisionmaking under § 7001(e)(1). Steps 2–4 are optional for this system; answer what you actually provide and confirm the position with counsel."}${scope.conditions.length ? ` Condition: ${scope.conditions.join(" ")}` : ""}`,
          facts: scope.facts,
        } as const;
      default:
        return { level: "in", title: ADMT_COPY.scopeObligationsApplyTitle, body: "On your answers the system makes a significant decision without qualifying human involvement, so it substantially replaces human decisionmaking. The remaining steps check the Pre-use Notice, the opt-out and the access process; your report confirms the position.", facts: scope.facts } as const;
    }
  }, [scope, decisionDomains.length, humanReview, adv.solely_advertising]);

  // S11 — the self-test result has four states, never one blanket sentence.
  const selfTestState = useMemo((): "hidden" | "incomplete" | "contradiction" | "likely" | "unlikely" => {
    if (!adv.hi_reviewer_present || String(adv.hi_reviewer_present).startsWith("No")) return "hidden";
    if (scope.contradictions.some((c) => c.includes("self-test"))) return "contradiction";
    if (!adv.hi_trained || !adv.hi_reviews_other_info || !adv.hi_authority_override || !adv.hi_stage) return "incomplete";
    const qualifies = adv.hi_trained === "Yes" && adv.hi_reviews_other_info === "Yes" && adv.hi_authority_override === "Yes" && String(adv.hi_stage).startsWith("Before");
    return qualifies ? "likely" : "unlikely";
  }, [adv, scope.contradictions]);

  // S17 — required stars are removed where validation is intentionally
  // bypassed (Steps 2–4 when the duties may not attach); Step 1 keeps them.
  const starsSuspended = dutiesOptional && step >= 2 && step <= 4;
  const Req = () => (starsSuspended ? null : <RequiredStar />);
  const RequiredLegend = () => (starsSuspended ? null : <RequiredLegendMark />);

  // Step 5 — "Edit" returns to the question and outlines it.
  const jumpTo = (targetStep: number, key: string) => {
    setStep(targetStep);
    setValidationError(null);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape : (s: string) => s.replace(/["\\]/g, "\\$&");
        const el = document.querySelector<HTMLElement>(`[data-field="${esc(key)}"]`) ?? document.querySelector<HTMLElement>(`[data-rail-key="${esc(key)}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el?.querySelector<HTMLElement>("input, textarea, button, [tabindex]") ?? el)?.focus?.({ preventScroll: true });
      });
    });
  };

  // ADMT master review (2026-09-15, F06/F14) — every check names its field
  // (the summary outlines, scrolls to and focuses it); meaningful-content
  // checks trim; and a truthful gap never blocks: zero or one opt-out method
  // is recorded and the report states the § 7221(c) shortfall (the engine
  // already does), instead of the form demanding an invented method.
  const stepValid = (): StepIssue | null => {
    if (step === 1) {
      if (!organizationName.trim()) return fail("organization_name", "Name the organization running this assessment.");
      if (!systemName.trim()) return fail("system_name", "Name the ADMT system.");
      if (systemDescription.trim().length < 30)
        return fail("system_description", "Describe what the system does — at least 30 characters of description.");
      if (!decisionDomains.length)
        return fail("decision_domains", "Select the decision domains this system affects — \"None of these categories\" is a complete answer.");
      // DOC 158 — the explicit negative cannot be combined; Housing carries the
      // § 7001(ddd)(2) follow-up.
      if (decisionDomains.includes(ADMT_NONE_DOMAIN) && decisionDomains.length > 1)
        return fail("decision_domains", "\"None of these categories\" cannot be combined with a decision domain — select the domain(s) or the negative, not both.");
      if (decisionDomains.includes(ADMT_HOUSING_DOMAIN) && !adv.housing_decision_basis)
        return fail("admt_detail.housing_decision_basis", "Answer whether the housing decision is based solely on availability, vacancy, or receipt of payment (§ 7001(ddd)(2)).");
      if (!humanReview) return fail("human_review", "Describe the human review applied to this system's outputs.");
      // F01 — a contradictory record is asked to resolve itself, never resolved silently.
      if (scope.state === "INCONSISTENT_RECORD") {
        const first = scope.contradictions[0] ?? "Your Step 1 answers conflict; resolve them before continuing.";
        const key = first.includes("advertising") ? "admt_detail.solely_advertising" : first.includes("self-test") ? "admt_detail.hi_reviewer_present" : "decision_domains";
        return fail(key, first);
      }
    }
    // F01 — Steps 2–4 test the Article 11 duties. Where the unified scope
    // result determines that those duties do not attach (the categorical
    // negative, the housing exclusion, solely advertising, or qualifying
    // human review), the steps become optional: nothing is invented to
    // satisfy a validator; whatever IS answered still flows to the engine.
    if (dutiesOptional && step >= 2 && step <= 4) return null;
    if (step === 2) {
      if (!noticeDelivery.length) return fail("notice_delivery", "Select how the Pre-use Notice reaches consumers — \"We have not yet provided a Pre-use Notice\" is a complete answer.");
      // DOC 158 — § 7220(b)(2) timing, whenever a notice is provided.
      if (!noticeDelivery.includes("We have not yet provided a Pre-use Notice") && !noticeTiming)
        return fail("notice_timing", "Say when the Pre-use Notice is presented relative to collection and the first ADMT processing (§ 7220(b)(2)).");
      if (!noticeHasSpecificPurpose) return fail("notice_has_specific_purpose", "Answer whether the notice states a specific purpose.");
      if (noticeHasSpecificPurpose === "Yes" && !noticePurposeText.trim())
        return fail("notice_purpose_text", "Provide the specific purpose statement as published.");
      if (!noticeHasOptOutDesc) return fail("notice_has_opt_out_desc", "Answer whether the notice describes the opt-out right.");
      if (!noticeHasAccessDesc) return fail("notice_has_access_desc", "Answer whether the notice describes the access right.");
      if (!noticeHasAntiRetaliation)
        return fail("notice_has_anti_retaliation", "Answer whether the notice includes the anti-retaliation statement.");
      if (!noticeHasHowItWorks) return fail("notice_has_how_it_works", "Answer whether the notice explains how the ADMT works.");
    }
    if (step === 3) {
      if (!optOutException)
        return fail("opt_out_exception", "Select either an opt-out right or the exception relied on — \"Other\" is a complete answer when your situation differs.");
      if (optOutPath === "OTHER_UNRESOLVED" && optOutException === OPT_OUT_OTHER_OPTION && !(adv.opt_out_exception_other || "").trim())
        return fail("opt_out_exception", "Describe your situation in the box below the options — the report records it as unresolved rather than as an opt-out or an exception.");
      if (
        onFullOptOut &&
        optOutMethods.includes("Interactive online form linked from the Pre-use Notice") &&
        !optOutLinkTitle.trim()
      )
        return fail("opt_out_link_title", "Give the title of the opt-out link as it appears in your Pre-use Notice — the report tests the actual title (§ 7221(c)(1)).");
      if (onFullOptOut && !optOutConfirmationMechanism.trim())
        return fail("opt_out_confirmation_mechanism", "Describe how a consumer confirms an opt-out was processed — \"Not yet defined\" is a complete answer (§ 7221(h)).");
      // DOC 158 — the handling duties checklist on the full opt-out path.
      if (onFullOptOut && !optOutHandling.length)
        return fail("opt_out_handling_confirmations", "Select the opt-out handling duties you can confirm — \"None of the above can be confirmed\" is a complete answer.");
      if (optOutPath === "HUMAN_APPEAL_EXCEPTION" && !optOutAppealProcess.trim())
        return fail("opt_out_appeal_process", "Describe the human appeal process (§ 7221(b)(1)).");
      if (onEmploymentException && !optOutFairnessDoc.trim())
        return fail("opt_out_fairness_doc", "Describe the non-discrimination testing you actually hold — \"Not currently documented\" is a complete answer (§ 7221(b)(2)–(3)).");
    }
    if (step === 4) {
      if (!accessSubmissionMethods.trim()) return fail("access_submission_methods", "Describe how consumers submit access requests — \"Not yet defined\" is a complete answer.");
      if (!accessVerificationProcess.trim())
        return fail("access_verification_process", "Describe the identity verification applied to access requests — \"Not currently defined\" is a complete answer.");
      // F05 — a workflow sentence carried over from the readiness answers is
      // not a consumer explanation until the customer confirms or edits it.
      if (!unlessProvisional("accessLogicDisclosure", accessLogicDisclosure).trim())
        return fail("access_logic_disclosure", isProvisional("accessLogicDisclosure") ? "Keep or edit the suggested text before continuing — a copied process sentence is not the consumer explanation until you keep it." : "Describe the logic information disclosed in access responses — say what is missing if you cannot produce it.");
      if (!unlessProvisional("accessOutcomeDisclosure", accessOutcomeDisclosure).trim())
        return fail("access_outcome_disclosure", isProvisional("accessOutcomeDisclosure") ? "Keep or edit the suggested text before continuing — a copied process sentence is not the consumer explanation until you keep it." : "Describe the outcome information disclosed in access responses — say what is missing if you cannot produce it.");
      if (!accessResponseTimeline) return fail("access_response_timeline", "Select the response timeline — \"Our process is not yet defined\" is a complete answer.");
    }
    return null;
  };

  const next = () => {
    const issue = stepValid();
    if (issue) {
      setValidationError(issue.message);
      fieldErrors.show(issue.fields, issue.message);
      return;
    }
    // Mid-intake account gate: stop anonymous visitors one step before review.
    if (!user && step + 1 === totalSteps - 1) { setAuthGateOpen(true); return; }
    setValidationError(null);
    fieldErrors.clearAll();
    setStep((s) => s + 1);
  };
  const back = () => { setValidationError(null); fieldErrors.clearAll(); setStep((s) => Math.max(1, s - 1)); };


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
      // F04 — assembled excerpts adopted but not yet confirmed are not the published notice.
      notice_full_text: unlessProvisional("noticeFullText", noticeFullText),
      notice_has_opt_out_desc: noticeHasOptOutDesc,
      notice_has_access_desc: noticeHasAccessDesc,
      notice_has_anti_retaliation: noticeHasAntiRetaliation,
      notice_has_how_it_works: noticeHasHowItWorks,
      notice_has_alternative_process: noticeHasAlternativeProcess,
      // DOC 158 — § 7220(b)(2) timing.
      notice_timing: noticeTiming,
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
      // F05 — a workflow sentence started from the readiness answers is not the explanation until kept.
      access_logic_disclosure: unlessProvisional("accessLogicDisclosure", accessLogicDisclosure),
      access_outcome_disclosure: unlessProvisional("accessOutcomeDisclosure", accessOutcomeDisclosure),
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
      // DOC 158 — § 7221(f)/(i)/(j)/(k)/(m) handling duties.
      opt_out_handling_confirmations: optOutHandling,
      // A carried-over product name is a suggestion until confirmed.
      admt_detail: isProvisional("vendor_product") ? { ...adv, vendor_product: "" } : adv,
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
      noticeTiming, optOutHandling, prefilled, prefillTouched,
    ],
  );

  // F08 — the review flags provisional values and answers on branches the
  // current path no longer selects (retained, never dropped).
  const provisionalReviewKeys = useMemo(() => {
    const s = new Set<string>();
    if (isProvisional("noticeFullText")) s.add("notice_full_text");
    if (isProvisional("accessLogicDisclosure")) s.add("access_logic_disclosure");
    if (isProvisional("accessOutcomeDisclosure")) s.add("access_outcome_disclosure");
    if (isProvisional("vendor_product")) s.add("admt_detail.vendor_product");
    return s;
  }, [prefilled, prefillTouched]);
  const inactiveReviewKeys = useMemo(() => {
    const s = new Set<string>();
    if (optOutPath !== "HUMAN_APPEAL_EXCEPTION") { s.add("opt_out_appeal_process"); for (const k of ["appeal_reviewer_role", "appeal_trained", "appeal_authority_overturn", "appeal_step_count", "appeal_consumer_submit", "appeal_timeline", "appeal_reversal_rate", "appeal_outcomes"]) s.add(`admt_detail.${k}`); }
    if (!onEmploymentException) { s.add("opt_out_fairness_doc"); for (const k of ["sole_use_attestation", "nondiscrimination_testing", "bias_protected_chars", "bias_proxy_vars", "bias_testing_cadence", "bias_last_test", "bias_next_test", "bias_adverse_impact", "bias_outcome_summary"]) s.add(`admt_detail.${k}`); }
    if (!provideOptOut) for (const k of ["opt_out_methods", "opt_out_link_title", "opt_out_confirmation_mechanism", "opt_out_15_day_process", "opt_out_handling_confirmations", "opt_out_no_cookie_banner", "opt_out_no_account_required"]) s.add(k);
    if (!decisionDomains.includes(ADMT_HOUSING_DOMAIN)) s.add("admt_detail.housing_decision_basis");
    if (noticeDelivery.includes("We have not yet provided a Pre-use Notice")) s.add("notice_timing");
    return s;
  }, [optOutPath, onEmploymentException, provideOptOut, decisionDomains, noticeDelivery]);
  const reviewSections = useMemo(() => buildAdmtReview(intake, { inactiveKeys: inactiveReviewKeys, provisionalKeys: provisionalReviewKeys }), [intake, inactiveReviewKeys, provisionalReviewKeys]);
  const unansweredReviewRows = useMemo(() => reviewSections.flatMap((sec) => sec.rows.filter((r) => r.state === "unanswered" && !inactiveReviewKeys.has(r.key)).map((r) => ({ ...r, step: sec.step }))), [reviewSections, inactiveReviewKeys]);
  const exhibitReviewRows = useMemo(() => reviewSections.flatMap((sec) => sec.rows.filter((r) => r.state === "exhibit")), [reviewSections]);

  // F19 — the exhibit narratives travel with the draft (never with the payload).
  const draftData = useMemo(() => ({ ...intake, exhibit_stash: exhibitStash }), [intake, exhibitStash]);
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
  // QA batch 2026-09-05 (AD 03) — `touched` compared a hand-listed object
  // (which included noticeElementText) against INITIAL_DRAFT (which did not),
  // so it was ALWAYS true: the blank first render autosaved over the server
  // draft, the Resume banner never showed and ?resume=1 never fired. The
  // baseline is now the first render of the same draftData the hook saves;
  // INITIAL_DRAFT stays as documentation of the empty shape only.
  void INITIAL_DRAFT;
  const initialDraftJsonRef = useRef<string | null>(null);
  if (initialDraftJsonRef.current === null) initialDraftJsonRef.current = JSON.stringify(draftData);
  const touched = JSON.stringify(draftData) !== initialDraftJsonRef.current;

  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage,
    saving: draftSaving, lastSavedAt, clearDraft, dismissDraft,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "cppa_admt",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: step,
    enabled: !!user && touched,
  });

  // F17 — drafts saved before 2026-09-05 (AD 03) used camelCase state names
  // (organizationName, systemName, …) rather than the payload's snake_case
  // keys. Resuming one restored nothing and dismissed the banner — the
  // "visible Step 1 blank" observation. Legacy keys are mapped, and a draft
  // that yields no recognised field is reported, not discarded.
  const applyRestore = () => {
    const raw = restoreData as Record<string, any> | null;
    if (!raw) return;
    const d = normaliseAdmtDraft(raw) as Record<string, any>;
    if (!draftHasRecognisedAnswers(d)) {
      setRestoreWarning("This saved draft contains no answers this form recognises, so nothing was restored. The draft has been kept unchanged; if you expected answers here, do not discard it — contact support and mention the saved-draft date shown above.");
      return;
    }
    setRestoreWarning(null);
    // INTAKE-4c — a restored draft carries the customer's own answers on every
    // prefill row, so the prefill must never overwrite them.
    setBandTouched(true);
    setPrefillTouched({
      hi_reviewer_present: true,
      vendor_product: true,
      accessLogicDisclosure: true,
      accessOutcomeDisclosure: true,
      noticeFullText: true,
    });
    if (d.exhibit_stash && typeof d.exhibit_stash === "object") setExhibitStash(d.exhibit_stash as Record<string, string>);
    if (typeof d.organization_name === "string") setOrganizationName(d.organization_name);
    if (typeof d.system_name === "string") setSystemName(d.system_name);
    if (typeof d.system_type === "string") setSystemType(d.system_type);
    if (typeof d.system_description === "string") setSystemDescription(d.system_description);
    if (Array.isArray(d.decision_domains)) setDecisionDomains(d.decision_domains);
    if (typeof d.human_review === "string") setHumanReview(d.human_review);
    if (typeof d.training_data_use === "string") setTrainingDataUse(d.training_data_use);
    if (typeof d.profiling_use === "string") setProfilingUse(d.profiling_use);
    if (Array.isArray(d.notice_delivery)) setNoticeDelivery(d.notice_delivery);
    if (typeof d.notice_timing === "string") setNoticeTiming(d.notice_timing);
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
    if (Array.isArray(d.opt_out_handling_confirmations)) setOptOutHandling(d.opt_out_handling_confirmations.filter((x: unknown) => typeof x === "string"));
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
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

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

  // DOC 259A §5 — "We have not yet provided a Pre-use Notice" is a
  // categorical negative: it can never be true alongside an actual delivery
  // channel. Pills passes the full next-selection array with the click
  // already applied, so compare against the prior value to tell which
  // direction changed and enforce the exclusivity both ways.
  const handleNoticeDeliveryChange = (next: string[]) => {
    const NOT_YET = "We have not yet provided a Pre-use Notice";
    const hadNotYet = noticeDelivery.includes(NOT_YET);
    const hasNotYet = next.includes(NOT_YET);
    if (hasNotYet && !hadNotYet) {
      // Just selected the negative — it replaces every other selection.
      setNoticeDelivery([NOT_YET]);
      return;
    }
    if (hasNotYet && hadNotYet && next.length > 1) {
      // Selected a real delivery channel while the negative was active —
      // the real channel wins; drop the negative.
      setNoticeDelivery(next.filter((v) => v !== NOT_YET));
      return;
    }
    setNoticeDelivery(next);
  };

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

      {/* PRE-INTAKE REDESIGN (2026-08-26): suite selector → name-led hero with
          the standardized price/CTA block → sales-proof card band (deadline in
          the applicability card; provenance card now on ADMT too) → compact
          how-it-works row → shared suite cross-sell (replaces the ADMT-only
          box) → compressed disclaimer. Intake guidance moves to the first
          intake step; the client selector moves into the workspace masthead. */}
      <SuiteSelector active="m3" />
      <ProductHero
        geography="us"
        eyebrowLabel="CPPA AUDIT READINESS · MODULE 3"
        title="ADMT Compliance Assessment"
        valueProposition={INCLUDED_GENERATIONS_HERO}
        citationLine="11 CCR §§ 7200–7222 · Pre-use notice · Opt-out · Access rights"
        showIntakeCta={false}
      >
        <HeroPriceCta
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber && pricing.price === pricing.subscriberPrice}
          primaryLabel="Start ADMT Assessment"
          toolSlug="cppa_admt"
          sampleSlug="cppa_admt"
        />
      </ProductHero>

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Does the ADMT rule apply to you?",
            tone: "amber",
            body: ADMT_COPY.applicabilityCard,
          },
          {
            title: "What you receive",
            body: "A rule-cited gap report covering pre-use notice, opt-out, and access rights, with specific remediation steps for each identified deficit.",
          },
          {
            title: "Scope is tested first",
            body: (
              <>
                <p>Every finding is gated on whether the technology makes a "significant decision" under the regulations; ordinary advertising or personalization is not treated as a significant decision.</p>
                <p className="mt-2">Then: pre-use notice · opt-out · access rights.</p>
              </>
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
          "Scope is determined first — every finding is gated on the \"significant decision\" test.",
          "Tests pre-use notice, opt-out, and access rights against 11 CCR §§ 7200–7222.",
          "Each identified deficit gets a specific remediation step, cited to the rule.",
        ]}
      />

      <SuiteCrossSellStrip className="mt-4" note="ADMT remains standalone." />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompactDisclaimer
          className="mb-4"
          line="Compliance gap analysis only — not legal advice or a regulatory submission."
          addition="This tool produces a compliance gap analysis for your ADMT systems under 11 CCR Article 11 (§§ 7200–7222). It is an analytical aid, not legal advice. Review all output with qualified California privacy counsel before relying on it for regulatory submissions." />

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
        {restoreWarning && (
          <div role="alert" data-testid="admt-restore-warning" className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-r text-sm text-amber-900 dark:text-amber-200 mb-4">
            {restoreWarning}
          </div>
        )}

        <IntakeMasthead
          kicker="CPPA ADMT · 11 CCR Article 11 (§§ 7200–7222)"
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
          preRunHint={REVISIONS_ENABLED ? "Assessment subject locks after the first generation; other answers remain editable across included generations." : undefined}
          clientSlot={<ActiveClientLabel variant="masthead" />}
        />

        <IntakeGuidance className="mt-3">Describe each ADMT system separately — what it decides, the data it uses, and the human-review step. Separate systems produce clearer, more actionable findings.</IntakeGuidance>

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
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> {ADMT_COPY.step1Intro}</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR §§ 7001(e), 7001(ddd), 7200(a)</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the applicability determination at the front of your report — the finding that decides whether every obligation in §§ 7220–7222 reaches this system at all.</p>

                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">{ADMT_COPY.oneSystemInstruction}</p>

                  <details className="rounded-md border bg-muted/20 p-4">
                    <summary className="cursor-pointer text-sm font-medium select-none">See a fictional example (a loan-approval engine) <span className="ml-2 inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground align-middle">{ADMT_COPY.workedExampleLabel} — not a template</span></summary>
                    <div className="mt-3 space-y-2 text-[13px] text-muted-foreground leading-relaxed">
                      <p><span className="font-medium text-foreground">Organization:</span> Acme Lending, Inc.</p>
                      <p><span className="font-medium text-foreground">System:</span> "ScoreEngine v3.2" — a gradient-boosted model that scores consumer loan applications 0–100 from credit history, income, and debt-to-income ratio.</p>
                      <p><span className="font-medium text-foreground">Significant decision:</span> financial / lending services — the score gates loan approval or denial.</p>
                      <p><span className="font-medium text-foreground">Human review:</span> applications scoring under 40 are auto-declined with no one able to override before the decision issues — so there is no meaningful human involvement, and the ADMT rules apply.</p>
                      <p className="italic">{ADMT_COPY.workedExampleClosing}</p>
                    </div>
                  </details>

                  <div data-rail-key="organization_name" onFocus={() => focus("organization_name")} {...errAnchor("organization_name")}>
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

                  <div {...errAnchor("system_name")}>
                    <Label data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}>
                      System name <Req />
                    </Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      data-rail-key="scope_does_business_use_admt" onFocus={() => focus("scope_does_business_use_admt")}
                      placeholder="e.g. Loan Approval Engine"
                    />
                  </div>

                  <div data-rail-key="system_type" onFocus={() => focus("system_type")}>
                    <Label>System type (optional)</Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={systemType}
                      onChange={(e) => setSystemType(e.target.value)}
                      placeholder="e.g. ML classifier"
                    />
                  </div>

                  <div {...errAnchor("system_description")}>
                    <Label data-rail-key="system_decision_detail" onFocus={() => focus("system_decision_detail")}>
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
                      data-rail-key="system_decision_detail" onFocus={() => focus("system_decision_detail")}
                      placeholder="Two or three sentences"
                    />
                  </div>

                  <div data-rail-key="third_party_admt" onFocus={() => focus("third_party_admt")}>
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
                      {...stashFor("third_party_admt")}
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
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Does your contract with this vendor require each of these?</Label>
                        <p className="text-[11px] text-muted-foreground">Answer for what the signed contract says, not for what the vendor does in practice. Each "No" is reported as a contractual term you would have to negotiate before you could rely on the vendor for that obligation.</p>
                        <div className="mt-1 space-y-1">
                          {[["v_audit", "Rights to audit and monitor the vendor"], ["v_assist", "Help answering consumer access requests"], ["v_optout", "Passing opt-outs on to anyone downstream"], ["v_appeal", "Support for appeals and human review"], ["v_incident", "Telling you about incidents"]].map(([k, label]) => (
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
                        <Label className="text-[12px]" data-rail-key="vendor_documentation" onFocus={() => focus("vendor_documentation")}>Can the vendor use your data to train or improve its models, and who else touches the data?</Label>
                        <p className="text-[11px] text-muted-foreground">Give the training rights first, then name the sub-processors. Why we ask: training rights and an unnamed sub-processor chain both widen the disclosure your notice has to make, and the report cannot describe either from the contract you have not quoted.</p>
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
                    answered={[caConsumerCount, admtSystemCount, affectedPopulationBand].filter((v) => v.trim()).length + (roleRoster.length ? 1 : 0)}
                    title="Scale and internal ownership"
                    valueLine="Left closed, the report sizes your exposure as unstated and names no internal owner for this system; nothing is inferred on your behalf."
                  >
                    <div data-rail-key="ca_consumer_count" onFocus={() => focus("ca_consumer_count")}>
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
                      {bandSuggestion.kind !== "none" && (
                        <p className="text-[11px] text-muted-foreground mt-1" data-testid="admt-band-suggestion" data-kind={bandSuggestion.kind}>
                          {describeBandSuggestion(bandSuggestion)}
                          {bandSuggestion.kind === "band" && affectedPopulationBand !== bandSuggestion.band && (
                            <> <button type="button" className="underline" onClick={confirmSuggestedBand}>Use this band</button></>
                          )}
                        </p>
                      )}
                    </div>

                    <div data-rail-key="admt_system_count" onFocus={() => focus("admt_system_count")}>
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

                    {/* F02 — its own question with its own key and options; the
                        consumer-count answer above only SUGGESTS a band, and the
                        suggestion enters this field only by the customer's action. */}
                    <div data-rail-key="affected_population_band" onFocus={() => focus("affected_population_band")}>
                      <Label data-rail-key="affected_population_band" onFocus={() => focus("affected_population_band")}>How many Californians does this system reach? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7152(a)(3)(D))</span></Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pick the band the report should use when it describes how many Californians this system reaches.
                        {bandSuggestion.kind === "band" && !affectedPopulationBand ? ` Your estimate above sits in the "${bandSuggestion.band}" band; select it or another.` : bandSuggestion.kind === "cross-band" ? " Your estimate above spans more than one band, so no band is suggested; select the one the report should use." : ""}
                        {" "}Why we ask: § 7152(a)(3)(D) asks the assessment to state the number of consumers whose information is processed, and the report uses this band wherever it describes reach.
                      </p>
                      <div className="mt-2">
                        <Pills
                          options={ADMT_AFFECTED_POPULATION_BAND_OPTS}
                          value={affectedPopulationBand ? [affectedPopulationBand] : []}
                          onChange={(vals) => { setBandTouched(true); setAffectedPopulationBand(vals[vals.length - 1] || ""); }}
                        />
                      </div>
                    </div>

                    <div data-rail-key="role_roster" onFocus={() => focus("role_roster")}>
                      <Label data-rail-key="role_roster" onFocus={() => focus("role_roster")}>Which internal roles already have defined responsibilities for this system? <span className="text-xs text-muted-foreground font-mono">(11 CCR § 7157(c))</span></Label>
                      <p className="text-xs text-muted-foreground mt-1">Select only the roles that hold a responsibility today, not the ones you plan to assign. Why we ask: § 7157(c) expects named internal ownership, and a role you have not selected is reported as unassigned rather than assumed.</p>
                      <div className="mt-2">
                        <Pills
                          options={ADMT_ROLE_ROSTER_OPTS}
                          value={roleRoster}
                          onChange={setRoleRoster}
                        />
                      </div>
                    </div>
                  </OptionalCluster>








                  <div {...errAnchor("decision_domains")}>
                    <Label data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}>
                      What significant decision(s) does this system make? <DefPopover termKey="significant_decision" /> <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all that apply. If the decision is outside every category, select "None of these categories" — that is a complete answer. <span className="font-medium text-foreground">Why we ask:</span> § 7200(a) applies the ADMT rules to a business that uses ADMT to make a significant decision, a defined term (§ 7001(ddd)); advertising to a consumer is expressly excluded (§ 7001(ddd)(6)), and a housing decision based solely on availability, vacancy, or receipt of payment is not a significant decision (§ 7001(ddd)(2)).</p>
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
                      placeholder="Optional — describe the decision in one sentence, or leave blank if the categories above capture it"
                    />
                  </div>

                  {/* DOC 158 — § 7001(ddd)(2) housing exclusion, asked only when Housing is selected. */}
                  {decisionDomains.includes(ADMT_HOUSING_DOMAIN) && (
                    <div data-rail-key="housing_decision_basis" onFocus={() => focus("housing_decision_basis")} {...errAnchor("admt_detail.housing_decision_basis")}>
                      <Label className="text-[12px]">Is the housing decision based solely on the availability or vacancy of the housing, or on the successful receipt of payment for it? <Req /> <span className="text-[11px] text-muted-foreground font-mono">(§ 7001(ddd)(2))</span></Label>
                      <p className="text-[11px] text-muted-foreground">Under § 7001(ddd)(2), "the use of ADMT that provides or denies housing to a consumer based solely on the availability or vacancy of the housing or the successful receipt of payment for housing from the consumer is not making a significant decision."</p>
                      <div className="mt-1"><Radio name="housing_basis" options={[...ADMT_HOUSING_DECISION_BASIS_OPTS]} value={adv.housing_decision_basis || ""} onChange={(v) => setA("housing_decision_basis", v)} /></div>
                    </div>
                  )}
                  <div className="rounded-md border bg-muted/20 p-4 space-y-3" data-rail-key="scope_significant_decision_domain" onFocus={() => focus("scope_significant_decision_domain")}>
                    <p className="text-[12px] font-semibold">System &amp; decision detail (optional)</p>
                    <p className="text-[12px] text-muted-foreground">Helps an auditor identify the exact system and decision under review, and shapes the access-response analysis.</p>
                    <div>
                      <Label className="text-[12px]">Vendor / product name &amp; version</Label>
                      {prefilled.vendor_product && !prefillTouched.vendor_product && (
                        <p className="text-[11px] text-muted-foreground" data-testid="admt-vendor-provisional">Suggested from the third-party system you named — not yet part of your answers. Edit it, or <button type="button" className="underline" onClick={() => confirmPrefill("vendor_product")}>keep it as the product name</button>.</p>
                      )}
                      <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.vendor_product || ""} onChange={(e) => { markTouched("vendor_product"); setA("vendor_product", e.target.value); }} placeholder="Product name and version" />
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
                      <Label className="text-[12px]">Will this output be used to make later significant decisions?</Label>
                      <p className="text-[11px] text-muted-foreground">Why we ask: § 7222(b) requires the access response to explain how the output was used, and an output reused downstream widens what you have to disclose.</p>
                      <div className="mt-1"><Radio name="adv_future" options={ADMT_YES_NO_UNSURE_OPTS} value={adv.feeds_future_decisions || ""} onChange={(v) => setA("feeds_future_decisions", v)} /></div>
                    </div>
                    <div {...errAnchor("admt_detail.solely_advertising")}>
                      <Label className="text-[12px]">Is this system used solely for advertising?</Label>
                      <p className="text-[11px] text-muted-foreground">Advertising is excluded from "significant decision" — a Yes here means Article 11 ADMT obligations do not attach.</p>
                      <div className="mt-1"><Radio name="adv_ads" options={ADMT_SOLELY_ADVERTISING_OPTS} value={adv.solely_advertising || ""} onChange={(v) => setA("solely_advertising", v)} /></div>
                    </div>
                  </div>

                  <div {...errAnchor("human_review")}>
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

                  <div className="rounded-md border bg-muted/20 p-4 space-y-3" data-rail-key="human_involvement_self_test" onFocus={() => focus("human_involvement_self_test")}>
                    <p className="text-[11px] italic text-muted-foreground">You're seeing this because how much a human is involved decides whether the law applies at all — it's worth a moment.</p>
                    <p className="text-[12px] font-semibold">Human-involvement self-test (§ 7001(e)(1))</p>
                    <p className="text-[12px] text-muted-foreground">This is the gate for the entire regime: if a qualifying human is in the loop, the system does not "substantially replace" human decisionmaking and Article 11 obligations may not attach.</p>
                    {/* F03 — this coverage question is never seeded from the
                        authority answer above: a reviewer may see every decision
                        without being able to change any of them. */}
                    <div {...errAnchor("admt_detail.hi_reviewer_present")}>
                      <Label className="text-[12px]">How many of this system's decisions does a human reviewer actually look at?</Label>
                      <p className="text-[11px] text-muted-foreground">Answer this on its own. The question above asks what the reviewer is able to do; this one asks how many decisions are reviewed at all. "Sometimes / on a subset" means the decisions no one reviews are made by the ADMT alone.</p>
                      <div className="mt-1"><Radio name="hi_present" options={["Yes — on every decision", "Sometimes / on a subset", "No — fully automated"]} value={adv.hi_reviewer_present || ""} onChange={(v) => { markTouched("hi_reviewer_present"); setA("hi_reviewer_present", v); }} /></div>
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
                          <Label className="text-[12px]">Has the reviewer been trained to read what the system produces?</Label>
                          <p className="text-[11px] text-muted-foreground">Why we ask: § 7001(e)(1)(A) counts a reviewer only if they know how to interpret and use the output.</p>
                          <div className="mt-1"><Radio name="hi_trained" options={["Yes", "No"]} value={adv.hi_trained || ""} onChange={(v) => setA("hi_trained", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Does the reviewer look at anything besides the system's output?</Label>
                          <p className="text-[11px] text-muted-foreground">Why we ask: § 7001(e)(1)(B) counts a reviewer only if they weigh the output together with other relevant information.</p>
                          <div className="mt-1"><Radio name="hi_other" options={["Yes", "No"]} value={adv.hi_reviews_other_info || ""} onChange={(v) => setA("hi_reviews_other_info", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Can the reviewer change the decision?</Label>
                          <p className="text-[11px] text-muted-foreground">Why we ask: § 7001(e)(1)(C) counts a reviewer only if they hold the authority to change the outcome, not merely to flag it.</p>
                          <div className="mt-1"><Radio name="hi_auth" options={["Yes", "No"]} value={adv.hi_authority_override || ""} onChange={(v) => setA("hi_authority_override", v)} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Actual override rate, last 12 months (optional)</Label>
                          <input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.hi_override_rate || ""} onChange={(e) => setA("hi_override_rate", e.target.value)} placeholder="e.g. 8%" />
                        </div>
                        {selfTestState !== "hidden" && (
                          <div data-testid="admt-self-test-result" data-state={selfTestState} className={`p-3 rounded text-[12px] ${selfTestState === "likely" ? "bg-green-50 border border-green-200 text-green-900 dark:bg-green-950/20 dark:text-green-200" : selfTestState === "contradiction" ? "bg-red-50 border border-red-200 text-red-900 dark:bg-red-950/20 dark:text-red-200" : selfTestState === "incomplete" ? "bg-muted border text-muted-foreground" : "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"}`}>
                            {selfTestState === "incomplete" ? ADMT_COPY.scopeIncomplete
                              : selfTestState === "contradiction" ? (scope.contradictions.find((c) => c.includes("self-test")) ?? ADMT_COPY.scopeContradiction)
                              : selfTestState === "likely" ? ADMT_COPY.humanInvolvementLikely
                              : ADMT_COPY.humanInvolvementUnlikely}
                            {selfTestState === "likely" && String(adv.hi_reviewer_present).startsWith("Sometimes") ? " Review covers only a subset of decisions; the decisions no one reviews remain ADMT and the Article 11 duties apply to them." : ""}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {admtScopeVerdict && (
                    <div data-testid="admt-scope-banner" data-level={admtScopeVerdict.level} className={`rounded-md border p-4 ${admtScopeVerdict.level === "in" ? "border-cobalt/40 bg-[hsl(var(--cobalt)/0.06)]" : admtScopeVerdict.level === "out" ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20" : admtScopeVerdict.level === "conflict" ? "border-red-300 bg-red-50/60 dark:bg-red-950/20" : "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"}`}>
                      <p className="text-sm font-semibold">{admtScopeVerdict.title}</p>
                      <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{admtScopeVerdict.body}</p>
                      {admtScopeVerdict.facts.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-[12px] text-muted-foreground space-y-0.5">
                          {admtScopeVerdict.facts.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2 italic">{ADMT_COPY.scopeFooter}</p>
                    </div>
                  )}

                  <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-4">
                    <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300 mb-2">
                      Additional risk assessment triggers (§ 7150)
                    </p>
                    <p className="text-[12px] text-muted-foreground mb-3">{ADMT_COPY.riskTriggersIntro}</p>
                    <div className="space-y-3">
                      <div data-rail-key="training_data_use" onFocus={() => focus("training_data_use")}>
                        <Label className="text-[12px]">Do you use personal information to train any automated decision system?</Label>
                        <p className="text-[11px] text-muted-foreground">Why we ask: § 7150(b)(6) makes processing personal information to train ADMT for a significant decision (or facial-, emotion-, identity-verification, or physical/biological identification technology) a risk-assessment trigger on its own, even where no significant decision is made; § 7153 separately obliges a business that makes ADMT available to another business to give it the facts its risk assessment needs.</p>
                        <div className="mt-1">
                          <Radio
                            name="training_data"
                            options={["Yes", "No"]}
                            value={trainingDataUse}
                            onChange={setTrainingDataUse}
                            data-rail-key="training_data_use" onFocus={() => focus("training_data_use")}
                          />
                        </div>
                      </div>
                      <div data-rail-key="profiling_use" onFocus={() => focus("profiling_use")}>
                        <Label className="text-[12px]">Do you use automated processing to profile consumers (predict behavior, preferences, or characteristics) even without making a 'significant decision'?</Label>
                        <div className="mt-1">
                          <Radio
                            name="profiling"
                            options={["Yes", "No"]}
                            value={profilingUse}
                            onChange={setProfilingUse}
                            data-rail-key="profiling_use" onFocus={() => focus("profiling_use")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {dutiesOptional && step >= 2 && step <= 4 && (
                <div className="mb-4 border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-r text-sm text-amber-900 dark:text-amber-200" data-testid="admt-partial-scope-banner">
                  <span className="font-semibold">Optional for this system.</span> {ADMT_COPY.partialScopeBanner}
                  {scope.facts.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-[12px] space-y-0.5">{scope.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                  )}
                </div>
              )}
              {step === 2 && (
                <>
                 <h2 className="font-serif text-xl">Step 2 · Do people get the right heads-up?</h2>
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> before you use ADMT for a significant decision, you must tell people — in specific terms, at or before you use it — what it does and how to opt out.</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR §§ 7220(b)–(c)</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">{ADMT_COPY.step2ElementsIntro}</p>

                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">{ADMT_COPY.step2TimingIntro}</p>

                  <div {...errAnchor("notice_delivery")}>
                    <Label data-rail-key="notice_delivery" onFocus={() => focus("notice_delivery")}>
                      How do you deliver the Pre-use Notice to consumers? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all methods used. "We have not yet provided a Pre-use Notice" is a complete answer.</p>
                    <div className="mt-2">
                      <Pills
                        options={NOTICE_DELIVERY_OPTIONS}
                        value={noticeDelivery}
                        onChange={handleNoticeDeliveryChange}
                        data-rail-key="notice_delivery" onFocus={() => focus("notice_delivery")}
                      />
                    </div>
                  </div>

                  {/* DOC 158 — § 7220(b)(2) timing (never asked before). */}
                  {!noticeDelivery.includes("We have not yet provided a Pre-use Notice") && (
                    <div data-rail-key="notice_timing" onFocus={() => focus("notice_timing")} {...errAnchor("notice_timing")}>
                      <Label data-rail-key="notice_timing" onFocus={() => focus("notice_timing")}>
                        When is the Pre-use Notice presented? <Req />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">§ 7220(b)(2): the notice must be presented "prominently and conspicuously to the consumer at or before the point when the business collects the consumer's personal information that the business plans to process using ADMT"; where the information was already collected for a different purpose, the notice must be provided "before processing the consumer's personal information for that purpose."</p>
                      <div className="mt-2">
                        <Radio name="notice_timing" options={[...NOTICE_TIMING_OPTS]} value={noticeTiming} onChange={setNoticeTiming} data-rail-key="notice_timing" onFocus={() => focus("notice_timing")} />
                      </div>
                    </div>
                  )}
                  <div {...errAnchor("notice_has_specific_purpose")}>
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
                      <div className="mt-3" {...errAnchor("notice_purpose_text")}>
                        <Label className="text-[12px]">Paste your specific purpose statement as it appears in the notice:</Label>
                        <Textarea
                          className="mt-1"
                          rows={3}
                          value={noticePurposeText}
                          onChange={(e) => setNoticePurposeText(e.target.value)}
                          data-rail-key="notice_specific_purpose" onFocus={() => focus("notice_specific_purpose")}
                          placeholder="Paste the exact text"
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
                    {isProvisional("noticeFullText") ? (
                      <p className="text-xs text-muted-foreground mt-1 mb-2" data-testid="admt-notice-provisional">
                        This box holds the excerpts you pasted below, joined together — a starting point, not the published notice. Edit it to match the notice as consumers see it, or <button type="button" className="underline" onClick={() => confirmPrefill("noticeFullText")}>confirm that this is the complete published notice</button>. Until you do, it is not sent with your answers.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        Paste the notice exactly as consumers see it. Your report quotes these words back and tests each § 7220(c) element against them. Leave blank if you have not published a notice yet — the report will say so rather than assume.
                      </p>
                    )}
                    <Textarea
                      rows={8}
                      value={noticeFullText}
                      onChange={(e) => { markTouched("noticeFullText"); setNoticeFullText(e.target.value); }}
                      data-rail-key="notice_full_text" onFocus={() => focus("notice_full_text")}
                      placeholder="Paste the full notice text"
                    />
                    {noticeElementsJoined && !noticeFullText.trim() && (
                      <div className="mt-2 text-xs text-muted-foreground" data-testid="admt-notice-assemble">
                        <button type="button" className="underline" aria-expanded={noticePreviewOpen} onClick={() => setNoticePreviewOpen((o) => !o)}>
                          {noticePreviewOpen ? "Hide the assembled excerpts" : "Preview the excerpts you pasted below, joined together"}
                        </button>
                        {noticePreviewOpen && (
                          <div className="mt-2 rounded border bg-background p-2">
                            <p className="mb-1 font-medium">Assembled excerpts — not the published notice</p>
                            <pre className="whitespace-pre-wrap font-sans text-[12px]">{noticeElementsJoined}</pre>
                            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={adoptAssembledNotice}>Start from these excerpts</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {noticeElementsNotInFullText.length > 0 && !isProvisional("noticeFullText") && (
                      <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300" data-testid="admt-notice-mismatch">
                        {noticeElementsNotInFullText.length === 1 ? "One excerpt" : `${noticeElementsNotInFullText.length} excerpts`} pasted below {noticeElementsNotInFullText.length === 1 ? "does" : "do"} not appear in this full text. The report tests the full text; check that both reflect the notice as published.
                      </p>
                    )}
                  </div>

                  {/* ITEM 308 — published pre-use notice text, element by element.
                      Without the actual words, § 7220(c) adequacy can only be asserted. */}
                  <div className="border-l-4 border-brand-teal/60 pl-4 py-2 rounded-r bg-muted/30">
                    <p className="text-[12px] font-semibold mb-1" data-rail-key="notice_element_text" onFocus={() => focus("notice_element_text")}>
                      Paste your published Pre-use Notice, element by element
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Optional, but it changes the report: we test each § 7220(c) element against the words you actually publish, not against a description of them. Leave an element blank where your notice does not cover it — the report says so rather than assuming.
                    </p>
                    <div className="space-y-3">
                      {[
                        ["purpose", "What you use the system for"],
                        ["optout", "The right to opt out, and how to ask"],
                        ["access", "The right to ask what the system did, and how to ask"],
                        ["antiretaliation", "That you will not retaliate for using these rights"],
                        ["howworks_inputs", "What information goes into the system"],
                        ["howworks_output", "What the system produces, and how you use it"],
                        ["altprocess", "What happens instead for someone who opts out"],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <Label className="text-[12px]">{label}</Label>
                          <Textarea
                            className="mt-1"
                            rows={2}
                            value={noticeElementText[k] || ""}
                            onChange={(e) => setNET(k, e.target.value)}
                            aria-label={`${label} — exact wording from your notice`}
                            data-rail-key={NOTICE_ELEMENT_RAIL[k] ?? "notice_element_text"}
                            onFocus={(e) => { e.stopPropagation(); focus(NOTICE_ELEMENT_RAIL[k] ?? "notice_element_text"); }}
                            placeholder="Paste the exact wording"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div {...errAnchor("notice_has_opt_out_desc")}>
                    <Label data-rail-key="notice_opt_out_description" onFocus={() => focus("notice_opt_out_description")}>
                      Does your notice describe the consumer's right to opt out and how to submit a request? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_opt_out"
                        options={["Yes — with specific opt-out instructions", "Mentions opt-out but without clear instructions", "No", "We rely on an exception and describe appeal rights instead", "We rely on an exception and the notice identifies the specific exception"]}
                        value={noticeHasOptOutDesc}
                        onChange={setNoticeHasOptOutDesc}
                        data-rail-key="notice_opt_out_description" onFocus={() => focus("notice_opt_out_description")}
                      />
                    </div>
                  </div>

                  <div {...errAnchor("notice_has_access_desc")}>
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

                  <div {...errAnchor("notice_has_anti_retaliation")}>
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

                  <div {...errAnchor("notice_has_how_it_works")}>
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
                 <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold text-foreground">What we're checking:</span> {ADMT_COPY.step3Intro}</p>
                 <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">11 CCR § 7221</p>
                 <p className="text-sm text-foreground/80 mt-2 italic">This stage produces the opt-out section of your report — whether your opt-out mechanism, or the exception you rely on instead, holds under § 7221.</p>

                  <RequiredLegend />

                  <div {...errAnchor("opt_out_exception")}>
                    <Label data-rail-key="optout_exception_human_appeal" onFocus={() => focus("optout_exception_human_appeal")}>
                      Are you providing a full opt-out right, or relying on an exception? <DefPopover termKey="admt_opt_out" /> <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Why we ask:</span> the opt-out only has to be honored if no exception applies — this tells us which path (full opt-out vs. exception) the rest of this step follows.</p>
                    <div className="mt-2" data-rail-key={optOutException === OPT_OUT_OTHER_OPTION ? "optout_exception_other" : "optout_exception_human_appeal"} onFocus={() => focus(optOutException === OPT_OUT_OTHER_OPTION ? "optout_exception_other" : "optout_exception_human_appeal")}>
                      <ChoiceWithOther
                        options={OPT_OUT_EXCEPTIONS}
                        value={optOutException}
                        onChange={setOptOutException}
                        otherText={adv.opt_out_exception_other || ""}
                        onOtherText={(v) => setA("opt_out_exception_other", v)}
                        placeholder="A short paragraph in your own words"
                      />
                    </div>
                    {optOutPath === "OTHER_UNRESOLVED" && optOutException && (
                      <p className="mt-2 text-[12px] text-amber-800 dark:text-amber-300" data-testid="admt-optout-unresolved">
                        Your answer does not match a listed exception or the full opt-out right, so the report records the opt-out position as unresolved — it treats your situation as neither. The opt-out questions below are optional facts about what you offer today.
                      </p>
                    )}
                  </div>

                  {optOutPath === "HUMAN_APPEAL_EXCEPTION" && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30 dark:bg-amber-950/10 rounded-r" {...errAnchor("opt_out_appeal_process")}>
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
                      <div className="mt-4 space-y-3 border-t pt-3" data-rail-key="optout_appeal_mechanics" onFocus={(e) => { e.stopPropagation(); focus("optout_appeal_mechanics"); }}>
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
                          <div><Label className="text-[12px]" data-rail-key="appeal_step_count" onFocus={() => focus("appeal_step_count")}>Steps from decision to human reviewer</Label><input className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={adv.appeal_step_count || ""} onChange={(e) => setA("appeal_step_count", e.target.value)} data-rail-key="appeal_step_count" onFocus={(e) => { e.stopPropagation(); focus("appeal_step_count"); }} placeholder="e.g. 2" /></div>
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

                  {onEmploymentException && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30 dark:bg-amber-950/10 rounded-r" {...errAnchor("opt_out_fairness_doc")}>
                      <p className="text-[12px] font-semibold mb-2">Non-discrimination documentation required</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        This exception only applies if the ADMT 'works for the business's purpose and does not unlawfully discriminate based upon protected characteristics' (§ 7221(b)(2)(B), (b)(3)(B)). You must have documented evidence.
                      </p>
                      <div className="mb-4 space-y-3">
                        <div>
                          {/* F06 / CEO item 1 — the § 7221(b)(3) branch asks the (b)(3) question with its own Yes string (soleUseOptions). */}
                          {optOutPath === "WORK_ALLOCATION_COMP_EXCEPTION" ? (
                            <Label className="text-[12px]" data-rail-key="sole_use_attestation_work" onFocus={() => focus("sole_use_attestation_work")}>Is the ADMT used solely to allocate or assign work, or to set compensation, for this person? <span className="font-normal text-muted-foreground">(§ 7221(b)(3))</span></Label>
                          ) : (
                            <Label className="text-[12px]" data-rail-key="sole_use_attestation" onFocus={() => focus("sole_use_attestation")}>Is the ADMT used solely to assess the person's ability to perform at work or in an educational program? <span className="font-normal text-muted-foreground">(§ 7221(b)(2))</span></Label>
                          )}
                          <div className="mt-1"><Radio name="sole_use_attestation" options={soleUseOptions} value={adv.sole_use_attestation || ""} onChange={(v) => setA("sole_use_attestation", v)} data-rail-key={onWorkException ? "sole_use_attestation_work" : "sole_use_attestation"} onFocus={() => focus(onWorkException ? "sole_use_attestation_work" : "sole_use_attestation")} /></div>
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
                      <div className="mt-4 space-y-3 border-t pt-3" data-rail-key="fairness_testing_detail" onFocus={(e) => { e.stopPropagation(); focus("fairness_testing_detail"); }}>
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
                          <ExhibitTextarea className="mt-1" rows={2} value={adv.bias_outcome_summary || ""} onChange={(v) => setA("bias_outcome_summary", v)} {...stashFor("admt_detail.bias_outcome_summary")} placeholder="One line per group" />
                        </div>
                      </div>
                    </div>
                  )}

                  {provideOptOut && (
                    <>
                      <div {...errAnchor("opt_out_methods")}>
                        <Label data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}>
                          Opt-out submission methods provided {onFullOptOut ? <Req /> : <span className="text-xs text-muted-foreground font-normal">(answer if you offer an opt-out today)</span>}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select every method you provide today. § 7221(c) requires at least two designated methods, at least one matching how you primarily interact with consumers; an online business must offer an interactive online form. Select only what exists — a shortfall is recorded as a gap in the report, not corrected here.
                        </p>
                        <div className="mt-2">
                          <Pills
                            options={OPT_OUT_METHODS}
                            value={optOutMethods}
                            onChange={setOptOutMethods}
                            data-rail-key="optout_methods" onFocus={() => focus("optout_methods")}
                          />
                        </div>
                        {onFullOptOut && optOutMethods.length < 2 && (
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2" data-testid="admt-methods-shortfall">
                            <AlertTriangle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> § 7221(c) requires at least two designated methods; you have selected {optOutMethods.length === 0 ? "none" : "one"}. You can continue — the report records this as a gap with its remediation step. Do not select a method you do not provide.
                          </p>
                        )}
                      </div>

                      {optOutMethods.includes("Interactive online form linked from the Pre-use Notice") && (
                        <div {...errAnchor("opt_out_link_title")}>
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

                      <div {...errAnchor("opt_out_confirmation_mechanism")}>
                        <Label data-rail-key="optout_confirmation_mechanism" onFocus={() => focus("optout_confirmation_mechanism")}>
                          Opt-out confirmation mechanism {onFullOptOut ? <Req /> : null}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          § 7221(h) requires you to provide a means by which consumers can confirm their opt-out was processed. "Not yet defined" is a complete answer.
                        </p>
                        <input
                          className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={optOutConfirmationMechanism}
                          onChange={(e) => setOptOutConfirmationMechanism(e.target.value)}
                          data-rail-key="optout_confirmation_mechanism" onFocus={() => focus("optout_confirmation_mechanism")}
                          placeholder="Channel, then timing"
                        />
                      </div>

                      {provideOptOut && (
                        <div data-rail-key="optout_15_day_process" onFocus={() => focus("optout_15_day_process")}>
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
                            placeholder="A few sentences"
                          />

                        </div>
                      )}



                      <div className="rounded-md border p-4 space-y-3 bg-muted/20">
                        <p className="text-[12px] font-semibold">Confirm opt-out process compliance</p>
                        {/* DOC 158 — § 7221(f), (i), (j), (k), (m) handling duties (never asked before). */}
                        <div data-rail-key="optout_handling" onFocus={() => focus("optout_handling")} {...errAnchor("opt_out_handling_confirmations")}>
                          <Label className="text-[12px]">Which of the following can you confirm about how opt-out requests are handled? {onFullOptOut ? <Req /> : null}</Label>
                          <p className="text-[11px] text-muted-foreground">Select every duty you can confirm. "None of the above can be confirmed" is a complete answer; unconfirmed duties are recorded as follow-up items, never as violations.</p>
                          <div className="mt-1"><Pills options={[...OPT_OUT_HANDLING_OPTS]} value={optOutHandling} onChange={setOptOutHandling} data-rail-key="optout_handling" onFocus={() => focus("optout_handling")} /></div>
                        </div>
                        <div>
                          <Label className="text-[12px]">Is a cookie banner your only way to opt out?</Label>
                          <p className="text-[11px] text-muted-foreground">Why we ask: § 7221(c)(4) does not accept a cookie banner as the sole opt-out route, so the report has to know whether another route exists.</p>
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
                          <Label className="text-[12px]">Does someone have to create an account to opt out?</Label>
                          <p className="text-[11px] text-muted-foreground">Why we ask: § 7221(e) bars requiring account creation as a condition of submitting the request.</p>
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
                  <p className="text-sm text-muted-foreground">{ADMT_COPY.step4Timing}</p>

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
                        ["b1_purpose", "Why you used the system for that person (§ 7222(b)(1))"],
                        ["b2_logic", "How the system works, including what it assumes and where it falls short (§ 7222(b)(2))"],
                        ["b3_output_use", "What the system produced, and how you used it (§ 7222(b)(3))"],
                        ["b3_outcome", "What the person's decision ended up being (§ 7222(b)(3))"],
                        ["b3_human_role", "What a human did, if anything (§ 7222(b)(3))"],
                        // DOC 158 — § 7222(b)(4), never a readiness element before.
                        ["b4_rights", "That you cannot retaliate, and how to exercise other CCPA rights — with links to the request form or portal (§ 7222(b)(4))"],
                      ].map(([k, label]) => (
                        <div key={k} data-rail-key={`access_readiness_${k}`} onFocus={(e) => { e.stopPropagation(); focus(`access_readiness_${k}`); }}>
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
                          <Label className="mt-2 block text-[11px] font-normal text-muted-foreground" htmlFor={`ar_${k}_process`}>By what internal process would you produce this? One sentence — a workflow note, not the explanation a consumer receives.</Label>
                          <input
                            id={`ar_${k}_process`}
                            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                            value={accessReadiness[`${k}_process`] || ""}
                            onChange={(e) => setAR(`${k}_process`, e.target.value)}
                            placeholder="e.g. Pull the decision record and the model card from the case file"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div data-rail-key="access_submission_methods" onFocus={() => focus("access_submission_methods")} {...errAnchor("access_submission_methods")}>
                    <Label data-rail-key="access_submission_methods" onFocus={() => focus("access_submission_methods")}>
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

                  <div data-rail-key="access_verification" onFocus={() => focus("access_verification")} {...errAnchor("access_verification_process")}>
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

                  <div {...errAnchor("access_logic_disclosure")}>
                    <Label data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}>
                      What do you tell someone about how the system reached its result? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Say how the system handled that person's information, what drove the output, and what the output was (§ 7222(b)(2)). Trade secrets may be withheld. This is the explanation a consumer receives, not your internal process.
                    </p>
                    {isProvisional("accessLogicDisclosure") ? (
                      <p className="text-[11px] text-muted-foreground mt-1" data-testid="admt-logic-provisional">Started from the process note you wrote above — a suggestion, not yet your answer. Edit it into the explanation a consumer would receive, or <button type="button" className="underline" onClick={() => confirmPrefill("accessLogicDisclosure")}>keep it as written</button>.</p>
                    ) : !accessLogicDisclosure.trim() && (accessReadiness.b2_logic_process || "").trim() ? (
                      <p className="text-[11px] text-muted-foreground mt-1"><button type="button" className="underline" onClick={() => startDisclosureFromProcess("accessLogicDisclosure")}>Start from the process note you wrote above</button> — you will need to rewrite it for a consumer.</p>
                    ) : null}
                    <Textarea
                      className="mt-2"
                      rows={3}
                      value={accessLogicDisclosure}
                      onChange={(e) => { markTouched("accessLogicDisclosure"); setAccessLogicDisclosure(e.target.value); }}
                      data-rail-key="access_logic_disclosure" onFocus={() => focus("access_logic_disclosure")}
                      placeholder="Disclosed first, then withheld"
                    />
                  </div>

                  <div {...errAnchor("access_outcome_disclosure")}>
                    <Label data-rail-key="access_outcome_disclosure" onFocus={() => focus("access_outcome_disclosure")}>
                      What do you tell someone about the decision itself? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Say how the output was used in the decision, whether it decided the matter on its own, what else counted, what a human did, and any later use of the output (§ 7222(b)(3)). This is the explanation a consumer receives, not your internal process.
                    </p>
                    {isProvisional("accessOutcomeDisclosure") ? (
                      <p className="text-[11px] text-muted-foreground mt-1" data-testid="admt-outcome-provisional">Started from the process note you wrote above — a suggestion, not yet your answer. Edit it into the explanation a consumer would receive, or <button type="button" className="underline" onClick={() => confirmPrefill("accessOutcomeDisclosure")}>keep it as written</button>.</p>
                    ) : !accessOutcomeDisclosure.trim() && (accessReadiness.b3_outcome_process || "").trim() ? (
                      <p className="text-[11px] text-muted-foreground mt-1"><button type="button" className="underline" onClick={() => startDisclosureFromProcess("accessOutcomeDisclosure")}>Start from the process note you wrote above</button> — you will need to rewrite it for a consumer.</p>
                    ) : null}
                    <Textarea
                      className="mt-2"
                      rows={3}
                      value={accessOutcomeDisclosure}
                      onChange={(e) => { markTouched("accessOutcomeDisclosure"); setAccessOutcomeDisclosure(e.target.value); }}
                      data-rail-key="access_outcome_disclosure" onFocus={() => focus("access_outcome_disclosure")}
                      placeholder="Disclosed first, then withheld"
                    />
                  </div>

                  <div {...errAnchor("access_response_timeline")}>
                    <Label data-rail-key="access_response_timeline" onFocus={() => focus("access_response_timeline")}>
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
                        data-rail-key="access_response_timeline" onFocus={() => focus("access_response_timeline")}
                      />
                    </div>
                  </div>

                  {/* prior_access_requests_12mo question removed (RC-P6): § 7222(j) threshold applies at framework level and is now framed as a monitoring threshold in the report, not conditioned on a per-consumer count. */}

                  <OptionalCluster
                    answered={[accessTradeSecretPolicy, String(adv.access_secure_transmission || ""), String(adv.access_denial_basis || "")].filter((v) => v.trim()).length}
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
                        placeholder="One category per line"
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
                      <ExhibitTextarea className="mt-2" rows={2} value={adv.access_denial_basis || ""} onChange={(v) => setA("access_denial_basis", v)} {...stashFor("admt_detail.access_denial_basis")} placeholder="One ground per line" />
                    </div>
                  </OptionalCluster>

                </>
              )}

              {isReview && (
                <>
                  <h2 className="font-serif text-xl">Review your answers</h2>
                  <p className="text-sm text-muted-foreground">{ADMT_COPY.finalReviewInstruction}</p>
                  {admtScopeVerdict && (
                    <div className="rounded-md border p-3 text-[13px]" data-testid="admt-review-scope" data-level={admtScopeVerdict.level}>
                      <p className="font-semibold">{admtScopeVerdict.title}</p>
                      <p className="text-muted-foreground mt-1">{admtScopeVerdict.body}</p>
                    </div>
                  )}
                  {(unansweredReviewRows.length > 0 || exhibitReviewRows.length > 0) && (
                    <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-3 text-[12px]" data-testid="admt-review-unresolved">
                      <p className="font-semibold text-amber-800 dark:text-amber-300">Unresolved items</p>
                      {unansweredReviewRows.length > 0 && (
                        <p className="mt-1 text-muted-foreground">{unansweredReviewRows.length} question{unansweredReviewRows.length === 1 ? "" : "s"} on your current path {unansweredReviewRows.length === 1 ? "is" : "are"} unanswered. The report records each as not stated; it does not assume an answer.</p>
                      )}
                      {exhibitReviewRows.length > 0 && (
                        <p className="mt-1 text-muted-foreground">{exhibitReviewRows.length} exhibit{exhibitReviewRows.length === 1 ? "" : "s"} deferred. A blank exhibit is listed as outstanding in the report and does not establish compliance.</p>
                      )}
                    </div>
                  )}
                  {reviewSections.map((sec) => (
                    <section key={sec.step} className="rounded-lg border bg-card text-sm" aria-labelledby={`admt-review-step-${sec.step}`}>
                      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
                        <h3 id={`admt-review-step-${sec.step}`} className="font-medium text-[13px]">Step {sec.step} · {sec.title}</h3>
                        <Button type="button" size="sm" variant="ghost" onClick={() => jumpTo(sec.step, sec.rows[0]?.key ?? "")}>Edit step</Button>
                      </div>
                      <div className="divide-y">
                        {sec.rows.filter((r) => !(inactiveReviewKeys.has(r.key) && r.state === "unanswered")).map((r: ReviewRow) => (
                          <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 px-4 py-2" data-review-key={r.key} data-review-state={r.state}>
                            <div className="text-muted-foreground text-[12px]">{r.label}</div>
                            <div className={`break-words text-[13px] ${r.state === "unanswered" ? "italic text-muted-foreground" : ""}`}>
                              {r.state === "unanswered" ? "Not answered" : r.items ? (
                                <ul className="space-y-0.5">{r.items.map((it) => <li key={it.label}><span className="text-muted-foreground">{it.label}:</span> {it.text}</li>)}</ul>
                              ) : r.text}
                            </div>
                            <div><button type="button" className="text-[12px] underline text-muted-foreground" onClick={() => jumpTo(sec.step, r.key)} aria-label={`Edit ${r.label}`}>Edit</button></div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}

              <ValidationErrorSummary message={validationError} fieldKey={fieldErrors.fields[0] ?? null} className="mt-4" />
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

      <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/cppa-admt-checker" {...intakeGate("cppa_admt")} />
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
