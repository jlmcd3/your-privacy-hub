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

const CAUSES = ["Unauthorized external access / cyberattack","Ransomware or malware","Phishing / credential compromise","Insider threat","Lost or stolen device","Accidental disclosure","Unknown / still investigating"];
const DATA_TYPES = ["Names and contact details","Financial / payment data","Health / medical records","Government IDs / SSN","Passwords / credentials","Location data","Children's data","Biometric data","Special category data"];
const COUNTS = ["Fewer than 100","100–1,000","1,000–10,000","10,000–100,000","More than 100,000","Unknown"];
const JURS = ["United Kingdom","Ireland","France","Germany","Spain","Italy","Netherlands","Belgium","Sweden","Denmark","Poland","United States (HIPAA)","United States (FTC)","EU/EEA"];
const ORG_TYPES = ["Company","Public authority","Healthcare provider","Financial institution","Other"];

const SAMPLE = `## 1. IMMEDIATE ACTIONS (0–2 HOURS)
1. Assemble incident response team — IR Lead, DPO, Legal Counsel, Communications, IT Security.
2. Preserve all evidence: server logs, email records, access trails. Do not delete or modify.
3. Contain the incident — isolate affected systems from the network.
4. Document the discovery time (UTC) and identify the discovery point of contact.
[Sections 2–7 available after generation]`;

export default function IRPlaybook() {
  const [params] = useSearchParams();
  const access = useToolAccess({ standalonePrice: 39, subscriberPrice: null });
  const [phase, setPhase] = useState<"sample" | "form" | "generating" | "result">("sample");
  const [form, setForm] = useState({
    discoveryDateTime: new Date().toISOString().slice(0, 16),
    cause: CAUSES[0], dataTypes: [] as string[], affectedCount: COUNTS[2],
    jurisdictions: [] as string[], processorInvolved: false, processorName: "",
    contained: "Unknown", organisationType: "Company",
  });
  const [result, setResult] = useState("");

  useEffect(() => {
    if (access.isPremium === true) setPhase("form");
    else if (params.get("session_id") || params.get("purchased")) setPhase("form");
  }, [access.isPremium, params]);

  const toggle = (key: "dataTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("generate-ir-playbook", { body: form });
    setResult(error || !data?.playbook_text ? "Generation failed. Please try again." : data.playbook_text);
    setPhase("result");
  };

  const handlePurchase = async () => {
    if (access.isPremium) { setPhase("form"); return; }
    const { data } = await supabase.functions.invoke("create-tool-checkout", {
      body: { tool_type: "ir_playbook", user_id: access.user?.id, intake_data: form, return_url: window.location.origin + "/ir-playbook" },
    });
    if (data?.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Incident Response Playbook Generator | EndUserPrivacy</title>
        <meta name="description" content="Generate a complete data breach response playbook with notification deadlines, DPA portal links, and templates." /></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        <header className="mb-8">
          <h1 className="font-display text-[28px] md:text-[34px] font-extrabold text-navy mb-2">Incident Response Playbook</h1>
          <p className="text-slate text-[14px]">Generate a complete, jurisdiction-specific breach response playbook with notification deadlines and templates.</p>
        </header>

        {phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display font-bold text-navy text-[18px]">Incident Response Playbook</h2><CopyButton text={result} /></div>
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{result}</pre>
            <p className="text-[12px] text-muted-foreground mt-4">This playbook and its documentation checklist (Section 6) contribute to your Article 33(5) accountability record.</p>
            <ToolDisclaimer />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-navy mb-1">Generating your Incident Response Playbook</p>
            <p className="text-[12px] text-muted-foreground">Checking notification deadlines and enforcement precedents for {form.jurisdictions.join(", ")} — this usually takes 15–20 seconds.</p>
          </div>
        ) : phase === "form" ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="font-display font-bold text-navy text-[18px]">Incident details</h2>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Date & time of discovery</span>
              <input type="datetime-local" className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.discoveryDateTime} onChange={e => setForm(f => ({ ...f, discoveryDateTime: e.target.value }))} /></label>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Apparent cause</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))}>
                {CAUSES.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-[13px]"><legend className="font-semibold text-navy">Data types affected</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{DATA_TYPES.map(d => <label key={d} className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={form.dataTypes.includes(d)} onChange={() => toggle("dataTypes", d)} />{d}</label>)}</div></fieldset>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Affected individuals</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.affectedCount} onChange={e => setForm(f => ({ ...f, affectedCount: e.target.value }))}>
                {COUNTS.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-[13px]"><legend className="font-semibold text-navy">Jurisdictions</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{JURS.map(j => <label key={j} className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggle("jurisdictions", j)} />{j}</label>)}</div></fieldset>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Contained?</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.contained} onChange={e => setForm(f => ({ ...f, contained: e.target.value }))}>
                <option>Yes</option><option>No</option><option>Unknown</option></select></label>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.organisationType} onChange={e => setForm(f => ({ ...f, organisationType: e.target.value }))}>
                {ORG_TYPES.map(o => <option key={o}>{o}</option>)}</select></label>
            <button onClick={handleGenerate} disabled={form.dataTypes.length === 0 || form.jurisdictions.length === 0}
              className="w-full bg-gradient-to-br from-navy to-blue text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
              Generate playbook</button>
          </div>
        ) : (
          <ToolSampleOverlay
            toolName="IR Playbook Generator" priceLabel={access.priceLabel} onPurchase={handlePurchase}
            isFreeForUser={access.isFreeForUser} isPremium={access.isPremium}
            subscriberPrice={access.subscriberPrice} standalonePrice={access.standalonePrice}
          >
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display font-bold text-navy text-[16px] mb-3">Sample playbook preview</h2>
              <pre className="whitespace-pre-wrap font-sans text-[12px] text-slate leading-relaxed">{SAMPLE}</pre>
            </div>
          </ToolSampleOverlay>
        )}
      </main>
      <Footer />
    </div>
  );
}
