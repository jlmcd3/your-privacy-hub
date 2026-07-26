/**
 * LTP Risk Surface Map — CONTENT-ANCHORED COURIER (2026-07-26).
 *
 * Releases item 143b HELD-B. Binds Pass-2 templates to the live
 * cppa-risk report_data shape verified via query_database. Courier-only
 * edits; do not adjust without a new content-anchored dispatch.
 *
 * Companion files: pass1-derive-prompt.ts, renderplan-wire-schema.ts,
 * pass2-templates.ts, passv-verify-prompt.ts.
 */

export const RISK_SURFACE_MAP_VERSION = "risk-surface-map-2026-07-26";

export type TemplateId =
  | "T.risk.applicability.engaged"
  | "T.risk.applicability.not_engaged"
  | "T.risk.cohort"
  | "T.risk.documentation.present"
  | "T.risk.documentation.gap"
  | "T.risk.balance.firm"
  | "T.risk.balance.hedged"
  | "T.risk.admt.consequence_suppressed"
  | "T.risk.review_items"
  | "T.risk.closing.reserved";

export interface SurfaceBinding {
  /** Dotted path into report_data. Array-of-object surfaces use `[]`. */
  readonly path: string;
  /** Templates permitted to render into this surface, or the special
   *  "deterministic" sentinel for owner-emitters (e.g. T7 opening). */
  readonly templates: readonly (TemplateId | "deterministic" | "token-list" | "citation-only" | "intake-verbatim")[];
  /** Optional human note. Not consumed by the runtime. */
  readonly note?: string;
}

export const RISK_SURFACE_BINDINGS: readonly SurfaceBinding[] = [
  // Deterministic / owner-emitters — leave in place.
  { path: "opening_summary", templates: ["deterministic"], note: "T7 deterministic emitter — UNCHANGED." },

  // Applicability (Type R) — one template per § 7150(b) prong.
  {
    path: "scope_and_triggers.triggered_activities_detail",
    templates: ["T.risk.applicability.engaged", "T.risk.applicability.not_engaged"],
    note: "One rendering per § 7150(b) prong from Type R propositions.",
  },

  // The Type W balance surface — per activity.
  {
    path: "risk_assessment_by_activity[].benefits_outweigh_risks_rationale",
    templates: ["T.risk.balance.firm", "T.risk.balance.hedged"],
    note: "Derive stage emits factor_table rows carrying activity_ref; closeness evaluated per activity.",
  },

  // Bounded token-list renderings.
  { path: "risk_assessment_by_activity[].benefits_to_business", templates: ["token-list"] },
  { path: "risk_assessment_by_activity[].benefits_to_consumers", templates: ["token-list"] },
  { path: "risk_assessment_by_activity[].adverse_effects", templates: ["token-list"] },
  { path: "risk_assessment_by_activity[].current_safeguards", templates: ["token-list"] },

  // Citation-only surfaces — registry-resolved tokens; model never types glyphs.
  { path: "risk_assessment_by_activity[].statutory_basis", templates: ["citation-only"] },
  { path: "risk_assessment_by_activity[].section_7152_mapping", templates: ["citation-only"] },

  // Intake verbatim.
  { path: "risk_assessment_by_activity[].purpose", templates: ["intake-verbatim"] },

  // Customer questions from gate/validator outputs (B4-style empty filter stays).
  { path: "information_needed", templates: ["T.risk.documentation.gap"] },
  { path: "risk_assessment_by_activity[].information_needed", templates: ["T.risk.documentation.gap"] },

  // Bounded actions from gate outcomes + safeguard_gaps (Type R only).
  { path: "priority_actions", templates: ["T.risk.documentation.gap", "T.risk.documentation.present"] },

  // Assessment summary — answer-first template composition. Calibration
  // MUST match the balance variant (firm summary forbidden when any
  // activity rendered hedged — post-render assert).
  {
    path: "assessment_summary",
    templates: ["T.risk.balance.firm", "T.risk.balance.hedged", "T.risk.closing.reserved"],
    note: "Closing template T.risk.closing.reserved binds to the final paragraph slot.",
  },

  // Exception analysis — Type R over exceptions_intake fields.
  { path: "exception_analysis", templates: ["T.risk.documentation.present", "T.risk.documentation.gap"] },

  // Deterministic cohort/deadline emitters (§ 7157 / § 7121 registry; V2 bands).
  { path: "submission_summary", templates: ["T.risk.cohort"] },

  // Bounded lists from validator/factor outputs.
  { path: "record_sufficiency", templates: ["T.risk.documentation.present", "T.risk.documentation.gap"] },
  { path: "strengthen_items", templates: ["T.risk.documentation.gap"] },

  // Enforcement — verified CPPA-domain rows only. None exist today; the
  // model must never write enforcement prose here (standing line or
  // empty-by-finding omission).
  { path: "enforcement_context", templates: ["deterministic"] },

  // Unchanged this wave.
  { path: "attestation_block", templates: ["deterministic"] },
  { path: "document_metadata", templates: ["deterministic"] },
  { path: "risk_register", templates: ["deterministic"] },
  { path: "schema_version", templates: ["deterministic"] },
  { path: "_meta", templates: ["deterministic"] },
] as const;

/**
 * Item-136 CUT execution sites.
 *
 * scope_and_triggers.scope_notes            → CUT
 * cross_tool_recommendations                → CUT
 * inconsistency_flags                       → TEMPLATE_CUT
 *   (key NAME retained for renderer compatibility; content = validator/
 *   gate-derived customer questions via T.risk.review_items only).
 *
 * Renderer-tolerance audit (this turn):
 *   src/components/cppa/RiskAssessmentReportV4.tsx — all three keys
 *     guarded with `|| []` / `|| {}` / conditional checks; safe to
 *     empty or remove without breaking the component.
 *   supabase/functions/generate-report-pdf/index.ts — same, guarded
 *     with Array.isArray / conditional presence checks.
 *   src/components/refine/RefinePanel.tsx — comment reference only.
 * All three renderers tolerate absent/empty keys, so cuts execute at
 * the LEAK-PREV-P2 serializer layer via allow-list removal and object
 * pruning; no _meta.internal deprecation fallback required.
 */
export interface CutRuling {
  readonly path: string;
  readonly mode: "REMOVE" | "EMPTY_ARRAY" | "OBJECT_PRUNE";
  readonly rationale: string;
}

export const RISK_CUT_RULINGS: readonly CutRuling[] = [
  {
    path: "scope_and_triggers.scope_notes",
    mode: "OBJECT_PRUNE",
    rationale: "CUT — leak/fragment history; no defending class. Renderers guarded.",
  },
  {
    path: "cross_tool_recommendations",
    mode: "REMOVE",
    rationale: "CUT — module-name leak history; belongs in product UI. Renderers guarded.",
  },
  {
    path: "inconsistency_flags",
    mode: "EMPTY_ARRAY",
    rationale:
      "TEMPLATE_CUT — key retained for renderer compatibility; content restricted to T.risk.review_items output.",
  },
] as const;

/**
 * Pass-V invocation map. Verification is bounded by construction:
 *   (1) risk_assessment_by_activity[].benefits_outweigh_risks_rationale
 *       when variant=hedged OR closeness ≥ design threshold.
 *   (2) assessment_summary whenever any activity was hedged.
 *   (3) Any section carrying persuasive-marked content (currently none
 *       possible; wired for future material).
 * Nothing else.
 */
export interface PassVTrigger {
  readonly path: string;
  readonly condition: "variant_hedged_or_close" | "any_activity_hedged" | "persuasive_marked_present";
}

export const RISK_PASSV_INVOCATION_MAP: readonly PassVTrigger[] = [
  {
    path: "risk_assessment_by_activity[].benefits_outweigh_risks_rationale",
    condition: "variant_hedged_or_close",
  },
  { path: "assessment_summary", condition: "any_activity_hedged" },
  { path: "*", condition: "persuasive_marked_present" },
] as const;
