// R-1 FIX (2026-08-28, doc 98/100 of the spine-vs-prompt comparison
// program) — the § 7120(b) submission-posture clauses ("not applicable" and
// "indeterminate" branches) previously contained the literal phrase
// "insufficient basis", violating this product's own ABSOLUTE PROSE
// BLACKLIST rule (FF-2 T1: "insufficient basis" NEVER appears in any
// user-facing field). Confirmed reachable in ordinary use (an
// unanswered volume field, or a revenue band straddling the CPI-adjusted
// $25M line, routes to "indeterminate" by design) and confirmed the text
// reaches the customer verbatim via pass2-assembler.ts. This suite pins the
// fixed wording for all four ProngOutcome branches across all three prongs,
// and confirms the two grader-relevant substrings ("not applicable" for the
// qc_r1_2 / qc_r1_3 not-applicable case; "met" / "not met" for their
// resolved-met/not-met cases) survive the reword.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  renderAllProngPostures,
  renderProngPosture,
  type ProngKey,
  type ProngOutcome,
} from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/submission-postures.ts";

const BANNED_PHRASES = [
  "insufficient basis",
  "not substantiated",
  "cannot be confirmed",
  "no basis to assess",
  "in the clear",
];

const PRONGS: readonly ProngKey[] = ["b1", "b2A", "b2B"];
const OUTCOMES: readonly ProngOutcome[] = ["met", "not met", "not applicable", "indeterminate"];

Deno.test("R-1 — no banned prose-blacklist phrase in any prong/outcome combination", () => {
  for (const prong of PRONGS) {
    for (const outcome of OUTCOMES) {
      const text = renderProngPosture(prong, outcome).toLowerCase();
      for (const banned of BANNED_PHRASES) {
        assert(
          !text.includes(banned),
          `${prong}/${outcome} contains banned phrase "${banned}": ${text}`,
        );
      }
    }
  }
});

Deno.test("R-1 — 'not applicable' branch still contains the literal phrase graders key on", () => {
  for (const prong of PRONGS) {
    const text = renderProngPosture(prong, "not applicable");
    assertStringIncludes(text.toLowerCase(), "not applicable");
  }
});

Deno.test("R-1 — 'met' branch still contains 'met' (qc_r1_2/qc_r1_3 resolved_met regex)", () => {
  for (const prong of PRONGS) {
    const text = renderProngPosture(prong, "met").toLowerCase();
    assertStringIncludes(text, "met");
    // must not ALSO satisfy "not met" by accident
    assert(!/not\s+met/.test(text), `${prong}/met unexpectedly contains "not met": ${text}`);
  }
});

Deno.test("R-1 — 'not met' branch still contains 'not met' (qc_r1_2/qc_r1_3 resolved_not_met regex)", () => {
  for (const prong of PRONGS) {
    const text = renderProngPosture(prong, "not met").toLowerCase();
    assert(/not\s+met/.test(text), `${prong}/not met does not contain "not met": ${text}`);
  }
});

Deno.test("R-1 — 'indeterminate' branch is unconstrained by any grader (isResolved excludes it) but still banned-phrase-clean", () => {
  for (const prong of PRONGS) {
    const text = renderProngPosture(prong, "indeterminate");
    assertStringIncludes(text, "does not yet resolve");
    assertStringIncludes(text, "completing the underlying intake field resolves it");
  }
});

Deno.test("R-1 — register alignment: banned 'on the current record' / 'on this record' family is gone", () => {
  for (const prong of PRONGS) {
    for (const outcome of OUTCOMES) {
      const text = renderProngPosture(prong, outcome).toLowerCase();
      assert(!text.includes("on the current record"), `${prong}/${outcome}: ${text}`);
      assert(!text.includes("on this record"), `${prong}/${outcome}: ${text}`);
      assert(!text.includes("on the present record"), `${prong}/${outcome}: ${text}`);
      // met/not-met/not-applicable open with "On the information provided,";
      // indeterminate uses its own advocate-drafter lead-in ("The information
      // provided does not yet resolve...") — both are register-compliant, but
      // only the first three share the exact "on the information provided"
      // prefix, so assert that distinctly from the shared banned-phrase check.
      if (outcome !== "indeterminate") {
        assertStringIncludes(text, "on the information provided");
      } else {
        assertStringIncludes(text, "information provided");
      }
    }
  }
});

Deno.test("R-1 — renderAllProngPostures still returns exactly 3 clauses, one per prong, in b1/b2A/b2B order", () => {
  const out = renderAllProngPostures({ b1: "met", b2A: "not applicable", b2B: "indeterminate" });
  assertEquals(out.length, 3);
  assertStringIncludes(out[0], "§ 7120(b)(1)");
  assertStringIncludes(out[1], "§ 7120(b)(2)(A)");
  assertStringIncludes(out[2], "§ 7120(b)(2)(B)");
  assert(!out[2].toLowerCase().includes("insufficient basis"));
});
