/**
 * ITEM 305 — the five per-activity ANALYTIC DELIVERABLES for cppa-risk.
 *
 * Chapter 1 of docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md
 * found that the shipped document RECITES statutory elements instead of
 * performing them. These types name the operations that must be performed
 * per assessed activity:
 *
 *   1. necessity_analysis[]  § 7152(a)(2)  minimum-PI / minimisation test
 *   2. harm_causation[]      § 7152(a)(5)  catalogued harm + source + cause
 *   3. safeguard_map[]       § 7152(a)(6)  safeguard bound to a harm, with residual
 *   4. weighing[]            § 7152(a)(4)+(a)(7) benefit-vs-impact, four classes
 *   5. consequence           § 7152(a)(7)  initiate-or-not decision (deterministic)
 *
 * SHAPE LAW: every field is a plain scalar, a string, or an array of these
 * records. No nested free-form bags. The serializer allow-list in
 * ../../report-schemas/cppa-risk.ts pins the key set.
 *
 * DEGRADATION LAW: an operation that the record cannot support is emitted
 * with `status: "record_insufficient"` and a specific `information_needed`
 * string. It is NEVER omitted and NEVER filled with invention.
 */
import type { HarmId } from "./harm-catalogue.ts";
import type {
  BeneficiaryClass,
  HarmLikelihood,
  HarmSeverity,
  NecessityStatus,
  SafeguardStatus,
} from "./enums.ts";

export type DeliverableStatus = "analysed" | "record_insufficient";

export type ResidualBand = "low" | "moderate" | "high" | "undetermined";

// ── 1. § 7152(a)(2) necessity ────────────────────────────────────────
export interface NecessityAnalysisEntry {
  readonly element: string;
  /** UPGRADE-2 (a): the purpose this element is said to serve. */
  readonly purpose_served: string;
  readonly asserted_status: NecessityStatus | "not stated on the record";
  /** Deterministic verdict over the asserted status + justification. */
  readonly verdict:
    | "supported_as_necessary"
    | "minimisation_candidate"
    | "undetermined_on_the_record";
  readonly justification: string;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 2. § 7152(a)(5) harm causation ───────────────────────────────────
export interface HarmCausationEntry {
  readonly harm_id: HarmId;
  readonly harm_pinpoint: string;
  readonly harm_label: string;
  /** VERBATIM catalogue text — never paraphrased downstream. */
  readonly harm_verbatim: string;
  /** UPGRADE-2 (c): the causation triple — data + actor + pathway. */
  readonly data_involved: string;
  readonly actor: string;
  readonly pathway: string;
  /** § 7152(a)(5) requires the SOURCE and the CAUSE, separately stated. */
  readonly source: string;
  readonly cause: string;
  readonly likelihood: HarmLikelihood | "not stated on the record";
  readonly severity: HarmSeverity | "not stated on the record";
  readonly inherent_band: ResidualBand;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 3. § 7152(a)(6) safeguards ───────────────────────────────────────
export interface SafeguardMapEntry {
  /** FOREIGN KEY into harm_causation[].harm_id for the same activity. */
  readonly harm_id: HarmId;
  /** UPGRADE-2 (d): every harm this safeguard addresses (harm_id is the head). */
  readonly harm_ids: readonly HarmId[];
  readonly safeguard: string;
  readonly safeguard_status: SafeguardStatus | "not stated on the record";
  readonly residual_band: ResidualBand;
  /** UPGRADE-2 (d): the residual-risk statement in words, not a band alone. */
  readonly residual_statement: string;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 4. § 7152(a)(4) weighing, per beneficiary class ──────────────────
export interface WeighingEntry {
  readonly beneficiary_class: BeneficiaryClass;
  /** UPGRADE-2 (e): the case FOR the processing for this class. */
  readonly case_for: string;
  /** UPGRADE-2 (e): the case AGAINST the processing for this class. */
  readonly case_against: string;
  /** UPGRADE-2 (e): the outweigh determination and its reasoning. */
  readonly outweigh_determination: OutweighDetermination;
  readonly reasoning: string;
  readonly benefit_statement: string;
  /** Generic-benefit screen — § 7152(a)(4) forbids generic benefit terms. */
  readonly generic_benefit_flag: boolean;
  readonly offsetting_harm_ids: readonly HarmId[];
  readonly sufficiency:
    | "benefit_supported"
    | "benefit_generic"
    | "benefit_not_stated";
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 5. § 7152(a)(7) consequence ──────────────────────────────────────
export type OutweighDetermination =
  | "benefits_outweigh"
  | "impacts_outweigh"
  | "close_balance"
  | "undetermined_on_the_record";

/** UPGRADE-2 (b) — § 7152(a)(4) benefit, one record per beneficiary class. */
export interface BenefitEntry {
  readonly beneficiary_class: BeneficiaryClass;
  readonly benefit: string;
  /** The record fact that supports the benefit. */
  readonly supporting_record_fact: string;
  readonly generic_benefit_flag: boolean;
  readonly sufficiency:
    | "benefit_supported"
    | "benefit_generic"
    | "benefit_unsupported"
    | "benefit_not_stated";
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

/** UPGRADE-2 (f) — a modification tied to the specific risk it addresses. */
export interface ConsequenceModification {
  readonly modification: string;
  readonly addresses_risk: string;
  readonly citation: string;
}

export type ConsequenceDecision =
  | "initiate"
  | "initiate_with_modifications"
  | "restrict"
  | "prohibit"
  | "reserved_insufficient_record";

export interface Consequence {
  readonly decision: ConsequenceDecision;
  /** Ordered, human-readable reasons — each traces to a rule id below. */
  readonly rule_ids: readonly string[];
  readonly reasons: readonly string[];
  readonly conditions: readonly string[];
  /** UPGRADE-2 (f): each modification bound to the risk it addresses. */
  readonly modifications: readonly ConsequenceModification[];
  readonly citation: string;
  /** § 7152(a)(9) review-and-approval record. */
  readonly approver_name: string;
  readonly approver_position: string;
  readonly approval_date: string;
  readonly approval_recorded: boolean;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── Per-activity envelope ────────────────────────────────────────────
export interface ActivityAnalytics {
  readonly activity_id: string;
  readonly activity_name: string;
  readonly activity_purpose: string;
  readonly is_primary: boolean;
  readonly necessity_analysis: readonly NecessityAnalysisEntry[];
  readonly benefits: readonly BenefitEntry[];
  readonly harm_causation: readonly HarmCausationEntry[];
  readonly safeguard_map: readonly SafeguardMapEntry[];
  readonly weighing: readonly WeighingEntry[];
  readonly consequence: Consequence;
}

// ── § 7152(a)(8)-(9) ATTESTATION ─────────────────────────────────────
// UPGRADE-2: the report-level review-and-approval record. Renders at the
// END of the report body, before the exhibits.
export interface AttestationApprover {
  readonly name: string;
  readonly position: string;
}

export interface Attestation {
  /** § 7152(a)(8) — providers of the information, EXCLUDING legal counsel. */
  readonly information_providers: readonly string[];
  /** Legal counsel is excluded by § 7152(a)(8); recorded so the exclusion is visible. */
  readonly legal_counsel_excluded: boolean;
  /** § 7152(a)(9) — dates of review and approval. */
  readonly review_date: string;
  readonly approval_date: string;
  readonly approvers: readonly AttestationApprover[];
  /** The approval-authority requirement, stated on the face of the report. */
  readonly approval_authority_requirement: string;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}
