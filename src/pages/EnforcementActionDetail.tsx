import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Action {
  id: string;
  etid: string | null;
  regulator: string;
  subject: string | null;
  jurisdiction: string;
  decision_date: string | null;
  fine_amount: string | null;
  fine_eur: number | null;
  fine_eur_equivalent: number | null;
  law: string | null;
  violation: string | null;
  source_url: string | null;
  raw_text: string | null;
  industry_sector: string | null;
  company_type: string | null;
  data_categories: string[] | null;
  violation_types: string[] | null;
  tool_relevance: string[] | null;
  key_compliance_failure: string | null;
  preventive_measures: string | null;
  precedent_significance: number | null;
  breach_related: boolean | null;
  biometric_related: boolean | null;
  dpa_related: boolean | null;
}

function formatEur(n: number | null) {
  if (!n || n <= 0) return null;
  return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const TOOL_LINKS: Record<string, string> = {
  "DPIA (Impact Assessment)": "/dpia-framework",
  "LIA": "/li-assessment",
  "Records of Processing": "/governance-assessment",
  "Vendor DD": "/governance-assessment",
  "Cookie Consent": "/cookie-consent",
  "Breach Response": "/breach-notification",
  "DSR Workflow": "/governance-assessment",
  "Children Compliance": "/governance-assessment",
  "Biometric Compliance": "/biometric-privacy",
  "Cross-Border Transfer": "/cross-border-transfers",
};

export default function EnforcementActionDetail() {
  const { id } = useParams();
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Action[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      // Try the full table first (works for last 45 days, returns enriched fields).
      const { data: fullData } = await supabase
        .from("enforcement_actions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fullData) {
        setAction(fullData as Action);
      } else {
        // Older actions: fall back to the public basic-columns RPC (any age, basic fields only).
        const { data: basic } = await supabase.rpc(
          "get_enforcement_action_basic",
          { _id: id }
        );
        const row = Array.isArray(basic) ? basic[0] : basic;
        if (row) {
          setAction({
            id: row.id,
            etid: row.etid,
            regulator: row.regulator,
            subject: row.subject,
            jurisdiction: row.jurisdiction,
            decision_date: row.decision_date,
            fine_amount: row.fine_amount,
            fine_eur: row.fine_eur,
            fine_eur_equivalent: row.fine_eur_equivalent,
            law: row.law,
            violation: row.violation,
            source_url: row.source_url,
            raw_text: null,
            industry_sector: null,
            company_type: null,
            data_categories: null,
            violation_types: null,
            tool_relevance: null,
            key_compliance_failure: null,
            preventive_measures: null,
            precedent_significance: null,
            breach_related: null,
            biometric_related: null,
            dpa_related: null,
          } as Action);
        } else {
          setAction(null);
        }
      }
      setLoading(false);

      // Related cases — only from the last 45 days (public window)
      const currentJurisdiction =
        (fullData as Action | null)?.jurisdiction ?? null;
      if (currentJurisdiction) {
        const { data: rel } = await supabase
          .from("enforcement_actions")
          .select(
            "id,regulator,subject,jurisdiction,decision_date,fine_eur,fine_eur_equivalent,industry_sector,data_categories,violation_types,precedent_significance,key_compliance_failure,source_url,law"
          )
          .eq("jurisdiction", currentJurisdiction)
          .neq("id", id)
          .order("decision_date", { ascending: false, nullsFirst: false })
          .limit(5);
        setRelated((rel as Action[]) ?? []);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="font-serif text-3xl mb-4">Action not found</h1>
          <Link to="/enforcement" className="text-primary hover:underline">← Back to Enforcement</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const fine = formatEur(action.fine_eur_equivalent ?? action.fine_eur);
  const title = action.subject || "Privacy enforcement action";
  const desc = action.key_compliance_failure || action.violation?.slice(0, 160) || `${action.regulator} enforcement action in ${action.jurisdiction}.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — {action.regulator} | Enforcement Intelligence</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`https://enduserprivacy.com/enforcement-intelligence/${action.id}`} />
      </Helmet>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/enforcement-intelligence" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Enforcement Intelligence
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
            <span className="font-medium text-foreground">{action.jurisdiction}</span>
            <span>•</span>
            <span>{action.regulator}</span>
            {action.decision_date && <><span>•</span><span>{new Date(action.decision_date).toLocaleDateString()}</span></>}
            {action.law && <><span>•</span><span>{action.law}</span></>}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl mb-4">{title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            {fine && (
              <div>
                <div className="text-xs text-muted-foreground">Fine</div>
                <div className="font-mono text-2xl font-semibold">{fine}</div>
              </div>
            )}
            {action.precedent_significance && (
              <div>
                <div className="text-xs text-muted-foreground">Precedent significance</div>
                <div className="text-amber-500 text-lg">
                  {"★".repeat(action.precedent_significance)}
                  <span className="text-muted-foreground/40">{"★".repeat(5 - action.precedent_significance)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {action.industry_sector && <Badge variant="outline" className="capitalize">{action.industry_sector}</Badge>}
            {action.company_type && <Badge variant="outline" className="capitalize">{action.company_type}</Badge>}
            {action.breach_related && <Badge variant="secondary">Data breach</Badge>}
            {action.biometric_related && <Badge variant="secondary">Biometric</Badge>}
            {action.dpa_related === false && <Badge variant="secondary">Civil litigation</Badge>}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {action.key_compliance_failure && (
            <Card className="md:col-span-2">
              <CardContent className="p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Key compliance failure</h2>
                <p className="text-base leading-relaxed">{action.key_compliance_failure}</p>
              </CardContent>
            </Card>
          )}
          {action.preventive_measures && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">What should have been done</h2>
                <p className="text-sm leading-relaxed">{action.preventive_measures}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {(action.violation_types?.length || action.data_categories?.length) && (
          <Card className="mb-6">
            <CardContent className="p-5 space-y-4">
              {action.violation_types && action.violation_types.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Violation types</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {action.violation_types.map((v) => <Badge key={v} variant="secondary" className="capitalize">{v}</Badge>)}
                  </div>
                </div>
              )}
              {action.data_categories && action.data_categories.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Data categories</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {action.data_categories.map((c) => (
                      <Badge key={c} className="capitalize bg-primary/10 text-primary hover:bg-primary/20">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {action.violation && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Violation summary</h2>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{action.violation}</p>
            </CardContent>
          </Card>
        )}

        {action.tool_relevance && action.tool_relevance.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Relevant compliance tools</h2>
              <div className="flex flex-wrap gap-2">
                {action.tool_relevance.map((t) => {
                  const href = TOOL_LINKS[t];
                  return href ? (
                    <Link key={t} to={href}>
                      <Button variant="outline" size="sm">{t}</Button>
                    </Link>
                  ) : (
                    <Badge key={t} variant="outline">{t}</Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {action.source_url && (
          <div className="mb-8">
            <a href={action.source_url} target="_blank" rel="noopener noreferrer">
              <Button variant="default" className="gap-2">
                View original source <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        )}

        {/* Registration Manager cross-link — many enforcement actions stem from missing/expired filings */}
        <Card className="mb-8 border-amber-200 bg-amber-50/60">
          <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-1">
                Avoid this category of risk
              </div>
              <h3 className="font-semibold text-navy text-base mb-1">
                Are your registrations & DPO appointments current in {action.jurisdiction}?
              </h3>
              <p className="text-sm text-muted-foreground">
                A meaningful share of enforcement actions begin with missing or lapsed filings.
                Run a free assessment with Registration Manager to see your obligations.
              </p>
            </div>
            <Link to="/registration-manager" className="shrink-0">
              <Button variant="default" className="gap-2">
                Free assessment <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl mb-4">More from {action.jurisdiction}</h2>
            <div className="space-y-2">
              {related.map((r) => (
                <Link key={r.id} to={`/enforcement-intelligence/${r.id}`} className="block">
                  <Card className="hover:border-primary/40 transition">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">{r.regulator} • {r.decision_date ? new Date(r.decision_date).toLocaleDateString() : ""}</div>
                        <div className="font-medium truncate">{r.subject || "Undisclosed entity"}</div>
                      </div>
                      <div className="font-mono text-sm shrink-0">{formatEur(r.fine_eur_equivalent ?? r.fine_eur) ?? "—"}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
