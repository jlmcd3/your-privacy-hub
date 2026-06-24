
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { IntakeGuidance } from "@/components/IntakeGuidance";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExhibitTextarea } from "@/components/ExhibitTextarea";
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
import { EDPB_DPIA_GUIDANCE, EDPB_DPIA_SOURCE } from "@/components/dpia/EdpbDpiaGuidance";
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

// EDPB template §0.5 — reasons to conduct (condensed: Art. 35(3) + WP248 criteria + beneficial).
const REASONS_TO_CONDUCT = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
  "Sensitive or highly personal data",
  "Data processed on a large scale",
  "Matching or combining datasets",
  "Data concerning vulnerable subjects",
  "Innovative use of new technology",
  "Processing prevents exercising a right / using a service",
  "Required by national law",
  "DPO or data-subject recommendation",
  "Required by a code of conduct / standard",
  "Risk management / accountability (beneficial)",
  "Existing processing — the risk has changed",
];

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

  // EDPB template — Section 0 (Overview of the processing). All optional in this tranche.
  const [controllerContact, setControllerContact] = useState("");        // 0.1 main establishment / point of contact
  const [dpoInfo, setDpoInfo] = useState("");                            // 0.1 DPO or similar function
  const [processorObligations, setProcessorObligations] = useState("");  // 0.2 obligations & tasks
  const [processingVersion, setProcessingVersion] = useState("");        // 0.3 current version / change history
  const [launchDate, setLaunchDate] = useState("");                      // 0.4 estimated launch date
  const [endDate, setEndDate] = useState("");                            // 0.4 estimated end date / expiry
  const [dpiaTeam, setDpiaTeam] = useState("");                          // 0.5 team / RACI
  const [referenceMaterials, setReferenceMaterials] = useState("");      // 0.5 guidelines / standards
  const [reasonsToConduct, setReasonsToConduct] = useState<string[]>([]);// 0.5 reasons (multi-select)
  const [dpiaScopeNote, setDpiaScopeNote] = useState("");                // 0.5 scope in/out
  const [publicationIntent, setPublicationIntent] = useState("");        // 0.5 publish / share externally
  const [activeTemplateRef, setActiveTemplateRef] = useState<string | null>(null);

  
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
    setActiveTemplateRef(null);
    setActiveRailField(field);
  };

  // EDPB template-guidance rail: builds a guidance-only RailEntry from the
  // Explainer paraphrase registry — no GDPR article fetch, no verbatim block.
  const handleTemplateRailFocus = (sectionRef: string) => {
    setActiveRailField(null);
    setActiveTemplateRef(sectionRef);
  };
  const templateRailEntry = useMemo(() => {
    if (!activeTemplateRef) return null;
    const g = EDPB_DPIA_GUIDANCE[activeTemplateRef];
    if (!g) return null;
    return {
      fieldLabel: `EDPB DPIA template · § ${g.sectionRef}`,
      citation: `EDPB DPIA template § ${g.sectionRef}`,
      citationUrl: EDPB_DPIA_SOURCE.url,
      plainSummary: g.guidance,
      regulationText: "",
      templateGuidance: {
        sectionRef: g.sectionRef,
        sectionTitle: g.sectionTitle,
        guidance: g.guidance,
        paraRefs: g.paraRefs,
        sourceLabel: EDPB_DPIA_SOURCE.label,
        sourceUrl: EDPB_DPIA_SOURCE.url,
      },
    };
  }, [activeTemplateRef]);

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
    article_9_condition: hasSpecialCategory ? article9Condition : "",
    necessity_proportionality: necessityProportionality,
    retention_period: retentionPeriod,
    // EDPB template — Section 0 (carried now; consumed by the edge rebuild tranche)
    controller_contact: controllerContact,
    dpo_info: dpoInfo,
    processor_obligations: processorObligations,
    processing_version: processingVersion,
    estimated_launch_date: launchDate,
    estimated_end_date: endDate,
    dpia_team: dpiaTeam,
    reference_materials: referenceMaterials,
    reasons_to_conduct: reasonsToConduct,
    dpia_scope_note: dpiaScopeNote,
    publication_intent: publicationIntent,
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
          <RequirementBadge variant="hero" tier="required" text="A DPIA is required under GDPR Article 35 before high-risk processing — large-scale special-category data, systematic profiling, or large-scale monitoring of public areas." className="mt-2 max-w-3xl" />
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

          {/* === EDPB template — Section 0: Overview of the processing === */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b">
              <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">Section 0 — Overview of the processing</span>
              <span className="text-[10px] font-mono text-muted-foreground">EDPB DPIA template</span>
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.1')}>
              <Label>Controller — main establishment / point of contact</Label>
              <Input value={controllerContact} onChange={(e) => setControllerContact(e.target.value)} placeholder="Main establishment or representative, and the contact point for this processing" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">EDPB §0.1: identify the controller's responsible unit, main establishment or representative, and the DPO. For joint controllers, define each party's obligations.</p>
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.1')}>
              <Label>DPO (or similar function), if applicable</Label>
              <Input value={dpoInfo} onChange={(e) => setDpoInfo(e.target.value)} placeholder="DPO name / contact, or note if none is designated" className="mt-2" />
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.2')}>
              <Label>Processors / sub-processors — obligations & tasks</Label>
              <Textarea value={processorObligations} onChange={(e) => setProcessorObligations(e.target.value)} placeholder="For each processor / sub-processor, define their obligations and tasks." className="mt-2 min-h-16" />
              <p className="text-meta text-muted-foreground mt-1">EDPB §0.2: list every processor and sub-processor in the chain and define each one's obligations unequivocally.</p>
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.3')}>
              <Label>Processing — current version / change history</Label>
              <Input value={processingVersion} onChange={(e) => setProcessingVersion(e.target.value)} placeholder="e.g. v2 — added biometric step in Q1 2026" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">EDPB §0.3: the internal name (from your RoPA) plus a short history of past changes to the processing.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div onFocus={() => handleTemplateRailFocus('0.4')}>
                <Label>Estimated launch date</Label>
                <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className="mt-2" />
              </div>
              <div onFocus={() => handleTemplateRailFocus('0.4')}>
                <Label>Estimated end date / expiry (if temporary)</Label>
                <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Date or expiry condition; leave blank if ongoing" className="mt-2" />
              </div>
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.5')}>
              <Label>DPIA team / roles (RACI)</Label>
              <Input value={dpiaTeam} onChange={(e) => setDpiaTeam(e.target.value)} placeholder="Who is Responsible, Accountable, Consulted, Informed for this DPIA" className="mt-2" />
              <p className="text-meta text-muted-foreground mt-1">EDPB §0.5: the team conducting the DPIA and their roles / responsibilities.</p>
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.5')}>
              <Label>Guidelines / standards used</Label>
              <Input value={referenceMaterials} onChange={(e) => setReferenceMaterials(e.target.value)} placeholder="e.g. EDPB DPIA template, WP248 rev.01, ISO 29134" className="mt-2" />
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.5.reasons')}>
              <Label>Reasons for conducting this DPIA</Label>
              <p className="text-meta text-muted-foreground mt-1 mb-2">EDPB §0.5: select every reason that applies — a DPIA may be a legal obligation, required by guidance, or simply beneficial.</p>
              <Pills options={REASONS_TO_CONDUCT} value={reasonsToConduct} onChange={setReasonsToConduct} />
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.5.scope')}>
              <Label>Scope of this DPIA — what's in and what's out</Label>
              <Textarea value={dpiaScopeNote} onChange={(e) => setDpiaScopeNote(e.target.value)} placeholder="State what this assessment covers, what it deliberately excludes, and why." className="mt-2 min-h-16" />
            </div>

            <div onFocus={() => handleTemplateRailFocus('0.5.publication')}>
              <Label>Will the DPIA be published or shared externally?</Label>
              <select value={publicationIntent} onChange={(e) => setPublicationIntent(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>
                <option>No</option>
                <option>Yes — published</option>
                <option>Yes — shared externally</option>
              </select>
              <p className="text-meta text-muted-foreground mt-1">EDPB §0.5: note publication / sharing intent; withhold sensitive security detail if you publish.</p>
            </div>
          </div>

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
            <IntakeGuidance className="mt-2">If this activity serves more than one purpose or use case, set each one out clearly and separately (number them, or a short paragraph each) — each purpose is analysed and reported on individually. For each, cover what data is involved, why it's needed, who can access it, where it's stored, and how long it's kept.</IntakeGuidance>
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
          <div><Label>Retention period<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 5(1)(e) — storage limitation)</span></Label><Input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} placeholder="e.g. Deleted 90 days after each verification event; no central template stored" className="mt-2" /></div>
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
          {hasSpecialCategory && (
            <div>
              <Label>Article 9(2) condition for special-category data<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 9(2) — required in addition to the Art. 6 basis)</span></Label>
              <select value={article9Condition} onChange={(e) => setArticle9Condition(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select…</option>{ARTICLE_9_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">You selected a special category (health/medical or biometric data). Article 6 alone is not a sufficient legal basis — a separate Article 9(2) condition is required.</p>
            </div>
          )}
          <div>
            <Label>Necessity, proportionality & alternatives considered<Req /> <span className="text-xs text-muted-foreground font-mono">(Art. 35(7)(b))</span></Label>
            <Textarea value={necessityProportionality} onChange={(e) => setNecessityProportionality(e.target.value)} placeholder="Why is this processing necessary for the purpose, and what less-intrusive alternatives did you consider and why were they rejected?" className="mt-2 min-h-24" />
            <IntakeGuidance className="mt-2">Take each alternative you considered in turn and say plainly why it was rejected. Listing them separately lets the assessment weigh each one — a single general statement can't be.</IntakeGuidance>
          </div>
        </form>
        <StatuteRail entry={templateRailEntry ?? dpiaRailEntry} />
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
