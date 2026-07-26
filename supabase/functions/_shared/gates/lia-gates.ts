/**
 * LIA GATE REGISTRY (Legal Test Pipeline, Phase-1 authoring)
 * -----------------------------------------------------------
 * Deterministic gates for run-li-assessment per docs/design/
 * LEGAL-TEST-PIPELINE.md §3.3. All gates are GDPR-EU domain (Q4(e));
 * UK sub-tag units reuse these gates unchanged (Recital 47 and Art 6(1)(f)
 * are carried across into UK GDPR by DPA 2018).
 *
 * NO WIRING: this file is data only. run-li-assessment remains untouched
 * this turn (Phase 2 will wire).
 */

import type { GateRuleOutcome, JurisdictionTag } from "../render-plan/schema.ts";

export interface GateSpec {
  readonly id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly description: string;
  readonly intake_fields: readonly string[];
  readonly on_block: "suppress_section" | "suppress_assertions" | "substitute_neutral";
  readonly anchor_pinpoint: string;
}

const GDPR_EU: JurisdictionTag = "gdpr-eu";

export const LIA_GATES: readonly GateSpec[] = [
  {
    id: "G.necessity.precedes_balancing",
    jurisdiction_tag: GDPR_EU,
    description:
      "Ordering gate — the balancing step is not reached when necessity fails. Where the intake shows a reasonably "
      + "available less-intrusive means (or the necessity Type-W weighing lands firmly negative), Pass 2 must "
      + "suppress the balancing section and render only the necessity determination + fail-out consequence.",
    intake_fields: [
      "less_intrusive_means_available",
      "purpose_description",
      "data_categories",
      "processing_operations",
    ],
    on_block: "suppress_section",
    anchor_pinpoint: "GDPR Art. 6(1)(f)",
  },
  {
    id: "G.special_category.exclusion",
    jurisdiction_tag: GDPR_EU,
    description:
      "Special-category exclusion — Art 9 data cannot rest on Art 6(1)(f) alone. When intake indicates special "
      + "categories are in scope AND no Art 9(2) condition is supplied, Pass 2 must suppress the LI-based "
      + "conclusion for the special-category slice and render the Art 9 gap explicitly.",
    intake_fields: [
      "processes_special_category_data",
      "article_9_condition",
      "special_category_types",
    ],
    on_block: "suppress_section",
    anchor_pinpoint: "GDPR Art. 6(1)(f) + Art. 9",
  },
  {
    id: "G.public_authority.exclusion",
    jurisdiction_tag: GDPR_EU,
    description:
      "Public-authority exclusion — Art 6(1)(f) does not apply to processing by public authorities in the "
      + "performance of their tasks (Recital 47 final sentence; Art 6(1) closing paragraph). When intake identifies "
      + "the controller as a public authority AND the processing is 'in the performance of its tasks', the entire "
      + "LI conclusion is suppressed and a neutral 'LI not available' render is substituted.",
    intake_fields: ["is_public_authority", "processing_is_task_execution"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "GDPR Recital 47 (final sentence)",
  },
  {
    id: "G.lawfulness.li_available",
    jurisdiction_tag: GDPR_EU,
    description:
      "Presence gate — LI conclusion requires the intake to declare a legitimate interest of the controller (or a "
      + "third party). Absent that declaration Pass 2 substitutes a 'no interest asserted' neutral render.",
    intake_fields: ["legitimate_interest_statement", "third_party_interest_statement"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "GDPR Art. 6(1)(f)",
  },
  {
    id: "G.purpose.presence",
    jurisdiction_tag: GDPR_EU,
    description:
      "Documentation-presence gate — the LI report must include a non-generic purpose statement. Substantive "
      + "adequacy is Type J; this gate is presence-only.",
    intake_fields: ["purpose_description"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "GDPR Art. 6(1)(f)",
  },
  {
    id: "G.right_to_object.disclosure",
    jurisdiction_tag: GDPR_EU,
    description:
      "Surface gate — LI reports must acknowledge the Art 21(1) right to object. Missing acknowledgement is "
      + "suppressed at the section level and a neutral disclosure is substituted.",
    intake_fields: ["right_to_object_disclosed"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "GDPR Art. 21(1)",
  },
  {
    id: "G.child_data.heightened_weight",
    jurisdiction_tag: GDPR_EU,
    description:
      "Balancing modifier gate — Art 6(1)(f) directs 'in particular where the data subject is a child'. When "
      + "intake identifies children in the data-subject population, the balancing frame is required to render the "
      + "heightened-weight anchor and Pass 2 selects the hedged variant unless safeguards clearly tip the balance.",
    intake_fields: ["data_subjects_include_children"],
    on_block: "suppress_assertions",
    anchor_pinpoint: "GDPR Art. 6(1)(f) (children clause)",
  },
  {
    id: "G.uk_unit.limited_guidance_disclosure",
    jurisdiction_tag: "gdpr-uk",
    description:
      "UK-unit rendering gate — per item 136 CEO deferral of ICO ingestion, any UK-tagged unit must render with a "
      + "LIMITED-GUIDANCE DISCLOSURE (\"This UK LI analysis relies on the GDPR text as carried into UK law; ICO "
      + "guidance is not yet integrated\") in a fixed slot. Non-blocking gate — assertion is required, not suppressed.",
    intake_fields: ["report_unit_jurisdiction"],
    on_block: "substitute_neutral",
    anchor_pinpoint: "N/A (rendering discipline)",
  },
];

export const LIA_GATE_INDEX: Readonly<Record<string, GateSpec>> =
  Object.freeze(Object.fromEntries(LIA_GATES.map((g) => [g.id, g])));

export function liaGateToOutcome(
  gate: GateSpec,
  outcome: GateRuleOutcome["outcome"],
  reason?: string,
): GateRuleOutcome {
  return { gate_id: gate.id, outcome, reason };
}
