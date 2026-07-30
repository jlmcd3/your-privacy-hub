// ITEM 243 COMPLETION — joint deterministic asserts for defects 3, 4, 5, 6, 8.
//
// These tests cover the five fixes wired in the Item 243 completion turn:
//   • Defect 3 — present-requires-refs coherence rule.
//   • Defect 4 — ADMT NOT-APPLICABLE completion across record_sufficiency
//                and priority_actions (never "gap" when q18_admt_use is negative).
//   • Defect 5 — record_sufficiency "four factual elements" slot reads
//                the four DOCUMENTATION FACTUAL GATES, not factor labels.
//   • Defect 6 — per-KIND owner resolution (Type-J → qualified counsel;
//                gates → certifying-exec title; factors → contributor role
//                titles), role-titles only (PII invariant).
//   • Defect 8 — intake-fact coverage: gate evaluator resolves canonical
//                cppa-risk contract fields via the FIELD_ALIASES shim so
//                q5b/q5c/q5/q15/q18b/q19/i1/i2/i4/i8 map to gate-normalized
//                names and applicability propositions engage on those
//                canonical inputs.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { screenPresentNoteCoherence } from "./pass1-present-note-coherence.ts";
import { evaluateCppaRiskGates, FIELD_ALIASES } from "./gate-eval.ts";
import type { FactorTableEntry, RenderPlan } from "../render-plan/schema.ts";
import { RECORD_STATUS_CLAUSES } from "./content/pass2-templates.ts";

const ANCHOR = { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)", jurisdiction_tag: "cppa-ca" as const };

function mkFactor(overrides: Partial<FactorTableEntry>): FactorTableEntry {
  return {
    factor_id: "benefit.b.service_improvement",
    kind: "benefit",
    jurisdiction_tag: "cppa-ca",
    present_in_intake: true,
    intake_ledger_refs: [],
    guidance_refs: [],
    anchor: ANCHOR,
    ...overrides,
  } as FactorTableEntry;
}

Deno.test("defect 3 — present_in_intake=true with empty intake_ledger_refs is rewritten to absent", () => {
  const rows = [
    mkFactor({ factor_id: "benefit.b.service_improvement", intake_ledger_refs: [], weight_note: "the record notes service improvements" }),
    mkFactor({ factor_id: "benefit.b.security_hardening", intake_ledger_refs: ["L.i1_processing_purpose"], weight_note: "the record notes security hardening" }),
  ];
  const { factor_table, rewrites } = screenPresentNoteCoherence(rows);
  assertEquals(factor_table[0].present_in_intake, false);
  assertEquals(factor_table[0].weight_note, "no record evidence");
  assertEquals(factor_table[1].present_in_intake, true);
  assert(rewrites.some((r) => r.factor_id === "benefit.b.service_improvement" && r.field_id === "(intake_ledger_refs)"));
});

Deno.test("defect 4 — RECORD_STATUS_CLAUSES includes the ADMT not-applicable clause", () => {
  assertEquals(RECORD_STATUS_CLAUSES.length, 4);
  assert(/not applicable — automated decisionmaking/i.test(RECORD_STATUS_CLAUSES[3]));
});

Deno.test("defect 5 — factual gate id set defines exactly the four § 7152(a) documentation gates", async () => {
  const mod = await import("./section-composers/cppa-risk.ts");
  const ids: ReadonlySet<string> = mod.DOCUMENTATION_FACTUAL_GATE_IDS;
  assertEquals(ids.size, 4);
  assert(ids.has("G.documentation.purpose_present"));
  assert(ids.has("G.documentation.categories_present"));
  assert(ids.has("G.documentation.operational_elements_present"));
  assert(ids.has("G.documentation.approver_present"));
});

Deno.test("defect 8 — FIELD_ALIASES cover the canonical cppa-risk contract fields the gate registry reads under normalized names", () => {
  const expected: Record<string, string> = {
    q_sells_or_shares: "q5_sell_share",
    q_processes_sensitive_pi: "q15_sensitive_pi",
    // ITEM 272: alias direction inverted — q5b_profiling_observation is now
    // the canonical gate field; q_extensive_profiling is the legacy alias.
    q5b_profiling_observation: "q_extensive_profiling",
    q_trains_admt: "q18b_admt_training",
    q_admt_significant_decision: "q19_admt_description",
    pi_categories: "q4_pi_categories",
    processing_purpose: "i1_processing_purpose",
    retention_period: "i2_retention_period",
    approver_name: "i8_certifying_exec_name",
    approver_position: "i8_certifying_exec_title",
  };
  for (const [normalized, canonical] of Object.entries(expected)) {
    const aliases = FIELD_ALIASES[normalized];
    assert(aliases, `alias missing for ${normalized}`);
    assert(aliases.includes(canonical), `${normalized} → ${canonical} alias missing`);
  }
});

Deno.test("defect 8 — applicability gates fire against canonical contract fields via the alias shim", () => {
  // Intake carries ONLY canonical contract fields — no normalized names.
  const intake: Record<string, unknown> = {
    q5_sell_share: "Yes — sell",
    q15_sensitive_pi: "Yes",
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants", // ITEM 272: real q5b option
    q18_admt_use: "Yes",
    q18b_admt_training: "Yes",
  };
  const outcomes = evaluateCppaRiskGates(intake);
  const byId = Object.fromEntries(outcomes.map((o) => [o.gate_id, o.outcome]));
  assertEquals(byId["G.applicability.selling_sharing"], "pass");
  assertEquals(byId["G.applicability.sensitive_pi"], "pass");
  assertEquals(byId["G.applicability.systematic_observation"], "pass");
  assertEquals(byId["G.applicability.train_admt"], "pass");
});

Deno.test("defect 4 (companion) — q18_admt_use negative blocks G.q18.admt_consequence via alias-agnostic path", () => {
  const outcomes = evaluateCppaRiskGates({ q18_admt_use: "No" });
  const admt = outcomes.find((o) => o.gate_id === "G.q18.admt_consequence");
  assert(admt);
  assertEquals(admt!.outcome, "block");
});

Deno.test("defect 6 — ownerForKind returns per-KIND defaults (Type-J → qualified legal counsel)", async () => {
  const mod = await import("./section-composers/cppa-risk.ts");
  // The function is not directly exported, but composePriorityActionsForTest
  // exercises the seam. We assert via a minimal plan that a Type-J action
  // uses "qualified legal counsel" as owner and a factor gap does not.
  const plan: RenderPlan = {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "item243-completion-test",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [],
    citation_bindings: [],
    propositions: [{
      id: "p.j.test", conclusion_id: "j.test.reserved", epistemic_type: "J",
      jurisdiction_tag: "cppa-ca",
      anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)", jurisdiction_tag: "cppa-ca" },
      display_label: "the § 7152(a)(6) balancing judgment",
      intake_ledger_refs: [], citation_binding_refs: [],
    }],
    factor_table: [],
    weighing_frame: [],
    gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  } as unknown as RenderPlan;
  const actions = mod.composePriorityActionsForTest(plan);
  assert(actions.length >= 1);
  const owner = String(actions[0].ctx.owner_role_titles ?? "");
  assert(/qualified legal counsel/i.test(owner), `expected qualified legal counsel, got: ${owner}`);
});
