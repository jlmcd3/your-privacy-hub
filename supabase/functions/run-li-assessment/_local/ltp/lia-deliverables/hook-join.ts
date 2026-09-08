// DOC 213 TRACK H2 — THE HOOK JOIN. Pure `applyLiaHooks`: nominates a ratified
// hook against a record's `TypedStateBag`, computes fact agreement, resolves
// a direction (`directionFor`, hook-types.ts) and — where the direction is a
// shape — renders one of the ratified sentences (LIA_HOOK_SHAPES), subject
// to the ordering/cap rules and the in-path assertions of §4/§6.
//
// DOC 222 (hooks contract v2) + DOC 224 / 224A (two-leg selection, the ROO):
//   - `unknown` agreement consults a STORED two-leg selection (doc 224 §4.A.1)
//     supplied by the caller; the join never calls a model and never sees
//     one. No selection → flag `selection_pending`; legs disagreed → flag
//     `selection_unsettled` (the caller turns it into the ROO's
//     `information_needed` entry); a selection whose matched atom does not
//     actually hold on the record → drop, flag `selection_atom_not_held`.
//   - `planLiaHookSelection` (below) is the planner: it decides which
//     (field, hook) pairs are worth a call at all — doc 224A §8 D1 (the
//     matrix pre-filter), D2 (canonical text), D4 (no call on an unanswered
//     field) — and returns the batched request the service will make, plus a
//     `considered` list naming every pair and why it was or was not called
//     (D10: the record proves the principle).
//   - S3 / S6 / S6x render ONLY from a distinguishing pair (doc 222 §2.4);
//     `{customer_fact}` is concept-deduped (§2.3); the five render-time
//     assertions of doc 222 §5 are in-path.
//
// NEVER THROWS: every atom this file evaluates comes off a ratified hook,
// not a customer's own input, but a hook can still be malformed (a curation
// mistake, a future schema drift) — an atom that fails to parse marks the
// WHOLE hook ineligible (`invalid_atom`), never propagates. Every other
// failure mode named in §6 (an unresolved sentence slot, an S3 without its
// distinguishing pair actually holding, an adverse shape reached against a
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
  couldPrintEitherWay,
  directionFor,
  isPassingVerdict,
  type AuthorityHook,
  type ConditionalDirectionFacts,
  type FactAgreement,
  type HookApplication,
  type HookDistinguishingPair,
  type HookShape,
  type HookSettledness,
} from "../../../../_shared/corpus/hook-types.ts";
import {
  answerIsUsable,
  canonicalAnswerText,
  type HookSelection,
  type HookSelectionMap,
  type SelectionCandidate,
  type SelectionItem,
} from "../../../../_shared/corpus/hook-selection.ts";
import {
  LIA_ATOM_PHRASES,
  LIA_FACTOR_PHRASES,
  LIA_HOOK_SHAPES,
  LIA_APPEAL_SENTENCE,
  LIA_SETTLEDNESS_LABELS,
  LIA_SOURCE_STATUS_LABELS,
  liaAtomConcept,
} from "../../corpus/maps/lia-hooks.ts";
import { liaV3Answer, liaV3FieldLabel } from "../v3/field-labels.ts";

export interface HookFlag {
  readonly hook_id: string;
  readonly reason: string;
}

/** The omit reasons that mean "drop the persuasive entry entirely" (the
 *  matrix said there is nothing to say, or the lawyer's rule fired, or the
 *  two-leg pass has not settled this pair) — as opposed to every other flag
 *  reason (`invalid_atom`, `s3_missing_distinguishing_atom`,
 *  `adverse_under_pass`, `unresolved_slot`, …), which mean "this hook failed
 *  to apply safely" and fall back to the entry's default rendering rather
 *  than removing it. Exported so the wiring in lia-persuasive-authority.ts
 *  (and this file's own tests) don't have to re-guess the classification.
 *
 *  DOC 224A §3: a pending or unsettled selection keeps the V2 default entry
 *  (the "bears on …" line) — it is NOT in this set. */
export const LIA_HOOK_OMIT_REASONS: ReadonlySet<string> = new Set(["omitted", "rule_missing", "authority_not_dispositive"]);

/** Caps (doc 213 §4): at most this many hook-rendered citations per report. */
export const LIA_HOOKS_REPORT_CAP = 5;
/** Caps (doc 213 §4): at most this many per three-part-test element. */
export const LIA_HOOKS_FACTOR_CAP = 2;

const SETTLEDNESS_RANK: Readonly<Record<HookSettledness, number>> = { R1: 0, R2: 1, R3: 2, R4: 3 };

/** {section} (doc 213 §5): the section number carrying the element. A
 *  `bears_on_element` outside the three known elements resolves to
 *  `undefined`, which fails that hook's render as an unresolved slot rather
 *  than printing a wrong or blank section number. */
const SECTION_FOR_ELEMENT: Readonly<Record<string, string>> = {
  purpose: "II",
  necessity: "III",
  balancing: "IV",
};

/** DOC 224A §3 — the free-text fields the legs read for a hook: the
 *  processing description for every hook, plus the element's own fields
 *  (doc 217 §1's "bears on" column). */
export const LIA_SELECTION_FIELDS_BY_ELEMENT: Readonly<Record<string, readonly string[]>> = {
  purpose: [
    "purpose_details.interest_statement",
    "purpose_details.specific_benefit",
  ],
  necessity: [
    "necessity_details.alternatives_rationale",
    "necessity_details.why_consent_not_used",
    "necessity_details.achievable_without_personal_data_rationale",
    "necessity_details.data_minimised",
    "necessity_details.alternatives",
  ],
  balancing: [
    "balancing_details.reasonable_expectation_detail",
    "balancing_details.collection_context",
    "balancing_details.potential_harms",
    "balancing_details.additional_mitigations",
    "balancing_details.additional_context",
  ],
};
export const LIA_SELECTION_COMMON_FIELD = "processing_description";

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

function evalOneSafe(atom: string, states: TypedStateBag): boolean | null {
  try {
    return evaluateAtom(atom, states);
  } catch {
    return null;
  }
}

/** Phrase-join `atoms`, deduplicated by CONCEPT (doc 222 §2.3) in first-seen
 *  order, joined with "; ". `undefined` iff there are no atoms, or any atom
 *  has no entry in `LIA_ATOM_PHRASES` — either way, an unresolved slot. */
function phrasesFor(atoms: readonly string[]): string | undefined {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const atom of atoms) {
    const phrase = LIA_ATOM_PHRASES[atom];
    if (phrase === undefined) return undefined;
    const concept = liaAtomConcept(atom);
    if (seen.has(concept)) continue;
    seen.add(concept);
    phrases.push(phrase);
  }
  return phrases.length > 0 ? phrases.join("; ") : undefined;
}

function pinpointText(hook: AuthorityHook): string {
  const p = hook.pinpoint;
  if (!p || !p.ref) return "";
  switch (p.kind) {
    case "paragraph":
      return `¶${p.ref}`;
    case "section":
      return `§ ${p.ref}`;
    case "page":
      return `p. ${p.ref}`;
    case "recital":
      return `Recital ${p.ref}`;
    default:
      return `"${p.ref}"`;
  }
}

/** DOC 222 §2.7 — the printed status: the generator's dated label, else the
 *  undated label for the source status, else (a v1 hook) the settledness
 *  label. CEO ruling 2026-09-08: an appeal is never composed into the label
 *  from `appeal_note`; a known appeal appends LIA_APPEAL_SENTENCE after the
 *  hook's sentence (see renderSentence). */
function statusLabel(hook: AuthorityHook): string {
  return hook.status_label ?? (hook.source_status ? LIA_SOURCE_STATUS_LABELS[hook.source_status] : undefined) ??
    LIA_SETTLEDNESS_LABELS[hook.settledness];
}

/** CEO ruling 2026-09-08: where an appeal is known to have been made, the
 *  hook says so in one fixed, ratified sentence. */
function appealSuffix(hook: AuthorityHook): string {
  return hook.source_status === "sa_decision_appeal_pending" ? ` ${LIA_APPEAL_SENTENCE}` : "";
}

function verbFor(hook: AuthorityHook): "found" | "states" | "advised" {
  if (hook.verb) return hook.verb;
  const st = hook.source_status;
  if (!st) return "found";
  if (st.startsWith("sa_decision")) return "found";
  if (st === "wp29_opinion") return "advised";
  return "states";
}

/** DOC 222 §5.3 — `found` only for a decision; guidance never "finds". */
function verbConsistent(hook: AuthorityHook, verb: string): boolean {
  const st = hook.source_status;
  if (!st) return true; // a v1 hook carries no status; nothing to contradict
  const isDecision = st.startsWith("sa_decision");
  return isDecision ? verb === "found" : verb !== "found";
}

/** Render one hook's sentence for `shape`, or `undefined` if any slot the
 *  shape needs cannot be resolved. Never throws: every atom substituted here
 *  was already evaluated without throwing by the caller. */
function renderSentence(
  hook: AuthorityHook,
  shape: HookShape,
  factAtomsHolding: readonly string[],
  pair: HookDistinguishingPair | undefined,
): string | undefined {
  const section = SECTION_FOR_ELEMENT[hook.bears_on_element];
  const verb = verbFor(hook);
  const pin = pinpointText(hook);
  const slots: Record<string, string> = {
    authority: hook.authority_label_short ?? hook.authority_label,
    citation: pin && !hook.authority_label.includes(pin) ? `${hook.authority_label} ${pin}` : hook.authority_label,
    regulator: hook.regulator,
    verb,
    fact_pattern: hook.fact_pattern_paraphrase,
    finding: hook.finding_paraphrase,
    factor: LIA_FACTOR_PHRASES[hook.factor_id] ?? hook.factor_id.toLowerCase(),
    status: statusLabel(hook),
  };
  if (section !== undefined) slots.section = section;

  if (shape === "S1" || shape === "S2" || shape === "S4") {
    const phrase = phrasesFor(factAtomsHolding);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
  }
  if (shape === "S3" || shape === "S6" || shape === "S6x") {
    if (!pair) return undefined;
    const recordFact = LIA_ATOM_PHRASES[pair.record_atom];
    if (recordFact === undefined) return undefined;
    slots.record_fact = recordFact;
    if (shape === "S3") slots.source_fact = pair.source_fact_span;
    if (shape === "S6x") {
      if (!pair.exclusion_paraphrase) return undefined;
      slots.exclusion_paraphrase = pair.exclusion_paraphrase;
    }
  }
  if (shape === "S5a" || shape === "S5b" || shape === "S6" || shape === "S6x") {
    if (!hook.recognised_proposition || !hook.condition_text) return undefined;
    slots.proposition = hook.recognised_proposition;
    slots.condition = hook.condition_text;
  }

  let sentence: string = LIA_HOOK_SHAPES[shape];
  for (const [key, value] of Object.entries(slots)) {
    sentence = sentence.split(`{${key}}`).join(value);
  }
  if (/\{[a-z_]+\}/.test(sentence)) return undefined; // an unresolved slot remains
  return sentence + appealSuffix(hook);
}

interface Candidate {
  readonly hook: AuthorityHook;
  readonly agreement: FactAgreement;
  readonly shape: HookShape;
  readonly sentence: string;
  readonly selection?: HookSelection;
}

export interface ApplyLiaHooksOptions {
  /** DOC 224 — settled two-leg selections by hook_id (the caller resolved
   *  the service's per-field rows with `resolveHookSelections`). */
  readonly selections?: HookSelectionMap;
  /** DOC 224 — hooks whose legs disagreed (the ROO item); by hook_id. */
  readonly unsettled?: ReadonlySet<string>;
  /** DOC 224A §3.4 — hooks disagreed on a prior generation whose answer was
   *  NOT revised: let go — no call, no ask, the default entry stands. */
  readonly lapsed?: ReadonlySet<string>;
}

/** The distinguishing pair whose `record_atom` holds on the record with the
 *  authored polarity — the ONLY thing S3/S6/S6x may render from. */
function holdingPair(hook: AuthorityHook, states: TypedStateBag, preferAtom?: string | null): HookDistinguishingPair | undefined {
  const pairs = hook.distinguishing_pairs ?? [];
  const ordered = preferAtom ? [...pairs.filter((p) => p.record_atom === preferAtom), ...pairs.filter((p) => p.record_atom !== preferAtom)] : pairs;
  for (const p of ordered) {
    const held = evalOneSafe(p.record_atom, states);
    if (held === null) continue;
    if ((p.record_polarity === "absent") ? !held : held) return p;
  }
  return undefined;
}

function conditionalFacts(hook: AuthorityHook, states: TypedStateBag, pair: HookDistinguishingPair | undefined): ConditionalDirectionFacts {
  let conditionAtomsHeld: boolean | null = null;
  const atoms = hook.condition_atoms ?? null;
  if (atoms && atoms.length > 0) {
    const holds = evalAllSafe(atoms, states);
    conditionAtomsHeld = holds === null ? null : holds.every(Boolean);
  }
  return { conditionAtomsHeld, expresslyExcludes: pair?.source_expressly_excludes === true };
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
  opts: ApplyLiaHooksOptions = {},
): { applications: HookApplication[]; flags: HookFlag[] } {
  const flags: HookFlag[] = [];
  const candidates: Candidate[] = [];
  const rankedSet = new Set(rankedSourceIds);

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
    // DOC 222 §2.4 — a distinguishing PAIR whose record atom holds with its
    // authored polarity distinguishes the same way (and is the only thing
    // S3/S6/S6x may render from).
    const anyDistinguishing = distinguishingHolds.some(Boolean) || holdingPair(hook, states) !== undefined;
    const allFacts = hook.fact_atoms.length > 0 && factHolds.every(Boolean);
    let agreement: FactAgreement = anyDistinguishing ? "different" : allFacts ? "same" : "unknown";
    const engineVerdict = verdicts[hook.bears_on_element] ?? null;

    // DOC 224 — `unknown` consults the stored two-leg selection, if any.
    let selection: HookSelection | undefined;
    let preferAtom: string | null = null;
    const factAtomsHolding = hook.fact_atoms.filter((_, i) => factHolds[i]);
    if (agreement === "unknown") {
      if (opts.unsettled?.has(hook.hook_id)) {
        flags.push({ hook_id: hook.hook_id, reason: "selection_unsettled" });
        continue;
      }
      if (opts.lapsed?.has(hook.hook_id)) {
        flags.push({ hook_id: hook.hook_id, reason: "selection_lapsed" });
        continue;
      }
      const sel = opts.selections?.get(hook.hook_id);
      if (sel) {
        const held = evalOneSafe(sel.matched_atom, states);
        const inHookAtoms = hook.fact_atoms.includes(sel.matched_atom) ||
          (hook.distinguishing_pairs ?? []).some((p) => p.record_atom === sel.matched_atom) ||
          hook.distinguishing_atoms.includes(sel.matched_atom);
        if (held === null || !inHookAtoms || (sel.agreement === "same" ? !held : false)) {
          flags.push({ hook_id: hook.hook_id, reason: "selection_atom_not_held" });
          continue;
        }
        agreement = sel.agreement;
        selection = sel;
        preferAtom = sel.matched_atom;
        if (sel.agreement === "same" && !factAtomsHolding.includes(sel.matched_atom)) factAtomsHolding.push(sel.matched_atom);
      } else {
        const eligible = rankedSet.has(hook.source_row_id) &&
          couldPrintEitherWay(hook.posture, engineVerdict, hook.settledness, conditionalFacts(hook, states, undefined));
        flags.push({ hook_id: hook.hook_id, reason: eligible ? "selection_pending" : "omitted" });
        continue;
      }
    }

    const pair = agreement === "different" ? holdingPair(hook, states, preferAtom) : undefined;
    const facts = conditionalFacts(hook, states, pair);
    const direction = directionFor(hook.posture, agreement, engineVerdict, hook.settledness, facts);

    if ("omit" in direction) {
      flags.push({ hook_id: hook.hook_id, reason: direction.reason ?? "omitted" });
      continue;
    }

    const shape = direction.shape;
    const passing = isPassingVerdict(engineVerdict);

    // In-path assertions (doc 213 §6, doc 222 §5) — defence in depth:
    // `directionFor` should already guarantee these, but a hook-join bug
    // must degrade to a dropped, flagged application, never a bad or
    // legally-wrong sentence.
    if ((shape === "S2" || shape === "S6x") && passing) {
      flags.push({ hook_id: hook.hook_id, reason: "adverse_under_pass" });
      continue;
    }
    if (shape === "S5b" && !passing) {
      flags.push({ hook_id: hook.hook_id, reason: "condition_under_fail" });
      continue;
    }
    if ((shape === "S3" || shape === "S6" || shape === "S6x") && !pair) {
      flags.push({ hook_id: hook.hook_id, reason: "s3_missing_distinguishing_atom" });
      continue;
    }
    const verb = verbFor(hook);
    if (!verbConsistent(hook, verb)) {
      flags.push({ hook_id: hook.hook_id, reason: "status_verb_mismatch" });
      continue;
    }
    if (pair) {
      // A concept may not be both a material fact and the distinguishing
      // record fact of one hook (doc 222 §5.2).
      const recordConcept = liaAtomConcept(pair.record_atom);
      const material = (hook.material_facts ?? []).map((m) => liaAtomConcept(m.atom));
      if (material.includes(recordConcept)) {
        flags.push({ hook_id: hook.hook_id, reason: "contradictory_render" });
        continue;
      }
    }

    const sentence = renderSentence(hook, shape, factAtomsHolding, pair);
    if (sentence === undefined) {
      flags.push({ hook_id: hook.hook_id, reason: "unresolved_slot" });
      continue;
    }

    candidates.push({ hook, agreement, shape, sentence, selection });
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
      ...(c.selection ? { selection_field_id: c.selection.field_id } : {}),
    });
  }

  return { applications, flags };
}

// ── DOC 224 / 224A — THE PLANNER (which pairs are worth a call) ───────────

export type SelectionSkipReason =
  | "determinative"
  | "invalid_atom"
  | "not_nominated"
  | "atoms_settled"
  | "store"
  | "unsettled"
  | "lapsed"
  | "cap"
  | "prefilter"
  | "unanswered";

export interface SelectionConsidered {
  readonly hook_id: string;
  readonly status: "called" | "skipped";
  readonly skipped_by?: SelectionSkipReason;
  /** The fields the legs will read for this hook (when `called`). */
  readonly field_ids?: readonly string[];
}

export interface LiaHookSelectionPlan {
  /** One item per free-text field with at least one candidate — the batched
   *  request the service makes, one call per leg for ALL of them. */
  readonly items: readonly SelectionItem[];
  /** Every hook considered, with why it was or was not called (D10). */
  readonly considered: readonly SelectionConsidered[];
}

/**
 * Decide which (field, hook) pairs need the two-leg pass this generation.
 * A hook is a candidate iff: not determinative; nominated; its atom
 * agreement is `unknown`; no stored selection or unsettled row exists for
 * it; its source is in the ranked top list (the caps); the matrix pre-
 * filter says `same` or `different` could print under the current verdict
 * (D1); and at least one of the fields the legs read carries a usable
 * answer (D4). Pure; never throws.
 */
export function planLiaHookSelection(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  record: Record<string, unknown>,
  opts: ApplyLiaHooksOptions = {},
): LiaHookSelectionPlan {
  const considered: SelectionConsidered[] = [];
  const byField = new Map<string, { question_text: string; answer: string; candidates: SelectionCandidate[] }>();
  const rankedSet = new Set(rankedSourceIds);

  for (const hook of hooks) {
    const skip = (skipped_by: SelectionSkipReason) => considered.push({ hook_id: hook.hook_id, status: "skipped", skipped_by });
    if (determinativeSourceIds.has(hook.source_row_id)) { skip("determinative"); continue; }
    const requiredHolds = evalAllSafe(hook.required_atoms, states);
    const factHolds = evalAllSafe(hook.fact_atoms, states);
    const distinguishingHolds = evalAllSafe(hook.distinguishing_atoms, states);
    if (requiredHolds === null || factHolds === null || distinguishingHolds === null) { skip("invalid_atom"); continue; }
    if (!requiredHolds.every(Boolean)) { skip("not_nominated"); continue; }
    const anyDistinguishing = distinguishingHolds.some(Boolean) || holdingPair(hook, states) !== undefined;
    const allFacts = hook.fact_atoms.length > 0 && factHolds.every(Boolean);
    if (anyDistinguishing || allFacts) { skip("atoms_settled"); continue; }
    if (opts.selections?.has(hook.hook_id)) { skip("store"); continue; }
    if (opts.unsettled?.has(hook.hook_id)) { skip("unsettled"); continue; }
    if (opts.lapsed?.has(hook.hook_id)) { skip("lapsed"); continue; }
    if (!rankedSet.has(hook.source_row_id)) { skip("cap"); continue; }
    const engineVerdict = verdicts[hook.bears_on_element] ?? null;
    if (!couldPrintEitherWay(hook.posture, engineVerdict, hook.settledness, conditionalFacts(hook, states, undefined))) { skip("prefilter"); continue; }

    const fieldIds = [LIA_SELECTION_COMMON_FIELD, ...(LIA_SELECTION_FIELDS_BY_ELEMENT[hook.bears_on_element] ?? [])];
    const usable: string[] = [];
    for (const field_id of fieldIds) {
      const raw = liaV3Answer(record, field_id);
      if (!answerIsUsable(raw)) continue;
      usable.push(field_id);
      let item = byField.get(field_id);
      if (!item) {
        item = { question_text: liaV3FieldLabel(field_id), answer: canonicalAnswerText(raw), candidates: [] };
        byField.set(field_id, item);
      }
      item.candidates.push({
        hook_id: hook.hook_id,
        hook_version: hook.hook_version ?? null,
        fact_pattern_paraphrase: hook.fact_pattern_paraphrase,
        fact_atoms: hook.fact_atoms,
        distinguishing_atoms: [
          ...hook.distinguishing_atoms,
          ...(hook.distinguishing_pairs ?? []).map((p) => p.record_atom).filter((a) => !hook.distinguishing_atoms.includes(a)),
        ],
      });
    }
    if (usable.length === 0) { skip("unanswered"); continue; }
    considered.push({ hook_id: hook.hook_id, status: "called", field_ids: usable });
  }

  const items: SelectionItem[] = [...byField.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field_id, v]) => ({ field_id, question_text: v.question_text, answer: v.answer, candidates: v.candidates }));
  return { items, considered };
}

// ── DOC 224 — resolving the service's per-field rows to one selection per hook ──

export interface HookSelectionRow {
  readonly field_id: string;
  readonly hook_id: string;
  readonly agreement: "same" | "different" | "unknown";
  readonly matched_atom: string | null;
  readonly evidence_span: string | null;
  readonly decision_id: string;
  readonly legs_disagreed: boolean;
  readonly source: "store" | "model";
}

export interface ResolvedHookSelections {
  readonly selections: HookSelectionMap;
  readonly unsettled: ReadonlySet<string>;
  /** Hooks whose fields settled on DIFFERENT agreements — treated as
   *  unsettled and named here. */
  readonly conflicts: readonly string[];
}

/** First settled field (in the order the rows arrive — the planner's field
 *  order) wins; a conflict between settled fields, or any field where the
 *  legs disagreed with no settled field, makes the hook unsettled. */
export function resolveHookSelections(rows: readonly HookSelectionRow[]): ResolvedHookSelections {
  const selections = new Map<string, HookSelection>();
  const unsettled = new Set<string>();
  const conflicts: string[] = [];
  const disagreedOnly = new Set<string>();
  for (const r of rows) {
    if (r.agreement !== "unknown" && r.matched_atom && r.evidence_span) {
      const prior = selections.get(r.hook_id);
      if (prior && prior.agreement !== r.agreement) {
        conflicts.push(r.hook_id);
        selections.delete(r.hook_id);
        unsettled.add(r.hook_id);
        continue;
      }
      if (unsettled.has(r.hook_id)) continue;
      if (!prior) {
        selections.set(r.hook_id, {
          hook_id: r.hook_id,
          field_id: r.field_id,
          agreement: r.agreement,
          matched_atom: r.matched_atom,
          evidence_span: r.evidence_span,
          decision_id: r.decision_id,
          source: r.source,
        });
      }
    } else if (r.legs_disagreed) {
      disagreedOnly.add(r.hook_id);
    }
  }
  for (const id of disagreedOnly) if (!selections.has(id)) unsettled.add(id);
  return { selections, unsettled, conflicts };
}
