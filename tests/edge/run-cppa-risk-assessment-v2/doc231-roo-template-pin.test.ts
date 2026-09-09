// DOC 231 — RISK_ROO_UNSETTLED_TEMPLATE must be a byte-mirror of
// LIA_ROO_UNSETTLED_TEMPLATE (the CEO-ratified ROO ask, doc 224A §8 D5 /
// doc 225 §13). Mirrors the discipline
// tests/edge/run-li-assessment/doc217-v3-engine.test.ts already applies
// between run-li-assessment's copy and src/lib/lia/readbackTemplates.ts's
// client-side mirror — applied here to the SECOND product's copy.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts";
import { RISK_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/v3/readback-templates.ts";

function lf(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

Deno.test("doc231 — RISK_ROO_UNSETTLED_TEMPLATE is byte-identical to LIA_ROO_UNSETTLED_TEMPLATE (CRLF-normalised)", () => {
  assertEquals(lf(RISK_ROO_UNSETTLED_TEMPLATE), lf(LIA_ROO_UNSETTLED_TEMPLATE));
});
