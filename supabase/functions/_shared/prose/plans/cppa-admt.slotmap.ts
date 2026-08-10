// ITEM SO-2 — ADMT SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned corrected v3 skeleton,
// bound to a LIVE source: either an intake key on the live contract
// (`_shared/intake-contracts/cppa-admt.ts`, snake_case as persisted) or a leaf
// of a typed surface on the LIVE persisted report shape (items 392–422).
// A slot without a live source is a STOP condition.
//
// STEP-0 HISTORY: the prior skeleton carried `{systemPurpose}`, which had no
// live source (no `system_purpose` on the contract, none in the ADMTChecker
// submit payload, none in any persisted `cppa_assessments` intake row for the
// ADMT module). SO-2 stopped on it; the CEO-corrected 2026-08-10 skeleton drops
// the slot rather than remapping it. Every remaining slot resolves.

export type AdmtSlotSourceKind = "intake" | "typed-surface" | "composed";

export type AdmtSlotRender =
  | "label-map"         // stored option value → reader label, woven into prose
  | "adverbial"         // rendered as its own clause inside the fixed sentence
  | "quoted-attributed" // the company's words, attributed to the company
  | "list-as-prose"     // array rendered as an English list
  | "verbatim"
  | "conditional-sentence";

export interface AdmtSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: AdmtSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: AdmtSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const ADMT_SLOT_MAP: readonly AdmtSlotBinding[] = [
  { slot: "organizationName", kind: "intake", source: "organization_name",
    render: "verbatim", absent: "required — the document may not issue without it" },

  // Executive Summary
  { slot: "systemName", kind: "intake", source: "system_name",
    render: "verbatim", absent: "required" },
  { slot: "SYSTEM_TYPE_PHRASE", kind: "intake", source: "system_type",
    render: "label-map", absent: "required" },
  { slot: "systemDescription", kind: "intake", source: "system_description",
    render: "quoted-attributed", absent: "required" },
  { slot: "decisionDomains", kind: "intake", source: "decision_domains",
    render: "list-as-prose", absent: "required" },

  // II. Pre-use Notice
  { slot: "NOTICE_DELIVERY_PHRASE", kind: "intake", source: "notice_delivery",
    render: "label-map", absent: "named as an unanswered element, never assumed" },
  { slot: "NOTICE_PURPOSE_SENTENCE", kind: "composed",
    source: "notice_has_specific_purpose + notice_purpose_text",
    render: "conditional-sentence",
    absent: "the honest sentence that the notice does not yet state a specific purpose" },

  // III. Opt-Out and Human Appeal
  { slot: "OPT_OUT_SENTENCE", kind: "composed",
    source: "opt_out_methods + opt_out_confirmation_mechanism",
    render: "quoted-attributed",
    absent: "the honest sentence that no opt-out mechanism is recorded — never assumed" },
  { slot: "EXCEPTION_SENTENCE", kind: "composed",
    source: "opt_out_exception + opt_out_appeal_process",
    render: "conditional-sentence", absent: "omitted" },

  // IV. Access and Explanation
  { slot: "accessSubmissionMethods", kind: "intake", source: "access_submission_methods",
    render: "adverbial", absent: "required" },
  { slot: "accessVerificationProcess", kind: "intake", source: "access_verification_process",
    render: "adverbial", absent: "required" },
  { slot: "accessResponseTimeline", kind: "intake", source: "access_response_timeline",
    render: "label-map", absent: "required" },
  { slot: "accessLogicDisclosure", kind: "intake", source: "access_logic_disclosure",
    render: "quoted-attributed", absent: "required" },
  { slot: "accessOutcomeDisclosure", kind: "intake", source: "access_outcome_disclosure",
    render: "quoted-attributed", absent: "required" },
];

/**
 * The typed surfaces the skeleton's [GENERATED] blocks consume, per items
 * 392–422. Named here so the slot-map test can assert the reverse direction:
 * every surface listed is consumed by a section of the skeleton.
 */
export const ADMT_TYPED_SURFACES: readonly { surface: string; section_id: string }[] = [
  { surface: "scope_analysis", section_id: "applicability" },
  { surface: "notice_analysis", section_id: "pre_use_notice" },
  { surface: "adequacy_finding", section_id: "opt_out_appeal" },
  { surface: "priority_actions", section_id: "findings_actions" },
  { surface: "top_3_actions", section_id: "findings_actions" },
];
