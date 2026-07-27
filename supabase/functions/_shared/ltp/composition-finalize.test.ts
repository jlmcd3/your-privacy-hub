import {
  assertEquals,
  assertThrows,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  finalizeComposition,
  COMPOSITION_FINALIZE_VERSION,
} from "./composition-finalize.ts";
import { ValueScreenError } from "./value-screen.ts";
import { CompositionHookAuditError } from "./composition-hook-audit.ts";

const nullEnv = { get: (_: string) => undefined };

Deno.test("composition-finalize: version stamp", () => {
  assertEquals(COMPOSITION_FINALIZE_VERSION, "composition-finalize@2026-07-27");
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
  const rd = { assessment_summary: { narrative: "We recommend adopting safeguards." } };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assert(res.telemetry.value_screen_hits > 0);
  assert(res.telemetry.value_screen_final_hits > 0);
  assertEquals(res.telemetry.value_screen_recomposed, false);
});

Deno.test("composition-finalize: leak hit → enforce mode throws", () => {
  const rd = { assessment_summary: { narrative: "We recommend adopting safeguards." } };
  assertThrows(
    () =>
      finalizeComposition({
        reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
      }),
    ValueScreenError,
  );
});

Deno.test("composition-finalize: one bounded recompose scrubs, re-screens clean", () => {
  const rd = { assessment_summary: { narrative: "We recommend adopting safeguards." } };
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

Deno.test("composition-finalize: CUT-list top-level violation in enforce mode throws", () => {
  const rd = {
    assessment_summary: { narrative: "clean." },
    cross_tool_recommendations: [{ x: 1 }], // CUT
  };
  assertThrows(
    () =>
      finalizeComposition({
        reportData: rd, hookValue: undefined, writeAroundEntered: false, mode: "enforce", env: nullEnv,
      }),
    Error,
    "CUT-list",
  );
});

Deno.test("composition-finalize: unowned top-level in observe records but does not throw", () => {
  const rd = { assessment_summary: { narrative: "clean." }, made_up_key: { z: 1 } };
  const res = finalizeComposition({
    reportData: rd, hookValue: undefined, writeAroundEntered: false, env: nullEnv,
  });
  assert(res.telemetry.surface_unowned_paths.includes("made_up_key"));
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
