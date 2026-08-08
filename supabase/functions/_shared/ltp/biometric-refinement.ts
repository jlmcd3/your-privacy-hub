/**
 * BIOMETRIC REFINEMENT PASS — item412 (biometric fleet-template package, leg D
 * of 4; the final build leg for biometric).
 *
 * The ratified refinement template (item376/377 DPIA, item378 cppa-risk,
 * item386 LIA, item395 ADMT, item403 Governance, item407 Cyber) applied to the
 * Biometric Compliance Checker. The engine — ./refinement-core.ts — is
 * UNTOUCHED (item-412 acceptance: a zero-line diff on the core): this module is
 * CONFIG ONLY, consuming the mined W1–W8 watchlist, `W-COPYEDIT` and the
 * xp-bio designed-output exemplars from `./biometric-refinement-config.ts`
 * (item411 leg C).
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
 * BIOMETRIC PROTECTED-LEAF TAXONOMY (item412 §2) is enumerated below in eight
 * named classes so each carries its own refusal test. Two classes are biometric
 * specific and are the reason this taxonomy is not a copy of cyber's:
 *   • B3 — THE REFERENCE PASSAGES AND THEIR CITATIONS. Item409 made the statute
 *     the template: every statutory passage in this product is rendered
 *     byte-identical to its verified corpus row
 *     (`prose/biometric-reference-passages.ts`). `standard` — the leaf those
 *     passages land on in every duty finding, identifier characterization and
 *     exposure surface — is barred outright, and is carried as a named
 *     barred-leaf canary asserted byte-identical through a FULL refinement pass.
 *   • B4 — the four `emptyIsAnswer` approval fields and their rendered
 *     surfaces. `attestation` is barred as a whole root: an empty approver
 *     block is a MEANINGFUL answer in the item408 contract, and a model
 *     "improving" the signature block would manufacture an approval.
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
  BIOMETRIC_CRITIC_WATCHLIST,
  BIOMETRIC_VERIFIER_EXEMPLARS,
  BIOMETRIC_REFINEMENT_CONFIG_VERSION,
  BIOMETRIC_WATCH_CLASSES,
} from "./biometric-refinement-config.ts";
import { BIOMETRIC_SECTION_SPECS } from "../prose/plans/biometric.spine.ts";

export type { RefinementDeps, RefinementTelemetry, CriticFinding, SpliceResult };
export {
  BIOMETRIC_CRITIC_WATCHLIST,
  BIOMETRIC_VERIFIER_EXEMPLARS,
  BIOMETRIC_REFINEMENT_CONFIG_VERSION,
  BIOMETRIC_WATCH_CLASSES,
};

export const BIOMETRIC_REFINEMENT_VERSION = "refine-biometric-2026-08-08-item412";

// ── PROTECTED-LEAF TAXONOMY (item412 §2) ────────────────────────────────────

/**
 * B1 — APPLICABILITY / VERDICT OUTCOME fields. Every statute's applicability
 * verdict, every duty's met/not-met determination and every derived status are
 * deterministic outputs of the item308/310/312 deliverables builder. A model
 * rewording a verdict is the specific harm the taxonomy exists to prevent.
 */
export const BIOMETRIC_PROTECTED_VERDICT_KEYS = [
  "verdict",
  "status",
  "applicability",
  "applies",
  "applicability_verdict",
  "decision",
  "determination",
  "determination_outcome",
  "outcome",
  "conclusion",
  "conclusion_label",
  "record_backed",
  "corpus_status",
  "rule_ids",
  "rule_id",
] as const;

/** B2 — enum / date / name keys per the biometric report schema. */
export const BIOMETRIC_PROTECTED_ENUM_DATE_NAME_KEYS = [
  "statute_short",
  "jurisdiction",
  "jurisdictions",
  "modality",
  "modalities",
  "identifier_type",
  "organization_type",
  "organisation_type",
  "org_type",
  "purpose_code",
  "role",
  "intake_label",
  "label",
  "entity_name",
  "organization_name",
  "organisation_name",
  "date",
  "effective_date",
  "generated_at",
  "assessed_at",
] as const;

/**
 * B3 — THE REFERENCE PASSAGES AND THEIR CITATIONS (item409 statute-as-template).
 * `standard` is the leaf every verified corpus passage is rendered onto; the
 * citation family addresses the same authority. Absolutely barred from
 * splicing — carried as a named barred-leaf canary.
 */
export const BIOMETRIC_PROTECTED_REFERENCE_PASSAGE_KEYS = [
  "standard",
  "standard_text",
  "passage",
  "passage_text",
  "verbatim",
  "verbatim_quote",
  "quoted_text",
  "citation",
  "citations",
  "pinpoint",
  "subsection",
  "provision",
  "statutory_basis",
  "authority",
  "as_cited",
  "corpus_key",
  "corpus_row_id",
  "proposition_key",
  "proposition_keys",
  "citation_verified",
  "pin_verified",
] as const;

/**
 * B4 — the four item408 `emptyIsAnswer` APPROVAL FIELDS and their rendered
 * surfaces. An empty approver block is a meaningful answer, not a gap; a
 * proposal that fills or restyles it manufactures an approval.
 */
export const BIOMETRIC_PROTECTED_APPROVAL_KEYS = [
  "approved_by_name",
  "approved_by_title",
  "approval_date",
  "next_review_due",
  "review_triggers",
  "heading",
] as const;

/**
 * B5 — the SEPARATION OF DUTY AND CONSEQUENCE surfaces (items 308/310/312).
 * The exposure mechanism and the separation note are the structural guarantee
 * that penalty material never bleeds into a duty finding.
 */
export const BIOMETRIC_PROTECTED_SEPARATION_KEYS = [
  "separation_note",
  "mechanism",
  "reserved",
  "scope_gated",
  "duty",
  "statute_key",
  "statutes_in_scope",
] as const;

/** B6 — machine identifiers the renderers key on. */
export const BIOMETRIC_PROTECTED_IDENTIFIER_KEYS = [
  "id",
  "key",
  "check_id",
  "finding_id",
  "assessment_id",
  "schema_version",
  "version",
  "emit_gate",
  "build_stamp",
  "source_fields",
] as const;

/** B7 — declared anchorage (leg-C coverage). Never rewritten. */
export const BIOMETRIC_PROTECTED_ANCHORAGE_KEYS = [
  "anchor_keys",
  "anchor_key",
  "anchors",
] as const;

/**
 * B8 — the item409 spine section ids. COMPUTED from `biometric.spine.ts`,
 * never re-typed: a leaf whose KEY is a plan section id is the section's
 * machine address.
 */
export const BIOMETRIC_PROTECTED_SPINE_SECTION_IDS: readonly string[] =
  BIOMETRIC_SECTION_SPECS.map((s) => s.id);

export const BIOMETRIC_PROTECTED_LEAF_CLASSES = {
  verdict: BIOMETRIC_PROTECTED_VERDICT_KEYS,
  enum_date_name: BIOMETRIC_PROTECTED_ENUM_DATE_NAME_KEYS,
  reference_passage: BIOMETRIC_PROTECTED_REFERENCE_PASSAGE_KEYS,
  approval_field: BIOMETRIC_PROTECTED_APPROVAL_KEYS,
  separation: BIOMETRIC_PROTECTED_SEPARATION_KEYS,
  identifier: BIOMETRIC_PROTECTED_IDENTIFIER_KEYS,
  anchorage: BIOMETRIC_PROTECTED_ANCHORAGE_KEYS,
  spine_section_id: BIOMETRIC_PROTECTED_SPINE_SECTION_IDS,
} as const;

/**
 * PROTECTED ROOTS — a proposal may not enter these subtrees at all, at any
 * depth: the statute inventory, the attestation block, the scope-gated corpus
 * flags and the disclaimers.
 */
export const BIOMETRIC_PROTECTED_ROOTS: string[] = [
  "statutes_in_scope",
  "attestation",
  "scope_gated",
  "disclaimer",
  "standing_disclaimer",
  "enforcement_meta",
  "schema_version",
];

export const BIOMETRIC_PROTECTED_LEAF_KEYS: string[] = Array.from(
  new Set(Object.values(BIOMETRIC_PROTECTED_LEAF_CLASSES).flatMap((v) => [...v])),
);

// ── Config ──────────────────────────────────────────────────────────────────

export const BIOMETRIC_CRITIC_SYSTEM_PROMPT = composePrompt(
  CRITIC_PROMPT_BASE,
  BIOMETRIC_CRITIC_WATCHLIST,
);
export const BIOMETRIC_VERIFIER_SYSTEM_PROMPT = composePrompt(
  VERIFIER_PROMPT_BASE,
  BIOMETRIC_VERIFIER_EXEMPLARS,
);

export const BIOMETRIC_REFINEMENT_CONFIG: RefinementConfig = {
  product: "biometric",
  version: BIOMETRIC_REFINEMENT_VERSION,
  criticSystemPrompt: BIOMETRIC_CRITIC_SYSTEM_PROMPT,
  verifierSystemPrompt: BIOMETRIC_VERIFIER_SYSTEM_PROMPT,
  protectedRootKeys: BIOMETRIC_PROTECTED_ROOTS,
  protectedLeafKeys: BIOMETRIC_PROTECTED_LEAF_KEYS,
};

export function isBiometricProtectedPath(path: string): boolean {
  return isProtectedPathFor(path, BIOMETRIC_REFINEMENT_CONFIG);
}

export function biometricProtectedReason(path: string): string | null {
  return protectedReasonFor(path, BIOMETRIC_REFINEMENT_CONFIG);
}

export function applyBiometricSplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  return applySplicesWith(report, approved, BIOMETRIC_REFINEMENT_CONFIG);
}

export async function runBiometricRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  return await runRefinement(report, intake, deps, BIOMETRIC_REFINEMENT_CONFIG, opts);
}
