// ITEM 339 (PROSE PROGRAM 3 of 4) — cppa-risk DOCUMENT PLAN (reviewed set).
//
// Sequenced first per dispatch (worst readers first). Derived from the 8
// cppa_risk donor rows via `scripts/plans/extract-plans.mjs` (report_keys
// method — those donors carry structured report_data but no rendered
// document_text), then hand-finished against the ir_playbook plan, which is
// the only fully extracted arc in the corpus.
//
// The donor key inventory is an INTAKE WALK: scope, then normalised intake,
// then per-activity records, with the summary buried mid-document. This plan
// inverts that — the determination leads, the record supports.
//
// STATUS: every section is `pending_review` and the plan is `approved: false`.
// `planRenderable()` therefore returns false and NOTHING renders to a customer
// until the CEO sign-off on the before/after pair is recorded in the ledger.

import { DOCUMENT_PLAN_VERSION, type DocumentPlan } from "../plan.ts";

export const CPPA_RISK_PLAN: DocumentPlan = {
  product: "cppa-risk",
  version: DOCUMENT_PLAN_VERSION,
  approved: false,
  provenance: {
    method: "report_keys",
    donors_total: 8,
    donors_with_text: 0,
    extracted_at: "2026-08-01",
    exemplars: ["ir_playbook"],
  },
  sections: [
    {
      id: "assessment_summary",
      title: "Determination",
      arc_stage: "headline",
      lead: "determination",
      source_key: "assessment_summary",
      themes: ["outcome", "drivers", "residual_uncertainty"],
      required: true,
      status: "pending_review",
    },
    {
      id: "scope_and_triggers",
      title: "Why this assessment is required",
      arc_stage: "scope",
      lead: "determination",
      source_key: "scope_and_triggers",
      themes: ["trigger", "thresholds", "activities_in_scope"],
      required: true,
      status: "pending_review",
    },
    {
      id: "record_echo",
      title: "The record as the company stated it",
      arc_stage: "record",
      lead: "record",
      source_key: "normalised_intake",
      themes: ["parties", "data", "recipients", "retention", "safeguards"],
      required: true,
      status: "pending_review",
    },
    {
      id: "risk_assessment_by_activity",
      title: "Risk analysis by activity",
      arc_stage: "analysis",
      lead: "determination",
      source_key: "risk_assessment_by_activity",
      themes: ["negative_impacts", "safeguards_applied", "benefits", "weighing"],
      required: true,
      status: "pending_review",
    },
    {
      id: "exception_analysis",
      title: "Exceptions claimed",
      arc_stage: "analysis",
      lead: "determination",
      source_key: "exception_analysis",
      themes: ["claimed", "record_support", "unsupported"],
      required: false,
      status: "pending_review",
    },
    {
      id: "enforcement_context",
      title: "Regulatory expectations bearing on this activity",
      arc_stage: "duty",
      lead: "determination",
      source_key: "enforcement_context",
      themes: ["duties_engaged", "deadlines", "submission"],
      required: true,
      status: "pending_review",
    },
    {
      id: "information_needed",
      title: "What the record does not yet state",
      arc_stage: "ask",
      lead: "record",
      source_key: "information_needed",
      themes: ["silent_fields", "hedged_answers", "inconsistencies"],
      required: true,
      status: "pending_review",
    },
    {
      id: "priority_actions",
      title: "What to do next",
      arc_stage: "remedy",
      lead: "determination",
      source_key: "priority_actions",
      themes: ["immediate", "before_submission", "ongoing"],
      required: true,
      status: "pending_review",
    },
    {
      id: "cross_tool_recommendations",
      title: "Related assessments",
      arc_stage: "close",
      lead: "determination",
      source_key: "cross_tool_recommendations",
      themes: ["adjacent_obligations", "counsel_reservation"],
      required: false,
      status: "pending_review",
    },
  ],
};
