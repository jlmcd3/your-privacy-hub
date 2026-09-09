// DOC 222 / 224 / 224A — HOOKS CONTRACT v2 AT RENDER + THE TWO-LEG SELECTION
// (engine half). Pins: the conditional rows and the R4 narrowing of the
// direction matrix (222 §3); the matrix pre-filter (224A §8 D1); the planner
// (which pairs are worth a call: D1 / D2 / D4, store / lapsed / cap); the
// join consuming a stored selection (224 §4.A.1) and its new flags; S3/S6/
// S6x from a distinguishing pair only (222 §2.4); the concept dedupe (222
// §2.3); the derived status / verb (222 §2.7); the pure leg verification and
// merge (212G §3); `resolveHookSelections`; the canonical text (D2).
//
// LIA_HOOKS ships [] — every fixture hook is injected directly.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  couldPrintEitherWay,
  directionFor,
  type AuthorityHook,
} from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import {
  answerIsUsable,
  canonicalAnswerHash,
  canonicalAnswerText,
  mergeSelectionLegs,
  selectionCandidateKey,
  verifySelectionLeg,
  type SelectionItem,
} from "../../../supabase/functions/_shared/corpus/hook-selection.ts";
import {
  applyLiaHooks,
  LIA_SELECTION_COMMON_FIELD,
  planLiaHookSelection,
  resolveHookSelections,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts";
import { LIA_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts";
import { LIA_APPEAL_SENTENCE } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

const OPT_OUT = "state:intake.balancing_details.opt_out_available=Yes — unconditional, on request, with no consequence";

function baseStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "EU GDPR",
    use_case_class: "fraud_prevention",
    relationship: "customer",
    data_categories: ["Contact data"],
    flags: [],
    verdicts: { purpose: "passes", necessity: "uncertain", balancing: "likely_passes" },
    states: {},
    ...overrides,
  };
}

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: ["class:fraud_prevention"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "fraud prevention can be a legitimate interest",
    fact_pattern_paraphrase: "a payment service provider processes customer payment data to prevent fraud",
    finding_paraphrase: "fraud prevention can be a legitimate interest only where the processing is strictly necessary",
    settledness: "R1",
    posture: "conditional",
    factor_id: "Necessity and less-intrusive means",
    bears_on_element: "necessity",
    authority_label: "EDPB Guidelines 06/2020 on the interplay of PSD2 and the GDPR",
    authority_label_short: "EDPB Guidelines 06/2020",
    regulator: "the EDPB",
    source_status: "edpb_guidelines_final",
    pinpoint: { kind: "paragraph", ref: "20", anchor_span: "strictly necessary" },
    recognised_proposition: "processing strictly necessary for fraud prevention may rest on Article 6(1)(f)",
    condition_text: "the processing is strictly necessary and the balancing condition is met case by case",
    condition_atoms: null,
    material_facts: [{ atom: "class:fraud_prevention", materiality_reason: "the interest the guidance recognises", source_span: "fraud" }],
    distinguishing_pairs: [{
      source_fact_span: "no children were among the data subjects",
      source_polarity: "absent",
      record_atom: "flag:children",
      record_polarity: "present",
      why_material: "the guidance does not address children",
      source_expressly_excludes: false,
    }],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "conditional",
    },
    ...overrides,
  };
}

// ── §3 — the matrix v2 ─────────────────────────────────────────────────────

Deno.test("doc222 §3 — conditional rows: S5a by default, S5b only when the condition atoms hold AND the element passes", () => {
  assertEquals(directionFor("conditional", "same", "uncertain", "R1"), { shape: "S5a" });
  assertEquals(directionFor("conditional", "same", "passes", "R1"), { shape: "S5a" });
  assertEquals(directionFor("conditional", "same", "passes", "R1", { conditionAtomsHeld: true }), { shape: "S5b" });
  assertEquals(directionFor("conditional", "same", "fails", "R1", { conditionAtomsHeld: true }), { shape: "S5a" });
  assertEquals(directionFor("conditional", "same", "passes", "R1", { conditionAtomsHeld: null }), { shape: "S5a" });
});

Deno.test("doc222 §3 — conditional + different: S6 (silent) / S6x (express exclusion) when not passing; under a pass, authority_not_dispositive or rule_missing", () => {
  assertEquals(directionFor("conditional", "different", "uncertain", "R1"), { shape: "S6" });
  assertEquals(directionFor("conditional", "different", "fails", "R1", { expresslyExcludes: true }), { shape: "S6x" });
  assertEquals(directionFor("conditional", "different", "passes", "R1"), { omit: true, reason: "authority_not_dispositive" });
  assertEquals(directionFor("conditional", "different", "likely_passes", "R1", { expresslyExcludes: true }), { omit: true, reason: "rule_missing" });
  assertEquals(directionFor("conditional", "unknown", "fails", "R1"), { omit: true });
});

Deno.test("doc222 §3 — rejected rows unchanged; R4 renders S4 on SAME facts only", () => {
  assertEquals(directionFor("rejected", "same", "fails", "R1"), { shape: "S2" });
  assertEquals(directionFor("rejected", "same", "passes", "R1"), { omit: true, reason: "rule_missing" });
  assertEquals(directionFor("rejected", "different", "passes", "R1"), { shape: "S3" });
  assertEquals(directionFor("rejected", "same", "passes", "R4"), { shape: "S4" });
  assertEquals(directionFor("conditional", "different", "fails", "R4"), { omit: true });
  assertEquals(directionFor("accepted", "unknown", "fails", "R4"), { omit: true });
});

Deno.test("doc224A D1 — couldPrintEitherWay: true whenever one of the two answers would print; false only for a contested non-R4 posture", () => {
  assert(couldPrintEitherWay("rejected", "passes", "R1")); // different -> S3
  assert(couldPrintEitherWay("accepted", "fails", "R2")); // same -> S1
  assert(couldPrintEitherWay("conditional", "passes", "R1")); // same -> S5a
  assert(couldPrintEitherWay("rejected", "passes", "R4")); // same -> S4
  assert(!couldPrintEitherWay("contested", "passes", "R1"));
});

// ── the pure half: canonical text, usable answers, leg verification ───────

Deno.test("doc224A D2 — canonical text collapses whitespace and NFC-normalises; hashes agree across cosmetic edits", async () => {
  assertEquals(canonicalAnswerText("  We   process\n\npayment data. "), "We process payment data.");
  assertEquals(canonicalAnswerText("café"), "café");
  assertEquals(await canonicalAnswerHash("We process payment data."), await canonicalAnswerHash("We  process\tpayment data. "));
  assert((await canonicalAnswerHash("a")) !== (await canonicalAnswerHash("b")));
});

Deno.test("doc224A D4 — answerIsUsable: placeholders, punctuation and under-12-char answers are never read", () => {
  assert(!answerIsUsable(""));
  assert(!answerIsUsable("n/a"));
  assert(!answerIsUsable("See above."));
  assert(!answerIsUsable("..."));
  assert(!answerIsUsable("too short"));
  assert(answerIsUsable("We screen every checkout for fraud using device signals."));
});

const ITEM: SelectionItem = {
  field_id: "processing_description",
  question_text: "What processing are you considering?",
  answer: "We screen every checkout for fraud using device signals and transaction history; no children use the service.",
  candidates: [{
    hook_id: "h/psd2",
    hook_version: 2,
    fact_pattern_paraphrase: "a payment service provider processes customer payment data to prevent fraud",
    fact_atoms: ["class:fraud_prevention", "data_category:Purchase/transaction history"],
    distinguishing_atoms: ["flag:children"],
  }],
};

Deno.test("212G §3 — verifySelectionLeg: a same/different needs a verbatim span AND an atom from that hook; otherwise unknown; every candidate gets a reading", () => {
  const ok = verifySelectionLeg({ readings: [{ hook_id: "h/psd2", fact_agreement: "same", matched_atom: "class:fraud_prevention", evidence_span: "screen every checkout for fraud", confidence: 0.9 }] }, ITEM);
  assertEquals(ok.get("h/psd2")!.fact_agreement, "same");
  const badSpan = verifySelectionLeg({ readings: [{ hook_id: "h/psd2", fact_agreement: "same", matched_atom: "class:fraud_prevention", evidence_span: "NOT IN THE ANSWER", confidence: 0.9 }] }, ITEM);
  assertEquals(badSpan.get("h/psd2")!.fact_agreement, "unknown");
  const badAtom = verifySelectionLeg({ readings: [{ hook_id: "h/psd2", fact_agreement: "different", matched_atom: "flag:special_category", evidence_span: "no children", confidence: 0.9 }] }, ITEM);
  assertEquals(badAtom.get("h/psd2")!.fact_agreement, "unknown");
  const unknownHook = verifySelectionLeg({ readings: [{ hook_id: "h/other", fact_agreement: "same", matched_atom: "x", evidence_span: "fraud", confidence: 1 }] }, ITEM);
  assertEquals(unknownHook.size, 1);
  assertEquals(unknownHook.get("h/psd2")!.fact_agreement, "unknown");
});

Deno.test("212G §3 — mergeSelectionLegs: settled only when both legs agree on same/different; a split is legs_disagreed; unknown+unknown is neither", () => {
  const same = verifySelectionLeg({ readings: [{ hook_id: "h/psd2", fact_agreement: "same", matched_atom: "class:fraud_prevention", evidence_span: "checkout for fraud", confidence: 0.8 }] }, ITEM);
  const diff = verifySelectionLeg({ readings: [{ hook_id: "h/psd2", fact_agreement: "different", matched_atom: "flag:children", evidence_span: "no children use the service", confidence: 0.7 }] }, ITEM);
  const none = verifySelectionLeg({}, ITEM);
  assertEquals(mergeSelectionLegs(same, same, ITEM)[0].fact_agreement, "same");
  assertEquals(mergeSelectionLegs(same, same, ITEM)[0].confidence, 0.8);
  const split = mergeSelectionLegs(same, diff, ITEM)[0];
  assertEquals(split.fact_agreement, "unknown");
  assertEquals(split.legs_disagreed, true);
  const oneSided = mergeSelectionLegs(same, none, ITEM)[0];
  assertEquals(oneSided.fact_agreement, "unknown");
  assertEquals(oneSided.legs_disagreed, true);
  const nothing = mergeSelectionLegs(none, none, ITEM)[0];
  assertEquals(nothing.legs_agree, true);
  assertEquals(nothing.legs_disagreed, false);
  assertEquals(selectionCandidateKey(ITEM.candidates), "h/psd2@2");
});

// ── the planner ────────────────────────────────────────────────────────────

const RECORD = {
  processing_description: "We screen every checkout for fraud using device signals and transaction history.",
  necessity_details: {
    why_consent_not_used: "Consent would let fraudsters opt out of the screening, defeating the purpose entirely.",
    alternatives_rationale: "n/a",
  },
  balancing_details: {},
};

Deno.test("doc224 planner — a nominated hook with unknown agreement, no store row, in the ranked list, that could print, on answered fields → called; every skip reason is named", () => {
  const hook = makeHook({ hook_id: "h/psd2", fact_atoms: ["class:fraud_prevention", "data_category:Purchase/transaction history"] });
  const states = baseStates({ data_categories: ["Contact data"] }); // one fact atom missing -> unknown
  const plan = planLiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), RECORD);
  assertEquals(plan.considered, [{ hook_id: "h/psd2", status: "called", field_ids: [LIA_SELECTION_COMMON_FIELD, "necessity_details.why_consent_not_used"] }]);
  assertEquals(plan.items.map((i) => i.field_id), ["necessity_details.why_consent_not_used", "processing_description"]);
  assertEquals(plan.items[1].answer, canonicalAnswerText(RECORD.processing_description));
  assertEquals(plan.items[1].candidates[0].hook_id, "h/psd2");
  assertEquals(plan.items[1].candidates[0].distinguishing_atoms, ["flag:children"]);

  const settled = planLiaHookSelection([hook], baseStates({ data_categories: ["Purchase/transaction history"] }), states.verdicts, ["row-test"], new Set(), RECORD);
  assertEquals(settled.considered[0].skipped_by, "atoms_settled");
  assertEquals(settled.items, []);

  const notRanked = planLiaHookSelection([hook], states, states.verdicts, [], new Set(), RECORD);
  assertEquals(notRanked.considered[0].skipped_by, "cap");
  const determinative = planLiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(["row-test"]), RECORD);
  assertEquals(determinative.considered[0].skipped_by, "determinative");
  const notNominated = planLiaHookSelection([makeHook({ hook_id: "h/psd2", required_atoms: ["class:direct_marketing"] })], states, states.verdicts, ["row-test"], new Set(), RECORD);
  assertEquals(notNominated.considered[0].skipped_by, "not_nominated");
  // A contested non-R4 posture prints under neither answer — and its atoms
  // must be unknown for the pre-filter to be the reason (settled atoms are
  // checked first).
  const prefilter = planLiaHookSelection(
    [makeHook({ hook_id: "h/psd2", posture: "contested", settledness: "R1", fact_atoms: ["class:fraud_prevention", "data_category:Purchase/transaction history"] })],
    states, states.verdicts, ["row-test"], new Set(), RECORD,
  );
  assertEquals(prefilter.considered[0].skipped_by, "prefilter");
  const stored = planLiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), RECORD, {
    selections: new Map([["h/psd2", { hook_id: "h/psd2", field_id: "x", agreement: "same", matched_atom: "class:fraud_prevention", evidence_span: "fraud", decision_id: "d", source: "store" }]]),
  });
  assertEquals(stored.considered[0].skipped_by, "store");
  const lapsed = planLiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), RECORD, { lapsed: new Set(["h/psd2"]) });
  assertEquals(lapsed.considered[0].skipped_by, "lapsed");
  const unanswered = planLiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), { processing_description: "tbd", necessity_details: {} });
  assertEquals(unanswered.considered[0].skipped_by, "unanswered");
  assertEquals(unanswered.items, []);
});

// ── the join with a stored selection ───────────────────────────────────────

Deno.test("doc224 join — unknown agreement + a stored `same` selection whose atom holds renders (S5a here) and names the selection field", () => {
  const hook = makeHook({ hook_id: "h/psd2", fact_atoms: ["class:fraud_prevention", "data_category:Purchase/transaction history"] });
  const states = baseStates();
  const selections = new Map([["h/psd2", { hook_id: "h/psd2", field_id: "processing_description", agreement: "same" as const, matched_atom: "class:fraud_prevention", evidence_span: "fraud", decision_id: "d1", source: "model" as const }]]);
  const r = applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set(), { selections });
  assertEquals(r.flags, []);
  assertEquals(r.applications.length, 1);
  assertEquals(r.applications[0].shape, "S5a");
  assertEquals(r.applications[0].selection_field_id, "processing_description");
  // RE-PIN 2026-09-09 (doc 223B ratification follow-up): LIA_HOOK_SHAPES was
  // promoted to the paragraph-form shapes, which add a verbatim {quote}
  // clause before "subject to" — this hook's own finding_span now renders
  // inline, quoted.
  assertStringIncludes(
    r.applications[0].sentence,
    "the EDPB states that processing strictly necessary for fraud prevention may rest on Article 6(1)(f) — in its own words, \"fraud prevention can be a legitimate interest\" — subject to",
  );
  assertStringIncludes(r.applications[0].sentence, "addressed in Section III");
  assertStringIncludes(r.applications[0].sentence, "(EDPB Guidelines 06/2020 on the interplay of PSD2 and the GDPR ¶20; EDPB guidelines — interpretive guidance, not binding law.)");
});

Deno.test("doc224 join — the three unknown outcomes: pending (eligible, no selection), unsettled (legs disagreed), lapsed (let go); an atom that does not hold drops the selection", () => {
  const hook = makeHook({ hook_id: "h/psd2", fact_atoms: ["class:fraud_prevention", "data_category:Purchase/transaction history"] });
  const states = baseStates();
  assertEquals(applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set()).flags, [{ hook_id: "h/psd2", reason: "selection_pending" }]);
  assertEquals(applyLiaHooks([hook], states, states.verdicts, [], new Set()).flags, [{ hook_id: "h/psd2", reason: "omitted" }]);
  assertEquals(applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set(), { unsettled: new Set(["h/psd2"]) }).flags, [{ hook_id: "h/psd2", reason: "selection_unsettled" }]);
  assertEquals(applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set(), { lapsed: new Set(["h/psd2"]) }).flags, [{ hook_id: "h/psd2", reason: "selection_lapsed" }]);
  const notHeld = new Map([["h/psd2", { hook_id: "h/psd2", field_id: "f", agreement: "same" as const, matched_atom: "data_category:Purchase/transaction history", evidence_span: "x", decision_id: "d", source: "model" as const }]]);
  assertEquals(applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set(), { selections: notHeld }).flags, [{ hook_id: "h/psd2", reason: "selection_atom_not_held" }]);
});

// ── S3 / S6 / S6x from a pair only ─────────────────────────────────────────

Deno.test("doc222 §2.4 — S3 renders only from a distinguishing pair whose record atom holds; legacy distinguishing_atoms alone drop the hook", () => {
  const withPair = makeHook({
    hook_id: "h/li",
    posture: "rejected",
    settledness: "R3",
    factor_id: "Balancing of interests, rights and freedoms",
    bears_on_element: "balancing",
    fact_atoms: ["class:behavioral_advertising"],
    distinguishing_atoms: [OPT_OUT],
    distinguishing_pairs: [{
      source_fact_span: "no opt-out was offered to members",
      source_polarity: "present",
      record_atom: OPT_OUT,
      record_polarity: "present",
      why_material: "the finding turned on the absence of an objection route",
      source_expressly_excludes: false,
    }],
    authority_label: "DPC (Ireland), LinkedIn, decision of 22 October 2024",
    authority_label_short: "DPC, LinkedIn",
    regulator: "the DPC",
    source_status: "sa_decision",
    pinpoint: null,
    recognised_proposition: null,
    condition_text: null,
  });
  const states = baseStates({
    use_case_class: "behavioral_advertising",
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
    states: { "intake.balancing_details.opt_out_available": "Yes — unconditional, on request, with no consequence" },
  });
  const r = applyLiaHooks([withPair], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.flags, []);
  assertEquals(r.applications[0].shape, "S3");
  assertStringIncludes(r.applications[0].sentence, "That finding turned on the fact that no opt-out was offered to members; on this record the company has instead stated that an unconditional opt-out is available.");
  assertStringIncludes(r.applications[0].sentence, "the DPC found that where");
  assertStringIncludes(r.applications[0].sentence, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)");

  const legacy: AuthorityHook = { ...withPair, distinguishing_pairs: [] };
  const l = applyLiaHooks([legacy], states, states.verdicts, ["row-test"], new Set());
  assertEquals(l.applications, []);
  assertEquals(l.flags, [{ hook_id: "h/li", reason: "s3_missing_distinguishing_atom" }]);
});

Deno.test("doc222 §3/§4 — conditional + a held pair: S6 when the element is not passing, S6x only with an express exclusion; under a pass nothing prints", () => {
  const hook = makeHook({ hook_id: "h/psd2" });
  const childStates = baseStates({ flags: ["children"] });
  const s6 = applyLiaHooks([hook], childStates, childStates.verdicts, ["row-test"], new Set());
  assertEquals(s6.flags, []);
  assertEquals(s6.applications[0].shape, "S6");
  assertStringIncludes(s6.applications[0].sentence, "The company has stated that children are among the people affected. In EDPB Guidelines 06/2020, the EDPB states that");
  assertStringIncludes(s6.applications[0].sentence, "but does not address whether legitimate interests is available where children are among the people affected.");

  const expressly = makeHook({
    hook_id: "h/psd2x",
    distinguishing_pairs: [{
      source_fact_span: "the guidance excludes processing of children's data",
      source_polarity: "present",
      record_atom: "flag:children",
      record_polarity: "present",
      why_material: "an express exclusion",
      source_expressly_excludes: true,
      exclusion_span: "does not apply to children",
      exclusion_paraphrase: "the permission does not extend to processing of children's data",
    }],
  });
  const s6x = applyLiaHooks([expressly], childStates, childStates.verdicts, ["row-test"], new Set());
  assertEquals(s6x.applications[0].shape, "S6x");
  assertStringIncludes(s6x.applications[0].sentence, "and that the permission does not extend to processing of children's data; that exclusion applies");

  const passing = baseStates({ flags: ["children"], verdicts: { purpose: "passes", necessity: "passes", balancing: "passes" } });
  assertEquals(applyLiaHooks([hook], passing, passing.verdicts, ["row-test"], new Set()).flags, [{ hook_id: "h/psd2", reason: "authority_not_dispositive" }]);
  assertEquals(applyLiaHooks([expressly], passing, passing.verdicts, ["row-test"], new Set()).flags, [{ hook_id: "h/psd2x", reason: "rule_missing" }]);
});

Deno.test("doc222 §3 — S5b needs the condition atoms held AND a passing verdict; the guard drops S5b under a fail", () => {
  const hook = makeHook({ hook_id: "h/c", condition_atoms: ["relationship:customer"] });
  const pass = baseStates({ verdicts: { purpose: "passes", necessity: "passes", balancing: "passes" } });
  const r = applyLiaHooks([hook], pass, pass.verdicts, ["row-test"], new Set());
  assertEquals(r.applications[0].shape, "S5b");
  assertStringIncludes(r.applications[0].sentence, "The facts identified in Section III satisfy that stated condition.");
  const fail = baseStates();
  assertEquals(applyLiaHooks([hook], fail, fail.verdicts, ["row-test"], new Set()).applications[0].shape, "S5a");
});

// ── concept dedupe, status / verb ──────────────────────────────────────────

Deno.test("doc222 §2.3 — {customer_fact} is deduplicated by concept: two atoms naming special-category data print once", () => {
  const hook = makeHook({
    hook_id: "h/sc",
    posture: "accepted",
    fact_atoms: ["flag:special_category", "data_category:Special category data"],
    source_status: "sa_decision",
    authority_label: "Test DPA, Test Matter, decision of 1 January 2024",
    authority_label_short: "Test DPA, Test Matter",
    regulator: "Test DPA",
    pinpoint: null,
  });
  const states = baseStates({ flags: ["special_category"], data_categories: ["Special category data"] });
  const r = applyLiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.applications[0].shape, "S1");
  assertStringIncludes(r.applications[0].sentence, "The company has stated that special-category data is processed. In Test DPA, Test Matter, Test DPA found that where");
  assert(!r.applications[0].sentence.includes("it processes special-category data"));
});

Deno.test("doc222 §2.7 / CEO 2026-09-08 — a known appeal prints as the fixed ratified sentence after the hook, never from appeal_note; guidance never 'finds' (status_verb_mismatch)", () => {
  const r4 = makeHook({
    hook_id: "h/reddit",
    posture: "rejected",
    settledness: "R4",
    source_status: "sa_decision_appeal_pending",
    appeal_note: "reported filed 1 April 2026 to the First-tier Tribunal (GRC)",
    authority_label: "ICO (UK), Reddit, Inc., penalty notice of 23 February 2026",
    authority_label_short: "ICO, Reddit, Inc.",
    regulator: "the ICO",
    pinpoint: null,
    fact_atoms: ["class:behavioral_advertising"],
  });
  const states = baseStates({ use_case_class: "behavioral_advertising" });
  const r = applyLiaHooks([r4], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.applications[0].shape, "S4");
  assertStringIncludes(r.applications[0].sentence, "That decision is under appeal; it is noted as a boundary and is not applied. (ICO (UK), Reddit, Inc., penalty notice of 23 February 2026.)");
  assert(r.applications[0].sentence.endsWith(" " + LIA_APPEAL_SENTENCE), r.applications[0].sentence);
  assertEquals(LIA_APPEAL_SENTENCE, "This matter is subject to an appeal which could invalidate this ruling.");
  assert(!r.applications[0].sentence.includes("First-tier Tribunal"), "appeal_note is record data, never printed");

  const mismatch = makeHook({ hook_id: "h/bad", posture: "accepted", verb: "found" });
  const m = applyLiaHooks([mismatch], baseStates(), baseStates().verdicts, ["row-test"], new Set());
  assertEquals(m.flags, [{ hook_id: "h/bad", reason: "status_verb_mismatch" }]);
});

// ── resolveHookSelections ──────────────────────────────────────────────────

Deno.test("doc224 — resolveHookSelections: first settled field wins; a conflict between fields is unsettled and named; disagreed-only is unsettled", () => {
  const r = resolveHookSelections([
    { field_id: "a", hook_id: "h1", agreement: "same", matched_atom: "class:x", evidence_span: "s", decision_id: "d1", legs_disagreed: false, source: "model" },
    { field_id: "b", hook_id: "h1", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d2", legs_disagreed: true, source: "model" },
    { field_id: "a", hook_id: "h2", agreement: "same", matched_atom: "class:x", evidence_span: "s", decision_id: "d3", legs_disagreed: false, source: "store" },
    { field_id: "b", hook_id: "h2", agreement: "different", matched_atom: "flag:y", evidence_span: "t", decision_id: "d4", legs_disagreed: false, source: "model" },
    { field_id: "a", hook_id: "h3", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d5", legs_disagreed: true, source: "model" },
    { field_id: "a", hook_id: "h4", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d6", legs_disagreed: false, source: "model" },
  ]);
  assertEquals(r.selections.get("h1")?.field_id, "a");
  assertEquals(r.selections.has("h2"), false);
  assertEquals(r.conflicts, ["h2"]);
  assertEquals([...r.unsettled].sort(), ["h2", "h3"]);
  assertEquals(r.selections.has("h4"), false);
});

Deno.test("doc224A D5 — the ROO ask names the question only: no authority, no fact, no coaching", () => {
  for (const banned of ["EDPB", "ICO", "decision of", "should say", "would pass", "state that", "¶"]) {
    assert(!LIA_ROO_UNSETTLED_TEMPLATE.includes(banned), banned);
  }
  assertStringIncludes(LIA_ROO_UNSETTLED_TEMPLATE, "keep it as written");
});
