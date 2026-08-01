// Tests for DPIA-REGISTRY-WIRING W1 post-pass.
// Deno.test — invoked by supabase edge-function test runner.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW1DpiaWire, W1_DPIA_WIRE_STAMP } from "../../../supabase/functions/run-dpia-framework/_w1_dpia_wire.ts";
import {
  DPIA_VERIFIED_AUTHORITIES,
  DPIA_UNANCHORED_PROPOSITIONS,
} from "../../../supabase/functions/_shared/registry/dpia-verified-authorities.ts";

// Pick one deterministic registry key + one unanchored key that both exist.
const REGISTRY_KEYS = Object.keys(DPIA_VERIFIED_AUTHORITIES);
assert(REGISTRY_KEYS.length > 0, "registry must have at least one row");
const REG_KEY = REGISTRY_KEYS[0];
const REG_ROW = DPIA_VERIFIED_AUTHORITIES[REG_KEY];
const UNANCHORED_KEY = DPIA_UNANCHORED_PROPOSITIONS[0];

Deno.test("W1: stamps registry citation on matching proposition_key", () => {
  const report: Record<string, unknown> = {
    section_2_analysis: {
      finding: {
        proposition_key: REG_KEY,
        citation: "Model paraphrase (wrong)",
        subsection: "wrong",
        verbatim_quote: "wrong",
        governing_anchor: "wrong",
        prose: "Some model-emitted sentence.",
      },
    },
  };
  applyW1DpiaWire(report);
  const f = (report.section_2_analysis as any).finding;
  assertEquals(f.citation, REG_ROW.citation);
  assertEquals(f.subsection, REG_ROW.subsection);
  assertEquals(f.verbatim_quote, REG_ROW.verbatim_quote);
  assertEquals(f.governing_anchor, REG_ROW.governing_anchor);
  assertEquals(f.citation_verified, true);
});

Deno.test("W1: scrubs citation on unanchored proposition (write-around)", () => {
  const report: Record<string, unknown> = {
    section_4_risk_management: {
      risk: {
        proposition_key: UNANCHORED_KEY,
        citation: "GDPR Art. 999 (invented)",
        subsection: "(a)(1)",
        verbatim_quote: "hallucinated sentence",
        governing_anchor: "hallucinated",
      },
    },
  };
  applyW1DpiaWire(report);
  const r = (report.section_4_risk_management as any).risk;
  assertEquals(r.citation, null);
  assertEquals(r.subsection, null);
  assertEquals(r.verbatim_quote, null);
  assertEquals(r.governing_anchor, null);
  assertEquals(r.citation_verified, false);
  assertEquals(r.write_around, true);
});

Deno.test("W1: unknown proposition_key is recorded, not mutated", () => {
  const report: Record<string, unknown> = {
    section_1_description: {
      row: { proposition_key: "not_a_real_key_xyz", citation: "keep me" },
    },
  };
  const c = applyW1DpiaWire(report);
  assertEquals((report.section_1_description as any).row.citation, "keep me");
  assert(c.unresolved_keys.includes("not_a_real_key_xyz"));
});

Deno.test("W1: writes telemetry under _meta.internal.dpia_w1_wire", () => {
  const report: Record<string, unknown> = {
    section_2_analysis: { finding: { proposition_key: REG_KEY } },
  };
  applyW1DpiaWire(report);
  const t = (report as any)._meta?.internal?.dpia_w1_wire;
  assert(t, "telemetry present");
  assertEquals(t.stamp, W1_DPIA_WIRE_STAMP);
  assertEquals(t.registry_hits, 1);
  assertEquals(t.write_around_hits, 0);
});

Deno.test("W1: preserves pre-existing _meta.internal keys", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { version: "eg-w1-2026-07-25" } } },
    x: {},
  };
  applyW1DpiaWire(report);
  const internal: any = (report as any)._meta.internal;
  assertEquals(internal.emit_gate.version, "eg-w1-2026-07-25");
  assert(internal.dpia_w1_wire, "wire telemetry present");
});

Deno.test("W1: skips subtrees under RESERVED containers (_meta, annotations, etc.)", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { findings: [{ proposition_key: REG_KEY, citation: "leave me" }] } } },
    annotations: [{ proposition_key: REG_KEY, citation: "leave me too" }],
  };
  applyW1DpiaWire(report);
  const g = (report as any)._meta.internal.emit_gate.findings[0];
  assertEquals(g.citation, "leave me");
  assertEquals((report as any).annotations[0].citation, "leave me too");
});

Deno.test("W1: idempotent — second pass adds no new registry_hits net-of-existing", () => {
  const report: Record<string, unknown> = {
    section_2_analysis: { finding: { proposition_key: REG_KEY } },
  };
  const a = applyW1DpiaWire(report);
  const before = JSON.stringify((report as any).section_2_analysis.finding);
  const b = applyW1DpiaWire(report);
  const after = JSON.stringify((report as any).section_2_analysis.finding);
  assertEquals(a.registry_hits, 1);
  assertEquals(b.registry_hits, 1);
  assertEquals(before, after);
});

Deno.test("W1: never throws on non-object input", () => {
  const c1 = applyW1DpiaWire(null);
  const c2 = applyW1DpiaWire(undefined);
  const c3 = applyW1DpiaWire("string");
  assertEquals(c1.registry_hits, 0);
  assertEquals(c2.registry_hits, 0);
  assertEquals(c3.registry_hits, 0);
});

Deno.test("W1: walks nested arrays", () => {
  const report: Record<string, unknown> = {
    section_4_risk_management: {
      risks: [
        { proposition_key: REG_KEY, citation: "old" },
        { proposition_key: UNANCHORED_KEY, citation: "old" },
      ],
    },
  };
  const c = applyW1DpiaWire(report);
  assertEquals(c.registry_hits, 1);
  assertEquals(c.write_around_hits, 1);
});
