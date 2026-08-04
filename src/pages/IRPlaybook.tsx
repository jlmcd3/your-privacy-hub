// No statutory rail by design — see intakePolicy.ts. Use ChoiceWithOther + IntakeGuidance.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { RequirementBadge } from "@/components/RequirementBadge";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import CopyButton from "@/components/CopyButton";
import SampleReportLink from "@/components/SampleReportLink";
import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import ToolSampleOverlay from "@/components/ToolSampleOverlay";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import FreeRunIndicator from "@/components/FreeRunIndicator";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useActiveClient } from "@/hooks/useActiveClient";
import { supabase } from "@/integrations/supabase/client";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import { toast } from "sonner";
import ToolTierNote from "@/components/tools/ToolTierNote";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";
import { Siren } from 'lucide-react';

const CAUSES = ["Unauthorized external access / cyberattack","Ransomware or malware","Phishing / credential compromise","Insider threat","Lost or stolen device","Accidental disclosure","Unknown / still investigating"];
const DATA_TYPES = ["Names and contact details","Financial / payment data","Health / medical records","Government IDs / SSN","Passwords / credentials","Location data","Children's data","Biometric data","Special category data"];
const COUNTS = ["Fewer than 100","100–1,000","1,000–10,000","10,000–100,000","More than 100,000","Unknown"];
const JUR_GROUPS: Array<{ label: string; options: string[] }> = [
  {
    label: "EU / EEA",
    options: [
      "United Kingdom", "Ireland", "France", "Germany", "Spain", "Italy",
      "Netherlands", "Belgium", "Sweden", "Denmark", "Poland", "Greece",
      "Portugal", "Austria", "Finland", "Norway", "Luxembourg", "EU/EEA",
    ],
  },
  {
    label: "US Federal",
    options: ["United States (HIPAA)", "United States (FTC)", "United States (SEC)"],
  },
  {
    label: "US States",
    options: [
      "California", "Texas", "New York", "Connecticut", "Colorado", "Virginia",
      "Florida", "Washington", "Illinois", "Massachusetts", "Oregon", "Other US State",
    ],
  },
  {
    label: "Canada",
    options: [
      "Canada (PIPEDA)", "Quebec (Law 25)", "Alberta (PIPA)",
      "British Columbia (PIPA)", "Ontario (PHIPA)",
    ],
  },
  {
    label: "APAC",
    options: ["Australia", "Singapore", "Japan"],
  },
];
const ORG_TYPES = ["Company","Public authority","Healthcare provider","Financial institution","Other"];

// ITEM 369-IR — the first-hour checklist is CONFIRM/SELECT ONLY. Ids mirror
// FIRST_HOUR_ITEMS in _shared/ltp/ir-playbook-deliverables/standing-playbook.ts;
// the wording of each step lives there and is never authored at intake.
const FIRST_HOUR_CONFIRMATIONS: { id: string; label: string }[] = [
  { id: "fh_activate", label: "Declaring the incident and activating the response team" },
  { id: "fh_clock", label: "Recording the discovery timestamp in UTC and the discoverer" },
  { id: "fh_preserve", label: "Issuing an evidence-preservation and log-retention hold" },
  { id: "fh_isolate", label: "Taking the containment / isolation decision" },
  { id: "fh_counsel", label: "Engaging outside counsel under the privilege protocol" },
  { id: "fh_dpo", label: "Notifying the DPO or nominated contact point" },
  { id: "fh_scope", label: "Opening the scoping question: which data, whose, how many" },
  { id: "fh_insurer", label: "Notifying the insurer within its policy condition" },
];

const SAMPLE = `## 1. IMMEDIATE ACTIONS (0–2 HOURS)
1. Assemble incident response team — IR Lead, DPO, Legal Counsel, Communications, IT Security.
2. Preserve all evidence: server logs, email records, access trails. Do not delete or modify.
3. Contain the incident — isolate affected systems from the network.
4. Document the discovery time (UTC) and identify the discovery point of contact.
[Sections 2–7 available after generation]`;

export default function IRPlaybook() {
  useToolStartedOnInteraction("ir_playbook");

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pricing = useToolPrice("ir_playbook");
  const access = useToolAccess({ standalonePrice: pricing.standalonePrice, subscriberPrice: null });
  const { clientId } = useActiveClient();
  const refine = useRefineMode("ir_playbook");
  const [phase, setPhase] = useState<"sample" | "form" | "generating" | "result">("sample");
  const [form, setForm] = useState({
    organizationName: "",
    discoveryDateTime: new Date().toISOString().slice(0, 16),
    cause: CAUSES[0], dataTypes: [] as string[], affectedCount: COUNTS[2],
    jurisdictions: [] as string[], processorInvolved: false, processorName: "",
    contained: "Unknown", organisationType: "Company",
    // ITEM 312 — Art. 33(3)(a) / Art. 34(3)(a) / Op. 1 awareness inputs.
    encryptionStatus: "Unknown",
    encryptionKeyStatus: "Unknown",
    affectedRecordCount: "",
    affectedDataSubjectCount: "",
    awarenessConfirmed: "Assumed — detection timestamp treated as awareness pending confirmation",
    // ── ITEM 369-IR — STANDING-PLAYBOOK INTAKE (all optional) ──────────
    // Held as raw text in form state and parsed to structured arrays at
    // submit. Every field may be left empty: the standing-playbook builder
    // degrades honestly with a named information_needed rather than
    // inventing a roster, a contact or a deadline.
    activationCriteriaText: "",
    severityMatrixText: "",
    responseTeamRosterText: "",
    outsideCounselName: "",
    outsideCounselContact: "",
    privilegeProtocol: false,
    insurerContact: "",
    forensicVendorContact: "",
    lawEnforcementContact: "",
    keySystemsText: "",
    logSourcesText: "",
    itIsolationAuthority: "",
    breachNoticeContractsText: "",
    firstHourConfirmations: [] as string[],
    nextTabletopDate: "",
  });

  const [result, setResult] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { user } = useAuth();
  const initialFormRef = useMemo(() => JSON.stringify(form), []);
  const touched = useMemo(() => JSON.stringify(form) !== initialFormRef, [form, initialFormRef]);
  const draftData = useMemo(() => ({ form }), [form]);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
  } = useToolDraft({
    toolType: "ir",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: 0,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { form?: any } | null;
    if (!d?.form || typeof d.form !== "object") return;
    setForm((prev) => ({ ...prev, ...d.form }));
  };

  useEffect(() => {
    if (access.isPremium === true) setPhase("form");
    else if (params.get("session_id") || params.get("purchased")) setPhase("form");
  }, [access.isPremium, params]);

  const toggle = (key: "dataTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
    if (!form.organizationName.trim()) {
      toast.error("Organisation required", { description: "Tell us the name of the organisation the playbook is for." });
      return;
    }
    const discoveryDate = new Date(form.discoveryDateTime);
    if (isNaN(discoveryDate.getTime()) || discoveryDate > new Date()) {
      toast.error("Invalid date", {
        description: "The discovery date cannot be in the future. A breach response playbook requires a date when the incident was actually discovered.",
      });
      return;
    }
    logToolAcknowledgment("ir_playbook", access.user?.id ?? null);
    setPhase("generating");
    // ITEM 369-IR — parse the standing-playbook free text into the structured
    // shapes the contract declares. An unparseable or empty field is OMITTED
    // rather than sent as an empty string, so the builder sees absence (and
    // degrades honestly) instead of a blank it might render as content.
    const lines = (t: string) => t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const cols = (t: string, keys: string[]) =>
      lines(t)
        .map((ln) => {
          const parts = ln.split("|").map((x) => x.trim());
          if (parts.filter(Boolean).length === 0) return null;
          const rec: Record<string, string> = {};
          keys.forEach((k, i) => { if (parts[i]) rec[k] = parts[i]; });
          return Object.keys(rec).length ? rec : null;
        })
        .filter(Boolean);
    const omitEmpty = (o: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(o).filter(([, v]) =>
          Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v !== undefined,
        ),
      );
    const {
      activationCriteriaText, severityMatrixText, responseTeamRosterText,
      keySystemsText, logSourcesText, breachNoticeContractsText, ...base
    } = form;
    const standing = omitEmpty({
      activationCriteria: lines(activationCriteriaText),
      severityMatrix: cols(severityMatrixText, ["level", "definition", "escalation"]),
      responseTeamRoster: cols(responseTeamRosterText, ["role", "primary", "alternate"]),
      keySystems: lines(keySystemsText),
      logSources: lines(logSourcesText),
      breachNoticeContracts: cols(breachNoticeContractsText, ["counterparty", "deadline", "clause"]),
    });
    const payload = { ...base, ...standing };
    const { data, error } = await supabase.functions.invoke("generate-ir-playbook", { body: { ...payload, user_id: access.user?.id, client_id: clientId ?? null } });
    if (error || !data?.id) {
      setResult("Generation failed. Please try again.");
      setPhase("result");
      return;
    }
    // Backend returns 202 + { id }; result page polls ir_playbooks.status.
    void clearDraft();
    navigate(`/ir-playbook/result/${data.id}`);
  };

  const handlePurchase = async () => {
    logToolAcknowledgment("ir_playbook", access.user?.id ?? null);
    if (access.isPremium) { setPhase("form"); return; }
    if (!access.user) { setAuthGateOpen(true); return; }
    setCheckoutOpen(true);
  };

  return (
    <WorkspaceLayout>
      <Helmet><title>Incident Response Playbook | End User Privacy</title>
        <meta name="description" content="A jurisdiction-specific breach response runbook with regulator notification deadlines, DPA portal links, and notification templates — with cited enforcement decisions behind every timeline and threshold recommendation." /></Helmet>      <header className="bg-brand-slate-teal text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            <Siren aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Incident Response Playbook · ${pricing.price}
          </span>
          <h1 className="font-serif text-white mb-3">Incident Response Playbook</h1>
          <RequirementBadge variant="hero" tier="supports" text="Breach notification is mandatory under GDPR Articles 33–34 and every U.S. state breach law — and HIPAA, NYDFS, and DORA require a written incident-response plan." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            A jurisdiction-specific breach response runbook with regulator notification deadlines, DPA portal links, and notification templates — cited enforcement decisions included for every deadline and threshold recommendation.
          </p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-xs italic mt-1 max-w-3xl">Need more? Add 4 additional generations for half the tool price.</p>
          <div className="mt-4"><SampleReportLink toolSlug="ir_playbook" tone="onDark" variant="link" /></div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            GDPR Arts. 33–34 · jurisdiction-specific deadlines, portals, and templates ready when the clock starts
          </p>
        </div>
      </header>
      <ToolAlsoAvailableRow currentTool="ir_playbook" />
      <section className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ActiveClientLabel />
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/ir-playbook" />
        <div className="mb-4">
          <ToolTierNote />
        </div>

        {refine.isRefine && refine.intake && !refine.loading ? (
          <RefinePanel
            toolType="ir_playbook"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/ir-playbook/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        ) : phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display text-brand-navy">Your Incident Response Playbook</h2><CopyButton text={result} /></div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{result}</pre>
            <p className="text-meta text-muted-foreground mt-4">This playbook and its documentation checklist (Section 6) contribute to your Article 33(5) accountability record.</p>
            <ToolDisclaimer addition="This playbook is generated for informational purposes and should be reviewed by qualified legal counsel before use in a live incident. Notification deadlines and thresholds are based on publicly available regulatory guidance and may have changed. Verify current requirements with your legal team before filing any regulatory notification." />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-brand-navy mb-1">Generating your Incident Response Playbook</p>
            <p className="text-meta text-muted-foreground">Checking notification deadlines and enforcement precedents for {form.jurisdictions.join(", ")} — this usually takes 15–20 seconds.</p>
          </div>
        ) : phase === "form" ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <DraftRestoreBanner
              draftFound={draftFound}
              touched={touched}
              draftUpdatedAt={draftUpdatedAt}
              onResume={applyRestore}
              onDiscard={() => { void clearDraft(); }}
            />
            <h2 className="font-display text-brand-navy">Incident details</h2>
            <p className="text-xs font-mono text-muted-foreground">Art. 4(12) GDPR — personal data breach · Art. 33 — 72-hour supervisory authority notification · Art. 34 — communication to data subjects</p>
            <RequiredLegend />
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Organisation<Req /></span>
              <input type="text" placeholder="e.g. Acme Retail Ltd" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.organizationName} onChange={e => setForm(f => ({ ...f, organizationName: e.target.value }))} /></label>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Date & time of discovery<Req /></span>
              <input type="datetime-local" max={new Date().toISOString().slice(0, 16)} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.discoveryDateTime} onChange={e => setForm(f => ({ ...f, discoveryDateTime: e.target.value }))} /></label>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Apparent cause <DefPopover termKey="gdpr_personal_data_breach" /> <span className="text-xs text-muted-foreground font-mono">(Art. 4(12) GDPR)</span></span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))}>
                {CAUSES.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-sm"><legend className="font-semibold text-brand-navy">Data types affected<Req /></legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{DATA_TYPES.map(d => <label key={d} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.dataTypes.includes(d)} onChange={() => toggle("dataTypes", d)} />{d}</label>)}</div></fieldset>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Affected individuals</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.affectedCount} onChange={e => setForm(f => ({ ...f, affectedCount: e.target.value }))}>
                {COUNTS.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-sm"><legend className="font-semibold text-brand-navy">Jurisdictions<Req /> <DefPopover termKey="gdpr_breach_notification" /> <span className="text-xs text-muted-foreground font-mono">(Art. 33 GDPR — notify supervisory authority within 72 hours)</span></legend>
              <div className="mt-1 space-y-3">{JUR_GROUPS.map(g => (
                <div key={g.label}>
                  <div className="text-meta font-semibold text-brand-navy/70 uppercase tracking-wide mb-1">{g.label}</div>
                  <div className="grid grid-cols-2 gap-1">{g.options.map(j => <label key={j} className="flex items-center gap-2 text-meta">
                    <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggle("jurisdictions", j)} />{j}</label>)}</div>
                </div>
              ))}</div></fieldset>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Contained?</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.contained} onChange={e => setForm(f => ({ ...f, contained: e.target.value }))}>
                <option>Yes</option><option>No</option><option>Unknown</option></select></label>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.organisationType} onChange={e => setForm(f => ({ ...f, organisationType: e.target.value }))}>
                {ORG_TYPES.map(o => <option key={o}>{o}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm"><span className="font-semibold text-brand-navy">Affected data encrypted? <span className="text-xs text-muted-foreground font-mono">(Art. 34(3)(a))</span></span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.encryptionStatus} onChange={e => setForm(f => ({ ...f, encryptionStatus: e.target.value }))}>
                  <option>All affected data encrypted / rendered unintelligible</option>
                  <option>Some affected data encrypted</option>
                  <option>No affected data encrypted</option>
                  <option>Unknown</option></select></label>
              <label className="block text-sm"><span className="font-semibold text-brand-navy">Encryption key status</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.encryptionKeyStatus} onChange={e => setForm(f => ({ ...f, encryptionKeyStatus: e.target.value }))}>
                  <option>Keys not compromised</option>
                  <option>Keys compromised or possibly compromised</option>
                  <option>Not applicable — no encryption</option>
                  <option>Unknown</option></select></label>
              <label className="block text-sm"><span className="font-semibold text-brand-navy">Approximate number of data subjects <span className="text-xs text-muted-foreground font-mono">(Art. 33(3)(a))</span></span>
                <input type="text" placeholder="e.g. approx. 41,800" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.affectedDataSubjectCount} onChange={e => setForm(f => ({ ...f, affectedDataSubjectCount: e.target.value }))} /></label>
              <label className="block text-sm"><span className="font-semibold text-brand-navy">Approximate number of personal data records <span className="text-xs text-muted-foreground font-mono">(Art. 33(3)(a))</span></span>
                <input type="text" placeholder="e.g. approx. 63,400" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.affectedRecordCount} onChange={e => setForm(f => ({ ...f, affectedRecordCount: e.target.value }))} /></label>
            </div>
            <label className="block text-sm"><span className="font-semibold text-brand-navy">Awareness timestamp status <span className="text-xs text-muted-foreground font-mono">(Art. 33(1) — awareness, not detection, starts the clock)</span></span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.awarenessConfirmed} onChange={e => setForm(f => ({ ...f, awarenessConfirmed: e.target.value }))}>
                <option>Confirmed — discovery timestamp verified as the moment of awareness</option>
                <option>Assumed — detection timestamp treated as awareness pending confirmation</option>
                <option>Unknown</option></select></label>

            {/* ── ITEM 369-IR — STANDING PLAYBOOK (pre-incident) ──────────
                Optional throughout. This intake is written BEFORE any
                incident, which is why the statutory rail applies to it and
                why nothing here blocks generation. */}
            <details className="border border-border rounded-xl p-4">
              <summary className="cursor-pointer font-semibold text-brand-navy text-sm">
                Standing playbook (optional — pre-incident preparation)
              </summary>
              <p className="text-meta text-muted-foreground mt-2 mb-4">
                Anything left blank is recorded as not yet recorded, with the missing item named. Nothing here is invented on your behalf.
              </p>
              <div className="space-y-4">
                <label className="block text-sm"><span className="font-semibold text-brand-navy">Activation criteria</span>
                  <span className="block text-meta text-muted-foreground">One observable event per line.</span>
                  <textarea rows={4} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.activationCriteriaText} onChange={e => setForm(f => ({ ...f, activationCriteriaText: e.target.value }))} /></label>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Severity matrix</span>
                  <span className="block text-meta text-muted-foreground">One level per line: level | definition | escalation consequence</span>
                  <textarea rows={4} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.severityMatrixText} onChange={e => setForm(f => ({ ...f, severityMatrixText: e.target.value }))} /></label>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Response team and alternates</span>
                  <span className="block text-meta text-muted-foreground">One role per line: role | primary (name, title) | alternate (name, title)</span>
                  <textarea rows={5} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.responseTeamRosterText} onChange={e => setForm(f => ({ ...f, responseTeamRosterText: e.target.value }))} /></label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">Outside counsel</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.outsideCounselName} onChange={e => setForm(f => ({ ...f, outsideCounselName: e.target.value }))} /></label>
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">Counsel out-of-hours route</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.outsideCounselContact} onChange={e => setForm(f => ({ ...f, outsideCounselContact: e.target.value }))} /></label>
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">Insurer and notification condition</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.insurerContact} onChange={e => setForm(f => ({ ...f, insurerContact: e.target.value }))} /></label>
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">Forensic vendor and callout window</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.forensicVendorContact} onChange={e => setForm(f => ({ ...f, forensicVendorContact: e.target.value }))} /></label>
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">Law enforcement contact</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.lawEnforcementContact} onChange={e => setForm(f => ({ ...f, lawEnforcementContact: e.target.value }))} /></label>
                  <label className="block text-sm"><span className="font-semibold text-brand-navy">IT isolation authority</span>
                    <input type="text" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.itIsolationAuthority} onChange={e => setForm(f => ({ ...f, itIsolationAuthority: e.target.value }))} /></label>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.privilegeProtocol} onChange={e => setForm(f => ({ ...f, privilegeProtocol: e.target.checked }))} />
                  <span className="font-semibold text-brand-navy">A privilege protocol is in place with counsel</span>
                </label>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Key systems holding personal data</span>
                  <span className="block text-meta text-muted-foreground">One system per line.</span>
                  <textarea rows={3} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.keySystemsText} onChange={e => setForm(f => ({ ...f, keySystemsText: e.target.value }))} /></label>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Log sources</span>
                  <span className="block text-meta text-muted-foreground">One source per line, with its retention period.</span>
                  <textarea rows={3} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.logSourcesText} onChange={e => setForm(f => ({ ...f, logSourcesText: e.target.value }))} /></label>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Contracts carrying breach-notice obligations</span>
                  <span className="block text-meta text-muted-foreground">One contract per line: counterparty | notice deadline | clause reference</span>
                  <textarea rows={4} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.breachNoticeContractsText} onChange={e => setForm(f => ({ ...f, breachNoticeContractsText: e.target.value }))} /></label>

                <fieldset className="text-sm">
                  <legend className="font-semibold text-brand-navy">First-hour checklist — confirm the steps already provided for</legend>
                  <span className="block text-meta text-muted-foreground mb-1">Confirmation only. The checklist items themselves are fixed and are not authored here.</span>
                  <div className="grid sm:grid-cols-2 gap-1 mt-1">
                    {FIRST_HOUR_CONFIRMATIONS.map(o => (
                      <label key={o.id} className="flex items-start gap-2 text-meta">
                        <input type="checkbox" className="mt-1" checked={form.firstHourConfirmations.includes(o.id)}
                          onChange={() => setForm(f => ({ ...f, firstHourConfirmations: f.firstHourConfirmations.includes(o.id) ? f.firstHourConfirmations.filter(x => x !== o.id) : [...f.firstHourConfirmations, o.id] }))} />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block text-sm"><span className="font-semibold text-brand-navy">Next planned tabletop exercise <span className="text-xs text-muted-foreground font-mono">(Art. 32(1)(d))</span></span>
                  <input type="date" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.nextTabletopDate} onChange={e => setForm(f => ({ ...f, nextTabletopDate: e.target.value }))} /></label>
              </div>
            </details>

            <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
            <FreeRunIndicator toolKey="ir_playbook" />
            <button onClick={handleGenerate} disabled={form.dataTypes.length === 0 || form.jurisdictions.length === 0}
              className="w-full bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
              Generate playbook</button>
          </div>
        ) : (
          <ToolSampleOverlay
            toolName="Your Incident Response Playbook" priceLabel={access.priceLabel} onPurchase={handlePurchase}
            isFreeForUser={access.isFreeForUser} isPremium={access.isPremium}
          >
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display text-brand-navy mb-3">Sample playbook preview</h2>
              <pre className="whitespace-pre-wrap font-sans text-meta text-slate leading-relaxed">{SAMPLE}</pre>
            </div>
          </ToolSampleOverlay>
        )}
      </section>
      <ToolCheckoutModal
        open={checkoutOpen}
        toolType="ir_playbook"
        userId={access.user?.id}
        clientId={clientId}
        intakeData={form}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) navigate(`/ir-playbook/result/${id}?purchased=true`);
        }}
      />
    </WorkspaceLayout>
  );
}