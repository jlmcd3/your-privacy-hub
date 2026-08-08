// ITEM 363 — RECORD COMPLETENESS AND RESIDUAL-RISK SUMMARY.
//
// Renamed from the rejected letter-grade proposal per the lawyers' amendment
// (CEO-accepted): NO letter grades, NO score. The section states descriptive
// bands derived DETERMINISTICALLY from engine outputs that already exist.
//
// PINNED FORMULA. The derivation below is versioned and printed in the ledger.
// It is a pure function of four engine values:
//
//   missing_data_count   count of `missing_data`-class information-needed items
//   reserved_count       count of `reserved_decision`-class items (Item 358)
//   conditions_count     activity_analytics[].consequence.conditions.length
//   residual_bands       activity_analytics[].safeguard_map[].residual_band
//
// MONOTONICITY LAW (tested): adding a missing item, a condition, or a worse
// residual band can never improve the summary. `severity_index` is the ordinal
// the monotonicity test reads; it never appears in a customer document.
//
// SCOPE NOTE: this summary measures the ASSESSMENT RECORD, not legal
// compliance. The note is emitted with the summary and is not optional.

export const RECORD_SUMMARY_FORMULA_VERSION = "cppa-risk-record-summary@v1-item363";

export type ResidualBandInput = "low" | "moderate" | "high" | "undetermined" | string;

export interface RecordSummaryInput {
  readonly missing_data_count: number;
  readonly reserved_count?: number;
  readonly conditions_count: number;
  readonly residual_bands?: readonly ResidualBandInput[];
}

export interface RecordSummary {
  readonly formula_version: string;
  readonly completeness_band: string;
  readonly residual_band: string;
  readonly conditions_clause: string;
  readonly reserved_clause: string | null;
  /** The customer-facing sentence. */
  readonly sentence: string;
  /** Standing scope note; emitted with the sentence, never suppressed. */
  readonly scope_note: string;
  /** Ordinal used only by the monotonicity test. Never rendered. */
  readonly severity_index: number;
}

export const RECORD_SUMMARY_SCOPE_NOTE =
  "This summary measures how complete the assessment record is and what risk remains after the safeguards the company describes. It is not a measure of legal compliance.";

/** Completeness bands by missing-data count, best first. */
const COMPLETENESS_BANDS: ReadonlyArray<readonly [number, string]> = [
  [0, "Complete record"],
  [2, "Substantially complete record"],
  [5, "Partially complete record"],
  [Number.POSITIVE_INFINITY, "Materially incomplete record"],
];

/** Residual bands, best first. The WORST band present governs. */
const RESIDUAL_RANK: ReadonlyArray<readonly [string, string]> = [
  ["low", "low residual risk"],
  ["moderate", "moderate residual risk"],
  ["high", "high residual risk"],
  ["undetermined", "undetermined residual risk"],
];

const WORDS = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
];

/** Spelled counts, so no document ever prints "1 condition(s)". */
export function countWord(n: number): string {
  const i = Math.max(0, Math.trunc(n));
  return i < WORDS.length ? WORDS[i] : String(i);
}

export function pluralise(n: number, singular: string, plural?: string): string {
  return Math.trunc(n) === 1 ? singular : (plural ?? `${singular}s`);
}

function completenessFor(missing: number): { label: string; rank: number } {
  const m = Math.max(0, Math.trunc(missing));
  for (let i = 0; i < COMPLETENESS_BANDS.length; i++) {
    if (m <= COMPLETENESS_BANDS[i][0]) return { label: COMPLETENESS_BANDS[i][1], rank: i };
  }
  const last = COMPLETENESS_BANDS.length - 1;
  return { label: COMPLETENESS_BANDS[last][1], rank: last };
}

function residualFor(bands: readonly ResidualBandInput[]): { label: string; rank: number } {
  let worst = -1;
  for (const b of bands) {
    const idx = RESIDUAL_RANK.findIndex(([k]) => k === String(b ?? "").toLowerCase());
    if (idx > worst) worst = idx;
  }
  if (worst < 0) return { label: "undetermined residual risk", rank: RESIDUAL_RANK.length - 1 };
  return { label: RESIDUAL_RANK[worst][1], rank: worst };
}

export function deriveRecordSummary(input: RecordSummaryInput): RecordSummary {
  const missing = Math.max(0, Math.trunc(input.missing_data_count ?? 0));
  const reserved = Math.max(0, Math.trunc(input.reserved_count ?? 0));
  const conditions = Math.max(0, Math.trunc(input.conditions_count ?? 0));
  const bands = input.residual_bands ?? [];

  const completeness = completenessFor(missing);
  const residual = residualFor(bands);

  const conditions_clause = conditions === 0
    ? "no conditions outstanding"
    : `${countWord(conditions)} ${pluralise(conditions, "condition")} outstanding`;

  const reserved_clause = reserved === 0
    ? null
    : `${countWord(reserved)} ${pluralise(reserved, "item")} reserved to the company and its counsel`;

  const sentence = reserved_clause
    ? `${completeness.label}; ${residual.label}; ${conditions_clause}; ${reserved_clause}.`
    : `${completeness.label}; ${residual.label}; ${conditions_clause}.`;

  // MONOTONIC ORDINAL. Each term is non-decreasing in its own input, and the
  // weights keep the terms from cancelling one another out.
  const severity_index = completeness.rank * 1000 +
    residual.rank * 100 +
    Math.min(conditions, 20) * 4 +
    Math.min(reserved, 20);

  return {
    formula_version: RECORD_SUMMARY_FORMULA_VERSION,
    completeness_band: completeness.label,
    residual_band: residual.label,
    conditions_clause,
    reserved_clause,
    sentence,
    scope_note: RECORD_SUMMARY_SCOPE_NOTE,
    severity_index,
  };
}
