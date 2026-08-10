// ITEM SO-1 — CPPA RISK SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned v3 skeleton, bound to
// a LIVE source: either an intake key on the live contract
// (`_shared/intake-contracts/cppa-risk-assessment.ts`, snake_case as persisted)
// or a leaf of a typed surface on the LIVE persisted report shape (items
// 420–427). A slot without a live source is a STOP condition — there are none.
//
// `render` is the rendering rule; `absent` is the absent-branch the skeleton
// itself dictates. Both directions are asserted by
// `tests/edge/so1/slot-map.test.ts`: every skeleton slot resolves, and every
// typed surface the skeleton consumes is consumed.

export type SlotSourceKind = "intake" | "typed-surface" | "composed";

export type SlotRender =
  | "label-map"        // stored option value → reader label, woven into prose
  | "adverbial"        // rendered as its own clause inside the fixed sentence
  | "quoted-attributed" // the company's words, attributed to the company
  | "band-as-prose"    // band label rendered as prose, never as a raw band
  | "list-as-prose"    // array rendered as an English list
  | "noun-phrase"
  | "verbatim"
  | "records";         // typed records through their canonical formatter

export interface SlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: SlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: SlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const RISK_SLOT_MAP: readonly SlotBinding[] = [
  { slot: "entityName", kind: "intake", source: "entity_name",
    render: "verbatim", absent: "required — the document may not issue without it" },

  // I. The Activity Under Assessment
  { slot: "primaryActivityName", kind: "intake", source: "primary_activity_name",
    render: "noun-phrase", absent: "required" },
  { slot: "primaryActivityPurpose", kind: "intake", source: "primary_activity_purpose",
    render: "adverbial", absent: "required" },
  { slot: "hasSecondaryUses", kind: "intake", source: "has_secondary_uses",
    render: "label-map",
    absent: "trigger only — anything other than the affirmative option omits the SECONDARY USES conditional" },

  // III. The Personal Information Involved
  { slot: "i1bMinPi", kind: "intake", source: "i1b_min_pi",
    render: "label-map", absent: "required" },
  { slot: "i4bSources", kind: "intake", source: "i4b_sources",
    render: "list-as-prose", absent: "required" },
  { slot: "i4Disclosures", kind: "intake", source: "i4_disclosure_mechanisms",
    render: "list-as-prose", absent: "required" },
  { slot: "i3CaConsumerBand", kind: "intake", source: "i3_ca_consumer_band",
    render: "band-as-prose", absent: "required" },
  { slot: "RETENTION_CLAUSE", kind: "composed",
    source: "i2_retention_period | i2_retention_criteria",
    render: "adverbial",
    absent: "fixed period where given, otherwise the criteria clause; both absent is a record-sufficiency element, not prose invention" },
  { slot: "RETENTION_DETAIL_SENTENCE", kind: "intake", source: "i2_retention_detail",
    render: "quoted-attributed", absent: "omitted" },

  // V. Impacts and safeguards — ADMT conditional
  { slot: "q18", kind: "intake", source: "q18_admt_use",
    render: "label-map", absent: "trigger only — non-affirmative omits the ADMT conditional" },
  { slot: "i5AdmtLogic", kind: "intake", source: "i5_admt_logic",
    render: "quoted-attributed", absent: "named as an unanswered element, never assumed" },
  { slot: "i5AdmtHumanReview", kind: "intake", source: "i5_admt_human_review",
    render: "quoted-attributed", absent: "named as an unanswered element" },
  { slot: "i5AdmtFairnessTesting", kind: "intake", source: "i5_admt_fairness_testing",
    render: "quoted-attributed", absent: "named as an unanswered element" },
  { slot: "i5AdmtTrainingSource", kind: "intake", source: "i5_admt_training_source",
    render: "quoted-attributed", absent: "named as an unanswered element" },

  // VI. Benefits and the weighing
  { slot: "a4BenefitBusiness", kind: "intake", source: "a4_benefit_business",
    render: "quoted-attributed", absent: "required" },
  { slot: "a4BenefitBusinessFact", kind: "intake", source: "a4_benefit_business_fact",
    render: "quoted-attributed", absent: "the honest unsupported form — never a supplied fact" },
  { slot: "a4BenefitConsumer", kind: "intake", source: "a4_benefit_consumer",
    render: "quoted-attributed", absent: "required" },
  { slot: "a4BenefitConsumerFact", kind: "intake", source: "a4_benefit_consumer_fact",
    render: "quoted-attributed", absent: "the honest unsupported form" },
  { slot: "OTHER_STAKEHOLDER_SENTENCE", kind: "composed",
    source: "a4_benefit_other_stakeholders + a4_benefit_other_stakeholders_fact",
    render: "quoted-attributed", absent: "the honest absence sentence" },
  { slot: "PUBLIC_SENTENCE", kind: "composed",
    source: "a4_benefit_public + a4_benefit_public_fact",
    render: "quoted-attributed", absent: "the honest absence sentence" },

  // VIII. Accountability and Certification
  { slot: "i7InternalContributors", kind: "intake", source: "i7_internal_contributors",
    render: "list-as-prose", absent: "required" },
  { slot: "EXTERNAL_CLAUSE", kind: "intake", source: "i7_external_consultees",
    render: "list-as-prose", absent: "omitted" },
  { slot: "PROVIDERS_SENTENCE", kind: "intake", source: "a8_information_providers",
    render: "quoted-attributed", absent: "omitted" },
  { slot: "i8ExecName", kind: "intake", source: "i8_certifying_exec_name",
    render: "verbatim", absent: "required" },
  { slot: "i8ExecTitle", kind: "intake", source: "i8_certifying_exec_title",
    render: "verbatim", absent: "required" },
  { slot: "APPROVAL_SENTENCE", kind: "composed",
    source: "a9_approver_name + a9_approver_position + a9_approval_date",
    render: "quoted-attributed", absent: "omitted" },
  { slot: "i9HasDpia", kind: "intake", source: "i9_has_existing_dpia",
    render: "label-map", absent: "trigger only — non-affirmative omits the cross-reference" },
  { slot: "i9DpiaSummary", kind: "intake", source: "i9_existing_dpia_summary",
    render: "quoted-attributed", absent: "the conditional is omitted" },
];

/**
 * The typed surfaces the skeleton's [GENERATED] blocks consume, per item
 * 420–427. Named here so the slot-map test can assert the reverse direction:
 * every surface listed is consumed by at least one section of the skeleton.
 */
export const RISK_TYPED_SURFACES: readonly { surface: string; section_id: string }[] = [
  { surface: "risk_assessment_by_activity", section_id: "impacts_safeguards" },
  { surface: "record_sufficiency", section_id: "executive_summary" },
  { surface: "exception_analysis", section_id: "benefits_weighing" },
  { surface: "priority_actions", section_id: "recommended_actions" },
];
