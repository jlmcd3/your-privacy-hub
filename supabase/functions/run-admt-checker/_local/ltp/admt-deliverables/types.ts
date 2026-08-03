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
//
// UPGRADE-3 ITEM 1 — SHAPE-LAW form. A notice element is no longer an
// assertion of the bar the regulation sets; it is a TEST of the business's
// own captured notice words against that bar:
//
//   standard      → what the cited provision requires (from the corpus)
//   record_fact   → the notice's OWN words, as captured from the business
//   application   → the standard applied to those words
//   verdict       → the result of that application
export interface NoticeElementFinding {
  readonly element_id: NoticeElementId;
  readonly element_label: string;
  /** Registry proposition_keys that define this element (never re-derived). */
  readonly proposition_keys: readonly string[];
  /** VERBATIM § 7220(c) text for the element, from the verified registry. */
  readonly element_verbatim: string;
  readonly citation: string;
  /** SHAPE-LAW step 1 — the bar the cited provision sets, in plain terms. */
  readonly standard: string;
  /** SHAPE-LAW step 2 — the notice's own words, quoted from the record. */
  readonly record_fact: string;
  /** SHAPE-LAW step 3 — the standard applied to those words. */
  readonly application: string;
  /** The business's own published pre-use notice text for this element. */
  readonly published_text: string;
  /** Where `record_fact` came from: transcribed element text, the full
   *  published notice the business supplied, or an absence assertion. */
  readonly record_source:
    | "element_text"
    | "published_notice_text"
    | "absence_assertion"
    | "none";
  readonly verdict: NoticeVerdict;
  /** Why the verdict — reasons over the record, never invention. */
  readonly why: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

// ── 1b. § 7220(c)(2)(B) exception-IDENTIFICATION duty ────────────────
//
// UPGRADE-3 ITEM 1 — distinct from the opt-out MECHANISM analysis in
// element c2_optout. (c)(2)(B) imposes a separate disclosure duty: where the
// business relies on a § 7221(b) exception other than human appeal, the
// notice must NAME the specific exception relied upon. A business can have a
// perfectly adequate opt-out description and still breach this duty.
export interface ExceptionIdentificationFinding {
  readonly finding_id: "c2B_exception_identification";
  readonly citation: string;
  /** VERBATIM § 7220(c)(2)(B) text, from the verified registry. */
  readonly element_verbatim: string;
  readonly standard: string;
  readonly record_fact: string;
  readonly application: string;
  /** The § 7221(b) exception the record shows the business relying on. */
  readonly exception_relied_upon: string;
  readonly verdict:
    | "satisfied"
    | "not_satisfied"
    | "not_applicable"
    | "insufficient_record";
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

// ── 4. § 7222 — access-rights readiness (UPGRADE-3 ITEM 3) ───────────
//
// § 7222(b) enumerates the plain-language explanations a business must be
// able to give a consumer who exercises the right to access ADMT. Each is a
// testable element: can this business produce it on request, and by what
// process? SHAPE-LAW findings; DEGRADATION LAW applies unchanged.
export type AccessElementId =
  | "b1_purpose"
  | "b2_logic"
  | "b3_output_use"
  | "b3_outcome"
  | "b3_human_role";

export type AccessVerdict =
  | "ready"
  | "partially_ready"
  | "not_ready"
  /** DEGRADATION LAW: the record neither shows readiness nor denies it. */
  | "insufficient_record";

export interface AccessReadinessFinding {
  readonly element_id: AccessElementId;
  readonly element_label: string;
  readonly citation: string;
  /** provision_texts key the element is drawn from (cppa-7222). */
  readonly corpus_key: string;
  /** VERBATIM § 7222(b) text for this element, from the verified registry. */
  readonly element_verbatim: string;
  readonly standard: string;
  readonly record_fact: string;
  readonly application: string;
  /** The business's stated process for producing this explanation. */
  readonly process_on_the_record: string;
  readonly verdict: AccessVerdict;
  readonly why: string;
  readonly status: DeliverableStatus;
  readonly information_needed?: string;
}

export interface AdmtDeliverables {
  readonly notice_element_findings: readonly NoticeElementFinding[];
  readonly exception_identification: ExceptionIdentificationFinding;
  readonly exception_qualification: readonly ExceptionQualificationEntry[];
  readonly access_readiness_findings: readonly AccessReadinessFinding[];
  readonly determination: Determination;
}

