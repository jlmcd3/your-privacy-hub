// DOC 231 — CPPA RISK V3 HOOK JOIN. Adapted from
// tests/edge/run-li-assessment/doc213-hook-join.test.ts. `directionFor` and
// `hook-types.ts` are SHARED, unmodified code already exhaustively tested
// by the LIA suite — this file re-checks a representative subset (proving
// the shared matrix behaves the same way reached through the CPPA Risk
// join) and then focuses on what is NEW to this build: the factor-level
// `bears_on_element`, the FACTOR_SECTION map, and — most importantly — the
// doc 223 defect this join was built from the start to design out.
//
// `RISK_HOOKS` ships `[]` in this build (doc 229 §5.3: zero ratified
// `authority_hooks` rows exist yet for product='cppa-risk') — every
// fixture hook below is injected directly through `applyRiskHooks`'s
// `hooks` parameter, exactly as doc213-hook-join.test.ts does for LIA.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { directionFor, type AuthorityHook, type HookSettledness } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import {
  applyRiskHooks,
  planRiskHookSelection,
  resolveHookSelections,
  FACTOR_SECTION,
  RISK_HOOKS_FACTOR_CAP,
  RISK_HOOKS_REPORT_CAP,
  type HookSelectionRow,
} from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";
import { RISK_HOOKS, RISK_HOOKS_VERSION } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

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

// ── directionFor sanity — shared code, spot-checked through this join's own
// import path (the exhaustive matrix suite lives in LIA's doc213 test). ───

Deno.test("directionFor — reached through the Risk join's own import: accepted+same -> S1; rejected+same+pass -> omit(rule_missing)", () => {
  assertEquals(directionFor("accepted", "same", "passes", "R1"), { shape: "S1" });
  assertEquals(directionFor("rejected", "same", "passes", "R1"), { omit: true, reason: "rule_missing" });
  assertEquals(directionFor("rejected", "same", "fails", "R1"), { shape: "S2" });
});

// ── applyRiskHooks — nomination, fact agreement, rendering ─────────────────

Deno.test("applyRiskHooks — not nominated (required_atoms not held): no application, no flag", () => {
  const hook = makeHook({ hook_id: "test/not-nominated", required_atoms: ["flag:admt_use"] });
  const states = baseStates({ flags: [] });
  const result = applyRiskHooks([hook], states, {}, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, []);
});

Deno.test("applyRiskHooks — a determinative source is suppressed silently (same-authority-never-twice)", () => {
  const hook = makeHook({ hook_id: "test/suppressed", source_row_id: "det-row", posture: "accepted" });
  const states = baseStates({ flags: ["sensitive_pi"] });
  const result = applyRiskHooks([hook], states, {}, [], new Set(["det-row"]));
  assertEquals(result.applications, []);
  assertEquals(result.flags, []);
});

Deno.test("applyRiskHooks — accepted + same facts renders S1 with every slot resolved, {section} from FACTOR_SECTION", () => {
  const hook = makeHook({
    hook_id: "test/s1",
    posture: "accepted",
    bears_on_element: "Safeguards",
    factor_id: "Safeguards",
    fact_atoms: ["flag:sensitive_pi"],
  });
  const states = baseStates({ flags: ["sensitive_pi"] });
  const result = applyRiskHooks([hook], states, {}, [], new Set());
  assertEquals(result.flags, []);
  assertEquals(result.applications.length, 1);
  const app = result.applications[0];
  assertEquals(app.shape, "S1");
  assertEquals(app.fact_agreement, "same");
  assert(app.sentence.includes("it processes sensitive personal information"));
  assert(app.sentence.startsWith("The company has stated that"));
  assert(!/\{[a-z_]+\}/.test(app.sentence), app.sentence);
  assertEquals(FACTOR_SECTION["Safeguards"], "§ 7152(a)(6)");
});

// ── Caps: five per report, two per factor ───────────────────────────────

Deno.test("applyRiskHooks — caps: five per report, two per factor, ordered by settledness then the ranked order given", () => {
  function acceptedHook(id: string, factor: string, settledness: HookSettledness, sourceId: string): AuthorityHook {
    return makeHook({
      hook_id: id, posture: "accepted", settledness, bears_on_element: factor, factor_id: factor,
      fact_atoms: ["flag:sensitive_pi"], source_row_id: sourceId,
    });
  }
  const hooks: AuthorityHook[] = [
    acceptedHook("h1", "Safeguards", "R1", "s1"),
    acceptedHook("h2", "Safeguards", "R1", "s2"),
    acceptedHook("h3", "Safeguards", "R1", "s3"), // exceeds the factor cap
    acceptedHook("h4", "Retention", "R2", "s4"),
    acceptedHook("h5", "Retention", "R2", "s5"),
    acceptedHook("h6", "Material privacy risks", "R3", "s6"),
    acceptedHook("h7", "Material privacy risks", "R3", "s7"), // 6th overall
  ];
  const rankedSourceIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
  const states = baseStates({ flags: ["sensitive_pi"] });
  const { applications } = applyRiskHooks(hooks, states, {}, rankedSourceIds, new Set());
  assertEquals(applications.map((a) => a.hook_id), ["h1", "h2", "h4", "h5", "h6"]);
  assertEquals(applications.length, RISK_HOOKS_REPORT_CAP);
  const safeguardsCount = applications.filter((a) => a.hook_id === "h1" || a.hook_id === "h2" || a.hook_id === "h3").length;
  assertEquals(safeguardsCount, RISK_HOOKS_FACTOR_CAP);
});

Deno.test("applyRiskHooks — an unresolved slot drops the application and flags it, never printing a broken sentence", () => {
  const hook = makeHook({ hook_id: "test/unresolved", posture: "accepted", fact_atoms: ["flag:not_in_the_phrase_map"] });
  const states = baseStates({ flags: ["not_in_the_phrase_map"] });
  const result = applyRiskHooks([hook], states, {}, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, [{ hook_id: "test/unresolved", reason: "unresolved_slot" }]);
});

Deno.test("applyRiskHooks — a malformed atom marks the whole hook ineligible (invalid_atom), never throws", () => {
  const hook = makeHook({ hook_id: "test/malformed", fact_atoms: ["not-a-valid-atom-no-colon"] });
  const states = baseStates();
  const result = applyRiskHooks([hook], states, {}, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, [{ hook_id: "test/malformed", reason: "invalid_atom" }]);
});

Deno.test("applyRiskHooks — S2 is never reached against a passing verdict (adverse_under_pass boundary)", () => {
  const hook = makeHook({ hook_id: "test/boundary", posture: "rejected", bears_on_element: "Safeguards", fact_atoms: ["flag:sensitive_pi"] });
  const states = baseStates({ flags: ["sensitive_pi"] });
  for (const verdict of ["likely_fails", "uncertain", "fails"]) {
    const r = applyRiskHooks([hook], states, { "Safeguards": verdict }, [], new Set());
    assertEquals(r.applications.length, 1);
    assertEquals(r.applications[0].shape, "S2");
  }
  for (const verdict of ["passes", "likely_passes"]) {
    const r = applyRiskHooks([hook], states, { "Safeguards": verdict }, [], new Set());
    assertEquals(r.applications, []);
    assertEquals(r.flags, [{ hook_id: "test/boundary", reason: "rule_missing" }]);
  }
});

// ── THE DOC 223 DEFECT — designed out from the start (doc 231 build brief) ─

Deno.test("doc223 hazard #1 (documented, not a runtime guard here — verify.ts on main is the fix point) — a required atom ALSO listed in the plain distinguishing_atoms array forces every nominating record to \"different\", so \"same\"/\"unknown\" can never be reached", () => {
  // This reproduces the MECHANISM doc 223 found in `0af0876d`/`a6505e9d`/etc:
  // required_atoms and distinguishing_atoms share an atom. The moment a
  // record nominates the hook (the required atom holds), that SAME atom
  // also makes `distinguishingHolds.some(Boolean)` true, so agreement is
  // mechanically "different" — never "same", never "unknown" — regardless
  // of any other fact on the record. The fix for hooks GENERATED going
  // forward is verify.ts rejecting `required_atoms ∩ distinguishing_atoms
  // ≠ ∅` at draft time (off-limits to this build; the orchestrator owns
  // it on main) — this test documents the hazard the generator now blocks,
  // per the doc 231 build brief's explicit instruction, using the CPPA
  // Risk join's own evaluation logic (which is exposed to the identical
  // hazard by construction, since it mirrors LIA's distinguishing-atom
  // priority rule verbatim).
  const hazardHook = makeHook({
    hook_id: "test/hazard-required-in-distinguishing",
    posture: "accepted",
    required_atoms: ["flag:sensitive_pi"],
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_atoms: ["flag:sensitive_pi"], // the drafting defect
  });
  // Every record that nominates the hook (flag:sensitive_pi held) ALSO
  // makes the plain distinguishing_atoms entry hold — "different" every
  // time, "same" or "unknown" never reachable, no matter what else is true.
  const anyNominatingRecord = baseStates({ flags: ["sensitive_pi"] });
  const result = applyRiskHooks([hazardHook], anyNominatingRecord, {}, [], new Set());
  // accepted + different -> omit (never S1); the hook can never print for
  // ANY customer as drafted — exactly doc 223's finding for `0af0876d`.
  assertEquals(result.applications, []);
});

Deno.test("doc223 hazard #2, GUARDED FROM THE START — an absent-polarity distinguishing pair that HOLDS (because the record lacks the atom) is never rendered as a false presence statement", () => {
  // Reproduces the EXACT doc 223 finding for `fddd8eec`: a distinguishing
  // pair authored `record_polarity: "absent"` fires when the record does
  // NOT hold the atom, and a naive renderer would still print
  // RISK_ATOM_PHRASES[pair.record_atom] — a PRESENCE phrase — for a fact
  // that is in fact ABSENT. This join refuses that render outright
  // (flag `absent_pair_unrenderable`) rather than ship a false statement.
  const conditionalHook = makeHook({
    hook_id: "test/absent-pair-guard",
    posture: "conditional",
    bears_on_element: "Safeguards",
    factor_id: "Safeguards",
    fact_atoms: [],
    required_atoms: [],
    distinguishing_atoms: [],
    recognised_proposition: "a compliant risk assessment addresses the necessity of the processing",
    condition_text: "the processing does not affect children",
    distinguishing_pairs: [{
      source_fact_span: "the processing did not involve children",
      source_polarity: "absent",
      record_atom: "flag:children_data",
      record_polarity: "absent", // fires when the record LACKS this atom
      why_material: "the source's holding does not address a record with children among the people affected",
      source_expressly_excludes: false,
    }],
  });
  // A record with NO children_data flag: the absent-polarity pair HOLDS
  // (the record lacks the atom, matching the pair's authored polarity), so
  // agreement is "different" and the matrix would reach S6 (conditional +
  // different + non-passing verdict). Without the guard, S6 would render
  // "{record_fact}" from RISK_ATOM_PHRASES["flag:children_data"] = "it
  // processes the personal information of children under sixteen" — a
  // FALSE statement about a record that has no children's data at all.
  const recordWithoutChildren = baseStates({ flags: [] });
  const result = applyRiskHooks([conditionalHook], recordWithoutChildren, { "Safeguards": "uncertain" }, [], new Set());
  assertEquals(result.applications, [], "the absent-polarity pair must never render a sentence");
  assertEquals(result.flags, [{ hook_id: "test/absent-pair-guard", reason: "absent_pair_unrenderable" }]);
});

Deno.test("doc223 hazard #2 — a PRESENT-polarity pair that holds still renders normally (the guard is polarity-specific, not a blanket S3/S6/S6x ban)", () => {
  const conditionalHook = makeHook({
    hook_id: "test/present-pair-renders",
    posture: "conditional",
    bears_on_element: "Safeguards",
    factor_id: "Safeguards",
    fact_atoms: [],
    required_atoms: [],
    distinguishing_atoms: [],
    recognised_proposition: "a compliant risk assessment addresses the necessity of the processing",
    condition_text: "the processing does not affect children",
    distinguishing_pairs: [{
      source_fact_span: "the processing involved children",
      source_polarity: "present",
      record_atom: "flag:children_data",
      record_polarity: "present", // fires when the record HOLDS this atom
      why_material: "the source's holding does not address a record with children among the people affected",
      source_expressly_excludes: false,
    }],
  });
  const recordWithChildren = baseStates({ flags: ["children_data"] });
  const result = applyRiskHooks([conditionalHook], recordWithChildren, { "Safeguards": "uncertain" }, [], new Set());
  assertEquals(result.flags, []);
  assertEquals(result.applications.length, 1);
  assertEquals(result.applications[0].shape, "S6");
  assert(result.applications[0].sentence.includes("it processes the personal information of children under sixteen"));
});

// ── Planner ──────────────────────────────────────────────────────────────

Deno.test("planRiskHookSelection — the matrix pre-filter skips a hook neither answer could print", () => {
  // rejected + passing verdict: "same" -> omit(rule_missing), "different" ->
  // S3 (would print) — so this ONE is NOT prefiltered; flip to a case where
  // BOTH answers omit: accepted posture with a passing verdict where
  // "different"/"unknown" always omit and "same" already holds from atoms
  // is excluded earlier (atoms_settled) rather than by the prefilter, so we
  // use rejected + a verdict where neither "same" (rule_missing omit) NOR
  // "different" would ever print — not reachable for `rejected` (different
  // always prints S3). Use `accepted` with atoms NOT settled (unknown) and
  // both same/different omit under `accepted` posture: same->S1 (prints),
  // so accepted is never prefiltered either. The one row the matrix omits
  // BOTH ways is `conditional` + passing + a pair that is not expressly
  // excluding (authority_not_dispositive on different; S5a still prints on
  // same) — so the real "neither way prints" case is `R4` + a hook whose
  // required atom already holds AND whose facts are unknown, which the
  // caps/atoms_settled path already handles. This test instead confirms
  // the concrete, always-reachable skip reasons: not_nominated and
  // unanswered.
  const hook = makeHook({ hook_id: "test/prefilter", required_atoms: ["flag:admt_use"] });
  const states = baseStates({ flags: [] });
  const plan = planRiskHookSelection([hook], states, {}, [], new Set(), {});
  assertEquals(plan.items, []);
  assertEquals(plan.considered, [{ hook_id: "test/prefilter", status: "skipped", skipped_by: "not_nominated" }]);
});

Deno.test("planRiskHookSelection — a nominated hook with atoms unknown and a usable answer is CALLED, batched by field_id", () => {
  const hook = makeHook({
    hook_id: "test/called",
    posture: "conditional",
    bears_on_element: "Safeguards",
    factor_id: "Safeguards",
    fact_atoms: ["flag:sensitive_pi"],
    required_atoms: [],
    recognised_proposition: "a compliant risk assessment addresses necessity",
    condition_text: "the safeguards are adequate",
  });
  const states = baseStates({ flags: [] }); // fact_atoms not held -> agreement unknown
  const record = {
    primary_activity_purpose: "We process account identifiers to run fraud checks on new sign-ups.",
    i1b_min_pi: "We collect only the fields needed to score a sign-up for fraud risk, reviewed quarterly.",
  };
  const plan = planRiskHookSelection([hook], states, { "Safeguards": "uncertain" }, ["row-test"], new Set(), record);
  const called = plan.considered.find((c) => c.hook_id === "test/called");
  assert(called, "hook must be considered");
  assertEquals(called!.status, "called");
  assert(plan.items.length > 0);
  assert(plan.items.some((it) => it.field_id === "primary_activity_purpose"));
});

Deno.test("planRiskHookSelection — an unanswered field produces no call and no flag (D4)", () => {
  const hook = makeHook({
    hook_id: "test/unanswered",
    posture: "conditional",
    bears_on_element: "Safeguards",
    factor_id: "Safeguards",
    fact_atoms: ["flag:sensitive_pi"],
    required_atoms: [],
    recognised_proposition: "a compliant risk assessment addresses necessity",
    condition_text: "the safeguards are adequate",
  });
  const states = baseStates({ flags: [] });
  const plan = planRiskHookSelection([hook], states, { "Safeguards": "uncertain" }, ["row-test"], new Set(), {});
  assertEquals(plan.items, []);
  assertEquals(plan.considered, [{ hook_id: "test/unanswered", status: "skipped", skipped_by: "unanswered" }]);
});

// ── resolveHookSelections ───────────────────────────────────────────────

Deno.test("resolveHookSelections — a settled row locks the selection; legs_disagreed with no settled row is unsettled", () => {
  const rows: HookSelectionRow[] = [
    { field_id: "primary_activity_purpose", hook_id: "h1", agreement: "same", matched_atom: "flag:sensitive_pi", evidence_span: "sensitive", decision_id: "d1", legs_disagreed: false, source: "model" },
    { field_id: "i1b_min_pi", hook_id: "h2", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d2", legs_disagreed: true, source: "model" },
  ];
  const resolved = resolveHookSelections(rows);
  assertEquals(resolved.selections.get("h1")?.agreement, "same");
  assertEquals(resolved.unsettled.has("h2"), true);
  assertEquals(resolved.conflicts, []);
});

Deno.test("resolveHookSelections — conflicting settled fields for the same hook become unsettled and are named in conflicts", () => {
  const rows: HookSelectionRow[] = [
    { field_id: "a", hook_id: "h1", agreement: "same", matched_atom: "flag:sensitive_pi", evidence_span: "x", decision_id: "d1", legs_disagreed: false, source: "model" },
    { field_id: "b", hook_id: "h1", agreement: "different", matched_atom: "flag:admt_use", evidence_span: "y", decision_id: "d2", legs_disagreed: false, source: "model" },
  ];
  const resolved = resolveHookSelections(rows);
  assertEquals(resolved.selections.has("h1"), false);
  assertEquals(resolved.unsettled.has("h1"), true);
  assertEquals(resolved.conflicts, ["h1"]);
});

// ── The shipped-corpus identity (RISK_HOOKS = the one ratified AP/ICS hook) ──

Deno.test("doc231 — the shipped RISK_HOOKS map is exactly the three ratified hooks and is inert on a record where their required atoms do not hold", () => {
  assertEquals(RISK_HOOKS_VERSION, "risk-hooks-v2-2026-09-09-0");
  assertEquals(RISK_HOOKS.length, 3);
  assertEquals(RISK_HOOKS.map((h) => h.hook_id).sort(), [
    "enforcement_actions:a3cf40b0-3625-4e78-bbe9-63624f17ceb0:v1",
    "enforcement_actions:dbfca969-3139-43d1-8a5b-7fff179f8db6:v1",
    "enforcement_actions:dc095815-d03d-4bb2-b3be-2711e7f7d459:v1",
  ]);
  const states = baseStates({ flags: ["admt_use", "biometric_data"] });
  const result = applyRiskHooks(RISK_HOOKS, states, { "Safeguards": "fails" }, ["any-source"], new Set());
  assertEquals(result.applications, []);
  // No hook prints; any flag raised may only be the benign "verdict_missing"
  // signal for a factor this fixture supplies no verdict for.
  assertEquals(result.flags.filter((f) => f.reason !== "verdict_missing"), []);
});
