// DOC 261 (2026-09-14) — INJECTED REPORT DATE.
//
// The /all-ptest determinism check regenerates a fixed intake twice and
// requires byte-identical customer text. Every product assembler stamps the
// document with "today", so the harness must be able to say WHICH day. This
// module is the single parser for that request-body field, shared by every
// product function that honours it:
//
//   * `report_date` is read ONLY for internal (service-key) callers — the
//     ptest driver. A customer request carrying the field is ignored, so no
//     customer can back- or post-date a report.
//   * Only a well-formed YYYY-MM-DD that parses as a real UTC date is
//     honoured; anything else ⇒ undefined ⇒ the product uses today, exactly
//     the pre-261 behaviour.
//
// No dependencies: product index modules import this without growing their
// module graph.

export const REPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a YYYY-MM-DD string that is a real calendar date (UTC). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !REPORT_DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * The injected report date from a request body, or undefined.
 * `internal` is `verifyCaller(...).internal` — the field is honoured for
 * service-key callers only.
 */
export function parseReportDate(body: unknown, internal: boolean): string | undefined {
  if (!internal || !body || typeof body !== "object") return undefined;
  const v = (body as Record<string, unknown>).report_date;
  return isIsoDate(v) ? v : undefined;
}
