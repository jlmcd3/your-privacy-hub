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
  readonly safeguard: string;
  readonly safeguard_status: SafeguardStatus | "not stated on the record";
  readonly residual_band: ResidualBand;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 4. § 7152(a)(4) weighing, per beneficiary class ──────────────────
export interface WeighingEntry {
  readonly beneficiary_class: BeneficiaryClass;
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
export type ConsequenceDecision =
  | "initiate"
  | "initiate_with_conditions"
  | "do_not_initiate_absent_change"
  | "reserved_insufficient_record";

export interface Consequence {
  readonly decision: ConsequenceDecision;
  /** Ordered, human-readable reasons — each traces to a rule id below. */
  readonly rule_ids: readonly string[];
  readonly reasons: readonly string[];
  readonly conditions: readonly string[];
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
  readonly harm_causation: readonly HarmCausationEntry[];
  readonly safeguard_map: readonly SafeguardMapEntry[];
  readonly weighing: readonly WeighingEntry[];
  readonly consequence: Consequence;
}
