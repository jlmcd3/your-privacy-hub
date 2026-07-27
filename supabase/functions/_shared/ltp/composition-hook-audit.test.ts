import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  assertCompositionHookConformance,
  CompositionHookAuditError,
  COMPOSITION_HOOK_AUDIT_VERSION,
} from "./composition-hook-audit.ts";

Deno.test("composition-hook-audit: version stamp", () => {
  assertEquals(COMPOSITION_HOOK_AUDIT_VERSION, "composition-hook-audit@2026-07-27");
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

Deno.test("composition-hook-audit: hook unset + branch entered = THROW (unauthorized degradation)", () => {
  assertThrows(
    () => assertCompositionHookConformance({ hookValue: undefined, writeAroundEntered: true }),
    CompositionHookAuditError,
    "unauthorized degradation",
  );
});
