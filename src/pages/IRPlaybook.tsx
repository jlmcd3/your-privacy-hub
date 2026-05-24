
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import ToolSampleOverlay from "@/components/ToolSampleOverlay";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useActiveClient } from "@/hooks/useActiveClient";
import { supabase } from "@/integrations/supabase/client";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import { toast } from "sonner";
import ToolTierNote from "@/components/tools/ToolTierNote";

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
  const navigate = useNavigate();
  const pricing = useToolPrice("ir_playbook");
  const access = useToolAccess({ standalonePrice: pricing.standalonePrice, subscriberPrice: null });
  const { clientId } = useActiveClient();
  const [phase, setPhase] = useState<"sample" | "form" | "generating" | "result">("sample");
  const [form, setForm] = useState({
    discoveryDateTime: new Date().toISOString().slice(0, 16),
    cause: CAUSES[0], dataTypes: [] as string[], affectedCount: COUNTS[2],
    jurisdictions: [] as string[], processorInvolved: false, processorName: "",
    contained: "Unknown", organisationType: "Company",
  });
  const [result, setResult] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (access.isPremium === true) setPhase("form");
    else if (params.get("session_id") || params.get("purchased")) setPhase("form");
  }, [access.isPremium, params]);

  const toggle = (key: "dataTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
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
    if (error || !data?.playbook_text) { setResult("Generation failed. Please try again."); setPhase("result"); return; }
    setResult(data.playbook_text);
    if (data?.id) { navigate(`/ir-playbook/result/${data.id}`); return; }
    setPhase("result");
  };

  const handlePurchase = async () => {
    logToolAcknowledgment("ir_playbook", access.user?.id ?? null);
    if (access.isPremium) { setPhase("form"); return; }
    if (!access.user) { setAuthGateOpen(true); return; }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Incident Response Playbook | End User Privacy</title>
        <meta name="description" content="A jurisdiction-specific breach response runbook with regulator notification deadlines, DPA portal links, and notification templates — with cited enforcement decisions behind every timeline and threshold recommendation." /></Helmet>
      <Navbar />
      <DashboardSubnav />
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🚨 Breach Response Playbook · ${pricing.price}
          </span>
          <h1 className="font-serif mb-3">Incident Response Playbook</h1>
          <p className="text-slate-300 text-lg max-w-3xl">
            A jurisdiction-specific breach response runbook with regulator notification deadlines, DPA portal links, and stakeholder communication templates — drafted to your incident facts so your team can act inside the 72-hour clock. Generate it the moment you suspect a personal data breach, or keep one on the shelf and ready.
          </p>
        </div>
      </header>
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ActiveClientLabel />
        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/ir-playbook" />
        <div className="mb-4">
          <ToolTierNote />
        </div>

        {phase === "result" ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display text-navy">Your Breach Response Playbook</h2><CopyButton text={result} /></div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{result}</pre>
            <p className="text-meta text-muted-foreground mt-4">This playbook and its documentation checklist (Section 6) contribute to your Article 33(5) accountability record.</p>
            <ToolDisclaimer addition="Regulatory notification deadlines referenced in this document must be independently verified — do not rely on them without confirming current requirements with qualified legal counsel." />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-navy mb-1">Generating your Breach Response Playbook</p>
            <p className="text-meta text-muted-foreground">Checking notification deadlines and enforcement precedents for {form.jurisdictions.join(", ")} — this usually takes 15–20 seconds.</p>
          </div>
        ) : phase === "form" ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-navy">Incident details</h2>
            <label className="block text-sm"><span className="font-semibold text-navy">Date & time of discovery</span>
              <input type="datetime-local" max={new Date().toISOString().slice(0, 16)} className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.discoveryDateTime} onChange={e => setForm(f => ({ ...f, discoveryDateTime: e.target.value }))} /></label>
            <label className="block text-sm"><span className="font-semibold text-navy">Apparent cause</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))}>
                {CAUSES.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-sm"><legend className="font-semibold text-navy">Data types affected</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{DATA_TYPES.map(d => <label key={d} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.dataTypes.includes(d)} onChange={() => toggle("dataTypes", d)} />{d}</label>)}</div></fieldset>
            <label className="block text-sm"><span className="font-semibold text-navy">Affected individuals</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.affectedCount} onChange={e => setForm(f => ({ ...f, affectedCount: e.target.value }))}>
                {COUNTS.map(c => <option key={c}>{c}</option>)}</select></label>
            <fieldset className="text-sm"><legend className="font-semibold text-navy">Jurisdictions</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{JURS.map(j => <label key={j} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggle("jurisdictions", j)} />{j}</label>)}</div></fieldset>
            <label className="block text-sm"><span className="font-semibold text-navy">Contained?</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.contained} onChange={e => setForm(f => ({ ...f, contained: e.target.value }))}>
                <option>Yes</option><option>No</option><option>Unknown</option></select></label>
            <label className="block text-sm"><span className="font-semibold text-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.organisationType} onChange={e => setForm(f => ({ ...f, organisationType: e.target.value }))}>
                {ORG_TYPES.map(o => <option key={o}>{o}</option>)}</select></label>
            <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
            <button onClick={handleGenerate} disabled={form.dataTypes.length === 0 || form.jurisdictions.length === 0}
              className="w-full bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
              Generate playbook</button>
          </div>
        ) : (
          <ToolSampleOverlay
            toolName="Your Breach Response Playbook" priceLabel={access.priceLabel} onPurchase={handlePurchase}
            isFreeForUser={access.isFreeForUser} isPremium={access.isPremium}
          >
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-display text-navy mb-3">Sample playbook preview</h2>
              <pre className="whitespace-pre-wrap font-sans text-meta text-slate leading-relaxed">{SAMPLE}</pre>
            </div>
          </ToolSampleOverlay>
        )}
      </main>
      <ToolCheckoutModal
        open={checkoutOpen}
        toolType="ir_playbook"
        userId={access.user?.id}
        intakeData={form}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) navigate(`/ir-playbook/result/${id}?purchased=true`);
        }}
      />
      <Footer />
    </div>
  );
}
