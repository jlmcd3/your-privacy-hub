/**
 * C1.4 (doc 67 §2.1, 2026-08-25) — the recommendation-library SHAPE.
 *
 * Doc 67 §2.1 frames C1.4 as answering one question before C1.1b (the
 * W17/prose-gold/cyber-csc retirement decision) can be made: "does the
 * deterministic path still produce a controls[]-equivalent array; if so,
 * in what form." Answer: YES — it already exists as `component_coverage[]`
 * (Op. A, Item 315, `build.ts`). This file does not replace or duplicate
 * it; it EXTENDS it with the customer-facing richness the model path has
 * that Op. A's plain `remediation` string lacks — a PRIORITY tier, a
 * READER-FACING RANK, and a capped cross-cutting NEXT-STEPS digest with
 * owner/trigger — via a proper GAP-CLASS x VARIANT keying lookup instead
 * of ad hoc if/else branches, plus the S4 corpus commentary C1.3 staged
 * for exactly this consumer (see the `cyber_corpus_s4` comment in
 * index.ts: "not yet a customer-facing surface; C1.4's per-component
 * composer is what will read this").
 *
 * C2 RATIFICATION RECORD (2026-08-26) — the designed hand-edit happened.
 * The CEO's 2026-08-26 batch ruling ("I accept all of your
 * recommendations") + build directive, together with the CEO-identified
 * `CPPA_Cybersecurity_Cyber_Spine_v1.1_Current_Intake_Aligned` spine,
 * closed PN-C3's text space: the DRAFT prefixes are gone, every
 * `ratified` literal flipped to `true` by hand (the compile-error type
 * gate this file was built with worked exactly as designed), and the
 * text now renders on the deterministic path's Readiness Actions /
 * component modules (the v1.1 encode). Exact template bytes ride the
 * ADVANCE-RATIFICATION LEDGER for CEO redline (the RK3-C pattern);
 * spelling normalized to the fleet's US-spelling rule (artifact).
 *
 * Pure. No I/O. Never throws (callers wrap in try/catch per this file's
 * fail-open convention, matching every other deterministic pass in this
 * product).
 */

import type { CyberComponentCoverage, EvidenceSufficiency } from "./types.ts";
import type { CyberS4CommentaryEntry } from "../cyber-corpus-attach.ts";

// ── The gap-class taxonomy ──────────────────────────────────────────────
//
// Crosses Op. A's coverage verdict with Op. B's evidence sufficiency for
// the SAME component — something neither `component_coverage[].remediation`
// nor any other single field does today. `no_gap` is not a defect class;
// it is the closed set's "nothing to recommend" member, so every
// component maps to exactly one class, never zero, never more than one.
export type GapClass =
  | "no_record" // no controls[] entry for this component at all
  | "no_maturity_stated" // entry exists, maturity left blank
  | "not_implemented" // maturity maps to a not-implemented verdict
  | "partially_implemented" // maturity maps to a partially-implemented verdict
  | "evidence_insufficient" // maturity says implemented, but Op. B's evidence_sufficiency says insufficient/unknown for this SAME component
  | "no_gap"; // implemented AND evidence sufficient — nothing to recommend

export const GAP_CLASSES: readonly GapClass[] = [
  "no_record",
  "no_maturity_stated",
  "not_implemented",
  "partially_implemented",
  "evidence_insufficient",
  "no_gap",
];

/**
 * The variant axis operationalizes the W17-CYBER-BOILERPLATE BAN's own
 * substantive bar (index.ts prompt-law, "references at least one CONCRETE
 * INTAKE FACT... a headcount, a named framework, a date, an incident
 * count"): does THIS gap have a concrete, nameable fact to anchor a
 * sentence to (from `notes`, a named evidence type, or an S4 citation), or
 * not. `none` is reserved for `no_gap`, which has no sentence to anchor.
 */
export type RecommendationVariant = "fact_anchored" | "fact_absent" | "none";

export interface RecommendationKey {
  readonly gapClass: GapClass;
  readonly variant: RecommendationVariant;
}

/** Stable, sortable string form — the map key `lookupRecommendation` uses. */
export function keyToString(key: RecommendationKey): string {
  return `${key.gapClass}:${key.variant}`;
}

export interface RecommendationSlot {
  readonly key: RecommendationKey;
  /** Literal `true` — the designed C2 hand-edit happened 2026-08-26 (CEO
   * batch ruling + build directive; PN-C3's text space ratified under the
   * advance-ratification ledger, CEO redline note in the C2 landing). */
  readonly ratified: true;
  /** Ratified text. May contain the literal token "{fact}" as the single
   * interpolation point where a concrete intake fact belongs (only on
   * `fact_anchored` variants). */
  readonly template: string;
}

// DRAFT LIBRARY — every (gapClass, applicable variant) cell, closed and
// exhaustive (asserted by a dedicated test). `no_gap` has exactly one
// slot (variant "none"); every other class has both `fact_anchored` and
// `fact_absent` slots, since a gap can always be reasoned about with or
// without a concrete fact to anchor to.
export const CYBER_RECOMMENDATION_LIBRARY: readonly RecommendationSlot[] = [
  { key: { gapClass: "no_record", variant: "fact_absent" }, ratified: true,
    template: "Supply a record entry for this component; none exists on the intake." },
  { key: { gapClass: "no_record", variant: "fact_anchored" }, ratified: true,
    template: "Supply a record entry for this component; the intake names {fact} for related components but not this one." },

  { key: { gapClass: "no_maturity_stated", variant: "fact_absent" }, ratified: true,
    template: "Record the implementation status of this component using the maturity scale." },
  { key: { gapClass: "no_maturity_stated", variant: "fact_anchored" }, ratified: true,
    template: "Record the implementation status of this component using the maturity scale; the intake's note ({fact}) does not itself state a status." },

  { key: { gapClass: "not_implemented", variant: "fact_absent" }, ratified: true,
    template: "Implement this component and document the controls before the audit is certified." },
  { key: { gapClass: "not_implemented", variant: "fact_anchored" }, ratified: true,
    template: "Implement this component, building on {fact}, and document the controls before the audit is certified." },

  { key: { gapClass: "partially_implemented", variant: "fact_absent" }, ratified: true,
    template: "Complete implementation of this component across the systems in audit scope and record the completion date." },
  { key: { gapClass: "partially_implemented", variant: "fact_anchored" }, ratified: true,
    template: "Complete implementation of this component across the systems in audit scope, extending {fact}, and record the completion date." },

  { key: { gapClass: "evidence_insufficient", variant: "fact_absent" }, ratified: true,
    template: "A finding on this component would rest primarily on management assertion; retain a testable artifact (a log, a configuration export, an audit letter) rather than a description alone." },
  { key: { gapClass: "evidence_insufficient", variant: "fact_anchored" }, ratified: true,
    template: "The description ({fact}) is not itself a testable artifact; retain the underlying evidence (a log, a configuration export, an audit letter) so the position can be tested rather than asserted." },

  { key: { gapClass: "no_gap", variant: "none" }, ratified: true,
    template: "No remediation identified for this component." },
];

const LIBRARY_BY_KEY: ReadonlyMap<string, RecommendationSlot> = new Map(
  CYBER_RECOMMENDATION_LIBRARY.map((slot) => [keyToString(slot.key), slot]),
);

/** Throws only on a genuinely missing cell — a library-completeness bug,
 * never a runtime/intake-data condition (the resolver functions below
 * only ever construct keys the library actually carries). */
export function lookupRecommendation(key: RecommendationKey): RecommendationSlot {
  const slot = LIBRARY_BY_KEY.get(keyToString(key));
  if (!slot) throw new Error(`cyber-recommendations: no library slot for ${keyToString(key)}`);
  return slot;
}

// ── Resolution: coverage + evidence -> gap class + variant ─────────────

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function resolveGapClass(
  coverage: CyberComponentCoverage,
  evidence: EvidenceSufficiency | undefined,
): GapClass {
  if (coverage.status === "record_insufficient") {
    // Op. A's own two record_insufficient branches: no entry at all vs. an
    // entry with no maturity. Distinguished by whether ANY intake field
    // survived onto the record_fact sentence — cheapest reliable signal
    // without re-reading the raw intake here (this module only receives
    // Op. A/B's already-built output, by design: single-writer respecting,
    // matching cyber-csc.ts's own discipline of restating the record
    // rather than re-deriving it).
    return coverage.maturity ? "no_maturity_stated" : "no_record";
  }
  if (coverage.verdict === "not_satisfied") return "not_implemented";
  if (coverage.verdict === "partially_satisfied") return "partially_implemented";
  // verdict is "satisfied" here (the only remaining analysed outcome).
  if (evidence && (evidence.sufficiency === "insufficient" || evidence.sufficiency === "unknown")) {
    return "evidence_insufficient";
  }
  return "no_gap";
}

export function resolveVariant(
  gapClass: GapClass,
  coverage: CyberComponentCoverage,
): RecommendationVariant {
  if (gapClass === "no_gap") return "none";
  return s(coverage.record_fact).length > 0 || s(coverage.application).length > 0
    ? "fact_anchored"
    : "fact_absent";
}

// ── Priority and rank ────────────────────────────────────────────────
//
// DETERMINISTIC, derived purely from gap class — never model-guessed
// (the model schema's own `priority` field was free-text-guessed per
// document; this is a fixed, auditable mapping instead, one property
// C1.4's shape is strictly MORE rigorous about than the path it replaces).
export type PriorityTier = "Immediate" | "Within 90 days" | "Within 6 months" | "Monitor";

const PRIORITY_BY_GAP_CLASS: Readonly<Record<GapClass, PriorityTier>> = {
  no_record: "Immediate",
  no_maturity_stated: "Immediate",
  not_implemented: "Immediate",
  evidence_insufficient: "Within 90 days",
  partially_implemented: "Within 6 months",
  no_gap: "Monitor",
};

export function priorityForGapClass(gapClass: GapClass): PriorityTier {
  return PRIORITY_BY_GAP_CLASS[gapClass];
}

const PRIORITY_SORT_WEIGHT: Readonly<Record<PriorityTier, number>> = {
  "Immediate": 0,
  "Within 90 days": 1,
  "Within 6 months": 2,
  "Monitor": 3,
};

// ── The per-component recommendation ────────────────────────────────

export interface ComponentRecommendation {
  readonly slug: string;
  readonly label: string;
  readonly component_number: number;
  readonly key: RecommendationKey;
  readonly priority: PriorityTier;
  /** 1..N, unique, 1 = highest reader priority. Assigned only across
   * components with a real gap (no_gap components are omitted from
   * ranking, matching Op. C's own readiness_determination convention of
   * listing only blocking/unassessable components, never every row). */
  readonly rank: number;
  readonly slot: RecommendationSlot;
  /** The S4 corpus commentary C1.3 staged for this component, if any
   * (`attachCyberCorpus()`'s per-component entry) — closes the loop the
   * C1.3 landing comment in index.ts left open. Always >= 1 entry per
   * `CyberS4CommentaryEntry`'s own contract when supplied; absent only
   * when the caller didn't pass a corpus map (e.g. a unit test). */
  readonly corpus_commentary: readonly string[];
}

/**
 * One recommendation per component that has a real gap (`no_gap`
 * components are excluded entirely — matching the "recommendations
 * observe gaps, not a status roster" shape of every other recommendation
 * surface in this fleet). Deterministic order: priority tier, then
 * component_number ascending (stable, matches the statute's own
 * enumeration order for ties) — never intake-input order, so re-running
 * on an unchanged record always assigns the same ranks.
 */
export function buildCyberComponentRecommendations(
  coverage: readonly CyberComponentCoverage[],
  evidence: readonly EvidenceSufficiency[],
  corpusS4: readonly CyberS4CommentaryEntry[] = [],
): ComponentRecommendation[] {
  const evidenceBySlug = new Map(evidence.map((e) => [e.slug, e]));
  const corpusBySlug = new Map(corpusS4.map((e) => [e.slug, e]));

  const withGaps = coverage
    .map((c) => {
      const ev = evidenceBySlug.get(c.slug);
      const gapClass = resolveGapClass(c, ev);
      if (gapClass === "no_gap") return null;
      const variant = resolveVariant(gapClass, c);
      const key: RecommendationKey = { gapClass, variant };
      return {
        slug: c.slug,
        label: c.label,
        component_number: c.component_number,
        key,
        priority: priorityForGapClass(gapClass),
        slot: lookupRecommendation(key),
        corpus_commentary: corpusBySlug.get(c.slug)?.commentary ?? [],
      };
    })
    .filter((x): x is Omit<ComponentRecommendation, "rank"> => x !== null);

  withGaps.sort((a, b) =>
    PRIORITY_SORT_WEIGHT[a.priority] - PRIORITY_SORT_WEIGHT[b.priority] ||
    a.component_number - b.component_number
  );

  return withGaps.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── The cross-cutting next-steps digest ─────────────────────────────
//
// The model path's `next_steps[]` equivalent: capped at 3 (QB-P25 CYBER's
// own cap, reused deliberately — a proven, already-ratified UX constraint,
// not reinvented), each carrying an owner and a closing trigger. Text is
// draft/unratified, same PN-C3 gate as the per-component library.

export interface CyberNextStep {
  /** Ratified text (C2 hand-edit, 2026-08-26 — see the header note). */
  readonly text: string;
  readonly owner: string;
  readonly trigger: string;
  readonly ratified: true;
  readonly slug: string;
}

const NEXT_STEPS_CAP = 3;

export function buildCyberNextSteps(
  recommendations: readonly ComponentRecommendation[],
  remediationOwner: string,
): CyberNextStep[] {
  const owner = s(remediationOwner) || "the accountable owner named in the intake";
  return recommendations.slice(0, NEXT_STEPS_CAP).map((r) => ({
    text: r.slot.template,
    owner,
    trigger: `when ${r.label}'s maturity is recorded as implemented and evidenced by a testable artifact`,
    ratified: true,
    slug: r.slug,
  }));
}
