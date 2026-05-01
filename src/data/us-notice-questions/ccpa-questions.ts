import type { Question } from "./types";

/**
 * CCPA-specific questions — only asked when California is selected.
 * jurisdictionOnly: ['US_CCPA']
 */
export const CCPA_SPECIFIC_QUESTIONS: Question[] = [
  {
    key: "ccpa_sensitive_data",
    text: "Do you collect or use 'sensitive personal information' as defined by CCPA/CPRA (SSN, precise geolocation, racial/ethnic origin, religious beliefs, union membership, mail/email/text contents, genetic data, biometric identifiers, health, sex life/orientation)?",
    whyWeAsk:
      "CCPA/CPRA gives Californians the right to limit use of sensitive personal information. Disclosure is required. [Cal. Civ. Code § 1798.121]",
    type: "single_choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Unsure — flag for review" },
    ],
    isRequired: true,
    jurisdictionOnly: ["US_CCPA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "info",
        message: "Right to limit use of sensitive personal information required.",
        consequence:
          "CCPA requires a \"Limit the Use of My Sensitive Personal Information\" link or equivalent mechanism on your website.",
      },
    ],
  },
  {
    key: "ccpa_financial_incentive",
    text: "Do you offer a loyalty programme, rewards programme, or any financial incentive in exchange for personal data?",
    whyWeAsk:
      "CCPA requires a separate Notice of Financial Incentive describing the value exchange and how to opt in/out. [Cal. Civ. Code § 1798.125(b)]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_CCPA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "missing_required",
        severity: "warning",
        message: "Notice of Financial Incentive required.",
        consequence:
          "Loyalty and rewards programmes that involve personal data require a separate Notice of Financial Incentive under CCPA.",
      },
    ],
  },
  {
    key: "ccpa_minors",
    text: "Do you knowingly collect or use personal data from California residents aged 13–15?",
    whyWeAsk:
      "CCPA requires opt-in consent for the sale or sharing of personal data of minors aged 13–15. [Cal. Civ. Code § 1798.120(c)]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_CCPA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Opt-in consent required for minors aged 13–15.",
        consequence:
          "CCPA prohibits the sale or sharing of personal data of California residents aged 13–15 without affirmative opt-in consent. COPPA also applies to those under 13.",
      },
    ],
  },
  {
    key: "ccpa_admt",
    text: "Do you use automated decision-making technology (ADMT) — including profiling — to make significant decisions affecting individuals (e.g. housing, employment, lending, insurance, education access)?",
    whyWeAsk:
      "CCPA's ADMT regulations require notice and opt-out rights for significant decisions. The ADMT notice requirement begins January 2027. [CPPA ADMT Regulations]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_CCPA"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "missing_required",
        severity: "warning",
        message: "ADMT notice and opt-out required from January 2027.",
        consequence:
          "California's ADMT regulations (effective January 2027) require pre-use notice, opt-out rights, and access rights for automated decisions with significant effects.",
      },
    ],
  },
];
