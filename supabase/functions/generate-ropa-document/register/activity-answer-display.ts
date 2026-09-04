// DOC 166 (2026-09-04) — presentation-only helpers over a raw per-activity
// answer bag (the shape `ropa_answers` rows collapse into, keyed by
// `question_key`, BEFORE `buildRopaAssembleInput` in
// generate-ropa-document/index.ts converts it to the typed
// `RopaActivityInput` the register assembler consumes). Split out so these
// are safely importable from a test — index.ts calls `Deno.serve(...)` at
// module scope, so importing it directly (rather than reading its source as
// text) would start an HTTP listener.

function answerToString(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((v) => answerToString(v)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (value === "") return "—";
  return String(value);
}

/**
 * The per-activity "Cross-border transfers" cell (HTML and DOCX). Before
 * this doc it read `transfer_destination ?? "None"` and appended
 * `(${transfer_mechanism})` whenever a mechanism was answered, with no check
 * that a destination was ALSO recorded — and no question ever asked for one
 * (see the THIRD_PARTY_TRANSFERS intake fix in
 * src/data/ropa-questions/index.ts), so every activity that answered the
 * transfer-mechanism question rendered the self-contradictory "None (sccs)":
 * a stated mechanism beside an asserted absence of any transfer. New records
 * ask for the destination directly; this stays defensive for records
 * answered before the fix landed. One resolver, consumed by both the HTML
 * and DOCX per-activity cells so they cannot diverge again.
 */
export function transferDisplayForActivity(ans: Record<string, unknown>): string {
  const destStr = answerToString(ans.transfer_destination);
  const hasDest = destStr !== "—";
  const mechStr = answerToString(ans.transfer_mechanism);
  const hasMech = mechStr !== "—";
  if (!hasDest && !hasMech) return "None recorded";
  if (!hasDest) return `Destination not recorded (mechanism stated: ${mechStr})`;
  return hasMech ? `${destStr} (${mechStr})` : destStr;
}
