// DPIA — a negating `secondary_uses` answer must not manufacture op_secondary.
// Evidence: quality-batch 60c31b13, DPIA run, report_data.proportionality[1].

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOperations } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BATCH_60C31B13_SECONDARY_USES =
  "None. Certificate data is not used for any purpose beyond return-to-work scheduling and duty adjustment; statistical absence reporting uses only aggregated counts that carry no diagnosis category.";

Deno.test("negating secondary_uses does not create op_secondary", () => {
  const ops = buildOperations({
    purpose: "To schedule occupational-health return-to-work reviews.",
    processing_activity_name: "Return-to-work review scheduling",
    secondary_uses: BATCH_60C31B13_SECONDARY_USES,
  });
  assertEquals(ops.map((o) => o.operation_id), ["op_primary"]);
});

Deno.test("affirmative secondary_uses still creates op_secondary", () => {
  const ops = buildOperations({
    purpose: "To schedule occupational-health return-to-work reviews.",
    processing_activity_name: "Return-to-work review scheduling",
    secondary_uses:
      "Aggregated absence data is also used to plan departmental staffing levels for the following quarter.",
  });
  assertEquals(ops.map((o) => o.operation_id), ["op_primary", "op_secondary"]);
  assert(ops[1].purpose_text.includes("staffing levels"));
});

Deno.test("ambiguous secondary_uses keeps current behaviour", () => {
  const ops = buildOperations({
    purpose: "P",
    processing_activity_name: "A",
    secondary_uses: "Under review by the data protection officer.",
  });
  assertEquals(ops.length, 2);
});
