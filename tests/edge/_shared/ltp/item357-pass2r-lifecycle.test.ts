/**
 * ITEM 357 (§2b) — PASS-2R LIFECYCLE TEST (hermetic: no model spend).
 *
 * Reproduces the v2 shell's async ordering (persist-first → awaited Pass-2R →
 * row UPDATE) against an in-memory row and proves:
 *   1. the deterministic payload persists first;
 *   2. Pass-2R runs INSIDE the awaited task and its UPDATE lands on the row;
 *   3. a deterministic ship ALWAYS carries a recorded reason (silent fallback
 *      is a defect — the Item 355(#6) failure mode).
 *
 * The model call is injected, so the suite is deterministic and free.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  generateCppaRiskReport,
  runCppaRiskPass2R,
} from "../../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { runConformanceChecks } from "../../fixtures/item354/conformance-checks.ts";

const raw = JSON.parse(
  await Deno.readTextFile(new URL("../../fixtures/item350/perfect-a073d9c5.json", import.meta.url)),
);

interface Row { status: string; report_data: Record<string, unknown> | null }

type Scenario = "disabled" | "rejected";

async function runShellLifecycle(scenario: Scenario): Promise<{ row: Row; writes: string[] }> {
  const row: Row = { status: "processing", report_data: null };
  const writes: string[] = [];
  const options = {
    buildStamp: "item357-lifecycle",
    runId: "item357-lifecycle",
    mode: "enforce" as const,
    pass1: "deterministic" as const,
    euCorpus: [],
    ...(scenario === "disabled"
      ? { pass2rEnabled: false }
      // Injected call returns prose the validators cannot accept → rejection
      // path, which must still be recorded on the row.
      : { pass2rCall: () => Promise.resolve("not a valid pass-2R document") }),
  };

  // One awaited task — exactly what EdgeRuntime.waitUntil receives in v2.
  await (async () => {
    const gen = await generateCppaRiskReport(raw, options);
    row.status = "complete";
    row.report_data = gen.report;
    writes.push("persist_first");

    const p2 = await runCppaRiskPass2R(gen, options);
    if (p2.report) {
      row.report_data = p2.report;
      writes.push("pass2r_update");
    }
  })();

  return { row, writes };
}

function ltpOf(row: Row): Record<string, unknown> {
  const internal = (row.report_data!._meta as Record<string, unknown>).internal as Record<string, unknown>;
  return internal.ltp as Record<string, unknown>;
}

for (const scenario of ["disabled", "rejected"] as const) {
  Deno.test(`[item357][${scenario}] persist-first then Pass-2R UPDATE both land inside the awaited task`, async () => {
    const { row, writes } = await runShellLifecycle(scenario);
    assertEquals(writes, ["persist_first", "pass2r_update"]);
    assertEquals(row.status, "complete");
    assert(row.report_data, "row carries a payload");
  });

  Deno.test(`[item357][${scenario}] a deterministic ship never lands silently`, async () => {
    const { row } = await runShellLifecycle(scenario);
    const ltp = ltpOf(row);
    if (ltp.shipped_surface === "deterministic") {
      const reason = ltp.pass2r_skipped_reason;
      assert(
        typeof reason === "string" && reason.length > 0,
        `deterministic ship with no recorded reason: ${JSON.stringify(reason)}`,
      );
      assert(reason !== "pass2r_not_run_yet", "the placeholder reason must be replaced by the real one");
    } else {
      assertEquals(ltp.shipped_surface, "2R");
    }
  });

  Deno.test(`[item357][${scenario}] the post-Pass-2R payload still satisfies the full conformance suite`, async () => {
    const { row } = await runShellLifecycle(scenario);
    const failed = runConformanceChecks(row.report_data!).filter((r) => !r.ok);
    assert(failed.length === 0, failed.map((r) => `${r.name}: ${r.detail}`).join(" | "));
  });
}
