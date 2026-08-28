// B3A5DD01 (quality batch, 2026-08-28) — DPIA fix.
//   DP1 [medium, actionability] "On this analysis, necessity and
//       proportionality are established in part: one elements are not yet
//       supported, each identified above and listed in the gap table." —
//       an agreement error (hardcoded plural regardless of count) AND the
//       sentence never named which element, despite promising "identified
//       above". The live document's own citation_misapplied HIGH finding
//       ("the report's Section 3 generated text endorses necessity as
//       'established'") is read against this exact vague, unnamed
//       qualifier — a specific named qualifier reads as a genuine
//       assessment, not an assurance.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { composeNecessityDetermination } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

Deno.test("DP1 — a single unsupported element is named, with correct singular agreement", () => {
  const report: Bag = {
    necessity_findings: [
      { operation_label: "Automated Sickness-Absence Profiling and Return-to-Work Risk Scoring", verdict: "less_intrusive_alternative_available" },
    ],
    proportionality: [
      { operation_label: "Automated Sickness-Absence Profiling and Return-to-Work Risk Scoring — secondary use", verdict: "least_intrusive_means_supported" },
    ],
  };
  const sentence = composeNecessityDetermination(report);
  assert(!/\bone elements\b/.test(sentence), "must not say 'one elements'");
  assertStringIncludes(sentence, "one element is not yet supported");
  assertStringIncludes(sentence, "Automated Sickness-Absence Profiling and Return-to-Work Risk Scoring");
});

Deno.test("DP1 — multiple unsupported elements are each named, with plural agreement", () => {
  const report: Bag = {
    necessity_findings: [
      { operation_label: "Primary scoring operation", verdict: "less_intrusive_alternative_available" },
      { operation_label: "Secondary reporting operation", verdict: "disproportionate_on_the_record" },
    ],
    proportionality: [],
  };
  const sentence = composeNecessityDetermination(report);
  assertStringIncludes(sentence, "two elements are not yet supported");
  assertStringIncludes(sentence, "Primary scoring operation");
  assertStringIncludes(sentence, "Secondary reporting operation");
});

Deno.test("DP1 — all elements supported still renders the established sentence unchanged", () => {
  const report: Bag = {
    necessity_findings: [{ operation_label: "Op A", verdict: "supported" }],
    proportionality: [{ operation_label: "Op B", verdict: "supported" }],
  };
  const sentence = composeNecessityDetermination(report);
  assertEquals(sentence, "On this analysis, necessity and proportionality are established for the processing as described.");
});

Deno.test("DP1 — no findings at all still renders the no-basis-to-determine sentence unchanged", () => {
  const sentence = composeNecessityDetermination({});
  assertStringIncludes(sentence, "cannot be determined based on the information the company provided alone");
});
