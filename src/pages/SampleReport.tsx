// Public sample-reports page. Renders every published sample for a tool
// slug inline as a static reading experience — no PDF, no click-through.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SampleToolReport } from "@/components/SampleToolReport";
import { TOOL_ROUTE } from "@/lib/sampleToolRoutes";

type SampleRow = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  scenario_summary: string | null;
  document_text: string | null;
  report_data: Record<string, unknown> | null;
  verification: Record<string, unknown> | null;
  published_at: string | null;
};

const TOOL_DISPLAY: Record<string, string> = {
  li_assessment: "Legitimate Interests Assessment",
  dpia: "Impact Assessment Builder",
  dpa: "Data Processing Agreement",
  governance: "Governance Assessment",
  ir_playbook: "Incident Response Playbook",
  biometric: "Biometric Compliance Check",
  cppa_risk: "CPPA Risk Assessment",
  cppa_cyber: "CPPA Cybersecurity Audit",
  ropa: "Record of Processing Activities (RoPA)",
  us_notice: "US State Privacy Notice",
  eu_notice: "EU / Global Privacy Notice",
};




function summarizeVerification(v: Record<string, unknown> | null): string | null {
  if (!v || typeof v !== "object") return null;
  const num = (k: string) => {
    const x = (v as Record<string, unknown>)[k];
    return typeof x === "number" ? x : null;
  };
  let verified = num("verified");
  let degraded = num("degraded") ?? num("generalized");
  let corrected = num("corrected");
  if (verified === null && Array.isArray((v as { items?: unknown }).items)) {
    const items = ((v as { items: unknown[] }).items) as Array<{ status?: string }>;
    verified = items.filter((i) => i.status === "verified").length;
    degraded = items.filter((i) => i.status === "degraded" || i.status === "generalized").length;
    corrected = items.filter((i) => i.status === "corrected").length;
  }
  if (verified === null && degraded === null && corrected === null) return null;
  const X = verified ?? 0;
  const Z = degraded ?? 0;
  const C = corrected ?? 0;
  const Y = X + Z + C;
  if (Y === 0) return null;
  return `Citations verified against official sources: ${X} of ${Y}${Z > 0 ? `; ${Z} generalized` : ""}.`;
}

export default function SampleReport() {
  const { toolSlug } = useParams<{ toolSlug: string }>();
  const [rows, setRows] = useState<SampleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(
    () => (toolSlug ? TOOL_DISPLAY[toolSlug] ?? toolSlug : ""),
    [toolSlug],
  );
  const toolRoute = toolSlug ? TOOL_ROUTE[toolSlug] : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!toolSlug) return;
      const { data, error } = await supabase
        .from("sample_reports")
        .select(
          "id, tool_slug, variant, title, scenario_summary, document_text, report_data, verification, published_at",
        )
        .eq("tool_slug", toolSlug)
        .eq("status", "published")
        .order("variant");
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as SampleRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug]);

  const pageTitle = `Sample ${displayName} report | EndUserPrivacy`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{pageTitle.slice(0, 60)}</title>
        <meta
          name="description"
          content={`Fully-worked sample ${displayName} report from EndUserPrivacy, run on a fictional scenario.`}
        />
        <link
          rel="canonical"
          href={`https://www.enduserprivacy.com/samples/${toolSlug ?? ""}`}
        />
      </Helmet>

      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground no-underline">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to="/samples" className="hover:text-foreground no-underline">Sample Reports</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{displayName}</span>
        </nav>
        <Link
          to="/samples"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All samples
        </Link>

        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-brand-navy mb-2">
            Sample {displayName} report
          </h1>
          <p className="text-muted-foreground">
            A fully-worked output from our live generator, run on a fictional
            company and scenario. Use it to evaluate format, depth, and
            citation discipline before running your own.
          </p>
          {toolRoute && (
            <div className="mt-5">
              <Link
                to={toolRoute}
                className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
              >
                Start your own {displayName}
              </Link>
            </div>
          )}
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-sm p-4 mb-6">
            Could not load sample: {error}
          </div>
        )}

        {rows === null && (
          <div className="text-sm text-muted-foreground">Loading sample…</div>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="rounded-lg border border-brand-cloud bg-muted/30 p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" aria-hidden />
            <p className="font-medium text-brand-navy mb-1">Sample coming soon</p>
            <p className="text-sm text-muted-foreground">
              We&apos;re finalizing a sample for this tool. Check back shortly.
            </p>
          </div>
        )}

        <div className="space-y-12">
          {rows?.map((r) => {
            const vSummary = summarizeVerification(r.verification);
            return (
              <article
                key={r.id}
                className="rounded-lg border border-brand-cloud bg-card p-6 md:p-8 shadow-sm"
              >
                <header className="mb-6 pb-6 border-b border-brand-cloud">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2.5 py-0.5 text-xs font-medium mb-3">
                    SAMPLE — fictional scenario
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl text-brand-navy mb-2">
                    {r.title}
                  </h2>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                    Variant {r.variant}
                  </p>
                  {r.scenario_summary && (
                    <p className="mt-3 text-[15px] text-muted-foreground leading-7">
                      {r.scenario_summary}
                    </p>
                  )}
                  {vSummary && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-brand-teal shrink-0" aria-hidden />
                      <span>{vSummary}</span>
                    </div>
                  )}
                </header>

                <SampleToolReport
                  toolSlug={r.tool_slug}
                  documentText={r.document_text}
                  reportData={r.report_data}
                  publishedAt={r.published_at}
                />

                {toolRoute && (
                  <div className="mt-8 pt-6 border-t border-brand-cloud flex flex-wrap gap-3">
                    <Link
                      to={toolRoute}
                      className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
                    >
                      Start your own {displayName}
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {rows && rows.length > 0 && (
          <p className="mt-8 text-xs text-muted-foreground">
            This document is not legal advice and must be reviewed by qualified
            legal counsel before any operational use or reliance.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
