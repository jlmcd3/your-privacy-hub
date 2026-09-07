// DOC 213 §2 (A) — the generator's LOCAL factor→element copy must equal the
// canonical map in run-li-assessment. Doc 213 forbids the cross-function
// import, so the copy is pinned in both directions instead.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_FACTOR_ELEMENT as LOCAL,
  liaElementOf,
} from "../../../supabase/functions/generate-corpus-hooks/_local/factor-element.ts";
import { LIA_FACTOR_ELEMENT as CANONICAL } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";

Deno.test("doc213 — local factor→element copy equals the canonical map, key for key", () => {
  assertEquals(Object.keys(LOCAL).sort(), Object.keys(CANONICAL).sort());
  for (const [factor, element] of Object.entries(CANONICAL)) {
    assertEquals(LOCAL[factor], element, `element drift for "${factor}"`);
  }
});

Deno.test("doc213 — liaElementOf returns null for a factor with no element (gates/overlays)", () => {
  assertEquals(liaElementOf("Special-category and ePrivacy interplay"), null);
  assertEquals(liaElementOf("not a factor"), null);
  assertEquals(liaElementOf("Balancing of interests, rights and freedoms"), "balancing");
});
