// LEAK-PREV-P2 — ADMT v2 schema-coverage test (house model: registration's
// registration.schema-coverage.test.ts).
//
// Asserts the emitted top-level key set and the schema allow-list stay in
// LOCKSTEP IN BOTH DIRECTIONS: a key emitted but not declared would be
// silently stripped from the customer report; a key declared but never
// emitted is dead allow-list surface.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  ADMT_V2_REPORT_SCHEMA,
  ADMT_V2_EMITTED_TOP_LEVEL,
} from "../../../supabase/functions/run-admt-checker-v2/_local/report-schemas/admt-v2.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";

Deno.test("ADMT v2: every emitted top-level key is schema-declared", () => {
  const missing = ADMT_V2_EMITTED_TOP_LEVEL.filter(
    (k) => !ADMT_V2_REPORT_SCHEMA.topLevel.includes(k),
  );
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

Deno.test("ADMT v2: every schema-declared key is emitted", () => {
  const extra = ADMT_V2_REPORT_SCHEMA.topLevel.filter(
    (k) => !ADMT_V2_EMITTED_TOP_LEVEL.includes(k),
  );
  assertEquals(extra, [], `dead allow-list keys: ${extra.join(", ")}`);
});

Deno.test("ADMT v2: sample pass-through drops internal keys and relocated findings never ship at top level", () => {
  const sample: Record<string, unknown> = {
    skeleton_document: { _typed: "skeleton-document@admt-v1.2", spine_version: "x", title: "t", subtitle: "s", sections: [] },
    authority_exhibit: { version: "ax-w1-2026-08-03", heading: "Appendix — Authorities Cited", entries: [] },
    _meta: { internal: { admt_v2_pipeline_stamp: "x", findings: [{ finding_id: "f-1", source_fields: ["a"] }] } },
    // internal keys that must never ship at the top level
    findings: [{ finding_id: "f-1", source_fields: ["a"], closure_condition: "x" }],
    _scratch_debug: { pass: 1 },
  };
  const { report } = serializeCustomerReport(sample, ADMT_V2_REPORT_SCHEMA);
  const r = report as Record<string, unknown>;
  assert(!("_scratch_debug" in r), "_scratch_debug should have been dropped");
  assert(!("findings" in r), "top-level findings must never ship — internal-only, relocated to _meta.internal.findings");
  for (const k of ADMT_V2_EMITTED_TOP_LEVEL) {
    assert(k in r, `${k} must survive serialization`);
  }
  assertEquals(r.skeleton_document, sample.skeleton_document);
  assertEquals(r.authority_exhibit, sample.authority_exhibit);
  const meta = r._meta as Record<string, unknown>;
  const internal = meta.internal as Record<string, unknown>;
  assert(Array.isArray(internal.findings), "_meta.internal.findings must survive — it's the preserved internal channel");
});
