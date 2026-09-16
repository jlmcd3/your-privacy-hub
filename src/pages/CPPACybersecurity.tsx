// CPPA Cybersecurity Audit Readiness — Module 2 intake. Covers 18 program components.
import { useMemo, useState , useEffect} from "react";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  clearSuiteHandoff,
  nextSuiteStep,
  readSuiteHandoff,
  saveSuiteModule,
  suiteCheckoutIntake,
} from "@/lib/suiteIntakeHandoff";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import { ProductHero } from "@/components/ProductHero";
import SuiteSelector from "@/components/product/SuiteSelector";
import HeroPriceCta from "@/components/product/HeroPriceCta";
import ProductInfoCards from "@/components/product/ProductInfoCards";
import HowItWorksRow from "@/components/product/HowItWorksRow";
import SuiteCrossSellStrip from "@/components/product/SuiteCrossSellStrip";
import CompactDisclaimer from "@/components/product/CompactDisclaimer";
import { INCLUDED_GENERATIONS_HERO, PRICING } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import CPPAToolsCrossLinks from "@/components/cppa/CPPAToolsCrossLinks";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import StatuteRail from "@/components/intake/StatuteRail";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";
import { CPPA_CYBER_RAIL } from "@/components/cppa/CPPACyberRailEntries";
import type { RailEntry } from "@/components/intake/StatuteRail";
import { useEnforcementSignals } from "@/hooks/useEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import { CPPA_CYBER_FSOR_CALLOUTS } from "@/components/cppa/CPPACyberFsorCallouts";
import { FscrCallout } from "@/components/FscrCallout";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
// Cyber master review (2026-09-15/16) — field errors (Addition 2), the
// review screen (Addition 1), the register's copy (S01–S10) and the dated
// CCPA revenue threshold (F06).
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { fail, type StepIssue } from "@/lib/intakeValidation";
import { buildCyberReview } from "@/lib/cyberReview";
import { CYBER_APPLICABILITY_CARD, CYBER_COPY } from "./cyberCopy";
import { ccpaRevenueThresholdForYearMirror, defaultRevenueReferenceYear } from "@/lib/ccpaRevenueThreshold";

// RC-C3.CLOSE-1 / RC-FLIP-2 — MATURITY lives in a standalone enums module so
// shared components (refine surface) don't import this page module. Re-export
// kept for any external references to `@/pages/CPPACybersecurity`.
export { MATURITY, CYBER_EVIDENCE_OPTS, CYBER_IN_SCOPE_FRAMEWORKS, CYBER_AUDITOR_ENGAGEMENT } from "./CPPACybersecurity.enums";
import {
  MATURITY, CYBER_EVIDENCE_OPTS, CYBER_IN_SCOPE_FRAMEWORKS, CYBER_AUDITOR_ENGAGEMENT,
  CYBER_REVENUE_OPTS, CYBER_CONSUMER_OPTS, CYBER_SELL_SHARE_OPTS,
  CYBER_SHARE_REVENUE_50PCT_OPTS, CYBER_SENSITIVE_PI_OPTS, CYBER_SPI_VOLUME_OPTS,
  CYBER_PASSWORD_AUTH_OPTIONS,
  // DOC 159 (2026-09-03) — § 7123(e)(9)/(10) notification facts and the
  // § 7123(b)(2) not-applicable position.
  CYBER_INCIDENT_NOTIFICATION_OPTIONS, CYBER_NOT_APPLICABLE_MATURITY,
  // Cyber master review (2026-09-15/16) — F06/F07/F08 additions.
  CYBER_INCIDENTS_12MO_OPTIONS, CYBER_REVENUE_THRESHOLD_CHECK_OPTIONS, CYBER_REVENUE_STRADDLING_BAND,
  CYBER_CONSUMER_NOTICE_STATUS_OPTIONS, CYBER_AGENCY_NOTICE_STATUS_OPTIONS,
  CYBER_IN_SCOPE_FRAMEWORK_OPTIONS, CYBER_NO_PRIOR_FRAMEWORK_WORK,
} from "./CPPACybersecurity.enums";

// INTAKE-4b — `notesHint` / `evidenceHint` carry the per-component plain-language
// framing for the two rows the wording pass names (c4 inventory, c11 port and
// protocol management). Every other component keeps the shared framing.
type Control = { key: string; label: string; description: string; citation: string; notesHint?: string; evidenceHint?: string };

const CONTROLS: Control[] = [
  { key: "c1_auth", label: "Authentication", description: "MFA (phishing-resistant where used), strong passwords, and controls over who can access PI.", citation: "§ 7123(c)(1)" },
  { key: "c2_encryption", label: "Encryption of personal information", description: "Encryption of personal information at rest and in transit.", citation: "§ 7123(c)(2)" },
  { key: "c3_account_access", label: "Account management and access controls", description: "Least-privilege access, privileged-account limits, account lifecycle, and physical-access restrictions to PI.", citation: "§ 7123(c)(3)" },
  { key: "c4_inventory", label: "Inventory and management of personal information and systems", description: "Inventory of PI, data flows, hardware and software — including cloud and third-party systems.", citation: "§ 7123(c)(4)",
    notesHint: "Say what the inventory covers and how it is kept current — the systems, the data flows, who updates it and how often. Left blank, the finding rests on the rating alone.",
    evidenceHint: "Select every artefact an auditor could test — the inventory export or CMDB extract, the data-flow map, the review record. Left blank, the evidence checklist records nothing on file for this component." },
  { key: "c5_secure_config", label: "Secure configuration of hardware and software", description: "Hardening, patch and change management, and masking — on-prem and cloud.", citation: "§ 7123(c)(5)" },
  { key: "c6_vuln_mgmt", label: "Vulnerability scanning and penetration testing", description: "Internal/external vulnerability scans, penetration testing, and vulnerability disclosure/reporting.", citation: "§ 7123(c)(6)" },
  { key: "c7_audit_logs", label: "Audit-log management", description: "Centralized storage, retention, and monitoring of logs.", citation: "§ 7123(c)(7)" },
  { key: "c8_network_mon", label: "Network monitoring and defenses", description: "Detection and defense against unauthorized access (tools such as IDS/IPS are examples, not mandates).", citation: "§ 7123(c)(8)" },
  { key: "c9_anti_malware", label: "Antivirus and anti-malware protections", description: "Deployment and maintenance of antivirus and anti-malware.", citation: "§ 7123(c)(9)" },
  { key: "c10_segmentation", label: "Segmentation of an information system", description: "Segmentation of information systems (e.g. firewalls, routers, switches).", citation: "§ 7123(c)(10)" },
  { key: "c11_port_protocol", label: "Port and protocol management and protection", description: "Limitation and control of ports, services, and protocols to reduce attack surface.", citation: "§ 7123(c)(11)",
    notesHint: "Say which ports, services and protocols are allowed, how exceptions are approved, and who reviews the rules. Left blank, the finding rests on the rating alone.",
    evidenceHint: "Select every artefact an auditor could test — the firewall or security-group rule export, the approved-services baseline, the review record. Left blank, the evidence checklist records nothing on file for this component." },
  { key: "c12_awareness", label: "Cybersecurity awareness", description: "How the business keeps current on evolving threats and countermeasures (distinct from training).", citation: "§ 7123(c)(12)" },
  { key: "c13_training", label: "Cybersecurity education and training", description: "Training for employees, contractors, and anyone with system access — onboarding, annual, and post-breach.", citation: "§ 7123(c)(13)" },
  { key: "c14_secure_dev", label: "Secure development and coding practices", description: "Secure coding standards, code review, and security testing across the SDLC.", citation: "§ 7123(c)(14)" },
  { key: "c15_third_party", label: "Oversight of service providers, contractors, and third parties", description: "Oversight of vendors/contractors handling PI to ensure they meet program obligations.", citation: "§ 7123(c)(15)" },
  { key: "c16_retention", label: "Retention schedules and proper disposal of personal information", description: "Retention schedules and secure disposal of PI no longer needed.", citation: "§ 7123(c)(16)" },
  { key: "c17_incident", label: "Security-incident response management", description: "Incident response program, documented procedures, testing, and review of incidents in the period.", citation: "§ 7123(c)(17)" },
  { key: "c18_continuity", label: "Business-continuity and disaster-recovery planning", description: "BC/DR plans, data-recovery, backups, and testing to ensure availability of PI.", citation: "§ 7123(c)(18)" },
];

export default function CPPACybersecurity() {
  useToolStartedOnInteraction("cppa_cyber");
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("cppa_cybersecurity");
  const [searchParams] = useSearchParams();
  const isSuite = searchParams.get("suite") === "true";
  const suitePricing = useToolPrice("cppa_suite");
  // v7: show the price the current viewer will pay; switch to Suite pricing
  // when launched in suite mode.
  const activePricing = isSuite ? suitePricing : pricing;
  const headerLabel = isSuite ? "FULL AUDIT SUITE · MODULE 2 OF 2" : "CPPA AUDIT READINESS · MODULE 2";
  const displayPrice = activePricing.price;

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const refine = useRefineMode("cppa_cybersecurity");
  const { meter } = useRunMeter("cppa_cybersecurity", refine.assessmentId);
  const [maturity, setMaturity] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string[]>>({});
  // DOC 159 — the Company's stated basis for a not-applicable position, per control.
  const [naReason, setNaReason] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({
    entity_name: "", industry: "", incidents_12mo: "", framework: "", last_audit: "",
    in_scope_frameworks: [] as string[], audit_scope_rationale: "",
    // ITEM 315 — § 7122 independence inputs (both optional).
    auditor_engagement_status: "", prior_audit_scope: "",
    // INTAKE-4b — CEO-approved addition 2026-08-09 (optional).
    remediation_owner: "",
    // C1.2 — § 7120(a)-(b) audit-applicability predicate inputs. Not part
    // of the hard submit gate (see `allComplete` below); an unanswered
    // field routes the applicability table to an "insufficient
    // information" cell instead.
    q1_revenue: "", q2_consumers: "", q5_sell_share: "",
    q5c_share_revenue_50pct: "", q15_sensitive_pi: "", q15c_spi_volume: "",
    // FC-L4 (2026-08-25, CEO-ordered) — optional; see the intake-contract
    // header comment.
    password_auth_used: "",
    // DOC 159 — § 7123(e)(9)/(10); legacy aggregate since 2026-09-16 (kept for
    // old drafts; the two status questions below carry the fact now).
    incident_notifications: "",
    // Cyber master review (2026-09-15, F07) — required-vs-sent, per recipient.
    consumer_notice_status: "", agency_notice_status: "",
    // Cyber master review (2026-09-15, F06) — the dated threshold question,
    // asked only when the stated band straddles the CPI-adjusted figure.
    q1_revenue_threshold_check: "", q1_revenue_reference_year: "",
  });
  // INTAKE-4b — prefill-confirm for profile.in_scope_frameworks. The earlier
  // "primary security framework in use" answer supplies the same fact for the
  // first row of this list; it is PREFILLED and presented as a confirmation,
  // never merged. Once the customer touches the row, the prefill stops.
  const [inScopeTouched, setInScopeTouched] = useState(false);
  const [inScopePrefilled, setInScopePrefilled] = useState(false);

  const setM = (k: string, v: string) => setMaturity((s) => ({ ...s, [k]: v }));
  const setN = (k: string, v: string) => setNotes((s) => ({ ...s, [k]: v }));
  const setNa = (k: string, v: string) => setNaReason((s) => ({ ...s, [k]: v }));
  // Cyber master review (2026-09-15, F05) — "None on file" is an explicit
  // absence and cannot stand beside a positive evidence type: choosing it
  // clears the others, choosing a positive type removes it. Blank stays
  // blank (not answered), never "nothing on file".
  const EVIDENCE_NONE = "None on file";
  const toggleEvidence = (k: string, opt: string) =>
    setEvidence((s) => {
      const cur = s[k] || [];
      if (cur.includes(opt)) return { ...s, [k]: cur.filter((o) => o !== opt) };
      if (opt === EVIDENCE_NONE) return { ...s, [k]: [EVIDENCE_NONE] };
      return { ...s, [k]: [...cur.filter((o) => o !== EVIDENCE_NONE), opt] };
    });
  // Cyber master review (2026-09-15, F08) — the absence answer is exclusive;
  // the legacy "None / informal" keeps its informal-practice meaning and may
  // sit beside a named framework. Touching the group confirms it.
  const toggleInScopeFramework = (opt: string) => {
    setInScopeTouched(true);
    setProfile((p) => {
      const cur = p.in_scope_frameworks || [];
      if (cur.includes(opt)) return { ...p, in_scope_frameworks: cur.filter((o) => o !== opt) };
      if (opt === CYBER_NO_PRIOR_FRAMEWORK_WORK) return { ...p, in_scope_frameworks: [CYBER_NO_PRIOR_FRAMEWORK_WORK] };
      return { ...p, in_scope_frameworks: [...cur.filter((o) => o !== CYBER_NO_PRIOR_FRAMEWORK_WORK), opt] };
    });
  };
  /** F08 — an explicit confirmation of the carried-over primary framework. */
  const confirmInScopePrefill = () => setInScopeTouched(true);

  // INTAKE-4b PREFILL (never merge): the primary-framework answer prefills the
  // in-scope list as a confirmation. Stored values are the same
  // CYBER_IN_SCOPE_FRAMEWORKS strings, so the answer shape is byte-identical.
  useEffect(() => {
    if (inScopeTouched) return;
    const fw = profile.framework;
    if (!fw || !CYBER_IN_SCOPE_FRAMEWORKS.includes(fw as never)) {
      if (inScopePrefilled) {
        setInScopePrefilled(false);
        setProfile((p) => ({ ...p, in_scope_frameworks: [] }));
      }
      return;
    }
    setInScopePrefilled(true);
    setProfile((p) => (p.in_scope_frameworks.length === 1 && p.in_scope_frameworks[0] === fw ? p : { ...p, in_scope_frameworks: [fw] }));
  }, [profile.framework, inScopeTouched, inScopePrefilled]);

  const [activeCyberRailKey, setActiveCyberRailKey] = useState<string | null>(null);
  const activeCyberRailEntry: RailEntry | null = activeCyberRailKey ? (CPPA_CYBER_RAIL[activeCyberRailKey] ?? null) : null;
  const focusRail = (key: string) => setActiveCyberRailKey(key);

  // Cyber master review (2026-09-15, Addition 2) — the fleet-wide field-error
  // contract (fail → useFieldErrors.show → [data-field] outline/scroll/focus),
  // previously absent from this product.
  const fieldErrors = useFieldErrors();
  const [validationError, setValidationError] = useState<string | null>(null);
  const errAnchor = (k: string) => ({
    "data-field": k,
    "aria-invalid": fieldErrors.isInvalid(k) ? true : undefined,
    onClickCapture: () => fieldErrors.clear(k),
  });

  // Cyber master review (2026-09-15, F06) — the threshold question names the
  // calendar year; when it first appears the preceding year is filled in as
  // the reference year (editable).
  const straddling = profile.q1_revenue === CYBER_REVENUE_STRADDLING_BAND;
  useEffect(() => {
    if (straddling && !profile.q1_revenue_reference_year) {
      setProfile((p) => ({ ...p, q1_revenue_reference_year: String(defaultRevenueReferenceYear()) }));
    }
  }, [straddling, profile.q1_revenue_reference_year]);
  const referenceYear = Number.parseInt(profile.q1_revenue_reference_year, 10);
  const threshold = ccpaRevenueThresholdForYearMirror(Number.isInteger(referenceYear) ? referenceYear : defaultRevenueReferenceYear());
  const incidentsReported = ["1", "2–5", "More than 5"].includes(profile.incidents_12mo);

  // Update the active rail entry as the user scrolls up/down the form.
  useScrollActiveRail(setActiveCyberRailKey);

  const cyberEnforcementSignals = useEnforcementSignals(["authentication", "vulnerability", "incident_response"]);

  // Phase C interim fix (doc 63 §5.1): pinned static callouts replace the
  // live fetch — the old "(c)(1)" key rendered mis-attributed old-numbering
  // report-content commentary on the Authentication field.
  const cyberFscrCallouts = CPPA_CYBER_FSOR_CALLOUTS;

  // RC-P7: control maturity is no longer required at submit. Blank controls flow to the
  // backend's insufficient-information path (M4–M21 → indeterminate; synthesiseCyberAsksFromControls
  // mints information_needed entries subject to the 3-entry cap).
  // Cyber master review (2026-09-15, F04/F14): the deliberate five-field gate
  // is unchanged; whitespace no longer satisfies it, and each failure names
  // its field so the summary can outline, scroll to and focus it.
  const profileIssue = (): StepIssue | null => {
    if (!profile.entity_name.trim()) return fail("entity_name", "Enter the legal name of the entity being assessed.");
    if (!profile.industry.trim()) return fail("industry", "Name the sector of the operations in scope.");
    if (!profile.incidents_12mo) return fail("incidents_12mo", "Choose the number of security incidents in the last 12 months — \"Unknown / not yet reviewed\" is a complete answer.");
    if (!profile.framework) return fail("framework", "Choose the framework that primarily guides the program today.");
    if (!profile.last_audit) return fail("last_audit", "Choose when the last independent security audit was completed.");
    return null;
  };
  const profileComplete = useMemo(
    () => !!(profile.entity_name.trim() && profile.industry.trim() && profile.incidents_12mo && profile.framework && profile.last_audit),
    [profile]
  );
  const unassessedCount = useMemo(
    () => CONTROLS.filter((c) => !maturity[c.key]).length,
    [maturity]
  );
  const allComplete = profileComplete;

  const intake = useMemo(
    () => ({
      profile: {
        ...profile,
        // F08 — a carried-over primary framework is a suggestion until the
        // customer confirms or edits it; an unconfirmed suggestion is not
        // their answer and does not travel.
        in_scope_frameworks: inScopePrefilled && !inScopeTouched ? [] : profile.in_scope_frameworks,
        // F06/F07 — answers to questions the record no longer asks stay in
        // the draft but travel blank (the contract's hidden value).
        q1_revenue_threshold_check: profile.q1_revenue === CYBER_REVENUE_STRADDLING_BAND ? profile.q1_revenue_threshold_check : "",
        q1_revenue_reference_year: profile.q1_revenue === CYBER_REVENUE_STRADDLING_BAND ? profile.q1_revenue_reference_year : "",
        consumer_notice_status: ["1", "2–5", "More than 5"].includes(profile.incidents_12mo) ? profile.consumer_notice_status : "",
        agency_notice_status: ["1", "2–5", "More than 5"].includes(profile.incidents_12mo) ? profile.agency_notice_status : "",
        incident_notifications: ["1", "2–5", "More than 5"].includes(profile.incidents_12mo) ? profile.incident_notifications : "",
      },
      controls: CONTROLS.map((c) => ({
        key: c.key,
        label: c.label,
        maturity: maturity[c.key] || "",
        notes: notes[c.key] || "",
        evidence: evidence[c.key] || [],
        // DOC 159 — carried only beside the not-applicable maturity.
        na_reason: maturity[c.key] === CYBER_NOT_APPLICABLE_MATURITY ? (naReason[c.key] || "") : "",
      })),
    }),
    [profile, maturity, notes, evidence, naReason, inScopePrefilled, inScopeTouched]
  );

  const draftData = useMemo(
    () => ({ profile, maturity, notes, evidence, naReason }),
    [profile, maturity, notes, evidence, naReason],
  );
  const touched = useMemo(
    () => Object.keys(maturity).length > 0 || Object.keys(notes).length > 0 || Object.keys(evidence).length > 0
      || Object.keys(naReason).length > 0
      || Object.values(profile).some((v) => Array.isArray(v) ? v.length > 0 : (v ?? "").toString().trim() !== ""),
    [profile, maturity, notes, evidence, naReason],
  );
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "cppa_cybersecurity",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: 0,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { profile?: any; maturity?: any; notes?: any; evidence?: any; naReason?: any } | null;
    if (!d) return;
    // INTAKE-4b — a restored draft carries the customer's own in-scope answer;
    // the prefill must not overwrite it.
    if (d.profile && typeof d.profile === "object") { setInScopeTouched(true); setProfile((prev) => ({ ...prev, ...d.profile })); }
    if (d.maturity && typeof d.maturity === "object") setMaturity(d.maturity);
    if (d.notes && typeof d.notes === "object") setNotes(d.notes);
    if (d.evidence && typeof d.evidence === "object") setEvidence(d.evidence);
    if (d.naReason && typeof d.naReason === "object") setNaReason(d.naReason);
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

  const notifyUnassessed = () => {
    if (unassessedCount > 0) {
      // S06 — no promise of later revisions; the review block above the
      // button carries the durable count.
      toast({ title: "Partial readiness report", description: CYBER_COPY.partialSubmission(unassessedCount) });
    }
  };

  // Addition 2 — the gate names its field and the summary jumps to it.
  const gate = (): boolean => {
    const issue = profileIssue();
    if (issue) {
      setValidationError(issue.message);
      fieldErrors.show(issue.fields, issue.message);
      return false;
    }
    setValidationError(null);
    fieldErrors.clearAll();
    return true;
  };

  const handlePurchase = () => {
    if (!gate()) return;
    notifyUnassessed();
    if (!user) { setAuthGateOpen(true); return; }
    setCheckoutOpen(true);
  };

  // ── QA round two (SUITE-B03, High) — CPPA Suite two-module hand-off ──
  // Mirror of the Risk page. This entry point collected only the Cyber intake
  // and then bought the bundle, so both rows were written with it. Module 1 is
  // now required before checkout, and the purchase carries an explicit
  // per-module envelope that create-tool-checkout also enforces.
  const suiteModules = useMemo(
    () => (isSuite ? { ...readSuiteHandoff(), cybersecurity: intake as Record<string, unknown> } : {}),
    [isSuite, intake],
  );
  const suiteNextStep = useMemo(
    () => (isSuite ? nextSuiteStep(suiteModules) : null),
    [isSuite, suiteModules],
  );
  const handleSuiteContinue = () => {
    if (!gate()) return;
    notifyUnassessed();
    if (!user) { setAuthGateOpen(true); return; }
    saveSuiteModule("cybersecurity", intake as Record<string, unknown>);
    if (suiteNextStep) {
      navigate(suiteNextStep.path);
      return;
    }
    setCheckoutOpen(true);
  };


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet>
        <title>CPPA Cybersecurity Audit Readiness (Module 2) | End User Privacy</title>
        <meta name="description" content="CPPA cybersecurity audit readiness mapped to the 18 program components in the agency's regulations. Includes Breach Precedent Map, Auditor Independence Advisor, and Auditor Handoff Package." />
        <link rel="canonical" href="https://enduserprivacy.com/cppa-cybersecurity" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "CPPA Cybersecurity Audit Readiness (Module 2)",
          description: "18-control gap assessment with dynamic Breach Precedent Map, FSOR-cited findings, and auditor handoff package.",
          brand: { "@type": "Brand", name: "End User Privacy" },
          url: "https://enduserprivacy.com/cppa-cybersecurity",
          offers: { "@type": "Offer", price: String(PRICING.tools.cppa_cyber.dollars), priceCurrency: "USD", availability: "https://schema.org/InStock" },
        })}</script>
      </Helmet>
      {/* PRE-INTAKE REDESIGN (2026-08-26): suite selector → name-led hero with
          the standardized price/CTA block → sales-proof card band → compact
          how-it-works row → shared suite cross-sell → compressed disclaimer.
          Intake guidance moves to the top of the control intake; the client
          selector moves into the workspace masthead. */}
      <SuiteSelector active="m2" />
      <ProductHero
        geography="us"
        eyebrowLabel={headerLabel}
        title="CPPA Cybersecurity Audit Readiness"
        valueProposition={INCLUDED_GENERATIONS_HERO}
        citationLine="11 CCR § 7123 · 18-component readiness map · CPPA final regulations + Final Statement of Reasons"
        showIntakeCta={false}
      >
        <HeroPriceCta
          standalonePrice={activePricing.standalonePrice}
          subscriberPrice={activePricing.subscriberPrice}
          isSubscriber={activePricing.isSubscriber && activePricing.price === activePricing.subscriberPrice}
          primaryLabel={isSuite ? "Start Full Audit Suite" : "Start CPPA Cybersecurity Audit Readiness Assessment"}
          toolSlug="cppa_cyber"
          sampleSlug="cppa_cyber"
        />
      </ProductHero>

      <ProductInfoCards
        className="mt-6"
        cards={[
          {
            title: "Does the audit requirement apply to you?",
            tone: "amber",
            // Cyber master review (2026-09-15, F12 / legal reference points):
            // the first-report date depends on the § 7121 cohort, not one date.
            body: CYBER_APPLICABILITY_CARD,
          },
          {
            title: "What you receive",
            body: "A readiness review mapped to all 18 CPPA cybersecurity program components, with a control-by-control gap analysis and evidence checklist.",
          },
          {
            title: "Readiness before the independent audit",
            body: "Maps your program to the 18 components in § 7123(c), identifies readiness gaps, and builds an evidence checklist for the independent audit engagement required by § 7122.",
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
          "Maps your program against the 18 components in 11 CCR § 7123(c)(1)–(18).",
          "Produces an audit-readiness gap analysis and evidence checklist.",
          "Prepares you for the § 7122 independent-audit engagement — it is not the independent audit itself.",
        ]}
      />

      <SuiteCrossSellStrip className="mt-4" />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 bg-paper">
        <CompactDisclaimer
          line="Readiness analysis only — not the independent cybersecurity audit and not legal advice."
          addition="This tool produces a cybersecurity readiness gap analysis against the 18 components enumerated in 11 CCR § 7123(c). It is not a cybersecurity audit, does not satisfy the CPPA's independent-auditor requirement, and is not legal advice. The April 1, 2028 certification requires an independent audit." />
        {refine.isRefine && refine.intake && !refine.loading && (
          <RefinePanel
            toolType="cppa_cybersecurity"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/cppa-cybersecurity/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        )}
        {!refine.isRefine && (<></>)}
        {!refine.isRefine && (<></>)}
        {!refine.isRefine && (<></>)}
        {!refine.isRefine && (<></>)}
        {!refine.isRefine && (<></>)}
        {!refine.isRefine && (<>
        <DraftRestoreBanner
          draftFound={draftFound}
          touched={touched}
          draftUpdatedAt={draftUpdatedAt}
          onResume={applyRestore}
          onDiscard={() => { void clearDraft(); }}
        />

        <IntakeMasthead
          kicker="CPPA Cybersecurity Audit Readiness · 11 CCR § 7123"
          title="Cybersecurity Program Assessment"
          subjectLabel={meter ? "Assessment subject · locked" : undefined}
          subjectValue={
            meter && typeof meter.lockedFields?.entity_name === "string"
              ? (meter.lockedFields!.entity_name as string)
              : undefined
          }
          meter={meter ?? null}
          // QA batch 2026-09-05 (CY 02 / RA 03) — the "editable across included
          // generations" hint contradicted the "revisions are temporarily
          // disabled" substrip on the same page. Shown only when revisions are on.
          preRunHint={REVISIONS_ENABLED ? "Entity name locks after the first generation; other answers remain editable across included generations." : undefined}
          clientSlot={<ActiveClientLabel variant="masthead" />}
        />
        <BenchLayout
          toolType="cppa_cyber"
          railEntry={activeCyberRailEntry}
          defaultSourceUrl="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf"
        >
        <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="">Organization profile</h2>
          <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7123 — cybersecurity audit scope and components · § 7124 — annual certification requirement</p>
          {/* Cyber master review (2026-09-15, S01 / P01–P03): the intro no
              longer assumes an audit duty; the entity and industry helpers
              say what the answer identifies; the incident count is counted
              against the regulatory definition, not a notification threshold. */}
          <p className="text-sm text-muted-foreground">{CYBER_COPY.profileIntro}</p>
          <RequiredLegend />
          <div data-rail-key="entity_name" onFocus={() => focusRail('entity_name')} {...errAnchor("entity_name")}>
            <Label htmlFor="cyber_entity_name">Entity name<Req /></Label>
            <p id="cyber_entity_name_help" className="text-xs text-muted-foreground mt-1">Enter the registered legal name of the entity being assessed, including its legal suffix. This name identifies the subject of the report; answering does not itself establish that an audit is legally required.</p>
            <input id="cyber_entity_name" aria-describedby="cyber_entity_name_help" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.entity_name} onChange={(e) => setProfile({ ...profile, entity_name: e.target.value })} placeholder="Legal entity name" autoComplete="organization" />
          </div>
          <div data-rail-key="profile_industry" onFocus={() => focusRail('profile_industry')} {...errAnchor("industry")}>
            <Label htmlFor="cyber_industry">Industry sector<Req /></Label>
            <p id="cyber_industry_help" className="text-xs text-muted-foreground mt-1">Name the sector or sectors of the operations being assessed. For a multi-line business, identify the relevant operations rather than only the parent company's industry.</p>
            <input id="cyber_industry" aria-describedby="cyber_industry_help" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} placeholder="Sector" />
          </div>
          <div data-rail-key="incidents_12mo" onFocus={() => focusRail('incidents_12mo')} {...errAnchor("incidents_12mo")}>
            <Label htmlFor="cyber_incidents">Security incidents in the last 12 months<Req /></Label>
            <p id="cyber_incidents_help" className="text-xs text-muted-foreground mt-1">Check the incident register and count each security incident meeting the definition in 11 CCR § 7123(c)(17)(A) once — actual or imminent jeopardy to the information system or the personal information, or a violation or imminent threat of violation of the program. Do not use a notification threshold as the definition. If the register has not been checked against that definition, choose “Unknown / not yet reviewed” rather than “None”.</p>
            <select id="cyber_incidents" aria-describedby="cyber_incidents_help" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.incidents_12mo} onChange={(e) => setProfile({ ...profile, incidents_12mo: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_INCIDENTS_12MO_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* DOC 159 (2026-09-03) — 11 CCR § 7123(e)(9)/(10): the audit report
              must include a sample copy or description of any consumer
              notification under Civ. Code § 1798.82(a) and of any required
              agency notification. Asked only once an incident is reported;
              the deterministic path never infers it from the count. */}
          {/* Cyber master review (2026-09-15, F07) — whether a notice was
              required and whether it was sent are different facts, for
              consumers and for an agency. The legacy single answer is shown
              only when an old draft carried one and the two new questions
              are still blank. Both are optional at the gate; the report
              records a blank as a record-completion item. */}
          {incidentsReported && (
            <div className="space-y-3 rounded-md border border-input p-3" data-rail-key="consumer_notice_status" onFocus={() => focusRail('consumer_notice_status')}>
              <p className="text-xs text-muted-foreground">For each reported incident, check the notification file. Distinguish whether notice was required from whether it was sent, and answer for consumers and for an agency separately. Use Unsure when these facts have not been confirmed. Why we ask: 11 CCR § 7123(e)(9) and (e)(10) require the audit report to include a sample copy or a description of any consumer notification made under Civ. Code § 1798.82(a) and of any required agency notification.</p>
              {profile.incident_notifications && !profile.consumer_notice_status && !profile.agency_notice_status && (
                <p role="status" className="text-xs rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-amber-800 dark:text-amber-300">
                  Earlier answer on this draft: “{profile.incident_notifications}”. Please answer the two questions below; the earlier answer is kept on the record.
                </p>
              )}
              <div {...errAnchor("consumer_notice_status")}>
                <Label htmlFor="cyber_consumer_notice_status">Notification to affected consumers (Civ. Code § 1798.82(a)) <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                <select id="cyber_consumer_notice_status" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.consumer_notice_status} onChange={(e) => setProfile({ ...profile, consumer_notice_status: e.target.value })}>
                  <option value="">Select…</option>
                  {CYBER_CONSUMER_NOTICE_STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div {...errAnchor("agency_notice_status")} data-rail-key="agency_notice_status" onFocus={(e) => { e.stopPropagation(); focusRail('agency_notice_status'); }}>
                <Label htmlFor="cyber_agency_notice_status">Notification to an agency with jurisdiction over privacy laws in California <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                <select id="cyber_agency_notice_status" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.agency_notice_status} onChange={(e) => setProfile({ ...profile, agency_notice_status: e.target.value })}>
                  <option value="">Select…</option>
                  {CYBER_AGENCY_NOTICE_STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          )}
          <div data-rail-key="framework" onFocus={() => focusRail('framework')} {...errAnchor("framework")}>
            <Label htmlFor="cyber_framework">Primary security framework in use<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">Choose the framework that primarily guides the program today. This is separate from the completed audit or assessment evidence you will rely on below. If Other, name it in Audit scope rationale.</p>
            <select id="cyber_framework" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.framework} onChange={(e) => setProfile({ ...profile, framework: e.target.value })}>
              <option value="">Select…</option>
              <option value="NIST CSF">NIST CSF</option>
              <option value="ISO 27001">ISO 27001</option>
              <option value="SOC 2">SOC 2</option>
              <option value="HITRUST">HITRUST</option>
              <option value="PCI DSS">PCI DSS</option>
              <option value="None / informal">None / informal</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div data-rail-key="profile_audit" onFocus={() => focusRail('profile_audit')} {...errAnchor("last_audit")}>
            <Label htmlFor="cyber_last_audit">Last independent security audit<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">Choose the time band for completion of the most recent independent security audit. Internal auditors may qualify; a self-review by the team operating the program is a different activity. Record the exact completion date and scope in Prior audit scope if known.</p>
            <select id="cyber_last_audit" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.last_audit} onChange={(e) => setProfile({ ...profile, last_audit: e.target.value })}>
              <option value="">Select…</option>
              <option value="Within 12 months">Within 12 months</option>
              <option value="12–24 months ago">12–24 months ago</option>
              <option value="Over 24 months ago">Over 24 months ago</option>
              <option value="Never">Never</option>
            </select>
          </div>
          {/* C1.2 (2026-08-25) — § 7120(a)-(b) audit-applicability predicate
              inputs. Verbatim reuse of the identical, already-live fields
              from src/pages/CPPARiskAssessment.tsx (q1_revenue/q2_consumers/
              q5_sell_share/q5c_share_revenue_50pct/q15_sensitive_pi/
              q15c_spi_volume) — same statutory tests, same wording, no new
              customer-facing text. Contract-optional (not "always" like
              Risk's copies) and not part of `allComplete`: an unanswered
              field routes the applicability table to an "insufficient
              information" cell rather than blocking checkout. */}
          <p className="text-sm font-medium mt-2">Audit applicability</p>
          <p className="text-xs text-muted-foreground -mt-2">{CYBER_COPY.applicabilityIntro}</p>
          <div data-rail-key="q1_revenue" onFocus={() => focusRail('q1_revenue')}>
            <Label htmlFor="cyber_q1_revenue">What is your business's annual gross revenue? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(A))</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Use total worldwide gross revenue, before expenses, for the preceding calendar year, from approved financial records. If the amount is not known, leave this unresolved rather than guessing.</p>
            <select id="cyber_q1_revenue" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q1_revenue} onChange={(e) => setProfile({ ...profile, q1_revenue: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_REVENUE_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Cyber master review (2026-09-15, F06) — the "$25M to under $50M"
              band straddles the CPI-adjusted CCPA threshold, so the band
              cannot settle § 1798.140(d)(1)(A). The dated figure is asked
              directly; the year is editable. */}
          {straddling && (
            <div className="rounded-md border border-input p-3 space-y-3" data-rail-key="q1_revenue_threshold_check" onFocus={(e) => { e.stopPropagation(); focusRail('q1_revenue_threshold_check'); }}>
              <div>
                <Label htmlFor="cyber_q1_threshold">Was your annual gross revenue above {threshold.label} for calendar year {profile.q1_revenue_reference_year || defaultRevenueReferenceYear()}? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(A), CPI-adjusted)</span></Label>
                <p className="text-xs text-muted-foreground mt-1">The CCPA revenue threshold is adjusted for inflation every odd-numbered year; the figure in force for that year is {threshold.label}. Your revenue band spans both sides of it, so the report cannot tell from the band alone. Choose Unsure if the figure has not been checked; the report will leave applicability unresolved rather than assume.</p>
                <select id="cyber_q1_threshold" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q1_revenue_threshold_check} onChange={(e) => setProfile({ ...profile, q1_revenue_threshold_check: e.target.value })}>
                  <option value="">Select…</option>
                  {CYBER_REVENUE_THRESHOLD_CHECK_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="cyber_q1_year">Calendar year the revenue figure refers to</Label>
                <input id="cyber_q1_year" inputMode="numeric" pattern="[0-9]{4}" className="mt-2 w-40 h-10 px-3 rounded-md border border-input bg-background" value={profile.q1_revenue_reference_year} onChange={(e) => setProfile({ ...profile, q1_revenue_reference_year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder={String(defaultRevenueReferenceYear())} />
              </div>
            </div>
          )}
          <div data-rail-key="q2_consumers" onFocus={() => focusRail('q2_consumers')}>
            <Label htmlFor="cyber_q2_consumers">How many California consumers' personal information do you process in a year? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(A))</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Estimate distinct California residents whose personal information the business processes during the preceding calendar year, across its processing activities. Count each person once; do not substitute the number of records or accounts. Section 7120(b)(2)(A) also counts households; the household route is not modelled here, so leave this unresolved rather than restating a household count as residents.</p>
            <select id="cyber_q2_consumers" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q2_consumers} onChange={(e) => setProfile({ ...profile, q2_consumers: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_CONSUMER_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div data-rail-key="q5_sell_share" onFocus={() => focusRail('q5_sell_share')}>
            <Label htmlFor="cyber_q5_sell_share">Do you sell personal information, or share it for cross-context behavioural advertising?</Label>
            <p className="text-xs text-muted-foreground mt-1">“Sell” and “share” have specific CCPA meanings: a sale need not be for advertising or involve cash; “share” here means disclosure for cross-context behavioural advertising. Assess the actual disclosures, including those handled by vendors.</p>
            <select id="cyber_q5_sell_share" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q5_sell_share} onChange={(e) => setProfile({ ...profile, q5_sell_share: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_SELL_SHARE_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {profile.q5_sell_share && profile.q5_sell_share !== "No" && (
            <div data-rail-key="q5c_share_revenue_50pct" onFocus={() => focusRail('q5c_share_revenue_50pct')}>
              <Label htmlFor="cyber_q5c">Does 50% or more of your annual gross revenue derive from selling or sharing personal information? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(C) / 11 CCR § 7120(b)(1))</span></Label>
              <p className="text-xs text-muted-foreground mt-1">Using the same calendar year, does revenue from selling or sharing personal information make up at least half of total annual gross revenue? Choose Unsure if the split is not known; an unanswered field leaves this part of applicability unresolved.</p>
              <select id="cyber_q5c" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q5c_share_revenue_50pct} onChange={(e) => setProfile({ ...profile, q5c_share_revenue_50pct: e.target.value })}>
                <option value="">Select…</option>
                {CYBER_SHARE_REVENUE_50PCT_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          <div data-rail-key="q15_sensitive_pi" onFocus={() => focusRail('q15_sensitive_pi')}>
            <Label htmlFor="cyber_q15">Do you process any sensitive personal information?</Label>
            <p className="text-xs text-muted-foreground mt-1">Check the full CCPA definition against your data inventory (for example government identifiers, account credentials, precise geolocation, racial or ethnic origin, religious beliefs, union membership, the contents of mail and messages, genetic and biometric data, health, sex life and sexual orientation, and the personal information of consumers known to be under 16). Choose Unsure if that review is incomplete.</p>
            <select id="cyber_q15" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q15_sensitive_pi} onChange={(e) => setProfile({ ...profile, q15_sensitive_pi: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_SENSITIVE_PI_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {profile.q15_sensitive_pi === "Yes" && (
            <div data-rail-key="q15c_spi_volume" onFocus={() => focusRail('q15c_spi_volume')}>
              <Label htmlFor="cyber_q15c">For how many California consumers do you process sensitive personal information annually? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(B))</span></Label>
              <p className="text-xs text-muted-foreground mt-1">For the preceding calendar year, estimate distinct California residents whose sensitive personal information the business processes. Count each person once across categories and systems; choose Unsure if a reliable count is not available.</p>
              <select id="cyber_q15c" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q15c_spi_volume} onChange={(e) => setProfile({ ...profile, q15c_spi_volume: e.target.value })}>
                <option value="">Select…</option>
                {CYBER_SPI_VOLUME_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          {/* FC-L4 (2026-08-25, CEO-ordered) — the § 7123(b)(2)(A)(ii)
              password/passphrase requirement is conditional on the business
              actually using passwords/passphrases; this predicate lets the
              deterministic path apply that condition instead of inferring
              it from free-text notes. */}
          <div data-rail-key="password_auth_used" onFocus={() => focusRail('password_auth_used')}>
            <Label htmlFor="cyber_password_auth_used">Does your authentication method include passwords or passphrases? <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <select id="cyber_password_auth_used" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.password_auth_used} onChange={(e) => setProfile({ ...profile, password_auth_used: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_PASSWORD_AUTH_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div data-rail-key="in_scope_frameworks" onFocus={() => focusRail('in_scope_frameworks')}>
            <Label>Frameworks in scope for this audit <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Select frameworks with existing reports, assessments or other work that this audit will rely on, and identify that work and its coverage in Audit scope rationale. This is separate from the framework you use to run the program. A framework name alone is not evidence that the prior work satisfies the Article. Why we ask: § 7123(f) lets an audit leverage work already done under another framework, but only for what that framework actually covered.</p>
            {inScopePrefilled && !inScopeTouched && (
              <p role="status" className="text-xs rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-amber-800 dark:text-amber-300 mt-2">
                Suggested from your primary framework: {profile.in_scope_frameworks.join(", ")}. This is a suggestion, not your answer — it is not recorded until you confirm it or change the selection.
                <button type="button" className="ml-2 underline underline-offset-2" onClick={confirmInScopePrefill}>Confirm this selection</button>
              </p>
            )}
            {/* Same accessibility fix as the per-component evidence pills
                below: selection was conveyed by colour alone. This group is
                also where the QA tester's NIST selection was toggled off
                without them noticing — an announced pressed state makes the
                current selection legible rather than inferred from hue. */}
            <div
              role="group"
              aria-label="Frameworks in scope for this audit"
              className="mt-2 flex flex-wrap gap-2"
            >
              {CYBER_IN_SCOPE_FRAMEWORK_OPTIONS.map((opt) => {
                const selected = profile.in_scope_frameworks.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    title={opt === CYBER_NO_PRIOR_FRAMEWORK_WORK ? "Exclusive: no prior framework work is available to rely on" : opt === "None / informal" ? "Informal practice; may sit beside a named framework" : undefined}
                    onClick={() => toggleInScopeFramework(opt)}
                    className={`text-xs px-3 py-1 rounded-full border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input"}`}
                  >{opt}</button>
                );
              })}
            </div>
          </div>
          <div data-rail-key="audit_scope_rationale" onFocus={() => focusRail('audit_scope_rationale')}>
            <Label htmlFor="cyber_scope_rationale">Audit scope rationale <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Say what the audit covers and, where you lean on a prior framework under § 7123(f), how this audit supplements it. Left blank, the report records no stated scope and cannot justify leveraging prior work.</p>
            <Textarea id="cyber_scope_rationale" rows={3} value={profile.audit_scope_rationale} onChange={(e) => setProfile({ ...profile, audit_scope_rationale: e.target.value })} className="mt-2" placeholder="Two or three sentences" />
          </div>
          {/* ITEM 315 — § 7122 auditor-engagement status. Feeds the
              independence determination; § 7122(a)(3) turns on the internal
              auditor's reporting line, which no prior field captured. */}
          <div data-rail-key="auditor_engagement_status" onFocus={() => focusRail('auditor_engagement_status')}>
            <Label htmlFor="cyber_auditor_status">Auditor engagement status <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground mt-1">§ 7122 requires a qualified, objective, independent auditor; an internal auditor must report to an executive who carries no responsibility for the cybersecurity program. Left blank, the report records the independence position as undetermined.</p>
            <select id="cyber_auditor_status" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.auditor_engagement_status} onChange={(e) => setProfile({ ...profile, auditor_engagement_status: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_AUDITOR_ENGAGEMENT.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div data-rail-key="prior_audit_scope" onFocus={() => focusRail('prior_audit_scope')}>
            <Label htmlFor="cyber_prior_scope">Prior audit scope <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground mt-1">What the last audit covered and where its records are held — § 7122(g) requires five-year retention of everything relevant to each audit. Left blank, the report makes no retention finding.</p>
            <Textarea id="cyber_prior_scope" rows={3} value={profile.prior_audit_scope} onChange={(e) => setProfile({ ...profile, prior_audit_scope: e.target.value })} className="mt-2" placeholder="Two or three sentences" />
          </div>
          {/* INTAKE-4b — CEO-approved addition 2026-08-09. Optional at the data
              layer; contract key profile.remediation_owner. */}
          <div data-rail-key="remediation_owner" onFocus={() => focusRail('remediation_owner')}>
            <Label htmlFor="cyber_remediation_owner">Who owns remediation of findings from this audit? <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Name the person or role accountable for coordinating closure of this audit's findings. If ownership is not assigned, say so. Distinguish the overall coordinator from the people responsible for individual remediation actions. Left blank, the report records remediation ownership as unstated.</p>
            <Textarea id="cyber_remediation_owner" rows={2} value={profile.remediation_owner} onChange={(e) => setProfile({ ...profile, remediation_owner: e.target.value })} className="mt-2" placeholder="Name or role, e.g. VP Security Engineering" />
          </div>



        </section>


        <section className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="">The eighteen cybersecurity program components</h2>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7123(c)(1)–(18) — enumerated program components</p>
            <p className="text-sm text-muted-foreground mt-1">Each component becomes one finding in the readiness report. Rate what is running today; a component left unrated is reported as insufficient information rather than as a shortfall.</p>
          </div>
          <IntakeGuidance>{CYBER_COPY.sectionGuidance}</IntakeGuidance>

          {CONTROLS.map((c, i) => (
            <div key={c.key} className="border-t pt-5 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="">{c.label}</h3>
                <span className="text-xs text-muted-foreground font-mono">(11 CCR {c.citation})</span>
                {(c.key === "c1_auth" || c.key === "c6_vuln_mgmt" || c.key === "c17_incident") && (
                  <EnforcementSignalIcon
                    signalKey={c.key === "c1_auth" ? "authentication" : c.key === "c6_vuln_mgmt" ? "vulnerability" : "incident_response"}
                    signals={cyberEnforcementSignals}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-3">{c.description}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  {/* Cyber master review (2026-09-15, F04): the rating never
                      blocked checkout (a blank is reported as insufficient
                      information by design), so it is labelled optional; the
                      stars stay only on the five fields that do block. */}
                  <Label className="text-xs" htmlFor={`maturity_${c.key}`}>Maturity <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{CYBER_COPY.maturityHelper}</p>
                  <select id={`maturity_${c.key}`} data-rail-key={c.key} onFocus={() => focusRail(c.key)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={maturity[c.key] || ""} onChange={(e) => setM(c.key, e.target.value)}>
                    <option value="">Select…</option>
                    {MATURITY.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {/* DOC 159 — the § 7123(b)(2) basis, shown only beside the
                      not-applicable selection. */}
                  {maturity[c.key] === CYBER_NOT_APPLICABLE_MATURITY && (
                    <div className="mt-2" data-rail-key="component_not_applicable" onFocus={() => focusRail('component_not_applicable')}>
                      <Label className="text-xs" htmlFor={`na_reason_${c.key}`}>Why does this component not apply to your information system? <span className="font-normal text-muted-foreground">(optional here; recorded as a record-completion item if blank)</span></Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{CYBER_COPY.nonapplicabilityHelper}</p>
                      <Textarea id={`na_reason_${c.key}`} rows={2} value={naReason[c.key] || ""} onChange={(e) => setNa(c.key, e.target.value)} className="mt-1" placeholder="One or two sentences stating the fact" />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`notes_${c.key}`}>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.notesHint ?? CYBER_COPY.notesHelper}</p>
                  <Textarea id={`notes_${c.key}`} rows={3} value={notes[c.key] || ""} onChange={(e) => setN(c.key, e.target.value)} className="mt-1" placeholder="Measure or process, systems and people covered, exceptions, supporting records" data-rail-key={c.key} onFocus={() => focusRail(c.key)} />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs" id={`evidence_label_${c.key}`}>Evidence available <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground mt-0.5">{c.evidenceHint ?? CYBER_COPY.evidenceHelper}</p>
                {/* QA round two (Cyber accessibility, Low, 2026-09-06) — these
                    pills are real buttons, so they were already keyboard
                    operable, but selection was carried by colour alone: a
                    screen reader announced eighteen identical "button" names
                    with no way to tell which artefacts were selected. They are
                    toggle buttons, so they take aria-pressed, and the set is
                    named as a group so each pill is announced in the context of
                    its component. */}
                <div
                  role="group"
                  aria-label={`Evidence available for ${c.label}`}
                  className="mt-1 flex flex-wrap gap-2"
                  data-rail-key={c.key} onFocus={() => focusRail(c.key)}
                >
                  {CYBER_EVIDENCE_OPTS.map((opt) => {
                    const selected = (evidence[c.key] || []).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleEvidence(c.key, opt)}
                        className={`text-xs px-3 py-1 rounded-full border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input"}`}
                      >{opt}</button>
                    );
                  })}
                </div>
              </div>

              {c.key === "c1_auth" && (
                <FscrCallout
                  citation="11 CCR § 7123(c)"
                  callouts={cyberFscrCallouts}
                />
              )}
            </div>
          ))}
        </section>

        {/* Cyber master review (2026-09-15, Addition 1) — this intake had no
            review of the answers before payment: only a toast counting
            unrated components. Every answer, every unanswered item and the
            evidence selections are shown back here, grouped by profile and
            by component, with a jump back to each question. */}
        <section className="bg-card border rounded-lg p-6 space-y-4" aria-labelledby="cyber_review_heading">
          <h2 id="cyber_review_heading">Review your answers</h2>
          <p className="text-sm text-muted-foreground">Review all answers and unanswered items before continuing. Use Edit to return to a question. The report analyses the information you provide; an unanswered item is reported as insufficient information, not as a shortfall.</p>
          {(() => {
            const sections = buildCyberReview(intake);
            const unratedList = CONTROLS.filter((c) => !maturity[c.key]);
            const jump = (id: string) => {
              const el = document.getElementById(id);
              if (!el) return;
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.focus({ preventScroll: true });
            };
            const idFor = (sectionStep: number, key: string): string | null => {
              if (sectionStep <= 2) {
                const map: Record<string, string> = {
                  entity_name: "cyber_entity_name", industry: "cyber_industry", incidents_12mo: "cyber_incidents",
                  consumer_notice_status: "cyber_consumer_notice_status", agency_notice_status: "cyber_agency_notice_status",
                  framework: "cyber_framework", last_audit: "cyber_last_audit", q1_revenue: "cyber_q1_revenue",
                  q1_revenue_threshold_check: "cyber_q1_threshold", q1_revenue_reference_year: "cyber_q1_year",
                  q2_consumers: "cyber_q2_consumers", q5_sell_share: "cyber_q5_sell_share", q5c_share_revenue_50pct: "cyber_q5c",
                  q15_sensitive_pi: "cyber_q15", q15c_spi_volume: "cyber_q15c", password_auth_used: "cyber_password_auth_used",
                  audit_scope_rationale: "cyber_scope_rationale", auditor_engagement_status: "cyber_auditor_status",
                  prior_audit_scope: "cyber_prior_scope", remediation_owner: "cyber_remediation_owner",
                };
                return map[key] ?? null;
              }
              const control = CONTROLS[sectionStep - 3];
              if (!control) return null;
              if (key.endsWith(".maturity")) return `maturity_${control.key}`;
              if (key.endsWith(".notes")) return `notes_${control.key}`;
              if (key.endsWith(".na_reason")) return `na_reason_${control.key}`;
              return `maturity_${control.key}`;
            };
            return (
              <>
                <p role="status" className={`text-xs rounded-md border px-3 py-2 ${unratedList.length ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300" : "border-input text-muted-foreground"}`}>
                  {unratedList.length
                    ? `${CYBER_COPY.partialSubmission(unratedList.length)} Unrated: ${unratedList.map((c) => c.label).join("; ")}.`
                    : "All 18 components carry a rating."}
                </p>
                <div className="divide-y rounded-md border">
                  {sections.map((sec) => (
                    <details key={sec.step} className="px-4 py-2" open={sec.step <= 2 || sec.rows.some((r) => r.state === "unanswered")}>
                      <summary className="cursor-pointer text-sm font-medium py-1">
                        {sec.title}
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          {sec.rows.filter((r) => r.state === "unanswered").length ? `${sec.rows.filter((r) => r.state === "unanswered").length} unanswered` : "complete"}
                        </span>
                      </summary>
                      <div className="divide-y text-sm">
                        {sec.rows.map((row) => {
                          const target = idFor(sec.step, row.key);
                          return (
                            <div key={row.key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
                              <div className="text-muted-foreground text-[12px]">{row.label}</div>
                              <div className="sm:col-span-2 break-words text-[13px] flex items-start justify-between gap-3">
                                <span className={row.state === "unanswered" ? "italic text-muted-foreground" : ""}>
                                  {row.state === "unanswered" ? "Not answered" : row.text}
                                  {row.items && row.items.length > 0 && (
                                    <ul className="mt-1 list-disc pl-4 text-[12px] text-muted-foreground">
                                      {row.items.map((it) => <li key={it.label}>{it.label}: {it.text}</li>)}
                                    </ul>
                                  )}
                                </span>
                                {target && <button type="button" className="shrink-0 text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground" onClick={() => jump(target)}>Edit</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </>
            );
          })()}
          <ValidationErrorSummary message={validationError} fieldKey={fieldErrors.fields[0] ?? null} />
        </section>

        <div className="bg-card border rounded-lg p-6 flex justify-end flex-wrap gap-3">
          {isSuite ? (
            /* QA round two (SUITE-B03, High) — the bundle is two assessments.
               Bought from this page alone, both rows were written with the
               Cyber answers. Module 1 is collected before checkout opens. */
            <Button onClick={handleSuiteContinue}>
              {suiteNextStep
                ? `Continue to ${suiteNextStep.label}`
                : `Purchase CPPA Suite ($${suitePricing.price})`}
            </Button>
          ) : (
            <Button onClick={handlePurchase}>
              Run CPPA Cybersecurity Audit Readiness (${displayPrice})
            </Button>
          )}
        </div>
        </div>
        </BenchLayout>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool mapped to CPPA cybersecurity audit regulations. It does not constitute legal or security advice. Output should be reviewed with qualified counsel and your security team.
        </p>

        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-cybersecurity?suite=true" : "/cppa-cybersecurity"} {...intakeGate("cppa_cyber")} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_cybersecurity"}
          userId={user?.id}
          clientId={clientId}
          intakeData={isSuite ? suiteCheckoutIntake(suiteModules) : intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            void clearDraft();
            if (isSuite) clearSuiteHandoff();
            if (isSuite && suiteCyberId) {
              // When entered via /cppa-cybersecurity?suite=true, the risk_id is the
              // first assessment created (stored as id) and cyber_id is suiteCyberId.
              // NOTE: The suite entry point is /cppa-risk-assessment?suite=true, so
              // this branch may not be reached in practice. Navigate safely.
              navigate(`/cppa-suite/result?risk_id=${id}&cyber_id=${suiteCyberId}&purchased=true`);
            } else {
              navigate(`/cppa-cybersecurity/result/${id}?purchased=true`);
            }
          }}
        />
        </>)}
      </main>
      <CPPAToolsCrossLinks current="cyber" />
    <Footer />
    </div>
  );
}
