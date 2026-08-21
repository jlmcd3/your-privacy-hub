// SO WIRE-IN — the customer-facing view of the byte-pinned skeleton document.
//
// The edge functions assemble the ratified skeleton into `report_data.
// skeleton_document`. This component is the in-app renderer for that payload,
// and is the same content the PDF renders — one document, two surfaces.
//
// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only): the
// Table of Authorities renders VERTICALLY, one authority per row, single
// column, through the shared `toaLines` helper.

import { toaLines } from "@/lib/toa-lines";
import { renderWithFootnotes, toaAnchorId } from "@/lib/footnote-marks";

/** ITEM 4 — FIRST ToA FIX: single-column, one-authority-per-row ToA. */
function ToaView({ text }: { text: string }) {
  const lines = toaLines(text);
  if (!lines.length) return null;
  return (
    <ul data-testid="toa-list" className="list-none space-y-1 font-mono text-xs leading-relaxed">
      {lines.map((l, i) => {
        // ITEM SO-12 — anchor a numbered ADMT-v2 entry so body footnote
        // markers can jump to it. Every other product's lines have no
        // leading "N. " and pass through with id=null (no-op).
        const { id, rest } = l.is_heading ? { id: null, rest: l.text } : toaAnchorId(l.text);
        return (
          <li
            key={i}
            id={id ?? undefined}
            data-toa-heading={l.is_heading ? "true" : "false"}
            className={
              l.is_heading
                ? "font-body text-sm font-semibold text-foreground"
                : "pl-6 text-foreground"
            }
          >
            {rest}
          </li>
        );
      })}
    </ul>
  );
}



/** PROMPT 8 — a typed surface rendered as a table (spine `table` blocks). */
export interface SkeletonTable {
  key?: string;
  surface?: string;
  title?: string;
  columns: string[];
  rows: string[][];
  note?: string;
}

export interface SkeletonParagraph {
  kind: string;
  text: string;
  /** Present only on `kind: "table"` paragraphs. */
  table?: SkeletonTable;
}

export interface SkeletonSection {
  id: string;
  title: string;
  paragraphs: SkeletonParagraph[];
}

export interface SkeletonDocument {
  _typed?: string;
  spine_version?: string;
  title: string;
  subtitle?: string;
  sections: SkeletonSection[];
}

/** Type guard used by the result pages to decide which body to render. */
export function isSkeletonDocument(value: unknown): value is SkeletonDocument {
  const d = value as SkeletonDocument | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0
    && typeof d.title === "string";
}

export function SkeletonDocumentView({ doc }: { doc: SkeletonDocument }) {
  return (
    <article className="font-serif-text space-y-8">
      <header className="space-y-1">
        <h2 className="font-serif text-display-card">{doc.title}</h2>
        {doc.subtitle && <p className="text-sm text-muted-foreground">{doc.subtitle}</p>}
      </header>

      {doc.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h3 className="font-body text-display-card font-semibold">{section.title}</h3>
          {section.paragraphs.map((p, i) =>
            p.kind === "table" && p.table ? (
              <SkeletonTableView key={i} table={p.table} />
            ) : section.id === "table_of_authorities" && p.kind !== "skeleton" ? (
              // Every product's ToA content composes as a "rule" block. CPPA
              // Risk v4.5 repurposes this section id for Appendix G and adds
              // a "skeleton" intro paragraph ahead of its table — that intro
              // is ordinary prose, not ToA citation lines, so it must not
              // route through ToaView's citation-line parser.
              <ToaView key={i} text={p.text} />
            ) : (

              p.text.split(/\n{2,}/).map((chunk, j) => (
                <p key={`${i}-${j}`} className="leading-relaxed text-foreground whitespace-pre-line">
                  {renderWithFootnotes(chunk)}
                </p>
              ))
            ),
          )}
        </section>
      ))}
    </article>
  );
}

function SkeletonTableView({ table }: { table: SkeletonTable }) {
  if (!table.rows?.length) return null;
  return (
    <figure className="my-4 space-y-2">
      {table.title && (
        <figcaption className="font-body text-sm font-semibold text-foreground">
          {table.title}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/60">
              {table.columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border-b border-border px-3 py-2 text-left font-body font-semibold text-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="align-top even:bg-muted/20">
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-border px-3 py-2 leading-relaxed text-foreground">
                    {renderWithFootnotes(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note && (
        <figcaption className="text-xs text-muted-foreground">{table.note}</figcaption>
      )}
    </figure>
  );
}
