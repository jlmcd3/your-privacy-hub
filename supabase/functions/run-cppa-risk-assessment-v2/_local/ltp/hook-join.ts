// DOC 213 / DOC 222 / DOC 224 / DOC 224A / DOC 229 / DOC 231 — THE CPPA
// RISK HOOK JOIN. Adapted from
// run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts (read for
// reference; never imported — run-li-assessment/ is off-limits and
// cross-function imports are forbidden regardless).
//
// Pure `applyRiskHooks`: nominates a ratified CPPA Risk hook against a
// record's `TypedStateBag`, computes fact agreement, resolves a direction
// (`directionFor`, hook-types.ts — SHARED, unmodified) and — where the
// direction is a shape — renders one of the ratified CPPA sentence shapes
// (RISK_HOOK_SHAPES), subject to the ordering/cap rules and the in-path
// assertions LIA's join established.
//
// bears_on_element FOR CPPA RISK IS FACTOR-LEVEL (doc 229 §8, ORCHESTRATOR
// DEFAULT #1): `AuthorityHook.bears_on_element` carries the CAM's own
// `factor_id` string (risk-corpus-map.ts) verbatim — there is no
// three-part-test-style element grouping to map onto first. The engine-
// verdict lookup therefore keys `verdicts` by factor_id directly, and the
// `{section}` slot resolves through FACTOR_SECTION below (doc 231 build
// log carries the full map and its provenance/caveats).
//
// THE DOC 223 DEFECT, DESIGNED OUT FROM THE START (doc 231 build brief):
// `applyRiskHooks` refuses to render S3/S6/S6x from a distinguishing pair
// whose `record_polarity === "absent"` — flag `absent_pair_unrenderable`,
// fall back to the default entry — because filling `{record_fact}`
// from that atom's phrase would print a PRESENCE statement ("the company
// has stated that X") for a fact the record does not hold (the atom is
// absent, not present). `holdingPair` still correctly treats an
// absent-polarity pair as HOLDING when the atom is absent on the record
// (agreement computation is unaffected — an absent-polarity pair still
// legitimately distinguishes); only the RENDER of that specific pair is
// refused, and `renderSentence` repeats the check as defence in depth.
// DOC 237 aligned the guard's PLACEMENT to LIA's/DPIA's/ADMT's joins —
// after `directionFor`, on the three rendering shapes — so the matrix's
// own omit outcomes (`authority_not_dispositive` / `rule_missing`) are no
// longer masked for a pair that would never have rendered anyway. Doc 237
// also added a Risk-only `verdict_missing` assertion (this product's
// `verdicts` is `{}` today — doc 231A §5). See doc231-hook-join.test.ts
// for the reproduction the LIA program's doc 223 found (`fddd8eec` printed
// a false S6 sentence unconditionally), the assertion that this join can
// never reproduce it, and doc237-risk-join-review.test.ts for the two
// review fixes.
//
// NEVER THROWS: same discipline as LIA's join (see that file's header for
// the full rationale) — every atom this file evaluates comes off a
// ratified hook, but a hook can still be malformed; a failure degrades to a
// dropped, flagged application, never a bad or legally-wrong sentence.
//
// SINGLE DOOR: this file's basename is exactly `hook-join.ts`, one of the
// path shapes tests/edge/corpus/corpus-relevance-rule-boundary.test.ts's
// `RULE_INTERPRETER_ALLOWED_IMPORTERS` already admits
// (`/(^|\/)hook-join\.ts$/` matches on basename, not directory) — no edit
// to that test file was needed or made. It never imports
// `rule-interpreter.ts`'s executable `applyRules`.

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
  RISK_ATOM_PHRASES,
  RISK_FACTOR_PHRASES,
  RISK_HOOK_SHAPES,
  RISK_APPEAL_SENTENCE,
  RISK_HEDGE_DOMESTIC_FACTS_PROPOSED,
  RISK_HEDGE_FOREIGN_ANALOGY_PROPOSED,
  RISK_SETTLEDNESS_LABELS,
  RISK_SOURCE_STATUS_LABELS,
  riskAtomConcept,
} from "../corpus/maps/risk-hooks.ts";
import { riskV3Answer, riskV3FieldLabel, RISK_SELECTION_COMMON_FIELD, RISK_SELECTION_FIELDS_BY_FACTOR } from "./v3/field-labels.ts";

export interface HookFlag {
  readonly hook_id: string;
  readonly reason: string;
}

/** The omit reasons that mean "drop the persuasive entry entirely" — as
 *  opposed to every other flag reason, which means "this hook failed to
 *  apply safely" and falls back to the V2 default rendering rather than
 *  removing it. Mirrors `LIA_HOOK_OMIT_REASONS`
 *  (lia-deliverables/hook-join.ts) — a pending or unsettled selection keeps
 *  the V2 default entry (it is NOT in this set). */
export const RISK_HOOK_OMIT_REASONS: ReadonlySet<string> = new Set(["omitted", "rule_missing", "authority_not_dispositive"]);

/** Caps (mirrors LIA's LIA_HOOKS_REPORT_CAP / LIA_HOOKS_FACTOR_CAP — doc
 *  213 §4). CPPA Risk has 17 factors rather than LIA's three elements, so
 *  the per-factor cap matters more (a factor-heavy hook batch could
 *  otherwise crowd out every other factor's citation). */
export const RISK_HOOKS_REPORT_CAP = 5;
export const RISK_HOOKS_FACTOR_CAP = 2;

const SETTLEDNESS_RANK: Readonly<Record<HookSettledness, number>> = { R1: 0, R2: 1, R3: 2, R4: 3 };

/** {section} (doc 229 §8 default #1 / doc 231 build log): factor_id ->
 *  the § 7150–7157 pinpoint carrying that factor. A `bears_on_element`
 *  outside this map resolves to `undefined`, which fails that hook's
 *  render as an unresolved slot rather than printing a wrong or blank
 *  section reference — the same fail-closed discipline LIA's
 *  SECTION_FOR_ELEMENT uses.
 *
 *  DOC 231A (2026-09-08) — CLOSES doc 231 build-log NEED #9: every row
 *  below was VERIFIED (or corrected) against the OAL-approved regulation
 *  text this session (`provision_texts` table, keys `cppa-7150`…`cppa-7157`,
 *  project 75bce9a1-c7dc-4628-aea5-12baa2e26bf2, read-only; the full
 *  §7150-§7157 excerpts are reproduced in the doc 231A follow-up log). NINE
 *  of seventeen rows were WRONG in the prior build's best-effort table and
 *  are corrected here; the remaining eight were already right. Per-row
 *  status ("verified" = the prior citation was already correct; "corrected"
 *  = the prior citation named the wrong subsection or section entirely) is
 *  recorded in the follow-up log's table, not repeated per line here.
 *  ORCHESTRATOR DEFAULT — CEO may still override any row. */
export const FACTOR_SECTION: Readonly<Record<string, string>> = {
  "Regulatory trigger and applicability": "§ 7150",
  "Material privacy risks": "§ 7152(a)(5)",
  "Processing purpose specificity": "§ 7152(a)(1)",
  "Safeguards": "§ 7152(a)(6)",
  // CORRECTED — (a)(9), not (a)(8): (a)(9) is "the date the assessment was
  // reviewed and approved, and the names and positions of the individuals
  // who reviewed or approved" it, and requires review/approval by "an
  // individual who has the authority to participate in deciding whether
  // the business will initiate the processing" — exactly this factor.
  // (a)(8) is "the individuals who provided the information for the risk
  // assessment" (a DIFFERENT fact, closer to the next row below).
  "Approval and authority": "§ 7152(a)(9)",
  "Stakeholder involvement and information providers": "§ 7151",
  // CORRECTED (precision) — (a)(3)(A) specifically: "the business's
  // planned method for collecting, using, disclosing, retaining, or
  // otherwise processing personal information, and the sources of the
  // personal information" — the bare "(a)(3)" cited the whole seven-item
  // operational-elements list, of which (A) is this factor's own item.
  "Processing methods and coherence": "§ 7152(a)(3)(A)",
  // CORRECTED — (a)(3)(B) ("how long the business plans to retain each
  // category of personal information... or the criteria... to determine
  // that retention period"), not (a)(2) (categories of PI / data
  // minimisation — a different factor entirely; the prior table's own
  // "weakest guess" flag on the sibling row below was the tell).
  "Retention": "§ 7152(a)(3)(B)",
  // CORRECTED — (a)(3)(C)+(D) ("the business's method of interacting with
  // the consumers... and the purpose of the interaction" + "the
  // approximate number of consumers... the business plans to process"),
  // not (a)(2) (categories of PI). Two subsections cited together because
  // "interaction" and "scale" are each a distinct letter.
  "Consumer interaction and scale": "§ 7152(a)(3)(C), (D)",
  // CORRECTED (precision) — (a)(3)(E) specifically: "what disclosures the
  // business has made or plans to make to the consumer... and how these
  // disclosures were or will be made."
  "Transparency and disclosures": "§ 7152(a)(3)(E)",
  "Consumer benefit": "§ 7152(a)(4)",
  // CORRECTED — § 7153 is titled "Additional Requirements for Businesses
  // that... [make] ADMT available to another business ('recipient-
  // business')" — the factor's own name. § 7152(a)(3)(G) is a DIFFERENT
  // ADMT duty (identifying the ADMT's logic/output for a significant
  // decision the business itself makes), not availability to another
  // business.
  "ADMT made available to another business": "§ 7153",
  "Benefits-risks balancing": "§ 7154",
  // Refined to the timing subsection specifically now that "Assessment
  // retention" (below) carries its own, different subsection of the same
  // section — § 7155(a) is "the following timing requirements," including
  // the 45-day material-change update duty doc 229 already tied here.
  "Assessment timing and material changes": "§ 7155(a)",
  // CORRECTED — § 7155(c): "A business must retain its risk assessments...
  // for as long as the processing continues or for five years after the
  // completion of the risk assessment, whichever is later." § 7156 (the
  // prior citation) is about reusing ONE assessment for a comparable set
  // of processing activities or another law's assessment — a different
  // subject entirely (see the next row).
  "Assessment retention": "§ 7155(c)",
  // CORRECTED — § 7156 is titled "Conducting Risk Assessments for a
  // Comparable Set of Processing Activities or in Compliance with Other
  // Laws or Regulations" — subsection (b) names exactly this factor: "A
  // business may utilize a risk assessment that it has prepared for
  // another purpose to meet the requirements in section 7152." (a)(9) (the
  // prior citation) is Approval and authority (see above) — an unrelated
  // factor this table had mapped TWO DIFFERENT factors onto by mistake.
  "Prior DPIA or other assessment": "§ 7156",
  // CORRECTED — § 7157 is titled "Submission of Risk Assessments to the
  // Agency" and names the certifying individual's "name and business
  // title" and "the date of the certification." § 7153 (the prior
  // citation) is the ADMT-made-available-to-another-business duty, now
  // correctly reassigned above.
  "CPPA submission and certifying executive": "§ 7157",
};

/** DOC 224A §3 — the fields the legs read for a hook bearing on `factorId`:
 *  the common field, plus that factor's own fields (empty when the factor
 *  has no scalar free-text field in this wave — v3/field-labels.ts). */
export const RISK_SELECTION_FIELDS_BY_ELEMENT = RISK_SELECTION_FIELDS_BY_FACTOR;
export const RISK_SELECTION_COMMON_FIELD_EXPORT = RISK_SELECTION_COMMON_FIELD;

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

/** Phrase-join `atoms`, deduplicated by CONCEPT, joined with "; ".
 *  `undefined` iff there are no atoms, or any atom has no entry in
 *  `RISK_ATOM_PHRASES` — either way, an unresolved slot. */
function phrasesFor(atoms: readonly string[]): string | undefined {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const atom of atoms) {
    const phrase = RISK_ATOM_PHRASES[atom];
    if (phrase === undefined) return undefined;
    const concept = riskAtomConcept(atom);
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
  return hook.status_label ?? (hook.source_status ? RISK_SOURCE_STATUS_LABELS[hook.source_status] : undefined) ??
    RISK_SETTLEDNESS_LABELS[hook.settledness];
}

function appealSuffix(hook: AuthorityHook): string {
  return hook.source_status === "sa_decision_appeal_pending" ? ` ${RISK_APPEAL_SENTENCE}` : "";
}

/** DOC 238 §5 item 4 — PROPOSED. Mirrors `appealSuffix` exactly; two
 *  variants (doc 238 §"CPPA Risk"): `domestic_facts` for a CPPA FSOR source
 *  (Risk's own governing regulation), `foreign_analogy` for a GDPR
 *  enforcement source (a different law, cited by analogy only). */
function hedgeSuffix(hook: AuthorityHook): string {
  if (hook.hedge_variant === "domestic_facts") return ` ${RISK_HEDGE_DOMESTIC_FACTS_PROPOSED}`;
  if (hook.hedge_variant === "foreign_analogy") return ` ${RISK_HEDGE_FOREIGN_ANALOGY_PROPOSED}`;
  return "";
}

function verbFor(hook: AuthorityHook): "found" | "states" | "advised" {
  if (hook.verb) return hook.verb;
  const st = hook.source_status;
  if (!st) return "found";
  if (st.startsWith("sa_decision")) return "found";
  if (st === "wp29_opinion") return "advised";
  return "states";
}

/** `found` only for a decision; guidance never "finds" (doc 222 §5.3). */
function verbConsistent(hook: AuthorityHook, verb: string): boolean {
  const st = hook.source_status;
  if (!st) return true;
  const isDecision = st.startsWith("sa_decision");
  return isDecision ? verb === "found" : verb !== "found";
}

/** Render one hook's sentence for `shape`, or `undefined` if any slot the
 *  shape needs cannot be resolved. THE DOC 223 GUARD: `pairRenderable` must
 *  be true for S3/S6/S6x — the caller (applyRiskHooks) computes it from the
 *  pair's `record_polarity` BEFORE calling this function, so a false value
 *  here is a caller bug (defence in depth only; the caller never passes a
 *  non-renderable pair down this path — see the `absent_pair_unrenderable`
 *  check in `applyRiskHooks`). */
export function renderSentence(
  hook: AuthorityHook,
  shape: HookShape,
  factAtomsHolding: readonly string[],
  pair: HookDistinguishingPair | undefined,
): string | undefined {
  const section = FACTOR_SECTION[hook.bears_on_element];
  const verb = verbFor(hook);
  const pin = pinpointText(hook);
  const slots: Record<string, string> = {
    authority: hook.authority_label_short ?? hook.authority_label,
    citation: pin && !hook.authority_label.includes(pin) ? `${hook.authority_label} ${pin}` : hook.authority_label,
    regulator: hook.regulator,
    verb,
    fact_pattern: hook.fact_pattern_paraphrase,
    finding: hook.finding_paraphrase,
    factor: RISK_FACTOR_PHRASES[hook.factor_id] ?? hook.factor_id.toLowerCase(),
    status: statusLabel(hook),
    // DOC 238 §5 item 2 — PROPOSED; no-op unless a shape references {quote}.
    quote: hook.finding_span,
  };
  if (section !== undefined) slots.section = section;
  // DOC 238 §5 item 3 — PROPOSED; only set when curated (fail-closed).
  // Always resolvable (graceful, not fail-closed): a shape that references
  // {governing_provision} simply loses that sentence, cleanly, when the
  // field is absent — every hook shipped today. The trailing space is
  // carried on the VALUE (not the template literal) so the slot works
  // whether it opens the paragraph (S3/S4) or follows a leading sentence
  // (S1/S2).
  slots.governing_provision = hook.governing_provision_sentence ? `${hook.governing_provision_sentence} ` : "";

  if (shape === "S1" || shape === "S2" || shape === "S4") {
    const phrase = phrasesFor(factAtomsHolding);
    if (phrase === undefined) return undefined;
    slots.customer_fact = phrase;
  }
  if (shape === "S3" || shape === "S6" || shape === "S6x") {
    if (!pair) return undefined;
    // DOC 223 GUARD — carried from the start (doc 231 build brief): a pair
    // whose record_atom is ABSENT on the record can only be rendered as an
    // ABSENCE statement, and RISK_ATOM_PHRASES has no such negated phrase
    // for most atoms — rather than guess a negation, S3/S6/S6x never render
    // from an absent-polarity pair at all. The caller has already checked
    // this and would not have reached here with such a pair; this repeats
    // the check in-path so a future caller bug degrades to `undefined`
    // (an unresolved slot, flagged and dropped) rather than a false
    // presence statement.
    if (pair.record_polarity === "absent") return undefined;
    const recordFact = RISK_ATOM_PHRASES[pair.record_atom];
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

  let sentence: string = RISK_HOOK_SHAPES[shape];
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

export interface ApplyRiskHooksOptions {
  readonly selections?: HookSelectionMap;
  readonly unsettled?: ReadonlySet<string>;
  readonly lapsed?: ReadonlySet<string>;
}

/** The distinguishing pair whose `record_atom` holds on the record with the
 *  authored polarity. THIS FUNCTION DECIDES AGREEMENT ONLY — an
 *  absent-polarity pair that holds still correctly signals "different"
 *  (the record's absence of the atom IS what distinguishes it from the
 *  source). Whether the pair may be RENDERED is a separate question,
 *  checked by the caller before S3/S6/S6x render (the doc 223 guard). */
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
 * Join ratified CPPA Risk hooks against a record. Pure; never throws.
 *
 * `verdicts` is keyed by FACTOR_ID (doc 229 §8 default #1), not by a
 * three-part-test element — the caller supplies the deterministic
 * per-factor determination CPPA Risk's own gates/legal-test produce
 * (`[NEEDS]`: doc 231 build log names the exact intended source and what
 * is not yet wired). `rankedSourceIds` is the persuasive section's own
 * relevance ranking; `determinativeSourceIds` are sources already cited by
 * a CAM FC/S0/AP/AOW row for the same factor — suppressed outright, the
 * same-authority-never-twice rule (doc 229 §8 default #2(c)).
 */
export function applyRiskHooks(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  opts: ApplyRiskHooksOptions = {},
): { applications: HookApplication[]; flags: HookFlag[] } {
  const flags: HookFlag[] = [];
  const candidates: Candidate[] = [];
  const rankedSet = new Set(rankedSourceIds);

  for (const hook of hooks) {
    if (determinativeSourceIds.has(hook.source_row_id)) continue;

    const requiredHolds = evalAllSafe(hook.required_atoms, states);
    const factHolds = evalAllSafe(hook.fact_atoms, states);
    const distinguishingHolds = evalAllSafe(hook.distinguishing_atoms, states);
    if (requiredHolds === null || factHolds === null || distinguishingHolds === null) {
      flags.push({ hook_id: hook.hook_id, reason: "invalid_atom" });
      continue;
    }

    if (!requiredHolds.every(Boolean)) continue; // not nominated, silently

    const distinguishingPair = holdingPair(hook, states);
    const anyDistinguishing = distinguishingHolds.some(Boolean) || distinguishingPair !== undefined;
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
    // The doc 223 absent-polarity guard (`absent_pair_unrenderable`) is
    // applied BELOW, after `directionFor`, on the three shapes that render
    // a pair — the placement LIA's reference join, DPIA's and ADMT's all use
    // (doc 237 review). Doc 231 originally applied it here, before the
    // matrix, which masked the matrix's own omit outcomes for a pair that
    // would never have rendered anyway; see the guard's own comment below.
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
    // ── DOC 223 GUARD (doc 231 build brief) — an absent-polarity pair
    // distinguishes because the record LACKS the source's fact, but
    // `{record_fact}` has only the atom's positive phrase, which would print
    // as something the company stated. Until an absent-polarity phrase map
    // is ratified, such a pair never renders; the default entry stands.
    // This is the exact defect doc 223 found in `fddd8eec` — reproduced and
    // asserted-against in doc231-hook-join.test.ts.
    //
    // DOC 237 — PLACEMENT aligned to LIA's reference join (lia-deliverables/
    // hook-join.ts) and DPIA's/ADMT's: the guard sits AFTER `directionFor`,
    // on the three shapes that would actually render the pair. Doc 231 put
    // it BEFORE `directionFor` on `agreement === "different"` alone, which
    // masked the matrix's own OMIT outcomes for an absent-polarity pair —
    // conditional + passing → `authority_not_dispositive` / `rule_missing`
    // (the lawyer's rule signal, which drops the entry) became
    // `absent_pair_unrenderable` (which keeps the V2 default entry). Nothing
    // is rendered on either path; only the flag semantics differed, and
    // the rendering guard below is unchanged in strength.
    if ((shape === "S3" || shape === "S6" || shape === "S6x") && pair && pair.record_polarity === "absent") {
      flags.push({ hook_id: hook.hook_id, reason: "absent_pair_unrenderable" });
      continue;
    }
    // ── DOC 237 — VERDICT-MISSING GUARD (CPPA Risk only). `verdicts` is `{}`
    // in this product's pipeline today (doc 231A §5: no per-factor verdict
    // source exists in the engine — NEED #2, still open), and the shared
    // matrix treats a null verdict as NON-passing. S2 / S6 / S6x each assert
    // that the section's own finding "reflects" or "rests on" something —
    // a statement about an engine finding that does not exist when the
    // verdict is absent. Those three shapes are refused until a verdict is
    // actually wired; S1 / S3 / S4 / S5a make no such assertion and still
    // render (S5b already requires a passing verdict, so it is unreachable
    // here). The planner's pre-filter is unaffected: for every posture at
    // least one of `same`/`different` still prints under a null verdict, so
    // no call is planned that this guard would then waste.
    if (engineVerdict === null && (shape === "S2" || shape === "S6" || shape === "S6x")) {
      flags.push({ hook_id: hook.hook_id, reason: "verdict_missing" });
      continue;
    }
    const verb = verbFor(hook);
    if (!verbConsistent(hook, verb)) {
      flags.push({ hook_id: hook.hook_id, reason: "status_verb_mismatch" });
      continue;
    }
    if (pair) {
      const recordConcept = riskAtomConcept(pair.record_atom);
      const material = (hook.material_facts ?? []).map((m) => riskAtomConcept(m.atom));
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
    if (applications.length >= RISK_HOOKS_REPORT_CAP) break;
    const count = perFactor.get(c.hook.bears_on_element) ?? 0;
    if (count >= RISK_HOOKS_FACTOR_CAP) continue;
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

export interface RiskHookSelectionPlan {
  readonly items: readonly SelectionItem[];
  readonly considered: readonly SelectionConsidered[];
}

/**
 * Decide which (field, hook) pairs need the two-leg pass this generation.
 * Mirrors `planLiaHookSelection` (lia-deliverables/hook-join.ts) exactly,
 * substituting the CPPA Risk field-label module and factor-keyed field map.
 * Pure; never throws.
 */
export function planRiskHookSelection(
  hooks: readonly AuthorityHook[],
  states: TypedStateBag,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  record: Record<string, unknown>,
  opts: ApplyRiskHooksOptions = {},
): RiskHookSelectionPlan {
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

    const fieldIds = [RISK_SELECTION_COMMON_FIELD, ...(RISK_SELECTION_FIELDS_BY_FACTOR[hook.bears_on_element] ?? [])];
    const usable: string[] = [];
    for (const field_id of fieldIds) {
      const raw = riskV3Answer(record, field_id);
      if (!answerIsUsable(raw)) continue;
      usable.push(field_id);
      let item = byField.get(field_id);
      if (!item) {
        item = { question_text: riskV3FieldLabel(field_id), answer: canonicalAnswerText(raw), candidates: [] };
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

/** Identical logic to `resolveHookSelections` (lia-deliverables/hook-join.ts):
 *  first settled field wins; a conflict between settled fields, or any
 *  field where the legs disagreed with no settled field, makes the hook
 *  unsettled. */
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
