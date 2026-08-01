// DS-T1 unit tests — pure logic only (SLA table, iso helper).
// No network I/O; the DB-backed create/advance/heartbeat paths get
// end-to-end coverage in DS-T3 when the first tool wires the contract.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { slaFor, DELIVERY_CONTRACT_STAMP, _testables } from "./delivery-contract.ts";

Deno.test("build stamp is stable", () => {
  assertEquals(DELIVERY_CONTRACT_STAMP, "ds-t2c@2026-07-25T04:53:00Z");
});

Deno.test("customer SLA — DPIA multi-unit gets 300/1200", () => {
  const sla = slaFor("customer", "dpia");
  assertEquals(sla.stageSeconds, 300);
  assertEquals(sla.overallSeconds, 1200);
});

Deno.test("customer SLA — governance single-shot gets 180/600", () => {
  const sla = slaFor("customer", "governance");
  assertEquals(sla.stageSeconds, 180);
  assertEquals(sla.overallSeconds, 600);
});

Deno.test("customer SLA — unknown tool falls back to default 240/900", () => {
  const sla = slaFor("customer", "does-not-exist");
  assertEquals(sla.stageSeconds, 240);
  assertEquals(sla.overallSeconds, 900);
});

Deno.test("harness SLA (ds-t2c) is sized to real campaign wave — 900/5400", () => {
  const dpia = slaFor("harness", "dpia");
  const cyber = slaFor("harness", "cppa-cyber");
  const unknown = slaFor("harness", "made-up");
  assertEquals(dpia.stageSeconds, 900);
  assertEquals(dpia.overallSeconds, 5400);
  assertEquals(cyber.stageSeconds, 900);
  assertEquals(unknown.stageSeconds, 900);
});

Deno.test("harness stage SLA now covers a full wave (>= 15 min) and overall >= 1h floor", () => {
  const harness = slaFor("harness", "governance");
  assert(harness.stageSeconds >= 15 * 60,
    `harness stage (${harness.stageSeconds}) must be >= 900s (15 min)`);
  assert(harness.overallSeconds >= 3600,
    `harness overall (${harness.overallSeconds}) must be >= 3600s floor`);
});

Deno.test("isoInSeconds returns a future ISO string", () => {
  const iso = _testables().isoInSeconds(60);
  assert(new Date(iso).getTime() > Date.now() + 50_000);
});
