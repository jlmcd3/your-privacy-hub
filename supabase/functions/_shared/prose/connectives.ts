// ITEM 339 (PROSE PROGRAM 3 of 4) — DETERMINISTIC CONNECTIVES.
//
// Where the deterministic engine already knows the logical relation between two
// adjacent statements, the renderer says so in words. The mapping below is
// FIXED: relation type -> a small closed set of connectives. There is no model
// in this path and no free choice — selection is `occurrence % set.length`, so
// the same relation at the same position always yields the same word.

/**
 * Relations the engine can assert. Each one comes from the engine's own
 * reasoning structure (which fact fed which conclusion), never from reading
 * the prose.
 */
export type Relation =
  /** A record fact triggers a legal duty. */
  | "trigger_duty"
  /** A silent/insufficient record produces a named ask. */
  | "gap_ask"
  /** A weighing factor produces the weighing outcome. */
  | "factor_outcome"
  /** The statement supports the determination just made. */
  | "support"
  /** The statement cuts against what precedes it. */
  | "contrast"
  /** A further independent point of the same kind. */
  | "addition"
  /** A downstream consequence of what precedes it. */
  | "consequence"
  /** Acknowledged, but does not change the outcome. */
  | "concession"
  /** No asserted relation — emit nothing. */
  | "none";

export const CONNECTIVES: Readonly<Record<Relation, readonly string[]>> = Object.freeze({
  trigger_duty: ["because", "on that basis", "for that reason"],
  gap_ask: ["because", "as a result"],
  factor_outcome: ["on balance", "weighing those factors", "taking those factors together"],
  support: ["indeed", "in support of that", "consistent with that"],
  contrast: ["however", "by contrast", "that said"],
  addition: ["in addition", "further", "separately"],
  consequence: ["as a result", "accordingly", "consequently"],
  concession: ["although", "while", "notwithstanding that"],
  none: [],
});

/** Connectives that attach to the FRONT of the following clause, lower-cased. */
const CLAUSE_INITIAL: ReadonlySet<Relation> = new Set<Relation>([
  "trigger_duty",
  "gap_ask",
  "concession",
]);

export function isClauseInitial(relation: Relation): boolean {
  return CLAUSE_INITIAL.has(relation);
}

/**
 * Deterministic selection. `occurrence` is the running count of this relation
 * within the section, supplied by the caller — never a random or clock value.
 */
export function connectiveFor(relation: Relation, occurrence = 0): string {
  const set = CONNECTIVES[relation];
  if (!set || set.length === 0) return "";
  const i = Math.abs(Math.trunc(occurrence)) % set.length;
  return set[i];
}

/** True when `word` is a legal realization of `relation`. Used by tests and lint. */
export function connectiveMatchesRelation(word: string, relation: Relation): boolean {
  const w = word.trim().toLowerCase().replace(/[,.]$/, "");
  return (CONNECTIVES[relation] ?? []).includes(w);
}

const lower1 = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const upper1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const stripEnd = (s: string) => s.replace(/\s*[.;]\s*$/, "");

/**
 * Joins two statements with the connective the relation licenses.
 *
 * Clause-initial relations subordinate the follower into the lead sentence
 * ("X, because Y."); the rest open a new sentence ("X. As a result, Y.").
 */
export function joinWithConnective(
  lead: string,
  follow: string,
  relation: Relation,
  occurrence = 0,
): string {
  const l = stripEnd(lead.trim());
  const f = stripEnd(follow.trim());
  if (!l) return follow.trim();
  if (!f) return lead.trim();
  const c = connectiveFor(relation, occurrence);
  if (!c) return `${l}. ${upper1(f)}.`;
  return isClauseInitial(relation)
    ? `${l}, ${c} ${lower1(f)}.`
    : `${l}. ${upper1(c)}, ${lower1(f)}.`;
}
