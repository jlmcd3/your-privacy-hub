// BATCH 7bd29982 (2026-09-10) — Velostream Technologies cyber (2b834609):
// component 17's recorded position printed as "…the plan includes CPPA and
// Civ)" in the component module, Section 6, Section 7 and Appendices A/C,
// because the first-sentence scan treated the stop in "Civ. Code" as a
// sentence stop. The intake sentence below is the batch's own row.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  firstSentenceOf,
  recommendationFact,
  recommendationGap,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";

const VELOSTREAM_C17 =
  "A documented incident response plan is in place and was tested via a tabletop exercise in March 2025; the plan includes CPPA and Civ. Code § 1798.82 notification workflows.";

Deno.test("7bd29982 — a statutory abbreviation's stop does not end the recorded position", () => {
  assertEquals(
    recommendationFact(VELOSTREAM_C17, "Documented, partially implemented"),
    "A documented incident response plan is in place and was tested via a tabletop exercise in March 2025; the plan includes CPPA and Civ. Code § 1798.82 notification workflows",
  );
  // A real second sentence still ends the fact where it always did.
  assertEquals(
    recommendationFact("Notification workflows cite Civ. Code § 1798.82. The plan has not been tested since 2024.", ""),
    "Notification workflows cite Civ. Code § 1798.82",
  );
});

Deno.test("7bd29982 — the gap scan splits on the same abbreviation-aware rule", () => {
  // No gap marker anywhere in the c17 note → nothing, as before.
  assertEquals(recommendationGap(VELOSTREAM_C17), "");
  // "Civ." must not open a phantom sentence that hides the real gap sentence.
  assertEquals(
    recommendationGap("Notification workflows cite Civ. Code § 1798.82 and Cal. Bus. & Prof. Code § 22575. However, the plan has not been tested since 2024."),
    "However, the plan has not been tested since 2024",
  );
});

Deno.test("7bd29982 — the 3E9AD759-CY1 token-internal stops and the fd703575 first-sentence rule are unchanged", () => {
  assertEquals(firstSentenceOf("Tenable.io is used for continuous scanning across the corporate estate. Coverage excludes the Guadalajara facility."), "Tenable.io is used for continuous scanning across the corporate estate.");
  assertEquals(firstSentenceOf("An incident response plan (IRP v2.1) is documented and tested annually. The Guadalajara site is out of scope."), "An incident response plan (IRP v2.1) is documented and tested annually.");
  assertEquals(firstSentenceOf("No terminal punctuation here"), "No terminal punctuation here");
  assert(firstSentenceOf("x".repeat(400) + ". Next.").length <= 300, "the 300-character cap still applies to an unterminated head");
});
