import {
  assertEquals,
  assertThrows,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  finalizeComposition,
  COMPOSITION_FINALIZE_VERSION,
} from "./composition-finalize.ts";
import { CompositionHookAuditError } from "./composition-hook-audit.ts";

const nullEnv = { get: (_: string) => undefined };

Deno.test("composition-finalize: version stamp (Item 215)", () => {
  assertEquals(COMPOSITION_FINALIZE_VERSION, "composition-finalize@2026-07-28-item215");
});

Deno.test("composition-finalize: clean report, observe mode, no hits, hook clean", () => {
  const rd = {
    assessment_summary: { narrative: "The record supports the assessment." },
    submission_summary: { deadline: "December 31, 2027" },
    _meta: { build: "x" },
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assertEquals(res.telemetry.value_screen_hits, 0);
  assertEquals(res.telemetry.surface_unowned_paths, []);
  assertEquals(res.telemetry.surface_cut_violations, []);
  assertEquals(res.telemetry.hook_audit_ok, true);
  assertEquals(res.telemetry.mode, "observe");
});

Deno.test("composition-finalize: leak hit → observe mode records, does not throw", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards are recommended." } };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assert(res.telemetry.value_screen_hits > 0);
  assert(res.telemetry.value_screen_final_hits > 0);
  assertEquals(res.telemetry.value_screen_recomposed, false);
});

Deno.test("composition-finalize: leak hit in enforce records telemetry, does NOT throw (Item 215)", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards are recommended." } };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assert(res.telemetry.value_screen_final_hits > 0);
  assert(res.telemetry.pre_serializer_value_screen_pending.length > 0);
  assertEquals(res.telemetry.pre_serializer_value_screen_pending[0].kind, "leak-lexicon");
});

Deno.test("composition-finalize: one bounded recompose scrubs, re-screens clean", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards are recommended." } };
  const res = finalizeComposition({
    reportData: rd,
    hookValue: undefined,
    writeAroundEntered: false,
    mode: "enforce",
    env: nullEnv,
    recompose: () => ({ assessment_summary: { narrative: "The record supports the assessment." } }),
  });
  assertEquals(res.telemetry.value_screen_recomposed, true);
  assertEquals(res.telemetry.value_screen_final_hits, 0);
});

Deno.test("composition-finalize: fragment-omit removes whole-value truncation slot (Item 206)", () => {
  const rd = {
    submission_summary: { deadline_basis: "We", real_field: "keep me" },
    priority_actions: [{ action: "The", severity: "High" }],
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.fragment_omit_count, 2);
  assert(res.telemetry.fragment_omit_paths.includes("submission_summary.deadline_basis"));
  // Value-screen sees a clean input after omit — no throw.
  assertEquals(res.telemetry.value_screen_final_hits, 0);
  const out = res.reportData as any;
  assertEquals(out.submission_summary.deadline_basis, undefined);
  assertEquals(out.submission_summary.real_field, "keep me");
  assertEquals(out.priority_actions[0].action, undefined);
});

Deno.test("safeFinalize: value-screen hits surfaced on inner telemetry with path/kind (Item 215)", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards recommended." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.errored, false);
  const pending = res.telemetry.inner?.pre_serializer_value_screen_pending ?? [];
  assert(pending.length > 0);
  assertEquals(pending[0].kind, "leak-lexicon");
  assertEquals(typeof pending[0].path, "string");
});

Deno.test("composition-finalize: CUT-ruled path present pre-serializer records telemetry, does NOT throw (Item 211)", () => {
  const rd = {
    assessment_summary: { narrative: "clean." },
    cross_tool_recommendations: [{ x: 1 }], // CUT REMOVE — serializer strips it
    scope_and_triggers: { scope_notes: "leak", other: "ok" }, // CUT OBJECT_PRUNE — serializer strips scope_notes
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.surface_cut_violations, []);
  assert(res.telemetry.pre_serializer_cut_pending.includes("cross_tool_recommendations"));
  assert(res.telemetry.pre_serializer_cut_pending.includes("scope_and_triggers.scope_notes"));
});

Deno.test("composition-finalize: unowned top-level in enforce records telemetry, does NOT throw (Item 213)", () => {
  const rd = {
    assessment_summary: { narrative: "clean." },
    made_up_key: { z: 1 },
    generated_at: "2026-07-27T00:00:00Z",
    retrieval_meta: { source: "x" },
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.surface_unowned_paths, []);
  assert(res.telemetry.pre_serializer_unowned_pending.includes("made_up_key"));
  assert(res.telemetry.pre_serializer_unowned_pending.includes("generated_at"));
  assert(res.telemetry.pre_serializer_unowned_pending.includes("retrieval_meta"));
});


Deno.test("composition-finalize: unowned top-level in observe records but does not throw", () => {
  const rd = { assessment_summary: { narrative: "clean." }, made_up_key: { z: 1 } };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assert(res.telemetry.pre_serializer_unowned_pending.includes("made_up_key"));
  assertEquals(res.telemetry.surface_unowned_paths, []);
});


Deno.test("composition-finalize: hook-audit ALWAYS fires (silent-bypass throws even in observe)", () => {
  const rd = { assessment_summary: { narrative: "clean." } };
  assertThrows(
    () =>
      finalizeComposition({
        reportData: rd, hookValue: "1", writeAroundEntered: false, env: nullEnv,
      }),
    CompositionHookAuditError,
    "silent bypass",
  );
});

Deno.test("composition-finalize: hook set + branch entered = OK", () => {
  const rd = { assessment_summary: { narrative: "clean." } };
  const res = finalizeComposition({
    reportData: rd, hookValue: "1", writeAroundEntered: true, env: nullEnv,
  });
  assertEquals(res.telemetry.hook_value_present, true);
  assertEquals(res.telemetry.write_around_entered, true);
});

import { safeFinalizeComposition, SAFE_FINALIZE_VERSION } from "./composition-finalize.ts";

Deno.test("safeFinalizeComposition: version stamp (Item 215)", () => {
  assertEquals(SAFE_FINALIZE_VERSION, "safe-finalize@2026-07-28-item215-vs-site");
});

Deno.test("safeFinalizeComposition: clean report — mirrors inner telemetry, errored=false", () => {
  const rd = { assessment_summary: { narrative: "The record supports the assessment." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assertEquals(res.telemetry.errored, false);
  assertEquals(res.telemetry.enforce_violation, false);
  assertEquals(res.telemetry.safe_version, SAFE_FINALIZE_VERSION);
  assert(res.telemetry.elapsed_ms >= 0);
  assert(res.telemetry.inner !== undefined);
});

Deno.test("safeFinalizeComposition: enforce-mode value-screen hit is TELEMETRY-ONLY (Item 215)", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards recommended." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.errored, false);
  assertEquals(res.telemetry.enforce_violation, false);
  assert((res.telemetry.inner?.pre_serializer_value_screen_pending.length ?? 0) > 0);
});

Deno.test("safeFinalizeComposition: hook-audit throw is CAUGHT (persist not blocked)", () => {
  const rd = { assessment_summary: { narrative: "clean." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: "1", writeAroundEntered: false, env: nullEnv,
  });
  assertEquals(res.telemetry.errored, true);
  assertEquals(res.telemetry.error_kind, "CompositionHookAuditError");
  // Hook audit is a config-surface signal, not a measurement enforce violation.
  assertEquals(res.telemetry.enforce_violation, false);
  assertEquals(res.reportData, rd);
});

Deno.test("safeFinalizeComposition: throwing recompose is CAUGHT (persist not blocked)", () => {
  const rd = { assessment_summary: { narrative: "Per Engine-B composition, safeguards recommended." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
    recompose: () => { throw new Error("recompose exploded"); },
  });
  assertEquals(res.telemetry.errored, true);
  assertEquals(res.reportData, rd);
});

Deno.test("safeFinalizeComposition: unowned top-level in enforce is telemetered, no throw (Item 213)", () => {
  const rd = { assessment_summary: { narrative: "clean." }, weird_key: { z: 1 } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.errored, false);
  assertEquals(res.telemetry.enforce_violation, false);
  assert(res.telemetry.inner?.pre_serializer_unowned_pending.includes("weird_key"));
});


Deno.test("safeFinalizeComposition: budget telemetry present and honored", () => {
  const rd = { assessment_summary: { narrative: "clean." } };
  const res = safeFinalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
    budgetMs: 1_000,
  });
  assertEquals(res.telemetry.budget_ms, 1_000);
  assert(typeof res.telemetry.elapsed_ms === "number");
  assert(typeof res.telemetry.budget_exceeded === "boolean");
});

// ── ITEM 208 — POST-SERIALIZER SHIPPED SURFACE GUARD ────────────────
import { evaluateShippedSurfaceGuard } from "./composition-finalize.ts";

Deno.test("shipped-surface-guard: smoke-#6 shipped shape (scope_notes absent, no CTR, empty flags) is clean", () => {
  const shipped = {
    scope_and_triggers: { triggered_activities_detail: [{ x: 1 }] }, // scope_notes absent
    inconsistency_flags: [],
    assessment_summary: { narrative: "clean." },
    _meta: { build: "x" },
  };
  const e = evaluateShippedSurfaceGuard(shipped);
  assertEquals(e.cut_violations, []);
  assertEquals(e.unowned_paths, []);
});

Deno.test("shipped-surface-guard: OBJECT_PRUNE — scope_notes present FAILS", () => {
  const shipped = {
    scope_and_triggers: { triggered_activities_detail: [], scope_notes: "leaked note" },
    inconsistency_flags: [],
  };
  const e = evaluateShippedSurfaceGuard(shipped);
  assert(e.cut_violations.some((v) => v.path === "scope_and_triggers.scope_notes"));
});

Deno.test("shipped-surface-guard: REMOVE — cross_tool_recommendations present post-serializer FAILS", () => {
  const shipped = { cross_tool_recommendations: { anything: 1 }, inconsistency_flags: [] };
  const e = evaluateShippedSurfaceGuard(shipped);
  assert(e.cut_violations.some((v) => v.path === "cross_tool_recommendations"));
});

Deno.test("shipped-surface-guard: EMPTY_ARRAY — non-empty inconsistency_flags FAILS", () => {
  const shipped = { inconsistency_flags: [{ id: "x" }] };
  const e = evaluateShippedSurfaceGuard(shipped);
  assert(e.cut_violations.some((v) => v.path === "inconsistency_flags"));
});

Deno.test("shipped-surface-guard: unowned top-level key FAILS on shipped projection (Item 213)", () => {
  const shipped = {
    assessment_summary: { narrative: "clean." },
    made_up_key: { z: 1 },
    inconsistency_flags: [],
  };
  const e = evaluateShippedSurfaceGuard(shipped);
  assert(e.unowned_paths.includes("made_up_key"));
});

Deno.test("finalize: scope_and_triggers bound top-level with only allowed children does NOT throw in enforce (Item 208 regression)", () => {
  const rd = {
    scope_and_triggers: { triggered_activities_detail: [{ x: 1 }] },
    inconsistency_flags: [],
    assessment_summary: { narrative: "clean." },
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.surface_cut_violations, []);
});

Deno.test("finalize: smoke-#9 exact composed shape (5 unowned + clean surface) passes with telemetry (Item 213)", () => {
  const rd = {
    assessment_summary: { narrative: "The record supports the assessment." },
    scope_and_triggers: { triggered_activities_detail: [{ x: 1 }] },
    inconsistency_flags: [],
    // The five smoke-#9 unowned keys the serializer strips:
    generated_at: "2026-07-27T23:04:00Z",
    legacy_shim_applied: true,
    normalised_intake: { q1: "y" },
    retrieval_meta: { source: "reg" },
    open_items: [],
  };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
  });
  assertEquals(res.telemetry.surface_unowned_paths, []);
  assertEquals(res.telemetry.surface_cut_violations, []);
  for (const k of ["generated_at", "legacy_shim_applied", "normalised_intake", "retrieval_meta", "open_items"]) {
    assert(res.telemetry.pre_serializer_unowned_pending.includes(k), `missing ${k}`);
  }
});


