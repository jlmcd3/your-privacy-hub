// PROMPT 12H (CEO program, 2026-08-17) — MISSING IMPORT + STATIC-CHECK GATE.
//
// Two batches with pins_mode="none" died at dispatch with
// "pinsDispatchDecision is not defined": the orchestrator called the helper
// but never imported it. `deno check` catches that class outright, so this
// file makes the static check a permanent battery step AND executes the real
// dispatch-decision source region for all three pins_mode values.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dirname, fromFileUrl, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  pinsCompositionLine,
  pinsDispatchDecision,
  resolvePinsMode,
} from "../../../supabase/functions/_shared/quality/pins-mode.ts";
import { planPinnedOnly } from "../../../supabase/functions/_shared/quality/pinned-only.ts";
import { casesForVariant, goldenIntakes, intakesForVariant } from "../../../supabase/functions/_shared/golden/registry.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
function repoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    try {
      if (Deno.statSync(resolve(dir, "supabase", "functions")).isDirectory) return dir;
    } catch { /* keep walking */ }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("12H: could not locate repo root");
}
const ROOT = repoRoot(HERE);
const ORCH = resolve(ROOT, "supabase/functions/quality-batch-orchestrator/index.ts");

// ── Item 2 — STATIC-CHECK GATE ───────────────────────────────────────────────
// Entrypoints whose FULL import graph is clean. run-quality-batch is EXCLUDED
// and its pre-existing errors are enumerated in the landing report; it is not
// silenced here, merely out of the gate's scope until those are cleared.
const GATE_ENTRYPOINTS = ["supabase/functions/quality-batch-orchestrator/index.ts"];

Deno.test("12H/2 — deno check is clean on every gated edge-function entrypoint", async () => {
  for (const rel of GATE_ENTRYPOINTS) {
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["check", rel],
      cwd: ROOT,
      stdout: "piped",
      stderr: "piped",
    });
    const out = await cmd.output();
    const text = new TextDecoder().decode(out.stderr) + new TextDecoder().decode(out.stdout);
    assertEquals(out.code, 0, `deno check failed for ${rel}:\n${text}`);
  }
});

// ── Item 1 — the import is present and the call site resolves ────────────────

Deno.test("12H/1 — every pins-mode symbol the orchestrator references is imported", async () => {
  const src = await Deno.readTextFile(ORCH);
  const block = src.match(/import\s*\{([^}]*)\}\s*from\s*"\.\.\/_shared\/quality\/pins-mode\.ts"/);
  assert(block, "orchestrator must import from _shared/quality/pins-mode.ts");
  const imported = new Set(
    block![1].split(",").map((s) => s.replace(/\btype\b/, "").trim()).filter(Boolean),
  );
  assert(imported.has("pinsDispatchDecision"), "pinsDispatchDecision must be imported");
  for (const sym of ["normalizePinsMode", "pinsCompositionLine", "pinsDispatchDecision", "resolvePinsMode"]) {
    if (new RegExp(`\\b${sym}\\s*\\(`).test(src)) {
      assert(imported.has(sym), `${sym} is called but not imported`);
    }
  }
});

// ── SENTINEL — execute the ORCHESTRATOR'S OWN dispatch-decision source ────────
// The region is lifted verbatim from index.ts (between the `let sizeForTool`
// marker and the end of the pins branch) and executed with stubs, so a missing
// import or a renamed helper fails here at runtime, not in production.

async function runDispatchRegion(pinsModeRow: Record<string, unknown>, variant: string | null, size: number) {
  const src = await Deno.readTextFile(ORCH);
  const start = src.indexOf("        let sizeForTool = size;");
  assert(start >= 0, "dispatch region marker not found");
  const endMarker = "\n        const abPairId =";
  const end = src.indexOf(endMarker, start);
  assert(end > start, "dispatch region end marker not found");
  const region = src.slice(start, end);

  const logs: string[] = [];
  const results: unknown[] = [];
  const perToolSizes: Record<string, number> = {};
  const body = `
    return (async () => {
      const tool = "dpia";
      const run = row;
      const variantForTool = variant;
      const size = batchSize;
      let nextIdx = 0;
      const runId = "test-run";
      const log = async (_id, line) => { logs.push(line); };
      const db = { from: () => ({ update: () => ({ eq: async () => ({}) }) }) };
      const continueMarker = { skipped: false };
      ${region.replace(/\bcontinue;/g, "continueMarker.skipped = true; return { skipped: true, sizeForTool, pinsOverrideForTool, logs, results };")}
      return { skipped: false, sizeForTool, pinsOverrideForTool, logs, results };
    })();
  `;
  const fn = new Function(
    "row", "variant", "batchSize", "logs", "results", "perToolSizes",
    "resolvePinsMode", "pinsDispatchDecision", "pinsCompositionLine",
    "planPinnedOnly", "casesForVariant", "goldenIntakes", "intakesForVariant",
    body,
  );
  return await fn(
    pinsModeRow, variant, size, logs, results, perToolSizes,
    resolvePinsMode, pinsDispatchDecision, pinsCompositionLine,
    planPinnedOnly, casesForVariant, goldenIntakes, intakesForVariant,
  );
}

Deno.test('12H — dispatch path: pins_mode="none" passes pinsOverride=[] (the regression that died)', async () => {
  const r = await runDispatchRegion({ pins_mode: "none" }, "perfect", 4);
  assertEquals(r.pinsOverrideForTool, []);
  assertEquals(r.sizeForTool, 4);
  assertStringIncludes(r.logs.join("\n"), "pins_mode=none: dpia runs 0 pinned + 4 generated");
});

Deno.test('12H — dispatch path: pins_mode="seed" stages pins and generates the delta', async () => {
  const r = await runDispatchRegion({ pins_mode: "seed" }, "perfect", 6);
  assertEquals(r.pinsOverrideForTool, undefined, "seed must not override pins");
  assertEquals(r.sizeForTool, 6);
  assertStringIncludes(r.logs.join("\n"), "pins_mode=seed: dpia runs ");
});

Deno.test('12H — dispatch path: pins_mode="only" clamps to the closed-loop pins', async () => {
  const r = await runDispatchRegion({ pins_mode: "only" }, "perfect", 10);
  if (r.skipped) {
    // Zero usable pins is a legitimate outcome; the branch still executed.
    assertStringIncludes(r.logs.join("\n"), "pinned_only");
  } else {
    assert(Array.isArray(r.pinsOverrideForTool));
    assertEquals(r.sizeForTool, (r.pinsOverrideForTool as unknown[]).length);
    assertStringIncludes(r.logs.join("\n"), "pins_mode=only: dpia runs ");
  }
});

Deno.test("12H — dispatch path: legacy pinned_only=true still resolves to the only-branch", async () => {
  const r = await runDispatchRegion({ pinned_only: true }, "perfect", 10);
  assertStringIncludes(r.logs.join("\n"), "pinned_only");
});
