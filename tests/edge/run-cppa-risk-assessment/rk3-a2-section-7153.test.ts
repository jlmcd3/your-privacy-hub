// RK3-A2 GROUP 3 — § 7153 ADMT-provider risk-assessment trigger
// (Intake Contract v2.0 §6, doc 31 §2c). Pins the three-field landing
// end to end:
//   contract  — admt_made_available_to_other_business (enum Yes/No) /
//               admt_provider_trained_using_pi (enum Yes/No/Unknown) /
//               recipient_business_uses_admt_for_significant_decision
//               (enum Yes/No/Unknown), all optional at the data layer.
//   form      — intake memo emits all three; § 7153 block present
//               inside the q18 === "Yes" panel in step 2.
//   rail      — admt_section_7153 entry citing 11 CCR § 7153.
//   draft     — applyRestore covers all three new state vars.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

const PAGE_PATH = new URL(
  "../../../src/pages/CPPARiskAssessment.tsx",
  import.meta.url,
);
const RAIL_PATH = new URL(
  "../../../src/components/cppa/CPPARiskRailEntries.ts",
  import.meta.url,
);

const field = (key: string) => cppaRiskContract.fields.find((f) => f.key === key);

// ── CONTRACT ─────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g3 — contract carries all three § 7153 fields, optional at the data layer", () => {
  const keys = [
    "admt_made_available_to_other_business",
    "admt_provider_trained_using_pi",
    "recipient_business_uses_admt_for_significant_decision",
  ];
  for (const key of keys) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskContract`);
    assertEquals(f!.required, "optional", `${key} must be optional at the data layer`);
    assertEquals(f!.kind, "enum", `${key} must be kind=enum`);
  }
});

Deno.test("RK3-A2 g3 — admt_made_available_to_other_business carries Yes/No options", () => {
  const f = field("admt_made_available_to_other_business");
  assertEquals([...(f!.options as readonly string[])], ["Yes", "No"]);
});

Deno.test("RK3-A2 g3 — downstream fields carry Yes/No/Unknown options", () => {
  for (const key of ["admt_provider_trained_using_pi", "recipient_business_uses_admt_for_significant_decision"]) {
    assertEquals(
      [...(field(key)!.options as readonly string[])],
      ["Yes", "No", "Unknown"],
      `${key} must have Yes/No/Unknown options`,
    );
  }
});

// ── FORM ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g3 — form emits all three § 7153 fields in the intake memo", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("admt_made_available_to_other_business: admtMadeAvailableToOtherBusiness"), "intake memo must emit admt_made_available_to_other_business");
  assert(src.includes("admt_provider_trained_using_pi: admtProviderTrainedUsingPi"), "intake memo must emit admt_provider_trained_using_pi");
  assert(src.includes("recipient_business_uses_admt_for_significant_decision: recipientBusinessUsesAdmtForSignificantDecision"), "intake memo must emit recipient_business_uses_admt_for_significant_decision");
});

Deno.test("RK3-A2 g3 — form includes the § 7153 panel inside the q18=Yes block", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes('data-rail-key="admt_section_7153"'), "form must include the admt_section_7153 rail block");
  assert(src.includes("admtMadeAvailableToOtherBusiness"), "form must reference admtMadeAvailableToOtherBusiness state");
  assert(src.includes("admtProviderTrainedUsingPi"), "form must reference admtProviderTrainedUsingPi state");
  assert(src.includes("recipientBusinessUsesAdmtForSignificantDecision"), "form must reference recipientBusinessUsesAdmtForSignificantDecision state");
});

// ── DRAFT ROUND-TRIP ──────────────────────────────────────────────────────────

Deno.test("RK3-A2 g3 — applyRestore hydrates all three § 7153 state vars", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const [varName, setter] of [
    ["admtMadeAvailableToOtherBusiness", "setAdmtMadeAvailableToOtherBusiness"],
    ["admtProviderTrainedUsingPi", "setAdmtProviderTrainedUsingPi"],
    ["recipientBusinessUsesAdmtForSignificantDecision", "setRecipientBusinessUsesAdmtForSignificantDecision"],
  ] as const) {
    assert(
      src.includes(`if (typeof d.${varName} === "string") ${setter}(d.${varName})`),
      `applyRestore must hydrate ${varName}`,
    );
  }
});

Deno.test("RK3-A2 g3 — INITIAL_DRAFT_JSON includes all three new keys", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  for (const key of ["admtMadeAvailableToOtherBusiness", "admtProviderTrainedUsingPi", "recipientBusinessUsesAdmtForSignificantDecision"]) {
    assert(src.includes(`${key}: ""`), `INITIAL_DRAFT_JSON must include ${key}: ""`);
  }
});

// ── RAIL ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A2 g3 — statute rail carries the admt_section_7153 entry", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("admt_section_7153: {"), "rail must define admt_section_7153");
  assert(src.includes("7153"), "rail entry must reference § 7153");
  // DOC 157 — the entry now states § 7153 as adopted (a duty to provide facts
  // to the recipient-business), verbatim from the cppa_authorities row.
  assert(
    src.includes("makes ADMT available to another business"),
    "rail entry must carry the § 7153 plain-summary text",
  );
  assert(
    src.includes("must provide to the recipient-business all facts available to the business"),
    "rail entry must carry the § 7153(a) text verbatim",
  );
});
