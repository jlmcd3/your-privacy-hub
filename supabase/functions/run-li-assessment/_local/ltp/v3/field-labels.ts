// DOC 217 §1 — THE FREE-TEXT SURFACE. The fifteen free-text fields the V3
// pipeline gates and reads, keyed by the doc 217 §1 `field_id` (the value
// `intake_readings.field_id` / `intake_gate_results.field_id` carry), each
// with the question AS DISPLAYED on the intake form (the label the Schedule
// of Readings prints — doc 217 §5.4 "field label") and the path the answer
// actually lives at on the intake record.
//
// Two field ids in doc 217 §1 name a path the form does not store the
// answer under (`purpose_details.stated_purpose` is the top-level
// `stated_purpose`; `purpose_details.statutory_restrictions` is stored under
// `balancing_details`), and two name a detail textarea by its governing
// question (`balancing_details.potential_harms` is the `potential_harm_
// detail` textarea; the N6 follow-up sits under the N6 question) —
// `answer_path` records where the answer really is, so the assembler's
// Law-L8 substring check (evidence span ⊂ answer) reads the right string.
// `liaV3Field` resolves an id by EITHER key, so a reading keyed on the true
// path also resolves.
//
// Labels are byte-copies of the `<Label>` text in src/pages/LIAssessmentIntake.tsx
// (and src/pages/LIAssessment.tsx for the Step-1 description) — a test pins
// each one as a substring of that source. Pure data; no imports.

type Bag = Record<string, unknown>;

export interface LiaV3Field {
  /** doc 217 §1 field id — the contract value on the DB rows. */
  readonly field_id: string;
  /** The question as displayed (the Schedule's "field label"). */
  readonly label: string;
  /** Dot path of the answer on the intake record. */
  readonly answer_path: string;
  /** doc 217 §1 "Bears on" column. */
  readonly bears_on: string;
}

export const LIA_V3_FIELDS: readonly LiaV3Field[] = [
  {
    field_id: "processing_description",
    label: "What processing are you considering?",
    answer_path: "processing_description",
    bears_on: "all limbs (context)",
  },
  {
    field_id: "purpose_details.interest_statement",
    label: "In your own words, what is the legitimate interest you're relying on?",
    answer_path: "purpose_details.interest_statement",
    bears_on: "purpose",
  },
  {
    field_id: "purpose_details.stated_purpose",
    label: "How would you state this purpose to data subjects in a privacy notice?",
    answer_path: "stated_purpose",
    bears_on: "purpose; Art. 13(1)(c) consistency",
  },
  {
    field_id: "purpose_details.specific_benefit",
    label: "What specific benefit does this processing deliver?",
    answer_path: "purpose_details.specific_benefit",
    bears_on: "purpose",
  },
  {
    field_id: "purpose_details.statutory_restrictions",
    label: "Are there sector or jurisdiction-specific restrictions?",
    answer_path: "balancing_details.statutory_restrictions",
    bears_on: "purpose (lawfulness)",
  },
  {
    field_id: "necessity_details.alternatives",
    label: "What alternatives have you considered?",
    answer_path: "necessity_details.alternatives",
    bears_on: "necessity",
  },
  {
    field_id: "necessity_details.alternatives_rationale",
    label: "For each alternative, why would it not achieve the purpose?",
    answer_path: "necessity_details.alternatives_rationale",
    bears_on: "necessity",
  },
  {
    field_id: "necessity_details.achievable_without_personal_data_rationale",
    label: "Could this purpose be achieved without personal data, or with anonymised or synthetic data?",
    answer_path: "necessity_details.achievable_without_personal_data_rationale",
    bears_on: "necessity",
  },
  {
    field_id: "necessity_details.why_consent_not_used",
    label: "Why isn't consent appropriate here?",
    answer_path: "necessity_details.why_consent_not_used",
    bears_on: "necessity + balancing flag + condition",
  },
  {
    field_id: "necessity_details.data_minimised",
    label: "How have you minimised the data used?",
    answer_path: "necessity_details.data_minimised",
    bears_on: "necessity (Art. 5(1)(c))",
  },
  {
    field_id: "balancing_details.reasonable_expectation_detail",
    label: "Would data subjects reasonably expect this processing?",
    answer_path: "balancing_details.reasonable_expectation_detail",
    bears_on: "balancing — expectations",
  },
  {
    field_id: "balancing_details.collection_context",
    label: "When and in what setting was this data collected?",
    answer_path: "balancing_details.collection_context",
    bears_on: "balancing — expectations",
  },
  {
    field_id: "balancing_details.potential_harms",
    label: "If something went wrong, what's the worst-case impact on data subjects?",
    answer_path: "balancing_details.potential_harm_detail",
    bears_on: "balancing — harms",
  },
  {
    field_id: "balancing_details.additional_mitigations",
    label: "What measures have you added specifically to reduce the impact on individuals?",
    answer_path: "balancing_details.additional_mitigations",
    bears_on: "balancing — safeguards",
  },
  {
    field_id: "balancing_details.additional_context",
    label: "Anything else about this processing we should weigh?",
    answer_path: "balancing_details.additional_context",
    bears_on: "balancing (open)",
  },
];

export const LIA_V3_FIELD_IDS: readonly string[] = LIA_V3_FIELDS.map((f) => f.field_id);

/** Resolve a field by its doc 217 §1 id, or by the intake path it is stored at. */
export function liaV3Field(id: string): LiaV3Field | undefined {
  return LIA_V3_FIELDS.find((f) => f.field_id === id) ?? LIA_V3_FIELDS.find((f) => f.answer_path === id);
}

/** The displayed question, or the id itself when the id is not one of the fifteen. */
export function liaV3FieldLabel(id: string): string {
  return liaV3Field(id)?.label ?? id;
}

/** Document order of the fifteen fields (for a deterministic Schedule);
 *  an unknown id sorts after every known one. */
export function liaV3FieldOrder(id: string): number {
  const f = liaV3Field(id);
  return f ? LIA_V3_FIELDS.indexOf(f) : LIA_V3_FIELDS.length;
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

/** The answer text at the field's `answer_path` (falling back to the id as
 *  a path); a string as recorded, an array joined with "\n" (the form's
 *  one-per-line convention), "" for anything else. Never throws. */
export function liaV3Answer(record: Bag, id: string): string {
  const field = liaV3Field(id);
  const candidates = field ? [field.answer_path, field.field_id] : [id];
  for (const path of candidates) {
    const v = get(record ?? {}, path);
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).join("\n");
  }
  return "";
}
