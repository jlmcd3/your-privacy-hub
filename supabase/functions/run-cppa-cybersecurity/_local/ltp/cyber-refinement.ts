/**
 * CPPA CYBER REFINEMENT PASS — item407 (cyber fleet-template package, leg D of
 * 4; the final build leg for cyber).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk,
 * item386 LIA, item395 ADMT, item403 Governance) applied to the CPPA
 * Cybersecurity Audit Readiness product. The engine — ./refinement-core.ts —
 * is UNTOUCHED (item-407 acceptance: a zero-line diff on the core): this
 * module is CONFIG ONLY, consuming the mined W1–W8 watchlist, `W-COPYEDIT`
 * and the xp-cyber designed-output exemplars from
 * `./cyber-refinement-config.ts` (item406 leg C).
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
 * CYBER PROTECTED-LEAF TAXONOMY (item407 §2) is enumerated below in eight
 * named classes so each carries its own refusal test. Two classes are cyber
 * specific and are the reason this taxonomy is not a copy of governance's:
 *   • C4 — the § 7121/§ 7122 AUDIT-SCHEDULE SENTENCES AND THEIR DATES, the
 *     corpus-pinned literals of `cyber-audit-schedule.ts` and the cohort-date
 *     truth table `risk-cohort-date-v2-truth-table-2026-07-27`. Absolutely
 *     barred from splicing; carried as a named barred-leaf canary.
 *   • C5 — `control_status_counts` and the typed aggregates item404 restored.
 *     The splicer must never rewrite arithmetic; the tally is typed, and prose
 *     points at it.
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
  CYBER_CRITIC_WATCHLIST,
  CYBER_VERIFIER_EXEMPLARS,
  CYBER_REFINEMENT_CONFIG_VERSION,
  CYBER_WATCH_CLASSES,
} from "./cyber-refinement-config.ts";
import { CYBER_SECTION_SPECS } from "../prose/plans/cyber.spine.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };
export {
  CYBER_CRITIC_WATCHLIST,
  CYBER_VERIFIER_EXEMPLARS,
  CYBER_REFINEMENT_CONFIG_VERSION,
  CYBER_WATCH_CLASSES,
};

export const CYBER_REFINEMENT_VERSION = "refine-cyber-2026-08-07-item407";

// ── PROTECTED-LEAF TAXONOMY (item407 §2) ────────────────────────────────────

/**
 * C1 — READINESS / VERDICT OUTCOME fields. The item404 readiness record is
 * deterministically derived; a model rewording the verdict is the specific
 * harm the taxonomy exists to prevent.
 */
export const CYBER_PROTECTED_READINESS_KEYS = [
  "readiness_determination",
  "independence_determination",
  "cyber_readiness_line",
  "readiness_line",
  "readiness_level",
  "rating",
  "rating_basis",
  "determined_from",
  "verdict",
  "decision",
  "determination",
  "determination_outcome",
  "outcome",
  "conclusion",
  "rule_ids",
  "rule_id",
] as const;

/** C2 — enum / date / name keys per the cyber report schema. */
export const CYBER_PROTECTED_ENUM_DATE_NAME_KEYS = [
  "status",
  "readiness",
  "level",
  "maturity",
  "priority",
  "severity",
  "risk_type",
  "impact",
  "likelihood",
  "industry",
  "framework",
  "in_scope_frameworks",
  "last_audit",
  "incidents_12mo",
  "auditor_engagement_status",
  "entity_name",
  "organisation_name",
  "organization_name",
  "owner",
  "date",
  "due_date",
  "deadline",
  "effective_date",
  "review_date",
  "generated_at",
] as const;

/** C3 — citations and any verbatim authority text. */
export const CYBER_PROTECTED_CITATION_KEYS = [
  "citation",
  "citations",
  "pinpoint",
  "subsection",
  "provision",
  "statutory_basis",
  "penalty_statutory_basis",
  "authority",
  "authority_exhibit",
  "citation_ledger",
  "verbatim_quote",
  "element_verbatim",
  "as_cited",
  "corpus_key",
  "proposition_key",
  "proposition_keys",
  "citation_verified",
  "pin_verified",
  "deadline_basis",
] as const;

/**
 * C4 — THE AUDIT-SCHEDULE SENTENCES AND THEIR DATES. The § 7121(a) phase-in
 * schedule, the resolved-cohort sentence and the § 7122 independence framing
 * are corpus-pinned literals (`cyber-audit-schedule.ts`), and the cohort dates
 * come from the pinned truth table `risk-cohort-date-v2-truth-table-2026-07-27`.
 * Barred from splicing outright.
 */
export const CYBER_PROTECTED_AUDIT_SCHEDULE_KEYS = [
  "audit_schedule",
  "audit_schedule_sentence",
  "phase_in_schedule",
  "schedule_literal",
  "resolved_cohort_sentence",
  "audit_cohort",
  "cohort",
  "cohort_band",
  "cohort_date",
  "first_audit_due",
  "audit_due_date",
  "band_label",
  "independence_framing",
] as const;

/**
 * C5 — the item404 TYPED AGGREGATES. The splicer must never rewrite
 * arithmetic: the tally is a typed object and prose points at it.
 */
export const CYBER_PROTECTED_AGGREGATE_KEYS = [
  "control_status_counts",
  "total_components",
  "scored_count",
  "insufficient_count",
  "mean_score",
  "mean_denominator",
  "by_status",
  "methodology_note",
  "overall_score",
  "score",
] as const;

/** C6 — machine identifiers the renderers key on. */
export const CYBER_PROTECTED_IDENTIFIER_KEYS = [
  "id",
  "key",
  "control_id",
  "component_id",
  "check_id",
  "finding_id",
  "assessment_id",
  "schema_version",
  "emit_gate",
  "build_stamp",
  "source_fields",
] as const;

/** C7 — declared anchorage (leg-C coverage L2). Never rewritten. */
export const CYBER_PROTECTED_ANCHORAGE_KEYS = [
  "anchor_keys",
  "anchor_key",
  "anchors",
] as const;

/**
 * C8 — the item404 spine section ids. COMPUTED from `cyber.spine.ts`, never
 * re-typed: a leaf whose KEY is a plan section id is the section's machine
 * address.
 */
export const CYBER_PROTECTED_SPINE_SECTION_IDS: readonly string[] =
  CYBER_SECTION_SPECS.map((s) => s.id);

export const CYBER_PROTECTED_LEAF_CLASSES = {
  readiness: CYBER_PROTECTED_READINESS_KEYS,
  enum_date_name: CYBER_PROTECTED_ENUM_DATE_NAME_KEYS,
  citation: CYBER_PROTECTED_CITATION_KEYS,
  audit_schedule: CYBER_PROTECTED_AUDIT_SCHEDULE_KEYS,
  typed_aggregate: CYBER_PROTECTED_AGGREGATE_KEYS,
  identifier: CYBER_PROTECTED_IDENTIFIER_KEYS,
  anchorage: CYBER_PROTECTED_ANCHORAGE_KEYS,
  spine_section_id: CYBER_PROTECTED_SPINE_SECTION_IDS,
} as const;

/**
 * PROTECTED ROOTS — a proposal may not enter these subtrees at all, at any
 * depth. The determination records, the typed tally, the byte-pinned schedule,
 * the authority surfaces and the disclaimers.
 *
 * C0 (2026-08-23, doc 24a §7.1's protection-bar landing, ahead of the
 * conversion's C1 determinism rewrite): added the three ITEM 315 typed
 * deliverable surfaces this list was missing (`component_coverage`,
 * `evidence_sufficiency`, `program_obligation_findings`,
 * `mean_score_readability_aid` — `readiness_determination` and
 * `independence_determination` were already here) and `skeleton_document`
 * (assembled after refinement runs today, so never reachable in practice —
 * protected now so the ordering can change during the conversion without
 * silently losing this guarantee). `fact_ledger` is NOT added here: it is
 * not currently persisted onto the report at all (see doc 24a's D3 finding —
 * the `_meta.internal.fact_ledger` comment at index.ts is stale), so there
 * is nothing yet to protect; add it here when C1 wires real persistence.
 */
export const CYBER_PROTECTED_ROOTS: string[] = [
  "readiness_determination",
  "independence_determination",
  "component_coverage",
  "evidence_sufficiency",
  "program_obligation_findings",
  "mean_score_readability_aid",
  "cyber_readiness_line",
  "control_status_counts",
  "audit_schedule",
  "authority_exhibit",
  "citation_ledger",
  "enforcement_meta",
  "disclaimer",
  "framework_disclaimer",
  "schema_version",
  "skeleton_document",
];

export const CYBER_PROTECTED_LEAF_KEYS: string[] = Array.from(
  new Set(Object.values(CYBER_PROTECTED_LEAF_CLASSES).flatMap((v) => [...v])),
);

// ── Config ──────────────────────────────────────────────────────────────────

export const CYBER_CRITIC_SYSTEM_PROMPT = composePrompt(
  CRITIC_PROMPT_BASE,
  CYBER_CRITIC_WATCHLIST,
);
export const CYBER_VERIFIER_SYSTEM_PROMPT = composePrompt(
  VERIFIER_PROMPT_BASE,
  CYBER_VERIFIER_EXEMPLARS,
);

export const CYBER_REFINEMENT_CONFIG: RefinementConfig = {
  product: "cppa-cyber",
  version: CYBER_REFINEMENT_VERSION,
  criticSystemPrompt: CYBER_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: CYBER_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: CYBER_PROTECTED_ROOTS,
  protectedLeafKeys: CYBER_PROTECTED_LEAF_KEYS,
};

export function isCyberProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, CYBER_REFINEMENT_CONFIG);
}

export function cyberProtectedReason(path: string): string | null {
  return protectedReasonFor(path, CYBER_REFINEMENT_CONFIG);
}

export function applyCyberSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, CYBER_REFINEMENT_CONFIG);
}

export async function runCyberRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, CYBER_REFINEMENT_CONFIG, opts);
}
