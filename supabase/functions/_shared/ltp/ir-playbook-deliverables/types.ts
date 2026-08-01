/**
 * ITEM 312 — ir-playbook analytic deliverables (Chapter 8 of
 * docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
 *
 * WHAT IS NOT TOUCHED
 *   Op. 1 (awareness determination / 72-hour clock arithmetic) PERFORMS and is
 *   the fleet's best handling of an unresolved fact. It stays deterministic and
 *   stays where it is; nothing in this module recomputes a deadline.
 *   Op. 5's timing/owner limb (conditional DPO escalation) likewise stands.
 *
 * WHAT THIS MODULE ADDS (the Ops. 2-4 gap: the playbook ASSUMED notifiability)
 *   1. sa_notification_determination      Art. 33(1) — the "unless ... unlikely
 *                                         to result in a risk to the rights and
 *                                         freedoms of natural persons" test,
 *                                         argued on the incident facts.
 *   2. data_subject_communication_determination
 *                                         Art. 34(1) — the SEPARATE and higher
 *                                         "likely to result in a HIGH risk"
 *                                         test. Never inherited from (1).
 *   3. art34_exemption_analysis           All three Art. 34(3) limbs walked on
 *                                         the record, with the public
 *                                         communication substitute (c) supplies.
 *   4. content_owner_mapping              Art. 33(3)(a)-(d) elements each with
 *                                         an owner and an evidence
 *                                         source-of-truth, plus the Art. 33(4)
 *                                         phasing plan and the Art. 33(5)
 *                                         internal-documentation record
 *                                         (facts / effects / remedial action).
 *
 * ANALYSIS SHAPE LAW: every determination carries STANDARD (verbatim registry
 * text) → RECORD FACT (what the record actually says) → APPLICATION (the
 * standard run over that fact) → VERDICT. A recitation fails the pin tests.
 *
 * DEGRADATION LAW: what the record cannot support is emitted with
 * `status: "record_insufficient"` and a SPECIFIC `information_needed`, naming
 * the intake field. Never omitted, never invented.
 *
 * SEPARATION LAW (Item 308/311 pattern): enforcement-exposure / penalty framing
 * is mechanically relocated out of obligation reasoning into `exposure_note`.
 *
 * TWO-THRESHOLD LAW: Art. 33(1) ("a risk") and Art. 34(1) ("a high risk") are
 * different standards. The builder computes them from separate predicates and
 * the pin tests assert a record that is notifiable to the supervisory authority
 * but NOT communicable to data subjects.
 */

import type { NotificationRegime } from "./elements.ts";

export type { NotificationRegime };

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

// ── 1. Art. 33(1) supervisory-authority notification ─────────────────
export type SaVerdict =
  | "notification_required"
  | "notification_not_required_unlikely_risk"
  | "undetermined_on_the_record";

export interface RiskFactor {
  readonly factor: string;
  /** The record value that puts the factor in play. */
  readonly record_basis: string;
  /** "aggravating" raises the risk; "mitigating" lowers it. */
  readonly direction: "aggravating" | "mitigating";
}

export interface SaNotificationDetermination extends AnalysisShape {
  /** ITEM 328 — which GDPR-family regime this determination is made under. */
  readonly regime: NotificationRegime;
  /** Human-readable label for the regime, rendered as the duty's heading. */
  readonly regime_label: string;
  /**
   * ITEM 328 PARALLEL-DUTY LAW: present where the incident engages more than
   * one regime. States that this duty stands alongside the other, not instead
   * of it.
   */
  readonly parallel_duty_note?: string;
  readonly verdict: SaVerdict;
  /** The factors the risk test was actually run over. */
  readonly risk_factors: readonly RiskFactor[];
  /**
   * TWO-THRESHOLD LAW: true only where the record supports the Art. 33(1)
   * negative condition. Defaults false — the duty is the rule, not the
   * exception, and the exception must be earned on the record.
   */
  readonly unlikely_risk_established: boolean;
  /** Obligation reasoning only — no penalty framing. */
  readonly why: string;
  readonly exposure_note: string;
  readonly separation_repairs: number;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 2. Art. 34(1) communication to data subjects ─────────────────────
export type CommunicationVerdict =
  | "communication_required"
  | "communication_not_required_no_high_risk"
  | "communication_excused_by_exemption"
  | "undetermined_on_the_record";

export interface DataSubjectCommunicationDetermination extends AnalysisShape {
  /** ITEM 328 — which GDPR-family regime this determination is made under. */
  readonly regime: NotificationRegime;
  readonly regime_label: string;
  readonly parallel_duty_note?: string;
  readonly verdict: CommunicationVerdict;
  readonly high_risk_factors: readonly RiskFactor[];
  readonly high_risk_established: boolean;
  /**
   * TWO-THRESHOLD LAW telemetry: the Art. 33(1) verdict is recorded here for
   * transparency but is NEVER the reason for the Art. 34(1) verdict.
   */
  readonly sa_verdict_for_contrast: SaVerdict;
  readonly threshold_separation_note: string;
  readonly why: string;
  readonly exposure_note: string;
  readonly separation_repairs: number;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 3. Art. 34(3) exemptions ─────────────────────────────────────────
export type ExemptionLimb = "a_unintelligible" | "b_subsequent_measures" | "c_disproportionate_effort";
export type LimbVerdict = "available" | "not_available" | "undetermined_on_the_record";

export interface ExemptionFinding extends AnalysisShape {
  readonly limb: ExemptionLimb;
  readonly verdict: LimbVerdict;
  /**
   * Art. 34(3)(c) only: the provision supplies its own substitute. Present on
   * limb (c) whenever the limb is available or undetermined.
   */
  readonly substitute_measure?: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface Art34ExemptionAnalysis {
  readonly limbs: readonly ExemptionFinding[];
  /** True where at least one limb is `available` on this record. */
  readonly any_exemption_available: boolean;
  /**
   * Art. 34(4): the supervisory authority may still require communication or
   * decide the paragraph 3 conditions are met. Always carried — an exemption
   * reached by the controller is not the last word.
   */
  readonly sa_override_citation: string;
  readonly sa_override_verbatim: string;
  readonly status: DeliverableStatus;
}

// ── 4. Art. 33(3)(a)-(d) content / owner mapping ─────────────────────
export type ContentElementKey = "a_nature" | "b_dpo_contact" | "c_likely_consequences" | "d_measures";

export interface ContentElementMapping {
  readonly element: ContentElementKey;
  readonly citation: string;
  /** VERBATIM Art. 33(3) sub-point text. */
  readonly requirement_verbatim: string;
  /** Named role accountable for producing the element. */
  readonly owner: string;
  /** Where the evidence for this element comes from — a record field or system. */
  readonly source_of_truth: string;
  /** What the record supplies for this element today. */
  readonly record_value: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface PhasingPlan {
  readonly citation: string;
  readonly authority_verbatim: string;
  /** Elements that can be filed in the first tranche. */
  readonly first_tranche: readonly ContentElementKey[];
  /** Elements deferred to a later phase, with the reason each is deferred. */
  readonly phased: readonly { readonly element: ContentElementKey; readonly reason: string }[];
  readonly status: DeliverableStatus;
}

export interface DocumentationRecord {
  readonly citation: string;
  readonly authority_verbatim: string;
  /** Art. 33(5) structure, verbatim in order: facts / effects / remedial action. */
  readonly facts: string;
  readonly effects: string;
  readonly remedial_action: string;
  readonly owner: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface ContentOwnerMapping {
  readonly elements: readonly ContentElementMapping[];
  readonly phasing: PhasingPlan;
  readonly documentation: DocumentationRecord;
  readonly status: DeliverableStatus;
}

/**
 * ITEM 328 — Chapter V framing for the regime, cited to the regime's own
 * general principle. For the UK leg that is Art. 44A: Art. 44 is OMITTED in UK
 * law (Item 302 residual watch item 2) and is carried only as an omission
 * record, never as the operative authority.
 */
export interface TransferFraming {
  readonly regime: NotificationRegime;
  readonly citation: string;
  readonly standard: string;
  /** UK leg only: the record that Art. 44 is not in force. */
  readonly omitted_article_note?: string;
  readonly record_fact: string;
  readonly application: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

/**
 * ITEM 328 — one regime's complete, independently-stated duty set. A mixed
 * EU + UK incident produces TWO of these, rendered side by side.
 */
export interface RegimeDutySet {
  readonly regime: NotificationRegime;
  readonly regime_label: string;
  readonly supervisory_authority: string;
  readonly sa_notification_determination: SaNotificationDetermination;
  readonly data_subject_communication_determination: DataSubjectCommunicationDetermination;
  readonly transfer_framing: TransferFraming;
}

export interface IrPlaybookDeliverables {
  /**
   * ITEM 328: every GDPR-family regime the record puts in scope, each with its
   * own Art. 33 / Art. 34 determination. Length 2 for a mixed EU + UK incident.
   * The scalar fields below are the FIRST entry, retained for the existing
   * renderer contract — they are a view onto this array, not a substitute.
   */
  readonly notification_duties: readonly RegimeDutySet[];
  readonly sa_notification_determination: SaNotificationDetermination;
  readonly data_subject_communication_determination: DataSubjectCommunicationDetermination;
  readonly art34_exemption_analysis: Art34ExemptionAnalysis;
  readonly content_owner_mapping: ContentOwnerMapping;
}
