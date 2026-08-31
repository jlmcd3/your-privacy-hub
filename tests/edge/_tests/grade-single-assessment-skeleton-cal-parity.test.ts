// SKELETON-MODE CALIBRATION PARITY (2026-08-31) — grade-single-assessment
// (the /admin/all-products-test grader) previously applied none of
// run-quality-batch's CEO-ratified skeleton-mode calibration, so its scores
// diverged from /admin/so-final-test's scores for the same converted-document
// shape. This tests the mirror module directly (skeleton-calibration-mirror.ts)
// rather than grade-single-assessment/index.ts's gradeOne(), since gradeOne
// makes live Claude/GPT API calls and cannot be unit-tested without them.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySkeletonCalibration,
  applyEvidenceBackedDimensionFloor,
  hasSkeletonDocument,
} from "../../../supabase/functions/_shared/grader/skeleton-calibration-mirror.ts";

Deno.test("hasSkeletonDocument true only for a report carrying a non-empty skeleton_document.sections", () => {
  assertEquals(hasSkeletonDocument({ skeleton_document: { sections: [{ id: "s1" }] } }), true);
  assertEquals(hasSkeletonDocument({ skeleton_document: { sections: [] } }), false);
  assertEquals(hasSkeletonDocument({}), false);
  assertEquals(hasSkeletonDocument(null), false);
});

Deno.test("Rule 6 (ITEM-204) drops the cyber cohort-omission finding but keeps an unrelated finding", () => {
  const findings = [
    {
      check_id: "rubric_actionability",
      dimension: "intelligence",
      severity: "medium",
      passed: false,
      evidence:
        "The report does not surface the April 1, 2028 cohort deadline applicable to Harborstone (revenue 'Over $100M' maps to the first cohort under 11 CCR § 7121(a)(1)).",
    },
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence: "Cites § 7150(b)(1) for a claim about breach notification timing, which is governed by Civil Code § 1798.82.",
    },
  ];
  const { kept, filtered, counts } = applySkeletonCalibration(findings as any);
  assertEquals(counts.cal_skeleton_6, 1);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_6");
  assertEquals(kept.length, 1);
  assertEquals(kept[0].check_id, "rubric_citation_misapplied");
});

Deno.test("Rule 6 does NOT drop an affirmative-error cohort finding (misstated, not omitted)", () => {
  const findings = [
    {
      check_id: "rubric_actionability",
      dimension: "intelligence",
      severity: "medium",
      passed: false,
      evidence: "The report misstates the § 7121(a) cohort deadline as April 1, 2027 instead of 2028.",
    },
  ];
  const { kept, counts } = applySkeletonCalibration(findings as any);
  assertEquals(counts.cal_skeleton_6, 0);
  assertEquals(kept.length, 1);
});

Deno.test("applyEvidenceBackedDimensionFloor raises an unsupported sub-90 score but leaves a supported one alone", () => {
  const scores: Record<string, number> = { accuracy: 95, citation: 90, hallucination: 80, analysis: 62, intelligence: 75, formatting: 60 };
  const findings = [
    // Supports the "hallucination" deduction (a real FAILED finding in that dimension).
    { dimension: "hallucination", passed: false },
    // A PASSED finding in "analysis" does not count as support.
    { dimension: "analysis", passed: true },
  ];
  const { floored } = applyEvidenceBackedDimensionFloor(scores, findings);
  assertEquals(scores.hallucination, 80); // supported — untouched
  assertEquals(scores.analysis, 90); // unsupported — raised to the floor
  assertEquals(scores.intelligence, 90); // unsupported — raised to the floor
  assertEquals(scores.formatting, 90); // unsupported — raised to the floor
  assertEquals(scores.accuracy, 95); // already >= 90 — untouched
  assertEquals(floored.sort(), ["analysis", "formatting", "intelligence"]);
});
