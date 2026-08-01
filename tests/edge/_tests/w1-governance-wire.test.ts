// Tests for GOVERNANCE-REGISTRY-WIRING W1 post-pass + P2 serializer stamp-echo.
// Mirrors _tests/w1-lia-wire.test.ts (ledger items 55–56).

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW1GovernanceWire,
  W1_GOVERNANCE_WIRE_STAMP,
} from "../../../supabase/functions/run-governance-assessment/_w1_governance_wire.ts";
import {
  GOVERNANCE_VERIFIED_AUTHORITIES,
  GOVERNANCE_UNANCHORED_PROPOSITIONS,
  GOVERNANCE_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/_shared/registry/governance-verified-authorities.ts";
import { GOVERNANCE_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/governance.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";

const REGISTRY_KEYS = Object.keys(GOVERNANCE_VERIFIED_AUTHORITIES);
assert(REGISTRY_KEYS.length > 0, "registry must have at least one row");
const REG_KEY = REGISTRY_KEYS[0];
const REG_ROW = GOVERNANCE_VERIFIED_AUTHORITIES[REG_KEY];
const UNANCHORED_KEY = GOVERNANCE_UNANCHORED_PROPOSITIONS[0];

Deno.test("W1-GOV: stamps registry citation on matching proposition_key", () => {
  const report: Record<string, unknown> = {
    domain_findings: [
      {
        proposition_key: REG_KEY,
        citation: "Model paraphrase (wrong)",
        subsection: "wrong",
        verbatim_quote: "wrong",
        governing_anchor: "wrong",
      },
    ],
  };
  applyW1GovernanceWire(report);
  const f: any = (report.domain_findings as any[])[0];
  assertEquals(f.citation, REG_ROW.citation);
  assertEquals(f.subsection, REG_ROW.subsection);
  assertEquals(f.verbatim_quote, REG_ROW.verbatim_quote);
  assertEquals(f.governing_anchor, REG_ROW.governing_anchor);
  assertEquals(f.citation_verified, true);
});

Deno.test("W1-GOV: scrubs citation on unanchored proposition (write-around)", () => {
  const report: Record<string, unknown> = {
    domain_findings: [
      {
        proposition_key: UNANCHORED_KEY,
        citation: "GDPR Art. 999 (invented)",
        subsection: "(a)(1)",
        verbatim_quote: "hallucinated sentence",
        governing_anchor: "hallucinated",
      },
    ],
  };
  applyW1GovernanceWire(report);
  const r: any = (report.domain_findings as any[])[0];
  assertEquals(r.citation, null);
  assertEquals(r.subsection, null);
  assertEquals(r.verbatim_quote, null);
  assertEquals(r.governing_anchor, null);
  assertEquals(r.citation_verified, false);
  assertEquals(r.write_around, true);
});

Deno.test("W1-GOV: unknown proposition_key is recorded, not mutated", () => {
  const report: Record<string, unknown> = {
    domain_findings: [{ proposition_key: "not_a_real_key_xyz", citation: "keep me" }],
  };
  const c = applyW1GovernanceWire(report);
  assertEquals((report.domain_findings as any[])[0].citation, "keep me");
  assert(c.unresolved_keys.includes("not_a_real_key_xyz"));
});

Deno.test("W1-GOV: writes telemetry under _meta.internal.governance_w1", () => {
  const report: Record<string, unknown> = {
    domain_findings: [{ proposition_key: REG_KEY }],
  };
  applyW1GovernanceWire(report);
  const t: any = (report as any)._meta?.internal?.governance_w1;
  assert(t, "telemetry present");
  assertEquals(t.stamp, W1_GOVERNANCE_WIRE_STAMP);
  assertEquals(t.version, GOVERNANCE_VERIFIED_AUTHORITY_VERSION);
  assertEquals(t.resolved, 1);
  assertEquals(t.unanchored_scrubbed, 0);
});

Deno.test("W1-GOV: preserves pre-existing _meta.internal keys", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { version: "eg-w1-2026-07-25" } } },
    x: {},
  };
  applyW1GovernanceWire(report);
  const internal: any = (report as any)._meta.internal;
  assertEquals(internal.emit_gate.version, "eg-w1-2026-07-25");
  assert(internal.governance_w1, "wire telemetry present");
});

Deno.test("W1-GOV: skips subtrees under RESERVED containers", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { emit_gate: { findings: [{ proposition_key: REG_KEY, citation: "leave me" }] } } },
    annotations: [{ proposition_key: REG_KEY, citation: "leave me too" }],
    engagement_map: { rows: [{ proposition_key: REG_KEY, citation: "and me" }] },
  };
  applyW1GovernanceWire(report);
  assertEquals((report as any)._meta.internal.emit_gate.findings[0].citation, "leave me");
  assertEquals((report as any).annotations[0].citation, "leave me too");
  assertEquals((report as any).engagement_map.rows[0].citation, "and me");
});

Deno.test("W1-GOV: idempotent — second pass yields identical output", () => {
  const report: Record<string, unknown> = {
    domain_findings: [{ proposition_key: REG_KEY }],
  };
  const a = applyW1GovernanceWire(report);
  const before = JSON.stringify((report as any).domain_findings);
  const b = applyW1GovernanceWire(report);
  const after = JSON.stringify((report as any).domain_findings);
  assertEquals(a.resolved, 1);
  assertEquals(b.resolved, 1);
  assertEquals(before, after);
});

Deno.test("W1-GOV: never throws on non-object input", () => {
  const c1 = applyW1GovernanceWire(null);
  const c2 = applyW1GovernanceWire(undefined);
  const c3 = applyW1GovernanceWire("string");
  assertEquals(c1.resolved, 0);
  assertEquals(c2.resolved, 0);
  assertEquals(c3.resolved, 0);
});

Deno.test("W1-GOV: walks nested arrays", () => {
  const report: Record<string, unknown> = {
    domain_findings: [
      { proposition_key: REG_KEY, citation: "old" },
      { proposition_key: UNANCHORED_KEY, citation: "old" },
    ],
  };
  const c = applyW1GovernanceWire(report);
  assertEquals(c.resolved, 1);
  assertEquals(c.unanchored_scrubbed, 1);
});

// ── LEAK-PREV-P2 serializer coverage (stamp-echo survival) ──────────────

Deno.test("P2-GOV: schema preserves _meta.internal.governance_w1 stamp", () => {
  const reportData: Record<string, unknown> = {
    assessment_id: "test-1",
    generated_at: "2026-07-25T14:00:00Z",
    domain_findings: [{ proposition_key: REG_KEY }],
    build_stamp: "governance-registry-wiring@2026-07-25T14:03:54Z",
    _meta: { prompt_version: "governance-assessment/r1b2.2-cv1-r" },
    unknown_top_level_key: "should be dropped",
  };
  applyW1GovernanceWire(reportData);
  const { report } = serializeCustomerReport(reportData, GOVERNANCE_REPORT_SCHEMA);
  const out = report as any;
  assertEquals(out.assessment_id, "test-1");
  assertEquals(out.build_stamp, "governance-registry-wiring@2026-07-25T14:03:54Z");
  assertEquals(out.unknown_top_level_key, undefined);
  assertEquals(out._meta.prompt_version, undefined);
  assertEquals(out._meta.internal.governance_w1.stamp, W1_GOVERNANCE_WIRE_STAMP);
  assertEquals(out._meta.internal.governance_w1.version, GOVERNANCE_VERIFIED_AUTHORITY_VERSION);
  assert(out._meta.internal.serializer);
});

Deno.test("P1-GOV: emit-gate accepts governance_assessment tool tag", () => {
  const reportData: Record<string, unknown> = {
    assessment_id: "test-2",
    domain_findings: [
      { domain_name: "Programme governance", finding: "The organisation has appointed a DPO." },
    ],
  };
  runEmitGate(reportData as any, { tool: "governance_assessment", intakeRoster: {} });
  const eg: any = (reportData as any)._meta?.internal?.emit_gate;
  assert(eg, "emit_gate telemetry present");
  assertEquals(eg.tool, "governance_assessment");
});
