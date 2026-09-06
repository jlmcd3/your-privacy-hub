// DOC 189 (2026-09-05, CEO-approved attribute set) — LIA RELEVANCE PROFILES.
//
// One CamRelevanceProfile per AP row of lia-corpus-map.ts, keyed by row id
// and authored at curation time from the source row's facts and the row's
// curation_note (the same facts the display block and citation_source were
// transcribed from). Sibling rows on the same source carry the same profile
// — the profile is a fact about the AUTHORITY, and `factor_ids` is
// multi-valued precisely so one profile covers what the map splits across
// sibling rows (dedupe by source_row_id happens in the scorer).
//
// Kept as a sidecar rather than inline on each row so the 1,500-line map's
// ratified display bytes are not touched by an attribute pass; the scorer
// (`_shared/corpus/cam-relevance.ts`) resolves a row's profile through
// `liaProfileOf(row)`, which prefers an inline `relevance_profile` where a
// future row carries one. The invariant test (doc189-lia-relevance.test.ts)
// requires EVERY AP row to have a profile, so a new AP row without one
// fails the battery instead of silently never ranking.
//
// WHAT RENDERS: only render-eligible AP rows (four today) reach the customer;
// the thirty-nine dark rows' profiles carry no customer-facing effect until the
// CEO ratifies their display blocks, at which point the profile is reviewed
// with the display. Fields the curation note does not establish are null /
// empty (a null class scores nothing — it never mis-scores).
//
// VOCABULARIES: factor_ids = the LIA 11-factor labels (LIA_FACTOR_VOCABULARY);
// use_case_class = lia-use-case-classifier.ts classes; data_categories =
// src/pages/LIAssessment.enums.ts DATA_CATEGORIES; relationship = the
// CamRelevanceProfile enum. instrument: every LIA authority in the corpus
// today was decided under the EU GDPR — the UK GDPR pool is empty (doc 189
// §2.3(b); ingestion commissioned, doc 189 §5).

import type { CamRelevanceProfile, CamRow } from "../../../../_shared/corpus/cam-types.ts";

export const LIA_RELEVANCE_PROFILES_VERSION = "lia-relevance-profiles-v1-2026-09-05";

// Factor labels (LIA_FACTOR_VOCABULARY, verbatim).
const F_INTEREST = "Interest legitimacy";
const F_THIRD_PARTY = "Third-party interests";
const F_NECESSITY = "Necessity and less-intrusive means";
const F_BALANCING = "Balancing of interests, rights and freedoms";
const F_EXPECTATIONS = "Reasonable expectations of the data subject";
const F_RELATIONSHIP = "Relationship with the individual";
const F_HARMS = "Potential harms and severity";
const F_SAFEGUARDS = "Safeguards and mitigations";
const F_CHILDREN = "Children's data";
const F_EPRIVACY = "Special-category and ePrivacy interplay";

const EU = "EU GDPR" as const;

// ── One profile per SOURCE (shared by sibling rows) ──────────────────────────

const LINKEDIN_2024: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_BALANCING, F_INTEREST, F_EXPECTATIONS],
  use_case_class: "behavioral_advertising", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Browsing/behavioural data", "Device/technical data", "Contact data"],
  flags: ["large_scale"],
};

const CEGEDIM_2024: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_NECESSITY, F_EPRIVACY],
  use_case_class: "research_analytics", outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Health or medical data", "Special category data"],
  flags: ["special_category", "large_scale"],
};

const GSMA_2024: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_INTEREST, F_THIRD_PARTY, F_NECESSITY],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Health or medical data", "Special category data"],
  flags: ["special_category"],
};

const CAMARA_2022: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_HARMS, F_RELATIONSHIP],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Contact data"],
  flags: ["large_scale"],
};

const AMAZON_FRANCE_2023: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_RELATIONSHIP, F_HARMS, F_NECESSITY, F_BALANCING],
  use_case_class: "employee_monitoring", outcome_posture: "rejected",
  relationship: "employee",
  data_categories: ["Employment data", "Location data", "Device/technical data"],
  flags: ["large_scale"],
};

const KASPR_2024: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_INTEREST],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "prospect",
  data_categories: ["Contact data", "Employment data"],
  flags: ["large_scale"],
};

const META_INSTAGRAM_2022: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_INTEREST, F_BALANCING],
  use_case_class: "behavioral_advertising", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Browsing/behavioural data", "Device/technical data"],
  flags: ["large_scale"],
};

const CLEARVIEW_2022: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_INTEREST, F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Biometric data", "Special category data"],
  flags: ["special_category", "large_scale"],
};

const CRITEO_2023: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EPRIVACY, F_INTEREST, F_EXPECTATIONS],
  use_case_class: "behavioral_advertising", outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Browsing/behavioural data", "Device/technical data"],
  flags: ["eprivacy_terminal_equipment", "large_scale"],
};

const DIARIO_ABC_2023: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_HARMS, F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Other"],
  flags: [],
};

const EUROPA_PRESS_2023: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_EPRIVACY, F_INTEREST],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Special category data", "Health or medical data"],
  flags: ["special_category"],
};

const ARRENDAMIENTOS_DEUDORES_2024: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_NECESSITY, F_INTEREST],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Financial data", "Contact data"],
  flags: [],
};

const ACCOR_2022: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_SAFEGUARDS],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Contact data", "Purchase/transaction history"],
  flags: ["electronic_marketing"],
};

// Spanish-language source; the curation note establishes the factor bearing
// and the fine, not the use case or the relationship — left null.
const HIGHCLIFFE_2026: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_HARMS, F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: null,
  data_categories: ["Contact data"],
  flags: [],
};

const CAMERDATA_2022: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_INTEREST, F_EXPECTATIONS],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "prospect",
  data_categories: ["Contact data"],
  flags: ["large_scale"],
};

const SILVANERGIA_2023: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_SAFEGUARDS, F_RELATIONSHIP],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "prospect",
  data_categories: ["Contact data"],
  flags: ["electronic_marketing"],
};

// Romanian-language source; only the balancing bearing is established.
const GRUPEX_2022: CamRelevanceProfile = {
  country: "RO", instrument: EU,
  factor_ids: [F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: null,
  data_categories: ["Other"],
  flags: [],
};

// The Calderería / CYNGASA pair: one complainant's data disclosed between two
// companies. The note establishes the disclosure, not the complainant's
// relationship to either — left null.
const CALDERERIA_2021: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_INTEREST],
  use_case_class: null, outcome_posture: "rejected",
  relationship: null,
  data_categories: ["Contact data"],
  flags: [],
};

const CYNGASA_2021: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_RELATIONSHIP],
  use_case_class: null, outcome_posture: "rejected",
  relationship: null,
  data_categories: ["Contact data"],
  flags: [],
};

const VAMAVI_2021: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_RELATIONSHIP],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "prospect",
  data_categories: ["Contact data"],
  flags: ["electronic_marketing"],
};

const AVATA_HISPANIA_2020: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_RELATIONSHIP, F_INTEREST],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Contact data"],
  flags: [],
};

const VENU_SANZ_2020: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_EPRIVACY, F_INTEREST],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Contact data"],
  flags: ["electronic_marketing"],
};

const VODAFONE_2020: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_INTEREST, F_SAFEGUARDS],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Contact data", "Other"],
  flags: [],
};

// The three DPC Airbnb identity-verification inquiries: the interest in
// verifying hosts and guests was accepted, the retention and extent of the
// identity documents were not — conditional.
const AIRBNB_2023_09_28: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_NECESSITY, F_SAFEGUARDS],
  use_case_class: "fraud_prevention", outcome_posture: "conditional",
  relationship: "customer",
  data_categories: ["Other", "Contact data"],
  flags: [],
};

const AIRBNB_2023_09_14: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_INTEREST, F_NECESSITY],
  use_case_class: "fraud_prevention", outcome_posture: "conditional",
  relationship: "customer",
  data_categories: ["Other", "Contact data"],
  flags: [],
};

const AIRBNB_2022: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_BALANCING, F_NECESSITY],
  use_case_class: "fraud_prevention", outcome_posture: "conditional",
  relationship: "customer",
  data_categories: ["Other", "Contact data"],
  flags: [],
};

const ARCHBISHOP_DUBLIN_2023: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_SAFEGUARDS, F_BALANCING],
  use_case_class: null, outcome_posture: "accepted",
  relationship: "public",
  data_categories: ["Other"],
  flags: [],
};

const CLEARVIEW_2021: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EXPECTATIONS, F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Biometric data", "Special category data"],
  flags: ["special_category", "large_scale"],
};

const MONSANTO_2021: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_BALANCING, F_EXPECTATIONS],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Other", "Contact data"],
  flags: [],
};

const WHATSAPP_2021: CamRelevanceProfile = {
  country: "IE", instrument: EU,
  factor_ids: [F_INTEREST, F_BALANCING],
  use_case_class: null, outcome_posture: "rejected",
  relationship: "public",
  data_categories: ["Contact data", "Communications data"],
  flags: ["large_scale"],
};

const NESTOR_2020: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_EPRIVACY, F_RELATIONSHIP],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "prospect",
  data_categories: ["Contact data"],
  flags: ["electronic_marketing"],
};

const SPARTOO_2020: CamRelevanceProfile = {
  country: "FR", instrument: EU,
  factor_ids: [F_INTEREST, F_NECESSITY],
  use_case_class: "contractual_administration", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Communications data", "Financial data"],
  flags: [],
};

const CLICKQUICKNOW_2019: CamRelevanceProfile = {
  country: "PL", instrument: EU,
  factor_ids: [F_RELATIONSHIP, F_INTEREST],
  use_case_class: "direct_marketing", outcome_posture: "rejected",
  relationship: "customer",
  data_categories: ["Contact data"],
  flags: ["electronic_marketing"],
};

// The map records the decision under the EU GDPR; the row's own facts beyond
// the interest-legitimacy bearing are not established by the note — left null.
const AMADEUS_2016: CamRelevanceProfile = {
  country: "ES", instrument: EU,
  factor_ids: [F_INTEREST],
  use_case_class: null, outcome_posture: "conditional",
  relationship: "customer",
  data_categories: ["Other"],
  flags: [],
};

// ── Row id → profile ─────────────────────────────────────────────────────────

export const LIA_RELEVANCE_PROFILES: Readonly<Record<string, CamRelevanceProfile>> = {
  // Doc 63 §6.1 release-1 set (the four live rows and their sibling tags)
  "lia/f04-balancing/ap-01": LINKEDIN_2024,
  "lia/f01-interest-legitimacy/ap-01": LINKEDIN_2024,
  "lia/f03-necessity/ap-01": CEGEDIM_2024,
  "lia/f11-eprivacy/ap-01": CEGEDIM_2024,
  "lia/f01-interest-legitimacy/ap-02": GSMA_2024,
  "lia/f02-third-party-interests/ap-01": GSMA_2024,
  "lia/f05-reasonable-expectations/ap-01": CAMARA_2022,
  "lia/f07-harms/ap-01": CAMARA_2022,
  // Doc 73 §4 R2 precedent-class authority + §2.1 exemplar
  "lia/f06-relationship/ap-01": AMAZON_FRANCE_2023,
  "lia/f07-harms/ap-02": AMAZON_FRANCE_2023,
  "lia/f05-reasonable-expectations/ap-02": KASPR_2024,
  // v5 watch rows
  "lia/f01-interest-legitimacy/ap-w5-01": META_INSTAGRAM_2022,
  "lia/f05-expectations/ap-w5-02": CLEARVIEW_2022,
  "lia/f11-eprivacy/ap-w5-03": CRITEO_2023,
  "lia/f07-harms/ap-w5-04": DIARIO_ABC_2023,
  "lia/f11-eprivacy/ap-w5-05": EUROPA_PRESS_2023,
  "lia/f03-necessity/ap-w5-06": ARRENDAMIENTOS_DEUDORES_2024,
  "lia/f05-expectations/ap-w5-07": ACCOR_2022,
  "lia/f07-harms/ap-w5-08": HIGHCLIFFE_2026,
  "lia/f01-interest-legitimacy/ap-w5-09": CAMERDATA_2022,
  "lia/f08-safeguards/ap-w5-10": SILVANERGIA_2023,
  "lia/f04-balancing/ap-w5-11": GRUPEX_2022,
  "lia/f01-interest-legitimacy/ap-w5-12": CALDERERIA_2021,
  "lia/f06-relationship/ap-w5-13": CYNGASA_2021,
  "lia/f05-expectations/ap-w5-14": VAMAVI_2021,
  "lia/f06-relationship/ap-w5-15": AVATA_HISPANIA_2020,
  "lia/f11-eprivacy/ap-w5-16": VENU_SANZ_2020,
  "lia/f01-interest-legitimacy/ap-w5-17": VODAFONE_2020,
  // v5.1 excerpt-extraction rows
  "lia/f03-necessity/ap-w6-01": AIRBNB_2023_09_28,
  "lia/f01-interest-legitimacy/ap-w6-02": AIRBNB_2023_09_14,
  "lia/f08-safeguards/ap-w6-03": ARCHBISHOP_DUBLIN_2023,
  "lia/f04-balancing/ap-w6-04": AIRBNB_2022,
  "lia/f05-reasonable-expectations/ap-w6-05": CLEARVIEW_2021,
  "lia/f04-balancing/ap-w6-07": MONSANTO_2021,
  "lia/f01-interest-legitimacy/ap-w6-08": WHATSAPP_2021,
  "lia/f11-eprivacy/ap-w6-09": NESTOR_2020,
  "lia/f01-interest-legitimacy/ap-w6-10": SPARTOO_2020,
  "lia/f06-relationship/ap-w6-11": CLICKQUICKNOW_2019,
  "lia/f01-interest-legitimacy/ap-w6-12": AMADEUS_2016,
};

/** The LIA resolver: an inline profile wins; otherwise the sidecar by id. */
export function liaProfileOf(row: CamRow): CamRelevanceProfile | undefined {
  return row.relevance_profile ?? LIA_RELEVANCE_PROFILES[row.id];
}

/**
 * Factor → three-part-test element (doc 189 §2.3(c)). Gates and overlays
 * (special-category / ePrivacy; public authority is a gate too but its
 * factor sits with the purpose test's availability question) have no
 * element; their bearing travels through the flags.
 */
export const LIA_FACTOR_ELEMENT: Readonly<Record<string, "purpose" | "necessity" | "balancing">> = {
  [F_INTEREST]: "purpose",
  [F_THIRD_PARTY]: "purpose",
  "Public-authority exclusion": "purpose",
  [F_NECESSITY]: "necessity",
  [F_BALANCING]: "balancing",
  [F_EXPECTATIONS]: "balancing",
  [F_RELATIONSHIP]: "balancing",
  [F_HARMS]: "balancing",
  [F_SAFEGUARDS]: "balancing",
  [F_CHILDREN]: "balancing",
};

export function liaElementOf(factorId: string): "purpose" | "necessity" | "balancing" | null {
  return LIA_FACTOR_ELEMENT[factorId] ?? null;
}
