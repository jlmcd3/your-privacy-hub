// ITEM SO-6 — BIOMETRIC SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned CEO-corrected v3
// skeleton, bound to a LIVE source: an intake key on the live contract
// (`_shared/intake-contracts/biometric.ts`, as persisted in
// `biometric_assessments.intake_data` / the request body) or a leaf of a typed
// surface on the LIVE persisted report shape. A slot without a live source is
// a STOP condition.
//
// STOP HISTORY (2026-08-10): step 0 halted on EIGHT slots with no live source —
// `{dataSubjectTypes}`, `{NOTICE_PURPOSE_PHRASE}`, `{txNoticeConsent}`,
// `{waNoticeConsent}`, `{storageMethod}`, `{RETENTION_PHRASE}`,
// `{VENDOR_SENTENCE}`, `{LEGAL_REVIEW_SENTENCE}`. The CEO resolved all of them
// on 2026-08-10 by six paragraph edits: seven clauses dropped outright and
// `{RETENTION_PHRASE}` remapped to `{retentionSchedule}` bound to
// `retention_schedule_text`. `{sector}` was bound to `orgType`, rendered as the
// reader gave it (no case-fold). All twelve remaining slots resolve.

export type BiometricSlotSourceKind = "intake" | "typed-surface" | "composed";

export type BiometricSlotRender =
  | "label-map"
  | "list-as-prose"
  | "quoted-attributed"
  | "verbatim"
  | "conditional-clause"
  | "conditional-sentence";

export interface BiometricSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: BiometricSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: BiometricSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const BIOMETRIC_SLOT_MAP: readonly BiometricSlotBinding[] = [
  // Subtitle + Executive Summary
  { slot: "organizationName", kind: "intake", source: "orgName", render: "verbatim",
    absent: "required — the form gates submit on it" },
  { slot: "sector", kind: "intake", source: "orgType", render: "verbatim",
    absent: "the clause is dropped; CEO ruling 2026-08-10 — rendered as the reader gave it, never case-folded" },
  { slot: "biometricTypes", kind: "intake", source: "biometricTypes", render: "list-as-prose",
    absent: "required — the form gates submit on it" },
  { slot: "collectionPurpose", kind: "intake", source: "purpose", render: "label-map",
    absent: "required — the select defaults, never empty" },
  { slot: "collectionMethod", kind: "intake", source: "data_source_description", render: "quoted-attributed",
    absent: "the sentence is dropped; the facts are carried by the composed blocks, never invented" },
  { slot: "states", kind: "composed", source: "jurisdictions + other_state_names", render: "list-as-prose",
    absent: "required — the form gates submit on jurisdictions" },

  // I. Notice, Consent and the Written Policy
  { slot: "HAS_NOTICE_PHRASE", kind: "intake", source: "notice_before_collection", render: "label-map",
    absent: "the sentence is dropped, never padded" },
  { slot: "HAS_RELEASE_PHRASE", kind: "intake", source: "consent_artifact_type", render: "label-map",
    absent: "the sentence is dropped, never padded" },

  // II. State-Specific Requirements (consumed by the conditional composers)
  { slot: "txDestruction", kind: "intake", source: "tx_destruction_within_one_year", render: "label-map",
    absent: "the Texas destruction clause is omitted; the composer states the answer is not recorded" },

  // III. Security, Retention and Destruction
  { slot: "securityMeasures", kind: "intake", source: "security_measures_description", render: "quoted-attributed",
    absent: "the sentence is dropped; the composer states no measures were recorded" },
  { slot: "retentionSchedule", kind: "intake", source: "retention_schedule_text", render: "quoted-attributed",
    absent: "the sentence is dropped; CEO remap 2026-08-10 of {RETENTION_PHRASE}" },
  { slot: "destructionTrigger", kind: "intake", source: "destruction_trigger", render: "quoted-attributed",
    absent: "the clause is dropped; the statutory clock is stated in the composed block instead" },

  // IV. Review and Approval
  { slot: "APPROVAL_SENTENCE", kind: "composed", source: "approved_by_name / approved_by_title / approval_date",
    render: "conditional-sentence",
    absent: "the honest sentence that no approver, title or approval date has been recorded" },
];

/** Conditional triggers carried by the skeleton, each bound to a live answer. */
export const BIOMETRIC_CONDITIONAL_TRIGGERS: readonly { readonly id: string; readonly source: string }[] = [
  { id: "IL", source: 'jurisdictions includes "Illinois, USA (BIPA)"' },
  { id: "TX", source: 'jurisdictions includes "Texas, USA (CUBI)"' },
  { id: "WA", source: 'jurisdictions includes "Washington state, USA"' },
  { id: "OTHER", source: 'jurisdictions includes "Other US state" (names from other_state_names)' },
];

/** Reader phrases for the written-notice answer, woven into the fixed sentence. */
export const BIOMETRIC_NOTICE_PHRASE_MAP: Record<string, string> = {
  "Written notice given before collection": "by confirming that written notice was given before collection",
  "Notice given before collection, but not in writing": "by stating that notice was given before collection but not in writing",
  "No notice given before collection": "by stating that no notice was given before collection",
  "Not known": "as not known",
};

/** Reader phrases for the consent or release artifact. */
export const BIOMETRIC_RELEASE_PHRASE_MAP: Record<string, string> = {
  "Standalone written release signed before collection": "by identifying a standalone written release signed before collection",
  "Electronic signature captured in the enrolment flow": "by identifying an electronic signature captured in the enrolment flow",
  "Release executed as a condition of employment (onboarding paperwork)": "by identifying a release executed as a condition of employment (onboarding paperwork)",
  "Clickwrap or in-product acceptance": "by identifying clickwrap or in-product acceptance",
  "Verbal consent only": "by stating that consent was verbal only",
  "No consent obtained": "by stating that no consent was obtained",
  "Not known": "as not known",
};

/** Reader phrases for the CUBI one-year destruction answer. */
export const BIOMETRIC_TX_DESTRUCTION_PHRASE_MAP: Record<string, string> = {
  "Yes": "that biometric identifiers are destroyed within one year of the date the purpose for collecting them expires",
  "No": "that biometric identifiers are not destroyed within one year of the date the purpose for collecting them expires",
  "Not known": "that whether biometric identifiers are destroyed within one year is not known to it",
};

/** Reader labels for the collection purpose, woven into the fixed sentence. */
export const BIOMETRIC_PURPOSE_PHRASE_MAP: Record<string, string> = {
  "Time & attendance / workforce management": "time and attendance and wider workforce management",
  "Physical access control": "physical access control",
  "Customer authentication": "customer authentication",
  "Surveillance / monitoring": "surveillance and monitoring",
  "Research or product development": "research or product development",
  "Other": "a purpose it has recorded as other",
};
