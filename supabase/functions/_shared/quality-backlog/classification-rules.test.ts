// CPPA-PRODUCT-1 L5: unit test for the classification rules table.
// Ensures every rule uses a valid class + lever combo and that the top
// W5-W7 failure classes are all mapped (no silent "unclassified" leaks
// for the recurring high-volume classes).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CLASS_BY_CHECK_ID, classify } from "./classification-rules.ts";

const VALID_CLASSES = new Set(["prompt", "feature", "intake", "measurement_noise", "unclassified"]);
const VALID_LEVERS = new Set(["L1", "L2", "L3", "L4", "prompt", "variance", null]);

Deno.test("every rule uses a valid class and lever", () => {
  for (const [id, rule] of Object.entries(CLASS_BY_CHECK_ID)) {
    assert(VALID_CLASSES.has(rule.class), `bad class for ${id}: ${rule.class}`);
    assert(VALID_LEVERS.has(rule.lever), `bad lever for ${id}: ${rule.lever}`);
  }
});

Deno.test("top W5-W7 recurring classes are mapped (not unclassified)", () => {
  const mustMap = [
    "rubric_unsupported_business_claim",
    "rubric_citation_misapplied",
    "rubric_actionability",
    "rubric_generic_boilerplate",
    "rubric_internal_reasoning_leak",
    "qc_r1_1_no_asks_on_resolved_tests",
    "qc_r1_4_cohort_determinism",
    "h3_admt_citation_depth",
    "h6_admt_governing_anchor",
    "h7_admt_blanket_range",
    "no_hallucinated_section_numbers",
    "art11_gate_enforced",
    "e6_counsel_referral",
  ];
  for (const id of mustMap) {
    const r = classify(id);
    assert(r.class !== "unclassified", `${id} must be mapped`);
  }
});

Deno.test("unknown check_id falls back to unclassified/null lever", () => {
  const r = classify("totally_made_up_check_id");
  assertEquals(r.class, "unclassified");
  assertEquals(r.lever, null);
});
