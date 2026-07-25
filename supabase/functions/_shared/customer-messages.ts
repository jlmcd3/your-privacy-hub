// LEAK-PREV-P0 — Customer message catalog.
//
// SINGLE reviewed catalog of machinery-authored customer-visible sentences.
// Guards, fallbacks, and enforcement passes MUST render text through
// `renderMessage(id, params)` rather than assembling their own templates.
//
// Rules (five-lens reviewed 2026-07-25):
//   - Answer-first, plain-language, customer voice.
//   - No meta-commentary ("re-run", "the pipeline", "the model", etc.).
//   - No developer register (raw intake IDs, snake_case tokens).
//   - `field`-kind params are humanized through `labelForField` — never
//     the raw ID. Unknown intake fields fall back to the neutral phrase
//     "this intake area" (NEVER cosmetic underscore-stripping).
//   - Unknown catalog ID resolves to the information-needed generic —
//     `renderMessage` NEVER throws.
//
// Coverage: three CPPA tools (ADMT, Risk Assessment, Cybersecurity) at
// authoring turn. Extended per-tool in later phases (LEAK-PREV Phases
// 1–3 introduce structured flags and consumer-side rendering).

import { cppaAdmtContract } from "./intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "./intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "./intake-contracts/cppa-cybersecurity.ts";
import { dpiaFrameworkContract } from "./intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "./intake-contracts/li-assessment.ts";
import { governanceContract } from "./intake-contracts/governance-assessment.ts";
import { dpaGeneratorContract } from "./intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "./intake-contracts/ir-playbook.ts";

export const CUSTOMER_MESSAGES_VERSION = "cm-w1-2026-07-25";

// ── Param types ─────────────────────────────────────────────────────────

export type MessageParam =
  | { kind: "field"; value: string }      // humanized through FIELD_LABELS
  | { kind: "verbatim"; value: string }   // free text from intake / model
  | { kind: "plain"; value: string };     // free text, no transformation

export type MessageParams = Record<string, MessageParam>;

// ── Field-label registry ────────────────────────────────────────────────

/** Curated humanized labels. Populated from each CPPA tool's intake
 *  contract; extend as new contracts are wired in later phases. */
export const FIELD_LABELS: Record<string, string> = Object.freeze({
  // ── CPPA Risk Assessment ──
  entity_name: "entity name",
  subject_anchor: "subject of the assessment",
  q1_revenue: "annual revenue band",
  q2_consumers: "California consumer volume",
  q3_sector: "industry sector",
  q4_pi_categories: "personal-information categories collected",
  q5_sell_share: "sale or sharing of personal information",
  q5b_profiling_observation: "profiling and systematic observation",
  q5c_share_revenue_50pct: "share of revenue from selling or sharing",
  sensitive_location_basis: "sensitive-location processing basis",
  public_privacy_policy_url: "public privacy-policy URL",
  q6_right_know: "right-to-know handling",
  q6_right_know_multi: "right-to-know channels",
  q7_right_delete: "right-to-delete handling",
  q8_right_correct: "right-to-correct handling",
  q9_opt_out: "opt-out disclosure placement",
  q10_id_verification: "identity-verification process",
  q11_policy_review: "privacy-policy review cadence",
  q12_notice_at_collection: "notice-at-collection coverage",
  q13_notice_content: "notice-content elements",
  q14_employee_notice: "employee privacy notice",
  q15_sensitive_pi: "sensitive personal-information processing",
  q15b_under16_knowledge: "processing of under-16 data",
  q15c_spi_volume: "volume of sensitive personal information processed",
  q16_sensitive_limit: "limit-the-use-of-sensitive-PI mechanism",
  q17_sensitive_basis: "legal basis for sensitive-PI processing",
  q18_admt_use: "use of automated decision-making technology",
  q19_admt_description: "automated decision-making technology description",
  q20_admt_opt_out: "ADMT opt-out mechanism",
  q18b_admt_training: "training on ADMT models",
  i1_processing_purpose: "processing purposes",
  i1b_min_pi: "data minimisation",
  i2_retention_period: "retention period",
  i2_retention_criteria: "retention criteria",
  i2_retention_detail: "retention detail",
  i3_ca_consumer_band: "California-consumer volume band",
  i4_disclosure_mechanisms: "disclosure mechanisms in use",
  i4b_sources: "sources of personal information",
  i5_admt_logic: "logic of the automated decision-making technology",
  i5_admt_training_source: "training-data source for the ADMT",
  i5_admt_fairness_testing: "fairness testing of the ADMT",
  i5_admt_human_review: "human review of ADMT output",
  i6_vendors: "vendors involved in processing",
  i7_internal_contributors: "internal contributors to the assessment",
  i7_external_consultees: "external parties consulted",
  i8_certifying_exec_name: "certifying executive's name",
  i8_certifying_exec_title: "certifying executive's title",
  i8_contact_phone: "contact phone number",
  i8_contact_email: "contact email address",
  i9_has_existing_dpia: "existence of a prior DPIA",
  i9_existing_dpia_summary: "summary of prior DPIA",
  exceptions_intake: "regulatory exceptions",
  impact_intake: "impact assessment inputs",
  "impact_intake.likelihood": "likelihood of impact",
  "impact_intake.severity": "severity of impact",
  "impact_intake.benefitsOutweigh": "whether benefits outweigh risks",
  "impact_intake.cyberGaps": "known cybersecurity gaps",
  "impact_intake.harmTypes": "types of potential harm",

  // ── CPPA ADMT Checker ──
  organization_name: "organization name",
  system_name: "system name",
  system_type: "system type",
  system_description: "system description",
  decision_domains: "significant-decision domains",
  human_review: "human review posture",
  training_data_use: "use of personal information in training data",
  profiling_use: "use of the system for profiling",
  notice_delivery: "pre-use notice delivery channels",
  notice_has_specific_purpose: "whether the notice states a specific purpose",
  notice_purpose_text: "specific-purpose text in the notice",
  notice_has_opt_out_desc: "whether the notice describes the opt-out right",
  notice_has_access_desc: "whether the notice describes the access right",
  notice_has_anti_retaliation: "anti-retaliation language in the notice",
  notice_has_how_it_works: "how-it-works explanation in the notice",
  notice_has_alternative_process: "alternative-process description in the notice",
  opt_out_exception: "opt-out exception invoked",
  opt_out_methods: "opt-out submission methods",
  opt_out_link_title: "opt-out link title",
  opt_out_no_cookie_banner: "cookie-banner-only opt-out policy",
  opt_out_no_account_required: "no-account-required opt-out policy",
  opt_out_confirmation_mechanism: "opt-out confirmation mechanism",
  opt_out_appeal_process: "opt-out appeal process",
  opt_out_fairness_doc: "opt-out fairness documentation",
  opt_out_15_day_process: "15-business-day opt-out process",
  opt_out_service_provider_notice: "opt-out notice to service providers",
  access_submission_methods: "access-right submission methods",
  access_verification_process: "access-request verification process",
  access_logic_disclosure: "access-right logic disclosure",
  access_outcome_disclosure: "access-right outcome disclosure",
  access_response_timeline: "access-right response timeline",
  access_trade_secret_policy: "trade-secret carve-out policy",
  ca_consumer_count: "California consumer count",
  third_party_admt: "third-party ADMT arrangements",
  admt_system_count: "number of ADMT systems in use",
  affected_population_band: "affected-population band",
  role_roster: "internal role roster",
  admt_detail: "ADMT detail block",
  "admt_detail.vendor_status": "ADMT vendor status",
  "admt_detail.vendor_docs": "ADMT vendor documentation on file",
  "admt_detail.vendor_makes_available": "ADMT vendor cooperation",
  "admt_detail.v_audit": "ADMT vendor audit cooperation",
  "admt_detail.v_assist": "ADMT vendor consumer-request assistance",
  "admt_detail.v_optout": "ADMT vendor opt-out cooperation",
  "admt_detail.v_appeal": "ADMT vendor appeal cooperation",
  "admt_detail.v_incident": "ADMT vendor incident cooperation",
  "admt_detail.hosting": "ADMT hosting environment",
  "admt_detail.model_types": "ADMT model types",
  "admt_detail.decision_effects": "significant-decision effects",
  "admt_detail.decision_cadence": "decision cadence",
  "admt_detail.sole_factor": "whether ADMT is the sole factor",
  "admt_detail.feeds_future_decisions": "whether ADMT output feeds future decisions",
  "admt_detail.solely_advertising": "whether ADMT is used solely for advertising",
  hi_trained: "whether the human reviewer is trained to interpret the output",
  hi_reviews_other_info: "whether the reviewer weighs other information",
  hi_authority_override: "whether the reviewer has authority to override",

  // ── CPPA Cybersecurity ──
  "profile.entity_name": "entity name",
  "profile.industry": "industry",
  "profile.incidents_12mo": "cybersecurity incidents in the last 12 months",
  "profile.framework": "cybersecurity framework in use",
  "profile.last_audit": "most recent cybersecurity audit",
  "profile.in_scope_frameworks": "in-scope cybersecurity frameworks",
  "profile.audit_scope_rationale": "audit-scope rationale",
  "controls[].key": "control identifier",
  "controls[].label": "control label",
  "controls[].maturity": "control maturity level",
  "controls[].notes": "control notes",
  "controls[].evidence": "evidence available for the control",

  // ── DPIA Framework (LEAK-PREV-P0 extension — DPIA-REGISTRY-WIRING) ──
  // (organization_name label lives higher up — do not redeclare here.)
  processing_activity_name: "processing activity name",
  description: "processing description",
  purpose: "purpose of the processing",
  data_categories: "categories of personal data",
  data_subjects: "categories of data subjects",
  volume_frequency: "volume and frequency of processing",
  third_party_processors: "third-party processors",
  existing_safeguards: "existing safeguards",
  jurisdictions: "applicable jurisdictions",
  legal_basis_proposed: "proposed lawful basis",
  article_9_condition: "Article 9 special-category condition",
  necessity_proportionality: "necessity and proportionality analysis",
  retention_period: "retention period",
  controller_contact: "controller contact",
  dpo_info: "data protection officer information",
  processor_obligations: "processor obligations",
  processing_version: "processing version",
  estimated_launch_date: "estimated launch date",
  estimated_end_date: "estimated end date",
  dpia_team: "DPIA team roster",
  reference_materials: "reference materials",
  reasons_to_conduct: "reasons for conducting the DPIA",
  dpia_scope_note: "DPIA scope note",
  publication_intent: "publication intent",
  secondary_uses: "secondary uses of the data",
  nature_scope_context: "nature, scope and context of the processing",
  functional_description: "functional description",
  supporting_assets: "supporting assets",
  codes_of_conduct: "applicable codes of conduct",
  data_minimisation_justification: "data-minimisation justification",
  data_quality_measures: "data-quality measures",
  data_subject_rights_mechanisms: "data-subject rights mechanisms",
  dp_by_design_measures: "data-protection-by-design measures",
  dpo_advice: "DPO advice on the processing",
  data_subjects_views_sought: "whether data-subject views were sought",
  data_subjects_views: "data-subject views received",
  controller_country: "controller country",
  controller_land: "controller Land (Germany)",
  controller_sector: "controller sector",
  central_administration_country: "central administration country",
  eu_decision_establishment_country: "EU decision establishment country",
  transfer_flows: "international transfer flows",
  retention_record_type: "retention-record type",
  source_assessment_id: "source assessment id",

  // ── LI Assessment (LEAK-PREV-P0 extension — LIA-REGISTRY-WIRING) ──
  relationship_type: "relationship with the data subjects",
  processing_description: "processing description",
  stated_purpose: "stated purpose of the processing",
  alternatives_considered: "alternatives considered before processing",
  purpose_details: "purpose details",
  "purpose_details.interest_holder": "interest holder",
  "purpose_details.interest_type": "type of legitimate interest",
  "purpose_details.interest_statement": "statement of the legitimate interest",
  "purpose_details.interest_holder_other": "other interest holder (free text)",
  "purpose_details.interest_type_other": "other interest type (free text)",
  necessity_details: "necessity details",
  "necessity_details.alternatives": "less-intrusive alternatives considered",
  "necessity_details.why_consent_not_used": "reason consent was not used",
  "necessity_details.data_minimised": "data-minimisation measures",
  "necessity_details.pseudonymisation_options": "pseudonymisation options for analytics",
  balancing_details: "balancing-test details",
  "balancing_details.reasonable_expectation": "data-subject reasonable expectation",
  "balancing_details.reasonable_expectation_detail": "reasonable-expectation detail",
  "balancing_details.vulnerable_subjects": "vulnerable-subject categories",
  "balancing_details.vulnerable_subjects_other": "other vulnerable-subject categories",
  "balancing_details.potential_harm": "potential-harm severity",
  "balancing_details.potential_harm_detail": "potential-harm detail",
  "balancing_details.safeguards": "safeguards in place",
  "balancing_details.safeguards_other": "other safeguards (free text)",
  "balancing_details.opt_out_mechanism": "opt-out mechanism",
  "balancing_details.special_category_data": "special-category data flag",
  "balancing_details.statutory_restrictions": "statutory restrictions (marketing branch)",
  "balancing_details.employment_safeguards": "employment-context safeguards",
  "balancing_details.additional_context": "additional balancing context",
  stage: "intake stage",
  preview_assessment_id: "preview assessment id",

  // ── Governance Assessment (LEAK-PREV-P0 extension — GOVERNANCE-REGISTRY-WIRING) ──
  sector: "industry sector",
  org_size: "organisation size",
  eu_uk_data: "processing of EU/UK personal data",
  tools: "AI or productivity tools in use",
  special_category: "processing of special-category data",
  special_categories_list: "special-category data types processed",
  privacy_policy: "privacy policy status",
  privacy_notice_coverage: "privacy notice coverage",
  dpo_status: "data protection officer status",
  dpia_status: "DPIA programme status",
  dpia_ai_coverage: "DPIA coverage of AI tools",
  incident_response: "incident-response plan status",
  training_status: "privacy training programme",
  training_ai_coverage: "AI-specific training coverage",
  tool_instruction: "tool-usage instructions to staff",
  dpa_status: "vendor data-processing agreement status",
  dpa_art28_verified: "Article 28 verification status",
  transfer_status: "international-transfer status",
  transfer_mechanism: "international-transfer safeguard mechanism",
  technical_controls: "technical controls in place",
  technical_controls_list: "specific technical controls in place",
  dsr_capability: "data-subject request handling capability",
  dsr_rights_tested: "data-subject rights tested",
  inventory_audit: "tool inventory and audit status",
  additional_context: "additional context provided by the customer",
  // ── DPA (generate-dpa) ──
  entityName: "entity name",
  controllerName: "controller name",
  controllerJurisdiction: "controller jurisdiction",
  processorName: "processor name",
  processorJurisdiction: "processor jurisdiction",
  services: "services provided by the processor",
  dataCategories: "categories of personal data processed",
  retention: "retention period",
  hasSubProcessors: "use of sub-processors",
  subProcessorList: "list of sub-processors",
  auditRights: "audit rights arrangement",
  includeTransferClause: "inclusion of an international-transfer clause",
  legalFramework: "governing legal framework",
  transferMechanism: "international-transfer safeguard mechanism",
  documentType: "document type",
  // ── IR Playbook ──
  organizationName: "organization name",
  discoveryDateTime: "incident discovery date and time",
  cause: "suspected cause of the incident",
  dataTypes: "types of personal data involved",
  affectedCount: "number of affected data subjects",
  jurisdictions: "affected jurisdictions",
  processorInvolved: "processor involvement",
  processorName: "processor name",
  contained: "containment status",
  organisationType: "organization type",
});

/** Contract-derived allowlist of every intake key we know about. Used
 *  by the lint test to detect labels missing from FIELD_LABELS. */
export const KNOWN_INTAKE_KEYS: readonly string[] = Object.freeze([
  ...cppaAdmtContract.fields.map((f) => f.key),
  ...cppaRiskContract.fields.map((f) => f.key),
  ...cppaCybersecurityContract.fields.map((f) => f.key),
  ...dpiaFrameworkContract.fields.map((f) => f.key),
  ...liAssessmentStageBContract.fields.map((f) => f.key),
  ...governanceContract.fields.map((f) => f.key),
  ...dpaGeneratorContract.fields.map((f) => f.key),
  ...irPlaybookContract.fields.map((f) => f.key),
]);

/** Returns the humanized label for an intake field or the neutral
 *  phrase "this intake area" for unknowns. NEVER returns the raw ID. */
export function labelForField(field: string | undefined | null): string {
  if (!field || typeof field !== "string") return "this intake area";
  const hit = FIELD_LABELS[field];
  if (hit) return hit;
  // Unknown field — return neutral phrase, NEVER cosmetic underscore-
  // stripping (which would leak the developer register).
  return "this intake area";
}

// ── Catalog ─────────────────────────────────────────────────────────────

export interface CatalogEntry {
  /** Ordered param names used by the template (informational). */
  params: readonly string[];
  render: (p: MessageParams) => string;
}

const renderPlain = (p: MessageParam | undefined, fallback = ""): string => {
  if (!p) return fallback;
  if (p.kind === "field") return labelForField(p.value);
  return String(p.value ?? "");
};

const renderVerbatim = (p: MessageParam | undefined): string => {
  const s = renderPlain(p);
  return s.length > 160 ? s.slice(0, 157) + "…" : s;
};

export const CUSTOMER_MESSAGES: Record<string, CatalogEntry> = Object.freeze({
  // Unsupported claim — the intake explicitly denies the point.
  "unsupported.denied": {
    params: ["field", "verbatim"],
    render: (p) =>
      `The intake records "${renderVerbatim(p.verbatim)}" for ${renderPlain(p.field, "this intake area")}; that statement is not supported by the intake and must be reconciled.`,
  },
  // Unsupported claim — the intake records an unrelated value on the field.
  "unsupported.asserted": {
    params: ["field", "verbatim"],
    render: (p) =>
      `The intake records "${renderVerbatim(p.verbatim)}" for ${renderPlain(p.field, "this intake area")}, but the assertion is not supported by the intake and must be reconciled.`,
  },
  // Unsupported claim — the intake is silent on the field.
  "unsupported.silent": {
    params: ["field"],
    render: (p) =>
      `The intake does not address ${renderPlain(p.field, "this intake area")}; this must be confirmed rather than asserted.`,
  },
  // Information-needed generic fallback.
  "information.needed": {
    params: [],
    render: () =>
      `We could not verify this item from the information provided; it is listed under information needed.`,
  },
  // Insufficient basis to state a scope conclusion or top-of-report reason.
  "insufficient.basis.reason": {
    params: [],
    render: () =>
      `The information provided does not resolve this question; the missing intake dimensions are listed under information needed.`,
  },
  // Insufficient basis to state a top action.
  "insufficient.basis.top_action": {
    params: [],
    render: () =>
      `Insufficient information to state a top action for this system.`,
  },
  // Unresolved authority — a specific citation could not be verified in
  // the source registry. NEVER fabricates a citation.
  "unresolved.authority": {
    params: [],
    render: () =>
      `The applicable authority is not verified in our source registry; a specific citation is not provided here.`,
  },
  // Reconciliation — an aggregate claim inside a report contradicts the
  // intake and must be reconciled by the customer.
  "reconciliation.required": {
    params: ["field"],
    render: (p) =>
      `The intake on ${renderPlain(p.field, "this intake area")} does not support this statement; it must be reconciled before use.`,
  },
});

/** Render a catalog message. Unknown IDs return the information-needed
 *  generic. Any throw returns the information-needed generic. NEVER
 *  throws. */
export function renderMessage(
  id: string,
  params: MessageParams = {},
): string {
  try {
    const entry = CUSTOMER_MESSAGES[id];
    if (!entry) return CUSTOMER_MESSAGES["information.needed"].render({});
    return entry.render(params);
  } catch {
    return CUSTOMER_MESSAGES["information.needed"].render({});
  }
}

// Sugar constructors used at guard sites.
export const P = {
  field: (value: string): MessageParam => ({ kind: "field", value }),
  verbatim: (value: string): MessageParam => ({ kind: "verbatim", value }),
  plain: (value: string): MessageParam => ({ kind: "plain", value }),
};
