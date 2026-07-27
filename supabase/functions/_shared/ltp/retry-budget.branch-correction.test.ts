import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeRetryBudget,
  hasBudgetForPostLintLLM,
  ISOLATE_CEILING_MS,
  MAX_END_TO_END_MS,
  MAX_ELAPSED_FOR_RETRY_MS,
  POST_RETRY_RESERVE_MS,
  POST_LINT_LLM_BUDGET_MS,
} from "./retry-budget.ts";

// SMOKE-HANG BRANCH-CORRECTION regression suite (item 202).
// Contract: total post-lint work (retry + finalize + persist) must fit
// under a 15-min E2E budget, comfortably inside the 20-min harness reap.

Deno.test("branch-correction: ISOLATE_CEILING_MS == 15min == MAX_END_TO_END_MS", () => {
  assertEquals(ISOLATE_CEILING_MS, 900_000);
  assertEquals(MAX_END_TO_END_MS, 900_000);
});

Deno.test("branch-correction: retries refused past MAX_ELAPSED_FOR_RETRY_MS (4 min) even if wall-clock remains", () => {
  const b = computeRetryBudget({
    elapsedMs: MAX_ELAPSED_FOR_RETRY_MS + 1_000,
    elapsedThresholdMs: 600_000, // caller-permissive threshold
  });
  assertEquals(b.allowed, false);
  assertEquals(b.reason, "elapsed_budget_exceeded");
});

Deno.test("branch-correction: caller's stricter threshold still respected", () => {
  const b = computeRetryBudget({
    elapsedMs: 121_000,
    elapsedThresholdMs: 120_000,
  });
  assertEquals(b.allowed, false);
  assertEquals(b.reason, "elapsed_budget_exceeded");
});

Deno.test("branch-correction: retryCap accounts for 3-min post-retry reserve", () => {
  const b = computeRetryBudget({
    elapsedMs: 60_000,
    elapsedThresholdMs: 240_000,
  });
  // remaining = 900_000 - 60_000 = 840_000; cap = 840_000 - 180_000 = 660_000
  assertEquals(b.remainingWallClockMs, ISOLATE_CEILING_MS - 60_000);
  assertEquals(b.retryCapMs, ISOLATE_CEILING_MS - 60_000 - POST_RETRY_RESERVE_MS);
  assertEquals(b.allowed, true);
});

Deno.test("branch-correction: hasBudgetForPostLintLLM enforces 5-min ceiling on downstream LLM calls", () => {
  assert(hasBudgetForPostLintLLM(0));
  assert(hasBudgetForPostLintLLM(POST_LINT_LLM_BUDGET_MS - 1));
  assertEquals(hasBudgetForPostLintLLM(POST_LINT_LLM_BUDGET_MS), false);
  assertEquals(hasBudgetForPostLintLLM(POST_LINT_LLM_BUDGET_MS + 60_000), false);
});

Deno.test("branch-correction: retry + reserve fit inside E2E budget by construction", () => {
  const worstCaseElapsedAtLint = MAX_ELAPSED_FOR_RETRY_MS; // 4 min
  const b = computeRetryBudget({
    elapsedMs: worstCaseElapsedAtLint - 1,
    elapsedThresholdMs: worstCaseElapsedAtLint,
  });
  assertEquals(b.allowed, true);
  // Even at the worst-permitted moment, retryCap + elapsed + reserve <= E2E budget
  assert(b.retryCapMs + b.elapsedMs + POST_RETRY_RESERVE_MS <= MAX_END_TO_END_MS);
});
