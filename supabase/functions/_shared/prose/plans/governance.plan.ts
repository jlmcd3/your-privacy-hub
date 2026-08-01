// ITEM 339 (PROSE PROGRAM 3 of 4) — governance DOCUMENT PLAN (reviewed set).
//
// Derived from the 14 governance donor rows (report_keys method), hand-
// finished against the cppa-risk and ir_playbook plans, then corrected against
// the live engine's report keys — source_key values are the keys the governance
// engine actually emits, not extractor guesses.
//
// STATUS: pending_review / approved: false.

import { DOCUMENT_PLAN_VERSION, type DocumentPlan } from "../plan.ts";

export const GOVERNANCE_PLAN: DocumentPlan = {
  product: "governance",
  version: DOCUMENT_PLAN_VERSION,
  approved: false,
  provenance: {
    method: "report_keys",
    donors_total: 14,
    donors_with_text: 0,
    extracted_at: "2026-08-01",
    exemplars: ["cppa-risk", "ir_playbook"],
  },
  sections: [
    {
      id: "governance_summary",
      title: "Determination",
      arc_stage: "headline",
      lead: "determination",
      source_key: "executive_summary",
      themes: ["maturity_outcome", "drivers", "residual_uncertainty"],
      required: true,
      status: "pending_review",
    },
    {
      id: "scope_of_review",
      title: "What this review covers",
      arc_stage: "scope",
      lead: "determination",
      source_key: "organisation_profile",
      themes: ["jurisdictions", "programme_elements", "exclusions"],
      required: true,
      status: "pending_review",
    },
    {
      id: "programme_record",
      title: "The programme as the organisation described it",
      arc_stage: "record",
      lead: "record",
      source_key: "domain_findings",
      themes: ["accountability", "policies", "training", "vendor_management", "transfers"],
      required: true,
      status: "pending_review",
    },
    {
      id: "maturity_analysis",
      title: "Maturity analysis",
      arc_stage: "analysis",
      lead: "determination",
      source_key: "readiness_rationale",
      themes: ["strengths", "weaknesses", "evidence_quality"],
      required: true,
      status: "pending_review",
    },
    {
      id: "obligations_engaged",
      title: "The risks driving this rating",
      arc_stage: "duty",
      lead: "determination",
      source_key: "top_three_risks",
      themes: ["risks_engaged", "duties_engaged", "documentation"],
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
      id: "recommendations",
      title: "What to do next",
      arc_stage: "remedy",
      lead: "determination",
      source_key: "immediate_actions",
      themes: ["immediate", "next_cycle", "ongoing"],
      required: true,
      status: "pending_review",
    },
    {
      id: "closing",
      title: "Reservation to counsel",
      arc_stage: "close",
      lead: "determination",
      source_key: "disclaimer",
      themes: ["counsel_reservation"],
      required: true,
      status: "pending_review",
    },
  ],
};
