// SHARED ATTESTATION PATTERN (screen twin).
//
// Renders the accountability attestation — named approver, title, approval
// date, next review date and the product's review triggers — at the end of a
// report, immediately before the authority exhibit and the universal
// disclaimer. Where the record does not carry approver data the block says so
// plainly rather than printing an empty signature line.

export interface AttestationData {
  heading?: string;
  approved_by_name?: string | null;
  approved_by_title?: string | null;
  approval_date?: string | null;
  next_review_due?: string | null;
  review_triggers?: string[];
  statement?: string;
  status?: "analysed" | "record_insufficient";
  information_needed?: string;
}

const NOT_RECORDED = "Not recorded";

export function AttestationBlock({ attestation }: { attestation?: AttestationData | null }) {
  if (!attestation) return null;
  const rows: Array<[string, string]> = [
    ["Approved by", attestation.approved_by_name || NOT_RECORDED],
    ["Role or title", attestation.approved_by_title || NOT_RECORDED],
    ["Date of approval", attestation.approval_date || NOT_RECORDED],
    ["Next review due", attestation.next_review_due || NOT_RECORDED],
  ];
  const triggers = Array.isArray(attestation.review_triggers) ? attestation.review_triggers : [];

  return (
    <section className="border-t pt-6 mt-8" aria-label="Approval and review">
      <h2 className="font-body text-display-card font-semibold mb-3">
        {attestation.heading || "Approval and review"}
      </h2>
      {attestation.statement && (
        <p className="text-sm text-muted-foreground mb-4">{attestation.statement}</p>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-border/60 py-1">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {triggers.length > 0 && (
        <>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Review triggers
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {triggers.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </>
      )}
      {attestation.information_needed && (
        <p className="mt-3 text-xs text-muted-foreground">
          Information needed: {attestation.information_needed}
        </p>
      )}
    </section>
  );
}

export default AttestationBlock;
