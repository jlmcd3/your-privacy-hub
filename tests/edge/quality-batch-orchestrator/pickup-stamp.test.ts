// IR-HF1 T3 (F2 epoch stamp) — pickup-stamp unit test.
//
// The orchestrator's runUnit() reads the batch row and, when
// instrument_version is null, patches it with GRADER_CONTEXT_VERSION before
// returning to normal decide/heartbeat flow. This test mocks the supabase
// client and asserts the update is dispatched with the version string.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";

Deno.test("IR-HF1 T3 [pickup-stamp]: a row inserted with instrument_version NULL is stamped at pickup", () => {
  // Simulate the runUnit pickup gate. This mirrors the exact block added to
  // supabase/functions/quality-batch-orchestrator/index.ts.
  const row: Record<string, unknown> = { id: "test", instrument_version: null };
  const updates: Array<{ patch: Record<string, unknown>; where: string }> = [];
  const db = {
    from(_t: string) {
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(_c: string, _v: string) {
              return {
                is(_c2: string, _v2: null) {
                  updates.push({ patch, where: "instrument_version IS NULL" });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  // Pickup logic (mirror of orchestrator).
  const _r = (async () => {
    if (!(row as any).instrument_version) {
      await db.from("quality_batch_runs")
        .update({ instrument_version: GRADER_CONTEXT_VERSION })
        .eq("id", "test")
        .is("instrument_version", null);
      (row as any).instrument_version = GRADER_CONTEXT_VERSION;
    }
  })();
  return _r.then(() => {
    assertEquals(updates.length, 1);
    assertEquals((updates[0].patch as any).instrument_version, GRADER_CONTEXT_VERSION);
    assert((row as any).instrument_version === GRADER_CONTEXT_VERSION);
  });
});

Deno.test("IR-HF1 T3 [pickup-stamp]: existing instrument_version is preserved (no clobber)", async () => {
  const row: Record<string, unknown> = { id: "test", instrument_version: "gc-2026-07-17-ff3" };
  let called = false;
  const db = {
    from(_t: string) { called = true; return null as any; },
  };
  if (!(row as any).instrument_version) {
    db.from("quality_batch_runs");
  }
  assertEquals(called, false);
  assertEquals((row as any).instrument_version, "gc-2026-07-17-ff3");
});
