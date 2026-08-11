// SO WIRE-IN — the customer-facing view of the byte-pinned skeleton document.
//
// The edge functions assemble the ratified skeleton into `report_data.
// skeleton_document`. This component is the in-app renderer for that payload,
// and is the same content the PDF renders — one document, two surfaces.

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
            ) : section.id === "table_of_authorities" ? (
              <pre
                key={i}
                className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground"
              >
                {p.text}
              </pre>
            ) : (
              p.text.split(/\n{2,}/).map((chunk, j) => (
                <p key={`${i}-${j}`} className="leading-relaxed text-foreground whitespace-pre-line">
                  {chunk}
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
                    {cell}
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
