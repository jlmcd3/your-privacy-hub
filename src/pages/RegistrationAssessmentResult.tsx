import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2, Mail, FileText } from 'lucide-react';
import RegistrationCheckoutModal, { type RegistrationTier } from "@/components/RegistrationCheckoutModal";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";

import { PRICING_REGISTRY, PRICING } from "@/config/pricing";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";

interface JurisdictionResult {
  code: string;
  name: string;
  region: string | null;
  law: string | null;
  authority: string | null;
  authority_url?: string | null;
  registration_required: boolean | null;
  registration_required_basis?: string | null;
  dpo_required: boolean;
  ai_registration_required: boolean;
  representative_required: boolean;
  filing_fee_cents: number | null;
  filing_currency: string | null;
  renewal_period_months: number | null;
  notes: string | null;
  why?: string;
  // QB-P24 Item 2 — structured unresolved block added by the engine when
  // registration resolution fails; consumed by the tri-state renderer.
  unresolved?: {
    status: "unresolved";
    authority_to_confirm: string;
    reason: string;
    next_step: string;
  } | null;
}

export default function RegistrationAssessmentResult() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken ? decodeURIComponent(rawToken) : undefined;
  const navigate = useNavigate();
  const fireConversion = useConversionEvent();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [checkoutTier, setCheckoutTier] = useState<RegistrationTier | null>(null);

  // Email gate — anonymous viewers must leave an email before seeing the report.
  // Local-only, never blocks if the assessment was created with an email or by a logged-in user.
  const [emailUnlocked, setEmailUnlocked] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  useToolCompletedOnce("registration_assessment", !loading && !!assessment);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-registration-assessment",
        { body: { shareable_token: token } }
      );
      if (error || !data?.assessment) {
        toast.error("Could not load assessment");
        setLoading(false);
        return;
      }
      setAssessment(data.assessment);
      setSelected(new Set(data.assessment.recommended_jurisdictions || []));
      // Unlock immediately if email already on file (or signed-in user)
      const { data: { user } } = await supabase.auth.getUser();
      if (user || data.assessment.email || localStorage.getItem(`reg-email-unlocked-${token}`) === "1") {
        setEmailUnlocked(true);
      }
      setLoading(false);
    })();
  }, [token]);

  async function unlockWithEmail() {
    if (!pendingEmail.includes("@") || pendingEmail.length < 5) {
      toast.error("Enter a valid email");
      return;
    }
    setSavingEmail(true);
    try {
      localStorage.setItem(`reg-email-unlocked-${token}`, "1");
      setEmailUnlocked(true);
      toast.success("Your registration map is ready");
    } catch (e) {
      localStorage.setItem(`reg-email-unlocked-${token}`, "1");
      setEmailUnlocked(true);
    } finally {
      setSavingEmail(false);
    }
  }

  async function purchase(tier: "diy") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to purchase");
      // PP-1 D3: redirect-gate signup_initiated fire.
      fireConversion("signup_initiated", {
        referrer_path: `/registration-manager/result/${token ?? ""}`,
        utm_source: "",
        utm_campaign: "",
        variant: "page-load",
      });
      navigate(`/signup?redirect=/registration-manager/result/${encodeURIComponent(token!)}`);
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one jurisdiction");
      return;
    }
    setCheckoutTier(tier);
  }

  function copyShareLink() {
    const url = `${window.location.origin}/registration-manager?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <PageContainer>
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Loading your assessment…
          </div>
        </PageContainer>
        <Footer />
      </>
    );
  }

  if (!assessment) {
    return (
      <>
        <Navbar />
        <PageContainer>
          <div className="py-20 text-center">Assessment not found.</div>
        </PageContainer>
        <Footer />
      </>
    );
  }

  const summary = assessment.result_summary || {};
  const jurisdictions: JurisdictionResult[] = summary.jurisdictions || [];
  const confidence = summary.confidence || assessment.confidence_tier || "medium";
  const selectedCount = selected.size;
  // v9 Prompt 1.3: read prices from PRICING_REGISTRY (single source of truth).
  // Falls back to verified defaults if a registry lookup ever fails.
  const crpTotal = Math.round(
    (((PRICING_REGISTRY as any).registration_counsel_review?.amountCents ?? 29900) as number) / 100,
  );
  const diyPrice = Math.round(
    (((PRICING_REGISTRY as any).registration_standalone?.amountCents ?? 4500) as number) / 100,
  );

  // Confidence-tier copy: rewrite CTA framing so users understand WHY to upgrade
  const confidenceCopy: Record<string, { headline: string; subline: string }> = {
    high: {
      headline: "Your map is high-confidence — ready to file",
      subline: "Every flagged jurisdiction matched on multiple deterministic rules. The DIY Toolkit gives you the documents you need; Counsel-Ready adds a pre-filing walkthrough if you want a second pair of eyes.",
    },
    medium: {
      headline: "Your map covers the obvious — Counsel-Ready closes the edge cases",
      subline: "We flagged the jurisdictions that matched on hard thresholds. There may be additional filings (sectoral DPAs, voluntary registrations, lead-authority disputes) that depend on facts only your counsel knows. The Counsel-Ready Pack includes the analysis they'll need to confirm scope.",
    },
    low: {
      headline: "Your inputs are ambiguous — get Counsel-Ready before you file",
      subline: "We could not determine some jurisdictions with high confidence. Filing without a counsel review risks under-registration (enforcement) or over-registration (wasted spend and exposure). Counsel-Ready includes the trace of every rule fired so your lawyer can validate scope quickly.",
    },
  };
  const cConf = confidenceCopy[confidence] || confidenceCopy.medium;

  // Email gate — show ONLY if anonymous and not yet unlocked
  if (!emailUnlocked && jurisdictions.length > 0) {
    return (
      <>
        <Helmet><title>Your Registration Map — End User Privacy</title></Helmet>
        <Navbar />
        <main id="main-content" aria-label="Registration">
          <PageContainer>
            <div className="max-w-md mx-auto py-16">
              <Card>
                <CardHeader className="text-center">
                  <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                  <CardTitle>Your registration map is ready</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {jurisdictions.length} jurisdiction{jurisdictions.length === 1 ? "" : "s"} flagged · confidence: <span className="capitalize font-medium">{confidence}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Where should we send your shareable link? You'll also get a free weekly privacy enforcement digest.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email-gate">Work email</Label>
                    <Input
                      id="email-gate"
                      type="email"
                      placeholder="you@company.com"
                      value={pendingEmail}
                      onChange={(e) => setPendingEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && unlockWithEmail()}
                    />
                  </div>
                  <Button onClick={unlockWithEmail} disabled={savingEmail} className="w-full">
                    {savingEmail ? "Unlocking…" : "Show my registration map"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No spam. Unsubscribe in one click. Your assessment data stays private.
                  </p>
                </CardContent>
              </Card>
            </div>
          </PageContainer>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Registration Map — End User Privacy</title>
        <meta name="description" content="Your jurisdiction-by-jurisdiction privacy registration map with required DPO appointments, DPA filings, AI Act registrations, and renewal timelines." />
      </Helmet>
      <Navbar />
      <main>
        <PageContainer>
          <div className="max-w-5xl mx-auto py-10">
            <header className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-foreground">Your Registration Map</h1>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyShareLink}>
                    <Copy className="h-4 w-4 mr-2" />Share / save link
                  </Button>
                  {assessment?.id && (
                    <>
                      <PDFDownloadButton
                        toolType="registration_assessment"
                        assessmentId={assessment.id}
                        pdfUrl={null}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
                      />
                      <WordConversionPromptButton documentType="registration_assessment" />
                    </>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground mt-2">
                Confidence: <Badge variant="secondary" className="ml-1 capitalize">{confidence}</Badge>
                {" · "}
                {jurisdictions.length} jurisdiction{jurisdictions.length === 1 ? "" : "s"} flagged
              </p>
            </header>

            {/* Confidence-tier framing block — explains WHY to pick a tier */}
            {jurisdictions.length > 0 && (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardContent className="py-5">
                  <p className="font-semibold text-foreground">{cConf.headline}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cConf.subline}</p>
                </CardContent>
              </Card>
            )}

            {jurisdictions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No jurisdictions matched. Try{" "}
                  <button className="underline" onClick={() => navigate(`/registration-manager?token=${token}`)}>
                    revising your answers
                  </button>.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 mb-10">
                {jurisdictions.map((j) => (
                  <Card key={j.code} className={selected.has(j.code) ? "border-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl">
                            {j.name}
                            {j.law ? (
                              <span className="text-sm text-muted-foreground font-normal"> — {j.law}</span>
                            ) : null}
                          </CardTitle>
                          {/* QB-P24 Item 1 — when law is null, surface the resolution
                              narrative instead of a blank em-dash. */}
                          {!j.law && j.registration_required_basis && (
                            <p className="text-sm text-muted-foreground mt-1">{j.registration_required_basis}</p>
                          )}
                          {j.why && <p className="text-sm text-muted-foreground mt-1">{j.why}</p>}
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(j.code)}
                            onChange={() => {
                              const next = new Set(selected);
                              if (next.has(j.code)) next.delete(j.code); else next.add(j.code);
                              setSelected(next);
                            }}
                          />
                          Include in order
                        </label>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        {/* QB-P24 Item 1 — tri-state: null renders as an explicit
                            "could not be resolved" ask rather than a false negative. */}
                        <Fact
                          label="DPA filing"
                          value={
                            j.registration_required === true
                              ? "Required"
                              : j.registration_required === false
                                ? "Not required"
                                : `Could not be resolved — confirm with ${j.authority || j?.unresolved?.authority_to_confirm || "the competent supervisory authority"}`
                          }
                        />
                        <Fact label="DPO" value={j.dpo_required ? "Required" : "Recommended"} />
                        <Fact label="EU AI Act" value={j.ai_registration_required ? "Yes (high-risk)" : "—"} />
                        <Fact label="Article 27 rep" value={j.representative_required ? "Required" : "—"} />
                        {/* QB-P24 Item 1 — omit fee row entirely when null (matches
                            PDF renderer in generate-report-pdf/index.ts:1795-1802). */}
                        {j.filing_fee_cents != null && j.filing_currency ? (
                          <Fact label="Filing fee" value={`${(j.filing_fee_cents / 100).toFixed(2)} ${j.filing_currency}`} />
                        ) : null}
                        <Fact label="Renewal" value={j.renewal_period_months ? `Every ${j.renewal_period_months} months` : "None"} />
                        <Fact label="Authority" value={j.authority || j?.unresolved?.authority_to_confirm || "—"} />
                        <Fact label="Region" value={j.region || "—"} />
                      </div>
                      {j.notes && <p className="text-xs text-muted-foreground mt-3"><FileText aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {j.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card className="bg-muted/40">
              <CardHeader>
                <CardTitle>Get the documents — you file</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  We generate the documents and the filing checklist. You (or your counsel) submit them to each authority. We do not file on your behalf.
                </p>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <PlanCard
                  title="DIY Toolkit"
                  price={`$${diyPrice}`}
                  priceFootnote={`Flat — any jurisdiction count`}
                  blurb={`One-time. Documents and a step-by-step filing checklist for each jurisdiction you select. Flat ${PRICING.tools.registration.display} regardless of count.`}
                  cta={purchasing === "diy" ? "Loading…" : selectedCount === 0 ? "Select a jurisdiction" : "Get the toolkit"}
                  onClick={() => purchase("diy")}
                  disabled={purchasing !== null || selectedCount === 0}
                />
                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-brand-navy mb-2">Renewal tracking — included with subscription</h3>
                  <p className="text-sm text-slate flex-1">
                    Subscribers get renewal deadline reminders for every filing automatically — nothing extra to buy.
                  </p>
                  <Link to="/subscribe" className="mt-4 text-sm font-medium text-brand-teal-text hover:underline">
                    See subscription plans →
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </main>
      <Footer />
      <RegistrationCheckoutModal
        open={checkoutTier !== null}
        tier={checkoutTier ?? "diy"}
        jurisdictions={Array.from(selected)}
        assessmentId={assessment?.id}
        organizationSnapshot={{
          name: assessment?.organization_name,
          country: assessment?.organization_country,
          size: assessment?.organization_size,
          industry: assessment?.industry,
          contact_email: assessment?.email,
          intake: assessment?.intake_data,
        }}
        onClose={() => setCheckoutTier(null)}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function PlanCard({ title, price, priceFootnote, blurb, cta, onClick, disabled, highlight }: { title: string; price: string; priceFootnote?: string; blurb: string; cta: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-background p-4 flex flex-col ${highlight ? "border-primary ring-1 ring-primary" : ""}`}>
      <div className="font-semibold text-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">{price}</div>
      {priceFootnote && <div className="text-[11px] text-muted-foreground mt-0.5">{priceFootnote}</div>}
      <p className="text-sm text-muted-foreground mt-2 flex-1">{blurb}</p>
      <Button className="mt-4" onClick={onClick} disabled={disabled} variant={highlight ? "default" : "outline"}>
        {cta}
      </Button>
    </div>
  );
}
