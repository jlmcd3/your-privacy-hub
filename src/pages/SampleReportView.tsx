// Public single-sample rendered view. Deep-link to a specific variant.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SampleToolReport } from "@/components/SampleToolReport";
import { TOOL_ROUTE } from "@/lib/sampleToolRoutes";

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
  const [siblings, setSiblings] = useState<Array<{ variant: string; title: string }>>([]);
  const [toc, setToc] = useState<Array<{ id: string; text: string }>>([]);
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
      const [{ data, error }, { data: sibData }] = await Promise.all([
        supabase
          .from("sample_reports")
          .select(
            "id, tool_slug, variant, title, scenario_summary, document_text, report_data, verification, published_at",
          )
          .eq("tool_slug", toolSlug)
          .eq("variant", variant)
          .eq("status", "published")
          .maybeSingle(),
        supabase
          .from("sample_reports")
          .select("variant, title")
          .eq("tool_slug", toolSlug)
          .eq("status", "published")
          .order("variant"),
      ]);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRow(null);
        return;
      }
      setRow((data as Row) ?? null);
      setSiblings((sibData ?? []) as Array<{ variant: string; title: string }>);
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug, variant]);

  // Build TOC from rendered section headings after row loads.
  useEffect(() => {
    if (!row) return;
    const t = window.setTimeout(() => {
      const main = document.getElementById("sample-report-body");
      if (!main) return;
      const items: Array<{ id: string; text: string }> = [];
      main.querySelectorAll("h2, h3").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!text) return;
        let id = el.id;
        if (!id) {
          id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
          if (id) el.id = id;
        }
        if (id) items.push({ id, text });
      });
      setToc(items);
    }, 200);
    return () => window.clearTimeout(t);
  }, [row]);

  const currentIdx = siblings.findIndex((s) => s.variant === variant);
  const prevSib = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextSib = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground no-underline">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to="/samples" className="hover:text-foreground no-underline">Sample Reports</Link>
          <span className="mx-1.5">/</span>
          <Link to={`/samples/${toolSlug}`} className="hover:text-foreground no-underline">{displayName}</Link>
          {variant && (
            <>
              <span className="mx-1.5">/</span>
              <span className="text-foreground font-mono">{variant}</span>
            </>
          )}
        </nav>
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
          <div className="lg:flex lg:gap-8 lg:items-start">
            <div className="flex-1 min-w-0">
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

              <div id="sample-report-body" className="scroll-mt-24">
                <SampleToolReport
                  toolSlug={row.tool_slug}
                  documentText={row.document_text}
                  reportData={row.report_data}
                  publishedAt={row.published_at}
                />
              </div>

              {/* End-of-report CTA + prev/next */}
              {toolRoute && (
                <div className="mt-10 pt-6 border-t border-brand-cloud">
                  <Link
                    to={toolRoute}
                    className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
                  >
                    Start your own {displayName}
                  </Link>
                </div>
              )}

              {(prevSib || nextSib) && (
                <nav
                  aria-label="Other variants"
                  className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {prevSib ? (
                    <Link
                      to={`/samples/${toolSlug}/${prevSib.variant}`}
                      className="rounded-lg border border-brand-cloud p-4 hover:bg-muted/40 no-underline"
                    >
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                        ← Previous variant
                      </p>
                      <p className="text-sm font-medium text-brand-navy">{prevSib.title}</p>
                    </Link>
                  ) : <span />}
                  {nextSib ? (
                    <Link
                      to={`/samples/${toolSlug}/${nextSib.variant}`}
                      className="rounded-lg border border-brand-cloud p-4 hover:bg-muted/40 no-underline text-right"
                    >
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                        Next variant →
                      </p>
                      <p className="text-sm font-medium text-brand-navy">{nextSib.title}</p>
                    </Link>
                  ) : <span />}
                </nav>
              )}

              <p className="mt-8 text-xs text-muted-foreground">
                This document is not legal advice and must be reviewed by qualified legal
                counsel before any operational use or reliance.
              </p>
            </div>

            {/* Sticky mini-TOC (desktop) */}
            {toc.length > 1 && (
              <aside className="hidden lg:block w-64 shrink-0" aria-label="On this page">
                <div className="sticky top-24 rounded-lg border border-brand-cloud bg-card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    On this page
                  </p>
                  <ul className="space-y-1.5">
                    {toc.map((t) => (
                      <li key={t.id}>
                        <a
                          href={`#${t.id}`}
                          className="text-xs text-brand-navy hover:text-brand-teal no-underline block leading-snug"
                        >
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
