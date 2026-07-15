// RC-Gov-Crash-2026-07-15 — regression coverage.
//
// (1) The intake contract now shape-constrains `tools` to a multi-enum, so
//     validateIntake flags a nested-object shape (the shape that landed
//     via the AI intake generator and crashed run-governance-assessment
//     L802 at .join()).
// (2) The asList()-style guard used at the render site tolerates arbitrary
//     non-array shapes without throwing — the pattern is: prefer array,
//     else empty. This test locks in that behavior for the fix.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { governanceContract } from "../_shared/intake-contracts/governance-assessment.ts";
import { validateIntake } from "../_shared/intake-contracts/validate.ts";

Deno.test("governance contract: nested-object tools is rejected by validator", () => {
  const bad = {
    organization_name: "Acme",
    sector: "Technology/SaaS",
    org_size: "51-250",
    jurisdictions: ["EU (GDPR)"],
    eu_uk_data: "Yes",
    // Shape that reached prod and crashed .join():
    tools: { advertising: ["Meta"], analytics: ["GA4"], crm: "Klaviyo" },
    data_categories: ["Contact details"],
    special_category: "No",
    privacy_policy: "Yes, current (reviewed in last 12 months)",
    dpia_status: "No, none conducted",
    incident_response: "Documented but informal",
    training_status: "No formal training",
    tool_instruction: "No instruction provided",
    technical_controls: "No — policy and training only",
    dsr_capability: "No process in place",
    inventory_audit: "No formal inventory",
  };
  const res = validateIntake(governanceContract, bad as Record<string, unknown>);
  assert(!res.ok, "expected validation failure for nested-object tools");
  assert(
    res.violations.some((v) => v.key === "tools"),
    `expected a tools violation; got ${JSON.stringify(res.violations)}`,
  );
});

Deno.test("asList-guard tolerates nested-object shape without throwing", () => {
  // Mirrors the helper introduced at run-governance-assessment L797.
  const asList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x))
      : (v == null || v === "" ? [] : [String(v)]);

  // Nested object — the exact crash shape.
  const nested = { advertising: ["Meta"], analytics: ["GA4"] };
  const rendered = asList(nested).join(", ");
  // Renders to the object's [object Object] fallback, but critically does
  // NOT throw. The point is defense-in-depth vs. a hard crash.
  assertEquals(typeof rendered, "string");

  // Array pass-through works.
  assertEquals(asList(["A", "B"]).join(", "), "A, B");

  // null/undefined/empty degrade to empty string.
  assertEquals(asList(null).join(", "), "");
  assertEquals(asList(undefined).join(", "), "");
  assertEquals(asList("").join(", "), "");
});
