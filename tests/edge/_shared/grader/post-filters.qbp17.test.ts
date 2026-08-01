// QB-P17 item 4 — mixed-evidence corpus MUST survive the a4 filter.
// Also verifies pure affirmations still drop, and dpa_defaults counters exist.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyGraderCal1Filter } from "../../../../supabase/functions/_shared/grader/post-filters.ts";

const MIXED_MUST_SURVIVE = [
  "The citation is correct but applied to the wrong proposition.",
  "Recommendations are actionable only in name.",
  "This citation is correctly cited, however the section number is misapplied.",
  "The report properly cites § 7002, but the analysis fails to address the operative duty.",
  "Recommendations provide actionable guidance, although the timelines are missing.",
];

const PURE_AFFIRMATIONS_MUST_DROP = [
  "This citation is correct.",
  "Recommendations are actionable.",
  "The report properly cites the operative statute.",
  "No leak found beyond whitelisted formulae.",
];

Deno.test("a4: mixed-evidence findings survive the affirmation filter", () => {
  const findings = MIXED_MUST_SURVIVE.map((ev, i) => ({
    check_id: `rubric_actionability_${i}`,
    dimension: "analysis",
    severity: "medium",
    passed: false,
    evidence: ev,
  }));
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(dropped.a4, 0, `expected 0 a4 drops, got ${dropped.a4}`);
  assertEquals(kept.length, findings.length);
});

Deno.test("a4: pure affirmations still drop", () => {
  const findings = PURE_AFFIRMATIONS_MUST_DROP.map((ev, i) => ({
    check_id: `rubric_actionability_${i}`,
    dimension: "analysis",
    severity: "medium",
    passed: false,
    evidence: ev,
  }));
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(dropped.a4, findings.length);
  assertEquals(kept.length, 0);
});

Deno.test("dpa_defaults counter is present in the drop shape", () => {
  const { dropped } = applyGraderCal1Filter([]);
  assertEquals(typeof dropped.dpa_defaults, "number");
  assertEquals(dropped.dpa_defaults, 0);
});

Deno.test("dpa_defaults drops rubric findings that quote (default — confirm)", () => {
  const findings = [{
    check_id: "rubric_specificity",
    dimension: "analysis",
    severity: "medium",
    passed: false,
    evidence: "TLS 1.2+ (default — confirm) is under-specified.",
  }];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(dropped.dpa_defaults, 1);
  assertEquals(kept.length, 0);
});
