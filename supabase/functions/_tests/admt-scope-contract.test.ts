// _tests/admt-scope-contract.test.ts
//
// POST-C1-FIX-1C: unit coverage for the ADMT scope-analysis canonical contract.
// Locks the "no dual-path read at generation time" invariant while
// preserving migration-safe reads for stored legacy reports.

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  readAdmtScope,
  normalizeAdmtScopeShape,
  assertAdmtScopeShape,
} from "../_shared/admt-scope-contract.ts";

Deno.test("readAdmtScope — nested-only report returns nested values", () => {
  const r = { scope_analysis: { is_admt: true, triggers_significant_decision: false, triggers_risk_assessment: true, human_review_qualifies: false, triggers_profiling: false, exception_qualifies: "cannot_determine" } };
  const s = readAdmtScope(r);
  assertEquals(s.is_admt, true);
  assertEquals(s.triggers_significant_decision, false);
  assertEquals(s.triggers_risk_assessment, true);
  assertEquals(s.exception_qualifies, "cannot_determine");
});

Deno.test("readAdmtScope — legacy top-level report readable when nested absent", () => {
  const r = { is_admt: true, triggers_significant_decision: false };
  const s = readAdmtScope(r);
  assertEquals(s.is_admt, true);
  assertEquals(s.triggers_significant_decision, false);
});

Deno.test("readAdmtScope — nested wins on conflict; drift is logged", () => {
  const logs: string[] = [];
  const orig = console.log;
  console.log = (m: unknown) => { logs.push(String(m)); };
  try {
    const r = { triggers_significant_decision: true, scope_analysis: { triggers_significant_decision: false } };
    const s = readAdmtScope(r, { context: "unit" });
    assertEquals(s.triggers_significant_decision, false);
  } finally { console.log = orig; }
  const drift = logs.find((l) => l.includes("admt_scope_drift_detected"));
  if (!drift) throw new Error("expected admt_scope_drift_detected log");
  if (!drift.includes("triggers_significant_decision")) throw new Error("drift log missing field name");
});

Deno.test("normalizeAdmtScopeShape — moves top-level scope fields into scope_analysis", () => {
  const r: Record<string, unknown> = {
    is_admt: true, triggers_significant_decision: false,
    scope_analysis: { human_review_qualifies: false },
  };
  const diag = normalizeAdmtScopeShape(r);
  assertEquals(diag.moved.sort(), ["is_admt", "triggers_significant_decision"].sort());
  assertEquals(diag.conflicts.length, 0);
  const sa = r.scope_analysis as Record<string, unknown>;
  assertEquals(sa.is_admt, true);
  assertEquals(sa.triggers_significant_decision, false);
  assertEquals(sa.human_review_qualifies, false);
  assertEquals(Object.prototype.hasOwnProperty.call(r, "is_admt"), false);
  assertEquals(Object.prototype.hasOwnProperty.call(r, "triggers_significant_decision"), false);
});

Deno.test("normalizeAdmtScopeShape — records conflicts; keeps nested; still deletes top", () => {
  const r: Record<string, unknown> = {
    triggers_significant_decision: true,
    scope_analysis: { triggers_significant_decision: false },
  };
  const diag = normalizeAdmtScopeShape(r);
  assertEquals(diag.conflicts, ["triggers_significant_decision"]);
  const sa = r.scope_analysis as Record<string, unknown>;
  assertEquals(sa.triggers_significant_decision, false);
  assertEquals(Object.prototype.hasOwnProperty.call(r, "triggers_significant_decision"), false);
});

Deno.test("assertAdmtScopeShape — throws when top-level scope fields present", () => {
  assertThrows(() => assertAdmtScopeShape({ is_admt: true, scope_analysis: {} }));
});

Deno.test("assertAdmtScopeShape — passes on nested-only", () => {
  assertAdmtScopeShape({ scope_analysis: { is_admt: true, triggers_significant_decision: false } });
});
