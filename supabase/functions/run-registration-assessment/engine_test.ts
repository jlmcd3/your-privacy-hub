// Persona snapshot tests for the registration rules engine.
// Run with: deno test supabase/functions/run-registration-assessment/engine_test.ts

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRegistrationAssessment, type IntakeData } from "../_shared/registration-engine.ts";

// ---------- Persona 1: US SaaS, no EU presence, EU customers ----------
Deno.test("Persona 1 — US SaaS selling into EU & UK", () => {
  const intake: IntakeData = {
    organization_country: "US",
    organization_size: "small",
    employee_count: 25,
    industry: "SaaS / Software",
    role: "controller",
    processes_personal_data: true,
    has_eu_establishment: false,
    has_uk_establishment: false,
    markets_served: ["US", "DE", "FR", "IE", "UK"],
  };
  const out = runRegistrationAssessment(intake);

  // Should require an EU Art. 27 representative (no EU establishment)
  assert(out.obligations_summary.eu_representative_required,
    "EU representative should be required");
  // Should require UK ICO fee + UK Art. 27 rep
  assert(out.obligations_summary.uk_representative_required);
  // Should NOT collapse to a single lead SA — each EU market remains
  const euCodes = out.jurisdictions.map(j => j.code).filter(c => ["DE","FR","IE"].includes(c));
  assertEquals(euCodes.sort(), ["DE","FR","IE"]);
  // Confidence should be at least medium (has home, markets, role, employees)
  assert(out.confidence !== "low", `Got ${out.confidence}`);
  assert(out.rules_fired.includes("R2_ART27"));
  assert(out.rules_fired.includes("R4_UK_ICO"));
});

// ---------- Persona 2: German SME, 25 employees, no AI ----------
Deno.test("Persona 2 — German SME triggers BDSG DPO at 20+ employees", () => {
  const intake: IntakeData = {
    organization_country: "DE",
    organization_size: "small",
    employee_count: 25,
    industry: "Manufacturing",
    role: "controller",
    processes_personal_data: true,
    has_eu_establishment: true,
    eu_lead_member_state: "DE",
    markets_served: ["DE", "AT", "FR"],
  };
  const out = runRegistrationAssessment(intake);

  // OSS should collapse EU markets to DE (lead SA)
  const euCodes = out.jurisdictions.map(j => j.code).filter(c => ["DE","AT","FR","IE"].includes(c));
  assertEquals(euCodes, ["DE"], "OSS should leave only the lead SA");
  // BDSG DPO rule must fire
  assert(out.obligations_summary.dpo_required, "DPO required at 20+ employees in DE");
  assert(out.rules_fired.includes("R5_DPO"));
  // No EU rep needed (has establishment)
  assertEquals(out.obligations_summary.eu_representative_required, false);
});

// ---------- Persona 3: UK Fintech, processes biometrics, no EU presence ----------
Deno.test("Persona 3 — UK Fintech with biometric ID & US-CA market", () => {
  const intake: IntakeData = {
    organization_country: "UK",
    organization_size: "medium",
    employee_count: 80,
    industry: "Financial services",
    role: "controller",
    processes_personal_data: true,
    processes_biometrics_for_id: true,
    processes_special_categories: true,
    has_uk_establishment: true,
    sells_or_shares_personal_info: false,
    acts_as_data_broker: false,
    markets_served: ["UK", "US-CA", "US-IL"],
  };
  const out = runRegistrationAssessment(intake);

  // ICO fee, no UK rep needed (has establishment)
  assert(out.rules_fired.includes("R4_UK_ICO"));
  assertEquals(out.obligations_summary.uk_representative_required, false);
  // DPO required — special categories
  assert(out.obligations_summary.dpo_required);
  // BIPA fires for IL
  const il = out.jurisdictions.find(j => j.code === "US-IL");
  assert(il, "US-IL should be in recommendations (BIPA)");
  assert(il!.obligations.includes("biometric_consent_policy"));
});

// ---------- Persona 4: French AdTech, sells PI, GPAI provider, EU establishment ----------
Deno.test("Persona 4 — French AdTech, GPAI provider, US data broker", () => {
  const intake: IntakeData = {
    organization_country: "FR",
    organization_size: "medium",
    employee_count: 120,
    industry: "AdTech / MarTech",
    role: "both",
    processes_personal_data: true,
    large_scale_monitoring: true,
    uses_ai_systems: true,
    ai_general_purpose_provider: true,
    has_eu_establishment: true,
    eu_lead_member_state: "FR",
    acts_as_data_broker: true,
    sells_or_shares_personal_info: true,
    markets_served: ["FR","DE","ES","UK","US","US-CA","US-VT","US-TX"],
  };
  const out = runRegistrationAssessment(intake);

  // OSS collapses EU markets to FR (lead SA). DE may still surface for the
  // BDSG-specific DPO note even under OSS, but ES/IE should NOT.
  const euCodes = out.jurisdictions.map(j => j.code).filter(c => ["FR","ES","IE"].includes(c));
  assertEquals(euCodes, ["FR"], "OSS should leave only FR (DE may remain for BDSG DPO note)");
  // DE entry, if present, should be tagged with the BDSG DPO rule, not a generic market rule
  const de = out.jurisdictions.find(j => j.code === "DE");
  if (de) assertEquals(de.rule_id, "R5_DE_DPO");
  // UK still gets ICO fee + UK rep (no UK establishment declared)
  assert(out.obligations_summary.uk_representative_required);
  // Data broker registries: "US" is in markets, so all four state registries fire
  const brokerStates = out.obligations_summary.data_broker_registrations.sort();
  assertEquals(brokerStates, ["US-CA","US-OR","US-TX","US-VT"]);
  // GPAI obligations
  assert(out.obligations_summary.ai_act_provider_obligations);
  assert(out.rules_fired.includes("R6_AI_GPAI"));
  // DPO required (large-scale monitoring)
  assert(out.obligations_summary.dpo_required);
  // Confidence is high
  assertEquals(out.confidence, "high");
});

// ---------- Edge case: minimal intake → low confidence + warnings ----------
Deno.test("Edge — minimal intake yields low confidence and warnings", () => {
  const out = runRegistrationAssessment({ markets_served: ["DE"] });
  assertEquals(out.confidence, "low");
  assert(out.warnings.length >= 2, "Expected warnings about missing context");
});
