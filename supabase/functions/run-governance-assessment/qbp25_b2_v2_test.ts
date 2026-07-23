// QB-P25 Turn B2 — unit tests for governance v2 helpers.
// Run: deno test supabase/functions/run-governance-assessment/qbp25_b2_v2_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  findingHasV2Deadline,
  isRecommendedActionV2Valid,
  isRegulatoryBasisV2Valid,
} from "./_qbp25_b1_v2.ts";

const validRA = {
  action: "Appoint a DPO and publish contact details.",
  owner: { role: "General Counsel", intake_field: "dpo_status" },
  trigger: "Processing includes special-category health data at scale.",
  deadline: { kind: "statutory", citation: "GDPR Art. 37(1)(c)" },
};

Deno.test("isRecommendedActionV2Valid — accepts a complete statutory entry", () => {
  assertEquals(isRecommendedActionV2Valid(validRA), true);
});

Deno.test("isRecommendedActionV2Valid — accepts a complete org_set entry", () => {
  const orgSet = { ...validRA, deadline: { kind: "org_set", illustrative_default: "this quarter" } };
  assertEquals(isRecommendedActionV2Valid(orgSet), true);
});

Deno.test("isRecommendedActionV2Valid — rejects empty action", () => {
  assertEquals(isRecommendedActionV2Valid({ ...validRA, action: "" }), false);
});

Deno.test("isRecommendedActionV2Valid — rejects empty intake_field", () => {
  assertEquals(isRecommendedActionV2Valid({ ...validRA, owner: { role: "GC", intake_field: "" } }), false);
});

Deno.test("isRecommendedActionV2Valid — rejects statutory deadline without citation", () => {
  assertEquals(isRecommendedActionV2Valid({ ...validRA, deadline: { kind: "statutory" } }), false);
});

Deno.test("isRecommendedActionV2Valid — rejects org_set deadline without illustrative_default", () => {
  assertEquals(isRecommendedActionV2Valid({ ...validRA, deadline: { kind: "org_set" } }), false);
});

Deno.test("isRecommendedActionV2Valid — rejects unknown deadline.kind", () => {
  assertEquals(isRecommendedActionV2Valid({ ...validRA, deadline: { kind: "vibes", citation: "x" } }), false);
});

Deno.test("isRecommendedActionV2Valid — rejects null / undefined / non-object", () => {
  assertEquals(isRecommendedActionV2Valid(null), false);
  assertEquals(isRecommendedActionV2Valid(undefined), false);
  assertEquals(isRecommendedActionV2Valid("string"), false);
});

Deno.test("isRegulatoryBasisV2Valid — accepts a well-formed array", () => {
  assertEquals(
    isRegulatoryBasisV2Valid([
      { citation: "GDPR Art. 28(3)(f)", engaged_because: "US-based processor accesses EU data" },
    ]),
    true,
  );
});

Deno.test("isRegulatoryBasisV2Valid — rejects empty engaged_because", () => {
  assertEquals(
    isRegulatoryBasisV2Valid([{ citation: "GDPR Art. 28(3)(f)", engaged_because: "" }]),
    false,
  );
});

Deno.test("isRegulatoryBasisV2Valid — rejects non-array", () => {
  assertEquals(isRegulatoryBasisV2Valid({}), false);
  assertEquals(isRegulatoryBasisV2Valid(null), false);
});

Deno.test("findingHasV2Deadline — true when recommended_action_v2 is fully valid", () => {
  assertEquals(findingHasV2Deadline({ recommended_action_v2: validRA }), true);
});

Deno.test("findingHasV2Deadline — false when v2 missing or invalid", () => {
  assertEquals(findingHasV2Deadline({}), false);
  assertEquals(findingHasV2Deadline({ recommended_action_v2: { action: "x" } }), false);
  assertEquals(findingHasV2Deadline(null), false);
});
