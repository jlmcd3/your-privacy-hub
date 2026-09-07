// DOC 213 TRACK H2 — THE HOOK JOIN. Pure `applyLiaHooks`: nominates a ratified
// hook against a record's `TypedStateBag`, computes fact agreement, resolves
// a direction (`directionFor`, hook-types.ts) and — where the direction is a
// shape — renders one of the four ratified sentences (LIA_HOOK_SHAPES),
// subject to the ordering/cap rules and the in-path assertions of §4/§6.
//
// NEVER THROWS: every atom this file evaluates comes off a ratified hook,
// not a customer's own input, but a hook can still be malformed (a curation
// mistake, a future schema drift) — an atom that fails to parse marks the
// WHOLE hook ineligible (`invalid_atom`), never propagates. Every other
// failure mode named in §6 (an unresolved sentence slot, an S3 without its
// distinguishing atom actually holding, an adverse shape reached against a
// passing verdict) drops that one hook's application and records a flag —
// it never prints a malformed or legally-wrong sentence.
//
// SINGLE DOOR: `evaluateAtom`/`TypedStateBag` are `rule-types.ts`'s (the
// same atom grammar a hook's `fact_atoms`/`distinguishing_atoms`/
// `required_atoms` are drawn from — doc 213 §0). This file is a companion
// door onto that module, the same shape as `rule-states.ts` and a product's
// generated `corpus/maps/<product>-rules.ts`
// (tests/edge/corpus/corpus-relevance-rule-boundary.test.ts's
// `RULE_INTERPRETER_ALLOWED_IMPORTERS`, extended for this file — see that
// test's file header). It never imports `rule-interpreter.ts`'s executable
// `applyRules`: a hook only ever READS the atom grammar to decide what
// PROSE to print, never to change a verdict.

import { evaluateAtom } from "../../../../_shared/corpus/rule-types.ts";
import type { TypedStateBag } from "../../../../_shared/corpus/rule-types.ts";
export type { TypedStateBag };
import {
  directionFor,
  type AuthorityHook,
  type FactAgreement,
  type HookApplication,
  type HookShape,
  type HookSettledness,
} from "../../../../_shared/corpus/hook-types.ts";
import { LIA_ATOM_PHRASES, LIA_HOOK_SHAPES } from "../../corpus/maps/lia-hooks.ts";

export interface HookFlag {
  readonly hook_id: string;
  readonly reason: string;
}

/** The two omit reasons that mean "drop the persuasive entry entirely"
 *  (the matrix said there is nothing to say, or the lawyer's rule fired) —
 *  as opposed to every other flag reason (`invalid_atom`,
 *  `s3_missing_distinguishing_atom`, `adverse_under_pass`, `unresolved_slot`),
 *  which mean "this hook failed to apply safely" and fall back to the
 *  entry's default rendering rather than removing it. Exported so the
 *  wiring in lia-persuasive-authority.ts (and this file's own tests) don't
 *  have to re-guess the classification. */
export const LIA_HOOK_OMIT_REASONS: ReadonlySet<string> = new Set(["omitted", "rule_missing"]);

/** Caps (doc 213 §4): at most this many hook-rendered citations per report. */
export const LIA_HOOKS_REPORT_CAP = 5;
/** Caps (doc 213 §4): at most this many per three-part-test element. */
export const LIA_HOOKS_FACTOR_CAP = 2;

const SETTLEDNESS_RANK: Readonly<Record<HookSettledness, number>> = { R1: 0, R2: 1, R3: 2, R4: 3 };

/** {section} (doc 213 §5): the section number carrying the element. Only S2
 *  uses this slot; a `bears_on_element` outside the three known elements
 *  resolves to `undefined`, which fails that hook's render as an
 *  unresolved slot rather than printing a wrong or blank section number. */
const SECTION_FOR_ELEMENT: Readonly<Record<string, string>> = {
  purpose: "II",
  necessity: "III",
  balancing: "IV",
};

/** Status labels (doc 213 §5). */
const STATUS_LABELS: Readonly<Record<HookSettledness, string>> = {
  R1: "settled law or adopted guidance",
  R2: "a settled line of decisions",
  R3: "a single regulator's decision",
  R4: "under appeal / contested",
};

/** The two verdict values every element scale treats as "passing" — mirrors
 *  hook-types.ts's own private set of the same name (duplicated rather than
 *  exported/imported across the module boundary; both copies are the same
 *  two literals and both are pinned by this file's own tests). */
const PASSING_VERDICTS: ReadonlySet<string> = new Set(["passes", "likely_passes"]);

/** Evaluate every atom in `atoms` against `states`, short-circuiting to
 *  `null` (never throwing) the instant one fails to parse. */
function evalAllSafe(atoms: readonly string[], states: TypedStateBag): boolean[] | null {
  const out: boolean[] = [];
  for (const atom of atoms) {
    try {
      out.push(evaluateAtom(atom, states));
    } catch {
      return null;
    }
  }
  return out;
}

/** Phrase-join the atoms in `atoms` that are true in `holds` (same index),
 *  joined with "; ". `undefined` iff there are no true atoms, or any true
 *  atom has no entry in `LIA_ATOM_PHRASES` — either way, an unresolved slot. */
function phrasesForHolding(atoms: readonly string[], holds: readonly boolean[]): string | undefined {
  const phrases: string[] = [];
  for (let i = 0; i < atoms.length; i++) {
    if (!holds[i]) continue;
    const phrase = LIA_ATOM_PHRASES[atoms[i]];
    if (phrase === undefined) return undefined;
    phrases.push(phrase);
  }
  return phrases.length > 0 ? phrases.join("; ") : undefined;
}

/** Render one hook's sentence for `shape`, or `undefined` if any slot the
 *  shape needs cannot be resolved. Never throws: every atom substituted here
 *  was already evaluated without throwing by the caller. */
function renderSentence(
  hook: AuthorityHook,
  shape: HookShape,
  factAtomHolds: readonly boolean[],
  distinguishingHolds: readonly boolean[],
): string | undefined {
  const section = SECTION_FOR_ELEMENT[hook.bears_on_element];
  const status = STATUS_LABELS[hook.settledness];

  const slots: Record<string, string> = {
    authority: hook.authority_label,
    regulator: hook.regulator,
    fact_pattern: hook.fact_pattern_paraphrase,
    finding: hook.finding_paraphrase,
    factor: hook.factor_id.toLowerCase(),
    status,
  };

  if (shape === "S2") {
    if (section === undefined) return undefined;
    slots.section = section;
  }

  if (shape === "S1" || shape === "S2") {
    const phrase = phrasesForHolding(hook.fact_atoms, factAtomHolds);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
  }

  if (shape === "S3") {
    // The feature the regulator objected to and what the company's own
    // record states are, on this build's reading, the SAME distinguishing
    // atom's phrase (see 213A-TRACK-H2-BUILD-LOG-2026-09-07.md — the spec
    // names {distinguishing_feature} and {customer_fact} as two separate
    // slots but this hook vocabulary has only one phrase per atom, so both
    // slots render the phrase(s) for whichever distinguishing atom(s) hold).
    const phrase = phrasesForHolding(hook.distinguishing_atoms, distinguishingHolds);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
    slots.distinguishing_feature = phrase;
  }

  let sentence = LIA_HOOK_SHAPES[shape];
  for (const [key, value] of Object.entries(slots)) {
    sentence = sentence.split(`{${key}}`).join(value);
  }
  if (/\{[a-z_]+\}/.test(sentence)) return undefined; // an unresolved slot remains
  return sentence;
}

interface Candidate {
  readonly hook: AuthorityHook;
  readonly agreement: FactAgreement;
  readonly shape: HookShape;
  readonly sentence: string;
}

/**
 * Join ratified hooks against a record. Pure; never throws.
 *
 * `states`/`verdicts` describe the record (the same facts
 * `buildLiaRuleStates` would produce, and the current three-part-test
 * verdicts by element — passed separately per doc 213's own signature
 * rather than read off `states.verdicts`, so a caller can supply
 * post-rule-pass verdicts without also having to keep `states.verdicts` in
 * sync). `rankedSourceIds` is the persuasive section's own relevance
 * ranking (`ap.ranked[].source_row_id`, best first) — hooks are ordered by
 * settledness first, then by this ranking, before the caps apply.
 * `determinativeSourceIds` are sources already cited as a fired rule's
 * primary authority — their hooks are suppressed outright (the same
 * authority never appears twice, exactly as it already doesn't for the
 * plain persuasive entries).
 */
export function applyLiaHooks(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
): { applications: HookApplication[]; flags: HookFlag[] } {
  const flags: HookFlag[] = [];
  const candidates: Candidate[] = [];

  for (const hook of hooks) {
    if (determinativeSourceIds.has(hook.source_row_id)) continue; // suppressed, silently

    const requiredHolds = evalAllSafe(hook.required_atoms, states);
    const factHolds = evalAllSafe(hook.fact_atoms, states);
    const distinguishingHolds = evalAllSafe(hook.distinguishing_atoms, states);
    if (requiredHolds === null || factHolds === null || distinguishingHolds === null) {
      flags.push({ hook_id: hook.hook_id, reason: "invalid_atom" });
      continue;
    }

    if (!requiredHolds.every(Boolean)) continue; // not nominated, silently

    // Distinguishing atoms take priority over the fact_atoms match: a
    // distinguishing atom is specifically a fact whose PRESENCE takes the
    // record outside the authority's holding, so it must win even where the
    // hook's plain fact_atoms also happen to all hold (e.g. the record
    // shares the authority's use-case class but also has the very feature
    // — an available opt-out — whose absence was the authority's finding).
    const anyDistinguishing = distinguishingHolds.some(Boolean);
    const allFacts = hook.fact_atoms.length > 0 && factHolds.every(Boolean);
    const agreement: FactAgreement = anyDistinguishing ? "different" : allFacts ? "same" : "unknown";

    const engineVerdict = verdicts[hook.bears_on_element] ?? null;
    const direction = directionFor(hook.posture, agreement, engineVerdict, hook.settledness);

    if ("omit" in direction) {
      flags.push({ hook_id: hook.hook_id, reason: direction.reason ?? "omitted" });
      continue;
    }

    const shape = direction.shape;

    // In-path assertions (doc 213 §6) — defence in depth: `directionFor`
    // should already guarantee these, but a hook-join bug must degrade to a
    // dropped, flagged application, never a bad or legally-wrong sentence.
    if (shape === "S2" && engineVerdict !== null && PASSING_VERDICTS.has(engineVerdict)) {
      flags.push({ hook_id: hook.hook_id, reason: "adverse_under_pass" });
      continue;
    }
    if (shape === "S3" && !distinguishingHolds.some(Boolean)) {
      flags.push({ hook_id: hook.hook_id, reason: "s3_missing_distinguishing_atom" });
      continue;
    }

    const sentence = renderSentence(hook, shape, factHolds, distinguishingHolds);
    if (sentence === undefined) {
      flags.push({ hook_id: hook.hook_id, reason: "unresolved_slot" });
      continue;
    }

    candidates.push({ hook, agreement, shape, sentence });
  }

  // Order: settledness (R1 > R2 > R3 > R4), then the ranked order given.
  const rankIndex = new Map(rankedSourceIds.map((id, i) => [id, i] as const));
  const ordered = [...candidates].sort((a, b) => {
    const bySettledness = SETTLEDNESS_RANK[a.hook.settledness] - SETTLEDNESS_RANK[b.hook.settledness];
    if (bySettledness !== 0) return bySettledness;
    const ra = rankIndex.get(a.hook.source_row_id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rankIndex.get(b.hook.source_row_id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  // Caps: five per report, two per factor (bears_on_element) — a candidate
  // skipped only for exceeding ITS factor's cap stays eligible to make room
  // for a later, lower-priority candidate on a DIFFERENT factor; the report
  // cap ends the pass outright once reached.
  const applications: HookApplication[] = [];
  const perFactor = new Map<string, number>();
  for (const c of ordered) {
    if (applications.length >= LIA_HOOKS_REPORT_CAP) break;
    const count = perFactor.get(c.hook.bears_on_element) ?? 0;
    if (count >= LIA_HOOKS_FACTOR_CAP) continue;
    perFactor.set(c.hook.bears_on_element, count + 1);
    applications.push({
      hook_id: c.hook.hook_id,
      profile_id: c.hook.profile_id,
      source_row_id: c.hook.source_row_id,
      fact_agreement: c.agreement,
      shape: c.shape,
      sentence: c.sentence,
      label: c.hook.authority_label,
    });
  }

  return { applications, flags };
}
