// Public single-sample rendered view. Deep-link to a specific variant.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SampleToolReport } from "@/components/SampleToolReport";

type Row = {
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

const TOOL_ROUTE: Record<string, string> = {
  li_assessment: "/legitimate-interest-assessment",
  dpia: "/dpia-framework",
  dpa: "/dpa-generator",
  governance: "/governance-assessment",
  ir_playbook: "/ir-playbook",
  biometric: "/biometric-checker",
  cppa_risk: "/cppa-risk-assessment",
  cppa_cyber: "/cppa-cybersecurity",
  ropa: "/ropa",
  us_notice: "/notice-builder/us",
  eu_notice: "/notice-builder/eu",
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

export default function SampleReportView() {
  const { toolSlug, variant } = useParams<{ toolSlug: string; variant: string }>();
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(
    () => (toolSlug ? TOOL_DISPLAY[toolSlug] ?? toolSlug : ""),
    [toolSlug],
  );
  const toolRoute = toolSlug ? TOOL_ROUTE[toolSlug] : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!toolSlug || !variant) return;
      const { data, error } = await supabase
        .from("sample_reports")
        .select(
          "id, tool_slug, variant, title, scenario_summary, document_text, report_data, verification, published_at",
        )
        .eq("tool_slug", toolSlug)
        .eq("variant", variant)
        .eq("status", "published")
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRow(null);
        return;
      }
      setRow((data as Row) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug, variant]);

  const vSummary = row ? summarizeVerification(row.verification) : null;

  const pageTitle = row
    ? `${row.title} — sample ${displayName}`
    : `Sample ${displayName} report`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{pageTitle.slice(0, 60)}</title>
        <meta
          name="description"
          content={
            row?.scenario_summary ??
            `Fully-worked sample ${displayName} report from EndUserPrivacy.`
          }
        />
        <link
          rel="canonical"
          href={`https://www.enduserprivacy.com/samples/${toolSlug}/${variant}`}
        />
      </Helmet>

      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to={`/samples/${toolSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All {displayName} samples
        </Link>

        {row === undefined && (
          <div className="text-sm text-muted-foreground">Loading sample…</div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-sm p-4 mb-6">
            Could not load sample: {error}
          </div>
        )}

        {row === null && !error && (
          <div className="rounded-lg border border-brand-cloud bg-muted/30 p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" aria-hidden />
            <p className="font-medium text-brand-navy mb-1">Sample not found</p>
            <p className="text-sm text-muted-foreground">
              This sample may have been removed or is not yet published.
            </p>
          </div>
        )}

        {row && (
          <>
            <header className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2.5 py-0.5 text-xs font-medium mb-3">
                SAMPLE — fictional scenario
              </span>
              <h1 className="font-display text-3xl md:text-4xl text-brand-navy mb-2">
                {row.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Sample {displayName} · variant <span className="font-mono">{row.variant}</span>
              </p>
              {row.scenario_summary && (
                <p className="mt-3 text-[15px] text-muted-foreground leading-7">
                  {row.scenario_summary}
                </p>
              )}
              {vSummary && (
                <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-brand-teal shrink-0" aria-hidden />
                  <span>{vSummary}</span>
                </div>
              )}
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

            <SampleToolReport
              toolSlug={row.tool_slug}
              documentText={row.document_text}
              reportData={row.report_data}
              publishedAt={row.published_at}
            />

            <p className="mt-8 text-xs text-muted-foreground">
              This document is not legal advice and must be reviewed by qualified legal
              counsel before any operational use or reliance.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
