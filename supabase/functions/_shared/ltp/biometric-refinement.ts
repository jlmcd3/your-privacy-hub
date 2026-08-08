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
  parseJsonLoose,
  readPath,
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

// ── ITEM 412-C — MONOLITH-LEAF SPAN SPLICING + LEAF-INTEGRITY GUARD ─────────
//
// DIAGNOSIS (confirmed): the shared splicer's replacement semantics are
// NODE-LEVEL. `applySplicesWith` (refinement-core.ts:319) calls
// `writePath(report, f.path, f.replacement)` — the ENTIRE leaf becomes the
// replacement string. That is correct for every other product, whose leaves
// are sentence- or paragraph-sized. Biometric holds ~83% of its document in
// ONE leaf, `$.assessment_text`; a node-level replacement there is document
// destruction (re-pilot d2d75621: 14,058 B → 1,833 B on a single anchored
// splice). The core stays ZERO-LINE-DIFF; the correction lives here.
//
// TWO ADDITIVE MECHANISMS, both deterministic, both post-core:
//   1. SPAN SPLICE — for a monolith leaf, the double-anchored quote is located
//      inside the string and ONLY that span is replaced. Every byte outside
//      the span is identical, byte-for-byte.
//   2. LEAF-INTEGRITY GUARD — a splice whose applied length delta is not
//      exactly (replacement.length − quote.length), or which would shrink the
//      leaf below 90% of its pre-splice length, is REJECTED: the leaf is
//      restored byte-identical and the proposal is logged in the
//      `leaf_guard_rejected` bucket, with the bucket accounting rebalanced.
//
// No W-class, exemplar, verifier semantics or protected surface is weakened.

/** Leaves whose size makes node-level replacement unsafe. */
export const BIOMETRIC_MONOLITH_LEAF_PATHS: readonly string[] = ["$.assessment_text"];

/** A splice may never shrink a monolith leaf below this fraction of itself. */
export const BIOMETRIC_LEAF_MIN_RETAINED_FRACTION = 0.9;

export interface LeafGuardRejection {
  path: string;
  reason: "whole_leaf_replacement" | "length_delta_mismatch" | "shrank_below_floor" | "quote_absent";
  pre_length: number;
  attempted_length: number;
  expected_length: number;
}

export interface BiometricRefinementTelemetry extends RefinementTelemetry {
  /** ITEM 412-C — proposals killed by the leaf-integrity guard. */
  leaf_guard_rejected: { count: number; items: LeafGuardRejection[] };
  /** Monolith-leaf paths that were spliced SPAN-LEVEL (not node-level). */
  span_spliced_paths: string[];
}

/**
 * Replace ONLY the first occurrence of `quote` inside `pre` with
 * `replacement`. Returns null when the quote is not present.
 */
export function spanSplice(pre: string, quote: string, replacement: string): string | null {
  if (typeof pre !== "string" || typeof quote !== "string" || !quote) return null;
  const at = pre.indexOf(quote);
  if (at < 0) return null;
  return pre.slice(0, at) + replacement + pre.slice(at + quote.length);
}

/**
 * The deterministic leaf-integrity guard. `null` = accept; otherwise the
 * rejection record.
 */
export function checkLeafIntegrity(
  path: string,
  pre: string,
  post: string,
  quote: string,
  replacement: string,
): LeafGuardRejection | null {
  const expected = pre.length + (replacement.length - quote.length);
  const base = { path, pre_length: pre.length, attempted_length: post.length, expected_length: expected };
  if (!quote || !pre.includes(quote)) return { ...base, reason: "quote_absent" };
  if (post.length !== expected) {
    // A whole-leaf replacement is the named instance of this class.
    const whole = post === replacement && replacement.length !== pre.length;
    return { ...base, reason: whole ? "whole_leaf_replacement" : "length_delta_mismatch" };
  }
  if (post.length < Math.floor(pre.length * BIOMETRIC_LEAF_MIN_RETAINED_FRACTION)) {
    return { ...base, reason: "shrank_below_floor" };
  }
  return null;
}

function emptyLeafGuard(): { count: number; items: LeafGuardRejection[] } {
  return { count: 0, items: [] };
}

export async function runBiometricRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: RefinementRunOptions = {},
): Promise<BiometricRefinementTelemetry> {
  // Pre-splice snapshot of every monolith leaf.
  const pre = new Map<string, string>();
  for (const p of BIOMETRIC_MONOLITH_LEAF_PATHS) {
    const v = readPath(report, p);
    if (typeof v === "string") pre.set(p, v);
  }

  // Capture the critic's proposals so the monolith splice can be REDONE
  // span-level from the same (quote, replacement) pair the core used. The
  // critic call itself is untouched — this only observes its output.
  let proposals: CriticFinding[] = [];
  const observingDeps: RefinementDeps = {
    critic: async (system, user) => {
      const raw = await deps.critic(system, user);
      try {
        const parsed = parseJsonLoose(raw);
        if (parsed && Array.isArray(parsed.findings)) proposals = parsed.findings as CriticFinding[];
      } catch { /* fail-open: observation never breaks the pass */ }
      return raw;
    },
    verifier: deps.verifier,
  };

  const base = await runRefinement(report, intake, observingDeps, BIOMETRIC_REFINEMENT_CONFIG, opts);
  const tel = base as BiometricRefinementTelemetry;
  tel.leaf_guard_rejected = emptyLeafGuard();
  tel.span_spliced_paths = [];

  for (const [path, before] of pre) {
    const after = readPath(report, path);
    if (typeof after !== "string" || after === before) continue;
    // The core replaced the whole leaf. Recover the proposal and redo it as a
    // span splice, then run the guard on the result.
    const f = proposals.find((p) => p && p.path === path && typeof p.replacement === "string" &&
      p.replacement === after) ??
      proposals.find((p) => p && p.path === path);
    const quote = typeof f?.quote === "string" ? f.quote : "";
    const replacement = typeof f?.replacement === "string" ? f.replacement : after;
    const spanned = spanSplice(before, quote, replacement);
    const candidate = spanned ?? after;
    const rejection = spanned === null
      ? {
        path,
        reason: "quote_absent" as const,
        pre_length: before.length,
        attempted_length: after.length,
        expected_length: before.length,
      }
      : checkLeafIntegrity(path, before, candidate, quote, replacement);

    if (rejection) {
      // REJECT — restore the leaf byte-identical and rebalance the buckets.
      (report as Record<string, unknown>)[path.replace(/^\$\./, "")] = before;
      tel.leaf_guard_rejected.items.push(rejection);
      tel.leaf_guard_rejected.count++;
      if (tel.spliced > 0) tel.spliced--;
      tel.spliced_paths = tel.spliced_paths.filter((p) => p !== path);
      continue;
    }
    // ACCEPT — span-level, every byte outside the span identical.
    (report as Record<string, unknown>)[path.replace(/^\$\./, "")] = candidate;
    if (!tel.span_spliced_paths.includes(path)) tel.span_spliced_paths.push(path);
  }
  return tel;
}

