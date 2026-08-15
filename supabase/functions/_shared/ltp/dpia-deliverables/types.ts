/**
 * ITEM 310 — dpia analytic deliverables (Chapter 6 (E)(3) of
 * docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
 *
 * Four deliverables, replacing the RECITES behaviour scored on Ops 2, 4
 * and 5 of Chapter 6's operations table, and supplying Op 3 which the
 * shipped product omitted entirely:
 *
 *   1. necessity_findings[]  Art. 35(7)(b) — least-intrusive-means test,
 *                            per processing operation, run over the
 *                            alternatives the record says were considered.
 *   2. proportionality[]     Art. 35(7)(b) — benefit vs. impact, argued in
 *                            BOTH directions. SPLIT OUT from necessity.
 *   3. risk_register[]       Art. 35(7)(c) — likelihood / severity /
 *                            residual per identified risk.
 *   4. art36_consultation    Art. 36(1) — prior-consultation determination,
 *                            reasoned from the residual bands in (3).
 *
 * SHAPE LAW: plain scalars, strings, arrays of these records. No nested
 * free-form bags.
 *
 * DEGRADATION LAW: an operation the record cannot support is emitted with
 * `status: "record_insufficient"` and a specific `information_needed`
 * string. It is NEVER omitted and NEVER filled with invention.
 *
 * SEPARATION LAW (the Item 308 pattern, applied here): the Art. 36
 * determination states WHAT THE CONTROLLER MUST DO under Art. 36(1) in
 * `why`; enforcement-exposure / penalty framing is mechanically relocated
 * into `exposure_note` and never rides inside the obligation finding.
 */

export type DeliverableStatus = "analysed" | "record_insufficient";

export type RiskBand = "low" | "moderate" | "high" | "undetermined";

export type Likelihood = "Unlikely" | "Possible" | "Likely" | "not stated on the record";
export type Severity = "Moderate" | "Significant" | "Severe" | "not stated on the record";

// ── 1. Art. 35(7)(b) necessity ───────────────────────────────────────
export interface AlternativeConsidered {
  readonly alternative: string;
  readonly rejection_reason: string;
  /** True where the only stated reason is that the alternative is less useful. */
  readonly rejected_for_usefulness_only: boolean;
}

export type NecessityVerdict =
  | "least_intrusive_means_supported"
  | "less_intrusive_alternative_available"
  | "undetermined_on_the_record";

export interface NecessityFinding {
  readonly operation_id: string;
  readonly operation_label: string;
  readonly purpose_stated: boolean;
  readonly purpose_text: string;
  readonly alternatives_considered: readonly AlternativeConsidered[];
  readonly verdict: NecessityVerdict;
  readonly why: string;
  readonly citation: string;
  /** VERBATIM registry text — never re-typed, never paraphrased. */
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
}

// ── 2. Art. 35(7)(b) proportionality (its own deliverable) ───────────
export type ProportionalityVerdict =
  | "proportionate_on_the_record"
  | "disproportionate_on_the_record"
  | "undetermined_on_the_record";

export interface ProportionalityFinding {
  readonly operation_id: string;
  readonly operation_label: string;
  /** The case FOR the processing, as the record puts it. */
  readonly benefit_argument: string;
  /** The case AGAINST — impact on the data subjects, as the record puts it. */
  readonly impact_argument: string;
  /** False when only one side of the balance appears on the record. */
  readonly argued_both_directions: boolean;
  readonly verdict: ProportionalityVerdict;
  readonly why: string;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
}

// ── 3. Art. 35(7)(c) risk register ───────────────────────────────────
/**
 * PROMPT 8 (CEO-ratified 2026-08-11) — EDPB template risk split:
 * "design" = risk the processing poses as designed (§ 3.1); "incident" = risk
 * arising from deviation, malfunction or attack (§ 4.1.1).
 */
export type DpiaRiskClass = "design" | "incident";

export interface RiskRegisterEntry {
  readonly risk_id: string;
  readonly risk_label: string;
  /** Absent on registers assembled before spine v4. */
  readonly risk_class?: DpiaRiskClass;
  /** What in the record gives rise to the risk. */
  readonly source: string;
  readonly affected_rights: string;
  readonly likelihood: Likelihood;
  readonly severity: Severity;
  readonly inherent_band: RiskBand;
  /** Recorded measures that bear on THIS risk (never a generic list). */
  readonly measures: readonly string[];
  readonly residual_band: RiskBand;
  readonly citation: string;
  readonly authority_verbatim: string;
  /** WP248 rev.01 severity-appraisal anchor (guidance, not statute). */
  readonly guidance_citation?: string;
  readonly guidance_verbatim?: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
}

// ── 4. Art. 36(1) prior-consultation determination ───────────────────
export type Art36Determination =
  | "consultation_required"
  | "consultation_not_required"
  | "undetermined_on_the_record";

export interface Art36Consultation {
  readonly determination: Art36Determination;
  /** Obligation reasoning only — no enforcement/penalty framing. */
  readonly why: string;
  /** SEPARATION LAW: relocated exposure sentences live here, if any. */
  readonly exposure_note: string;
  readonly separation_repairs: number;
  readonly driving_risk_ids: readonly string[];
  readonly citation: string;
  readonly authority_verbatim: string;
  /** Art. 36(3) — what must accompany a consultation, when one is required. */
  readonly procedural_note: string;
  readonly procedural_citation: string;
  /**
   * PROMPT 8E item 7 (CEO direction, DORMANT) — disclose, don't flip. True where
   * the intake's `dpo_advice` records a recommendation to consult the
   * supervisory authority. The DETERMINATION IS UNCHANGED by this flag; no
   * renderer reads it in this prompt. Wiring awaits CEO ratification of the
   * proposed Section 6 disclosure sentence.
   */
  readonly dpo_recommends_consultation?: boolean;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
}

// ── 5. Art. 6(1) — legal basis (SO/PILOT 2026-08-11) ─────────────────
// Deterministic per-purpose lawful-basis finding. For Art. 6(1)(f) the
// three-part test (purpose / necessity / balancing) is run as a decision
// tree over the record; a part the record does not support is reported as
// unmet with a specific `information_needed` string and NEVER invented.
export type LegalBasisVerdict =
  | "basis_supported_on_the_record"
  | "basis_not_supported_on_the_record"
  | "undetermined_on_the_record";

export interface LegitimateInterestsTest {
  /** Part 1 — is there a legitimate interest, and is it stated? */
  readonly purpose_test_met: boolean;
  readonly purpose_test_why: string;
  /** Part 2 — is the processing necessary for that interest? */
  readonly necessity_test_met: boolean;
  readonly necessity_test_why: string;
  /** Part 3 — is the interest overridden by the data subjects' rights? */
  readonly balancing_test_met: boolean;
  readonly balancing_test_why: string;
}

export interface LegalBasisFinding {
  readonly operation_id: string;
  /** PROMPT 9A (R2) — the operation label, named quoted on every surface. */
  readonly operation_label?: string;
  /** PROMPT 9A — the 6(1)(f) compound ask, decomposed into labeled parts. */
  readonly ask_parts?: readonly { readonly ask_class: string; readonly display_label: string }[];
  readonly purpose: string;
  readonly article_6_basis: string;
  readonly justification: string;
  readonly verdict: LegalBasisVerdict;
  readonly citation: string;
  /** VERBATIM registry text — never re-typed, never paraphrased. */
  readonly authority_verbatim: string;
  readonly legitimate_interests_test?: LegitimateInterestsTest;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
}

export interface DpiaDeliverables {
  readonly necessity_findings: readonly NecessityFinding[];
  readonly proportionality: readonly ProportionalityFinding[];
  readonly risk_register: readonly RiskRegisterEntry[];
  readonly art36_consultation: Art36Consultation;
  readonly legal_basis: readonly LegalBasisFinding[];
  readonly decision: DpiaDecision;
  /** PROMPT 4 — deterministic open-points ledger. */
  readonly gap_ledger: readonly DpiaGapLedgerEntry[];
  /** PROMPT 4 — present only when the record states a different risk count. */
  readonly risk_count_note?: DpiaRiskCountNote;
  /** PROMPT 6 — deterministic descriptive inventory (section 0/1 content). */
  readonly processing_inventory: DpiaProcessingInventory;
  /** PROMPT 7 — deterministic Section-2 coverage tables. */
  readonly section2_coverage: DpiaSection2Coverage;
}

// ── 6. Deterministic sign-off decision (PROMPT 3, 2026-08-11) ────────
// Single writer for report.decision. Computed by pure branching over the
// typed surfaces above; it never reads model prose. DISAMBIGUATION: this is
// NOT report_data.determination (ITEM 372 METHOD 2a), which is a legacy
// prose block that decides nothing.
export type DpiaDetermination =
  | "approved"
  | "conditionally_approved"
  | "consultation_required"
  | "draft_incomplete";

export interface DpiaDecision {
  readonly determination: DpiaDetermination;
  /** conditionally_approved: the measures / open bands clearance rides on. */
  readonly conditions: readonly string[];
  /** draft_incomplete: the information_needed texts that block resolution. */
  readonly blockers: readonly string[];
  readonly why: string;
  readonly citation: string;
  readonly rule_id: "dpia_decision_v1";
}

// ── 7. Deterministic gap ledger (PROMPT 4, 2026-08-11) ───────────────
// Single writer for report.gap_ledger. Sourced EXCLUSIVELY from the typed
// surfaces above; it never harvests bracket placeholders out of prose.
// INVARIANT: an entry with an empty `dimensions` or an empty `field` is
// never emitted — a content-free ask is a builder bug upstream, not
// something to show a customer.
export interface DpiaGapLedgerEntry {
  /** PROMPT 9A — ask-class id; the compact-label registry key. */
  readonly ask_class?: string;
  /** PROMPT 9A — the ratified compact label, slots resolved. Never the ask. */
  readonly display_label?: string;
  /** PROMPT 9A — quoted operation label this entry fired for (R4 scope). */
  readonly scope_op?: string;
  /** Intake contract key that would resolve the gap. */
  readonly field: string;
  /** The specific facts to add. Never a legal conclusion. */
  readonly dimensions: string;
  /** Already-cited provision the fact completes, from the finding. */
  readonly provision: string;
  /** Which determination completes with it. */
  readonly enables: string;
}

/** Reconciliation between the register's row count and the customer's own count. */
export interface DpiaRiskCountNote {
  readonly register_count: number;
  readonly stated_count: number;
  readonly note: string;
}

// ── 8. Deterministic processing inventory (PROMPT 6, 2026-08-11) ─────
// Single writer for report.processing_inventory. Every row is composed
// from the intake's own words (verbatim-or-absent); nothing is inferred,
// enriched, or enumerated beyond the record. `source_field` is always an
// intake-contract key so each row is traceable to the answer it came from.
export interface DpiaInventoryController {
  readonly name: string;
  readonly responsible_unit: string;
  readonly main_establishment_or_representative: string;
  readonly dpo: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaInventoryProcessor {
  readonly name: string;
  readonly obligations_and_tasks: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaInventoryDataItem {
  readonly item: string;
  readonly special_category: boolean;
  readonly art9_condition_label?: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaInventoryPurpose {
  readonly purpose_text: string;
  readonly operation_id: string;
  readonly source_field: string;
}

export interface DpiaInventorySecondaryUse {
  readonly use_text: string;
  readonly negation: boolean;
  readonly source_field: string;
}

export interface DpiaInventoryPlanning {
  readonly launch_date?: string;
  readonly end_date?: string;
  readonly version?: string;
}

export interface DpiaInventoryScale {
  readonly volume_frequency_verbatim: string;
  readonly source_field: string;
}

export interface DpiaProcessingInventory {
  readonly controllers: readonly DpiaInventoryController[];
  readonly processors: readonly DpiaInventoryProcessor[];
  readonly data_items: readonly DpiaInventoryDataItem[];
  readonly purposes: readonly DpiaInventoryPurpose[];
  readonly secondary_uses: readonly DpiaInventorySecondaryUse[];
  readonly planning: DpiaInventoryPlanning;
  readonly scale: DpiaInventoryScale;
}

// ── 9. Deterministic Section-2 coverage (PROMPT 7, 2026-08-11) ───────
// Single writer for report.section2_coverage. Tiered by how much
// STRUCTURED intake actually backs each table:
//   TIER 1 — real decision trees (special-category conditions, transfers,
//            Art. 28 processor contract).
//   TIER 2 — coverage logic over named measures (minimisation/retention,
//            data protection by design, security safeguards).
//   TIER 3 — the intake is too thin for per-row trees: verbatim + honest
//            abstention only (data quality, Art. 5 principles, rights).
// LAW: zero model calls; verbatim-or-absent; every citation resolves
// through the anchor registry or `cit()`; abstention is a determination,
// never silence and never fabricated structure.

export interface DpiaSpecialCategoryConditionRow {
  readonly item: string;
  /** Art. 9(2) condition label VERBATIM from the intake enum. */
  readonly condition_label: string;
  readonly justification: string;
  readonly citation: string;
  /**
   * PROMPT 10B(1) — the Art. 9(2)(x) pinpoint, ledgered through the existing
   * gdpr-art-9 registry row so the table of authorities consolidates it under
   * GDPR Art. 9. Present only when the intake names a condition.
   */
  readonly condition_citation?: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export type DpiaTransferDetermination =
  | "no_transfer_on_the_record"
  | "intra_eea_processing"
  | "uk_domestic_processing"
  | "adequacy"
  // PROMPT 9F item 1 (CEO-ruled 2026-08-15) — credit-first Art. 46 instrument
  // recognition: the record documents the executed instrument, its date, and a
  // completed transfer risk assessment.
  | "instrument_recorded"
  | "chapter_v_mechanism_required";


export interface DpiaTransferRow {
  readonly origin_regime: "EU" | "UK";
  readonly destination: string;
  readonly importer: string;
  readonly determination: DpiaTransferDetermination;
  /** Registry mechanism label; empty for the no-transfer determination. */
  readonly mechanism_label: string;
  readonly mechanism_citation: string;
  readonly transfer_risk_assessment_required: boolean;
  readonly finding: string;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
  /** Date the registry row backing this determination was last verified. */
  readonly registry_verified_on: string;
}

export interface DpiaProcessorContractRow {
  readonly processors: readonly string[];
  readonly dpa_recorded: boolean;
  readonly finding: string;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaMinimisationRetentionRow {
  readonly item: string;
  readonly need_justification: string;
  readonly retention_period: string;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaMeasureRow {
  readonly measure: string;
  readonly description: string;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  readonly source_field: string;
}

export interface DpiaCoverageRow {
  readonly heading: string;
  /** What the record's own words establish — verbatim or empty. */
  readonly record_words: string;
  readonly finding: string;
  readonly citation: string;
  readonly authority_verbatim: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
  /// PROMPT 9A — ask-class id from _shared/ltp/dpia-ask-labels.ts.
  readonly ask_class?: string;
  /// PROMPT 9A — the ratified compact label, slots resolved.
  readonly display_label?: string;
  /// PROMPT 9A — quoted operation label this ask fired for (R4 merge scope).
  readonly scope_op?: string;
  /**
   * PROMPT 10B(2) — credit-first residual. Set when the source field IS
   * supplied but unstructured: the row is analysed, no gap-ledger entry is
   * raised, and this fixed note records the completeness residual.
   */
  readonly residual_note?: string;
  readonly source_field: string;
}

/** INTERNAL — never rendered to a customer. Report-back channel for intake work. */
export interface DpiaIntakeStructureRecommendation {
  readonly field: string;
  readonly today: string;
  readonly would_enable: string;
}

export interface DpiaSection2Coverage {
  readonly special_category_conditions: readonly DpiaSpecialCategoryConditionRow[];
  readonly transfers: readonly DpiaTransferRow[];
  readonly processor_contract: DpiaProcessorContractRow;
  readonly data_minimisation_retention: readonly DpiaMinimisationRetentionRow[];
  readonly measures_dpbd: readonly DpiaMeasureRow[];
  readonly measures_security: readonly DpiaMeasureRow[];
  readonly data_quality: readonly DpiaCoverageRow[];
  readonly measures_article5: readonly DpiaCoverageRow[];
  readonly measures_rights: readonly DpiaCoverageRow[];
  /** INTERNAL, not customer-facing. */
  readonly intake_structure_recommendations: readonly DpiaIntakeStructureRecommendation[];
  readonly rule_id: "dpia_section2_coverage_v1";
}

// ── 12. Deterministic enforcement annotations (PROMPT 9, 2026-08-12) ──
// Replaces u4's model-selected annotations[]. Each annotation links one
// enforcement-corpus row to one risk-register row by an OBSERVED overlap
// (statutory provision, or a category theme). Relevance text is a fixed
// template over the corpus row's own summary field, verbatim. A precedent
// with no overlap carries no annotation — it is listed, never force-matched.
export type DpiaEnforcementMatchType = "provision" | "category";

export interface DpiaEnforcementAnnotation {
  readonly enforcement_action_id: string;
  readonly risk_id: string;
  readonly risk_label: string;
  readonly match_type: DpiaEnforcementMatchType;
  readonly match_label: string;
  readonly relevance: string;
  readonly precedent_significance: number | null;
  readonly rule_id: "dpia_enforcement_annotations_v1";
}
