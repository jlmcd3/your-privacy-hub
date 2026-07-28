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
 * v2.3 FEDERAL-QUALIFICATION (CEO-CORRECTED 2026-07-26; generalized forum
 * rule): for any U.S.-forum analysis unit (cppa-ca, us-state-*), BINDING
 * tier = the forum state's own law + U.S. FEDERAL law (statutes, regs,
 * FTC/agency rulings — `jurisdiction_tag: "us-federal"`). SISTER-STATE
 * law (another U.S. state) is persuasive/analogy tier only, expressly
 * marked. FOREIGN law follows the existing per-domain rules (CPPA:
 * FSOR-mediated persuasive only). GDPR/UK products remain untouched —
 * NO U.S. material (state or federal) in any role. This file's existing
 * anchors are all CPPA/CA and require no data change; future us-federal
 * anchors (e.g., FTC rulings) are admissible at binding tier without an
 * architecture change.
 *
 * NO WIRING: this file is data only. Phase 2 wires it into the Pass-1
 * derivation and the Type-W checks feed Pass G candidate-set closure.
 */

export type EpistemicType = "R" | "W" | "J";

export type JurisdictionTag =
  | "cppa-ca"
  | "gdpr-eu"
  | "gdpr-uk"
  | "us-federal"          // v2.3 — U.S. Federal law + federal agency rulings; binding-tier for any U.S.-forum plan
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
  /**
   * ITEM 240 CP4 — DISPLAY-LABEL LAYER. Customer-facing English label
   * used wherever a composer would otherwise humanize the registry id.
   * REQUIRED on every row; registry-id shapes are structurally unshippable
   * per value-screen's REGISTRY_ID_PATTERNS class.
   */
  readonly display_label: string;
  /**
   * ITEM 241.3 — COMPLIANCE-GUIDANCE SENTENCE (registry-authored, verbatim
   * from ITEM 241.2 courier §1, CEO-approved 2026-07-28). Consumed as
   * move (iv) of the four-move gap-driven action template and as the
   * body of the compliance-guidance section-opener. Registry is the
   * single source of truth (Single-Writer Law applied to the courier
   * itself per CEO CONDITION 1); composers never restate.
   */
  readonly compliance_guidance?: string;
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
    display_label: "Selling or sharing personal information",
    description:
      "A risk assessment is required whenever the business sells or shares personal information.",
    rule_gate: "G.applicability.selling_sharing",
    compliance_guidance:
      "The business must complete and retain a risk assessment for every processing activity that sells or shares personal information, identifying the personal information involved, the recipients, and the operational purpose the sale or share serves.",
  },
  {
    id: "r.applicability.sensitive_pi",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(2)" },
    display_label: "Processing sensitive personal information",
    description:
      "A risk assessment is required when the business processes the personal information of consumers "
      + "and that processing involves sensitive personal information (excluding the § 7027 employment-benefits carve-out).",
    rule_gate: "G.applicability.sensitive_pi",
    compliance_guidance:
      "The business must complete and retain a risk assessment for every processing activity that involves sensitive personal information, naming the sensitive-PI categories processed, the consumer population affected, and the operational purpose that justifies processing sensitive data rather than non-sensitive alternatives.",
  },
  {
    id: "r.applicability.admt_significant_decision",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(3)" },
    display_label: "Using ADMT for a significant decision concerning a consumer",
    description:
      "A risk assessment is required when the business uses ADMT to make a significant decision concerning a consumer.",
    rule_gate: "G.applicability.admt_significant_decision",
    compliance_guidance:
      "The business must complete and retain a risk assessment for every use of automated decisionmaking technology to make a significant decision concerning a consumer, identifying the ADMT deployed, the decision category, the consumer population subject to the decision, and the human-appeal pathway available to that population.",
  },
  {
    id: "r.applicability.extensive_profiling",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(4)" },
    display_label: "Using ADMT for extensive profiling of a consumer",
    description:
      "A risk assessment is required when the business uses ADMT for extensive profiling of a consumer.",
    rule_gate: "G.applicability.extensive_profiling",
    compliance_guidance:
      "The business must complete and retain a risk assessment for every use of automated decisionmaking technology for extensive profiling of a consumer, identifying the profiling context (work / education / public-place systematic observation / behavioral advertising), the consumer population profiled, and the observation or inference method producing the profile.",
  },
  {
    id: "r.applicability.train_admt",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "applicability",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(b)(5)" },
    display_label: "Training ADMT for significant decisions, extensive profiling, or physical/biological identification",
    description:
      "A risk assessment is required when the business processes personal information to train ADMT that is capable of "
      + "being used for a significant decision, extensive profiling, or physical/biological identification or profiling.",
    rule_gate: "G.applicability.train_admt",
    compliance_guidance:
      "The business must complete and retain a risk assessment for every processing activity that uses personal information to train automated decisionmaking technology capable of significant decisions, extensive profiling, or physical- or biological-identification profiling, naming the training data source, the consumer population whose data enters training, and the downstream ADMT capability being trained.",
  },
  {
    id: "r.cohort.compliance_date",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "deadlines",
    anchor: { corpus_key: "cppa-7150", pinpoint: "11 CCR § 7150(c)" },
    display_label: "Compliance deadline (cohort date)",
    description:
      "The compliance deadline is the cohort date that flows deterministically from the applicability prong(s) triggered "
      + "and the business's revenue band (V2 stat-aligned bands).",
    rule_gate: "G.cohort.compliance_date",
    compliance_guidance:
      "The business must complete and retain the risk assessment by the compliance date fixed for its processing cohort under § 7150(c), naming the cohort applicable to the processing (pre-existing versus initiated after the operative date) and the specific compliance date the cohort produces.",
  },
  {
    id: "r.documentation.purpose_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(1)" },
    display_label: "Processing purpose documented",
    description:
      "The risk assessment report must identify a non-generic processing purpose. Presence check only; the "
      + "specificity/adequacy assessment is Type J (reserved to the business).",
    rule_gate: "G.documentation.purpose_present",
    compliance_guidance:
      "The assessment must state, in the assessment record itself, the specific operational purpose of the processing in language concrete enough that a reviewer can distinguish it from adjacent purposes; a generic label such as 'business operations' does not satisfy this element.",
  },
  {
    id: "r.documentation.categories_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(2)" },
    display_label: "Categories of personal information documented",
    description:
      "The report must identify the categories of personal information processed, including sensitive PI categories, "
      + "with the minimum-necessary framing.",
    rule_gate: "G.documentation.categories_present",
    compliance_guidance:
      "The assessment must enumerate, in the assessment record itself, every category of personal information processed (including sensitive-PI subcategories where applicable), tied to the specific operational purpose each category serves.",
  },
  {
    id: "r.documentation.operational_elements_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(3)" },
    display_label: "Operational elements documented",
    description:
      "The report must document the operational elements (a)(3)(A)-(G). ADMT logic and output disclosure ((a)(3)(G)) is "
      + "required only for § 7150(b)(3) uses.",
    rule_gate: "G.documentation.operational_elements_present",
    compliance_guidance:
      "The assessment must document, in the assessment record itself, the operational elements of the processing — sources of the personal information, recipients or disclosure targets, retention duration, and the number of consumers whose information is processed — so a reviewer can trace the data lifecycle end-to-end.",
  },
  {
    id: "r.documentation.approver_present",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(9)" },
    display_label: "Reviewer or approver identified",
    description:
      "The report must identify the reviewer/approver — an individual with authority to decide whether the business will "
      + "initiate the processing.",
    rule_gate: "G.documentation.approver_present",
    compliance_guidance:
      "The assessment must identify, in the assessment record itself, the individuals who reviewed and approved the assessment by name and role, so a reviewer can verify that the approver's authority matches the § 7157(a) certification requirement.",
  },
  {
    id: "r.admt.consequence_gated",
    epistemic_type: "R",
    jurisdiction_tag: CPPA,
    surface: "admt_consequence",
    // ITEM 241.3 CONDITION 3 — canonical § 7001(ddd) anchor PRESERVED
    // (§ 7220 pre-use-notice guidance, if authored, ships as a NEW row
    // in a follow-up courier, not a rewrite of this one).
    anchor: { corpus_key: "cppa-7001", pinpoint: "11 CCR § 7001(ddd)" },
    display_label: "ADMT consequence disclosure",
    description:
      "§ 7001(ddd) consequence assertions must NOT be emitted when intake q18 (ADMT use) is negative. Suppression is "
      + "deterministic at the render layer, not a model choice.",
    rule_gate: "G.q18.admt_consequence",
    compliance_guidance:
      "When the assessment records use of ADMT for a significant decision, the assessment must document the pre-use notice content, the consumer's opt-out or human-appeal pathway, and the operational owner responsible for handling appeals within the § 7220 timeline; this element attaches only when the ADMT applicability trigger is engaged.",
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
    // ITEM 241.3 CONDITION 1 — anchor § 7152(a) per inventory (registry
    // wins over courier's hand-typed (a)(6)).
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    surface: "balancing",
    display_label: "Balancing benefits against negative impacts",
    description:
      "Whether the risks to consumers' privacy from the processing outweigh the benefits to the consumer, the business, "
      + "other stakeholders, and the public from that same processing. This is the single Type-W conclusion in the report "
      + "(the regulation phrases it as a balancing test with the word 'outweigh').",
    weighing_test_id: "test.cppa-7152.balance",
    compliance_guidance:
      "The assessment must apply the § 7152(a)(6) balancing test in the assessment record itself, stating the identified benefits, the identified adverse effects and safeguard gaps, and the resulting determination that benefits either do or do not outweigh the risks to consumer privacy; the balancing must reference the specific benefits and adverse-effects entries the record enumerates, not restate them in the abstract.",
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
    // ITEM 241.3 CONDITION 1 — anchor (a)(7) per inventory (registry
    // wins over courier's hand-typed (a)(4)).
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(7)" },
    display_label: "Decision whether to initiate the processing",
    description:
      "Whether the business will initiate the processing subject to the risk assessment. The regulation expressly "
      + "delegates this decision to the business.",
    reserved_to: "business",
    compliance_guidance:
      "The business must record a reasoned initiation decision — proceed, proceed with modifications, or do not initiate — attaching the decision to the specific balancing outcome, naming the decisionmaker and the date of decision, and, when proceeding with modifications, listing each modification and the risk it addresses.",
  },
  {
    id: "j.purpose_specificity_adequacy",
    epistemic_type: "J",
    jurisdiction_tag: CPPA,
    surface: "documentation_check",
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(1)" },
    display_label: "Adequacy of the processing purpose statement",
    description:
      "Whether a given non-generic purpose statement is adequately specific for the business's circumstances. The tool "
      + "checks presence + non-generic phrasing; substantive adequacy is reserved to counsel/business.",
    reserved_to: "legal_counsel",
    compliance_guidance:
      "Counsel must record a reasoned adequacy determination on the stated operational purpose, attaching the determination to the exact purpose language in the record, and identifying any narrowing required for the purpose to satisfy § 7152(a)(1) specificity.",
  },
  {
    id: "j.safeguard_sufficiency",
    epistemic_type: "J",
    jurisdiction_tag: CPPA,
    surface: "safeguards",
    // ITEM 241.3 CONDITION 1 — anchor (a)(6) per inventory (registry
    // wins over courier's hand-typed (a)(5)).
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(6)" },
    display_label: "Sufficiency of the safeguards",
    description:
      "Whether the safeguards a business plans to implement are sufficient to address the identified negative impacts. "
      + "The tool inventories the safeguard categories the business claims; sufficiency is reserved to counsel/business.",
    // ITEM 241.3 CONDITION 2 — reserved_to REVERTS to legal_counsel
    // (courier's external_auditor reassignment is NOT authorized).
    reserved_to: "legal_counsel",
    compliance_guidance:
      "Counsel must record a reasoned sufficiency determination on the safeguards documented, attaching the determination to the specific safeguards enumerated in the record, and identifying any safeguard gap the balancing outcome must weigh under § 7152(a)(6).",
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
