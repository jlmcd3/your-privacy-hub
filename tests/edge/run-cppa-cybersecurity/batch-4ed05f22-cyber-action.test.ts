// Batch 4ed05f22 (2026-09-05, /admin/all-products-test, Velostream Digital
// Corp.) — the per-component "Next action" printed the company's own note
// twice ("…extending A software and hardware asset inventory exists…, and
// record the completion date. The recorded description locates the remaining
// work: A software and hardware asset inventory exists…") on four partially
// implemented components. Two causes, two pins:
//   1. the fact-anchored partially_implemented template embedded a full clause
//      after "extending"; it now carries the clause as a parenthetical.
//   2. for a one-sentence note the "fact" (first sentence) and the "gap
//      sentence" are the same sentence; the gap sentence is appended only when
//      it differs.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CYBER_RECOMMENDATION_LIBRARY,
  recommendationFact,
  recommendationGap,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { sameSentence } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";

const ONE_SENTENCE_NOTE =
  "A software and hardware asset inventory exists for core infrastructure, but coverage of ephemeral cloud workloads and third-party SDK integrations is incomplete.";

Deno.test("batch 4ed05f22 — the partially_implemented fact-anchored template carries the clause as a parenthetical", () => {
  const slot = CYBER_RECOMMENDATION_LIBRARY.find(
    (s) => s.key.gapClass === "partially_implemented" && s.key.variant === "fact_anchored",
  );
  assert(slot, "slot must exist");
  assertStringIncludes(slot!.template, "(recorded position: {fact})");
  assert(!slot!.template.includes("extending {fact}"), "the ungrammatical 'extending <clause>' form is retired");
  assertEquals(slot!.ratified, true);
});

Deno.test("batch 4ed05f22 — a one-sentence note yields a fact and a gap sentence that are the SAME sentence; sameSentence detects it", () => {
  const fact = recommendationFact(ONE_SENTENCE_NOTE, "Partially implemented");
  const gap = recommendationGap(ONE_SENTENCE_NOTE);
  assert(gap.length > 0, "the note names a gap, so recommendationGap returns a sentence");
  assert(sameSentence(gap, fact), `fact and gap must be recognised as the same sentence:\n fact=${fact}\n gap=${gap}`);
});

Deno.test("batch 4ed05f22 — sameSentence is strict on content and lenient only on stop/space/case", () => {
  assert(sameSentence("Coverage is incomplete.", "coverage is incomplete"));
  assert(sameSentence("  Coverage  is incomplete ", "Coverage is incomplete."));
  assert(!sameSentence("Coverage is incomplete.", "Coverage is complete."));
  assert(!sameSentence("", ""), "two empties are not a duplicate");
});
