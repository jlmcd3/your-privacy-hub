import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  runValueScreen,
  ValueScreenError,
  VALUE_SCREEN_VERSION,
  LEAK_LEXICON,
  TRUNCATED_SLOT_VALUES,
} from "./value-screen.ts";

Deno.test("value-screen: version stamp (Item 237)", () => {
  assertEquals(VALUE_SCREEN_VERSION, "value-screen@2026-07-28-item242-bc-marketing-review-flags");
});

Deno.test("value-screen: bare 'We ' substring is NO LONGER in the lexicon (Item 204 Defect A)", () => {
  assertEquals(LEAK_LEXICON.includes("We "), false);
  assertEquals(LEAK_LEXICON.includes("our internal"), false);
  assertEquals(LEAK_LEXICON.includes("internal review"), false);
  assertEquals(LEAK_LEXICON.includes("…"), false);
});

Deno.test("value-screen: ordinary counsel prose with 'We ' passes clean", () => {
  runValueScreen({
    reportData: {
      assessment_summary: "We collect personal information under the notice at collection. We retain it for the retention period stated in the privacy notice.",
      opening_summary: "We recommend that counsel review this document before use.",
    },
  });
});

Deno.test("value-screen: A.i #178 owner-slot truncation ('We' as entire value) IS caught (Item 204)", () => {
  const err = assertThrows(
    () =>
      runValueScreen({
        reportData: {
          submission_summary: { deadline_basis: "We" },
        },
      }),
    ValueScreenError,
  );
  assertEquals(err.hits[0].kind, "truncated-slot-value");
  assertEquals(err.hits[0].match, "We");
});

Deno.test("value-screen: other short-token truncations are caught", () => {
  for (const tok of TRUNCATED_SLOT_VALUES) {
    assertThrows(
      () => runValueScreen({ reportData: { assessment_summary: { owner: tok } } }),
      ValueScreenError,
    );
  }
});

Deno.test("value-screen: exact-value guard tolerates whitespace but does not match substrings", () => {
  assertThrows(
    () => runValueScreen({ reportData: { x: "  The  " } }),
    ValueScreenError,
  );
  // Substring 'The' inside prose must NOT fire.
  runValueScreen({ reportData: { x: "The record shows targeted advertising." } });
});

Deno.test("value-screen: anchor paths (id/citation/…) bypass the truncated-slot check", () => {
  runValueScreen({
    reportData: { information_needed: [{ id: "A", citation: "The" }] },
  });
});

Deno.test("value-screen: Engine-B leak still fires (lexicon retained)", () => {
  assertThrows(
    () => runValueScreen({ reportData: { opening_summary: "Per Engine-B composition, the assessment concludes…" } }),
    ValueScreenError,
  );
});

Deno.test("value-screen: {{cite:…}} span content is NOT flagged", () => {
  runValueScreen({
    reportData: { statutory_basis: "See {{cite:chain-of-thought-anchor}} for treatment." },
  });
});

Deno.test("value-screen: statutory-text outside cite span fails loud", () => {
  const snippet =
    "A business that uses automated decisionmaking technology for a significant decision concerning a consumer shall conduct a risk assessment.";
  assertThrows(
    () =>
      runValueScreen({
        reportData: {
          risk_assessment_by_activity: [
            {
              benefits_outweigh_risks_rationale:
                "A business that uses automated decisionmaking technology for a significant decision concerning a consumer shall conduct a risk assessment.",
            },
          ],
        },
        corpusSnippets: [snippet],
      }),
    ValueScreenError,
  );
});

Deno.test("value-screen: same statutory text INSIDE {{cite:…}} does not fail", () => {
  const snippet =
    "A business that uses automated decisionmaking technology for a significant decision concerning a consumer shall conduct a risk assessment.";
  runValueScreen({
    reportData: { statutory_basis: "{{cite:cppa-7150-b-3}}" },
    corpusSnippets: [snippet],
  });
});
