
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ToolSamplePreview from "@/components/tools/ToolSamplePreview";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";
import SampleReportLink from "@/components/SampleReportLink";
import StatuteRail from "@/components/admt/StatuteRail";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";


const DATA_CATS = ["Contact details", "Employee records", "Customer records", "Health or medical data", "Financial data", "Biometric data", "Children's data", "Location data", "Communications content", "Other"];
const TOOLS = ["Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein", "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features", "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies", "HubSpot", "Adobe Creative Cloud"];
const SAFEGUARDS = ["Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation", "Contractual restrictions", "None"];
const JURISDICTIONS = ["EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal", "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)", "Australia", "Singapore", "Other"];
const LEGAL_BASES = ["Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))", "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))", "Legitimate interest (Art. 6(1)(f))", "Not yet determined"];
const ARTICLE_9_CONDITIONS = ["Explicit consent (Art. 9(2)(a))", "Employment, social security & social protection law (Art. 9(2)(b))", "Vital interests — data subject incapable of consent (Art. 9(2)(c))", "Not-for-profit body's legitimate activities (Art. 9(2)(d))", "Data manifestly made public by the data subject (Art. 9(2)(e))", "Establishment, exercise or defence of legal claims (Art. 9(2)(f))", "Substantial public interest — Union/Member State law (Art. 9(2)(g))", "Preventive/occupational medicine, health or social care (Art. 9(2)(h))", "Public interest in public health (Art. 9(2)(i))", "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))", "Not yet determined"];
// DATA_CATS labels that are Article 9 special categories — drives the conditional Art 9(2) field.
const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data"];

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
  const { clientId } = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const sourceId = params.get("source");
  const pricing = useToolPrice("dpia_framework");

  const [organizationName, setOrganizationName] = useState("");
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
  const [article9Condition, setArticle9Condition] = useState("");
  const [necessityProportionality, setNecessityProportionality] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  
  const guidanceTier = useGuidanceTier();
  const [activeRailField, setActiveRailField] = useState<"trigger" | "legal_basis" | "transfers" | null>(null);
  const hasSpecialCategory = dataCategories.some((c) => SPECIAL_CATEGORY_CATS.includes(c));
  

  const dpiaRailConfigs = {
    trigger: {
      article: "35", jurisdiction: "eu" as const, recital: 84,
      fieldLabel: "DPIA trigger — Art. 35 GDPR",
      plainSummary: "A DPIA is mandatory where processing is likely to result in high risk — particularly with new technologies, large-scale special category processing, or systematic profiling. Art. 35(3) lists three mandatory trigger categories; supervisory authorities also publish lists of additional types.",
      relatedCitations: [
        { citation: "Art. 35(3) GDPR", label: "Three mandatory DPIA triggers" },
        { citation: "Recital 89 GDPR", label: "What constitutes high risk" },
      ],
    },
    legal_basis: {
      article: "6", jurisdiction: "eu" as const, recital: 40,
      fieldLabel: "Legal basis — Art. 6(1) GDPR",
      plainSummary: "Processing requires at least one of six lawful bases. In a DPIA context, the legal basis informs the residual risk assessment — consent-based processing poses lower risk than legitimate interests where data subjects may not expect the processing. Always cite the specific sub-clause (a)–(f).",
      relatedCitations: [{ citation: "Art. 9 GDPR", label: "Additional condition for special categories" }],
    },
    transfers: {
      article: "44", jurisdiction: "eu" as const,
      fieldLabel: "International transfers — Arts. 44–49 GDPR",
      plainSummary: "Any transfer to a third country (outside EEA/UK) requires a Chapter V mechanism. The transfer itself is a processing activity that must be risk-assessed within the DPIA when it involves high-risk data. Post-Schrems II, SCCs require a documented Transfer Impact Assessment.",
      relatedCitations: [
        { citation: "Art. 46(2)(c) GDPR", label: "Standard Contractual Clauses" },
        { citation: "EDPB Recommendations 01/2020", label: "Transfer impact assessment" },
      ],
    },
  };

  const dpiaRailOpts = activeRailField ? dpiaRailConfigs[activeRailField] : null;
  const { entry: dpiaRailEntry } = useGdprRailEntry(dpiaRailOpts);

  const handleDpiaRailFocus = (field: "trigger" | "legal_basis" | "transfers") => {
    setActiveRailField(field);
  };

  const dpiaEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories", "dpia_absence", "international_transfer"],
    guidanceTier.tier === "paid"
  );

  // DPIA mandatory trigger detection — Art. 35(3), visible to all users
  const dpiaTriggers = useMemo(() => {
    const SPECIAL = ["Health / medical data", "Biometric data", "Genetic data"];
    const hasSpecial = dataCategories.some(c => SPECIAL.includes(c));
    const hasChildren = dataCategories.some(c => c.toLowerCase().includes("child"));
    const items = [
      {
        citation: "Art. 35(3)(b) GDPR",
        label: "Large-scale processing of special category data",
        triggered: hasSpecial,
        note: "Health, biometric, or genetic data selected",
      },
      {
        citation: "Art. 35(3)(a) GDPR",
        label: "Systematic and extensive profiling with significant effects",
        triggered: description.toLowerCase().includes("profil"),
        note: "Profiling activity detected in processing description",
      },
      {
        citation: "Recital 38 GDPR",
        label: "Processing children's data — heightened obligations apply",
        triggered: hasChildren,
        note: "Children's data requires particular protection under GDPR",
      },
    ].filter(i => i.triggered);
    return items;
  }, [dataCategories, description]);


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
    if (!organizationName.trim()) return "Tell us the name of the organisation being assessed.";
    if (!name.trim()) return "Processing activity name is required.";
    if (description.trim().length < 100) return "Description must be at least 100 characters.";
    if (!purpose.trim()) return "Purpose is required.";
    if (!dataCategories.length) return "Select at least one data category.";
    if (!dataSubjects.trim()) return "Data subjects are required.";
    if (!volume.trim()) return "Volume and frequency required.";
    if (!jurisdictions.length) return "Select at least one jurisdiction.";
    if (!legalBasis) return "Select a legal basis.";
    if (hasSpecialCategory && !article9Condition) return "Select an Article 9(2) condition for the special-category data you indicated.";
    if (!retentionPeriod.trim()) return "Retention period is required.";
    if (!necessityProportionality.trim()) return "Describe necessity, proportionality and alternatives considered.";
    return null;
  };

  const buildIntake = () => ({
    organization_name: organizationName,
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
    if (!user) { setAuthGateOpen(true); return; }

    // For $0 (included with Platform), bypass Stripe entirely
    if (pricing.price === 0) {
      setPurchasing(true);
      // Create the row first (the run- edge requires dpia_id, not raw
      // intake_data), mirroring the server's subscriber-credit row shape,
      // then trigger generation. The result page polls until complete.
      const { data: row, error: insErr } = await supabase
        .from("dpia_frameworks")
        .insert({
          user_id: user.id,
          client_id: clientId ?? null,
          status: "pending",
          intake_data: buildIntake(),
          purchased_as_standalone: false,
          is_subscriber_credit: true,
          purchase_price_cents: 0,
        })
        .select("id")
        .single();
      if (insErr || !row) {
        setPurchasing(false);
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { error: fnErr } = await supabase.functions.invoke(
        "run-dpia-framework",
        { body: { dpia_id: row.id } }
      );
      setPurchasing(false);
      if (fnErr) {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      navigate(`/dpia-framework/result/${row.id}?purchased=true`);
      return;
    }

    if (!pricing.stripeConfigured) {
      toast({ title: "Payments unavailable", description: "Payments are not yet configured. Please check back soon.", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <DashboardSubnav />
      <Helmet><title>{`Impact Assessment Builder — from $${pricing.subscriberPrice ?? ""} | End User Privacy`}</title></Helmet>
      <header className="bg-[#0d2a45] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">📋 Data Protection Impact Assessment · ${pricing.price}</span>
          <h1 className="font-serif text-white mb-3">Impact Assessment Builder <DefPopover termKey="gdpr_dpia" /></h1>
          <p className="text-slate-300 text-lg">A structured Data Protection Impact Assessment (DPIA) framework for a specific processing activity, built against GDPR Article 35 requirements.</p>
          <div className="mt-4"><SampleReportLink toolSlug="dpia" tone="onDark" variant="link" /></div>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <ActiveClientLabel />
        <div className="p-4 bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] border-l-4 border-brand-teal rounded text-sm">
          This tool produces an Impact Assessment document — a structured starting point for your organisation's Data Protection Officer or legal counsel to complete and own. It is not a finished Data Protection Impact Assessment (DPIA) and does not satisfy the requirements of GDPR Article 35 on its own. Qualified legal review is required before relying on this document.
        </div>

        {prefilled && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
            Pre-populated from your GDPR Governance Assessment. Review and edit all fields before purchasing.
          </div>
        )}

        <div className="flex gap-6 items-start">
        <form onSubmit={(e) => { e.preventDefault(); handlePurchase(); }} className="flex-1 min-w-0 bg-card border rounded-lg p-6 space-y-6">
          <RequiredLegend />
          <div>
            <p className="text-xs font-mono text-muted-foreground pb-2 border-b">Art. 35 GDPR — Data Protection Impact Assessment · Recitals 84, 89–90 — when a DPIA is mandatory</p>
            <Label htmlFor="org">Organisation being assessed<Req /></Label>
            <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Acme Retail Ltd" className="mt-2" />
            <p className="text-meta text-muted-foreground mt-1">The controller/entity whose processing this DPIA documents.</p>
          </div>
          <div>
            <Label>Name this processing activity<Req /></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Employee location monitoring via mobile app" className="mt-2" />
          </div>
          <div>
            <Label>Describe the processing activity in detail<Req /></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe: what data is collected, how it is used, who has access, where it is stored." className="mt-2 min-h-32" />
            <p className="text-xs text-muted-foreground mt-1">Min 100 characters.</p>
          </div>
          <div>
            <Label>What is the purpose of this processing?<Req /></Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Be specific. Vague purposes weaken both the legal basis and the DPIA.</p>
          </div>
          <div onFocus={() => handleDpiaRailFocus("trigger")}><Label>Data categories<Req /> <DefPopover termKey="gdpr_special_categories" /> <span className="text-xs text-muted-foreground font-mono">(Art. 9 — special categories trigger Art. 35(3)(b))</span> <EnforcementSignalIcon signalKey="special_categories" signals={dpiaEnforcementSignals} /></Label><div className="mt-2"><Pills options={DATA_CATS} value={dataCategories} onChange={setDataCategories} /></div></div>
          {dpiaTriggers.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                ⚡ DPIA triggers detected from your data categories <EnforcementSignalIcon signalKey="dpia_absence" signals={dpiaEnforcementSignals} />
              </p>
              {dpiaTriggers.map((item) => (
                <div key={item.citation} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5 shrink-0">▸</span>
                  <div className="text-xs">
                    <span className="font-mono text-amber-700 dark:text-amber-400 font-medium">{item.citation}</span>
                    <span className="text-foreground ml-2">{item.label}</span>
                    {item.note && <span className="text-muted-foreground ml-1">— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div><Label>Who are the data subjects?<Req /> <DefPopover termKey="gdpr_personal_data" /></Label><Input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} placeholder="e.g. Employees in the UK and Ireland aged 18+" className="mt-2" /></div>
          <div><Label>Volume and frequency<Req /></Label><Input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 250 employees, continuous monitoring during working hours" className="mt-2" /></div>
          <div>
            <Label>Third-party processors</Label>
            <div className="mt-2"><Pills options={TOOLS} value={processors} onChange={setProcessors} /></div>
            <Input placeholder="Other (specify)" value={otherProcessor} onChange={(e) => setOtherProcessor(e.target.value)} className="mt-2" />
          </div>
          <div><Label>Existing safeguards</Label><div className="mt-2"><Pills options={SAFEGUARDS} value={safeguards} onChange={setSafeguards} /></div></div>
          <div onFocus={() => handleDpiaRailFocus("transfers")}><Label>Jurisdictions<Req /> <DefPopover termKey="gdpr_international_transfer" /> <span className="text-xs text-muted-foreground font-mono">(Arts. 44–49 GDPR)</span> <EnforcementSignalIcon signalKey="international_transfer" signals={dpiaEnforcementSignals} /></Label><div className="mt-2"><Pills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div></div>
          <div>
            <Label>Legal basis proposed<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 6(1) GDPR — six lawful bases)</span></Label>
            <select value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} onFocus={() => handleDpiaRailFocus("legal_basis")} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </form>
        <StatuteRail entry={dpiaRailEntry} />
        </div>


        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo="/dpia-framework" />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="dpia_framework"
          userId={user?.id}
          clientId={clientId}
          intakeData={buildIntake()}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) navigate(`/dpia-framework/result/${id}?purchased=true`);
          }}
        />
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
