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
    const { data, error } = await supabase.functions.invoke("generate-ir-playbook", { body: { ...form, user_id: access.user?.id, client_id: clientId ?? null } });
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