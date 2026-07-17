// REBUILD-DPIA — unit tests for Task 3 (DPIA deterministic post-gen fallback),
// Task 9 (post_gen_lint meta shape), and Task 10 (cppa-risk scrub artifact
// fix + prose field-id scrub + M9 candidate handling).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyDeterministicPostGenFallbackDpia,
  DPIA_M_TOKEN_MAP,
  dedupeStringArrayPreserveOrder,
} from "../run-dpia-framework/index.ts";
import {
  applyDeterministicPostGenFallback as applyRiskFallback,
  PROSE_FIELD_ID_MAP,
} from "../run-cppa-risk-assessment/index.ts";
import type { TestState } from "../_shared/cppa-test-states.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Task 3a — DPIA resolved-source ask dropping.
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T3a: DPIA fallback drops resolved-source information_needed", () => {
  const testStates = {
    M3: { state: "resolved_met", basis: "Art. 9(2) condition selected", source_fields: ["article_9_condition"] },
    M5: { state: "resolved_met", basis: "GDPR jurisdiction", source_fields: ["jurisdictions"] },
  };
  const report = {
    information_needed: [
      { field: "article_9_condition", dimensions: "confirm the Art. 9(2) condition" },
      { field: "retention_period", dimensions: "state the retention period" },
      { field: "purpose", source_fields: ["jurisdictions"], dimensions: "confirm GDPR applies" },
    ],
  };
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(report, testStates as any);
  assertEquals(parsed.information_needed.length, 1);
  assertEquals(parsed.information_needed[0].field, "retention_period");
  assert(notes.filter((n) => n.code === "resolved_source_ask_dropped").length === 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3b — DPIA token scrub preserves meaning; M9 CANDIDATE-safe.
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T3b: DPIA token scrub → human phrasing, no M-token", () => {
  const report = {
    executive_summary: "The M3 determination is resolved met on the record.",
    information_needed: [],
  };
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(report, {});
  const out = parsed.executive_summary as string;
  assert(!/\bM3\b/.test(out), `expected no M3 in "${out}"`);
  assert(!/resolved[_\s]met/i.test(out), `expected no state token in "${out}"`);
  assert(/Art\.\s*9\(2\) condition determination/.test(out), `expected DPIA humanised phrase in "${out}"`);
  assert(notes.some((n) => n.code === "test_token_scrubbed"));
});

Deno.test("REBUILD-DPIA T3b: M9 remains CANDIDATE-class ('the profiling review', not resolved-sounding)", () => {
  assertEquals(DPIA_M_TOKEN_MAP.M9, "the profiling review");
  const report = { section_1_description: { note: "M9 is CANDIDATE." }, information_needed: [] };
  const { parsed } = applyDeterministicPostGenFallbackDpia(report, {});
  const out = (parsed as any).section_1_description.note as string;
  assert(!/\bM9\b/.test(out));
  assert(/the profiling review/.test(out));
  // Never scrubbed into a resolved-sounding phrase:
  assert(!/established on the record/.test(out));
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3c — clean document is byte-identical.
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T3c: DPIA clean document passes through unchanged (byte-identical)", () => {
  const report = {
    executive_summary: "The record establishes the special-category determination on the record.",
    information_needed: [{ field: "controller_country", dimensions: "state the controller country" }],
  };
  const before = JSON.stringify(report);
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(JSON.parse(before), {});
  assertEquals(JSON.stringify(parsed), before);
  assertEquals(notes.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 10a — cppa-risk scrub artifact fix. EXACT batch 4487d55d string.
// Input "the M6 cohort determination" → "the audit-cohort determination"
// (byte-exact), not "the the audit-cohort determination cohort determination".
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T10a: 'the M6 cohort determination' → 'the audit-cohort determination' (byte-exact)", () => {
  const report = { priority_actions: [{ text: "the M6 cohort determination" }], information_needed: [] };
  const testStates: Record<string, TestState> = {
    M6: { state: "resolved_met", basis: "cohort mapped", source_fields: ["q1_revenue"] },
  };
  const { parsed } = applyRiskFallback(report, testStates);
  const out = (parsed as any).priority_actions[0].text as string;
  assertEquals(out, "the audit-cohort determination");
});

Deno.test("REBUILD-DPIA T10a: 'the M6 audit determination' compound also collapses cleanly", () => {
  const report = { priority_actions: [{ text: "Verify the M6 audit determination outcome." }], information_needed: [] };
  const { parsed } = applyRiskFallback(report, {} as any);
  const out = (parsed as any).priority_actions[0].text as string;
  assert(!/\bM6\b/.test(out));
  assert(!/\bthe the\b/i.test(out));
  assert(/the audit-cohort determination/.test(out));
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 10b — cppa-risk prose field-id scrub. Preserves anchors in
// information_needed[].field and .source_fields.
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T10b: prose field-id scrub replaces q18b_admt_training in prose", () => {
  const report = {
    cross_tool_recommendations: {
      admt_assessment_rationale: "The q18b_admt_training answer indicates no training.",
    },
    information_needed: [
      { field: "q18b_admt_training", dimensions: "confirm training", source_fields: ["q18b_admt_training"] },
    ],
  };
  const { parsed, notes } = applyRiskFallback(report, {} as any);
  const rationale = (parsed as any).cross_tool_recommendations.admt_assessment_rationale as string;
  assert(!/q18b_admt_training/.test(rationale), `prose still contains raw id: "${rationale}"`);
  assert(/the ADMT-training answer/.test(rationale));
  // Anchor values in information_needed MUST remain intact.
  const inEntry = (parsed as any).information_needed[0];
  assertEquals(inEntry.field, "q18b_admt_training");
  assertEquals(inEntry.source_fields[0], "q18b_admt_training");
  assert(notes.some((n) => n.code === "prose_field_id_scrubbed"));
});

Deno.test("REBUILD-DPIA T10b: PROSE_FIELD_ID_MAP covers the courier list", () => {
  const required = [
    "q18_admt_use", "q18b_admt_training", "q5_sell_share", "q5c_share_revenue_50pct",
    "q15_sensitive_pi", "q15c_spi_volume", "q5b_profiling_observation", "q15b_under16_knowledge",
  ];
  for (const k of required) {
    assert(k in PROSE_FIELD_ID_MAP, `missing prose scrub for ${k}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 9 — post_gen_lint meta shape (via logPostGenLint payload cap ≤40).
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T9: post_gen_lint meta shape — notes capped at 40", async () => {
  const { logPostGenLint } = await import("../_shared/function-run-logger.ts");
  let received: any = null;
  const fakeSupabase = {
    from(_t: string) {
      return {
        insert(row: any) {
          received = row;
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const notes = Array.from({ length: 100 }, (_, i) => ({ code: "test_token_scrubbed", detail: `n${i}` }));
  logPostGenLint(fakeSupabase as any, {
    functionName: "run-dpia-framework",
    fallbackApplied: true,
    retryWithinBudget: false,
    residualLeaks: 3,
    residualResolvedAsks: 2,
    notes,
    sourceTable: "dpia_frameworks",
    sourceRowId: "abc",
  });
  // Let the fire-and-forget promise flush.
  await new Promise((r) => setTimeout(r, 30));
  assert(received, "insert never called");
  const meta = received.metadata;
  assertEquals(meta.event, "post_gen_lint");
  assertEquals(meta.fallback_applied, true);
  assertEquals(meta.retry_within_budget, false);
  assertEquals(meta.residual_leaks, 3);
  assertEquals(meta.residual_resolved_asks, 2);
  assertEquals(meta.notes.length, 40);
  assertEquals(received.function_name, "run-dpia-framework");
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 7e — gdprCites dedupe (order-preserving, exact-string).
// ─────────────────────────────────────────────────────────────────────────────
Deno.test("REBUILD-DPIA T7e: gdprCites dedupe order-preserving", () => {
