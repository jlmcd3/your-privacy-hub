/**
 * ITEM 311 — lia analytic deliverables (Chapter 7 of
 * docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
 *
 * Four deliverables. Op. 1 (legitimacy) is NOT touched — it already performs
 * and reaches adverse verdicts; this module adds what has no key today and
 * fixes Op. 5, which recited.
 *
 *   1. reasonable_expectations  Recital 47 / EDPB 1/2024 Section II.C.3 —
 *                               a NAMED finding reasoned from the time and
 *                               context of collection, not folded into the
 *                               balancing prose.
 *   2. child_factor             Art. 6(1)(f) "in particular where the data
 *                               subject is a child" — operative text with no
 *                               key today, now an explicit determination.
 *   3. public_authority_exclusion
 *                               Art. 6(1)(f), second subparagraph — operative
 *                               text with no key today, now explicit.
 *   4. determination            pass/fail PLUS the mitigations that would flip
 *                               a failing balance, each tied to the specific
 *                               factor it addresses. This is the Op. 5 fix.
 *
 * ANALYSIS SHAPE LAW (Chapter 7 (E)(5)): every finding carries the
 * `purpose_test.analysis` shape that chapter flagged as the standard other
 * chapters should be held to — STANDARD (verbatim authority) → RECORD FACT
 * (what the record actually says) → APPLICATION (the standard run over that
 * fact) → VERDICT. The four fields below are that shape, named.
 *
 * DEGRADATION LAW: a finding the record cannot support is emitted with
 * `status: "record_insufficient"` and a SPECIFIC `information_needed`.
 * It is never omitted and never filled with invention.
 *
 * SEPARATION LAW (Item 308 pattern): enforcement-exposure / penalty framing
 * is mechanically relocated out of `determination.why` into `exposure_note`.
 */

export type DeliverableStatus = "analysed" | "record_insufficient";

/** The four-part analytic shape every deliverable in this module carries. */
export interface AnalysisShape {
  /** VERBATIM registry text — never re-typed, never paraphrased. */
  readonly standard: string;
  readonly standard_citation: string;
  /** What the record actually says, quoted or named by field. */
  readonly record_fact: string;
  /** The standard run over that fact. */
  readonly application: string;
}

// ── 1. Reasonable expectations ───────────────────────────────────────
export type ExpectationVerdict =
  | "reasonably_expected"
  | "partly_expected"
  | "not_reasonably_expected"
  | "undetermined_on_the_record";

export interface ReasonableExpectationsFinding extends AnalysisShape {
  readonly verdict: ExpectationVerdict;
  /** Contextual elements the record actually supplies (EDPB II.C.3 list). */
  readonly contextual_elements: readonly string[];
  /**
   * True where the only support for expectation is that a notice was given.
   * EDPB 1/2024: information duties alone do not make processing expected.
   */
  readonly notice_only_support: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 2. Child factor ──────────────────────────────────────────────────
export type ChildDetermination =
  | "children_in_scope"
  | "children_not_in_scope"
  | "undetermined_on_the_record";

export interface ChildFactorFinding extends AnalysisShape {
  readonly determination: ChildDetermination;
  /** True where the child factor weighs against the controller's interest. */
  readonly weighs_against_controller: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 3. Public-authority exclusion ────────────────────────────────────
export type PublicAuthorityDetermination =
  | "exclusion_applies"
  | "exclusion_does_not_apply"
  | "undetermined_on_the_record";

export interface PublicAuthorityFinding extends AnalysisShape {
  readonly determination: PublicAuthorityDetermination;
  /** True where Art. 6(1)(f) is unavailable regardless of the balance. */
  readonly basis_unavailable: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 4. Determination + mitigations ───────────────────────────────────
export type LiaFactor =
  | "legitimacy"
  | "necessity"
  | "balancing"
  | "reasonable_expectations";

export interface Mitigation {
  /** The specific factor this mitigation addresses. */
  readonly factor: LiaFactor;
  readonly measure: string;
  /** Why this measure moves THAT factor — not a generic benefit sentence. */
  readonly why_it_moves_the_balance: string;
  /**
   * EDPB 1/2024 II.C.4: measures the GDPR already requires are not
   * mitigating measures. False = it does not count towards the re-balance.
   */
  readonly goes_beyond_gdpr_obligation: boolean;
  readonly citation: string;
  /**
   * ITEM 385 seam repair (b): an authority field carries AUTHORITY or is
   * ABSENT. When the anchor supplies no verbatim text the key is omitted, so
   * no downstream frame pass can fill the empty leaf with gap prose.
   */
  readonly authority_verbatim?: string;
}

export type LiaOutcome =
  | "legitimate_interests_available"
  | "available_only_with_mitigations"
  | "legitimate_interests_not_available"
  | "undetermined_on_the_record";

export interface LiaDetermination {
  readonly outcome: LiaOutcome;
  /** Obligation reasoning only — no enforcement/penalty framing. */
  readonly why: string;
  /** SEPARATION LAW: relocated exposure sentences live here, if any. */
  readonly exposure_note: string;
  readonly separation_repairs: number;
  /** The factors that drive the outcome, named. */
  readonly driving_factors: readonly LiaFactor[];
  /** Mitigations that would flip a failing balance, tied to their factor. */
  readonly mitigations: readonly Mitigation[];
  /**
   * EDPB 1/2024 II.C.4: after mitigations are adopted the balancing test is
   * performed anew. True where this determination is conditional on that.
   */
  readonly rebalance_required: boolean;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface LiaDeliverables {
  readonly reasonable_expectations: ReasonableExpectationsFinding;
  readonly child_factor: ChildFactorFinding;
  readonly public_authority_exclusion: PublicAuthorityFinding;
  readonly lia_determination: LiaDetermination;
  readonly automated_decision_analysis: AutomatedDecisionFinding;
}

// ── 5. Automated-decision analysis (ITEM 326) ────────────────────────
/**
 * Which Article-22-family regime the RECORDED jurisdictions engage.
 * "dual" = both EU and UK are recorded; the two defaults differ and both
 * are stated. "not_engaged" = neither EU nor UK is recorded.
 */
export type AdmRegime = "eu" | "uk" | "dual" | "not_engaged";

/**
 * The DEFAULT POSITION of the engaged regime for a solely automated
 * significant decision. These are not interchangeable:
 *   • EU  Art. 22(1) — prohibition-by-default, three narrow exceptions,
 *                      and legitimate interests is NOT one of them.
 *   • UK  Arts. 22A–22C — for data outside Art. 9(1), PERMITTED subject to
 *                      the Art. 22C safeguards; Art. 22B restricts special
 *                      category data and bars Art. 6(1)(ea) reliance.
 */
export type AdmDefaultPosition =
  | "prohibited_unless_excepted"
  | "permitted_with_safeguards"
  | "both_defaults_stated"
  | "not_applicable";

export interface AutomatedDecisionFinding extends AnalysisShape {
  readonly regime: AdmRegime;
  readonly default_position: AdmDefaultPosition;
  /**
   * ITEM 337 (PROSE PROGRAM 1, Part D3) — prose labels. No renderer may print
   * the raw `regime` / `default_position` enum tokens into body text; the
   * recorded defect was an Annex-1 scope note reading "uk
   * permitted_with_safeguards". Renderers use these fields instead.
   */
  readonly regime_label: string;
  readonly default_position_label: string;
  /** UK only: Art. 22B(4) bars grounding such a decision on Art. 6(1)(ea). */
  readonly recognised_li_barred: boolean;
  /** UK only: Art. 22B(1) restriction engaged by recorded Art. 9(1) data. */
  readonly special_category_restriction: boolean;
  /** The Art. 22C(2) safeguard measures, verbatim, where UK is engaged. */
  readonly safeguards_citation: string;
  readonly safeguards_verbatim: string;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  /**
   * ANNEX 1 SCOPE LIMIT (ITEM 326): Annex 1 is not in this tool's corpus.
   * When Art. 6(1)(ea) is mentioned, this sentence is emitted verbatim and
   * no Annex 1 condition is ever stated, paraphrased, or evaluated.
   */
  readonly annex_1_reserved_note: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ─────────────────────────────────────────────────────────────────────
// UPGRADE-4 — ICO three-part-arc deliverables.
//
// The ICO LIA template arc (Purpose -> Necessity -> Balancing -> close)
// stays the narrative spine. These findings slot into it and obey the same
// three laws as the ITEM 311 set above: ANALYSIS SHAPE, DEGRADATION, and
// SINGLE-WRITER (build-upgrade4.ts is the only producer).
// ─────────────────────────────────────────────────────────────────────

export type SubVerdict = "met" | "not_met" | "undetermined_on_the_record";

// ── Purpose stage (a) — interest legitimacy, three cumulative sub-tests ──
export interface InterestLegitimacySubTest {
  readonly id: "lawful" | "clearly_articulated" | "real_and_present";
  readonly label: string;
  readonly verdict: SubVerdict;
  /** The standard run over the record fact — never a recitation. */
  readonly reasoning: string;
  readonly information_needed?: string;
}

export type InterestLegitimacyVerdict =
  | "legitimate_interest_established"
  | "legitimate_interest_not_established"
  | "undetermined_on_the_record";

export interface InterestLegitimacyFinding extends AnalysisShape {
  readonly verdict: InterestLegitimacyVerdict;
  /** All three EDPB 1/2024 conditions, each verdicted separately. */
  readonly sub_tests: readonly InterestLegitimacySubTest[];
  readonly cumulative_note: string;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Purpose stage (b) — benefit and beneficiary ──────────────────────
export type BeneficiaryClass = "business" | "individual" | "third_party";

export interface BenefitAndBeneficiaryFinding extends AnalysisShape {
  /** The specific benefit as the record states it. Empty where absent. */
  readonly benefit: string;
  readonly beneficiaries: readonly BeneficiaryClass[];
  readonly beneficiary_labels: readonly string[];
  /** True where the stated benefit is generic rather than specific. */
  readonly benefit_is_generic: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Necessity stage (c) — alternatives considered ────────────────────
export interface AlternativeConsidered {
  /** The alternative as the record names it. */
  readonly alternative: string;
  /** Why the record says it is inadequate. Empty where the record is silent. */
  readonly why_inadequate: string;
  readonly rationale_recorded: boolean;
}

export interface AlternativesConsideredFinding extends AnalysisShape {
  readonly alternatives: readonly AlternativeConsidered[];
  readonly count_with_rationale: number;
  readonly consent_addressed: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Balancing stage (d) — relationship with the individual ───────────
export type RelationshipCategory =
  | "customer"
  | "employee"
  | "prospect"
  | "public"
  | "undetermined_on_the_record";

export interface RelationshipFinding extends AnalysisShape {
  readonly category: RelationshipCategory;
  readonly category_label: string;
  /** True where the record NAMES the category rather than it being derived. */
  readonly explicitly_recorded: boolean;
  /** True where the category carries a recognised power imbalance. */
  readonly power_imbalance: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Balancing stage (e) — scale, frequency, duration ─────────────────
export interface ScaleDimension {
  readonly id: "scale" | "frequency" | "duration";
  readonly label: string;
  readonly recorded: string;
  readonly status: DeliverableStatus;
}

export interface ScaleFrequencyDurationFinding extends AnalysisShape {
  readonly dimensions: readonly ScaleDimension[];
  readonly dimensions_recorded: number;
  readonly large_scale_indicated: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Balancing stage (f) — potential harms, structured ────────────────
export type HarmSeverity = "negligible" | "limited" | "significant" | "severe" | "unstated";

export interface PotentialHarm {
  readonly harm: string;
  readonly severity: HarmSeverity;
  /** How this harm bears on the balance — never a generic risk sentence. */
  readonly bearing_on_balance: string;
}

export interface PotentialHarmsFinding extends AnalysisShape {
  readonly harms: readonly PotentialHarm[];
  readonly worst_case_severity: HarmSeverity;
  readonly material_weight_against_controller: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Balancing stage (g) — opt-out feasibility ────────────────────────
export type OptOutFeasibility =
  | "unconditional_opt_out_available"
  | "conditional_opt_out_available"
  | "no_opt_out_available"
  | "undetermined_on_the_record";

export interface OptOutFeasibilityFinding extends AnalysisShape {
  readonly feasibility: OptOutFeasibility;
  readonly mechanism: string;
  /** True where the opt-out goes beyond what the GDPR already requires. */
  readonly counts_as_mitigation: boolean;
  readonly supporting_citation: string;
  readonly supporting_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Close — attestation block (house pattern: risk / admt) ───────────
export interface LiaApprover {
  readonly name: string;
  readonly position: string;
}

export interface LiaDpoReview {
  readonly reviewed: boolean;
  readonly reviewer: string;
  readonly review_date: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface LiaAttestationBlock {
  readonly text: string;
  readonly attested: boolean;
  readonly dpo_review: LiaDpoReview;
  readonly approvers: readonly LiaApprover[];
  readonly approval_date: string;
  readonly review_triggers: readonly string[];
  readonly triggers_are_default: boolean;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface LiaUpgrade4Deliverables {
  readonly interest_legitimacy: InterestLegitimacyFinding;
  readonly benefit_and_beneficiary: BenefitAndBeneficiaryFinding;
  readonly alternatives_considered: AlternativesConsideredFinding;
  readonly relationship_with_individual: RelationshipFinding;
  readonly scale_frequency_duration: ScaleFrequencyDurationFinding;
  readonly potential_harms: PotentialHarmsFinding;
  readonly opt_out_feasibility: OptOutFeasibilityFinding;
  readonly attestation_block: LiaAttestationBlock;
}
