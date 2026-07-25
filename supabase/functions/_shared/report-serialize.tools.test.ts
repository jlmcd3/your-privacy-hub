// LEAK-PREV-P2 — per-tool schema-coverage + pass-through tests.
// Ensures every frontend-read path is schema-declared (breakage guard) and
// that serializing a well-formed sample report only removes known-internal
// keys.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { serializeCustomerReport } from "./report-serialize.ts";
import { ADMT_REPORT_SCHEMA, ADMT_FRONTEND_READ_PATHS } from "./report-schemas/admt.ts";
import { CPPA_RISK_REPORT_SCHEMA, CPPA_RISK_FRONTEND_READ_PATHS } from "./report-schemas/cppa-risk.ts";
import { CPPA_CYBER_REPORT_SCHEMA, CPPA_CYBER_FRONTEND_READ_PATHS } from "./report-schemas/cppa-cyber.ts";

function coversPath(schema: typeof ADMT_REPORT_SCHEMA, path: string): boolean {
  const [head, ...rest] = path.split(".");
  if (!schema.topLevel.includes(head)) return false;
  if (rest.length === 0) return true;
  const nested = rest[0];
  const obj = schema.objects?.[head];
  const arr = schema.entries?.[head];
  if (obj && obj.includes(nested)) return true;
  if (arr && arr.includes(nested)) return true;
  return false;
}

Deno.test("ADMT: every frontend-read path is schema-declared", () => {
  const missing = ADMT_FRONTEND_READ_PATHS.filter((p) => !coversPath(ADMT_REPORT_SCHEMA, p));
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

Deno.test("CPPA RISK: every frontend-read path is schema-declared", () => {
  const missing = CPPA_RISK_FRONTEND_READ_PATHS.filter((p) => !coversPath(CPPA_RISK_REPORT_SCHEMA, p));
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

Deno.test("CPPA CYBER: every frontend-read path is schema-declared", () => {
  const missing = CPPA_CYBER_FRONTEND_READ_PATHS.filter((p) => !coversPath(CPPA_CYBER_REPORT_SCHEMA, p));
  assertEquals(missing, [], `missing schema coverage: ${missing.join(", ")}`);
});

// ── Golden-style pass-through: a well-formed sample report loses nothing
// except known-internal keys (mimicking a real terminal payload). ───────
function admtSample() {
  return {
    system_name: "TalentRank",
    overall_status: "gaps_identified",
    disclaimer: "not legal advice",
    notice_gaps: [{ id: "n1", finding: "missing", status: "gap", insufficient_basis: false }],
    opt_out_gaps: [],
    access_gaps: [],
    top_3_actions: [{ id: "a1", action: "do x", insufficient_basis: false }],
    scope_analysis: { is_admt: true, summary: "yes", triggers_profiling: false },
    // internal telemetry that should NOT ship
    _w9_admt_wire: { pass: 1 },
    _meta: { internal: { emit_gate: { degraded_count: 0 } }, tracing: "should-drop" },
  };
}
function riskSample() {
  return {
    schema_version: "v4",
    overall_score: 72,
    risk_level: "moderate",
    executive_summary: "…",
    risk_assessment_by_activity: [{ id: "a1", purpose: "x", statutory_basis: "§ 7150(b)(1)" }],
    _va_stamp: "leak",
    _meta: { internal: { risk_va: { va_rows: 44 } }, ephemeral: "drop-me" },
  };
}
function cyberSample() {
  return {
    readiness_level: "developing",
    overall_score: 68,
    executive_summary: "…",
    controls: [{ key: "c1", name: "MFA", status: "in_place", score: 3 }],
    top_risks: [{ id: "r1", description: "x" }],
    next_steps: [{ id: "n1", action: "y" }],
    _w6_cyber_fix: { pass: 1 },
    _meta: { internal: { cyber_va: { va_rows: 8 } }, secret: "drop" },
  };
}

function assertPassThrough(sample: any, schema: any) {
  const { report } = serializeCustomerReport(sample, schema);
  const r = report as any;
  // All known-internal keys removed
  for (const k of Object.keys(sample)) {
    if (k.startsWith("_") && k !== "_meta") {
      assert(!(k in r), `${k} should have been dropped`);
    }
  }
  // _meta.internal preserved; other _meta.* dropped
  assert(r._meta.internal);
  for (const k of Object.keys(sample._meta ?? {})) {
    if (k !== "internal") assert(!(k in r._meta), `_meta.${k} should have been dropped`);
  }
  // Serializer telemetry lives under _meta.internal
  assert(r._meta.internal.serializer);
}

Deno.test("ADMT: sample pass-through drops only internal keys", () => {
  assertPassThrough(admtSample(), ADMT_REPORT_SCHEMA);
});
Deno.test("CPPA RISK: sample pass-through drops only internal keys", () => {
  assertPassThrough(riskSample(), CPPA_RISK_REPORT_SCHEMA);
});
Deno.test("CPPA CYBER: sample pass-through drops only internal keys", () => {
  assertPassThrough(cyberSample(), CPPA_CYBER_REPORT_SCHEMA);
});

Deno.test("ADMT: entry-level insufficient_basis (P0 flag) is schema-declared", () => {
  const src = { notice_gaps: [{ id: "1", insufficient_basis: true, information_needed: true }] };
  const { report } = serializeCustomerReport(src, ADMT_REPORT_SCHEMA);
  const item = (report as any).notice_gaps[0];
  assertEquals(item.insufficient_basis, true);
  assertEquals(item.information_needed, true);
});
