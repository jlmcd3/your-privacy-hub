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
  {
    // ITEM 311 — "Perfect Data" case. Supplies EVERY field the Chapter 7
    // rebuild added (balancing_details.collection_context /
    // .children_data_subjects / .additional_mitigations,
    // purpose_details.controller_is_public_authority / .public_task_processing)
    // with specific, scenario-bound content, so the lia deliverables exercise
    // the ANALYSED path rather than the record_insufficient scaffold.
    //
    // The collection_context is deliberately written to the RELATIONSHIP and
    // the SETTING of collection rather than to a notice — a notice-only record
    // is downgraded to partly_expected by design (EDPB 1/2024: the mere
    // fulfilment of information duties is not sufficient in itself).
    //
    // additional_mitigations carries one measure the GDPR already requires and
    // one that goes beyond it, so both arms of the EDPB II.C.4 classification
    // are exercised by a single fixture.
    id: "lia-perfect-record",
    tool: "lia",
    set: "tuning",
    intake: {
      organization_name: "Halden Acquiring AB",
      subject_anchor: "Merchant principals and their named finance contacts",
      processing_description:
        "Transaction-level fraud screening across the acquiring book: each card authorisation is scored against the merchant's own settlement history and against chargeback patterns on the acquiring portfolio, and scores above threshold hold the settlement for manual review.",
      data_categories: ["Purchase/transaction history", "Financial data", "Device/technical data"],
      relationship_type: "Existing customer",
      jurisdictions: ["EU (GDPR)"],
      stated_purpose:
        "Detect and hold fraudulent card settlements on the acquiring book before funds leave the client account.",
      alternatives_considered:
        "Scheme-level fraud flags alone were tested over the 2025 book and missed 41 of 63 confirmed first-party fraud cases because they carry no merchant settlement history; manual review of every settlement above EUR 2,000 was costed and rejected because it delays legitimate settlement by two working days, which defeats the purpose of same-day acquiring rather than merely costing more.",
      purpose_details: {
        interest_holder: "Halden Acquiring AB and the merchants whose settlements it holds",
        interest_type: "Fraud prevention on the acquiring book",
        interest_statement:
          "Halden Acquiring AB carries the settlement loss on fraudulent card authorisations under its scheme membership; the interest is in identifying those authorisations before funds leave the client account, and it is present rather than speculative — 63 first-party fraud cases were confirmed on the 2025 book.",
        controller_is_public_authority: "No",
        public_task_processing: "Not applicable",
      },
      necessity_details: {
        alternatives:
          "Scheme-level fraud flags alone were tested over the 2025 book and missed 41 of 63 confirmed cases because they carry no merchant settlement history; manual review of every settlement above EUR 2,000 was costed and rejected because it delays legitimate settlement by two working days, which defeats same-day acquiring.",
        why_consent_not_used:
          "A merchant asked to consent to fraud screening of its own settlements could withdraw that consent and continue to transact, which would leave the acquiring book unscreened at exactly the point where screening matters.",
        data_minimised:
          "Scoring reads settlement amount, timing, terminal identifier and chargeback history only; cardholder identity fields are not read into the model and the score is discarded 90 days after settlement clears.",
      },
      balancing_details: {
        reasonable_expectation: "Yes",
        reasonable_expectation_detail:
          "Fraud screening of settlements is a condition of scheme membership that the merchant itself relies on when it disputes a chargeback.",
        collection_context:
          "The data are collected at merchant onboarding, in the acquiring agreement signed on the merchant's premises or through the onboarding portal, and thereafter automatically at each card authorisation the merchant itself initiates. Fraud screening of those authorisations was described and negotiated at onboarding as part of the settlement terms, and it operates continuously from the first transaction — it is not a later use of data collected for something else.",
        children_data_subjects: "No",
        vulnerable_subjects: ["None"],
        potential_harm: "Moderate",
        potential_harm_detail:
          "A false positive holds a merchant's settlement for up to 24 hours, which for a small merchant can delay supplier payments; it does not affect the cardholder and does not produce a scheme-level record against the merchant.",
        safeguards: [
          "Access controls / least privilege",
          "Retention limits",
          "Independent oversight (DPO / privacy committee)",
        ],
        opt_out_mechanism:
          "A merchant may request that scoring be limited to scheme-level flags only; the request is actioned within one business day and recorded against the merchant record, with the trade-off (slower chargeback defence) set out in writing.",
        additional_mitigations:
          "Encryption at rest and in transit across the scoring pipeline; a merchant whose settlement is held may demand human re-review by a named analyst within 24 hours and receive the reason the score fired, neither of which the GDPR requires of the controller",
        special_category_data: false,
        additional_context:
          "The threshold was recalibrated on 2026-03-02 after the false-positive rate on merchants under EUR 50,000 monthly volume was found to be three times the book average.",
      },
      stage: "submitted",
      preview_assessment_id: "gold-preview-id-311",
    },
    assertions: [
      { kind: "must_include", pattern: "reasonable_expectations", label: "named reasonable-expectations finding present" },
      { kind: "must_include", pattern: "child_factor", label: "child factor is an explicit determination" },
      { kind: "must_include", pattern: "public_authority_exclusion", label: "public-authority exclusion is an explicit determination" },
      { kind: "must_include", pattern: "lia_determination", label: "determination object present" },
      { kind: "must_include", pattern: "mitigations", label: "determination carries mitigations" },
    ],
  },
];

