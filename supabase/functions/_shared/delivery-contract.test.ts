// DS-T1 unit tests — pure logic only (SLA table, iso helper).
// No network I/O; the DB-backed create/advance/heartbeat paths get
// end-to-end coverage in DS-T3 when the first tool wires the contract.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { slaFor, DELIVERY_CONTRACT_STAMP, _testables } from "./delivery-contract.ts";

Deno.test("build stamp is stable", () => {
  assertEquals(DELIVERY_CONTRACT_STAMP, "ds-t1@2026-07-24T11:02:40Z");
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

Deno.test("harness SLA overrides any tool — 180/900 for all", () => {
  const dpia = slaFor("harness", "dpia");
  const cyber = slaFor("harness", "cppa-cyber");
  const unknown = slaFor("harness", "made-up");
  assertEquals(dpia.stageSeconds, 180);
  assertEquals(dpia.overallSeconds, 900);
  assertEquals(cyber.stageSeconds, 180);
  assertEquals(unknown.stageSeconds, 180);
});

Deno.test("harness stage SLA is tighter than customer default", () => {
  const harness = slaFor("harness", "governance");
  const customerDefault = _testables().CUSTOMER_SLA_DEFAULT;
  assert(harness.stageSeconds <= customerDefault.stageSeconds,
    `harness stage (${harness.stageSeconds}) must be <= customer default (${customerDefault.stageSeconds})`);
});

Deno.test("isoInSeconds returns a future ISO string", () => {
  const iso = _testables().isoInSeconds(60);
  assert(new Date(iso).getTime() > Date.now() + 50_000);
});
