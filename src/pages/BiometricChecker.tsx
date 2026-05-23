
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import Footer from "@/components/Footer";
import CopyButton from "@/components/CopyButton";
import ToolDisclaimer from "@/components/ToolDisclaimer";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import AuthGateModal from "@/components/AuthGateModal";
import AssessmentReport from "@/components/AssessmentReport";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useToolAccess } from "@/hooks/useToolAccess";
import { useToolPrice } from "@/hooks/useToolPrice";
import { useActiveClient } from "@/hooks/useActiveClient";
import { supabase } from "@/integrations/supabase/client";

import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import ToolTierNote from "@/components/tools/ToolTierNote";

const TYPES = ["Facial geometry / facial recognition","Fingerprint / palm print","Voiceprint / speaker recognition","Iris or retina scan","Gait analysis","Vein pattern recognition","Other biometric identifier"];
const ORG = ["Employer (employee biometrics)","Consumer app or platform","Healthcare provider","Financial institution / fintech","Security / access control provider","Research organisation","Other"];
const PURPOSE = ["Time & attendance / workforce management","Physical access control","Customer authentication","Surveillance / monitoring","Research or product development","Other"];
const JURS = ["EU / EEA (GDPR)","United Kingdom (UK GDPR)","Illinois, USA (BIPA)","Texas, USA (CUBI)","Washington state, USA","Other US state","United States — Federal (FTC)","Canada (PIPEDA / provincial)","Australia (Privacy Act)"];
const COUNTS = ["Fewer than 500","500-5,000","5,000-50,000","50,000-500,000","More than 500,000"];

export default function BiometricChecker() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // No more anonymous free tier — every analysis requires a signed-in account.
  const access = useToolAccess({ standalonePrice: 49, subscriberPrice: null });
  const pricing = useToolPrice("biometric_checker");
  const { clientId } = useActiveClient();
  const [form, setForm] = useState({
    biometricTypes: [] as string[], orgType: ORG[0], purpose: PURPOSE[0],
    jurisdictions: [] as string[], enrolledCount: COUNTS[1],
  });
  const [phase, setPhase] = useState<"form" | "generating" | "result">("form");
  const [result, setResult] = useState<{ assessment_text: string; bipa_risk: any; jurisdictions_analysed: string[] } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggle = (key: "biometricTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("check-biometric-compliance", { body: { ...form, user_id: access.user?.id, client_id: clientId ?? null } });
    if (error || !data?.assessment_text) {
      setResult({ assessment_text: "Generation failed. Please try again.", bipa_risk: null, jurisdictions_analysed: [] });
      setPhase("result");
      return;
    }
    setResult(data);
    if (data?.id) { navigate(`/biometric-checker/result/${data.id}`); return; }
    setPhase("result");
  };

  const handleAnalyse = async () => {
    logToolAcknowledgment("biometric_checker", access.user?.id ?? null);
    // 1. Require login for everyone
    if (!access.user) { setAuthModalOpen(true); return; }
    // 2. Subscribers with a free run this month — run free
    if (access.isPremium) { handleGenerate(); return; }
    // 3. Otherwise charge per-use ($10 standalone, discounted for subscribers)
    setCheckoutOpen(true);
  };

  const ctaLabel = !access.user
    ? "Sign in to analyse"
    : access.isPremium
      ? "Analyse — free run / subscriber rate"
      : "Analyse — $10";

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Biometric Privacy Compliance Assessment | End User Privacy</title>
        <meta name="description" content="Per-jurisdiction biometric privacy compliance read covering BIPA, CUBI, MHMD, GDPR Article 9 and other regimes — with a litigation risk estimate where it matters." /></Helmet>
      <Navbar />
      <DashboardSubnav />
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🧬 Biometric Compliance Assessment · ${pricing.price}
          </span>
          <h1 className="font-serif mb-3">Biometric Privacy Compliance Assessment</h1>
          <p className="text-slate-300 text-lg max-w-3xl">
            A per-jurisdiction read on your biometric data processing — surfacing the consent, disclosure, and retention obligations that apply under Illinois BIPA, Texas CUBI, Washington MHMD, GDPR Article 9, and other regimes, with a litigation risk estimate where it matters. Run it before deploying facial recognition, fingerprint, voiceprint, or other biometric identifiers.
          </p>
        </div>
      </header>
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ActiveClientLabel />
        <div className="mb-4">
          <ToolTierNote />
        </div>

        {phase === "result" && result ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-display text-navy">Compliance assessment</h2><CopyButton text={result.assessment_text} /></div>
            {result.bipa_risk && (
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-4">
                <h3 className="text-amber-900 mb-2">⚠️ BIPA Litigation Risk Estimate</h3>
                <p className="text-sm text-amber-900">Low end: <strong>${result.bipa_risk.lowEnd.toLocaleString()}</strong> · High end: <strong>${result.bipa_risk.highEnd.toLocaleString()}</strong></p>
                <p className="text-meta text-amber-800 mt-1">{result.bipa_risk.note}</p>
              </div>
            )}
            <AssessmentReport text={result.assessment_text} />
            <p className="text-meta text-muted-foreground">Assessment reflects laws and enforcement as of {new Date().toLocaleDateString()}.</p>
            <ToolDisclaimer />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-navy">Analysing biometric obligations across {form.jurisdictions.join(", ")}…</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <fieldset className="text-sm"><legend className="font-semibold text-navy">Biometric data types</legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{TYPES.map(t => <label key={t} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.biometricTypes.includes(t)} onChange={() => toggle("biometricTypes", t)} />{t}</label>)}</div></fieldset>
            <label className="block text-sm"><span className="font-semibold text-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.orgType} onChange={e => setForm(f => ({ ...f, orgType: e.target.value }))}>
                {ORG.map(o => <option key={o}>{o}</option>)}</select></label>
            <label className="block text-sm"><span className="font-semibold text-navy">Primary purpose</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSE.map(p => <option key={p}>{p}</option>)}</select></label>
            <fieldset className="text-sm"><legend className="font-semibold text-navy">Jurisdictions</legend>
              <div className="grid grid-cols-1 gap-1 mt-1">{JURS.map(j => {
                const isIL = j.includes("Illinois");
                const isWA = j.includes("Washington");
                return <label key={j} className={`flex items-center gap-2 text-meta ${isIL ? "text-amber-900" : ""}`}>
                  <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggle("jurisdictions", j)} />{j}
                  {isIL && <span className="text-meta bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full font-bold">Active litigation risk</span>}
                  {isWA && <span className="text-meta bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">MHMD applies</span>}</label>;
              })}</div>
              {form.jurisdictions.some(j => j.includes("Illinois")) && (
                <p className="mt-2 text-meta text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                  <strong>BIPA — heightened risk.</strong> Illinois requires written consent before collection,
                  a public retention &amp; destruction schedule, and provides a private right of action
                  with statutory damages of $1,000 (negligent) to $5,000 (intentional) per violation.
                </p>
              )}
              {form.jurisdictions.some(j => j.includes("Washington")) && (
                <p className="mt-2 text-meta text-purple-900 bg-purple-50 border border-purple-200 rounded p-2">
                  <strong>Washington MHMD.</strong> If biometric data is used to identify or infer any
                  health condition, the My Health My Data Act applies — separate opt-in consent, a published
                  consumer health data privacy policy, and a private right of action via the WA Consumer Protection Act.
                </p>
              )}
            </fieldset>
            <label className="block text-sm"><span className="font-semibold text-navy">Individuals enrolled</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.enrolledCount} onChange={e => setForm(f => ({ ...f, enrolledCount: e.target.value }))}>
                {COUNTS.map(c => <option key={c}>{c}</option>)}</select></label>

            <div className="border-t border-border pt-4">
              {!access.user ? (
                <p className="text-meta text-muted-foreground mb-3">A free End User Privacy account is required to run any analysis.</p>
              ) : access.isPremium ? (
                <p className="text-meta text-muted-foreground mb-3">You're signed in and ready to run your assessment.</p>
              ) : (
                <p className="text-meta text-muted-foreground mb-3">Analysis is $15 — standard rate for all tiers.</p>
              )}
              <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
              <div className="flex gap-3 flex-wrap mt-4">
                <button onClick={handleAnalyse} disabled={form.biometricTypes.length === 0 || form.jurisdictions.length === 0}
                  className="bg-gradient-to-br from-navy to-blue text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                  {ctaLabel}</button>
                {access.user && !access.isPremium && (
                  <Link to="/subscribe" className="bg-card border border-primary text-primary font-semibold text-sm px-6 py-3 rounded-xl hover:bg-primary/5 no-underline">Subscribe instead →</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <AuthGateModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        heading="Create a free account to run your analysis"
        body="A free End User Privacy account is required to use this tool. Creating one takes under a minute."
        redirectTo="/biometric-checker"
      />
      <ToolCheckoutModal
        open={checkoutOpen}
        toolType="biometric_checker"
        userId={access.user?.id}
        intakeData={form}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) navigate(`/biometric-checker/result/${id}?purchased=true`);
        }}
      />
      <Footer />
    </div>
  );
}
