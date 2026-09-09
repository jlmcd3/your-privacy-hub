// DOC 235 §1 — THE FREE-TEXT SURFACE. The genuinely-free-text ADMT intake
// fields a two-leg hook-selection pass would read, keyed by `field_id`
// (the value a `hook_selections.field_id` row would carry), each with the
// question AS DISPLAYED on the intake form and the path the answer actually
// lives at on the intake record.
//
// SOURCE: doc 227 §1(a) (2026-09-08), itself derived from
// src/pages/admt/ADMTChecker.tsx's intake object (lines 522-570) and
// confirmed against src/lib/sampleFixtures.ts. Every `question_text` below
// is copied verbatim from doc 227's own table, which the orchestrator
// sourced from the live form. `wired_today` restates doc 227's own finding
// — only `system_description` and `notice_purpose_text` feed ANY existing
// corpus-facing free-text reader today (`admtFreeText()`,
// admt-v2-assemble.ts:426-432); the other 14 are collected by the form and
// stored on the intake record but read by nothing until this build.
//
// Deliberately excluded (doc 227's own list, "shorter list-style free-text
// fields... genuinely free text but shorter and less fact-pattern-rich"):
// admt_detail.bias_proxy_vars, admt_detail.other_factors,
// admt_detail.decision_domains_other, admt_detail.vendor_training_rights.
// A future curation pass may add these; this build's first wave matches
// doc 227's own "best hook targets" assessment (notice-adequacy and
// disclosure-adequacy fields) plus the two already-wired fields.
//
// Pure data; no imports.

type Bag = Record<string, unknown>;

export interface AdmtV3Field {
  /** The `hook_selections.field_id` value. */
  readonly field_id: string;
  /** The question as displayed on the intake form. */
  readonly label: string;
  /** Dot path of the answer on the intake record (`admt_runs.intake_data`). */
  readonly answer_path: string;
  /** Whether admtFreeText() (admt-v2-assemble.ts) already reads this field
   *  into the existing advisory-corpus-matches surface — informational only,
   *  not read by any code in this file. */
  readonly wired_today: boolean;
  /** The CAM factor_id(s) (bears_on_element) this field's answer is most
   *  likely to bear on — doc 235's own first-pass reading, not ratified. */
  readonly bears_on: readonly string[];
}

export const ADMT_V3_FIELDS: readonly AdmtV3Field[] = [
  {
    field_id: "system_description",
    label: "What does this system decide, and how?",
    answer_path: "system_description",
    wired_today: true,
    bears_on: ["Significant decision", "Human involvement", "Advertising exclusion"],
  },
  {
    field_id: "notice_purpose_text",
    label: "Paste your specific purpose statement as it appears in the notice",
    answer_path: "notice_purpose_text",
    wired_today: true,
    bears_on: ["Notice content"],
  },
  {
    field_id: "notice_full_text",
    label: "Paste your published Pre-use Notice in full",
    answer_path: "notice_full_text",
    wired_today: false,
    bears_on: ["Notice delivery", "Notice content"],
  },
  {
    field_id: "notice_element_text.purpose",
    label: "What you use the system for (as published in the notice)",
    answer_path: "notice_element_text.purpose",
    wired_today: false,
    bears_on: ["Notice content"],
  },
  {
    field_id: "notice_element_text.optout",
    label: "The right to opt out, and how to ask (as published in the notice)",
    answer_path: "notice_element_text.optout",
    wired_today: false,
    bears_on: ["Notice content", "Opt-out pathway"],
  },
  {
    field_id: "notice_element_text.access",
    label: "The right to ask what the system did, and how to ask (as published)",
    answer_path: "notice_element_text.access",
    wired_today: false,
    bears_on: ["Notice content", "Access process"],
  },
  {
    field_id: "notice_element_text.howworks_inputs",
    label: "What information goes into the system (as published)",
    answer_path: "notice_element_text.howworks_inputs",
    wired_today: false,
    bears_on: ["Notice content"],
  },
  {
    field_id: "notice_element_text.howworks_output",
    label: "What the system produces, and how you use it (as published)",
    answer_path: "notice_element_text.howworks_output",
    wired_today: false,
    bears_on: ["Notice content"],
  },
  {
    field_id: "notice_element_text.altprocess",
    label: "What happens instead for someone who opts out (as published)",
    answer_path: "notice_element_text.altprocess",
    wired_today: false,
    bears_on: ["Notice content", "Opt-out pathway"],
  },
  {
    field_id: "admt_detail.bias_outcome_summary",
    label: "Outcome distribution / false-positive & false-negative rates by group",
    answer_path: "admt_detail.bias_outcome_summary",
    wired_today: false,
    bears_on: ["Opt-out pathway"],
  },
  {
    field_id: "opt_out_fairness_doc",
    label: "Describe your fairness and non-discrimination testing",
    answer_path: "opt_out_fairness_doc",
    wired_today: false,
    bears_on: ["Opt-out pathway"],
  },
  {
    field_id: "opt_out_15_day_process",
    label: "Operational opt-out process: how do you action an opt-out request within 15 business days?",
    answer_path: "opt_out_15_day_process",
    wired_today: false,
    bears_on: ["Opt-out pathway"],
  },
  {
    field_id: "access_logic_disclosure",
    label: "What do you tell someone about how the system reached its result?",
    answer_path: "access_logic_disclosure",
    wired_today: false,
    bears_on: ["Access process"],
  },
  {
    field_id: "access_outcome_disclosure",
    label: "What do you tell someone about the decision itself?",
    answer_path: "access_outcome_disclosure",
    wired_today: false,
    bears_on: ["Access process"],
  },
  {
    field_id: "access_trade_secret_policy",
    label: "Trade secret and security information policy (what you'd withhold, and the ground)",
    answer_path: "access_trade_secret_policy",
    wired_today: false,
    bears_on: ["Access process"],
  },
  {
    field_id: "admt_detail.access_denial_basis",
    label: "If you would partially or fully deny an access request, on what basis?",
    answer_path: "admt_detail.access_denial_basis",
    wired_today: false,
    bears_on: ["Access process"],
  },
];

export const ADMT_V3_FIELD_IDS: readonly string[] = ADMT_V3_FIELDS.map((f) => f.field_id);

/** DOC 235 — the field every hook's selection call also reads, regardless
 *  of its own factor (the background fact pattern), mirroring LIA's
 *  `LIA_SELECTION_COMMON_FIELD` ("processing_description"). ADMT has no
 *  vendor-dependency-specific free-text candidate in this first wave (doc
 *  227 names none) — a hook bearing on "Vendor dependency" reads only this
 *  common field. */
export const ADMT_SELECTION_COMMON_FIELD = "system_description";

/** DOC 235 — the fields a hook's two-leg selection call reads, by
 *  `bears_on_element` (the CAM factor_id), beyond the common field above.
 *  Mirrors `LIA_SELECTION_FIELDS_BY_ELEMENT` (hook-join.ts). Derived by
 *  inverting each field's own `bears_on` list above. */
export const ADMT_SELECTION_FIELDS_BY_ELEMENT: Readonly<Record<string, readonly string[]>> = (() => {
  const out: Record<string, string[]> = {};
  for (const f of ADMT_V3_FIELDS) {
    if (f.field_id === ADMT_SELECTION_COMMON_FIELD) continue;
    for (const factor of f.bears_on) {
      (out[factor] ??= []).push(f.field_id);
    }
  }
  return out;
})();

/** Resolve a field by its `field_id`, or by the intake path it is stored at. */
export function admtV3Field(id: string): AdmtV3Field | undefined {
  return ADMT_V3_FIELDS.find((f) => f.field_id === id) ?? ADMT_V3_FIELDS.find((f) => f.answer_path === id);
}

/** The displayed question, or the id itself when the id is not one of these. */
export function admtV3FieldLabel(id: string): string {
  return admtV3Field(id)?.label ?? id;
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
 *  a path); a string as recorded, an array joined with "\n", "" for
 *  anything else. Never throws. Mirrors `liaV3Answer`. */
export function admtV3Answer(record: Bag, id: string): string {
  const field = admtV3Field(id);
  const candidates = field ? [field.answer_path, field.field_id] : [id];
  for (const path of candidates) {
    const v = get(record ?? {}, path);
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).join("\n");
  }
  return "";
}
