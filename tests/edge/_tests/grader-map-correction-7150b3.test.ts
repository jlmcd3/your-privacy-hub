// GRADER-MAP-CORRECTION-7150B3 — unit tests confirming the shared grader
// context bumps to the s4 instrument id and carries the newly-verified
// § 7150(b)(3) ADMT-trigger anchor plus the § 7121(a)(3) deeper-pinpoint
// acceptance for the April 1, 2030 cohort.
//
// This is an INSTRUMENT-COMPLETENESS test — it protects against regression
// on a map correction backed by primary source (corpus rows cppa-7150 and
// cppa-7121, both APPROVED 2026-07-25; source PDF SHA-256 7a34306c…328650).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  GRADER_CONTEXT_VERSION,
  SHARED_GRADER_CONTEXT,
} from "../../../supabase/functions/_shared/grader/context.ts";

Deno.test("instrument id bumped to s4", () => {
  assertEquals(GRADER_CONTEXT_VERSION, "gc-2026-07-27-s6-eu-uk-ca-au-sg");
});

Deno.test("§ 7150(b)(3) is present in the CPPA Risk verified subsection map", () => {
  assert(
    SHARED_GRADER_CONTEXT.includes("§ 7150(b)(3)"),
    "shared grader context must anchor § 7150(b)(3) as verified after 2026-07-25",
  );
  assert(
    SHARED_GRADER_CONTEXT.includes("Using ADMT for a significant decision concerning a consumer."),
    "shared grader context must carry the verbatim § 7150(b)(3) trigger text",
  );
});

Deno.test("§ 7121(a)(3) accepted as deeper pinpoint; (b) variants rejected", () => {
  assert(
    SHARED_GRADER_CONTEXT.includes("§ 7121(a)(3)"),
    "shared grader context must accept § 7121(a)(3) as the deeper pinpoint",
  );
  assert(
    SHARED_GRADER_CONTEXT.includes("Do NOT accept § 7121(b) or § 7121(b)(3)"),
    "shared grader context must explicitly reject § 7121(b)/§ 7121(b)(3) for the cohort claim",
  );
});
