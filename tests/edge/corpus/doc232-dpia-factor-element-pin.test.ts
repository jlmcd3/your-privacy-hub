// DOC 213 §2 (A) pattern / DOC 232 — the generator's LOCAL DPIA
// factor→element copy must equal the canonical map in run-dpia-framework.
// Doc 213 forbids the cross-function import, so the copy is pinned in both
// directions instead.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_FACTOR_ELEMENT as LOCAL,
  dpiaElementOf,
} from "../../../supabase/functions/generate-corpus-hooks/_local/dpia-factor-element.ts";
import { DPIA_FACTOR_ELEMENT as CANONICAL } from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";

Deno.test("doc232 — local DPIA factor→element copy equals the canonical map, key for key", () => {
  assertEquals(Object.keys(LOCAL).sort(), Object.keys(CANONICAL).sort());
  for (const [factor, element] of Object.entries(CANONICAL)) {
    assertEquals(LOCAL[factor], element, `element drift for "${factor}"`);
  }
});

Deno.test("doc232 — dpiaElementOf returns null for an unknown factor", () => {
  assertEquals(dpiaElementOf("not a factor"), null);
  assertEquals(dpiaElementOf("the necessity and proportionality analysis"), "adequacy");
  assertEquals(dpiaElementOf("the Article 35 obligation to conduct this assessment"), "obligation");
});
