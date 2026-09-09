// DOC 235 — THE ADMT HOOK JOIN. Adapted from `run-li-assessment/_local/ltp/
// lia-deliverables/hook-join.ts` (doc 213 Track H2) and its two V3
// successors, DPIA's `dpia-hook-join.ts` (doc 232) and CPPA Risk's
// `hook-join.ts` (doc 231) — never imports any of the three; ADMT is its
// own, self-contained copy, adapted to ADMT's own vocabulary. Pure
// `applyAdmtHooks`: nominates a ratified hook against a record's
// `TypedStateBag`, computes fact agreement, resolves a direction
// (`directionFor`, the SHARED, product-agnostic `_shared/corpus/
// hook-types.ts` — unmodified) and — where the direction is a shape —
// renders one of the ratified sentences (ADMT_HOOK_SHAPES), subject to the
// ordering/cap rules and the same in-path assertions LIA's/DPIA's/Risk's
// joins carry.
//
// FILE NAME LAW (doc 231 §5, verified against the live test this session):
// `tests/edge/corpus/corpus-relevance-rule-boundary.test.ts`'s
// `RULE_INTERPRETER_ALLOWED_IMPORTERS` matches ANY file named exactly
// `hook-join.ts` or `rule-states.ts` by basename, regardless of directory —
// this file is deliberately named `hook-join.ts` (not
// `admt-hook-join.ts`) so it satisfies that boundary with NO test edit,
// mirroring CPPA Risk's own naming choice (doc 231 §5) rather than LIA's
// subdirectory convention (`lia-deliverables/hook-join.ts`) — ADMT's own
// `_local/ltp/` tree is flat (no `admt-deliverables/` subdirectory exists
// today), so this build follows ADMT's own existing directory shape rather
// than forcing LIA's or DPIA's onto it, per the build brief's own
// instruction.
//
// DOC 223 — THE ATOM-OVERLAP / ABSENT-POLARITY DEFECT, DESIGNED OUT FROM
// DAY ONE (the build brief's explicit requirement): a hook whose required
// atom sits in its own plain `distinguishing_atoms` array can never reach
// "same"/"unknown" (a mechanical hazard this join reproduces by
// construction, exactly as LIA's/DPIA's/Risk's own joins do — the actual
// FIX lives at the draft/verify layer, `generate-corpus-hooks/_local/
// verify.ts`, already merged to `main` and outside this build's touch
// list); an absent-polarity distinguishing pair NEVER renders `{record_fact}`
// as a positive-presence statement about a fact the record does not have
// (the `absent_pair_unrenderable` guard below) — both hazards are exercised
// by this file's own test suite (doc235-admt-hook-join.test.ts).
//
// NEVER THROWS: every atom this file evaluates comes off a ratified hook,
// not a customer's own input, but a hook can still be malformed — an atom
// that fails to parse marks the WHOLE hook ineligible (`invalid_atom`),
// never propagates. Every other failure mode drops that one hook's
// application and records a flag — it never prints a malformed or
// legally-wrong sentence.
//
// SINGLE DOOR: `evaluateAtom`/`TypedStateBag` are `rule-types.ts`'s (the
// shared, product-agnostic atom grammar) — this file is a companion door
// onto that module, the same shape as `v3/rule-states.ts` and a product's
// generated `corpus/maps/<product>-rules.ts`. It never imports
// `rule-interpreter.ts`'s executable `applyRules`: a hook only ever READS
// the atom grammar to decide what PROSE to print, never to change a
// determination.

import { evaluateAtom } from "../../../_shared/corpus/rule-types.ts";
import type { TypedStateBag } from "../../../_shared/corpus/rule-types.ts";
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
} from "../../../_shared/corpus/hook-types.ts";
import {
  answerIsUsable,
  canonicalAnswerText,
  type HookSelection,
  type HookSelectionMap,
  type SelectionCandidate,
  type SelectionItem,
} from "../../../_shared/corpus/hook-selection.ts";
import {
  ADMT_ATOM_PHRASES,
  ADMT_FACTOR_PHRASES,
  ADMT_HOOK_SHAPES,
  ADMT_APPEAL_SENTENCE,
  ADMT_SETTLEDNESS_LABELS,
  ADMT_SOURCE_STATUS_LABELS,
  admtAtomConcept,
} from "../corpus/maps/admt-hooks.ts";
import { admtV3Answer, admtV3FieldLabel, ADMT_SELECTION_COMMON_FIELD, ADMT_SELECTION_FIELDS_BY_ELEMENT } from "./v3/field-labels.ts";

export interface HookFlag {
  readonly hook_id: string;
  readonly reason: string;
}

/** The omit reasons that mean "drop the persuasive entry entirely" — as
 *  opposed to every other flag reason, which means "this hook failed to
 *  apply safely." Mirrors LIA_HOOK_OMIT_REASONS/DPIA/Risk's own sets. */
export const ADMT_HOOK_OMIT_REASONS: ReadonlySet<string> = new Set(["omitted", "rule_missing", "authority_not_dispositive"]);

/** Caps: at most this many hook-rendered citations per report, and at most
 *  this many per factor (bears_on_element). Same values LIA/DPIA/Risk use. */
export const ADMT_HOOKS_REPORT_CAP = 5;
export const ADMT_HOOKS_FACTOR_CAP = 2;

const SETTLEDNESS_RANK: Readonly<Record<HookSettledness, number>> = { R1: 0, R2: 1, R3: 2, R4: 3 };

/** {section} — the report section number carrying the factor (doc 235's own
 *  factor→section map, an ORCHESTRATOR DEFAULT verified against the live
 *  section ids in admt-v2-assemble.ts's `push()` calls, not yet CEO-
 *  ratified). A `bears_on_element` outside these eight resolves to
 *  `undefined`, which fails that hook's render as an unresolved slot rather
 *  than printing a wrong or blank section number. */
const SECTION_FOR_ELEMENT: Readonly<Record<string, string>> = {
  "Significant decision": "2",
  "Human involvement": "2",
  "Advertising exclusion": "2",
  "Notice delivery": "3",
  "Notice content": "3",
  "Opt-out pathway": "4",
  "Access process": "5",
  "Vendor dependency": "6",
};

/** Exported so admt-v3-selection.ts can group a resolved application's
 *  sentence into the report section it belongs to WITHOUT hand-duplicating
 *  this map — the render-time splice and this join's own `{section}` slot
 *  read the exact same table, so they can never disagree about which
 *  section a factor's hook lands in. Also the ADMT report `section id` (the
 *  `admt-v2-assemble.ts` `push()` id — "applicability"/"notice"/"optout"/
 *  "access"/"vendor" — not the printed section NUMBER above), since the
 *  splice point addresses sections by id, not number. */
export const ADMT_SECTION_ID_FOR_ELEMENT: Readonly<Record<string, string>> = {
  "Significant decision": "applicability",
  "Human involvement": "applicability",
  "Advertising exclusion": "applicability",
  "Notice delivery": "notice",
  "Notice content": "notice",
  "Opt-out pathway": "optout",
  "Access process": "access",
  "Vendor dependency": "vendor",
};

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

/** Phrase-join `atoms`, deduplicated by CONCEPT in first-seen order, joined
 *  with "; ". `undefined` iff there are no atoms, or any atom has no entry
 *  in `ADMT_ATOM_PHRASES` — either way, an unresolved slot. */
function phrasesFor(atoms: readonly string[]): string | undefined {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const atom of atoms) {
    const phrase = ADMT_ATOM_PHRASES[atom];
    if (phrase === undefined) return undefined;
    const concept = admtAtomConcept(atom);
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
  return hook.status_label ?? (hook.source_status ? ADMT_SOURCE_STATUS_LABELS[hook.source_status] : undefined) ??
    ADMT_SETTLEDNESS_LABELS[hook.settledness];
}

function appealSuffix(hook: AuthorityHook): string {
  return hook.source_status === "sa_decision_appeal_pending" ? ` ${ADMT_APPEAL_SENTENCE}` : "";
}

function verbFor(hook: AuthorityHook): "found" | "states" | "advised" {
  if (hook.verb) return hook.verb;
  const st = hook.source_status;
  if (!st) return "found";
  if (st.startsWith("sa_decision")) return "found";
  if (st === "wp29_opinion") return "advised";
  return "states";
}

/** `found` only for a decision; guidance/commentary never "finds". */
function verbConsistent(hook: AuthorityHook, verb: string): boolean {
  const st = hook.source_status;
  if (!st) return true; // a v1 hook carries no status; nothing to contradict
  const isDecision = st.startsWith("sa_decision");
  return isDecision ? verb === "found" : verb !== "found";
}

/** Render one hook's sentence for `shape`, or `undefined` if any slot the
 *  shape needs cannot be resolved. Never throws. */
export function renderSentence(
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
    factor: ADMT_FACTOR_PHRASES[hook.factor_id] ?? hook.factor_id.toLowerCase(),
    status: statusLabel(hook),
    // DOC 238 §5 item 2 — PROPOSED; no-op unless a shape references {quote}.
    quote: hook.finding_span,
  };
  if (section !== undefined) slots.section = section;
  // DOC 238 §5 item 3 — PROPOSED. Always resolvable (graceful, not
  // fail-closed) — see risk hook-join.ts's
  // own comment for the full rationale.
  slots.governing_provision = hook.governing_provision_sentence ? `${hook.governing_provision_sentence} ` : "";
  // DOC 238 §5 item 4, revised 2026-09-09 (position fix) — the hook's OWN
  // CEO-approved hedge passage (`hedge_sentence`, hook-types.ts), VERBATIM,
  // as an inline slot. See LIA hook-join.ts's own comment for the full
  // rationale: doc 236's approved E1/notice-content hedges each sit directly
  // before the citation, never after; `{hedge}` is wired only into S1/S2,
  // never the distinguishing shapes. Graceful — resolves to "" for every
  // hook shipped today.
  slots.hedge = hook.hedge_sentence ? `${hook.hedge_sentence.trim()} ` : "";

  if (shape === "S1" || shape === "S2" || shape === "S4") {
    const phrase = phrasesFor(factAtomsHolding);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
  }
  if (shape === "S3" || shape === "S6" || shape === "S6x") {
    if (!pair) return undefined;
    const recordFact = ADMT_ATOM_PHRASES[pair.record_atom];
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

  let sentence: string = ADMT_HOOK_SHAPES[shape];
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

export interface ApplyAdmtHooksOptions {
  readonly selections?: HookSelectionMap;
  readonly unsettled?: ReadonlySet<string>;
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
 * Join ratified hooks against a record. Pure; never throws. Mirrors
 * `applyLiaHooks`'s exact contract (doc 213/222/224) — see that file's own
 * doc comment for the parameter semantics; unchanged here.
 */
export function applyAdmtHooks(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  opts: ApplyAdmtHooksOptions = {},
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

    // DOC 223 hazard #1, reproduced by construction (not fixed here — the
    // fix lives at the draft/verify layer): a distinguishing atom takes
    // priority over the fact_atoms match. A required atom duplicated into
    // `distinguishing_atoms` makes this mechanically un-reachable for
    // "same"/"unknown" once nominated — this file's own test suite
    // documents that hazard rather than silently guarding it (mirroring
    // doc 231 §4's own "hazard #1" test), since fixing draft-time data
    // quality is out of this file's scope.
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
    // DOC 223 hazard #2 — the absent-polarity guard. An absent-polarity
    // pair distinguishes because the record LACKS the source's fact, but
    // `{record_fact}` has only the atom's positive phrase, which would
    // print as something the company stated. Until an absent-polarity
    // phrase map is ratified, such a pair never renders; the default
    // entry stands.
    if ((shape === "S3" || shape === "S6" || shape === "S6x") && pair && pair.record_polarity === "absent") {
      flags.push({ hook_id: hook.hook_id, reason: "absent_pair_unrenderable" });
      continue;
    }
    const verb = verbFor(hook);
    if (!verbConsistent(hook, verb)) {
      flags.push({ hook_id: hook.hook_id, reason: "status_verb_mismatch" });
      continue;
    }
    if (pair) {
      const recordConcept = admtAtomConcept(pair.record_atom);
      const material = (hook.material_facts ?? []).map((m) => admtAtomConcept(m.atom));
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
  const perFactor = new Map<string, number>();
  for (const c of ordered) {
    if (applications.length >= ADMT_HOOKS_REPORT_CAP) break;
    const count = perFactor.get(c.hook.bears_on_element) ?? 0;
    if (count >= ADMT_HOOKS_FACTOR_CAP) continue;
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
  readonly field_ids?: readonly string[];
}

export interface AdmtHookSelectionPlan {
  readonly items: readonly SelectionItem[];
  readonly considered: readonly SelectionConsidered[];
}

/**
 * Decide which (field, hook) pairs need the two-leg pass this generation.
 * Mirrors `planLiaHookSelection`'s exact contract. Pure; never throws.
 */
export function planAdmtHookSelection(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  record: Record<string, unknown>,
  opts: ApplyAdmtHooksOptions = {},
): AdmtHookSelectionPlan {
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

    const fieldIds = [ADMT_SELECTION_COMMON_FIELD, ...(ADMT_SELECTION_FIELDS_BY_ELEMENT[hook.bears_on_element] ?? [])];
    const usable: string[] = [];
    for (const field_id of fieldIds) {
      const raw = admtV3Answer(record, field_id);
      if (!answerIsUsable(raw)) continue;
      usable.push(field_id);
      let item = byField.get(field_id);
      if (!item) {
        item = { question_text: admtV3FieldLabel(field_id), answer: canonicalAnswerText(raw), candidates: [] };
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
  readonly conflicts: readonly string[];
}

/** First settled field (in the order the rows arrive) wins; a conflict
 *  between settled fields, or any field where the legs disagreed with no
 *  settled field, makes the hook unsettled. Mirrors `resolveHookSelections`
 *  (lia-deliverables/hook-join.ts) exactly. */
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
