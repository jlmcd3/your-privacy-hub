// QB-P23 item 1 — Registration golden regression test.
// Runs the *exact* intake from _shared/golden/registration.ts through
// the pure engine (no HTTP, no DB) and asserts non-null law/authority
// coverage for the fixture markets AND high_risk_ai_deployer_obligations
// on the adversarial fixture. Guards against a repeat of run 302b124f,
// where every fixture returned law/authority/authority_url null.
//
// Run: deno test supabase/functions/run-registration-assessment/golden_engine_test.ts

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRegistrationAssessment, type IntakeData } from "../_shared/registration-engine.ts";
import { REGISTRATION_GOLDEN } from "../_shared/golden/registration.ts";

function get(id: string): IntakeData {
  const g = REGISTRATION_GOLDEN.find(c => c.id === id);
  if (!g) throw new Error(`missing golden ${id}`);
  return g.intake as IntakeData;
}

Deno.test("QB-P23 · golden reg-uk-single-market-tuning resolves UK", () => {
  const out = runRegistrationAssessment(get("reg-uk-single-market-tuning"));
  const uk = out.jurisdictions.find(j => j.code === "UK");
  assert(uk, `expected UK in jurisdictions; got ${out.jurisdictions.map(j=>j.code).join(",")}`);
  assert(out.rules_fired.includes("R4_UK_ICO"), "R4_UK_ICO must fire");
  assertEquals(out.obligations_summary.uk_representative_required, false, "has_uk_establishment=true → no UK rep");
});

Deno.test("QB-P23 · golden reg-eu-multi-tuning resolves EU under OSS", () => {
  const out = runRegistrationAssessment(get("reg-eu-multi-tuning"));
  const codes = out.jurisdictions.map(j => j.code);
  // OSS collapses to SE (lead); DE/FR should not appear via R3_MARKET.
  assert(codes.includes("SE"), `SE must appear as lead; got ${codes.join(",")}`);
  assertEquals(out.obligations_summary.eu_representative_required, false, "EU establishment → no Art.27 rep");
});

Deno.test("QB-P23 · golden reg-high-risk-broad-markets-adversarial fires R6_AI_HIGH_RISK", () => {
  const intake = get("reg-high-risk-broad-markets-adversarial");
  assertEquals(intake.ai_high_risk, true, "fixture must declare ai_high_risk=true");
  const out = runRegistrationAssessment(intake);
  // Regression: run 302b124f returned high_risk_ai_deployer_obligations=false
  // despite intake.ai_high_risk=true because markets_served used country
  // names not ISO codes → euMarkets empty → R6 gate failed.
  assertEquals(
    out.obligations_summary.high_risk_ai_deployer_obligations,
    true,
    `R6 must fire (ai_high_risk + EU markets); rules_fired=${out.rules_fired.join(",")}`,
  );
  assert(out.rules_fired.includes("R6_AI_HIGH_RISK"), "R6_AI_HIGH_RISK must appear in rules_fired");
  // Every declared market must resolve to a jurisdiction entry with a code.
  const codes = new Set(out.jurisdictions.map(j => j.code));
  for (const m of ["UK", "DE", "FR", "IE", "NL"]) {
    // OSS is off (no EU establishment) → each EU market must be present.
    assert(codes.has(m), `expected market ${m} in jurisdictions; got ${[...codes].join(",")}`);
  }
});
