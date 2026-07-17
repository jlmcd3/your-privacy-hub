// GRADER-1 Task 4 — Per-field hedge co-occurrence evaluator for qc_r1_1.
//
// Prior behavior: rationale strings from EVERY rationale-keyed field were
// concatenated, then a single test asked "does any resolved test id appear
// AND does any HEDGE phrase appear". That false-fails when the hedge sits
// in a DIFFERENT field talking about a genuinely INDETERMINATE test.
//
// New behavior (batch 4d54f360 M4/M7 pattern): evaluate PER STRING FIELD.
// Fail ONLY when a resolved test id (or one of its source_fields) AND a
// HEDGE phrase co-occur inside the SAME string. A field whose hedge is
// about a different, non-resolved (indeterminate) test id must PASS.
//
// Exported so run-quality-batch/index.ts uses it AND unit tests can drive
// it directly (see _tests/qc-r1-1-per-field.test.ts).

export type RationaleEntry = { path: string; text: string };

/**
 * Collect every rationale-keyed string leaf in the report AS SEPARATE
 * entries (path + text). Keys matched: rationale, audit, cybersecurity,
 * analysis, reasoning, basis — case-insensitive, matching the pre-existing
 * qc_r1_1 walker.
 */
export function collectRationaleEntries(report: unknown): RationaleEntry[] {
  const out: RationaleEntry[] = [];
  const walk = (node: unknown, key = "", path = ""): void => {
    if (node == null) return;
    if (typeof node === "string") {
      if (/rationale|audit|cybersecurity|analysis|reasoning|basis/i.test(key)) {
        out.push({ path: path || key, text: node });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, key, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, k, path ? `${path}.${k}` : k);
      }
    }
  };
  walk(report);
  return out;
}

/**
 * Per-field evaluator for qc_r1_1.
 *
 * @param entries      Result of collectRationaleEntries.
 * @param resolvedIds  Test ids currently in a RESOLVED state (e.g. ["M4"]).
 * @param resolvedFieldsById Map of id -> source_fields[] backing that resolved test.
 * @param hedge        HEDGE regex (must be a fresh instance per call OR non-global).
 * @returns            passed: true when no in-field co-occurrence found.
 */
export function evaluateResolvedHedgePerField(
  entries: RationaleEntry[],
  resolvedIds: string[],
  resolvedFieldsById: Record<string, string[]>,
  hedge: RegExp,
): { passed: boolean; evidence?: string } {
  for (const { path, text } of entries) {
    const lower = text.toLowerCase();
    if (!hedge.test(lower)) continue;
    // Which resolved anchor co-occurs IN THIS SAME STRING?
    for (const id of resolvedIds) {
      const idLc = id.toLowerCase();
      const idRe = new RegExp(`\\b${idLc.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`);
      if (idRe.test(lower)) {
        return { passed: false, evidence: `hedge co-occurs with resolved test id ${id} in field "${path}"` };
      }
      for (const f of resolvedFieldsById[id] ?? []) {
        const fLc = f.toLowerCase();
        if (fLc.length >= 3 && lower.includes(fLc)) {
          return { passed: false, evidence: `hedge co-occurs with resolved source_field "${f}" (test ${id}) in field "${path}"` };
        }
      }
    }
  }
  return { passed: true };
}
