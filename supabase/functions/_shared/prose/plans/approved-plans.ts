/**
 * ITEM 428 (PIECE A) — THE APPROVED PLAN REGISTRY.
 *
 * The nine products that carry an APPROVED `prose_document_plans` row, encoded
 * as the section arc the assembled document must conform to. GENERATED from
 * the change-controlled `library/prose/plans/*.json` artifacts, each of which
 * was verified section-for-section against its approved row at HEAD
 * (2026-08-09) — see tests/edge/item428/structure-conformance.test.ts, which
 * re-proves the file/registry identity on every run.
 *
 * This registry is DECLARATION ONLY. It changes no product output.
 */

export interface PlanSection {
  readonly id: string;
  readonly title: string;
  readonly source_key: string;
  readonly required: boolean;
  /** IR only: the artifact this section belongs to. */
  readonly artifact?: string;
}

export interface ApprovedPlan {
  readonly product: string;
  readonly row_id: string;
  readonly row_version: number;
  readonly label: string;
  readonly sections: readonly PlanSection[];
}

export const APPROVED_PLANS: Readonly<Record<string, ApprovedPlan>> = Object.freeze({
  "admt": {
    product: "admt",
    row_id: "f59eb3b8-d747-4110-a3ab-0452e9cf92fd",
    row_version: 1,
    label: "prose-plans-2026-08-06-item392",
    sections: [
    { id: "applicability_verdict", title: "Whether these rules apply to this system", source_key: "applicability_verdict", required: true },
    { id: "scope_analysis", title: "The system as the business described it", source_key: "scope_analysis", required: true },
    { id: "notice_analysis", title: "The pre-use notice right", source_key: "notice_gaps", required: true },
    { id: "opt_out_analysis", title: "The opt-out right", source_key: "opt_out_gaps", required: true },
    { id: "access_analysis", title: "The access right", source_key: "access_gaps", required: true },
    { id: "adequacy_by_element", title: "Whether the record carries each element", source_key: "adequacy_finding", required: true },
    { id: "consolidated_analyses", title: "Whether the disclosures may be consolidated", source_key: "consolidated_notice_analysis", required: true },
    { id: "obligations_and_deadlines", title: "The obligations and when they fall due", source_key: "deadline_table", required: true },
    { id: "information_needed", title: "What the record does not yet state", source_key: "information_needed", required: true },
    { id: "actions", title: "What to do next", source_key: "top_3_actions", required: true },
    { id: "documentation_to_maintain", title: "What to keep on file", source_key: "documentation_to_maintain", required: true },
    { id: "close", title: "Enforcement context and closing position", source_key: "enforcement_context", required: true },
    ],
  },
  "biometric": {
    product: "biometric",
    row_id: "9c1f7b2e-4d3a-4c58-9b61-2f0a5e7d8134",
    row_version: 2,
    label: "prose-plans-2026-08-08-item409",
    sections: [
    { id: "applicability_determination", title: "Whether each statute applies here", source_key: "consequence_determination", required: true },
    { id: "processing_record", title: "The processing as the record describes it", source_key: "processing_record", required: true },
    { id: "statutory_requirements", title: "The requirements that attach, and the record against each", source_key: "duty_findings", required: true },
    { id: "consent_and_notice", title: "Consent and notice", source_key: "consent_and_notice", required: true },
    { id: "retention_and_destruction", title: "Retention and destruction", source_key: "retention_and_destruction", required: true },
    { id: "security_and_disclosure", title: "Security, disclosure and profit", source_key: "security_and_disclosure", required: true },
    { id: "open_elements", title: "What the record does not yet settle", source_key: "information_needed", required: true },
    { id: "close", title: "Scope and reliance", source_key: "disclaimer", required: true },
    ],
  },
  "cppa-cyber": {
    product: "cppa-cyber",
    row_id: "4dca3e72-3827-4b30-9c15-3b66fb53d0fa",
    row_version: 1,
    label: "prose-plans-2026-08-07-item404",
    sections: [
    { id: "readiness_determination", title: "Whether the programme is audit-ready", source_key: "readiness_determination", required: true },
    { id: "executive_summary", title: "The assessment in short", source_key: "executive_summary", required: true },
    { id: "programme_record", title: "The programme as the business described it", source_key: "programme_record", required: true },
    { id: "control_findings", title: "The eighteen components, one at a time", source_key: "controls", required: true },
    { id: "control_status_counts", title: "How the components tally", source_key: "control_status_counts", required: true },
    { id: "audit_schedule", title: "When the first audit is due", source_key: "audit_schedule", required: true },
    { id: "gaps_and_remediation", title: "What the record does not yet carry, and what closes it", source_key: "top_risks", required: true },
    { id: "next_steps", title: "What to do next", source_key: "next_steps", required: true },
    { id: "close", title: "Scope and reliance", source_key: "disclaimer", required: true },
    ],
  },
  "cppa-risk": {
    product: "cppa-risk",
    row_id: "5f1ef353-39e8-4b1c-bff5-779bab03be4b",
    row_version: 1,
    label: "prose-plans-2026-08-01-item363",
    sections: [
    { id: "executive_lead", title: "About this assessment", source_key: "executive_lead", required: true },
    { id: "record_card", title: "The facts the company provided", source_key: "normalised_intake", required: true },
    { id: "determination", title: "Determination", source_key: "assessment_summary", required: true },
    { id: "why_required", title: "Why this assessment is required", source_key: "scope_and_triggers", required: true },
    { id: "risk_analysis", title: "Risk analysis", source_key: "risk_assessment_by_activity", required: true },
    { id: "corpus_analogies", title: "Comparable regulator decisions", source_key: "eu_persuasive_authority", required: true },
    { id: "general_conclusions", title: "General conclusions", source_key: "assessment_summary", required: true },
    { id: "record_completeness_summary", title: "Record completeness and residual risk", source_key: "record_sufficiency", required: true },
    { id: "what_to_do_next", title: "What to do next", source_key: "priority_actions", required: true },
    ],
  },
  "dpia": {
    product: "dpia",
    row_id: "744f54c0-d9b0-47fa-b52a-600dc97a81ba",
    row_version: 1,
    label: "prose-plans-2026-08-04-item372",
    sections: [
    { id: "section_0_overview", title: "About this assessment", source_key: "section_0_overview", required: true },
    { id: "section_1_description", title: "The facts the organisation provided", source_key: "section_1_description", required: true },
    { id: "section_2_analysis", title: "Lawfulness and consultation", source_key: "section_2_analysis", required: true },
    { id: "section_3_necessity_proportionality", title: "Necessity and proportionality", source_key: "section_3_necessity_proportionality", required: true },
    { id: "section_4_risk_management", title: "Risks and the measures addressing them", source_key: "section_4_risk_management", required: true },
    { id: "corpus_analogies", title: "Comparable regulator decisions", source_key: "enforcement_precedents", required: false },
    { id: "general_conclusions", title: "General conclusions", source_key: "executive_summary", required: true },
    { id: "information_needed", title: "What the record does not yet state", source_key: "information_needed", required: true },
    { id: "section_5_interested_parties", title: "Consultation with interested parties", source_key: "section_5_interested_parties", required: false },
    { id: "section_6_conclusion", title: "Sign-off and next steps", source_key: "section_6_conclusion", required: true },
    ],
  },
  "governance": {
    product: "governance",
    row_id: "7f168ddb-d419-4f06-8cdc-1cf1fa03be7f",
    row_version: 1,
    label: "prose-plans-2026-08-07-item400",
    sections: [
    { id: "readiness_determination", title: "Whether the organisation can demonstrate compliance", source_key: "accountability_determination", required: true },
    { id: "executive_summary", title: "The assessment in short", source_key: "executive_summary", required: true },
    { id: "organisation_record", title: "The organisation as it described itself", source_key: "organisation_profile", required: true },
    { id: "domain_findings", title: "The domains, in the order the record addresses them", source_key: "domain_findings", required: true },
    { id: "domain_element_findings", title: "The elements each domain has to carry", source_key: "domain_element_findings", required: true },
    { id: "cross_domain_findings", title: "What the domains say when read together", source_key: "interaction_effects", required: true },
    { id: "obligations_and_gaps", title: "The obligations and where the record falls short", source_key: "open_items", required: true },
    { id: "remediation_plan", title: "What to do next", source_key: "remediation_plan", required: true },
    { id: "close", title: "Enforcement context and closing position", source_key: "enforcement_context", required: true },
    ],
  },
  "ir-playbook": {
    product: "ir-playbook",
    row_id: "797606ab-e2f7-4a2e-b631-dcc2bd3a3c43",
    row_version: 1,
    label: "prose-plans-2026-08-09-item414",
    sections: [
    { id: "template_note", title: "How this playbook was drafted", source_key: "standing_playbook.template_note", required: true, artifact: "standing_playbook" },
    { id: "unrecorded_ledger", title: "What this playbook still needs", source_key: "standing_playbook.unrecorded_ledger", required: false, artifact: "standing_playbook" },
    { id: "activation_criteria", title: "Activation criteria", source_key: "standing_playbook.activation_criteria", required: true, artifact: "standing_playbook" },
    { id: "severity_matrix", title: "Severity matrix", source_key: "standing_playbook.severity_matrix", required: true, artifact: "standing_playbook" },
    { id: "response_team", title: "Response team and alternates", source_key: "standing_playbook.response_team", required: true, artifact: "standing_playbook" },
    { id: "key_contacts", title: "Key contacts", source_key: "standing_playbook.key_contacts", required: true, artifact: "standing_playbook" },
    { id: "first_hour_checklist", title: "First-hour checklist", source_key: "standing_playbook.first_hour_checklist", required: true, artifact: "standing_playbook" },
    { id: "first_24_hours_checklist", title: "First-24-hours checklist", source_key: "standing_playbook.first_24_hours_checklist", required: true, artifact: "standing_playbook" },
    { id: "evidence_preservation", title: "Evidence preservation", source_key: "standing_playbook.evidence_preservation", required: true, artifact: "standing_playbook" },
    { id: "containment_eradication_recovery", title: "Containment, eradication and recovery", source_key: "standing_playbook.containment_eradication_recovery", required: true, artifact: "standing_playbook" },
    { id: "breach_classification", title: "Breach classification framework", source_key: "standing_playbook.breach_classification", required: true, artifact: "standing_playbook" },
    { id: "statutory_notification_determinations", title: "Statutory notification determinations", source_key: "standing_playbook.statutory_notification_determinations", required: true, artifact: "standing_playbook" },
    { id: "contractual_notification_finding", title: "Contractual notification obligations \u2014 determination", source_key: "standing_playbook.contractual_notification_finding", required: true, artifact: "standing_playbook" },
    { id: "contractual_notifications", title: "Contractual notification obligations", source_key: "standing_playbook.contractual_notifications", required: true, artifact: "standing_playbook" },
    { id: "communications", title: "Communications and holding statements", source_key: "standing_playbook.communications", required: true, artifact: "standing_playbook" },
    { id: "testing_training", title: "Testing and training", source_key: "standing_playbook.testing_training", required: true, artifact: "standing_playbook" },
    { id: "incident_log", title: "Incident log", source_key: "incident_worksheet.incident_log", required: true, artifact: "incident_worksheet" },
    { id: "decision_log", title: "Decision log", source_key: "incident_worksheet.decision_log", required: true, artifact: "incident_worksheet" },
    { id: "after_action_review", title: "After-action review", source_key: "incident_worksheet.after_action_review", required: true, artifact: "incident_worksheet" },
    { id: "remediation_tracker", title: "Remediation tracker", source_key: "incident_worksheet.remediation_tracker", required: true, artifact: "incident_worksheet" },
    ],
  },
  "lia": {
    product: "lia",
    // ITEM SO-11 — superseded row c9b3d942-83b9-4aac-859d-b507c1f2ef37
    // (prose-plans-2026-08-04-item364-d2). The 14-section typed arc below is
    // UNCHANGED — coverage, the record-complete gate and structure conformance
    // all key off it. What the new row adds is the v3 render law.
    row_id: "1f4b7c96-1e6c-4d63-a4e5-2a4f4c0b3d11",
    row_version: 2,
    label: "prose-plans-2026-08-10-item-so11",
    sections: [
    { id: "determination", title: "Determination", source_key: "lia_determination", required: true },
    { id: "classification", title: "The processing as the organisation described it", source_key: "classification", required: true },
    { id: "interest_legitimacy", title: "The interest and whether it is a legitimate one", source_key: "interest_legitimacy", required: true },
    { id: "benefit_and_beneficiary", title: "What the processing achieves, and for whom", source_key: "benefit_and_beneficiary", required: true },
    { id: "alternatives_considered", title: "Whether a less intrusive route was available", source_key: "alternatives_considered", required: true },
    { id: "relationship_with_individual", title: "The relationship between the organisation and the people affected", source_key: "relationship_with_individual", required: true },
    { id: "scale_frequency_duration", title: "How much processing, how often, and for how long", source_key: "scale_frequency_duration", required: true },
    { id: "potential_harms", title: "What could go wrong for the people affected", source_key: "potential_harms", required: true },
    { id: "opt_out_feasibility", title: "Whether the people affected can stop it", source_key: "opt_out_feasibility", required: true },
    { id: "balancing", title: "The balance", source_key: "three_part_test.balancing_test", required: true },
    { id: "comparable_decisions", title: "Comparable regulator decisions", source_key: "enforcement_precedents", required: false },
    { id: "information_needed", title: "What the record does not yet state", source_key: "information_needed", required: true },
    { id: "documentation_recommendations", title: "What to write down next", source_key: "documentation_recommendations", required: true },
    { id: "attestation_block", title: "Review, approval, and when this must be looked at again", source_key: "attestation_block", required: true },
    ],
  },
  "registration": {
    product: "registration",
    row_id: "881df03d-c9e8-45a8-98f9-3f04d6496534",
    row_version: 1,
    label: "prose-plans-2026-08-04-item364-d3",
    sections: [
    { id: "registration_determination", title: "Determination", source_key: "narrative.determination", required: true },
    { id: "overview", title: "What was assessed, and from what", source_key: "narrative.overview", required: true },
    { id: "threshold_analysis", title: "Whether each statute's definition is met", source_key: "determinations[].threshold", required: true },
    { id: "representative_determinations", title: "Whether a representative must be designated", source_key: "representative_determinations", required: true },
    { id: "dpo_determination", title: "Whether a data protection officer must be designated", source_key: "dpo_determination", required: true },
    { id: "jurisdiction_determinations", title: "Where registration is required, conditional, or not required", source_key: "determinations", required: true },
    { id: "schedules", title: "The window and fee each statute states", source_key: "schedules", required: true },
    { id: "filing_readiness", title: "Whether the filing could be made from what is written down", source_key: "filing_readiness", required: true },
    { id: "corpus_pending", title: "Questions this assessment records but does not answer", source_key: "corpus_pending", required: true },
    { id: "information_needed", title: "What the record does not yet state", source_key: "information_needed", required: true },
    { id: "filing_steps", title: "What to do next", source_key: "filing_steps", required: true },
    { id: "attestation_block", title: "Approval, and when this must be looked at again", source_key: "attestation", required: true },
    ],
  },
});

export const APPROVED_PLAN_PRODUCTS: readonly string[] = Object.freeze(Object.keys(APPROVED_PLANS));

export function planFor(product: string): ApprovedPlan | undefined {
  return APPROVED_PLANS[product];
}

/** IR ships two artifacts; every other product ships one. */
export function planSectionsFor(product: string, artifact?: string): readonly PlanSection[] {
  const plan = APPROVED_PLANS[product];
  if (!plan) return [];
  if (!artifact) return plan.sections;
  return plan.sections.filter((s) => s.artifact === artifact);
}
