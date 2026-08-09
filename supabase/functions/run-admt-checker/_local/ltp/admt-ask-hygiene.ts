/**
 * ITEM 422-B DEFECT 2 — ASK HYGIENE: NO ASK AGAINST A SUPPLIED FACT.
 *
 * The item422 acceptance pilot shut the gate honestly on ONE orphan:
 *   _meta.internal.admt_coverage.orphans[0]
 *   = "the ask names human_review although the record supplies it."
 * on the PERFECT fixture. This is the record-blindness class: the detector is
 * right and the ASK is wrong, so the repair is on the ask.
 *
 * THE RULE (deterministic, the items 392–396 record-states-only idiom):
 *   For every `information_needed` entry, compute the intake keys the ask
 *   NAMES using the SAME body projection the coverage detector uses, and the
 *   subset of those the record SUPPLIES.
 *     • supplied = 0            → HONEST ASK. Untouched, byte-identical.
 *     • every named key supplied → SUPPRESSED. The whole ask is against facts
 *                                  the record contains; it is removed.
 *     • mixed                    → RETAINED and flagged. The ask still carries
 *                                  a genuinely open subject; the product does
 *                                  not rewrite counsel's prose, so the
 *                                  detector's finding stands honestly.
 *
 * The coverage link config, the orphan rule and the gate are NOT touched.
 * Telemetry rides `_meta.internal.admt_ask_hygiene`. Deterministic, fail-open.
 */

import {
  ADMT_LINKED_INTAKE_KEYS,
  admtAskBody,
  admtIntakeFilled,
} from "../../../_shared/ltp/coverage-matrix.ts";

export const ADMT_ASK_HYGIENE_VERSION = "admt-ask-hygiene@item422b-2026-08-09";

export interface AdmtAskHygieneDiag {
  version: string;
  asks_in: number;
  asks_out: number;
  suppressed: number;
  retained_mixed: number;
  honest: number;
  suppressed_keys: string[];
  crashed: boolean;
}

/**
 * THE SINGLE WRITE SITE for `information_needed` ask hygiene.
 */
export function runAdmtAskHygiene(
  report: Record<string, unknown> | null | undefined,
  intake: unknown,
): AdmtAskHygieneDiag {
  const diag: AdmtAskHygieneDiag = {
    version: ADMT_ASK_HYGIENE_VERSION,
    asks_in: 0,
    asks_out: 0,
    suppressed: 0,
    retained_mixed: 0,
    honest: 0,
    suppressed_keys: [],
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return diag;
    const asks = report.information_needed;
    if (!Array.isArray(asks) || asks.length === 0) return diag;
    diag.asks_in = asks.length;

    const kept: unknown[] = [];
    for (const ask of asks) {
      const body = admtAskBody(ask);
      const named = ADMT_LINKED_INTAKE_KEYS.filter((k) => body.includes(k));
      const supplied = named.filter((k) => admtIntakeFilled(intake, k));
      if (supplied.length === 0) {
        diag.honest++;
        kept.push(ask);
        continue;
      }
      if (supplied.length === named.length) {
        diag.suppressed++;
        for (const k of supplied) {
          if (!diag.suppressed_keys.includes(k)) diag.suppressed_keys.push(k);
        }
        continue; // the whole ask is against facts the record supplies
      }
      diag.retained_mixed++;
      kept.push(ask);
    }

    diag.asks_out = kept.length;
    if (diag.suppressed > 0) report.information_needed = kept;
  } catch (e) {
    diag.crashed = true;
    console.warn("[admt-ask-hygiene] failed (non-fatal):", (e as Error)?.message);
  }
  return diag;
}

/** Run the pass and attach telemetry at `_meta.internal.admt_ask_hygiene`. */
export function attachAdmtAskHygiene(
  report: Record<string, unknown>,
  intake: unknown,
): AdmtAskHygieneDiag {
  const t = runAdmtAskHygiene(report, intake);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.admt_ask_hygiene = t;
  } catch { /* non-fatal */ }
  return t;
}
