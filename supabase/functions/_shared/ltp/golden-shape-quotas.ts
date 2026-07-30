/**
 * LTP — GOLDEN-SHAPE QUOTAS (Item 241.1, per Item 241 Checkpoint 1).
 *
 * Depth telemetry ONLY. Measures per-section character and item counts on
 * the SHIPPED report and reports any shortfalls against the empirically
 * derived top-50 legacy cppa-risk quotas. NEVER deletes or edits report
 * content — production behavior is telemetry + review-flag on shortfall.
 *
 * The quota table below is the initial imposition set from the Item 241
 * spec. Item 241.2 (registry content authoring) and Item 241.3 (wiring +
 * gap-driven action composer) tighten the shape; this module's contract
 * remains "measure and flag", never mutate.
 */
export const GOLDEN_SHAPE_QUOTAS_VERSION = "golden-shape-quotas-cppa-risk-2026-07-28-item241-1";

export interface QuotaSpec {
  /** report_data key. */
  readonly key: string;
  /** How to interpret the value. */
  readonly kind: "scalar" | "narrative_bag" | "list";
  /** Minimum char count for scalar/narrative_bag OR for the whole list. */
  readonly min_chars?: number;
  /** Minimum item count (list only). */
  readonly min_items?: number;
  /** Minimum average chars per item (list only). */
  readonly min_chars_per_item?: number;
  /** Human-readable target from the top-50 empirical study. */
  readonly target_note: string;
}

/** Empirical quotas from the Item 241 spec (n=50 legacy corpus). */
export const CPPA_RISK_GOLDEN_QUOTAS: readonly QuotaSpec[] = [
  {
    key: "executive_summary",
    kind: "scalar",
    min_chars: 200,
    target_note: "counsel-voice exec summary; leads with customer context",
  },
  {
    key: "assessment_summary",
    kind: "narrative_bag",
    min_chars: 300,
    target_note: "assessment_summary.narrative — balance prose in counsel voice",
  },
  {
    key: "scope_and_triggers",
    kind: "list",
    // ITEM 272: quota counts § 7150(b) prongs; the OAL-approved text has SIX.
    min_items: 6,
    target_note: "one instance per § 7150(b) prong; engaged prongs lead",
  },
  {
    key: "scope_confirmation",
    kind: "list",
    // ITEM 272: quota counts § 7150(b) prongs; the OAL-approved text has SIX.
    min_items: 6,
    target_note: "one instance per § 7150(b) prong; engaged prongs lead",
  },
  {
    key: "risk_assessment_by_activity",
    kind: "list",
    min_items: 1,
    min_chars_per_item: 800,
    target_note: "per-activity rationale ~1,215 chars (record-status → colorable-argument → countervailing → outcome)",
  },
  {
    key: "priority_actions",
    kind: "list",
    min_items: 5,
    min_chars_per_item: 400,
    target_note: "gap-driven, ~11 items × ~747 chars four-move (target)",
  },
  {
    key: "next_steps",
    kind: "list",
    min_items: 1,
    target_note: "safeguard-confirmation steps",
  },
  {
    key: "record_sufficiency",
    kind: "list",
    min_items: 1,
    min_chars: 500,
    target_note: "~845 chars flowing prose per shipped section (aggregate)",
  },
  {
    key: "information_needed",
    kind: "list",
    min_items: 1,
    target_note: "substantial items — every Type-J reserved judgment",
  },
];

export interface SectionQuotaResult {
  readonly key: string;
  readonly kind: QuotaSpec["kind"];
  readonly present: boolean;
  readonly chars: number;
  readonly items: number;
  readonly avg_chars_per_item: number;
  readonly meets_quota: boolean;
  readonly shortfall_reasons: readonly string[];
}

export interface GoldenShapeReport {
  readonly version: string;
  readonly sections: readonly SectionQuotaResult[];
  readonly review_flag: boolean;
  readonly shortfall_keys: readonly string[];
}

function stringChars(v: unknown): number {
  return typeof v === "string" ? v.length : 0;
}

function measure(spec: QuotaSpec, raw: unknown): SectionQuotaResult {
  const shortfalls: string[] = [];
  let present = false;
  let chars = 0;
  let items = 0;
  if (spec.kind === "scalar") {
    if (typeof raw === "string" && raw.trim().length > 0) {
      present = true;
      chars = raw.length;
    }
    if (spec.min_chars !== undefined && chars < spec.min_chars) {
      shortfalls.push(`min_chars:${chars}<${spec.min_chars}`);
    }
    if (!present) shortfalls.push("absent");
  } else if (spec.kind === "narrative_bag") {
    if (raw && typeof raw === "object") {
      const narrative = (raw as { narrative?: unknown }).narrative;
      if (typeof narrative === "string" && narrative.trim().length > 0) {
        present = true;
        chars = narrative.length;
      }
    }
    if (spec.min_chars !== undefined && chars < spec.min_chars) {
      shortfalls.push(`narrative_min_chars:${chars}<${spec.min_chars}`);
    }
    if (!present) shortfalls.push("narrative_absent");
  } else {
    // list
    if (Array.isArray(raw)) {
      present = raw.length > 0;
      items = raw.length;
      for (const it of raw) {
        if (typeof it === "string") chars += it.length;
        else if (it && typeof it === "object") chars += JSON.stringify(it).length;
      }
    }
    if (spec.min_items !== undefined && items < spec.min_items) {
      shortfalls.push(`min_items:${items}<${spec.min_items}`);
    }
    if (spec.min_chars !== undefined && chars < spec.min_chars) {
      shortfalls.push(`aggregate_min_chars:${chars}<${spec.min_chars}`);
    }
    if (spec.min_chars_per_item !== undefined) {
      const avg = items > 0 ? Math.round(chars / items) : 0;
      if (avg < spec.min_chars_per_item) {
        shortfalls.push(`avg_chars_per_item:${avg}<${spec.min_chars_per_item}`);
      }
    }
  }
  const avg_chars_per_item = items > 0 ? Math.round(chars / items) : 0;
  return {
    key: spec.key,
    kind: spec.kind,
    present,
    chars,
    items,
    avg_chars_per_item,
    meets_quota: shortfalls.length === 0,
    shortfall_reasons: shortfalls,
  };
}

/** Measure a shipped report against the golden-shape quotas. Never mutates. */
export function evaluateGoldenShape(
  report: Record<string, unknown>,
  quotas: readonly QuotaSpec[] = CPPA_RISK_GOLDEN_QUOTAS,
): GoldenShapeReport {
  const sections = quotas.map((q) => measure(q, report[q.key]));
  const shortfalls = sections.filter((s) => !s.meets_quota).map((s) => s.key);
  return {
    version: GOLDEN_SHAPE_QUOTAS_VERSION,
    sections,
    review_flag: shortfalls.length > 0,
    shortfall_keys: shortfalls,
  };
}
