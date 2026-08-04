// LEAK-PREV-P2 — Registration schema-coverage test (house model: the ADMT
// coverage assertions in tests/edge/_shared/report-serialize.tools.test.ts).
//
// Asserts the emitted top-level key set and the schema allow-list stay in
// LOCKSTEP IN BOTH DIRECTIONS: a key emitted but not declared would be
// silently stripped from the customer report; a key declared but never
// emitted is dead allow-list surface.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  REGISTRATION_REPORT_SCHEMA,
  REGISTRATION_EMITTED_TOP_LEVEL,
} from "../../../supabase/functions/_shared/report-schemas/registration.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";

Deno.test("REGISTRATION: every emitted top-level key is schema-declared", () => {
  const missing = REGISTRATION_EMITTED_TOP_LEVEL.filter(
    (k) => !REGISTRATION_REPORT_SCHEMA.topLevel.includes(k),
  );
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

Deno.test("REGISTRATION: every schema-declared key is emitted", () => {
  const extra = REGISTRATION_REPORT_SCHEMA.topLevel.filter(
    (k) => !REGISTRATION_EMITTED_TOP_LEVEL.includes(k),
  );
  assertEquals(extra, [], `dead allow-list keys: ${extra.join(", ")}`);
});

Deno.test("REGISTRATION: sample pass-through drops only internal keys", () => {
  const sample: Record<string, unknown> = {
    generated_at: "2026-08-03T00:00:00.000Z",
    confidence: "high",
    confidence_reasons: [],
    rules_fired: ["R11_MARKET_COVERAGE"],
    warnings: [],
    obligations_summary: { dpo_required: true },
    jurisdictions: [{ code: "IE", name: "Ireland" }],
    oss_group: { mechanism: "GDPR one-stop-shop (Art. 56 GDPR)" },
    eu_ai_act_basis: { engaged_tracks: [] },
    eu_representative_group: { required: false },
    dpo_precision: { required: true, trigger: "Art. 37(1)(b)" },
    registration_deliverables: { determinations: [] },
    narrative: { overview: "…", determination: "…" },
    deliverables_version: "v1",
    registration_deliverables_error: null,
    authority_exhibit: { version: "ax-w1-2026-08-03", heading: "Appendix — Authorities Cited", entries: [] },
    _meta: { ai_act_provider_obligations_alias: false },
    // internal key that must never ship
    _scratch_debug: { pass: 1 },
  };
  const { report } = serializeCustomerReport(sample, REGISTRATION_REPORT_SCHEMA);
  const r = report as Record<string, unknown>;
  assert(!("_scratch_debug" in r), "_scratch_debug should have been dropped");
  for (const k of REGISTRATION_EMITTED_TOP_LEVEL) {
    assert(k in r, `${k} must survive serialization`);
  }
  assertEquals(r.jurisdictions, sample.jurisdictions);
  assertEquals(r.registration_deliverables, sample.registration_deliverables);
});
