// CPPA Cybersecurity Audit Readiness — Module 2 intake. Covers 18 program components.
import { useMemo, useState , useEffect} from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
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
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import SampleReportLink from "@/components/SampleReportLink";
import MethodologyBox from "@/components/cppa/MethodologyBox";
import { INCLUDED_GENERATIONS_COPY, PRICING } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import ToolTierNote from "@/components/tools/ToolTierNote";
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
import { useFscrCallouts } from "@/hooks/useFscrCallouts";
import { FscrCallout } from "@/components/FscrCallout";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";

// RC-C3.CLOSE-1 / RC-FLIP-2 — MATURITY lives in a standalone enums module so
// shared components (refine surface) don't import this page module. Re-export
// kept for any external references to `@/pages/CPPACybersecurity`.
export { MATURITY, CYBER_EVIDENCE_OPTS, CYBER_IN_SCOPE_FRAMEWORKS } from "./CPPACybersecurity.enums";
import { MATURITY, CYBER_EVIDENCE_OPTS, CYBER_IN_SCOPE_FRAMEWORKS } from "./CPPACybersecurity.enums";

type Control = { key: string; label: string; description: string; citation: string };

const CONTROLS: Control[] = [
  { key: "c1_auth", label: "Authentication", description: "MFA (phishing-resistant where used), strong passwords, and controls over who can access PI.", citation: "§ 7123(c)(1)" },
  { key: "c2_encryption", label: "Encryption of personal information", description: "Encryption of personal information at rest and in transit.", citation: "§ 7123(c)(2)" },
  { key: "c3_account_access", label: "Account management and access controls", description: "Least-privilege access, privileged-account limits, account lifecycle, and physical-access restrictions to PI.", citation: "§ 7123(c)(3)" },
  { key: "c4_inventory", label: "Inventory and management of personal information and systems", description: "Inventory of PI, data flows, hardware and software — including cloud and third-party systems.", citation: "§ 7123(c)(4)" },
  { key: "c5_secure_config", label: "Secure configuration of hardware and software", description: "Hardening, patch and change management, and masking — on-prem and cloud.", citation: "§ 7123(c)(5)" },
  { key: "c6_vuln_mgmt", label: "Vulnerability scanning and penetration testing", description: "Internal/external vulnerability scans, penetration testing, and vulnerability disclosure/reporting.", citation: "§ 7123(c)(6)" },
  { key: "c7_audit_logs", label: "Audit-log management", description: "Centralized storage, retention, and monitoring of logs.", citation: "§ 7123(c)(7)" },
  { key: "c8_network_mon", label: "Network monitoring and defenses", description: "Detection and defense against unauthorized access (tools such as IDS/IPS are examples, not mandates).", citation: "§ 7123(c)(8)" },
  { key: "c9_anti_malware", label: "Antivirus and anti-malware protections", description: "Deployment and maintenance of antivirus and anti-malware.", citation: "§ 7123(c)(9)" },
  { key: "c10_segmentation", label: "Segmentation of an information system", description: "Segmentation of information systems (e.g. firewalls, routers, switches).", citation: "§ 7123(c)(10)" },
  { key: "c11_port_protocol", label: "Port and protocol management and protection", description: "Limitation and control of ports, services, and protocols to reduce attack surface.", citation: "§ 7123(c)(11)" },
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
  const headerLabel = isSuite ? "CPPA AUDIT READINESS · FULL SUITE (M1 + M2)" : "CPPA AUDIT READINESS · MODULE 2";
  const displayPrice = activePricing.price;

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const refine = useRefineMode("cppa_cybersecurity");
  const { meter } = useRunMeter("cppa_cybersecurity", refine.assessmentId);
  const [maturity, setMaturity] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string[]>>({});
  const [profile, setProfile] = useState({
    entity_name: "", industry: "", incidents_12mo: "", framework: "", last_audit: "",
    in_scope_frameworks: [] as string[], audit_scope_rationale: "",
  });

  const setM = (k: string, v: string) => setMaturity((s) => ({ ...s, [k]: v }));
  const setN = (k: string, v: string) => setNotes((s) => ({ ...s, [k]: v }));
  const toggleEvidence = (k: string, opt: string) =>
    setEvidence((s) => {
      const cur = s[k] || [];
      return { ...s, [k]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
    });
  const toggleInScopeFramework = (opt: string) =>
    setProfile((p) => {
      const cur = p.in_scope_frameworks || [];
      return { ...p, in_scope_frameworks: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
    });

  const [activeCyberRailKey, setActiveCyberRailKey] = useState<string | null>(null);
  const activeCyberRailEntry: RailEntry | null = activeCyberRailKey ? (CPPA_CYBER_RAIL[activeCyberRailKey] ?? null) : null;
  const focusRail = (key: string) => setActiveCyberRailKey(key);

  // Update the active rail entry as the user scrolls up/down the form.
  useScrollActiveRail(setActiveCyberRailKey);

  const cyberEnforcementSignals = useEnforcementSignals(["authentication", "vulnerability", "incident_response"]);

  const cyberFscrCallouts = useFscrCallouts([
    "11 CCR § 7123(c)(1)",
    "11 CCR § 7123",
  ]);

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
      })),
    }),
    [profile, maturity, notes, evidence]
  );

  const draftData = useMemo(
    () => ({ profile, maturity, notes, evidence }),
    [profile, maturity, notes, evidence],
  );
  const touched = useMemo(
    () => Object.keys(maturity).length > 0 || Object.keys(notes).length > 0 || Object.keys(evidence).length > 0
      || Object.values(profile).some((v) => Array.isArray(v) ? v.length > 0 : (v ?? "").toString().trim() !== ""),
    [profile, maturity, notes, evidence],
  );
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
  } = useToolDraft({
    toolType: "cppa_cybersecurity",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: 0,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { profile?: any; maturity?: any; notes?: any; evidence?: any } | null;
    if (!d) return;
    if (d.profile && typeof d.profile === "object") setProfile((prev) => ({ ...prev, ...d.profile }));
    if (d.maturity && typeof d.maturity === "object") setMaturity(d.maturity);
    if (d.notes && typeof d.notes === "object") setNotes(d.notes);
    if (d.evidence && typeof d.evidence === "object") setEvidence(d.evidence);
  };

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
      toast({ title: "Required", description: "Please complete the profile (entity, industry, incidents, framework, last audit).", variant: "destructive" });
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
      <header className="bg-brand-ocean text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {headerLabel} · ${displayPrice}
          </span>
          <h1 className="text-hero-h1 text-white mb-3">CPPA Cybersecurity Audit Readiness</h1>
          <RequirementBadge variant="hero" tier="conditional" text="If your business clears the CCPA revenue and data-volume thresholds, an independent annual cybersecurity audit is required — first certification due April 1, 2028 for businesses over $100M in revenue." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg">A structured readiness review mapped to the 18 cybersecurity program components in the CPPA's cybersecurity audit regulations. Generates a control-by-control gap report.</p>
          <p className="text-slate-400 text-sm mt-3">Required for businesses processing personal information posing significant risk. Audit cadence begins for the largest businesses in 2026.</p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-xs italic mt-2">
            Built on the CPPA's final regulations and Final Statement of Reasons, paragraph-cited. This tool never invents precedent — where the agency hasn't spoken, it says so.
          </p>
          <div className="mt-4"><SampleReportLink toolSlug="cppa_cyber" tone="onDark" variant="link" /></div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            11 CCR § 7123 · 18-component readiness map for the Apr 1, 2028 independent audit certification
          </p>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          <ToolTierNote isCppa={true} />
        </div>


      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 bg-paper">
        <MethodologyBox
          title="Readiness, not the audit"
          lines={[
            "Maps your program against the 18 components in 11 CCR § 7123(c)(1)–(18).",
            "Produces an audit-readiness gap analysis and evidence checklist.",
            "It is not the independent cybersecurity audit itself — § 7122 requires a qualified, independent auditor; this prepares you for that engagement.",
          ]}
        />
        <IntakeGuidance>For each control, note the specific tools in place, the scope they cover, and any exceptions — separately and concretely. A control marked "in place" with a vague note produces a weaker gap analysis than one described precisely.</IntakeGuidance>
        <ActiveClientLabel />
        <ToolDisclaimer addition="This tool produces a cybersecurity readiness gap analysis against the 18 components enumerated in 11 CCR § 7123(c). It is not a cybersecurity audit, does not satisfy the CPPA's independent-auditor requirement, and is not legal advice. The April 1, 2028 certification requires an independent audit." />
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
          preRunHint="The entity name you set below is fixed once you first generate. Everything else stays editable across your included revision runs."
        />
        <BenchLayout
          toolType="cppa_cyber"
          railEntry={activeCyberRailEntry}
          defaultSourceUrl="https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf"
        >
        <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="">Organization Profile</h2>
          <p className="text-xs font-mono text-muted-foreground -mt-3">11 CCR § 7123 — cybersecurity audit scope and components; § 7124 — annual certification requirement</p>
          <RequiredLegend />
          <div>
            <Label>Entity name<Req /> <span className="text-xs text-muted-foreground">(legal business name as it will appear on the report)</span></Label>
            <input className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.entity_name} onChange={(e) => setProfile({ ...profile, entity_name: e.target.value })} placeholder="e.g., Acme Retail, Inc." autoComplete="organization" />
          </div>
          <div data-rail-key="profile_industry" onFocus={() => focusRail('profile_industry')}>
            <Label>Industry sector<Req /></Label>
            <input className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })} placeholder="e.g. SaaS, healthcare, retail" />
          </div>
          <div>
            <Label>Reportable security incidents in last 12 months<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.incidents_12mo} onChange={(e) => setProfile({ ...profile, incidents_12mo: e.target.value })}>
              <option value="">Select…</option>
              <option>None</option><option>1</option><option>2–5</option><option>More than 5</option>
            </select>
          </div>
          <div>
            <Label>Primary security framework in use<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.framework} onChange={(e) => setProfile({ ...profile, framework: e.target.value })}>
              <option value="">Select…</option>
              <option>NIST CSF</option><option>ISO 27001</option><option>SOC 2</option><option>HITRUST</option><option>PCI DSS</option><option>None / informal</option><option>Other</option>
            </select>
          </div>
          <div data-rail-key="profile_audit" onFocus={() => focusRail('profile_audit')}>
            <Label>Last independent security audit<Req /></Label>
            <select className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background" value={profile.last_audit} onChange={(e) => setProfile({ ...profile, last_audit: e.target.value })}>
              <option value="">Select…</option>
              <option>Within 12 months</option><option>12–24 months ago</option><option>Over 24 months ago</option><option>Never</option>
            </select>
          </div>
        </section>

        <section className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="">18 Cybersecurity Program Components</h2>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">11 CCR § 7123(c)(1)–(18) — enumerated program components</p>
            <p className="text-sm text-muted-foreground mt-1">Rate each control against the CPPA's enumerated program components.</p>
          </div>

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
                  <Label className="text-xs">Maturity<Req /></Label>
                  <select data-rail-key={c.key} onFocus={() => focusRail(c.key)} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={maturity[c.key] || ""} onChange={(e) => setM(c.key, e.target.value)}>
                    <option value="">Select…</option>
                    {MATURITY.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea rows={2} value={notes[c.key] || ""} onChange={(e) => setN(c.key, e.target.value)} className="mt-1" placeholder="Tools, scope, exceptions…" />
                </div>
              </div>
              {c.key === "c1_auth" && (
                <FscrCallout
                  citation="11 CCR § 7123(c)(1)"
                  callouts={cyberFscrCallouts}
                />
              )}
            </div>
          ))}
        </section>

        <div className="bg-card border rounded-lg p-6 flex justify-end flex-wrap gap-3">
          {isSuite ? (
            <Button onClick={() => { if (!allComplete) { toast({ title: "Required", description: "Please complete the profile (entity, industry, incidents, framework, last audit).", variant: "destructive" }); return; } notifyUnassessed(); if (!user) { setAuthGateOpen(true); return; } setCheckoutOpen(true); }}>
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
