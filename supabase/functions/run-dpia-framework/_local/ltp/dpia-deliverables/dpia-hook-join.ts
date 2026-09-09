// DOC 230 B6 / DOC 232 — THE DPIA HOOK JOIN. Adapted from LIA's
// `applyLiaHooks`/`planLiaHookSelection`
// (run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts, reference
// only — never imported; run-li-assessment/ is off limits). Pure
// `applyDpiaHooks`: nominates a ratified DPIA hook against a record's
// `TypedStateBag`, computes fact agreement, resolves a direction
// (`directionFor`, `_shared/corpus/hook-types.ts` — SHARED, product-agnostic,
// unmodified) and — where the direction is a shape — renders one of the
// ratified DPIA sentences (DPIA_HOOK_SHAPES), subject to the same
// ordering/cap rules and in-path assertions LIA's join carries, PLUS the
// absent-polarity guard below (doc 223 defect, designed out from the start).
//
// DOC 223 DEFECT #2 — THE ABSENT-POLARITY GUARD (`absent_pair_unrenderable`):
// doc 223 found that LIA's `renderSentence` filled `{record_fact}` from
// `LIA_ATOM_PHRASES[pair.record_atom]` REGARDLESS of `pair.record_polarity`
// — an absent-polarity pair (one that DISTINGUISHES because the record's
// atom is FALSE) printed the atom's PRESENCE phrase anyway, stating a false
// fact about the customer's own record ("the company has stated that
// children are among the people affected" for a customer with no children
// flag). This join refuses to render `{record_fact}`/`{source_fact}` from
// ANY pair whose `record_polarity !== "present"` — flag
// `absent_pair_unrenderable`, drop to the default entry — as an IN-PATH
// ASSERTION alongside `s3_missing_distinguishing_atom`, so the check runs
// whether or not a future drafter ever authors an absent-polarity S3/S6/S6x
// pair for DPIA. (`holdingPair` below still correctly evaluates BOTH
// polarities for fact-AGREEMENT purposes — doc 223's finding #1, the
// required-atom-in-distinguishing-atoms hazard, is a JOIN-BEHAVIOUR
// question, not a rendering one; see this file's own test suite for the
// documented, still-correct "different wins" behaviour that hazard produces
// at this layer — the actual fix for #1 is upstream, at the offline
// generator's `verify.ts`, out of scope for this build per the brief.)
//
// DOC 230 decision 5 — SOURCE SUPPRESSION: `determinativeSourceIds` here
// plays the SAME role LIA's does (a source already cited by a fired
// determination is suppressed outright, so one authority never renders
// twice), extended for DPIA to the two WP248 passages the engagement map
// ALREADY covers deterministically (R_WP248_CHILDREN, R_WP248_INNOVATIVE_TECH
// — see `DPIA_ENGAGEMENT_MAP_SUPPRESSED_SOURCE_IDS` below and doc 232's own
// WP248 rule-vs-hook enumeration). Today this set is empty in practice — no
// `authority_hooks` row exists for `product='dpia'` yet (verified read-only,
// 2026-09-08) — so the constant is a placeholder the CEO's curation pass
// populates with real `edpb_guidelines.id` values before the first DPIA hook
// run (doc 232 [NEEDS]).
//
// SINGLE DOOR: `evaluateAtom`/`TypedStateBag` are `rule-types.ts`'s (SHARED,
// product-agnostic, unmodified) — the atom grammar `rule-states.ts` (this
// product's `buildDpiaRuleStates`) produces and this file's hooks are drawn
// from. This file is named `dpia-hook-join.ts` (not `hook-join.ts`) so it is
// listed BY NAME in
// tests/edge/corpus/corpus-relevance-rule-boundary.test.ts's
// `RULE_INTERPRETER_ALLOWED_IMPORTERS` (added additively by this build,
// mirroring the existing generic `hook-join.ts` entry). It never imports
// `rule-interpreter.ts`'s executable `applyRules` — a hook only ever READS
// the atom grammar to decide what PROSE to print, never a determination.
//
// NEVER THROWS: same discipline as LIA's file — an atom that fails to parse
// marks the WHOLE hook ineligible (`invalid_atom`), never propagates.

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
  DPIA_ATOM_PHRASES,
  DPIA_FACTOR_PHRASES,
  DPIA_HOOK_SHAPES,
  DPIA_APPEAL_SENTENCE,
  DPIA_HEDGE_DOMESTIC_FACTS_PROPOSED,
  DPIA_SETTLEDNESS_LABELS,
  DPIA_SOURCE_STATUS_LABELS,
  dpiaAtomConcept,
} from "../../corpus/maps/dpia-hooks.ts";
import { dpiaV3Answer, dpiaV3FieldLabel, DPIA_V3_FIELDS } from "../v3/field-labels.ts";

export interface DpiaHookFlag {
  readonly hook_id: string;
  readonly reason: string;
}

/** DOC 230 decision 5 — WP248 passages ALREADY encoded as engagement-map
 *  rules (R_WP248_CHILDREN, R_WP248_INNOVATIVE_TECH) are SUPPRESSED as hook
 *  sources so the same authority never renders both as a deterministic
 *  engagement-map finding AND a hook citation. Populated with real
 *  `edpb_guidelines.id` values by the CEO's curation pass BEFORE the first
 *  DPIA hook-drafting run (doc 232 build log §"WP248 rule-vs-hook
 *  enumeration"); empty today because no candidate rows are curated yet. */
export const DPIA_ENGAGEMENT_MAP_SUPPRESSED_SOURCE_IDS: ReadonlySet<string> = new Set<string>();

/** The omit reasons that mean "drop the persuasive entry entirely" — as
 *  opposed to every other flag reason, which means "this hook failed to
 *  apply safely" and falls back to the entry's default rendering rather than
 *  removing it. Mirrors LIA_HOOK_OMIT_REASONS exactly. */
export const DPIA_HOOK_OMIT_REASONS: ReadonlySet<string> = new Set(["omitted", "rule_missing", "authority_not_dispositive"]);

/** Caps (doc 213 §4 pattern): at most this many hook-rendered citations per
 *  report, and per DPIA hook element ("obligation" | "adequacy"). */
export const DPIA_HOOKS_REPORT_CAP = 5;
export const DPIA_HOOKS_ELEMENT_CAP = 2;

const SETTLEDNESS_RANK: Readonly<Record<HookSettledness, number>> = { R1: 0, R2: 1, R3: 2, R4: 3 };

/** {section} (doc 213 §5 pattern): which live skeleton section the hook's
 *  determination is documented in (doc 232's factor/determination → section
 *  map). The v4 EDPB-harmonised skeleton
 *  (`_shared/ltp/dpia-skeleton-assemble.ts`) does NOT use doc 230 §4.3's
 *  literal "section_0_overview"/"section_2_analysis" ids for this content —
 *  those ids exist in `dpia.spine.ts` but carry no composed/"generated"
 *  prose block a hook sentence can attach beside. The live composed blocks
 *  are `executive_summary:0` (obligation — the record's own Art. 35(3)
 *  trigger reasons are stated there) and
 *  `section_3_necessity_proportionality:1` (adequacy — literally the
 *  necessity/proportionality analysis). `{section}` therefore names the
 *  section NUMBER the reader should cross-reference for the underlying
 *  documentation, which for "obligation" is Section 1 (Systematic
 *  Description — where the reasons-to-conduct are tabulated) and for
 *  "adequacy" is Section 3 (where the sentence itself renders). */
const SECTION_FOR_ELEMENT: Readonly<Record<string, string>> = {
  obligation: "1",
  adequacy: "3",
};

/** DOC 232 — the DPIA composed block a hook bearing on `element` is
 *  appended beside, in `_shared/ltp/dpia-skeleton-assemble.ts`'s composed-key
 *  vocabulary (`"<section_id>:<block_index>"`). Exported so the assembler and
 *  this file's tests read the SAME mapping rather than a second, possibly
 *  drifting copy. */
export const DPIA_HOOK_COMPOSED_KEY_FOR_ELEMENT: Readonly<Record<string, string>> = {
  obligation: "executive_summary:0",
  adequacy: "section_3_necessity_proportionality:1",
};

/** DOC 230 §2 / doc 232 — the free-text fields the legs read for a hook: the
 *  processing description for every hook, plus the element's own fields
 *  (v3/field-labels.ts `bears_on` column — this constant is DERIVED from
 *  that column so the two can never drift). */
export const DPIA_SELECTION_COMMON_FIELD = "description";

/** DERIVED from v3/field-labels.ts's `bears_on` column so the two files can
 *  never drift (doc 232). */
export const DPIA_SELECTION_FIELDS_BY_ELEMENT: Readonly<Record<"obligation" | "adequacy", readonly string[]>> = {
  obligation: DPIA_V3_FIELDS.filter((f) => f.bears_on === "obligation" && f.field_id !== DPIA_SELECTION_COMMON_FIELD)
    .map((f) => f.field_id),
  adequacy: DPIA_V3_FIELDS.filter((f) => f.bears_on === "adequacy").map((f) => f.field_id),
};

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

function phrasesFor(atoms: readonly string[]): string | undefined {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const atom of atoms) {
    const phrase = DPIA_ATOM_PHRASES[atom];
    if (phrase === undefined) return undefined;
    const concept = dpiaAtomConcept(atom);
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

function statusLabel(hook: AuthorityHook): string {
  return hook.status_label ?? (hook.source_status ? DPIA_SOURCE_STATUS_LABELS[hook.source_status] : undefined) ??
    DPIA_SETTLEDNESS_LABELS[hook.settledness];
}

function appealSuffix(hook: AuthorityHook): string {
  return hook.source_status === "sa_decision_appeal_pending" ? ` ${DPIA_APPEAL_SENTENCE}` : "";
}

/** DOC 238 §5 item 4 — PROPOSED. Mirrors `appealSuffix` exactly. DPIA uses
 *  only the domestic-facts hedge (doc 238 §"DPIA"); a hook marked
 *  `foreign_analogy` is a data error for this product and renders no hedge. */
function hedgeSuffix(hook: AuthorityHook): string {
  return hook.hedge_variant === "domestic_facts" ? ` ${DPIA_HEDGE_DOMESTIC_FACTS_PROPOSED}` : "";
}

function verbFor(hook: AuthorityHook): "found" | "states" | "advised" {
  if (hook.verb) return hook.verb;
  const st = hook.source_status;
  if (!st) return "found";
  if (st.startsWith("sa_decision")) return "found";
  if (st === "wp29_opinion") return "advised";
  return "states";
}

function verbConsistent(hook: AuthorityHook, verb: string): boolean {
  const st = hook.source_status;
  if (!st) return true;
  const isDecision = st.startsWith("sa_decision");
  return isDecision ? verb === "found" : verb !== "found";
}

/**
 * Render one hook's sentence for `shape`, or `undefined` if any slot the
 * shape needs cannot be resolved. DOC 223 DEFECT #2 GUARD lives in
 * `applyDpiaHooks` (below, as an in-path assertion beside
 * `s3_missing_distinguishing_atom`), not here — this function is never
 * called with an absent-polarity pair for S3/S6/S6x once that guard is in
 * place; it is written defensively anyway (never trusts a caller) by simply
 * never being reachable with such a pair.
 */
export function renderSentence(
  hook: AuthorityHook,
  shape: HookShape,
  factAtomsHolding: readonly string[],
  pair: HookDistinguishingPair | undefined,
): string | undefined {
  const element = hook.bears_on_element;
  const section = SECTION_FOR_ELEMENT[element];
  const verb = verbFor(hook);
  const pin = pinpointText(hook);
  const slots: Record<string, string> = {
    authority: hook.authority_label_short ?? hook.authority_label,
    citation: pin && !hook.authority_label.includes(pin) ? `${hook.authority_label} ${pin}` : hook.authority_label,
    regulator: hook.regulator,
    verb,
    fact_pattern: hook.fact_pattern_paraphrase,
    finding: hook.finding_paraphrase,
    factor: DPIA_FACTOR_PHRASES[hook.factor_id] ?? hook.factor_id.toLowerCase(),
    status: statusLabel(hook),
    // DOC 238 §5 item 2 — PROPOSED; no-op unless a shape references {quote}.
    quote: hook.finding_span,
  };
  if (section !== undefined) slots.section = section;
  // DOC 238 §5 item 3 — PROPOSED. Always resolvable (graceful, not
  // fail-closed) — no DPIA shape
  // references {governing_provision} today, so this is a no-op either way;
  // kept consistent with Risk/ADMT's own mechanism (risk hook-join.ts's
  // comment has the full rationale).
  slots.governing_provision = hook.governing_provision_sentence ? `${hook.governing_provision_sentence} ` : "";

  if (shape === "S1" || shape === "S2" || shape === "S4") {
    const phrase = phrasesFor(factAtomsHolding);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
  }
  if (shape === "S3" || shape === "S6" || shape === "S6x") {
    if (!pair) return undefined;
    const recordFact = DPIA_ATOM_PHRASES[pair.record_atom];
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

  let sentence: string = DPIA_HOOK_SHAPES[shape];
  for (const [key, value] of Object.entries(slots)) {
    sentence = sentence.split(`{${key}}`).join(value);
  }
  if (/\{[a-z_]+\}/.test(sentence)) return undefined;
  return sentence + appealSuffix(hook) + hedgeSuffix(hook);
}

interface Candidate {
  readonly hook: AuthorityHook;
  readonly agreement: FactAgreement;
  readonly shape: HookShape;
  readonly sentence: string;
  readonly selection?: HookSelection;
}

export interface ApplyDpiaHooksOptions {
  readonly selections?: HookSelectionMap;
  readonly unsettled?: ReadonlySet<string>;
  readonly lapsed?: ReadonlySet<string>;
}

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
 * Join ratified DPIA hooks against a record. Pure; never throws. Mirrors
 * `applyLiaHooks`'s contract exactly (see hook-join.ts for the full
 * doc-comment on `states`/`verdicts`/`rankedSourceIds`/
 * `determinativeSourceIds`), PLUS the doc 223 defect #2 in-path guard below.
 */
export function applyDpiaHooks(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  opts: ApplyDpiaHooksOptions = {},
): { applications: HookApplication[]; flags: DpiaHookFlag[] } {
  const flags: DpiaHookFlag[] = [];
  const candidates: Candidate[] = [];
  const rankedSet = new Set(rankedSourceIds);

  for (const hook of hooks) {
    if (determinativeSourceIds.has(hook.source_row_id)) continue; // suppressed, silently
    if (DPIA_ENGAGEMENT_MAP_SUPPRESSED_SOURCE_IDS.has(hook.source_row_id)) continue; // doc 230 decision 5

    const requiredHolds = evalAllSafe(hook.required_atoms, states);
    const factHolds = evalAllSafe(hook.fact_atoms, states);
    const distinguishingHolds = evalAllSafe(hook.distinguishing_atoms, states);
    if (requiredHolds === null || factHolds === null || distinguishingHolds === null) {
      flags.push({ hook_id: hook.hook_id, reason: "invalid_atom" });
      continue;
    }

    if (!requiredHolds.every(Boolean)) continue; // not nominated, silently

    // Same priority rule as LIA's join: a distinguishing atom or PAIR whose
    // record atom holds with its authored polarity takes priority over the
    // plain fact_atoms match (doc 222 §2.4).
    const anyDistinguishing = distinguishingHolds.some(Boolean) || holdingPair(hook, states) !== undefined;
    const allFacts = hook.fact_atoms.length > 0 && factHolds.every(Boolean);
    let agreement: FactAgreement = anyDistinguishing ? "different" : allFacts ? "same" : "unknown";
    const engineVerdict = verdicts[hook.bears_on_element] ?? null;

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
    // ── DOC 223 DEFECT #2 — THE ABSENT-POLARITY GUARD, designed out from
    // the start (doc 232 build brief). S3/S6/S6x render `{record_fact}` /
    // `{source_fact}` from a pair's PRESENCE reading only — an
    // absent-polarity pair (the one that distinguishes because the record's
    // atom is FALSE) is refused here, before renderSentence ever runs, so a
    // false "the record identifies X" can never print for a customer whose
    // record does NOT hold X. `holdingPair` above still correctly used the
    // pair's polarity to decide fact AGREEMENT (doc 222 §2.4's own design);
    // this guard only blocks the PROSE.
    if ((shape === "S3" || shape === "S6" || shape === "S6x") && pair && pair.record_polarity !== "present") {
      flags.push({ hook_id: hook.hook_id, reason: "absent_pair_unrenderable" });
      continue;
    }
    const verb = verbFor(hook);
    if (!verbConsistent(hook, verb)) {
      flags.push({ hook_id: hook.hook_id, reason: "status_verb_mismatch" });
      continue;
    }
    if (pair) {
      const recordConcept = dpiaAtomConcept(pair.record_atom);
      const material = (hook.material_facts ?? []).map((m) => dpiaAtomConcept(m.atom));
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

  const rankIndex = new Map(rankedSourceIds.map((id, i) => [id, i] as const));
  const ordered = [...candidates].sort((a, b) => {
    const bySettledness = SETTLEDNESS_RANK[a.hook.settledness] - SETTLEDNESS_RANK[b.hook.settledness];
    if (bySettledness !== 0) return bySettledness;
    const ra = rankIndex.get(a.hook.source_row_id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rankIndex.get(b.hook.source_row_id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  const applications: HookApplication[] = [];
  const perElement = new Map<string, number>();
  for (const c of ordered) {
    if (applications.length >= DPIA_HOOKS_REPORT_CAP) break;
    const count = perElement.get(c.hook.bears_on_element) ?? 0;
    if (count >= DPIA_HOOKS_ELEMENT_CAP) continue;
    perElement.set(c.hook.bears_on_element, count + 1);
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

// ── DOC 224 / 224A pattern — THE PLANNER (which pairs are worth a call) ────

export type DpiaSelectionSkipReason =
  | "determinative"
  | "engagement_map_suppressed"
  | "invalid_atom"
  | "not_nominated"
  | "atoms_settled"
  | "store"
  | "unsettled"
  | "lapsed"
  | "cap"
  | "prefilter"
  | "unanswered";

export interface DpiaSelectionConsidered {
  readonly hook_id: string;
  readonly status: "called" | "skipped";
  readonly skipped_by?: DpiaSelectionSkipReason;
  readonly field_ids?: readonly string[];
}

export interface DpiaHookSelectionPlan {
  readonly items: readonly SelectionItem[];
  readonly considered: readonly DpiaSelectionConsidered[];
}

/**
 * Decide which (field, hook) pairs need the two-leg pass this generation.
 * Mirrors `planLiaHookSelection` exactly (D1 matrix pre-filter, D2 canonical
 * text via `canonicalAnswerText`, D4 no call on an unanswered field). Pure;
 * never throws.
 */
export function planDpiaHookSelection(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  record: Record<string, unknown>,
  opts: ApplyDpiaHooksOptions = {},
): DpiaHookSelectionPlan {
  const considered: DpiaSelectionConsidered[] = [];
  const byField = new Map<string, { question_text: string; answer: string; candidates: SelectionCandidate[] }>();
  const rankedSet = new Set(rankedSourceIds);

  for (const hook of hooks) {
    const skip = (skipped_by: DpiaSelectionSkipReason) => considered.push({ hook_id: hook.hook_id, status: "skipped", skipped_by });
    if (determinativeSourceIds.has(hook.source_row_id)) { skip("determinative"); continue; }
    if (DPIA_ENGAGEMENT_MAP_SUPPRESSED_SOURCE_IDS.has(hook.source_row_id)) { skip("engagement_map_suppressed"); continue; }
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

    const element = hook.bears_on_element as "obligation" | "adequacy";
    const fieldIds = [DPIA_SELECTION_COMMON_FIELD, ...(DPIA_SELECTION_FIELDS_BY_ELEMENT[element] ?? [])];
    const usable: string[] = [];
    for (const field_id of fieldIds) {
      const raw = dpiaV3Answer(record, field_id);
      if (!answerIsUsable(raw)) continue;
      usable.push(field_id);
      let item = byField.get(field_id);
      if (!item) {
        item = { question_text: dpiaV3FieldLabel(field_id), answer: canonicalAnswerText(raw), candidates: [] };
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

// ── DOC 224 pattern — resolving the service's per-field rows to one
// selection per hook. Duplicated (not imported) from hook-join.ts — the
// logic is product-agnostic but run-li-assessment/ is off limits. ─────────

export interface DpiaHookSelectionRow {
  readonly field_id: string;
  readonly hook_id: string;
  readonly agreement: "same" | "different" | "unknown";
  readonly matched_atom: string | null;
  readonly evidence_span: string | null;
  readonly decision_id: string;
  readonly legs_disagreed: boolean;
  readonly source: "store" | "model";
}

export interface DpiaResolvedHookSelections {
  readonly selections: HookSelectionMap;
  readonly unsettled: ReadonlySet<string>;
  readonly conflicts: readonly string[];
}

export function resolveDpiaHookSelections(rows: readonly DpiaHookSelectionRow[]): DpiaResolvedHookSelections {
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
