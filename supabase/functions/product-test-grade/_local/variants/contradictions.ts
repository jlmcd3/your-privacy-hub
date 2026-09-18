// product-test-grade — authored contradiction rows (doc 272 §4 "contradict").
//
// FIRST-DRAFT, LEAD-REVIEWED PER DOC 272 §8: "A Sonnet agent may propose new
// contradiction rows; they are reviewed by the lead and committed as code
// before use." These rows were authored by an agent against the real
// contract field names and enum options (verified against
// `_shared/intake-contracts/*.ts`, 2026-09-18) and need the lead's sign-off
// before a run relies on them.
//
// Each row names the keys it changes (`changes`, applied over the golden
// intake via dotted-path set) and the phrasing the resulting document must
// then NOT assert (`must_not_contain`) — the phrasing a generator would emit
// if it trusted the now-contradicted field instead of noticing the
// inconsistency. At least three rows per Auto product, one of each
// archetype: a yes/no flipped against its narrative, a count outside its
// band, an approval date before the assessment date.

import type { ProductTestTool } from "../types.ts";

export interface ContradictionRow {
  readonly id: string;
  readonly description: string;
  readonly archetype: "yes-no-vs-narrative" | "count-outside-band" | "date-before-assessment";
  /** Dotted-path key -> new value, applied to a clone of the golden intake. */
  readonly changes: Readonly<Record<string, unknown>>;
  readonly must_not_contain: readonly string[];
}

export const CONTRADICTIONS_BY_TOOL: Partial<Record<ProductTestTool, readonly ContradictionRow[]>> = {
  "cppa-risk": [
    {
      id: "risk-existing-dpia-flip",
      description:
        "i9_has_existing_dpia says No while i9_existing_dpia_summary narrates a completed prior DPIA — a yes/no flipped against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        i9_has_existing_dpia: "No",
        i9_existing_dpia_summary:
          "A Data Protection Impact Assessment for this processing activity was completed on 2026-03-01 and is on file with the Company's privacy team.",
      },
      must_not_contain: ["no existing dpia", "no prior dpia", "has not conducted a dpia"],
    },
    {
      id: "risk-consumer-volume-vs-operand",
      description:
        "q2_consumers is banded 'Under 100,000' while bought_sold_shared_count reports '1,000,000 or more' — an operand outside the population band that contains it.",
      archetype: "count-outside-band",
      changes: {
        q2_consumers: "Under 100,000",
        bought_sold_shared_count: "1,000,000 or more",
      },
      must_not_contain: ["under 100,000", "fewer than 100,000 consumers"],
    },
    {
      id: "risk-approval-before-assessment",
      description:
        "a9_approval_date set to a date before the report date the harness injects — an approval predating the assessment it approves.",
      archetype: "date-before-assessment",
      changes: {
        a9_approval_date: "2020-01-01",
      },
      must_not_contain: [],
    },
  ],
  "cppa-cyber": [
    {
      id: "cyber-incidents-vs-notice",
      description:
        "profile.incidents_12mo reports 'More than 5' while profile.consumer_notice_status says 'No notice was required' — a count outside the band its own notice posture implies.",
      archetype: "count-outside-band",
      changes: {
        "profile.incidents_12mo": "More than 5",
        "profile.consumer_notice_status": "No notice was required",
      },
      must_not_contain: ["no notice was required", "no notification was necessary"],
    },
    {
      id: "cyber-password-auth-flip",
      description:
        "profile.password_auth_used is No while the maturity/evidence text for control c1_auth narrates password-based authentication in production — a yes/no flipped against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        "profile.password_auth_used": "No",
      },
      must_not_contain: ["does not use password", "password authentication is not used"],
    },
    {
      id: "cyber-audit-before-assessment",
      description:
        "profile.last_audit is set to 'Never' while profile.auditor_engagement_status narrates an audit report delivered last quarter — a completed-audit narrative against a 'Never audited' record.",
      archetype: "date-before-assessment",
      changes: {
        "profile.last_audit": "Never",
      },
      must_not_contain: ["last audited", "most recent audit"],
    },
  ],
  "cppa-admt": [
    {
      id: "admt-human-review-flip",
      description:
        "human_review says 'No — fully automated, no human review' while role_roster narrates a named reviewer with override authority — a yes/no flipped against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        human_review: "No — fully automated, no human review",
      },
      must_not_contain: ["human reviewer", "reviewed by a person before"],
    },
    {
      id: "admt-system-count-vs-vendor",
      description:
        "admt_system_count is set to '0' while third_party_admt names a named vendor system — a count outside the band its own vendor answer implies.",
      archetype: "count-outside-band",
      changes: {
        admt_system_count: "0",
      },
      must_not_contain: ["zero admt systems", "no admt systems"],
    },
    {
      id: "admt-appeal-before-decision",
      description:
        "opt_out_appeal_process narrates an appeal decided before the significant decision it appeals — an approval-like event before the assessment it depends on.",
      archetype: "date-before-assessment",
      changes: {
        opt_out_appeal_process:
          "The appeal was reviewed and decided on 2020-01-01, before the ADMT decision under assessment was made.",
      },
      must_not_contain: [],
    },
  ],
  "dpia": [
    {
      id: "dpia-solely-automated-flip",
      description:
        "automated_decision_nature says solely automated with no human review while dpia_team narrates a named reviewer who signs off on every decision — a yes/no-shaped flip against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        automated_decision_nature:
          "Solely automated — no person with authority to change the outcome reviews the decision before it takes effect",
        dpia_team:
          "Every automated decision is reviewed and may be overturned by the DPO before it takes effect.",
      },
      must_not_contain: ["no person reviews", "without human review"],
    },
    {
      id: "dpia-end-status-vs-date",
      description:
        "processing_end_status says 'Ongoing — no planned end' while estimated_end_date carries a concrete end date — a status outside the band its own date field implies.",
      archetype: "count-outside-band",
      changes: {
        processing_end_status: "Ongoing — no planned end",
        estimated_end_date: "2027-06-30",
      },
      must_not_contain: ["no planned end", "ongoing with no end date"],
    },
    {
      id: "dpia-approval-before-launch",
      description:
        "dpia_approval_date set to a date before estimated_launch_date's own predecessor assessment — an approval predating the assessment it approves.",
      archetype: "date-before-assessment",
      changes: {
        dpia_approval_date: "2020-01-01",
      },
      must_not_contain: [],
    },
  ],
  "lia": [
    {
      id: "lia-reasonable-expectation-flip",
      description:
        "balancing_details.reasonable_expectation says 'Unlikely — this would surprise most data subjects' while purpose_details narrates the processing as directly disclosed and expected — a yes/no-shaped flip against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        "balancing_details.reasonable_expectation": "Unlikely — this would surprise most data subjects",
      },
      must_not_contain: ["would not surprise", "fully expected by data subjects"],
    },
    {
      id: "lia-scale-vs-relationship",
      description:
        "balancing_details.relationship_category is set to a narrow direct-customer relationship while balancing_details.scale_approx reports a population far larger than that relationship could produce — a count outside the band its own relationship category implies.",
      archetype: "count-outside-band",
      changes: {
        "balancing_details.scale_approx": "Over 10 million data subjects",
      },
      must_not_contain: ["small, defined group", "limited to our direct customers"],
    },
    {
      id: "lia-attestation-before-analysis",
      description:
        "attestation.approval_status is set to approved with a date preceding the balancing analysis it approves — an approval predating the assessment it depends on.",
      archetype: "date-before-assessment",
      changes: {
        "attestation.approval_status": "Approved",
      },
      must_not_contain: [],
    },
  ],
  "governance": [
    {
      id: "gov-training-flip",
      description:
        "training_status says 'No formal training' while additional_context narrates a mandatory annual training program — a yes/no-shaped flip against its own narrative.",
      archetype: "yes-no-vs-narrative",
      changes: {
        training_status: "No formal training",
        additional_context: "All staff complete mandatory annual privacy training with a documented refresh cycle.",
      },
      must_not_contain: ["no formal training", "training is not provided"],
    },
    {
      id: "gov-dpia-status-vs-count",
      description:
        "dpia_status says 'No, none conducted' while dpia_ai_coverage narrates DPIAs completed for every AI system in scope — a status outside the band its own coverage answer implies.",
      archetype: "count-outside-band",
      changes: {
        dpia_status: "No, none conducted",
      },
      must_not_contain: ["no dpias have been conducted", "zero dpias completed"],
    },
    {
      id: "gov-measures-review-before-assessment",
      description:
        "measures_last_review_date is set to a date before the governance assessment's own report date — a review predating the assessment that relies on it.",
      archetype: "date-before-assessment",
      changes: {
        measures_last_review_date: "2020-01-01",
      },
      must_not_contain: [],
    },
  ],
};
