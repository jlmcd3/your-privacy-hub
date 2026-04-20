import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Copy, Loader2, Mail } from "lucide-react";

interface JurisdictionResult {
  code: string;
  name: string;
  region: string;
  law: string;
  authority: string;
  authority_url?: string;
  registration_required: boolean;
  dpo_required: boolean;
  ai_registration_required: boolean;
  representative_required: boolean;
  filing_fee_cents: number | null;
  filing_currency: string | null;
  renewal_period_months: number | null;
  notes: string | null;
  why?: string;
}

export default function RegistrationAssessmentResult() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken ? decodeURIComponent(rawToken) : undefined;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Email gate — anonymous viewers must leave an email before seeing the report.
  // Local-only, never blocks if the assessment was created with an email or by a logged-in user.
  const [emailUnlocked, setEmailUnlocked] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

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
      // Best-effort capture into the marketing list (subscribe-email is idempotent)
      await supabase.functions.invoke("subscribe-email", { body: { email: pendingEmail.trim() } });
      localStorage.setItem(`reg-email-unlocked-${token}`, "1");
      setEmailUnlocked(true);
      toast.success("Your registration map is ready");
    } catch (e) {
      // Even if capture fails, unlock — we already have the email locally.
      localStorage.setItem(`reg-email-unlocked-${token}`, "1");
      setEmailUnlocked(true);
    } finally {
      setSavingEmail(false);
    }
  }

  async function purchase(tier: "diy" | "counsel_review" | "renewal") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to purchase");
      navigate(`/signup?redirect=/registration-manager/result/${encodeURIComponent(token!)}`);
      return;
    }
    setPurchasing(tier);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-registration-checkout",
        {
          body: {
            tier,
            jurisdictions: Array.from(selected),
            assessment_id: assessment?.id,
            organization_snapshot: {
              name: assessment?.organization_name,
              country: assessment?.organization_country,
              size: assessment?.organization_size,
              industry: assessment?.industry,
              contact_email: assessment?.email || user.email,
              intake: assessment?.intake_data,
            },
          },
        }
      );
      if (error) throw error;
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setPurchasing(null);
    }
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
  const crpTotal = 299;

  // Tiered DIY pricing — must mirror diyPriceCents() in create-registration-checkout
  const diyPrice = selectedCount <= 1 ? 49 : selectedCount <= 3 ? 89 : 149;
  const diyTierLabel = selectedCount <= 1 ? "1 jurisdiction" : selectedCount <= 3 ? "2-3 jurisdictions" : "4+ jurisdictions";

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
        <Helmet><title>Your Registration Map — EndUserPrivacy</title></Helmet>
        <Navbar />
        <main>
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
        <title>Your Registration Map — EndUserPrivacy</title>
        <meta name="description" content="Your jurisdiction-by-jurisdiction privacy registration map with required DPO appointments, DPA filings, AI Act registrations, and renewal timelines." />
      </Helmet>
      <Navbar />
      <main>
        <PageContainer>
          <div className="max-w-5xl mx-auto py-10">
            <header className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Your Registration Map</h1>
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  <Copy className="h-4 w-4 mr-2" />Share / save link
                </Button>
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
                          <CardTitle className="text-xl">{j.name} <span className="text-sm text-muted-foreground font-normal">— {j.law}</span></CardTitle>
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
                        <Fact label="DPA filing" value={j.registration_required ? "Required" : "Not required"} />
                        <Fact label="DPO" value={j.dpo_required ? "Required" : "Recommended"} />
                        <Fact label="EU AI Act" value={j.ai_registration_required ? "Yes (high-risk)" : "—"} />
                        <Fact label="Article 27 rep" value={j.representative_required ? "Required" : "—"} />
                        <Fact label="Filing fee" value={j.filing_fee_cents ? `${(j.filing_fee_cents / 100).toFixed(2)} ${j.filing_currency}` : "Free"} />
                        <Fact label="Renewal" value={j.renewal_period_months ? `Every ${j.renewal_period_months} months` : "None"} />
                        <Fact label="Authority" value={j.authority} />
                        <Fact label="Region" value={j.region} />
                      </div>
                      {j.notes && <p className="text-xs text-muted-foreground mt-3">📝 {j.notes}</p>}
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
                  priceFootnote={`${diyTierLabel} · ${selectedCount || "0"} selected`}
                  blurb="One-time. Documents and a step-by-step filing checklist for each jurisdiction you select. Tiered: $49 / $89 / $149 by count."
                  cta={purchasing === "diy" ? "Loading…" : selectedCount === 0 ? "Select a jurisdiction" : "Get the toolkit"}
                  onClick={() => purchase("diy")}
                  disabled={purchasing !== null || selectedCount === 0}
                />
                <PlanCard
                  title="Counsel-Ready Pack"
                  highlight
                  price={`$${crpTotal}`}
                  priceFootnote="Flat — any number of jurisdictions"
                  blurb="Everything in DIY plus enhanced jurisdiction notes, a pre-filing walkthrough, the rules-fired trace for your lawyer, and a counsel handoff doc."
                  cta={purchasing === "counsel_review" ? "Loading…" : selectedCount === 0 ? "Select a jurisdiction" : "Get counsel-ready pack"}
                  onClick={() => purchase("counsel_review")}
                  disabled={purchasing !== null || selectedCount === 0}
                />
                <PlanCard
                  title="Annual Renewal Monitoring"
                  price="$199 / yr / jurisdiction"
                  priceFootnote="Recurring · cancel anytime"
                  blurb="Already filed? We monitor renewal deadlines, send reminders 90/60/30/7 days out, and regenerate updated documents. You submit the renewal."
                  cta={purchasing === "renewal" ? "Loading…" : selectedCount === 0 ? "Select a jurisdiction" : "Subscribe"}
                  onClick={() => purchase("renewal")}
                  disabled={purchasing !== null || selectedCount === 0}
                />
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </main>
      <Footer />
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

function PlanCard({ title, price, blurb, cta, onClick, disabled, highlight }: { title: string; price: string; blurb: string; cta: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-background p-4 flex flex-col ${highlight ? "border-primary ring-1 ring-primary" : ""}`}>
      <div className="font-semibold text-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">{price}</div>
      <p className="text-sm text-muted-foreground mt-2 flex-1">{blurb}</p>
      <Button className="mt-4" onClick={onClick} disabled={disabled} variant={highlight ? "default" : "outline"}>
        {cta}
      </Button>
    </div>
  );
}
