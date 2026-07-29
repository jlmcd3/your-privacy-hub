/**
 * ITEM 253 — Pass-1 provider seam.
 *
 * `deterministicProvider` wraps derivePlan() and is documented as
 * PIPELINE-SMOKE-ONLY: substance gates are EXPECTED to fail because
 * pickFactorTable pins `present_in_intake:false` by design
 * (Ruling A, docs/courier/ITEM250-RULING-A-GOLDEN-SHAPE-GATE-LOCATION-2026-07-29.md).
 *
 * `modelProvider` wraps runPass1Llm(). It is NOT invoked by any Stage-A
 * test; live model calls are CEO-released per Stage B protocol.
 */
import { derivePlan, type DeriveInput } from "../derive.ts";
import { runPass1Llm, type Pass1Result } from "../pass1-llm.ts";
import type { Pass1Provider, ProviderKind } from "./types.ts";

/** Module-scoped call counter so tests can assert no live invocation. */
let _modelProviderCallCount = 0;
export function _modelProviderCallCount_get(): number {
  return _modelProviderCallCount;
}
export function _modelProviderCallCount_reset(): void {
  _modelProviderCallCount = 0;
}

export const DETERMINISTIC_PROVIDER_KIND: ProviderKind = "deterministic";
export const MODEL_PROVIDER_KIND: ProviderKind = "model";

/**
 * Deterministic provider. Wraps derivePlan(). Pipeline-smoke only.
 * Substance gates (presence, note specificity) will fail by construction.
 */
export const deterministicProvider: Pass1Provider = async (input: DeriveInput) => {
  const plan = derivePlan(input);
  const result: Pass1Result = {
    plan,
    telemetry: {
      ran: false,
      attempts: 0,
      ok: true,
      latency_ms: 0,
      write_around: false,
      validator_issues: 0,
      timeout_enforced: "n/a-deterministic",
      per_attempt_timeout_ms: 0,
      attempts_detail: [],
    },
  };
  return result;
};

/**
 * Model provider. Wraps runPass1Llm(). CEO-released per Stage B protocol.
 * Every invocation increments the module-scope counter so the Stage-A
 * test suite can assert zero live calls.
 */
export const modelProvider: Pass1Provider = async (input: DeriveInput) => {
  _modelProviderCallCount += 1;
  return await runPass1Llm(input);
};
