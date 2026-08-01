// ITEM 266 — activity-rationale de-duplication.
//
// (1) A multi-activity plan yields exactly ONE consolidated rationale item
//     (plus the LIA line) — no cloned per-activity items.
// (2) evaluateSectionDuplication flags byte-identical / whitespace-identical
//     list items and passes on distinct items.
// (3) The GTM grader classifies section_duplication as logged/non-material
//     under the DRAFT register.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { composeSection } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { evaluateSectionDuplication } from "../../../../supabase/functions/_shared/ltp/replay/substance-gates.ts";
import { evaluateGtm } from "../../../../supabase/functions/replay-cppa-risk-harness/_local/ltp/replay/gtm-grader.ts";
import type { PerDocResult } from "../../../../supabase/functions/_shared/ltp/replay/types.ts";
import type { RenderPlan, FactorTableEntry } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

function factor(
  id: string,
  kind: FactorTableEntry["kind"],
  label: string,
  note: string,
): FactorTableEntry {
  return {
    factor_id: id,
    kind,
    jurisdiction_tag: "cppa-ca",
    present_in_intake: true,
    intake_ledger_refs: ["L.entity_name"],
    guidance_refs: [],
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    display_label: label,
    weight_note: note,
  } as unknown as FactorTableEntry;
}

const MULTI_PLAN: RenderPlan = {
  plan_version: "v1",
  product: "cppa-risk-assessment",
  build_stamp: "item266-test",
  jurisdiction_tag: "cppa-ca",
  intake_ledger: [
    { ledger_id: "L.entity_name", intake_field: "entity_name", value: "ClearPath Credit Solutions", display: "entity name" },
    { ledger_id: "L.i1b_min_pi", intake_field: "i1b_min_pi", value: "collection limited to income and identity fields", display: "minimum personal information" },
  ],
  citation_bindings: [{ pinpoint_ref: "PINPOINT_7152A", pinpoint: "11 CCR § 7152(a)" }],
  propositions: [
    {
      proposition_id: "P.appl.1",
      conclusion_id: "r.applicability.selling_sharing",
      epistemic_type: "R",
      polarity: "positive",
      display_label: "selling or sharing personal information",
    },
    {
      proposition_id: "P.appl.2",
      conclusion_id: "r.applicability.sensitive_pi",
      epistemic_type: "R",
      polarity: "positive",
      display_label: "processing sensitive personal information",
    },
    {
      proposition_id: "P.appl.3",
      conclusion_id: "r.applicability.profiling",
      epistemic_type: "R",
      polarity: "positive",
      display_label: "profiling in a work or educational context",
    },
  ],
  factor_table: [
    factor("f.b1", "benefit", "Fraud reduction", "The record states a 31% reduction in disputed transactions since deployment"),
    factor("f.n1", "negative_impact", "Loss of consumer control", "The record states consumers are not offered an opt-out of the scoring activity"),
    factor("f.s1", "safeguard", "Retention limitation", "The record states scoring inputs are deleted after 30 days"),
  ],
  weighing_frame: [],
  gate_outcomes: [
    { gate_id: "G.documentation.purpose_present", outcome: "pass" },
    { gate_id: "G.documentation.categories_present", outcome: "pass" },
    { gate_id: "G.documentation.operational_elements_present", outcome: "pass" },
    { gate_id: "G.documentation.approver_present", outcome: "pass" },
  ],
  conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
} as unknown as RenderPlan;

Deno.test("item266 — multi-activity plan yields ONE consolidated rationale item (plus LIA line)", () => {
  const out = composeSection("risk_assessment_by_activity", MULTI_PLAN) ?? [];
  const rationales = out.filter((i) => Array.isArray(i.parts) && i.parts!.length > 0);
  assertEquals(rationales.length, 1);
  assertEquals(out.length, 2);
  assert(!out[1].parts, "LIA line must remain its own single-template item");
});

Deno.test("item266 — the consolidated item enumerates every engaged activity", () => {
  const out = composeSection("risk_assessment_by_activity", MULTI_PLAN) ?? [];
  const label = String((out[0].ctx as Record<string, unknown>).activity_label ?? "");
  assert(label.includes("selling or sharing personal information"), label);
  assert(label.includes("processing sensitive personal information"), label);
  assert(label.includes("profiling in a work or educational context"), label);
});

Deno.test("item266 — duplication detector flags byte-identical list items", () => {
  const r = evaluateSectionDuplication({
    risk_assessment_by_activity: ["Identical body.", "Identical body.", "Distinct body."],
  });
  assertEquals(r.failures, ["section_duplication:risk_assessment_by_activity:0=1"]);
});

Deno.test("item266 — duplication detector flags whitespace-normalized duplicates", () => {
  const r = evaluateSectionDuplication({
    priority_actions: ["A  body   here.", "A body here."],
  });
  assertEquals(r.failures, ["section_duplication:priority_actions:0=1"]);
});

Deno.test("item266 — duplication detector passes on distinct items", () => {
  const r = evaluateSectionDuplication({
    priority_actions: ["One.", "Two.", "Three."],
    executive_summary: "not a list",
  });
  assertEquals(r.failures, []);
});

Deno.test("item266 — GTM classifies section_duplication as logged (non-material, DRAFT)", () => {
  const perDoc: PerDocResult = {
    doc_id: "d266",
    provider_kind: "model",
    pass1_telemetry_summary: { ok: true, attempts: 1, write_around: false, grounded_note_replacement_rate: 0 },
    substance: {
      presence_rate: 0.5,
      present_factor_count: 3,
      factors_with_ledger_refs: 3,
      note_token_diversity: 20,
      action_kind_diversity_ok: true,
      golden_shape: { review_flag: false, shortfall_keys: [] },
    },
    structure: { sections_emitted: 9, sections_omitted_by_class: {} },
    hard_failures: ["section_duplication:risk_assessment_by_activity:0=1"],
  };
  const r = evaluateGtm(perDoc);
  assertEquals(r.verdict, "release_with_logged_defects");
  assertEquals(r.logged_defects, ["section_duplication:risk_assessment_by_activity:0=1"]);
  assertEquals(r.material_defects.length, 0);
});
