/**
 * ITEM 354 — CUSTOMER-SURFACE PROJECTIONS (rendering only; no analytics).
 *
 * Item 353 Phase-2 FAILURE 1: `risk_level`, `overall_score` and
 * `risk_register` shipped the RAW engine factor table (16 rows carrying
 * `factor_id`, `present_in_intake`, `intake_ledger_refs`, `guidance_refs`
 * `.source_table`) on the customer surface. Those identifiers are
 * INTERNAL-FORBIDDEN, and `risk_level`'s legacy contract is a scalar human
 * band ("Low" | "Moderate" | "High" | "Critical" | "Insufficient basis";
 * src/components/cppa/RiskAssessmentReportV4.tsx:48).
 *
 * This module holds the projections from the plan's ALREADY-COMPUTED
 * determinations to the customer contracts. It computes NO new analytics:
 *  - the risk band is a finite mapping over `aggregateBalance(plan)`, the
 *    single balance determination every cppa-risk composer already reads;
 *  - the registers are label/citation renderings of factor rows the engine
 *    already produced.
 * The factor tables themselves stay internal (`_meta.internal.factor_table`).
 */
import type { RenderPlan, FactorTableEntry } from "../render-plan/schema.ts";
import type { OverallRiskLevel } from "./risk-level-map.ts";
import { aggregateBalance, type BalanceMode } from "./section-composers/cppa-risk.ts";

export const CUSTOMER_PROJECTION_VERSION = "cppa-risk-customer-projection@2026-08-01-item354";

/** Engine identifiers that must never appear on a customer surface. */
export const INTERNAL_FORBIDDEN_TOKENS: readonly string[] = [
  "factor_id",
  "present_in_intake",
  "intake_ledger_refs",
  "guidance_refs",
  "source_table",
  "jurisdiction_tag",
  "weight_note",
  "info_emit_gate_",
];

/**
 * Finite mapping: engine balance determination → customer risk band.
 * `negative` maps to "High"; "Critical" remains reachable only through the
 * risk-level-map precedence law (severity/likelihood trigger), which is not
 * re-derived here — see `criticalTrigger()` below.
 */
const BAND_BY_BALANCE_MODE: Readonly<Record<BalanceMode, OverallRiskLevel>> = {
  insufficient: "Insufficient basis",
  negative: "High",
  hedged: "Moderate",
  firm: "Low",
};

const CRITICAL_SEVERITY = "Severe";
const CRITICAL_LIKELIHOOD = "Highly likely";

function criticalTrigger(plan: RenderPlan): boolean {
  return plan.factor_table.some((r) => {
    if (r.kind !== "negative_impact") return false;
    const label = `${r.display_label ?? ""} ${r.weight_note ?? ""}`;
    return label.includes(CRITICAL_SEVERITY) || label.includes(CRITICAL_LIKELIHOOD);
  });
}

/** CUSTOMER CONTRACT: rendered scalar, one of the five bands. */
export function projectRiskLevel(plan: RenderPlan): OverallRiskLevel {
  const mode = aggregateBalance(plan);
  const band = BAND_BY_BALANCE_MODE[mode] ?? "Insufficient basis";
  if (band === "High" && criticalTrigger(plan)) return "Critical";
  return band;
}

/**
 * CUSTOMER CONTRACT: rendered scalar (number 0–100) or null.
 * The LTP risk engine produces a BAND, not a 0–100 readiness score (that
 * scale belongs to the cybersecurity-audit product). Shipping null keeps the
 * key present and the legacy renderer's `overall_score != null` guard hides
 * the row rather than printing an engine structure.
 */
export function projectOverallScore(_plan: RenderPlan): number | null {
  return null;
}

/** Customer-shaped register entry. Keys are a subset of RISK_ENTRY_KEYS. */
export interface CustomerRiskEntry {
  readonly title: string;
  readonly description: string;
  readonly citation: string;
  readonly status: string;
}

const STATUS_PRESENT = "Documented on the record";
const STATUS_ABSENT = "Not present in the record as documented";

function entryFor(row: FactorTableEntry): CustomerRiskEntry {
  const title = (row.display_label ?? "").trim() || "This factor";
  const note = (row.weight_note ?? "").trim();
  return {
    title,
    description: note ||
      (row.present_in_intake
        ? `${title} is documented on the assessment record.`
        : `${title} is not documented on the assessment record.`),
    citation: row.anchor?.pinpoint ?? "",
    status: row.present_in_intake ? STATUS_PRESENT : STATUS_ABSENT,
  };
}

/** CUSTOMER CONTRACT: structured-but-customer-shaped; negative-impact rows. */
export function projectRiskRegister(plan: RenderPlan): CustomerRiskEntry[] {
  return plan.factor_table
    .filter((r) => r.kind === "negative_impact")
    .map(entryFor);
}

/**
 * CUSTOMER CONTRACT: structured-but-customer-shaped. Deterministic rank —
 * documented negative impacts first, then undocumented ones (the engine's
 * own row order is preserved within each group; no new scoring).
 */
export function projectTopRisks(plan: RenderPlan): CustomerRiskEntry[] {
  const negatives = plan.factor_table.filter((r) => r.kind === "negative_impact");
  return [
    ...negatives.filter((r) => r.present_in_intake),
    ...negatives.filter((r) => !r.present_in_intake),
  ].map(entryFor);
}

/** The engine tables, for `_meta.internal` only. Never a customer surface. */
export function internalFactorTables(plan: RenderPlan): Record<string, unknown> {
  return {
    factor_table: plan.factor_table,
    balance_mode: aggregateBalance(plan),
    projection_version: CUSTOMER_PROJECTION_VERSION,
  };
}
