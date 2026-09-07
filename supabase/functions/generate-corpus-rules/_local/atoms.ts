// DOC 207C — generator-only helpers over the canonical rule grammar.
//
// `_shared/corpus/rule-types.ts` is the canonical, interpreter-facing module
// and exports exactly the shapes the rule pass needs. Anything only the
// build-time generator needs — the effect-kind lists as arrays, and the
// trigger-flattening used for atom validation — lives here instead, so the
// canonical file never grows an export for our benefit.

import { ADVERSE_KINDS, FAVORABLE_KINDS, type RuleEffect } from "../../_shared/corpus/rule-types.ts";

export const ADVERSE_EFFECT_KINDS: readonly string[] = [...ADVERSE_KINDS];
export const FAVORABLE_EFFECT_KINDS: readonly string[] = [...FAVORABLE_KINDS];
export const EFFECT_KINDS: readonly string[] = [
  ...ADVERSE_EFFECT_KINDS,
  ...FAVORABLE_EFFECT_KINDS,
];

export type EffectKind = RuleEffect["kind"];

const TRIGGER_KEYS = ["all_of", "any_of", "none_of"] as const;

/**
 * Flatten a trigger value of unknown provenance into its atom strings.
 * Returns `null` when the value is not an object of `all_of`/`any_of`/
 * `none_of` string arrays — i.e. when it is not a `RuleTrigger` at all.
 */
export function triggerAtomStrings(trigger: unknown): string[] | null {
  if (!trigger || typeof trigger !== "object" || Array.isArray(trigger)) return null;
  const record = trigger as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(TRIGGER_KEYS as readonly string[]).includes(key)) return null;
  }
  const atoms: string[] = [];
  for (const key of TRIGGER_KEYS) {
    const value = record[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) return null;
    for (const atom of value) {
      if (typeof atom !== "string") return null;
      atoms.push(atom);
    }
  }
  return atoms;
}
