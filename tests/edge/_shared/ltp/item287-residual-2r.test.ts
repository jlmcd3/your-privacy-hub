/**
 * ITEM 287 — RESIDUAL 2R FIXES.
 *
 * FIX 1 — numeric range constituents ("249,999" inside "100,000–249,999").
 * FIX 2 — acronym derived forms ("ADMT's", "ADMT-related").
 * FIX 4 — §2R.2 map amendment: exception_analysis homes in Part 4.
 *
 * No model is contacted anywhere in this file.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  acronymDerivedStem,
  carriedNumericEndpoints,
  PASS2R_PART_HOME,
} from "../../../../supabase/functions/_shared/ltp/pass2r-validators.ts";

Deno.test("FIX 1 — endpoints of a carried en-dash range are carried values", () => {
  const set = carriedNumericEndpoints(["100,000–249,999"]);
  assert(set.has("249999"));
  assert(set.has("100000"));
});

Deno.test("FIX 1 — hyphen, em dash and 'to' range forms all yield endpoints", () => {
  for (const s of ["100,000 - 249,999", "100,000—249,999", "100,000 to 249,999"]) {
    const set = carriedNumericEndpoints([s]);
    assert(set.has("249999"), `endpoint missing for ${s}`);
  }
});

Deno.test("FIX 1 — CLOSED RULE: nothing is derived from a non-range number", () => {
  const set = carriedNumericEndpoints(["249,999 records"]);
  assertEquals(set.size, 0);
});

Deno.test("FIX 2 — possessive and hyphenated acronym forms resolve to their stem", () => {
  assertEquals(acronymDerivedStem("ADMT's"), "ADMT");
  assertEquals(acronymDerivedStem("ADMT-related"), "ADMT");
  assertEquals(acronymDerivedStem("CPPA-adjacent-review"), "CPPA");
});

Deno.test("FIX 2 — STEM RULE ONLY: non-acronym stems do not escape", () => {
  assertEquals(acronymDerivedStem("Cascade's"), null);
  assertEquals(acronymDerivedStem("Protection-related"), null);
});

Deno.test("FIX 4 — §2R.2 map amendment: exception_analysis homes in Part 4", () => {
  assertEquals(PASS2R_PART_HOME.exception_analysis, 4);
});
