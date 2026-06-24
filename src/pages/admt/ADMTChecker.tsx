// src/pages/admt/ADMTChecker.tsx
// ADMT Compliance Assessment — Module 3
// Four-step intake: (1) ADMT Inventory, (2) Pre-Use Notice, (3) Opt-Out, (4) Access Rights
// Signature feature: StatuteRail — persistent right column showing verbatim
// regulation text, plain summary, and FSOR context for every field.

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { useToolDraft } from "@/hooks/useToolDraft";
import StatuteRail from "@/components/admt/StatuteRail";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
import type { RailEntry } from "@/components/admt/StatuteRail";

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

function formatRelativeTime(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const Radio = ({
  name, options, value, onChange, onFocus,
}: {
  name: string; options: string[]; value: string;
  onChange: (v: string) => void; onFocus?: () => void;
}) => (
  <div className="space-y-2">
    {options.map((o) => (
      <label key={o} className="flex items-start gap-2 cursor-pointer">
        <input
          type="radio" name={name} value={o} checked={value === o}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className="mt-0.5"
        />
        <span className="text-sm leading-snug">{o}</span>
      </label>
    ))}
  </div>
);

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

export default function ADMTChecker() {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_admt" as any);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [step, setStep] = useState(1);
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

  // Step 1
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
  const [priorAccessRequests12mo, setPriorAccessRequests12mo] = useState("");

  // Step 2
  const [noticeDelivery, setNoticeDelivery] = useState<string[]>([]);
  const [noticeHasSpecificPurpose, setNoticeHasSpecificPurpose] = useState("");
  const [noticePurposeText, setNoticePurposeText] = useState("");
  const [noticeHasOptOutDesc, setNoticeHasOptOutDesc] = useState("");
  const [noticeHasAccessDesc, setNoticeHasAccessDesc] = useState("");
  const [noticeHasAntiRetaliation, setNoticeHasAntiRetaliation] = useState("");
  const [noticeHasHowItWorks, setNoticeHasHowItWorks] = useState("");
  const [noticeHasAlternativeProcess, setNoticeHasAlternativeProcess] = useState("");

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
  const [optOutServiceProviderNotice, setOptOutServiceProviderNotice] = useState("");

  // Step 4
  const [accessSubmissionMethods, setAccessSubmissionMethods] = useState("");
  const [accessVerificationProcess, setAccessVerificationProcess] = useState("");
  const [accessLogicDisclosure, setAccessLogicDisclosure] = useState("");
  const [accessOutcomeDisclosure, setAccessOutcomeDisclosure] = useState("");
  const [accessResponseTimeline, setAccessResponseTimeline] = useState("");
  const [accessTradeSecretPolicy, setAccessTradeSecretPolicy] = useState("");

  const provideOptOut =
    !optOutException.startsWith("Human appeal") &&
    !optOutException.startsWith("Hiring") &&
    !optOutException.startsWith("Work allocation");

  const stepValid = (): string | null => {
    if (step === 1) {
      if (!systemName.trim()) return "Please name your ADMT system.";
      if (!systemDescription || systemDescription.length < 30)
        return "Please describe what the system does (at least 30 characters).";
      if (!decisionDomains.length)
        return "Please select the significant decision domain(s) this system affects.";
      if (!humanReview) return "Please describe the human review process for this system's outputs.";
    }
    if (step === 2) {
      if (!noticeDelivery.length) return "Please indicate how you deliver the Pre-use Notice.";
      if (!noticeHasSpecificPurpose) return "Please answer whether your notice states a specific purpose.";
      if (noticeHasSpecificPurpose === "Yes" && !noticePurposeText.trim())
        return "Please paste or describe your specific purpose statement.";
      if (!noticeHasOptOutDesc) return "Please answer whether your notice describes the opt-out right.";
      if (!noticeHasAccessDesc) return "Please answer whether your notice describes the access right.";
      if (!noticeHasAntiRetaliation)
        return "Please answer whether your notice includes the anti-retaliation statement.";
      if (!noticeHasHowItWorks) return "Please answer whether your notice explains how the ADMT works.";
    }
    if (step === 3) {
      if (!optOutException)
        return "Please select whether you are providing an opt-out right or relying on an exception.";
      if (provideOptOut && optOutMethods.length < 2)
        return "You must provide at least two designated opt-out methods (§ 7221(c)).";
      if (
        provideOptOut &&
        optOutMethods.includes("Interactive online form linked from the Pre-use Notice") &&
        !optOutLinkTitle.trim()
      )
        return "Please provide the title of your opt-out link (§ 7221(c)(1)).";
      if (provideOptOut && !optOutConfirmationMechanism)
        return "Please describe how consumers can confirm their opt-out was processed (§ 7221(h)).";
      if (optOutException.startsWith("Human appeal") && !optOutAppealProcess.trim())
        return "Please describe your human appeal process in detail (§ 7221(b)(1)).";
      if ((optOutException.startsWith("Hiring") || optOutException.startsWith("Work")) && !optOutFairnessDoc.trim())
        return "Please describe your fairness/non-discrimination testing documentation (§ 7221(b)(2)-(3)).";
    }
    if (step === 4) {
      if (!accessSubmissionMethods.trim()) return "Please describe how consumers can submit access requests.";
      if (!accessVerificationProcess.trim())
        return "Please describe your identity verification process for access requests.";
      if (!accessLogicDisclosure.trim())
        return "Please describe what logic information you disclose in access responses.";
      if (!accessOutcomeDisclosure.trim())
        return "Please describe what outcome information you disclose in access responses.";
      if (!accessResponseTimeline) return "Please confirm your response timeline.";
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) {
      toast({ title: "Required", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const intake = useMemo(
    () => ({
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
      ca_consumer_count: caConsumerCount,
      third_party_admt: thirdPartyAdmt,
      admt_system_count: admtSystemCount,
      prior_access_requests_12mo: priorAccessRequests12mo,
      opt_out_15_day_process: optOut15DayProcess,
      opt_out_service_provider_notice: optOutServiceProviderNotice,
    }),
    [
      systemName, systemType, systemDescription, decisionDomains, humanReview,
      trainingDataUse, profilingUse, noticeDelivery, noticeHasSpecificPurpose,
      noticePurposeText, noticeHasOptOutDesc, noticeHasAccessDesc,
      noticeHasAntiRetaliation, noticeHasHowItWorks, noticeHasAlternativeProcess,
      optOutException, optOutMethods, optOutLinkTitle, optOutNoCookieBanner,
      optOutNoAccountRequired, optOutConfirmationMechanism, optOutAppealProcess,
      optOutFairnessDoc, accessSubmissionMethods, accessVerificationProcess,
      accessLogicDisclosure, accessOutcomeDisclosure, accessResponseTimeline,
      accessTradeSecretPolicy,
      caConsumerCount, thirdPartyAdmt, admtSystemCount, priorAccessRequests12mo, optOut15DayProcess, optOutServiceProviderNotice,
    ],
  );

  const draftData = intake;
  const INITIAL_DRAFT = useMemo(
    () =>
      JSON.stringify({
        systemName: "", systemType: "", systemDescription: "", decisionDomains: [],
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
      systemName, systemType, systemDescription, decisionDomains, humanReview,
      trainingDataUse, profilingUse, noticeDelivery, noticeHasSpecificPurpose,
      noticePurposeText, noticeHasOptOutDesc, noticeHasAccessDesc,
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
    if (typeof d.ca_consumer_count === "string") setCaConsumerCount(d.ca_consumer_count);
    if (typeof d.third_party_admt === "string") setThirdPartyAdmt(d.third_party_admt);
    if (typeof d.opt_out_15_day_process === "string") setOptOut15DayProcess(d.opt_out_15_day_process);
    if (typeof d.admt_system_count === "string") setAdmtSystemCount(d.admt_system_count);
    if (typeof d.prior_access_requests_12mo === "string") setPriorAccessRequests12mo(d.prior_access_requests_12mo);
    if (typeof restoreStage === "number") setStep(restoreStage);
    dismissDraft();
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>ADMT Compliance Assessment — Module 3 | End User Privacy</title>
        <meta name="description" content="California ADMT compliance assessment covering pre-use notice, opt-out, and access rights under 11 CCR §§ 7200–7222. January 1, 2027 deadline." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-admt-checker" />
      </Helmet>

      <header className="bg-[#1a4a6e] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            CPPA AUDIT READINESS · MODULE 3 · ${pricing.price}
          </span>
          <h1 className="font-serif text-white mb-3">ADMT Compliance Assessment</h1>
          <RequirementBadge variant="hero" tier="conditional" text="If you use automated decision-making for significant decisions — hiring, lending, housing, healthcare — California requires pre-use notice, an opt-out, and a risk assessment by January 1, 2027." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            Assess your automated decisionmaking technology against the CPPA's final regulations. Covers pre-use notice requirements (§ 7220), opt-out obligations (§ 7221), and access rights (§ 7222). Generates a gap report with specific remediation steps for each deficit, cited to the regulation.
          </p>
          <p className="text-slate-400 text-sm mt-3 max-w-3xl">
            Compliance deadline: <strong className="text-amber-300">January 1, 2027</strong> for businesses already using ADMT for significant decisions.
          </p>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
        <ToolTierNote isCppa={true} />
      </div>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IntakeGuidance className="mb-4">Describe each automated decision-making system specifically and separately — what it decides, on what data, and the human-review step. If you run several systems, give each its own description rather than merging them.</IntakeGuidance>
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a compliance gap analysis for your ADMT systems under 11 CCR Article 11 (§§ 7200–7222). It is an analytical aid, not legal advice. Review all output with qualified California privacy counsel before relying on it for regulatory submissions." />

        {draftFound && !touched && (
          <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-brand-teal/40 bg-[hsl(var(--cobalt)/0.06)] text-sm mb-4">
            <div>You have a saved draft{draftUpdatedAt ? ` from ${formatRelativeTime(draftUpdatedAt)}` : ""}.</div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={applyRestore}>Resume draft</Button>
              <Button size="sm" variant="ghost" onClick={() => void clearDraft()}>Discard</Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground mb-4">Step {step} of {totalSteps}</div>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            <div className="bg-card border rounded-lg p-6 space-y-6">

              {step === 1 && (
                <>
                 <h2 className="font-serif text-xl">Step 1 — ADMT System Inventory</h2>
                 <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR §§ 7001(e), 7001(ddd), 7200(a) — ADMT and significant decision definitions</p>
                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    Complete one assessment per ADMT system. If you use multiple ADMT systems for significant decisions, run the checker once per system. Each system requires its own pre-use notice, opt-out mechanism, and access right process.
                  </p>

                  <div>
                    <Label onFocus={() => focus("scope_does_business_use_admt")}>
                      System name <Req />
                    </Label>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      onFocus={() => focus("scope_does_business_use_admt")}
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
                    <Label onFocus={() => focus("scope_does_business_use_admt")}>
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
                      onFocus={() => focus("scope_does_business_use_admt")}
                      placeholder='e.g. "A gradient-boosted model that scores loan applications 0–100 based on credit history, income, and debt ratio. Scores below 40 are automatically declined without human review."'
                    />
                  </div>

                  <div>
                    <Label>
                      Approximate number of California consumers this system processes decisions for annually
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used to estimate regulatory exposure. Required when CPPA requests documentation. Ranges are acceptable.
                    </p>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={caConsumerCount}
                      onChange={(e) => setCaConsumerCount(e.target.value)}
                      placeholder="e.g. 50,000–100,000 annually"
                    />
                  </div>

                  <div>
                    <Label>
                      Are you using any third-party tools or APIs that make or materially contribute to this decision? (optional)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      The CPPA treats you as the "business" responsible for ADMT compliance even when using vendor tools (e.g. a credit scoring API, a resume screening SaaS, a fraud detection service). List any third-party systems involved.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={thirdPartyAdmt}
                      onChange={(e) => setThirdPartyAdmt(e.target.value)}
                      placeholder="e.g. FICO Score API for credit decisioning; HireVue for candidate screening; Sardine for fraud detection"
                    />
                  </div>

                  <div>
                    <Label>How many distinct ADMT systems does your business operate for significant decisions? (optional)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      If you operate more than one ADMT system — for example, a credit scoring model and a separate fraud detection system — you may be eligible to provide a single consolidated Pre-Use Notice under § 7220(e) rather than separate notices for each system. Enter a number or leave blank if you operate a single system.
                    </p>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={admtSystemCount}
                      onChange={(e) => setAdmtSystemCount(e.target.value)}
                      placeholder="e.g. 1, 2, 3"
                    />
                  </div>



                  <div>
                    <Label onFocus={() => focus("scope_significant_decision_domain")}>
                      What significant decision(s) does this system make or materially contribute to? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all that apply.</p>
                    <div className="mt-2">
                      <Pills
                        options={SIGNIFICANT_DECISION_DOMAINS}
                        value={decisionDomains}
                        onChange={setDecisionDomains}
                        onFocus={() => focus("scope_significant_decision_domain")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("scope_human_involvement")}>
                      Human review of system outputs <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the option that best describes how human review works for this system's outputs. Under § 7001(e)(1), 'human involvement' requires the reviewer to know how to interpret the output, review it plus other relevant information, and have the authority to change the decision.
                    </p>
                    <div className="mt-2">
                      <Radio
                        name="human_review"
                        options={HUMAN_REVIEW_OPTIONS}
                        value={humanReview}
                        onChange={setHumanReview}
                        onFocus={() => focus("scope_human_involvement")}
                      />
                    </div>
                  </div>

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
                            options={["Yes", "No", "Unsure"]}
                            value={trainingDataUse}
                            onChange={setTrainingDataUse}
                            onFocus={() => focus("scope_does_business_use_admt")}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[12px]">Do you use automated processing to profile consumers (predict behavior, preferences, or characteristics) even without making a 'significant decision'?</Label>
                        <div className="mt-1">
                          <Radio
                            name="profiling"
                            options={["Yes", "No", "Unsure"]}
                            value={profilingUse}
                            onChange={setProfilingUse}
                            onFocus={() => focus("scope_does_business_use_admt")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                 <h2 className="font-serif text-xl">Step 2 — Pre-Use Notice Assessment</h2>
                 <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR §§ 7220(b)–(c) — pre-use notice timing and required content</p>
                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    The Pre-use Notice must be provided prominently at or before the point you collect PI for ADMT use (§ 7220(b)). If you've already collected the PI for another purpose and now plan to use ADMT, you must provide the notice before starting ADMT processing.
                  </p>

                  <div>
                    <Label onFocus={() => focus("notice_timing")}>
                      How do you deliver the Pre-use Notice to consumers? <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Select all methods used.</p>
                    <div className="mt-2">
                      <Pills
                        options={NOTICE_DELIVERY_OPTIONS}
                        value={noticeDelivery}
                        onChange={setNoticeDelivery}
                        onFocus={() => focus("notice_timing")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_specific_purpose")}>
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
                        onFocus={() => focus("notice_specific_purpose")}
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
                          onFocus={() => focus("notice_specific_purpose")}
                          placeholder="Paste the exact text from your Pre-use Notice here…"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_opt_out_description")}>
                      Does your notice describe the consumer's right to opt out and how to submit a request? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_opt_out"
                        options={["Yes — with specific opt-out instructions", "Mentions opt-out but without clear instructions", "No", "We rely on an exception and describe appeal rights instead"]}
                        value={noticeHasOptOutDesc}
                        onChange={setNoticeHasOptOutDesc}
                        onFocus={() => focus("notice_opt_out_description")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_access_right_description")}>
                      Does your notice describe the consumer's right to access ADMT information and how to submit a request? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_access"
                        options={["Yes", "No", "Not yet"]}
                        value={noticeHasAccessDesc}
                        onChange={setNoticeHasAccessDesc}
                        onFocus={() => focus("notice_access_right_description")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_anti_retaliation")}>
                      Does your notice state that the business is prohibited from retaliating against consumers for exercising CCPA rights? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_anti_ret"
                        options={["Yes", "No", "Not yet"]}
                        value={noticeHasAntiRetaliation}
                        onChange={setNoticeHasAntiRetaliation}
                        onFocus={() => focus("notice_anti_retaliation")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_how_admt_works")}>
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
                        onFocus={() => focus("notice_how_admt_works")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label onFocus={() => focus("notice_how_admt_works")}>
                      Does the notice describe what happens to consumers who opt out — the alternative decision-making process?
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="notice_alt_process"
                        options={["Yes", "No", "Not applicable — we rely on an opt-out exception"]}
                        value={noticeHasAlternativeProcess}
                        onChange={setNoticeHasAlternativeProcess}
                        onFocus={() => focus("notice_how_admt_works")}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                 <h2 className="font-serif text-xl">Step 3 — Opt-Out Mechanism</h2>
                 <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7221 — opt-out right, exceptions, methods, and timing</p>
                  <RequiredLegend />

                  <div>
                    <Label onFocus={() => focus("optout_exception_human_appeal")}>
                      Are you providing a full opt-out right, or relying on an exception? <Req />
                    </Label>
                    <div className="mt-2">
                      <Radio
                        name="opt_out_exception"
                        options={OPT_OUT_EXCEPTIONS}
                        value={optOutException}
                        onChange={setOptOutException}
                        onFocus={() => focus("optout_exception_human_appeal")}
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
                        onFocus={() => focus("optout_exception_human_appeal")}
                        placeholder="Who is the designated reviewer? What is their title and training? How does the consumer submit an appeal? What information can the consumer provide? What is the decision timeline? Can the reviewer change the decision?"
                      />
                    </div>
                  )}

                  {(optOutException.startsWith("Hiring") || optOutException.startsWith("Work")) && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/30 dark:bg-amber-950/10 rounded-r">
                      <p className="text-[12px] font-semibold mb-2">Non-discrimination documentation required</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        This exception only applies if the ADMT 'works for the business's purpose and does not unlawfully discriminate based upon protected characteristics' (§ 7221(b)(2)(B), (b)(3)(B)). You must have documented evidence.
                      </p>
                      <Label className="text-[12px]">Describe your fairness and non-discrimination testing <Req /></Label>
                      <Textarea
                        className="mt-2"
                        rows={3}
                        value={optOutFairnessDoc}
                        onChange={(e) => setOptOutFairnessDoc(e.target.value)}
                        onFocus={() => focus("optout_exception_hiring")}
                        placeholder="e.g. Annual disparate-impact analysis across protected classes conducted by [firm]; results documented in [document]; last conducted [date]"
                      />
                    </div>
                  )}

                  {provideOptOut && (
                    <>
                      <div>
                        <Label onFocus={() => focus("optout_methods")}>
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
                            onFocus={() => focus("optout_methods")}
                          />
                        </div>
                        {optOutMethods.length > 0 && optOutMethods.length < 2 && (
                          <p className="text-xs text-destructive mt-2">
                            ⚠ § 7221(c) requires at least two designated methods. Please add another method.
                          </p>
                        )}
                      </div>

                      {optOutMethods.includes("Interactive online form linked from the Pre-use Notice") && (
                        <div>
                          <Label onFocus={() => focus("optout_methods")}>
                            Opt-out link title (as it appears in your Pre-use Notice) <Req />
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            § 7221(c)(1) requires the link title to state what the consumer is opting out of, e.g. "Opt-out of Automated Decisionmaking Technology." Generic labels like "Your Privacy Choices" are not sufficient.
                          </p>
                          <input
                            className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={optOutLinkTitle}
                            onChange={(e) => setOptOutLinkTitle(e.target.value)}
                            onFocus={() => focus("optout_methods")}
                            placeholder='e.g. "Opt-out of Automated Decisionmaking Technology"'
                          />
                        </div>
                      )}

                      <div>
                        <Label onFocus={() => focus("optout_timing_response")}>
                          Opt-out confirmation mechanism <Req />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          § 7221(h) requires you to provide a means by which consumers can confirm their opt-out was processed.
                        </p>
                        <input
                          className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={optOutConfirmationMechanism}
                          onChange={(e) => setOptOutConfirmationMechanism(e.target.value)}
                          onFocus={() => focus("optout_timing_response")}
                          placeholder="e.g. Confirmation email sent within 24 hours; status page in account settings"
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
                            placeholder="e.g. Opt-out requests are logged in [system] by [team]. A suppression flag is set in [system] within [X] days. Service providers [list] are notified via [method] within [Y] days. Process documented in [document name]."
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
                              onFocus={() => focus("optout_methods")}
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
                              onFocus={() => focus("optout_methods")}
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
                 <h2 className="font-serif text-xl">Step 4 — Access Right Readiness</h2>
                 <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7222 — consumer right to access ADMT information</p>
                  <RequiredLegend />
                  <p className="text-sm text-muted-foreground">
                    Consumers have the right to request information about your use of ADMT with respect to them (§ 7222). Unlike opt-out, access requests require identity verification. You must respond within 45 days.
                  </p>

                  <div>
                    <Label onFocus={() => focus("access_logic_disclosure")}>
                      Submission methods for access requests <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      You may use existing right-to-know methods (§ 7222(d)). Methods must be easy to use and must not use dark patterns.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={accessSubmissionMethods}
                      onChange={(e) => setAccessSubmissionMethods(e.target.value)}
                      onFocus={() => focus("access_logic_disclosure")}
                      placeholder="e.g. Online form at [URL]; designated email privacy@company.com; same methods as right-to-know requests"
                    />
                  </div>

                  <div>
                    <Label onFocus={() => focus("access_verification")}>
                      Identity verification process for access requests <Req />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Access requests require verification under Article 5. If you cannot verify identity, you must tell the consumer — you cannot silently deny.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={accessVerificationProcess}
                      onChange={(e) => setAccessVerificationProcess(e.target.value)}
                      onFocus={() => focus("access_verification")}
                      placeholder="e.g. Two-factor verification via email + account login; third-party identity verification service for non-account holders"
                    />
                  </div>

                  <div>
                    <Label onFocus={() => focus("access_logic_disclosure")}>
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
                      onFocus={() => focus("access_logic_disclosure")}
                      placeholder="e.g. We disclose: the input features used (credit score, income, DTI ratio); the model's output score for the consumer; the score threshold applied; we do not disclose model weights (trade secret)"
                    />
                  </div>

                  <div>
                    <Label onFocus={() => focus("access_outcome_disclosure")}>
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
                      onFocus={() => focus("access_outcome_disclosure")}
                      placeholder="e.g. We disclose: whether the score was the sole factor or combined with underwriter review; the decision outcome (approved/declined); if declined, which factor(s) were primary"
                    />
                  </div>

                  <div>
                    <Label onFocus={() => focus("access_logic_disclosure")}>
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
                        onFocus={() => focus("access_logic_disclosure")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Has this consumer previously submitted access requests to your business in the last 12 months? (optional)</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Under § 7222(j), if a consumer has submitted more than four access requests within a 12-month period, you may provide aggregate-level logic and output summaries instead of individualized responses. Enter the approximate number of prior requests from this consumer, or leave blank.
                    </p>
                    <input
                      className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={priorAccessRequests12mo}
                      onChange={(e) => setPriorAccessRequests12mo(e.target.value)}
                      placeholder="e.g. 0, 2, 5"
                    />
                  </div>

                  <div>
                    <Label onFocus={() => focus("access_logic_disclosure")}>
                      Trade secret and security information policy (optional but recommended)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      § 7222(c) allows you to withhold trade secrets (Civil Code § 3426.1(d)) and security-compromising information. Documenting your policy in advance avoids ad-hoc decisions under access request time pressure.
                    </p>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={accessTradeSecretPolicy}
                      onChange={(e) => setAccessTradeSecretPolicy(e.target.value)}
                      onFocus={() => focus("access_logic_disclosure")}
                      placeholder="e.g. We withhold: model architecture and weights (trade secret per Civil Code § 3426.1(d)); fraud detection rule thresholds (security per § 7222(c)(2)(B))"
                    />
                  </div>
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
                        ...(priorAccessRequests12mo ? [["Prior access requests (12 mo.)", priorAccessRequests12mo]] : []),
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
                    <Button onClick={next}>Next</Button>
                  ) : (
                    <Button onClick={handlePurchase} disabled={!pricing.stripeConfigured}>
                      {!pricing.stripeConfigured
                        ? `Payments Coming Soon — $${pricing.price}`
                        : `Run ADMT Compliance Assessment — $${pricing.price}`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <StatuteRail entry={activeRailEntry} />
        </div>
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
