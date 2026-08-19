/**
 * ITEM 254 — TRACK 2 / SPEC §7.1 Stage B(1): PRESENCE-BAND MINING.
 *
 * Provenance (verified via SELECTs on 2026-07-29; reproduced in
 * docs/courier/ITEM254-PRESENCE-BAND-MINING-2026-07-29.md).
 *
 * Corpus (Stage-B replay input, next couriers):
 *   quality_archive.quality_run_documents_20260728, tool='cppa-risk':
 *   245 docs, ALL with intake_data, ZERO with persisted render_plan.
 *   Archive predates plan persistence; this file mines a DIFFERENT
 *   source (live production plans) only to fix presence thresholds.
 *
 * Presence source (this file):
 *   LIVE public.quality_run_documents, 22 docs carrying
 *   report_data->_meta->internal->render_plan; presence flags read at
 *   plan.plan.factor_table (16 rows each).
 *
 *   - 15 model-authored NON-DEGENERATE plans (item233 → item242-cpb
 *     builds, all 2026-07-28) yielded present_row counts:
 *       7, 9, 9, 8, 10, 7, 8, 11, 8, 9, 11, 11, 7, 9, 7  (of 16)
 *     → presence-rate band [7/16, 11/16] = [0.4375, 0.6875],
 *       median 9/16 = 0.5625.
 *
 *   - 7 zero-presence docs were classified:
 *       DEGENERATE (excluded from band):
 *         53d4b9c0  — item232 build, pass1_abort_timeout write-around.
 *         9a83145e  — item237 build, validator_issues:1 write-around
 *                     (deterministic path pins present_in_intake:false).
 *         563117cb  — item240-cp1 build, validator_issues:1 write-around
 *                     (deterministic-path pin, same class as above).
 *       HOLLOW-DOCUMENT COLLAPSE (retained as empirical validation
 *       that the presence gate catches the collapse class — pass1_ok
 *       true, write_around false, model genuinely returned all-absent):
 *         3bbc3a69  — item243-completion build.
 *         4eee3f7a  — item243-completion build.
 *         3302dc39  — item243-completion build.
 *         f7981c15  — item243-completion build.
 *
 * Caveats (verbatim — do not paraphrase in courier):
 *   1. Band mined from n=15 same-day rich smoke-fixture plans, NOT the
 *      full 245-intake richness distribution.
 *   2. Run-#180 doc 61be3318 presence flags (7/16) were included via
 *      its build cohort, but its weight_notes are CORRUPTED (broken-
 *      guard incident) and were NOT used for note-side statistics.
 *   3. Band values are PROVISIONAL until re-mined across the real
 *      distribution during the Stage-B ramp. Revisable by courier
 *      before acceptance enforcement.
 *
 * Team-unanimous configuration (four-lens; full lens record in the
 * ITEM254 courier — threshold wiring, not customer content):
 *   - HARD floor min_presence_rate = 0.25 for harness hard-failure.
 *     Catches the collapse class (all four item243 docs at 0.0) while
 *     tolerating real intakes leaner than smoke fixtures; observed
 *     working minimum 0.4375 gives ~1.75x headroom.
 *   - REVIEW band [0.4375, 0.6875]: rates outside the observed band
 *     (but above hard floor) flag `review_band_low` / `review_band_high`
 *     in metrics — NEVER hard failures.
 */
import type { SubstanceGateConfig } from "./types.ts";

export interface MinedPresenceBand {
  readonly hard_floor: number;
  readonly review_low: number;
  readonly review_high: number;
  readonly median: number;
  readonly mined_n: number;
  readonly mined_at: string;
  readonly source: string;
  readonly provisional: boolean;
}

export const MINED_PRESENCE_BAND: MinedPresenceBand = {
  hard_floor: 0.25,
  review_low: 0.4375,
  review_high: 0.6875,
  median: 0.5625,
  mined_n: 15,
  mined_at: "2026-07-29",
  source:
    "public.quality_run_documents render_plan->plan->factor_table, " +
    "model-authored non-degenerate plans item233–item242-cpb",
  provisional: true,
};

/**
 * Default substance-gate config for the replay harness. `min_presence_rate`
 * is the mined hard floor; review band values flow through so the metrics
 * carry `review_band_low` / `review_band_high` without hard-failing.
 */
export function defaultSubstanceGateConfig(): SubstanceGateConfig {
  return {
    min_presence_rate: MINED_PRESENCE_BAND.hard_floor,
    review_low: MINED_PRESENCE_BAND.review_low,
    review_high: MINED_PRESENCE_BAND.review_high,
  };
}
