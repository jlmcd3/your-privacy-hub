// PROMPT 10A — skeleton calibration tests (CEO-approved 2026-08-12).
// One synthetic finding per rule must be filtered with the right rule id, and a
// finding that is NOT a registered template / not a conceded reproduction /
// not a disclosed reconciliation must pass through untouched.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySkeletonCalibration,
  matchRatifiedTemplate,
  SKELETON_CAL_RULE_IDS,
  SKELETON_CAL_VERSION,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";

// Re-pinned 2026-08-21: PROMPT 9L.1 item 4 (CEO-ratified 2026-08-16) added
// "with an aggregate" to composeRiskBody's per-risk scoring head; this
// fixture carried the pre-9L.1 wording and silently stopped matching
// tmpl_risk_scoring_head once the registry span was corrected (batch
// ba742475 surfaced the registry-side half of this same staleness).
const RISK_TEMPLATE =
  "Unauthorised disclosure of health data is assessed at likely likelihood and severe severity under this assessment's pre-set risk taxonomy, with an aggregate initial risk level of high. The company records no measure against it, and the remaining risk level is high on the same preliminary basis.";

Deno.test("rule 1 — ratified template repetition is not boilerplate", () => {
  const { kept, filtered, counts } = applySkeletonCalibration([
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: RISK_TEMPLATE },
  ]);
  assertEquals(kept.length, 0);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_1");
  assert(filtered[0].template_id);
  assertEquals(counts.cal_skeleton_1, 1);
});

Deno.test("rule 2 — conceded faithful reproduction of the controller's basis", () => {
  const { kept, filtered } = applySkeletonCalibration([
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence:
        "The legal basis recorded is Article 6(1)(b), which could arguably be anchored to Article 6(1)(f); the skeleton faithfully reproduces the intake and carries the non-substitution caveat.",
    },
  ]);
  assertEquals(kept.length, 0);
  assertEquals(filtered[0].rule, "cal_skeleton_2");
});

Deno.test("rule 3 — disclosed, attributed reconciliation is not an unsupported claim", () => {
  const { kept, filtered } = applySkeletonCalibration([
    {
      check_id: "rubric_unsupported_business_claim",
      dimension: "accuracy",
      severity: "high",
      passed: false,
      evidence:
        "This assessment's risk register carries 5 risks... the register is the operative count for this assessment and includes risks this assessment itself projects from the record alongside those the company names.",
    },
  ]);
  assertEquals(kept.length, 0);
  assertEquals(filtered[0].rule, "cal_skeleton_3");
});

Deno.test("rule 4 — the assessment's own attributed scoring is not a business claim", () => {
  const { kept, filtered } = applySkeletonCalibration([
    { check_id: "rubric_unsupported_business_claim", dimension: "accuracy", severity: "high", passed: false, evidence: RISK_TEMPLATE },
  ]);
  assertEquals(kept.length, 0);
  assertEquals(filtered[0].rule, "cal_skeleton_4");
  assertEquals(filtered[0].template_id, "tmpl_risk_scoring_head");
});

Deno.test("rule 6 — the ITEM-204 cohort-omission complaint is calibrated out", () => {
  // The live d1d2b3b8/19d83cb4 evidence, verbatim shape.
  const { kept, filtered, counts } = applySkeletonCalibration([
    {
      check_id: "rubric_actionability",
      dimension: "intelligence",
      severity: "medium",
      passed: false,
      evidence:
        'The report does not surface the April 1, 2028 cohort deadline applicable to Harborstone (revenue "Over $100M" maps to the first cohort under 11 CCR § 7121(a)(1)). The corpus text is reproduced verbatim in the scope section but the generated analysis never states which cohort applies to Harborstone or calculates the remaining preparation window. A compliance professional must perform the mapping themselves.',
    },
  ]);
  assertEquals(kept.length, 0);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_6");
  assertEquals(counts.cal_skeleton_6, 1);
});

Deno.test("rule 6 — an AFFIRMATIVE cohort error still fails (only the omission shape is calibrated)", () => {
  const { kept, filtered } = applySkeletonCalibration([
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence:
        "The report maps the company to the wrong cohort under 11 CCR § 7121(a)(1): it states the April 1, 2029 deadline for a business whose recorded revenue places it in the first cohort. The stated cohort is incorrect.",
    },
  ]);
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 1);
});

Deno.test("rule 6 — a cohort mention without the omission complaint passes through", () => {
  const { kept, filtered } = applySkeletonCalibration([
    {
      check_id: "rubric_actionability",
      dimension: "intelligence",
      severity: "medium",
      passed: false,
      evidence:
        "The remediation timeline references the § 7121(a) cohort deadlines generally but assigns no owner to the encryption gap and gives no completion criterion for the vendor review.",
    },
  ]);
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 1);
});

Deno.test("non-matching findings pass through untouched", () => {
  const passthrough = [
    // boilerplate that is NOT a registered template
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: "Each risk row repeats the same generic mitigation sentence with no specifics." },
    // miscitation with no faithfulness concession
    { check_id: "rubric_citation_misapplied", dimension: "citation", severity: "high", passed: false, evidence: "The legal basis section cites Article 6(1)(b) for a public-task purpose; the pinpoint is wrong." },
    // unsupported claim with no provenance disclosure and no template
    { check_id: "rubric_unsupported_business_claim", dimension: "accuracy", severity: "high", passed: false, evidence: "The document states the company has completed staff training; nothing in the record says so." },
  ];
  const { kept, filtered } = applySkeletonCalibration(passthrough as any);
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 3);
});

Deno.test("passing findings are never filtered", () => {
  const { kept, filtered } = applySkeletonCalibration([
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: true, evidence: RISK_TEMPLATE },
  ]);
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 1);
});

Deno.test("registry match is exact, not fuzzy", () => {
  assertEquals(
    matchRatifiedTemplate("The risk is rated likely and severe under our internal taxonomy."),
    null,
  );
});

Deno.test("context version records the calibration and its rule ids", () => {
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION));
  for (const id of SKELETON_CAL_RULE_IDS) assert(GRADER_CONTEXT_VERSION.includes(id));
});

Deno.test("filtered findings are persisted flagged, and freeform is untouched", async () => {
  // Normalized CRLF -> LF: this repo is checked out with Windows line
  // endings (run-quality-batch/index.ts has CRLF terminators), and the
  // literal-newline assertion below otherwise silently fails to match on a
  // Windows checkout even though the source is unchanged. 2026-08-21.
  const src = (await Deno.readTextFile(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  )).replace(/\r\n/g, "\n");
  // calibration only runs on the skeleton payload path
  assertEquals(src.split("applySkeletonCalibration(").length - 1, 2); // claude + gpt call sites
  assert(src.includes("useSkeleton\n    ? applySkeletonCalibration"));
  assert(src.includes("filtered_from_scoring: true"));
  assert(src.includes("calibration_rule: c.rule"));
});
