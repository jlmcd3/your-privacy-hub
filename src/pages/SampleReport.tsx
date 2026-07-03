// Public sample-reports page (SAMPLES-4). Lists every published sample for a
// tool slug. No auth — RLS allows anon SELECT on `status = 'published'`.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type SampleRow = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  scenario_summary: string | null;
  verification: Record<string, unknown> | null;
  pdf_path: string | null;
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
  // Accept a few plausible shapes from the verifier.
  const num = (k: string) => {
    const x = (v as Record<string, unknown>)[k];
    return typeof x === "number" ? x : null;
  };
  let verified = num("verified");
  let degraded = num("degraded") ?? num("generalized");
  let corrected = num("corrected");
  // Fallback: arrays of {status: "..."}
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
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(
    () => (toolSlug ? TOOL_DISPLAY[toolSlug] ?? toolSlug : ""),
    [toolSlug],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!toolSlug) return;
      const { data, error } = await supabase
        .from("sample_reports")
        .select(
          "id, tool_slug, variant, title, scenario_summary, verification, pdf_path, published_at",
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
      const list = (data ?? []) as SampleRow[];
      setRows(list);
      // Generate signed URLs for each PDF (bucket is private; storage policy
      // allows anonymous signed-URL creation on the sample-reports bucket).
      const urlMap: Record<string, string> = {};
      await Promise.all(
        list
          .filter((r) => r.pdf_path)
          .map(async (r) => {
            const { data: signed } = await supabase.storage
              .from("sample-reports")
              .createSignedUrl(r.pdf_path as string, 60 * 60);
            if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
          }),
      );
      if (!cancelled) setPdfUrls(urlMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug]);

  const pageTitle = `Sample ${displayName} reports | EndUserPrivacy`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{pageTitle.slice(0, 60)}</title>
        <meta
          name="description"
          content={`Download fictional, fully-worked sample ${displayName} reports produced by the EndUserPrivacy generator.`}
        />
        <link
          rel="canonical"
          href={`https://www.enduserprivacy.com/samples/${toolSlug ?? ""}`}
        />
      </Helmet>

      <Navbar />
      <main className="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <Link
          to="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All tools
        </Link>

        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-brand-navy mb-2">
            Sample {displayName} reports
          </h1>
          <p className="text-muted-foreground">
            These are fully-worked outputs from our live generator, run on
            fictional companies and people. Use them to evaluate format,
            depth, and citation discipline before you run your own.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-sm p-4 mb-6">
            Could not load samples: {error}
          </div>
        )}

        {rows === null && (
          <div className="text-sm text-muted-foreground">Loading samples…</div>
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

        <div className="space-y-5">
          {rows?.map((r) => {
            const vSummary = summarizeVerification(r.verification);
            const pdfUrl = pdfUrls[r.id];
            const viewHref = `/samples/${r.tool_slug}/${r.variant}`;
            return (
              <article
                key={r.id}
                className="rounded-lg border border-brand-cloud bg-card p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 px-2.5 py-0.5 text-xs font-medium mb-2">
                      SAMPLE — fictional scenario
                    </span>
                    <h2 className="font-display text-xl text-brand-navy">
                      <Link to={viewHref} className="hover:underline underline-offset-4">
                        {r.title}
                      </Link>
                    </h2>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                    {r.variant}
                  </span>
                </div>

                {r.scenario_summary && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {r.scenario_summary}
                  </p>
                )}

                {vSummary && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-brand-teal shrink-0" aria-hidden />
                    <span>{vSummary}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={viewHref}
                    className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
                  >
                    <FileText className="h-4 w-4" aria-hidden /> Read sample report
                  </Link>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-brand-cloud px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cloud/40"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
