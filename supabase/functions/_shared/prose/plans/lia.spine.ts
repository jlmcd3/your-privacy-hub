// ITEM 382 — LIA GOLD-STANDARD PROSE ENCODE.
//
// SOURCE OF TRUTH: `prose_document_plans` row c9b3d942-83b9-4aac-859d-b507c1f2ef37
// (product = lia, approved = true, version `prose-plans-2026-08-04-item364-d2`).
// That row is the CEO's approval act. It is NEVER written by code. This module
// is a FAITHFUL ENCODE of it: section ids, titles, arc stages, leads, source
// keys and themes are transcribed verbatim so the runtime renders the arc the
// panel approved. `tests/edge/item382/plan-fidelity.test.ts` asserts this encode
// against the row's JSON with the version string hard-coded, so any drift in
// either direction breaks the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDER IS FACT-EXEMPT — HARD RULE.
//
// The approved reference render (the "Meridian Insights" LIA) is an
// ARCHITECTURE AND REGISTER reference ONLY. No fact, name, figure, entity or
// scenario from it may ever reach a customer document. Every fact in a
// customer document comes from the record being assessed and from nowhere
// else. `REFERENCE_RENDER_TOKENS` below exists so the battery test in
// `tests/edge/item382/register-battery.test.ts` can prove that no LIA builder
// literal carries a token from the reference render.
// ─────────────────────────────────────────────────────────────────────────────

export const LIA_PLAN_ROW_ID = "c9b3d942-83b9-4aac-859d-b507c1f2ef37";
export const LIA_PLAN_VERSION = "prose-plans-2026-08-04-item364-d2";

/** The finalize-point stamp written into `_meta.internal.lia_pipeline_stamp`. */
export const LIA_PIPELINE_STAMP = "lia-pipeline@item382-2026-08-05";

/** Transcribed verbatim from the approved plan row. */
export const LIA_THESIS =
  "This assessment decides whether the interest this organisation stated can carry the processing it described once the effect on the people involved is weighed against it, and that weighing is the document. Where the record leaves a side of the weighing empty the assessment says which side and what would fill it.";

export type LiaArcStage =
  | "headline"
  | "record"
  | "analysis"
  | "duty"
  | "ask"
  | "remedy"
  | "close";

export type LiaLead = "determination" | "record";

export interface LiaSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: LiaArcStage;
  readonly lead: LiaLead;
  readonly source_key: string;
  readonly themes: readonly string[];
}

/**
 * The 14-section arc, in plan order:
 *   headline determination → the record → the analysis chain culminating in
 *   "The balance" → comparable decisions → what the record does not yet state
 *   → what to write down next → the attestation close.
 *
 * DETERMINATION-LEAD DISCIPLINE: sections with `lead: "determination"` open
 * with the finding; sections with `lead: "record"` open with the record.
 */
export const LIA_SECTION_SPECS: readonly LiaSectionSpec[] = [
  {
    id: "determination",
    title: "Determination",
    arc_stage: "headline",
    lead: "determination",
    source_key: "lia_determination",
    themes: ["outcome", "carrying_reason", "residual_uncertainty"],
  },
  {
    id: "classification",
    title: "The processing as the organisation described it",
    arc_stage: "record",
    lead: "record",
    source_key: "classification",
    themes: ["parties", "activity", "data", "subjects", "jurisdiction"],
  },
  {
    id: "interest_legitimacy",
    title: "The interest and whether it is a legitimate one",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "interest_legitimacy",
    themes: ["purpose_stage", "interest_stated", "sub_test_reasoning", "cumulative_view"],
  },
  {
    id: "benefit_and_beneficiary",
    title: "What the processing achieves, and for whom",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "benefit_and_beneficiary",
    themes: ["purpose_stage", "benefit", "beneficiary", "specificity"],
  },
  {
    id: "alternatives_considered",
    title: "Whether a less intrusive route was available",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "alternatives_considered",
    themes: ["necessity_stage", "alternatives", "why_inadequate", "consent_route"],
  },
  {
    id: "relationship_with_individual",
    title: "The relationship between the organisation and the people affected",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "relationship_with_individual",
    themes: ["balancing_stage", "relationship", "expectation", "power_imbalance"],
  },
  {
    id: "scale_frequency_duration",
    title: "How much processing, how often, and for how long",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "scale_frequency_duration",
    themes: ["balancing_stage", "scale", "frequency", "duration"],
  },
  {
    id: "potential_harms",
    title: "What could go wrong for the people affected",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "potential_harms",
    themes: ["balancing_stage", "harms", "severity", "bearing_on_balance"],
  },
  {
    id: "opt_out_feasibility",
    title: "Whether the people affected can stop it",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "opt_out_feasibility",
    themes: ["balancing_stage", "feasibility", "mechanism", "weight_as_mitigation"],
  },
  {
    id: "balancing",
    title: "The balance",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "three_part_test.balancing_test",
    themes: ["balancing_stage", "case_for", "case_against", "weighing", "outcome"],
  },
  {
    id: "comparable_decisions",
    title: "Comparable regulator decisions",
    arc_stage: "duty",
    lead: "determination",
    source_key: "enforcement_precedents",
    themes: ["framing", "analogy"],
  },
  {
    id: "information_needed",
    title: "What the record does not yet state",
    arc_stage: "ask",
    lead: "record",
    source_key: "information_needed",
    themes: ["silent_fields", "hedged_answers", "effect_on_the_weighing"],
  },
  {
    id: "documentation_recommendations",
    title: "What to write down next",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "documentation_recommendations",
    themes: ["immediate", "conditions"],
  },
  {
    id: "attestation_block",
    title: "Review, approval, and when this must be looked at again",
    arc_stage: "close",
    lead: "determination",
    source_key: "attestation_block",
    themes: ["review", "approval", "triggers", "counsel_reservation"],
  },
] as const;

/** Section id → plan title. Renderers must title sections from here. */
export function liaSectionTitle(id: string, fallback = ""): string {
  return LIA_SECTION_SPECS.find((s) => s.id === id)?.title ?? fallback;
}

export function liaSectionSpec(id: string): LiaSectionSpec | undefined {
  return LIA_SECTION_SPECS.find((s) => s.id === id);
}

/** The document's centre of gravity — everything before it ascends to it. */
export const LIA_CENTRE_OF_GRAVITY = "balancing";

/**
 * REGISTER — LABELS.
 *
 * Enum verdict tokens are cross-product identifiers (risk and DPIA read the
 * same strings) and are NOT renamed here. LIA-owned renderers put them through
 * this map so the customer never reads a de-underscored identifier or the
 * banned "on the record" idiom.
 */
const LIA_VERDICT_LABELS: Record<string, string> = {
  undetermined_on_the_record: "not yet determined",
  disproportionate_on_the_record: "disproportionate",
  legitimate_interest_established: "legitimate interest established",
  legitimate_interest_not_established: "legitimate interest not established",
  legitimate_interest_unresolved: "legitimate interest unresolved",
  not_met: "not met",
  met: "met",
  partly_expected: "partly expected",
  basis_unavailable: "basis unavailable",
};

export function liaVerdictLabel(v: unknown): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  return LIA_VERDICT_LABELS[raw] ?? raw.replace(/_/g, " ");
}

/**
 * Tokens from the fact-exempt reference render. None of these may appear in a
 * builder literal. See the HARD RULE at the top of this file.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Meridian",
  "Meridian Insights",
  "conversion funnel",
  "funnel measurement",
  "funnel-measurement",
  "marketing efficiency",
  "enquiry form",
];

/**
 * Banned register idiom classes for the LIA battery test. The plan's register
 * states the same truths plainly: name the missing entry and what closes it.
 */
export const LIA_BANNED_REGISTER: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "on_the_record", re: /\bon the (?:present )?record\b/i },
  { id: "upon_the_record", re: /\bupon the record\b/i },
  { id: "please", re: /\bplease\b/i },
  { id: "courtroom_herein", re: /\bherein\b|\baforementioned\b|\bthe undersigned\b|\bhereby\b/i },
  { id: "internal_vocabulary", re: /\bemit[- ]gate\b|\bdegraded leaf\b|\bboilerplate cap\b|\bintake key\b/i },
];
