// DOC 207C — AUTHORITY RULE TYPES.
//
// The shipped shape of a ratified authority rule (`public.authority_rules`),
// plus the trigger-atom grammar the build-time generator
// (generate-corpus-rules) validates against a product's registered typed
// state vocabulary.
//
// DETERMINISM LAW (doc 48 §II.2a) UNCHANGED: no product code reads
// `authority_rules` at run time. The generator reads it at BUILD time and
// returns file CONTENTS; the pinned file is what ships.

export type RuleSettledness = "R1" | "R2" | "R3";
export type RuleDirection = "adverse" | "favorable";

export type RuleElement = "purpose" | "necessity" | "balancing" | "outcome";

export const ADVERSE_EFFECT_KINDS = [
  "override_outcome",
  "cap_verdict",
  "require_condition",
  "flag_risk",
] as const;

export const FAVORABLE_EFFECT_KINDS = [
  "recognise_interest",
  "route_to_basis",
  "precedent_verdict",
] as const;

export const EFFECT_KINDS = [
  ...ADVERSE_EFFECT_KINDS,
  ...FAVORABLE_EFFECT_KINDS,
] as const;

export type RuleEffectKind = typeof EFFECT_KINDS[number];

/** The effect payload is closed on `kind` only; the remaining keys are
 *  effect-specific and are carried through verbatim. */
export interface RuleEffect {
  readonly kind: RuleEffectKind;
  readonly element?: string;
  readonly [key: string]: unknown;
}

/** A trigger is a boolean expression over atoms. Empty arrays are omitted;
 *  a trigger with no atom at all is invalid. */
export interface RuleTrigger {
  readonly all?: readonly string[];
  readonly any?: readonly string[];
  readonly none?: readonly string[];
}

/** The object a product's pinned rules file ships. Curation bookkeeping
 *  (ratified_by / ledger_ref / fixtures) stays in the DB row. */
export interface AuthorityRule {
  readonly rule_id: string;
  readonly family: string;
  readonly product: string;
  readonly settledness: RuleSettledness;
  readonly direction: RuleDirection;
  readonly instrument_scope: readonly string[];
  readonly regulator_scope: string | null;
  readonly bears_on_factor_ids: readonly string[];
  readonly bears_on_element: RuleElement;
  readonly trigger: RuleTrigger;
  readonly effect: RuleEffect;
  readonly reason_sentence: string;
  readonly authority_citation: string;
  readonly retire_when: string;
  readonly worksheet_ref: string;
}

// ── Trigger atom grammar ────────────────────────────────────────────────
//
//   flag:special_category
//   class:direct_marketing
//   relationship:employee
//   data:Health or medical data
//   verdict:necessity=fails
//   state:intake.purpose_details.controller_is_public_authority=true
//
// The optional comparison tail is only meaningful for `verdict:` and
// `state:`; the operator set is closed.

export type AtomKind = "flag" | "class" | "relationship" | "data" | "verdict" | "state";

export const ATOM_KINDS: readonly AtomKind[] = [
  "flag",
  "class",
  "relationship",
  "data",
  "verdict",
  "state",
];

export type AtomOperator = "=" | "!=" | ">=" | "<=" | ">" | "<";

const OPERATORS: readonly AtomOperator[] = ["!=", ">=", "<=", "=", ">", "<"];

export interface RuleAtom {
  readonly kind: AtomKind;
  readonly key: string;
  readonly op: AtomOperator | null;
  readonly value: string | null;
  readonly negated: boolean;
  readonly raw: string;
}

/**
 * Parse one trigger atom. Returns `null` when the atom does not parse —
 * never throws, so a malformed rule becomes a named validation failure
 * rather than a crashed build.
 */
export function parseAtom(raw: unknown): RuleAtom | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text === "") return null;

  const negated = text.startsWith("!");
  const body0 = negated ? text.slice(1).trim() : text;

  const colon = body0.indexOf(":");
  if (colon <= 0) return null;
  const kind = body0.slice(0, colon).trim() as AtomKind;
  if (!ATOM_KINDS.includes(kind)) return null;

  let rest = body0.slice(colon + 1).trim();
  if (rest === "") return null;

  let op: AtomOperator | null = null;
  let value: string | null = null;
  for (const candidate of OPERATORS) {
    const at = rest.indexOf(candidate);
    if (at > 0) {
      op = candidate;
      value = rest.slice(at + candidate.length).trim();
      rest = rest.slice(0, at).trim();
      break;
    }
  }
  if (op !== null && (value === null || value === "")) return null;
  if (rest === "") return null;
  if (op !== null && kind !== "verdict" && kind !== "state") return null;

  return { kind, key: rest, op, value, negated, raw: text };
}

/** Every atom string mentioned by a trigger, in `all`/`any`/`none` order. */
export function triggerAtomStrings(trigger: unknown): string[] | null {
  if (!trigger || typeof trigger !== "object" || Array.isArray(trigger)) return null;
  const t = trigger as Record<string, unknown>;
  const out: string[] = [];
  for (const key of ["all", "any", "none"]) {
    if (!(key in t)) continue;
    const list = t[key];
    if (!Array.isArray(list)) return null;
    for (const item of list) {
      if (typeof item !== "string") return null;
      out.push(item);
    }
  }
  const unknownKey = Object.keys(t).find((k) => !["all", "any", "none"].includes(k));
  if (unknownKey) return null;
  return out;
}
