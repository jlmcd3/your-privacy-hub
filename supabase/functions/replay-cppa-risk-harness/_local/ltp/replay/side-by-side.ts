/**
 * ITEM 253 — Side-by-side comparator.
 *
 * Extracts golden-shape metrics from the archived legacy report and
 * compares them to the Track-2 PerDocResult. Legacy reports predate the
 * 38-key schema in some cases — tolerate missing keys by recording
 * "legacy_key_missing:<key>" in missing_legacy_keys, never throw.
 */
import { evaluateGoldenShape, CPPA_RISK_GOLDEN_QUOTAS } from "../golden-shape-quotas.ts";
import type { PerDocResult, SideBySideRow } from "./types.ts";

export function compareDoc(
  perDoc: PerDocResult,
  legacyReport: Record<string, unknown>,
): SideBySideRow {
  const missing: string[] = [];
  for (const q of CPPA_RISK_GOLDEN_QUOTAS) {
    if (!(q.key in legacyReport)) missing.push(`legacy_key_missing:${q.key}`);
  }
  const legacyGs = evaluateGoldenShape(legacyReport);
  return {
    doc_id: perDoc.doc_id,
    track2_metrics: {
      review_flag: perDoc.substance.golden_shape.review_flag,
      shortfall_keys: perDoc.substance.golden_shape.shortfall_keys,
    },
    legacy_metrics: {
      review_flag: legacyGs.review_flag,
      shortfall_keys: legacyGs.shortfall_keys,
    },
    deltas: {
      review_flag_delta:
        Number(perDoc.substance.golden_shape.review_flag) -
        Number(legacyGs.review_flag),
      shortfall_delta:
        perDoc.substance.golden_shape.shortfall_keys.length -
        legacyGs.shortfall_keys.length,
      missing_legacy_keys: missing,
    },
  };
}
