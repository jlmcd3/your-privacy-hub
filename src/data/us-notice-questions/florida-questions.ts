import type { Question } from "./types";

/**
 * Florida Digital Bill of Rights (FDBR) — effective July 1, 2024.
 *
 * FDBR has a very narrow scope: it primarily applies to "controllers" with
 * >$1B in global gross revenue that meet additional criteria (significant
 * revenue from ads, app store/smart speaker operator, etc.).
 *
 * Where it applies, FDBR is closer to the Virginia model but with several
 * Florida-specific twists worth surfacing on a notice.
 */
export const FLORIDA_QUESTIONS: Question[] = [
  {
    key: "fl_scope_confirmation",
    text: "Does your business meet Florida's FDBR threshold — global gross revenue over $1B AND at least one of: (a) >50% revenue from online ad sales, (b) operates an app store with 250k+ apps, or (c) operates a smart speaker/voice assistant?",
    whyWeAsk:
      "FDBR has an unusually narrow controller definition. Confirming scope avoids generating a Florida notice for a business that isn't actually covered. [Fla. Stat. § 501.702]",
    type: "single_choice",
    options: [
      { value: "yes", label: "Yes — we meet the FDBR controller threshold" },
      { value: "no", label: "No — we do not meet the threshold" },
      { value: "unsure", label: "Unsure — flag for legal review" },
    ],
    isRequired: true,
    jurisdictionOnly: ["US_FL"],
    flagIf: [
      {
        operator: "equals",
        value: "no",
        flagType: "recommendation",
        severity: "info",
        message: "FDBR may not apply — Florida notice generation is optional.",
        consequence:
          "If you don't meet Florida's narrow controller threshold, FDBR's notice obligations don't apply. You may still want a Florida-friendly notice for goodwill, but it isn't legally required.",
      },
    ],
  },
  {
    key: "fl_sensitive_geolocation",
    text: "Do you collect precise geolocation data (within ~1,750 feet) of Florida residents?",
    whyWeAsk:
      "FDBR treats precise geolocation as sensitive data requiring opt-in consent. [Fla. Stat. § 501.702(31)]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_FL"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Precise geolocation requires opt-in consent under FDBR.",
        consequence:
          "Florida treats precise geolocation as sensitive data. You must obtain opt-in consent before processing.",
      },
    ],
  },
  {
    key: "fl_government_moderation",
    text: "Does your business moderate, restrict, or otherwise act on user-generated content based on the content's viewpoint or political ideology?",
    whyWeAsk:
      "FDBR includes Florida-specific transparency provisions around content moderation by certain large platforms. [Fla. Stat. § 501.703]",
    type: "yes_no_unsure",
    isRequired: false,
    jurisdictionOnly: ["US_FL"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "recommendation",
        severity: "info",
        message: "FDBR content-moderation transparency may apply.",
        consequence:
          "Florida's FDBR includes platform transparency provisions. Consider disclosing moderation criteria in your notice.",
      },
    ],
  },
  {
    key: "fl_children_known",
    text: "Do you knowingly collect personal data from Florida residents under 18?",
    whyWeAsk:
      "FDBR prohibits the sale of personal data and targeted advertising for known minors under 18. [Fla. Stat. § 501.715]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_FL"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "FDBR restricts sale and targeted ads for under-18s.",
        consequence:
          "Florida prohibits the sale of personal data and targeted advertising directed at known minors under 18. Stop these practices for Florida minors.",
      },
    ],
  },
];
