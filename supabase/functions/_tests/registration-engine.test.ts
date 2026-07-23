// QL2-FIX-1 Item 2.5 — engine output for a US+CA+VA fixture has unique jurisdiction
// codes, ISO-form codes, and (structurally) can be joined to law/authority metadata.
// The engine itself is DB-free; law/authority are populated by the edge function
// wrapper via jurisdiction_requirements lookup. This test verifies the engine emits
// ISO codes with no duplicates so that lookup can find a row per code.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  runRegistrationAssessment,
  type IntakeData,
} from "../_shared/registration-engine.ts";

Deno.test("US+CA+VA fixture emits unique ISO-form jurisdiction codes", () => {
  const intake: IntakeData = {
    organization_country: "US",
    markets_served: ["US-CA", "US-VA"],
    organization_size: "large",
    role: "controller",
    processes_personal_data: true,
    sells_or_shares_personal_info: true,
    cross_border_transfers: false,
  };
  const out = runRegistrationAssessment(intake);
  const codes = out.jurisdictions.map((j) => j.code);
  // No duplicates.
  assertEquals(new Set(codes).size, codes.length, `duplicate codes: ${codes.join(", ")}`);
  // Every code is ISO-form: 2-letter country OR country-subdivision.
  const isoRe = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
  for (const c of codes) {
    assert(isoRe.test(c), `non-ISO code emitted: "${c}"`);
  }
  // Home US and both state markets present.
  assert(codes.includes("US"), `expected home US in codes: ${codes.join(", ")}`);
  assert(codes.includes("US-CA"), `expected US-CA in codes: ${codes.join(", ")}`);
  assert(codes.includes("US-VA"), `expected US-VA in codes: ${codes.join(", ")}`);
  // Guard against the QL2 defect: readable name never leaks into `code`.
  for (const c of codes) {
    assert(!c.includes(" "), `code contains whitespace (display name leak): "${c}"`);
    assert(!/united states/i.test(c), `display-name leak in code: "${c}"`);
  }
});

Deno.test("EU fixture: OSS lead + non-EU country ISO codes, no display-name leaks", () => {
  const intake: IntakeData = {
    organization_country: "DE",
    markets_served: ["FR", "IT", "GB"],
    has_eu_establishment: true,
    has_uk_establishment: true,
    role: "controller",
    processes_personal_data: true,
    cross_border_transfers: true,
  };
  const out = runRegistrationAssessment(intake);
  const codes = out.jurisdictions.map((j) => j.code);
  assertEquals(new Set(codes).size, codes.length);
  const isoRe = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
  for (const c of codes) assert(isoRe.test(c), `non-ISO code: "${c}"`);
});

// ── CEO decision 2026-07-23 — public-authority gate ─────────────────
// duplicate import removed — already imported at top of file

Deno.test("R6 private high-risk deployer: no Art. 49(3) content, no public-authority framing", () => {
  const out = runRegistrationAssessment({
    organization_name: "PolyCare AI",
    organization_country: "GB",
    has_uk_establishment: true,
    ai_high_risk: true,
    markets_served: ["DE", "FR", "IE"],
    is_public_authority: false,
  });
  const dump = JSON.stringify(out);
  if (/Art(?:icle|\.)?\s*49\(3\)/i.test(dump)) throw new Error("engine leaked Art. 49(3) for private deployer");
  if (/public[- ]authority|Union body/i.test(dump)) throw new Error("engine leaked public-authority framing for private deployer");
  if (!out.rules_fired.includes("R6_AI_HIGH_RISK")) throw new Error("R6 did not fire");
  const target = out.jurisdictions.find((j) => j.rule_id === "R6_AI_HIGH_RISK");
  if (!target || !target.obligations.includes("ai_deployer_duties")) {
    throw new Error("expected ai_deployer_duties obligation for private high-risk deployer");
  }
});

Deno.test("R6 public-authority high-risk deployer: emits Art. 49(3) EU-database card", () => {
  const out = runRegistrationAssessment({
    organization_name: "City of Rotterdam",
    organization_country: "NL",
    has_eu_establishment: true,
    eu_lead_member_state: "NL",
    ai_high_risk: true,
    markets_served: ["NL"],
    is_public_authority: true,
  });
  const dump = JSON.stringify(out);
  if (!/Art(?:icle|\.)?\s*49\(3\)/i.test(dump)) throw new Error("expected Art. 49(3) for public-authority deployer");
  const target = out.jurisdictions.find((j) => j.rule_id === "R6_AI_HIGH_RISK");
  if (!target || !target.obligations.includes("ai_eu_database_public_authority")) {
    throw new Error("expected ai_eu_database_public_authority obligation");
  }
});

Deno.test("R6 default (is_public_authority absent) treated as private — no Art. 49(3)", () => {
  const out = runRegistrationAssessment({
    organization_country: "IE",
    has_eu_establishment: true,
    ai_high_risk: true,
    markets_served: ["IE"],
  });
  const dump = JSON.stringify(out);
  if (/Art(?:icle|\.)?\s*49\(3\)/i.test(dump)) throw new Error("default (absent flag) leaked Art. 49(3)");
});
