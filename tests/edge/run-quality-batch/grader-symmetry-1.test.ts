// GRADER-SYM-1 — grader asymmetry fixes.
// Items 2 & 3: deterministic penalties + weighted overall now apply to BOTH
// graders. Item 4: GPT token budget parity (asserted via source inspection of
// the default argument, since the call itself is network-bound).
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyDeterministicPenalties,
  weightedOverall,
} from "../../../supabase/functions/run-quality-batch/index.ts";

const base = {
  accuracy: 100, citation: 100, hallucination: 100,
  analysis: 100, intelligence: 100, formatting: 100,
};

Deno.test("deterministic penalties: severity table 25/12/6/2", () => {
  const out = applyDeterministicPenalties(base, [
    { passed: false, severity: "critical", dimension: "accuracy" },
    { passed: false, severity: "high", dimension: "citation" },
    { passed: false, severity: "medium", dimension: "analysis" },
    { passed: false, severity: "low", dimension: "formatting" },
  ]);
  assertEquals(out.accuracy, 75);
  assertEquals(out.citation, 88);
  assertEquals(out.analysis, 94);
  assertEquals(out.formatting, 98);
  assertEquals(out.hallucination, 100);
});

Deno.test("deterministic penalties: passes and unknown dimensions are no-ops", () => {
  const out = applyDeterministicPenalties(base, [
    { passed: true, severity: "critical", dimension: "accuracy" },
    { passed: false, severity: "critical", dimension: "not_a_dimension" },
  ]);
  assertEquals(out, base);
});

Deno.test("deterministic penalties: floor at 0 and no input mutation", () => {
  const src = { ...base, accuracy: 10 };
  const out = applyDeterministicPenalties(src, [
    { passed: false, severity: "critical", dimension: "accuracy" },
  ]);
  assertEquals(out.accuracy, 0);
  assertEquals(src.accuracy, 10);
});

Deno.test("weightedOverall matches the Claude/aggregate formula", () => {
  const w = {
    accuracy: 0.3, citation: 0.2, hallucination: 0.2,
    analysis: 0.15, intelligence: 0.1, formatting: 0.05,
  };
  assertEquals(weightedOverall(base, w), 100);
  const mixed = { ...base, accuracy: 50 };
  assertEquals(Math.round(weightedOverall(mixed, w)), 85);
});

Deno.test("GPT grader budget is 5000 (parity with Claude) and truncation is logged", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  assert(src.includes("async function gpt4o(system: string, user: string, maxTokens = 5000)"));
  assert(src.includes("gpt_response_truncated"));
  // Union reconciliation replaced the Claude-walk join.
  assert(src.includes("UNION RECONCILIATION"));
  // The BUILD_STAMP.startsWith("grader-symmetry-1@") check that used to sit
  // here is removed (2026-08-27 dead-trip-wire sweep), not relaxed: BUILD_
  // STAMP is ONE export for the entire 2000+ line index.ts, bumped by every
  // landing that touches the file — it was never going to durably say
  // "grader-symmetry-1" once a later, unrelated landing renamed it (it is
  // now "chunk-safe-intakes@prompt8g-2026-08-12", and no other test in the
  // fleet maintains a "current landing name" pin for this constant either).
  // The three asserts above already verify GRADER-SYM-1's actual functional
  // content directly; nothing is lost by dropping a check that could only
  // ever have meant "was this the single most recent commit to this file".
});
