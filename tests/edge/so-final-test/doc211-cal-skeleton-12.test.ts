// DOC 211/218 (2026-09-07/08, CEO-ratified 2026-09-08) — cal_skeleton_12.
// LIA's deterministic Section IV balancing composer (composeBalancingNarrative,
// three-part-test-typed.ts) fills four fixed connective frames from the
// record's own typed verdicts; batch a81e0240's first live
// LIA_DETERMINISTIC_ENABLED run drew a rubric_generic_boilerplate finding
// against that paragraph on all three fixtures. This pins the deterministic
// filter and its registration, mirroring prompt8i-cal5-art9-ask.test.ts's
// pattern for cal_skeleton_5.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySkeletonCalibration,
  matchesRule12,
  SKELETON_CAL_RULE_IDS,
  SKELETON_CAL_VERSION,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";

// The composer's actual output shape (three-part-test-typed.ts
// composeBalancingNarrative), reproduced verbatim — not a paraphrase.
const EV_FAVOURS_INTEREST =
  "In favour of the interest: the company's own recorded interest; the people affected would reasonably expect the processing. Against it, the typed findings above carry no factor of material weight. Weighed together, the balance favours the interest pursued as the record stands: the people affected would reasonably expect the processing; the worst-case severity recorded (Low) does not of itself override the interest.";
const EV_FAVOURS_SUBJECTS =
  "In favour of the interest: the company's own recorded interest. Against it: children are among the people affected, and their interests carry particular weight; the relationship carries a recognised power imbalance. Weighed together, the balance favours the people affected as the record stands.";
const EV_CANNOT_BE_STRUCK =
  "In favour of the interest: the company's own recorded interest. Neither for nor against it: the expectation is undetermined on the record. Weighed together, the balance cannot be struck on the information provided.";

Deno.test("cal_skeleton_12 — matches the four LIA balancing connective frames verbatim", () => {
  for (const ev of [EV_FAVOURS_INTEREST, EV_FAVOURS_SUBJECTS, EV_CANNOT_BE_STRUCK]) {
    assert(matchesRule12("rubric_generic_boilerplate", ev), ev.slice(0, 60));
  }
  // Only the boilerplate check is in scope.
  assert(!matchesRule12("rubric_actionability", EV_FAVOURS_INTEREST));
});

Deno.test("cal_skeleton_12 — a genuine boilerplate complaint with none of the four frames passes through", () => {
  assert(!matchesRule12(
    "rubric_generic_boilerplate",
    "Every safeguard sentence repeats 'this measure reduces risk' with no specifics.",
  ));
});

Deno.test("cal_skeleton_12 — applySkeletonCalibration routes the balancing-frame finding and keeps a genuine one", () => {
  const findings = [
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: EV_FAVOURS_INTEREST },
    { check_id: "rubric_generic_boilerplate", dimension: "analysis", severity: "medium", passed: false, evidence: "Every safeguard sentence repeats 'this measure reduces risk' with no specifics." },
  ];
  const { kept, filtered, counts } = applySkeletonCalibration(findings);
  assertEquals(counts.cal_skeleton_12, 1);
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].rule, "cal_skeleton_12");
  assertEquals(kept.length, 1);
});

Deno.test("cal_skeleton_12 is registered and stamped under the kept prefix (doc-149 INSTRUMENT RULE)", () => {
  assert(SKELETON_CAL_RULE_IDS.includes("cal_skeleton_12"));
  assertEquals(SKELETON_CAL_VERSION, "gc-2026-08-28-skeleton-cal-3-item204", "the epoch prefix is kept; rules are appended");
  assert(GRADER_CONTEXT_VERSION.startsWith(SKELETON_CAL_VERSION));
  for (const id of SKELETON_CAL_RULE_IDS) assert(GRADER_CONTEXT_VERSION.includes(id));
  assert(
    GRADER_CONTEXT_VERSION.includes("+batch-a81e0240-cal-2026-09-07[cal_skeleton_12]"),
    GRADER_CONTEXT_VERSION,
  );
  assert(
    GRADER_CONTEXT_VERSION.indexOf("+doc189-device-access-relevance-2026-09-05") <
      GRADER_CONTEXT_VERSION.indexOf("+batch-a81e0240-cal-2026-09-07"),
    "tags append in order",
  );
});
