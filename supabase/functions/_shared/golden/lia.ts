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
      balancing_details: {
        ...base.balancing_details,
        // Fact recorded ONLY here — tests cross-read:
        additional_context: "Analytics EXCLUDES manager-only channels; managers were consulted 2026-05-12 (Works Council minutes filed).",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "Works Council|manager", flags: "i",
        label: "consumes fact from balancing_details.additional_context" },
    ],
  },
];
