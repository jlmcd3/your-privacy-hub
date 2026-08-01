// Tests for DPA-REGISTRY-WIRING W1 post-pass + P2 serializer stamp-echo.
// Mirrors _tests/w1-governance-wire.test.ts (ledger item 62).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW1DpaWire,
  W1_DPA_WIRE_STAMP,
} from "../../../supabase/functions/generate-dpa/_w1_dpa_wire.ts";
import {
  DPA_VERIFIED_AUTHORITIES,
  DPA_UNANCHORED_PROPOSITIONS,
  DPA_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/_shared/registry/dpa-verified-authorities.ts";
import { DPA_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/dpa.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";

const REGISTRY_KEYS = Object.keys(DPA_VERIFIED_AUTHORITIES);
assert(REGISTRY_KEYS.length > 0, "registry must have at least one row");
const REG_KEY = REGISTRY_KEYS[0];
const REG_ROW = DPA_VERIFIED_AUTHORITIES[REG_KEY];
const UNANCHORED_KEY = DPA_UNANCHORED_PROPOSITIONS[0];

Deno.test("W1-DPA: stamps registry citation on matching proposition_key", () => {
  const report: Record<string, unknown> = {
    annotations_data: [
      {
        proposition_key: REG_KEY,
        citation: "Model paraphrase (wrong)",
        subsection: "wrong",
        verbatim_quote: "wrong",
        governing_anchor: "wrong",
      },
    ],
  };
  applyW1DpaWire(report);
  const f: any = (report.annotations_data as any[])[0];
  assertEquals(f.citation, REG_ROW.citation);
  assertEquals(f.subsection, REG_ROW.subsection);
  assertEquals(f.verbatim_quote, REG_ROW.verbatim_quote);
  assertEquals(f.governing_anchor, REG_ROW.governing_anchor);
  assertEquals(f.citation_verified, true);
});

Deno.test("W1-DPA: scrubs citation on unanchored proposition (write-around)", () => {
  const report: Record<string, unknown> = {
    annotations_data: [
      {
        proposition_key: UNANCHORED_KEY,
        citation: "GDPR Art. 999 (invented)",
        subsection: "(a)(1)",
        verbatim_quote: "hallucinated sentence",
        governing_anchor: "hallucinated",
      },
    ],
  };
  applyW1DpaWire(report);
  const r: any = (report.annotations_data as any[])[0];
  assertEquals(r.citation, null);
  assertEquals(r.subsection, null);
  assertEquals(r.verbatim_quote, null);
  assertEquals(r.governing_anchor, null);
  assertEquals(r.citation_verified, false);
  assertEquals(r.write_around, true);
});

Deno.test("W1-DPA: unknown proposition_key is recorded, not mutated", () => {
  const report: Record<string, unknown> = {
    annotations_data: [{ proposition_key: "not_a_real_key_xyz", citation: "keep me" }],
  };
  const c = applyW1DpaWire(report);
  assertEquals((report.annotations_data as any[])[0].citation, "keep me");
  assert(c.unresolved_keys.includes("not_a_real_key_xyz"));
});

Deno.test("W1-DPA: writes telemetry under _meta.internal.dpa_w1", () => {
  const report: Record<string, unknown> = {
    annotations_data: [{ proposition_key: REG_KEY }],
  };
  applyW1DpaWire(report);
  const t: any = (report as any)._meta?.internal?.dpa_w1;
  assert(t, "telemetry present");
  assertEquals(t.stamp, W1_DPA_WIRE_STAMP);
  assertEquals(t.version, DPA_VERIFIED_AUTHORITY_VERSION);
  assertEquals(t.resolved, 1);
  assertEquals(t.unanchored_scrubbed, 0);
});

Deno.test("W1-DPA: preserves pre-existing _meta.internal keys", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { version: "eg-w1-2026-07-25" } } },
    x: {},
  };
  applyW1DpaWire(report);
  const internal: any = (report as any)._meta.internal;
  assertEquals(internal.emit_gate.version, "eg-w1-2026-07-25");
  assert(internal.dpa_w1, "wire telemetry present");
});

Deno.test("W1-DPA: skips subtrees under RESERVED containers", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { findings: [{ proposition_key: REG_KEY, citation: "leave me" }] } } },
    annotations: [{ proposition_key: REG_KEY, citation: "leave me too" }],
    enforcement_precedents: [{ proposition_key: REG_KEY, citation: "and me" }],
  };
  applyW1DpaWire(report);
  assertEquals((report as any)._meta.internal.emit_gate.findings[0].citation, "leave me");
  assertEquals((report as any).annotations[0].citation, "leave me too");
  assertEquals((report as any).enforcement_precedents[0].citation, "and me");
});

Deno.test("W1-DPA: idempotent — second pass yields identical output", () => {
  const report: Record<string, unknown> = {
    annotations_data: [{ proposition_key: REG_KEY }],
  };
  const a = applyW1DpaWire(report);
  const before = JSON.stringify((report as any).annotations_data);
  const b = applyW1DpaWire(report);
  const after = JSON.stringify((report as any).annotations_data);
  assertEquals(a.resolved, 1);
  assertEquals(b.resolved, 1);
  assertEquals(before, after);
});

Deno.test("W1-DPA: never throws on non-object input", () => {
  const c1 = applyW1DpaWire(null);
  const c2 = applyW1DpaWire(undefined);
  const c3 = applyW1DpaWire("string");
  assertEquals(c1.resolved, 0);
  assertEquals(c2.resolved, 0);
  assertEquals(c3.resolved, 0);
});

Deno.test("W1-DPA: walks nested arrays", () => {
  const report: Record<string, unknown> = {
    sections: [
      { rows: [{ proposition_key: REG_KEY, citation: "old" }] },
      { rows: [{ proposition_key: UNANCHORED_KEY, citation: "old" }] },
    ],
  };
  const c = applyW1DpaWire(report);
  assertEquals(c.resolved, 1);
  assertEquals(c.unanchored_scrubbed, 1);
});

// ── LEAK-PREV-P2 serializer coverage (stamp-echo survival) ──────────────

Deno.test("P2-DPA: schema preserves _meta.internal.dpa_w1 stamp", () => {
  const reportData: Record<string, unknown> = {
    document_text: "DPA body",
    generated_at: "2026-07-25T14:18:00Z",
    build_stamp: "dpa-registry-wiring@2026-07-25T14:18:00Z",
    _meta: { prompt_version: "dpa/r1b2.3-cv1-ff-2026-07-19" },
    unknown_top_level_key: "should be dropped",
  };
  applyW1DpaWire(reportData);
  const { report } = serializeCustomerReport(reportData, DPA_REPORT_SCHEMA);
  const out = report as any;
  assertEquals(out.document_text, "DPA body");
  assertEquals(out.build_stamp, "dpa-registry-wiring@2026-07-25T14:18:00Z");
  assertEquals(out.unknown_top_level_key, undefined);
  assertEquals(out._meta.prompt_version, undefined);
  assertEquals(out._meta.internal.dpa_w1.stamp, W1_DPA_WIRE_STAMP);
  assertEquals(out._meta.internal.dpa_w1.version, DPA_VERIFIED_AUTHORITY_VERSION);
  assert(out._meta.internal.serializer);
});

Deno.test("P1-DPA: emit-gate accepts dpa tool tag", () => {
  const reportData: Record<string, unknown> = {
    document_text: "DPA body",
    annotations: [{ text: "The processor shall implement appropriate measures." }],
  };
  runEmitGate(reportData as any, { tool: "dpa", intakeRoster: {} });
  const eg: any = (reportData as any)._meta?.internal?.emit_gate;
  assert(eg, "emit_gate telemetry present");
  assertEquals(eg.tool, "dpa");
});
