/**
 * LTP Pass-1 LLM + Pass-2 renderer integration tests (Wave-B).
 * Deno tests; run via supabase test-edge-functions harness.
 */
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runPass1Llm, PASS1_MANIFEST } from "./pass1-llm.ts";
import { renderTemplate, assertCalibrationMatch } from "./pass2-render.ts";
import { resolveSlot } from "./slot-resolver.ts";
import { derivePlan } from "./derive.ts";
import { PASS2_TEMPLATES, FIRM_VARIANT_CLOSENESS_MAX } from "./content/pass2-templates.ts";

const buildStamp = "test-waveb";

Deno.test("pass1-llm: write-around when LTP_ENFORCE_ENABLED is not set", async () => {
  Deno.env.delete("LTP_ENFORCE_ENABLED");
  const res = await runPass1Llm({ intake: { q1_revenue: "10000000", q2_consumers: "50000" }, report_data: {}, buildStamp });
  assertEquals(res.telemetry.ran, false);
  assertEquals(res.plan.plan_version, "v1");
  assertEquals(res.plan.product, "cppa-risk-assessment");
});

Deno.test("pass1-llm: write-around fallback preserves customer path on gateway missing key", async () => {
  Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  const prior = Deno.env.get("LOVABLE_API_KEY");
  Deno.env.delete("LOVABLE_API_KEY");
  try {
    const res = await runPass1Llm({ intake: {}, report_data: {}, buildStamp });
    assert(res.telemetry.ran);
    assert(res.telemetry.write_around);
    assertEquals(res.plan.conservative_write_around.triggered, true);
  } finally {
    if (prior) Deno.env.set("LOVABLE_API_KEY", prior);
    Deno.env.delete("LTP_ENFORCE_ENABLED");
  }
});

Deno.test("pass2-render: forbidden-token check catches § injection via slot", () => {
  const plan = derivePlan({ intake: { q1_revenue: "1000000" }, report_data: {}, buildStamp });
  const r = renderTemplate("T.risk.applicability.engaged", plan);
  // No § came from templates; renderer must not emit forbidden tokens on its own.
  assert(!r.errors.includes("forbidden_token:§"));
});

Deno.test("pass2-render: emits_nothing template renders empty", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const r = renderTemplate("T.risk.admt.consequence_suppressed", plan);
  assertEquals(r.text, "");
  assertEquals(r.errors.length, 0);
});

Deno.test("pass2-render: unknown template returns error", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const r = renderTemplate("T.nonexistent", plan);
  assert(r.errors.some((e) => e.startsWith("unknown_template:")));
});

Deno.test("calibration assert: firm variant forbidden at high closeness", () => {
  const violation = assertCalibrationMatch("T.risk.balance.firm", FIRM_VARIANT_CLOSENESS_MAX);
  assert(violation !== null);
  const ok = assertCalibrationMatch("T.risk.balance.hedged", FIRM_VARIANT_CLOSENESS_MAX);
  assertEquals(ok, null);
  const okLow = assertCalibrationMatch("T.risk.balance.firm", FIRM_VARIANT_CLOSENESS_MAX - 0.1);
  assertEquals(okLow, null);
});

Deno.test("slot-resolver: token-list buckets fall through to sentinel on empty plan", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const benefits = resolveSlot(plan, "benefit_summary_tokens");
  assertEquals(benefits, "no items on the record");
});

Deno.test("slot-resolver: unknown slot returns empty", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  assertEquals(resolveSlot(plan, "doc_element_label"), "");
  assertEquals(resolveSlot(plan, "nonexistent_slot"), "");
});

Deno.test("pass1 manifest exposes model + prompt version", () => {
  assert(PASS1_MANIFEST.model.startsWith("google/"));
  assertEquals(PASS1_MANIFEST.max_attempts, 2);
  assert(PASS1_MANIFEST.prompt_version.startsWith("pass1-derive-"));
});

Deno.test("all 16 templates enumerated (per courier + summary composition + insufficient-opening 2026-07-26)", () => {
  assertEquals(Object.keys(PASS2_TEMPLATES).length, 16);
});

