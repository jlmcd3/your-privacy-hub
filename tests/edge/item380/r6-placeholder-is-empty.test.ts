// Doc 261-review (2026-09-15, CL-T07; CEO decision doc 262 §9.5 item 3).
//
// An exhibit placeholder — "[See attached Exhibit — to be completed and
// attached to the report separately]" — is deferred work, not an answer.
// Before this change the record-complete gate's emptiness test was a plain
// whitespace check, so a record could be declared complete while the prose
// layer (intakeKeyFilled) treated the same field as absent. The gate now
// agrees with the prose layer.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { emptyAskedKeys } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";

const SENTINEL = "[See attached Exhibit — to be completed and attached to the report separately]";

Deno.test("record-complete r6 — a perfect golden still has zero empty asked keys", () => {
  for (const g of CPPA_RISK_PERFECT) {
    assertEquals(emptyAskedKeys(cppaRiskContract, g.intake), [], g.label ?? "golden");
  }
});

Deno.test("record-complete r6 — an exhibit placeholder counts as an unanswered asked key", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  const withExhibit = { ...base, i1b_min_pi: SENTINEL };
  const empties = emptyAskedKeys(cppaRiskContract, withExhibit);
  assert(empties.includes("i1b_min_pi"), `expected i1b_min_pi to be empty, got ${JSON.stringify(empties)}`);
  assertEquals(empties.length, 1, "only the placeholder field should be empty");
});

Deno.test("record-complete r6 — other completion tokens count as unanswered too", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  for (const token of ["TBD", "TO BE COMPLETED", "N/A"]) {
    const empties = emptyAskedKeys(cppaRiskContract, { ...base, i6_vendors: token });
    assert(empties.includes("i6_vendors"), `token ${JSON.stringify(token)} should read as unanswered`);
  }
});
