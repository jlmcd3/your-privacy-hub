// QB-P25 Final-B CARRIED-1 — direct string-form assertions on
// composeTimelineSentence output. The composed sentence replaces a phrase
// class we deterministically ban (legacy applyTimelineForm boilerplate), so
// its exact form is pinned here rather than only checked via v2-shape guards.
//
// Deno test: `deno test supabase/functions/run-governance-assessment/qbp25_carried1_timeline_test.ts`

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { composeTimelineSentence } from "../../../supabase/functions/run-governance-assessment/_qbp25_b1_v2.ts";

Deno.test("statutory with citation + no illustrative_default → base sentence", () => {
  const s = composeTimelineSentence({
    kind: "statutory",
    citation: "GDPR Art. 33(1) (72-hour breach notification)",
  } as any);
  assertEquals(s, "Statutory deadline: GDPR Art. 33(1) (72-hour breach notification)");
});

Deno.test("statutory with citation AND illustrative_default → cadence appended in parens", () => {
  const s = composeTimelineSentence({
    kind: "statutory",
    citation: "GDPR Art. 33(1)",
    illustrative_default: "within 72 hours of awareness",
  } as any);
  assertEquals(
    s,
    "Statutory deadline: GDPR Art. 33(1) (illustrative cadence — within 72 hours of awareness)",
  );
});

Deno.test("org_set with illustrative_default → org-set sentence with example", () => {
  const s = composeTimelineSentence({
    kind: "org_set",
    illustrative_default: "within the next quarter",
  } as any);
  assertEquals(s, "Timeline to be set by the organisation (e.g. within the next quarter)");
});

Deno.test("undefined / missing deadline → empty string (renderer falls back)", () => {
  assertEquals(composeTimelineSentence(undefined), "");
  assertEquals(composeTimelineSentence(null as any), "");
});

Deno.test("statutory missing illustrative_default (empty string) → base only, no dangling parens", () => {
  const s = composeTimelineSentence({
    kind: "statutory",
    citation: "CCPA § 1798.100(b)",
    illustrative_default: "",
  } as any);
  assertEquals(s, "Statutory deadline: CCPA § 1798.100(b)");
});
