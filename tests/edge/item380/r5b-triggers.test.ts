// ITEM 380 r5b — CONTRACT CORRECTION: REAL FORM TRIGGERS.
//
// Each corrected key is proved twice: trigger OFF ⇒ the key is not counted as
// an unanswered ask (the form never showed the control), trigger ON + empty ⇒
// the key IS counted. `source_assessment_id` is proved excluded as a system
// key in both directions.
//
// Form citations encoded here:
//   controller_land          — src/pages/DPIAFramework.tsx L911
//                              {controllerCountry === "DE" && ( … )}
//   secondary_activities     — src/pages/CPPARiskAssessment.tsx L1147/L688
//                              hasSecondaryUses === "Yes — there are other uses"
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { emptyAskedKeys, SYSTEM_KEYS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";

Deno.test("r5b: controller_land — trigger OFF (non-DE controller) is not counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "IE" });
  assert(!empty.includes("controller_land"), "non-DE controller was never asked for a Land");
});

Deno.test("r5b: controller_land — trigger ON (DE) + empty IS counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "DE", controller_land: "" });
  assert(empty.includes("controller_land"), "a German controller was asked and left it blank");
});

Deno.test("r5b: controller_land — trigger ON + answered is not counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "DE", controller_land: "Bavaria" });
  assert(!empty.includes("controller_land"));
});

Deno.test("r5b: secondary_activities — trigger OFF (No) is not counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "No — this data is used for this activity only",
    secondary_activities: [],
  });
  assert(!empty.includes("secondary_activities"), "the repeater was never rendered");
});

Deno.test("r5b: secondary_activities — trigger ON (Yes) + empty IS counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes — there are other uses",
    secondary_activities: [],
  });
  assert(empty.includes("secondary_activities"), "the fork said Yes and no row was described");
});

Deno.test("r5b: secondary_activities — trigger ON + rows is not counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes — there are other uses",
    secondary_activities: [{ name: "Lookalike modelling", purpose: "Audience expansion" }],
  });
  assert(!empty.includes("secondary_activities"));
});

Deno.test("r5b: trigger matching is verbatim — a near-miss value does not trigger", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes",
    secondary_activities: [],
  });
  assert(!empty.includes("secondary_activities"), "only the verbatim stored option triggers");
});

Deno.test("r5b: source_assessment_id is a SYSTEM key, never counted as an ask", () => {
  assert(SYSTEM_KEYS.has("source_assessment_id"));
  assertEquals(
    emptyAskedKeys(dpiaFrameworkContract, {}).includes("source_assessment_id"),
    false,
  );
  assertEquals(
    emptyAskedKeys(dpiaFrameworkContract, { source_assessment_id: null }).includes("source_assessment_id"),
    false,
  );
});
