/**
 * ITEM 313 — registry resolution + closed lexicons for the governance
 * deliverables.
 *
 * REUSE LAW: every statutory string used by the builder comes from the
 * verified-authority registries, whose rows are pinned by exact substring to
 * the approved corpus (public.gdpr_articles, jurisdiction 'eu', Arts. 5, 24,
 * 30, 37, 38, 39). NOTHING is re-typed here.
 */
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "../../registry/governance-verified-authorities.ts";
import { GOVERNANCE_ACCOUNTABILITY_AUTHORITIES } from "../../registry/governance-accountability-authorities.ts";
import { requireVerified } from "../../verified-authority-resolver.ts";

const MERGED = {
  ...GOVERNANCE_VERIFIED_AUTHORITIES,
  ...GOVERNANCE_ACCOUNTABILITY_AUTHORITIES,
};

/** Resolve a governance registry row, or null when the key is absent. */
export function row(key: string) {
  try {
    return requireVerified(MERGED, key);
  } catch {
    return null;
  }
}

/** Proposition keys this module is allowed to cite. */
export const ANCHOR_KEYS = {
  accountability: "accountability_demonstrate_compliance",
  appropriateness: "art_24_1_appropriate_measures",
  review: "art_24_1_review_and_update",
  policies: "art_24_2_data_protection_policies",
  codes: "art_24_3_codes_and_certification",
  art30_duty: "art_30_1_record_duty",
  art30_a: "art_30_1_a_controller_contact",
  art30_b: "art_30_1_b_purposes",
  art30_c: "art_30_1_c_categories",
  art30_d: "art_30_1_d_recipients",
  art30_e: "art_30_1_e_transfers",
  art30_f: "art_30_1_f_retention",
  art30_g: "art_30_1_g_security_measures",
  art30_writing: "art_30_3_in_writing",
  art30_available: "art_30_4_available_to_sa",
  art30_exemption: "art_30_5_small_enterprise_exemption",
  dpo_trigger: "art_37_1_designation_trigger",
  dpo_trigger_a: "art_37_1_a_public_authority",
  dpo_trigger_b: "art_37_1_b_regular_systematic_monitoring",
  dpo_trigger_c: "art_37_1_c_large_scale_special_category",
  dpo_qualities: "art_37_5_professional_qualities",
  dpo_publish: "art_37_7_publish_contact_details",
  dpo_involvement: "art_38_1_timely_involvement",
  dpo_resources: "art_38_2_resources_and_access",
  dpo_independence: "art_38_3_independence",
  dpo_conflict: "art_38_6_conflict_of_interests",
  dpo_tasks: "art_39_1_dpo_tasks",
  dpo_task_a: "art_39_1_a_inform_and_advise",
  dpo_task_b: "art_39_1_b_monitor_compliance",
  dpo_task_c: "art_39_1_c_dpia_advice",
  dpo_task_d: "art_39_1_d_cooperate_with_sa",
  dpo_task_e: "art_39_1_e_contact_point",
  dpo_risk_based: "art_39_2_risk_based_tasks",

  // ── Chapter V — EU transfer rail ──────────────────────────────────
  eu_transfers_principle: "transfers_general_principle",
  eu_transfers_safeguards: "transfers_appropriate_safeguards",
  eu_transfers_sccs: "transfers_scc_mechanism",
  eu_transfers_bcrs: "transfers_bcr_mechanism",

  // ── ITEM 327 — Chapter V UK transfer rail ─────────────────────────
  uk_art44_omitted: "uk_art_44_not_in_force",
  uk_transfers_principle: "uk_transfers_general_principle",
  uk_transfers_adequacy_route: "uk_transfers_adequacy_route",
  uk_transfers_safeguards_route: "uk_transfers_safeguards_route",
  uk_transfers_art49a: "uk_transfers_art_49a_restriction",
  uk_adequacy_power: "uk_adequacy_regulations_power",
  uk_adequacy_test: "uk_adequacy_data_protection_test",
  uk_adequacy_factors: "uk_adequacy_test_factors",
  uk_transfers_safeguards: "uk_transfers_appropriate_safeguards",
  uk_transfers_own_assessment: "uk_transfers_exporter_own_assessment",
  uk_transfers_sos_clauses: "uk_transfers_sos_clauses",
  uk_transfers_ico_clauses: "uk_transfers_commissioner_clauses",
  uk_transfers_bcrs: "uk_transfers_bcr_mechanism",
  uk_transfers_test: "uk_transfers_data_protection_test",
  uk_transfers_proportionate: "uk_transfers_reasonable_and_proportionate",
  uk_bcr_approval: "uk_bcr_commissioner_approval",
  uk_sos_clauses_power: "uk_standard_clauses_secretary_of_state",
} as const;


export type AnchorKey = keyof typeof ANCHOR_KEYS;

export interface Anchor {
  citation: string;
  verbatim: string;
}

export function anchor(key: AnchorKey, fallbackCitation: string): Anchor {
  const r = row(ANCHOR_KEYS[key]);
  return {
    citation: r?.subsection || r?.citation || fallbackCitation,
    verbatim: r?.verbatim_quote ?? "",
  };
}

/** Art. 30(1) element definitions — deterministic walk order. */
export const ART30_ELEMENTS: ReadonlyArray<{
  element: "a" | "b" | "c" | "d" | "e" | "f" | "g";
  anchorKey: AnchorKey;
  label: string;
  /** Intake keys whose content, if present, evidences the element. */
  evidence_keys: readonly string[];
}> = [
  { element: "a", anchorKey: "art30_a", label: "Controller / representative / DPO contact details", evidence_keys: ["organization_name", "dpo_status"] },
  { element: "b", anchorKey: "art30_b", label: "Purposes of the processing", evidence_keys: ["processing_purposes"] },
  { element: "c", anchorKey: "art30_c", label: "Categories of data subjects and of personal data", evidence_keys: ["data_categories", "special_categories_list"] },
  { element: "d", anchorKey: "art30_d", label: "Categories of recipients", evidence_keys: ["tools"] },
  { element: "e", anchorKey: "art30_e", label: "Third-country transfers and safeguards", evidence_keys: ["transfer_status", "transfer_mechanism"] },
  { element: "f", anchorKey: "art30_f", label: "Envisaged retention time limits", evidence_keys: ["retention_schedule_status"] },
  { element: "g", anchorKey: "art30_g", label: "General description of security measures", evidence_keys: ["technical_controls", "technical_controls_list"] },
];

/** Accountability duties mapped to the artifact that evidences them. */
export const DEMONSTRABILITY_DUTIES: ReadonlyArray<{
  key: string;
  duty: string;
  artifact: string;
  anchorKey: AnchorKey;
  intake_key: string;
  /** Values of the intake key that show the artifact exists. */
  present: readonly string[];
  partial: readonly string[];
}> = [
  {
    key: "transparency_notice",
    duty: "Maintaining a transparent, current privacy notice",
    artifact: "The dated privacy notice, with its review record and version history",
    anchorKey: "policies",
    intake_key: "privacy_policy",
    present: ["Yes, current (reviewed in last 12 months)"],
    partial: ["Yes, but outdated"],
  },
  {
    key: "record_of_processing",
    duty: "Maintaining a record of processing activities",
    artifact: "The Article 30 record itself, in writing and producible to the supervisory authority on request",
    anchorKey: "art30_available",
    intake_key: "inventory_audit",
    present: ["Yes — audited + formal approval process"],
    partial: ["Inventory exists, no formal audit/approval"],
  },
  {
    key: "dpia_programme",
    duty: "Assessing high-risk processing before it begins",
    artifact: "Completed DPIA files, with the sign-off and the residual-risk conclusion for each high-risk activity",
    anchorKey: "appropriateness",
    intake_key: "dpia_status",
    present: ["Yes, multiple DPIAs completed"],
    partial: ["Yes, one DPIA completed"],
  },
  {
    key: "training",
    duty: "Ensuring staff who process personal data are instructed and trained",
    artifact: "Training completion records by role, with dates and content version",
    anchorKey: "policies",
    intake_key: "training_status",
    present: ["Yes, formal onboarding + annual refresh"],
    partial: ["Yes, onboarding only"],
  },
  {
    key: "processor_contracts",
    duty: "Engaging processors only under a written contract",
    artifact: "Executed data processing agreements for each vendor, with the Article 28 clause review",
    anchorKey: "appropriateness",
    intake_key: "dpa_status",
    present: ["Yes, all vendors"],
    partial: ["Most vendors", "Some vendors"],
  },
  {
    key: "security_measures",
    duty: "Implementing appropriate technical and organisational security measures",
    artifact: "The control inventory with configuration evidence and the most recent effectiveness test",
    anchorKey: "art30_g",
    intake_key: "technical_controls",
    present: ["Yes — DLP/content filtering actively enforced"],
    partial: ["Partial — some tools or categories"],
  },
  {
    key: "incident_response",
    duty: "Being able to detect, record and notify personal data breaches",
    artifact: "The incident-response plan plus the breach register and the most recent test report",
    anchorKey: "appropriateness",
    intake_key: "incident_response",
    present: ["Yes, tested in last 12 months"],
    partial: ["Yes, but not tested", "Documented but informal"],
  },
  {
    key: "data_subject_rights",
    duty: "Being able to give effect to data-subject rights within the statutory period",
    artifact: "The rights-request log with response times, and evidence the process was tested end to end across vendors",
    anchorKey: "appropriateness",
    intake_key: "dsr_capability",
    present: ["Yes — documented and tested across all vendors"],
    partial: ["Documented but not tested"],
  },
];

/** Org sizes below the Art. 30(5) 250-person threshold. */
export const UNDER_250_SIZES: readonly string[] = ["1-10", "11-50", "51-250"];

/** Sectors treated as public authority or body for Art. 37(1)(a). */
export const PUBLIC_AUTHORITY_SECTORS: readonly string[] = [
  "Government/public sector",
];

/** Org sizes at which processing is argued to reach large scale. */
export const LARGE_SCALE_SIZES: readonly string[] = ["251-1000", "1001+"];

/** Review cadences that satisfy the Art. 24(1) second sentence on their face. */
export const ADEQUATE_CADENCES: readonly string[] = [
  "Annually or more often",
  "Every 1–2 years",
];

export const RECORD_INSUFFICIENT = "record_insufficient" as const;

// ─────────────────────────────────────────────────────────────────────
// ITEM 327 — Chapter V jurisdiction + mechanism lexicons.
//
// Closed lexicons only: every string below is an exact option value from
// `_shared/intake-contracts/governance-assessment.ts` (GOV_JURISDICTIONS,
// TRANSFER_STATUS, TRANSFER_MECHANISM). No fuzzy matching, no semantic
// defaults — an unrecognised value degrades, it never guesses a regime.
// ─────────────────────────────────────────────────────────────────────

export const EU_JURISDICTION = "EU (GDPR)";
export const UK_JURISDICTION = "United Kingdom (UK GDPR)";

/** transfer_status values that put a restricted transfer on the record. */
export const TRANSFER_OCCURRING: readonly string[] = [
  "Yes, US-based tools",
  "Yes, other non-adequate countries",
];
/** transfer_status value that records no restricted transfer. */
export const TRANSFER_NOT_OCCURRING: readonly string[] = [
  "All tools store data in EU/UK",
];

export type TransferRegime = "eu" | "uk" | "dual" | "not_engaged";

/**
 * Which regime a recorded transfer_mechanism belongs to.
 *   uk   — the mechanism exists only under UK Chapter V.
 *   eu   — the mechanism exists only under EU Chapter V.
 *   both — the label is regime-neutral on its face (BCRs; bare "Adequacy
 *          decision"); the governing rail is fixed by the jurisdictions.
 */
export const MECHANISM_REGIME: Readonly<Record<string, "uk" | "eu" | "both">> = {
  "UK IDTA": "uk",
  "UK Addendum to EU SCCs": "uk",
  "UK adequacy regulations": "uk",
  "UK IDTA / Addendum": "uk",
  "EU Standard Contractual Clauses (SCCs)": "eu",
  "EU SCCs": "eu",
  "Adequacy decision": "eu",
  "Binding Corporate Rules": "both",
  "Adequacy decision/regulations": "both",
};

/** Mechanisms that are Art. 46-family safeguards rather than adequacy. */
export const SAFEGUARD_MECHANISMS: readonly string[] = [
  "UK IDTA",
  "UK Addendum to EU SCCs",
  "UK IDTA / Addendum",
  "EU Standard Contractual Clauses (SCCs)",
  "EU SCCs",
  "Binding Corporate Rules",
];
/** Mechanisms that are an adequacy route rather than an Art. 46 safeguard. */
export const ADEQUACY_MECHANISMS: readonly string[] = [
  "UK adequacy regulations",
  "Adequacy decision",
  "Adequacy decision/regulations",
];

// ─────────────────────────────────────────────────────────────────────
// GOVERNANCE UPGRADE (product 5) — ICO Data Protection Audit Framework
// tracker metadata.
//
// TEMPLATE-GUIDANCE LAW: the framework supplies the SHAPE of the tracker
// record (control question, regulator expectation, evidence reviewed,
// remediation). It is never asserted as corpus authority, never cited as
// law, and never quoted. The legal standard in every finding continues to
// come from the pinned statutory registries above.
// ─────────────────────────────────────────────────────────────────────
import type { GovernanceDomain } from "./types.ts";

export const ICO_FRAMEWORK_LABEL = "ICO Data Protection Audit Framework (Oct 2024)";
export const ICO_FRAMEWORK_URL =
  "https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/";

export const DOMAIN_LABELS: Record<GovernanceDomain, string> = {
  accountability: "Accountability and governance",
  demonstrability: "Evidence of compliance",
  records_of_processing: "Records of processing activities",
  dpo: "Data protection officer",
  risk_calibration: "Risk calibration of measures",
  review_and_update: "Review and update of measures",
  international_transfers: "International transfers",
};

/** Per-domain toolkit reference and the expectation an auditor tests against. */
export const DOMAIN_TRACKER: Record<
  GovernanceDomain,
  { toolkit: string; regulator_expectation: string }
> = {
  accountability: {
    toolkit: "Accountability and governance toolkit",
    regulator_expectation:
      "An auditor expects a single, owned governance framework whose outputs can be produced on request, rather than a set of practices that exist only in the knowledge of individuals.",
  },
  demonstrability: {
    toolkit: "Accountability and governance toolkit — evidence tracker",
    regulator_expectation:
      "An auditor expects each accountability duty to be tied to a dated artifact that can be retrieved and shown, not to an assurance that the duty is met.",
  },
  records_of_processing: {
    toolkit: "Records management and security toolkit — ROPA tracker",
    regulator_expectation:
      "An auditor expects a written record covering every mandatory element for every processing activity, kept current and producible to the supervisory authority.",
  },
  dpo: {
    toolkit: "Accountability and governance toolkit — DPO tracker",
    regulator_expectation:
      "An auditor expects the designation decision, the reporting line, the resourcing and the conflict-of-interests position to be documented, not inferred from a job title.",
  },
  risk_calibration: {
    toolkit: "Risk and DPIA toolkit",
    regulator_expectation:
      "An auditor expects the measure set to be justified against the recorded nature, scope, context and purposes of the processing, so that proportionality can be tested rather than asserted.",
  },
  review_and_update: {
    toolkit: "Accountability and governance toolkit — review tracker",
    regulator_expectation:
      "An auditor expects a defined review cycle with executed reviews on file, and evidence that the reviews produced changes where the processing changed.",
  },
  international_transfers: {
    toolkit: "International transfers toolkit",
    regulator_expectation:
      "An auditor expects each transfer route to be mapped to a named mechanism belonging to the chapter that actually governs it, with the underlying assessment on file.",
  },
};

/**
 * The specific control question each non-Art. 30, non-duty finding tests.
 * Keyed on the finding key emitted by the builder.
 */
export const CONTROL_QUESTIONS: Record<string, string> = {
  accountability_determination:
    "Can the organisation demonstrate, from artifacts it holds today, that its processing complies with the Regulation and that its measures are appropriate to its risk?",
  art30_5_exemption:
    "Does the organisation qualify for the small-enterprise exemption from the record duty, and has each defeating condition been tested?",
  dpo_designation_trigger:
    "Has the organisation tested whether designation of a data protection officer is mandatory, independently of whether one has been appointed?",
  dpo_position_independence:
    "Is the officer involved in good time, resourced, reporting to the highest management level, free from instructions, and free of conflicting duties?",
  dpo_task_coverage:
    "Which of the statutory officer tasks are actually performed, and how is that recorded?",
  risk_calibration:
    "Are the technical and organisational measures calibrated to the recorded nature, scope, context and purposes of the processing?",
  review_and_update:
    "Are the measures reviewed on a defined cycle, and has the most recent review actually been carried out?",
  chapter_v_transfers:
    "Is every cross-border transfer covered by a mechanism belonging to the chapter that governs it, with the required assessment on file?",
};

/** The remediation priority menu offered on intake. */
export const REMEDIATION_PRIORITIES: readonly string[] = [
  "Critical — remediate now",
  "High — remediate this quarter",
  "Medium — remediate this year",
  "Low — monitor",
];

/** The standard validation-method menu offered on intake. */
export const VALIDATION_METHODS: readonly string[] = [
  "Documentary evidence review",
  "Control re-test by a second reviewer",
  "Internal audit sample",
  "External audit or assurance report",
  "Management sign-off against the artifact",
];

/** Applied when the record names no validation method for an adverse finding. */
export const DEFAULT_VALIDATION_METHOD = "Documentary evidence review";

/** Control question per accountability duty (DEMONSTRABILITY_DUTIES key). */
export const DUTY_CONTROL_QUESTIONS: Record<string, string> = {
  transparency_notice:
    "Is there a dated privacy notice covering current processing, and can its review history be produced?",
  record_of_processing:
    "Is the record of processing activities maintained, approved, and producible to the supervisory authority?",
  dpia_programme:
    "Has every high-risk processing activity been assessed before it began, with the residual-risk conclusion signed off?",
  training:
    "Can training completion be evidenced by role, with dates and the version of the content delivered?",
  processor_contracts:
    "Is every processor engaged under a written contract, and have those contracts been reviewed against the mandatory clauses?",
  security_measures:
    "Is the control inventory evidenced by configuration records and a recent effectiveness test?",
  incident_response:
    "Can the organisation evidence its ability to detect, record and notify a personal data breach within the statutory period?",
  data_subject_rights:
    "Has the rights-request process been tested end to end across vendors, with response times recorded?",
};

/** Control question per Art. 30(1) element letter. */
export const ART30_CONTROL_QUESTIONS: Record<string, string> = {
  a: "Does the record name the controller, any representative, and the data protection officer, with contact details?",
  b: "Does the record state the purposes of each processing activity in its own terms?",
  c: "Does the record describe the categories of data subjects and of personal data?",
  d: "Does the record list the categories of recipients to whom personal data has been or will be disclosed?",
  e: "Does the record identify third-country transfers and the safeguards relied on?",
  f: "Does the record state the envisaged time limits for erasure of each category?",
  g: "Does the record give a general description of the technical and organisational security measures?",
};
