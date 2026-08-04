// ITEM 372 (DPIA QUALITY PILOT, METHOD 2a) — DETERMINATION BLOCK (frontend).
//
// Screen twin of supabase/functions/_shared/report-exhibits/determination.ts.
// Renders the document's determination in prose at the very top of the report
// body — after the identity header and the draft banner, before Section 0.

export interface DeterminationBlockData {
  version?: string;
  heading?: string;
  paragraphs?: string[];
  missing_foundations?: string[];
}

export const DETERMINATION_HEADING = "Determination";

export function DeterminationBlock({
  determination,
}: {
  determination: DeterminationBlockData | null | undefined;
}) {
  const paragraphs = Array.isArray(determination?.paragraphs)
    ? determination!.paragraphs.filter((p) => typeof p === "string" && p.trim())
    : [];
  if (paragraphs.length === 0) return null;

  return (
    <section
      className="rounded-lg border border-l-4 border-l-primary bg-card p-5"
      aria-label="Determination"
    >
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        {determination?.heading || DETERMINATION_HEADING}
      </h2>
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

export default DeterminationBlock;
