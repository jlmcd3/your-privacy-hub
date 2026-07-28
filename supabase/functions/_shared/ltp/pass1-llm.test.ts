// T-M9 (Item 230) — hermetic Pass-1 abort test. Mocks globalThis.fetch so
// the AbortController path is exercised without any real network dependency,
// and asserts:
//   (a) both attempts abort → write_around with error=pass1_abort_timeout,
//   (b) attempts_detail records per-attempt elapsed_ms + outcome,
//   (c) the forced-degradation magic-token path still trips ONLY on the
//       change-controlled token (Item 173(c) — regression from prior file).
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runPass1Llm, PASS1_ABORT_TIMEOUT_ERROR } from "./pass1-llm.ts";

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
  Deno.env.delete("LTP_ENFORCE_ENABLED");
});

Deno.test("pass1-llm: forced-degradation hook does NOT trip on '1' or empty", async () => {
  for (const v of ["1", "true", "yes", ""]) {
    if (v) Deno.env.set("LTP_TEST_FORCE_WRITE_AROUND", v);
    else Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
    // Disable enforce so we never reach the fetch path.
    Deno.env.delete("LTP_ENFORCE_ENABLED");
    const r = await runPass1Llm(BASE);
    assert(r.telemetry.error !== "test_only_forced_degradation",
      `magic-token guard leaked for value=${JSON.stringify(v)}`);
  }
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
});

// T-M9 (Item 230): abort-controller path — hermetic, no network.
Deno.test("pass1-llm: N=2 aborts → write_around with pass1_abort_timeout", async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  Deno.env.delete("LTP_TEST_FORCE_WRITE_AROUND");
  // Dummy key so anthropic-call.ts does not throw missing_ANTHROPIC_API_KEY;
  // the mocked fetch below never inspects it.
  const prevKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-dummy-not-a-real-key");
  const origFetch = globalThis.fetch;
  // Mock fetch: never resolves; rejects with AbortError when the signal fires.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (_input: unknown, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const sig = init?.signal;
      if (!sig) return; // never resolves
      const onAbort = () => reject(new DOMException("aborted-by-test", "AbortError"));
      if (sig.aborted) onAbort();
      else sig.addEventListener("abort", onAbort, { once: true });
    });
  };
  try {
    const r = await runPass1Llm(BASE, { maxAttempts: 2, timeoutMs: 50 });
    assert(r.telemetry.write_around, "expected write_around=true on N=2 aborts");
    assertEquals(r.telemetry.error, PASS1_ABORT_TIMEOUT_ERROR);
    assertEquals(r.telemetry.attempts, 2);
    assertEquals(r.telemetry.attempts_detail.length, 2);
    for (const d of r.telemetry.attempts_detail) {
      assertEquals(d.outcome, "abort");
      assert(typeof d.elapsed_ms === "number" && d.elapsed_ms >= 0);
    }
    assertEquals(r.telemetry.timeout_enforced, "abort-controller");
    assert(r.plan.conservative_write_around?.triggered);
    assertEquals(r.plan.conservative_write_around?.reason, PASS1_ABORT_TIMEOUT_ERROR);
  } finally {
    globalThis.fetch = origFetch;
    if (prevKey !== undefined) Deno.env.set("ANTHROPIC_API_KEY", prevKey);
    else Deno.env.delete("ANTHROPIC_API_KEY");
    Deno.env.delete("LTP_ENFORCE_ENABLED");
  }
});
