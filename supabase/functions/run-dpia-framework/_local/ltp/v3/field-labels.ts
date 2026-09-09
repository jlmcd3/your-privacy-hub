// DOC 230 §2 / DOC 232 — THE DPIA V3 FREE-TEXT SURFACE. The free-text fields
// the two-leg hook-selection pass reads, keyed by `field_id` (a flat DPIA
// intake path — unlike LIA's nested `purpose_details.*` shape, DPIA's intake
// object is flat: `description`, `purpose`, `necessity_proportionality`, …,
// confirmed against `src/pages/DPIAFramework.tsx` and `dpiaFreeText()`
// (`_shared/ltp/dpia-skeleton-assemble.ts`) per doc 227 §2(a)).
//
// Mirrors LIA's `run-li-assessment/_local/ltp/v3/field-labels.ts` structure
// (this file has no imports; pure data + accessors). `bears_on` names the
// DPIA hook element this field's answer is read for — "obligation" (Art.
// 35(3) trigger hooks) or "adequacy" (content-of-DPIA hooks) — dpia-hook-join
// .ts's `DPIA_SELECTION_FIELDS_BY_ELEMENT` is DERIVED from this column so the
// two never drift.
//
// FIELD SET: doc 230 §2's five primary fields (description, purpose,
// necessity_proportionality, data_subjects, volume_frequency) plus six of
// its seven secondary fields (imagery_capture_detail, dp_by_design_measures,
// secondary_uses, data_minimisation_justification, residual_risks,
// alternatives_considered[].rejection_reason — a repeated-array field,
// handled specially below) PLUS `nature_scope_context`, which doc 230 §2
// omits but doc 227 §2(a) — the later, DB-verified field inventory —
// identifies as DPIA's SINGLE highest-value hook target ("the direct bridge
// into buildDpiaEngagementMap()'s already-built, already-tested … rule
// engagement") and confirms is already wired into `dpiaFreeText()`. Included
// here as a deliberate addition beyond doc 230 §2's literal table; logged in
// doc 232.
//
// `functional_description` (doc 230 §2: "where provided, richer technical
// facts than `description`; AI should prefer it") is included but NOT
// preferred over `description` at the planner level — doc 224's `select_hooks`
// contract sends one item PER FIELD with usable text (§ below), so both
// simply appear as separate items when both are answered; there is no
// "prefer" step to implement (the two-leg pass reads each field's own
// candidates independently, exactly as `classify-propositions` already
// accepts — no compiled "fact context" string, per doc 230's own §2 caveat
// and the build brief's correction of it).

type Bag = Record<string, unknown>;

export interface DpiaV3Field {
  /** The field id — a flat DPIA intake path, or a synthetic id
   *  (`alternatives_considered.rejection_reasons`) for a repeated field with
   *  no single scalar path. */
  readonly field_id: string;
  /** The question as displayed on the intake form (doc 227 §2(a) question
   *  text where confirmed; drafted in the same register otherwise). */
  readonly label: string;
  /** The DPIA hook element this field is read for. */
  readonly bears_on: "obligation" | "adequacy";
}

export const DPIA_V3_FIELDS: readonly DpiaV3Field[] = [
  {
    field_id: "description",
    label: "What happens to the data, step by step?",
    bears_on: "obligation",
  },
  {
    field_id: "purpose",
    label: "Why are you doing this?",
    bears_on: "obligation",
  },
  {
    field_id: "data_subjects",
    label: "Who is affected by this processing?",
    bears_on: "obligation",
  },
  {
    field_id: "volume_frequency",
    label: "What is the scale and frequency of this processing?",
    bears_on: "obligation",
  },
  {
    field_id: "nature_scope_context",
    label: "What is the wider context of this processing?",
    bears_on: "obligation",
  },
  {
    field_id: "functional_description",
    label: "How does the processing work from end to end?",
    bears_on: "obligation",
  },
  {
    field_id: "secondary_uses",
    label: "Do you use the data for anything beyond the main purpose?",
    bears_on: "obligation",
  },
  {
    field_id: "imagery_capture_detail",
    label: "Anything the reader should know about the imagery?",
    bears_on: "obligation",
  },
  {
    field_id: "necessity_proportionality",
    label: "Why is this processing necessary, and what else did you consider?",
    bears_on: "adequacy",
  },
  {
    field_id: "data_minimisation_justification",
    label: "Why is each kind of data you collect needed?",
    bears_on: "adequacy",
  },
  {
    field_id: "residual_risks",
    label: "What risk is left after your safeguards?",
    bears_on: "adequacy",
  },
  {
    field_id: "dp_by_design_measures",
    label: "What protections are built into the design?",
    bears_on: "adequacy",
  },
  {
    // doc 230 §2 — "alternatives_considered[].rejection_reason (narrative,
    // in structured array)": a repeated field has no single scalar path, so
    // it gets a synthetic field id and its own resolver (dpiaV3Answer below
    // joins every populated `rejection_reason` with "\n").
    field_id: "alternatives_considered.rejection_reasons",
    label: "What alternatives did you consider, and why were they rejected?",
    bears_on: "adequacy",
  },
];

export const DPIA_V3_FIELD_IDS: readonly string[] = DPIA_V3_FIELDS.map((f) => f.field_id);

export function dpiaV3Field(id: string): DpiaV3Field | undefined {
  return DPIA_V3_FIELDS.find((f) => f.field_id === id);
}

/** The displayed question, or the id itself when the id is not one of the
 *  registered fields. */
export function dpiaV3FieldLabel(id: string): string {
  return dpiaV3Field(id)?.label ?? id;
}

function bag(v: unknown): Bag {
  return v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {};
}

/** The answer text for `id` on a DPIA intake record. Every field except the
 *  synthetic array field is a flat top-level path; a string as recorded, an
 *  array joined with "\n", "" for anything else. Never throws. */
export function dpiaV3Answer(record: Bag, id: string): string {
  if (id === "alternatives_considered.rejection_reasons") {
    const arr = Array.isArray(record?.alternatives_considered) ? record.alternatives_considered : [];
    const reasons = arr
      .map((a) => bag(a).rejection_reason)
      .filter((r): r is string => typeof r === "string" && r.trim().length > 0);
    return reasons.join("\n");
  }
  const v = bag(record)[id];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).join("\n");
  return "";
}
