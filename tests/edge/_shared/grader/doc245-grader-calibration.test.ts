// DOC 245 (2026-09-09) — all-products batch e74fdbfd (the first with every
// V3 hook flag on), grader instrument items. Prose calibration only this
// round: six false-positive classes, each traced to the report's own
// accurate text and the intake (cppa_risk reconciliation and contract-status
// sentences, the ADMT human-involvement conclusion tagged as a citation
// defect, the ADMT scope-qualification trigger, the DPIA Section 6 lead to
// the gap table, and three condition-gated diagnostic frames). The two
// rubric definitions the batch over-fired — rubric_unsupported_business_claim
// and rubric_citation_misapplied — now state what a finding under them must
// quote. Deterministic rules (cal_skeleton_13+) are reserved for a recurrence
// across two graders, per the doc169 precedent. Same doc-149 INSTRUMENT
// RULE: GRADER_CONTEXT_VERSION keeps its prefix; the batch tag appends last.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../../supabase/functions/_shared/grader/context.ts";
import { SKELETON_CAL_VERSION } from "../../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";

Deno.test("doc245 — the prose calibration carries the six batch-e74fdbfd classes and names the batch's true positives", () => {
  assertStringIncludes(SHARED_GRADER_CONTEXT, "DOC 245 (batch-e74fdbfd triage, 2026-09-09");
  for (
    const heading of [
      "A RECONCILIATION SENTENCE THAT RESOLVES AN INTAKE CONFLICT IS DISCLOSURE, NOT FABRICATION",
      "A PER-RECIPIENT CONTRACT-STATUS RESTATEMENT IS THE RECORD",
      "rubric_citation_misapplied REQUIRES A CITED PROVISION IN THE QUOTED PASSAGE",
      "THE ADMT SCOPE QUALIFICATION IS A CONDITIONAL TRIGGER, NOT A VAGUE RECOMMENDATION",
      "SIGN-OFF IS HELD OPEN BY THE FOLLOWING",
      "CONDITION-GATED DIAGNOSTIC SENTENCES ARE NOT BOILERPLATE",
    ]
  ) {
    assertStringIncludes(SHARED_GRADER_CONTEXT, heading);
  }
  // The true positives keep their shape as defects.
  assertStringIncludes(SHARED_GRADER_CONTEXT, "a LIA lead that says \"subject to the conditions recorded below\" while no numbered condition renders");
  assertStringIncludes(SHARED_GRADER_CONTEXT, "no Condition, Follow-Up or Recommendation asking the Company to confirm the terms");
});

// RE-PIN 2026-09-10 (DOC 250 B1): the CEO-ratified ePrivacy overlay sentence
// appended "+doc250-eprivacy-overlay-2026-09-10" after doc 245's tag.
// RE-PIN 2026-09-10 (DOC 251, batch 7bd29982): the four-class prose
// amendment appended "+batch-7bd29982-cal-2026-09-10" after doc 250's tag.
// RE-PIN 2026-09-10 (DOC 252, batch 916c33a8): the three-class prose
// amendment + § 1798.140 lettering line appended "+batch-916c33a8-cal-2026-09-10".
Deno.test("doc245 — GRADER_CONTEXT_VERSION keeps its prefix and appends the batch tag last", () => {
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION), "the epoch prefix is kept");
  // RE-PIN 2026-09-11 (DOC 252 §10 rulings): "+doc252-rulings-2026-09-11".
  // RE-PIN 2026-09-11 (DOC 253, batch bcf0a706): "+batch-bcf0a706-cal-2026-09-11".
  // RE-PIN 2026-09-11 (DOC 254, ChatGPT prose review): "+doc254-chatgpt-review-2026-09-11".
  assert(GRADER_CONTEXT_VERSION.endsWith("+doc252-rulings-2026-09-11+batch-bcf0a706-cal-2026-09-11+doc254-chatgpt-review-2026-09-11+batch-e2e1185b-cal-2026-09-11+doc258-q9-homepage-2026-09-11"), GRADER_CONTEXT_VERSION);
  assert(
    GRADER_CONTEXT_VERSION.indexOf("+lia-v3-hooks-grader-2026-09-08") < GRADER_CONTEXT_VERSION.indexOf("+batch-e74fdbfd-cal-2026-09-09") &&
      GRADER_CONTEXT_VERSION.indexOf("+batch-e74fdbfd-cal-2026-09-09") < GRADER_CONTEXT_VERSION.indexOf("+doc250-eprivacy-overlay-2026-09-10") &&
      GRADER_CONTEXT_VERSION.indexOf("+doc250-eprivacy-overlay-2026-09-10") < GRADER_CONTEXT_VERSION.indexOf("+batch-7bd29982-cal-2026-09-10") &&
      GRADER_CONTEXT_VERSION.indexOf("+batch-7bd29982-cal-2026-09-10") < GRADER_CONTEXT_VERSION.indexOf("+batch-916c33a8-cal-2026-09-10"),
    "tags append in order",
  );
});

Deno.test("doc245 — both rubric lists carry the tightened definitions (source scan; the function entry points cannot be imported)", async () => {
  for (const rel of ["run-quality-batch/index.ts", "grade-single-assessment/index.ts"]) {
    const src = await Deno.readTextFile(new URL(`../../../../supabase/functions/${rel}`, import.meta.url));
    assertStringIncludes(
      src,
      "DOC 245 (2026-09-09): a finding under this check MUST quote the specific business fact that is absent from the intake",
      rel,
    );
    assertStringIncludes(src, "DOC 245 (2026-09-09): this check requires a cited provision IN the quoted passage", rel);
  }
});
