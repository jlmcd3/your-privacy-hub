// insufficient-info-guard.ts — post-parse, pre-store validation of the forward-path contract.
// (1) CLOSED-SET CHECK: every information_needed.field must exist in the assessment's own
//     intake — the intake itself is the schema; invented requirements are mechanically
//     impossible. Invalid entries are stripped (logged), never invented.
// (2) DEAD-END DETECTION: any dead-end phrasing in the report without at least one
//     information_needed entry is flagged for the caller (retry where plumbing exists).
const DEAD_END = /\b(cannot|can not|unable to)\s+(be\s+)?(made|determined|assessed|assess|concluded|evaluated)\b|no\s+determination\s+can\b/i;

export function guardInformationNeeded(
  report: any,
  intake: Record<string, unknown> | null | undefined,
): { report: any; deadEndWithoutPath: boolean; strippedCount: number } {
  const intakeKeys = new Set(Object.keys(intake ?? {}));
  const list: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];
  const valid = list.filter((e) => e && typeof e.field === "string" && intakeKeys.has(e.field));
  const strippedCount = list.length - valid.length;
  if (strippedCount > 0) {
    console.log(JSON.stringify({ evt: "info_needed_stripped", stripped: strippedCount,
      fields: list.filter((e) => !valid.includes(e)).map((e) => e?.field) }));
  }
  report.information_needed = valid;
  const text = JSON.stringify(report);
  const deadEndWithoutPath = DEAD_END.test(text) && valid.length === 0;
  if (deadEndWithoutPath) {
    console.warn(JSON.stringify({ evt: "dead_end_without_path" }));
  }
  return { report, deadEndWithoutPath, strippedCount };
}
