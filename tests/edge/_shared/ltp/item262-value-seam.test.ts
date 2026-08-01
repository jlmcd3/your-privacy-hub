// ITEM 262 — value/display seam + label-residue assert.
//
// (a) Composer sites read the intake VALUE, not the field LABEL:
//     entity mentions render "ClearPath Credit Solutions", and the
//     q18/q5b predicates fire on value semantics so the ADMT
//     inapplicability explanation is emitted.
// (b) The harness-side residue check hard-fails on the ramp-1
//     attempt-6 literal ("On entity name's record") and passes clean.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  ADMT_INAPPLICABILITY_EXPLANATION,
  composeRecordSufficiencyForTest,
  composeSection,
} from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { evaluateLabelResidue } from "../../../../supabase/functions/_shared/ltp/replay/substance-gates.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

function ledger(field: string, value: string, display: string) {
  return { ledger_id: `L.${field}`, intake_field: field, value, display };
}

const PLAN: RenderPlan = {
  plan_version: "v1",
  product: "cppa-risk-assessment",
  build_stamp: "item262-value-seam-test",
  jurisdiction_tag: "cppa-ca",
  intake_ledger: [
    // NOTE: `.display` deliberately carries the FIELD LABEL (Item 243
    // defect 1(d) semantics). Composers must read `.value`.
    ledger("entity_name", "ClearPath Credit Solutions", "entity name"),
    ledger("q18_admt_use", "No", "use of automated decisionmaking technology"),
    ledger("q5b_profiling", "Yes", "profiling for behavioral advertising"),
    ledger("i1_processing_purpose", "credit decisioning support", "stated processing purpose"),
  ],
  citation_bindings: [],
  propositions: [],
  factor_table: [],
  weighing_frame: [],
  gate_outcomes: [],
  conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
} as unknown as RenderPlan;

Deno.test("item262 (a) — entity slots render the intake VALUE, never the field label", () => {
  const instances = composeRecordSufficiencyForTest(PLAN);
  const entities = instances
    .map((i) => String((i.ctx as Record<string, unknown>).entity_name ?? ""))
    .filter(Boolean);
  assert(entities.length >= 1, "expected at least one entity_name slot");
  for (const e of entities) {
    assertEquals(e, "ClearPath Credit Solutions");
  }
});

Deno.test("item262 (a) — q18No + q5b affirmative emit the ADMT inapplicability explanation", () => {
  const instances = composeRecordSufficiencyForTest(PLAN);
  const hit = instances.some(
    (i) =>
      String((i.ctx as Record<string, unknown>).element_status_clause ?? "") ===
        ADMT_INAPPLICABILITY_EXPLANATION,
  );
  assert(hit, "ADMT inapplicability explanation missing — value predicates did not fire");
});

Deno.test("item262 (a) — composeSection('record_sufficiency') carries no label residue", () => {
  const out = composeSection("record_sufficiency", PLAN) ?? [];
  const { matches } = evaluateLabelResidue({ sections: out });
  assertEquals(matches, []);
});

Deno.test("item262 (b) — residue check hard-fails on the attempt-6 literal", () => {
  const bad = { body: "On entity name's record, the assessment documents the purpose." };
  const r = evaluateLabelResidue(bad);
  assert(r.failures.includes("label_residue:entity name"), JSON.stringify(r));
});

Deno.test("item262 (b) — residue check flags possessive display labels", () => {
  const bad = { body: "The retention period's basis is stated." };
  const r = evaluateLabelResidue(bad);
  assert(
    r.failures.includes("label_residue:retention period's"),
    JSON.stringify(r),
  );
});

Deno.test("item262 (b) — clean report passes", () => {
  const ok = {
    body: "On ClearPath Credit Solutions's record, the assessment documents the purpose.",
  };
  assertEquals(evaluateLabelResidue(ok).failures, []);
});
