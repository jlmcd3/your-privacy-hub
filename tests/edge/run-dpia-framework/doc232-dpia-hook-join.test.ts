// DOC 232 — the DPIA hook join (dpia-hook-join.ts), adapted from LIA's own
// doc213-hook-join.test.ts. `directionFor`/`hook-types.ts` is SHARED,
// product-agnostic code already exhaustively tested by LIA's own suite — this
// file does not re-test that matrix; it tests DPIA'S OWN WIRING: the
// element/section mapping, the planner, the resolver, the caps, and —
// CRITICALLY — the doc 223 absent-polarity guard this build designs out
// from day one, plus a documentation test of the doc 223 required-atom-in-
// distinguishing-atoms hazard (upstream fix out of scope; this test proves
// the join's OWN behaviour at that hazard is the same protective "different
// wins" LIA's join already exhibits, not a NEW defect).

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import {
  applyDpiaHooks,
  DPIA_HOOKS_ELEMENT_CAP,
  DPIA_HOOKS_REPORT_CAP,
  DPIA_SELECTION_COMMON_FIELD,
  DPIA_SELECTION_FIELDS_BY_ELEMENT,
  planDpiaHookSelection,
  resolveDpiaHookSelections,
  type DpiaHookSelectionRow,
} from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts";

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: ["class:employee_monitoring"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "systematic monitoring of employee internet usage requires a DPIA",
    fact_pattern_paraphrase: "a controller systematically monitors employee internet usage",
    finding_paraphrase: "the processing required a data protection impact assessment",
    settledness: "R3",
    posture: "rejected",
    factor_id: "the employee-monitoring trigger",
    bears_on_element: "obligation",
    authority_label: "Test SA, Test Matter, decision of 1 January 2024",
    regulator: "Test SA",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["the employee-monitoring trigger"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    ...overrides,
  };
}

function makeStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "EU GDPR",
    use_case_class: "employee_monitoring",
    relationship: "employee",
    data_categories: [],
    flags: [],
    verdicts: { obligation: "fails", adequacy: "uncertain" },
    states: {},
    ...overrides,
  };
}

// ── DPIA-specific element/section wiring ────────────────────────────────

Deno.test("doc232 — DPIA_SELECTION_FIELDS_BY_ELEMENT is derived from field-labels.ts and excludes the common field", () => {
  assertExists(DPIA_SELECTION_FIELDS_BY_ELEMENT.obligation);
  assertExists(DPIA_SELECTION_FIELDS_BY_ELEMENT.adequacy);
  for (const list of [DPIA_SELECTION_FIELDS_BY_ELEMENT.obligation, DPIA_SELECTION_FIELDS_BY_ELEMENT.adequacy]) {
    assertEquals(list.includes(DPIA_SELECTION_COMMON_FIELD), false);
  }
  // necessity_proportionality is doc 230 §2's flagship adequacy field.
  assertEquals(DPIA_SELECTION_FIELDS_BY_ELEMENT.adequacy.includes("necessity_proportionality"), true);
});

// ── applyDpiaHooks — core matrix wiring through DPIA's own hooks/shapes ──

Deno.test("doc232 — accepted + same renders S1", () => {
  const hook = makeHook({
    hook_id: "h1",
    posture: "accepted",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
  });
  const states = makeStates();
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(flags, []);
  assertEquals(applications.length, 1);
  assertEquals(applications[0].shape, "S1");
  assertEquals(applications[0].sentence.includes("{"), false);
});

Deno.test("doc232 — rejected + same + failing (non-passing) verdict renders S2", () => {
  const hook = makeHook({
    hook_id: "h2",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
  });
  const states = makeStates({ verdicts: { obligation: "uncertain", adequacy: "uncertain" } });
  const { applications } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications.length, 1);
  assertEquals(applications[0].shape, "S2");
});

Deno.test("doc232 — rejected + same + passing verdict is the lawyer's rule: omit + rule_missing, never printed", () => {
  const hook = makeHook({
    hook_id: "h3",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
  });
  const states = makeStates({ verdicts: { obligation: "passes", adequacy: "uncertain" } });
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications, []);
  assertEquals(flags, [{ hook_id: "h3", reason: "rule_missing" }]);
});

Deno.test("doc232 — rejected + different, from a PRESENT-polarity pair, renders S3", () => {
  const hook = makeHook({
    hook_id: "h4",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
    distinguishing_pairs: [
      {
        source_fact_span: "no opt-out or notice was given to employees",
        source_polarity: "absent",
        record_atom: "flag:automated_decision",
        record_polarity: "present",
        why_material: "an automated-decision element distinguishes the record from the source",
        source_expressly_excludes: false,
      },
    ],
  });
  const states = makeStates({ flags: ["automated_decision"], verdicts: { obligation: "uncertain", adequacy: "uncertain" } });
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(flags, []);
  assertEquals(applications.length, 1);
  assertEquals(applications[0].shape, "S3");
  assertEquals(applications[0].sentence.includes("automated decision-making"), true);
});

// ── DOC 223 DEFECT #2 — THE ABSENT-POLARITY GUARD ───────────────────────

Deno.test("doc232 — ABSENT-POLARITY GUARD: S3 never renders from a pair whose record_polarity is absent (doc 223 defect #2)", () => {
  // The pair fires because `flag:children` is FALSE on the record (absent
  // polarity) — LIA_ATOM_PHRASES/DPIA_ATOM_PHRASES only has the PRESENCE
  // phrase for "flag:children" ("children are among the people affected"),
  // so printing it here would state something FALSE about this record.
  const hook = makeHook({
    hook_id: "h5",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
    distinguishing_pairs: [
      {
        source_fact_span: "children were among the people affected",
        source_polarity: "present",
        record_atom: "flag:children",
        record_polarity: "absent",
        why_material: "absence of children distinguishes the record from the source",
        source_expressly_excludes: false,
      },
    ],
  });
  const states = makeStates({ flags: [], verdicts: { obligation: "uncertain", adequacy: "uncertain" } }); // children flag NOT set -> pair holds (absent polarity)
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications, [], "an absent-polarity pair must never render a sentence");
  assertEquals(flags, [{ hook_id: "h5", reason: "absent_pair_unrenderable" }]);
});

Deno.test("doc232 — ABSENT-POLARITY GUARD also applies to S6/S6x (conditional posture)", () => {
  const hook = makeHook({
    hook_id: "h6",
    posture: "conditional",
    bears_on_element: "adequacy",
    factor_id: "the necessity and proportionality analysis",
    required_atoms: ["flag:biometric"],
    fact_atoms: [],
    recognised_proposition: "biometric processing may in principle satisfy necessity and proportionality",
    condition_text: "a structured suitability, necessity and proportionality analysis is documented",
    condition_atoms: null,
    distinguishing_pairs: [
      {
        source_fact_span: "no structured necessity analysis was documented",
        source_polarity: "absent",
        record_atom: "flag:large_scale",
        record_polarity: "absent",
        why_material: "absence of large-scale processing distinguishes the record",
        source_expressly_excludes: false,
      },
    ],
  });
  const states = makeStates({ flags: ["biometric"], verdicts: { obligation: "uncertain", adequacy: "fails" } });
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications, []);
  assertEquals(flags, [{ hook_id: "h6", reason: "absent_pair_unrenderable" }]);
});

// ── DOC 223 DEFECT #1 — DOCUMENTED (not re-fixed here; upstream in verify.ts) ──

Deno.test("doc232 — DOCUMENTED HAZARD: a required atom also listed in distinguishing_atoms can never reach same/unknown", () => {
  // This reproduces doc 223's finding #1 at the JOIN layer: `verify.ts`
  // (offline generator, out of scope for this build) is where the real fix
  // belongs — rejecting a draft whose required_atoms intersect
  // distinguishing_atoms before it is ever ratified. This test documents
  // that the JOIN's own behaviour at that hazard is the SAME protective
  // "a distinguishing atom always wins" rule it applies to a well-formed
  // hook — not a second, DPIA-specific defect.
  const hook = makeHook({
    hook_id: "h7",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: ["class:employee_monitoring"],
    distinguishing_atoms: ["class:employee_monitoring"], // drafting defect: required atom duplicated here
  });
  for (const flagsSet of [[], ["large_scale"]]) {
    const states = makeStates({ flags: flagsSet, verdicts: { obligation: "uncertain", adequacy: "uncertain" } });
    const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["row-test"], new Set());
    // Every customer who could ever nominate this hook (required_atoms all
    // hold) mechanically registers "different" — S3 needs a pair (there is
    // none), so it drops with s3_missing_distinguishing_atom, NEVER prints,
    // and NEVER reaches "same" (which would need allFacts && !anyDistinguishing).
    assertEquals(applications, []);
    assertEquals(flags, [{ hook_id: "h7", reason: "s3_missing_distinguishing_atom" }]);
  }
});

// ── conditional posture — S5a / S5b ──────────────────────────────────────

Deno.test("doc232 — conditional + same + condition held + passing renders S5b; otherwise S5a", () => {
  const hook = makeHook({
    hook_id: "h8",
    posture: "conditional",
    bears_on_element: "adequacy",
    factor_id: "the necessity and proportionality analysis",
    required_atoms: ["flag:biometric"],
    fact_atoms: ["flag:biometric"],
    recognised_proposition: "biometric processing may in principle satisfy necessity and proportionality",
    condition_text: "a structured suitability, necessity and proportionality analysis is documented",
    condition_atoms: ["flag:large_scale"],
  });
  const held = makeStates({ flags: ["biometric", "large_scale"], verdicts: { obligation: "uncertain", adequacy: "passes" } });
  const { applications: a1 } = applyDpiaHooks([hook], held, held.verdicts, ["row-test"], new Set());
  assertEquals(a1[0]?.shape, "S5b");

  const notHeld = makeStates({ flags: ["biometric"], verdicts: { obligation: "uncertain", adequacy: "passes" } });
  const { applications: a2 } = applyDpiaHooks([hook], notHeld, notHeld.verdicts, ["row-test"], new Set());
  assertEquals(a2[0]?.shape, "S5a");
});

// ── suppression (doc 230 decision 5) ────────────────────────────────────

Deno.test("doc232 — a hook whose source_row_id is determinative is suppressed silently", () => {
  const hook = makeHook({ hook_id: "h9", source_row_id: "suppressed-row", required_atoms: [], fact_atoms: ["class:employee_monitoring"] });
  const states = makeStates();
  const { applications, flags } = applyDpiaHooks([hook], states, states.verdicts, ["suppressed-row"], new Set(["suppressed-row"]));
  assertEquals(applications, []);
  assertEquals(flags, []);
});

// ── caps ──────────────────────────────────────────────────────────────

Deno.test("doc232 — element cap and report cap are enforced", () => {
  const hooks: AuthorityHook[] = [];
  for (let i = 0; i < 3; i++) {
    hooks.push(makeHook({
      hook_id: `obl-${i}`,
      source_row_id: `row-obl-${i}`,
      bears_on_element: "obligation",
      posture: "accepted",
      required_atoms: [],
      fact_atoms: ["class:employee_monitoring"],
      settledness: "R1",
    }));
  }
  for (let i = 0; i < 3; i++) {
    hooks.push(makeHook({
      hook_id: `adq-${i}`,
      source_row_id: `row-adq-${i}`,
      bears_on_element: "adequacy",
      factor_id: "the necessity and proportionality analysis",
      posture: "accepted",
      required_atoms: [],
      fact_atoms: ["class:employee_monitoring"],
      settledness: "R1",
    }));
  }
  const states = makeStates();
  const ranked = hooks.map((h) => h.source_row_id);
  const { applications } = applyDpiaHooks(hooks, states, states.verdicts, ranked, new Set());
  assertEquals(applications.length <= DPIA_HOOKS_REPORT_CAP, true);
  const byElement = new Map<string, number>();
  for (const a of applications) {
    const h = hooks.find((x) => x.hook_id === a.hook_id)!;
    byElement.set(h.bears_on_element, (byElement.get(h.bears_on_element) ?? 0) + 1);
  }
  for (const count of byElement.values()) assertEquals(count <= DPIA_HOOKS_ELEMENT_CAP, true);
});

// ── planner ───────────────────────────────────────────────────────────

Deno.test("doc232 — planDpiaHookSelection skips a hook with no usable answer (D4) and never plans on empty text", () => {
  const hook = makeHook({
    hook_id: "h10",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: [], // ensures agreement stays "unknown" so the hook is a planner candidate
  });
  const states = makeStates({ verdicts: { obligation: "uncertain", adequacy: "uncertain" } });
  const record: Record<string, unknown> = { description: "" }; // unanswered
  const plan = planDpiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), record);
  assertEquals(plan.items, []);
  const considered = plan.considered.find((c) => c.hook_id === "h10");
  assertEquals(considered?.status, "skipped");
  assertEquals(considered?.skipped_by, "unanswered");
});

Deno.test("doc232 — planDpiaHookSelection batches one item per field across candidate hooks", () => {
  const hook = makeHook({
    hook_id: "h11",
    posture: "rejected",
    required_atoms: ["class:employee_monitoring"],
    fact_atoms: [],
  });
  const states = makeStates({ verdicts: { obligation: "uncertain", adequacy: "uncertain" } });
  const record: Record<string, unknown> = {
    description: "A description long enough to be a usable free-text answer for the planner to read.",
  };
  const plan = planDpiaHookSelection([hook], states, states.verdicts, ["row-test"], new Set(), record);
  assertEquals(plan.items.length, 1);
  assertEquals(plan.items[0].field_id, "description");
  assertEquals(plan.items[0].candidates.length, 1);
  assertEquals(plan.items[0].candidates[0].hook_id, "h11");
  const considered = plan.considered.find((c) => c.hook_id === "h11");
  assertEquals(considered?.status, "called");
});

// ── resolver ──────────────────────────────────────────────────────────

Deno.test("doc232 — resolveDpiaHookSelections locks a settled row and flags a real conflict as unsettled", () => {
  const rows: DpiaHookSelectionRow[] = [
    { field_id: "description", hook_id: "hA", agreement: "same", matched_atom: "class:employee_monitoring", evidence_span: "monitors employee internet usage", decision_id: "d1", legs_disagreed: false, source: "model" },
    { field_id: "description", hook_id: "hB", agreement: "same", matched_atom: "class:employee_monitoring", evidence_span: "x", decision_id: "d2", legs_disagreed: false, source: "model" },
    { field_id: "purpose", hook_id: "hB", agreement: "different", matched_atom: "flag:children", evidence_span: "y", decision_id: "d3", legs_disagreed: false, source: "model" },
  ];
  const resolved = resolveDpiaHookSelections(rows);
  assertEquals(resolved.selections.has("hA"), true);
  assertEquals(resolved.selections.has("hB"), false);
  assertEquals(resolved.unsettled.has("hB"), true);
  assertEquals(resolved.conflicts, ["hB"]);
});

Deno.test("doc232 — resolveDpiaHookSelections marks a disagreed-only hook unsettled", () => {
  const rows: DpiaHookSelectionRow[] = [
    { field_id: "description", hook_id: "hC", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d4", legs_disagreed: true, source: "model" },
  ];
  const resolved = resolveDpiaHookSelections(rows);
  assertEquals(resolved.selections.has("hC"), false);
  assertEquals(resolved.unsettled.has("hC"), true);
});

// ── zero-hooks purity (part of the zero-call regression guarantee) ─────

Deno.test("doc232 — applyDpiaHooks/planDpiaHookSelection are no-ops over an empty hook list", () => {
  const states = makeStates();
  const { applications, flags } = applyDpiaHooks([], states, states.verdicts, [], new Set());
  assertEquals(applications, []);
  assertEquals(flags, []);
  const plan = planDpiaHookSelection([], states, states.verdicts, [], new Set(), {});
  assertEquals(plan.items, []);
  assertEquals(plan.considered, []);
});
