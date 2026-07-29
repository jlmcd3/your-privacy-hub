/**
 * ITEM 253 — TRACK 2 / SPEC §7.1: REPLAY HARNESS Stage A.
 *
 * Types-only module. No behavior. See
 * docs/courier/ITEM253-REPLAY-HARNESS-DESIGN-2026-07-29.md for the
 * team-unanimous four-lens design record that authorizes this build.
 */
import type { DeriveInput } from "../derive.ts";
import type { Pass1Result } from "../pass1-llm.ts";

export const REPLAY_HARNESS_VERSION = "replay-harness-2026-07-29-item253-stageA";

/** Provider kind label surfaced in per-doc telemetry. */
export type ProviderKind = "deterministic" | "model";

/** Pass-1 provider seam. The harness runs identically over either implementation. */
export type Pass1Provider = (input: DeriveInput) => Promise<Pass1Result>;

export interface ReplayDoc {
  readonly doc_id: string;
  readonly source_row_id?: string;
  readonly intake_data: Record<string, unknown>;
  /** Archived legacy report used by side-by-side comparison (optional). */
  readonly legacy_report?: Record<string, unknown>;
}

export interface Pass1TelemetrySummary {
  readonly ok: boolean;
  readonly attempts: number;
  readonly write_around: boolean;
  readonly grounded_note_replacement_rate: number;
}

export interface SubstanceMetrics {
  readonly presence_rate: number;
  readonly present_factor_count: number;
  readonly factors_with_ledger_refs: number;
  readonly note_token_diversity: number;
  readonly action_kind_diversity_ok: boolean;
  /**
   * Item 254 — set true when a review band is configured and
   * `presence_rate` falls below `review_low` (still at/above the hard
   * floor). Advisory only; never contributes to `hard_failures`.
   */
  readonly review_band_low?: boolean;
  /** Item 254 — set true when `presence_rate` exceeds `review_high`. */
  readonly review_band_high?: boolean;
  readonly golden_shape: {
    readonly review_flag: boolean;
    readonly shortfall_keys: readonly string[];
  };
}

export interface StructureMetrics {
  readonly sections_emitted: number;
  readonly sections_omitted_by_class: Readonly<Record<string, number>>;
}

export interface PerDocResult {
  readonly doc_id: string;
  readonly provider_kind: ProviderKind;
  readonly pass1_telemetry_summary: Pass1TelemetrySummary;
  readonly substance: SubstanceMetrics;
  readonly structure: StructureMetrics;
  readonly hard_failures: readonly string[];
}

export interface PresenceRateDistribution {
  readonly min: number;
  readonly p25: number;
  readonly median: number;
  readonly p75: number;
  readonly max: number;
}

export interface SideBySideDeltas {
  readonly review_flag_delta: number; // track2 - legacy (0/1 booleans coerced)
  readonly shortfall_delta: number; // track2.length - legacy.length
  readonly missing_legacy_keys: readonly string[];
}

export interface SideBySideRow {
  readonly doc_id: string;
  readonly track2_metrics: {
    readonly review_flag: boolean;
    readonly shortfall_keys: readonly string[];
  };
  readonly legacy_metrics: {
    readonly review_flag: boolean;
    readonly shortfall_keys: readonly string[];
  };
  readonly deltas: SideBySideDeltas;
}

export interface AggregateReport {
  readonly version: string;
  readonly docs: readonly PerDocResult[];
  readonly hard_failure_count: number;
  readonly presence_rate_distribution: PresenceRateDistribution;
  readonly per_gate_failure_counts: Readonly<Record<string, number>>;
  readonly side_by_side_rows: readonly SideBySideRow[];
}

export interface SubstanceGateConfig {
  /** From Stage B archive-mining. Stage A has no default value. */
  readonly min_presence_rate?: number;
}

export interface ReplayRunConfig {
  readonly substance?: SubstanceGateConfig;
}
