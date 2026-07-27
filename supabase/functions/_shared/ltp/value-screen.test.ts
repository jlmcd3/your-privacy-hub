import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  runValueScreen,
  ValueScreenError,
  VALUE_SCREEN_VERSION,
  LEAK_LEXICON,
} from "./value-screen.ts";

Deno.test("value-screen: version stamp", () => {
  assertEquals(VALUE_SCREEN_VERSION, "value-screen@2026-07-27");
});

Deno.test("value-screen: clean report_data passes", () => {
  runValueScreen({
    reportData: {
      opening_summary: "The business must comply with § requirements.",
      risk_assessment_by_activity: [
        { purpose: "targeted advertising", benefits_to_business: ["revenue"] },
      ],
    },
  });
});

Deno.test("value-screen: leak lexicon 'We ' owner-slot fragment fails loud", () => {
  const err = assertThrows(
    () =>
      runValueScreen({
        reportData: { assessment_summary: "We recommend adopting stronger safeguards." },
      }),
    ValueScreenError,
  );
  assertEquals(err.hits[0].kind, "leak-lexicon");
});

Deno.test("value-screen: leak lexicon 'Engine-B' module-name fails loud", () => {
  assertThrows(
    () =>
      runValueScreen({
        reportData: { opening_summary: "Per Engine-B composition, the assessment concludes…" },
      }),
    ValueScreenError,
  );
});

Deno.test("value-screen: {{cite:…}} span content is NOT flagged", () => {
  // "chain-of-thought" would be a hit if unshielded; inside cite it must not trip.
  runValueScreen({
    reportData: {
      statutory_basis: "See {{cite:chain-of-thought-anchor}} for treatment.",
    },
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
    reportData: {
      statutory_basis: "{{cite:cppa-7150-b-3}}",
    },
    corpusSnippets: [snippet],
  });
});

Deno.test("value-screen: lexicon is non-empty and contains historical seeds", () => {
  assertEquals(LEAK_LEXICON.includes("Engine-B"), true);
  assertEquals(LEAK_LEXICON.includes("{{intake:"), true);
});
