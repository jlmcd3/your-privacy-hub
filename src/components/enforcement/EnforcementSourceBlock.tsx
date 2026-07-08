// Source block for /enforcement/{id}. Renders only fields present on the row —
// no placeholders, no fabricated values, and no verification date (standing
// no-dates directive for source-confidence modules).
import { ExternalLink } from "lucide-react";

interface SourceBlockProps {
  regulator?: string | null;
  sourceUrl?: string | null;
  law?: string | null;
  decisionType?: string | null;
}

export default function EnforcementSourceBlock({
  regulator,
  sourceUrl,
  law,
  decisionType,
}: SourceBlockProps) {
  const hasAny = Boolean(regulator || sourceUrl || law || decisionType);
  if (!hasAny) return null;

  return (
    <aside
      className="mb-8 rounded-xl border border-brand-cloud bg-card px-5 py-4 md:px-6 md:py-5"
      aria-label="Source"
    >
      <h3 className="font-display text-brand-navy text-base md:text-lg mb-3 leading-tight">
        Source
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-6 gap-y-2 text-sm">
        {regulator && (
          <>
            <dt className="text-muted-foreground">Issuing authority</dt>
            <dd className="text-brand-navy font-medium m-0">{regulator}</dd>
          </>
        )}
        {(decisionType || law) && (
          <>
            <dt className="text-muted-foreground">Publication type</dt>
            <dd className="text-brand-navy m-0">{decisionType || law}</dd>
          </>
        )}
        {sourceUrl && (
          <>
            <dt className="text-muted-foreground">Official source</dt>
            <dd className="m-0">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-teal-text hover:underline"
              >
                View original <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            </dd>
          </>
        )}
      </dl>
    </aside>
  );
}
