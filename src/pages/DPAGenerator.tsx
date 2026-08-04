// No statutory rail by design — see intakePolicy.ts. Use ChoiceWithOther + IntakeGuidance.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useActiveClient } from "@/hooks/useActiveClient";
import { supabase } from "@/integrations/supabase/client";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import { INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";

import { JURS_EU, JURS_US, JURS_CANADA, JURS_OTHER, detectDocumentType } from "@/lib/dpaDocumentType";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import ToolAlsoAvailableRow from "@/components/tools/ToolAlsoAvailableRow";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";
import { FileText, Globe } from 'lucide-react';


const DATA_CATS = ["General personal data","Financial / payment data","Location data","Health / medical data","Employee / HR data","Children's data (under 18)","Biometric data","Genetic data","Criminal records"];


const SAMPLE = `1. PARTIES AND RECITALS
1.1 This Data Processing Agreement ("DPA") is entered into between Acme Corp Ltd, a company incorporated in Germany ("Controller"), and CloudOps Services GmbH, a company incorporated in Germany ("Processor").

2. SUBJECT MATTER, NATURE, DURATION AND PURPOSE
2.1 The Processor shall process Personal Data on behalf of the Controller solely for the purpose of providing the Services described in Schedule 1.
2.2 The processing shall continue for the duration of the Master Services Agreement.
2.3 The nature of processing includes collection, storage, retrieval, and deletion as required to deliver the Services.

3. PROCESSOR OBLIGATIONS
3.1 The Processor shall process Personal Data only on documented instructions from the Controller...
[Section 3 onwards continues — full DPA available after generation]`;

export default function DPAGenerator() {
  useToolStartedOnInteraction("dpa");

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pricing = useToolPrice("dpa_generator");
  const access = useToolAccess({ standalonePrice: pricing.standalonePrice, subscriberPrice: pricing.subscriberPrice });
  const { clientId } = useActiveClient();
  const refine = useRefineMode("dpa_generator");
  const [step, setStep] = useState(1);
  // CEO ruling 2026-07-14: legalFramework + includeTransferClause are DERIVED
  // server-side; retention/auditRights/transfer question are ASKED with no
  // default. Fold-in free-text state ("Other: <text>", "Fixed period: <text>")
  // lives alongside the enum selection for the three fold-in fields.
  const [form, setForm] = useState({
    entityName: "",
    controllerName: "", controllerJurisdiction: "Germany",
    processorName: "", processorJurisdiction: "Germany",
    services: "", dataCategories: [] as string[],
    retentionChoice: "" as "" | "As directed by the Controller's documented instructions" | "For the duration of the principal agreement, then delete or return" | "Fixed period — specify",
    retentionFixedText: "",
    hasSubProcessors: false, subProcessorList: "",
    auditRightsChoice: "" as "" | "Documentation review — Processor provides audit reports/certifications on request" | "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice" | "Enhanced — on-site inspection on 30 days' notice plus continuous evidence access" | "Custom — describe",
    auditRightsOtherText: "",
    transfersInvolved: "" as "" | "Yes" | "No",
    transferMechanism: "" as "" | "EU Standard Contractual Clauses (SCCs)" | "UK IDTA / UK Addendum to EU SCCs" | "Binding Corporate Rules" | "Adequacy decision or regulations" | "None in place yet",
  });
  const [phase, setPhase] = useState<"sample" | "generating" | "result">("sample");
  const [result, setResult] = useState<string>("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { user } = useAuth();
  const initialFormRef = useMemo(() => JSON.stringify(form), []);
  const touched = useMemo(() => JSON.stringify(form) !== initialFormRef, [form, initialFormRef]);
  const draftData = useMemo(() => ({ form, step }), [form, step]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage, clearDraft,
  } = useToolDraft({
    toolType: "dpa",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: step,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { form?: any; step?: number } | null;
    if (!d) return;
    if (d.form && typeof d.form === "object") setForm((prev) => ({ ...prev, ...d.form }));
    if (typeof restoreStage === "number") setStep(restoreStage);
    else if (typeof d.step === "number") setStep(d.step);
  };

  const validateForm = (): string | null => {
    if (!form.entityName.trim()) return "Name your organisation.";
    if (!form.controllerName.trim()) return "Name the controller.";
    if (!form.processorName.trim()) return "Name the processor.";
    if (!form.services.trim()) return "Describe the services the processor will provide.";
    if (form.dataCategories.length === 0) return "Select at least one data category.";
    if (!form.retentionChoice) return "Choose what happens to the data at the end of the services.";
    if (form.retentionChoice === "Fixed period — specify" && !form.retentionFixedText.trim()) return "State the fixed retention period.";
    if (!form.auditRightsChoice) return "Choose an audit-rights arrangement.";
    if (form.auditRightsChoice === "Custom — describe" && !form.auditRightsOtherText.trim()) return "Describe the custom audit-rights arrangement.";
    if (!form.transfersInvolved) return "Answer whether the processing involves cross-jurisdiction transfers.";
    if (form.transfersInvolved === "Yes" && !form.transferMechanism) return "Select the transfer mechanism in place.";
    return null;
  };

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggleCat = (c: string) =>
    setForm(f => ({ ...f, dataCategories: f.dataCategories.includes(c) ? f.dataCategories.filter(x => x !== c) : [...f.dataCategories, c] }));

  const buildInvokeBody = () => {
    const retention =
      form.retentionChoice === "Fixed period — specify"
        ? `Fixed period: ${form.retentionFixedText.trim()}`
        : form.retentionChoice;
    const auditRights =
      form.auditRightsChoice === "Custom — describe"
        ? `Other: ${form.auditRightsOtherText.trim()}`
        : form.auditRightsChoice;
    const includeTransferClause = form.transfersInvolved === "Yes";
    const transferMechanism = includeTransferClause ? form.transferMechanism : "";
    return {
      entityName: form.entityName,
      controllerName: form.controllerName,
      controllerJurisdiction: form.controllerJurisdiction,
      processorName: form.processorName,
      processorJurisdiction: form.processorJurisdiction,
      services: form.services,
      dataCategories: form.dataCategories,
      retention,
      hasSubProcessors: form.hasSubProcessors,
      subProcessorList: form.subProcessorList,
      auditRights,
      includeTransferClause,
      transferMechanism,
      documentType: detectDocumentType(form.controllerJurisdiction, form.processorJurisdiction).type,
    };
  };

  const handleGenerate = async () => {
    if (!access.user) { setAuthGateOpen(true); return; }
    setPhase("generating");
    // Create the row first — generate-dpa requires an existing dpa_documents
    // row (assessment_id); raw intake in the body is reserved for the
    // internal payments-webhook path and is rejected with 403.
    const { data: row, error: insErr } = await supabase
      .from("dpa_documents")
      .insert({
        user_id: access.user.id,
        client_id: clientId ?? null,
        status: "pending",
        intake_data: buildInvokeBody(),
        purchased_as_standalone: false,
        is_subscriber_credit: true,
        purchase_price_cents: 0,
      })
      .select("id")
      .single();
    if (insErr || !row) {
      setResult(`Generation failed: ${insErr?.message || "Could not start generation — try again."}`);
      setPhase("result");
      return;
    }
    const timeout = new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error("Generation timed out — try again.")), 100_000)
    );
    const response = await Promise.race([
      supabase.functions.invoke("generate-dpa", { body: { assessment_id: row.id } }),
      timeout,
    ]).catch((error) => ({ data: null, error }));
    const { error } = response as { data: unknown; error: { message?: string } | null };
    if (error) {
      const msg = error?.message || "Generation failed — try again.";
      setResult(`Generation failed: ${msg}`);
      setPhase("result");
      return;
    }
    void clearDraft();
    navigate(`/dpa-generator/result/${row.id}?purchased=true`);
  };


  const handlePurchase = async () => {
    const err = validateForm();
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    logToolAcknowledgment("dpa_generator", access.user?.id ?? null);
    if (access.isFreeForUser) { await handleGenerate(); return; }
    if (!access.user) { setAuthGateOpen(true); return; }
    setCheckoutOpen(true);
  };


  return (
    <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Navbar />
      <DashboardSubnav />
      <Helmet><title>Custom DPA Generator | End User Privacy</title>
        <meta name="description" content="Draft a controller-processor DPA tailored to your jurisdictions — GDPR Article 28, US state processor agreements (CCPA, TDPSA, CTDPA, VCDPA, CPA), Canadian PIPEDA/Law 25, or dual-compliance for cross-border arrangements. Every clause calibrated to enforcement decisions." /></Helmet>      <header className="bg-brand-navy text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            <FileText aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Custom DPA Generator · ${pricing.price}
          </span>
          <h1 className="font-serif text-white mb-3">Custom Data Processing Agreement</h1>
          <RequirementBadge variant="hero" tier="required" text="GDPR Article 28 requires a written data-processing agreement whenever you let a vendor or processor handle personal data on your behalf." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            Draft a controller-processor agreement tailored to your jurisdictions — EU, UK, US state, Canadian, or dual-compliance for cross-border arrangements. Every clause is calibrated to your obligations and the enforcement record.
          </p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <p className="text-slate-400 text-xs italic mt-1 max-w-3xl">Need more? Add 4 additional generations for half the tool price.</p>
          <div className="mt-4"><SampleReportLink toolSlug="dpa" tone="onDark" variant="link" /></div>
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            GDPR Art. 28 · controller-processor terms calibrated to your jurisdictions and the enforcement record
          </p>
        </div>
      </header>
      <ToolAlsoAvailableRow currentTool="dpa" />


      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ActiveClientLabel />
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/dpa-generator" />
        <div className="mb-4">
          <DraftRestoreBanner
            draftFound={draftFound}
            touched={touched}
            draftUpdatedAt={draftUpdatedAt}
            onResume={applyRestore}
            onDiscard={() => { void clearDraft(); }}
          />
        </div>
        {refine.isRefine && refine.intake && !refine.loading ? (
          <RefinePanel
            toolType="dpa_generator"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/dpa-generator/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        ) : phase === "sample" && (() => {
          const sectionNames = ["Controller & Processor", "Services & Data", "Processing Specifics", "Review & Generate"];
          let currentStep = 1;
          if (form.controllerName.trim() && form.processorName.trim()) currentStep = 2;
          if (currentStep === 2 && form.services.trim() && form.dataCategories.length > 0) currentStep = 3;
          if (currentStep === 3 && acknowledged) currentStep = 4;
          return (
            <div className="mb-6 flex items-center gap-3">
              <ol className="flex items-center gap-1.5" aria-label="Intake progress">
                {[1, 2, 3, 4].map(n => (
                  <li
                    key={n}
                    aria-current={n === currentStep ? "step" : undefined}
                    aria-label={`Step ${n} of 4: ${sectionNames[n - 1]}${n === currentStep ? " (current)" : n < currentStep ? " (complete)" : ""}`}
                    className="inline-block rounded-full"
                    style={{
                      width: 8, height: 8,
                      backgroundColor: n <= currentStep ? "hsl(var(--accent))" : "hsl(var(--border))",
                    }}
                  />
                ))}
              </ol>
              <p className="text-meta text-slate-400" aria-live="polite">Step {currentStep} of 4: {sectionNames[currentStep - 1]}</p>

            </div>
          );
        })()}
        <div className="mb-4">
          
        </div>

        {(() => {
        const docType = detectDocumentType(form.controllerJurisdiction, form.processorJurisdiction);
        const disclaimerAddition =
          docType.type === "us-state"
            ? "US state privacy laws vary significantly. This agreement addresses commonly required provisions but may not capture all obligations under every applicable state law. Validate the draft against the requirements of the relevant states before execution."
            : "This draft must not be presented to any counterparty or executed without prior validation against your authoritative records and applicable law.";
        return phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-display text-brand-navy">Your {docType.label}: {form.controllerName} / {form.processorName}</h2>
              <CopyButton text={result} />
            </div>
            <p className="text-meta text-muted-foreground mb-4">Generated {new Date().toLocaleDateString()} · {docType.label} · {form.controllerJurisdiction} / {form.processorJurisdiction}</p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{result}</pre>
            <p className="text-meta text-muted-foreground italic mt-4">PDF download coming soon.</p>
            <ToolDisclaimer addition={disclaimerAddition} />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-brand-navy mb-1">Generating your {docType.label}</p>
            <p className="text-meta text-muted-foreground">Reviewing enforcement precedents and drafting provisions — this usually takes 15–25 seconds.</p>
          </div>
        ) : (

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-brand-navy">Agreement parameters</h2>
            <p className="text-xs font-mono text-muted-foreground">Art. 28 GDPR — controller-processor contracts · Art. 28(3)(a)–(h) — eight mandatory clauses</p>
            <p className="text-sm text-muted-foreground">Each answer below selects clause language rather than describing it. The two jurisdictions decide which regime the document is drafted under, and the retention, audit and transfer answers decide the wording of three clauses Art. 28(3) requires by name.</p>
            <div className="space-y-3 text-sm">
              <RequiredLegend />
              <label className="block"><span className="font-semibold text-brand-navy">Your organisation<Req /></span>
                <span className="block text-meta text-muted-foreground mt-0.5">The party commissioning this draft. It appears on the drafting record, not in the operative clauses.</span>
                <input className="w-full mt-1 border border-border rounded-lg px-3 py-2" placeholder="Legal entity name" value={form.entityName} onChange={e => setForm(f => ({ ...f, entityName: e.target.value }))} autoComplete="organization" /></label>
              <label className="block"><span className="font-semibold text-brand-navy">Controller name<Req /> <DefPopover termKey="gdpr_controller" /> <span className="text-xs text-muted-foreground font-mono">(Art. 4(7) GDPR)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">The party determining the purposes and means. Use the full legal name as it appears on the principal agreement, not a trading name.</span>
                <input className="w-full mt-1 border border-border rounded-lg px-3 py-2" placeholder="Legal entity name" value={form.controllerName} onChange={e => setForm(f => ({ ...f, controllerName: e.target.value }))} /></label>
              <label className="block"><span className="font-semibold text-brand-navy">Controller jurisdiction</span>
                <span className="block text-meta text-muted-foreground mt-0.5">The place of establishment, which sets the governing regime for the draft — EU/UK Art. 28 terms, US state processor terms, or a dual-compliance document.</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.controllerJurisdiction} onChange={e => setForm(f => ({ ...f, controllerJurisdiction: e.target.value }))}>
                  <optgroup label="🇪🇺 EU / EEA / UK">{JURS_EU.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label="🇺🇸 United States">{JURS_US.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label="🇨🇦 Canada">{JURS_CANADA.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label=" Other">{JURS_OTHER.map(j => <option key={j}>{j}</option>)}</optgroup>
                </select></label>
              <label className="block"><span className="font-semibold text-brand-navy">Processor name<Req /> <DefPopover termKey="gdpr_processor" /> <span className="text-xs text-muted-foreground font-mono">(Art. 4(8) GDPR)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">The party processing on the controller's behalf. Name the contracting entity, which is often a subsidiary rather than the group brand.</span>
                <input className="w-full mt-1 border border-border rounded-lg px-3 py-2" placeholder="Legal entity name" value={form.processorName} onChange={e => setForm(f => ({ ...f, processorName: e.target.value }))} /></label>
              <label className="block"><span className="font-semibold text-brand-navy">Processor jurisdiction <DefPopover termKey="gdpr_sccs" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–46 GDPR — transfer mechanism triggered when outside EEA)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">Where this pair of jurisdictions crosses the EEA boundary, the draft carries a Chapter V transfer clause built on the mechanism you select below.</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.processorJurisdiction} onChange={e => setForm(f => ({ ...f, processorJurisdiction: e.target.value }))}>
                  <optgroup label="🇪🇺 EU / EEA / UK">{JURS_EU.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label="🇺🇸 United States">{JURS_US.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label="🇨🇦 Canada">{JURS_CANADA.map(j => <option key={j}>{j}</option>)}</optgroup>
                  <optgroup label=" Other">{JURS_OTHER.map(j => <option key={j}>{j}</option>)}</optgroup>
                </select></label>
              <label className="block"><span className="font-semibold text-brand-navy">Services description<Req /> <DefPopover termKey="gdpr_processor_contract" /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR — subject matter and nature of processing)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">This becomes the subject matter and nature of the processing in the operative clause, so it also bounds the documented instructions. A description that names the operations — hosting, support access, analytics on aggregated output — draws a clearer boundary than a product name.</span>
                <textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2" rows={3} placeholder="Two or three sentences" value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} /></label>

              <fieldset><legend className="font-semibold text-brand-navy">Data categories<Req /></legend>
                <span className="block text-meta text-muted-foreground mt-0.5">These populate the schedule describing the personal data covered. Special-category selections pull additional safeguards into the security clause.</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {DATA_CATS.map(c => <label key={c} className="flex items-center gap-2 text-meta">
                    <input type="checkbox" checked={form.dataCategories.includes(c)} onChange={() => toggleCat(c)} />{c}</label>)}
                </div></fieldset>

              <label className="block"><span className="font-semibold text-brand-navy">Retention and deletion at the end of the services<Req /> <span className="text-xs text-memory text-muted-foreground font-mono">(Art. 28(3)(g) GDPR)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">Art. 28(3)(g) requires the agreement to fix this in advance. "As directed" keeps the choice with the controller at termination; "duration of the principal agreement" ties deletion to that contract ending; a fixed period sets a date the processor can be held to.</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.retentionChoice} onChange={e => setForm(f => ({ ...f, retentionChoice: e.target.value as typeof f.retentionChoice }))}>
                  <option value="">— select an option —</option>
                  <option value="As directed by the Controller's documented instructions">As directed by the Controller's documented instructions</option>
                  <option value="For the duration of the principal agreement, then delete or return">For the duration of the principal agreement, then delete or return</option>
                  <option value="Fixed period — specify">Fixed period — specify</option>
                </select>
                {form.retentionChoice === "Fixed period — specify" && (
                  <input className="w-full mt-2 border border-border rounded-lg px-3 py-2" placeholder="e.g. 24 months from termination" value={form.retentionFixedText} onChange={e => setForm(f => ({ ...f, retentionFixedText: e.target.value }))} />
                )}
              </label>

              <label className="block"><span className="font-semibold text-brand-navy">Audit rights<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3)(h) GDPR)</span></span>
                <span className="block text-meta text-muted-foreground mt-0.5">Art. 28(3)(h) requires the processor to make compliance demonstrable and allow audits. Documentation review relies on the processor's own reports; an annual audit adds a right of inspection; the enhanced option adds notice-based on-site access and continuous evidence. Larger processors frequently negotiate the last one down.</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.auditRightsChoice} onChange={e => setForm(f => ({ ...f, auditRightsChoice: e.target.value as typeof f.auditRightsChoice }))}>
                  <option value="">— select an option —</option>
                  <option value="Documentation review — Processor provides audit reports/certifications on request">Documentation review — Processor provides audit reports/certifications on request</option>
                  <option value="Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice">Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice</option>
                  <option value="Enhanced — on-site inspection on 30 days' notice plus continuous evidence access">Enhanced — on-site inspection on 30 days' notice plus continuous evidence access</option>
                  <option value="Custom — describe">Custom — describe</option>
                </select>
                {form.auditRightsChoice === "Custom — describe" && (
                  <input className="w-full mt-2 border border-border rounded-lg px-3 py-2" placeholder="One or two sentences" value={form.auditRightsOtherText} onChange={e => setForm(f => ({ ...f, auditRightsOtherText: e.target.value }))} />
                )}
              </label>

              <label className="block"><span className="font-semibold text-brand-navy">Does the processing move personal data across the jurisdictions above, or onward to a third country?<Req /></span>
                <span className="block text-meta text-muted-foreground mt-0.5">Remote support access and offshore sub-processors count, not only where the data is stored at rest.</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.transfersInvolved} onChange={e => setForm(f => ({ ...f, transfersInvolved: e.target.value as typeof f.transfersInvolved, transferMechanism: e.target.value === "Yes" ? f.transferMechanism : "" }))}>
                  <option value="">— select an option —</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>

              {form.transfersInvolved === "Yes" && (
                <label className="block"><span className="font-semibold text-brand-navy">Transfer mechanism in place<Req /></span>
                  <span className="block text-meta text-muted-foreground mt-0.5">The mechanism selected here is the one the transfer clause is drafted around. "None in place yet" is a real answer: the draft then carries the clause with the mechanism marked as outstanding rather than asserting cover you do not have.</span>
                  <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.transferMechanism} onChange={e => setForm(f => ({ ...f, transferMechanism: e.target.value as typeof f.transferMechanism }))}>
                    <option value="">— select a mechanism —</option>
                    <option value="EU Standard Contractual Clauses (SCCs)">EU Standard Contractual Clauses (SCCs)</option>
                    <option value="UK IDTA / UK Addendum to EU SCCs">UK IDTA / UK Addendum to EU SCCs</option>
                    <option value="Binding Corporate Rules">Binding Corporate Rules</option>
                    <option value="Adequacy decision or regulations">Adequacy decision or regulations</option>
                    <option value="None in place yet">None in place yet</option>
                  </select>
                </label>
              )}

            </div>
            <div className="border-t border-border pt-4 mt-4 text-meta text-muted-foreground">Sample preview:</div>
            <pre className="whitespace-pre-wrap font-sans text-meta text-slate leading-relaxed">{SAMPLE}</pre>
            <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
            <ValidationErrorSummary message={validationError} />

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
              <span className="font-semibold text-blue-900">Document type: {docType.label}</span>
              <p className="text-blue-700 mt-0.5">{docType.description}</p>
            </div>
            <button
              type="button"
              onClick={handlePurchase}
              className="w-full bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all"
            >
              {access.isFreeForUser ? "Generate (Free)" : `Generate ($${pricing.price})`}
            </button>
          </div>
        );
        })()}
      </main>

      <ToolCheckoutModal
        open={checkoutOpen}
        toolType="dpa_generator"
        userId={access.user?.id}
        clientId={clientId}
        intakeData={buildInvokeBody()}

        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) { void clearDraft(); navigate(`/dpa-generator/result/${id}?purchased=true`); }
        }}
      />
    <Footer />
    </div>
  );
}