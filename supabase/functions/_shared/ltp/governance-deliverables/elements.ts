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
