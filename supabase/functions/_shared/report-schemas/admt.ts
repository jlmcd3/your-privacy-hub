// LEAK-PREV-P2 — ADMT customer-report schema.
// Version: rs-w1-2026-07-25
//
// Superset of every key read by the ADMT Result page and its shared
// components; derived from src/pages/admt/ADMTCheckerResult.tsx (frontend
// audit) reconciled against run-admt-checker report-assembly code.
// MISSING A FRONTEND-READ KEY IS THE FAILURE MODE — colocated test
// (admt.schema-coverage.test.ts) statically re-derives that list and asserts
// every path is present here.

import type { ReportSchema } from "../report-serialize.ts";

const FINDING_ENTRY_KEYS = [
  // rendered fields
  "id",
  "element",
  "element_id",
  "requirement",
  "requirement_id",
  "proposition_key",
  "status",
  "status_label", // ITEM 392 AG-2 — reader-facing sibling of the machine enum
  "insufficient_basis", // LEAK-PREV-P0 additive flag
  "information_needed", // LEAK-PREV-P1 additive flag

  "finding",
  "gap_description",
  "remediation",
  "action",
  "rationale",
  "citation",
  "citations",
  "statutory_basis",
  "provision",
  "subsection",
  "authority",
  "priority",
  "severity",
  "deadline",
  "deadline_basis",
  "topic",
  "bucket",
  "enforcement_exposure",
  "source_fields",
  "notes",
  "note",
  "detail",
  "description",
  "text",
  "title",
] as const;

const DEADLINE_TABLE_ENTRY_KEYS = [
  "obligation",
  "compliance_deadline",
  "proposition_key",
  "subsection",
  "verbatim_quote",
  "information_needed",
] as const;

const SCOPE_ANALYSIS_KEYS = [
  "is_admt",
  "is_admt_reasoning",
  "triggers_profiling",
  "triggers_risk_assessment",
  "triggers_significant_decision",
  "significant_decision_reasoning",
  "risk_assessment_reasoning",
  "human_review_qualifies",
  "human_review_reasoning",
  "exception_claimed",
  "exception_qualifies",
  "exception_reasoning",
  "third_party_responsibility_note",
  "summary",
  "determination_basis",
  "applicability_verdict",
  "adequacy_finding",
  "citation",
  "citations",
] as const;

const CONSOLIDATED_NOTICE_KEYS = [
  "applicable",
  "basis",
  "conditions_to_consolidate",
  "consolidation_benefit",
  "consolidation_risk",
  "recommendation",
  "citation",
] as const;

const AGGREGATE_ACCESS_KEYS = [
  "applicable",
  "explanation",
  "operational_note",
  "threshold",
  "what_aggregate_response_may_include",
  "citation",
] as const;

const RISK_ASSESSMENT_OBLIGATION_KEYS = [
  "required",
  "summary",
  "submission_requirement",
  "compliance_deadline_existing_activities",
  "compliance_deadline_new_activities",
  "triggers_identified",
  "citation",
  "citations",
] as const;

const ENFORCEMENT_CONTEXT_KEYS = [
  "aggregate_exposure_note",
  "penalty_per_violation_intentional",
  "penalty_per_violation_unintentional",
  "penalty_statutory_basis",
  "relevant_precedents",
  "sector_specific_patterns",
  "audit_division_priorities",
  "citation",
] as const;

// UPGRADE-3 — SHAPE-LAW deliverable entry keys (§§ 7220-7222).
const NOTICE_ELEMENT_ENTRY_KEYS = [
  "element_id",
  "element_label",
  "proposition_keys",
  "element_verbatim",
  "citation",
  "standard",
  "record_fact",
  "application",
  "published_text",
  "record_source",
  "verdict",
  "why",
  "status",
  "information_needed",
] as const;

const EXCEPTION_QUALIFICATION_ENTRY_KEYS = [
  "proposition_key",
  "exception_label",
  "citation",
  "claimed_on_the_record",
  "conditions",
  "condition_id",
  "condition_verbatim",
  "verdict",
  "why",
  "evidence_on_the_record",
  "qualifies",
  "status",
  "information_needed",
] as const;

const EXCEPTION_IDENTIFICATION_KEYS = [
  "finding_id",
  "citation",
  "element_verbatim",
  "standard",
  "record_fact",
  "application",
  "exception_relied_upon",
  "verdict",
  "why",
  "status",
  "information_needed",
] as const;

const ACCESS_READINESS_ENTRY_KEYS = [
  "element_id",
  "element_label",
  "citation",
  "corpus_key",
  "element_verbatim",
  "standard",
  "record_fact",
  "application",
  "process_on_the_record",
  "verdict",
  "why",
  "status",
  "information_needed",
] as const;

const DETERMINATION_KEYS = [
  "activity_id",
  "activity_name",
  "lawfulness",
  "exposure",
  "finding",
  "statement",
  "basis_element_ids",
  "basis_exception_keys",
  "citation",
  "status",
  "information_needed",
  "source",
  "separation_repairs",
] as const;

// ITEM 371 / UPGRADE-3 — allow-listed keys inside `authority_exhibit`.
const AUTHORITY_EXHIBIT_KEYS = [
  "version",
  "heading",
  "entries",
  "citation",
  "as_cited",
  "authority_class",
  "corpus_key",
  "excerpt",
  "pin_verified",
  "note",
] as const;

export const ADMT_REPORT_SCHEMA: ReportSchema = {
  version: "rs-w2-2026-08-03-upgrade3",
  tool: "cppa_admt",
  topLevel: [
    // core presentation
    "system_name",
    "overall_status",
    "overall_status_label", // ITEM 392 AG-2 — reader-facing sibling

    "disclaimer",
    "framework_disclaimer",
    "compliance_deadline",
    // finding buckets
    "notice_gaps",
    "opt_out_gaps",
    "access_gaps",
    "documentation_to_maintain",
    "priority_actions",
    "top_3_actions",
    // scoped structured slots
    "scope_analysis",
    "consolidated_notice_analysis",
    "aggregate_access_response",
    "risk_assessment_obligation",
    // UPGRADE-3 — analytic deliverables (§§ 7220-7222), rendered
    // lawfulness-first ahead of enforcement exposure.
    "determination",
    "notice_element_findings",
    "exception_identification",
    "exception_qualification",
    "access_readiness_findings",
    "enforcement_context",
    // UPGRADE-3 ITEM 5 — table of authorities, rendered before the disclaimer.
    "authority_exhibit",
    // generator-added public surfaces
    "information_needed",
    "annotations",
    "citation_ledger",
    "enforcement_precedents",
    "enforcement_meta",
    // deterministic slots (per prompt-core / W9 wire)
    "deadline_table",
    "applicability_verdict",
    "adequacy_finding",
    "schema_version",
    // meta / internal channel — serializer preserves ONLY _meta.internal
    "_meta",
  ],
  entries: {

    // ITEM 337 (PROSE PROGRAM 1, Part D5) — deadline_table entries were
    // previously unpruned, so the internal idempotency flags `_h6v2_ran` /
    // `_w24_h6_ran` reached report JSON. Allow-listed to the builder's keys
    // (see run-admt-checker/_w9_admt_slots.ts → buildDeadlineTable).
    deadline_table: DEADLINE_TABLE_ENTRY_KEYS,
    notice_gaps: FINDING_ENTRY_KEYS,
    opt_out_gaps: FINDING_ENTRY_KEYS,
    access_gaps: FINDING_ENTRY_KEYS,
    documentation_to_maintain: FINDING_ENTRY_KEYS,
    priority_actions: FINDING_ENTRY_KEYS,
    top_3_actions: FINDING_ENTRY_KEYS,
    information_needed: FINDING_ENTRY_KEYS,
    annotations: FINDING_ENTRY_KEYS,
    citation_ledger: FINDING_ENTRY_KEYS,
    enforcement_precedents: FINDING_ENTRY_KEYS,
    // UPGRADE-3 — analytic deliverables.
    notice_element_findings: NOTICE_ELEMENT_ENTRY_KEYS,
    exception_qualification: EXCEPTION_QUALIFICATION_ENTRY_KEYS,
    access_readiness_findings: ACCESS_READINESS_ENTRY_KEYS,
    authority_exhibit: AUTHORITY_EXHIBIT_KEYS,
  },
  objects: {
    scope_analysis: SCOPE_ANALYSIS_KEYS,
    consolidated_notice_analysis: CONSOLIDATED_NOTICE_KEYS,
    aggregate_access_response: AGGREGATE_ACCESS_KEYS,
    risk_assessment_obligation: RISK_ASSESSMENT_OBLIGATION_KEYS,
    enforcement_context: ENFORCEMENT_CONTEXT_KEYS,
    determination: DETERMINATION_KEYS,
    exception_identification: EXCEPTION_IDENTIFICATION_KEYS,
  },

};

// Frontend-read paths — derived by static scan of
// src/pages/admt/ADMTCheckerResult.tsx (LEAK-PREV-P2 audit).
// Colocated test asserts every entry is covered by the schema above.
export const ADMT_FRONTEND_READ_PATHS: readonly string[] = [
  "system_name",
  "overall_status",
  "disclaimer",
  "framework_disclaimer",
  "compliance_deadline",
  "notice_gaps",
  "opt_out_gaps",
  "access_gaps",
  "documentation_to_maintain",
  "priority_actions",
  "top_3_actions",
  "scope_analysis.is_admt",
  "scope_analysis.is_admt_reasoning",
  "scope_analysis.triggers_profiling",
  "scope_analysis.triggers_risk_assessment",
  "scope_analysis.triggers_significant_decision",
  "scope_analysis.significant_decision_reasoning",
  "scope_analysis.risk_assessment_reasoning",
  "scope_analysis.human_review_qualifies",
  "scope_analysis.human_review_reasoning",
  "scope_analysis.exception_claimed",
  "scope_analysis.exception_qualifies",
  "scope_analysis.exception_reasoning",
  "scope_analysis.third_party_responsibility_note",
  "scope_analysis.summary",
  "scope_analysis.determination_basis",
  "consolidated_notice_analysis.applicable",
  "consolidated_notice_analysis.basis",
  "consolidated_notice_analysis.conditions_to_consolidate",
  "consolidated_notice_analysis.consolidation_benefit",
  "consolidated_notice_analysis.consolidation_risk",
  "consolidated_notice_analysis.recommendation",
  "aggregate_access_response.applicable",
  "aggregate_access_response.explanation",
  "aggregate_access_response.operational_note",
  "aggregate_access_response.threshold",
  "aggregate_access_response.what_aggregate_response_may_include",
  "risk_assessment_obligation.required",
  "risk_assessment_obligation.summary",
  "risk_assessment_obligation.submission_requirement",
  "risk_assessment_obligation.compliance_deadline_existing_activities",
  "risk_assessment_obligation.compliance_deadline_new_activities",
  "risk_assessment_obligation.triggers_identified",
  "enforcement_context.aggregate_exposure_note",
  "enforcement_context.penalty_per_violation_intentional",
  "enforcement_context.penalty_per_violation_unintentional",
  "enforcement_context.penalty_statutory_basis",
  // UPGRADE-3 — analytic deliverables read by the Result page.
  "determination.lawfulness.finding",
  "determination.lawfulness.citation",
  "determination.lawfulness.status",
  "determination.lawfulness.information_needed",
  "determination.exposure.statement",
  "determination.exposure.citation",
  "determination.exposure.status",
  "determination.exposure.information_needed",
  "notice_element_findings",
  "exception_identification.citation",
  "exception_identification.element_verbatim",
  "exception_identification.standard",
  "exception_identification.record_fact",
  "exception_identification.application",
  "exception_identification.exception_relied_upon",
  "exception_identification.verdict",
  "exception_identification.why",
  "exception_identification.status",
  "exception_identification.information_needed",
  "exception_qualification",
  "access_readiness_findings",
  "authority_exhibit.heading",
  "authority_exhibit.entries",
];
