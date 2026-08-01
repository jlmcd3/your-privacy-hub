/**
 * ITEM 308 — cppa-admt analytic deliverables (Chapter 3 (E)(3) of
 * docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
 *
 * Three deliverables, replacing the RECITES behaviour scored on Ops 2, 3
 * and 5 of Chapter 3's (C) operations table:
 *
 *   1. notice_element_findings[]  § 7220(c)(1)–(5) element-by-element
 *   2. exception_qualification[]  § 7221(b) condition-by-condition
 *   3. determination              lawfulness NOW  ≠  exposure
 *
 * SHAPE LAW: plain scalars, strings, arrays of these records. No nested
 * free-form bags.
 *
 * DEGRADATION LAW: an operation the record cannot support is emitted with
 * `status: "record_insufficient"` and a specific `information_needed`
 * string. It is NEVER omitted and NEVER filled with invention.
 *
 * SEPARATION LAW (Item 297 defect): `determination` carries the § 7220 /
 * § 7221 lawfulness finding and the consequence-of-non-compliance framing
 * in TWO separate fields. Enforcement-exposure language may never appear
 * inside the lawfulness component.
 */

export type DeliverableStatus = "analysed" | "record_insufficient";

/** The five § 7220(c) elements, as the regulation enumerates them. */
export type NoticeElementId =
  | "c1_purpose"
  | "c2_optout"
  | "c3_access"
  | "c4_antiretaliation"
  | "c5_howworks_and_alternative";

export type NoticeVerdict =
  | "adequate"
  | "inadequate"
  | "absent"
  /** DEGRADATION LAW: the record neither shows the text nor asserts absence. */
  | "insufficient_record";

// ── 1. § 7220(c) notice elements ─────────────────────────────────────
export interface NoticeElementFinding {
  readonly element_id: NoticeElementId;
  readonly element_label: string;
  /** Registry proposition_keys that define this element (never re-derived). */
  readonly proposition_keys: readonly string[];
  /** VERBATIM § 7220(c) text for the element, from the verified registry. */
  readonly element_verbatim: string;
  readonly citation: string;
  /** The business's own published pre-use notice text for this element. */
  readonly published_text: string;
  readonly verdict: NoticeVerdict;
  /** Why the verdict — reasons over the record, never invention. */
  readonly why: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 2. § 7221(b) exception qualification ─────────────────────────────
export type ConditionVerdict =
  | "satisfied"
  | "not_satisfied"
  | "insufficient_record";

export interface ExceptionCondition {
  readonly condition_id: string;
  /** VERBATIM substring of the registry row's quote. Never paraphrased. */
  readonly condition_verbatim: string;
  readonly verdict: ConditionVerdict;
  readonly why: string;
  readonly evidence_on_the_record: string;
  readonly information_needed?: string;
}

export interface ExceptionQualificationEntry {
  /** Registry proposition_key of the exception being claimed. */
  readonly proposition_key: string;
  readonly exception_label: string;
  readonly citation: string;
  readonly claimed_on_the_record: boolean;
  readonly conditions: readonly ExceptionCondition[];
  /** Roll-up over the conditions — never a status label standing alone. */
  readonly qualifies:
    | "qualifies"
    | "does_not_qualify"
    | "insufficient_record";
  readonly why: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 3. determination (model-work, separation-guarded) ────────────────
export interface LawfulnessFinding {
  /** "What is unlawful NOW" under §§ 7220/7221 as they stand. */
  readonly finding: string;
  readonly basis_element_ids: readonly NoticeElementId[];
  readonly basis_exception_keys: readonly string[];
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface ExposureFinding {
  /** "What is exposure" — consequence of non-compliance. */
  readonly statement: string;
  readonly citation: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface Determination {
  readonly activity_id: string;
  readonly activity_name: string;
  readonly lawfulness: LawfulnessFinding;
  readonly exposure: ExposureFinding;
  /** "model" = narrated by pass 1; "degraded" = deterministic scaffold. */
  readonly source: "model" | "degraded";
  /** Count of sentences relocated out of `lawfulness.finding` by the guard. */
  readonly separation_repairs: number;
}

export interface AdmtDeliverables {
  readonly notice_element_findings: readonly NoticeElementFinding[];
  readonly exception_qualification: readonly ExceptionQualificationEntry[];
  readonly determination: Determination;
}
