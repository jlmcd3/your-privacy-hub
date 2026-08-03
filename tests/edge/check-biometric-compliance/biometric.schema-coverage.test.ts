// LEAK-PREV-P2 — Biometric schema-coverage test (house model: the ADMT
// coverage assertions in tests/edge/_shared/report-serialize.tools.test.ts).
//
// Asserts the emitted top-level key set and the schema allow-list stay in
// LOCKSTEP IN BOTH DIRECTIONS: a key emitted but not declared would be
// silently stripped from the customer report; a key declared but never
// emitted is dead allow-list surface.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  BIOMETRIC_REPORT_SCHEMA,
  BIOMETRIC_EMITTED_TOP_LEVEL,
} from "../../../supabase/functions/_shared/report-schemas/biometric.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";

Deno.test("BIOMETRIC: every emitted top-level key is schema-declared", () => {
  const missing = BIOMETRIC_EMITTED_TOP_LEVEL.filter(
    (k) => !BIOMETRIC_REPORT_SCHEMA.topLevel.includes(k),
  );
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

Deno.test("BIOMETRIC: every schema-declared key is emitted", () => {
  const extra = BIOMETRIC_REPORT_SCHEMA.topLevel.filter(
    (k) => !BIOMETRIC_EMITTED_TOP_LEVEL.includes(k),
  );
  assertEquals(extra, [], `dead allow-list keys: ${extra.join(", ")}`);
});

Deno.test("BIOMETRIC: sample pass-through drops only internal keys", () => {
  const sample: Record<string, unknown> = {
    jurisdictions_analysed: ["US-IL"],
    enforcement_precedents: [],
    enforcement_meta: { attempted: true },
    annotations: [],
    lint_warnings: [],
    generated_at: "2026-08-03T00:00:00.000Z",
    registry_version: "bio-reg-w1",
    envelope: { registry_version: "bio-reg-w1" },
    registry_applied: { version: "bio-reg-w1", supplied_row_ids: [] },
    identifier_characterizations: [],
    entity_characterization: { verdict: "engaged" },
    duty_findings: [],
    divergence_analysis: [],
    consequence_determination: { verdict: "engaged" },
    biometric_deliverables: { version: "v1" },
    information_needed: [],
    _meta: { prompt_version: "p1", build_stamp: "b1" },
    // internal key that must never ship
    _scratch_debug: { pass: 1 },
  };
  const { report } = serializeCustomerReport(sample, BIOMETRIC_REPORT_SCHEMA);
  const r = report as Record<string, unknown>;
  assert(!("_scratch_debug" in r), "_scratch_debug should have been dropped");
  for (const k of BIOMETRIC_EMITTED_TOP_LEVEL) {
    assert(k in r, `${k} must survive serialization`);
  }
  assertEquals(r.duty_findings, sample.duty_findings);
  assertEquals(r.biometric_deliverables, sample.biometric_deliverables);
});
