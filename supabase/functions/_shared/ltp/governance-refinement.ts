/**
 * GOVERNANCE REFINEMENT PASS — item403 (Governance leg D of 4; last build leg
 * of P5).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk,
 * item386 LIA, item395 ADMT) applied to the Governance Assessment. The engine
 * — ./refinement-core.ts — is UNTOUCHED: this module is CONFIG ONLY, consuming
 * the mined W1–W8 watchlist, `W-COPYEDIT` and the xp-gov designed-output
 * exemplars from `./governance-refinement-config.ts` (item402 leg C).
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
 *
 * GOVERNANCE PROTECTED-LEAF TAXONOMY (item403 §2) is enumerated below in
 * seven named classes so each carries its own refusal test. The first class is
 * the item402 `readiness_determination` record: it is DETERMINISTICALLY
 * DERIVED from the accountability determination and its siblings, and a model
 * rewording the verdict is the specific harm the taxonomy exists to prevent.
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
  GOVERNANCE_CRITIC_WATCHLIST,
  GOVERNANCE_VERIFIER_EXEMPLARS,
  GOVERNANCE_PROTECTED_ROOT_KEYS,
  GOVERNANCE_PROTECTED_LEAF_KEYS as CONFIG_PROTECTED_LEAF_KEYS,
  GOVERNANCE_REFINEMENT_CONFIG_VERSION,
  GOVERNANCE_WATCH_CLASSES,
} from "./governance-refinement-config.ts";
import { GOVERNANCE_SECTION_SPECS } from "../prose/plans/governance.spine.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };
export {
  GOVERNANCE_CRITIC_WATCHLIST,
  GOVERNANCE_VERIFIER_EXEMPLARS,
  GOVERNANCE_REFINEMENT_CONFIG_VERSION,
  GOVERNANCE_WATCH_CLASSES,
};

export const GOVERNANCE_REFINEMENT_VERSION = "refine-governance-2026-08-07-item403";

// ── PROTECTED-LEAF TAXONOMY (item403 §2) ────────────────────────────────────

/**
 * C1 — the item402 READINESS RECORD and all its leaves. Deterministically
 * derived by `governance-readiness.ts` from `accountability_determination` and
 * its siblings; no model may re-word any part of it. (`readiness_determination`
 * and `governance_readiness_line` are ALSO protected roots in the leg-C config,
 * so the whole subtree is barred twice over — belt and braces by design.)
 */
export const GOVERNANCE_PROTECTED_READINESS_KEYS = [
  "readiness_determination",
  "governance_readiness_line",
  "readiness_line",
  "rating",
  "rating_basis",
  "determined_from",
] as const;

/**
 * C2 — DETERMINATION OUTCOME fields. Every `*_determination` record's outcome
 * leaves, plus the outcome vocabulary the deliverables builder writes.
 */
export const GOVERNANCE_PROTECTED_DETERMINATION_KEYS = [
  "verdict",
  "decision",
  "determination",
  "determination_outcome",
  "outcome",
  "conclusion",
  "exemption_applies",
  "designation_required",
  "rule_ids",
  "rule_id",
] as const;

/**
 * C2b — the determination RECORDS themselves, treated as protected roots so a
 * proposal may not enter the record and re-word the reasoning that carries the
 * outcome. `readiness_determination` is already a leg-C root; its siblings are
 * added here.
 */
export const GOVERNANCE_PROTECTED_DETERMINATION_ROOTS = [
  "accountability_determination",
  "art30_exemption_determination",
  "dpo_determination",
  "risk_calibration_finding",
  "review_and_update_finding",
] as const;

/** C3 — enum / date / name keys per the governance report schema. */
export const GOVERNANCE_PROTECTED_ENUM_DATE_NAME_KEYS = [
  "severity",
  "status",
  "priority",
  "tier",
  "maturity_tier",
  "overall_readiness_rating",
  "domain",
  "sector",
  "org_size",
  "jurisdiction",
  "jurisdictions",
  "date",
  "due_date",
  "effective_date",
  "review_date",
  "measures_last_review_date",
  "generated_at",
  "owner",
  "organisation_name",
  "controller_name",
  "dpo_name",
] as const;

/** C4 — citations and any verbatim authority text. */
export const GOVERNANCE_PROTECTED_CITATION_KEYS = [
  "citation",
  "citations",
  "pinpoint",
  "subsection",
  "provision",
  "standard",
  "authority",
  "governing_anchor",
  "benchmark_verbatim",
  "element_verbatim",
  "verbatim_quote",
  "as_cited",
  "corpus_key",
  "proposition_key",
  "proposition_keys",
  "citation_verified",
  "pin_verified",
] as const;

/** C5 — machine identifiers the renderers key on. */
export const GOVERNANCE_PROTECTED_IDENTIFIER_KEYS = [
  "id",
  "element_id",
  "finding_id",
  "domain_id",
  "control_id",
  "tracker_id",
  "check_id",
  "assessment_id",
  "governance_id",
  "emit_gate",
  "build_stamp",
] as const;

/** C6 — declared anchorage (leg-C coverage L2). Never rewritten. */
export const GOVERNANCE_PROTECTED_ANCHORAGE_KEYS = [
  "anchor_keys",
  "anchor_key",
  "anchors",
] as const;

/**
 * C7 — the item400 spine section ids. COMPUTED from the spine, never re-typed:
 * a leaf whose KEY is a plan section id is the section's machine address.
 */
export const GOVERNANCE_PROTECTED_SPINE_SECTION_IDS: readonly string[] =
  GOVERNANCE_SECTION_SPECS.map((s) => s.id);

export const GOVERNANCE_PROTECTED_LEAF_CLASSES = {
  readiness: GOVERNANCE_PROTECTED_READINESS_KEYS,
  determination: GOVERNANCE_PROTECTED_DETERMINATION_KEYS,
  enum_date_name: GOVERNANCE_PROTECTED_ENUM_DATE_NAME_KEYS,
  citation: GOVERNANCE_PROTECTED_CITATION_KEYS,
  identifier: GOVERNANCE_PROTECTED_IDENTIFIER_KEYS,
  anchorage: GOVERNANCE_PROTECTED_ANCHORAGE_KEYS,
  spine_section_id: GOVERNANCE_PROTECTED_SPINE_SECTION_IDS,
} as const;

/** Leg-C leaf keys UNION the leg-D taxonomy — leg C is never narrowed. */
export const GOVERNANCE_PROTECTED_LEAF_KEYS: string[] = Array.from(
  new Set([
    ...CONFIG_PROTECTED_LEAF_KEYS,
    ...Object.values(GOVERNANCE_PROTECTED_LEAF_CLASSES).flatMap((v) => [...v]),
  ]),
);

/** Leg-C protected roots UNION the determination records. */
export const GOVERNANCE_PROTECTED_ROOTS: string[] = Array.from(
  new Set([
    ...GOVERNANCE_PROTECTED_ROOT_KEYS,
    ...GOVERNANCE_PROTECTED_DETERMINATION_ROOTS,
  ]),
);

// ── Config ──────────────────────────────────────────────────────────────────

export const GOVERNANCE_CRITIC_SYSTEM_PROMPT = composePrompt(
  CRITIC_PROMPT_BASE,
  GOVERNANCE_CRITIC_WATCHLIST,
);
export const GOVERNANCE_VERIFIER_SYSTEM_PROMPT = composePrompt(
  VERIFIER_PROMPT_BASE,
  GOVERNANCE_VERIFIER_EXEMPLARS,
);

export const GOVERNANCE_REFINEMENT_CONFIG: RefinementConfig = {
  product: "governance",
  version: GOVERNANCE_REFINEMENT_VERSION,
  criticSystemPrompt: GOVERNANCE_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: GOVERNANCE_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: GOVERNANCE_PROTECTED_ROOTS,
  protectedLeafKeys: GOVERNANCE_PROTECTED_LEAF_KEYS,
};

export function isGovernanceProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, GOVERNANCE_REFINEMENT_CONFIG);
}

export function governanceProtectedReason(path: string): string | null {
  return protectedReasonFor(path, GOVERNANCE_REFINEMENT_CONFIG);
}

export function applyGovernanceSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, GOVERNANCE_REFINEMENT_CONFIG);
}

export async function runGovernanceRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, GOVERNANCE_REFINEMENT_CONFIG, opts);
}
