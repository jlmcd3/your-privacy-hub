// ITEM SO-8 — REGISTRATION ASSESSMENT SLOT MAP (step 0, verified before encode).
//
// Every slot and conditional trigger in the byte-pinned governing v3 skeleton
// (`DPA_AI_Act_Registration_Assessment_Skeleton_v3.docx`, Aug-10 copy), bound
// to a LIVE source: an intake key as persisted in `registration_assessments.
// intake_data`, or a leaf of a typed surface on the LIVE persisted report
// shape (`result_summary`). A slot without a live source is a STOP condition.
//
// STOP HISTORY (2026-08-10): step 0 halted on TWO slots —
// `{dataTypes - reader labels}` and the `{dataBrokerDetail}` trigger. The CEO
// resolved BOTH BY BINDING on 2026-08-10; the skeleton's wording at ¶5 and ¶9
// is unchanged and no text surgery was performed:
//   * `{dataTypes}` binds to the four live category booleans, which together
//     function as a multi-select over data-category presence. Base label
//     "personal data"; append "special categories of data",
//     "children's data" and "biometric identifiers used for identification"
//     for each flag that is true; join as serial-comma prose behind
//     "including". Where none of the three specific flags is true, render
//     "personal data" alone — never an empty "including" clause.
//   * `{dataBrokerDetail}` binds its TRIGGER to `acts_as_data_broker`. Once
//     fired, the conditional's content draws on the live broker cluster
//     (`sells_or_licenses_brokered_data`,
//     `collects_data_not_directly_from_individuals`, the count and
//     revenue-share fields, and the claimed exemption), each attributed.
//
// HONEST PERMANENT ORPHAN: `cross_border_transfers` is collected and is NOT
// consumed by any slot. That is correct output for this product (item413) and
// is left visible and untouched.

export type RegistrationSlotSourceKind = "intake" | "typed-surface" | "composed";

export type RegistrationSlotRender =
  | "verbatim"
  | "label-map"
  | "list-as-prose"
  | "derived-label-set"
  | "conditional-trigger";

export interface RegistrationSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: RegistrationSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: RegistrationSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
}

export const REGISTRATION_SLOT_MAP: readonly RegistrationSlotBinding[] = [
  { slot: "organizationName", kind: "intake", source: "organization_name", render: "verbatim",
    absent: "\"the organisation\" — the form gates submit on it, so this is a defensive branch" },
  { slot: "sector", kind: "intake", source: "industry", render: "verbatim",
    absent: "the clause is dropped; CEO ruling — rendered as the reader gave it, never case-folded" },
  { slot: "orgSize", kind: "intake", source: "organization_size", render: "label-map",
    absent: "the clause is dropped; no band is inferred" },
  { slot: "jurisdictions", kind: "composed", source: "organization_country + markets_served",
    render: "list-as-prose",
    absent: "the sentence is dropped; the markets are never assumed" },
  { slot: "dataTypes", kind: "composed",
    source: "processes_personal_data + processes_special_categories + processes_children_data + processes_biometrics_for_id",
    render: "derived-label-set",
    absent: "the sentence is dropped where the record does not state that personal data is processed" },
  { slot: "dataBrokerDetail", kind: "intake", source: "acts_as_data_broker",
    render: "conditional-trigger",
    absent: "trigger false — the conditional renders its honest single sentence that no broker duty attaches on the company's answers" },
];

/** Conditional triggers carried by the skeleton, each bound to a live answer. */
export const REGISTRATION_CONDITIONAL_TRIGGERS: readonly {
  readonly id: string;
  readonly source: string;
}[] = [
  {
    id: "DATA_BROKER",
    source:
      "acts_as_data_broker === true (content from sells_or_licenses_brokered_data, collects_data_not_directly_from_individuals, brokered_data_individual_count, brokered_data_revenue_share_pct, data_broker_exemption_claimed)",
  },
];

/** Reader phrasing for the recorded size band (ORG_SIZES labels, lower-cased). */
export const REGISTRATION_ORG_SIZE_MAP: Record<string, string> = {
  micro: "micro (1\u20139 employees)",
  small: "small (10\u201349 employees)",
  medium: "medium (50\u2013249 employees)",
  large: "large (250\u2013999 employees)",
  enterprise: "enterprise (1,000+ employees)",
};

/** The derived data-category labels, in the CEO's ruled order. */
export const REGISTRATION_DATA_TYPE_LABELS = {
  base: "personal data",
  special: "special categories of data",
  children: "children's data",
  biometric: "biometric identifiers used for identification",
} as const;

/**
 * Reader names for the market codes the intake collects
 * (`JURISDICTION_OPTIONS.code` / `.name`, verbatim copies). A code with no
 * entry renders as the code itself — never guessed at.
 */
export const REGISTRATION_JURISDICTION_LABELS: Record<string, string> = {
  "AT": "Austria",
  "BE": "Belgium",
  "BG": "Bulgaria",
  "HR": "Croatia",
  "CY": "Cyprus",
  "CZ": "Czechia",
  "DK": "Denmark",
  "EE": "Estonia",
  "FI": "Finland",
  "FR": "France",
  "DE": "Germany",
  "GR": "Greece",
  "HU": "Hungary",
  "IE": "Ireland",
  "IT": "Italy",
  "LV": "Latvia",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "MT": "Malta",
  "NL": "Netherlands",
  "PL": "Poland",
  "PT": "Portugal",
  "RO": "Romania",
  "SK": "Slovakia",
  "SI": "Slovenia",
  "ES": "Spain",
  "SE": "Sweden",
  "NO": "Norway",
  "IS": "Iceland",
  "LI": "Liechtenstein",
  "UK": "United Kingdom",
  "GB": "United Kingdom",
  "CH": "Switzerland",
  "US": "United States (federal / nationwide)",
  "US-CA": "California (US)",
  "US-CO": "Colorado (US)",
  "US-CT": "Connecticut (US)",
  "US-IL": "Illinois (US \u2014 BIPA)",
  "US-OR": "Oregon (US)",
  "US-TX": "Texas (US)",
  "US-UT": "Utah (US)",
  "US-VA": "Virginia (US)",
  "US-VT": "Vermont (US)",
  "US-WA": "Washington (US \u2014 My Health My Data)",
  "CA": "Canada (federal)",
  "CA-QC": "Quebec (Canada)",
  "BR": "Brazil",
  "AR": "Argentina",
  "MX": "Mexico",
  "SG": "Singapore",
  "JP": "Japan",
  "KR": "South Korea",
  "AU": "Australia",
  "NZ": "New Zealand",
  "IN": "India",
  "AE": "UAE",
  "SA": "Saudi Arabia",
  "IL": "Israel",
  "ZA": "South Africa",
  "NG": "Nigeria",
  "KE": "Kenya",
};
