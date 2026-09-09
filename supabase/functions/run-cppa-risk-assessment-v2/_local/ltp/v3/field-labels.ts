// DOC 229 §1 / DOC 231 — THE FREE-TEXT SURFACE for CPPA Risk V3 hook
// selection. Adapted from run-li-assessment/_local/ltp/v3/field-labels.ts
// (LIA's fifteen-field inventory) to the CPPA Risk intake contract
// (supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts).
//
// SCOPE NARROWING FROM DOC 229 §1 (documented, not silent): doc 229 §1.2
// lists several REPEATER fields (`a5_harm_pathways[].cause/actor/source`,
// `a6_safeguards[].safeguard/residual`, `a2_necessity_set[].justification`)
// as hook-selection candidates. LIA's selection-item model
// (hook-selection.ts `SelectionItem`) is one answer per `field_id` — it has
// no per-row addressing. Extending it correctly for a repeating array (which
// `field_id` denotes which row; how a stored decision survives a row being
// reordered or deleted) is a real design question the doc 224/224A
// specs never had to answer for LIA (LIA has no repeater free-text field).
// Rather than guess at that design under this build's time budget, this
// FIRST wave is SCALAR fields only (doc 229 §1.1 + the non-repeater rows of
// §1.2) — every field below resolves to exactly one string on the intake
// record. Repeater-field selection is `[NEEDS: a per-row SelectionItem
// addressing scheme]` — see doc 231-CPPA-RISK-V3-BUILD-LOG §"scope
// narrowing".
//
// Labels are the question text doc 227 §3(a) recorded from
// src/pages/CPPARiskAssessment.tsx / the intake contract's own field
// descriptions where the source text is available at build time; a field
// with no independently-verified label text uses the field's own
// programmatic description. `answer_path` is the intake_data dot path
// (identical to `field_id` for every field below — CPPA Risk's contract
// does not have LIA's split field-id/storage-path shape for this wave).

type Bag = Record<string, unknown>;

export interface RiskV3Field {
  /** The contract's intake_data key — also the stored `field_id`. */
  readonly field_id: string;
  /** The question as displayed / the contract's own description. */
  readonly label: string;
  /** Dot path of the answer on the intake record (== field_id here). */
  readonly answer_path: string;
  /** The CAM `factor_id` (risk-corpus-map.ts) this field's answer bears on. */
  readonly bears_on_factor: string;
}

export const RISK_V3_FIELDS: readonly RiskV3Field[] = [
  {
    field_id: "primary_activity_purpose",
    label: "In one sentence, what does this activity do with personal information?",
    answer_path: "primary_activity_purpose",
    bears_on_factor: "Processing purpose specificity",
  },
  {
    field_id: "i1_processing_purpose",
    label: "Describe the processing purpose for this activity.",
    answer_path: "i1_processing_purpose",
    bears_on_factor: "Processing purpose specificity",
  },
  {
    field_id: "i1b_min_pi",
    label: "Explain how the personal information collected is minimized to what is necessary for the purpose.",
    answer_path: "i1b_min_pi",
    bears_on_factor: "Safeguards",
  },
  {
    field_id: "i2_retention_period",
    label: "How long is this personal information retained, and on what basis?",
    answer_path: "i2_retention_period",
    bears_on_factor: "Retention",
  },
  {
    field_id: "i4b_sources",
    label: "Where does the personal information for this activity come from?",
    answer_path: "i4b_sources",
    bears_on_factor: "Processing methods and coherence",
  },
  {
    field_id: "i6_vendors",
    label: "Which vendors or service providers are involved, and in what role?",
    answer_path: "i6_vendors",
    bears_on_factor: "Stakeholder involvement and information providers",
  },
  {
    field_id: "i7_internal_contributors",
    label: "Who inside the company participated in preparing this assessment?",
    answer_path: "i7_internal_contributors",
    bears_on_factor: "Stakeholder involvement and information providers",
  },
  {
    field_id: "a4_benefit_business",
    label: "Specific outcome for the business.",
    answer_path: "a4_benefit_business",
    bears_on_factor: "Consumer benefit",
  },
  {
    field_id: "a4_benefit_consumer",
    label: "Specific outcome for the consumer.",
    answer_path: "a4_benefit_consumer",
    bears_on_factor: "Consumer benefit",
  },
  {
    field_id: "a4_benefit_other_stakeholders",
    label: "Outcome for other stakeholders.",
    answer_path: "a4_benefit_other_stakeholders",
    bears_on_factor: "Consumer benefit",
  },
  {
    field_id: "a4_benefit_public",
    label: "Outcome for the public.",
    answer_path: "a4_benefit_public",
    bears_on_factor: "Consumer benefit",
  },
  {
    field_id: "a8_information_providers",
    label: "Who provided the information in this assessment?",
    answer_path: "a8_information_providers",
    bears_on_factor: "Stakeholder involvement and information providers",
  },
  {
    field_id: "material_change_description",
    label: "Describe the nature of the material change since the prior assessment.",
    answer_path: "material_change_description",
    bears_on_factor: "Assessment timing and material changes",
  },
];

export const RISK_V3_FIELD_IDS: readonly string[] = RISK_V3_FIELDS.map((f) => f.field_id);

/** DOC 224A §3 — the common field read for EVERY hook regardless of factor
 *  (LIA's analog is `processing_description`): the shortest, always-required
 *  statement of what the activity does. */
export const RISK_SELECTION_COMMON_FIELD = "primary_activity_purpose";

/** factor_id (risk-corpus-map.ts) -> the free-text fields whose answers the
 *  legs read for a hook bearing on that factor, IN ADDITION to the common
 *  field. Only factors with a scalar free-text field in this wave are
 *  listed; a hook on an unlisted factor is still nominated and rendered
 *  from atoms alone — it is simply never a candidate for the two-leg pass
 *  (no narrative field to disambiguate an `unknown` agreement), which is a
 *  safe degrade, not a defect (doc 224A §8 D4's "no call on an unanswered
 *  field" logic, generalised to "no call where there is nothing to read"). */
export const RISK_SELECTION_FIELDS_BY_FACTOR: Readonly<Record<string, readonly string[]>> = {
  "Processing purpose specificity": ["i1_processing_purpose"],
  "Safeguards": ["i1b_min_pi"],
  "Retention": ["i2_retention_period"],
  "Processing methods and coherence": ["i4b_sources"],
  "Stakeholder involvement and information providers": ["i6_vendors", "i7_internal_contributors", "a8_information_providers"],
  "Consumer benefit": ["a4_benefit_business", "a4_benefit_consumer", "a4_benefit_other_stakeholders", "a4_benefit_public"],
  "Assessment timing and material changes": ["material_change_description"],
};

export function riskV3Field(id: string): RiskV3Field | undefined {
  return RISK_V3_FIELDS.find((f) => f.field_id === id) ?? RISK_V3_FIELDS.find((f) => f.answer_path === id);
}

export function riskV3FieldLabel(id: string): string {
  return riskV3Field(id)?.label ?? id;
}

function get(root: Bag, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Bag)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** The answer text at the field's `answer_path`; a string as recorded, an
 *  array joined with "\n", "" for anything else. Never throws. */
export function riskV3Answer(record: Bag, id: string): string {
  const field = riskV3Field(id);
  const candidates = field ? [field.answer_path, field.field_id] : [id];
  for (const path of candidates) {
    const v = get(record ?? {}, path);
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).join("\n");
  }
  return "";
}
