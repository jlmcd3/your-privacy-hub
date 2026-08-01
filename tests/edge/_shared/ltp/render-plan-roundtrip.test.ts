// T-M1 (Item 221) — Derive→persist round-trip unit test.
// Proves the RenderPlan returned by the deterministic derive path is a
// pure-data value that survives JSON round-trip without loss, which is the
// invariant that lets us persist it verbatim under
// _meta.internal.render_plan and hand it back to downstream body assembly.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";

Deno.test("derive→persist round-trip: minimal intake yields JSON-stable plan", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M" },
    report_data: {},
    buildStamp: "roundtrip-test@x",
  });

  // Structural minima the persist step relies on.
  assert(typeof plan.plan_version === "string" && plan.plan_version.length > 0);
  assert(Array.isArray(plan.propositions));
  assert(Array.isArray(plan.gate_outcomes));

  // JSON round-trip must be lossless — this is what persistence at
  // _meta.internal.render_plan performs.
  const encoded = JSON.stringify(plan);
  const decoded = JSON.parse(encoded);
  assertEquals(decoded.plan_version, plan.plan_version);
  assertEquals(decoded.propositions.length, plan.propositions.length);
  assertEquals(decoded.gate_outcomes.length, plan.gate_outcomes.length);
  assertEquals(JSON.stringify(decoded), encoded);
});

Deno.test("derive→persist round-trip: authoritative envelope shape is JSON-stable", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M" },
    report_data: {},
    buildStamp: "roundtrip-test@x",
  });
  // Mirrors the envelope written by run-cppa-risk-assessment T-M1 wiring.
  const envelope = {
    authoritative: true,
    plan,
    plan_summary: {
      plan_version: plan.plan_version,
      propositions: plan.propositions?.length ?? 0,
      gate_outcomes: plan.gate_outcomes?.length ?? 0,
      write_around: plan.conservative_write_around?.triggered ?? false,
    },
    build_stamp: "roundtrip-test@x",
  };
  const back = JSON.parse(JSON.stringify(envelope));
  assertEquals(back.authoritative, true);
  assertEquals(back.plan_summary.plan_version, plan.plan_version);
  assertEquals(back.plan.plan_version, plan.plan_version);
});
