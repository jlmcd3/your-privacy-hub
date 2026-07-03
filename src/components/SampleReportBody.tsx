// Shared renderer for a sample report row — used by both the per-slug
// listing page (which now shows the full content inline) and the deep-link
// per-variant view. Handles both `document_text` (plain text with headings)
// and `report_data` (structured JSON).
import type { JSX } from "react";

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
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <ul className="list-disc pl-6 space-y-1.5">
          {value.map((v, i) => (
            <li key={i} className="leading-7">
              {String(v)}
            </li>
          ))}
        </ul>
      );
    }
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
              <div>{renderValue(v, depth + 1)}</div>
            </section>
          );
        })}
      </div>
    );
  }
  return null;
}

export function SampleReportBody({
  documentText,
  reportData,
}: {
  documentText: string | null;
  reportData: Record<string, unknown> | null;
}) {
  if (documentText && documentText.trim().length > 0) {
    return renderDocumentText(documentText);
  }
  if (reportData && Object.keys(reportData).length > 0) {
    return renderValue(reportData, 0);
  }
  return (
    <div className="text-sm text-muted-foreground">
      No rendered content is available for this sample.
    </div>
  );
}
