import type { Question } from "./types";

/**
 * Lightweight state-specific add-ons for Virginia-model states that have
 * notable deviations worth surfacing on the notice. These supplement (rather
 * than replace) the shared Virginia-model question set.
 *
 * Keep these narrowly scoped — broad obligations belong in
 * VIRGINIA_MODEL_QUESTIONS so we don't duplicate.
 */
export const STATE_SPECIFIC_QUESTIONS: Question[] = [
  // ----- Colorado (CPA) -----
  {
    key: "co_uoom_honored",
    text: "Does your website honour the Colorado-recognised Universal Opt-Out Mechanism (UOOM) — including Global Privacy Control (GPC)?",
    whyWeAsk:
      "Colorado requires controllers to recognise UOOMs (including GPC) for opt-outs of sale and targeted advertising. [4 CCR 904-3, Rule 5.06]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_CO"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Colorado requires UOOM/GPC support.",
        consequence:
          "Colorado's CPA regulations require recognising Global Privacy Control as a valid opt-out signal. Configure your site to detect and honour GPC.",
      },
    ],
  },

  // ----- Texas (TDPSA) -----
  {
    key: "tx_small_business_carveout",
    text: "Is your business a 'small business' as defined by the U.S. Small Business Administration?",
    whyWeAsk:
      "Texas's TDPSA exempts SBA-defined small businesses from most obligations except the sale of sensitive data. [Tex. Bus. & Com. Code § 541.002]",
    type: "yes_no",
    isRequired: false,
    jurisdictionOnly: ["US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "recommendation",
        severity: "info",
        message: "Texas SBA carve-out may apply.",
        consequence:
          "Texas exempts SBA-defined small businesses from most TDPSA obligations, except the sale of sensitive personal data, which still requires consent.",
      },
    ],
  },

  // ----- Connecticut (CTDPA) -----
  {
    key: "ct_consumer_health_data",
    text: "Do you process 'consumer health data' (information that identifies a consumer's physical or mental health status, including inferences)?",
    whyWeAsk:
      "Connecticut amended CTDPA in 2023 to add heightened consumer health data obligations, similar to Washington's My Health My Data Act. [Conn. Gen. Stat. § 42-515]",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["US_CT"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Connecticut consumer health data requires consent + restrictions.",
        consequence:
          "Connecticut requires explicit consent for processing consumer health data and prohibits geofencing around health facilities.",
      },
    ],
  },

  // ----- Oregon (OCPA) -----
  {
    key: "or_specific_third_parties",
    text: "Are you prepared to disclose the SPECIFIC third parties (not just categories) to whom you've disclosed a consumer's personal data, on request?",
    whyWeAsk:
      "Oregon is the first US state to require naming specific third-party recipients on access requests. [ORS 646A.578]",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["US_OR"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Oregon requires naming specific third parties on request.",
        consequence:
          "Oregon's OCPA uniquely requires controllers to disclose the specific (named) third parties that have received a consumer's personal data, on request. Update intake processes.",
      },
    ],
  },

  // ----- New Jersey (NJDPA) -----
  {
    key: "nj_financial_education_data",
    text: "Do you process financial information, education data, or insurance data of New Jersey residents that isn't already covered by GLBA/FERPA?",
    whyWeAsk:
      "New Jersey's NJDPA expands the definition of sensitive data to include certain financial and education data. [N.J. Stat. § 56:8-166.5]",
    type: "yes_no",
    isRequired: false,
    jurisdictionOnly: ["US_NJ"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "New Jersey treats certain financial/education data as sensitive.",
        consequence:
          "NJDPA's expanded sensitive data definition requires opt-in consent for processing. Confirm overlap with federal exemptions (GLBA, FERPA) with counsel.",
      },
    ],
  },

  // ----- Delaware (DPDPA) -----
  {
    key: "de_nonprofit_status",
    text: "Is your organisation a non-profit?",
    whyWeAsk:
      "Delaware's DPDPA notably does NOT exempt non-profits (most other states do). [6 Del. C. § 12D-103]",
    type: "yes_no",
    isRequired: false,
    jurisdictionOnly: ["US_DE"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "recommendation",
        severity: "info",
        message: "Delaware applies to non-profits.",
        consequence:
          "Unlike most state privacy laws, Delaware's DPDPA covers non-profits. Confirm full compliance applies to your organisation.",
      },
    ],
  },

  // ----- Minnesota (MCDPA) -----
  {
    key: "mn_data_inventory",
    text: "Do you maintain a data inventory documenting the categories of personal data you process?",
    whyWeAsk:
      "Minnesota uniquely requires controllers to maintain a written data inventory. [Minn. Stat. § 325O.05]",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["US_MN"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Minnesota requires a written data inventory.",
        consequence:
          "Minnesota's MCDPA requires controllers to maintain a documented data inventory. Consider using your RoPA records to satisfy this requirement.",
      },
    ],
  },
];
