/**
 * CPPA-RISK CONCLUSION INVENTORY (Legal Test v2.1, Phase-1 authoring)
 * ------------------------------------------------------------------
 * Every assertable conclusion the run-cppa-risk-assessment generator can
 * emit, tagged R/W/J per docs/design/LEGAL-TEST.md and jurisdiction-scoped
 * per Q4(e) authority-domain matching.
 *
 * DOMAIN: all conclusions are `cppa-ca` (California / CPPA regulations).
 * The risk assessment tool is a pure CPPA product; there are no GDPR or
 * US-state analysis units. Any future comparative feature would be a
 * separate CEO decision (per LEGAL-TEST §Q4(e)).
 *
 * SOURCES: this inventory is refined against the actual report surfaces
 * currently emitted by run-cppa-risk-assessment (headers, deadline block,
 * §7150 applicability paragraph, §7152(a)(4)-(6) balancing prose, safeguards
 * summary, closing determination). Type W is reserved for the single
 * conclusion the regulation phrases as a weighing test ("outweigh"); every
 * other conclusion is a Type R rule or a Type J reserved judgment.
 *
 * v2.2 AUTHORITY-WEIGHT CONSTRAINT (CEO-CORRECTED 2026-07-26): all Type R
 * `anchor` and `supporting_anchors` in this file are BINDING-tier CPPA/CA
 * authority (California statutes and 11 CCR regulations). Type R may never
 * anchor on persuasive material; Type W factor anchors are binding-only;
 * persuasive material (FSOR-mediated non-CA) is confined to Pass G's
 * weighing_frame with `fsor_mediation_ref` and template-enforced marking.
 *
 * NO WIRING: this file is data only. Phase 2 wires it into the Pass-1
 * derivation and the Type-W checks feed Pass G candidate-set closure.
 */

export type EpistemicType = "R" | "W" | "J";

export type JurisdictionTag =
  | "cppa-ca"
  | "gdpr-eu"
  | "gdpr-uk"
  | `us-state-${string}`;

export interface StatutoryAnchor {
  /** Corpus key (matches provision_texts.key or cppa_authorities citation). */
  readonly corpus_key: string;
  /** Human-readable pinpoint citation, e.g. "11 CCR § 7152(a)(5)(A)". */
  readonly pinpoint: string;
}

export interface ConclusionSpec {
  /** Stable id, snake_case, unique within the inventory. */
  readonly id: string;
  /** R = deterministic rule, W = weighing, J = reserved judgment. */
  readonly epistemic_type: EpistemicType;
  /** Jurisdiction domain per LEGAL-TEST v2.1 Q4(e). */
  readonly jurisdiction_tag: JurisdictionTag;
  /** Report surface (section id) where this conclusion appears. */
  readonly surface: string;
  /** Primary statutory anchor. */
  readonly anchor: StatutoryAnchor;
  /** Additional supporting anchors (all must be jurisdiction-domain matched). */
  readonly supporting_anchors?: readonly StatutoryAnchor[];
  /** One-line description of what the conclusion asserts. */
  readonly description: string;
  /** For Type R: the deterministic gate that produces the conclusion. */
  readonly rule_gate?: string;
  /** For Type W: reference to the factor-registry test id (see cppa-risk-factors.ts). */
  readonly weighing_test_id?: string;
  /** For Type J: who holds the reserved judgment (business, external auditor, counsel). */
  readonly reserved_to?: "business" | "external_auditor" | "legal_counsel";
}

const CPPA: JurisdictionTag = "cppa-ca";

// ---------------------------------------------------------------------------
// Type R — Rule conclusions (deterministic, gate-driven)
// ---------------------------------------------------------------------------

const RULE_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "r.applicability.selling_sharing",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(1)" },
    description:
      "A risk assessment is required whenever the business sells or shares personal information.",
    rule_gate: "G.applicability.selling_sharing",
  },
  {
    id: "r.applicability.sensitive_pi",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(2)" },
    description:
      "A risk assessment is required when the business processes the personal information of consumers "
      + "and that processing involves sensitive personal information (excluding the § 7027 employment-benefits carve-out).",
    rule_gate: "G.applicability.sensitive_pi",
  },
  {
    id: "r.applicability.admt_significant_decision",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(3)" },
    description:
      "A risk assessment is required when the business uses ADMT to make a significant decision concerning a consumer.",
    rule_gate: "G.applicability.admt_significant_decision",
  },
  {
    id: "r.applicability.extensive_profiling",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(4)" },
    description:
      "A risk assessment is required when the business uses ADMT for extensive profiling of a consumer.",
    rule_gate: "G.applicability.extensive_profiling",
  },
  {
    id: "r.applicability.train_admt",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(5)" },
    description:
      "A risk assessment is required when the business processes personal information to train ADMT that is capable of "
      + "being used for a significant decision, extensive profiling, or physical/biological identification or profiling.",
    rule_gate: "G.applicability.train_admt",
  },
  {
    id: "r.cohort.compliance_date",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "deadlines",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(c)" },
    description:
      "The compliance deadline is the cohort date that flows deterministically from the applicability prong(s) triggered "
      + "and the business's revenue band (V2 stat-aligned bands).",
    rule_gate: "G.cohort.compliance_date",
  },
  {
    id: "r.documentation.purpose_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(1)" },
    description:
      "The risk assessment report must identify a non-generic processing purpose. Presence check only; the "
      + "specificity/adequacy assessment is Type J (reserved to the business).",
    rule_gate: "G.documentation.purpose_present",
  },
  {
    id: "r.documentation.categories_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(2)" },
    description:
      "The report must identify the categories of personal information processed, including sensitive PI categories, "
      + "with the minimum-necessary framing.",
    rule_gate: "G.documentation.categories_present",
  },
  {
    id: "r.documentation.operational_elements_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(3)" },
    description:
      "The report must document the operational elements (a)(3)(A)-(G). ADMT logic and output disclosure ((a)(3)(G)) is "
      + "required only for § 7150(b)(3) uses.",
    rule_gate: "G.documentation.operational_elements_present",
  },
  {
    id: "r.documentation.approver_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(9)" },
    description:
      "The report must identify the reviewer/approver — an individual with authority to decide whether the business will "
      + "initiate the processing.",
    rule_gate: "G.documentation.approver_present",
  },
  {
    id: "r.admt.consequence_gated",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "admt_consequence",
    anchor: { corpus_key: "cppa-7001", pinpoint: "11 CCR § 7001(ddd)" },
    description:
      "§ 7001(ddd) consequence assertions must NOT be emitted when intake q18 (ADMT use) is negative. Suppression is "
      + "deterministic at the render layer, not a model choice.",
    rule_gate: "G.q18.admt_consequence",
  },
] as const;

// ---------------------------------------------------------------------------
// Type W — Weighing conclusions (the balancing test)
// ---------------------------------------------------------------------------

const WEIGHING_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "w.balance.risks_vs_benefits",
    epistemic_type: "W",
    jurisdiction_tag: CPPA,
    surface: "balancing",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    description:
      "Whether the risks to consumers' privacy from the processing outweigh the benefits to the consumer, the business, "
      + "other stakeholders, and the public from that same processing. This is the single Type-W conclusion in the report "
      + "(the regulation phrases it as a balancing test with the word 'outweigh').",
    weighing_test_id: "test.cppa-7152.balance",
  },
] as const;

// ---------------------------------------------------------------------------
// Type J — Reserved judgment (business decision under (a)(7); auditor scope)
// ---------------------------------------------------------------------------

const RESERVED_CONCLUSIONS: readonly ConclusionSpec[] = [
  {
    id: "j.initiation_decision",
    epistemic_type: "J",
    jurisdiction_tag: CPPA,
    surface: "closing",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(7)" },
    description:
      "Whether the business will initiate the processing subject to the risk assessment. The regulation expressly "
      + "delegates this decision to the business.",
    reserved_to: "business",
  },
  {
    id: "j.purpose_specificity_adequacy",
    epistemic_type: "J",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(1)" },
    description:
      "Whether a given non-generic purpose statement is adequately specific for the business's circumstances. The tool "
      + "checks presence + non-generic phrasing; substantive adequacy is reserved to counsel/business.",
    reserved_to: "legal_counsel",
  },
  {
    id: "j.safeguard_sufficiency",
    epistemic_type: "J",
    jurisdiction_tag: CPPA,
    surface: "safeguards",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)" },
    description:
      "Whether the safeguards a business plans to implement are sufficient to address the identified negative impacts. "
      + "The tool inventories the safeguard categories the business claims; sufficiency is reserved to counsel/business.",
    reserved_to: "legal_counsel",
  },
];

// ---------------------------------------------------------------------------
// Public inventory
// ---------------------------------------------------------------------------

export const CPPA_RISK_CONCLUSIONS: readonly ConclusionSpec[] = [
  ...RULE_CONCLUSIONS,
  ...WEIGHING_CONCLUSIONS,
  ...RESERVED_CONCLUSIONS,
];

export const CPPA_RISK_CONCLUSION_INDEX: Readonly<
  Record<string, ConclusionSpec>
> = Object.freeze(
  Object.fromEntries(
    CPPA_RISK_CONCLUSIONS.map((c) => [c.id, c]),
  ),
);

export function conclusionsBySurface(surface: string): readonly ConclusionSpec[] {
  return CPPA_RISK_CONCLUSIONS.filter((c) => c.surface === surface);
}

export function conclusionsByEpistemicType(
  t: EpistemicType,
): readonly ConclusionSpec[] {
  return CPPA_RISK_CONCLUSIONS.filter((c) => c.epistemic_type === t);
}
