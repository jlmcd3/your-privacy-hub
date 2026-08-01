/**
 * LTP — VERIFY stage (Pass V).
 *
 * MODEL-ONLY per CEO ruling 2026-07-26 (item 136): NO human legal review at
 * any pipeline stage. Pass V is a bounded model read over close-call Type W
 * sections and persuasive-material sections. Evidence-gated: two consecutive
 * waves of zero yield beyond deterministic assertions → retire for the product.
 *
 * Phase-2 landing: flag-gated (env `LTP_VERIFY_ENABLED=1`); returns a
 * disabled result otherwise. When enabled the actual model call is deferred
 * to Wave B (this scaffold records the invocation surface and telemetry
 * shape only). Pure; never throws.
 */
import type { RenderPlan, WeighingFrameEntry } from "../../../_shared/render-plan/schema.ts";

export interface VerifyResult {
  readonly enabled: boolean;
  readonly ran: boolean;
  readonly sections_examined: number;
  readonly yield_findings: number;
  readonly notes: readonly string[];
}

export function runVerifyStage(
  plan: RenderPlan,
  frame: readonly WeighingFrameEntry[],
  closeness: number,
): VerifyResult {
  const enabled = (globalThis as any).Deno?.env?.get?.("LTP_VERIFY_ENABLED") === "1";
  if (!enabled) {
    return { enabled: false, ran: false, sections_examined: 0, yield_findings: 0, notes: ["verify_disabled_by_flag"] };
  }
  // Close-call sections are Type W propositions where closeness < 0.6, plus
  // any persuasive frame entries.
  const closeCallProps = plan.propositions.filter((p) => p.epistemic_type === "W");
  const persuasiveFrame = frame.filter((f) => f.authority_weight === "persuasive");
  const sectionsExamined = (closeness < 0.6 ? closeCallProps.length : 0) + persuasiveFrame.length;
  return {
    enabled: true,
    ran: true,
    sections_examined: sectionsExamined,
    yield_findings: 0, // real model read wired in Wave B
    notes: ["verify_scaffold_only_wave_b_pending"],
  };
}
