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

// RC-C3 D-3 (GOV-ASK-1) — DETERMINISTIC CRITICAL-ASK REGISTRY.
// Per-tool list of verdict-critical, non-identity, non-narrative intake fields.
// If the field is empty at guard time AND not "believed with basis" (Doc O 3d),
// an information_needed entry is synthesised DETERMINISTICALLY — independent of
// whether the model emitted any insufficient-info marker. This closes the
// generator-improvisation hole where blank verdict-critical fields were
// silently absorbed and the report rated anyway.
//
// Rules for adding a field here:
//   - The overall verdict/rating genuinely rests on it.
//   - It is NOT identity-locked (see IDENTITY_LOCKED_FIELDS in open-items.ts).
//   - It is NOT a narrative/optional/context field (e.g. additional_context).
//   - Dotted paths supported for nested intake shapes (e.g. "profile.framework").
const ASK_ELIGIBLE_CRITICAL_FIELDS: Record<string, readonly string[]> = {
  governance_assessment: ["dpo_status", "transfer_mechanism", "privacy_notice_coverage"],
  cppa_admt: ["notice_purpose_text", "opt_out_methods"],
  // cppa_cybersecurity: control gaps carry a literal "Insufficient information"
  // status string that trips INSUFFICIENT_MARKER via the existing branch; the
  // deterministic top-level pass is not needed and the nested `controls.<slug>`
  // shape is not addressable by the intake-key auto-repair. Kept out of the
  // registry intentionally.
};

function readPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes(".")) return (obj as any)[path];
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}


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


// RC-A A6 — stopgap identity/locked-field ask guard. Uses first dot-segment
// of `field` to decide whether an information_needed entry re-asks a locked
// or identity field; such entries are stripped and a lint_warnings row is
// pushed. Structural fix arrives in Courier 2.
import { LOCKED_FIELDS_MAP } from "./locked-fields.ts";
import { freezeOpenItemsOnFirstRun } from "./open-items.ts";
const IDENTITY_FIELDS = new Set([
  "entity_name", "subject_anchor", "company_name", "organization_name",
  "system_name", "sector", "q3_sector", "significant_decision_domain",
]);

export function guardInformationNeeded(
  report: any,
  intake: Record<string, unknown> | null | undefined,
  toolType?: string,
): { report: any; deadEndWithoutPath: boolean; strippedCount: number; autoRepaired: number; lockedStripped: number } {
  const intakeObj = intake ?? {};
  const intakeKeys = new Set(Object.keys(intakeObj));
  const WS6_SUPPLEMENTAL_KEYS = new Set(["supplemental_responses", "supplemental_context"]);
  const lockedSet = new Set<string>([
    ...IDENTITY_FIELDS,
    ...(toolType ? (LOCKED_FIELDS_MAP[toolType] ?? []) : []),
  ]);
  const list: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];

  // First pass — RC-A A6: strip locked/identity re-asks. Log a lint_warnings
  // entry per strip so downstream QC can see the mask.
  const lockedStrippedFields: string[] = [];
  const afterLockedStrip = list.filter((e) => {
    const fieldRoot = typeof e?.field === "string" ? e.field.split(".")[0] : "";
    if (fieldRoot && lockedSet.has(fieldRoot)) {
      lockedStrippedFields.push(e.field);
      return false;
    }
    return true;
  });
  if (lockedStrippedFields.length > 0) {
    console.log(JSON.stringify({ evt: "info_needed_locked_stripped", tool: toolType, fields: lockedStrippedFields }));
    if (!Array.isArray(report.lint_warnings)) report.lint_warnings = [];
    for (const f of lockedStrippedFields) {
      report.lint_warnings.push({ code: "locked_ask_stripped", field: f });
    }
  }
  const lockedStripped = lockedStrippedFields.length;

  // Second pass — original closed-set + supplemental-key stripping.
  // RC-C3.CYB-2 (RULING 2): NESTED WALKER for cyber ask vocabulary
  // `controls.<slug>`. A dotted field is accepted iff its first segment names
  // an intake key AND the remaining path resolves to a real intake node — for
  // cyber, iff `<slug>` matches a `controls[i].key` in the intake. No static
  // slug list; the intake itself is the schema (mirrors the top-level rule).
  const isNestedIntakePath = (fieldPath: string): boolean => {
    if (!fieldPath.includes(".")) return false;
    const [root, ...rest] = fieldPath.split(".");
    if (!intakeKeys.has(root)) return false;
    const rootVal = (intakeObj as Record<string, unknown>)[root];
    // Array-of-records with `.key` — cyber `controls[].key` shape.
    if (Array.isArray(rootVal) && rest.length === 1) {
      const slug = rest[0];
      return rootVal.some((r: any) => r && typeof r === "object" && r.key === slug);
    }
    // Nested object path — generic walker (governance profile.*, etc.).
    let cur: any = rootVal;
    for (const seg of rest) {
      if (cur == null || typeof cur !== "object") return false;
      if (!(seg in cur)) return false;
      cur = cur[seg];
    }
    return true;
  };
  const valid = afterLockedStrip.filter((e) => {
    if (!e || typeof e.field !== "string") return false;
    if (WS6_SUPPLEMENTAL_KEYS.has(e.field)) return false;
    if (intakeKeys.has(e.field)) return true;
    return isNestedIntakePath(e.field);
  });
  const strippedCount = afterLockedStrip.length - valid.length;
  if (strippedCount > 0) {
    console.log(JSON.stringify({
      evt: "info_needed_stripped",
      stripped: strippedCount,
      fields: afterLockedStrip.filter((e) => !valid.includes(e)).map((e) => e?.field),
    }));
  }
  report.information_needed = valid;

  // RC-C3 D-3 (GOV-ASK-1) — DETERMINISTIC CRITICAL-ASK PASS.
  // Independent of INSUFFICIENT_MARKER. For each registered critical field
  // that is empty (and not "believed with basis"), synthesise an ask entry
  // deterministically. Respects the 3-entry cap shared with the marker
  // fallback. Emits lint_warnings so downstream QC can see the mask.
  let criticalSynthesised = 0;
  const registry = toolType ? (ASK_ELIGIBLE_CRITICAL_FIELDS[toolType] ?? []) : [];
  if (registry.length > 0) {
    const assertions = (intakeObj as Record<string, unknown>).assertions as
      | Record<string, { state?: string; basis?: unknown }>
      | undefined;
    const believedWithBasis = new Set<string>();
    if (assertions && typeof assertions === "object") {
      for (const [k, v] of Object.entries(assertions)) {
        if (v && typeof v === "object" && (v as any).state === "believed" && (v as any).basis) {
          believedWithBasis.add(k);
        }
      }
    }
    const alreadyCovered = new Set<string>(
      (report.information_needed as any[]).map((e) => String(e?.field ?? "")),
    );
    const additions: Array<{ field: string; why: string; how_to_provide: string; provision?: string }> = [];
    for (const field of registry) {
      if (report.information_needed.length + additions.length >= 3) break;
      if (alreadyCovered.has(field)) continue;
      const rootKey = field.split(".")[0];
      if (believedWithBasis.has(rootKey) || believedWithBasis.has(field)) continue;
      const value = readPath(intakeObj as Record<string, unknown>, field);
      if (!isEmpty(value)) continue;
      additions.push({
        field,
        // D8: user-facing copy — the word "gap" is banned. Credit-first,
        // verdict-anchored phrasing.
        why:
          `The intake left "${field}" empty; the readiness verdict for this dimension cannot be established without it.`,
        how_to_provide:
          `Return to intake and provide a value for "${field}", then regenerate.`,
      });
    }
    if (additions.length > 0) {
      report.information_needed = [...report.information_needed, ...additions];
      criticalSynthesised = additions.length;
      if (!Array.isArray(report.lint_warnings)) report.lint_warnings = [];
      for (const a of additions) {
        report.lint_warnings.push({ code: "critical_ask_synthesised", field: a.field });
      }
      console.log(JSON.stringify({
        evt: "critical_asks_synthesised",
        tool: toolType,
        added: criticalSynthesised,
        fields: additions.map((a) => a.field),
      }));
    }
  }

  const text = JSON.stringify(report);
  const tripped = INSUFFICIENT_MARKER.test(text) && report.information_needed.length === 0;


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

  // RC-B B1 — freeze open_items at first completed generation (idempotent:
  // no-op when report.open_items already present, so revision paths never
  // rebuild). Enhancement-class items are dropped inside buildOpenItems.
  if (toolType) {
    const frozen = freezeOpenItemsOnFirstRun(report, report?.information_needed, toolType, false);
    report = frozen;
  }

  return { report, deadEndWithoutPath, strippedCount, autoRepaired, lockedStripped };
}
