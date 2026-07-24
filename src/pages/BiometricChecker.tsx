
import { PRICING, INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { RequirementBadge } from "@/components/RequirementBadge";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import CopyButton from "@/components/CopyButton";
import ToolCTABlock from "@/components/ToolCTABlock";
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
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import StatuteRail, { type RailEntry } from "@/components/intake/StatuteRail";
import IntakeMasthead from "@/components/intake/IntakeMasthead";
import BenchLayout from "@/components/intake/BenchLayout";
import { useRunMeter } from "@/hooks/useRunMeter";
import { BIOMETRIC_RAIL } from "@/components/biometric/BiometricRailEntries";
import { useScrollActiveRail } from "@/components/intake/useScrollActiveRail";
import { useRefineMode } from "@/hooks/useRefineMode";
import RefinePanel from "@/components/refine/RefinePanel";
import { autoEditableFromIntake } from "@/components/refine/autoEditable";
import { useToolStartedOnInteraction } from "@/lib/analyticsEvents";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { Dna } from 'lucide-react';


const TYPES = ["Facial geometry / facial recognition","Fingerprint / palm print","Voiceprint / speaker recognition","Iris or retina scan","Gait analysis","Vein pattern recognition","Other biometric identifier"];
const ORG = ["Employer (employee biometrics)","Consumer app or platform","Healthcare provider","Financial institution / fintech","Security / access control provider","Research organisation","Other"];
const PURPOSE = ["Time & attendance / workforce management","Physical access control","Customer authentication","Surveillance / monitoring","Research or product development","Other"];
const JURS = ["EU / EEA (GDPR)","United Kingdom (UK GDPR)","Illinois, USA (BIPA)","Texas, USA (CUBI)","Washington state, USA","California, USA (CCPA/CPRA)","Colorado, USA (CPA)","New York, USA (SHIELD)","Other US state","United States — Federal (FTC)","Canada (PIPEDA / provincial)","Australia (Privacy Act)"];


export default function BiometricChecker() {
  useToolStartedOnInteraction("biometric");
  const fireConversion = useConversionEvent();


  const [params] = useSearchParams();
  const navigate = useNavigate();
  // No more anonymous free tier — every analysis requires a signed-in account.
  const access = useToolAccess({ standalonePrice: 49, subscriberPrice: null });
  const pricing = useToolPrice("biometric_checker");
  const { clientId } = useActiveClient();
  const refine = useRefineMode("biometric_checker");
  const { meter } = useRunMeter("biometric_checker", refine.assessmentId);
  const [form, setForm] = useState({
    biometricTypes: [] as string[], orgType: ORG[0], orgName: "", purpose: PURPOSE[0],
    jurisdictions: [] as string[],
    // W3-T3 — optional text: which US state(s) when "Other US state" is
    // selected. Sent as `other_state_names`; blank when the toggle is off.
    other_state_names: "",
  });

  const [phase, setPhase] = useState<"form" | "generating" | "result">("form");
  // bipa_risk retired 2026-07-14 — dropped from result state shape.
  const [result, setResult] = useState<{ assessment_text: string; jurisdictions_analysed: string[] } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bioRailKey, setBioRailKey] = useState<string | null>(null);

  const { user: authUser } = useAuth();
  const initialFormRef = useMemo(() => JSON.stringify(form), []);
  const touched = useMemo(() => JSON.stringify(form) !== initialFormRef, [form, initialFormRef]);
  const draftData = useMemo(() => ({ form }), [form]);
  const {
    draftFound, draftUpdatedAt, restoreData, clearDraft,
  } = useToolDraft({
    toolType: "biometric",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: 0,
    enabled: !!authUser && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { form?: any } | null;
    if (d?.form && typeof d.form === "object") setForm((prev) => ({ ...prev, ...d.form }));
  };

  const bioRailEntry: RailEntry | null = bioRailKey ? (BIOMETRIC_RAIL[bioRailKey] ?? null) : null;
  const focusBioRail = (k: string) => setBioRailKey(k);
  useScrollActiveRail(setBioRailKey);

  useEffect(() => {
    if (params.get("session_id") || params.get("purchased")) setPhase("generating");
  }, [params]);

  const toggle = (key: "biometricTypes" | "jurisdictions", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("check-biometric-compliance", { body: { ...form, user_id: access.user?.id, client_id: clientId ?? null } });
    if (error || !data?.assessment_text) {
      setResult({ assessment_text: "Generation failed. Please try again.", jurisdictions_analysed: [] });
      setPhase("result");
      return;
    }
    setResult(data);
    void clearDraft();
    if (data?.id) { navigate(`/biometric-checker/result/${data.id}`); return; }
    setPhase("result");
  };

  const [biometricFreeRunAvailable, setBiometricFreeRunAvailable] = useState(false);
  const guidanceTier = useGuidanceTier();
  const bioEnforcementSignals = useGdprEnforcementSignals(
    ["biometric", "special_categories"],
    guidanceTier.tier === "paid"
  );

  useEffect(() => {
    if (!access.user) { setBiometricFreeRunAvailable(false); return; }
    supabase.from("profiles").select("biometric_free_run_claimed").eq("id", access.user.id).single()
      .then(({ data }) => setBiometricFreeRunAvailable((data as any)?.biometric_free_run_claimed === false));
  }, [access.user]);

  const handleAnalyse = async () => {
    logToolAcknowledgment("biometric_checker", access.user?.id ?? null);
    if (!access.user) { setAuthModalOpen(true); return; }
    if (access.isPremium) { handleGenerate(); return; }
    if (biometricFreeRunAvailable) {
      await supabase.from("profiles").update({ biometric_free_run_claimed: true } as any).eq("id", access.user.id);
      setBiometricFreeRunAvailable(false);
      handleGenerate();
      return;
    }
    setCheckoutOpen(true);
  };

  const ctaLabel = !access.user
    ? "Sign in to analyse"
    : access.isPremium
      ? "Analyse (included with your plan)"
      : biometricFreeRunAvailable
        ? "Run your first Biometric Check free →"
        : `Analyse ($${pricing.price})`;

  return (
    <WorkspaceLayout className="bg-paper">
      <Helmet><title>Biometric Privacy Compliance Assessment | End User Privacy</title>
        <meta name="description" content="Per-jurisdiction biometric privacy compliance covering BIPA, CUBI, MHMD, GDPR Article 9 and other regimes — with cited enforcement decisions behind every priority action." /></Helmet>      <header className="bg-brand-slate-teal text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            <Dna aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Biometric Compliance Assessment · ${pricing.price}
          </span>
          <h1 className="text-hero-h1 text-white mb-3">Biometric Privacy Compliance Assessment</h1>
          <RequirementBadge variant="hero" tier="required" text="Illinois BIPA requires a written retention-and-destruction policy and informed written consent before you collect any biometric identifier — with statutory damages per violation." className="mt-2 max-w-3xl" />
          <p className="text-slate-300 text-lg max-w-3xl">
            A per-jurisdiction read on your biometric processing — obligations under Illinois, Texas, Washington, EU/UK, and other regimes. Cited enforcement decisions sit behind every priority action.
          </p>
          <p className="text-slate-400 text-xs italic mt-3 max-w-3xl">Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.</p>
          <ToolCTABlock
            toolSlug="biometric"
            hasAccess={Boolean(access.isPremium)}
            ctaPosition="hero"
            onDark
            pagePath="/biometric-checker"
            primaryLabel={`Run a Biometric Privacy Assessment — $${pricing.price}`}
          />
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">
            740 ILCS 14 (BIPA) · written retention policy and informed written consent before you collect any identifier
          </p>
        </div>
      </header>
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ActiveClientLabel />
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
            toolType="biometric_checker"
            assessmentId={refine.assessmentId!}
            intake={refine.intake}
            lockedFields={refine.lockedFields ?? {}}
            editable={autoEditableFromIntake(refine.intake, refine.lockedFields)}
            runsUsed={refine.runsUsed}
            runsAllowed={refine.runsAllowed}
            runsRemaining={refine.runsRemaining}
            resultPath={`/biometric-checker/result/${refine.assessmentId}`}
            infoNeededKeys={refine.infoNeededKeys}
              priorInformationNeeded={refine.infoNeeded}
              openItems={refine.openItems}
          />
        ) : phase === "result" && result ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-display text-brand-navy">Compliance assessment</h2><CopyButton text={result.assessment_text} /></div>
            {/* BIPA litigation risk callout retired 2026-07-14 — bipa_risk hard-null since enrolledCount removal. */}
            <AssessmentReport text={result.assessment_text} />
            <p className="text-meta text-muted-foreground">Assessment reflects laws and enforcement as of {new Date().toLocaleDateString()}.</p>
            <ToolDisclaimer />
          </div>
        ) : phase === "generating" ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-brand-navy">Analysing biometric obligations across {form.jurisdictions.join(", ")}…</p>
          </div>
        ) : (
          <>
          <IntakeMasthead
            kicker="Biometric Privacy · BIPA · CUBI · MHMD · GDPR Art. 9"
            title="Biometric Privacy Compliance Assessment"
            subjectLabel={meter ? "Assessment subject · locked" : undefined}
            subjectValue={
              meter && typeof meter.lockedFields?.orgName === "string"
                ? (meter.lockedFields!.orgName as string)
                : undefined
            }
            meter={meter ?? null}
            preRunHint="The entity name you set below is fixed once you first generate. Everything else stays editable across your included revision runs."
          />
          <BenchLayout
            toolType="biometric"
            railEntry={bioRailEntry}
          >
          <div className="flex-1 min-w-0 space-y-5">
            <RequiredLegend />
            <div data-rail-key="orgName" onFocus={() => focusBioRail("orgName")}>
              <label className="text-sm font-semibold text-brand-navy">Entity name<Req /> <span className="text-xs text-muted-foreground">(legal organisation name; printed on the report header)</span></label>
              <input
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="e.g., Acme Retail Ltd"
                value={form.orgName}
                onChange={(e) => setForm(f => ({ ...f, orgName: e.target.value }))}
                autoComplete="organization"
              />
            </div>
            <fieldset data-rail-key="types" onFocus={() => focusBioRail("types")} onClick={() => focusBioRail("types")} className="text-sm"><legend className="font-semibold text-brand-navy">Biometric data types<Req /> <DefPopover termKey="gdpr_biometric_data" /> <span className="text-xs text-muted-foreground font-mono">(Art. 4(14) GDPR · Art. 9(1) — special category)</span> <EnforcementSignalIcon signalKey="biometric" signals={bioEnforcementSignals} /></legend>
              <div className="grid grid-cols-2 gap-1 mt-1">{TYPES.map(t => <label key={t} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.biometricTypes.includes(t)} onChange={() => toggle("biometricTypes", t)} />{t}</label>)}</div></fieldset>
            <label data-rail-key="orgType" onFocus={() => focusBioRail("orgType")} className="block text-sm"><span className="font-semibold text-brand-navy">Organisation type</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.orgType} onChange={e => setForm(f => ({ ...f, orgType: e.target.value }))}>
                {ORG.map(o => <option key={o}>{o}</option>)}</select></label>           
            <label data-rail-key="purpose" onFocus={() => focusBioRail("purpose")} className="block text-sm"><span className="font-semibold text-brand-navy">Primary purpose</span>
              <select className="w-full mt-1 border border-border rounded-lg px-3 py-2" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSE.map(p => <option key={p}>{p}</option>)}</select></label>
            <fieldset data-rail-key="jurisdictions" onFocus={() => focusBioRail("jurisdictions")} onClick={() => focusBioRail("jurisdictions")} className="text-sm"><legend className="font-semibold text-brand-navy">Jurisdictions<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 GDPR — biometric data is special category requiring explicit consent or Art. 9(2) condition)</span> <EnforcementSignalIcon signalKey="special_categories" signals={bioEnforcementSignals} /></legend>
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
              {form.jurisdictions.some(j => j.includes("Other US state")) && (
                <div className="mt-2 border border-border rounded p-2 bg-muted/30">
                  <label className="text-meta font-semibold text-brand-navy block">
                    Which state(s)? <span className="text-muted-foreground font-normal">(optional — name the US state(s) whose residents' biometrics are captured; enables a single conditional-framework section for that state instead of a general candidate-statute list)</span>
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    placeholder="e.g., Colorado; Oregon; New York"
                    value={form.other_state_names}
                    onChange={(e) => setForm(f => ({ ...f, other_state_names: e.target.value }))}
                  />
                </div>
              )}
            </fieldset>


            <div className="border-t border-border pt-4">
              {!access.user ? (
                <p className="text-meta text-muted-foreground mb-3">A free End User Privacy account is required to run any analysis.</p>
              ) : access.isPremium ? (
                <p className="text-meta text-muted-foreground mb-3">You're signed in and ready to run your assessment.</p>
              ) : (
                <p className="text-meta text-muted-foreground mb-3">Analysis is {PRICING.tools.biometric.display}: standard rate for all tiers.</p>
              )}
              <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />
              <div className="flex gap-3 flex-wrap mt-4">
                <button onClick={handleAnalyse} disabled={!form.orgName.trim() || form.biometricTypes.length === 0 || form.jurisdictions.length === 0}
                  className="bg-gradient-to-br from-brand-navy to-brand-teal text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
                  {ctaLabel}</button>
                {access.user && !access.isPremium && (
                  <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "Subscribe instead", cta_position: "tool-gate" })} className="bg-card border border-primary text-primary font-semibold text-sm px-6 py-3 rounded-xl hover:bg-primary/5 no-underline">Subscribe instead →</Link>
                )}
              </div>
            </div>
          </div>
          </BenchLayout>
          </>
        )}
      </section>
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
        clientId={clientId}
        intakeData={form}
        onClose={() => setCheckoutOpen(false)}
        onComplete={(id) => {
          setCheckoutOpen(false);
          if (id) { void clearDraft(); navigate(`/biometric-checker/result/${id}?purchased=true`); }
        }}
      />
    </WorkspaceLayout>
  );
}
