/**
 * LIA REFINEMENT PASS — item386 (LIA fleet-template package, leg 3 of 3).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk)
 * applied to the LIA. The engine — ./refinement-core.ts — is UNTOUCHED: this
 * module is CONFIG ONLY, consuming the mined W1–W7 watchlist and the xp-lia
 * designed-output exemplars from `./lia-refinement-config.ts` (item385 leg 2).
 *
 * Architecture: CRITIC (Claude) -> VERIFIER (GPT-4o) -> DETERMINISTIC SPLICER.
 * Every core invariant is inherited unchanged from refinement-core.ts:
 *   • the critic sees the document WITHOUT `_meta` (stripMeta)
 *   • impossible proposals (protected path, quote not present at the node) are
 *     killed deterministically BEFORE the verifier call
 *   • the verifier receives per-proposal `node_content`
 *   • condition (5) is the necessity condition
 *   • MAX_SPLICES = 12
 *   • the splicer is double-anchored (path resolves AND the quote survives)
 *     and `_meta` is barred in code
 *   • FAIL-OPEN in every branch — the document always proceeds
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
} from "../../../_shared/ltp/refinement-core.ts";
import {
  LIA_CRITIC_WATCHLIST,
  LIA_CRITIC_CONTAINMENT,
  LIA_VERIFIER_EXEMPLARS,
  LIA_PROTECTED_ROOT_KEYS,
  LIA_PROTECTED_LEAF_KEYS,
  LIA_PROTECTED_PATH_PREFIXES,
  LIA_REFINEMENT_CONFIG_VERSION,
} from "./lia-refinement-config.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };
export {
  LIA_CRITIC_WATCHLIST,
  LIA_CRITIC_CONTAINMENT,
  LIA_VERIFIER_EXEMPLARS,
  LIA_PROTECTED_ROOT_KEYS,
  LIA_PROTECTED_LEAF_KEYS,
  LIA_PROTECTED_PATH_PREFIXES,
  LIA_REFINEMENT_CONFIG_VERSION,
};

// L0 (doc 10 §3, 2026-08-25) — version bump for the path-prefix bar; see
// lia-refinement-config.ts's header comment for the verified gap this closes.
export const LIA_REFINEMENT_VERSION = "refine-lia-2026-08-25-item-l0";

export const LIA_CRITIC_SYSTEM_PROMPT = composePrompt(
  composePrompt(CRITIC_PROMPT_BASE, LIA_CRITIC_WATCHLIST),
  LIA_CRITIC_CONTAINMENT,
);
export const LIA_VERIFIER_SYSTEM_PROMPT = composePrompt(VERIFIER_PROMPT_BASE, LIA_VERIFIER_EXEMPLARS);

export const LIA_REFINEMENT_CONFIG: RefinementConfig = {
  product: "lia",
  version: LIA_REFINEMENT_VERSION,
  criticSystemPrompt: LIA_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: LIA_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: LIA_PROTECTED_ROOT_KEYS,
  protectedLeafKeys: LIA_PROTECTED_LEAF_KEYS,
  protectedPathPrefixes: LIA_PROTECTED_PATH_PREFIXES,
};

export function isLiaProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, LIA_REFINEMENT_CONFIG);
}

export function liaProtectedReason(path: string): string | null {
  return protectedReasonFor(path, LIA_REFINEMENT_CONFIG);
}

export function applyLiaSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, LIA_REFINEMENT_CONFIG);
}

export async function runLiaRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, LIA_REFINEMENT_CONFIG, opts);
}
