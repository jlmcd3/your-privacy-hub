/**
 * CPPA RISK REFINEMENT PASS — item378.
 *
 * The ratified DPIA refinement template (item376/377) applied to cppa-risk.
 * Same engine (./refinement-core.ts), same critic/verifier core prompts, same
 * containment rules, same telemetry (full bucket accounting + findings_log).
 * Only the product block appended to each prompt and the protected-leaf set
 * differ.
 *
 * Architecture: CRITIC (Claude) -> VERIFIER (GPT-4o) -> DETERMINISTIC SPLICER.
 * FAIL-OPEN throughout; the document always proceeds.
 */

import {
  CRITIC_PROMPT_BASE,
  VERIFIER_PROMPT_BASE,
  composePrompt,
  applySplicesWith,
  isProtectedPathFor,
  protectedReasonFor,
  runRefinement,
  type RefinementConfig,
  type RefinementDeps,
  type RefinementRunOptions,
  type RefinementTelemetry,
  type CriticFinding,
  type SpliceResult,
} from "./refinement-core.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };

export const RISK_REFINEMENT_VERSION = "refine-risk-2026-08-05-item378";

// ── Product blocks (CEO-specified, verbatim) ─────────────────────────────────

export const RISK_CRITIC_WATCHLIST =
  `W1 Invented business facts: revenue figures, user counts, vendors, systems, workflows, or beneficiaries not in the intake — this product's dominant historical defect. W2 Mis-attached citations: a real § 7150–7157 or Civ. Code cite applied to the wrong proposition. W3 False absence: claims the record does not supply something the intake supplies (check both directions; honest absence on a silent record is correct). W4 Internal vocabulary: raw intake field ids (i5_admt_logic, q19_admt_description, i7_internal_contributors, i1b_min_pi, impact_intake, q15c_spi_volume, etc.) or engine terms in customer prose. W5 Interchangeable filler: stock sentences repeated across adverse_effects, safeguard_gaps, or priority_actions where fact-specific reasoning belongs. W6 Generic § 7152(a)(4) recitals: benefits citations naming no benefit, no beneficiary, and no concrete outcome.`;

export const RISK_VERIFIER_EXEMPLARS =
  `strengthen_item_ids pointer arrays and their single-home strengthen_items text; the § 7152 four-value likelihood/severity enums (terseness is designed); priority_actions[].rank values (mechanically renumbered); the frozen information_needed contract and its structured asks; canonical advisory closes; '[TO BE COMPLETED …]' where the intake is silent; plain-prose FSOR/Agency citations; corpus-verified recent law (as in the DPIA exemplars).`;

export const RISK_CRITIC_SYSTEM_PROMPT = composePrompt(CRITIC_PROMPT_BASE, RISK_CRITIC_WATCHLIST);
export const RISK_VERIFIER_SYSTEM_PROMPT = composePrompt(VERIFIER_PROMPT_BASE, RISK_VERIFIER_EXEMPLARS);

// ── Protected surfaces ───────────────────────────────────────────────────────

export const RISK_PROTECTED_ROOT_KEYS = [
  "framework_disclaimer",
  "guidance_verbatim",
];

/** DPIA leaf set + the risk-specific structured leaves (item378 Deliverable 2). */
export const RISK_PROTECTED_LEAF_KEYS = [
  "name",
  "role",
  "approved_by_name",
  "approved_by_title",
  "approval_date",
  "status",
  "citation",
  "template_ref",
  "risk_id",
  "rule_id",
  "likelihood",
  "severity",
  // item378 additions
  "rank",
  "harm",
  "safeguard_status",
  "element",
  "necessity",
];

export const RISK_REFINEMENT_CONFIG: RefinementConfig = {
  product: "cppa-risk",
  version: RISK_REFINEMENT_VERSION,
  criticSystemPrompt: RISK_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: RISK_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: RISK_PROTECTED_ROOT_KEYS,
  protectedLeafKeys: RISK_PROTECTED_LEAF_KEYS,
};

export function isRiskProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, RISK_REFINEMENT_CONFIG);
}

export function riskProtectedReason(path: string): string | null {
  return protectedReasonFor(path, RISK_REFINEMENT_CONFIG);
}

export function applyRiskSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, RISK_REFINEMENT_CONFIG);
}

export async function runRiskRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, RISK_REFINEMENT_CONFIG, opts);
}
