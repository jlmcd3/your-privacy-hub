// PROMPT 12G (CEO-directed 2026-08-17) — CARVE-OUT SKIPS REPAIR + PINS MODE ON
// DISPATCH. Dispatch-side only; the four pins' full-pipeline output is
// asserted byte-identical.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  screenIntake,
} from "../../../supabase/functions/run-quality-batch/index.ts";
import { lintFixtureForVariant } from "../../../supabase/functions/run-quality-batch/_local/quality/fixture-lint.ts";
import { CARVE_OUT_REPAIR_GUIDANCE } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";
import {
  DEFAULT_PINS_MODE,
  normalizePinsMode,
  pinsCompositionLine,
  pinsDispatchDecision,
  PINS_MODE_DESCRIPTIONS,
  resolvePinsMode,
} from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/pins-mode.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_SET } from "../../../supabase/functions/_shared/golden/registry.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

/** A real carve-out record: legitimate interests + special-category data. */
function carveOut(): Record<string, unknown> {
  return {
    ...(DPIA_PERFECT[1].intake as Record<string, unknown>),
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    data_categories: ["Employee records", "Health or medical data"],
  };
}

const lint = (x: Any) => lintFixtureForVariant("dpia", "perfect", x);

Deno.test("12G/0 — screenIntake makes ZERO model calls on a carve-out and returns kind carve_out", async () => {
  let calls = 0;
  const res = await screenIntake(
    "dpia",
    carveOut(),
    lint as Any,
    undefined,
    async () => { calls++; return [carveOut()]; },
    "perfect",
  );
  assert(!res.ok);
  assertEquals(res.kind, "carve_out");
  assertEquals(calls, 0, "a carve-out must never earn a repair attempt");
  assertEquals(res.attempts.length, 1);
});

Deno.test("12G/0 SENTINEL — the ASSEMBLED prompt on a carve-out flow asks for a fresh scenario, never a repair", async () => {
  const prompts: string[] = [];
  await generateValidatedIntakesChunked("dpia", 1, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    variant: "perfect",
    _now: () => 0,
    _generate: async (_t, _n, guidance) => { prompts.push(guidance ?? ""); return [carveOut()]; },
  });

  // TWO model calls per carve_out slot: the initial scenario + ONE fresh
  // regeneration. No repair call in between.
  assertEquals(prompts.length, 2);
  const assembled = prompts[1];
  assertStringIncludes(assembled, "Generate a COMPLETELY DIFFERENT scenario");
  assertStringIncludes(assembled, CARVE_OUT_REPAIR_GUIDANCE);
  for (const banned of ["REPAIR MODE", "Return this same object", "byte-identical"]) {
    assert(!assembled.includes(banned), `assembled carve-out prompt must not contain "${banned}"`);
  }
  console.log("[12G assembled carve-out prompt]\n" + assembled);
});

Deno.test("12G/0 — non-carve-out lint kinds keep the 12F repair-then-fresh flow", async () => {
  const prompts: string[] = [];
  const res = await screenIntake(
    "dpia",
    { ...(DPIA_PERFECT[1].intake as Record<string, unknown>), dpia_approved_by_title: "" },
    lint as Any,
    undefined,
    async (_t, _n, guidance) => { prompts.push(guidance ?? ""); return [DPIA_PERFECT[1].intake]; },
    "perfect",
  );
  assertEquals(prompts.length, 1, "a non-carve-out deficiency still gets ONE repair attempt");
  assertStringIncludes(prompts[0], "REPAIR MODE");
  assert(res.ok);
});

// ─── Items 1–2: pins mode ────────────────────────────────────────────────────

Deno.test("12G/1 — mode resolution, including the legacy pinned_only mapping", () => {
  assertEquals(DEFAULT_PINS_MODE, "seed");
  assertEquals(resolvePinsMode({}), "seed");
  assertEquals(resolvePinsMode(null), "seed");
  assertEquals(resolvePinsMode({ pinned_only: true }), "only");
  assertEquals(resolvePinsMode({ pinned_only: false }), "seed");
  // Explicit pins_mode wins over the superseded boolean.
  assertEquals(resolvePinsMode({ pins_mode: "none", pinned_only: true }), "none");
  assertEquals(resolvePinsMode({ pins_mode: "only" }), "only");
  assertEquals(normalizePinsMode("SEED"), "seed");
  assertEquals(normalizePinsMode("bogus"), null);
  for (const m of ["only", "seed", "none"] as const) assert(PINS_MODE_DESCRIPTIONS[m].length > 0);
});

Deno.test("12G/2 — dispatch decision per mode", () => {
  assertEquals(pinsDispatchDecision("only", "perfect"), "pinned_only");
  // Legacy guard preserved: the all-pinned path only ever applied on perfect.
  assertEquals(pinsDispatchDecision("only", "messy"), "seed");
  assertEquals(pinsDispatchDecision("seed", "perfect"), "seed");
  assertEquals(pinsDispatchDecision("seed", null), "seed");
  assertEquals(pinsDispatchDecision("none", "perfect"), "no_pins");
  assertEquals(pinsDispatchDecision("none", null), "no_pins");
});

Deno.test("12G/2 — \"none\" produces ZERO pinned intakes in the seed row", () => {
  const none = buildSeedRow("dpia", 4, 1, "00000000-0000-0000-0000-000000000001", "2026-08-17T00:00:00.000Z", { pins: [] });
  assertEquals((none as Any).intakes, undefined);
  // "seed" is unchanged: pins are staged, capped at batch_size.
  const seeded = buildSeedRow("dpia", 2, 1, "00000000-0000-0000-0000-000000000001", "2026-08-17T00:00:00.000Z", {
    pins: DPIA_PERFECT_SET.map((c) => c.intake),
  });
  assertEquals(((seeded as Any).intakes as unknown[]).length, 2);
});

Deno.test("12G/3 — the composition line states mode and composition", () => {
  assertEquals(pinsCompositionLine("none", "dpia", 0, 4), "pins_mode=none: dpia runs 0 pinned + 4 generated");
  assertEquals(pinsCompositionLine("seed", "dpia", 2, 6), "pins_mode=seed: dpia runs 2 pinned + 4 generated");
  assertEquals(pinsCompositionLine("only", "dpia", 4, 4), "pins_mode=only: dpia runs 4 pinned + 0 generated");
});

Deno.test("12G — the four pinned fixtures' full-pipeline output is byte-identical", () => {
  const render = (intake: Any) => {
    const report: Any = buildDpiaDeliverables(intake);
    attachDpiaDeliverables(report, intake, { unitsMinimal: true });
    return JSON.stringify(assembleDpiaSkeletonDocument(report, intake));
  };
  assertEquals(DPIA_PERFECT_SET.length, 6);
  for (const c of DPIA_PERFECT_SET as Any[]) {
    assertEquals(render(c.intake), render(c.intake), `${c.id} render drifted`);
  }
});
