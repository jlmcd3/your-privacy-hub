import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import { useToolPrice } from "@/hooks/useToolPrice";

const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const SAFEGUARDS = ["Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation", "Contractual restrictions", "None"];
const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Other"];
const LEGAL_BASES = ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))", "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))", "Legitimate interest (Art. 6(1)(f))", "Not yet determined"];

// Price tiers managed by useToolPrice hook (subscriber-aware)

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

const DPIAFramework = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const sourceId = params.get("source");
  const pricing = useToolPrice("dpia_framework");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [dataSubjects, setDataSubjects] = useState("");
  const [volume, setVolume] = useState("");
  const [processors, setProcessors] = useState<string[]>([]);
  const [otherProcessor, setOtherProcessor] = useState("");
  const [safeguards, setSafeguards] = useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [legalBasis, setLegalBasis] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Pre-populate from governance assessment if ?source= present
  useEffect(() => {
    if (!sourceId || !user) return;
    supabase.from("governance_assessments").select("dpia_scope, intake_data").eq("id", sourceId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const scope: any = Array.isArray(data.dpia_scope) ? data.dpia_scope[0] : data.dpia_scope;
      if (scope) {
        setName(scope.processing_activity || scope.name || "");
        if (scope.description) setDescription(scope.description);
        if (scope.purpose) setPurpose(scope.purpose);
        setPrefilled(true);
      }
      const intake: any = data.intake_data || {};
      if (Array.isArray(intake.jurisdictions)) setJurisdictions(intake.jurisdictions);
      if (Array.isArray(intake.data_categories)) setDataCategories(intake.data_categories);
    });
  }, [sourceId, user]);

  const validate = () => {
    if (!name.trim()) return "Processing activity name is required.";
    if (description.trim().length < 100) return "Description must be at least 100 characters.";
    if (!purpose.trim()) return "Purpose is required.";
    if (!dataCategories.length) return "Select at least one data category.";
    if (!dataSubjects.trim()) return "Data subjects are required.";
    if (!volume.trim()) return "Volume and frequency required.";
    if (!jurisdictions.length) return "Select at least one jurisdiction.";
    if (!legalBasis) return "Select a legal basis.";
    return null;
  };

  const buildIntake = () => ({
    processing_activity_name: name,
    description, purpose,
    data_categories: dataCategories,
    data_subjects: dataSubjects,
    volume_frequency: volume,
    third_party_processors: otherProcessor.trim() ? [...processors, `Other: ${otherProcessor.trim()}`] : processors,
    existing_safeguards: safeguards,
    jurisdictions,
    legal_basis_proposed: legalBasis,
    source_assessment_id: sourceId || null,
  });

  const handlePurchase = async () => {
    const err = validate();
    if (err) { toast({ title: "Please complete the form first", description: err, variant: "destructive" }); return; }
    if (!user) { navigate(`/login?return=${encodeURIComponent("/dpia-framework")}`); return; }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
        body: {
          tool_type: "dpia_framework",
          user_id: user.id,
          intake_data: buildIntake(),
          return_url: window.location.origin,
        },
      });
      if (error || !data?.url) throw error ?? new Error("Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err?.message?.includes("stripe_not_configured") || err?.context?.status === 503
        ? "Payments are not yet configured. Please check back soon."
        : err.message ?? "Try again.";
      toast({ title: "Checkout unavailable", description: msg, variant: "destructive" });
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>{`Impact Assessment Builder — from $${pricing.subscriberPrice ?? ""} | EndUserPrivacy`}</title></Helmet>
      <Navbar />

      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">📋 Compliance Framework Tool · ${pricing.price}{pricing.isSubscriber && pricing.standalonePrice > pricing.price ? ` (subscriber rate · standalone $${pricing.standalonePrice})` : ""}</span>
          <h1 className="text-3xl md:text-4xl font-serif mb-3">Impact Assessment Builder</h1>
          <p className="text-slate-300 text-lg">A structured Data Protection Impact Assessment (DPIA) framework for a specific processing activity, built against GDPR Article 35 requirements.</p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border-l-4 border-purple-500 rounded text-sm">
          This tool produces an Impact Assessment document — a structured starting point for your organisation's Data Protection Officer or legal counsel to complete and own. It is not a finished Data Protection Impact Assessment (DPIA) and does not satisfy the requirements of GDPR Article 35 on its own. Qualified legal review is required before relying on this document.
        </div>

        {prefilled && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
            Pre-populated from your Privacy Programme Assessment. Review and edit all fields before purchasing.
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePurchase(); }} className="bg-card border rounded-lg p-6 space-y-6">
          <div>
            <Label>Name this processing activity *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Employee location monitoring via mobile app" className="mt-2" />
          </div>
          <div>
            <Label>Describe the processing activity in detail *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe: what data is collected, how it is used, who has access, where it is stored." className="mt-2 min-h-32" />
            <p className="text-xs text-muted-foreground mt-1">Min 100 characters.</p>
          </div>
          <div>
            <Label>What is the purpose of this processing? *</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Be specific. Vague purposes weaken both the legal basis and the DPIA.</p>
          </div>
          <div><Label>Data categories *</Label><div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div></div>
          <div><Label>Who are the data subjects? *</Label><Input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} placeholder="e.g. Employees in the UK and Ireland aged 18+" className="mt-2" /></div>
          <div><Label>Volume and frequency *</Label><Input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 250 employees, continuous monitoring during working hours" className="mt-2" /></div>
          <div>
            <Label>Third-party processors</Label>
            <div className="mt-2"><Pills options={TOOLS} value={processors} onChange={setProcessors} /></div>
            <Input placeholder="Other (specify)" value={otherProcessor} onChange={(e) => setOtherProcessor(e.target.value)} className="mt-2" />
          </div>
          <div><Label>Existing safeguards</Label><div className="mt-2"><Pills options={SAFEGUARDS} value={safeguards} onChange={setSafeguards} /></div></div>
          <div><Label>Jurisdictions *</Label><div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div></div>
          <div>
            <Label>Legal basis proposed *</Label>
            <select value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </form>

        <ToolSamplePreview
          toolType="dpia"
          toolName="Impact Assessment Builder"
          price={pricing.price}
          standalonePrice={pricing.standalonePrice}
          subscriberPrice={pricing.subscriberPrice}
          isSubscriber={pricing.isSubscriber}
          stripeConfigured={pricing.stripeConfigured}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      </main>

      <Footer />
    </div>
  );
};

export default DPIAFramework;
