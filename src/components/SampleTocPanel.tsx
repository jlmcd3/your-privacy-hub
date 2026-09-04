// SampleTocPanel — the boundary between the public preview of a sample
// document and the withheld remainder. Titles only: no body text, no links.
//
// DOC 183 (2026-09-04): two shapes of preview.
//   • sections — a cut of the row's document: the entries are the withheld
//     sections. Syllabus & Record products keep their Syllabus as page one
//     (it already lists the record), so they pass no entries and only the
//     boundary line renders.
//   • pages — the first pages of the stored PDF: the entries are the finished
//     document's outline (the Notices' numbered sections; the DPA's sections,
//     annexes and attached addenda), some of which begin on the shown pages.
import { Link } from "react-router-dom";
import { FileText, Lock } from "lucide-react";

export type SampleTocEntry = { title: string; index: number };

export function SampleTocPanel({
  entries,
  withheldCount,
  toolRoute,
  unit = "sections",
}: {
  entries: SampleTocEntry[];
  withheldCount: number;
  toolRoute?: string;
  unit?: "sections" | "pages";
}) {
  const count = unit === "pages" ? withheldCount : (withheldCount || entries.length);
  if (count <= 0 && entries.length === 0) return null;

  const boundary =
    unit === "pages"
      ? count > 0
        ? `This sample shows the first pages; the finished document continues for ${count} more ${count === 1 ? "page" : "pages"}.`
        : "This sample shows the first pages of the finished document."
      : `This sample continues for ${count} more ${count === 1 ? "section" : "sections"}.`;

  const entriesLabel = unit === "pages"
    ? "Contents of the finished document:"
    : "The remaining sections of the finished document:";

  return (
    <section className="mt-10 rounded-lg border border-brand-cloud bg-muted/30 p-6">
      <div className="flex items-center gap-2 text-brand-navy">
        <Lock className="h-4 w-4" aria-hidden="true" />
        <h2 className="font-display text-lg">{boundary}</h2>
      </div>

      {entries.length > 0 && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{entriesLabel}</p>
          <ol className="mt-4 space-y-2">
            {entries.map((e) => (
              <li
                key={`${e.index}-${e.title}`}
                className="flex items-start gap-3 text-[15px] leading-6 text-foreground/80"
              >
                <FileText
                  className="mt-1 h-4 w-4 shrink-0 text-brand-teal"
                  aria-hidden="true"
                />
                <span>{e.title}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {toolRoute && (
        <Link
          to={toolRoute}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-teal px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Produce your own full document
        </Link>
      )}
    </section>
  );
}

export default SampleTocPanel;
