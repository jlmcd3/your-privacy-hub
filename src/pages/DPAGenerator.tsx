import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import ToolSampleOverlay from "@/components/ToolSampleOverlay";
import { useToolAccess } from "@/hooks/useToolAccess";
import { supabase } from "@/integrations/supabase/client";

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
  const access = useToolAccess({ standalonePrice: 69, subscriberPrice: 39 });
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

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggleCat = (c: string) =>
    setForm(f => ({ ...f, dataCategories: f.dataCategories.includes(c) ? f.dataCategories.filter(x => x !== c) : [...f.dataCategories, c] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("generate-dpa", { body: form });
    if (error || !data?.dpa_text) { setResult("Generation failed. Please try again."); }
    else setResult(data.dpa_text);
    setPhase("result");
  };

  const handlePurchase = async () => {
    if (access.isFreeForUser || access.isPremium) { setPhase("generating"); handleGenerate(); return; }
    const { data } = await supabase.functions.invoke("create-tool-checkout", {
      body: { tool_type: "dpa_generator", user_id: access.user?.id, intake_data: form, return_url: window.location.origin + "/dpa-generator" },
    });
    if (data?.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>DPA Generator | EndUserPrivacy</title>
        <meta name="description" content="Generate a GDPR Article 28-compliant Data Processing Agreement, calibrated to live enforcement precedents." /></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="font-display text-[28px] md:text-[34px] font-extrabold text-navy mb-2">DPA Generator</h1>
          <p className="text-slate text-[14px]">Draft a GDPR Article 28-compliant controller-processor Data Processing Agreement, with provisions calibrated to recent DPA enforcement decisions.</p>
        </header>

        {phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-display font-bold text-navy text-[18px]">Data Processing Agreement — {form.controllerName} / {form.processorName}</h2>
              <CopyButton text={result} />
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">Generated {new Date().toLocaleDateString()} · {form.legalFramework}</p>
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{result}</pre>
            <p className="text-[11px] text-muted-foreground italic mt-4">PDF download coming soon.</p>
            <ToolDisclaimer />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-navy mb-1">Generating your Data Processing Agreement</p>
            <p className="text-[12px] text-muted-foreground">Reviewing enforcement precedents and drafting provisions — this usually takes 15–25 seconds.</p>
          </div>
        ) : (
          <ToolSampleOverlay
            toolName="DPA Generator" priceLabel={access.priceLabel} onPurchase={handlePurchase}
            isFreeForUser={access.isFreeForUser} isPremium={access.isPremium}
            subscriberPrice={access.subscriberPrice} standalonePrice={access.standalonePrice}
          >
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Step {step} of 4</div>
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
            </div>
          </ToolSampleOverlay>
        )}
      </main>
      <Footer />
    </div>
  );
}
