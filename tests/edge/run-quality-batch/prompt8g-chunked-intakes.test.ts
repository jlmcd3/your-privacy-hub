// PROMPT 8G — chunk-safe intake generation (harness only).
// One scenario per model call, deadline checked BETWEEN calls, partial set
// resumable, per-scenario progress entries, fail-rate accounting preserved.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  usedNames,
} from "../../../supabase/functions/run-quality-batch/index.ts";

const okScreen = async (_t: string, item: any) => ({ ok: true as const, intake: item });

function clock(startMs: number, stepMs: number) {
  let t = startMs;
  return () => { t += stepMs; return t; };
}

Deno.test("8G: one model call per scenario, n calls for n scenarios", async () => {
  const calls: number[] = [];
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    _now: () => 0,
    _screen: okScreen,
    _generate: async (_tool, n) => { calls.push(n); return [{ organization_name: `Co${calls.length}` }]; },
  });
  assertEquals(status, "complete");
  assertEquals(calls.length, 5);
  assertEquals(calls.every((n) => n === 1), true);
  assertEquals(progress.accepted.length, 5);
  assertEquals(progress.totalAttempted, 5);
});

Deno.test("8G: deadline between calls returns partial progress, never a hard kill", async () => {
  // Clock advances 100s per read; deadline at 250 ⇒ stops after ~1 scenario.
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    deadlineAt: 250_000,
    _now: clock(0, 100_000),
    _screen: okScreen,
    _generate: async () => [{ organization_name: "Alpha Ltd" }],
  });
  assertEquals(status, "deadline");
  assertEquals(progress.totalAttempted < 5, true);
  assertEquals(progress.accepted.length, progress.totalAttempted);
});

Deno.test("8G: resumes at the next scenario from persisted partial progress", async () => {
  const prior = { accepted: [{ organization_name: "Alpha Ltd" }, { organization_name: "Beta AG" }], rejected: [], totalAttempted: 2 };
  let made = 0;
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 5, prior, {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    _now: () => 0,
    _screen: okScreen,
    _generate: async () => { made++; return [{ organization_name: `Gamma${made}` }]; },
  });
  assertEquals(status, "complete");
  assertEquals(made, 3);           // only the remaining 3
  assertEquals(progress.accepted.length, 5);
  assertEquals(progress.totalAttempted, 5);
});

Deno.test("8G: per-scenario progress callback fires once per scenario", async () => {
  const entries: string[] = [];
  await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    _now: () => 0,
    _screen: okScreen,
    _generate: async () => [{ organization_name: "X" }],
    onScenario: async (done, total, secs) => { entries.push(`Scenario ${done}/${total} generated (${secs.toFixed(1)}s)`); },
  });
  assertEquals(entries, [
    "Scenario 1/3 generated (0.0s)",
    "Scenario 2/3 generated (0.0s)",
    "Scenario 3/3 generated (0.0s)",
  ]);
});

Deno.test("8G: rejections and generation errors still count toward totalAttempted", async () => {
  let i = 0;
  const { progress, status } = await generateValidatedIntakesChunked("dpia", 4, emptyIntakeGenProgress(), {
    deadlineAt: Number.MAX_SAFE_INTEGER,
    _now: () => 0,
    _generate: async () => { i++; if (i === 2) throw new Error("stream stalled"); return [{ organization_name: `Co${i}` }]; },
    _screen: async (_t, item) => (item.organization_name === "Co3" ? { ok: false as const, reason: "contract violation" } : { ok: true as const, intake: item }),
  });
  assertEquals(status, "complete");
  assertEquals(progress.totalAttempted, 4);
  assertEquals(progress.accepted.length, 2);
  assertEquals(progress.rejected.length, 2);
  // >30% fail-rate guard operates on these numbers.
  assertEquals(progress.rejected.length / progress.totalAttempted > 0.3, true);
});

Deno.test("8G: usedNames feeds cross-call name variety", () => {
  assertEquals(usedNames([{ organization_name: "Alpha Ltd" }, { subscriberName: "Beta" }, {}]), ["Alpha Ltd", "Beta"]);
});
