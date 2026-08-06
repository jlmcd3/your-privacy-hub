/**
 * ADMT REFINEMENT PASS — item395 (ADMT fleet-template package, leg D of 4).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk,
 * item386 LIA) applied to the CPPA ADMT product. The engine —
 * ./refinement-core.ts — is UNTOUCHED: this module is CONFIG ONLY, consuming
 * the mined W1–W7 watchlist and the xp-admt designed-output exemplars from
 * `./admt-refinement-config.ts` (item394 leg C).
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
} from "./refinement-core.ts";
import {
  ADMT_CRITIC_WATCHLIST,
  ADMT_VERIFIER_EXEMPLARS,
  ADMT_PROTECTED_ROOT_KEYS,
  ADMT_PROTECTED_LEAF_KEYS,
  ADMT_PROTECTED_LEAF_CLASSES,
  ADMT_REFINEMENT_CONFIG_VERSION,
} from "./admt-refinement-config.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };
export {
  ADMT_CRITIC_WATCHLIST,
  ADMT_VERIFIER_EXEMPLARS,
  ADMT_PROTECTED_ROOT_KEYS,
  ADMT_PROTECTED_LEAF_KEYS,
  ADMT_PROTECTED_LEAF_CLASSES,
  ADMT_REFINEMENT_CONFIG_VERSION,
};

export const ADMT_REFINEMENT_VERSION = "refine-admt-2026-08-06-item395";

export const ADMT_CRITIC_SYSTEM_PROMPT = composePrompt(CRITIC_PROMPT_BASE, ADMT_CRITIC_WATCHLIST);
export const ADMT_VERIFIER_SYSTEM_PROMPT = composePrompt(
  VERIFIER_PROMPT_BASE,
  ADMT_VERIFIER_EXEMPLARS,
);

export const ADMT_REFINEMENT_CONFIG: RefinementConfig = {
  product: "cppa-admt",
  version: ADMT_REFINEMENT_VERSION,
  criticSystemPrompt: ADMT_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: ADMT_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: ADMT_PROTECTED_ROOT_KEYS,
  protectedLeafKeys: ADMT_PROTECTED_LEAF_KEYS,
};

export function isAdmtProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, ADMT_REFINEMENT_CONFIG);
}

export function admtProtectedReason(path: string): string | null {
  return protectedReasonFor(path, ADMT_REFINEMENT_CONFIG);
}

export function applyAdmtSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, ADMT_REFINEMENT_CONFIG);
}

export async function runAdmtRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, ADMT_REFINEMENT_CONFIG, opts);
}
