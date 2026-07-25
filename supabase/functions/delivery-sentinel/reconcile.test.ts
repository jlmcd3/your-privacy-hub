// DS-T2b — delivery-sentinel harness-branch reconciliation tests.
// Drives reconcileQualityBatchRun with a fake admin client that mirrors
// the .from().update().eq().not().select() shape used in the impl.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reconcileQualityBatchRun } from "./index.ts";

interface Captured {
  table?: string;
  patch?: Record<string, unknown>;
  eq?: [string, unknown];
  not?: [string, string, string];
}

function fakeAdmin(opts: { returns: any[]; error?: any }) {
  const cap: Captured = {};
  const chain: any = {
    update: (p: any) => { cap.patch = p; return chain; },
    eq: (k: string, v: unknown) => { cap.eq = [k, v]; return chain; },
    not: (k: string, op: string, v: string) => { cap.not = [k, op, v]; return chain; },
    select: async (_c: string) => ({ data: opts.returns, error: opts.error }),
  };
  return {
    admin: { from: (table: string) => { cap.table = table; return chain; } },
    cap,
  };
}

Deno.test("reconcileQualityBatchRun — updates non-terminal batch row with cancelled/done/last_error/completed_at", async () => {
  const { admin, cap } = fakeAdmin({ returns: [{ id: "run-1" }] });
  const out = await reconcileQualityBatchRun(admin, "run-1", "wave-17 stall");
  assertEquals(out.reconciled, true);
  assertEquals(cap.table, "quality_batch_runs");
  assertEquals((cap.patch as any).status, "cancelled");
  assertEquals((cap.patch as any).phase, "done");
  assert(String((cap.patch as any).last_error).includes("[delivery-sentinel]"));
  assert(String((cap.patch as any).last_error).includes("wave-17 stall"));
  assert((cap.patch as any).completed_at);
  assertEquals(cap.eq, ["id", "run-1"]);
  assertEquals(cap.not, ["status", "in", "(complete,failed,cancelled)"]);
});

Deno.test("reconcileQualityBatchRun — reports not-reconciled when zero rows matched (already terminal)", async () => {
  const { admin } = fakeAdmin({ returns: [] });
  const out = await reconcileQualityBatchRun(admin, "run-1", "note");
  assertEquals(out.reconciled, false);
});

Deno.test("reconcileQualityBatchRun — fail-open on driver error", async () => {
  const { admin } = fakeAdmin({ returns: [], error: { message: "conn reset" } });
  const out = await reconcileQualityBatchRun(admin, "run-1", "note");
  assertEquals(out.reconciled, false);
  assertEquals(out.reason, "conn reset");
});
