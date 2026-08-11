/**
 * ITEM 310 — risk catalogue + registry grouping for the dpia deliverables.
 *
 * REUSE LAW: every statutory string used by the builder comes from
 * ../../registry/dpia-verified-authorities.ts (which is itself pinned to the
 * approved corpus rows gdpr-art-35 / gdpr-art-36 / EDPB 2/2019). NOTHING is
 * re-derived or re-typed here.
 *
 * The risk catalogue below is NOT statutory text — it is a closed list of
 * risk TYPES with the intake condition that raises each one. Every entry's
 * `source` is phrased as a read of the record, and the builder only emits an
 * entry when the record actually triggers it.
 */
import { DPIA_VERIFIED_AUTHORITIES } from "../../registry/dpia-verified-authorities.ts";
import { requireVerified } from "../../../../_shared/verified-authority-resolver.ts";
import type { Severity } from "../../../../_shared/ltp/dpia-deliverables/types.ts";

/** Resolve a DPIA registry row, or null when the key is absent. */
export function row(key: string) {
  try {
    return requireVerified(DPIA_VERIFIED_AUTHORITIES, key);
  } catch {
    return null;
  }
}

/**
 * PROMPT 8 (CEO-ratified 2026-08-11) — EDPB template risk split.
 *   "design"   — the risk the processing poses AS DESIGNED, with no failure,
 *                deviation or attack assumed (EDPB template § 3.1).
 *   "incident" — the risk arising from deviation, malfunction or attack
 *                (EDPB template § 4.1.1).
 * Every spec carries exactly one class; the register propagates it.
 */
export type DpiaRiskClass = "design" | "incident";

export interface RiskSpec {
  readonly risk_id: string;
  readonly risk_label: string;
  /** PROMPT 8 — EDPB § 3.1 (design) vs § 4.1.1 (incident). */
  readonly risk_class: DpiaRiskClass;
  readonly affected_rights: string;
  /** Intrinsic severity of the risk type when it materialises. */
  readonly severity: Severity;
  /** Human-readable statement of what in the record raises the risk. */
  readonly source_template: string;
  /**
   * Recorded safeguards (verbatim intake option strings) that bear on THIS
   * risk. Coverage over this list drives likelihood and the residual band.
   */
  readonly mitigating_safeguards: readonly string[];
  /** Predicate over a normalised view of the intake. */
  readonly trigger: (f: RiskFacts) => boolean;
}

/** Normalised, already-read facts the triggers close over (no I/O). */
export interface RiskFacts {
  readonly dataCategories: readonly string[];
  readonly safeguards: readonly string[];
  readonly processors: readonly string[];
  readonly transferCount: number;
  readonly retentionStated: boolean;
  readonly reasons: readonly string[];
  readonly secondaryUses: string;
  readonly volume: string;
}

const SPECIAL_CATS = ["Health or medical data", "Biometric data"];

export const DPIA_RISK_SPECS: readonly RiskSpec[] = [
  {
    risk_id: "r1_unauthorised_access",
    risk_class: "incident",
    risk_label: "Unauthorised access to, or disclosure of, the personal data held",
    affected_rights: "Confidentiality of personal data; Art. 5(1)(f) integrity and confidentiality",
    severity: "Significant",
    source_template:
      "The record describes personal data held in an operational system, which is exposed to unauthorised access or disclosure for as long as it is retained.",
    mitigating_safeguards: [
      "Encryption at rest",
      "Encryption in transit",
      "Access controls",
      "Staff training",
    ],
    trigger: () => true,
  },
  {
    risk_id: "r2_special_category_exposure",
    risk_class: "design",
    risk_label: "Exposure of special-category data",
    affected_rights: "Art. 9 protection of special categories; privacy and non-discrimination",
    severity: "Severe",
    source_template:
      "The record states that the processing includes special-category data, so any confidentiality failure carries Art. 9-level consequences for the data subjects.",
    mitigating_safeguards: [
      "Encryption at rest",
      "Pseudonymisation",
      "Access controls",
      "Data minimisation",
    ],
    trigger: (f) => f.dataCategories.some((c) => SPECIAL_CATS.includes(c)),
  },
  {
    risk_id: "r3_children",
    risk_class: "design",
    risk_label: "Processing of children's data without age-appropriate protection",
    affected_rights: "Rights of children as vulnerable data subjects; Recital 38 considerations",
    severity: "Severe",
    source_template:
      "The record states that the processing includes children's data, and children are less able to appreciate or object to the processing.",
    mitigating_safeguards: ["Data minimisation", "Access controls", "Staff training"],
    trigger: (f) => f.dataCategories.includes("Children's data"),
  },
  {
    risk_id: "r4_excessive_collection",
    risk_class: "design",
    risk_label: "Collection or retention of more personal data than the purpose requires",
    affected_rights: "Art. 5(1)(c) data minimisation; Art. 5(1)(e) storage limitation",
    severity: "Moderate",
    source_template:
      "The record does not show a minimisation control applied to the data set described, so the volume collected may exceed what the stated purpose requires.",
    mitigating_safeguards: ["Data minimisation", "Anonymisation", "Pseudonymisation"],
    trigger: (f) => !f.safeguards.includes("Data minimisation"),
  },
  {
    risk_id: "r5_third_country_transfer",
    risk_class: "incident",
    risk_label: "Loss of protection on transfer to a third country",
    affected_rights: "Chapter V protections travelling with the data",
    severity: "Significant",
    source_template:
      "The record declares at least one transfer flow leaving the origin regime, so the level of protection depends on the Chapter V mechanism relied on.",
    mitigating_safeguards: ["Contractual restrictions", "Encryption in transit", "Encryption at rest"],
    trigger: (f) => f.transferCount > 0,
  },
  {
    risk_id: "r6_processor_chain",
    risk_class: "incident",
    risk_label: "Loss of control over the data in the processor chain",
    affected_rights: "Art. 28 controller control over processing; Art. 5(2) accountability",
    severity: "Moderate",
    source_template:
      "The record names third-party processors or tools handling the data, so control over the processing depends on the instructions and guarantees in place with them.",
    mitigating_safeguards: ["DPA signed with processor", "Contractual restrictions", "Access controls"],
    trigger: (f) => f.processors.length > 0,
  },
  {
    risk_id: "r7_retention_overrun",
    risk_class: "design",
    risk_label: "Retention of personal data beyond the period the purpose supports",
    affected_rights: "Art. 5(1)(e) storage limitation; Art. 17 erasure",
    severity: "Moderate",
    source_template:
      "The record does not state a retention period for this processing, so data may be held after the purpose is spent.",
    mitigating_safeguards: ["Data minimisation", "Anonymisation"],
    trigger: (f) => !f.retentionStated,
  },
  {
    risk_id: "r8_automated_significant_effect",
    risk_class: "design",
    risk_label: "Automated evaluation producing legal or similarly significant effects",
    affected_rights: "Art. 22 rights in automated decision-making; fairness under Art. 5(1)(a)",
    severity: "Severe",
    source_template:
      "The record selects an evaluation, scoring or automated-decision reason for conducting this DPIA, so decisions taken about individuals may carry legal or similarly significant effects.",
    mitigating_safeguards: ["Staff training", "Access controls"],
    trigger: (f) =>
      f.reasons.some((r) =>
        /Evaluation or scoring|Automated decision-making|Systematic, extensive evaluation/i.test(r)
      ),
  },
  {
    risk_id: "r9_secondary_use",
    risk_class: "design",
    risk_label: "Use of the data for a purpose the data subject did not expect",
    affected_rights: "Art. 5(1)(b) purpose limitation; Art. 6(4) compatibility",
    severity: "Significant",
    source_template:
      "The record describes secondary uses of the same data, which must each remain compatible with the purpose for which the data was collected.",
    mitigating_safeguards: ["Contractual restrictions", "Data minimisation", "Access controls"],
    trigger: (f) => f.secondaryUses.length > 0,
  },
];

/** Statutory anchors used by each deliverable — resolved, never retyped. */
export const ANCHOR_KEYS = {
  necessity: "dpia_content_necessity",
  necessity_test: "edpb_2_2019_necessity_test",
  useful_not_necessary: "edpb_2_2019_useful_not_necessary",
  risks: "dpia_content_risks",
  measures: "dpia_content_measures",
  art36: "prior_consultation_art_36",
  art36_materials: "prior_consultation_materials_art_36_3",
  views: "consultation_of_data_subjects_35_9",
  dpo_advice: "dpia_dpo_advice",
  // WP248-PINNING (2026-08-01) — WP248 rev.01 is now anchored in the registry,
  // so the "reasons to conduct" criteria call and the risk-severity appraisal
  // cite verbatim guidance instead of being barred as unanchored.
  high_risk_criteria: "high_risk_criteria_edpb_wp248",
  risk_severity: "risk_severity_edpb_wp248",
  // PILOT 2026-08-11 — Art. 6(1)(f) legal-basis builder anchors.
  legitimate_interests: "lawful_basis_legitimate_interests",
  lawfulness: "principle_lawfulness_fairness_transparency",
  // PHASE 0 PROMPT 2 (2026-08-11) — per-basis anchors for Art. 6(1)(a)–(e).
  // These resolve through the same regime-aware `row()` path as every other
  // anchor. Where the verified registry carries no row for the sub-basis the
  // anchor resolves to empty strings, and the caller MUST leave
  // authority_verbatim empty rather than quote a different provision.
  consent: "lawful_basis_consent",
  contract: "lawful_basis_contract",
  legal_obligation: "lawful_basis_legal_obligation",
  vital_interests: "lawful_basis_vital_interests",
  public_task: "lawful_basis_public_task",
  // PROMPT 7 (2026-08-11) — Section-2 coverage anchors.
  special_categories: "special_categories_prohibition",
  minimisation: "principle_data_minimisation",
  purpose_limitation: "principle_purpose_limitation",
  dpbd: "data_protection_by_design",
  processor_contract: "processor_written_contract",
  security: "security_appropriate_measures",
} as const;


/**
 * PROMPT 7 (2026-08-11) — safeguard spec table for the Section-2 security
 * coverage rows. NOT statutory text: each entry is PRE-AUTHORED fixed prose
 * describing what the customer's own recorded selection means in operational
 * terms. One entry per option of the DPIA intake's `existing_safeguards` enum
 * (src/pages/DPIAFramework.enums.ts → SAFEGUARDS), including "None", which is
 * an explicit determination row and never silence.
 *
 * CONTENT LAW: descriptive, never a legal conclusion; no fine/penalty framing;
 * the word "gap" never appears. The builder renders the description as-is and
 * attributes it to the selection the record actually carries.
 */
export interface SafeguardSpec {
  /** VERBATIM intake enum option. */
  readonly measure: string;
  readonly description: string;
}

export const DPIA_SAFEGUARD_SPECS: readonly SafeguardSpec[] = [
  {
    measure: "Encryption at rest",
    description:
      "Stored copies of the personal data are held in encrypted form, so that access to the underlying storage does not by itself disclose the data.",
  },
  {
    measure: "Encryption in transit",
    description:
      "The personal data is carried over encrypted channels between the systems that handle it, so that it is not readable while in transit across a network.",
  },
  {
    measure: "Access controls",
    description:
      "Access to the personal data is restricted to identified accounts with defined permissions, so that only the people whose role requires the data can reach it.",
  },
  {
    measure: "Data minimisation",
    description:
      "The data set is limited to the fields the recorded purpose requires, so that data outside that purpose is not collected or held in the first place.",
  },
  {
    measure: "Pseudonymisation",
    description:
      "Direct identifiers are replaced with reference values held separately, so that the records cannot be attributed to an individual without the additional information.",
  },
  {
    measure: "Staff training",
    description:
      "The people who handle the personal data receive instruction on how it may be used and on the handling rules that apply to it.",
  },
  {
    measure: "DPA signed with processor",
    description:
      "A written processing contract is in place with the processor, setting the instructions and handling terms the processor is bound to.",
  },
  {
    measure: "Anonymisation",
    description:
      "Data is transformed so that individuals can no longer be identified from it, and the transformed output is handled outside the identifiable data set.",
  },
  {
    measure: "Contractual restrictions",
    description:
      "Contract terms limit what recipients of the personal data may do with it, including onward disclosure and use for their own purposes.",
  },
  {
    measure: "None",
    description:
      "The record states that no safeguard from the list was selected for this processing, so this assessment proceeds on the basis that no technical or organisational measure is recorded here.",
  },
] as const;
