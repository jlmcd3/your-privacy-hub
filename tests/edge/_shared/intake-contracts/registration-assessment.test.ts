// REGISTRATION-INTAKE-CONTRACT-RAIL-MAP (2026-07-24) — contract shape +
// validate tests for the Registration Assessment intake contract.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateIntake } from "../../../../supabase/functions/_shared/intake-contracts/validate.ts";
import {
  registrationContract,
  REGISTRATION_ORG_SIZES,
  REGISTRATION_INDUSTRIES,
  REGISTRATION_ROLES,
  REGISTRATION_EU_LEAD_CODES,
  REGISTRATION_MARKET_CODES,
} from "../../../../archive/unwired/_shared/intake-contracts/registration-assessment.ts";

Deno.test("registration contract / shape", () => {
  assertEquals(registrationContract.tool_type, "registration_assessment");
  assert(registrationContract.fields.length >= 20);
  const keys = new Set(registrationContract.fields.map((f) => f.key));
  for (
    const k of [
      "organization_name", "is_public_authority", "organization_country",
      "organization_size", "industry", "email", "employee_count",
      "annual_revenue_usd", "data_subjects_count", "role",
      "processes_personal_data", "processes_special_categories",
      "processes_children_data", "large_scale_monitoring",
      "uses_ai_systems", "ai_high_risk", "ai_general_purpose_provider",
      "cross_border_transfers", "acts_as_data_broker",
      "sells_or_shares_personal_info", "processes_biometrics_for_id",
      "has_eu_establishment", "has_uk_establishment",
      "eu_lead_member_state", "markets_served",
    ]
  ) {
    assert(keys.has(k), `missing key: ${k}`);
  }
});

Deno.test("registration contract / enum options wired to source lists", () => {
  const byKey = new Map(registrationContract.fields.map((f) => [f.key, f]));
  assertEquals(byKey.get("organization_size")!.options, REGISTRATION_ORG_SIZES);
  assertEquals(byKey.get("industry")!.options, REGISTRATION_INDUSTRIES);
  assertEquals(byKey.get("role")!.options, REGISTRATION_ROLES);
  assertEquals(byKey.get("eu_lead_member_state")!.options, REGISTRATION_EU_LEAD_CODES);
  assertEquals(byKey.get("markets_served")!.options, REGISTRATION_MARKET_CODES);
});

Deno.test("registration validate / EU-establishment happy path", () => {
  const intake = {
    organization_name: "North Pole Manual Mining Ltd",
    is_public_authority: false,
    organization_country: "IE",
    organization_size: "medium",
    industry: "Manufacturing",
    email: "privacy@example.com",
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: false,
    processes_children_data: false,
    large_scale_monitoring: false,
    uses_ai_systems: false,
    ai_high_risk: false,
    ai_general_purpose_provider: false,
    cross_border_transfers: true,
    acts_as_data_broker: false,
    sells_or_shares_personal_info: false,
    processes_biometrics_for_id: false,
    has_eu_establishment: true,
    has_uk_establishment: false,
    eu_lead_member_state: "IE",
    markets_served: ["IE", "DE", "FR", "UK"],
  };
  const res = validateIntake(registrationContract, intake);
  assertEquals(res.violations, []);
  assert(res.ok);
});

Deno.test("registration validate / US data-broker happy path", () => {
  const intake = {
    organization_name: "Busted Sled Solutions, Inc.",
    is_public_authority: false,
    organization_country: "US",
    organization_size: "small",
    industry: "AdTech / MarTech",
    role: "controller",
    processes_personal_data: true,
    acts_as_data_broker: true,
    sells_or_shares_personal_info: true,
    processes_biometrics_for_id: false,
    has_eu_establishment: false,
    has_uk_establishment: false,
    markets_served: ["US-CA", "US-CO", "US-VA"],
  };
  const res = validateIntake(registrationContract, intake);
  assertEquals(res.violations, []);
  assert(res.ok);
});

Deno.test("registration validate / rejects unknown key and bad enum", () => {
  const res = validateIntake(registrationContract, {
    organization_name: "X",
    organization_country: "IE",
    organization_size: "gigantic",       // not in enum
    role: "auditor",                     // not in enum
    markets_served: ["ATLANTIS"],        // not in enum
    mystery_field: 1,                    // unknown
  });
  assert(!res.ok);
  const reasons = res.violations.map((v) => `${v.key}:${v.reason}`).join("|");
  assert(reasons.includes("organization_size"));
  assert(reasons.includes("role"));
  assert(reasons.includes("markets_served"));
  assert(reasons.includes("mystery_field"));
});

Deno.test("registration validate / requires organization_name", () => {
  const res = validateIntake(registrationContract, {
    organization_country: "IE",
    markets_served: ["IE"],
  });
  assert(!res.ok);
  assert(res.violations.some((v) => v.key === "organization_name"));
});
