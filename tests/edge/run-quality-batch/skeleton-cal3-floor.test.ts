// SKELETON-CAL-3 (CEO-approved 2026-08-28) — the evidence-backed dimension
// floor. A dimension score below 90 must be supported by at least one FAILED
// finding in that dimension; otherwise it is raised to 90. Evidence: ADMT
// held at 93.45 → 94.7 across three consecutive batches with ZERO failed
// findings (GPT 96–100) on unexplained analysis/intelligence scores in the
// 80s — doc 03 LATEST-2/LATEST-3 decision item, resolved by this rule.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyEvidenceBackedDimensionFloor } from "../../../supabase/functions/run-quality-batch/index.ts";

Deno.test("floor — an unexplained sub-90 dimension is raised to 90 (the live ADMT shape)", () => {
  const scores: Record<string, number> = {
    accuracy: 95, citation: 95, hallucination: 100, analysis: 88, intelligence: 85, formatting: 100,
  };
  const { floored } = applyEvidenceBackedDimensionFloor(scores, [
    { dimension: "analysis", passed: true },
    { dimension: "citation", passed: true },
  ]);
  assertEquals(scores.analysis, 90);
  assertEquals(scores.intelligence, 90);
  assertEquals(floored.sort(), ["analysis", "intelligence"]);
});

Deno.test("floor — one failed finding in the dimension lifts the floor entirely; the score stands", () => {
  const scores: Record<string, number> = { analysis: 72, intelligence: 85 };
  const { floored } = applyEvidenceBackedDimensionFloor(scores, [
    { dimension: "analysis", passed: false },
  ]);
  assertEquals(scores.analysis, 72, "a supported deduction is never raised");
  assertEquals(scores.intelligence, 90, "the unsupported one still floors");
  assertEquals(floored, ["intelligence"]);
});

Deno.test("floor — scores at or above 90 are untouched, with or without findings", () => {
  const scores: Record<string, number> = { accuracy: 90, citation: 98 };
  const { floored } = applyEvidenceBackedDimensionFloor(scores, []);
  assertEquals(scores.accuracy, 90);
  assertEquals(scores.citation, 98);
  assertEquals(floored.length, 0);
});

Deno.test("floor — a failed finding in a DIFFERENT dimension does not support this one", () => {
  const scores: Record<string, number> = { analysis: 80 };
  applyEvidenceBackedDimensionFloor(scores, [
    { dimension: "citation", passed: false },
  ]);
  assertEquals(scores.analysis, 90);
});

Deno.test("floor — the ceiling is 90, not 100: the grader keeps a bounded unexplained reservation", () => {
  const scores: Record<string, number> = { intelligence: 89 };
  applyEvidenceBackedDimensionFloor(scores, []);
  assertEquals(scores.intelligence, 90);
});

Deno.test("floor — gated to the skeleton path only (source assertion)", async () => {
  const src = (await Deno.readTextFile(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  )).replace(/\r\n/g, "\n");
  assert(src.includes("const dimFloor = useSkeleton\n    ? applyEvidenceBackedDimensionFloor("));
});
