// SO WIRE-IN — the customer-facing view of the byte-pinned skeleton document.
//
// The edge functions assemble the ratified skeleton into `report_data.
// skeleton_document`. This component is the in-app renderer for that payload,
// and is the same content the PDF renders — one document, two surfaces.

export interface SkeletonParagraph {
  kind: string;
  text: string;
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
            section.id === "table_of_authorities" ? (
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
