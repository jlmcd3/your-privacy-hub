// DOC 237 (2026-09-09) — CPPA RISK HOOK JOIN, the comparative-review fixes.
//
// Read side by side with LIA's reference join (run-li-assessment/_local/ltp/
// lia-deliverables/hook-join.ts), DPIA's (dpia-hook-join.ts) and ADMT's
// (run-admt-checker-v2/_local/ltp/hook-join.ts), Risk's join differed in two
// places that are behaviour, not style:
//
//   1. The doc 223 absent-polarity guard sat BEFORE `directionFor`, keyed on
//      `agreement === "different"` alone — so an absent-polarity pair under
//      a conditional posture + PASSING verdict was flagged
//      `absent_pair_unrenderable` (keeps the V2 default entry) instead of
//      the matrix's own `authority_not_dispositive` / `rule_missing` (drops
//      the entry; `rule_missing` is the lawyer's-rule assessor signal). The
//      guard now sits where the other three joins put it: after
//      `directionFor`, on the three rendering shapes. Rendering strength is
//      unchanged — doc231-hook-join.test.ts's own reproduction still passes.
//   2. `verdicts` is `{}` in this product today (doc 231A §5 NEED #2), and a
//      null verdict is NON-passing to the shared matrix — so S2 ("the
//      finding at {section} reflects it") would have rendered with no engine
//      finding behind it. New in-path assertion `verdict_missing` refuses
//      S2 / S6 / S6x under a null verdict; S1 / S3 / S4 / S5a still render.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook, HookDistinguishingPair } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { applyRiskHooks, planRiskHookSelection } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";

function baseStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "CPPA Regulations",
    use_case_class: null,
    relationship: null,
    data_categories: [],
    flags: [],
    verdicts: {},
    states: {},
    ...overrides,
  };
}

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "the risk assessment omitted the required analysis",
    fact_pattern_paraphrase: "a business processed sensitive personal information without a prior risk assessment",
    finding_paraphrase: "the assessment obligation was not satisfied",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Safeguards",
    bears_on_element: "Safeguards",
    authority_label: "Test DPA, Test Matter, decision of 1 January 2025",
    regulator: "Test DPA",
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Safeguards"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    ...overrides,
  };
}

/** An absent-polarity pair on `flag:children_data` — HOLDS on a record with
 *  no children_data flag. */
function absentChildrenPair(expresslyExcludes = false): HookDistinguishingPair {
  return {
    source_fact_span: "the processing did not involve children",
    source_polarity: "absent",
    record_atom: "flag:children_data",
    record_polarity: "absent",
    why_material: "the source's holding does not address a record with children among the people affected",
    source_expressly_excludes: expresslyExcludes,
    ...(expresslyExcludes ? { exclusion_span: "does not apply to processing involving children", exclusion_paraphrase: "the position does not extend to processing involving children" } : {}),
  } as HookDistinguishingPair;
}

function conditionalHook(pair: HookDistinguishingPair): AuthorityHook {
  return makeHook({
    hook_id: "test/conditional-absent-pair",
    posture: "conditional",
    fact_atoms: [],
    required_atoms: [],
    distinguishing_atoms: [],
    recognised_proposition: "a compliant risk assessment addresses the necessity of the processing",
    condition_text: "the processing does not affect children",
    distinguishing_pairs: [pair],
  });
}

// ── 1. Guard placement: the matrix's omit outcomes are no longer masked ──

Deno.test("doc237 — conditional + PASSING verdict + absent-polarity pair: the matrix's authority_not_dispositive omit wins (not absent_pair_unrenderable)", () => {
  const r = applyRiskHooks([conditionalHook(absentChildrenPair(false))], baseStates({ flags: [] }), { "Safeguards": "passes" }, [], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/conditional-absent-pair", reason: "authority_not_dispositive" }]);
});

Deno.test("doc237 — conditional + PASSING verdict + absent-polarity pair that EXPRESSLY EXCLUDES: the lawyer's rule (rule_missing) is surfaced, never masked", () => {
  const r = applyRiskHooks([conditionalHook(absentChildrenPair(true))], baseStates({ flags: [] }), { "Safeguards": "likely_passes" }, [], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/conditional-absent-pair", reason: "rule_missing" }]);
});

Deno.test("doc237 — conditional + NON-passing verdict + absent-polarity pair: S6 would render, so the absent-polarity guard fires (doc 231's own reproduction, unchanged)", () => {
  const r = applyRiskHooks([conditionalHook(absentChildrenPair(false))], baseStates({ flags: [] }), { "Safeguards": "uncertain" }, [], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/conditional-absent-pair", reason: "absent_pair_unrenderable" }]);
});

Deno.test("doc237 — accepted posture + absent-polarity pair: the matrix's plain omit (nothing to say), not the render guard", () => {
  const hook = makeHook({
    hook_id: "test/accepted-absent-pair",
    posture: "accepted",
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_pairs: [absentChildrenPair(false)],
  });
  const r = applyRiskHooks([hook], baseStates({ flags: ["sensitive_pi"] }), { "Safeguards": "uncertain" }, [], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/accepted-absent-pair", reason: "omitted" }]);
});

Deno.test("doc237 — rejected + absent-polarity pair + any verdict: S3 would render from the pair, so the guard fires — a false presence statement is never printed", () => {
  const hook = makeHook({
    hook_id: "test/rejected-absent-pair",
    posture: "rejected",
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_pairs: [absentChildrenPair(false)],
  });
  for (const verdict of ["passes", "uncertain", "fails"]) {
    const r = applyRiskHooks([hook], baseStates({ flags: ["sensitive_pi"] }), { "Safeguards": verdict }, [], new Set());
    assertEquals(r.applications, [], verdict);
    assertEquals(r.flags, [{ hook_id: "test/rejected-absent-pair", reason: "absent_pair_unrenderable" }], verdict);
  }
});

// ── 2. verdict_missing — CPPA Risk's `{}` verdicts ────────────────────────

Deno.test("doc237 — S2 is refused under a NULL verdict (verdict_missing): 'the finding at {section} reflects it' cannot be asserted when no finding exists", () => {
  const hook = makeHook({ hook_id: "test/s2-null-verdict", posture: "rejected", fact_atoms: ["flag:sensitive_pi"] });
  const r = applyRiskHooks([hook], baseStates({ flags: ["sensitive_pi"] }), {}, [], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/s2-null-verdict", reason: "verdict_missing" }]);
  // The same hook renders S2 the moment a real non-passing verdict exists.
  const withVerdict = applyRiskHooks([hook], baseStates({ flags: ["sensitive_pi"] }), { "Safeguards": "fails" }, [], new Set());
  assertEquals(withVerdict.applications.map((a) => a.shape), ["S2"]);
});

Deno.test("doc237 — S6 / S6x are refused under a NULL verdict; a present-polarity pair renders S6 once a verdict exists", () => {
  const presentPair: HookDistinguishingPair = {
    source_fact_span: "the processing involved children",
    source_polarity: "present",
    record_atom: "flag:children_data",
    record_polarity: "present",
    why_material: "the source's holding does not address a record with children among the people affected",
    source_expressly_excludes: false,
  };
  const hook = conditionalHook(presentPair);
  const nullVerdict = applyRiskHooks([hook], baseStates({ flags: ["children_data"] }), {}, [], new Set());
  assertEquals(nullVerdict.applications, []);
  assertEquals(nullVerdict.flags, [{ hook_id: "test/conditional-absent-pair", reason: "verdict_missing" }]);
  const withVerdict = applyRiskHooks([hook], baseStates({ flags: ["children_data"] }), { "Safeguards": "uncertain" }, [], new Set());
  assertEquals(withVerdict.applications.map((a) => a.shape), ["S6"]);
});

Deno.test("doc237 — S1, S3, S4 and S5a make no assertion about the section's finding and still render under a NULL verdict", () => {
  const states = baseStates({ flags: ["sensitive_pi"] });
  const s1 = applyRiskHooks([makeHook({ hook_id: "s1", posture: "accepted" })], states, {}, [], new Set());
  assertEquals(s1.applications.map((a) => a.shape), ["S1"]);
  const s4 = applyRiskHooks([makeHook({ hook_id: "s4", posture: "contested", settledness: "R4" })], states, {}, [], new Set());
  assertEquals(s4.applications.map((a) => a.shape), ["S4"]);
  const s5a = applyRiskHooks([makeHook({
    hook_id: "s5a", posture: "conditional",
    recognised_proposition: "a compliant risk assessment addresses the necessity of the processing",
    condition_text: "the safeguards are adequate",
  })], states, {}, [], new Set());
  assertEquals(s5a.applications.map((a) => a.shape), ["S5a"]);
  const s3 = applyRiskHooks([makeHook({
    hook_id: "s3", posture: "rejected",
    distinguishing_pairs: [{
      source_fact_span: "the processing involved children", source_polarity: "present",
      record_atom: "flag:children_data", record_polarity: "present",
      why_material: "w", source_expressly_excludes: false,
    }],
  })], baseStates({ flags: ["sensitive_pi", "children_data"] }), {}, [], new Set());
  assertEquals(s3.applications.map((a) => a.shape), ["S3"]);
});

Deno.test("doc237 — the planner still plans a call under a NULL verdict for every posture (at least one answer prints), so verdict_missing never wastes a call", () => {
  const record = { primary_activity_purpose: "We process account identifiers to run fraud checks on new sign-ups, in some detail." };
  for (const posture of ["accepted", "conditional", "rejected"] as const) {
    const hook = makeHook({
      hook_id: `plan/${posture}`, posture, fact_atoms: ["flag:sensitive_pi"],
      ...(posture === "conditional" ? { recognised_proposition: "p", condition_text: "c" } : {}),
    });
    const plan = planRiskHookSelection([hook], baseStates({ flags: [] }), {}, ["row-test"], new Set(), record);
    assert(plan.considered.some((c) => c.hook_id === hook.hook_id && c.status === "called"), `${posture}: expected a call to be planned`);
  }
});
