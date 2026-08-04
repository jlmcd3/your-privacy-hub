// LEAK-PREV-P2 — Governance Assessment customer-report schema.
// Version: rs-governance-w1-2026-07-25
//
// Top-level allow-list derived from run-governance-assessment/index.ts
// terminal reportData assembly (~L1275–L1326) and
// src/components/governance/*, src/pages/GovernanceAssessmentResult surfaces.
//
// `_meta.internal` is preserved verbatim by the serializer so build-stamp
// echo keys (`_meta.internal.governance_w1`, `_meta.internal.emit_gate`,
// `_meta.internal.serializer`) survive P2 whitelist serialization — the
// wave-21 admt telemetry-gap lesson (items 47/49) applied at governance
// wiring time. `build_stamp` is additionally declared top-level so digests
// can confirm build-of-record from a doc without depending on `_meta`.
//
// Nested pruning: intentionally NOT declared. Governance section objects
// (domain_findings, synthesis, etc.) have wide and evolving key sets;
// per-entry pruning would risk dropping a legitimate model-emitted field.
// Top-level whitelist alone enforces "unknown-key-cannot-ship" at the
// section granularity that has ever been reviewed (DPIA precedent).

import type { ReportSchema } from "../report-serialize.ts";

export const GOVERNANCE_REPORT_SCHEMA: ReportSchema = {
  version: "rs-governance-w2-2026-08-04-upgrade5",
  tool: "governance_assessment",
  topLevel: [
    // Core assembly (governance terminal reportData)
    "assessment_id",
    "generated_at",
    "framework_disclaimer",
    "jurisdiction_validation",
    "gdpr_meta",
    "executive_summary",
    "top_risks",
    "recommended_actions",
    "top_recommendations",
    "regulatory_hot_topics",
    "domain_scores",
    "domain_findings",
    // ITEM 313 — the maturity tier is DEMOTED. `overall_readiness_rating` and
    // `readiness_rationale` are deleted by attachGovernanceDeliverables and
    // re-emitted, labelled non-statutory, as `maturity_tier_readability_aid`.
    // The keys stay allow-listed only so a fail-open attach cannot silently
    // strip a report generated before the deliverables land.
    "overall_readiness_rating",
    "readiness_rationale",
    "maturity_tier_readability_aid",
    // ITEM 313 — governance analytic deliverables (single-writer).
    "accountability_determination",
    "demonstrability_findings",
    "art30_element_findings",
    "art30_exemption_determination",
    "dpo_determination",
    "risk_calibration_finding",
    "review_and_update_finding",
    "transfer_analysis",
    // GOVERNANCE UPGRADE — ICO Audit Framework tracker walk + remediation.
    "domain_element_findings",
    "remediation_plan",
    // GOVERNANCE UPGRADE ITEM 5 — shared authority exhibit (renders at the end
    // of the body, immediately before the universal disclaimer).
    "authority_exhibit",


    "interaction_effects",
    "dpia_scope",
    "disclaimer",
    "governance_metadata",
    // Enforcement injection
    "enforcement_context",
    "enforcement_precedents",
    "enforcement_meta",
    // Cross-cutting arrays / bookkeeping
    "annotations",
    "information_needed",
    "open_items",
    "has_unresolved_placeholders",
    "lint_warnings",
    "deterministic_checks",
    "citation_ledger",
    "completion_guidance",
    "fsor_commentary",
    // Engagement Map v1 (C1-d)
    "engagement_map",
    // Ids & timestamps
    "governance_id",
    "prompt_version",
    "build_stamp",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
};
