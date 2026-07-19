import { Link } from "react-router-dom";

export interface EnforcementPrecedent {
  id: string;
  regulator?: string | null;
  jurisdiction?: string | null;
  subject?: string | null;
  decision_date?: string | null;
  fine_eur_equivalent?: number | null;
  fine_amount?: string | null;
  key_compliance_failure?: string | null;
  violation?: string | null;
  precedent_significance?: number | null;
  source_url?: string | null;
}

const fmtFine = (p: EnforcementPrecedent) => {
  if (p.fine_eur_equivalent && p.fine_eur_equivalent > 0) {
    return `€${Math.round(p.fine_eur_equivalent).toLocaleString()}`;
  }
  return p.fine_amount && p.fine_amount !== "0" ? p.fine_amount : "—";
};

const stars = (n?: number | null) => {
  const s = Math.max(0, Math.min(5, n ?? 0));
  return "★".repeat(s) + "☆".repeat(5 - s);
};

const EnforcementPrecedents = ({
  precedents,
  context,
  totalMatched,
  queryDescriptor,
  variant = "standard",
  attempted = false,
}: {
  precedents?: EnforcementPrecedent[] | null;
  context?: string;
  totalMatched?: number;
  queryDescriptor?: string;
  variant?: "standard" | "cppa";
  attempted?: boolean;
}) => {
  const raw = Array.isArray(precedents) ? precedents : [];
  // Suppress unnamed actions and low-relevance (<2 stars) matches. If fewer than
  // 2 qualifying matches remain, we render a single explanatory line below.
  const list = raw.filter(
    (p) =>
      typeof p.subject === "string" &&
      p.subject.trim().length > 0 &&
      (p.precedent_significance ?? 0) >= 2,
  );
  const insufficient = list.length < 2;
  const isEmpty = list.length === 0;

  // Legacy behavior: nothing at all + not attempted -> render nothing
  if (isEmpty && !attempted) return null;


  let calibration: string;
  if (variant === "cppa") {
    calibration =
      "The enforcement database contains actions by non-California regulators. The patterns below illustrate how comparable failures have been treated elsewhere — they are structural context, not CPPA precedent. CPPA-specific guidance in this report is drawn from the CPPA's Final Statement of Reasons.";
  } else if (typeof totalMatched === "number") {
    const actionWord = totalMatched === 1 ? "action" : "actions";
    const involving = queryDescriptor ? ` involving ${queryDescriptor}` : "";
    calibration = `Calibrated against ${totalMatched} enforcement ${actionWord}${involving} — the ${list.length} most relevant are cited below.`;
  } else {
    calibration = `The ${list.length} most relevant enforcement actions from our enforcement database are cited below.`;
  }

  return (
    <section className="bg-card border rounded-lg p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <h2 className="">Enforcement Basis</h2>
        <Link to="/enforcement" className="text-xs text-blue-700 hover:underline">
          Browse full database →
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{calibration}</p>
      {context && <p className="text-xs text-muted-foreground mb-4">{context}</p>}
      {isEmpty || insufficient ? (
        <p className="text-sm text-foreground">
          No sufficiently analogous enforcement actions were matched for this processing profile.
        </p>
      ) : (

        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id} className="border rounded-md p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/enforcement/${p.id}`}
                    className="font-medium text-foreground hover:text-blue-700 no-underline"
                  >
                    {p.subject || "Unnamed action"}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.regulator, p.jurisdiction, p.decision_date?.slice(0, 10)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums">{fmtFine(p)}</div>
                  <div className="text-[11px] text-amber-600" title="Precedent significance">
                    {stars(p.precedent_significance)}
                  </div>
                </div>
              </div>
              {(p.key_compliance_failure || p.violation) && (
                <p className="text-sm text-foreground mt-2">
                  {p.key_compliance_failure || p.violation}
                </p>
              )}
              <div className="mt-2 flex gap-3 text-xs">
                <Link to={`/enforcement/${p.id}`} className="text-blue-700 hover:underline">
                  View analysis
                </Link>
                {p.source_url && (
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:underline"
                  >
                    Original source ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default EnforcementPrecedents;
