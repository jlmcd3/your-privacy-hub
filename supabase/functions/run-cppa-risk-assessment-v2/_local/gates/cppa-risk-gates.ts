/**
 * CPPA-RISK GATE REGISTRY (Two-Pass Architecture, Phase-1 authoring)
 * -------------------------------------------------------------------
 * Deterministic gates restructured per docs/design/LEGAL-TEST-PIPELINE.md
 * §3.3 so Pass 1 emits GateRuleOutcome rows the renderer keys on rather than
 * post-hoc scrubbers rebuilding intake state.
 *
 * All gates are CPPA-domain (Q4(e)). The current wiring lives in
 * run-cppa-risk-assessment and remains untouched this turn (authoring-only).
 */

import type { GateRuleOutcome, JurisdictionTag } from "../render-plan/schema.ts";

export interface GateSpec {
  readonly id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  /** Human description. */
  readonly description: string;
  /** The intake fields the gate reads (deterministic — never model output). */
  readonly intake_fields: readonly string[];
  /** What Pass 2 must do when outcome === "block". */
  readonly on_block: "suppress_section" | "suppress_assertions" | "substitute_neutral";
  /** Anchor pinpoint the gate keys off. */
  readonly anchor_pinpoint: string;
}

const CPPA: JurisdictionTag = "cppa-ca";

export const CPPA_RISK_GATES: readonly GateSpec[] = [
  {
    id: "G.q18.admt_consequence",
    jurisdiction_tag: CPPA,
    description:
      "Suppress § 7001(ddd) ADMT-consequence assertions when q18_admt_use is negative. This is a deterministic "
      + "suppression, not a model hint — the render layer must drop the section entirely.",
    intake_fields: ["q18_admt_use"],
    on_block: "suppress_section",
    anchor_pinpoint: "11 CCR § 7001(ddd)",
  },
  {
    id: "G.cohort.compliance_date",
    jurisdiction_tag: CPPA,
    description:
      "Compute the § 7150(c) cohort compliance date deterministically from the applicability prong(s) triggered and "
      + "the business's revenue band (V2 stat-aligned). Pass 2 must render the date verbatim from the gate outcome.",
    intake_fields: [
      "revenue_band",
      "consumer_band",
      "q_sells_or_shares",
      "q_processes_sensitive_pi",
      "q18_admt_use",
      "q5b_profiling_observation",
      "q_trains_admt",
    ],
    on_block: "substitute_neutral",
    anchor_pinpoint: "11 CCR § 7150(c)",
  },
  {
    id: "G.deadline.registry_access_timeline",
    jurisdiction_tag: CPPA,
    description:
      "Deadline-registry access timeline: block any § 7157 submission-timeline assertion when the required intake "
      + "(effective start date + cohort) is not both present and consistent with the deadline registry.",
    intake_fields: ["cohort_effective_date", "processing_start_date"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7157",
  },
  {
    id: "G.applicability.selling_sharing",
    jurisdiction_tag: CPPA,
    description: "Applicability gate — § 7150(b)(1) selling/sharing.",
    intake_fields: ["q_sells_or_shares"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(1)",
  },
  {
    id: "G.applicability.sensitive_pi",
    jurisdiction_tag: CPPA,
    description: "Applicability gate — § 7150(b)(2) sensitive PI (with § 7027 employment-benefits carve-out).",
    intake_fields: ["q_processes_sensitive_pi", "q_sensitive_pi_carveout"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(2)",
  },
  {
    id: "G.applicability.admt_significant_decision",
    jurisdiction_tag: CPPA,
    description: "Applicability gate — § 7150(b)(3) ADMT for significant decisions.",
    intake_fields: ["q18_admt_use", "q_admt_significant_decision"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(3)",
  },
  // ITEM 272 — § 7150(b) six-prong realignment. Draft-era gate
  // "G.applicability.extensive_profiling" is retired; final (b)(4) is
  // systematic-observation inference, final (b)(5) is sensitive-location
  // inference (new), final (b)(6) is training.
  {
    id: "G.applicability.systematic_observation",
    jurisdiction_tag: CPPA,
    description:
      "Applicability gate — § 7150(b)(4) inference from systematic observation of workers, students, or applicants. "
      + "Keyed to q5b_profiling_observation options \"Yes — systematic observation of workers/students/applicants\" and \"Both\".",
    intake_fields: ["q5b_profiling_observation"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(4)",
  },
  {
    id: "G.applicability.sensitive_location",
    jurisdiction_tag: CPPA,
    description:
      "Applicability gate — § 7150(b)(5) inference from a consumer's presence in a sensitive location. "
      + "Keyed to q5b_profiling_observation options \"Yes — based on sensitive-location presence\" and \"Both\", "
      + "plus sensitive_location_basis where present.",
    intake_fields: ["q5b_profiling_observation", "sensitive_location_basis"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(5)",
  },
  {
    id: "G.applicability.train_admt",
    jurisdiction_tag: CPPA,
    description: "Applicability gate — § 7150(b)(6) processing personal information to train an ADMT or identification technology.",
    intake_fields: ["q_trains_admt"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "11 CCR § 7150(b)(6)",
  },
  {
    id: "G.documentation.purpose_present",
    jurisdiction_tag: CPPA,
    description: "Documentation-presence gate — § 7152(a)(1) non-generic purpose.",
    intake_fields: ["processing_purpose"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "11 CCR § 7152(a)(1)",
  },
  {
    id: "G.documentation.categories_present",
    jurisdiction_tag: CPPA,
    description: "Documentation-presence gate — § 7152(a)(2) PI + sensitive PI categories.",
    intake_fields: ["pi_categories", "sensitive_pi_categories"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "11 CCR § 7152(a)(2)",
  },
  {
    id: "G.documentation.operational_elements_present",
    jurisdiction_tag: CPPA,
    description:
      "Documentation-presence gate — § 7152(a)(3)(A)-(G). (a)(3)(G) ADMT logic/output is required only when § 7150(b)(3) fires.",
    intake_fields: [
      "operational_method",
      "retention_period",
      "consumer_interaction_channel",
      "approximate_consumer_count",
      "disclosures_made",
      "recipients",
      "q18_admt_use",
    ],
    on_block: "substitute_neutral",
    anchor_pinpoint: "11 CCR § 7152(a)(3)",
  },
  {
    id: "G.documentation.approver_present",
    jurisdiction_tag: CPPA,
    description: "Documentation-presence gate — § 7152(a)(9) authorised approver.",
    intake_fields: ["approver_name", "approver_position"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "11 CCR § 7152(a)(9)",
  },
];

export const CPPA_RISK_GATE_INDEX: Readonly<Record<string, GateSpec>> =
  Object.freeze(Object.fromEntries(CPPA_RISK_GATES.map((g) => [g.id, g])));

/** Convenience: shape a GateSpec + resolution into the schema outcome type. */
export function toGateOutcome(
  gate: GateSpec,
  outcome: GateRuleOutcome["outcome"],
  reason?: string,
): GateRuleOutcome {
  return { gate_id: gate.id, outcome, reason };
}
