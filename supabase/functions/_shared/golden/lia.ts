// QB-P20 — LIA golden set. 3 fixtures.
// Adversarial: key fact recorded ONLY in balancing_details.additional_context
// (tests CROSS-READ THE FULL INTAKE discipline).
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian Insights Ltd",
  subject_anchor: "Website visitors",
  processing_description: "Behavioural analytics on the marketing site to measure conversion funnels.",
  data_categories: ["Browsing/behavioural data", "Device/technical data"],
  relationship_type: "Website visitor (no account)",
  jurisdictions: ["United Kingdom (UK GDPR)"],
  stated_purpose: "Measure conversion funnel performance to improve marketing efficiency.",
  alternatives_considered: "Aggregated third-party analytics considered but rejected due to lack of funnel-step attribution.",
  purpose_details: { interest_holder: "Meridian Insights Ltd", interest_type: "Commercial — marketing effectiveness", interest_statement: "Measure funnel to improve site." },
  necessity_details: { alternatives: "Aggregated telemetry considered; insufficient granularity." },
  balancing_details: {
    reasonable_expectation: "Yes",
    potential_harm: "Minor",
    opt_out_mechanism: "Consent banner with granular reject-all; server-side suppression on opt-out.",
  },
  stage: "submitted",
  preview_assessment_id: "gold-preview-id-000",
};

export const LIA_GOLDEN: GoldenCase[] = [
  {
    id: "lia-uk-analytics-tuning",
    tool: "lia",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "legitimate interest|Article\\s*6\\(1\\)\\(f\\)", flags: "i", label: "LI basis named" },
      // W3-T2: per-factor balancing objects with intake_evidence.
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"relationship\"", label: "factor: relationship present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "factor: safeguards present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
    ],
  },
  {
    id: "lia-fintech-fraud-tuning",
    tool: "lia",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Helios Payments",
      subject_anchor: "Merchant customers",
      processing_description: "Fraud scoring across merchant transaction streams.",
      data_categories: ["Financial data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      stated_purpose: "Detect and prevent payment fraud.",
    },
    assertions: [
      { kind: "must_include", pattern: "necessity", flags: "i", label: "necessity assessed" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "impact_severity", label: "factor: impact_severity present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
    ],
  },
  {
    id: "lia-fact-in-balancing-only-adversarial",
    tool: "lia",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Cascade HR Ltd",
      subject_anchor: "Employees",
      processing_description: "Internal collaboration analytics.",
      relationship_type: "Employee",
      // R-TURN-1 item 8 — HR sector override: prevent website-visitor
      // marketing base fields (data_categories, stated_purpose,
      // purpose_details) from leaking into an employee-analytics fixture.
      data_categories: ["Collaboration-platform metadata", "Employee identifiers"],
      stated_purpose: "Understand internal collaboration patterns and workload distribution to support workforce planning.",
      purpose_details: { interest_holder: "Cascade HR Ltd", interest_type: "Employer — workforce administration", interest_statement: "Support workload planning and internal collaboration." },
      necessity_details: { alternatives: "Manager self-report considered; insufficient granularity and consistency for workload planning." },
      balancing_details: {
        ...base.balancing_details,
        // Fact recorded ONLY here — tests cross-read:
        additional_context: "Analytics EXCLUDES manager-only channels; managers were consulted 2026-05-12 (Works Council minutes filed).",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "Works Council|manager", flags: "i",
        label: "consumes fact from balancing_details.additional_context" },
      { kind: "must_include", pattern: "reasonable_expectations", label: "factor: reasonable_expectations present" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "factor: safeguards present" },
      { kind: "must_include", pattern: "intake_evidence", label: "factors carry intake_evidence anchors" },
    ],
  },
  {
    // R-TURN-3: absence-convention adversarial fixture. Intake omits any
    // safeguards or opt-out signal, so the safeguards factor MUST use the
    // absence convention (intake_evidence: [], evidence_absence populated).
    id: "lia-absence-convention-adversarial",
    tool: "lia",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Northwind Retail Ltd",
      subject_anchor: "Loyalty-programme members",
      processing_description: "Segmentation of loyalty-programme members for cross-sell campaigns.",
      data_categories: ["Loyalty-programme transaction history", "Contact identifiers"],
      relationship_type: "Existing customer (loyalty enrolment)",
      stated_purpose: "Improve relevance of cross-sell offers to loyalty members.",
      balancing_details: {
        reasonable_expectation: "Yes",
        potential_harm: "Minor",
        // R-TURN-3 absence convention target is the SAFEGUARDS factor
        // (safeguards / safeguards_other / additional_context all omitted).
        // opt_out_mechanism is required-always by the LIA contract; we
        // populate it with a scenario-consistent narrative that itself
        // records an absence of a working mechanism, so the adversarial
        // intent (evidence_absence surfaces on the safeguards factor) is
        // preserved while the contract validator passes.
        opt_out_mechanism: "No standing opt-out mechanism is offered to loyalty members for cross-sell segmentation; profile removal requires unsubscribing from the loyalty programme.",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "evidence_absence", label: "safeguards factor uses R-TURN-3 absence convention" },
      { kind: "must_include", pattern: "does not present", flags: "i", label: "canonical absence sentence surfaces" },
      { kind: "must_include", pattern: "\"factor\"\\s*:\\s*\"safeguards\"", label: "safeguards factor present" },
    ],
  },
];
