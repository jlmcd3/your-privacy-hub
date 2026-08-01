// DS-T2b — orchestrator contract-hook fail-open tests.
// The hooks MUST swallow every error so a delivery-contract-side failure
// never alters batch behavior. Also verifies each hook fires with the
// expected subject-keyed arguments (create at kickoff, heartbeat on the
// existing cadence, terminate on terminal transitions).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  dcCreateBatchContract,
  dcHeartbeatBatchContract,
  dcTerminateBatchContract,
  type ContractDeps,
} from "./_contract_hooks.ts";

function throwingDeps(): ContractDeps {
  return {
    create: () => { throw new Error("boom-create"); },
    heartbeatBySubject: () => { throw new Error("boom-hb"); },
    terminateBySubject: () => { throw new Error("boom-term"); },
  };
}

Deno.test("dcCreateBatchContract — fail-open when create throws", async () => {
  await dcCreateBatchContract(throwingDeps(), "run-1", { foo: "bar" });
  // reaching here proves no rethrow
  assert(true);
});

Deno.test("dcHeartbeatBatchContract — fail-open when heartbeat throws", async () => {
  await dcHeartbeatBatchContract(throwingDeps(), "run-1");
  assert(true);
});

Deno.test("dcTerminateBatchContract — fail-open when terminate throws", async () => {
  await dcTerminateBatchContract(throwingDeps(), "run-1", "complete");
  await dcTerminateBatchContract(throwingDeps(), "run-1", "failed", "err");
  await dcTerminateBatchContract(throwingDeps(), "run-1", "cancelled");
  await dcTerminateBatchContract(throwingDeps(), "run-1", "error", "oops");
  assert(true);
});

Deno.test("dcCreateBatchContract — invokes create with harness/quality-batch/subject keys", async () => {
  let seen: any = null;
  const deps: ContractDeps = {
    create: async (input) => { seen = input; return { id: "c-1" }; },
    heartbeatBySubject: async () => {},
    terminateBySubject: async () => {},
  };
  await dcCreateBatchContract(deps, "run-42", { campaign_id: "camp-1" });
  assertEquals(seen.runClass, "harness");
  assertEquals(seen.tool, "quality-batch");
  assertEquals(seen.subjectTable, "quality_batch_runs");
  assertEquals(seen.subjectId, "run-42");
  assertEquals(seen.userId, null);
  assertEquals(seen.checkpointRef.campaign_id, "camp-1");
});

Deno.test("dcHeartbeatBatchContract — calls heartbeatBySubject with subject keys", async () => {
  const calls: any[] = [];
  const deps: ContractDeps = {
    create: async () => ({ id: "c" }),
    heartbeatBySubject: async (t, i) => { calls.push([t, i]); },
    terminateBySubject: async () => {},
  };
  await dcHeartbeatBatchContract(deps, "run-9");
  assertEquals(calls, [["quality_batch_runs", "run-9"]]);
});

Deno.test("dcTerminateBatchContract — maps status → terminalState", async () => {
  const calls: any[] = [];
  const deps: ContractDeps = {
    create: async () => ({ id: "c" }),
    heartbeatBySubject: async () => {},
    terminateBySubject: async (t, i, state, err) => { calls.push({ t, i, state, err }); },
  };
  await dcTerminateBatchContract(deps, "r1", "complete");
  await dcTerminateBatchContract(deps, "r1", "cancelled");
  await dcTerminateBatchContract(deps, "r1", "failed", "boom");
  await dcTerminateBatchContract(deps, "r1", "error");
  assertEquals(calls[0].state, "delivered");
  assertEquals(calls[1].state, "harness_stalled");
  assertEquals(calls[2].state, "admin_escalated");
  assertEquals(calls[2].err, "boom");
  assertEquals(calls[3].state, "admin_escalated");
});
