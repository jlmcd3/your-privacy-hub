// ITEM 383 LEG 1 — LIA perfect fixture + registry/variant wiring + gate shape.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";
import { PERFECT_BY_TOOL, casesForVariant, intakesForVariant, GOLDEN_BY_TOOL } from "../../../supabase/functions/_shared/golden/registry.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import {
  emptyAskedKeys,
  computeRecordComplete,
  classifyPlaceholders,
  attachRecordComplete,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { REFERENCE_RENDER_TOKENS } from "../../../supabase/functions/_shared/prose/plans/lia.spine.ts";

const INTAKE = LIA_PERFECT[0].intake as Record<string, unknown>;

Deno.test("fixture: exactly one perfect LIA case, UK jurisdiction", () => {
  assertEquals(LIA_PERFECT.length, 1);
  assertEquals(INTAKE.jurisdictions, ["United Kingdom (UK GDPR)"]);
});

Deno.test("fixture: zero empty ASKED keys under live item380r5 semantics", () => {
  const empties = emptyAskedKeys(liAssessmentStageBContract, INTAKE);
  assertEquals(empties, [], `empty asked keys: ${empties.join(", ")}`);
});

Deno.test("fixture: sufficiency lint — narrative fields are meaningful, no placeholder tokens", () => {
  const NARRATIVE_MIN = 60;
  const bad: string[] = [];
  for (const f of liAssessmentStageBContract.fields) {
    if (f.kind !== "narrative") continue;
    const v = f.key.split(".").reduce<unknown>((acc, seg) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[seg] : undefined), INTAKE);
    if (typeof v !== "string") continue; // branch-gated nulls handled by the gate test
    if (v.trim().length < NARRATIVE_MIN) bad.push(`${f.key} (${v.trim().length} chars)`);
  }
  assertEquals(bad, [], `thin narrative fields: ${bad.join(", ")}`);

  const blob = JSON.stringify(INTAKE);
  for (const tok of ["TBD", "TODO", "[TO COMPLETE", "[TO BE", "PLACEHOLDER", "lorem ipsum", "XXX", "N/A"]) {
    assert(!blob.toUpperCase().includes(tok.toUpperCase()), `placeholder token present: ${tok}`);
  }
});

Deno.test("fixture: carries no reference-render token (item382 fact-exempt rule)", () => {
  const blob = JSON.stringify(INTAKE).toLowerCase();
  for (const tok of REFERENCE_RENDER_TOKENS) {
    assert(!blob.includes(String(tok).toLowerCase()), `reference-render token leaked into fixture: ${tok}`);
  }
});

Deno.test("registry: PERFECT_BY_TOOL + casesForVariant wiring for lia", () => {
  assertEquals(PERFECT_BY_TOOL["lia"], LIA_PERFECT);
  assertEquals(casesForVariant("lia", "perfect"), LIA_PERFECT);
  assertEquals(intakesForVariant("lia", "perfect"), [INTAKE]);
  // Legacy paths unchanged.
  assertEquals(casesForVariant("lia", null), GOLDEN_BY_TOOL["lia"]);
  assertEquals(casesForVariant("lia", "messy"), []);
});

Deno.test("gate: lia is in the product union with an empty false-absence list", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["lia"], []);
});

Deno.test("gate: fail-closed shape on the perfect fixture (no coverage, no CSC)", () => {
  const t = computeRecordComplete({
    product: "lia",
    contract: liAssessmentStageBContract,
    intake: INTAKE,
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assertEquals(t.counts.empty_required_keys, 0);
  assert(!t.failed_conditions.includes("contract_incomplete"));
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
  assertEquals(t.product, "lia");
});

Deno.test("output-neutrality: the gate touches only _meta.internal", () => {
  const doc: Record<string, unknown> = {
    executive_summary: "The interest carries the processing.",
    information_needed: [{ question: "Confirm the quarterly held-order review is scheduled." }],
    sections: [{ id: "the-balance", body: "The balance falls in favour of the processing." }],
    _meta: { internal: { lia_pipeline_stamp: "x" } },
  };
  const before = JSON.stringify({ ...doc, _meta: undefined });
  const t = computeRecordComplete({ product: "lia", contract: liAssessmentStageBContract, intake: INTAKE });
  const c = classifyPlaceholders(doc, INTAKE, t.value);
  attachRecordComplete(doc, t, c);
  const after = JSON.stringify({ ...doc, _meta: undefined });
  assertEquals(after, before, "gate mutated customer-visible prose");
  assert((doc._meta as any).internal.record_complete.value === false);
  assertEquals((doc._meta as any).internal.lia_pipeline_stamp, "x");
});
