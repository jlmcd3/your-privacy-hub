// ITEM 393 LEG B — ADMT perfect fixture, registry/variant wiring, harness
// kickoff, fail-closed gate shape, output neutrality, serializer survival.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";
import {
  PERFECT_BY_TOOL,
  casesForVariant,
  intakesForVariant,
  GOLDEN_BY_TOOL,
} from "../../../supabase/functions/_shared/golden/registry.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import {
  emptyAskedKeys,
  computeRecordComplete,
  classifyPlaceholders,
  attachRecordComplete,
  FALSE_ABSENCE_CHECK_IDS,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  REFERENCE_RENDER_TOKENS,
  ADMT_PIPELINE_STAMP,
} from "../../../supabase/functions/_shared/prose/plans/admt.spine.ts";
import { RUN_QUALITY_BATCH_SLUGS } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import {
  normalizeToolVariants,
  resolveToolVariant,
} from "../../../supabase/functions/_shared/quality/fixture-variant.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { ADMT_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/admt.ts";

const INTAKE = ADMT_PERFECT[0].intake as Record<string, unknown>;

Deno.test("fixture: exactly one perfect ADMT case, California housing anchor", () => {
  assertEquals(ADMT_PERFECT.length, 1);
  assertEquals(ADMT_PERFECT[0].id, "admt-ca-tenant-screening-perfect");
  assertEquals(INTAKE.decision_domains, ["Housing (rental or purchase eligibility)"]);
});

Deno.test("fixture: zero empty ASKED keys under live item380r5 semantics", () => {
  const empties = emptyAskedKeys(cppaAdmtContract, INTAKE);
  assertEquals(empties, [], `empty asked keys: ${empties.join(", ")}`);
});

Deno.test("fixture: validates against the live cppaAdmtContract", () => {
  const res = validateIntake(cppaAdmtContract, INTAKE);
  assert(res.ok, JSON.stringify(res.violations ?? []));
});

Deno.test("fixture: sufficiency lint — narratives meaningful, self-test details answered", () => {
  const NARRATIVE_MIN = 60;
  const bad: string[] = [];
  for (const f of cppaAdmtContract.fields) {
    if (f.kind !== "narrative") continue;
    const v = f.key.split(".").reduce<unknown>(
      (acc, seg) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[seg] : undefined),
      INTAKE,
    );
    if (typeof v !== "string") continue;
    if (v.trim().length < NARRATIVE_MIN) bad.push(`${f.key} (${v.trim().length} chars)`);
  }
  assertEquals(bad, [], `thin narrative fields: ${bad.join(", ")}`);

  // The archived render degraded precisely because the self-test details were
  // unanswered. Every admt_detail leaf the contract declares is answered here.
  const detail = INTAKE.admt_detail as Record<string, unknown>;
  const leaves = cppaAdmtContract.fields
    .filter((f) => f.key.startsWith("admt_detail.") )
    .map((f) => f.key.slice("admt_detail.".length));
  for (const k of leaves) {
    const v = detail[k];
    assert(
      v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
      `admt self-test detail unanswered: ${k}`,
    );
    assert(String(v) !== "Unsure", `admt self-test detail answered "Unsure": ${k}`);
  }

  const blob = JSON.stringify(INTAKE);
  for (const tok of ["TBD", "TODO", "[TO COMPLETE", "[TO BE", "PLACEHOLDER", "lorem ipsum", "XXX", "N/A"]) {
    assert(!blob.toUpperCase().includes(tok.toUpperCase()), `placeholder token present: ${tok}`);
  }
});

Deno.test("fixture: carries no reference-render token (item392 fact-exempt rule)", () => {
  const blob = JSON.stringify(INTAKE).toLowerCase();
  for (const tok of REFERENCE_RENDER_TOKENS) {
    assert(!blob.includes(String(tok).toLowerCase()), `reference-render token leaked into fixture: ${tok}`);
  }
});

Deno.test("registry: PERFECT_BY_TOOL + casesForVariant wiring for cppa-admt", () => {
  assertEquals(PERFECT_BY_TOOL["cppa-admt"], ADMT_PERFECT);
  assertEquals(casesForVariant("cppa-admt", "perfect"), ADMT_PERFECT);
  assertEquals(intakesForVariant("cppa-admt", "perfect"), [INTAKE]);
  // Legacy (degraded pilot) sets untouched.
  assertEquals(casesForVariant("cppa-admt", null), GOLDEN_BY_TOOL["cppa-admt"]);
  assertEquals(casesForVariant("cppa-admt", "messy"), MESSY_BY_TOOL["cppa-admt"]);
});

Deno.test("harness: cppa-admt perfect batch is admissible end-to-end", () => {
  assert(RUN_QUALITY_BATCH_SLUGS.has("cppa-admt"));
  const tv = normalizeToolVariants({ "cppa-admt": "perfect" });
  assertEquals(tv, { "cppa-admt": "perfect" });
  assertEquals(resolveToolVariant("cppa-admt", tv, null), "perfect");
  const pins = intakesForVariant("cppa-admt", "perfect");
  assertEquals(pins.length, 1);
  const seed = buildSeedRow("cppa-admt", 1, 1, "00000000-0000-0000-0000-000000000000", "2026-08-06T00:00:00Z", {
    pins,
  }) as Record<string, unknown>;
  assertEquals(seed.tool, "cppa-admt");
  assertEquals(seed.status, "pending");
  assertEquals(seed.batch_size, 1);
  assertEquals((seed.intakes as unknown[]).length, 1);
});

Deno.test("harness: the admt source row carries the intake wholesale (no column whitelist)", () => {
  // The LIA_COLS lesson: LIA writes intake keys into typed columns and a
  // missing column silently drops a pinned answer. run-quality-batch inserts
  // cppa-admt into `cppa_assessments` as `intake_data: intake` — one jsonb
  // column, whole record — so no column had to be added for this fixture.
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  const hits = src.match(/from\("cppa_assessments"\)\.insert\(\{[^}]*intake_data: intake/g) ?? [];
  assert(hits.length >= 1, "expected cppa_assessments insert to persist intake wholesale");
  assert(!/ADMT_COLS/.test(src), "unexpected column whitelist for admt");
});

Deno.test("gate: cppa-admt is in the union with an empty false-absence list this leg", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["cppa-admt"], []);
});

Deno.test("gate: fail-closed shape on the perfect fixture (no coverage, no CSC)", () => {
  const t = computeRecordComplete({
    product: "cppa-admt",
    contract: cppaAdmtContract,
    intake: INTAKE,
    coverage: null,
    csc: null,
  });
  assertEquals(t.value, false);
  assertEquals(t.product, "cppa-admt");
  assertEquals(t.counts.empty_required_keys, 0);
  assert(!t.failed_conditions.includes("contract_incomplete"));
  assert(t.failed_conditions.includes("coverage_orphans"));
  assert(t.failed_conditions.includes("csc_false_absence"));
});

Deno.test("output-neutrality: the gate touches only _meta.internal", () => {
  const doc: Record<string, unknown> = {
    executive_summary: "The Tenancy Fit Index is automated decisionmaking technology used to make a significant decision.",
    information_needed: [{ question: "Confirm the annual disparate-impact review is scheduled for 2027." }],
    scope_analysis: { summary: "The system decides housing eligibility." },
    _meta: { internal: { admt_pipeline_stamp: ADMT_PIPELINE_STAMP } },
  };
  const before = JSON.stringify({ ...doc, _meta: undefined });
  const t = computeRecordComplete({ product: "cppa-admt", contract: cppaAdmtContract, intake: INTAKE });
  const c = classifyPlaceholders(doc, INTAKE, t.value);
  attachRecordComplete(doc, t, c);
  const after = JSON.stringify({ ...doc, _meta: undefined });
  assertEquals(after, before, "gate mutated customer-visible prose");
  assertEquals((doc._meta as any).internal.record_complete.value, false);
  assertEquals((doc._meta as any).internal.admt_pipeline_stamp, ADMT_PIPELINE_STAMP);
});

Deno.test("serializer: admt_pipeline_stamp + record_complete survive the whitelist", () => {
  const doc: Record<string, unknown> = {
    assessment_id: "test-393",
    generated_at: new Date().toISOString(),
    _meta: { internal: { admt_pipeline_stamp: ADMT_PIPELINE_STAMP } },
    not_a_declared_key: "must be dropped",
  };
  const t = computeRecordComplete({ product: "cppa-admt", contract: cppaAdmtContract, intake: INTAKE });
  attachRecordComplete(doc, t, classifyPlaceholders(doc, INTAKE, t.value));

  const { report, telemetry } = serializeCustomerReport(doc, ADMT_REPORT_SCHEMA);
  assert(telemetry.crashed !== true);
  const internal = (report as any)?._meta?.internal ?? {};
  assertEquals(internal.admt_pipeline_stamp, ADMT_PIPELINE_STAMP);
  assertEquals(internal.record_complete?.product, "cppa-admt");
  assertEquals(internal.record_complete?.value, false);
  assert(Array.isArray(internal.placeholder_classification?.items));
  assert(!("not_a_declared_key" in (report as Record<string, unknown>)));
});

Deno.test("live-parity: the gate call site passes the FULL persisted record, after prose gold, before the emit gate", () => {
  const src = Deno.readTextFileSync(
    new URL("../../../supabase/functions/run-admt-checker/index.ts", import.meta.url),
  );
  const gold = src.indexOf("applyAdmtProseGold(report");
  const gate = src.indexOf('product: "cppa-admt"');
  const emit = src.indexOf("LEAK-PREV-P1 — EMIT GATE");
  const ser = src.indexOf("LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER");
  assert(gold > 0 && gate > 0 && emit > 0 && ser > 0, "call sites not found");
  assert(gold < gate, "gate must run AFTER item-392 prose gold");
  assert(gate < emit, "gate must run BEFORE the emit gate");
  assert(emit < ser, "emit gate must precede the serializer");
  // The item385 r2 trimmed-projection lesson: the evidence pass reads the
  // persisted row's intake_data, not a locally trimmed intake object.
  const block = src.slice(gate - 1200, gate + 900);
  assert(
    /const admtGateRecord = \(\(assessment as any\)\.intake_data \?\? \{\}\)/.test(block),
    "gate does not read the full persisted record (assessment.intake_data)",
  );
  assert(/intake: admtGateRecord/.test(block), "computeRecordComplete not fed the persisted record");
  assert(/classifyPlaceholders\(\s*report as Record<string, unknown>,\s*admtGateRecord/.test(block),
    "classifyPlaceholders not fed the persisted record");
});
