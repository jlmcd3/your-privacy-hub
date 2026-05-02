import type { Question } from "./types";

/** Brazil LGPD-specific questions. */
export const LGPD_QUESTIONS: Question[] = [
  {
    key: "lgpd_legal_basis",
    text: "What is your legal basis under LGPD Art.7?",
    whyWeAsk: "LGPD Art.7 requires identification of the legal basis for processing.",
    type: "multi_choice",
    jurisdictionOnly: ["BR_LGPD"],
    options: [
      { value: "consent", label: "Consent — Art.7(I)" },
      { value: "legal_obligation", label: "Legal obligation — Art.7(II)" },
      { value: "public_policy", label: "Public policy execution — Art.7(III)" },
      { value: "research", label: "Research — Art.7(IV)" },
      { value: "contract", label: "Contract performance — Art.7(V)" },
      { value: "judicial", label: "Judicial proceedings — Art.7(VI)" },
      { value: "vital_interests", label: "Protection of life — Art.7(VII)" },
      { value: "health", label: "Health protection — Art.7(VIII)" },
      { value: "legitimate_interest", label: "Legitimate interest — Art.7(IX)" },
      { value: "credit_protection", label: "Credit protection — Art.7(X)" },
    ],
  },
  {
    key: "lgpd_sensitive_data",
    text: "Do you process sensitive personal data (dados pessoais sensíveis)?",
    type: "yes_no",
    jurisdictionOnly: ["BR_LGPD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "LGPD Art.11 applies — stricter rules.",
        consequence: "LGPD Art.11 requires consent or a specific legal basis for sensitive data.",
      },
    ],
  },
  {
    key: "lgpd_children",
    text: "Do you process personal data of children?",
    type: "yes_no",
    jurisdictionOnly: ["BR_LGPD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "LGPD Art.14 — parental/guardian consent required for under-12.",
        consequence: "Document your verifiable parental-consent mechanism.",
      },
    ],
  },
  {
    key: "lgpd_dpo_name",
    text: "Name and contact details of your Encarregado (DPO)",
    whyWeAsk: "LGPD Art.41 requires all controllers to appoint an Encarregado.",
    type: "text_short",
    jurisdictionOnly: ["BR_LGPD"],
  },
  {
    key: "lgpd_transfer",
    text: "Do you transfer personal data outside Brazil?",
    type: "yes_no",
    jurisdictionOnly: ["BR_LGPD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "recommendation",
        severity: "info",
        message: "LGPD Art.33 transfer requirements apply.",
        consequence: "Confirm adequacy decision, contractual safeguards, or other Art.33 mechanism.",
      },
    ],
  },
  {
    key: "lgpd_anpd_complaint",
    text: "Confirm ANPD complaint URL (default: gov.br/anpd)",
    type: "text_short",
    jurisdictionOnly: ["BR_LGPD"],
  },
];

/** Japan APPI-specific questions. */
export const APPI_QUESTIONS: Question[] = [
  {
    key: "appi_purpose_specificity",
    text: "Describe the specific purposes of personal information use",
    whyWeAsk: "APPI Art.17 requires purposes to be specified to the extent possible.",
    type: "text_short",
    jurisdictionOnly: ["JP_APPI"],
  },
  {
    key: "appi_joint_use",
    text: "Do you share personal information with joint users?",
    type: "yes_no",
    jurisdictionOnly: ["JP_APPI"],
  },
  {
    key: "appi_joint_details",
    text: "Describe the joint users and the categories of information shared",
    type: "text_short",
    jurisdictionOnly: ["JP_APPI"],
    showIf: { questionKey: "appi_joint_use", operator: "equals", value: "yes" },
  },
  {
    key: "appi_third_country_transfer",
    text: "Do you transfer personal information to third countries?",
    type: "yes_no",
    jurisdictionOnly: ["JP_APPI"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "APPI requires consent or equivalent protection finding for third-country transfers.",
        consequence: "Confirm explicit consent, an equivalent-protection finding, or a contractual mechanism.",
      },
    ],
  },
  {
    key: "appi_specific_sensitive",
    text: "Do you handle 'specially designated personal information'?",
    whyWeAsk:
      "APPI Art.20-2: Sensitive data (health, disability, criminal record) requires opt-in consent.",
    type: "yes_no",
    jurisdictionOnly: ["JP_APPI"],
  },
  {
    key: "appi_ppc_complaint",
    text: "Confirm PPC complaint URL (default: ppc.go.jp/en/)",
    type: "text_short",
    jurisdictionOnly: ["JP_APPI"],
  },
];

/** India DPDPA-specific questions. */
export const DPDPA_QUESTIONS: Question[] = [
  {
    key: "dpdpa_notice_purpose",
    text: "Describe the purpose(s) for which personal data is processed",
    whyWeAsk: "DPDPA Section 5 requires a clear notice stating processing purposes.",
    type: "text_long",
    jurisdictionOnly: ["IN_DPDPA"],
  },
  {
    key: "dpdpa_consent_mechanism",
    text:
      "How do data principals give free, specific, informed, and unambiguous consent?",
    type: "text_short",
    jurisdictionOnly: ["IN_DPDPA"],
    flagIf: [
      {
        operator: "contains",
        value: ["blanket", "pre-ticked", "implied"],
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Blanket / pre-ticked consent is invalid under DPDPA Section 6.",
        consequence: "Replace with granular, opt-in consent before publishing this notice.",
      },
    ],
  },
  {
    key: "dpdpa_grievance_officer",
    text: "Name and contact of your Data Protection Officer / Grievance Officer",
    whyWeAsk: "DPDPA Section 8(9) requires appointment and contact details of a Grievance Officer.",
    type: "text_short",
    jurisdictionOnly: ["IN_DPDPA"],
  },
  {
    key: "dpdpa_children",
    text: "Do you process personal data of children (under 18)?",
    type: "yes_no",
    jurisdictionOnly: ["IN_DPDPA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "DPDPA Section 9 — verifiable parental consent and age verification required.",
        consequence: "Document your age-verification and parental-consent mechanism.",
      },
    ],
  },
  {
    key: "dpdpa_board_complaint",
    text: "Confirm Data Protection Board URL (default: meity.gov.in)",
    type: "text_short",
    jurisdictionOnly: ["IN_DPDPA"],
  },
];

/** South Africa POPIA-specific questions. */
export const POPIA_QUESTIONS: Question[] = [
  {
    key: "popia_information_officer",
    text: "Name and contact of your Information Officer",
    whyWeAsk:
      "POPIA requires registration of an Information Officer with the Information Regulator.",
    type: "text_short",
    jurisdictionOnly: ["ZA_POPIA"],
  },
  {
    key: "popia_purpose",
    text: "What is the specific purpose for which personal information is collected?",
    whyWeAsk: "POPIA Section 13 requires specific purpose limitation.",
    type: "text_short",
    jurisdictionOnly: ["ZA_POPIA"],
  },
  {
    key: "popia_third_parties",
    text: "Do you transfer to third parties outside South Africa?",
    type: "yes_no",
    jurisdictionOnly: ["ZA_POPIA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "recommendation",
        severity: "info",
        message: "POPIA Section 72 — transfers permitted only with comparable protection.",
        consequence: "Document the comparable-protection mechanism (BCRs, contract, adequacy).",
      },
    ],
  },
  {
    key: "popia_special_information",
    text:
      "Do you process 'special personal information' (health, biometric, religious beliefs, etc.)?",
    type: "yes_no",
    jurisdictionOnly: ["ZA_POPIA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "POPIA Sections 26–27 — additional conditions apply to special information.",
        consequence: "Document the Section 27 ground (consent, vital interests, public interest, etc.).",
      },
    ],
  },
  {
    key: "popia_regulator_complaint",
    text: "Confirm Information Regulator URL (default: inforegulator.org.za)",
    type: "text_short",
    jurisdictionOnly: ["ZA_POPIA"],
  },
];
