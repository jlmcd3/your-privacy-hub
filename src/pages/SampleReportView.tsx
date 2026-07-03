// Public single-sample rendered view. Reads a `sample_reports` row and
// renders it as HTML — either the stored `document_text` (for tools that
// produce a single flowing document) or a generic sectioned render of
// `report_data` (for tools that produce structured JSON). Also offers the
// PDF download and a back-link to the underlying tool.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  scenario_summary: string | null;
  document_text: string | null;
  report_data: Record<string, unknown> | null;
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

// Where "Back to the tool" should point per slug.
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

// Keys we intentionally hide from the generic renderer — they're
// bookkeeping/metadata that would clutter the reader view.
const HIDDEN_KEYS = new Set([
  "generated_at",
  "assessment_id",
  "dpia_id",
  "schema_version",
  "retrieval_meta",
  "annotations",
  "lint_warnings",
  "enforcement_meta",
  "gdpr_meta",
  "legacy_shim_applied",
  "has_unresolved_placeholders",
  "document_metadata",
  "framework_disclaimer",
  "disclaimer",
  "enforcement_context",
  "enforcement_precedents",
  "enforcement_precedents_note",
  "precedent_database_size",
  "precedents_reviewed",
  "data_currency_note",
  "methodology_note",
  "jurisdiction_validation",
  "jurisdictions_analysed",
]);

function titleCase(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDpia\b/g, "DPIA")
    .replace(/\bDpa\b/g, "DPA")
    .replace(/\bCppa\b/g, "CPPA")
    .replace(/\bBipa\b/g, "BIPA")
    .replace(/\bGdpr\b/g, "GDPR")
    .replace(/\bFsor\b/g, "FSOR")
    .replace(/\bIr\b/g, "IR");
}

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

// Convert a plain-text document (with blank lines and inline markdown-ish
// separators like "---") into a readable HTML block. Preserves paragraph
// structure without pulling in a markdown parser.
function renderDocumentText(text: string) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (/^-{3,}$/.test(trimmed)) {
          return <hr key={i} className="border-t border-brand-cloud my-6" />;
        }
        // ALL-CAPS single line → treat as a section heading.
        if (
          !trimmed.includes("\n") &&
          trimmed.length < 140 &&
          trimmed === trimmed.toUpperCase() &&
          /[A-Z]/.test(trimmed)
        ) {
          return (
            <h2
              key={i}
              className="font-display text-xl text-brand-navy mt-8 mb-2 first:mt-0"
            >
              {trimmed}
            </h2>
          );
        }
        // "Section 1: Something" style heading.
        const sectionMatch = trimmed.match(/^(Section\s+\d+[^:\n]*):?\s*(.*)$/i);
        if (sectionMatch && !trimmed.includes("\n\n")) {
          return (
            <h2
              key={i}
              className="font-display text-xl text-brand-navy mt-8 mb-2 first:mt-0"
            >
              {sectionMatch[1]}
              {sectionMatch[2] ? `: ${sectionMatch[2]}` : ""}
            </h2>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function renderValue(value: unknown, depth = 0): JSX.Element | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    return <p className="whitespace-pre-wrap leading-7">{value}</p>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="leading-7">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // Array of primitives → bullet list.
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <ul className="list-disc pl-6 space-y-1.5">
          {value.map((v, i) => (
            <li key={i} className="leading-7">{String(v)}</li>
          ))}
        </ul>
      );
    }
    // Array of objects → stacked cards.
    return (
      <div className="space-y-4">
        {value.map((v, i) => (
          <div
            key={i}
            className="rounded-md border border-brand-cloud bg-muted/20 p-4"
          >
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(
      ([k, v]) => !HIDDEN_KEYS.has(k) && v !== null && v !== undefined && v !== "",
    );
    if (entries.length === 0) return null;
    return (
      <div className={depth === 0 ? "space-y-8" : "space-y-3"}>
        {entries.map(([k, v]) => {
          const HeadingTag = depth === 0 ? "h2" : depth === 1 ? "h3" : "h4";
          const headingCls =
            depth === 0
              ? "font-display text-xl text-brand-navy mb-3"
              : depth === 1
                ? "font-display text-base text-brand-navy mb-2"
                : "text-sm font-semibold text-brand-navy mb-1";
          return (
            <section key={k}>
              <HeadingTag className={headingCls}>{titleCase(k)}</HeadingTag>
              <div className={depth === 0 ? "" : "pl-0"}>
                {renderValue(v, depth + 1)}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  return null;
}

export default function SampleReportView() {
  const { toolSlug, variant } = useParams<{ toolSlug: string; variant: string }>();
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

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
          "id, tool_slug, variant, title, scenario_summary, document_text, report_data, verification, pdf_path, published_at",
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
      if (data?.pdf_path) {
        const { data: signed } = await supabase.storage
          .from("sample-reports")
          .createSignedUrl(data.pdf_path, 60 * 60);
        if (!cancelled && signed?.signedUrl) setPdfUrl(signed.signedUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toolSlug, variant]);

  const vSummary = row ? summarizeVerification(row.verification) : null;

  const body = useMemo(() => {
    if (!row) return null;
    if (row.document_text && row.document_text.trim().length > 0) {
      return renderDocumentText(row.document_text);
    }
    if (row.report_data && Object.keys(row.report_data).length > 0) {
      return renderValue(row.report_data, 0);
    }
    return null;
  }, [row]);

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

      <main className="flex-1 max-w-[900px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              <div className="mt-5 flex flex-wrap gap-3">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
                  >
                    <FileText className="h-4 w-4" aria-hidden /> Download PDF
                  </a>
                )}
                {toolRoute && (
                  <Link
                    to={toolRoute}
                    className="inline-flex items-center gap-2 rounded-md border border-brand-cloud px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cloud/40"
                  >
                    Start your own {displayName}
                  </Link>
                )}
              </div>
            </header>

            <div className="rounded-lg border border-brand-cloud bg-card p-6 md:p-8 shadow-sm">
              {body ?? (
                <div className="text-sm text-muted-foreground">
                  This sample is available as a PDF above — a rendered view isn&apos;t
                  stored for this tool.
                </div>
              )}
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              This document is not legal advice and must be reviewed by qualified legal
              counsel before any operational use or reliance.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
