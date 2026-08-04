// MODEL A/B HARNESS (dispatch 1), item 2 — GRADER MODELS ARE PINNED.
//
// The A/B generation model must never leak into a grading, rubric,
// cross-review, or fixture-intake call: if it did, the two arms of a pair
// would no longer be graded on the same yardstick (or generated from the same
// facts) and the comparison would be worthless.
//
// This is a source-level assertion because the grader call sites are internal
// to run-quality-batch and not separately importable.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";

const SRC = await Deno.readTextFile(
  new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
);

Deno.test("grader/rubric model strings are literals, not the A/B model", () => {
  // Claude grader default.
  assert(
    /async function claude\([^)]*model = "claude-opus-4-6"/s.test(SRC),
    "claude() grader default model string changed or became dynamic",
  );
  // OpenAI graders.
  assert(SRC.includes('model: "gpt-4o"'), "gpt-4o grader model string missing");
  assert(SRC.includes('model: "o3"'), "o3 grader model string missing");
  // Fixture-intake generation must stay pinned so BOTH arms see identical facts.
  assert(
    SRC.includes('16000,\n      "claude-sonnet-4-6",'),
    "fixture-intake generation model is no longer a pinned literal",
  );
});

Deno.test("currentGenerationModel() is never used at a grader call site", () => {
  // Exactly two permitted uses: invokeFn (dispatch) and resurrectGenerator
  // (re-invoking a stalled resumable generator on the run's ambient model).
  const uses = [...SRC.matchAll(/currentGenerationModel\(\)/g)].length;
  assertEquals(uses, 2, "currentGenerationModel() must be referenced exactly twice (invokeFn, resurrectGenerator)");
  const invokeFnBody = SRC.slice(
    SRC.indexOf("async function invokeFn("),
    SRC.indexOf("interface Check {"),
  );
  assert(
    invokeFnBody.includes("currentGenerationModel()"),
    "the invokeFn use of currentGenerationModel() is missing",
  );
  const resurrectBody = SRC.slice(
    SRC.indexOf("export async function resurrectGenerator("),
    SRC.indexOf("async function pollGenerationRow("),
  );
  assert(
    resurrectBody.includes("currentGenerationModel()"),
    "resurrectGenerator must attach the ambient generation model",
  );
});


Deno.test("A/B dispatch allowlist contains product generators only", () => {
  const block = SRC.slice(
    SRC.indexOf("export const AB_GENERATION_FUNCTIONS"),
    SRC.indexOf("async function invokeFn("),
  );
  for (const forbidden of [
    "ask-privacy",
    "generate-weekly-brief",
    "generate-custom-brief",
    "generate-trend-report",
    "check-state-privacy-laws",
    "generate-dpa",
    "generate-report-pdf",
    "run-registration-assessment",
  ]) {
    assert(!block.includes(`"${forbidden}"`), `${forbidden} must not receive the A/B generation model`);
  }
  for (const expected of [
    "run-dpia-framework",
    "run-li-assessment",
    "run-admt-checker",
    "run-cppa-cybersecurity",
    "run-governance-assessment",
    "check-biometric-compliance",
    "generate-ir-playbook",
  ]) {
    assert(block.includes(`"${expected}"`), `${expected} missing from the A/B allowlist`);
  }
});
