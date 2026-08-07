// ITEM 401 LEG B — GOVERNANCE PERFECT FIXTURE + RECORD-COMPLETE GATE.
//
// Mirrors the item-393 ADMT battery one-for-one: fixture sufficiency, no
// placeholder tokens, no reference-render token leak, registry wiring, harness
// admissibility, gate union membership, fail-closed shape, output neutrality,
// serializer survival, and live call-site parity.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/_shared/golden/governance-perfect.ts";
import {
  casesForVariant,
  GOLDEN_BY_TOOL,
  intakesForVariant,
  PERFECT_BY_TOOL,
} from "../../../supabase/functions/_shared/golden/registry.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";
import { RUN_QUALITY_BATCH_SLUGS } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";
import {
  normalizeToolVariants,
  resolveToolVariant,
} from "../../../supabase/functions/_shared/quality/fixture-variant.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import {
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
  emptyAskedKeys,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { REFERENCE_RENDER_TOKENS } from "../../../supabase/functions/_shared/prose/plans/governance.spine.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { GOVERNANCE_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/governance.ts";

const INTAKE = GOVERNANCE_PERFECT[0].intake as Record<string, unknown>;

Deno.test("fixture: exactly one governance perfect case, correctly labelled", () => {
  assertEquals(GOVERNANCE_PERFECT.length, 1);
  assertEquals(GOVERNANCE_PERFECT[0].tool, "governance");
  assertEquals(GOVERNANCE_PERFECT[0].id, "gov-occupational-health-eu-uk-perfect");
});

Deno.test("fixture: every ASKED field is answered (emptyAskedKeys === [])", () => {
  const empties = emptyAskedKeys(governanceContract, INTAKE);
  assertEquals(empties, [], `unanswered asked keys: ${empties.join(", ")}`);
});

Deno.test("fixture: answers are SUFFICIENT, not merely present", () => {
  for (const k of ["processing_nature", "processing_scope", "processing_context", "processing_purposes"]) {
    const v = String(INTAKE[k] ?? "");
    assert(v.length >= 200, `${k} too thin to be sufficient (${v.length} chars)`);
  }
  // Named DPO with a reporting line.
  assert(/Data Protection Officer/i.test(String(INTAKE.remediation_default_owner)));
  assert(/reporting directly to/i.test(String(INTAKE.remediation_default_owner)));
  // Named vendors each with an Art. 28 basis.
  assert((String(INTAKE.processing_nature).match(/Art\. 28/g) ?? []).length >= 3);
  // Retention period with the thing that sets it.
  assert(/retained for/i.test(String(INTAKE.processing_scope)));
  // A dated record behind the cadence claim.
  assert(/^\d{4}-\d{2}-\d{2}$/.test(String(INTAKE.measures_last_review_date)));
});

Deno.test("fixture: carries no placeholder token", () => {
  const blob = JSON.stringify(INTAKE).toUpperCase();
  for (const tok of ["TBD", "TODO", "[TO COMPLETE", "[TO BE", "PLACEHOLDER", "LOREM IPSUM", "XXX", "N/A"]) {
    assert(!blob.includes(tok), `placeholder token present: ${tok}`);
  }
});

Deno.test("fixture: carries no reference-render token (item 382/400 fact-exempt rule)", () => {
  const blob = JSON.stringify(INTAKE).toLowerCase();
  for (const tok of REFERENCE_RENDER_TOKENS) {
    assert(!blob.includes(String(tok).toLowerCase()), `reference-render token leaked into fixture: ${tok}`);
  }
});

Deno.test("registry: PERFECT_BY_TOOL + casesForVariant wiring for governance", () => {
  assertEquals(PERFECT_BY_TOOL["governance"], GOVERNANCE_PERFECT);
  assertEquals(casesForVariant("governance", "perfect"), GOVERNANCE_PERFECT);
  assertEquals(intakesForVariant("governance", "perfect"), [INTAKE]);
  // Degraded pilot sources untouched.
  assertEquals(casesForVariant("governance", null), GOLDEN_BY_TOOL["governance"]);
  assertEquals(casesForVariant("governance", "messy"), MESSY_BY_TOOL["governance"]);
});

Deno.test("harness: governance perfect batch is admissible end-to-end", () => {
  assert(RUN_QUALITY_BATCH_SLUGS.has("governance"));
  const tv = normalizeToolVariants({ "governance": "perfect" });
  assertEquals(tv, { "governance": "perfect" });
  assertEquals(resolveToolVariant("governance", tv, null), "perfect");
  const pins = intakesForVariant("governance", "perfect");
  assertEquals(pins.length, 1);
  const seed = buildSeedRow("governance", 1, 1, "00000000-0000-0000-0000-000000000000", "2026-08-07T00:00:00Z", {
    pins,
  }) as Record<string, unknown>;
  assertEquals(seed.tool, "governance");
  assertEquals(seed.status, "pending");
  assertEquals((seed.intakes as unknown[]).length, 1);
});

Deno.test("harness: the governance source row carries the intake wholesale (no column whitelist)", () => {
  // The LIA_COLS lesson: a typed-column writer silently drops pinned answers.
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  assert(!/GOVERNANCE_COLS/.test(src), "unexpected column whitelist for governance");
  assert(/intake_data: intake/.test(src), "expected governance insert to persist intake wholesale");
});

Deno.test("gate: governance is in the union with an empty false-absence id list", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["governance"], []);
});

Deno.test("gate: fail-closed shape on the perfect fixture (no coverage, no CSC)", () => {
  const t = computeRecordComplete({
    product: "governance",
    contract: governanceContract,
    intake: INTAKE,
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assertEquals(t.product, "governance");
  assertEquals(t.counts.empty_required_keys, 0);
  assert(!t.failed_conditions.includes("contract_incomplete"));
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
});

Deno.test("output-neutrality: the gate touches only _meta.internal", () => {
  const doc: Record<string, unknown> = {
    executive_summary: "Aldergate's accountability record supports the determination below.",
    domain_element_findings: [{ element: "Records of processing", finding: "Maintained and audited." }],
    remediation_plan: [{ action: "Evidence the clinician review of generated summaries." }],
    _meta: { internal: {} },
  };
  const before = JSON.stringify({ ...doc, _meta: undefined });
  const t = computeRecordComplete({ product: "governance", contract: governanceContract, intake: INTAKE });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, INTAKE, t.value));
  const after = JSON.stringify({ ...doc, _meta: undefined });
  assertEquals(after, before, "gate mutated customer-visible prose");
  assertEquals((doc._meta as any).internal.record_complete.value, false);
});

Deno.test("serializer: record_complete survives the governance whitelist", () => {
  const doc: Record<string, unknown> = {
    assessment_id: "test-401",
    generated_at: new Date().toISOString(),
    _meta: { internal: {} },
    not_a_declared_key: "must be dropped",
  };
  const t = computeRecordComplete({ product: "governance", contract: governanceContract, intake: INTAKE });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, INTAKE, t.value));
  const { report, telemetry } = serializeCustomerReport(doc, GOVERNANCE_REPORT_SCHEMA);
  assert(telemetry.crashed !== true);
  const internal = (report as any)?._meta?.internal ?? {};
  assertEquals(internal.record_complete?.product, "governance");
  assertEquals(internal.record_complete?.value, false);
  assert(Array.isArray(internal.placeholder_classification?.items));
  assert(!("not_a_declared_key" in (report as Record<string, unknown>)));
});

Deno.test("live-parity: the gate runs on the FULL persisted record, after prose gold, before the emit gate", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-governance-assessment/index.ts", import.meta.url),
  );
  const gold = src.indexOf("applyGovernanceProseGold");
  const gate = src.indexOf('product: "governance"');
  const emit = src.indexOf("LEAK-PREV-P1 — EMIT GATE");
  const ser = src.indexOf("LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER");
  assert(gold > 0 && gate > 0 && emit > 0 && ser > 0, "call sites not found");
  assert(gold < gate, "gate must run AFTER item-400 governance prose gold");
  assert(gate < emit, "gate must run BEFORE the emit gate");
  assert(emit < ser, "emit gate must precede the serializer");
  const block = src.slice(Math.max(0, gate - 1400), gate + 900);
  assert(
    /const govGateRecord = \(\(\(assessment as any\)\.intake_data \?\? \{\}\)\)/.test(block),
    "gate does not read the full persisted record (assessment.intake_data)",
  );
  assert(/intake: govGateRecord/.test(block), "computeRecordComplete not fed the persisted record");
  assert(
    /classifyPlaceholders\(\s*reportData as Record<string, unknown>,\s*govGateRecord/.test(block),
    "classifyPlaceholders not fed the persisted record",
  );
});
