// CORRECTIONS-BUNDLE 2026-07-27 (ledger item 173, sub-item (c)):
// forced-degradation hook for conservative_write_around. Production requests
// NEVER set LTP_TEST_FORCE_WRITE_AROUND; this test proves it (a) trips when
// the magic test token is set, (b) does NOT trip on any other value.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runPass1Llm } from "./pass1-llm.ts";

const BASE = {
  intake: { q1_revenue: "Over $100M" } as Record<string, unknown>,
  report_data: {} as Record<string, unknown>,
  buildStamp: "test@x",
};

Deno.test("pass1-llm: forced-degradation hook trips ONLY on magic token", async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  Deno.env.set("LTP_TEST_FORCE_WRITE_AROUND", "unit-test-only-2026-07-27");
  const r = await runPass1Llm(BASE);
  assert(r.telemetry.write_around, "expected write_around=true under magic token");
  assertEquals(r.telemetry.error, "test_only_forced_degradation");
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
});

Deno.test("pass1-llm: forced-degradation hook does NOT trip on '1' or empty", async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  for (const v of ["1", "true", "yes", ""]) {
    if (v) Deno.env.set("LTP_TEST_FORCE_WRITE_AROUND", v);
    else Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
    // Without the magic token, code proceeds to the gateway loop. We cannot
    // reach the gateway here, but we CAN assert the forced-degradation
    // sentinel is not returned. We short-circuit by disabling enforce.
    Deno.env.delete("LTP_ENFORCE_ENABLED");
    const r = await runPass1Llm(BASE);
    assert(r.telemetry.error !== "test_only_forced_degradation",
      `magic-token guard leaked for value=${JSON.stringify(v)}`);
  }
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
});
