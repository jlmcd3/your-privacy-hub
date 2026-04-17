import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const [step, setStep] = useState(1);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
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

  const handleSubmit = async () => {
    if (!user) { navigate(`/login?return=${encodeURIComponent("/governance-assessment")}`); return; }
    const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", user.id).maybeSingle();
    if (!profile?.is_premium) { setPaywallOpen(true); return; }
    setSubmitting(true);
    try {
      const { data: row, error } = await supabase.from("governance_assessments").insert({
        user_id: user.id, intake_data: buildIntake(), status: "pending",
      }).select().single();
      if (error || !row) throw error ?? new Error("Insert failed");
      const { error: fnErr } = await supabase.functions.invoke("run-governance-assessment", { body: { assessment_id: row.id } });
      if (fnErr) throw fnErr;
      navigate(`/governance-assessment/result/${row.id}`);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message ?? "Try again.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const summaryStep = step === totalSteps;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Data Governance Readiness Assessment | EndUserPrivacy</title></Helmet>
      <Navbar />
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">⭐ Premium Tool</span>
          <h1 className="text-3xl md:text-4xl font-serif mb-3">Data Governance Readiness Assessment</h1>
          <p className="text-slate-300 text-lg">A structured review of your organisation's data governance practices across ten domains, mapped to applicable regulatory frameworks.</p>
          <p className="text-slate-400 text-sm mt-3">Estimated completion time: 10-15 minutes. Your progress is not saved between sessions.</p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-6">
        <div className="p-4 bg-muted/50 border-l-4 border-muted-foreground/30 rounded text-sm text-muted-foreground">
          This assessment is a compliance framework tool. It identifies governance gaps to review with qualified legal counsel. It does not constitute legal advice or a legal compliance opinion.
        </div>

        <div className="text-sm text-muted-foreground">Step {step} of {totalSteps}</div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold">Gateway Questions</h2>
              <div>
                <Label>Q1: Primary sector *</Label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q2: Number of employees *</Label>
                <select value={orgSize} onChange={(e) => setOrgSize(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                  <option value="">Select…</option>{SIZES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Q3: Jurisdictions where you operate or process personal data *</Label>
                <div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
              </div>
              <div>
                <Label>Q4: Do you process personal data of EU or UK residents? *</Label>
                <div className="mt-2"><Radio name="euuk" options={["Yes", "No"]} value={euUkData} onChange={(v) => setEuUkData(v as any)} /></div>
              </div>
              <div>
                <Label>Q5: Technology tools that process personal data *</Label>
                <div className="mt-2"><Pills options={TOOLS} value={tools} onChange={setTools} /></div>
                <Input placeholder="Other (specify)" value={otherTool} onChange={(e) => setOtherTool(e.target.value)} className="mt-2" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold">Data and Processing Profile</h2>
              <div>
                <Label>Q6: Categories of personal data processed *</Label>
                <div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div>
              </div>
              <div>
                <Label>Q7: Do you process health, biometric, or other special category data? *</Label>
                <div className="mt-2"><Radio name="spec" options={["Yes", "No"]} value={specialCategory} onChange={(v) => setSpecialCategory(v as any)} /></div>
                {specialCategory === "Yes" && (
                  <div className="mt-3"><Label>Which categories?</Label><div className="mt-2"><Pills options={SPECIAL_CATS} value={specialCategoriesList} onChange={setSpecialCategoriesList} /></div></div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold">Governance Infrastructure</h2>
              <div><Label>Q8: Documented privacy policy/notice *</Label><div className="mt-2"><Radio name="pp" options={["Yes, current (reviewed in last 12 months)", "Yes, but outdated", "No"]} value={privacyPolicy} onChange={setPrivacyPolicy} /></div></div>
              <div><Label>Q9: Acceptable use policy for technology tools *</Label><div className="mt-2"><Radio name="aup" options={["Yes, covers external technology tools specifically", "Yes, but general only", "No"]} value={acceptableUse} onChange={setAcceptableUse} /></div></div>
              {showDpoQ && (<div><Label>Q10: Designated DPO or equivalent? *</Label><div className="mt-2"><Radio name="dpo" options={["Yes, formal DPO", "Yes, informal privacy lead", "No"]} value={dpoStatus} onChange={setDpoStatus} /></div></div>)}
              <div><Label>Q11: Has any DPIA been conducted? *</Label><div className="mt-2"><Radio name="dpia" options={["Yes, multiple DPIAs completed", "Yes, one DPIA completed", "No, none conducted", "Unsure"]} value={dpiaStatus} onChange={setDpiaStatus} /></div></div>
              <div><Label>Q12: Incident response plan covering personal data breaches *</Label><div className="mt-2"><Radio name="ir" options={["Yes, tested in last 12 months", "Yes, but not tested", "Documented but informal", "No"]} value={incidentResponse} onChange={setIncidentResponse} /></div></div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-xl font-semibold">Training and Awareness</h2>
              <div><Label>Q13: Privacy / data protection training *</Label><div className="mt-2"><Radio name="train" options={["Yes, formal onboarding + annual refresh", "Yes, onboarding only", "Ad hoc only", "No formal training"]} value={trainingStatus} onChange={setTrainingStatus} /></div></div>
              <div><Label>Q14: Instruction on what data may/may not be submitted to external technology tools *</Label><div className="mt-2"><Radio name="ti" options={["Yes, written policy with specific prohibitions", "Verbal guidance only", "No instruction provided"]} value={toolInstruction} onChange={setToolInstruction} /></div></div>
            </>
          )}

          {step === 5 && showStep5 && (
            <>
              <h2 className="text-xl font-semibold">Transfer and Compliance</h2>
              <div><Label>Q15: DPAs signed with relevant vendors *</Label><div className="mt-2"><Radio name="dpa" options={["Yes, all vendors", "Most vendors", "Some vendors", "No"]} value={dpaStatus} onChange={setDpaStatus} /></div></div>
              <div><Label>Q16: Cross-border transfers outside EU/UK *</Label><div className="mt-2"><Radio name="xfer" options={["Yes, US-based tools", "Yes, other non-adequate countries", "All tools store data in EU/UK", "Unsure"]} value={transferStatus} onChange={setTransferStatus} /></div></div>
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
                  <h2 className="text-xl font-semibold">Review your answers</h2>
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

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={back} disabled={step === 1}>Back</Button>
            {!summaryStep ? (
              <Button onClick={next}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Running your governance assessment — this typically takes 45-60 seconds…" : "Run Assessment"}</Button>
            )}
          </div>
        </div>
      </main>

      <Dialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Premium tool</DialogTitle><DialogDescription>This assessment is included in Premium ($20/month) or available for a one-time purchase ($149).</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => navigate("/subscribe")}>Subscribe — $20/month</Button>
            <Button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
                    body: {
                      tool_type: "governance_assessment",
                      user_id: user?.id ?? null,
                      intake_data: buildIntake(),
                      return_url: window.location.origin,
                    },
                  });
                  if (error || !data?.url) throw error ?? new Error("Checkout failed");
                  window.location.href = data.url;
                } catch (err: any) {
                  toast({ title: "Checkout failed", description: err.message ?? "Try again.", variant: "destructive" });
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Redirecting…" : "Purchase — $149"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default GovernanceAssessment;
