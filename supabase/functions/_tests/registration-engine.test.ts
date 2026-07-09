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
