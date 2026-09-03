// CPPA Cybersecurity Audit Readiness — Module 2 intake. Covers 18 program components.
import { useMemo, useState , useEffect} from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
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
    // DOC 159 — § 7123(e)(9)/(10); asked only when an incident is reported.
    incident_notifications: "",
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
  const toggleEvidence = (k: string, opt: string) =>
    setEvidence((s) => {
      const cur = s[k] || [];
      return { ...s, [k]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
    });
  const toggleInScopeFramework = (opt: string) => {
    setInScopeTouched(true);
    setProfile((p) => {
      const cur = p.in_scope_frameworks || [];
      return { ...p, in_scope_frameworks: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
    });
  };

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
  const profileComplete = useMemo(
    () => !!(profile.entity_name.trim() && profile.industry && profile.incidents_12mo && profile.framework && profile.last_audit),
    [profile]
  );
  const unassessedCount = useMemo(
    () => CONTROLS.filter((c) => !maturity[c.key]).length,
    [maturity]
  );
  const allComplete = profileComplete;

  const intake = useMemo(
    () => ({
      profile,
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
    [profile, maturity, notes, evidence, naReason]
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
      toast({
        title: "Partial submission",
        description: `${unassessedCount} of 18 controls left unassessed — they will be reported as "insufficient information" and you can supply them later.`,
      });
    }
  };

  const handlePurchase = () => {
    if (!allComplete) {
      toast({ title: "Required", description: "Complete the organization profile: entity name, industry, incidents, framework, and last audit.", variant: "destructive" });
      return;
    }
    notifyUnassessed();
    if (!user) { setAuthGateOpen(true); return; }
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
          primaryLabel={isSuite ? "Start Full Audit Suite" : "Start Cybersecurity Readiness Assessment"}
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
            body: "Businesses that clear the CCPA revenue and data-volume thresholds may be subject to an independent annual cybersecurity audit. For businesses over $100M in revenue, the first certification is due Apr. 1, 2028.",
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
          preRunHint="Entity name locks after the first generation; other answers remain editable across included generations."
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
          <p className="text-sm text-muted-foreground">These five facts set the audit perimeter. They name the entity that owes the duty, the threat context each component finding is weighed against, and the audit history the readiness report starts from.</p>
          <RequiredLegend />
          <div data-rail-key="entity_name" onFocus={() => focusRail('entity_name')}>
            <Label htmlFor="cyber_entity_name">Entity name<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">The legal entity that owes the audit duty — this name carries onto the report and any downstream certification.</p>
            <input id="cyber_entity_name" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.entity_name} onChange={(e) => setProfile({ ...profile, entity_name: e.target.value })} placeholder="Legal entity name" autoComplete="organization" />
          </div>
          <div data-rail-key="profile_industry" onFocus={() => focusRail('profile_industry')}>
            <Label htmlFor="cyber_industry">Industry sector<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">The sector of the operations in scope, which sets the threat context the eighteen component findings are read against.</p>
            <input id="cyber_industry" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} placeholder="Sector" />
          </div>
          <div data-rail-key="incidents_12mo" onFocus={() => focusRail('incidents_12mo')}>
            <Label htmlFor="cyber_incidents">Reportable security incidents in the last 12 months<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">Count from the incident register, using the severity threshold your response plan applies. § 7123(c)(17) reaches incidents in the audit period.</p>
            <select id="cyber_incidents" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.incidents_12mo} onChange={(e) => setProfile({ ...profile, incidents_12mo: e.target.value })}>
              <option value="">Select…</option>
              <option value="None">None</option>
              <option value="1">1</option>
              <option value="2–5">2–5</option>
              <option value="More than 5">More than 5</option>
            </select>
          </div>
          {/* DOC 159 (2026-09-03) — 11 CCR § 7123(e)(9)/(10): the audit report
              must include a sample copy or description of any consumer
              notification under Civ. Code § 1798.82(a) and of any required
              agency notification. Asked only once an incident is reported;
              the deterministic path never infers it from the count. */}
          {profile.incidents_12mo && profile.incidents_12mo !== "None" && (
            <div data-rail-key="incident_notifications" onFocus={() => focusRail('incident_notifications')}>
              <Label htmlFor="cyber_incident_notifications">Did any of those incidents require notification to affected consumers or to an agency?<Req /></Label>
              <p className="text-xs text-muted-foreground mt-1">Why we ask: 11 CCR § 7123(e)(9) and (e)(10) require the audit report to include a sample copy or a description of any consumer notification made under Civ. Code § 1798.82(a) and of any required agency notification. Answer from the incident register, not from memory.</p>
              <select id="cyber_incident_notifications" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.incident_notifications} onChange={(e) => setProfile({ ...profile, incident_notifications: e.target.value })}>
                <option value="">Select…</option>
                {CYBER_INCIDENT_NOTIFICATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          <div data-rail-key="framework" onFocus={() => focusRail('framework')}>
            <Label htmlFor="cyber_framework">Primary security framework in use<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">The framework the program is actually run against today, not one the organization intends to adopt.</p>
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
          <div data-rail-key="profile_audit" onFocus={() => focusRail('profile_audit')}>
            <Label htmlFor="cyber_last_audit">Last independent security audit<Req /></Label>
            <p className="text-xs text-muted-foreground mt-1">An audit performed by someone outside the team that runs the program. Internal self-review is not an independent audit for this purpose.</p>
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
          <p className="text-xs text-muted-foreground -mt-2">These answers determine whether 11 CCR § 7120 requires this business to complete a cybersecurity audit at all. Left blank, the report states the applicability question as unresolved rather than assuming an answer.</p>
          <div data-rail-key="q1_revenue" onFocus={() => focusRail('q1_revenue')}>
            <Label htmlFor="cyber_q1_revenue">What is your business's annual gross revenue? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(A))</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Total worldwide gross revenue from all sources — not just California.</p>
            <select id="cyber_q1_revenue" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q1_revenue} onChange={(e) => setProfile({ ...profile, q1_revenue: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_REVENUE_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div data-rail-key="q2_consumers" onFocus={() => focusRail('q2_consumers')}>
            <Label htmlFor="cyber_q2_consumers">How many California consumers' personal information do you process in a year? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(A))</span></Label>
            <p className="text-xs text-muted-foreground mt-1">Your best estimate of distinct California residents across all processing.</p>
            <select id="cyber_q2_consumers" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q2_consumers} onChange={(e) => setProfile({ ...profile, q2_consumers: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_CONSUMER_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div data-rail-key="q5_sell_share" onFocus={() => focusRail('q5_sell_share')}>
            <Label htmlFor="cyber_q5_sell_share">Do you sell or share personal information for cross-context behavioural advertising?</Label>
            <p className="text-xs text-muted-foreground mt-1">"Sell" and "share" have specific CCPA meanings.</p>
            <select id="cyber_q5_sell_share" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q5_sell_share} onChange={(e) => setProfile({ ...profile, q5_sell_share: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_SELL_SHARE_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {profile.q5_sell_share && profile.q5_sell_share !== "No" && (
            <div data-rail-key="q5c_share_revenue_50pct" onFocus={() => focusRail('q5c_share_revenue_50pct')}>
              <Label htmlFor="cyber_q5c">Does 50% or more of your annual gross revenue derive from selling or sharing personal information? <span className="text-xs text-muted-foreground font-mono">(§ 1798.140(d)(1)(C) / 11 CCR § 7120(b)(1))</span></Label>
              <p className="text-xs text-muted-foreground mt-1">Optional — this feeds the covered-business test for the § 7120(b)(1) 50%-revenue prong. Skip if you're unsure or the number isn't material.</p>
              <select id="cyber_q5c" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q5c_share_revenue_50pct} onChange={(e) => setProfile({ ...profile, q5c_share_revenue_50pct: e.target.value })}>
                <option value="">Select…</option>
                {CYBER_SHARE_REVENUE_50PCT_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          <div data-rail-key="q15_sensitive_pi" onFocus={() => focusRail('q15_sensitive_pi')}>
            <Label htmlFor="cyber_q15">Do you process any sensitive PI?</Label>
            <p className="text-xs text-muted-foreground mt-1">Sensitive PI includes health, precise location, race, and more.</p>
            <select id="cyber_q15" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.q15_sensitive_pi} onChange={(e) => setProfile({ ...profile, q15_sensitive_pi: e.target.value })}>
              <option value="">Select…</option>
              {CYBER_SENSITIVE_PI_OPTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {profile.q15_sensitive_pi === "Yes" && (
            <div data-rail-key="q15c_spi_volume" onFocus={() => focusRail('q15c_spi_volume')}>
              <Label htmlFor="cyber_q15c">For how many California consumers do you process sensitive personal information annually? <span className="text-xs text-muted-foreground font-mono">(§ 7120(b)(2)(B))</span></Label>
              <p className="text-xs text-muted-foreground mt-1">Optional — this feeds the § 7120(b)(2)(B) SPI-volume cyber-audit prong. Give your best estimate for the distinct California residents whose SPI you process in a year.</p>
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
            {inScopePrefilled && !inScopeTouched ? (
              <p className="text-xs text-muted-foreground mt-1">We have carried your primary framework over. Confirm it, and add any other framework whose existing evidence this audit will lean on. Left blank, the report treats the audit as standing alone and credits no prior framework work. Why we ask: § 7123(f) lets an audit leverage work already done under another framework, but only for what that framework actually covered.</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Pick every framework whose existing evidence this audit will lean on. Left blank, the report treats the audit as standing alone and credits no prior framework work. Why we ask: § 7123(f) lets an audit leverage work already done under another framework, but only for what that framework actually covered.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {CYBER_IN_SCOPE_FRAMEWORKS.map((opt) => {
                const selected = profile.in_scope_frameworks.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
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
            <p className="text-xs text-muted-foreground mt-1">Name the person or role accountable for closing what the audit finds. Left blank, the report assigns no owner and records remediation ownership as unstated. Why we ask: findings without a named owner are the most common reason remediation stalls, and an auditor will ask who is accountable.</p>
            <Textarea id="cyber_remediation_owner" rows={2} value={profile.remediation_owner} onChange={(e) => setProfile({ ...profile, remediation_owner: e.target.value })} className="mt-2" placeholder="Name or role, e.g. VP Security Engineering" />
          </div>



        </section>


        <section className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="">The eighteen cybersecurity program components</h2>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7123(c)(1)–(18) — enumerated program components</p>
            <p className="text-sm text-muted-foreground mt-1">Each component becomes one finding in the readiness report. Rate what is running today; a component left unrated is reported as insufficient information rather than as a shortfall.</p>
          </div>
          <IntakeGuidance>For stronger findings, name the tools in place, the scope they cover, and any exceptions. Specific evidence produces a stronger gap analysis than a vague "in place" rating. Select "Not applicable to our information system" only for a component that cannot apply to the systems that process personal information (for example, secure development where the Company writes no software), and say why: the auditor makes the final applicability determination under 11 CCR § 7123(b)(2), and the report records your position for it.</IntakeGuidance>

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
                  <Label className="text-xs" htmlFor={`maturity_${c.key}`}>Maturity<Req /></Label>
                  {/* INTAKE-4b wording pass — framing text only; the rung
                      definitions in MATURITY are stored values and unchanged. */}
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rate what is running today, not what is designed or planned. Why we ask: the audit records the programme as it stands, and an overstated rating is the finding an auditor tests first.</p>
                  <select id={`maturity_${c.key}`} data-rail-key={c.key} onFocus={() => focusRail(c.key)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={maturity[c.key] || ""} onChange={(e) => setM(c.key, e.target.value)}>
                    <option value="">Select…</option>
                    {MATURITY.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {/* DOC 159 — the § 7123(b)(2) basis, shown only beside the
                      not-applicable selection. */}
                  {maturity[c.key] === CYBER_NOT_APPLICABLE_MATURITY && (
                    <div className="mt-2" data-rail-key="component_not_applicable" onFocus={() => focusRail('component_not_applicable')}>
                      <Label className="text-xs" htmlFor={`na_reason_${c.key}`}>Why does this component not apply to your information system?<Req /></Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">The information system includes every resource organized for processing personal information, owned or not (11 CCR § 7001(t)). State the fact that takes this component outside it; the auditor confirms the position.</p>
                      <Textarea id={`na_reason_${c.key}`} rows={2} value={naReason[c.key] || ""} onChange={(e) => setNa(c.key, e.target.value)} className="mt-1" placeholder="One or two sentences stating the fact" />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`notes_${c.key}`}>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.notesHint ?? "Name the tool, the estate it covers, and any carve-out. Left blank, the finding rests on the rating alone."}</p>
                  <Textarea id={`notes_${c.key}`} rows={2} value={notes[c.key] || ""} onChange={(e) => setN(c.key, e.target.value)} className="mt-1" placeholder="Tool, scope, exceptions" />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs">Evidence available <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">{c.evidenceHint ?? "Select every artefact an auditor could test for this component. Left blank, the evidence checklist records nothing on file for it."}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {CYBER_EVIDENCE_OPTS.map((opt) => {
                    const selected = (evidence[c.key] || []).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
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

        <div className="bg-card border rounded-lg p-6 flex justify-end flex-wrap gap-3">
          {isSuite ? (
            <Button onClick={() => { if (!allComplete) { toast({ title: "Required", description: "Complete the organization profile: entity name, industry, incidents, framework, and last audit.", variant: "destructive" }); return; } notifyUnassessed(); if (!user) { setAuthGateOpen(true); return; } setCheckoutOpen(true); }}>
              Purchase CPPA Suite (${suitePricing.price})
            </Button>
          ) : (
            <Button onClick={handlePurchase}>
              Run Cybersecurity Readiness (${displayPrice})
            </Button>
          )}
        </div>
        </div>
        </BenchLayout>

        <p className="text-xs text-muted-foreground italic">
          This is a compliance framework tool mapped to CPPA cybersecurity audit regulations. It does not constitute legal or security advice. Output should be reviewed with qualified counsel and your security team.
        </p>

        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={isSuite ? "/cppa-cybersecurity?suite=true" : "/cppa-cybersecurity"} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType={isSuite ? "cppa_suite" : "cppa_cybersecurity"}
          userId={user?.id}
          clientId={clientId}
          intakeData={intake}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id, suiteCyberId) => {
            setCheckoutOpen(false);
            if (!id) return;
            void clearDraft();
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
