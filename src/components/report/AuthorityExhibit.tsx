// ITEM 371 — SHARED AUTHORITY EXHIBIT (frontend renderer).
//
// Screen twin of supabase/functions/_shared/report-exhibits/authority-exhibit.ts.
// Renders the report's cited authorities as a table of authorities in
// federal-brief form, at the END of the report and immediately before the
// universal disclaimer. Only corpus-approved text may appear as an excerpt;
// everything else renders citation-only.

export type AuthorityClass =
  | "constitutional"
  | "statute"
  | "regulation"
  | "administrative"
  | "other";

export interface AuthorityExhibitEntry {
  citation: string;
  as_cited?: string;
  authority_class: AuthorityClass;
  corpus_key?: string | null;
  excerpt?: string | null;
  pin_verified?: boolean;
  note?: string | null;
}

export interface AuthorityExhibitData {
  version?: string;
  heading?: string;
  entries: AuthorityExhibitEntry[];
}

export const AUTHORITY_EXHIBIT_HEADING = "Appendix — Authorities Cited";

export const AUTHORITY_CLASS_ORDER: readonly AuthorityClass[] = [
  "constitutional",
  "statute",
  "regulation",
  "administrative",
  "other",
];

export const AUTHORITY_CLASS_LABELS: Record<AuthorityClass, string> = {
  constitutional: "Constitutional Provisions",
  statute: "Statutes",
  regulation: "Regulations",
  administrative: "Administrative and Regulatory Materials",
  other: "Other Authorities",
};

export const CITATION_ONLY_NOTE =
  "Citation only — this authority has no approved corpus text, so no excerpt is reproduced.";

export function AuthorityExhibit({ exhibit }: { exhibit: AuthorityExhibitData | null | undefined }) {
  const entries = Array.isArray(exhibit?.entries) ? exhibit!.entries : [];
  if (entries.length === 0) return null;

  const groups = AUTHORITY_CLASS_ORDER
    .map((cls) => ({ cls, rows: entries.filter((e) => e?.authority_class === cls) }))
    .filter((g) => g.rows.length > 0);

  return (
    <section className="border-t pt-6" aria-label="Authorities cited">
      <h2 className="font-body text-display-card font-semibold mb-4">
        {exhibit?.heading || AUTHORITY_EXHIBIT_HEADING}
      </h2>
      {groups.map((g) => (
        <div key={g.cls} className="mb-5">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {AUTHORITY_CLASS_LABELS[g.cls]}
          </h3>
          <ul className="space-y-3">
            {g.rows.map((e, i) => (
              <li key={`${e.citation}-${i}`} className="pl-6 -indent-6 text-sm">
                <span>{e.citation}</span>
                {e.as_cited && (
                  <span className="text-xs text-muted-foreground"> (cited at {e.as_cited})</span>
                )}
                {e.excerpt ? (
                  <blockquote className="mt-1 ml-6 indent-0 border-l-2 pl-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {e.excerpt}
                    <span className="block mt-1 text-[10px]">
                      Corpus key: {e.corpus_key} · pin-verified verbatim text
                    </span>
                  </blockquote>
                ) : (
                  <p className="mt-1 ml-6 indent-0 text-xs text-muted-foreground">
                    {e.note || CITATION_ONLY_NOTE}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default AuthorityExhibit;
