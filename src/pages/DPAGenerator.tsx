import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

const JURS = ["Germany","France","Ireland","Spain","Italy","Netherlands","United Kingdom","United States","Canada","Australia","Other"];
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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pricing = useToolPrice("dpa_generator");
  const access = useToolAccess({ standalonePrice: pricing.standalonePrice, subscriberPrice: pricing.subscriberPrice });
  const { clientId } = useActiveClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    controllerName: "", controllerJurisdiction: "Germany",
    processorName: "", processorJurisdiction: "Germany",
    services: "", dataCategories: [] as string[],
    dataSubjectCount: "100-10K", retention: "As directed by controller",
    hasSubProcessors: false, subProcessorList: "",
    legalFramework: "GDPR", auditRights: "Standard",
    includeTransferClause: false, transferMechanism: "SCCs",
  });
  const [phase, setPhase] = useState<"sample" | "generating" | "result">("sample");
  const [result, setResult] = useState<string>("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateForm = (): string | null => {
    if (!form.controllerName.trim()) return "Please enter the Controller name.";
    if (!form.processorName.trim()) return "Please enter the Processor name.";
    if (!form.services.trim()) return "Please describe the Services to be provided.";
    if (form.dataCategories.length === 0) return "Please select at least one data category.";
    return null;
  };

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggleCat = (c: string) =>
    setForm(f => ({ ...f, dataCategories: f.dataCategories.includes(c) ? f.dataCategories.filter(x => x !== c) : [...f.dataCategories, c] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const timeout = new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error("Generation timed out. Please try again.")), 100_000)
    );
    const response = await Promise.race([
      supabase.functions.invoke("generate-dpa", { body: { ...form, user_id: access.user?.id, client_id: clientId ?? null } }),
      timeout,
    ]).catch((error) => ({ data: null, error }));
    const { data, error } = response;
    if (error || !data?.dpa_text) {
      const msg = (data as any)?.error || error?.message || "Generation failed. Please try again.";
      setResult(`Generation failed: ${msg}`);
      setPhase("result");
      return;
    }
    setResult(data.dpa_text);
    if (data?.id) { navigate(`/dpa-generator/result/${data.id}`); return; }
    setPhase("result");
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
    <div className="min-h-screen bg-paper">
      <Helmet><title>Your Custom DPA | End User Privacy</title>
        <meta name="description" content="Generate your custom GDPR Article 28-compliant Data Protection Agreement, calibrated to live enforcement precedents." /></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/dpa-generator" />
        <header className="mb-8">
          <h1 className="font-display text-[28px] md:text-[34px] font-extrabold text-navy mb-2">Your Custom DPA</h1>
          <p className="text-slate text-[14px]">Draft your custom GDPR Article 28-compliant controller-processor Data Protection Agreement, with provisions calibrated to recent DPA enforcement decisions.</p>
        </header>

        {phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-display font-bold text-navy text-[18px]">Your Custom DPA — {form.controllerName} / {form.processorName}</h2>
              <CopyButton text={result} />
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">Generated {new Date().toLocaleDateString()} · {form.legalFramework}</p>
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{result}</pre>
            <p className="text-[11px] text-muted-foreground italic mt-4">PDF download coming soon.</p>
            <ToolDisclaimer addition="This draft must not be presented to any counterparty or executed without prior review and approval by licensed legal counsel." />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-navy mb-1">Generating your Custom DPA</p>
            <p className="text-[12px] text-muted-foreground">Reviewing enforcement precedents and drafting provisions — this usually takes 15–25 seconds.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-bold text-navy text-[18px]">DPA Intake</h2>
            <div className="space-y-3 text-[13px]">
              <label className="block"><span className="font-semibold text-navy">Controller name</span>
                <input className="w-full mt-1 border border-border rounded-lg px-3 py-2" placeholder="Acme Corp" value={form.controllerName} onChange={e => setForm(f => ({ ...f, controllerName: e.target.value }))} /></label>
              <label className="block"><span className="font-semibold text-navy">Controller jurisdiction</span>
                <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.controllerJurisdiction} onChange={e => setForm(f => ({ ...f, controllerJurisdiction: e.target.value }))}>
                  {JURS.map(j => <option key={j}>{j}</option>)}</select></label>
              <label className="block"><span className="font-semibold text-navy">Processor name</span>
                <input className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.processorName} onChange={e => setForm(f => ({ ...f, processorName: e.target.value }))} /></label>
              <label className="block"><span className="font-semibold text-navy">Services description</span>
                <textarea className="w-full mt-1 border border-border rounded-lg px-3 py-2" rows={3} value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} /></label>
              <fieldset><legend className="font-semibold text-navy">Data categories</legend>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {DATA_CATS.map(c => <label key={c} className="flex items-center gap-2 text-[12px]">
                    <input type="checkbox" checked={form.dataCategories.includes(c)} onChange={() => toggleCat(c)} />{c}</label>)}
                </div></fieldset>
            </div>
            <div className="border-t border-border pt-4 mt-4 text-[12px] text-muted-foreground">Sample preview:</div>
            <pre className="whitespace-pre-wrap font-sans text-[12px] text-slate leading-relaxed">{SAMPLE}</pre>
            <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
            {validationError && (
              <div className="bg-destructive/10 border border-destructive/25 text-destructive rounded-lg px-3 py-2 text-[13px]" role="alert">
                {validationError}
              </div>
            )}
            <button
              type="button"
              onClick={handlePurchase}
              className="w-full bg-gradient-to-br from-navy to-blue text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-all"
            >
              {access.priceLabel}
            </button>
          </div>
        )}
      </main>
      <ToolCheckoutModal
        open={checkoutOpen}
        toolType="dpa_generator"
        userId={access.user?.id}
        intakeData={form}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) navigate(`/dpa-generator/result/${id}?purchased=true`);
        }}
      />
      <Footer />
    </div>
  );
}
