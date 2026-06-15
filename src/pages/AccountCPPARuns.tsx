// /account/cppa-runs — lists the authenticated user's past CPPA Suite
// runs (risk + cybersecurity assessments grouped by run-day) plus
// standalone module runs. Each entry provides a re-open link to the
// existing result page and a "Download PDF" action that hits the same
// edge function the result page uses. Subscriber-only access.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackLink from "@/components/dashboard/BackLink";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import CPPASuitePDFButton from "@/components/cppa/CPPASuitePDFButton";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  module: string;
  status: string;
  created_at: string;
  pdf_url: string | null;
  report_data: any;
};

// Pair risk + cybersecurity rows created within 24h into a single "suite"
// card; anything else renders as a single-module card.
function pairRuns(rows: Row[]) {
  const risk = rows.filter((r) => r.module === "risk").sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const cyber = rows.filter((r) => r.module === "cybersecurity").sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const used = new Set<string>();
  const suites: { risk: Row; cyber: Row; created_at: string }[] = [];
  for (const r of risk) {
    const match = cyber.find((c) =>
      !used.has(c.id) &&
      Math.abs(+new Date(c.created_at) - +new Date(r.created_at)) <= 24 * 60 * 60 * 1000
    );
    if (match) {
      used.add(match.id);
      used.add(r.id);
      const created = new Date(r.created_at) > new Date(match.created_at) ? r.created_at : match.created_at;
      suites.push({ risk: r, cyber: match, created_at: created });
    }
  }
  const standalone = rows.filter((r) => !used.has(r.id) && r.module !== "cybersecurity-drift");
  return { suites, standalone };
}

const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const moduleLabel: Record<string, string> = {
  risk: "Privacy Risk Assessment",
  cybersecurity: "Cybersecurity Audit Readiness",
  "cybersecurity-drift": "Cybersecurity Drift Comparison",
  admt: "ADMT Compliance Checker",
};

const moduleResultRoute = (mod: string, id: string) => {
  if (mod === "risk") return `/cppa-risk-assessment/result/${id}`;
  if (mod === "cybersecurity") return `/cppa-cybersecurity/result/${id}`;
  if (mod === "admt") return `/cppa-admt-checker/result/${id}`;
  return `/cppa-cybersecurity/result/${id}`;
};

const moduleStartRoute = (mod: string) => {
  if (mod === "risk") return "/cppa-risk-assessment";
  if (mod === "cybersecurity") return "/cppa-cybersecurity";
  if (mod === "admt") return "/cppa-admt-checker";
  return "/cppa-cybersecurity-drift";
};

const moduleToolType = (mod: string): "cppa_risk" | "cppa_cybersecurity" | "cppa_admt" => {
  if (mod === "risk") return "cppa_risk";
  if (mod === "admt") return "cppa_admt";
  return "cppa_cybersecurity";
};

export default function AccountCPPARuns() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr("Please sign in to view your CPPA runs."); setRows([]); return; }
      const { data, error } = await supabase
        .from("cppa_assessments")
        .select("id, module, status, created_at, pdf_url, report_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { setErr(error.message); setRows([]); return; }
      setRows((data || []) as Row[]);
    })();
  }, []);

  const { suites, standalone } = useMemo(() => {
    if (!rows) return { suites: [], standalone: [] };
    return pairRuns(rows);
  }, [rows]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>My CPPA Runs | End User Privacy</title>
        <meta name="description" content="Your past CPPA Audit Readiness Suite runs — re-open results or download PDFs." />
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        <header>
          <h1 className="font-serif text-brand-navy">My CPPA Runs</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Every CPPA assessment you've run, grouped into Suite runs (Risk + Cybersecurity together) and
            standalone module runs. Re-open the result page or download a PDF.
          </p>
        </header>

        {rows === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading runs…
          </div>
        )}
        {err && <p className="text-sm text-red-700">{err}</p>}
        {rows && rows.length === 0 && !err && (
          <div className="bg-card border rounded-lg p-8 text-center">
            <p className="mb-4">You haven't run any CPPA assessments yet.</p>
            <Button asChild><Link to="/cppa-scope-checker">Start with the Scope Checker</Link></Button>
          </div>
        )}

        {suites.length > 0 && (
          <section>
            <h2 className="text-brand-navy mb-3">Suite Runs</h2>
            <div className="space-y-3">
              {suites.map((s, i) => (
                <div key={i} className="bg-card border rounded-lg p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-medium">CPPA Audit Readiness Suite</p>
                      <p className="text-xs text-muted-foreground mt-1">Run completed {fmt(s.created_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        Risk score: <strong>{s.risk?.report_data?.overall_score ?? "—"}</strong>
                        {"  ·  "}
                        Cyber score: <strong>{s.cyber?.report_data?.overall_score ?? "—"}</strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/cppa/suite/result?risk_id=${s.risk.id}&cyber_id=${s.cyber.id}`}>Re-open</Link>
                      </Button>
                      <CPPASuitePDFButton riskId={s.risk.id} cyberId={s.cyber.id} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {standalone.length > 0 && (
          <section>
            <h2 className="text-brand-navy mb-3">Standalone Runs</h2>
            <div className="space-y-3">
              {standalone.map((r) => (
                <div key={r.id} className="bg-card border rounded-lg p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-medium">{moduleLabel[r.module] || r.module}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmt(r.created_at)} · status: {r.status}
                      </p>
                      {r.report_data?.overall_score != null && (
                        <p className="text-xs text-muted-foreground">
                          Overall score: <strong>{r.report_data.overall_score}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button asChild variant="outline" size="sm">
                        <Link to={moduleResultRoute(r.module, r.id)}>Re-open</Link>
                      </Button>
                      {r.status === "complete" && r.module !== "cybersecurity-drift" && (
                        <PDFDownloadButton
                          toolType={moduleToolType(r.module)}
                          assessmentId={r.id}
                          pdfUrl={r.pdf_url}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-brand-navy bg-brand-cloud hover:bg-brand-cloud/70 border border-brand-cloud rounded-lg no-underline transition-colors disabled:opacity-60"
                        />
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link to={moduleStartRoute(r.module)}>Run again</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
