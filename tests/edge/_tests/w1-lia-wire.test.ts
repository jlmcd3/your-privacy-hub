// Tests for LIA-REGISTRY-WIRING W1 post-pass + P2 serializer stamp-echo.
// Deno.test — invoked by supabase edge-function test runner.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW1LiaWire, W1_LIA_WIRE_STAMP } from "../../../supabase/functions/run-li-assessment/_w1_lia_wire.ts";
import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_UNANCHORED_PROPOSITIONS,
  LIA_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/_shared/registry/lia-verified-authorities.ts";
import { LIA_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/lia.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";

const REGISTRY_KEYS = Object.keys(LIA_VERIFIED_AUTHORITIES);
assert(REGISTRY_KEYS.length > 0, "registry must have at least one row");
const REG_KEY = REGISTRY_KEYS[0];
const REG_ROW = LIA_VERIFIED_AUTHORITIES[REG_KEY];
const UNANCHORED_KEY = LIA_UNANCHORED_PROPOSITIONS[0];

Deno.test("W1-LIA: stamps registry citation on matching proposition_key", () => {
  const report: Record<string, unknown> = {
    three_part_test: {
      purpose: {
        proposition_key: REG_KEY,
        citation: "Model paraphrase (wrong)",
        subsection: "wrong",
        verbatim_quote: "wrong",
        governing_anchor: "wrong",
      },
    },
  };
  applyW1LiaWire(report);
  const f = (report.three_part_test as any).purpose;
  assertEquals(f.citation, REG_ROW.citation);
  assertEquals(f.subsection, REG_ROW.subsection);
  assertEquals(f.verbatim_quote, REG_ROW.verbatim_quote);
  assertEquals(f.governing_anchor, REG_ROW.governing_anchor);
  assertEquals(f.citation_verified, true);
});

Deno.test("W1-LIA: scrubs citation on unanchored proposition (write-around)", () => {
  const report: Record<string, unknown> = {
    three_part_test: {
      balancing: {
        proposition_key: UNANCHORED_KEY,
        citation: "GDPR Art. 999 (invented)",
        subsection: "(a)(1)",
        verbatim_quote: "hallucinated sentence",
        governing_anchor: "hallucinated",
      },
    },
  };
  applyW1LiaWire(report);
  const r = (report.three_part_test as any).balancing;
  assertEquals(r.citation, null);
  assertEquals(r.subsection, null);
  assertEquals(r.verbatim_quote, null);
  assertEquals(r.governing_anchor, null);
  assertEquals(r.citation_verified, false);
  assertEquals(r.write_around, true);
});

Deno.test("W1-LIA: unknown proposition_key is recorded, not mutated", () => {
  const report: Record<string, unknown> = {
    three_part_test: {
      row: { proposition_key: "not_a_real_key_xyz", citation: "keep me" },
    },
  };
  const c = applyW1LiaWire(report);
  assertEquals((report.three_part_test as any).row.citation, "keep me");
  assert(c.unresolved_keys.includes("not_a_real_key_xyz"));
});

Deno.test("W1-LIA: writes telemetry under _meta.internal.lia_w1", () => {
  const report: Record<string, unknown> = {
    three_part_test: { purpose: { proposition_key: REG_KEY } },
  };
  applyW1LiaWire(report);
  const t = (report as any)._meta?.internal?.lia_w1;
  assert(t, "telemetry present");
  assertEquals(t.stamp, W1_LIA_WIRE_STAMP);
  assertEquals(t.version, LIA_VERIFIED_AUTHORITY_VERSION);
  assertEquals(t.registry_hits, 1);
  assertEquals(t.write_around_hits, 0);
});

Deno.test("W1-LIA: preserves pre-existing _meta.internal keys", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { version: "eg-w1-2026-07-25" } } },
    x: {},
  };
  applyW1LiaWire(report);
  const internal: any = (report as any)._meta.internal;
  assertEquals(internal.emit_gate.version, "eg-w1-2026-07-25");
  assert(internal.lia_w1, "wire telemetry present");
});

Deno.test("W1-LIA: skips subtrees under RESERVED containers (_meta, annotations)", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { findings: [{ proposition_key: REG_KEY, citation: "leave me" }] } } },
    annotations: [{ proposition_key: REG_KEY, citation: "leave me too" }],
  };
  applyW1LiaWire(report);
  const g = (report as any)._meta.internal.emit_gate.findings[0];
  assertEquals(g.citation, "leave me");
  assertEquals((report as any).annotations[0].citation, "leave me too");
});

Deno.test("W1-LIA: idempotent — second pass adds no new registry_hits net-of-existing", () => {
  const report: Record<string, unknown> = {
    three_part_test: { purpose: { proposition_key: REG_KEY } },
  };
  const a = applyW1LiaWire(report);
  const before = JSON.stringify((report as any).three_part_test.purpose);
  const b = applyW1LiaWire(report);
  const after = JSON.stringify((report as any).three_part_test.purpose);
  assertEquals(a.registry_hits, 1);
  assertEquals(b.registry_hits, 1);
  assertEquals(before, after);
});

Deno.test("W1-LIA: never throws on non-object input", () => {
  const c1 = applyW1LiaWire(null);
  const c2 = applyW1LiaWire(undefined);
  const c3 = applyW1LiaWire("string");
  assertEquals(c1.registry_hits, 0);
  assertEquals(c2.registry_hits, 0);
  assertEquals(c3.registry_hits, 0);
});

Deno.test("W1-LIA: walks nested arrays", () => {
  const report: Record<string, unknown> = {
    three_part_test: {
      findings: [
        { proposition_key: REG_KEY, citation: "old" },
        { proposition_key: UNANCHORED_KEY, citation: "old" },
      ],
    },
  };
  const c = applyW1LiaWire(report);
  assertEquals(c.registry_hits, 1);
  assertEquals(c.write_around_hits, 1);
});

// ── LEAK-PREV-P2 serializer coverage (stamp-echo survival) ──────────────

Deno.test("P2-LIA: schema preserves _meta.internal.lia_w1 stamp", () => {
  const reportData: Record<string, unknown> = {
    assessment_id: "test-1",
    generated_at: "2026-07-25T13:00:00Z",
    three_part_test: { purpose: { proposition_key: REG_KEY } },
    build_stamp: "lia-registry-wiring@2026-07-25T13:06:13Z",
    _meta: { prompt_version: "li-assessment/r1b2.1-rcb" },
    unknown_top_level_key: "should be dropped",
  };
  applyW1LiaWire(reportData);
  const { report } = serializeCustomerReport(reportData, LIA_REPORT_SCHEMA);
  const out = report as any;
  // Whitelisted top-level survives
  assertEquals(out.assessment_id, "test-1");
  assertEquals(out.build_stamp, "lia-registry-wiring@2026-07-25T13:06:13Z");
  // Unknown key dropped
  assertEquals(out.unknown_top_level_key, undefined);
  // _meta reduced to internal only (prompt_version was under _meta)
  assertEquals(out._meta.prompt_version, undefined);
  // STAMP-ECHO: wire telemetry stamp survives P2 serialization
  assertEquals(out._meta.internal.lia_w1.stamp, W1_LIA_WIRE_STAMP);
  assertEquals(out._meta.internal.lia_w1.version, LIA_VERIFIED_AUTHORITY_VERSION);
  // Serializer telemetry attached
  assert(out._meta.internal.serializer);
});

Deno.test("P1-LIA: emit-gate accepts li_assessment tool tag and emits telemetry", () => {
  const reportData: Record<string, unknown> = {
    assessment_id: "test-2",
    three_part_test: {
      purpose: { prose: "The legitimate interest asserted is direct marketing to existing customers." },
    },
  };
  runEmitGate(reportData as any, { tool: "li_assessment" as any, intakeRoster: {} });
  const eg = (reportData as any)._meta?.internal?.emit_gate;
  assert(eg, "emit_gate telemetry present");
  assertEquals(eg.tool, "li_assessment");
});
