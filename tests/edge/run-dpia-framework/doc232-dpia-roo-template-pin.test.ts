// DOC 232 — DPIA's ROO ask must be a byte-mirror of LIA's ratified
// `LIA_ROO_UNSETTLED_TEMPLATE` (doc 232 §9-1 ORCHESTRATOR DEFAULT: reuse the
// bytes unchanged). Pins the two constants identical; fails if either file
// is edited without the other.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-dpia-framework/_local/ltp/v3/roo-templates.ts";
import { LIA_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts";

Deno.test("doc232 — DPIA_ROO_UNSETTLED_TEMPLATE is byte-identical to LIA_ROO_UNSETTLED_TEMPLATE", () => {
  assertEquals(DPIA_ROO_UNSETTLED_TEMPLATE, LIA_ROO_UNSETTLED_TEMPLATE);
});

Deno.test("doc232 — the ROO ask never names an authority, a fact, or a passing answer (R1/L6)", () => {
  const t = DPIA_ROO_UNSETTLED_TEMPLATE.toLowerCase();
  // The template must stay question-only: it names the specificity gap and
  // the customer's two options, never a hook id, decision name, or record
  // fact. A loose heuristic check — the ratified bytes are pinned above;
  // this documents the LAW the bytes satisfy.
  for (const banned of ["hook", "authority_hooks", "the company has stated", "found that", "regulator found"]) {
    if (t.includes(banned)) {
      throw new Error(`ROO template appears to leak internal vocabulary: "${banned}"`);
    }
  }
});
