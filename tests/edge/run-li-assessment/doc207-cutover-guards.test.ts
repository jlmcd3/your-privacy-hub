// DOC 207 TRACK 1 — CUTOVER GUARDS. Pins the pure decision logic behind
// index.ts's two legacy-only fetches (get-enforcement-context,
// li_tracker_entries): both fetch when the deterministic flag is off (the
// legacy model path, byte-untouched) and both are skipped when it is on
// (206B0 §7-8: no deterministic-path renderer reads their output).
//
// index.ts itself calls `Deno.serve(serveWithGenerationModel(...))` at
// module load, so it cannot be imported here without starting a server —
// the existing suite works around this by reading its source text
// (tests/edge/run-li-assessment/upgrade4.test.ts ITEM 3); this file does
// the same to prove the two call sites actually route through the pure
// helpers, on top of unit-testing the helpers themselves.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  shouldFetchEnforcementContext,
  shouldFetchTrackerPrecedents,
} from "../../../supabase/functions/run-li-assessment/_local/legacy-fetch-policy.ts";

// ── The pure predicates ─────────────────────────────────────────────────

Deno.test("shouldFetchEnforcementContext — fetches on the legacy path, skips on the deterministic path", () => {
  assertEquals(shouldFetchEnforcementContext(false), true);
  assertEquals(shouldFetchEnforcementContext(true), false);
});

Deno.test("shouldFetchTrackerPrecedents — fetches on the legacy path, skips on the deterministic path", () => {
  assertEquals(shouldFetchTrackerPrecedents(false), true);
  assertEquals(shouldFetchTrackerPrecedents(true), false);
});

// ── index.ts actually wires the two call sites through these helpers ────

const INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/run-li-assessment/index.ts", import.meta.url),
);

Deno.test("doc207 — index.ts imports the legacy-fetch-policy helpers", () => {
  assertStringIncludes(
    INDEX_SRC,
    `import { shouldFetchEnforcementContext, shouldFetchTrackerPrecedents } from "./_local/legacy-fetch-policy.ts";`,
  );
});

Deno.test("doc207 — get-enforcement-context is gated by shouldFetchEnforcementContext, not called unconditionally", () => {
  const idx = INDEX_SRC.indexOf('supabase.functions.invoke("get-enforcement-context"');
  assert(idx >= 0, "get-enforcement-context invocation not found");
  const window = INDEX_SRC.slice(Math.max(0, idx - 400), idx);
  assertStringIncludes(window, "shouldFetchEnforcementContext(LIA_DETERMINISTIC_ENABLED)");
  // The null-data fallback so downstream `ctx?.data` reads still work.
  const after = INDEX_SRC.slice(idx, idx + 1200);
  assertStringIncludes(after, "Promise.resolve({ data: null }");
});

Deno.test("doc207 — li_tracker_entries is gated by shouldFetchTrackerPrecedents, not called unconditionally", () => {
  const idx = INDEX_SRC.indexOf('.from("li_tracker_entries")');
  assert(idx >= 0, "li_tracker_entries query not found");
  const window = INDEX_SRC.slice(Math.max(0, idx - 300), idx);
  assertStringIncludes(window, "shouldFetchTrackerPrecedents(LIA_DETERMINISTIC_ENABLED)");
  const after = INDEX_SRC.slice(idx, idx + 300);
  assertStringIncludes(after, "{ data: [] as any[] }");
});

Deno.test("doc207 — getGdprContext (the law-block fetch) is untouched by this guard — still called unconditionally", () => {
  // 206B0 §1 / doc 207 §1: do NOT touch getGdprContext; only its semantic
  // limb is already dropped under the flag (pre-existing behavior). This
  // pins that the call site itself carries no shouldFetch* gate.
  const idx = INDEX_SRC.indexOf("getGdprContext(supabase");
  assert(idx >= 0, "getGdprContext call not found");
  const window = INDEX_SRC.slice(Math.max(0, idx - 200), idx);
  assert(
    !window.includes("shouldFetch"),
    "getGdprContext must not be gated by a shouldFetch* helper — only its semanticQuery limb changes under the flag",
  );
});
