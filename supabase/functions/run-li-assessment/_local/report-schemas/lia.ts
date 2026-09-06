// LEAK-PREV-P2 — LIA customer-report schema.
// Version: rs-lia-w1-2026-07-25
//
// Top-level allow-list derived from run-li-assessment/index.ts assembler
// (`reportData.<key> = ...` at the terminal_complete assembly, ~L1549) and
// src/components/LIAssessmentResult surfaces.
//
// `_meta.internal` is preserved verbatim by the serializer so build-stamp
// echo keys (`_meta.internal.lia_w1`, `_meta.internal.emit_gate`,
// `_meta.internal.serializer`) survive P2 whitelist serialization — this is
// the wave-21 admt telemetry-gap lesson (items 47/49) applied at LIA wiring
// time. `build_stamp` is additionally declared top-level so digests can
// confirm build-of-record from a doc without depending on `_meta`.
//
// Nested pruning: intentionally NOT declared. LIA section objects
// (three_part_test, documentation_recommendations) have wide and evolving
// key sets; per-entry pruning would risk dropping a legitimate model-emitted
// field. Top-level whitelist alone is sufficient to enforce "unknown-key-
// cannot-ship" at the section granularity that has ever been reviewed.

// UPGRADE-4 — nested allow-lists follow the risk rs-w2 precedent
// (report-schemas/cppa-risk.ts): object keys whose full key set has been
// reviewed get an `objects` entry; array-of-object keys get an `entries`
// entry. Sections whose key sets are still evolving (three_part_test,
// documentation_recommendations) remain top-level-only by design.

import type { ReportSchema } from "../../../_shared/report-serialize.ts";

/** Shared four-part analysis shape carried by every UPGRADE-4 finding. */
const ANALYSIS_SHAPE_KEYS = [
  "standard",
  "standard_citation",
  "record_fact",
  "application",
  "supporting_citation",
  "supporting_verbatim",
  "status",
  "information_needed",
] as const;

const INTEREST_LEGITIMACY_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "verdict",
  "sub_tests",
  "cumulative_note",
] as const;

const BENEFIT_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "benefit",
  "beneficiaries",
  "beneficiary_labels",
  "benefit_is_generic",
] as const;

const ALTERNATIVES_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "alternatives",
  "count_with_rationale",
  "consent_addressed",
] as const;

const RELATIONSHIP_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "category",
  "category_label",
  "explicitly_recorded",
  "power_imbalance",
] as const;

const SCALE_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "dimensions",
  "dimensions_recorded",
  "large_scale_indicated",
] as const;

const HARMS_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "harms",
  "worst_case_severity",
  "material_weight_against_controller",
] as const;

const OPT_OUT_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "feasibility",
  "mechanism",
  "counts_as_mitigation",
] as const;

// DOC 73 §4 (R2), 2026-08-26 — precedent-class posture finding. Computed
// and persisted on EVERY run (telemetry + T2/T3 curation visibility)
// regardless of LIA_PRECEDENT_CLASS_RATIFIED; the ratification gate
// controls whether skeleton_document's prose includes it, not whether it
// is computed or schema-allowed. `authorities` is array-of-object and
// passes through whole per the NESTED-ARRAY NOTE below — its key set is
// PRECEDENT_CLASS_AUTHORITY_ENTRY_KEYS.
const PRECEDENT_CLASS_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "use_case_class",
  "use_case_label",
  "posture",
  "authorities",
  "factor_ids",
  "map_version",
] as const;

// L1 PRE-LANDING (doc 62 §5 B5), 2026-08-26 — the ePrivacy short-circuit
// gate finding. Computed and persisted on EVERY run (telemetry + audit)
// regardless of LIA_EPRIVACY_GATE_RATIFIED; the ratification gate controls
// whether skeleton_document's prose may ever include it (no such wiring
// exists yet), not whether it is computed or schema-allowed.
// `trigger_phrases` is a string array and passes through as a leaf.
const EPRIVACY_SHORT_CIRCUIT_KEYS = [
  ...ANALYSIS_SHAPE_KEYS,
  "determination",
  "li_foreclosed_for_covered_processing",
  "trigger_basis",
  "trigger_phrases",
  "indication_unresolved",
  // DOC 189 (2026-09-05) — the two device-access answers the gate read.
  "device_access_recorded",
  "device_access_strictly_necessary_recorded",
  "corpus_row_id",
] as const;

const ATTESTATION_BLOCK_KEYS = [
  "text",
  "attested",
  "dpo_review",
  "approvers",
  "approval_date",
  "review_triggers",
  "triggers_are_default",
  "citation",
  "authority_verbatim",
  "status",
  "information_needed",
] as const;

/** Array-entry key sets. */
const SUB_TEST_ENTRY_KEYS = ["id", "label", "verdict", "reasoning", "information_needed"] as const;
const ALTERNATIVE_ENTRY_KEYS = ["alternative", "why_inadequate", "rationale_recorded"] as const;
const DIMENSION_ENTRY_KEYS = ["id", "label", "recorded", "status"] as const;
const HARM_ENTRY_KEYS = ["harm", "severity", "bearing_on_balance"] as const;
// UPGRADE-4 ITEM 3 — shared authority exhibit (report-exhibits/authority-exhibit.ts).
// Mirrors AuthorityExhibit: {version, heading, entries[]}.
const AUTHORITY_EXHIBIT_ENTRY_KEYS = ["version", "heading", "entries"] as const;
// DOC 73 §4 (R2) — precedent_class_posture.authorities entry keys
// (PrecedentClassAuthority, lia-deliverables/types.ts). Passes through
// whole per the NESTED-ARRAY NOTE below.
const PRECEDENT_CLASS_AUTHORITY_ENTRY_KEYS = [
  "source_row_id",
  "regulator",
  "subject",
  "jurisdiction",
  "decision_date",
  "case_reference",
  "fine_eur",
  "what_happened",
] as const;


export const LIA_REPORT_SCHEMA: ReportSchema = {
  version: "rs-lia-w5-2026-08-26-eprivacy-gate",
  tool: "li_assessment",
  topLevel: [
    // Core assembly
    "assessment_id",
    "generated_at",
    "classification",
    "precedents_reviewed",
    "precedent_database_size",
    "enforcement_precedents",
    "enforcement_meta",
    "enforcement_precedents_note",
    "gdpr_meta",
    "three_part_test",
    // ITEM 311 — lia analytic deliverables (single-writer keys)
    "reasonable_expectations",
    "child_factor",
    "public_authority_exclusion",
    "automated_decision_analysis",
    "lia_determination",
    "documentation_recommendations",

    // UPGRADE-4 — ICO three-part-arc deliverables (single-writer keys)
    "interest_legitimacy",
    "benefit_and_beneficiary",
    "alternatives_considered",
    "relationship_with_individual",
    "scale_frequency_duration",
    "potential_harms",
    "opt_out_feasibility",
    "attestation_block",
    // UPGRADE-4 — shared authority exhibit (renders before the disclaimer)
    "authority_exhibit",
    // DOC 73 §4 (R2) — precedent-class posture (single-writer key)
    "precedent_class_posture",
    // L1 pre-landing (doc 62 §5 B5) — ePrivacy short-circuit gate (single-writer key)
    "eprivacy_short_circuit",

    // ITEM SO-11 — the assembled byte-pinned skeleton document. This is the
    // customer document; the PDF and the result page both read it.
    "skeleton_document",

    "disclaimer",
    "data_currency_note",
    // Cross-cutting arrays / bookkeeping
    "annotations",
    "information_needed",
    "lint_warnings",
    "deterministic_checks",
    "citation_ledger",
    // Engagement Map v1 (C1-d)
    "engagement_map",
    // Build-stamp echo (STAMP-ECHO WHITELIST KEY — dispatch §3)
    "build_stamp",
    "prompt_version",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],

  objects: {
    interest_legitimacy: INTEREST_LEGITIMACY_KEYS,
    benefit_and_beneficiary: BENEFIT_KEYS,
    alternatives_considered: ALTERNATIVES_KEYS,
    relationship_with_individual: RELATIONSHIP_KEYS,
    scale_frequency_duration: SCALE_KEYS,
    potential_harms: HARMS_KEYS,
    opt_out_feasibility: OPT_OUT_KEYS,
    attestation_block: ATTESTATION_BLOCK_KEYS,
    precedent_class_posture: PRECEDENT_CLASS_KEYS,
    eprivacy_short_circuit: EPRIVACY_SHORT_CIRCUIT_KEYS,
  },

  entries: {
    // NESTED-ARRAY NOTE (risk `eu_persuasive_authority` precedent): the
    // serializer prunes array-of-object entries at the TOP LEVEL only, and
    // `pruneObject` does not recurse. The arrays nested inside the UPGRADE-4
    // findings (interest_legitimacy.sub_tests, alternatives_considered
    // .alternatives, scale_frequency_duration.dimensions, potential_harms
    // .harms) therefore pass through whole. Their key sets are fixed by
    // build-upgrade4.ts, which is their single writer, and are recorded here
    // so a future widening of the serializer can wire them without re-derivation:
    //   sub_tests    -> id, label, verdict, reasoning, information_needed
    //   alternatives -> alternative, why_inadequate, rationale_recorded
    //   dimensions   -> id, label, recorded, status
    //   harms        -> harm, severity, bearing_on_balance
    //   authorities  -> source_row_id, regulator, subject, jurisdiction,
    //                   decision_date, case_reference, fine_eur, what_happened
    authority_exhibit: AUTHORITY_EXHIBIT_ENTRY_KEYS,
  },
};

/** Recorded nested key sets — see NESTED-ARRAY NOTE above. */
export const LIA_NESTED_ENTRY_KEYS = {
  sub_tests: SUB_TEST_ENTRY_KEYS,
  alternatives: ALTERNATIVE_ENTRY_KEYS,
  dimensions: DIMENSION_ENTRY_KEYS,
  harms: HARM_ENTRY_KEYS,
  authorities: PRECEDENT_CLASS_AUTHORITY_ENTRY_KEYS,
} as const;

