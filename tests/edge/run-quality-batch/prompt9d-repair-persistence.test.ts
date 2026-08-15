// PROMPT 9D items 2 + 3 — rejected-intake persistence and blacklist-aware
// repair guidance. Harness only.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  screenIntake,
} from "../../../supabase/functions/run-quality-batch/index.ts";
import { fixtureConstraintGuidance } from "../../../supabase/functions/run-quality-batch/_local/quality/fixture-lint.ts";
import { BLACKLIST_PHRASES } from "../../../supabase/functions/_shared/blacklist-phrases.ts";
import { DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";

function validIntake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(DPIA_GOLDEN[0].intake as Record<string, unknown>), ...over };
}

Deno.test("9D item 3: the constraint block is sourced from the shared blacklist module", () => {
  const g = fixtureConstraintGuidance();
  for (const p of BLACKLIST_PHRASES) assertStringIncludes(g, p);
  assertStringIncludes(g, "[PLACEHOLDER]");
  assertStringIncludes(g, "must also avoid".toUpperCase());
});

Deno.test("9D item 3: the lint repair prompt names the blacklist constraints", async () => {
  const prompts: string[] = [];
  await screenIntake(
    "dpia",
    validIntake(),
    (x: any) => (x.dpia_prepared_by ? null : { reason: "sign-off block incomplete", deficiencies: [] }),
    undefined,
    async (_t, _n, guidance) => {
      prompts.push(guidance ?? "");
      return [validIntake({ dpia_prepared_by: "R. Shah" })];
    },
  );
  assertStringIncludes(prompts[0], BLACKLIST_PHRASES[0]);
  assertStringIncludes(prompts[0], "REPAIR MODE");
});

Deno.test("9D item 3: a retry rejected for a DIFFERENT reason names both reasons and the passage", async () => {
  let n = 0;
  const res = await screenIntake(
    "dpia",
    validIntake(),
    () => (n++ === 0
      ? { reason: "closed-loop perfect: alternatives_considered missing", deficiencies: [] }
      : { reason: "blacklist phrase", path: "$.necessity_proportionality", sample: "insufficient basis to assess" }),
    undefined,
    async () => [validIntake()],
  );
  assert(!res.ok);
  assertStringIncludes(res.reason, "alternatives_considered missing");
  assertStringIncludes(res.reason, "DIFFERENT REASON");
  assertStringIncludes(res.reason, "blacklist phrase");
  assertStringIncludes(res.reason, "$.necessity_proportionality");
});

Deno.test("9D item 2: both rejected intake objects are carried for diffing", async () => {
  const first = validIntake({ organization_name: "Alpha" });
  const second = validIntake({ organization_name: "Beta" });
  const res = await screenIntake(
    "dpia",
    first,
    () => ({ reason: "blacklist phrase", path: "$.x" }),
    undefined,
    async () => [second],
  );
  assert(!res.ok);
  assertEquals(res.attempts.length, 2);
  assertEquals(res.attempts[0].attempt, 1);
  assertEquals((res.attempts[0].intake as any).organization_name, "Alpha");
  assertEquals((res.attempts[1].intake as any).organization_name, "Beta");
});

Deno.test("9D item 2: a rejected scenario persists its JSON in the progress structure", async () => {
  const { progress } = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: null,
    _now: () => 0,
    _generate: async () => [{ organization_name: "Rejected Co" }],
    _screen: async (_t, item) => ({
      ok: false as const,
      reason: "contract violation",
      attempts: [{ attempt: 1, reason: "contract violation", intake: item }],
    }) as any,
  });
  assertEquals(progress.rejected.length, 3);
  const a = progress.rejected[0].attempts!;
  assertEquals(a[0].intake.organization_name, "Rejected Co");
  // Round-trips through jsonb (partial_state) unchanged.
  assertEquals(JSON.parse(JSON.stringify(a))[0].reason, "contract violation");
});

Deno.test("9D: perfect fail-fast and non-perfect behaviour unchanged", async () => {
  let generated = 0;
  const perfect = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: "perfect",
    _now: () => 0,
    _generate: async () => { generated++; return [{ organization_name: `Co${generated}` }]; },
    _screen: async () => ({ ok: false as const, reason: "closed-loop perfect: x" }),
  });
  assertEquals(perfect.status, "complete");
  assertEquals(generated, 1);

  let gen2 = 0;
  const plain = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: null,
    _now: () => 0,
    _generate: async () => { gen2++; return [{ organization_name: `Co${gen2}` }]; },
    _screen: async () => ({ ok: false as const, reason: "contract violation" }),
  });
  assertEquals(gen2, 3);
  assertEquals(plain.progress.rejected.length, 3);
});
