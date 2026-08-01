// Tests for IR-PLAYBOOK-REGISTRY-WIRING W1 post-pass + P2 serializer stamp-echo.
// Mirrors _tests/w1-dpa-wire.test.ts (ledger item 65) / w1-governance-wire.test.ts (item 62).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW1IrWire,
  W1_IR_WIRE_STAMP,
} from "../generate-ir-playbook/_w1_ir_wire.ts";
import {
  IR_PLAYBOOK_VERIFIED_AUTHORITIES,
  IR_PLAYBOOK_UNANCHORED_PROPOSITIONS,
  IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/ir-playbook-verified-authorities.ts";
import { IR_PLAYBOOK_REPORT_SCHEMA } from "../_shared/report-schemas/ir-playbook.ts";
import { serializeCustomerReport } from "../_shared/report-serialize.ts";
import { runEmitGate } from "../_shared/emit-gate.ts";

const REGISTRY_KEYS = Object.keys(IR_PLAYBOOK_VERIFIED_AUTHORITIES);
assert(REGISTRY_KEYS.length > 0, "registry must have at least one row");
const REG_KEY = REGISTRY_KEYS[0];
const REG_ROW = IR_PLAYBOOK_VERIFIED_AUTHORITIES[REG_KEY];
const UNANCHORED_KEY = IR_PLAYBOOK_UNANCHORED_PROPOSITIONS[0];

Deno.test("W1-IR: stamps registry citation on matching proposition_key", () => {
  const report: Record<string, unknown> = {
    playbook_findings: [
      {
        proposition_key: REG_KEY,
        citation: "Model paraphrase (wrong)",
        subsection: "wrong",
        verbatim_quote: "wrong",
        governing_anchor: "wrong",
      },
    ],
  };
  applyW1IrWire(report);
  const f: any = (report.playbook_findings as any[])[0];
  assertEquals(f.citation, REG_ROW.citation);
  assertEquals(f.subsection, REG_ROW.subsection);
  assertEquals(f.verbatim_quote, REG_ROW.verbatim_quote);
  assertEquals(f.governing_anchor, REG_ROW.governing_anchor);
  assertEquals(f.citation_verified, true);
});

Deno.test("W1-IR: scrubs citation on unanchored proposition (write-around)", () => {
  const report: Record<string, unknown> = {
    playbook_findings: [
      {
        proposition_key: UNANCHORED_KEY,
        citation: "GDPR Art. 999 (invented)",
        subsection: "(a)(1)",
        verbatim_quote: "hallucinated sentence",
        governing_anchor: "hallucinated",
      },
    ],
  };
  applyW1IrWire(report);
  const r: any = (report.playbook_findings as any[])[0];
  assertEquals(r.citation, null);
  assertEquals(r.subsection, null);
  assertEquals(r.verbatim_quote, null);
  assertEquals(r.governing_anchor, null);
  assertEquals(r.citation_verified, false);
  assertEquals(r.write_around, true);
});

Deno.test("W1-IR: unknown proposition_key is recorded, not mutated", () => {
  const report: Record<string, unknown> = {
    playbook_findings: [{ proposition_key: "not_a_real_key_xyz", citation: "keep me" }],
  };
  const c = applyW1IrWire(report);
  assertEquals((report.playbook_findings as any[])[0].citation, "keep me");
  assert(c.unknown_keys.includes("not_a_real_key_xyz"));
});

Deno.test("W1-IR: writes telemetry under _meta.internal.ir_w1", () => {
  const report: Record<string, unknown> = {
    playbook_findings: [{ proposition_key: REG_KEY }],
  };
  applyW1IrWire(report);
  const t: any = (report as any)._meta?.internal?.ir_w1;
  assert(t, "telemetry present");
  assertEquals(t.stamp, W1_IR_WIRE_STAMP);
  assertEquals(t.version, IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION);
  assertEquals(t.anchored_stamped, 1);
  assertEquals(t.unanchored_scrubbed, 0);
  assertEquals(t.propositions_seen, 1);
  assert(typeof t.strings_scanned === "number");
  assert(typeof t.reserved_skips === "number");
  assert(Array.isArray(t.unknown_keys));
});

Deno.test("W1-IR: preserves pre-existing _meta.internal keys", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { version: "eg-w1-2026-07-25" } } },
    x: {},
  };
  applyW1IrWire(report);
  const internal: any = (report as any)._meta.internal;
  assertEquals(internal.emit_gate.version, "eg-w1-2026-07-25");
  assert(internal.ir_w1, "wire telemetry present");
});

Deno.test("W1-IR: skips subtrees under RESERVED containers", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { findings: [{ proposition_key: REG_KEY, citation: "leave me" }] } } },
    annotations: [{ proposition_key: REG_KEY, citation: "leave me too" }],
    enforcement_precedents: [{ proposition_key: REG_KEY, citation: "and me" }],
  };
  applyW1IrWire(report);
  assertEquals((report as any)._meta.internal.emit_gate.findings[0].citation, "leave me");
  assertEquals((report as any).annotations[0].citation, "leave me too");
  assertEquals((report as any).enforcement_precedents[0].citation, "and me");
});

Deno.test("W1-IR: idempotent — second pass yields identical output", () => {
  const report: Record<string, unknown> = {
    playbook_findings: [{ proposition_key: REG_KEY }],
  };
  const a = applyW1IrWire(report);
  const before = JSON.stringify((report as any).playbook_findings);
  const b = applyW1IrWire(report);
  const after = JSON.stringify((report as any).playbook_findings);
  assertEquals(a.anchored_stamped, 1);
  assertEquals(b.anchored_stamped, 1);
  assertEquals(before, after);
});

Deno.test("W1-IR: never throws on non-object input", () => {
  const c1 = applyW1IrWire(null);
  const c2 = applyW1IrWire(undefined);
  const c3 = applyW1IrWire("string");
  assertEquals(c1.anchored_stamped, 0);
  assertEquals(c2.anchored_stamped, 0);
  assertEquals(c3.anchored_stamped, 0);
});

Deno.test("W1-IR: walks nested arrays", () => {
  const report: Record<string, unknown> = {
    sections: [
      { rows: [{ proposition_key: REG_KEY, citation: "old" }] },
      { rows: [{ proposition_key: UNANCHORED_KEY, citation: "old" }] },
    ],
  };
  const c = applyW1IrWire(report);
  assertEquals(c.anchored_stamped, 1);
  assertEquals(c.unanchored_scrubbed, 1);
});

// ── LEAK-PREV-P2 serializer coverage (stamp-echo survival) ──────────────

Deno.test("P2-IR: schema preserves _meta.internal.ir_w1 stamp", () => {
  const reportData: Record<string, unknown> = {
    portals: {},
    enforcement_precedents: [],
    generated_at: "2026-07-25T14:50:00Z",
    build_stamp: "ir-playbook-registry-wiring@2026-07-25T14:50:00Z",
    _meta: { prompt_version: "ir-playbook/v3.9.1-cv1-ff-2026-07-19" },
    unknown_top_level_key: "should be dropped",
  };
  applyW1IrWire(reportData);
  const { report } = serializeCustomerReport(reportData, IR_PLAYBOOK_REPORT_SCHEMA);
  const out = report as any;
  assertEquals(out.build_stamp, "ir-playbook-registry-wiring@2026-07-25T14:50:00Z");
  assertEquals(out.unknown_top_level_key, undefined);
  assertEquals(out._meta.prompt_version, undefined);
  assertEquals(out._meta.internal.ir_w1.stamp, W1_IR_WIRE_STAMP);
  assertEquals(out._meta.internal.ir_w1.version, IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION);
  assert(out._meta.internal.serializer);
});

Deno.test("P1-IR: emit-gate accepts ir_playbook tool tag", () => {
  const reportData: Record<string, unknown> = {
    portals: {},
    annotations: [{ text: "The controller shall notify the supervisory authority." }],
  };
  runEmitGate(reportData as any, { tool: "ir_playbook", intakeRoster: {} });
  const eg: any = (reportData as any)._meta?.internal?.emit_gate;
  assert(eg, "emit_gate telemetry present");
  assertEquals(eg.tool, "ir_playbook");
});
