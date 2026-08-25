// PROMPT 8I — (1) cal_skeleton_5 initial/remaining conflation, CEO-approved
// 2026-08-12, evidence run b82ba671 (run #182) docs 3 and 4.
// (2) the conditional Art. 9 clause in the 6(1)(f) legal-basis ask.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySkeletonCalibration,
  SKELETON_CAL_RULE_IDS,
  SKELETON_CAL_VERSION,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import { buildLegalBasis } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

// ── 1. cal_skeleton_5 ───────────────────────────────────────────────────

// Verbatim shape of the run b82ba671 doc-3 finding.
const DOC3_FINDING =
  'The executive summary states "None is deemed a high risk based on the information the company provided", ' +
  "which is contradicted by Section 4, where unauthorised disclosure of health data carries an initial risk level of high.";

const NO_RESIDUAL_HIGH = {
  risk_register: [
    { risk_label: "Unauthorised disclosure of health data", inherent_band: "high", residual_band: "moderate" },
    { risk_label: "Excessive retention", inherent_band: "moderate", residual_band: "low" },
  ],
};

const WITH_RESIDUAL_HIGH = {
  risk_register: [
    { risk_label: "Unauthorised disclosure of health data", inherent_band: "high", residual_band: "high" },
  ],
};

const finding = (evidence: string, check_id = "rubric_citation_misapplied") => ({
  check_id,
  dimension: "citation",
  severity: "high",
  passed: false,
  evidence,
});

Deno.test("cal_skeleton_5: doc-3 finding text is filtered when no residual high exists", () => {
  const { kept, filtered, counts } = applySkeletonCalibration(
    [finding(DOC3_FINDING) as any],
    { report: NO_RESIDUAL_HIGH },
  );
  assertEquals(kept.length, 0);
  assertEquals(filtered[0].rule, "cal_skeleton_5");
  assertEquals(counts.cal_skeleton_5, 1);
});

Deno.test("cal_skeleton_5: the {n}-are-deemed variant is covered", () => {
  const ev =
    'The executive summary says "Two of these risks are deemed high risks", which is inconsistent with ' +
    "Section 4, where a third row is assessed at Likely likelihood and Severe severity, an initial risk level of high.";
  const { filtered } = applySkeletonCalibration([finding(ev) as any], { report: NO_RESIDUAL_HIGH });
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_5");
});

Deno.test("cal_skeleton_5: a genuine REMAINING-high contradiction is NOT filtered", () => {
  const ev =
    'The executive summary states "None is deemed a high risk based on the information the company provided", ' +
    "which is contradicted by Section 4, where the remaining risk level is high for unauthorised disclosure.";
  const { kept, filtered } = applySkeletonCalibration([finding(ev) as any], { report: NO_RESIDUAL_HIGH });
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 1);
});

Deno.test("cal_skeleton_5: a register carrying a residual high is NOT filtered", () => {
  const { kept, filtered } = applySkeletonCalibration(
    [finding(DOC3_FINDING) as any],
    { report: WITH_RESIDUAL_HIGH },
  );
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 1);
});

Deno.test("cal_skeleton_5: no contradiction language, or no initial-level citation → not filtered", () => {
  const noContradiction = finding(
    'The executive summary states "None is deemed a high risk based on the information the company provided" and Section 4 records an initial risk level of high.',
  );
  const noInitial = finding(
    'The executive summary states "None is deemed a high risk based on the information the company provided", which is contradicted by the register.',
  );
  const { kept, filtered } = applySkeletonCalibration(
    [noContradiction as any, noInitial as any],
    { report: NO_RESIDUAL_HIGH },
  );
  assertEquals(filtered.length, 0);
  assertEquals(kept.length, 2);
});

Deno.test("cal_skeleton_5: absent report context does not fabricate a residual high", () => {
  const { filtered } = applySkeletonCalibration([finding(DOC3_FINDING) as any]);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_5");
});

Deno.test("cal_skeleton_5 is registered and stamped in the grader context version", () => {
  assert(SKELETON_CAL_RULE_IDS.includes("cal_skeleton_5"));
  assertEquals(SKELETON_CAL_VERSION, "gc-2026-08-16-skeleton-cal-2-repin");
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION));
  for (const id of SKELETON_CAL_RULE_IDS) assert(GRADER_CONTEXT_VERSION.includes(id));
});

// ── 2. conditional Art. 9 clause in the 6(1)(f) ask ─────────────────────

const ART9_CLAUSE = ", and state the Art. 9 condition relied on for the special-category items";

const LI_BASE = {
  processing_activity_name: "Occupational-health review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Employees returning from long-term sick leave",
  jurisdictions: ["EU (GDPR)"],
  existing_safeguards: ["Access controls"],
  necessity_proportionality: "The scheduling enables the review to happen on time.",
  alternatives_considered: [
    {
      processing_operation: "primary",
      alternative: "Manual scheduling from paper certificates",
      rejection_reason: "Cannot deliver the review within the statutory window at the recorded volume.",
    },
  ],
  legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
};

Deno.test("doc-2 shape: Art. 9 condition recorded → no Art. 9 clause in the ask", () => {
  const [f] = buildLegalBasis({
    ...LI_BASE,
    data_categories: ["Health or medical data"],
    article_9_condition: "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
  });
  assert(f.information_needed, "the balancing-test ask should still be present");
  assert(!f.information_needed!.includes(ART9_CLAUSE));
  assert(f.information_needed!.includes("Describe the effect of the processing on"));
});

// PROMPT 9M item 3(c) RETIRED the compound-ask Art. 9 clause: special-category
// data under 6(1)(f) is now answered by the standalone Art. 9 ruling and the
// ask_lia_special_category ask, never by a clause appended to the balancing ask.
Deno.test("9M: special-category in scope + Art. 9 condition empty → compound clause retired, standalone ask present", () => {
  const [f] = buildLegalBasis({
    ...LI_BASE,
    data_categories: ["Health or medical data"],
    article_9_condition: "",
  });
  assert(!f.information_needed!.includes(ART9_CLAUSE));
  assert(f.information_needed!.includes("Isolate the special-category items"));
});

Deno.test("no special-category data → clause absent", () => {
  const [f] = buildLegalBasis({
    ...LI_BASE,
    data_categories: ["Contact details"],
    necessity_proportionality: "The scheduling enables the review to happen on time.",
  });
  if (f.information_needed) assert(!f.information_needed.includes(ART9_CLAUSE));
});
