// DS-T2c — liveness-guard tests for delivery-sentinel harness branch.
// Fakes the admin client's .from().select()/.update() chains just enough
// to exercise latestHarnessBatchActivity() and the refresh path.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { latestHarnessBatchActivity } from "./index.ts";

function fakeAdmin(batch: any, kids: any[]) {
  return {
    from(table: string) {
      const q: any = {
        _table: table,
        select() { return q; },
        eq() { return q; },
        in() { return q; },
        maybeSingle: async () => ({ data: batch, error: null }),
        // for kids branch — the .in() chain resolves as a thenable via await
        then: (resolve: any) => resolve({ data: kids, error: null }),
      };
      return q;
    },
  };
}

Deno.test("liveness — no signal returns anySignal=false", async () => {
  const admin = fakeAdmin(null, []);
  const out = await latestHarnessBatchActivity(admin, "b1");
  assertEquals(out.anySignal, false);
  assertEquals(out.latestMs, 0);
});

Deno.test("liveness — uses freshest of batch and in-flight kids", async () => {
  const batchHb = "2026-07-25T04:47:00.000Z";
  const kidHb = "2026-07-25T04:52:40.000Z";
  const admin = fakeAdmin(
    { last_heartbeat_at: batchHb, status: "running" },
    [{ last_heartbeat_at: kidHb, status: "building" }],
  );
  const out = await latestHarnessBatchActivity(admin, "b1");
  assert(out.anySignal);
  assertEquals(out.latestMs, new Date(kidHb).getTime());
});

Deno.test("liveness — probe errors are swallowed (fail-open, anySignal=false)", async () => {
  const admin = {
    from() {
      throw new Error("boom");
    },
  };
  const out = await latestHarnessBatchActivity(admin, "b1");
  assertEquals(out.anySignal, false);
  assertEquals(out.latestMs, 0);
});
