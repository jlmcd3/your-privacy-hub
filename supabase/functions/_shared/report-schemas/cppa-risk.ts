// LEAK-PREV-P2 — CPPA Risk Assessment customer-report schema.
// Version: rs-w1-2026-07-25
//
// Derived from src/pages/CPPARiskAssessmentResult.tsx +
// src/components/cppa/RiskAssessmentReportV3.tsx +
// src/components/cppa/RiskAssessmentReportV4.tsx (frontend audit),
// reconciled against run-cppa-risk-assessment report-assembly code.

import type { ReportSchema } from "../report-serialize.ts";

const RISK_ENTRY_KEYS = [
  "id",
  "activity",
  "activity_name",
  "activity_id",
  "purpose",
  "benefits_to_business",
  "benefits_to_consumers",
  "current_safeguards",
  "safeguard_gaps",
  "benefits_outweigh_risks_rationale",
  "section_7152_mapping",
  "statutory_basis",
  "citation",
  "citations",
  "provision",
  "risk_level",
  "severity",
  "priority",
  "adverse_effects",
  "description",
  "regulatory_citation",
  "resolution_required",
  "facts_supporting",
  "argument_strength_rationale",
  "action",
  "deadline",
  "deadline_basis",
  "dimensions",
  "enables",
  "insufficient_basis",
  "information_needed",
  "recorded_basis",
  "text",
  "title",
  "note",
  "notes",
  "rationale",
  "harm_type",
  "harm_description",
  "source_fields",
  "topic",
  "status",
] as const;

// ITEM 305 — allow-listed keys inside `activity_analytics[]`. The nested
// deliverable records are serialized whole; this list covers the envelope
// plus every leaf key emitted by
// _shared/ltp/analytic-deliverables/build.ts.
const ANALYTIC_ENTRY_KEYS = [
  // envelope
  "activity_id",
  "activity_name",
  "activity_purpose",
  "is_primary",
  "necessity_analysis",
  "harm_causation",
  "safeguard_map",
  "weighing",
  "consequence",
  // shared leaves
  "status",
  "citation",
  "information_needed",
  // necessity_analysis[]
  "element",
  "asserted_status",
  "verdict",
  "justification",
  // harm_causation[]
  "harm_id",
  "harm_pinpoint",
  "harm_label",
  "harm_verbatim",
  "source",
  "cause",
  "likelihood",
  "severity",
  "inherent_band",
  // safeguard_map[]
  "safeguard",
  "safeguard_status",
  "residual_band",
  // weighing[]
  "beneficiary_class",
  "benefit_statement",
  "generic_benefit_flag",
  "offsetting_harm_ids",
  "sufficiency",
  // consequence
  "decision",
  "rule_ids",
  "reasons",
  "conditions",
  "approver_name",
  "approver_position",
  "approval_date",
  "approval_recorded",
] as const;


export const CPPA_RISK_REPORT_SCHEMA: ReportSchema = {
  version: "rs-w1-2026-07-26-ltp-waveb-summary",
  tool: "cppa_risk_assessment",
  topLevel: [
    // core presentation (from Result page + V4)
    "schema_version",
    "overall_score",
    "risk_level",
    // T7-RISK-OPENING-PARAGRAPH-PILOT — deterministic slot, emit-gate overwritten.
    // See docs/design/OPENING-PARAGRAPH-DESIGN.md and openings/risk-opening.ts.
    "opening_summary",
    "executive_summary",
    "assessment_summary",
    "submission_summary",
    "attestation_block",
    "document_metadata",
    // ITEM 290 — RETIRED FOR TRACK 2 (single-key scope emission): the LTP
    // emitters no longer produce `scope_confirmation`. The key is RETAINED in
    // this whitelist for LEGACY rows only — the production (Track-1) engine
    // still emits the legacy OBJECT shape and three live legacy surfaces read
    // it: src/pages/CPPARiskAssessmentResult.tsx:328,
    // src/pages/CPPASuiteResult.tsx:66,
    // supabase/functions/generate-cppa-suite-pdf/index.ts:59. Removing it here
    // would strip a live production section (a legacy edit, out of scope).
    // Retire from the whitelist only when Track 1 is decommissioned.
    "scope_confirmation",

    "scope_and_triggers",
    // ITEM 244 (L1) — Processing Narrative section. Placed between
    // scope_and_triggers and risk_assessment_by_activity. Composed
    // deterministically from operational-elements ledger fields; silent
    // sub-elements resolve to "not stated on the record".
    "processing_narrative",
    // ITEM 305 — per-activity ANALYTIC DELIVERABLES (§ 7152(a)(2), (a)(4),
    // (a)(5), (a)(6), (a)(7)). Structured, deterministic; produced solely by
    // _shared/ltp/analytic-deliverables/build.ts.
    "activity_analytics",
    // ITEM 341 — "Persuasive authority from EU practice". SEPARATE key by
    // design: EU/EEA material is a different legal regime and must never be
    // folded into the CPPA-scoped enforcement_context / enforcement_precedents.
    "eu_persuasive_authority",
    "risk_assessment_by_activity",

    "risk_register",
    "top_risks",
    "priority_actions",
    "next_steps",
    // LTP Wave-B item-136 CUT: cross_tool_recommendations REMOVED from
    // topLevel (renderers guarded; see risk-surface-map.ts).
    "strengthen_items",
    // LTP Wave-B item-136 TEMPLATE_CUT: inconsistency_flags retained by
    // NAME; content restricted to T.risk.review_items output.
    "inconsistency_flags",
    "exception_analysis",
    "record_sufficiency",
    // V3 legacy surfaces
    "part_a",
    "part_b",
    "gating",
    // annotations / review
    "annotations",
    "requires_attorney_review",
    "debug_review_notes",
    "fsor_commentary",
    "citation_ledger",
    "validation_summary",
    "accuracy_caveat",
    "domains",
    // ancillary
    "enforcement_context",
    "enforcement_precedents",
    "enforcement_meta",
    "information_needed",
    "disclaimer",
    "framework_disclaimer",
    "_meta",
  ],
  // LTP Wave-B item-136 CUT: scope_and_triggers.scope_notes pruned via
  // object allow-list (triggered_activities_detail retained).
  // CONTENT COURIER 2026-07-26: assessment_summary object allow-list added
  // — 10 keys verified live via query_database + additive `narrative` field
  // (LEAK-PREV-P2 positive-control coverage; renderers tolerate absent).
  objects: {
    scope_and_triggers: ["triggered_activities_detail"],
    assessment_summary: [
      "company_name",
      "sector",
      "assessment_date",
      "triggered_activities",
      "exceptions_claimed",
      "exceptions_status",
      "overall_risk_level",
      "cybersecurity_audit_required",
      "admt_disclosure_required",
      "corpus_enforcement_note",
      "narrative",
    ],
    // ITEM 341 — EU persuasive-authority envelope. Nested topic records pass
    // through whole (serializer prunes the top level of an object key only).
    eu_persuasive_authority: [
      "section_title",
      "version",
      "status",
      "framing",
      "topics",
      "information_needed",
    ],
  },

  entries: {
    // ITEM 305 — analytic-deliverable envelope key set.
    activity_analytics: ANALYTIC_ENTRY_KEYS,
    risk_assessment_by_activity: RISK_ENTRY_KEYS,

    top_risks: RISK_ENTRY_KEYS,
    priority_actions: RISK_ENTRY_KEYS,
    next_steps: RISK_ENTRY_KEYS,
    strengthen_items: RISK_ENTRY_KEYS,
    inconsistency_flags: RISK_ENTRY_KEYS,
    exception_analysis: RISK_ENTRY_KEYS,
    information_needed: RISK_ENTRY_KEYS,
    annotations: RISK_ENTRY_KEYS,
    requires_attorney_review: RISK_ENTRY_KEYS,
    debug_review_notes: RISK_ENTRY_KEYS,
    fsor_commentary: RISK_ENTRY_KEYS,
    citation_ledger: RISK_ENTRY_KEYS,
    enforcement_precedents: RISK_ENTRY_KEYS,
  },
};


export const CPPA_RISK_FRONTEND_READ_PATHS: readonly string[] = [
  "schema_version",
  "overall_score",
  "risk_level",
  "executive_summary",
  "assessment_summary",
  "submission_summary",
  "attestation_block",
  "document_metadata",
  "scope_confirmation",
  "scope_and_triggers",
  "processing_narrative",
  "risk_assessment_by_activity",
  "risk_register",
  "top_risks",
  "priority_actions",
  "next_steps",
  // "cross_tool_recommendations" — LTP Wave-B item-136 CUT.
  "strengthen_items",
  "inconsistency_flags",
  "exception_analysis",
  "part_a",
  "part_b",
  "gating",
  "annotations",
  "requires_attorney_review",
  "debug_review_notes",
  "fsor_commentary",
  "citation_ledger",
  "validation_summary",
  "accuracy_caveat",
  "domains",
  "enforcement_context",
];
