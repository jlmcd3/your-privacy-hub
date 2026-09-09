// DOC 235 — byte-mirror pin: `ADMT_ROO_UNSETTLED_TEMPLATE` must be
// byte-identical to LIA's CEO-ratified `LIA_ROO_UNSETTLED_TEMPLATE`
// (run-li-assessment/_local/ltp/v3/readback-templates.ts), the same law
// DPIA's `DPIA_ROO_UNSETTLED_TEMPLATE` and CPPA Risk's
// `RISK_ROO_UNSETTLED_TEMPLATE` are pinned against.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/v3/readback-templates.ts";
import { LIA_ROO_UNSETTLED_TEMPLATE } from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts";

Deno.test("ADMT_ROO_UNSETTLED_TEMPLATE is byte-identical to LIA_ROO_UNSETTLED_TEMPLATE", () => {
  assertEquals(ADMT_ROO_UNSETTLED_TEMPLATE, LIA_ROO_UNSETTLED_TEMPLATE);
});

Deno.test("ADMT_ROO_UNSETTLED_TEMPLATE names the question only — never an authority, a fact, or what a passing answer would say", () => {
  const bannedFragments = ["held that", "supports", "against your position", "the record shows"];
  for (const frag of bannedFragments) {
    assertEquals(ADMT_ROO_UNSETTLED_TEMPLATE.toLowerCase().includes(frag), false, `template unexpectedly contains "${frag}"`);
  }
});
