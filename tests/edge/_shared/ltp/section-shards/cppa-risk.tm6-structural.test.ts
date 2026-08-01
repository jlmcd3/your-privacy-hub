/**
 * T-M6 (Item 226) — STRUCTURAL COMPLETENESS at cutover.
 *
 * Every one of the 38 schema keys must be either emitted or intentionally
 * empty (manifest-gated / template-cut / empty-by-design). No accidental
 * blanks. This test asserts the emitted-key set against the registry's
 * expected-emission classification.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CPPA_RISK_SECTION_SHARDS,
  expectedEmissionForKey,
  schemaTopLevelKeys,
  deriveTopLevelAllowedKeys,
} from "./cppa-risk.ts";
import {
  assembleReport,
  buildTypeJWriteAroundBody,
  COMPOSITION_SHAPE_DECLARATION,
} from "../pass2-assembler.ts";
import { derivePlan } from "../derive.ts";

function fixturePlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "tm6-structural@test",
  });
}

Deno.test("T-M6: every schema top-level key has an expected-emission classification", () => {
  for (const k of schemaTopLevelKeys()) {
    const e = expectedEmissionForKey(k);
    assert(
      ["always", "conditional", "manifest-gated", "template-cut", "empty-by-design"].includes(e),
      `key ${k} classification invalid: ${e}`,
    );
  }
});

Deno.test("T-M6: shard-derived allow-list equals schema top-level allow-list", () => {
  const shardKeys = [...deriveTopLevelAllowedKeys()].sort();
  const schemaKeys = [...schemaTopLevelKeys()].sort();
  assertEquals(shardKeys, schemaKeys);
});

Deno.test("T-M6: assembler emits or intentionally omits every shard key (no drop-through)", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const seen = new Set(result.telemetry.sections.map((s) => s.key));
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    assert(seen.has(s.key), `section telemetry missing ${s.key}`);
  }
  const structural = result.telemetry.structural_completeness;
  assertEquals(
    structural.nonconformant_keys.length,
    0,
    `nonconformant keys: ${JSON.stringify(structural.nonconformant_keys)}`,
  );
  assertEquals(structural.ok, true);
});

Deno.test("T-M6: § 7121(a) cohort sentence lands in submission_summary (audit defect-1 re-verify)", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const s = result.report["submission_summary"];
  assert(typeof s === "string" && s.length > 0, "submission_summary missing");
  assert(/7121\(a\)/.test(s as string) || /cyber/i.test(s as string),
    `submission_summary does not reference § 7121(a) / cyber schedule: ${String(s).slice(0, 200)}`);
});

Deno.test("T-M6: Type-J write-around body carries reserved-judgment shape + origin telemetry", () => {
  const body = buildTypeJWriteAroundBody({ origin: "clock_cap", buildStamp: "test" });
  assertEquals(body.risk_level, "reserved");
  assertEquals((body.document_metadata as any).type_j_origin, "clock_cap");
  assert(Array.isArray(body.information_needed));
  assert(String((body as any).opening_summary).toLowerCase().includes("reserved-judgment"));
});

Deno.test("T-M6: composition shape declaration is stable and versioned", () => {
  assertEquals(COMPOSITION_SHAPE_DECLARATION.product, "cppa-risk-assessment");
  assertEquals(COMPOSITION_SHAPE_DECLARATION.final_documents_per_assessment, 1);
  assert(COMPOSITION_SHAPE_DECLARATION.llm_calls_per_document.length >= 1);
  assert(COMPOSITION_SHAPE_DECLARATION.version.length > 0);
});
