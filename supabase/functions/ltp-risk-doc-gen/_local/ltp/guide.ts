/**
 * LTP — GUIDE stage (Pass G) for cppa-risk.
 *
 * Candidate-set-closed selection over CPPA_RISK_PASSG_INDEX_BY_TEST. For each
 * Type-W proposition on the plan, emits WeighingFrameEntry rows drawn ONLY
 * from the pre-indexed candidate slice keyed by the weighing test id. Empty-
 * by-finding path emits an express-disclosure marker + telemetry hook for
 * the T5 ingestion feed (LEGAL-TEST Q4(c)).
 *
 * Persuasive-tier entries (analogy_fsor_internal, CPPA products only) carry
 * fsor_mediation_ref straight from the candidate row. GDPR/UK bridges are
 * impossible here by construction (product is CPPA-only).
 *
 * Pure; never throws.
 */
import type { RenderPlan, WeighingFrameEntry } from "../render-plan/schema.ts";
import { CPPA_RISK_PASSG_INDEX_BY_TEST } from "../pass-g/cppa-risk-candidate-index.ts";
import { WEIGHING_TESTS } from "../factors/cppa-risk-factors.ts";

export interface GuideResult {
  readonly frame: readonly WeighingFrameEntry[];
  readonly empty_by_finding: readonly string[]; // test_ids with no candidates
  readonly persuasive_count: number;
  readonly binding_count: number;
}

const TIER_WEIGHT: Record<string, number> = {
  primary: 0.5,
  supporting: 0.3,
  analogy_fsor_internal: 0.2,
};

export function runGuideStage(plan: RenderPlan): GuideResult {
  const frame: WeighingFrameEntry[] = [];
  const emptyByFinding: string[] = [];
  let persuasive = 0;
  let binding = 0;

  const testIds = new Set(
    plan.propositions
      .filter((p) => p.epistemic_type === "W" && p.weighing_frame_ref)
      .map((p) => p.weighing_frame_ref!.replace(/^wf\./, "")),
  );

  // Always seed the core § 7152 balance even if no Type-W props are present
  // (shadow-mode Derive may not emit them).
  for (const t of WEIGHING_TESTS) testIds.add(t.test_id);

  for (const testId of testIds) {
    const slice = CPPA_RISK_PASSG_INDEX_BY_TEST[testId];
    if (!slice || slice.candidates.length === 0) {
      emptyByFinding.push(testId);
      continue;
    }
    for (let i = 0; i < slice.candidates.length; i++) {
      const c = slice.candidates[i];
      const entry: WeighingFrameEntry = {
        frame_id: `wf.${testId}.${i}`,
        test_id: testId,
        jurisdiction_tag: slice.jurisdiction_tag,
        source: c.source,
        corpus_ref: c.corpus_ref,
        anchor_hint: c.anchor_hint,
        pinpoint: c.regulation_citation + (c.page_ref ? ` (${c.page_ref})` : ""),
        closeness_contribution: TIER_WEIGHT[c.tier_label] ?? 0.1,
        tier_label: c.tier_label,
        authority_weight: c.authority_weight,
        ...(c.authority_weight === "persuasive" && c.fsor_mediation_ref
          ? { fsor_mediation_ref: c.fsor_mediation_ref }
          : {}),
      };
      frame.push(entry);
      if (c.authority_weight === "persuasive") persuasive++;
      else binding++;
    }
  }

  return { frame, empty_by_finding: emptyByFinding, persuasive_count: persuasive, binding_count: binding };
}
