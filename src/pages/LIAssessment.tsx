import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";

const DATA_CATEGORIES = [
  "Contact data", "Purchase/transaction history", "Browsing/behavioural data",
  "Location data", "Employment data", "Financial data", "Health or medical data",
  "Biometric data", "Special category data", "Communications data", "Device/technical data", "Other",
];
const RELATIONSHIPS = [
  "Existing customer", "Prospective customer", "Employee", "Former employee",
  "Website visitor (no account)", "B2B contact", "Member of the public", "Other",
];
const JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
];

const MultiPills = ({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
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

interface PreviewSignal {
  use_case_label: string;
  use_case_code: string;
  precedents: Array<{
    processing_activity: string;
    outcome: string;
    jurisdiction: string;
    dpa_source: string;
    summary: string;
    case_reference?: string | null;
  }>;
  precedents_matched: number;
  strength: { rating: "Strong" | "Moderate" | "Weak" | "High Risk"; rationale: string };
  disclaimer: string;
}

const STRENGTH_STYLE: Record<string, string> = {
  Strong: "bg-green-100 text-green-900 border-green-300",
  Moderate: "bg-amber-100 text-amber-900 border-amber-300",
  Weak: "bg-orange-100 text-orange-900 border-orange-300",
  "High Risk": "bg-red-100 text-red-900 border-red-300",
};

const OUTCOME_STYLE: Record<string, string> = {
  accepted: "bg-green-50 text-green-800 border-green-200",
  conditional: "bg-amber-50 text-amber-800 border-amber-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  contested: "bg-slate-50 text-slate-800 border-slate-200",
};

const LIAssessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricing = useToolPrice("li_assessment");

  const [processingDescription, setProcessingDescription] = useState("");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [relationship, setRelationship] = useState("");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewSignal | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const validate = () => {
    if (!processingDescription.trim()) return "Briefly describe what you're doing.";
    if (!dataCategories.length) return "Select at least one data category.";
    if (!relationship) return "Select your relationship with data subjects.";
    if (!jurisdictions.length) return "Select at least one jurisdiction.";
    return null;
  };

  const handlePreview = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Almost there", description: err, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Call free preview function
      const { data: previewData, error: fnErr } = await supabase.functions.invoke("preview-li-assessment", {
        body: {
          processing_description: processingDescription,
          data_categories: dataCategories,
          relationship_type: relationship,
          jurisdictions,
        },
      });
      if (fnErr) throw fnErr;

      // Persist a preview-stage row so Stage B can pick up where we left off
      const { data: row, error: insErr } = await supabase
        .from("li_assessments")
        .insert({
          user_id: user?.id ?? null,
          status: "pending",
          stage: "preview",
          processing_description: processingDescription,
          data_categories: dataCategories,
          relationship_type: relationship,
          jurisdictions,
          preview_signal: previewData,
        } as any)
        .select("id")
        .single();
      if (insErr) throw insErr;

      setPreview(previewData);
      setPreviewId(row.id);
      // Smooth scroll to result
      setTimeout(() => {
        document.getElementById("preview-signal")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (e: any) {
      toast({ title: "Preview unavailable", description: e?.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!previewId) return;
    navigate(`/li-assessment/intake/${previewId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Legitimate Interest Assessment — Free Preliminary Signal | End User Privacy</title>
        <meta name="description" content="Free preliminary signal on whether your processing can rely on legitimate interest, with regulator precedents. Optional full three-part test from $35." />
      </Helmet>
      <Navbar />

      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-200 mb-3">
            Free preliminary signal · No account required
          </span>
          <h1 className="text-3xl md:text-4xl font-serif mb-3">Legitimate Interest Assessment</h1>
          <p className="text-slate-300 text-lg">
            Get an instant, precedent-backed signal on whether your proposed processing is likely to qualify for
            legitimate interest under GDPR Article 6(1)(f) — then optionally continue to a full three-part test.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <section className="bg-card border rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-serif mb-2">Why you need this</h2>
            <p className="text-foreground leading-relaxed">
              Legitimate interest is the most flexible — and most contested — legal basis under GDPR Article 6(1)(f).
              Regulators don't accept it on assertion: if challenged, you must produce a written record showing you
              tested your processing against a three-part test (purpose, necessity, balancing) <em>before</em> you
              relied on it. Recent fines from the CNIL, ICO, Garante and others have hit organisations that either
              skipped this record entirely or produced one that was generic, undated, or didn't address the specific
              facts of the processing. This tool produces that record — grounded in tracked regulator decisions so
              your reasoning lines up with how DPAs actually decide these cases.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">How it works — and why each step matters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="border-l-2 border-primary pl-3">
                <div className="font-semibold">Step 1 — Free preliminary signal</div>
                <div className="text-muted-foreground mt-1">
                  You describe the processing in plain language. We classify the use case and surface the most
                  analogous regulator decisions.
                </div>
                <div className="text-xs text-foreground mt-2">
                  <strong>Why:</strong> Some use cases (behavioural advertising, employee monitoring, special category
                  data) almost never survive the balancing test. Knowing this upfront — for free — saves you the cost
                  of a full assessment that was always going to fail.
                </div>
              </div>
              <div className="border-l-2 border-primary/60 pl-3">
                <div className="font-semibold">Step 2 — Adaptive intake</div>
                <div className="text-muted-foreground mt-1">
                  We ask only the questions that matter for your facts: whose interest, what alternatives you
                  considered, what data subjects would reasonably expect, what safeguards are in place.
                </div>
                <div className="text-xs text-foreground mt-2">
                  <strong>Why:</strong> The EDPB's 2024 guidelines list the specific factors regulators weigh. A
                  defensible record has to address them by name — generic "we considered the impact" language is
                  routinely rejected on enforcement.
                </div>
              </div>
              <div className="border-l-2 border-primary/40 pl-3">
                <div className="font-semibold">Step 3 — Three-part test report</div>
                <div className="text-muted-foreground mt-1">
                  A structured analysis of purpose, necessity and balancing, plus a documentation pack and PDF you can
                  hand to counsel.
                </div>
                <div className="text-xs text-foreground mt-2">
                  <strong>Why:</strong> Article 5(2) accountability requires you to <em>demonstrate</em> compliance,
                  not just claim it. A timestamped, fact-specific LIA is the artefact regulators ask for first when
                  they open an investigation.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 rounded p-3 text-xs text-amber-900">
            <strong>Not legal advice.</strong> This tool produces a compliance framework grounded in tracked
            regulatory decisions. Your final legitimate interest determination should be reviewed and signed off by
            qualified counsel before you rely on it operationally.
          </div>
        </section>


        <form
          onSubmit={(e) => { e.preventDefault(); handlePreview(); }}
          className="bg-card border rounded-lg p-6 space-y-6"
        >
          <div>
            <Label htmlFor="desc" className="text-base">What processing are you considering? *</Label>
            <Textarea
              id="desc"
              value={processingDescription}
              onChange={(e) => setProcessingDescription(e.target.value)}
              placeholder="e.g. Send personalised product recommendations to existing customers based on their purchase history."
              className="mt-2 min-h-24"
            />
            <p className="text-xs text-muted-foreground mt-1">A sentence or two is enough. More detail produces a sharper signal.</p>
          </div>

          <div>
            <Label className="text-base">Data categories involved *</Label>
            <div className="mt-2"><MultiPills options={DATA_CATEGORIES} value={dataCategories} onChange={setDataCategories} /></div>
          </div>

          <div>
            <Label htmlFor="rel" className="text-base">Your relationship with data subjects *</Label>
            <select id="rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-input bg-background">
              <option value="">Select…</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-base">Jurisdictions where this processing applies *</Label>
            <div className="mt-2"><MultiPills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Analysing precedents…" : "Get my preliminary signal — Free"}
            </button>
            <p className="text-xs text-muted-foreground mt-2">Free, instant, no account or card required.</p>
          </div>
        </form>

        {preview && (
          <section id="preview-signal" className="bg-card border-2 border-primary/30 rounded-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Preliminary signal</div>
                <h2 className="text-2xl font-serif mt-1">{preview.use_case_label}</h2>
              </div>
              <span className={`px-4 py-1.5 rounded-full border text-sm font-semibold ${STRENGTH_STYLE[preview.strength.rating]}`}>
                {preview.strength.rating}
              </span>
            </div>

            <p className="text-foreground">{preview.strength.rationale}</p>

            {preview.precedents.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                  Most analogous regulator decisions ({preview.precedents_matched} matched)
                </h3>
                <div className="space-y-2">
                  {preview.precedents.map((p, i) => (
                    <div key={i} className={`border rounded-lg p-4 ${OUTCOME_STYLE[p.outcome] ?? OUTCOME_STYLE.contested}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">{p.outcome}</span>
                        <span className="text-xs">{p.dpa_source} · {p.jurisdiction}</span>
                      </div>
                      <div className="font-medium">{p.processing_activity}</div>
                      <p className="text-sm mt-1 opacity-90">{p.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No directly analogous regulator decisions in the tracked database for this use case. The full assessment
                will analyse your facts on first principles and surface adjacent precedents.
              </p>
            )}

            <div className="bg-slate-50 border-l-4 border-slate-300 rounded p-4 text-sm text-slate-700">
              <strong>What's next.</strong> The preliminary signal cannot tell you whether <em>your specific facts</em> pass the
              necessity and balancing tests — that requires the deeper questions on safeguards, reasonable expectations,
              data minimisation, and harm severity. Continue to the full assessment to capture those facts and produce a
              report you can review with counsel.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                onClick={handleContinue}
                className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                Continue to full assessment — ${pricing.price}
              </button>
              {pricing.isSubscriber && pricing.standalonePrice > pricing.price && (
                <span className="text-xs text-muted-foreground">
                  Subscriber rate · standalone ${pricing.standalonePrice}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground italic">{preview.disclaimer}</p>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LIAssessment;
