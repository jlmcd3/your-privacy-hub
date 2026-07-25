// LEAK-PREV-P1 — emit-gate tests.
//
// Covers: internal-vocab degradation, template-stub degradation, well-formed
// prose untouched, >30% safety valve, gate crash → report unchanged +
// crashed=true, telemetry lands under _meta.internal only, and the
// regression that `attachDeterministicChecks` no longer writes a top-level
// `deterministic_checks` key.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runEmitGate, EMIT_GATE_VERSION } from "./emit-gate.ts";
import { attachDeterministicChecks } from "./advisory-voice.ts";

const wellFormed =
  "The record identifies the certifying executive as the reported contact; the intake supports this position and no additional confirmation is required at this stage.";
const wellFormed2 =
  "Retention practice is documented in the intake as a 24-month ceiling with quarterly review, which the assessment carries forward without modification for the current draft.";

Deno.test("emit-gate: internal-vocab prose is degraded to catalog text", () => {
  const report: any = {
    top_3_actions: [
      { text: "Reconcile the record on i1b_min_pi against the intake, since the current position cannot be supported without further evidence collected." },
      { text: wellFormed },
    ],
  };
  runEmitGate(report, { tool: "cppa_admt", intakeRoster: {} });
  assertEquals(report.top_3_actions[0].text.includes("i1b_min_pi"), false, "raw key must be degraded");
  assert(report.top_3_actions[0].information_needed === true, "structured flag added");
  assertEquals(report.top_3_actions[1].text, wellFormed, "well-formed prose untouched");
  assertEquals(report._meta.internal.emit_gate.version, EMIT_GATE_VERSION);
  assert(report._meta.internal.emit_gate.degraded_count >= 1);
});

Deno.test("emit-gate: template-stub prose is degraded", () => {
  const report: any = {
    reason: "Insufficient information to score this system; please supply the missing intake dimensions and re-run the assessment for a complete result.",
  };
  runEmitGate(report, { tool: "cppa_risk_assessment" });
  assertEquals(report.reason.includes("re-run"), false);
  assert(report.information_needed === true);
});

Deno.test("emit-gate: well-formed prose passes through untouched", () => {
  const report: any = {
    executive_summary: wellFormed,
    scope_notes: wellFormed2,
  };
  const before = JSON.stringify({ a: report.executive_summary, b: report.scope_notes });
  runEmitGate(report, { tool: "cppa_cybersecurity" });
  const after = JSON.stringify({ a: report.executive_summary, b: report.scope_notes });
  assertEquals(before, after);
  assertEquals(report._meta.internal.emit_gate.degraded_count, 0);
  assertEquals(report._meta.internal.emit_gate.findings.length, 0);
});

Deno.test("emit-gate: >30% safety valve triggers skip + reason", () => {
  const bad = "Reconcile on i1b_min_pi and i5_admt_logic; supply the missing intake dimensions and re-run.";
  const report: any = {
    a: bad, b: bad, c: bad, d: bad, e: wellFormed,
  };
  runEmitGate(report, { tool: "cppa_admt" });
  const gr = report._meta.internal.emit_gate;
  assertExists(gr.enforcement_skipped_reason);
  assert(gr.enforcement_skipped_reason.startsWith("safety_valve"));
  assertEquals(gr.degraded_count, 0, "no mutation under valve");
  // Prose untouched under safety valve.
  assertEquals(report.a, bad);
});

Deno.test("emit-gate: crash → report unchanged + crashed=true", () => {
  const report: any = { note: wellFormed };
  const before = report.note;
  // Force a throw inside the walker via a self-referential JSON that our
  // walker doesn't hit directly, so trigger through the roster path.
  // Simplest: monkey-patch Object.entries via a getter that throws.
  const trap: any = {};
  Object.defineProperty(trap, "boom", {
    enumerable: true,
    get() { throw new Error("synthetic-walker-fault"); },
  });
  report.trap = trap;
  runEmitGate(report, { tool: "cppa_admt" });
  assertEquals(report.note, before);
  assert(report._meta.internal.emit_gate.crashed === true);
});

Deno.test("emit-gate: telemetry lives only under _meta.internal", () => {
  const report: any = { note: wellFormed };
  runEmitGate(report, { tool: "cppa_admt" });
  assertEquals((report as any).emit_gate, undefined);
  assertEquals((report._meta as any).emit_gate, undefined);
  assertExists(report._meta.internal.emit_gate);
});

Deno.test("regression: attachDeterministicChecks no longer writes top-level `deterministic_checks`", () => {
  const report: any = { x: 1 };
  attachDeterministicChecks(report, [
    { check_id: "e6_counsel_referral", check_type: "deterministic", dimension: "hallucination", severity: "high", passed: true, evidence: null },
  ]);
  assertEquals((report as any).deterministic_checks, undefined, "top-level key must not appear");
  assertExists(report._meta.internal.deterministic_checks);
  assertEquals(report._meta.internal.deterministic_checks.length, 1);
});
