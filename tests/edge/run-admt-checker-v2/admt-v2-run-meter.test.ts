// BUGFIX (2026-09-08) — regression coverage for the missing metering call:
// run-admt-checker-v2 never called recordRunMeterAndVersion, so no v2 ADMT
// row ever got a tool_run_meter row (confirmed live: 0/124 admt_v2 rows had
// one, vs 261/280 legacy v1 admt rows). regenerate-assessment's classic
// regen path 403s ("not_found_or_forbidden") when no meter row exists for
// the tool_type/assessment_id pair, so this silently blocked every
// classic regen of a v2 ADMT assessment.
//
// index.ts calls `Deno.serve(...)` at module load, so it cannot be
// imported/executed here without starting a server and a live Supabase
// connection — the existing suite works around this by reading its source
// text for exactly this situation (tests/edge/run-li-assessment/doc207-
// cutover-guards.test.ts is the established precedent; there is no
// SDK-level mock/spy harness anywhere in this fleet's edge function tests,
// including run-cppa-risk-assessment-v2's own suite, which also has no
// test proving its recordRunMeterAndVersion call — this file establishes
// that mirror for ADMT the same source-scan way doc207 pins its call
// sites).

import { assert, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

const INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/run-admt-checker-v2/index.ts", import.meta.url),
);

Deno.test("admt-v2-run-meter — index.ts imports recordRunMeterAndVersion from the shared run-meter module", () => {
  assertStringIncludes(
    INDEX_SRC,
    `import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";`,
  );
});

Deno.test("admt-v2-run-meter — recordRunMeterAndVersion is called with toolType 'cppa_admt' (the exact string TABLE_MAP/FN_MAP/tool_run_meter already use)", () => {
  const idx = INDEX_SRC.indexOf("await recordRunMeterAndVersion(supabase, {");
  assert(idx >= 0, "recordRunMeterAndVersion call not found");
  const call = INDEX_SRC.slice(idx, idx + 300);
  assertStringIncludes(call, 'toolType: "cppa_admt"');
  assertStringIncludes(call, "assessmentId,");
  assertStringIncludes(call, "userId,");
  assertStringIncludes(call, "intake,");
  assertStringIncludes(call, "reportData: report,");
});

Deno.test("admt-v2-run-meter — the call happens BEFORE the status:complete persist write (same order as run-admt-checker v1 and run-cppa-risk-assessment-v2)", () => {
  const meterIdx = INDEX_SRC.indexOf("await recordRunMeterAndVersion(supabase, {");
  const persistIdx = INDEX_SRC.indexOf("const persistPayload = {");
  assert(meterIdx >= 0, "recordRunMeterAndVersion call not found");
  assert(persistIdx >= 0, "persistPayload block not found");
  assert(meterIdx < persistIdx, "recordRunMeterAndVersion must be called before persistPayload (status: complete) is built/written");

  // persistPayload itself must still carry status: "complete" — pin that we
  // didn't accidentally remove or reorder the persist write, only add the
  // meter call ahead of it.
  const persistBlock = INDEX_SRC.slice(persistIdx, persistIdx + 200);
  assertStringIncludes(persistBlock, 'status: "complete"');
});

Deno.test("admt-v2-run-meter — the call is guarded on a real assessmentId (harness/stress-test direct-intake calls, which have no row yet, don't crash on a null id)", () => {
  const idx = INDEX_SRC.indexOf("await recordRunMeterAndVersion(supabase, {");
  assert(idx >= 0);
  const before = INDEX_SRC.slice(Math.max(0, idx - 80), idx);
  assertStringIncludes(before, "if (assessmentId) {");
});
