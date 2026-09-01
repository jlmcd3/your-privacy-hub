// PRODUCT PAGE REDESIGN — WAVE 1 (central sources), 2026-09-01.
//
// Single source of truth for US state privacy-law counts used in marketing
// copy. Previously each notice page hard-coded "all 20 states" and a literal
// "Kentucky (eff. 2026)" pending line, both of which go stale silently.
//
// Everything here derives from src/data/us_state_comparison.json, which is
// the same registry that powers /compare/us-states and is kept current on a
// review cadence.

import comparison from "./us_state_comparison.json";

export interface UsStateLaw {
  abbr: string;
  name: string;
  law: string;
  status: string;
  /** ISO date the law takes effect. */
  effective: string;
}

const ALL: UsStateLaw[] = (comparison as { states: UsStateLaw[] }).states.map((s) => ({
  abbr: s.abbr,
  name: s.name,
  law: s.law,
  status: s.status,
  effective: s.effective,
}));

export const US_STATE_LAWS: UsStateLaw[] = ALL;

/** States whose comprehensive privacy law is already in force on `asOf`. */
export function statesInEffect(asOf: Date = new Date()): UsStateLaw[] {
  const iso = asOf.toISOString().slice(0, 10);
  return ALL.filter((s) => s.status === "enacted" && s.effective <= iso);
}

/** Enacted states whose law has not yet taken effect on `asOf`. */
export function statesPending(asOf: Date = new Date()): UsStateLaw[] {
  const iso = asOf.toISOString().slice(0, 10);
  return ALL.filter((s) => s.status === "enacted" && s.effective > iso);
}

/** e.g. 20 — the number to use anywhere copy says "all N states". */
export function usStateCount(asOf: Date = new Date()): number {
  return statesInEffect(asOf).length;
}

/** e.g. "all 20 US state privacy laws" */
export function usStateCoveragePhrase(asOf: Date = new Date()): string {
  return `all ${usStateCount(asOf)} US state privacy laws`;
}

/** e.g. ["Vermont (eff. 2028)"] — never a hand-typed state/year pair. */
export function pendingStateLabels(asOf: Date = new Date()): string[] {
  return statesPending(asOf).map((s) => `${s.name} (eff. ${s.effective.slice(0, 4)})`);
}

/**
 * The Virginia-model states: every in-effect state other than California,
 * which runs its own CCPA/CPRA framework.
 */
export function virginiaModelStates(asOf: Date = new Date()): UsStateLaw[] {
  return statesInEffect(asOf).filter((s) => s.abbr !== "CA");
}

export function virginiaModelCount(asOf: Date = new Date()): number {
  return virginiaModelStates(asOf).length;
}
