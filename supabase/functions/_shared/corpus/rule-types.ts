// Rules-as-data (doc 206): the typed shapes an AuthorityRule is expressed in,
// plus the pure atom/trigger grammar the interpreter (rule-interpreter.ts)
// evaluates a rule's trigger against. No I/O, no Date, no random, no regex
// over free text — every atom is exact-string/equality logic only.
//
// IMPORT BOUNDARY (see tests/edge/corpus/corpus-relevance-rule-boundary.test.ts):
// this module (and rule-interpreter.ts) may be imported ONLY by a product's
// `rule-pass.ts`, a `*-gate.ts` / `*-gates.ts` file, or a test. A generic
// product module — an index.ts, a prose assembler, anything else — reaches
// a rule's effect only through the one door those files provide. That is
// the same "one sanctioned door" shape doc 191 §5 already enforces for the
// RULE_PROFILES/PATTERN_PROFILES split; this is the rule-effect analog of it.

/**
 * A single trigger atom, in the fixed grammar below. `parseAtom` is the only
 * parser — nothing else in this module (or its callers) may pattern-match
 * atom strings independently.
 *
 *   flag:<x>            states.flags.includes(x)
 *   class:<x>            states.use_case_class === x
 *   relationship:<x>      states.relationship === x
 *   data_category:<x>    states.data_categories.includes(x)
 *   instrument:<x>       states.instrument === x
 *   verdict:<element>=<value>   states.verdicts[element] === value
 *   state:<path>=<value>        String(states.states[path]) === value
 *
 * A missing `state:` path is `undefined` and never matches — see the Law B2
 * note on `evaluateTrigger` for the `none_of` special case this implies.
 */
export type RuleAtom = string;

export interface RuleTrigger {
  all_of?: RuleAtom[];
  any_of?: RuleAtom[];
  none_of?: RuleAtom[];
}

export type RuleEffect =
  | { kind: "override_outcome"; outcome: string } // adverse
  | { kind: "cap_verdict"; element: string; max: string } // adverse
  | { kind: "require_condition"; text: string } // adverse (adds)
  | { kind: "flag_risk"; element: string; text: string } // adverse (adds)
  | { kind: "recognise_interest"; element: string; value: string } // favorable (R1 law only)
  | { kind: "route_to_basis"; outcome: string } // favorable (R1 statute only)
  | { kind: "precedent_verdict"; element: string; value: string }; // favorable (precedent, same facts)

export type Settledness = "R1" | "R2" | "R3";

export interface AuthorityRule {
  rule_id: string;
  product: string;
  settledness: Settledness;
  instrument_scope: string[];
  regulator_scope?: string | null;
  bears_on_element: string;
  trigger: RuleTrigger;
  effect: RuleEffect;
  reason_sentence: string;
  authority_citation: string;
  sources: { table: string; row_id: string }[];
  retired_at?: string | null;
}

export interface TypedStateBag {
  instrument: string;
  use_case_class: string | null;
  relationship: string | null;
  data_categories: string[];
  flags: string[];
  verdicts: Record<string, string>; // element -> current verdict value
  states: Record<string, string | number | boolean | null>; // typed finding path -> value
}

export interface ElementScale {
  element: string;
  order: string[]; // most favorable first
}

export interface RuleContext {
  scales: ElementScale[];
  adverse_outcomes: string[];
  favorable_outcomes: string[];
}

export interface CurrentDetermination {
  verdicts: Record<string, string>;
  outcome: string;
  conditions: string[];
  risks: Record<string, string[]>;
}

export interface RuleApplication {
  rule_id: string;
  effect: RuleEffect;
  before: unknown;
  after: unknown;
  changed: boolean;
  concurred: boolean; // fired but changed nothing (cap already satisfied)
  suppressed_by?: string; // favorable blocked by this adverse rule_id
  ineligible?: string; // effect not permitted at this settledness — recorded, not applied
  contrary_authority?: boolean; // favorable precedent that conflicted with an adverse precedent on the same element
  reason_sentence: string;
  authority_citation: string;
  sources: { table: string; row_id: string }[];
}

export interface ApplyRulesResult {
  next: CurrentDetermination;
  applications: RuleApplication[];
  invariant_violations: string[];
}

export const ADVERSE_KINDS: ReadonlySet<RuleEffect["kind"]> = new Set([
  "override_outcome",
  "cap_verdict",
  "require_condition",
  "flag_risk",
]);

export const FAVORABLE_KINDS: ReadonlySet<RuleEffect["kind"]> = new Set([
  "recognise_interest",
  "route_to_basis",
  "precedent_verdict",
]);

type AtomKind =
  | "flag"
  | "class"
  | "relationship"
  | "data_category"
  | "instrument"
  | "verdict"
  | "state";

const ATOM_KINDS: readonly AtomKind[] = [
  "flag",
  "class",
  "relationship",
  "data_category",
  "instrument",
  "verdict",
  "state",
];

const KEYED_KINDS: ReadonlySet<AtomKind> = new Set(["verdict", "state"]);

export interface ParsedAtom {
  kind: AtomKind;
  key: string;
  value?: string;
}

/**
 * Parse a `RuleAtom` string per the fixed grammar documented on `RuleAtom`.
 * Throws on an unknown kind or a malformed atom (no `:` separator, a
 * `verdict:`/`state:` atom missing its `=<value>`, or an empty key). Callers
 * evaluating a rule's trigger over data they do not control (rule-interpreter.ts)
 * must catch this and record the rule `ineligible: "invalid_trigger"` rather
 * than let it propagate — this function itself never does that recording.
 */
export function parseAtom(atom: string): ParsedAtom {
  const sep = atom.indexOf(":");
  if (sep < 0) {
    throw new Error(`malformed atom (no ":"): ${JSON.stringify(atom)}`);
  }
  const kindStr = atom.slice(0, sep);
  const rest = atom.slice(sep + 1);
  if (!(ATOM_KINDS as readonly string[]).includes(kindStr)) {
    throw new Error(`unknown atom kind: ${JSON.stringify(kindStr)}`);
  }
  const kind = kindStr as AtomKind;

  if (KEYED_KINDS.has(kind)) {
    const eq = rest.indexOf("=");
    if (eq < 0) {
      throw new Error(`malformed ${kind} atom (no "="): ${JSON.stringify(atom)}`);
    }
    const key = rest.slice(0, eq);
    const value = rest.slice(eq + 1);
    if (!key || !value) {
      throw new Error(`malformed ${kind} atom: ${JSON.stringify(atom)}`);
    }
    return { kind, key, value };
  }

  if (!rest) {
    throw new Error(`malformed ${kind} atom (empty key): ${JSON.stringify(atom)}`);
  }
  return { kind, key: rest };
}

/** Evaluate one atom against a state bag. Throws iff `parseAtom` throws. */
export function evaluateAtom(atom: string, states: TypedStateBag): boolean {
  const parsed = parseAtom(atom);
  switch (parsed.kind) {
    case "flag":
      return states.flags.includes(parsed.key);
    case "class":
      return states.use_case_class === parsed.key;
    case "relationship":
      return states.relationship === parsed.key;
    case "data_category":
      return states.data_categories.includes(parsed.key);
    case "instrument":
      return states.instrument === parsed.key;
    case "verdict":
      return states.verdicts[parsed.key] === parsed.value;
    case "state": {
      const raw = states.states[parsed.key];
      if (raw === undefined) return false; // a missing path never matches
      return String(raw) === parsed.value;
    }
  }
}

/**
 * Law B2 (documented here because it is the one place the grammar's plain
 * reading and its actual semantics diverge): a `state:` atom whose path is
 * absent from `states.states` "never matches" per `evaluateAtom` — but
 * inside a `none_of` clause, a false match would normally be read as the
 * clause's requirement being satisfied (the atom "isn't present, so the
 * negative condition holds"). That would let missing data make a rule
 * MORE likely to fire, which is backwards: the interpreter must never treat
 * "we don't know" as "we know it's absent." So for `none_of` specifically,
 * a `state:` atom over an absent path is treated as BLOCKING (as if it had
 * matched) rather than as vacuously satisfying the clause. Absence never
 * helps a rule fire, in either direction.
 */
function noneOfAtomBlocks(atom: RuleAtom, states: TypedStateBag): boolean {
  const parsed = parseAtom(atom);
  if (parsed.kind === "state" && states.states[parsed.key] === undefined) {
    return true;
  }
  return evaluateAtom(atom, states);
}

/**
 * Evaluate a full trigger: `all_of` = every listed atom matches; `any_of` =
 * at least one matches (vacuously true if the list is absent/empty); `none_of`
 * = none of the listed atoms match (subject to the Law B2 absent-path rule
 * above). An entirely empty trigger (`{}`, or all three clauses empty) never
 * fires — a rule with nothing to check is not "always on."
 */
export function evaluateTrigger(trigger: RuleTrigger, states: TypedStateBag): boolean {
  const allOf = trigger.all_of ?? [];
  const anyOf = trigger.any_of ?? [];
  const noneOf = trigger.none_of ?? [];

  if (allOf.length === 0 && anyOf.length === 0 && noneOf.length === 0) {
    return false;
  }

  const allOk = allOf.every((atom) => evaluateAtom(atom, states));
  const anyOk = anyOf.length === 0 || anyOf.some((atom) => evaluateAtom(atom, states));
  const noneOk = noneOf.every((atom) => !noneOfAtomBlocks(atom, states));

  return allOk && anyOk && noneOk;
}
