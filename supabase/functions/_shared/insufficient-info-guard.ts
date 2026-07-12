// insufficient-info-guard.ts — post-parse, pre-store validation of the forward-path contract.
// (1) CLOSED-SET CHECK: every information_needed.field must exist in the assessment's own
//     intake — the intake itself is the schema; invented requirements are mechanically
//     impossible. Invalid entries are stripped (logged), never invented.
// (2) DEAD-END DETECTION: dead-end phrasing in the report without at least one
//     information_needed entry is flagged. To avoid triggering full model regen on a single
//     stray phrase in a 39k-char document, the trigger now requires BOTH:
//       (a) an explicit insufficient-info marker ("insufficient information" / "without
//           further information" / "cannot be determined without"), AND
//       (b) an empty information_needed array.
//     A lone "unable to assess" phrase no longer trips it.
// (3) AUTO-REPAIR: when the guard trips, we deterministically synthesise information_needed
//     entries from intake keys whose values are empty/null. This satisfies the FORWARD PATH
//     rule without a second ~180s model call. `deadEndWithoutPath` is only returned true
//     when auto-repair cannot find any empty intake fields to reference (rare edge case).

// Narrow, high-signal marker phrases — MUST co-occur with an empty information_needed array
// to trip the guard. Chosen so borderline analytical language ("cannot be reliably assessed
// from the training data") does not force a full regeneration.
const INSUFFICIENT_MARKER =
  /\b(insufficient\s+information|without\s+further\s+information|cannot\s+be\s+determined\s+without|requires?\s+additional\s+information|not\s+possible\s+to\s+(?:assess|determine)\s+without)\b/i;

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

function synthesiseEntriesFromIntake(
  intake: Record<string, unknown>,
  max = 3,
): Array<{ field: string; why: string; how_to_provide: string }> {
  const out: Array<{ field: string; why: string; how_to_provide: string }> = [];
  // Doc O 3d: an intake field carrying assertions[field] = {state:"believed", basis: <non-null>}
  // is a complete record entry and must NEVER be synthesised into an
  // insufficient-basis information_needed pairing. Build the exclusion
  // set once and skip those keys during the empty-value scan below.
  const assertions = (intake as Record<string, unknown>).assertions;
  const believedWithBasis = new Set<string>();
  if (assertions && typeof assertions === "object") {
    for (const [k, v] of Object.entries(assertions as Record<string, unknown>)) {
      if (
        v && typeof v === "object" &&
        (v as any).state === "believed" &&
        (v as any).basis // non-null, non-empty basis
      ) {
        believedWithBasis.add(k);
      }
    }
  }
  // WS6 v2.1: supplemental capture keys are ANSWERS the user provides on
  // regeneration, not intake facts that can be "missing" — auto-repair must
  // never synthesise an information_needed entry pointing at them.
  const WS6_SUPPLEMENTAL_KEYS = new Set(["supplemental_responses", "supplemental_context"]);
  for (const [k, v] of Object.entries(intake)) {
    if (k === "assertions") continue;
    if (WS6_SUPPLEMENTAL_KEYS.has(k)) continue;
    if (believedWithBasis.has(k)) continue;
    if (isEmpty(v)) {
      out.push({
        field: k,
        why: "This intake field was left empty; the assessment cannot form a specific finding for it without a value.",
        how_to_provide: `Return to intake and provide a value for "${k}", then regenerate.`,
      });
      if (out.length >= max) break;
    }
  }
  return out;
}


export function guardInformationNeeded(
  report: any,
  intake: Record<string, unknown> | null | undefined,
): { report: any; deadEndWithoutPath: boolean; strippedCount: number; autoRepaired: number } {
  const intakeObj = intake ?? {};
  const intakeKeys = new Set(Object.keys(intakeObj));
  const list: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];
  const valid = list.filter((e) => e && typeof e.field === "string" && intakeKeys.has(e.field));
  const strippedCount = list.length - valid.length;
  if (strippedCount > 0) {
    console.log(JSON.stringify({
      evt: "info_needed_stripped",
      stripped: strippedCount,
      fields: list.filter((e) => !valid.includes(e)).map((e) => e?.field),
    }));
  }
  report.information_needed = valid;

  const text = JSON.stringify(report);
  const tripped = INSUFFICIENT_MARKER.test(text) && valid.length === 0;

  let autoRepaired = 0;
  let deadEndWithoutPath = false;

  if (tripped) {
    const synthesised = synthesiseEntriesFromIntake(intakeObj as Record<string, unknown>);
    if (synthesised.length > 0) {
      report.information_needed = synthesised;
      autoRepaired = synthesised.length;
      console.log(JSON.stringify({
        evt: "forward_path_auto_repaired",
        added: autoRepaired,
        fields: synthesised.map((e) => e.field),
      }));
    } else {
      deadEndWithoutPath = true;
      console.warn(JSON.stringify({ evt: "dead_end_without_path" }));
    }
  }

  return { report, deadEndWithoutPath, strippedCount, autoRepaired };
}
