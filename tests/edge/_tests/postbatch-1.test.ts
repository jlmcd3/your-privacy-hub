// POSTBATCH-1 — unit tests for the deterministic post-generation fallback.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyDeterministicPostGenFallback } from "../run-cppa-risk-assessment/index.ts";
import type { TestState } from "../_shared/cppa-test-states.ts";

const RESOLVED_STATES: Record<string, TestState> = {
  M6: {
    state: "resolved_met",
    basis: "revenue band $100M–$500M → 2028-04-01 cohort",
    source_fields: ["q1_revenue"],
    note: "2028-04-01",
  },
  M8: {
    state: "resolved_not_applicable",
    basis: "no exceptions claimed",
    source_fields: ["exceptions"],
  },
};

Deno.test("POSTBATCH-1 fallback: drops resolved-source information_needed entries", () => {
  const report = {
    information_needed: [
      { field: "q1_revenue", dimensions: "please confirm exact revenue" },
      { field: "i1_processing_purpose", dimensions: "purpose narrative missing" },
      { field: "exceptions", source_fields: ["exceptions"], dimensions: "confirm none apply" },
    ],
  };
  const { parsed, notes } = applyDeterministicPostGenFallback(report, RESOLVED_STATES);
  assertEquals(parsed.information_needed.length, 1);
  assertEquals(parsed.information_needed[0].field, "i1_processing_purpose");
  assert(notes.some((n) => n.code === "resolved_source_ask_dropped"));
});

Deno.test("POSTBATCH-1 fallback: 'The M6 determination is resolved' → human phrasing, no M-token", () => {
  const report = {
    priority_actions: [{ text: "The M6 determination is resolved met per the recorded band." }],
    information_needed: [],
  };
  const { parsed, notes } = applyDeterministicPostGenFallback(report, RESOLVED_STATES);
  const out = parsed.priority_actions[0].text as string;
  assert(!/\bM6\b/.test(out), `expected no M-token in "${out}"`);
  assert(!/resolved[_\s]met/i.test(out), `expected no state token in "${out}"`);
  assert(/audit-cohort determination/.test(out), `expected human phrasing in "${out}"`);
  assert(notes.some((n) => n.code === "test_token_scrubbed"));
});

Deno.test("POSTBATCH-1 fallback: 'N/A — M8 resolved not applicable' preserves meaning, no M-token", () => {
  const report = {
    exception_analysis: [{ statutory_basis: "N/A — M8 resolved not applicable" }],
    information_needed: [],
  };
  const { parsed } = applyDeterministicPostGenFallback(report, RESOLVED_STATES);
  const out = parsed.exception_analysis[0].statutory_basis as string;
  assert(!/\bM8\b/.test(out), `expected no M-token in "${out}"`);
  assert(!/resolved[_\s]not[_\s]applicable/i.test(out), `expected no state token in "${out}"`);
  assert(/not applicable on the record/.test(out), `expected human phrasing in "${out}"`);
  assert(/exception review/.test(out), `expected M8 humanised in "${out}"`);
});

Deno.test("POSTBATCH-1 fallback: clean document passes through unchanged", () => {
  const report = {
    executive_summary: "The record establishes the audit-cohort determination on the record.",
    information_needed: [
      { field: "i1_processing_purpose", dimensions: "purpose narrative missing" },
    ],
  };
  const before = JSON.stringify(report);
  const { parsed, notes } = applyDeterministicPostGenFallback(
    JSON.parse(before),
    RESOLVED_STATES,
  );
  assertEquals(JSON.stringify(parsed), before);
  assertEquals(notes.length, 0);
});
