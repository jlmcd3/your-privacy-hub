// PROMPT 9C items 3 + 4 — repair-mode retry and perfect-variant fail-fast.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  screenIntake,
} from "../../../supabase/functions/run-quality-batch/index.ts";

import { DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

// A contract-valid dpia intake, so the lint path (not contract validation) is
// what the repair assertions exercise.
function validIntake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(DPIA_GOLDEN[0].intake as Record<string, unknown>), ...over };
}

Deno.test("9C item 3: the repair prompt carries the rejected intake verbatim", async () => {
  const rejected = validIntake();
  const prompts: string[] = [];
  await screenIntake(
    "dpia",
    rejected,
    (x: any) => (x.dpia_prepared_by ? null : { reason: "sign-off block incomplete", deficiencies: [] }),
    undefined,
    async (_t, _n, guidance) => {
      prompts.push(guidance ?? "");
      return [validIntake({ dpia_prepared_by: "R. Shah" })];
    },
  );
  assertEquals(prompts.length, 1);
  assertStringIncludes(prompts[0], "REPAIR MODE");
  assertStringIncludes(prompts[0], "change nothing else");
  assertStringIncludes(prompts[0], JSON.stringify(rejected));
});

Deno.test("9C item 3: a repairable rejection preserves every non-deficient field byte-identical", async () => {
  const rejected = validIntake();
  const repaired = await screenIntake(
    "dpia",
    rejected,
    (x: any) => (x.dpia_prepared_by ? null : { reason: "sign-off block incomplete", deficiencies: [] }),
    undefined,
    // Simulates a compliant model: echoes the object back, adds only the deficiency.
    async (_t, _n, guidance) => {
      const json = (guidance ?? "").split("REJECTED INTAKE JSON:\n")[1];
      return [{ ...JSON.parse(json), dpia_prepared_by: "R. Shah" }];
    },
  );
  if (!repaired.ok) throw new Error(`expected repair to succeed: ${repaired.reason}`);
  for (const k of Object.keys(rejected)) {
    assertEquals(JSON.stringify(repaired.intake[k]), JSON.stringify(rejected[k]), `field drifted: ${k}`);
  }
  assertEquals(repaired.intake.dpia_prepared_by, "R. Shah");
});

Deno.test("9C item 4 (RE-POINTED at 12F): perfect variant stops on the kind-aware rate abort", async () => {
  // 12F item 3 supersedes the single-scenario fail-fast: a lint-class rejection
  // now earns ONE fresh regeneration, and the batch aborts on a >50% rejection
  // rate after at least four attempts.
  let generated = 0;
  const reasons: (string | undefined)[] = [];
  const { progress, status, abort } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: "perfect",
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "closed-loop perfect: alternatives_considered missing" }),
    onScenario: async (_d, _t, _s, ok, reason) => { if (!ok) reasons.push(reason); },
  });
  assertEquals(status, "complete");
  assertEquals(generated, 4);
  assertEquals(progress.totalAttempted, 4);
  assertEquals(progress.rejected.length, 4);
  assertEquals(abort?.kind, "rate");
  assertStringIncludes(reasons[0] ?? "", "alternatives_considered missing");
});

// QB-REPAIR-1 (2026-08-27) — live batch 510a9953: cppa-risk's intake
// generator produced admt_testing_facts: ["Testing performed within the
// last 12 months"], a near-miss paraphrase of the real option "Testing
// performed or reviewed within the last 12 months". The repair retry
// (screenIntake's own internal contract-violation path, not the lint path
// the tests above exercise) named the bad value but never the allowed set,
// so the model repeated the same near-miss and the whole run aborted. This
// pins the fix: the repair guidance now carries the field's actual options.
Deno.test("QB-REPAIR-1: contract-violation repair guidance names the field's actual allowed options", async () => {
  // Otherwise-complete/valid intake — only admt_testing_facts is wrong,
  // matching the live shape (a single near-miss paraphrase, not a mass of
  // missing-required violations burying it out of the reason string's
  // first-4 window).
  const rejected = {
    ...(CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>),
    admt_testing_facts: ["Testing performed within the last 12 months"],
  };
  const prompts: string[] = [];
  const repaired = await screenIntake(
    "cppa-risk",
    rejected,
    () => null, // no lint rejection — the contract path is what's under test
    undefined,
    async (_t, _n, guidance) => {
      prompts.push(guidance ?? "");
      // Simulate the model repeating the exact same near-miss on retry —
      // the failure mode actually observed live.
      return [rejected];
    },
  );
  assertEquals(repaired.ok, false);
  assertStringIncludes(prompts[0] ?? "", "admt_testing_facts");
  assertStringIncludes(prompts[0] ?? "", "valid options:");
  assertStringIncludes(prompts[0] ?? "", "Testing performed or reviewed within the last 12 months");
});

Deno.test("9C item 4: non-perfect variants keep the full-count behaviour", async () => {
  let generated = 0;
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: null,
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "contract violation" }),
  });
  assertEquals(status, "complete");
  assertEquals(generated, 3);
  assertEquals(progress.rejected.length, 3);
});
