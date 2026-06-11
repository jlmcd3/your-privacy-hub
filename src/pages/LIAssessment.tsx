
import { useState } from "react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ActiveClientLabel from "@/components/ActiveClientLabel";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useToolPrice } from "@/hooks/useToolPrice";
import { stripeFor, accentFor } from "@/lib/li-outcome-palette";
import { Req, RequiredLegend } from "@/components/RequiredMark";
import { DefPopover } from "@/components/DefPopover";


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

// Outcome palette (stripe/accent) lives in @/lib/li-outcome-palette and is shared with /li-tracker

const LIAssessment = () => {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
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
          client_id: clientId ?? null,
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
    <WorkspaceLayout>
      <Helmet>
        <title>Legitimate Interest Assessment | End User Privacy</title>
        <meta name="description" content="Free preliminary signal on whether your processing can rely on legitimate interest. Full assessment includes cited enforcement precedents alongside every test verdict." />
      </Helmet>
      {/* Header */}
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            ⚖️ Legitimate Interest Assessment · Free preliminary signal · Full assessment ${pricing.price}
          </span>
          <h1 className="font-serif text-white mb-3">
            Legitimate Interest Assessment
          </h1>
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
            Get an instant indication whether your proposed processing could qualify for legitimate interest under
            GDPR Article 6(1)(f) — then optionally continue to a full three-part test based on the precedents we've
            tracked. We cannot provide legal advice, but we can provide actionable Intelligence.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-[860px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <ActiveClientLabel />
        {/* WHY YOU NEED THIS */}
        <section className="mb-10">
          <div className="text-eyebrow text-brand-mist mb-2">Why you need this</div>
          <h2 className="font-display text-brand-navy mb-4 leading-snug">
            Legitimate interest must be documented, not assumed
          </h2>
          <p className="text-sm text-brand-navy leading-relaxed mb-4 max-w-[70ch]">
            Article 6(1)(f) is the most flexible — and most contested — legal basis under the GDPR. Regulators don't
            accept it on assertion: if challenged, you must produce a written record showing you tested your processing
            against the three-part test (purpose, necessity, balancing) <em>before</em> you relied on it.
          </p>
          <p className="text-sm text-brand-navy leading-relaxed max-w-[70ch]">
            Recent fines from the CNIL, ICO, Garante and others have hit organisations that skipped this record or produced a generic one. The full assessment cites the specific enforcement decisions behind each test verdict — so you can see exactly what informed the analysis.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-10">
          <div className="text-eyebrow text-brand-mist mb-2">How it works</div>
          <h2 className="font-display text-brand-navy mb-5 leading-snug">Three steps — and why each one matters</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4 md:gap-3">
            {[
              {
                n: "01",
                title: "Free preliminary signal",
                desc: "You describe the processing in plain language. We classify the use case and surface the most analogous regulator decisions.",
                why: "Some use cases — behavioural advertising, employee monitoring, special category data — almost never survive the balancing test. Knowing this upfront, for free, saves you the cost of a full assessment that was always going to fail.",
              },
              {
                n: "02",
                title: "Adaptive intake",
                desc: "We ask only the questions that matter for your facts: whose interest, what alternatives you considered, what data subjects would reasonably expect, what safeguards are in place.",
                why: "The EDPB's 2024 guidelines list the specific factors regulators weigh. A defensible record has to address them by name — generic 'we considered the impact' language is routinely rejected on enforcement.",
              },
              {
                n: "03",
                title: "Three-part test report",
                desc: "A structured analysis of purpose, necessity and balancing, plus a documentation pack and PDF you can hand to counsel.",
                why: "Article 5(2) accountability requires you to demonstrate compliance, not just claim it. A timestamped, fact-specific LIA is the artefact regulators ask for first when they open an investigation.",
              },
            ].flatMap((step, i, arr) => {
              const card = (
                <div key={`card-${step.n}`} className="bg-card border-t-4 border-brand-navy p-5 shadow-eup-sm rounded-md flex flex-col">
                  <div className="text-eyebrow text-brand-mist mb-1">Step {step.n}</div>
                  <h3 className="text-brand-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-slate leading-relaxed mb-3">{step.desc}</p>
                  <div className="mt-auto pt-3 border-t border-brand-cloud">
                    <div className="text-eyebrow text-amber-700 mb-1">Why</div>
                    <p className="text-meta text-brand-navy leading-relaxed">{step.why}</p>
                  </div>
                </div>
              );
              if (i === arr.length - 1) return [card];
              return [
                card,
                <span key={`arrow-${step.n}`} className="flex md:flex items-center justify-center text-brand-navy/30 text-2xl md:text-2xl" aria-hidden>
                  <span className="md:hidden">↓</span>
                  <span className="hidden md:inline">→</span>
                </span>,
              ];
            })}
          </div>

          <div className="mt-5 bg-amber-50 border-l-4 border-amber-400 rounded p-3 text-meta text-amber-900 max-w-[70ch]">
            <strong>Not legal advice.</strong> This tool produces a compliance framework grounded in tracked regulatory decisions — and cites them directly in the output so you can see the enforcement basis for each verdict. Your final determination should be reviewed by qualified legal counsel.
          </div>
        </section>

        {/* INTAKE FORM */}
        <section className="mb-10">
          <div className="text-eyebrow text-brand-mist mb-2">Step 01 · Free intake</div>
          <h2 className="font-display text-brand-navy mb-5 leading-snug">Tell us about the processing</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); handlePreview(); }}
            className="bg-card border border-brand-cloud rounded-2xl p-5 sm:p-6 md:p-8 shadow-eup-sm space-y-6"
          >
            <RequiredLegend />
            <div>
              <Label htmlFor="desc" className="text-sm font-semibold text-brand-navy">What processing are you considering?<Req /> <DefPopover termKey="gdpr_legitimate_interests" /></Label>
              <Textarea
                id="desc"
                value={processingDescription}
                onChange={(e) => setProcessingDescription(e.target.value)}
                placeholder="e.g. Send personalised product recommendations to existing customers based on their purchase history."
                className="mt-2 min-h-24 border-brand-cloud"
              />
              <p className="text-meta text-muted-foreground mt-1">A sentence or two is enough. More detail produces a sharper signal.</p>
            </div>

            <div>
              <Label className="text-sm font-semibold text-brand-navy">Data categories involved<Req /> <DefPopover termKey="gdpr_special_categories" /></Label>
              <div className="mt-2"><MultiPills options={DATA_CATEGORIES} value={dataCategories} onChange={setDataCategories} /></div>
            </div>

            <div>
              <Label htmlFor="rel" className="text-sm font-semibold text-brand-navy">Your relationship with data subjects<Req /> <DefPopover termKey="gdpr_personal_data" /></Label>
              <select id="rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-md border border-brand-cloud bg-background text-sm">
                <option value="">Select…</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-brand-navy">Jurisdictions where this processing applies<Req /></Label>
              <div className="mt-2"><MultiPills options={JURISDICTIONS} value={jurisdictions} onChange={setJurisdictions} /></div>
            </div>

            <div className="pt-2 border-t border-brand-cloud">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-brand-navy text-white font-semibold hover:bg-brand-ocean disabled:opacity-60 transition-colors"
              >
                {loading ? "Analysing precedents…" : "Get my preliminary signal — Free"}
              </button>
              <p className="text-meta text-muted-foreground mt-2">Free, instant, no account or card required.</p>
            </div>
          </form>
        </section>

        {/* PREVIEW SIGNAL */}
        {preview && (
          <section id="preview-signal">
            <div className="text-eyebrow text-brand-mist mb-2">Preliminary signal</div>
            <div className="bg-card border-t-4 border-brand-navy rounded-2xl p-5 sm:p-6 md:p-8 shadow-eup-sm space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-eyebrow text-brand-mist mb-1">Use case</div>
                  <h2 className="font-display text-brand-navy leading-snug">{preview.use_case_label}</h2>
                </div>
                <span className={`px-4 py-1.5 rounded-full border text-meta font-semibold ${STRENGTH_STYLE[preview.strength.rating]}`}>
                  {preview.strength.rating}
                </span>
              </div>

              <p className="text-sm text-brand-navy leading-relaxed">{preview.strength.rationale}</p>

              {preview.precedents.length > 0 ? (
                <div className="pt-5 border-t border-brand-cloud">
                  <h3 className="text-eyebrow text-brand-mist mb-3">
                    Most analogous regulator decisions ({preview.precedents_matched} matched)
                  </h3>
                  <div className="space-y-5">
                    {preview.precedents.map((p, i) => (
                      <article key={i} className="bg-card border border-brand-cloud rounded-xl shadow-eup-sm relative overflow-hidden flex">
                        <div className={`w-1.5 flex-shrink-0 ${stripeFor(p.outcome)}`} aria-hidden />
                        <div className="p-5 flex-1 min-w-0">
                          <h4 className="text-lg text-brand-navy mb-2 leading-snug">{p.processing_activity}</h4>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 text-eyebrow rounded">{p.dpa_source}</span>
                            <span className="bg-muted text-muted-foreground px-2 py-0.5 text-eyebrow rounded">{p.jurisdiction}</span>
                          </div>
                          <p className="text-sm text-slate leading-relaxed mb-4">{p.summary}</p>
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-cloud">
                            <span className={`text-eyebrow capitalize ${accentFor(p.outcome)}`}>
                              {p.outcome}
                            </span>
                            {p.case_reference && (
                              <span className="text-meta text-muted-foreground truncate flex-shrink-0">
                                {p.case_reference}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No directly analogous regulator decisions in the tracked database for this use case. The full
                  assessment will analyse your facts on first principles and surface adjacent precedents.
                </p>
              )}

              <div className="bg-brand-cloud border-l-4 border-brand-navy/40 rounded p-4 text-sm text-brand-navy leading-relaxed">
                <strong>What's next.</strong> The preliminary signal cannot tell you whether <em>your specific facts</em> pass the
                necessity and balancing tests — that requires the deeper questions on safeguards, reasonable expectations,
                data minimisation, and harm severity. Continue to the full assessment to capture those facts and produce a
                report you can review with counsel.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-4 border-t border-brand-cloud">
                <button
                  onClick={handleContinue}
                  className="w-full sm:w-auto px-6 py-3 rounded-md bg-brand-navy text-white font-semibold hover:bg-brand-ocean transition-colors"
                >
                  Continue to full assessment — ${pricing.price}
                </button>
                {pricing.isSubscriber && pricing.standalonePrice > pricing.price && (
                  <span className="text-meta text-muted-foreground">
                    Subscriber rate · standalone ${pricing.standalonePrice}
                  </span>
                )}
              </div>

              <p className="text-meta text-muted-foreground italic">{preview.disclaimer}</p>
            </div>
          </section>
        )}
      </main>
    </WorkspaceLayout>
  );
};

export default LIAssessment;
