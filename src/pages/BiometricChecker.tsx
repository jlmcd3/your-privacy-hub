
import { PRICING, INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useEffect, useId, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToolDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { RequirementBadge } from "@/components/RequirementBadge";
import { Label } from "@/components/ui/label";
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
import { BIO_TRI, BIO_NOTICE, BIO_CONSENT_ARTIFACT, BIO_DISCLOSURE_BASES } from "@/registry/biometric-intake-options";


const TYPES = ["Facial geometry / facial recognition","Fingerprint / palm print","Voiceprint / speaker recognition","Iris or retina scan","Gait analysis","Vein pattern recognition","Other biometric identifier"];
const ORG = ["Employer (employee biometrics)","Consumer app or platform","Healthcare provider","Financial institution / fintech","Security / access control provider","Research organisation","Other"];
const PURPOSE = ["Time & attendance / workforce management","Physical access control","Customer authentication","Surveillance / monitoring","Research or product development","Other"];
const JURS = ["EU / EEA (GDPR)","United Kingdom (UK GDPR)","Illinois, USA (BIPA)","Texas, USA (CUBI)","Washington state, USA","California, USA (CCPA/CPRA)","Colorado, USA (CPA)","New York, USA (SHIELD)","Other US state","United States — Federal (FTC)","Canada (PIPEDA / provincial)","Australia (Privacy Act)","Singapore (PDPA)"];

/**
 * ITEM 317 — three-state answer control. "Not known" is a real answer here:
 * it tells the builder the record is silent, which produces a named
 * record_insufficient finding rather than a satisfied/not-satisfied verdict.
 *
 * DISPATCH 5 — <Label> idiom: the control is now labelled by `htmlFor`/`id`
 * rather than by wrapping. Stored values are unchanged (BIO_TRI verbatim,
 * empty string for "Not supplied"), and each <option> carries an explicit
 * `value` so display text can never drift from the stored value (A4).
 */
function Tri({ label, value, onChange, help }: { label: string; value: string; onChange: (v: string) => void; help?: string }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-semibold text-brand-navy">{label}</Label>
      <select id={id} className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Not supplied</option>
        {BIO_TRI.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {help && <p className="text-meta text-muted-foreground">{help}</p>}
    </div>
  );
}




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
    // ITEM 317 — practice facts each state statute's duties are measured
    // against. Every one is optional; blank degrades to record_insufficient
    // in the deliverables builder rather than being assumed either way.
    // Attestation intake (optional) — a named approver turns the assessment
    // into an accountability record; blank degrades honestly in the report.
    approved_by_name: "",
    approved_by_title: "",
    approval_date: "",
    next_review_due: "",
    data_source_description: "",
    healthcare_tpo_context: "",
    entity_is_government: "",
    glba_financial_institution: "",
    notice_before_collection: "",
    consent_artifact_type: "",
    release_artifact_description: "",
    retention_schedule_text: "",
    retention_policy_public: "",
    destruction_trigger: "",
    sells_or_profits: "",
    disclosure_recipients: "",
    disclosure_bases: [] as string[],
    security_measures_description: "",
    protection_parity: "",
    tx_destruction_within_one_year: "",
    tx_longer_retention_required_by_law: "",
    tx_employer_security_collection: "",
    tx_ai_training_use: "",
    wa_enrolls_in_database: "",
    wa_commercial_purpose: "",
    wa_security_purpose_only: "",
    wa_mhmda_health_inference: "",
    wa_mhmda_privacy_policy_published: "",
    wa_mhmda_collection_consent: "",
    wa_mhmda_share_consent_separate: "",
    wa_mhmda_geofence_health_facility: "",
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

  const toggle = (key: "biometricTypes" | "jurisdictions" | "disclosure_bases", v: string) =>
    setForm(f => ({ ...f, [key]: f[key].includes(v) ? f[key].filter(x => x !== v) : [...f[key], v] }));

  // ITEM 317 — the practice block only appears once a statute that has
  // per-duty obligations is in play; the other jurisdictions have no duty
  // registry behind them yet.
  const showTexas = form.jurisdictions.some(j => j.includes("Texas"));
  const showWashington = form.jurisdictions.some(j => j.includes("Washington"));
  const showPractices =
    form.jurisdictions.some(j => j.includes("Illinois")) || showTexas || showWashington;

  const handleGenerate = async () => {
    setPhase("generating");
    const { data, error } = await supabase.functions.invoke("check-biometric-compliance", { body: { ...form, user_id: access.user?.id, client_id: clientId ?? null } });
    if (error || !data?.assessment_text) {
      setResult({ assessment_text: "Generation failed. Try again.", jurisdictions_analysed: [] });
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
      // ITEM 360 — the quota column is service-role-only; claim it atomically
      // through the security-definer routine (returns false if already used).
      const { data: claimed } = await (supabase as any).rpc("claim_biometric_free_run");
      setBiometricFreeRunAvailable(false);
      if (claimed === true) { handleGenerate(); return; }
      setCheckoutOpen(true);
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

            {/* DISPATCH 5 / G10 — the modality leads: every statute below
                branches on WHAT is captured, so it is asked first and the
                dependency is stated in one plain sentence. */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-brand-navy">Stage 1 — What you capture</p>
              <p className="text-meta text-muted-foreground mt-1">
                Start with the modality. What the system captures decides which statutes are in play, and the questions further down appear only for the jurisdictions you then select.
              </p>
            </div>

            <fieldset data-rail-key="types" onFocus={() => focusBioRail("types")} onClick={() => focusBioRail("types")} className="text-sm"><legend className="font-semibold text-brand-navy">Biometric data types<Req /> <DefPopover termKey="gdpr_biometric_data" /> <span className="text-xs text-muted-foreground font-mono">(Art. 4(14) GDPR · Art. 9(1) — special category)</span> <EnforcementSignalIcon signalKey="biometric" signals={bioEnforcementSignals} /></legend>
              <p className="text-meta text-muted-foreground mt-1">Select every modality the system captures or computes a template from. Templates derived from a photograph count; a photograph alone does not.</p>
              <div className="grid grid-cols-2 gap-1 mt-2">{TYPES.map(t => <label key={t} className="flex items-center gap-2 text-meta">
                <input type="checkbox" checked={form.biometricTypes.includes(t)} onChange={() => toggle("biometricTypes", t)} />{t}</label>)}</div></fieldset>

            <div data-rail-key="orgName" onFocus={() => focusBioRail("orgName")} className="space-y-1">
              <Label htmlFor="bio-org-name" className="text-sm font-semibold text-brand-navy">Entity name<Req /> <span className="text-xs text-muted-foreground font-normal">(legal organisation name; printed on the report header)</span></Label>
              <input
                id="bio-org-name"
                type="text"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Legal entity name"
                value={form.orgName}
                onChange={(e) => setForm(f => ({ ...f, orgName: e.target.value }))}
                autoComplete="organization"
              />
            </div>

            <div data-rail-key="orgType" onFocus={() => focusBioRail("orgType")} className="space-y-1">
              <Label htmlFor="bio-org-type" className="text-sm font-semibold text-brand-navy">Organisation type</Label>
              <select id="bio-org-type" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.orgType} onChange={e => setForm(f => ({ ...f, orgType: e.target.value }))}>
                {ORG.map(o => <option key={o} value={o}>{o}</option>)}</select>
              <p className="text-meta text-muted-foreground">Some duties turn on who is collecting: employer collection, government bodies, and financial institutions are treated differently under the state statutes.</p>
            </div>

            <div data-rail-key="purpose" onFocus={() => focusBioRail("purpose")} className="space-y-1">
              <Label htmlFor="bio-purpose" className="text-sm font-semibold text-brand-navy">Primary purpose</Label>
              <select id="bio-purpose" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSE.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <p className="text-meta text-muted-foreground">Name the operational reason the capture exists. Purpose sets the retention clock and, in Texas and Washington, decides whether a security-purpose carve-out is even reachable.</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-brand-navy">Stage 2 — Which regimes apply</p>
              <p className="text-meta text-muted-foreground mt-1">
                Select every jurisdiction whose residents' biometrics are captured. Each selection adds its own statute block below; nothing is pre-rendered for a jurisdiction you have not selected.
              </p>
            </div>

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
                  <Label htmlFor="bio-other-states" className="text-meta font-semibold text-brand-navy block">
                    Which state(s)? <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <p className="text-meta text-muted-foreground mt-1">
                    Name the states whose residents' biometrics are captured. Named, the report writes one conditional-framework section for that state; left blank, it falls back to a general candidate-statute list.
                  </p>
                  <input
                    id="bio-other-states"
                    type="text"
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    placeholder="One state per entry, semicolon-separated"
                    value={form.other_state_names}
                    onChange={(e) => setForm(f => ({ ...f, other_state_names: e.target.value }))}
                  />
                </div>
              )}
            </fieldset>

            {showPractices && (
              <fieldset data-rail-key="practices" onFocus={() => focusBioRail("practices")} onClick={() => focusBioRail("practices")} className="text-sm border border-border rounded-lg p-4 space-y-4">
                <legend className="font-semibold text-brand-navy px-1">Stage 3 — Your practices <span className="text-xs text-muted-foreground font-normal">(optional)</span></legend>
                <p className="text-meta text-muted-foreground">
                  Each answer is measured against one specific subsection of the statutes you selected. Answered, the report reaches a satisfied or not-satisfied finding on that duty. Left blank, it records the point as open on the evidence rather than assuming either way.
                </p>

                <div className="space-y-1">
                  <Label htmlFor="bio-data-source" className="text-sm font-semibold text-brand-navy">How is the biometric data generated?</Label>
                  <p className="text-meta text-muted-foreground">Name the capture device, what it computes, and where the template comes to rest. A raw image captured and discarded reads differently from a template enrolled in a matching database.</p>
                  <input id="bio-data-source" type="text" className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Device, then what is stored"
                    value={form.data_source_description}
                    onChange={(e) => setForm(f => ({ ...f, data_source_description: e.target.value }))} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Tri label="Collected, used, or stored for health-care treatment, payment, or operations?" value={form.healthcare_tpo_context} onChange={(v) => setForm(f => ({ ...f, healthcare_tpo_context: v }))} />
                  <Tri label="Is the organisation a State or local government body?" value={form.entity_is_government} onChange={(v) => setForm(f => ({ ...f, entity_is_government: v }))} />
                  <Tri label="Is it a financial institution under Gramm-Leach-Bliley?" value={form.glba_financial_institution} onChange={(v) => setForm(f => ({ ...f, glba_financial_institution: v }))} />
                  <Tri label="Are biometric identifiers sold, leased, traded, or otherwise turned to profit?" value={form.sells_or_profits} onChange={(v) => setForm(f => ({ ...f, sells_or_profits: v }))} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-notice" className="text-sm font-semibold text-brand-navy">Notice before collection</Label>
                  <p className="text-meta text-muted-foreground">Answer on what actually happened at the point of capture, not on what the privacy policy says elsewhere. Whether the notice was in writing, and whether it came before collection, are separate facts.</p>
                  <select id="bio-notice" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.notice_before_collection}
                    onChange={e => setForm(f => ({ ...f, notice_before_collection: e.target.value }))}>
                    <option value="">Not supplied</option>
                    {BIO_NOTICE.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-consent-artifact" className="text-sm font-semibold text-brand-navy">Consent or release artifact</Label>
                  <p className="text-meta text-muted-foreground">Pick by the document you could produce on request, not by the intention behind it. A standalone signed release, a clickwrap acceptance, and onboarding paperwork are three different artifacts with three different evidential weights.</p>
                  <select id="bio-consent-artifact" className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={form.consent_artifact_type}
                    onChange={e => setForm(f => ({ ...f, consent_artifact_type: e.target.value }))}>
                    <option value="">Not supplied</option>
                    {BIO_CONSENT_ARTIFACT.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-release" className="text-sm font-semibold text-brand-navy">Describe the release instrument</Label>
                  <p className="text-meta text-muted-foreground">Say what the document is, when it is signed, and what it states on its face about purpose and retention period. A release that is silent on either is a different instrument from one that names both.</p>
                  <textarea id="bio-release" className="w-full rounded border px-3 py-2 text-sm" rows={2}
                    placeholder="What it is, when signed, what it states"
                    value={form.release_artifact_description}
                    onChange={(e) => setForm(f => ({ ...f, release_artifact_description: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-retention" className="text-sm font-semibold text-brand-navy">Retention schedule (as written)</Label>
                  <p className="text-meta text-muted-foreground">Quote the schedule as your policy states it, not a summary of it. Illinois measures the written schedule and the destruction trigger separately, so a period without a trigger is an incomplete answer.</p>
                  <textarea id="bio-retention" className="w-full rounded border px-3 py-2 text-sm" rows={2}
                    placeholder="Quote the schedule as written"
                    value={form.retention_schedule_text}
                    onChange={(e) => setForm(f => ({ ...f, retention_schedule_text: e.target.value }))} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Tri label="Is that policy made available to the public?" value={form.retention_policy_public} onChange={(v) => setForm(f => ({ ...f, retention_policy_public: v }))} />
                  <Tri label="Are biometrics protected at least as well as your other confidential information?" value={form.protection_parity} onChange={(v) => setForm(f => ({ ...f, protection_parity: v }))} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-destruction" className="text-sm font-semibold text-brand-navy">Destruction trigger</Label>
                  <p className="text-meta text-muted-foreground">Name the event that starts deletion and how long after it deletion happens. A trigger tied to a dated event is measurable; "when no longer needed" is not.</p>
                  <input id="bio-destruction" type="text" className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Event, then interval"
                    value={form.destruction_trigger}
                    onChange={(e) => setForm(f => ({ ...f, destruction_trigger: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-security" className="text-sm font-semibold text-brand-navy">Storage and transmission controls</Label>
                  <p className="text-meta text-muted-foreground">Cover the template at rest, in transit, and who can reach it. The statutory standard is the reasonable standard of care in your industry, so name controls a peer would recognise.</p>
                  <input id="bio-security" type="text" className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="At rest, in transit, who has access"
                    value={form.security_measures_description}
                    onChange={(e) => setForm(f => ({ ...f, security_measures_description: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio-recipients" className="text-sm font-semibold text-brand-navy">Disclosure recipients</Label>
                  <p className="text-meta text-muted-foreground">Name each recipient and what it does with the data. Hosting a matching database counts as a disclosure even where the vendor is contractually restricted.</p>
                  <input id="bio-recipients" type="text" className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="One recipient per entry, with its role"
                    value={form.disclosure_recipients}
                    onChange={(e) => setForm(f => ({ ...f, disclosure_recipients: e.target.value }))} />
                </div>

                <fieldset><legend className="font-semibold text-brand-navy">On what basis is biometric data disclosed?</legend>
                  <p className="text-meta text-muted-foreground mt-1">Select every basis that is actually relied on today. The statutes permit disclosure only on an enumerated ground, so a recipient named above with no ground selected reads as an unmatched disclosure.</p>
                  <div className="grid grid-cols-1 gap-1 mt-2">{BIO_DISCLOSURE_BASES.map(b => (
                    <label key={b} className="flex items-center gap-2 text-meta">
                      <input type="checkbox" checked={form.disclosure_bases.includes(b)} onChange={() => toggle("disclosure_bases", b)} />{b}</label>
                  ))}</div></fieldset>

                {showTexas && (
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="font-semibold text-brand-navy">Stage 3a — Texas (CUBI): the one-year destruction clock</p>
                    <p className="text-meta text-muted-foreground">These four appear because Texas is selected. They fix when the clock starts, whether another law suspends it, and whether either statutory carve-out is reachable.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Tri label="Destroyed within one year of the collection purpose expiring?" value={form.tx_destruction_within_one_year} onChange={(v) => setForm(f => ({ ...f, tx_destruction_within_one_year: v }))} />
                      <Tri label="Does another law require the associated document to be kept longer?" value={form.tx_longer_retention_required_by_law} onChange={(v) => setForm(f => ({ ...f, tx_longer_retention_required_by_law: v }))} />
                      <Tri label="Collected for security purposes by an employer?" value={form.tx_employer_security_collection} onChange={(v) => setForm(f => ({ ...f, tx_employer_security_collection: v }))} />
                      <Tri label="Used in developing, training, or evaluating an AI model or system?" value={form.tx_ai_training_use} onChange={(v) => setForm(f => ({ ...f, tx_ai_training_use: v }))} />
                    </div>
                  </div>
                )}

                {showWashington && (
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="font-semibold text-brand-navy">Stage 3b — Washington (RCW 19.375): the enrollment predicate</p>
                    <p className="text-meta text-muted-foreground">RCW 19.375 bites on enrollment for a commercial purpose. Answer the predicate first; the security-purpose question only matters once enrollment is established.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Tri label="Are identifiers converted to reference templates and stored in a matching database?" value={form.wa_enrolls_in_database} onChange={(v) => setForm(f => ({ ...f, wa_enrolls_in_database: v }))} />
                      <Tri label="Is that done for a commercial purpose (sale or disclosure for unrelated marketing)?" value={form.wa_commercial_purpose} onChange={(v) => setForm(f => ({ ...f, wa_commercial_purpose: v }))} />
                      <Tri label="Is enrollment solely in furtherance of a security purpose?" value={form.wa_security_purpose_only} onChange={(v) => setForm(f => ({ ...f, wa_security_purpose_only: v }))} />
                    </div>

                    {/* Item 323 — RCW 19.373 is a SECOND Washington statute, not a
                        continuation of RCW 19.375. Kept in its own block, under its
                        own heading, so the two are never read as one regime. */}
                    <div className="border-t border-border pt-3 space-y-3">
                      <p className="font-semibold text-brand-navy">Stage 3c — Washington My Health My Data Act (RCW 19.373), a separate chapter</p>
                      <p className="text-meta text-muted-foreground">
                        RCW 19.373 is distinct from RCW 19.375 above and is triggered on different facts. Answering these does not change the RCW 19.375 analysis, and clearing one chapter does not clear the other.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Tri label="Does the biometric data identify or infer health status, or identify a consumer seeking health-care services?" value={form.wa_mhmda_health_inference} onChange={(v) => setForm(f => ({ ...f, wa_mhmda_health_inference: v }))} />
                        <Tri label="Is a consumer health data privacy policy published and linked from the homepage?" value={form.wa_mhmda_privacy_policy_published} onChange={(v) => setForm(f => ({ ...f, wa_mhmda_privacy_policy_published: v }))} />
                        <Tri label="Was consent obtained before collection, for a specified purpose?" value={form.wa_mhmda_collection_consent} onChange={(v) => setForm(f => ({ ...f, wa_mhmda_collection_consent: v }))} />
                        <Tri label="Is there a sharing consent separate and distinct from the collection consent?" value={form.wa_mhmda_share_consent_separate} onChange={(v) => setForm(f => ({ ...f, wa_mhmda_share_consent_separate: v }))} />
                        <Tri label="Is any geofence implemented around an entity providing in-person health-care services?" value={form.wa_mhmda_geofence_health_facility} onChange={(v) => setForm(f => ({ ...f, wa_mhmda_geofence_health_facility: v }))} />
                      </div>
                    </div>
                  </div>
                )}
              </fieldset>
            )}




            <div className="border-t border-border pt-4 mb-4">
              <p className="text-sm font-semibold text-brand-navy mb-1">Stage 4 — Approval and review (optional)</p>
              <p className="text-meta text-muted-foreground mb-3">
                Naming an approver turns this assessment into an accountability record. Left blank, the report states the approval was not recorded rather than printing an empty signature line.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bio-approver" className="text-sm">Approved by (name)</Label>
                  <input id="bio-approver" className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    value={form.approved_by_name}
                    onChange={(e) => setForm(f => ({ ...f, approved_by_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bio-approver-title" className="text-sm">Role or title</Label>
                  <input id="bio-approver-title" className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    value={form.approved_by_title}
                    onChange={(e) => setForm(f => ({ ...f, approved_by_title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bio-approval-date" className="text-sm">Date of approval</Label>
                  <input id="bio-approval-date" type="date" className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    value={form.approval_date}
                    onChange={(e) => setForm(f => ({ ...f, approval_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bio-next-review" className="text-sm">Next review due</Label>
                  <input id="bio-next-review" type="date" className="w-full border border-border rounded-md px-3 py-2 text-sm"
                    value={form.next_review_due}
                    onChange={(e) => setForm(f => ({ ...f, next_review_due: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              {!access.user ? (
                <p className="text-meta text-muted-foreground mb-3">A free End User Privacy account is required to run any analysis.</p>
              ) : access.isPremium ? (
                <p className="text-meta text-muted-foreground mb-3">You're signed in and ready to run your assessment.</p>
              ) : (
                <p className="text-meta text-muted-foreground mb-3">Analysis is {PRICING.tools.biometric.display}: standard rate for all tiers.</p>
              )}
              {(!form.orgName.trim() || form.biometricTypes.length === 0 || form.jurisdictions.length === 0) && (
                <p className="text-meta text-muted-foreground mb-3">
                  To run the analysis: name the entity, select at least one biometric data type, and select at least one jurisdiction.
                </p>
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
