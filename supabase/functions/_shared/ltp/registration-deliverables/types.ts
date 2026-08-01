/**
 * ITEM 316 — types for the registration analytic deliverables.
 *
 * SHAPE LAW (Items 305/308/310/311/312/313/315): every finding carries
 * standard (verbatim corpus) → record fact → application → verdict. A finding
 * the record cannot support degrades to `record_insufficient` with a named
 * `information_needed`. Nothing here returns a bare boolean: the defect this
 * item closes is precisely that `obligations_summary` was booleans and nulls
 * with no citation and no reasoning behind any of them.
 */

export type FindingStatus = "analysed" | "record_insufficient";

export type Verdict =
  | "satisfied"
  | "not_satisfied"
  | "engaged"
  | "not_engaged"
  | "conditional"
  | "not_applicable"
  | "record_insufficient";

/** The common four-part analysis shape. */
export interface Finding {
  key: string;
  label: string;
  citation: string;
  /** Verbatim corpus text — never paraphrased. */
  standard: string;
  /** What the intake record actually says. */
  record_fact: string;
  /** Application of the standard to the record fact. */
  application: string;
  verdict: Verdict;
  status: FindingStatus;
  information_needed?: string;
}

/** Op. 1 — the state's own definitional threshold applied to record facts. */
export interface ThresholdAnalysis extends Finding {
  jurisdiction: string;
  /** Each limb of that state's definition, evaluated separately. */
  limbs: Array<{
    limb: string;
    citation: string;
    /** Verbatim fragment of the definition this limb is drawn from. */
    standard: string;
    record_fact: string;
    met: boolean | null;
    reasoning: string;
  }>;
  /** Named exclusion the record claims, if any. */
  exclusion_claimed: string | null;
  exclusion_analysis: string;
}

export type RegistrationVerdict =
  | "registrable"
  | "not_registrable"
  | "conditional"
  | "record_insufficient";

/** Op. 2 — the per-jurisdiction registration determination. */
export interface RegistrationDetermination {
  jurisdiction: string;
  state_name: string;
  filing_body: string;
  verdict: RegistrationVerdict;
  /** One sentence in the statute's own frame. */
  headline: string;
  /** Reasoning that names the limbs that decided it. */
  reasoning: string;
  citations: string[];
  threshold: ThresholdAnalysis;
  requirement: Finding;
  /** What must be learned before a conditional verdict can resolve. */
  open_questions: string[];
  status: FindingStatus;
}

/**
 * Op. 3 — SCHEDULE-SURFACE LAW. The window and fee are stated as the statute
 * states them. The engine does NOT compute the customer's own deadline date:
 * no field here holds a resolved calendar date, and the pin test enforces it.
 */
export interface ScheduleAndFee {
  jurisdiction: string;
  /** Verbatim window/term sentence, or null when the statute states none. */
  window_standard: string | null;
  window_citation: string | null;
  /** Plain restatement of the window — still no computed date. */
  window_note: string;
  /** Verbatim fee sentence, or null. */
  fee_standard: string | null;
  fee_citation: string | null;
  /** Stated dollar amount when the operative text names one, else null. */
  fee_stated_amount: string | null;
  fee_note: string;
  status: FindingStatus;
}

/** Op. 5 — filing-content readiness against the jurisdiction's own list. */
export interface FilingReadiness {
  jurisdiction: string;
  citation: string;
  /** Verbatim list of what the filing must contain. */
  standard: string;
  items: Array<{
    item: string;
    intake_key: string | null;
    ready: boolean | null;
    record_fact: string;
  }>;
  /** Reasoned: is the record ready to file, on its face? */
  ready_to_file: boolean | null;
  status: FindingStatus;
  summary: string;
  information_needed?: string;
}

/** Op. 6 — EU/UK representative and DPO triggers, reasoned not asserted. */
export interface RepresentativeDetermination extends Finding {
  jurisdiction: "EU" | "UK";
  /** Art. 27(2) exemption limbs, evaluated rather than ignored. */
  exemption_analysis: string;
}

export interface DpoDetermination {
  verdict: Verdict;
  headline: string;
  reasoning: string;
  /** One finding per Art. 37(1) branch — (a), (b), (c). */
  findings: Finding[];
  /** The branch(es) that engaged, by citation. */
  engaged_branches: string[];
  citations: string[];
  status: FindingStatus;
}

/**
 * The EU AI Act (Reg. (EU) 2024/1689 Arts. 16, 26, 49, 71) is NOT in corpus as
 * of this item. CORPUS-PENDING LAW: the product may record that the question
 * exists; it may not answer it. This carries no verdict field by construction.
 */
export interface CorpusPendingFlag {
  topic: string;
  named_provisions: string[];
  status: "record_insufficient";
  note: string;
}

/** Op. 7 — the prose surface this product previously did not have at all. */
export interface RegistrationNarrative {
  /** Part 1 — what was assessed and on what record. */
  overview: string;
  /** Part 4 — the determination, in prose, naming its own limits. */
  determination: string;
}

export interface RegistrationDeliverables {
  determinations: RegistrationDetermination[];
  schedules: ScheduleAndFee[];
  filing_readiness: FilingReadiness[];
  representative_determinations: RepresentativeDetermination[];
  /**
   * ITEM 329 — combined EU+UK representative check. True only when BOTH the EU
   * and the UK Art. 27 determinations reach verdict "engaged". The individual
   * determinations remain the operative analysis; this is a clarity flag that
   * names the joint scenario explicitly instead of leaving it to emerge from
   * two independent evaluations rendered side by side.
   */
  both_representatives_required: boolean;
  /** Present only when both_representatives_required is true. */
  combined_representative_callout?: string;
  dpo_determination: DpoDetermination;
  corpus_pending: CorpusPendingFlag[];
  narrative: RegistrationNarrative;
}
