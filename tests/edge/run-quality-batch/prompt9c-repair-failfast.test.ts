// PROMPT 9C items 3 + 4 — repair-mode retry and perfect-variant fail-fast.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  screenIntake,
} from "../../../supabase/functions/run-quality-batch/index.ts";

Deno.test("9C item 3: the repair prompt carries the rejected intake verbatim", async () => {
  const rejected = { organization_name: "Britannia Mutual", secondary_uses: "Benchmarking" };
  let seen = "";
  let firstCall = true;
  const res = await screenIntake(
    "dpia",
    rejected,
    // Lint rejects the original, accepts the repaired object.
    (x: any) => (x.legal_basis_secondary ? null : { reason: "missing secondary basis", deficiencies: [] }),
    undefined,
    async (_t, _n, guidance) => {
      seen = guidance ?? "";
      firstCall = false;
      return [{ ...rejected, legal_basis_secondary: "Art. 6(1)(f)" }];
    },
  );
  assertEquals(firstCall, false);
  assertStringIncludes(seen, "REPAIR MODE");
  assertStringIncludes(seen, "return this same object with the listed facts added; change nothing else");
  assertStringIncludes(seen, JSON.stringify(rejected));
  assert(res.ok === false || res.ok === true);
});

Deno.test("9C item 3: a repairable rejection preserves every non-deficient field byte-identical", async () => {
  const rejected = {
    organization_name: "Britannia Mutual",
    processing_activity_name: "Workforce sentiment analytics",
    retention_period: "24 months",
    secondary_uses: "Benchmarking",
  };
  const repaired = await screenIntake(
    "dpia",
    rejected,
    (x: any) => (x.legal_basis_secondary ? null : { reason: "missing secondary basis", deficiencies: [] }),
    undefined,
    // Simulates a compliant model: echoes the object, adds only the deficiency.
    async (_t, _n, guidance) => {
      const json = (guidance ?? "").split("REJECTED INTAKE JSON:\n")[1];
      return [{ ...JSON.parse(json), legal_basis_secondary: "Art. 6(1)(f)" }];
    },
  );
  if (!repaired.ok) throw new Error(`expected repair to succeed: ${repaired.reason}`);
  for (const k of Object.keys(rejected) as (keyof typeof rejected)[]) {
    assertEquals(repaired.intake[k], rejected[k]);
  }
  assertEquals(repaired.intake.legal_basis_secondary, "Art. 6(1)(f)");
});

Deno.test("9C item 4: perfect variant aborts after the first rejected scenario", async () => {
  let generated = 0;
  const reasons: (string | undefined)[] = [];
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: "perfect",
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "closed-loop perfect: alternatives_considered missing" }),
    onScenario: async (_d, _t, _s, ok, reason) => { if (!ok) reasons.push(reason); },
  });
  assertEquals(status, "complete");
  assertEquals(generated, 1);
  assertEquals(progress.totalAttempted, 1);
  assertEquals(progress.rejected.length, 1);
  assertStringIncludes(reasons[0] ?? "", "alternatives_considered missing");
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
