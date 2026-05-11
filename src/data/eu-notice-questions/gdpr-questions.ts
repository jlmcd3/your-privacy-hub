import type { Question } from "./types";

/**
 * GDPR Art.13-specific supplemental questions for EU_GDPR / UK_GDPR / CH_FADP.
 * Doc 4 Prompt 5.
 */
export const GDPR_ART13_QUESTIONS: Question[] = [
  {
    key: "gdpr_controller_representative",
    text:
      "If your organisation is not based in the EU/EEA, have you appointed an Article 27 EU representative?",
    whyWeAsk:
      "GDPR Art.27 requires non-EU/EEA controllers who process EU resident data to appoint a representative.",
    type: "yes_no_unsure",
    isRequired: false,
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "EU representative required — absence is an enforcement priority.",
        consequence: "All 27 EU DPAs plus the EDPB actively enforce Art.27 representative requirements.",
      },
    ],
  },
  {
    key: "gdpr_uk_representative",
    text:
      "If your organisation is not based in the UK, have you appointed a UK GDPR representative under Section 27 DPA 2018?",
    whyWeAsk: "UK GDPR Section 27 DPA 2018 mirrors the EU Art.27 requirement.",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["UK_GDPR"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "UK representative required for non-UK controllers.",
        consequence: "ICO actively enforces the Section 27 DPA 2018 representative requirement.",
      },
    ],
  },
  {
    key: "gdpr_dpo_mandatory",
    text: "Is your DPO appointment mandatory under GDPR Art.37, or voluntary?",
    whyWeAsk:
      "Notices for organisations with mandatory DPOs must identify the DPO contact. [GDPR Art.37]",
    type: "single_choice",
    isRequired: false,
    options: [
      { value: "mandatory_public_authority", label: "Mandatory — public authority" },
      { value: "mandatory_large_scale_monitoring", label: "Mandatory — large-scale systematic monitoring" },
      { value: "mandatory_large_scale_special", label: "Mandatory — large-scale special category processing" },
      { value: "voluntary", label: "Voluntary appointment" },
      { value: "not_applicable", label: "Not applicable" },
    ],
    showIf: { questionKey: "dpo_details", operator: "equals", value: "yes" },
  },
  {
    key: "gdpr_right_to_withdraw",
    text: "Where processing is based on consent, how can individuals withdraw consent?",
    whyWeAsk: "Art.13(2)(c) requires disclosure of the right to withdraw consent at any time.",
    type: "text_short",
    isRequired: false,
    showIf: { questionKey: "lawful_basis", operator: "contains", value: "consent" },
  },
  {
    key: "gdpr_right_to_object",
    text: "Where processing is based on legitimate interests, how can individuals object?",
    whyWeAsk:
      "Art.21 requires disclosure of the right to object to processing based on legitimate interests.",
    type: "text_short",
    isRequired: false,
    showIf: {
      questionKey: "lawful_basis",
      operator: "contains",
      value: "legitimate_interests",
    },
  },
  {
    key: "gdpr_dpa_contact",
    text: "Which supervisory authority (DPA) has jurisdiction over your organisation?",
    whyWeAsk:
      "Art.13(2)(d) requires disclosure of the right to lodge a complaint with a supervisory authority.",
    type: "text_short",
    isRequired: true,
  },
  {
    key: "gdpr_profiling",
    text: "Do you engage in profiling of data subjects?",
    whyWeAsk: "Art.13(2)(f) requires information about profiling and its consequences.",
    type: "yes_no_unsure",
    isRequired: false,
  },
  {
    key: "gdpr_profiling_info",
    text: "What is the profiling used for, and what are its consequences for the individual?",
    whyWeAsk: "Required by Art.13(2)(f) when profiling is used.",
    type: "text_long",
    isRequired: false,
    showIf: { questionKey: "gdpr_profiling", operator: "equals", value: "yes" },
  },
];

/** UK-only additions (UK_GDPR). */
export const UKGDPR_ADDITIONS: Question[] = [
  {
    key: "uk_lawful_basis_schedule",
    text: "UK DPA 2018 Schedule 1 condition if relying on Art.9 special-category processing",
    whyWeAsk:
      "UK DPA 2018 Schedule 1 specifies additional UK-specific conditions required alongside Art.9.",
    type: "text_short",
    isRequired: false,
    jurisdictionOnly: ["UK_GDPR"],
    showIf: {
      questionKey: "data_categories",
      operator: "contains",
      value: [
        "health_medical",
        "biometric",
        "race_ethnicity",
        "religion",
        "sexual_orientation",
        "political_opinions",
        "trade_union",
        "criminal",
      ],
    },
  },
  {
    key: "uk_ico_complaint",
    text: "Confirm ICO complaint URL (default: ico.org.uk/make-a-complaint)",
    whyWeAsk: "UK GDPR requires the ICO to be named as the complaint route.",
    type: "text_short",
    isRequired: false,
    jurisdictionOnly: ["UK_GDPR"],
  },
];

/** Switzerland-only additions (CH_FADP). */
export const CHADP_ADDITIONS: Question[] = [
  {
    key: "ch_fdpic_complaint",
    text: "Confirm FDPIC complaint URL (default: fdpic.ch/en/data-subjects/complaints)",
    whyWeAsk: "Swiss nFADP requires the FDPIC to be named as the complaint route.",
    type: "text_short",
    isRequired: false,
    jurisdictionOnly: ["CH_FADP"],
  },
  {
    key: "ch_profiling_high_risk",
    text:
      "Does your profiling produce a legal effect or similarly significant effect on individuals?",
    whyWeAsk:
      "Swiss nFADP has a specific definition of 'high-risk profiling' requiring explicit disclosure.",
    type: "yes_no",
    isRequired: false,
    jurisdictionOnly: ["CH_FADP"],
  },
];
