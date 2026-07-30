/**
 * ITEM 265 — GO-TO-MARKET MATERIALITY REGISTER (v1 DRAFT).
 *
 * ACTIVE IN OBSERVE/TELEMETRY ONLY — register assignments require CEO
 * ratification before gating any release decision.
 *
 * The frozen C/G quality instruments and the 7 deterministic checks are
 * NOT touched by this module. The register is a pure, versioned lookup
 * that classifies EXISTING harness telemetry defect classes as material
 * (blocks release) or non-material (ship + log).
 *
 * Design record: docs/courier/ITEM265-GTM-GRADER-2026-07-30.md
 */

export const GTM_MATERIALITY_REGISTER_VERSION =
  "gtm-materiality-v1-2026-07-30-DRAFT";

export type Materiality = "material" | "non_material";
export type DefectSource = "harness" | "deterministic_check" | "advisory";

export interface MaterialityEntry {
  /** Matches a hard_failure / advisory-flag prefix or a deterministic check id. */
  readonly defect_class: string;
  readonly materiality: Materiality;
  readonly rationale: string;
  readonly source: DefectSource;
}

export const GTM_MATERIALITY_REGISTER: readonly MaterialityEntry[] = [
  // ---- MATERIAL ----
  {
    defect_class: "presence_rate",
    materiality: "material",
    rationale:
      "Hollow-document class: presence below the mined hard floor means the assessment asserts little from the record; customer receives a document without substance.",
    source: "harness",
  },
  {
    defect_class: "harness_error",
    materiality: "material",
    rationale: "No document was produced at all.",
    source: "harness",
  },
  {
    defect_class: "label_residue",
    materiality: "material",
    rationale:
      "Unresolved-slot literals (field labels where values belong) are visible defects that misstate the customer's own facts.",
    source: "harness",
  },
  {
    defect_class: "note_specificity:no_ledger_ref",
    materiality: "material",
    rationale:
      "A PRESENT factor with no intake ledger reference is an ungrounded assertion about the customer's record.",
    source: "harness",
  },
  {
    defect_class: "note_specificity:fossil_no_record_evidence",
    materiality: "material",
    rationale:
      "Fossil 'no record evidence' basis on a PRESENT row is a self-contradiction on the legal surface.",
    source: "harness",
  },
  {
    defect_class: "note_specificity:missing_weight_note",
    materiality: "material",
    rationale:
      "A PRESENT factor with no basis carries a conclusion with no stated reasoning.",
    source: "harness",
  },
  {
    defect_class: "action_diversity:consecutive_dup",
    materiality: "material",
    rationale:
      "Cloned consecutive actions signal a composition failure, not a wording wart; the customer receives duplicated obligations.",
    source: "harness",
  },
  {
    defect_class: "qc_r1",
    materiality: "material",
    rationale:
      "Grader-mirrored deterministic checks cover the legal surface (citations, statutory elements, polarity); any failure is a legal-correctness defect.",
    source: "deterministic_check",
  },
  {
    defect_class: "pii",
    materiality: "material",
    rationale: "Any PII reject class is a privacy harm and blocks release.",
    source: "harness",
  },
  {
    defect_class: "coherence",
    materiality: "material",
    rationale:
      "Cross-section contradictions misstate the legal position to the customer.",
    source: "harness",
  },
  {
    defect_class: "contradiction",
    materiality: "material",
    rationale:
      "Direct contradiction between shipped statements is a correctness defect.",
    source: "harness",
  },

  // ---- NON-MATERIAL (ship + log) ----
  {
    defect_class: "golden_shape",
    materiality: "non_material",
    rationale:
      "Single-section depth shortfalls are quota/quality flags, not correctness defects; the shipped content remains accurate.",
    source: "harness",
  },
  {
    defect_class: "review_band_low",
    materiality: "non_material",
    rationale: "Advisory presence band flag; at/above the hard floor.",
    source: "advisory",
  },
  {
    defect_class: "review_band_high",
    materiality: "non_material",
    rationale: "Advisory presence band flag; no customer-visible harm.",
    source: "advisory",
  },
  {
    defect_class: "grounded_note_would_replace",
    materiality: "non_material",
    rationale:
      "Observe-mode lexicon calibration telemetry; no rewrite is applied to the shipped text.",
    source: "advisory",
  },
  {
    defect_class: "deadline_sentence_prose_wart",
    materiality: "non_material",
    rationale:
      "Register wart logged in Build-Issues; does not alter legal meaning or the stated deadline.",
    source: "harness",
  },
  {
    defect_class: "legacy_key_missing",
    materiality: "non_material",
    rationale:
      "Side-by-side comparison gap against an archived legacy report; not a defect in the shipped document.",
    source: "harness",
  },
];

/**
 * Longest-prefix classification. Returns null when the defect class is not
 * in the register — callers MUST treat null as unclassified (fail-closed).
 */
export function lookupMateriality(
  defect: string,
): MaterialityEntry | null {
  let best: MaterialityEntry | null = null;
  for (const e of GTM_MATERIALITY_REGISTER) {
    if (
      defect === e.defect_class ||
      defect.startsWith(`${e.defect_class}:`) ||
      defect.startsWith(`${e.defect_class}_`)
    ) {
      if (!best || e.defect_class.length > best.defect_class.length) best = e;
    }
  }
  return best;
}
