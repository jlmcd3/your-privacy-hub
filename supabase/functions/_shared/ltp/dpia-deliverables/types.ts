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
  /** WP248 rev.01 severity-appraisal anchor (guidance, not statute). */
  readonly guidance_citation?: string;
  readonly guidance_verbatim?: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 3. Art. 35(7)(c) risk register ───────────────────────────────────
export interface RiskRegisterEntry {
  readonly risk_id: string;
  readonly risk_label: string;
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
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
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
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface DpiaDeliverables {
  readonly necessity_findings: readonly NecessityFinding[];
  readonly proportionality: readonly ProportionalityFinding[];
  readonly risk_register: readonly RiskRegisterEntry[];
  readonly art36_consultation: Art36Consultation;
}
