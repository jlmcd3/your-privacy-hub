// SampleTocPanel — the boundary between the public preview of a sample
// document and the withheld remainder. Titles only: no body text, no links.
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
  const count = withheldCount || entries.length;
  if (count <= 0 && entries.length === 0) return null;

  const boundary =
    unit === "pages"
      ? `This sample continues for ${count} more ${count === 1 ? "page" : "page"}${count === 1 ? "" : "s"}.`
      : `This sample continues for ${count} more ${count === 1 ? "section" : "sections"}.`;

  return (
    <section className="mt-10 rounded-lg border border-brand-cloud bg-muted/30 p-6">
      <div className="flex items-center gap-2 text-brand-navy">
        <Lock className="h-4 w-4" aria-hidden="true" />
        <h2 className="font-display text-lg">{boundary}</h2>
      </div>

      {entries.length > 0 && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            The remaining sections of the finished document:
          </p>
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
