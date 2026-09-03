// PROMPT 9G item 3 (2026-08-15) — ALL-PINNED BATCH MODE.
//
// `pinned_only` retires the generated-perfect path from the confirmation-batch
// critical path: on the perfect variant the run uses the PINNED fixtures only
// and generates nothing. Before dispatch, every pinned fixture is put through
// the product's own closed-loop check (the SAME single writer the harness
// runs, `checkPerfectDpiaIntake`); any fixture that fails is EXCLUDED and its
// full deficiency list is logged — visible, never silent — and the batch size
// is clamped to the passing count.
//
// The generator is untouched: it remains the messy-variant path, and every
// non-pinned_only dispatch is byte-unchanged.

import type { GoldenCase } from "../golden/types.ts";
import { checkPerfectDpiaIntake, deficiencyLines } from "../../../_shared/quality/perfect-closed-loop.ts";

/** Tools whose perfect fixtures have a product-defined closed-loop check. */
const CLOSED_LOOP_TOOLS: Record<string, (intake: unknown) => { ok: boolean; deficiencies: readonly { kind: string; detail: string }[] }> = {
  dpia: checkPerfectDpiaIntake,
};

export interface PinnedExclusion {
  readonly id: string;
  readonly index: number;
  readonly deficiencies: string[];
}

export interface PinnedOnlyPlan {
  /** Intakes that pass the closed-loop check, in pinned order. */
  readonly intakes: unknown[];
  /** Excluded fixtures with their full deficiency lists. */
  readonly exclusions: PinnedExclusion[];
  /** Clamped batch size = passing-fixture count. */
  readonly batchSize: number;
  /** True when the clamp changed the requested size (log it). */
  readonly clamped: boolean;
  /** One line per exclusion plus, when clamped, the clamp line. */
  readonly logLines: string[];
}

/**
 * Deterministic dispatch-time pre-filter. Pure: no I/O, no model calls.
 * Tools with no closed-loop check pass their pinned fixtures through unfiltered
 * (the clamp still applies, so batch_size can never exceed the pin count).
 */
export function planPinnedOnly(
  tool: string,
  cases: readonly GoldenCase[],
  requestedBatchSize: number,
): PinnedOnlyPlan {
  const check = CLOSED_LOOP_TOOLS[tool];
  const intakes: unknown[] = [];
  const exclusions: PinnedExclusion[] = [];
  const logLines: string[] = [];

  cases.forEach((c, i) => {
    if (!check) { intakes.push(c.intake); return; }
    const res = check(c.intake);
    if (res.ok) { intakes.push(c.intake); return; }
    const lines = deficiencyLines(res.deficiencies as { kind: string; detail: string }[]);
    const id = c.id ?? `${tool}#${i}`;
    exclusions.push({ id, index: i, deficiencies: lines });
    logLines.push(`pinned_only: EXCLUDED pinned perfect fixture ${id} — ${lines.join(" | ")}`);
  });

  const batchSize = intakes.length;
  const clamped = batchSize !== requestedBatchSize;
  if (clamped) {
    logLines.push(
      `pinned_only: batch_size clamped ${requestedBatchSize} → ${batchSize} for ${tool} (${cases.length} pinned, ${exclusions.length} excluded)`,
    );
  }
  return { intakes, exclusions, batchSize, clamped, logLines };
}
