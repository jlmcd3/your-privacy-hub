// Doc 206's generic rule interpreter: the atom/trigger grammar (rule-types.ts)
// and the effect-application semantics (rule-interpreter.ts). This file is
// the exhaustive proof each documented rule actually behaves as specified —
// every atom kind, every trigger combinator (including the Law B2 absent-
// path case), every effect kind's eligibility and application semantics, the
// fixed kind/rule_id ordering, every suppression path, the monotonicity
// fallback, and purity. See tests/edge/corpus/corpus-relevance-rule-boundary.test.ts
// for the companion import-boundary sweep — this file is one of the shapes
// (`tests/`) that boundary allows to import these two modules directly.

import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADVERSE_KINDS,
  type AuthorityRule,
  type CurrentDetermination,
  evaluateAtom,
  evaluateTrigger,
  FAVORABLE_KINDS,
  parseAtom,
  type RuleContext,
  type RuleEffect,
  type RuleTrigger,
  type TypedStateBag,
} from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { applyRules } from "../../../supabase/functions/_shared/corpus/rule-interpreter.ts";

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

/** Test-only scales/outcomes (doc 206's real LIA wiring is a separate,
 *  later adapter — this context exists purely to exercise the interpreter). */
const CTX: RuleContext = {
  scales: [
    { element: "purpose", order: ["passes", "uncertain", "fails"] },
    { element: "necessity", order: ["passes", "uncertain"] },
    { element: "balancing", order: ["likely_passes", "uncertain", "likely_fails"] },
  ],
  adverse_outcomes: ["legitimate_interests_not_available"],
  favorable_outcomes: ["recognised_legitimate_interest_applies"],
};

function makeStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "gdpr",
    use_case_class: "marketing",
    relationship: "customer",
    data_categories: ["contact"],
    flags: [],
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
    states: {},
    ...overrides,
  };
}

function makeCurrent(overrides: Partial<CurrentDetermination> = {}): CurrentDetermination {
  return {
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
    outcome: "recognised_legitimate_interest_applies",
    conditions: [],
    risks: {},
    ...overrides,
  };
}

function makeRule(overrides: Partial<AuthorityRule> & { effect: RuleEffect; rule_id: string }): AuthorityRule {
  return {
    product: "lia",
    settledness: "R1",
    instrument_scope: ["gdpr"],
    bears_on_element: "purpose",
    trigger: { all_of: ["flag:x"] },
    reason_sentence: "because the authority says so",
    authority_citation: "Some Authority v. Someone (2024)",
    sources: [{ table: "t", row_id: "1" }],
    ...overrides,
  };
}

// --------------------------------------------------------------------------
// Atom grammar
// --------------------------------------------------------------------------

Deno.test("parseAtom — every kind parses its key (and value, where keyed)", () => {
  assertEquals(parseAtom("flag:special_category"), { kind: "flag", key: "special_category" });
  assertEquals(parseAtom("class:marketing"), { kind: "class", key: "marketing" });
  assertEquals(parseAtom("relationship:employee"), { kind: "relationship", key: "employee" });
  assertEquals(parseAtom("data_category:health"), { kind: "data_category", key: "health" });
  assertEquals(parseAtom("instrument:gdpr"), { kind: "instrument", key: "gdpr" });
  assertEquals(parseAtom("verdict:purpose=passes"), { kind: "verdict", key: "purpose", value: "passes" });
  assertEquals(parseAtom("state:consent.obtained=true"), { kind: "state", key: "consent.obtained", value: "true" });
});

Deno.test("parseAtom — throws on unknown kind and on malformed atoms", () => {
  assertThrows(() => parseAtom("bogus:whatever"), Error, "unknown atom kind");
  assertThrows(() => parseAtom("no-colon-here"), Error, "malformed atom");
  assertThrows(() => parseAtom("verdict:purpose"), Error, "malformed verdict atom");
  assertThrows(() => parseAtom("state:path"), Error, "malformed state atom");
  assertThrows(() => parseAtom("flag:"), Error, "malformed flag atom");
});

Deno.test("evaluateAtom — flag: matches states.flags membership", () => {
  const s = makeStates({ flags: ["special_category", "children"] });
  assert(evaluateAtom("flag:special_category", s));
  assert(!evaluateAtom("flag:large_scale", s));
});

Deno.test("evaluateAtom — class: matches use_case_class exactly", () => {
  const s = makeStates({ use_case_class: "fraud_prevention" });
  assert(evaluateAtom("class:fraud_prevention", s));
  assert(!evaluateAtom("class:marketing", s));
  assert(!evaluateAtom("class:fraud_prevention", makeStates({ use_case_class: null })));
});

Deno.test("evaluateAtom — relationship: matches relationship exactly", () => {
  const s = makeStates({ relationship: "employee" });
  assert(evaluateAtom("relationship:employee", s));
  assert(!evaluateAtom("relationship:customer", s));
});

Deno.test("evaluateAtom — data_category: matches data_categories membership", () => {
  const s = makeStates({ data_categories: ["health", "biometric"] });
  assert(evaluateAtom("data_category:health", s));
  assert(!evaluateAtom("data_category:location", s));
});

Deno.test("evaluateAtom — instrument: matches instrument exactly", () => {
  const s = makeStates({ instrument: "uk_gdpr" });
  assert(evaluateAtom("instrument:uk_gdpr", s));
  assert(!evaluateAtom("instrument:gdpr", s));
});

Deno.test("evaluateAtom — verdict:<element>=<value> matches states.verdicts[element]", () => {
  const s = makeStates({ verdicts: { purpose: "uncertain" } });
  assert(evaluateAtom("verdict:purpose=uncertain", s));
  assert(!evaluateAtom("verdict:purpose=passes", s));
  assert(!evaluateAtom("verdict:necessity=uncertain", s)); // missing key -> undefined, never matches
});

Deno.test("evaluateAtom — state:<path>=<value> matches String(states.states[path]) — missing path never matches", () => {
  const s = makeStates({ states: { "consent.obtained": true, "retention.days": 30 } });
  assert(evaluateAtom("state:consent.obtained=true", s));
  assert(!evaluateAtom("state:consent.obtained=false", s));
  assert(evaluateAtom("state:retention.days=30", s)); // String() coercion
  assert(!evaluateAtom("state:missing.path=anything", s));
});

// --------------------------------------------------------------------------
// Trigger combinators
// --------------------------------------------------------------------------

Deno.test("evaluateTrigger — empty trigger {} never fires", () => {
  assert(!evaluateTrigger({}, makeStates()));
});

Deno.test("evaluateTrigger — all_of requires every atom", () => {
  const s = makeStates({ flags: ["a"], use_case_class: "marketing" });
  const t: RuleTrigger = { all_of: ["flag:a", "class:marketing"] };
  assert(evaluateTrigger(t, s));
  assert(!evaluateTrigger({ all_of: ["flag:a", "class:other"] }, s));
});

Deno.test("evaluateTrigger — any_of requires at least one atom", () => {
  const s = makeStates({ flags: ["a"] });
  assert(evaluateTrigger({ any_of: ["flag:a", "flag:b"] }, s));
  assert(evaluateTrigger({ any_of: ["flag:b", "flag:a"] }, s));
  assert(!evaluateTrigger({ any_of: ["flag:b", "flag:c"] }, s));
});

Deno.test("evaluateTrigger — none_of requires none of the atoms to match", () => {
  const s = makeStates({ flags: ["a"] });
  // none_of alone (a non-empty trigger) fires when none of its atoms match.
  assert(evaluateTrigger({ none_of: ["flag:b"] }, s));
  assert(!evaluateTrigger({ none_of: ["flag:a"] }, s));
  // Combined with all_of, the combinator is still under test.
  assert(evaluateTrigger({ all_of: ["flag:a"], none_of: ["flag:b"] }, s));
  assert(!evaluateTrigger({ all_of: ["flag:a"], none_of: ["flag:a"] }, s));
});

Deno.test("evaluateTrigger — Law B2: a none_of state: atom over an ABSENT path blocks firing, it does not vacuously pass", () => {
  const s = makeStates({ flags: ["a"], states: {} }); // "review.completed" path absent
  const t: RuleTrigger = { all_of: ["flag:a"], none_of: ["state:review.completed=true"] };
  // Absence must never help a rule fire: the none_of clause is treated as
  // NOT satisfied when the referenced path is missing.
  assert(!evaluateTrigger(t, s));

  // Once the state is observed and genuinely false, none_of is satisfied.
  const s2 = makeStates({ flags: ["a"], states: { "review.completed": false } });
  assert(evaluateTrigger(t, s2));

  // And if it's observed true, none_of correctly blocks too.
  const s3 = makeStates({ flags: ["a"], states: { "review.completed": true } });
  assert(!evaluateTrigger(t, s3));
});

Deno.test("evaluateTrigger — all_of/any_of/none_of combine with AND semantics", () => {
  const s = makeStates({ flags: ["a", "b"], use_case_class: "marketing" });
  const t: RuleTrigger = { all_of: ["flag:a"], any_of: ["class:marketing", "class:other"], none_of: ["flag:z"] };
  assert(evaluateTrigger(t, s));
  assert(!evaluateTrigger({ ...t, none_of: ["flag:b"] }, s));
});

// --------------------------------------------------------------------------
// ADVERSE_KINDS / FAVORABLE_KINDS
// --------------------------------------------------------------------------

Deno.test("ADVERSE_KINDS and FAVORABLE_KINDS partition the seven effect kinds", () => {
  const all: RuleEffect["kind"][] = [
    "override_outcome",
    "cap_verdict",
    "require_condition",
    "flag_risk",
    "recognise_interest",
    "route_to_basis",
    "precedent_verdict",
  ];
  for (const kind of all) {
    assert(ADVERSE_KINDS.has(kind) !== FAVORABLE_KINDS.has(kind), `${kind} must be in exactly one set`);
  }
  assertEquals(ADVERSE_KINDS.size + FAVORABLE_KINDS.size, all.length);
});

// --------------------------------------------------------------------------
// applyRules — scope filtering (unrecorded)
// --------------------------------------------------------------------------

Deno.test("applyRules — retired rules are ignored, not even recorded", () => {
  const rule = makeRule({
    rule_id: "r1",
    retired_at: "2025-01-01",
    effect: { kind: "flag_risk", element: "purpose", text: "should never appear" },
    trigger: {},
  });
  const result = applyRules([rule], makeStates(), makeCurrent(), CTX);
  assertEquals(result.applications, []);
  assertEquals(result.next, makeCurrent());
});

Deno.test("applyRules — a rule out of instrument scope is ignored, not even recorded", () => {
  const rule = makeRule({
    rule_id: "r1",
    instrument_scope: ["ccpa"], // states.instrument is "gdpr" by default
    effect: { kind: "flag_risk", element: "purpose", text: "should never appear" },
    trigger: { all_of: ["flag:x"] },
  });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.applications, []);
  assertEquals(result.next, makeCurrent());
});

// --------------------------------------------------------------------------
// applyRules — eligibility by settledness
// --------------------------------------------------------------------------

Deno.test("applyRules — override_outcome eligible at R1/R2, ineligible at R3", () => {
  for (const settledness of ["R1", "R2"] as const) {
    const rule = makeRule({
      rule_id: "r1",
      settledness,
      effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
    });
    const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
    assertEquals(result.applications.length, 1);
    assert(!result.applications[0].ineligible, `expected eligible at ${settledness}`);
  }
  const r3rule = makeRule({
    rule_id: "r1",
    settledness: "R3",
    effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
  });
  const result = applyRules([r3rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.applications.length, 1);
  assertEquals(result.applications[0].ineligible, "settledness_ineligible");
  assertEquals(result.next, makeCurrent());
});

Deno.test("applyRules — cap_verdict/require_condition/flag_risk eligible at R1, R2, AND R3", () => {
  const kinds: RuleEffect[] = [
    { kind: "cap_verdict", element: "purpose", max: "uncertain" },
    { kind: "require_condition", text: "must document X" },
    { kind: "flag_risk", element: "purpose", text: "risk noted" },
  ];
  for (const effect of kinds) {
    for (const settledness of ["R1", "R2", "R3"] as const) {
      const rule = makeRule({ rule_id: "r1", settledness, effect });
      const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
      assert(!result.applications[0].ineligible, `${effect.kind} should be eligible at ${settledness}`);
    }
  }
});

Deno.test("applyRules — recognise_interest eligible ONLY at R1", () => {
  const effect: RuleEffect = { kind: "recognise_interest", element: "purpose", value: "uncertain" };
  const current = makeCurrent({ verdicts: { purpose: "fails", necessity: "passes", balancing: "likely_passes" } });
  const r1 = makeRule({ rule_id: "r1", settledness: "R1", effect, bears_on_element: "purpose" });
  const okResult = applyRules([r1], makeStates({ flags: ["x"] }), current, CTX);
  assert(!okResult.applications[0].ineligible);

  for (const settledness of ["R2", "R3"] as const) {
    const rule = makeRule({ rule_id: "r1", settledness, effect, bears_on_element: "purpose" });
    const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
    assertEquals(result.applications[0].ineligible, "settledness_ineligible");
  }
});

Deno.test("applyRules — route_to_basis eligible ONLY at R1", () => {
  const effect: RuleEffect = { kind: "route_to_basis", outcome: "recognised_legitimate_interest_applies" };
  const r1 = makeRule({ rule_id: "r1", settledness: "R1", effect });
  const okResult = applyRules([r1], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assert(!okResult.applications[0].ineligible);

  for (const settledness of ["R2", "R3"] as const) {
    const rule = makeRule({ rule_id: "r1", settledness, effect });
    const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
    assertEquals(result.applications[0].ineligible, "settledness_ineligible");
  }
});

Deno.test("applyRules — precedent_verdict on necessity needs R2; R1 and R3 are ineligible", () => {
  const effect: RuleEffect = { kind: "precedent_verdict", element: "necessity", value: "uncertain" };
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } });

  const r2 = makeRule({ rule_id: "r1", settledness: "R2", effect, bears_on_element: "necessity" });
  const okResult = applyRules([r2], makeStates({ flags: ["x"] }), current, CTX);
  assert(!okResult.applications[0].ineligible);
  assert(okResult.applications[0].ineligible === undefined);

  for (const settledness of ["R1", "R3"] as const) {
    const rule = makeRule({ rule_id: "r1", settledness, effect, bears_on_element: "necessity" });
    const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
    assertEquals(
      result.applications[0].ineligible,
      "settledness_ineligible",
      `precedent_verdict on necessity should be ineligible at ${settledness}`,
    );
  }
});

Deno.test("applyRules — precedent_verdict on a non-necessity element is eligible at R1, R2, AND R3", () => {
  const current = makeCurrent({ verdicts: { purpose: "fails", necessity: "passes", balancing: "likely_passes" } });
  for (const settledness of ["R1", "R2", "R3"] as const) {
    const effect: RuleEffect = { kind: "precedent_verdict", element: "purpose", value: "uncertain" };
    const rule = makeRule({ rule_id: "r1", settledness, effect, bears_on_element: "purpose" });
    const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
    assert(!result.applications[0].ineligible, `purpose precedent should be eligible at ${settledness}`);
  }
});

// --------------------------------------------------------------------------
// applyRules — invalid trigger
// --------------------------------------------------------------------------

Deno.test("applyRules — an unknown atom kind in the trigger is recorded ineligible: invalid_trigger, not thrown", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "flag_risk", element: "purpose", text: "x" },
    trigger: { all_of: ["bogus:whatever"] },
  });
  const result = applyRules([rule], makeStates(), makeCurrent(), CTX);
  assertEquals(result.applications.length, 1);
  assertEquals(result.applications[0].ineligible, "invalid_trigger");
  assertEquals(result.next, makeCurrent());
  assertEquals(result.invariant_violations, []);
});

// --------------------------------------------------------------------------
// applyRules — effect semantics
// --------------------------------------------------------------------------

Deno.test("applyRules — override_outcome sets the outcome", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
  });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.next.outcome, "legitimate_interests_not_available");
  assertEquals(result.applications[0].changed, true);
  assertEquals(result.applications[0].concurred, false);
});

Deno.test("applyRules — cap_verdict floors the verdict at max and no lower — plus concurrence when already at/past cap", () => {
  // Lowering case: current "likely_passes" (idx0), cap at "uncertain" (idx1) -> "uncertain".
  const lowerRule = makeRule({
    rule_id: "r1",
    effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" },
  });
  const lowered = applyRules(
    [lowerRule],
    makeStates({ flags: ["x"] }),
    makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } }),
    CTX,
  );
  assertEquals(lowered.next.verdicts.balancing, "uncertain");
  assertEquals(lowered.applications[0].changed, true);
  assertEquals(lowered.applications[0].concurred, false);
  assertEquals(lowered.applications[0].before, "likely_passes");
  assertEquals(lowered.applications[0].after, "uncertain");

  // Concurrence case: current already worse than (or equal to) the cap.
  const concurRule = makeRule({
    rule_id: "r1",
    effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" },
  });
  const concurred = applyRules(
    [concurRule],
    makeStates({ flags: ["x"] }),
    makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_fails" } }),
    CTX,
  );
  assertEquals(concurred.next.verdicts.balancing, "likely_fails");
  assertEquals(concurred.applications[0].changed, false);
  assertEquals(concurred.applications[0].concurred, true);
});

Deno.test("applyRules — cap_verdict with an unknown element or unknown max value is ineligible: unknown_scale_value", () => {
  const unknownElement = makeRule({
    rule_id: "r1",
    effect: { kind: "cap_verdict", element: "nonexistent_element", max: "uncertain" },
  });
  const result1 = applyRules([unknownElement], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result1.applications[0].ineligible, "unknown_scale_value");
  assertEquals(result1.next, makeCurrent());

  const unknownMax = makeRule({
    rule_id: "r1",
    effect: { kind: "cap_verdict", element: "purpose", max: "not_a_real_value" },
  });
  const result2 = applyRules([unknownMax], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result2.applications[0].ineligible, "unknown_scale_value");
  assertEquals(result2.next, makeCurrent());
});

Deno.test("applyRules — route_to_basis sets a favorable outcome when nothing adverse fired", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "route_to_basis", outcome: "recognised_legitimate_interest_applies" },
  });
  const current = makeCurrent({ outcome: "undetermined" });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
  assertEquals(result.next.outcome, "recognised_legitimate_interest_applies");
  assertEquals(result.applications[0].changed, true);
});

Deno.test("applyRules — recognise_interest raises the verdict when more favorable and nothing adverse fired", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
    bears_on_element: "purpose",
  });
  const current = makeCurrent({ verdicts: { purpose: "uncertain", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
  assertEquals(result.next.verdicts.purpose, "passes");
  assertEquals(result.applications[0].changed, true);
  assertEquals(result.applications[0].concurred, false);
});

Deno.test("applyRules — recognise_interest concurs (no change) when the proposed value is not more favorable", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "recognise_interest", element: "purpose", value: "fails" }, // less favorable than current
    bears_on_element: "purpose",
  });
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
  assertEquals(result.next.verdicts.purpose, "passes");
  assertEquals(result.applications[0].changed, false);
  assertEquals(result.applications[0].concurred, true);
});

Deno.test("applyRules — recognise_interest with an unknown element/value is ineligible: unknown_scale_value", () => {
  const rule = makeRule({
    rule_id: "r1",
    effect: { kind: "recognise_interest", element: "purpose", value: "not_a_real_value" },
    bears_on_element: "purpose",
  });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.applications[0].ineligible, "unknown_scale_value");
});

Deno.test("applyRules — precedent_verdict raises the verdict the same way recognise_interest does", () => {
  const rule = makeRule({
    rule_id: "r1",
    settledness: "R2",
    effect: { kind: "precedent_verdict", element: "necessity", value: "passes" },
    bears_on_element: "necessity",
  });
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "uncertain", balancing: "likely_passes" } });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), current, CTX);
  assertEquals(result.next.verdicts.necessity, "passes");
  assertEquals(result.applications[0].changed, true);
});

Deno.test("applyRules — require_condition appends unique text and dedupes exact repeats", () => {
  const ruleA = makeRule({ rule_id: "r1", effect: { kind: "require_condition", text: "must notify DPO" } });
  const ruleB = makeRule({ rule_id: "r2", effect: { kind: "require_condition", text: "must notify DPO" } });
  const result = applyRules([ruleA, ruleB], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.next.conditions, ["must notify DPO"]);
  assertEquals(result.applications[0].changed, true);
  assertEquals(result.applications[0].concurred, false);
  assertEquals(result.applications[1].changed, false);
  assertEquals(result.applications[1].concurred, true);
});

Deno.test("applyRules — flag_risk appends to the element's risk bucket and dedupes exact repeats", () => {
  const ruleA = makeRule({ rule_id: "r1", effect: { kind: "flag_risk", element: "purpose", text: "profiling risk" } });
  const ruleB = makeRule({ rule_id: "r2", effect: { kind: "flag_risk", element: "purpose", text: "profiling risk" } });
  const ruleC = makeRule({ rule_id: "r3", effect: { kind: "flag_risk", element: "purpose", text: "second risk" } });
  const result = applyRules([ruleA, ruleB, ruleC], makeStates({ flags: ["x"] }), makeCurrent(), CTX);
  assertEquals(result.next.risks.purpose, ["profiling risk", "second risk"]);
  assertEquals(result.applications[0].changed, true);
  assertEquals(result.applications[1].changed, false);
  assertEquals(result.applications[1].concurred, true);
  assertEquals(result.applications[2].changed, true);
});

// --------------------------------------------------------------------------
// applyRules — ordering
// --------------------------------------------------------------------------

Deno.test("applyRules — applies in fixed kind order, then by rule_id ascending within a kind, regardless of input order", () => {
  const rules: AuthorityRule[] = [
    makeRule({ rule_id: "z9", effect: { kind: "flag_risk", element: "purpose", text: "flag rule" } }),
    makeRule({ rule_id: "b2", effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" } }),
    makeRule({ rule_id: "a1", effect: { kind: "cap_verdict", element: "necessity", max: "uncertain" } }),
    makeRule({ rule_id: "m5", effect: { kind: "require_condition", text: "condition rule" } }),
    makeRule({ rule_id: "o1", effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" } }),
  ];
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules(rules, makeStates({ flags: ["x"] }), current, CTX);

  const order = result.applications.map((a) => a.rule_id);
  assertEquals(order, ["o1", "a1", "b2", "m5", "z9"]);
});

// --------------------------------------------------------------------------
// applyRules — suppression
// --------------------------------------------------------------------------

Deno.test("applyRules — override_outcome suppresses route_to_basis, recognise_interest, and precedent_verdict", () => {
  const rules: AuthorityRule[] = [
    makeRule({ rule_id: "adverse1", effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" } }),
    makeRule({ rule_id: "fav1", effect: { kind: "route_to_basis", outcome: "recognised_legitimate_interest_applies" } }),
    makeRule({
      rule_id: "fav2",
      effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
      bears_on_element: "purpose",
    }),
    makeRule({
      rule_id: "fav3",
      settledness: "R2",
      effect: { kind: "precedent_verdict", element: "purpose", value: "passes" },
      bears_on_element: "purpose",
    }),
  ];
  const current = makeCurrent({ verdicts: { purpose: "uncertain", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules(rules, makeStates({ flags: ["x"] }), current, CTX);

  assertEquals(result.next.outcome, "legitimate_interests_not_available");
  assertEquals(result.next.verdicts.purpose, "uncertain"); // unraised — suppressed

  const byId = Object.fromEntries(result.applications.map((a) => [a.rule_id, a]));
  assertEquals(byId.fav1.suppressed_by, "adverse1");
  assertEquals(byId.fav1.changed, false);
  assertEquals(byId.fav2.suppressed_by, "adverse1");
  assertEquals(byId.fav2.changed, false);
  assertEquals(byId.fav3.suppressed_by, "adverse1");
  assertEquals(byId.fav3.changed, false);
  // Suppression by override, not by a same-element cap — no contrary_authority.
  assert(!byId.fav2.contrary_authority);
});

Deno.test("applyRules — a cap_verdict lowering an element suppresses a same-element favorable rule this pass, with contrary_authority", () => {
  const rules: AuthorityRule[] = [
    makeRule({ rule_id: "cap1", effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" } }),
    makeRule({
      rule_id: "fav1",
      effect: { kind: "recognise_interest", element: "balancing", value: "likely_passes" },
      bears_on_element: "balancing",
    }),
  ];
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules(rules, makeStates({ flags: ["x"] }), current, CTX);

  assertEquals(result.next.verdicts.balancing, "uncertain"); // capped, never raised back
  const byId = Object.fromEntries(result.applications.map((a) => [a.rule_id, a]));
  assertEquals(byId.fav1.suppressed_by, "cap1");
  assertEquals(byId.fav1.changed, false);
  assertEquals(byId.fav1.contrary_authority, true);
  assertEquals(result.invariant_violations, []);
});

Deno.test("applyRules — a favorable rule on a DIFFERENT element from any cap_verdict is not suppressed", () => {
  const rules: AuthorityRule[] = [
    makeRule({ rule_id: "cap1", effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" } }),
    makeRule({
      rule_id: "fav1",
      effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
      bears_on_element: "purpose",
    }),
  ];
  const current = makeCurrent({ verdicts: { purpose: "uncertain", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules(rules, makeStates({ flags: ["x"] }), current, CTX);

  assertEquals(result.next.verdicts.purpose, "passes");
  const byId = Object.fromEntries(result.applications.map((a) => [a.rule_id, a]));
  assertEquals(byId.fav1.suppressed_by, undefined);
  assertEquals(byId.fav1.changed, true);
});

// --------------------------------------------------------------------------
// applyRules — monotonicity fallback
// --------------------------------------------------------------------------

Deno.test("applyRules — an internally-inconsistent RuleContext scale trips the monotonicity invariant and falls back to `current`", () => {
  // A duplicate `balancing` scale entry: the FIRST is what the interpreter's
  // own effect-application logic uses (`Array.prototype.find` returns the
  // first match), while checkMonotonicity's lookup (built via `new Map(...)`)
  // lets the LAST entry win. A single legitimate cap_verdict application,
  // correct under the order it was actually computed with, then reads as an
  // unauthorized raise under the (deliberately inconsistent) order the
  // invariant check uses — exactly the "a raise slips through" scenario.
  const inconsistentCtx: RuleContext = {
    ...CTX,
    scales: [
      { element: "balancing", order: ["likely_passes", "uncertain", "likely_fails"] }, // used to apply
      { element: "balancing", order: ["likely_fails", "uncertain", "likely_passes"] }, // used to check
    ],
  };
  const rule = makeRule({
    rule_id: "cap1",
    effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" },
  });
  const current = makeCurrent({ verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" } });
  const result = applyRules([rule], makeStates({ flags: ["x"] }), current, inconsistentCtx);

  assertEquals(result.invariant_violations.length, 1);
  assertEquals(result.next, current);
  assertEquals(result.next, structuredClone(current));
  // The trail is kept even though the determination was rolled back.
  assertEquals(result.applications.length, 1);
  assertEquals(result.applications[0].rule_id, "cap1");
  assertEquals(result.applications[0].changed, true);
});

// --------------------------------------------------------------------------
// applyRules — purity and identity
// --------------------------------------------------------------------------

Deno.test("applyRules — zero rules is the identity: next deep-equals current, applications empty", () => {
  const current = makeCurrent();
  const result = applyRules([], makeStates(), current, CTX);
  assertEquals(result.next, current);
  assertEquals(result.applications, []);
  assertEquals(result.invariant_violations, []);
});

Deno.test("applyRules — pure: same inputs twice produce deep-equal results, and inputs are never mutated", () => {
  const rules: AuthorityRule[] = [
    makeRule({ rule_id: "cap1", effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" } }),
    makeRule({
      rule_id: "fav1",
      effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
      bears_on_element: "purpose",
    }),
    makeRule({ rule_id: "cond1", effect: { kind: "require_condition", text: "must document X" } }),
  ];
  const states = makeStates({ flags: ["x"] });
  const current = makeCurrent({ verdicts: { purpose: "uncertain", necessity: "passes", balancing: "likely_passes" } });

  const rulesSnapshot = structuredClone(rules);
  const statesSnapshot = structuredClone(states);
  const currentSnapshot = structuredClone(current);

  const result1 = applyRules(rules, states, current, CTX);
  const result2 = applyRules(rules, states, current, CTX);

  assertEquals(result1, result2);
  assertEquals(rules, rulesSnapshot);
  assertEquals(states, statesSnapshot);
  assertEquals(current, currentSnapshot);
});
