/**
 * LTP Pass-2 Template Set + Item-136 Surface-Audit Retention Rulings.
 * VERBATIM CONTENT-ANCHORED COURIER — 2026-07-26.
 *
 * Source: LTP-RISK-WAVE-B content-anchored courier release. This module is
 * the change-controlled home for template text, forbidden-token lists,
 * slot vocabularies, and the surface-audit CUT / TEMPLATE-CUT rulings.
 * Courier-only edits.
 */

export const PASS2_TEMPLATES_VERSION = "pass2-templates-2026-07-26";

/**
 * Surface-audit rulings (item-136 default: CUT unless defended).
 *   scope_notes                  → CUT (leak/fragment history; no defending class).
 *   cross_tool_recommendations   → CUT (module-name leak history; belongs in product UI).
 *   inconsistency_flags          → TEMPLATE-CUT (retained only as the
 *                                  structured "Items for your review" list
 *                                  rendered from validator/gate outputs).
 */
export type SurfaceRuling = "CUT" | "TEMPLATE_CUT" | "RETAIN";
export const SURFACE_AUDIT_RULINGS: Readonly<Record<string, SurfaceRuling>> = {
  scope_notes: "CUT",
  cross_tool_recommendations: "CUT",
  inconsistency_flags: "TEMPLATE_CUT",
};

/**
 * Forbidden tokens the model may never emit in any Pass-2 connective tissue.
 * Citation glyphs are token-substituted from citation_bindings; law names
 * are template-authored.
 */
export const PASS2_FORBIDDEN_TOKENS: readonly string[] = [
  "§",
  "Art.",
  "Sec.",
  "GDPR",
  "persuasive-markers-absent-check",
];

export interface Pass2Template {
  readonly id: string;
  readonly text: string;
  readonly citation_slots: readonly string[];
  readonly plan_slots: readonly string[];
  readonly intake_slots: readonly string[];
  readonly max_chars: number;
  /** If true, template renders nothing when engaged (gate-suppressed section). */
  readonly emits_nothing?: boolean;
}

export const PASS2_TEMPLATES: Readonly<Record<string, Pass2Template>> = {
  "T.risk.applicability.engaged": {
    id: "T.risk.applicability.engaged",
    text: "The record indicates this processing activity requires a risk assessment under {{cite:PINPOINT}}: {{intake:LEDGER_ID}}.",
    citation_slots: ["PINPOINT"],
    plan_slots: [],
    intake_slots: ["LEDGER_ID"],
    max_chars: 400,
  },
  "T.risk.applicability.not_engaged": {
    id: "T.risk.applicability.not_engaged",
    text: "Based on the record, the trigger at {{cite:PINPOINT}} is not engaged.",
    citation_slots: ["PINPOINT"],
    plan_slots: [],
    intake_slots: [],
    max_chars: 240,
  },
  "T.risk.cohort": {
    id: "T.risk.cohort",
    text: "Based on the revenue information provided, the Company's applicable compliance timeline is {{plan:cohort_date}} under {{cite:PINPOINT}}.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["cohort_date"],
    intake_slots: [],
    max_chars: 320,
  },
  "T.risk.documentation.present": {
    id: "T.risk.documentation.present",
    text: "The assessment record includes {{plan:doc_element_label}} as required by {{cite:PINPOINT}}.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["doc_element_label"],
    intake_slots: [],
    max_chars: 320,
  },
  "T.risk.documentation.gap": {
    id: "T.risk.documentation.gap",
    text: "The record does not yet include {{plan:doc_element_label}}, which {{cite:PINPOINT}} requires. To complete this assessment: {{plan:customer_question}}",
    citation_slots: ["PINPOINT"],
    plan_slots: ["doc_element_label", "customer_question"],
    intake_slots: [],
    max_chars: 480,
  },
  "T.risk.balance.firm": {
    id: "T.risk.balance.firm",
    text: "Weighing the benefits identified in the record — {{plan:benefit_summary_tokens}} — against the potential negative impacts — {{plan:negative_summary_tokens}} — and taking into account the safeguards described — {{plan:safeguard_summary_tokens}} — the record supports the conclusion that {{plan:balance_direction_clause}} under the framework of {{cite:PINPOINT_7152A5}}.",
    citation_slots: ["PINPOINT_7152A5"],
    plan_slots: [
      "benefit_summary_tokens",
      "negative_summary_tokens",
      "safeguard_summary_tokens",
      "balance_direction_clause",
    ],
    intake_slots: [],
    max_chars: 900,
  },
  "T.risk.balance.hedged": {
    id: "T.risk.balance.hedged",
    text: "This is a close balance on the present record. The benefits identified — {{plan:benefit_summary_tokens}} — and the potential negative impacts — {{plan:negative_summary_tokens}} — are each substantial, and reasonable assessments could differ. The factors most likely to tip this balance are: {{plan:tipping_factors}}. The Company should weigh these considerations, with its counsel, in reaching its determination under {{cite:PINPOINT_7152A5}}.",
    citation_slots: ["PINPOINT_7152A5"],
    plan_slots: [
      "benefit_summary_tokens",
      "negative_summary_tokens",
      "tipping_factors",
    ],
    intake_slots: [],
    max_chars: 900,
  },
  "T.risk.admt.consequence_suppressed": {
    id: "T.risk.admt.consequence_suppressed",
    text: "",
    citation_slots: [],
    plan_slots: [],
    intake_slots: [],
    max_chars: 0,
    emits_nothing: true,
  },
  "T.risk.review_items": {
    id: "T.risk.review_items",
    text: "Items for your review: {{plan:review_item_list}}",
    citation_slots: [],
    plan_slots: ["review_item_list"],
    intake_slots: [],
    max_chars: 2000,
  },
  "T.risk.closing.reserved": {
    id: "T.risk.closing.reserved",
    text: "This assessment presents the analysis required by {{cite:PINPOINT_7152}}. The decision whether to initiate or continue the processing described — and the sufficiency of the safeguards adopted — rests with the Company and its counsel. {{plan:open_questions_tokens}}",
    citation_slots: ["PINPOINT_7152"],
    plan_slots: ["open_questions_tokens"],
    intake_slots: [],
    max_chars: 600,
  },
};

/**
 * Slot vocabularies. `balance_direction_clause` is the ONLY closed enum
 * outside citation/intake tokens; other plan slots render from token lists
 * (benefit/negative/safeguard summary tokens derive from factor_table rows'
 * label + weight_note; tipping_factors derives from frame closeness
 * contributions).
 */
export const BALANCE_DIRECTION_CLAUSES: readonly string[] = [
  "the benefits, as documented, outweigh the identified negative impacts",
  "the identified negative impacts, as documented, outweigh the stated benefits",
];

/**
 * Firm variant is FORBIDDEN when closeness ≥ FIRM_VARIANT_CLOSENESS_MAX.
 * Post-render assert (Pass V + deterministic check).
 */
export const FIRM_VARIANT_CLOSENESS_MAX = 0.6;
