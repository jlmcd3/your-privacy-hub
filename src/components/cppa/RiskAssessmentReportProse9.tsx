// ITEM 369 — PROSE-9 (Item 363) CPPA-RISK VIEWER.
//
// Renders `report.prose_document` — the nine Item-363 sections, in plan order,
// with `record_card` sections shown as labelled data rather than sentences.
// Reached only when the prose-9 envelope is present; the live path never sets
// it, so live on-screen output is unaffected.
//
// R6 GUARD: this component renders from the envelope alone. If the envelope
// carries no renderable section it says so loudly instead of shipping a blank.

interface Prose9Section {
  section_id: string;
  title: string;
  text: string;
  degraded?: boolean;
  record_card?: { label: string; value: string }[];
}

export interface RiskAssessmentReportProse9Props {
  report: any;
  createdAt?: string;
}

const bandColor = (r: string) => {
  const x = (r || "").toLowerCase();
  if (x === "critical") return "bg-red-100 text-red-800";
  if (x === "high") return "bg-orange-100 text-orange-800";
  if (x === "moderate" || x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-green-100 text-green-800";
  return "bg-muted text-foreground";
};

export default function RiskAssessmentReportProse9({
  report,
  createdAt,
}: RiskAssessmentReportProse9Props) {
  const doc = report?.prose_document;
  const sections: Prose9Section[] = Array.isArray(doc?.sections) ? doc.sections : [];
  const renderable = sections.filter(
    (s) => (s.text && s.text.trim().length > 0) || (s.record_card && s.record_card.length > 0),
  );

  if (renderable.length === 0) {
    return (
      <section
        role="alert"
        data-testid="cppa-risk-prose9-empty"
        className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-6"
      >
        <h2 className="font-serif mb-2">This assessment could not be displayed</h2>
        <p className="text-sm">
          The stored document carries no renderable sections. Please contact support.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8" data-testid="cppa-risk-prose9">
      <section className="bg-slate-900 text-white rounded-lg p-8">
        <h1 className="font-serif mb-2">CPPA Privacy Risk Assessment</h1>
        {createdAt && (
          <p className="text-slate-300 text-sm">
            Generated {new Date(createdAt).toLocaleDateString()}
          </p>
        )}
        {report?.risk_level && (
          <span
            className={`mt-4 inline-block px-3 py-1.5 rounded font-medium ${bandColor(report.risk_level)}`}
          >
            {report.risk_level}
          </span>
        )}
      </section>

      {renderable.map((s) => (
        <section key={s.section_id} data-section-id={s.section_id} className="space-y-3">
          <h2 className="font-serif text-xl">
            {s.title}
            {s.degraded && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (record incomplete)
              </span>
            )}
          </h2>

          {s.record_card && s.record_card.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-[minmax(8rem,14rem)_1fr] gap-x-6 gap-y-2 rounded-md border p-4 text-sm">
              {s.record_card.map((r, i) => (
                <div key={`${s.section_id}-card-${i}`} className="contents">
                  <dt className="font-medium text-muted-foreground">{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {s.text
            ?.split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p key={`${s.section_id}-p-${i}`} className="leading-relaxed">
                {p}
              </p>
            ))}
        </section>
      ))}

      {typeof report?.disclaimer === "string" && report.disclaimer.trim() && (
        <section className="text-sm italic text-muted-foreground border-t pt-4">
          {report.disclaimer}
        </section>
      )}
    </div>
  );
}
