/**
 * LTP Pass-2 Template Set + Item-136 Surface-Audit Retention Rulings.
 * VERBATIM CONTENT-ANCHORED COURIER — 2026-07-26.
 *
 * Source: LTP-RISK-WAVE-B content-anchored courier release. This module is
 * the change-controlled home for template text, forbidden-token lists,
 * slot vocabularies, and the surface-audit CUT / TEMPLATE-CUT rulings.
 * Courier-only edits.
 */

export const PASS2_TEMPLATES_VERSION = "pass2-templates-2026-07-30-item284-provisional-posture";

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
    // CP5 (a) — no LEDGER_ID fallback. Prong subject is composer-supplied
    // from the registry display_label so each of the five § 7150(b) prongs
    // reads with distinct, human-readable prose.
    text: "Engaged — {{cite:PINPOINT}} ({{plan:prong_subject}}): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["prong_subject"],
    intake_slots: [],
    max_chars: 400,
  },
  "T.risk.applicability.not_engaged": {
    id: "T.risk.applicability.not_engaged",
    text: "Not engaged — {{cite:PINPOINT}} ({{plan:prong_subject}}): the record does not support this trigger.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["prong_subject"],
    intake_slots: [],
    max_chars: 320,
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
  // ── assessment_summary composition templates (CONTENT COURIER 2026-07-26) ──
  // Deterministic aggregation drives which opening variant is selected; the
  // firm/hedged calibration assert extends to the summary via the same
  // FIRM_VARIANT_CLOSENESS_MAX threshold that governs T.risk.balance.firm.
  "T.risk.summary.opening.all_firm": {
    id: "T.risk.summary.opening.all_firm",
    text: "This Risk Assessment covers {{plan:activity_count_phrase}} requiring assessment under the CCPA. For {{plan:each_or_this_clause}}, the record as documented supports the conclusion that the benefits outweigh the identified negative impacts.",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "each_or_this_clause"],
    intake_slots: [],
    max_chars: 400,
  },
  "T.risk.summary.opening.mixed_hedged": {
    id: "T.risk.summary.opening.mixed_hedged",
    text: "This Risk Assessment covers {{plan:activity_count_phrase}}. For {{plan:firm_positive_list}}, the record supports the conclusion that benefits outweigh the identified negative impacts. For {{plan:close_list}}, the balance is close on the present record, and the considerations most likely to tip it are set out in the activity analysis below.",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "firm_positive_list", "close_list"],
    intake_slots: [],
    max_chars: 560,
  },
  "T.risk.summary.opening.any_negative": {
    id: "T.risk.summary.opening.any_negative",
    text: "This Risk Assessment covers {{plan:activity_count_phrase}}. For {{plan:negative_list}}, the record as documented does not support the conclusion that the benefits outweigh the identified negative impacts; the safeguard gaps bearing on this outcome are set out below. {{plan:remaining_outcomes_clause}}",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "negative_list", "remaining_outcomes_clause"],
    intake_slots: [],
    max_chars: 560,
  },
  "T.risk.summary.activity_line": {
    id: "T.risk.summary.activity_line",
    text: "{{plan:activity_label}}: {{plan:outcome_clause}} ({{plan:key_factor_token}}).",
    citation_slots: [],
    plan_slots: ["activity_label", "outcome_clause", "key_factor_token"],
    intake_slots: [],
    max_chars: 360,
  },
  "T.risk.summary.docs": {
    id: "T.risk.summary.docs",
    text: "The assessment record {{plan:docs_completion_clause}} the documentation elements of {{cite:PINPOINT_7152A}}.",
    citation_slots: ["PINPOINT_7152A"],
    plan_slots: ["docs_completion_clause"],
    intake_slots: [],
    max_chars: 280,
  },
  // ITEM 284 (F2) — PROVISIONAL POSTURE. Emitted whenever the shared
  // completeness predicate reports the record incomplete. States what the
  // record AS DOCUMENTED supports, expressly conditioned on the missing
  // elements, and never issues a firm favorable (or firm adverse) verdict.
  // Reserved framing binds: completion stays with the customer and counsel.
  "T.risk.summary.provisional_posture": {
    id: "T.risk.summary.provisional_posture",
    text: "On the record as documented, {{plan:provisional_support_clause}}. This statement is provisional and expressly conditioned on {{plan:outstanding_elements_clause}}, assessed against {{cite:PINPOINT_7152A}}; completing those elements, and any determination reserved to qualified legal counsel, remains with the customer and counsel.",
    citation_slots: ["PINPOINT_7152A"],
    plan_slots: ["provisional_support_clause", "outstanding_elements_clause"],
    intake_slots: [],
    max_chars: 900,
  },
  // Insufficient-record opening variant added by CONTENT COURIER 2026-07-26
  // (HELD-F release). Pairs with the existing outcome_clause
  // "assessment incomplete — see Items for your review" for activity lines,
  // and with overall_risk_level="Insufficient basis" per the precedence law
  // in _shared/ltp/risk-level-map.ts.
  "T.risk.summary.opening.insufficient": {
    id: "T.risk.summary.opening.insufficient",
    text: "This Risk Assessment covers {{plan:activity_count_phrase}}. On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis for the {{plan:activity_singplural_clause}} assessed. The specific items needed to complete this assessment are set out under Items for your review.",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "activity_singplural_clause"],
    intake_slots: [],
    max_chars: 420,
  },
  // ── ENRICHED BALANCE RATIONALE (CONTENT COURIER 2026-07-27) ──
  // Per-factor reasoning line that exposes the Pass-G weighing frame.
  // Renders EXISTING validated data only: factor_basis = factor row's
  // weight_note (facts); guidance_clause renders ONLY from FSOR-anchored
  // guidance for that factor via {{cite:GUIDANCE_PIN}}. Factors with empty
  // guidance render basis-only (no invented reasoning). Composition order:
  // benefit factor_lines → negative factor_lines → safeguard factor_lines →
  // existing firm/hedged conclusion sentence. Calibration law unchanged
  // (firm forbidden at closeness ≥ FIRM_VARIANT_CLOSENESS_MAX).
  "T.risk.balance.factor_line": {
    id: "T.risk.balance.factor_line",
    text: "{{plan:factor_label}}: {{plan:factor_basis}}. {{plan:guidance_clause}}",
    citation_slots: ["GUIDANCE_PIN"],
    plan_slots: ["factor_label", "factor_basis", "guidance_clause"],
    intake_slots: [],
    max_chars: 420,
  },
  // ── AGGREGATION RATIONALE (CONTENT COURIER 2026-07-27) ──
  // Multi-activity docs only (N>1). Renders in assessment_summary.narrative
  // immediately after the activity lines. Mirrors the "most consequential
  // activity" precedence rule in _shared/ltp/risk-level-map.ts; activity
  // outcomes are reported individually and are not averaged.
  "T.risk.summary.aggregation_note": {
    id: "T.risk.summary.aggregation_note",
    text: "The overall risk level for this assessment reflects the most consequential activity on the record ({{plan:driving_activity_label}}); per this assessment's precedence rule, activity outcomes are reported individually and are not averaged.",
    citation_slots: [],
    plan_slots: ["driving_activity_label"],
    intake_slots: [],
    max_chars: 300,
  },
  // ── (B)-GAP CUSTOMER QUESTION (CONTENT COURIER 2026-07-27) ──
  // Information-needed entry template (intake-gap discipline). NEVER
  // negative-implication, NEVER in the opening. Emitted ONLY when:
  //   criterion (A) did not resolve applicability
  //   AND intake affirms sell/share activity
  //   AND no compliant count field exists.
  // Mirrors the S0 telemetry rejection reason; sourced from the risk-opening
  // provenance (see supabase/functions/_shared/openings/risk-opening.ts).
  "T.risk.information_needed.b_criterion_count": {
    id: "T.risk.information_needed.b_criterion_count",
    text: "To evaluate the CCPA applicability criterion at Civ. Code § 1798.140(d)(1)(B), please provide the approximate number of California consumers or households whose personal information the business buys, sells, or shares annually.",
    citation_slots: [],
    plan_slots: [],
    intake_slots: [],
    max_chars: 320,
  },

  // ─────────────────────────────────────────────────────────────────
  // T-M3 (CONTENT COURIER 2026-07-28) — dedicated shapes for the
  // Item-222 gap-report sections. Verbatim template text; courier-only
  // edits from here down.
  // ─────────────────────────────────────────────────────────────────

  // executive_summary — TOP-OF-REPORT single paragraph. Distinct role
  // from the T.risk.summary.opening.* group (which composes the
  // narrative INSIDE assessment_summary). Firm+hedged variants; the
  // firm variant is FORBIDDEN when any activity rendered hedged
  // (same calibration law as T.risk.balance.firm, cross-checked
  // against FIRM_VARIANT_CLOSENESS_MAX).
  "T.risk.exec.firm": {
    id: "T.risk.exec.firm",
    text: "On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:each_or_this_clause}}, the benefits identified outweigh the negative impacts, subject to the safeguards described. The sufficiency of those safeguards and the decision to proceed rest with the Company and its counsel.",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "each_or_this_clause"],
    intake_slots: [],
    max_chars: 520,
  },
  "T.risk.exec.hedged": {
    id: "T.risk.exec.hedged",
    text: "On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:close_list}}, the balance between benefits and identified negative impacts is close on the present record, and reasonable assessments could differ; the considerations most likely to tip the balance are: {{plan:what_would_tip_it}}. {{plan:remaining_outcomes_clause}} The decision to proceed rests with the Company and its counsel.",
    citation_slots: [],
    plan_slots: [
      "activity_count_phrase",
      "close_list",
      "what_would_tip_it",
      "remaining_outcomes_clause",
    ],
    intake_slots: [],
    max_chars: 700,
  },
  "T.risk.exec.negative": {
    id: "T.risk.exec.negative",
    text: "On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:negative_list}}, the record does not support the conclusion that the benefits outweigh the identified negative impacts; the safeguard gaps bearing on that outcome are set out below. {{plan:remaining_outcomes_clause}}",
    citation_slots: [],
    plan_slots: ["activity_count_phrase", "negative_list", "remaining_outcomes_clause"],
    intake_slots: [],
    max_chars: 640,
  },
  "T.risk.exec.insufficient": {
    id: "T.risk.exec.insufficient",
    text: "On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis for the {{plan:activity_singplural_clause}} assessed. The specific items needed to complete this assessment are set out under Items for your review.",
    citation_slots: [],
    plan_slots: ["activity_singplural_clause"],
    intake_slots: [],
    max_chars: 380,
  },

  // priority_actions — per-action shape with deadline_basis as an
  // OWNER SLOT. Whole-value fill-or-omit; the structured-slot guard
  // in pass2-render.ts (STRUCTURED_SLOT_MIN_CHARS + forbidden-fragment
  // regexes) is fixtured for this slot in content.test.ts to catch
  // the smoke-#11 truncation class ("We" / "The" / "" fragments).
  "T.risk.priority_action": {
    id: "T.risk.priority_action",
    text: "{{plan:action_label}} — {{plan:action_basis}} Deadline basis: {{plan:deadline_basis}} ({{cite:PINPOINT_DEADLINE}}).",
    citation_slots: ["PINPOINT_DEADLINE"],
    plan_slots: ["action_label", "action_basis", "deadline_basis"],
    intake_slots: [],
    max_chars: 520,
  },

  // ITEM 241.3 — GOLDEN four-move gap-driven action template. Renders
  // (i) element_short_label, (ii) customer_recorded_fact_clause,
  // (iii) gap_or_consequence_clause, (iv) compliance_guidance_sentence
  // + one deadline_sentence from the deadline registry. Quota target:
  // ~747 chars/action per Golden-Shape §1 (top-50 empirical).
  "T.risk.priority_action.golden": {
    id: "T.risk.priority_action.golden",
    // ITEM 242 (defect 7a) — owner slot appended verbatim to every action.
    // Sourced from i7_internal_contributors (role-title only, per PII law).
    text: "**{{plan:element_short_label}}** — {{cite:PINPOINT}}. On {{plan:entity_name}}'s record, {{plan:customer_recorded_fact_clause}}. The gap is {{plan:gap_or_consequence_clause}}. The regulation requires the following: {{plan:compliance_guidance_sentence}} {{plan:deadline_sentence}} Owner: {{plan:owner_role_titles}}.",
    citation_slots: ["PINPOINT"],
    plan_slots: [
      "element_short_label",
      "entity_name",
      "customer_recorded_fact_clause",
      "gap_or_consequence_clause",
      "compliance_guidance_sentence",
      "deadline_sentence",
      "owner_role_titles",
    ],
    intake_slots: [],
    max_chars: 1400,
  },

  // ITEM 241.3 — CP5 §3.2 section-opener templates. Customer-first per
  // CP5-ADDENDUM §4. Each opener stands alone as an item in the section
  // list; composers prepend them via composeSection.
  "T.risk.section_opener.scope": {
    id: "T.risk.section_opener.scope",
    text: "{{plan:entity_name}}'s processing of {{plan:q4_pi_categories}} for {{plan:i1_processing_purpose}} engages the following review prongs. Each is a distinct trigger under 11 CCR § 7150(b): {{plan:prong_list_with_individual_pinpoints}}.",
    citation_slots: [],
    plan_slots: [
      "entity_name",
      "q4_pi_categories",
      "i1_processing_purpose",
      "prong_list_with_individual_pinpoints",
    ],
    intake_slots: [],
    max_chars: 700,
  },
  "T.risk.section_opener.balance": {
    id: "T.risk.section_opener.balance",
    text: "Weighing {{plan:entity_name}}'s stated purpose against the risks to consumers whose {{plan:q4_pi_categories}} is processed, {{plan:balance_outcome_sentence}}. The 11 CCR § 7152 balancing frame governs this assessment.",
    citation_slots: [],
    plan_slots: [
      "entity_name",
      "q4_pi_categories",
      "balance_outcome_sentence",
    ],
    intake_slots: [],
    max_chars: 640,
  },
  "T.risk.section_opener.actions": {
    id: "T.risk.section_opener.actions",
    text: "Given {{plan:customer_fact_clause}}, {{plan:entity_name}} should {{plan:action_verb_phrase}}. This action is required by {{cite:PINPOINT}}.",
    citation_slots: ["PINPOINT"],
    plan_slots: [
      "customer_fact_clause",
      "entity_name",
      "action_verb_phrase",
    ],
    intake_slots: [],
    max_chars: 520,
  },
  "T.risk.section_opener.compliance_guidance": {
    id: "T.risk.section_opener.compliance_guidance",
    text: "For {{plan:customer_fact_clause}}, the regulation requires the following: {{plan:compliance_guidance_sentence}} ({{cite:PINPOINT}}).",
    citation_slots: ["PINPOINT"],
    plan_slots: [
      "customer_fact_clause",
      "compliance_guidance_sentence",
    ],
    intake_slots: [],
    max_chars: 900,
  },
  "T.risk.section_opener.executive_summary": {
    id: "T.risk.section_opener.executive_summary",
    text: "{{plan:entity_name}} processes {{plan:q4_pi_categories}} for {{plan:i1_processing_purpose}}. This assessment finds {{plan:aggregateBalance_sentence}}. It is required by {{plan:sections_7150b_pinpoints}} and follows 11 CCR § 7152. As of {{plan:as_of_date}}.",
    citation_slots: [],
    plan_slots: [
      "entity_name",
      "q4_pi_categories",
      "i1_processing_purpose",
      "aggregateBalance_sentence",
      "sections_7150b_pinpoints",
      "as_of_date",
    ],
    intake_slots: [],
    max_chars: 720,
  },

  // ITEM 241.3 — record-sufficiency flowing-prose lead-in (Golden §4.3).
  // Emitted as the FIRST item in record_sufficiency; per-item entries
  // (T.risk.record_sufficiency.item) follow. Golden Shape aggregate
  // quota ~845 chars; this lead-in supplies the flowing-prose surface
  // (min_chars=500 in the quota table).
  "T.risk.record_sufficiency.prose": {
    id: "T.risk.record_sufficiency.prose",
    // ITEM 242 (defect 6) — closer bound to the SAME source as the opener
    // via `sufficiency_closer_clause`. The composer derives both from a
    // single boolean; contradiction between opener and closer is
    // structurally impossible after this change. The e2e contradiction
    // assert (item242-record-sufficiency.test.ts) enforces it.
    text: "The record supporting this assessment is {{plan:sufficiency_clause}}. {{plan:entity_name}} has documented the four factual elements § 7152(a) requires — {{plan:factual_elements_summary_clause}} — and has recorded reserved judgments for {{plan:reserved_judgments_list}}, each attached to the specific record element the judgment governs. Reserved judgments are decisions the regulation reserves to the business and its qualified counsel under {{plan:type_j_pinpoints}}; they are not gaps in the record and do not diminish record sufficiency. Where a factual element is absent, the deficiency is enumerated in the safeguard-gaps section with its own pinpoint. As of {{plan:as_of_date}}, the record {{plan:sufficiency_closer_clause}}.",
    citation_slots: [],
    plan_slots: [
      "sufficiency_clause",
      "entity_name",
      "factual_elements_summary_clause",
      "reserved_judgments_list",
      "type_j_pinpoints",
      "as_of_date",
      "sufficiency_closer_clause",
    ],
    intake_slots: [],
    max_chars: 1400,
  },


  // next_steps — per-step shape. Ordering + dedup vs priority_actions
  // is enforced by NEXT_STEPS_ORDERING_LAW (below): a next_step whose
  // action_label matches (case-insensitive, trimmed) an emitted
  // priority_action.action_label is dropped from next_steps. Remaining
  // steps sort by materiality tier (record-completeness > safeguard >
  // administrative), then by first-appearance order in the factor
  // table (stable).
  "T.risk.next_step": {
    id: "T.risk.next_step",
    text: "{{plan:step_label}} — {{plan:step_basis}}",
    citation_slots: [],
    plan_slots: ["step_label", "step_basis"],
    intake_slots: [],
    max_chars: 400,
  },

  // record_sufficiency — per-record item shape. Cites the pinpoint
  // whose documentation element the record either satisfies or lacks;
  // element_status_clause is the closed enum RECORD_STATUS_CLAUSES.
  "T.risk.record_sufficiency.item": {
    id: "T.risk.record_sufficiency.item",
    text: "{{plan:element_label}}: {{plan:element_status_clause}} ({{cite:PINPOINT}}).",
    citation_slots: ["PINPOINT"],
    plan_slots: ["element_label", "element_status_clause"],
    intake_slots: [],
    max_chars: 360,
  },

  // inconsistency_flags — per-entry rendering. T.risk.review_items
  // (already present) is the LIST-LEVEL surface; this entry template
  // is what feeds it. Validator-derived only; no LLM composition.
  "T.risk.review_items.entry": {
    id: "T.risk.review_items.entry",
    text: "{{plan:review_label}}: {{plan:review_basis}}",
    citation_slots: [],
    plan_slots: ["review_label", "review_basis"],
    intake_slots: [],
    max_chars: 340,
  },
  // ─────────────────────────────────────────────────────────────────
  // ITEM 276 — REDESIGN STEP 2: THE ASSESSMENT'S SUBJECT IS THE
  // PRIMARY ACTIVITY. Two new deterministic sentence frames, drafted
  // team-unanimous under the campaign delegation and quoted verbatim in
  // docs/courier/ITEM276-PRIMARY-SUBJECT-2026-07-30.md. Both degrade to
  // nothing when the Item-275 intake fields are absent (legacy docs).
  // ─────────────────────────────────────────────────────────────────
  "T.risk.exec.primary_subject_lead": {
    id: "T.risk.exec.primary_subject_lead",
    text: "The activity assessed in this Risk Assessment is {{plan:primary_activity_name}}, undertaken for the purpose of {{plan:primary_activity_purpose_clause}}. The analysis that follows — scope, processing, benefits, negative impacts, safeguards, and the weighing conclusion — is directed to that activity.",
    citation_slots: [],
    plan_slots: ["primary_activity_name", "primary_activity_purpose_clause"],
    intake_slots: [],
    max_chars: 640,
  },
  // ITEM 319 (PRIMARY ACTIVITY FEATURE, PROMPT A) — directive recommendation.
  // The comparison is still shown in full; the recommendation is ADDITIVE and
  // is framed as the tool's recommendation, never as a statutory requirement.
  // Scope boundary: this template governs the secondary-activity bundling call
  // ONLY. Primary-activity § 7152 analysis is untouched.
  "T.risk.scope.secondary_segmentation": {
    id: "T.risk.scope.secondary_segmentation",
    text: "{{plan:entity_name}} also recorded {{plan:secondary_activity_count_phrase}} beyond the assessed activity: {{plan:secondary_activity_list}}. {{cite:PINPOINT_7156A}} permits a single risk assessment to cover more than one processing activity only for a comparable set — \u201ca set of similar processing activities that present similar risks to consumers\u2019 privacy.\u201d On the record as submitted, the comparison stands as follows: {{plan:secondary_divergence_clause}} {{plan:secondary_recommendation_clause}} This assessment addresses the assessed activity only. The recommendation above is this tool's operational recommendation on the record as submitted — it is not a statement of what the law requires, is not legal advice, and does not replace review by qualified counsel.",
    citation_slots: ["PINPOINT_7156A"],
    plan_slots: [
      "entity_name",
      "secondary_activity_count_phrase",
      "secondary_activity_list",
      "secondary_divergence_clause",
      "secondary_recommendation_clause",
    ],
    intake_slots: [],
    max_chars: 4000,
  },


  // ─────────────────────────────────────────────────────────────────
  // ITEM 244 CEO-approved wiring (2026-07-28). Every clause below is

  // verbatim from the ITEM244-WIRED courier. Silent intake sub-elements
  // resolve to a reserved-framing string; NEVER an invented process.
  // ─────────────────────────────────────────────────────────────────

  // L1 — Processing Narrative section. Composed from the operational-
  // elements ledger fields in fixed order: collection → use → disclosure
  // → retention → deletion. Deletion fallback is "not stated on the
  // record" per Item 244 Correction 1 (no silent process may be
  // asserted).
  "T.risk.processing_narrative": {
    id: "T.risk.processing_narrative",
    text: "**How {{plan:entity_name}} processes personal information for {{plan:activity_label}}.**\n\n{{plan:entity_name}} collects {{plan:pi_categories_clause}} from {{plan:sources_clause}}. The information is used {{plan:i1_processing_purpose_clause}}. {{plan:entity_name}} discloses this information to {{plan:i6_vendors_clause}} through {{plan:i4_disclosure_mechanisms_clause}}. The record sets a retention period of {{plan:i2_retention_period_clause}}, applying the criterion that {{plan:i2_retention_criteria_clause}}. At the end of that period the information is {{plan:i2_deletion_clause}}.",
    citation_slots: [],
    plan_slots: [
      "entity_name",
      "activity_label",
      "pi_categories_clause",
      "sources_clause",
      "i1_processing_purpose_clause",
      "i6_vendors_clause",
      "i4_disclosure_mechanisms_clause",
      "i2_retention_period_clause",
      "i2_retention_criteria_clause",
      "i2_deletion_clause",
    ],
    intake_slots: [],
    max_chars: 2000,
  },

  // L3 — Less-Intrusive Alternatives line. Correction 3: pinpoint bound
  // from the registry-verified nearest anchor. Corpus pin-test 2026-07-28:
  // provision_texts:cppa-7152 contains no verbatim "less-intrusive
  // alternatives" clause; § 7152(a)(4)(B) is not a numbered leaf. The
  // verified NEAREST verbatim anchor is § 7152(a)(2)'s minimum-PI
  // requirement ("the minimum personal information that is necessary to
  // achieve the purpose of processing consumers' personal information"),
  // which is the operative statement for the minimization / less-
  // intrusive-alternatives judgment. The wired courier records this
  // verification result.
  "T.risk.less_intrusive_alternatives.present": {
    id: "T.risk.less_intrusive_alternatives.present",
    text: "The record states that {{plan:entity_name}} considered less-intrusive alternatives as follows: {{plan:i1b_min_pi_clause}}. Under {{cite:PINPOINT}}, this record is the operative statement for the balancing frame.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["entity_name", "i1b_min_pi_clause"],
    intake_slots: [],
    max_chars: 640,
  },
  "T.risk.less_intrusive_alternatives.silent": {
    id: "T.risk.less_intrusive_alternatives.silent",
    text: "The record does not yet state the less-intrusive alternatives {{plan:entity_name}} considered for this activity. The {{cite:PINPOINT}} analysis therefore reserves this element; qualified legal counsel should record the alternatives considered before the assessment closes.",
    citation_slots: ["PINPOINT"],
    plan_slots: ["entity_name"],
    intake_slots: [],
    max_chars: 520,
  },

  // E1 — Scope aggregation opener. Correction 4: the engaged-trigger
  // basis clause is sourced from § 7150(b) verbatim (openings/ccpa-7150-pin
  // constants), NOT from submission-postures.ts (§ 7120 family).
  "T.risk.section_opener.scope.v2": {
    id: "T.risk.section_opener.scope.v2",
    text: "**Scope & Triggers.** This assessment is triggered under **{{cite:PINPOINT_ENGAGED}} — {{plan:engaged_prong_label}}** on the following record basis: {{plan:engaged_prong_posture_clause}}. The remaining § 7150(b) applicability prongs are not engaged on the current record: {{plan:non_engaged_prongs_inline}}.",
    citation_slots: ["PINPOINT_ENGAGED"],
    plan_slots: [
      "engaged_prong_label",
      "engaged_prong_posture_clause",
      "non_engaged_prongs_inline",
    ],
    intake_slots: [],
    max_chars: 1400,
  },

  // L5 — Affirmations block opener. Adequately-documented items lead;
  // gaps trail. Single sentence assembled from the four factual gates +
  // total gap enumeration.
  "T.risk.record_sufficiency.prose.v2": {
    id: "T.risk.record_sufficiency.prose.v2",
    text: "The record {{plan:sufficiency_clause}}. {{plan:entity_name}} has adequately documented {{plan:affirmed_count_clause}} of the § 7152(a) elements listed below; {{plan:gap_count_clause}} of these elements remain enumerated for your review. Each element is stated once, with its § 7152(a) pinpoint, in the order the record was assessed.",
    citation_slots: [],
    plan_slots: [
      "sufficiency_clause",
      "entity_name",
      "affirmed_count_clause",
      "gap_count_clause",
    ],
    intake_slots: [],
    max_chars: 900,
  },

};


/**
 * Emission gate for T.risk.information_needed.b_criterion_count.
 * Returns true iff all three conditions are met (intake-gap discipline,
 * mirrors the S0 telemetry rejection reason). Pure predicate; no I/O.
 *
 * T-C1 (2026-07-28) — `has_compliant_count_field` semantics: the
 * `bought_sold_shared_count` intake key exists AND is answered with any
 * value in the BOUGHT_SOLD_SHARED_OPTS enum. Callsites derive this from
 * intake as:
 *   has_compliant_count_field =
 *     BOUGHT_SOLD_SHARED_OPTS.includes(String(intake.bought_sold_shared_count ?? ""))
 * The question emits when the field is unanswered AND the other two
 * conditions hold. Once answered — with any band — the question is
 * suppressed (the covered-business (B) prong resolves against the
 * answered value; the user is not re-asked).
 */
export function shouldEmitBCriterionCountQuestion(input: {
  readonly criterion_a_resolved: boolean;
  readonly intake_affirms_sell_or_share: boolean;
  readonly has_compliant_count_field: boolean;
}): boolean {
  return (
    input.criterion_a_resolved === false &&
    input.intake_affirms_sell_or_share === true &&
    input.has_compliant_count_field === false
  );
}

/**
 * Closed enums for the assessment_summary composition templates.
 * Each list is exhaustive; the composer selects deterministically.
 */
export const SUMMARY_OUTCOME_CLAUSES: readonly string[] = [
  "benefits outweigh the identified impacts as documented",
  "close balance — see the activity analysis",
  "the identified impacts outweigh the stated benefits as documented",
  "assessment incomplete — see Items for your review",
];

export const SUMMARY_REMAINING_OUTCOMES_CLAUSES: readonly string[] = [
  "The remaining activities are addressed in the analysis below.",
  "",
];

export const SUMMARY_DOCS_COMPLETION_CLAUSES: readonly string[] = [
  "is complete against",
  "has outstanding documentation items — see Items for your review; the record does not yet complete",
];

export const SUMMARY_EACH_OR_THIS_CLAUSES: readonly string[] = [
  "this activity",
  "each of them",
];

/**
 * Singular/plural clause used by the insufficient-record opening variant
 * (added by CONTENT COURIER 2026-07-26 alongside T.risk.summary.opening.insufficient).
 */
export const SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES: readonly string[] = [
  "activity",
  "activities",
];

/**
 * Narrative composition order (fixed). Total narrative cap = 2400 chars.
 * Order: opening variant (one of three) → activity lines (aggregation order)
 * → docs sentence → T.risk.closing.reserved (as the narrative's final
 * sentences; the closing is NOT a separate paragraph slot).
 */
export const SUMMARY_NARRATIVE_MAX_CHARS = 2400;


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

// ─────────────────────────────────────────────────────────────────
// T-M3 (CONTENT COURIER 2026-07-28) — closed enums + ordering law.
// ─────────────────────────────────────────────────────────────────

/**
 * Closed enum for T.risk.record_sufficiency.item element_status_clause.
 * Each entry is fill-or-omit at the item level: emit the item with one
 * of these clauses or drop the item entirely — never a fragment.
 */
export const RECORD_STATUS_CLAUSES: readonly string[] = [
  "present in the record as documented",
  "not present in the record as documented",
  "partially present; specific items are listed under Items for your review",
  // ITEM 243 defect 4 — ADMT NOT-APPLICABLE COMPLETION. When
  // `q18_admt_use` is negative the G.q18.admt_consequence gate blocks
  // and every ADMT-scoped documentation row is not a "gap" — it is
  // structurally not applicable. Emit this clause instead of the
  // "not present" clause so the record-sufficiency panel never labels
  // an inapplicable element as a documentation deficit.
  "not applicable — automated decisionmaking technology is not in use per the record",
] as const;


/**
 * T-M3 ordering + dedup law for next_steps vs priority_actions.
 * Pure specification consumed by the T-M6 wire; declared here so it
 * is change-controlled with the templates.
 *
 *   1. DEDUP: for each priority_actions[i].action_label, drop any
 *      next_steps[j] whose step_label matches (case-insensitive,
 *      whitespace-normalized).
 *   2. MATERIALITY ORDER: sort remaining next_steps by
 *      materiality_tier (lower ordinal first), then by first-
 *      appearance order in factor_table (stable).
 *   3. MOST-CAUTIOUS-WINS: within the same materiality tier, a
 *      "documentation.gap" step precedes a "documentation.present"
 *      step (outcomes never averaged; the more cautious framing wins).
 */
export const NEXT_STEPS_MATERIALITY_TIERS: readonly string[] = [
  "record-completeness",
  "safeguard",
  "administrative",
] as const;

/**
 * Owner-slot registry for the structured-slot guard in pass2-render.ts.
 * These slots MUST be whole-value or omitted; the fragment guard
 * (STRUCTURED_SLOT_MIN_CHARS + forbidden-fragment regexes) applies.
 * Fixtures in content.test.ts exercise every entry.
 */
export const STRUCTURED_OWNER_SLOTS: readonly string[] = [
  // Historical (Item 176 / smoke-#11)
  "owner",
  "deadline_basis",
  "exceptions_status",
  // T-M3 additions
  "action_label",
  "action_basis",
  "step_label",
  "step_basis",
  "element_label",
  "element_status_clause",
  "review_label",
  "review_basis",
] as const;
