import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  assertCompositionHookConformance,
  classifyPass1WriteAroundOrigin,
  CompositionHookAuditError,
  COMPOSITION_HOOK_AUDIT_VERSION,
} from "./composition-hook-audit.ts";

Deno.test("composition-hook-audit: version stamp (Item 230)", () => {
  assertEquals(COMPOSITION_HOOK_AUDIT_VERSION, "composition-hook-audit@2026-07-28-item230");
});

Deno.test("composition-hook-audit: hook unset + branch entered + pass1_abort_timeout origin = OK (Item 230)", () => {
  assertCompositionHookConformance({
    hookValue: undefined, writeAroundEntered: true, writeAroundOrigin: "pass1_abort_timeout",
  });
});

Deno.test("composition-hook-audit: hook set + branch entered = OK", () => {
  assertCompositionHookConformance({ hookValue: "1", writeAroundEntered: true });
});

Deno.test("composition-hook-audit: hook unset + branch not entered = OK", () => {
  assertCompositionHookConformance({ hookValue: undefined, writeAroundEntered: false });
  assertCompositionHookConformance({ hookValue: "", writeAroundEntered: false });
  assertCompositionHookConformance({ hookValue: null, writeAroundEntered: false });
});

Deno.test("composition-hook-audit: hook set + branch NOT entered = THROW (A.ii bug)", () => {
  assertThrows(
    () => assertCompositionHookConformance({ hookValue: "1", writeAroundEntered: false }),
    CompositionHookAuditError,
    "silent bypass",
  );
});

Deno.test("composition-hook-audit: hook unset + branch entered + NO origin = THROW (unauthorized)", () => {
  assertThrows(
    () => assertCompositionHookConformance({ hookValue: undefined, writeAroundEntered: true }),
    CompositionHookAuditError,
    "unauthorized degradation",
  );
});

Deno.test("composition-hook-audit: hook unset + branch entered + unknown origin = THROW (Item 217)", () => {
  assertThrows(
    () => assertCompositionHookConformance({
      hookValue: undefined, writeAroundEntered: true, writeAroundOrigin: "unknown",
    }),
    CompositionHookAuditError,
    "unauthorized degradation",
  );
});

Deno.test("composition-hook-audit: hook unset + branch entered + clock_cap origin = OK (Item 217)", () => {
  assertCompositionHookConformance({
    hookValue: undefined, writeAroundEntered: true, writeAroundOrigin: "clock_cap",
  });
});

Deno.test("composition-hook-audit: hook unset + branch entered + timeout origin = OK (Item 217)", () => {
  assertCompositionHookConformance({
    hookValue: undefined, writeAroundEntered: true, writeAroundOrigin: "timeout",
  });
});

Deno.test("composition-hook-audit: hook unset + branch entered + test_forced origin = OK (Item 217)", () => {
  assertCompositionHookConformance({
    hookValue: undefined, writeAroundEntered: true, writeAroundOrigin: "test_forced",
  });
});
