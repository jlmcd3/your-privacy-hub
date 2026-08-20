// CPPA ADMT v1.2 spine, Part II §B — typed vocabularies.
// Transcribed verbatim from CPPA_ADMT_Audit_Spine_v1.2_Revised.docx.
// Encoding law: nothing here may add a state the spine did not name.

export type ScopeState = "IN_SCOPE" | "OUT_OF_SCOPE" | "UNABLE_TO_ASSESS" | "INCONSISTENT_RECORD";

export type SubstantiveState =
  | "MEETS_REPORTED"
  | "PARTIAL"
  | "GAP"
  | "INSUFFICIENT_RECORD"
  | "NOT_APPLICABLE";

export type RecordGrade = "COMPLETE" | "QUALIFIED" | "MATERIALLY_INCOMPLETE";

export type DecisionEffect = "SUPPORTS" | "WEIGHS_AGAINST" | "CONDITION" | "NEUTRAL";

export type PathState =
  | "FULL_OPT_OUT"
  | "HUMAN_APPEAL_EXCEPTION"
  | "HIRING_ADMISSION_EXCEPTION"
  | "WORK_ALLOCATION_COMP_EXCEPTION"
  | "OTHER_UNRESOLVED";

export type EvidenceState = "DOCUMENTED" | "NOT_DOCUMENTED" | "INSUFFICIENT_RECORD" | "NOT_APPLICABLE";

/** Part II §J — the finding object every gap/action becomes before prose. */
export interface AdmtV2Finding {
  finding_id: string;
  area: string;
  criterion: string;
  source_fields: string[];
  substantive_state: SubstantiveState;
  evidence_state?: EvidenceState;
  record_grade?: RecordGrade;
  decision_effect: DecisionEffect;
  factual_basis: string;
  /** Resolved citation string, or "" if this factor carries none. */
  authority: string;
  action_text: string;
  /** 1 = blocks the selected pathway, 2 = material weighs-against, 3 = record/governance/improvement. */
  priority: 1 | 2 | 3;
  closure_condition: string;
}

// ---------------------------------------------------------------------------
// Reader-label maps — verbatim option strings from the live intake contract
// (cppa-admt.ts) mapped to the short labels the spine's tables print. Kept
// here, not invented ad hoc per factor, so every table cell traces to one
// source of truth.
// ---------------------------------------------------------------------------

export const HUMAN_REVIEW_LABEL: Record<string, string> = {
  "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision":
    "Qualifying human review reported",
  "Partial — reviewer sees the output but cannot override it": "Non-qualifying review reported (no override authority)",
  "No — fully automated, no human review": "No human review reported",
  "Not applicable / unsure": "Human review not resolved",
};

export const YES_NO_UNSURE_LABEL: Record<string, string> = {
  Yes: "Yes",
  No: "No",
  Unsure: "Unsure",
};
