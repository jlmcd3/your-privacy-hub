// ITEM SO-3 — GOVERNANCE SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned v3 skeleton, bound to
// a LIVE source: either an intake key on the live contract
// (`_shared/intake-contracts/governance-assessment.ts`, snake_case as
// persisted) or a leaf of a typed surface on the LIVE persisted report shape
// (`governance_assessments.report_data`, verified against production rows on
// 2026-08-10). A slot without a live source is a STOP condition — there are
// none.
//
// `render` is the rendering rule; `absent` is the absent-branch the skeleton
// itself dictates. Both directions are asserted by
// `tests/edge/so3/skeleton.test.ts`: every skeleton slot resolves, and every
// typed surface the skeleton consumes is consumed.

export type SlotSourceKind = "intake" | "typed-surface" | "composed";

export type SlotRender =
  | "label-map"
  | "adverbial"
  | "quoted-attributed"
  | "band-as-prose"
  | "list-as-prose"
  | "noun-phrase"
  | "verbatim"
  | "records";

export interface SlotBinding {
  readonly slot: string;
  readonly kind: SlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: SlotRender;
  readonly absent: string;
}

export const GOVERNANCE_SLOT_MAP: readonly SlotBinding[] = [
  { slot: "organizationName", kind: "intake", source: "organization_name",
    render: "verbatim", absent: "required — the document may not issue without it" },

  // I. The Organisation and Its Data
  { slot: "sector", kind: "intake", source: "sector",
    render: "label-map", absent: "required" },
  { slot: "orgSize", kind: "intake", source: "org_size",
    render: "band-as-prose", absent: "required" },
  { slot: "jurisdictions", kind: "intake", source: "jurisdictions",
    render: "list-as-prose", absent: "required" },
  { slot: "EU_UK_SENTENCE", kind: "intake", source: "eu_uk_data",
    render: "label-map", absent: "sentence dropped — never assumed either way" },
  { slot: "dataCategories", kind: "intake", source: "data_categories",
    render: "list-as-prose", absent: "sentence dropped rather than padded" },
  { slot: "SPECIAL_CATEGORY_CLAUSE", kind: "composed",
    source: "special_category + special_categories_list",
    render: "list-as-prose", absent: "omitted" },

  // II. Governance Infrastructure
  { slot: "DPO_PHRASE", kind: "intake", source: "dpo_status",
    render: "label-map", absent: "sentence dropped where the intake did not ask the question" },
  { slot: "PRIVACY_POLICY_PHRASE", kind: "intake", source: "privacy_policy",
    render: "label-map", absent: "sentence dropped" },
  { slot: "privacyNoticeCoverage", kind: "intake", source: "privacy_notice_coverage",
    render: "label-map",
    absent: "where no notice is reported, the honest not-applicable form; never an invented coverage claim" },

  // III. Training, Tools and Controls
  { slot: "TRAINING_PHRASE", kind: "intake", source: "training_status",
    render: "label-map", absent: "sentence dropped" },
  { slot: "TRAINING_AI_CLAUSE", kind: "intake", source: "training_ai_coverage",
    render: "label-map", absent: "omitted" },
  { slot: "tools", kind: "intake", source: "tools",
    render: "list-as-prose", absent: "the honest none-recorded form" },
  { slot: "OTHER_TOOL_CLAUSE", kind: "intake", source: "tools",
    render: "verbatim",
    absent: "omitted — renders only the form's \"Other: <text>\" entry, verbatim" },
  { slot: "TOOL_INSTRUCTION_PHRASE", kind: "intake", source: "tool_instruction",
    render: "label-map", absent: "sentence dropped" },
  { slot: "TECHNICAL_CONTROLS_SENTENCE", kind: "composed",
    source: "technical_controls + technical_controls_list",
    render: "label-map", absent: "the honest sentence naming the unanswered element" },

  // IV. Processors and International Transfers
  { slot: "DPA_STATUS_PHRASE", kind: "intake", source: "dpa_status",
    render: "label-map", absent: "sentence dropped where the intake did not ask the question" },
  { slot: "DPA_VERIFIED_PHRASE", kind: "intake", source: "dpa_art28_verified",
    render: "label-map", absent: "sentence dropped" },
  { slot: "TRANSFER_PHRASE", kind: "intake", source: "transfer_status",
    render: "label-map", absent: "sentence dropped" },
  { slot: "TRANSFER_MECHANISM_CLAUSE", kind: "composed",
    source: "transfer_status + transfer_mechanism",
    render: "label-map",
    absent: "where transfers occur, the honest gap clause naming the unrecorded mechanism; otherwise omitted" },

  // V. The Determination
  { slot: "additionalContext", kind: "intake", source: "additional_context",
    render: "quoted-attributed", absent: "omitted — incorporated only where substantive" },
];

/**
 * The typed surfaces the skeleton's [GENERATED] and [DETERMINATION LEAD]
 * blocks consume, on the live persisted report shape. Named here so the
 * slot-map test can assert the reverse direction: every surface listed is
 * consumed by a section of the skeleton.
 */
export const GOVERNANCE_TYPED_SURFACES: readonly { surface: string; section_id: string }[] = [
  { surface: "readiness_determination", section_id: "executive_summary" },
  { surface: "executive_summary", section_id: "executive_summary" },
  { surface: "accountability_determination", section_id: "governance_infrastructure" },
  { surface: "dpo_determination", section_id: "governance_infrastructure" },
  { surface: "domain_findings", section_id: "training_tools_controls" },
  { surface: "transfer_analysis", section_id: "processors_and_transfers" },
  { surface: "remediation_plan", section_id: "the_determination" },
  { surface: "authority_exhibit", section_id: "table_of_authorities" },
];
