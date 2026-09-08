// BUGFIX (2026-09-08) — regression coverage for the ADMT v1/v2 regen
// routing bug: regenerate-assessment's FN_MAP had a single static
// cppa_admt -> "run-admt-checker" (v1) entry, so regenerating a
// v2-generated assessment (cppa_assessments.module = "admt_v2") was always
// dispatched to legacy v1, which queries `.eq("module", "admt")` and finds
// no row for a v2 row -> 404 "Assessment not found".
//
// Part 1 tests the extracted pure resolver directly (behavioral coverage:
// (a) a v2-generated assessment now resolves to run-admt-checker-v2,
// (b) a v1-generated/legacy/module-absent assessment still resolves to
// run-admt-checker, unchanged).
//
// Part 2 pins that index.ts's three FN_MAP[tool_type] call sites (internal-
// verification sync revision dispatch, async customer revision dispatch,
// and the classic edited_fields dispatch) were actually rewired through the
// resolver rather than just adding a helper nobody calls. index.ts itself
// calls `Deno.serve(...)` at module load, so it cannot be imported here
// without starting a server — the existing suite works around this by
// reading its source text (tests/edge/run-li-assessment/doc207-cutover-
// guards.test.ts is the established precedent for this exact situation).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  resolveAdmtRegenFn,
  RUN_ADMT_CHECKER_V1_FN,
  RUN_ADMT_CHECKER_V2_FN,
  ADMT_V2_MODULE_VALUE,
} from "../../../supabase/functions/regenerate-assessment/_local/admt-regen-routing.ts";

// ── Part 1 — the pure resolver ──────────────────────────────────────────

Deno.test("resolveAdmtRegenFn — a v2-generated assessment (module='admt_v2') resolves to run-admt-checker-v2", () => {
  assertEquals(resolveAdmtRegenFn("admt_v2"), RUN_ADMT_CHECKER_V2_FN);
  assertEquals(resolveAdmtRegenFn(ADMT_V2_MODULE_VALUE), "run-admt-checker-v2");
});

Deno.test("resolveAdmtRegenFn — a v1-generated legacy assessment (module='admt') resolves to run-admt-checker, unchanged", () => {
  assertEquals(resolveAdmtRegenFn("admt"), RUN_ADMT_CHECKER_V1_FN);
  assertEquals(resolveAdmtRegenFn("admt"), "run-admt-checker");
});

Deno.test("resolveAdmtRegenFn — a module-absent/legacy row (null/undefined module) still resolves to v1, unchanged", () => {
  assertEquals(resolveAdmtRegenFn(null), RUN_ADMT_CHECKER_V1_FN);
  assertEquals(resolveAdmtRegenFn(undefined), RUN_ADMT_CHECKER_V1_FN);
});

Deno.test("resolveAdmtRegenFn — an unrecognized module value fails safe to v1, never silently routes to v2", () => {
  // v2's own row read filters `.eq("module", "admt_v2")`; any row shape v2
  // doesn't recognize must NOT be handed to v2's deterministic engine, which
  // expects the v2 intake contract.
  assertEquals(resolveAdmtRegenFn("something_unexpected"), RUN_ADMT_CHECKER_V1_FN);
  assertEquals(resolveAdmtRegenFn(""), RUN_ADMT_CHECKER_V1_FN);
});

// ── Part 2 — index.ts actually wires all three call sites through it ────

const INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/regenerate-assessment/index.ts", import.meta.url),
);

Deno.test("doc admt-v2-regen — index.ts imports resolveAdmtRegenFn and no longer hardcodes cppa_admt's engine inline", () => {
  assertStringIncludes(
    INDEX_SRC,
    `import { resolveAdmtRegenFn } from "./_local/admt-regen-routing.ts";`,
  );
  assertStringIncludes(INDEX_SRC, "function resolveRegenFn(toolType: string, moduleValue: unknown): string {");
});

Deno.test("doc admt-v2-regen — internal-verification (synchronous) revision dispatch routes through resolveRegenFn, not raw FN_MAP", () => {
  const idx = INDEX_SRC.indexOf("await fetch(`${SUPABASE_URL}/functions/v1/");
  assert(idx >= 0, "internal-verification fetch call site not found");
  const line = INDEX_SRC.slice(idx, INDEX_SRC.indexOf("\n", idx));
  assertStringIncludes(line, "resolveRegenFn(tool_type, admtModuleValue)");
  assert(!line.includes("FN_MAP[tool_type]"), "must not fall back to the raw static FN_MAP lookup");
});

Deno.test("doc admt-v2-regen — async customer revision dispatch (invokeGated) routes through resolveRegenFn, not raw FN_MAP", () => {
  const idx = INDEX_SRC.indexOf("const r = await invokeGated(resolveRegenFn(tool_type, admtModuleValue), invokeBody);");
  assert(idx >= 0, "async invokeGated revision dispatch call site not found or not using resolveRegenFn");
});

Deno.test("doc admt-v2-regen — classic (edited_fields) regen dispatch routes through resolveRegenFn, not raw FN_MAP", () => {
  const idx = INDEX_SRC.indexOf("const fn = resolveRegenFn(tool_type, admtModuleValueClassic);");
  assert(idx >= 0, "classic dispatch call site not found or not using resolveRegenFn");
});

Deno.test("doc admt-v2-regen — every other tool_type is unaffected: resolveRegenFn falls through to the untouched static FN_MAP for non-cppa_admt types", () => {
  const idx = INDEX_SRC.indexOf("function resolveRegenFn");
  assert(idx >= 0);
  const body = INDEX_SRC.slice(idx, idx + 400);
  assertStringIncludes(body, 'if (toolType === "cppa_admt") return resolveAdmtRegenFn(moduleValue);');
  assertStringIncludes(body, "return FN_MAP[toolType];");
});
