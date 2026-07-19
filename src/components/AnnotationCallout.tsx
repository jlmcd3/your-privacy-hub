import { Link } from "react-router-dom";

interface Annotation {
  enforcement_action_id?: string;
  regulator?: string;
  jurisdiction?: string;
  decision_date?: string;
  summary?: string;
  outcome?: string;
  relevance?: string;
}

const DISCLAIMER =
  "Enforcement citations are drawn from enforcement actions tracked by EUP on a regular basis. " +
  "Actual enforcement actions can lag publication, so please review primary sources and consult " +
  "qualified legal counsel before relying on any regulatory position.";

export function AnnotationCallout({
  annotations,
}: {
  annotations?: Annotation[];
  alwaysVisible?: boolean;
}) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {annotations.map((a, i) => (
        <div
          key={i}
          className="bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-300 dark:border-slate-600 rounded-r px-3 py-2 text-xs"
        >
          <span className="font-semibold text-slate-500 uppercase tracking-wide text-[11px]">
            📋 Corpus
          </span>{" "}
          <span className="font-medium text-foreground">{a.regulator}</span>
          {a.jurisdiction ? ` · ${a.jurisdiction}` : ""}
          {a.decision_date ? ` · ${a.decision_date?.slice(0, 7)}` : ""}
          {a.summary ? ` — ${a.summary}` : ""}
          {a.enforcement_action_id && (
            <>
              {" "}
              <Link
                to={`/enforcement/${a.enforcement_action_id}`}
                className="text-blue-700 hover:underline whitespace-nowrap"
              >
                View →
              </Link>
            </>
          )}
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
        {DISCLAIMER}
      </p>
    </div>
  );
}

export function AnnotationBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
      {count} citation{count !== 1 ? "s" : ""}
    </span>
  );
}

export function AnnotationAppendix({
  annotations,
}: {
  annotations?: Annotation[];
}) {
  if (!Array.isArray(annotations) || annotations.length === 0) return null;
  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold mb-2">
        Drafting Notes — Enforcement Basis
      </h3>
      <p className="text-xs text-muted-foreground italic mb-4 leading-relaxed">
        {DISCLAIMER}
      </p>
      <ul className="space-y-3">
        {annotations.map((a, i) => (
          <li
            key={i}
            className="bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-300 dark:border-slate-600 rounded-r px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {a.regulator}
                  {a.jurisdiction ? ` · ${a.jurisdiction}` : ""}
                  {a.decision_date ? ` · ${a.decision_date.slice(0, 10)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{a.summary}</p>
                {a.relevance && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                    Relevance: {a.relevance}
                  </p>
                )}
              </div>
              {a.enforcement_action_id && (
                <Link
                  to={`/enforcement/${a.enforcement_action_id}`}
                  className="text-xs text-blue-700 hover:underline shrink-0 whitespace-nowrap"
                >
                  View case →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
