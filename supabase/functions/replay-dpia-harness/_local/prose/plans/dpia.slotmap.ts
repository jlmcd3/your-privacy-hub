// ITEM SO-5 — DPIA SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned CEO-corrected v3
// skeleton, bound to a LIVE source: an intake key on the live contract
// (`_shared/intake-contracts/dpia-framework.ts`, as persisted in
// `dpia_frameworks.intake_data`) or a leaf of a typed surface on the LIVE
// persisted report shape. A slot without a live source is a STOP condition.
//
// STOP HISTORY: the uncorrected v3 carried `{dataSources - as prose}`, which
// had NO live source — the DPIA intake asks no data-provenance question. The
// CEO resolved it on 2026-08-10 by dropping the clause (not remapping it).
// All 24 remaining slots resolve.

export type DpiaSlotSourceKind = "intake" | "typed-surface" | "composed";

export type DpiaSlotRender =
  | "label-map"
  | "list-as-prose"
  | "quoted-attributed"
  | "verbatim"
  | "conditional-clause"
  | "conditional-sentence";

export interface DpiaSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: DpiaSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: DpiaSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const DPIA_SLOT_MAP: readonly DpiaSlotBinding[] = [
  // Subtitle
  { slot: "name", kind: "intake", source: "processing_activity_name", render: "verbatim",
    absent: "required — the form gates submit on it" },
  { slot: "organizationName", kind: "intake", source: "organization_name", render: "verbatim",
    absent: "required — the form gates submit on it" },

  // Executive Summary
  // DOC 188 P6 (v4.10, 2026-09-05) — the opener's instrument name, selected
  // from the record's jurisdictions (readDpiaRegimeScope): EU-only, UK-only,
  // or the former "for the EU and UK" literal where both are named.
  { slot: "gdprInstrument", kind: "composed", source: "jurisdictions", render: "label-map",
    absent: "never absent — an unnamed regime reads as the EU instrument (readDpiaRegime default)" },
  { slot: "reasonsToConduct", kind: "intake", source: "reasons_to_conduct", render: "list-as-prose",
    absent: "the sentence is dropped, never padded" },
  { slot: "description", kind: "intake", source: "description", render: "quoted-attributed",
    absent: "required — the form gates submit on it" },
  { slot: "VERSION_CLAUSE", kind: "composed", source: "processing_version", render: "conditional-clause",
    absent: "clause omitted" },
  { slot: "LAUNCH_CLAUSE", kind: "composed", source: "estimated_launch_date", render: "conditional-clause",
    absent: "clause omitted" },

  // I. The Processing
  { slot: "purpose", kind: "intake", source: "purpose", render: "quoted-attributed",
    absent: "required — the form gates submit on it" },
  { slot: "dataSubjects", kind: "intake", source: "data_subjects", render: "verbatim",
    absent: "required — the form gates submit on it" },
  { slot: "dataCategories", kind: "intake", source: "data_categories", render: "list-as-prose",
    absent: "required — the form gates submit on it" },
  { slot: "volume", kind: "intake", source: "volume_frequency", render: "verbatim",
    absent: "required — the form gates submit on it" },
  { slot: "dataFlow", kind: "intake", source: "functional_description", render: "quoted-attributed",
    absent: "the sentence is dropped; the data flow is recorded as open, never invented" },

  // II. Lawfulness, Necessity and Proportionality
  { slot: "LEGAL_BASIS_PHRASE", kind: "intake", source: "legal_basis_proposed", render: "label-map",
    absent: "the sentence is dropped" },
  { slot: "ARTICLE_9_SENTENCE", kind: "composed", source: "article_9_condition", render: "conditional-sentence",
    absent: "omitted — no special categories on the company's answers" },
  { slot: "necessityProportionality", kind: "intake", source: "necessity_proportionality", render: "quoted-attributed",
    absent: "required — the form gates submit on it" },
  { slot: "dataMinimisationJustification", kind: "intake", source: "data_minimisation_justification",
    render: "quoted-attributed", absent: "the sentence is dropped, never padded" },
  { slot: "QUALITY_CLAUSE", kind: "composed", source: "data_quality_measures", render: "conditional-clause",
    absent: "clause omitted" },

  // III. Risks and Measures (inside the composed [GENERATED] block)
  { slot: "safeguards", kind: "intake", source: "existing_safeguards", render: "list-as-prose",
    absent: "the sentence is dropped; the composer states no safeguards were recorded" },

  // IV. Consultation and Sign-off
  { slot: "dpiaPreparedBy", kind: "intake", source: "dpia_prepared_by", render: "verbatim",
    absent: "the clause is dropped; the honest sentence that no preparer was recorded is composed instead" },
  { slot: "dpiaTeam", kind: "intake", source: "dpia_team", render: "quoted-attributed",
    absent: "the clause is dropped" },
  { slot: "DPO_ADVICE_SENTENCE", kind: "composed", source: "dpo_info / dpo_advice",
    render: "conditional-sentence",
    absent: "the honest sentence that DPO advice has not yet been obtained" },
  { slot: "controllerContact", kind: "intake", source: "controller_contact", render: "verbatim",
    absent: "the sentence is dropped, never padded" },
  { slot: "dpiaApprovedByName", kind: "intake", source: "dpia_approved_by_name", render: "verbatim",
    absent: "the composer states that no approver has been recorded" },
  { slot: "dpiaScopeNote", kind: "intake", source: "dpia_scope_note", render: "quoted-attributed",
    absent: "omitted from the composed block" },
  { slot: "endDate", kind: "intake", source: "estimated_end_date", render: "verbatim",
    absent: "omitted from the composed block" },
];

/** Reader labels for the recorded Article 6 basis, woven into the fixed sentence. */
export const DPIA_LEGAL_BASIS_PHRASE_MAP: Record<string, string> = {
  "Consent (Art. 6(1)(a))": "consent under Article 6(1)(a)",
  "Contract (Art. 6(1)(b))": "the performance of a contract under Article 6(1)(b)",
  "Legal obligation (Art. 6(1)(c))": "compliance with a legal obligation under Article 6(1)(c)",
  "Vital interests (Art. 6(1)(d))": "vital interests under Article 6(1)(d)",
  "Public task (Art. 6(1)(e))": "a task carried out in the public interest under Article 6(1)(e)",
  "Legitimate interest (Art. 6(1)(f))": "legitimate interests under Article 6(1)(f)",
};
