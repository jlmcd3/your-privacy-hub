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

// L5-followup: eight previously-unclassified rows are now closed.
Deno.test("L5-followup / e1_section_present + e1_section_order → feature/L3", () => {
  for (const id of ["e1_section_present", "e1_section_order"]) {
    const r = classify(id);
    assertEquals(r.class, "feature");
    assertEquals(r.lever, "L3");
    assert(r.notes && /typed slots/i.test(r.notes), `${id} notes should reference typed slots`);
  }
});

Deno.test("L5-followup / h1_article_phrasing → feature/L2 (pre-emit gate)", () => {
  const r = classify("h1_article_phrasing");
  assertEquals(r.class, "feature");
  assertEquals(r.lever, "L2");
  assert(r.notes && /pre-emit/i.test(r.notes));
});

Deno.test("L5-followup / h5_internal_note_block + h4_evasive_placeholder → feature/L2/in_progress", () => {
  for (const id of ["h5_internal_note_block", "h4_evasive_placeholder"]) {
    const r = classify(id);
    assertEquals(r.class, "feature");
    assertEquals(r.lever, "L2");
    assertEquals(r.status, "in_progress");
    assert(r.notes && /Scrubber shipped W6/.test(r.notes));
  }
});

Deno.test("L5-followup / e3_tbc_unclosed → feature/L2/in_progress (likely extinct)", () => {
  const r = classify("e3_tbc_unclosed");
  assertEquals(r.class, "feature");
  assertEquals(r.lever, "L2");
  assertEquals(r.status, "in_progress");
  assert(r.notes && /Named-gap doctrine/.test(r.notes));
  assert(r.notes && /last seen wave 1/i.test(r.notes));
});

Deno.test("L5-followup / zero previously-unclassified rows remain in this batch", () => {
  const closed = [
    "e1_section_present", "e1_section_order",
    "h1_article_phrasing",
    "h5_internal_note_block", "h4_evasive_placeholder",
    "e3_tbc_unclosed",
  ];
  for (const id of closed) {
    assertEquals(classify(id).class !== "unclassified", true, `${id} still unclassified`);
  }
});
