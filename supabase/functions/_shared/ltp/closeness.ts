/**
 * LTP — Deterministic closeness heuristic + Type-W template variant chooser.
 *
 * Combines Pass-1 factor-table signal with Pass-G guidance weight into a
 * single scalar in [0,1] where 1 = firmly lopsided (choose "firm" variant)
 * and 0 = perfectly close (choose "hedged" variant with what-would-tip-it).
 *
 * Pure; never throws.
 */
import type { RenderPlan, WeighingFrameEntry } from "../render-plan/schema.ts";

export type Variant = "firm" | "hedged";

export function computeCloseness(plan: RenderPlan, frame: readonly WeighingFrameEntry[]): number {
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake).length;
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake).length;
  const safeguards = plan.factor_table.filter((f) => f.kind === "safeguard" && f.present_in_intake).length;

  // Factor imbalance in [0,1]; when nothing is present we default to 0.5 (close).
  const denom = Math.max(1, benefits + negatives);
  const factorImbalance = Math.abs(benefits - negatives) / denom;

  // Guidance contribution sums closeness_contribution across the frame.
  const guidance = frame.reduce((acc, e) => acc + (e.closeness_contribution ?? 0), 0);
  const guidanceNorm = Math.min(1, guidance);

  const safeguardBoost = Math.min(0.2, safeguards * 0.05);

  const raw = 0.5 * factorImbalance + 0.4 * guidanceNorm + 0.1 * safeguardBoost;
  return Math.max(0, Math.min(1, raw));
}

export function chooseVariant(closeness: number, threshold = 0.6): Variant {
  // ITEM 236 fix (b) — CEO ruling: at closeness ≥ threshold the balance
  // is close enough that firm assertion is not warranted; hedge and
  // surface what would tip it. Below threshold → firm.
  return closeness >= threshold ? "hedged" : "firm";
}
