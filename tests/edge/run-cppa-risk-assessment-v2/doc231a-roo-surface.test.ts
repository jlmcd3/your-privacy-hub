// DOC 231A (2026-09-08) — THE ROO SURFACE (doc 231 build-log NEED #5,
// closed). Proves the finding generate-cppa-risk.ts's `appendRiskRooAsk`
// acts on: `report.information_needed`'s production shape is a plain
// `string[]`, so the ratified `RISK_ROO_UNSETTLED_TEMPLATE` bytes survive
// `serializeCustomerReport` untouched as a bare string entry — no object
// shape, no allow-list edit, no invented keys.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { appendRiskRooAsk } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { RISK_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/v3/readback-templates.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/report-schemas/cppa-risk.ts";

// ── appendRiskRooAsk — the pure append ──────────────────────────────────────

Deno.test("appendRiskRooAsk: unsettledCount 0 -> no-op, report.information_needed left exactly as found (dark-mode byte-identity)", () => {
  const report: Record<string, unknown> = { information_needed: ["existing ask one", "existing ask two"] };
  appendRiskRooAsk(report, 0);
  assertEquals(report.information_needed, ["existing ask one", "existing ask two"]);
});

Deno.test("appendRiskRooAsk: unsettledCount 0 with no prior information_needed key -> the key is never created (absent, not [])", () => {
  const report: Record<string, unknown> = {};
  appendRiskRooAsk(report, 0);
  assertEquals("information_needed" in report, false);
});

Deno.test("appendRiskRooAsk: unsettledCount > 0 appends the ratified template bytes VERBATIM, alongside existing entries", () => {
  const report: Record<string, unknown> = { information_needed: ["existing ask one"] };
  appendRiskRooAsk(report, 2);
  assertEquals(report.information_needed, ["existing ask one", RISK_ROO_UNSETTLED_TEMPLATE]);
});

Deno.test("appendRiskRooAsk: unsettledCount > 0 with no prior information_needed key creates a one-entry array", () => {
  const report: Record<string, unknown> = {};
  appendRiskRooAsk(report, 1);
  assertEquals(report.information_needed, [RISK_ROO_UNSETTLED_TEMPLATE]);
});

Deno.test("appendRiskRooAsk: called twice (e.g. persist-first then Pass-2R re-finalize) never duplicates the ask", () => {
  const report: Record<string, unknown> = {};
  appendRiskRooAsk(report, 1);
  appendRiskRooAsk(report, 3); // a different (larger) unsettled count on the second call
  assertEquals(report.information_needed, [RISK_ROO_UNSETTLED_TEMPLATE]);
});

Deno.test("appendRiskRooAsk: never throws on a malformed prior value (a non-array information_needed)", () => {
  const report: Record<string, unknown> = { information_needed: "not an array" };
  appendRiskRooAsk(report, 1);
  assertEquals(report.information_needed, [RISK_ROO_UNSETTLED_TEMPLATE]);
});

// ── The serializer round-trip proof ─────────────────────────────────────────

Deno.test("serializer round-trip: a plain-string information_needed array (the ROO entry included) survives serializeCustomerReport untouched", () => {
  const report: Record<string, unknown> = {
    schema_version: "1", // arbitrary top-level filler so the schema has something to keep
    information_needed: ["existing ask one", "existing ask two"],
  };
  appendRiskRooAsk(report, 1);
  const { report: serialized, telemetry } = serializeCustomerReport(report, CPPA_RISK_REPORT_SCHEMA);
  assert(!telemetry.crashed);
  const out = (serialized as Record<string, unknown>).information_needed;
  assertEquals(out, ["existing ask one", "existing ask two", RISK_ROO_UNSETTLED_TEMPLATE]);
});

Deno.test("serializer round-trip: an OBJECT-shaped information_needed entry (what the doc 231 finding warned against) IS pruned to RISK_ENTRY_KEYS — this is exactly why appendRiskRooAsk uses a bare string instead", () => {
  const report: Record<string, unknown> = {
    information_needed: [{ field: "i1_processing_purpose", ask: RISK_ROO_UNSETTLED_TEMPLATE, hook_id: "h1", source: "hook_selection" }],
  };
  const { report: serialized } = serializeCustomerReport(report, CPPA_RISK_REPORT_SCHEMA);
  const out = ((serialized as Record<string, unknown>).information_needed as Record<string, unknown>[])[0];
  // None of these survive: RISK_ENTRY_KEYS has no "field", "ask", "hook_id",
  // or "source" — this is the near-empty husk doc 231 §7 found and the
  // reason the ROO ask is a bare string, never an object, on this product.
  assertEquals(out.field, undefined);
  assertEquals(out.ask, undefined);
  assertEquals(out.hook_id, undefined);
  assertEquals(out.source, undefined);
});
