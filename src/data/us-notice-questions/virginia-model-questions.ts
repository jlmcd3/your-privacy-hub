import type { Question } from "./types";

/**
 * Virginia Model questions — shared across the 16 "Virginia-style" states:
 * VA, CO, CT, UT, IA, IN, TN, TX, MT, OR, DE, NJ, NH, KY, RI, MN
 *
 * These laws share a common structural framework derived from Virginia's CDPA.
 * Asked once when ANY Virginia-model state is selected.
 */
export const VIRGINIA_MODEL_QUESTIONS: Question[] = [
  {
    key: "vam_controller_processor_role",
    text: "For the personal data covered by this notice, do you act as a 'controller' (you decide why and how data is processed) or a 'processor' (you process data on behalf of another business)?",
    whyWeAsk:
      "Virginia-model laws apply different obligations to controllers vs processors. Notice obligations primarily fall on controllers. [Virginia CDPA § 59.1-575]",
    type: "single_choice",
    options: [
      { value: "controller", label: "Controller — we decide the purposes and means of processing" },
      { value: "processor", label: "Processor — we process on behalf of others" },
      { value: "both", label: "Both, depending on the data" },
      { value: "unsure", label: "Unsure — flag for review" },
    ],
    isRequired: true,
    jurisdictionOnly: [
      "US_VA", "US_CO", "US_CT", "US_TX", "US_FL",
    ],
  },
  {
    key: "vam_sensitive_data_consent",
    text: "If you process sensitive data (precise geolocation, racial/ethnic origin, religious beliefs, health, sexual orientation, citizenship/immigration, genetic/biometric data, children's data), do you obtain opt-in consent before processing?",
    whyWeAsk:
      "Most Virginia-model states require affirmative opt-in consent before processing sensitive data. [Virginia CDPA § 59.1-578(A)(5), Colorado CPA § 6-1-1308(7)]",
    type: "single_choice",
    options: [
      { value: "yes_consent", label: "Yes — we obtain opt-in consent" },
      { value: "no_sensitive", label: "We don't process sensitive data" },
      { value: "no_consent", label: "No — we process without explicit consent" },
      { value: "unsure", label: "Unsure" },
    ],
    isRequired: true,
    jurisdictionOnly: ["US_VA", "US_CO", "US_CT", "US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "no_consent",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Opt-in consent required for sensitive data under Virginia-model laws.",
        consequence:
          "Virginia, Colorado, Connecticut, and most other Virginia-model states require opt-in consent before processing sensitive data. Failure to obtain consent is a violation.",
      },
    ],
  },
  {
    key: "vam_targeted_advertising_optout",
    text: "Do you provide a clear and conspicuous mechanism for individuals to opt out of targeted advertising?",
    whyWeAsk:
      "Virginia-model laws require an opt-out from targeted advertising. Several states (CO, CT, TX, MT, OR, DE, NJ, NH) also require honouring Universal Opt-Out Mechanisms (UOOMs) like Global Privacy Control. [Virginia CDPA § 59.1-577(A)(5)]",
    type: "single_choice",
    options: [
      { value: "yes_link_and_uoom", label: "Yes — opt-out link and we honour Universal Opt-Out Mechanisms (e.g. GPC)" },
      { value: "yes_link_only", label: "Yes — opt-out link, but we don't process UOOM signals" },
      { value: "no", label: "No — we don't provide an opt-out" },
      { value: "not_applicable", label: "Not applicable — we don't engage in targeted advertising" },
    ],
    isRequired: true,
    jurisdictionOnly: ["US_VA", "US_CO", "US_CT", "US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Targeted advertising opt-out required.",
        consequence:
          "All Virginia-model states require an opt-out from targeted advertising if you engage in it. Several states also require honouring Universal Opt-Out Mechanisms (Colorado, Connecticut, Texas, Montana, Oregon, Delaware, New Jersey, New Hampshire).",
      },
      {
        operator: "equals",
        value: "yes_link_only",
        flagType: "recommendation",
        severity: "info",
        message: "Consider honouring Universal Opt-Out Mechanisms (e.g. Global Privacy Control).",
        consequence:
          "Colorado, Connecticut, Texas, Montana, Oregon, Delaware, New Jersey, and New Hampshire require honouring UOOMs like Global Privacy Control as a valid opt-out signal.",
      },
    ],
  },
  {
    key: "vam_profiling",
    text: "Do you use profiling to make decisions that produce legal or similarly significant effects (e.g. financial, employment, housing, healthcare, insurance, education)?",
    whyWeAsk:
      "Virginia-model laws give individuals the right to opt out of profiling for significant decisions. Notice must disclose this practice. [Virginia CDPA § 59.1-577(A)(5)(iii)]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_VA", "US_CO", "US_CT", "US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Profiling opt-out required.",
        consequence:
          "Individuals must be given a right to opt out of profiling for significant decisions under Virginia, Colorado, Connecticut, and Texas laws. Disclosure is required in your notice.",
      },
    ],
  },
  {
    key: "vam_dpa_or_assessment",
    text: "Have you conducted a Data Protection Assessment (DPA) for high-risk processing activities (targeted advertising, sale of data, sensitive data processing, profiling with significant effects)?",
    whyWeAsk:
      "Virginia, Colorado, Connecticut, Texas, and other Virginia-model states require DPAs for high-risk processing. Not displayed in the notice but flagged for compliance. [Virginia CDPA § 59.1-580]",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["US_VA", "US_CO", "US_CT", "US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Data Protection Assessment may be required.",
        consequence:
          "If you engage in targeted advertising, sell data, process sensitive data, or use profiling with significant effects, Virginia-model states require a documented Data Protection Assessment.",
      },
    ],
  },
  {
    key: "vam_appeals_process",
    text: "Do you have a documented internal appeals process for individuals whose privacy rights requests are denied?",
    whyWeAsk:
      "Virginia-model laws require controllers to provide an appeals mechanism within 60 days of denial, and to inform individuals of their right to contact the state attorney general. [Virginia CDPA § 59.1-577(C)]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_VA", "US_CO", "US_CT", "US_TX"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "missing_required",
        severity: "warning",
        message: "Appeals process required.",
        consequence:
          "All Virginia-model states require a documented internal appeals process. Notice must describe how individuals can appeal a denied rights request.",
      },
    ],
  },
];
