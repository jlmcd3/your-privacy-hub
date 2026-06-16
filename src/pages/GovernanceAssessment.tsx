
import { useState, useMemo } from "react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import StatuteRail from "@/components/admt/StatuteRail";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";

import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";

// Price tiers managed by useToolPrice hook (subscriber-aware)

const SECTORS = ["Technology/SaaS", "Healthcare/Life Sciences", "Financial services", "Retail/ecommerce", "Media/advertising", "Professional services", "Education", "Government/public sector", "Legal services", "Manufacturing", "Other"];
const SIZES = ["1-10", "11-50", "51-250", "251-1000", "1001+"];
const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Japan", "Other"];
const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
const SPECIAL_CATS = ["Health data", "Biometric data", "Genetic data", "Racial/ethnic origin", "Political opinions", "Religious beliefs", "Trade union membership", "Sexual orientation"];

const Pills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button key={opt} type="button" onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}>
          {opt}
        </button>
      );
    })}
  </div>
);

const Radio = ({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    {options.map((o) => (
      <label key={o} className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} value={o} checked={value === o} onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm">{o}</span>
      </label>
    ))}
  </div>
);

const GovernanceAssessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("governance_assessment");
  const { isPremium } = usePremiumStatus();
  const { clientId } = useActiveClient();

  const [step, setStep] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Step 1
  const [organizationName, setOrganizationName] = useState("");
  const [sector, setSector] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [euUkData, setEuUkData] = useState<"" | "Yes" | "No">("");
  const [tools, setTools] = useState<string[]>([]);
  const [otherTool, setOtherTool] = useState("");

  // Step 2
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [specialCategory, setSpecialCategory] = useState<"" | "Yes" | "No">("");
  const [specialCategoriesList, setSpecialCategoriesList] = useState<string[]>([]);

  // Step 3
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [acceptableUse, setAcceptableUse] = useState("");
  const [dpoStatus, setDpoStatus] = useState("");
  const [dpiaStatus, setDpiaStatus] = useState("");
  const [incidentResponse, setIncidentResponse] = useState("");

  // Step 4
  const [trainingStatus, setTrainingStatus] = useState("");
  const [toolInstruction, setToolInstruction] = useState("");

  // Step 5 (conditional)
  const [dpaStatus, setDpaStatus] = useState("");
  const [transferStatus, setTransferStatus] = useState("");

  const orgSizeNum = useMemo(() => {
    if (orgSize === "1-10" || orgSize === "11-50") return "small";
    return "large";
  }, [orgSize]);

  const showDpoQ = euUkData === "Yes" || orgSizeNum === "large";
  const showStep5 = euUkData === "Yes";
  const totalSteps = showStep5 ? 6 : 5; // 5 sections + summary

  const stepValid = (): string | null => {
    if (step === 1) {
      if (!organizationName.trim()) return "Tell us the name of the organisation being assessed.";
      if (!sector || !orgSize || !jurisdictions.length || !euUkData || (!tools.length && !otherTool.trim()))
        return "Please answer all gateway questions.";
    }
    if (step === 2) {
      if (!dataCategories.length || !specialCategory) return "Please complete the data profile.";
      if (specialCategory === "Yes" && !specialCategoriesList.length) return "Select which special categories apply.";
    }
    if (step === 3) {
      if (!privacyPolicy || !acceptableUse || !dpiaStatus || !incidentResponse) return "Please complete all required questions.";
      if (showDpoQ && !dpoStatus) return "Please answer the DPO question.";
    }
    if (step === 4) {
      if (!trainingStatus || !toolInstruction) return "Please complete training questions.";
    }
    if (step === 5 && showStep5) {
      if (!dpaStatus || !transferStatus) return "Please complete transfer questions.";
    }
    return null;
  };

  const next = () => {
    const err = stepValid();
    if (err) { toast({ title: "Required", description: err, variant: "destructive" }); return; }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const buildIntake = () => ({
    organization_name: organizationName,
    sector, org_size: orgSize, jurisdictions, eu_uk_data: euUkData,
    tools: otherTool.trim() ? [...tools, `Other: ${otherTool.trim()}`] : tools,
    data_categories: dataCategories,
    special_category: specialCategory, special_categories_list: specialCategoriesList,
    privacy_policy: privacyPolicy, acceptable_use: acceptableUse,
    dpo_status: showDpoQ ? dpoStatus : "n/a",
    dpia_status: dpiaStatus, incident_response: incidentResponse,
    training_status: trainingStatus, tool_instruction: toolInstruction,
    dpa_status: showStep5 ? dpaStatus : "n/a",
    transfer_status: showStep5 ? transferStatus : "n/a",
  });

  const handlePurchase = async () => {
    if (!user) { setAuthGateOpen(true); return; }

    // For $0 (included with Platform), bypass Stripe entirely
    if (pricing.price === 0) {
      setPurchasing(true);
      const { data, error } = await supabase.functions.invoke(
        "run-governance-assessment",
        { body: { intake_data: buildIntake(), user_id: user.id, client_id: clientId ?? null } }
      );
      setPurchasing(false);
      if (error || !data?.id) {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      navigate(`/governance-assessment/result/${data.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured. Please check back soon.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  const intakeForCheckout = useMemo(() => buildIntake(), [
    organizationName, sector, orgSize, jurisdictions, euUkData, tools, otherTool, dataCategories,
    specialCategory, specialCategoriesList, privacyPolicy, acceptableUse,
    dpoStatus, dpiaStatus, incidentResponse, trainingStatus, toolInstruction,
    dpaStatus, transferStatus, showDpoQ, showStep5,
  ]);

  const summaryStep = step === totalSteps;

  // GuidedRail — tier-gated GDPR regulation reference, updates per step
  const guidanceTier = useGuidanceTier();
  

  const govRailConfigs: Record<number, Parameters<typeof useGdprRailEntry>[0]> = {
    1: {
      article: "3", jurisdiction: "eu",
      fieldLabel: "Territorial scope — Art. 3 GDPR",
      plainSummary: "GDPR applies to any organisation established in the EU/EEA, and to any organisation outside the EU that offers goods or services to EU residents or monitors their behaviour. US, UK, and other non-EU companies processing EU resident data are subject to GDPR regardless of where they are based.",
      relatedCitations: [{ citation: "Art. 3(2) GDPR", label: "Extra-territorial application" }],
    },
    2: {
      article: "9", jurisdiction: "eu", recital: 51,
      fieldLabel: "Special categories — Art. 9 GDPR",
      plainSummary: "Processing special category data is prohibited unless one of ten Art. 9(2) conditions applies. The most common for commercial organisations are explicit consent (Art. 9(2)(a)) and substantial public interest under domestic law (Art. 9(2)(g)). Processing without a valid Art. 9(2) condition is an absolute prohibition — not subject to balancing.",
      relatedCitations: [{ citation: "Art. 9(2) GDPR", label: "Permitted processing conditions" }],
    },
    3: {
      article: "37", jurisdiction: "eu",
      fieldLabel: "Data Protection Officer — Arts. 37–39 GDPR",
      plainSummary: "A DPO must be designated where processing is carried out by a public authority, where core activities consist of large-scale regular and systematic monitoring of data subjects, or where core activities consist of large-scale processing of special category data. 'Core activities' means the primary business activities, not ancillary HR or IT functions.",
      relatedCitations: [
        { citation: "Art. 38 GDPR", label: "DPO position" },
        { citation: "Art. 39 GDPR", label: "DPO tasks" },
      ],
    },
    4: {
      article: "32", jurisdiction: "eu",
      fieldLabel: "Security and training — Art. 32 GDPR",
      plainSummary: "Controllers and processors must implement appropriate technical and organisational measures to ensure security appropriate to the risk. Art. 32(4) specifically requires steps ensuring any person acting under the controller's authority who has access to personal data processes it only on the controller's instructions.",
      relatedCitations: [{ citation: "Art. 32(4) GDPR", label: "Staff instruction obligation" }],
    },
    5: {
      article: "28", jurisdiction: "eu",
      fieldLabel: "Processor contracts and transfers — Arts. 28, 46 GDPR",
      plainSummary: "Processing by a processor must be governed by a binding contract containing the eight Art. 28(3) mandatory clauses. Any transfer of personal data outside the EEA/UK additionally requires an Art. 46 mechanism — most commonly Standard Contractual Clauses.",
      relatedCitations: [
        { citation: "Art. 28(3) GDPR", label: "Eight mandatory DPA clauses" },
        { citation: "Art. 46(2)(c) GDPR", label: "Standard Contractual Clauses" },
      ],
    },
  };

  const govRailOpts = !summaryStep ? (govRailConfigs[step] ?? null) : null;
  const { entry: govRailEntry } = useGdprRailEntry(govRailOpts);

  const handleGovRailFocus = () => {};

  const govEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories", "breach_notification", "dpo_absence", "dpia_absence",
     "processor_contract", "international_transfer"],
    guidanceTier.tier === "paid"
  );

  // Live GDPR regulatory footprint — deterministic, updates as user answers
  const gdprFootprint = useMemo(() => {
    const items: { citation: string; label: string; triggered: boolean; note?: string }[] = [
      {
        citation: "Art. 37 GDPR",
        label: "DPO designation may be mandatory",
        triggered: showDpoQ && dpoStatus === "No",
        note: "Large-scale processing or systematic monitoring of individuals",
      },
      {
        citation: "Art. 35 GDPR",
        label: "DPIA required before processing begins",
        triggered: specialCategory === "Yes" && orgSizeNum === "large",
        note: "Large-scale special category processing is a mandatory DPIA trigger",
      },
      {
        citation: "Art. 33 GDPR",
        label: "72-hour breach notification obligation applies",
        triggered: euUkData === "Yes",
      },
      {
        citation: "Art. 28 GDPR",
        label: "Written DPAs required with all processors",
        triggered: euUkData === "Yes" && dpaStatus !== "" && dpaStatus !== "Yes, all vendors",
        note: dpaStatus ? `Current status: ${dpaStatus}` : undefined,
      },
      {
        citation: "Arts. 44–46 GDPR",
        label: "Transfer mechanism required for non-EEA/UK processors",
        triggered: euUkData === "Yes" && (
          transferStatus.includes("US-based") || transferStatus.includes("non-adequate")
        ),
        note: "Most commonly satisfied by EU Standard Contractual Clauses",
      },
      {
        citation: "Art. 32(4) GDPR",
        label: "Staff data protection training obligation",
        triggered: euUkData === "Yes" && (
          trainingStatus === "No formal training" || trainingStatus === "Ad hoc only"
        ),
      },
    ];
    return items.filter((i) => i.triggered);
  }, [euUkData, specialCategory, orgSizeNum, dpoStatus, dpaStatus, transferStatus, trainingStatus, showDpoQ]);


  return (
    <WorkspaceLayout className="bg-background">
      <Helmet><title>Privacy Program Assessment Tool | End User Privacy</title>
        <meta name="description" content="Score your privacy programme across ten domains against what regulators actually inspect — with cited enforcement decisions behind every risk finding and recommended action." /></Helmet>      <header className="bg-[#0d2a45] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            ⚖️ Privacy Programme Assessment · ${pricing.price}
          </span>
          <h1 className="font-serif text-white mb-3">Privacy Program Assessment Tool</h1>
          <p className="text-slate-300 text-lg">A structured review of your organisation's data governance practices across ten domains — with cited enforcement decisions behind every risk finding.</p>
          <p className="text-slate-400 text-sm mt-3">
            {isPremium
              ? "Estimated completion time: 10-15 minutes. Your completed report will be saved to My Reports."
              : "Estimated completion time: 10-15 minutes. Sign in to save your completed report to My Reports."}
          </p>
          <div className="mt-4"><SampleReportLink toolSlug="governance" tone="onDark" variant="link" /></div>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <div className="p-4 bg-muted/50 border-l-4 border-muted-foreground/30 rounded text-sm text-muted-foreground">
          This assessment is a compliance framework tool. It identifies governance gaps to review with qualified legal counsel. It does not constitute legal advice or a legal compliance opinion.
        </div>

        <div className="text-sm text-muted-foreground">Step {step} of {totalSteps}</div>

        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 bg-card border rounded-lg p-6 space-y-6" onFocus={handleGovRailFocus}>
          <RequiredLegend />
          {step === 1 && (
            <>
              <h2 className="">Gateway Questions</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">GDPR Art. 3 — territorial scope · Art. 4(1) — personal data definition</p>
              <div>
                <Label htmlFor="org">Organisation being assessed<Req /></Label>
                <input id="org" type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Acme Retail Ltd" className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
                <p className="text-meta text-muted-foreground mt-1">The organisation whose privacy programme this assessment evaluates.</p>
              </div>
              <div>
                <Label>Q1: Primary sector<Req /></Label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q2: Number of employees<Req /></Label>
                <select value={orgSize} onChange={(e) => setOrgSize(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q3: Jurisdictions where you operate or process personal data<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3 GDPR)</span></Label>
                <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
              </div>
              <div>
                <Label>Q4: Do you process personal data of EU or UK residents?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 3(2) GDPR — extra-territorial scope)</span></Label>
                <div className="mt-2"><Radio name="euuk" options={["Yes", "No"]} value={euUkData} onChange={(v) => setEuUkData(v as any)} /></div>
              </div>
              <div>
                <Label>Q5: Technology tools that process personal data<Req /></Label>
                <div className="mt-2"><Pills options={TOOLS} value={tools} onChange={setTools} /></div>
                <Input placeholder="Other (specify)" value={otherTool} onChange={(e) => setOtherTool(e.target.value)} className="mt-2" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="">Data and Processing Profile</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 4(1) — personal data · Art. 9 — special categories · Art. 6(1) — lawful basis</p>
              <div>
                <Label>Q6: Categories of personal data processed<Req /></Label>
                <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div>
              </div>
              <div>
                <Label>Q7: Do you process health, biometric, or other special category data?<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 GDPR)</span> <EnforcementSignalIcon signalKey="special_categories" signals={govEnforcementSignals} /></Label>
                <div className="mt-2"><Radio name="spec" options={["Yes", "No"]} value={specialCategory} onChange={(v) => setSpecialCategory(v as any)} /></div>
                {specialCategory === "Yes" && (
                  <div className="mt-3"><Label>Which categories?</Label><div className="mt-2"><Pills options={SPECIAL_CATS} value={specialCategoriesList} onChange={setSpecialCategoriesList} /></div></div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="">Governance Infrastructure</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 24 — controller responsibility · Art. 37 — DPO designation</p>
              <div><Label>Q8: Documented privacy policy/notice<Req /> <DefPopover termKey="gdpr_transparency" /></Label><div className="mt-2"><Radio name="pp" options={["Yes, current (reviewed in last 12 months)", "Yes, but outdated", "No"]} value={privacyPolicy} onChange={setPrivacyPolicy} /></div></div>
              <div><Label>Q9: Acceptable use policy for technology tools<Req /></Label><div className="mt-2"><Radio name="aup" options={["Yes, covers external technology tools specifically", "Yes, but general only", "No"]} value={acceptableUse} onChange={setAcceptableUse} /></div></div>
              {showDpoQ && (<div><Label>Q10: Designated DPO or equivalent?<Req /> <DefPopover termKey="gdpr_dpo" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 37–39 GDPR)</span> <EnforcementSignalIcon signalKey="dpo_absence" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpo" options={["Yes, formal DPO", "Yes, informal privacy lead", "No"]} value={dpoStatus} onChange={setDpoStatus} /></div></div>)}
              <div><Label>Q11: Has any DPIA been conducted?<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 35 GDPR)</span> <EnforcementSignalIcon signalKey="dpia_absence" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpia" options={["Yes, multiple DPIAs completed", "Yes, one DPIA completed", "No, none conducted", "Unsure"]} value={dpiaStatus} onChange={setDpiaStatus} /></div></div>
              <div><Label>Q12: Incident response plan covering personal data breaches<Req /> <DefPopover termKey="gdpr_breach_notification" /> <span className="text-xs text-muted-foreground font-mono">(Art. 33 GDPR — 72 hours)</span> <EnforcementSignalIcon signalKey="breach_notification" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="ir" options={["Yes, tested in last 12 months", "Yes, but not tested", "Documented but informal", "No"]} value={incidentResponse} onChange={setIncidentResponse} /></div></div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="">Training and Awareness</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 5(2) — accountability · Art. 32(4) — staff training obligation</p>
              <div><Label>Q13: Privacy / data protection training<Req /></Label><div className="mt-2"><Radio name="train" options={["Yes, formal onboarding + annual refresh", "Yes, onboarding only", "Ad hoc only", "No formal training"]} value={trainingStatus} onChange={setTrainingStatus} /></div></div>
              <div><Label>Q14: Instruction on what data may/may not be submitted to external technology tools<Req /></Label><div className="mt-2"><Radio name="ti" options={["Yes, written policy with specific prohibitions", "Verbal guidance only", "No instruction provided"]} value={toolInstruction} onChange={setToolInstruction} /></div></div>
            </>
          )}

          {step === 5 && showStep5 && (
            <>
              <h2 className="">Transfer and Compliance</h2>
              <p className="text-xs font-mono text-muted-foreground -mt-3">Art. 28 — processor contracts · Arts. 44–49 — international transfers · Art. 46(2)(c) — SCCs</p>
              <div><Label>Q15: DPAs signed with relevant vendors<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 28(3) GDPR)</span> <EnforcementSignalIcon signalKey="processor_contract" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="dpa" options={["Yes, all vendors", "Most vendors", "Some vendors", "No"]} value={dpaStatus} onChange={setDpaStatus} /></div></div>
              <div><Label>Q16: Cross-border transfers outside EU/UK<Req /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–46 GDPR)</span> <EnforcementSignalIcon signalKey="international_transfer" signals={govEnforcementSignals} /></Label><div className="mt-2"><Radio name="xfer" options={["Yes, US-based tools", "Yes, other non-adequate countries", "All tools store data in EU/UK", "Unsure"]} value={transferStatus} onChange={setTransferStatus} /></div></div>
            </>
          )}

          {summaryStep && (() => {
            const rows: { label: string; value: string }[] = [];
            const push = (label: string, value: string | string[] | undefined | null) => {
              if (value == null) return;
              if (Array.isArray(value)) {
                if (value.length === 0) return;
                rows.push({ label, value: value.join(", ") });
              } else {
                const v = String(value).trim();
                if (!v) return;
                rows.push({ label, value: v });
              }
            };
            push("Sector", sector);
            push("Organisation size", orgSize);
            push("Jurisdictions", jurisdictions);
            push("EU/UK personal data", euUkData);
            const toolsDisplay = otherTool.trim() ? [...tools, `Other: ${otherTool.trim()}`] : tools;
            push("Tools in use", toolsDisplay);
            push("Data categories", dataCategories);
            push("Special category data", specialCategory);
            if (specialCategory === "Yes") push("Special categories", specialCategoriesList);
            push("Privacy policy", privacyPolicy);
            push("Acceptable use policy", acceptableUse);
            if (showDpoQ) push("DPO appointed", dpoStatus);
            push("DPIA conducted previously", dpiaStatus);
            push("Incident response plan", incidentResponse);
            push("Employee privacy training", trainingStatus);
            push("Data submission instruction", toolInstruction);
            if (showStep5) {
              push("DPA signed with vendors", dpaStatus);
              push("Cross-border transfers", transferStatus);
            }
            return (
              <>
                <div>
                  <h2 className="">Review your answers</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review the inputs below before running. You can go back to edit any step.
                  </p>
                </div>
                <div className="rounded-lg border bg-card divide-y">
                  {rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
                      <div className="text-sm font-medium text-muted-foreground sm:col-span-1">{r.label}</div>
                      <div className="text-sm text-foreground sm:col-span-2 break-words">{r.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-sm rounded">
                  This is a compliance framework tool, not legal advice. Findings should be reviewed with qualified legal counsel.
                </div>
              </>
            );
          })()}

          {step > 1 && !summaryStep && gdprFootprint.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                ⚡ GDPR obligations triggered by your answers
              </p>
              {gdprFootprint.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5 shrink-0">▸</span>
                  <div className="text-xs">
                    <span className="font-mono text-blue-700 dark:text-blue-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    {item.note && <span className="text-muted-foreground ml-1">— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>
            {!summaryStep ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button onClick={handlePurchase} disabled={purchasing || (pricing.price > 0 && !pricing.stripeConfigured)}>
                {pricing.price === 0
                  ? purchasing
                    ? "Generating…"
                    : "Generate Assessment — Free"
                  : !pricing.stripeConfigured
                    ? `Payments Coming Soon — $${pricing.price}`
                    : purchasing
                      ? "Redirecting…"
                      : `Purchase Full Healthcheck — $${pricing.price}`}
              </Button>
            )}
          </div>
        </div>
        <StatuteRail entry={govRailEntry} />
        </div>



        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/governance-assessment" />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="governance_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={intakeForCheckout}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) navigate(`/governance-assessment/result/${id}?purchased=true`);
          }}
        />
        <ToolSamplePreview
          toolType="healthcheck"
          toolName="Privacy Program Assessment Tool"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      </main>
    </WorkspaceLayout>
  );
};

export default GovernanceAssessment;
