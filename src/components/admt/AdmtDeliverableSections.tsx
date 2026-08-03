// UPGRADE-3 (CPPA ADMT) — presentation for the §§ 7220-7222 analytic
// deliverables produced by run-admt-checker.
//
// Render order is load-bearing (ITEM 4): the LAWFULNESS determination comes
// first, then the element-by-element notice testing, the condition-by-condition
// exception analysis, and the § 7222 access-readiness findings. Enforcement
// exposure is rendered by the caller AFTER these sections.
//
// Presentation only — every verdict, quote and citation is produced upstream.

type Str = string | null | undefined;

function txt(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const VERDICT_TONE: Record<string, string> = {
  meets: "text-emerald-700 dark:text-emerald-400",
  ready: "text-emerald-700 dark:text-emerald-400",
  qualifies: "text-emerald-700 dark:text-emerald-400",
  not_applicable: "text-muted-foreground",
  partially_ready: "text-amber-700 dark:text-amber-400",
  inadequate: "text-red-700 dark:text-red-400",
  absent: "text-red-700 dark:text-red-400",
  not_ready: "text-red-700 dark:text-red-400",
  does_not_qualify: "text-red-700 dark:text-red-400",
  insufficient_record: "text-muted-foreground italic",
};

function VerdictPill({ verdict }: { verdict: Str }) {
  const v = txt(verdict);
  if (!v) return null;
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wide ${VERDICT_TONE[v] ?? "text-muted-foreground"}`}>
      {v.replace(/_/g, " ")}
    </span>
  );
}

/** Standard → record fact → application → verdict, in that order. */
function ShapeLawBlock({ f }: { f: Record<string, unknown> }) {
  const rows: [string, string][] = [
    ["Standard", txt(f.standard)],
    ["What the record shows", txt(f.record_fact) || txt(f.process_on_the_record)],
    ["Application", txt(f.application)],
    ["Why", txt(f.why)],
  ];
  const needed = txt(f.information_needed);
  return (
    <div className="space-y-2">
      {rows
        .filter(([, body]) => body.length > 0)
        .map(([label, body]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-[13px] leading-relaxed">{body}</p>
          </div>
        ))}
      {needed && (
        <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Information needed</p>
          <p className="text-[12px] leading-relaxed">{needed}</p>
        </div>
      )}
    </div>
  );
}

function ElementCard({ f }: { f: Record<string, unknown> }) {
  const label = txt(f.element_label) || txt(f.exception_label) || txt(f.finding_id);
  const citation = txt(f.citation);
  const verbatim = txt(f.element_verbatim);
  const published = txt(f.published_text);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold">{label}</p>
        <VerdictPill verdict={txt(f.verdict) || txt(f.qualifies)} />
      </div>
      {citation && <p className="text-[11px] font-mono text-muted-foreground">{citation}</p>}
      {verbatim && (
        <blockquote className="border-l-2 border-brand-teal/50 pl-3 text-[12px] leading-relaxed text-foreground/80">
          {verbatim}
        </blockquote>
      )}
      {published && (
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Your published words</p>
          <p className="text-[12px] leading-relaxed italic">{published}</p>
        </div>
      )}
      <ShapeLawBlock f={f} />
    </div>
  );
}

export function AdmtLawfulnessSection({ determination }: { determination?: Record<string, any> | null }) {
  const law = determination?.lawfulness;
  if (!law || (!txt(law.finding) && !txt(law.information_needed))) return null;
  return (
    <section className="font-serif-text space-y-3">
      <h3 className="font-body text-display-card font-semibold">Lawfulness Determination</h3>
      <div className="rounded-lg border bg-card p-4 space-y-2">
        {txt(law.finding) && <p className="text-[13px] leading-relaxed">{txt(law.finding)}</p>}
        {txt(law.citation) && <p className="text-[11px] font-mono text-muted-foreground">{txt(law.citation)}</p>}
        {txt(law.information_needed) && (
          <div className="rounded-md bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 px-3 py-2">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Information needed</p>
            <p className="text-[12px] leading-relaxed">{txt(law.information_needed)}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdmtNoticeTestingSection({
  findings,
  exceptionIdentification,
}: {
  findings?: Record<string, any>[] | null;
  exceptionIdentification?: Record<string, any> | null;
}) {
  const list = Array.isArray(findings) ? findings : [];
  if (list.length === 0 && !exceptionIdentification) return null;
  return (
    <section className="font-serif-text space-y-3">
      <h3 className="font-body text-display-card font-semibold">Pre-use Notice — element by element (§ 7220)</h3>
      <div className="space-y-3">
        {list.map((f, i) => (
          <ElementCard key={txt(f.element_id) || i} f={f} />
        ))}
        {exceptionIdentification && <ElementCard f={exceptionIdentification} />}
      </div>
    </section>
  );
}

export function AdmtExceptionSection({ entries }: { entries?: Record<string, any>[] | null }) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return null;
  return (
    <section className="font-serif-text space-y-3">
      <h3 className="font-body text-display-card font-semibold">Opt-out Exceptions — condition by condition (§ 7221)</h3>
      <div className="space-y-3">
        {list.map((e, i) => {
          const conditions = Array.isArray(e.conditions) ? e.conditions : [];
          return (
            <div key={txt(e.proposition_key) || i} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold">{txt(e.exception_label)}</p>
                <VerdictPill verdict={txt(e.qualifies)} />
              </div>
              {txt(e.citation) && <p className="text-[11px] font-mono text-muted-foreground">{txt(e.citation)}</p>}
              {conditions.map((c: Record<string, unknown>, j: number) => (
                <div key={txt(c.condition_id) || j} className="border-l-2 border-brand-teal/40 pl-3 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-medium">{txt(c.condition_verbatim)}</p>
                    <VerdictPill verdict={txt(c.verdict)} />
                  </div>
                  {txt(c.evidence_on_the_record) && (
                    <p className="text-[12px] leading-relaxed text-foreground/80">{txt(c.evidence_on_the_record)}</p>
                  )}
                  {txt(c.why) && <p className="text-[12px] leading-relaxed">{txt(c.why)}</p>}
                  {txt(c.information_needed) && (
                    <p className="text-[12px] leading-relaxed italic text-muted-foreground">
                      Information needed: {txt(c.information_needed)}
                    </p>
                  )}
                </div>
              ))}
              {txt(e.information_needed) && (
                <p className="text-[12px] leading-relaxed italic text-muted-foreground">
                  Information needed: {txt(e.information_needed)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AdmtAccessReadinessSection({ findings }: { findings?: Record<string, any>[] | null }) {
  const list = Array.isArray(findings) ? findings : [];
  if (list.length === 0) return null;
  return (
    <section className="font-serif-text space-y-3">
      <h3 className="font-body text-display-card font-semibold">Access Rights — explanation readiness (§ 7222)</h3>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Each element below is what a consumer is entitled to be told on a verified access request. The finding tests what
        your record can produce today against that standard.
      </p>
      <div className="space-y-3">
        {list.map((f, i) => (
          <ElementCard key={txt(f.element_id) || i} f={f} />
        ))}
      </div>
    </section>
  );
}
