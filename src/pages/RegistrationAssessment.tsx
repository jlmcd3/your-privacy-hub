// No statutory rail by design — see intakePolicy.ts. Use ChoiceWithOther + IntakeGuidance.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  JURISDICTION_OPTIONS, ORG_SIZES, INDUSTRIES, rememberAssessmentToken,
} from "@/data/registration_jurisdictions";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";
import AuthGateModal from "@/components/AuthGateModal";
import { intakeGate } from "@/components/intake/intakeGateCopy";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import ValidationErrorSummary from "@/components/intake/ValidationErrorSummary";

import { DefPopover } from "@/components/DefPopover";
import { useToolDraft, useAutoRestoreDraft } from "@/hooks/useToolDraft";
import DraftRestoreBanner from "@/components/DraftRestoreBanner";

interface IntakeState {
  // Step 1
  organization_name: string;
  is_public_authority: boolean;
  organization_country: string;
  organization_size: string;
  industry: string;
  email: string;
  employee_count: string;        // string for input UX, parsed before submit
  annual_revenue_usd: string;
  data_subjects_count: string;
  role: "controller" | "processor" | "both" | "";
  // Step 2
  processes_personal_data: boolean;
  processes_special_categories: boolean;
  processes_children_data: boolean;
  large_scale_monitoring: boolean;
  uses_ai_systems: boolean;
  ai_high_risk: boolean;
  ai_general_purpose_provider: boolean;
  ai_high_risk_role: string;
  cross_border_transfers: boolean;
  acts_as_data_broker: boolean;
  sells_or_shares_personal_info: boolean;
  processes_biometrics_for_id: boolean;
  // Item 316 — data-broker threshold detail (shown when broker-type activity
  // is indicated). Numeric fields are strings for input UX and are parsed
  // before submit, matching employee_count / annual_revenue_usd.
  collects_data_not_directly_from_individuals: boolean;
  has_direct_relationship_with_data_subjects: boolean;
  sells_or_licenses_brokered_data: boolean;
  brokered_data_individual_count: string;
  brokered_data_revenue_share_pct: string;
  data_broker_exemption_claimed: string;
  filing_contact_details_ready: boolean;
  filing_opt_out_mechanism_documented: boolean;
  filing_minors_data_practices_documented: boolean;
  filing_metrics_documented: boolean;
  filing_rights_instructions_documented: boolean;
  // DOC 163 R7 — Tex. Bus. & Com. Code § 510.005(b)(3), (4), (6).
  filing_tx_categories_documented: boolean;
  filing_tx_credentialing_statement_documented: boolean;
  filing_tx_breach_count_documented: boolean;
  // Attestation (optional)
  approved_by_name: string;
  approved_by_title: string;
  approval_date: string;
  next_review_due: string;
  // Step 3
  has_eu_establishment: boolean;
  has_uk_establishment: boolean;
  eu_lead_member_state: string;
  markets_served: string[];
}

// Item 316 — mirrors REGISTRATION_BROKER_EXEMPTIONS in the intake contract.
const BROKER_EXEMPTION_OPTIONS = [
  { value: "none", label: "None claimed" },
  { value: "fcra_consumer_reporting", label: "Consumer reporting (FCRA)" },
  { value: "glba_financial", label: "Financial institution (GLBA)" },
  { value: "hipaa_health", label: "Health data (HIPAA)" },
  { value: "insurance", label: "Insurance" },
  { value: "service_provider_processor", label: "Service provider / processor acting on instructions" },
  { value: "affiliate_or_subsidiary", label: "Affiliate or subsidiary transfers only" },
  { value: "publicly_available_information", label: "Publicly available information only" },
  { value: "unknown", label: "Not sure" },
] as const;

// DOC 163 R1 — mirrors REGISTRATION_AI_HIGH_RISK_ROLES in the intake contract.
const AI_ROLE_OPTIONS = [
  { value: "provider", label: "We developed it, or place it on the market under our own name or trademark (provider)" },
  { value: "deployer", label: "We use a third party's system (deployer)" },
  { value: "both", label: "Both — we provide one system and use another" },
  { value: "unsure", label: "Not sure" },
] as const;

// DOC 163 R2 — the states with a data-broker registry (and the nationwide
// code): selecting one puts the data-broker detail on the form.
const REGISTRY_STATE_CODES = ["US", "US-CA", "US-OR", "US-TX", "US-VT"];

const EMPTY: IntakeState = {
  organization_name: "",
  is_public_authority: false,
  organization_country: "",
  organization_size: "",
  industry: "",
  email: "",
  employee_count: "",
  annual_revenue_usd: "",
  data_subjects_count: "",
  role: "",
  processes_personal_data: true,
  processes_special_categories: false,
  processes_children_data: false,
  large_scale_monitoring: false,
  uses_ai_systems: false,
  ai_high_risk: false,
  ai_general_purpose_provider: false,
  ai_high_risk_role: "",
  cross_border_transfers: false,
  acts_as_data_broker: false,
  sells_or_shares_personal_info: false,
  processes_biometrics_for_id: false,
  collects_data_not_directly_from_individuals: false,
  has_direct_relationship_with_data_subjects: true,
  sells_or_licenses_brokered_data: false,
  brokered_data_individual_count: "",
  brokered_data_revenue_share_pct: "",
  data_broker_exemption_claimed: "",
  filing_contact_details_ready: false,
  filing_opt_out_mechanism_documented: false,
  filing_minors_data_practices_documented: false,
  filing_metrics_documented: false,
  filing_rights_instructions_documented: false,
  filing_tx_categories_documented: false,
  filing_tx_credentialing_statement_documented: false,
  filing_tx_breach_count_documented: false,
  approved_by_name: "",
  approved_by_title: "",
  approval_date: "",
  next_review_due: "",
  has_eu_establishment: false,
  has_uk_establishment: false,
  eu_lead_member_state: "",
  markets_served: [],
};

export default function RegistrationAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { clientId } = useActiveClient();
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [intake, setIntake] = useState<IntakeState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const isAnon = !authLoading && !user;

  const initialIntakeJson = useMemo(() => JSON.stringify(EMPTY), []);
  const touched = useMemo(() => JSON.stringify(intake) !== initialIntakeJson, [intake, initialIntakeJson]);
  const draftData = useMemo(() => ({ intake, step }), [intake, step]);
  const {
    draftFound, draftUpdatedAt, restoreData, restoreStage, clearDraft,
    autoRestoreToken,
  } = useToolDraft({
    toolType: "registration",
    clientId: clientId ?? null,
    data: draftData,
    currentStage: step,
    enabled: !!user && touched,
  });
  const applyRestore = () => {
    const d = restoreData as { intake?: any; step?: number } | null;
    if (!d) return;
    if (d.intake && typeof d.intake === "object") setIntake({ ...EMPTY, ...d.intake });
    if (typeof restoreStage === "number") setStep(restoreStage);
    else if (typeof d.step === "number") setStep(d.step);
  };
  useAutoRestoreDraft(autoRestoreToken, applyRestore);

  function guardAnon(): boolean {
    if (isAnon) {
      setAuthGateOpen(true);
      return true;
    }
    return false;
  }

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-registration-assessment",
        { body: { shareable_token: token } }
      );
      if (!error && data?.assessment?.intake_data) {
        setIntake({ ...EMPTY, ...data.assessment.intake_data });
        toast.success("Loaded your saved answers");
      }
    })();
  }, [searchParams]);

  const groupedMarkets = useMemo(() => {
    const m: Record<string, typeof JURISDICTION_OPTIONS> = {};
    for (const j of JURISDICTION_OPTIONS) {
      (m[j.region] ||= []).push(j);
    }
    return m;
  }, []);

  // DOC 163 R2 — the data-broker detail decides the four state registrations,
  // so it is shown whenever a registry state is a market or the home country,
  // not only when the company describes itself as a broker or seller. Left
  // hidden, the state determinations were reading the form's defaults as the
  // company's answers.
  const registryStateSelected = REGISTRY_STATE_CODES.includes(intake.organization_country) ||
    intake.markets_served.some((code) => REGISTRY_STATE_CODES.includes(code));
  const brokerFlagsOn = intake.acts_as_data_broker || intake.sells_or_shares_personal_info;
  const showBrokerDetail = brokerFlagsOn || registryStateSelected;

  function toggleMarket(code: string) {
    setIntake((s) => ({
      ...s,
      markets_served: s.markets_served.includes(code)
        ? s.markets_served.filter((c) => c !== code)
        : [...s.markets_served, code],
    }));
  }

  async function submit() {
    if (!intake.organization_name.trim()) {
      setValidationError("Name the organization this assessment covers.");
      return;
    }
    if (!intake.organization_country && intake.markets_served.length === 0) {
      setValidationError("Select the country of establishment, or at least one market served — the jurisdictions you select decide which filings the report examines.");
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Coerce numeric strings to numbers; drop empty fields
      const payload = {
        ...intake,
        employee_count: intake.employee_count ? Number(intake.employee_count) : undefined,
        annual_revenue_usd: intake.annual_revenue_usd ? Number(intake.annual_revenue_usd) : undefined,
        data_subjects_count: intake.data_subjects_count ? Number(intake.data_subjects_count) : undefined,
        brokered_data_individual_count: intake.brokered_data_individual_count
          ? Number(intake.brokered_data_individual_count) : undefined,
        brokered_data_revenue_share_pct: intake.brokered_data_revenue_share_pct
          ? Number(intake.brokered_data_revenue_share_pct) : undefined,
        data_broker_exemption_claimed: intake.data_broker_exemption_claimed || undefined,
        role: intake.role || undefined,
        ai_high_risk_role: intake.ai_high_risk_role || undefined,
        eu_lead_member_state: intake.eu_lead_member_state || undefined,
      };
      const { data, error } = await supabase.functions.invoke(
        "run-registration-assessment",
        { body: { intake_data: payload, user_id: user?.id || null, client_id: clientId ?? null } }
      );
      if (error) throw error;
      rememberAssessmentToken(data.shareable_token);
      void clearDraft();
      navigate(`/registration-manager/result/${encodeURIComponent(data.shareable_token)}`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate assessment");
    } finally {
      setSubmitting(false);
    }
  }


  // DOC 163 R2/R7 — the data-broker detail, rendered in Step 2 (when the
  // gate is open) and in Step 3 (when a registry state is selected without
  // the broker flags), so the answers the state registrations turn on are
  // always put to the company that needs them.
  const brokerDetailBlock = (
    <div className="ml-6 space-y-3 border-l-2 border-muted pl-4">
      <Label className="text-base">Data-broker registration detail</Label>
      <p className="text-xs text-muted-foreground">
        California and Vermont only reach consumers you have no direct
        relationship with; Oregon has no such exception; Texas turns on a
        revenue or volume test instead. Each box is read as your answer, ticked
        or not; the two numbers and the exclusion can be left blank, and a blank
        leaves that state's determination open rather than guessed.
      </p>
      <CheckRow checked={intake.collects_data_not_directly_from_individuals}
        onChange={(v) => setIntake({ ...intake, collects_data_not_directly_from_individuals: v })}
        label="We handle personal data we did not collect directly from the individuals concerned" />
      <CheckRow checked={intake.has_direct_relationship_with_data_subjects}
        onChange={(v) => setIntake({ ...intake, has_direct_relationship_with_data_subjects: v })}
        label="We have a direct relationship with those individuals (customer, client, subscriber, user or registered user)" />
      <CheckRow checked={intake.sells_or_licenses_brokered_data}
        onChange={(v) => setIntake({ ...intake, sells_or_licenses_brokered_data: v })}
        label="We sell OR LICENSE that data to third parties" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-sm">Individuals whose data we handle without collecting it directly</Label>
          <Input type="number" min="0" value={intake.brokered_data_individual_count}
            onChange={(e) => setIntake({ ...intake, brokered_data_individual_count: e.target.value })}
            placeholder="Whole number" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Share of revenue from processing or transferring that data (%)</Label>
          <Input type="number" min="0" max="100" value={intake.brokered_data_revenue_share_pct}
            onChange={(e) => setIntake({ ...intake, brokered_data_revenue_share_pct: e.target.value })}
            placeholder="0-100" />
          <p className="text-xs text-muted-foreground">Texas turns on revenue derived from that data: enter 0 if none is derived from it.</p>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Statutory exclusion claimed, if any</Label>
        <p className="text-xs text-muted-foreground">Each state has its own list: California excludes FCRA, GLBA, insurance and HIPAA-exempt entities; Texas excludes service providers, affiliates, governmental entities, FCRA and GLBA entities; Vermont excludes certain platform, directory and public-information activities; Oregon states none. A claim is recorded and measured against that state's text, never accepted on its own.</p>
        <Select value={intake.data_broker_exemption_claimed}
          onValueChange={(v) => setIntake({ ...intake, data_broker_exemption_claimed: v })}>
          <SelectTrigger><SelectValue placeholder="None claimed" /></SelectTrigger>
          <SelectContent>
            {BROKER_EXEMPTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Label className="text-sm">Registration filing readiness</Label>
      <p className="text-xs text-muted-foreground">These describe what you could file today, element by element as each statute lists them. Anything left unticked appears in the report as an outstanding filing prerequisite rather than as a failure.</p>
      <CheckRow checked={intake.filing_contact_details_ready}
        onChange={(v) => setIntake({ ...intake, filing_contact_details_ready: v })}
        label="Our legal name, contact person, physical address, email, telephone and website details are ready to file" />
      <CheckRow checked={intake.filing_opt_out_mechanism_documented}
        onChange={(v) => setIntake({ ...intake, filing_opt_out_mechanism_documented: v })}
        label="Our consumer opt-out arrangements are documented — the method, what it covers, and whether a third party may opt out for the consumer (Vermont)" />
      <CheckRow checked={intake.filing_minors_data_practices_documented}
        onChange={(v) => setIntake({ ...intake, filing_minors_data_practices_documented: v })}
        label="Our position on collecting the personal information of minors is documented (California), including, for Texas, the practices and policies applicable to a known child's data" />
      <CheckRow checked={intake.filing_metrics_documented}
        onChange={(v) => setIntake({ ...intake, filing_metrics_documented: v })}
        label="The consumer-request metrics required by Cal. Civ. Code § 1798.99.85(a)(1)-(2) are compiled" />
      <CheckRow checked={intake.filing_rights_instructions_documented}
        onChange={(v) => setIntake({ ...intake, filing_rights_instructions_documented: v })}
        label="We have a page giving consumers prominently displayed instructions on exercising their rights (Texas)" />
      <CheckRow checked={intake.filing_tx_categories_documented}
        onChange={(v) => setIntake({ ...intake, filing_tx_categories_documented: v })}
        label="A description of the categories of data we process and transfer is ready (Texas)" />
      <CheckRow checked={intake.filing_tx_credentialing_statement_documented}
        onChange={(v) => setIntake({ ...intake, filing_tx_credentialing_statement_documented: v })}
        label="A statement of whether we implement a purchaser credentialing process is ready (Texas)" />
      <CheckRow checked={intake.filing_tx_breach_count_documented}
        onChange={(v) => setIntake({ ...intake, filing_tx_breach_count_documented: v })}
        label="The number of security breaches in the preceding year, and the consumers affected by each if known, is compiled (Texas)" />
    </div>
  );

  return (
    <>
      <Helmet>
        <title>DPA & AI Act Registration Assessment — End User Privacy</title>
        <meta name="description" content="Free assessment that maps your organization to required DPA registrations, DPO appointments, EU representative obligations, and EU AI Act filings across 50+ jurisdictions." />
        <link rel="canonical" href="https://enduserprivacy.com/registration-manager" />
      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="Registration">
        <PageContainer>
          <div className="max-w-3xl mx-auto py-10">
            <header className="mb-8">
              <h1 className="tracking-tight text-foreground">
                Where do you need to register?
              </h1>
              <p className="text-muted-foreground mt-2">
                Free assessment. We map your organization to required DPA, DPO, EU representative, and EU AI Act filings worldwide.
              </p>
              {/* DISPATCH 5 / G10 — the jurisdiction dependency, stated once and early. */}
              <p className="text-sm text-foreground mt-3 rounded-md border border-border bg-muted/40 p-3">
                The jurisdictions you select in Step 3 drive everything else. Each country or market you select adds its own filing analysis to the report; nothing is examined for a place you have not selected. Steps 1 and 2 describe the organization and its data, and are read against whichever regimes Step 3 puts in play.
              </p>
            </header>

            <div className="mb-4">
              <DraftRestoreBanner
                draftFound={draftFound}
                touched={touched}
                draftUpdatedAt={draftUpdatedAt}
                onResume={applyRestore}
                onDiscard={() => { void clearDraft(); }}
              />
            </div>


            <div className="relative">
              {isAnon && (
                <button
                  type="button"
                  aria-label="Create an account to use the Registration Filings Manager"
                  onClick={() => setAuthGateOpen(true)}
                  onFocus={() => setAuthGateOpen(true)}
                  className="absolute inset-0 z-20 w-full h-full bg-transparent cursor-pointer border-0 p-0 m-0"
                />
              )}
              <div
                {...(isAnon ? { inert: "" } : {})}
                aria-hidden={isAnon}
                style={isAnon ? { pointerEvents: "none", userSelect: "none", opacity: 0.6 } : undefined}
              >
            <Card>
              <CardHeader>
                <CardTitle aria-live="polite">Step {step} of 3</CardTitle>
                <CardDescription>
                  {step === 1 && "About your organization — the size, role and sector facts that state and EU thresholds are measured against."}
                  {step === 2 && "What data you process — each answer here switches a filing duty on or off once the jurisdictions are known."}
                  {step === 3 && "Where you operate — the selections that decide which regimes the report examines at all."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RequiredLegend />
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org">Organization name<Req /> <span className="text-xs text-muted-foreground">(legal entity name as it will appear on the assessment)</span></Label>
                      <Input id="org" value={intake.organization_name} autoComplete="organization"
                        placeholder="Legal entity name"
                        onChange={(e) => setIntake({ ...intake, organization_name: e.target.value })} />
                    </div>
                    <div>
                      {/* CEO decision 2026-07-23 — optional public-authority flag. Unchecked default. */}
                      <CheckRow
                        checked={intake.is_public_authority}
                        onChange={(v) => setIntake({ ...intake, is_public_authority: v })}
                        label="This organisation is a public authority or public/Union body"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Where is your org established?</Label>
                        <p className="text-xs text-muted-foreground">The country of your main place of business — where management decisions about the processing are actually taken, not where the entity is incorporated on paper.</p>
                        <Select value={intake.organization_country}
                          onValueChange={(v) => setIntake({ ...intake, organization_country: v })}>
                          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(groupedMarkets).map(([region, items]) => (
                              <div key={region}>
                                <div className="px-2 py-1 text-xs text-muted-foreground">{region}</div>
                                {items.map((j) => (
                                  <SelectItem key={j.code} value={j.code}>{j.name}</SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Org size band</Label>
                        <Select value={intake.organization_size}
                          onValueChange={(v) => setIntake({ ...intake, organization_size: v })}>
                          <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                          <SelectContent>
                            {ORG_SIZES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emp">Employees (total headcount) <DefPopover termKey="gdpr_dpo" /></Label>
                        <Input id="emp" type="number" min={0} placeholder="Whole number"
                          value={intake.employee_count}
                          onChange={(e) => setIntake({ ...intake, employee_count: e.target.value })} />
                        <p className="text-xs text-muted-foreground">Total staff of the whole entity — employees, workers, partners and office holders. The UK ICO fee tier and the size band are measured against it. Germany's BDSG § 38 counts a narrower group, persons constantly engaged in automated processing; the report names that as a question rather than inferring it from headcount.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rev">Annual revenue (USD)</Label>
                        <Input id="rev" type="number" min={0} placeholder="Whole number, USD"
                          value={intake.annual_revenue_usd}
                          onChange={(e) => setIntake({ ...intake, annual_revenue_usd: e.target.value })} />
                        <p className="text-xs text-muted-foreground">Gross annual revenue of the whole entity, worldwide, for the last full year. The report uses it for the UK ICO fee tier only, converted to sterling at a disclosed planning rate; left blank with a UK market, the report states the two tiers the staff count leaves possible instead of asserting one.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ds">Data subjects / year</Label>
                        <Input id="ds" type="number" min={0} placeholder="Whole number"
                          value={intake.data_subjects_count}
                          onChange={(e) => setIntake({ ...intake, data_subjects_count: e.target.value })} />
                        <p className="text-xs text-muted-foreground">Distinct individuals whose data you handled in the last year, counted once each — not records or transactions. The figure is what the &quot;large scale&quot; test for a mandatory data protection officer turns on.</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={intake.industry}
                          onValueChange={(v) => setIntake({ ...intake, industry: v })}>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role under GDPR</Label>
                        <p className="text-xs text-muted-foreground">You are a controller where you decide why and how personal data is used, and a processor where you only act on another organisation&apos;s written instructions. Most organisations that do both should select &quot;Both&quot;.</p>
                        <Select value={intake.role}
                          onValueChange={(v) => setIntake({ ...intake, role: v as IntakeState["role"] })}>
                          <SelectTrigger><SelectValue placeholder="Controller / Processor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="controller">Controller</SelectItem>
                            <SelectItem value="processor">Processor</SelectItem>
                            <SelectItem value="both">Both (mixed)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Contact email (optional)</Label>
                      <Input id="email" type="email" value={intake.email}
                        onChange={(e) => setIntake({ ...intake, email: e.target.value })}
                        placeholder="name@organisation.com" />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Answer for what the organisation does today, across all its activities. Each box you tick can add a registration, an officer appointment or a filing, but only in the jurisdictions selected in Step 3.
                    </p>
                    <CheckRow checked={intake.processes_personal_data}
                      onChange={(v) => setIntake({ ...intake, processes_personal_data: v })}
                      label="We process personal data of identifiable individuals" />
                    <CheckRow checked={intake.processes_special_categories}
                      onChange={(v) => setIntake({ ...intake, processes_special_categories: v })}
                      label="We process special-category data (health, biometric, race, religion, sexual orientation, political opinion)" />
                    <CheckRow checked={intake.processes_biometrics_for_id}
                      onChange={(v) => setIntake({ ...intake, processes_biometrics_for_id: v })}
                      label="We use biometric identifiers for identification (BIPA / TX CUBI / WA scope)" />
                    <CheckRow checked={intake.processes_children_data}
                      onChange={(v) => setIntake({ ...intake, processes_children_data: v })}
                      label="We process data of children under 16" />
                    <CheckRow checked={intake.large_scale_monitoring}
                      onChange={(v) => setIntake({ ...intake, large_scale_monitoring: v })}
                      label="Our core activities involve large-scale, regular monitoring (tracking, scoring, behavioural targeting)" />
                    <CheckRow checked={intake.uses_ai_systems}
                      onChange={(v) => setIntake({ ...intake, uses_ai_systems: v })}
                      label="We use or deploy AI systems that affect users (recommendations, scoring, automated decisions)" />
                    {intake.uses_ai_systems && (
                      <div className="ml-6 space-y-3">
                        <CheckRow checked={intake.ai_high_risk}
                          onChange={(v) => setIntake({ ...intake, ai_high_risk: v })}
                          label="At least one of our AI systems is high-risk under the EU AI Act (employment, credit, biometrics, education, critical infrastructure)" />
                        {intake.ai_high_risk && (
                          <div className="ml-6 space-y-1">
                            <Label className="text-sm">Our role for the high-risk system</Label>
                            <p className="text-xs text-muted-foreground">The EU database registration under Article 49(1) is the provider's duty — the organisation that developed the system or places it on the market under its own name. A private organisation that only uses another provider's system registers nothing; a public authority registers its use.</p>
                            <Select value={intake.ai_high_risk_role}
                              onValueChange={(v) => setIntake({ ...intake, ai_high_risk_role: v })}>
                              <SelectTrigger className="max-w-md"><SelectValue placeholder="Select our role" /></SelectTrigger>
                              <SelectContent>
                                {AI_ROLE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <CheckRow checked={intake.ai_general_purpose_provider}
                          onChange={(v) => setIntake({ ...intake, ai_general_purpose_provider: v })}
                          label="We are a provider of a general-purpose AI model placed on the EU market" />
                      </div>
                    )}
                    <CheckRow checked={intake.cross_border_transfers}
                      onChange={(v) => setIntake({ ...intake, cross_border_transfers: v })}
                      label="We transfer personal data across borders (e.g. to US sub-processors)" />
                    <CheckRow checked={intake.acts_as_data_broker}
                      onChange={(v) => setIntake({ ...intake, acts_as_data_broker: v })}
                      label="We act as a data broker (collect & sell personal data without a direct relationship to consumers)" />
                    <CheckRow checked={intake.sells_or_shares_personal_info}
                      onChange={(v) => setIntake({ ...intake, sells_or_shares_personal_info: v })}
                      label="We sell or share personal information (CCPA-style — including cross-context advertising)" />

                    {/* Item 316 — the counts the state data-broker statutes actually
                        use. California, Oregon, Texas and Vermont each define
                        "data broker" differently, so these are asked once and
                        applied separately against each state's own definition. */}
                    {showBrokerDetail && brokerDetailBlock}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base">Where are you established?</Label>
                      <p className="text-sm text-muted-foreground">Establishment means stable arrangements — an office, staff, or a subsidiary — not merely having customers in a place. An EU or UK establishment changes which authority you deal with and whether a representative must be appointed.</p>
                      <CheckRow checked={intake.has_eu_establishment}
                        onChange={(v) => setIntake({ ...intake, has_eu_establishment: v })}
                        label="We have an EU establishment (office, employees, or subsidiary)" />
                      {intake.has_eu_establishment && (
                        <div className="ml-6 space-y-2">
                          <Label className="text-sm">EU lead supervisory authority (if known) <DefPopover termKey="gdpr_supervisory_authority" /></Label>
                          <p className="text-xs text-muted-foreground">The authority of the member state where your main establishment sits. Left blank, the report picks the likely lead from your establishment rather than asserting one.</p>
                          <Select value={intake.eu_lead_member_state}
                            onValueChange={(v) => setIntake({ ...intake, eu_lead_member_state: v })}>
                            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Auto-pick from establishment" /></SelectTrigger>
                            <SelectContent>
                              {(groupedMarkets["EU"] || []).map((j) => (
                                <SelectItem key={j.code} value={j.code}>{j.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <CheckRow checked={intake.has_uk_establishment}
                        onChange={(v) => setIntake({ ...intake, has_uk_establishment: v })}
                        label="We have a UK establishment" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base">Which markets do you serve or monitor?</Label>
                      <p className="text-sm text-muted-foreground">
                        Select every place where you offer goods or services, or monitor behaviour. Each selection adds that jurisdiction&apos;s filing analysis to the report; a jurisdiction left unselected is not examined at all, even if the answers in Steps 1 and 2 would otherwise trigger a duty there.
                      </p>
                      <div className="space-y-4 max-h-96 overflow-auto pr-2 border rounded-md p-4">
                        {Object.entries(groupedMarkets).map(([region, items]) => (
                          <div key={region}>
                            <div className="text-sm font-semibold text-foreground mb-2">{region}</div>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {items.map((j) => (
                                <label key={j.code} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox
                                    checked={intake.markets_served.includes(j.code)}
                                    onCheckedChange={() => toggleMarket(j.code)}
                                  />
                                  <span>{j.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {registryStateSelected && !brokerFlagsOn && (
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                          You selected a state with a data-broker registry. Its registration turns on the answers below, which Step 2 shows only to companies that describe themselves as brokers or sellers.
                        </p>
                        {brokerDetailBlock}
                      </div>
                    )}

                    <div className="space-y-3 border-t pt-4">
                      <Label className="text-base">Approval and review (optional)</Label>
                      <p className="text-sm text-muted-foreground">
                        Naming an approver turns the assessment into an accountability record. Left blank, the report says the approval was not recorded rather than printing an empty signature line.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Approved by (name)</Label>
                          <Input value={intake.approved_by_name}
                            onChange={(e) => setIntake({ ...intake, approved_by_name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Role or title</Label>
                          <Input value={intake.approved_by_title}
                            onChange={(e) => setIntake({ ...intake, approved_by_title: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Date of approval</Label>
                          <Input type="date" value={intake.approval_date}
                            onChange={(e) => setIntake({ ...intake, approval_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Next review due</Label>
                          <Input type="date" value={intake.next_review_due}
                            onChange={(e) => setIntake({ ...intake, next_review_due: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <ValidationErrorSummary message={validationError} className="mb-4" />
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={() => { setValidationError(null); setStep(Math.max(1, step - 1)); }} disabled={step === 1}>
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={() => { if (isAnon && step + 1 === 3) { setAuthGateOpen(true); return; } setValidationError(null); setStep(step + 1); }}>Next</Button>

                  ) : (
                    <Button onClick={submit} disabled={submitting}>
                      {submitting ? "Generating..." : "Show me where I need to register"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
              </div>
            </div>
            <div className="mt-6">
              <RegistrationDisclaimer />
            </div>
            <AuthGateModal
              open={authGateOpen}
              onClose={() => setAuthGateOpen(false)}
              {...intakeGate("registration")}
            />
          </div>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-1" />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
