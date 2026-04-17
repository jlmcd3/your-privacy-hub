import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import { useToolAccess } from "@/hooks/useToolAccess";
import { supabase } from "@/integrations/supabase/client";

const TYPES = ["Facial geometry / facial recognition","Fingerprint / palm print","Voiceprint / speaker recognition","Iris or retina scan","Gait analysis","Vein pattern recognition","Other biometric identifier"];
const ORG = ["Employer (employee biometrics)","Consumer app or platform","Healthcare provider","Financial institution / fintech","Security / access control provider","Research organisation","Other"];
const PURPOSE = ["Time & attendance / workforce management","Physical access control","Customer authentication","Surveillance / monitoring","Research or product development","Other"];
const JURS = ["EU / EEA (GDPR)","United Kingdom (UK GDPR)","Illinois, USA (BIPA)","Texas, USA (CUBI)","Washington state, USA","Other US state","United States — Federal (FTC)","Canada (PIPEDA / provincial)","Australia (Privacy Act)"];
const COUNTS = ["Fewer than 500","500-5,000","5,000-50,000","50,000-500,000","More than 500,000"];

export default function BiometricChecker() {
  const [params] = useSearchParams();
  const access = useToolAccess({ standalonePrice: 29, subscriberPrice: null, freeJurisdictionLimit: 1 });
  const [form, setForm] = useState({
    biometricTypes: [] as string[], orgType: ORG[0], purpose: PURPOSE[0],
    jurisdictions: [] as string[], enrolledCount: COUNTS[1],
  });
  const [phase, setPhase] = useState<"form" | "generating" | "result">("form");
  const [result, setResult] = useState<{ assessment_text: string; bipa_risk: any; jurisdictions_analysed: string[] } | null>(null);

  const isFree = form.jurisdictions.length <= 1 || access.isPremium === true;

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggle = (key: "biometricTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("check-biometric-compliance", { body: form });
    if (error || !data?.assessment_text) setResult({ assessment_text: "Generation failed. Please try again.", bipa_risk: null, jurisdictions_analysed: [] });
    else setResult(data);
    setPhase("result");
  };

  const handlePurchase = async () => {
    if (isFree) { handleGenerate(); return; }
    const { data } = await supabase.functions.invoke("create-tool-checkout", {
      body: { tool_type: "biometric_checker", user_id: access.user?.id, intake_data: form, return_url: window.location.origin + "/biometric-checker" },
    });
    if (data?.url) window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Biometric Privacy Compliance Checker | EndUserPrivacy</title>
        <meta name="description" content="Check biometric privacy obligations across BIPA, GDPR, and other laws. First jurisdiction always free." /></Helmet>
      <Navbar />
      <main className="max-w-[860px] mx-auto px-4 md:px-8 py-10">
        <header className="mb-8">
          <h1 className="font-display text-[28px] md:text-[34px] font-extrabold text-navy mb-2">Biometric Privacy Compliance Checker</h1>
          <p className="text-slate text-[14px]">Per-jurisdiction compliance assessment for biometric data processing. First jurisdiction free; multi-jurisdiction is $29 or free with Premium.</p>
        </header>

        {phase === "result" && result ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-display font-bold text-navy text-[18px]">Compliance assessment</h2><CopyButton text={result.assessment_text} /></div>
            {result.bipa_risk && (
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-4">
                <h3 className="font-display font-bold text-amber-900 text-[14px] mb-2">⚠️ BIPA Litigation Risk Estimate</h3>
                <p className="text-[13px] text-amber-900">Low end: <strong>${result.bipa_risk.lowEnd.toLocaleString()}</strong> · High end: <strong>${result.bipa_risk.highEnd.toLocaleString()}</strong></p>
                <p className="text-[11px] text-amber-800 mt-1">{result.bipa_risk.note}</p>
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-foreground">{result.assessment_text}</pre>
            <p className="text-[11px] text-muted-foreground">Assessment reflects laws and enforcement as of {new Date().toLocaleDateString()}.</p>
            <ToolDisclaimer />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-navy">Analysing biometric obligations across {form.jurisdictions.join(", ")}…</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <fieldset className="text-[13px]"><legend className="font-semibold text-navy">Biometric data types</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{TYPES.map(t => <label key={t} className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={form.biometricTypes.includes(t)} onChange={() => toggle("biometricTypes", t)} />{t}</label>)}</div></fieldset>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.orgType} onChange={e => setForm(f => ({ ...f, orgType: e.target.value }))}>
                {ORG.map(o => <option key={o}>{o}</option>)}</select></label>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Primary purpose</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSE.map(p => <option key={p}>{p}</option>)}</select></label>
            <fieldset className="text-[13px]"><legend className="font-semibold text-navy">Jurisdictions</legend>
              <div className="grid grid-cols-1 gap-1 mt-1">{JURS.map(j => {
                const isIL = j.includes("Illinois");
                return <label key={j} className={`flex items-center gap-2 text-[12px] ${isIL ? "text-amber-900" : ""}`}>
                  <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggle("jurisdictions", j)} />{j}
                  {isIL && <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-bold">Active litigation risk</span>}</label>;
              })}</div></fieldset>
            <label className="block text-[13px]"><span className="font-semibold text-navy">Individuals enrolled</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.enrolledCount} onChange={e => setForm(f => ({ ...f, enrolledCount: e.target.value }))}>
                {COUNTS.map(c => <option key={c}>{c}</option>)}</select></label>

            <div className="border-t border-border pt-4">
              {form.jurisdictions.length <= 1 ? (
                <p className="text-[12px] text-muted-foreground mb-3">Free analysis — submit to run.</p>
              ) : access.isPremium ? (
                <p className="text-[12px] text-muted-foreground mb-3">Multi-jurisdiction analysis — included with your Premium subscription.</p>
              ) : (
                <p className="text-[12px] text-muted-foreground mb-3">Multi-jurisdiction analysis — $29 · or free with Premium ($20/month).</p>
              )}
              <div className="flex gap-3 flex-wrap">
                <button onClick={handlePurchase} disabled={form.biometricTypes.length === 0 || form.jurisdictions.length === 0}
                  className="bg-gradient-to-br from-navy to-blue text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                  {isFree ? "Analyse — Free" : "Analyse — $29"}</button>
                {!isFree && !access.isPremium && (
                  <Link to="/subscribe" className="bg-card border border-primary text-primary font-semibold text-[14px] px-6 py-3 rounded-xl hover:bg-primary/5 no-underline">Subscribe instead →</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
