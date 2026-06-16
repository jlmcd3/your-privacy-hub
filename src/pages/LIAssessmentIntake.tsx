import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import AuthGateModal from "@/components/AuthGateModal";
import ToolCheckoutModal from "@/components/ToolCheckoutModal";
import { useActiveClient } from "@/hooks/useActiveClient";
import DisclaimerCheckbox from "@/components/DisclaimerCheckbox";
import { logToolAcknowledgment } from "@/lib/toolAcknowledgment";
import GuidedRail from "@/components/GuidedRail";
import { useGdprRailEntry } from "@/hooks/useGdprRailEntry";
import { useGuidanceTier } from "@/hooks/useGuidanceTier";
import { useGdprEnforcementSignals } from "@/hooks/useGdprEnforcementSignals";
import { EnforcementSignalIcon } from "@/components/EnforcementSignalIcon";


interface PreviewRow {
  id: string;
  user_id: string | null;
  organization_name: string | null;
  processing_description: string;
  data_categories: string[] | null;
  relationship_type: string | null;
  jurisdictions: string[] | null;
  preview_signal: any;
}

const Pills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const checked = value.includes(opt);
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(checked ? value.filter((v) => v !== opt) : [...value, opt])}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const LIAssessmentIntake = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const pricing = useToolPrice("li_assessment");

  const [row, setRow] = useState<PreviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [intakeForCheckout, setIntakeForCheckout] = useState<Record<string, unknown> | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // GuidedRail — tier-gated GDPR regulation reference
  const guidanceTier = useGuidanceTier();
  const [activeRailSection, setActiveRailSection] = useState<"purpose" | "necessity" | "balancing" | null>(null);
  const [railPromptTriggered, setRailPromptTriggered] = useState(false);

  const liaRailOpts = activeRailSection ? {
    article: "6",
    jurisdiction: ((row?.jurisdictions ?? []) as string[]).some(j => /uk/i.test(j))
      ? "uk" as const
      : "eu" as const,
    recital: activeRailSection === "balancing" ? 47 : undefined,
    fieldLabel: activeRailSection === "purpose"
      ? "Purpose test — Art. 6(1)(f)"
      : activeRailSection === "necessity"
      ? "Necessity test — Art. 6(1)(f)"
      : "Balancing test — Art. 6(1)(f)",
    plainSummary: activeRailSection === "purpose"
      ? "Processing is lawful where necessary for the purposes of legitimate interests pursued by the controller or a third party, except where overridden by the interests or fundamental rights of the data subject. The purpose test asks: what is the specific legitimate interest, and is it genuine and present?"
      : activeRailSection === "necessity"
      ? "The processing must be necessary to achieve the legitimate interest — not merely convenient. Where a less privacy-intrusive alternative exists that achieves the same result, the necessity test fails. You must show you have considered and rejected less intrusive alternatives."
      : "Even where a legitimate interest exists and processing is necessary, it can be overridden by the data subject's interests, rights, or freedoms. Recital 47 requires consideration of reasonable expectations, the nature of the relationship, and whether the data subject can reasonably foresee the processing at the time of collection.",
    relatedCitations: [
      { citation: "Recital 47 GDPR", label: "Reasonable expectations standard" },
      { citation: "EDPB WP29 Opinion 06/2014", label: "Legitimate interests guidance" },
    ],
  } : null;

  const { entry: liaRailEntry } = useGdprRailEntry(
    guidanceTier.tier !== "anonymous" ? liaRailOpts : null
  );

  const handleRailFocus = (section: "purpose" | "necessity" | "balancing") => {
    if (guidanceTier.tier === "anonymous") {
      setRailPromptTriggered(true);
      return;
    }
    setActiveRailSection(section);
  };

  const liaEnforcementSignals = useGdprEnforcementSignals(
    ["special_categories"],
    guidanceTier.tier === "paid"
  );

  // Purpose
  const [interestHolder, setInterestHolder] = useState("");
  const [interestType, setInterestType] = useState("");
  const [statedPurpose, setStatedPurpose] = useState("");

  // Necessity
  const [alternatives, setAlternatives] = useState("");
  const [whyConsentNotUsed, setWhyConsentNotUsed] = useState("");
  const [dataMinimised, setDataMinimised] = useState("");

  // Balancing
  const [reasonableExpectation, setReasonableExpectation] = useState("");
  const [vulnerableSubjects, setVulnerableSubjects] = useState<string[]>([]);
  const [potentialHarm, setPotentialHarm] = useState("");
  const [safeguards, setSafeguards] = useState<string[]>([]);
  const [optOutMechanism, setOptOutMechanism] = useState("");

  // Adaptive branches
  const [statutoryRestrictions, setStatutoryRestrictions] = useState(""); // shown for marketing / advertising
  const [pseudonymisationOptions, setPseudonymisationOptions] = useState(""); // shown for analytics / research
  const [employmentSafeguards, setEmploymentSafeguards] = useState(""); // shown for employee monitoring

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("li_assessments")
        .select("id, user_id, organization_name, processing_description, data_categories, relationship_type, jurisdictions, preview_signal")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast({ title: "Couldn't load preview", description: "Please start again.", variant: "destructive" });
        navigate("/li-assessment");
        return;
      }
      setRow(data as PreviewRow);
      setLoading(false);
    })();
  }, [id, navigate, toast]);

  if (loading || !row) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</main>
        <Footer />
      </div>
    );
  }

  const useCaseCode: string = row.preview_signal?.use_case_code || "other";
  const dataCategories = row.data_categories || [];
  const showMarketingBranch = useCaseCode === "direct_marketing" || useCaseCode === "behavioral_advertising";
  const showAnalyticsBranch = useCaseCode === "research_analytics" || useCaseCode === "product_improvement";
  const showEmploymentBranch = useCaseCode === "employee_monitoring" ||
    (row.relationship_type || "").toLowerCase().includes("employee");
  const hasSpecialCategory =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    dataCategories.includes("Biometric data");

  const validate = (): string | null => {
    if (!interestHolder) return "Tell us whose interest is being served.";
    if (!interestType) return "Tell us what type of interest this is.";
    if (!statedPurpose.trim()) return "Describe how you'd state this purpose to data subjects.";
    if (!alternatives.trim()) return "Describe alternatives you've considered.";
    if (!reasonableExpectation) return "Tell us whether data subjects would reasonably expect this.";
    if (!potentialHarm) return "Estimate the potential harm severity.";
    if (!optOutMechanism.trim()) return "Describe your opt-out / objection mechanism.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: "A few more details needed", description: err, variant: "destructive" });
      return;
    }
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    // Log the acknowledgment regardless of checkbox state
    logToolAcknowledgment("li_assessment", user.id, row.id);

    const intake_data: Record<string, unknown> = {
      // Stage A (re-sent so checkout has full picture)
      organization_name: row.organization_name,
      processing_description: row.processing_description,
      data_categories: row.data_categories,
      relationship_type: row.relationship_type,
      jurisdictions: row.jurisdictions,
      // Stage B
      stated_purpose: statedPurpose,
      alternatives_considered: alternatives,
      purpose_details: { interest_holder: interestHolder, interest_type: interestType },
      necessity_details: {
        alternatives,
        why_consent_not_used: whyConsentNotUsed,
        data_minimised: dataMinimised,
        pseudonymisation_options: showAnalyticsBranch ? pseudonymisationOptions : null,
      },
      balancing_details: {
        reasonable_expectation: reasonableExpectation,
        vulnerable_subjects: vulnerableSubjects,
        potential_harm: potentialHarm,
        safeguards,
        opt_out_mechanism: optOutMechanism,
        special_category_data: hasSpecialCategory,
        statutory_restrictions: showMarketingBranch ? statutoryRestrictions : null,
        employment_safeguards: showEmploymentBranch ? employmentSafeguards : null,
      },
      stage: "submitted",
      // Tie back to the preview row for analytics
      preview_assessment_id: row.id,
    };

    setIntakeForCheckout(intake_data);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`Full Legitimate Interest Assessment — $${pricing.price} | End User Privacy`}</title>
        <meta name="description" content="Adaptive three-part legitimate interest assessment. Defensible documentation reviewed with counsel." />
      </Helmet>
      <Navbar />

      <header className="bg-[#0d2a45] text-white py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            Step 2 — Full assessment · ${pricing.price}{pricing.isSubscriber && pricing.standalonePrice > pricing.price ? ` (subscriber rate)` : ""}
          </span>
          <h1 className="font-serif">Full Legitimate Interest Assessment</h1>
          <p className="text-slate-300 mt-2 text-sm">
            These questions track the EDPB's three-part test. We've already loaded what you told us in Step 1
            and adapted the rest to your use case ({row.preview_signal?.use_case_label}).
          </p>
        </div>
      </header>
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 -mb-2">
          
        </div>


      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {hasSpecialCategory && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-900">
            <strong>Important:</strong> <EnforcementSignalIcon signalKey="special_categories" signals={liaEnforcementSignals} /> You indicated special category data is involved. Article 6(1)(f) legitimate interest
            alone is generally insufficient — Article 9 requires an additional condition. The full assessment will flag
            this and recommend the Article 9 condition you'll need.
          </div>
        )}

        {/* Purpose */}
        <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-5" onFocus={() => handleRailFocus("purpose")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 01</span>
            <h2 className="font-serif">Purpose test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — legitimate interests · Recital 47 — what constitutes legitimate interest</p>
            <p className="text-sm text-muted-foreground">Is the interest legitimate, specific and present?</p>
          </div>

          <div>
            <Label className="text-base">Whose interest is being served? *</Label>
            <select value={interestHolder} onChange={(e) => setInterestHolder(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Our organisation only</option>
              <option>Our organisation and a third party (e.g. business partner)</option>
              <option>A third party we share data with</option>
              <option>The data subject themselves</option>
              <option>The wider public</option>
            </select>
          </div>

          <div>
            <Label className="text-base">What type of interest is this? *</Label>
            <select value={interestType} onChange={(e) => setInterestType(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Commercial / revenue-related</option>
              <option>Operational / service delivery</option>
              <option>Security / fraud prevention</option>
              <option>Legal / regulatory compliance</option>
              <option>Public interest / societal benefit</option>
              <option>Research / product improvement</option>
            </select>
          </div>

          <div>
            <Label className="text-base">How would you state this purpose to data subjects in a privacy notice? *</Label>
            <Textarea value={statedPurpose} onChange={(e) => setStatedPurpose(e.target.value)} className="mt-2" rows={3} />
          </div>

          {showMarketingBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">Are there sector or jurisdiction-specific restrictions? *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                e.g. ePrivacy / PECR consent for electronic marketing, German UWG rules, child-directed restrictions.
              </p>
              <Textarea value={statutoryRestrictions} onChange={(e) => setStatutoryRestrictions(e.target.value)} rows={2} />
            </div>
          )}
        </section>

        {/* Necessity */}
        <section className="bg-card border rounded-lg p-6 space-y-5" onFocus={() => handleRailFocus("necessity")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 02</span>
            <h2 className="font-serif">Necessity test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — processing must be necessary · EDPB WP29 Opinion 06/2014 — necessity standard</p>
            <p className="text-sm text-muted-foreground">Is processing necessary, and is the data minimum?</p>
          </div>

          <div>
            <Label className="text-base">What alternatives have you considered? *</Label>
            <Textarea value={alternatives} onChange={(e) => setAlternatives(e.target.value)} className="mt-2" rows={3}
              placeholder="e.g. We considered consent but it would yield insufficient coverage because…" />
          </div>

          <div>
            <Label className="text-base">Why isn't consent appropriate here?</Label>
            <Textarea value={whyConsentNotUsed} onChange={(e) => setWhyConsentNotUsed(e.target.value)} className="mt-2" rows={2}
              placeholder="Optional — strengthens the necessity record." />
          </div>

          <div>
            <Label className="text-base">How have you minimised the data used?</Label>
            <Textarea value={dataMinimised} onChange={(e) => setDataMinimised(e.target.value)} className="mt-2" rows={2}
              placeholder="e.g. We only use the last 12 months of purchase data, no demographic enrichment." />
          </div>

          {showAnalyticsBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">Could pseudonymisation or aggregation achieve the same result?</Label>
              <Textarea value={pseudonymisationOptions} onChange={(e) => setPseudonymisationOptions(e.target.value)} rows={2} />
            </div>
          )}
        </section>

        {/* Balancing */}
        <section className="bg-card border rounded-lg p-6 space-y-5" onFocus={() => handleRailFocus("balancing")}>
          <div>
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">Step 03</span>
            <h2 className="font-serif">Balancing test</h2>
            <p className="text-xs font-mono text-muted-foreground -mt-2">Art. 6(1)(f) GDPR — interests or fundamental rights · Recital 47 — reasonable expectations of data subjects</p>
            <p className="text-sm text-muted-foreground">Do data subjects' interests, rights and freedoms override yours?</p>
          </div>

          <div>
            <Label className="text-base">Would data subjects reasonably expect this processing? *</Label>
            <select value={reasonableExpectation} onChange={(e) => setReasonableExpectation(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Yes — directly contemplated by our existing relationship</option>
              <option>Probably — disclosed in privacy notice and consistent with the relationship</option>
              <option>Maybe — they may not have anticipated this specific use</option>
              <option>Unlikely — this would surprise most data subjects</option>
            </select>
          </div>

          <div>
            <Label className="text-base">Are vulnerable groups involved? (select all that apply)</Label>
            <div className="mt-2">
              <Pills
                options={["Children under 16", "Patients / health context", "Employees", "Job applicants", "Financially vulnerable", "None"]}
                value={vulnerableSubjects}
                onChange={setVulnerableSubjects}
              />
            </div>
          </div>

          <div>
            <Label className="text-base">If something went wrong, what's the worst-case impact on data subjects? *</Label>
            <select value={potentialHarm} onChange={(e) => setPotentialHarm(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              <option>Negligible — annoyance only</option>
              <option>Limited — minor inconvenience or unwanted contact</option>
              <option>Significant — discrimination, financial loss, reputational damage</option>
              <option>Severe — physical safety, identity theft, loss of livelihood</option>
            </select>
          </div>

          <div>
            <Label className="text-base">Which safeguards are in place? (select all that apply)</Label>
            <div className="mt-2">
              <Pills
                options={[
                  "Encryption at rest and in transit",
                  "Pseudonymisation",
                  "Access controls / least privilege",
                  "Retention limits",
                  "Independent oversight (DPO / privacy committee)",
                  "DPIA completed",
                  "Vendor due diligence",
                ]}
                value={safeguards}
                onChange={setSafeguards}
              />
            </div>
          </div>

          <div>
            <Label className="text-base">How can data subjects object or opt out? *</Label>
            <Textarea value={optOutMechanism} onChange={(e) => setOptOutMechanism(e.target.value)} className="mt-2" rows={2}
              placeholder="e.g. One-click unsubscribe in every email, account-level toggle, privacy@ inbox monitored within 7 days." />
          </div>

          {showEmploymentBranch && (
            <div className="border-l-2 border-amber-300 pl-4">
              <Label className="text-base">What safeguards address the employment power imbalance?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Regulators expect proportionate safeguards: works council consultation, transparency, no covert monitoring,
                limits on use against the employee.
              </p>
              <Textarea value={employmentSafeguards} onChange={(e) => setEmploymentSafeguards(e.target.value)} rows={2} />
            </div>
          )}
        </section>

        <section className="bg-card border rounded-lg p-6">
          <DisclaimerCheckbox checked={acknowledged} onChange={setAcknowledged} />

          <button
            onClick={handleSubmit}
            disabled={purchasing}
            className="mt-4 w-full px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {purchasing ? "Redirecting to checkout…" : `Generate full assessment — $${pricing.price}`}
          </button>
          {pricing.isSubscriber && pricing.standalonePrice > pricing.price && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Subscriber rate · standalone ${pricing.standalonePrice}
            </p>
          )}
        </section>
        </div>
        <GuidedRail
          entry={liaRailEntry}
          guidanceTier={guidanceTier.tier}
          promptTriggered={railPromptTriggered}
        />
        </div>



        <AuthGateModal open={authGateOpen} onClose={() => setAuthGateOpen(false)} redirectTo={`/li-assessment/intake/${row.id}`} />
        <ToolCheckoutModal
          open={checkoutOpen}
          toolType="li_assessment"
          userId={user?.id}
          clientId={clientId}
          intakeData={intakeForCheckout ?? {}}
          onClose={() => setCheckoutOpen(false)}
          onComplete={(id) => {
            setCheckoutOpen(false);
            if (id) navigate(`/li-assessment/result/${id}?purchased=true`);
          }}
        />
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessmentIntake;
