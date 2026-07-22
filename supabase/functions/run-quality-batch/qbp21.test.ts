// QB-P21 unit test: shouldResurrect decision logic.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { shouldResurrect } from "./index.ts";

const now = Date.parse("2026-07-23T00:20:00Z");

Deno.test("fresh row → no resurrect", () => {
  assertEquals(
    shouldResurrect({
      tool: "dpia",
      updatedAtIso: new Date(now - 30_000).toISOString(),
      nowMs: now,
      attempts: 0,
    }),
    false,
  );
});

Deno.test("stale row (>180s) → resurrect", () => {
  assertEquals(
    shouldResurrect({
      tool: "dpia",
      updatedAtIso: new Date(now - 200_000).toISOString(),
      nowMs: now,
      attempts: 0,
    }),
    true,
  );
});

Deno.test("attempt cap honored (>=2 → no resurrect)", () => {
  assertEquals(
    shouldResurrect({
      tool: "dpia",
      updatedAtIso: new Date(now - 600_000).toISOString(),
      nowMs: now,
      attempts: 2,
    }),
    false,
  );
});

Deno.test("non-resumable tool → no resurrect", () => {
  assertEquals(
    shouldResurrect({
      tool: "governance",
      updatedAtIso: new Date(now - 600_000).toISOString(),
      nowMs: now,
      attempts: 0,
    }),
    false,
  );
});

Deno.test("missing updated_at → no resurrect", () => {
  assertEquals(
    shouldResurrect({ tool: "dpia", updatedAtIso: null, nowMs: now, attempts: 0 }),
    false,
  );
});
