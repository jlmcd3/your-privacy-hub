import type { Question } from "./types";

/**
 * Maryland Online Data Privacy Act (MODPA) — effective October 1, 2025.
 *
 * MODPA is materially stricter than the Virginia model:
 *  - Hard data minimisation: collection limited to what is "reasonably necessary"
 *    AND "proportionate" to the requested service.
 *  - Outright prohibition on the SALE of sensitive personal data (no consent cure).
 *  - Targeted advertising to consumers known to be 13–17 is prohibited.
 *  - Heightened restrictions on consumer health data and precise geolocation.
 */
export const MARYLAND_QUESTIONS: Question[] = [
  {
    key: "md_data_minimisation",
    text: "Is the personal data you collect limited to what is reasonably necessary AND proportionate to provide the specific product or service the consumer requested?",
    whyWeAsk:
      "Maryland's MODPA imposes the strictest data minimisation standard in the US. Collection beyond what is reasonably necessary and proportionate is prohibited, even with consent. [Md. Code, Com. Law § 14-4607]",
    type: "single_choice",
    options: [
      { value: "yes_strict", label: "Yes — strictly limited to what's necessary for the requested service" },
      { value: "broader", label: "We collect broader data for analytics, marketing, or other purposes" },
      { value: "unsure", label: "Unsure — flag for review" },
    ],
    isRequired: true,
    jurisdictionOnly: ["US_MD"],
    flagIf: [
      {
        operator: "equals",
        value: "broader",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "MODPA data minimisation likely violated.",
        consequence:
          "Maryland prohibits collection beyond what is reasonably necessary and proportionate to the requested service. Consent does NOT cure this — it is a hard limit. Review collection practices urgently.",
      },
    ],
  },
  {
    key: "md_sensitive_data_sale",
    text: "Do you sell any sensitive personal data of Maryland residents (precise geolocation, health, racial/ethnic origin, religious beliefs, sexual orientation, citizenship status, genetic/biometric data, children's data)?",
    whyWeAsk:
      "MODPA outright PROHIBITS the sale of sensitive personal data — no consent cure, no opt-out fix. This is materially stricter than other US state laws. [Md. Code, Com. Law § 14-4607(a)(4)]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_MD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Sale of sensitive data is prohibited under Maryland law.",
        consequence:
          "MODPA outright prohibits the sale of sensitive personal data. This cannot be cured with consent or an opt-out. You must stop the sale of sensitive data of Maryland residents immediately.",
      },
    ],
  },
  {
    key: "md_minor_targeted_ads",
    text: "Do you serve targeted advertising to consumers you know, or have reason to know, are aged 13–17?",
    whyWeAsk:
      "MODPA prohibits processing the personal data of consumers aged 13–17 for targeted advertising or sale. [Md. Code, Com. Law § 14-4607(a)(2)]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_MD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Targeted advertising to minors aged 13–17 is prohibited.",
        consequence:
          "Maryland prohibits targeted advertising to or sale of data of minors aged 13–17 where you know or should know the consumer's age. Stop these practices for Maryland minors.",
      },
    ],
  },
  {
    key: "md_consumer_health_data",
    text: "Do you collect or process 'consumer health data' — information that identifies a consumer's physical or mental health status, including inferences drawn from non-health data?",
    whyWeAsk:
      "MODPA defines consumer health data broadly and applies heightened restrictions, similar to Washington's My Health My Data Act. Disclosure and consent are required. [Md. Code, Com. Law § 14-4601]",
    type: "yes_no_unsure",
    isRequired: true,
    jurisdictionOnly: ["US_MD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Consumer health data triggers heightened MODPA obligations.",
        consequence:
          "Maryland treats consumer health data — including inferences — as sensitive. You need explicit consent, a separate consumer health data privacy notice, and strict purpose limitations.",
      },
    ],
  },
  {
    key: "md_precise_geolocation",
    text: "Do you collect precise geolocation data (within a radius of 1,750 feet / ~533 metres) of Maryland residents?",
    whyWeAsk:
      "MODPA classifies precise geolocation as sensitive data. It cannot be sold and requires opt-in consent for processing. [Md. Code, Com. Law § 14-4601]",
    type: "yes_no",
    isRequired: true,
    jurisdictionOnly: ["US_MD"],
    flagIf: [
      {
        operator: "equals",
        value: "yes",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Precise geolocation requires opt-in consent and cannot be sold.",
        consequence:
          "Maryland treats precise geolocation as sensitive data. You must obtain opt-in consent before processing, and you cannot sell this data under any circumstance.",
      },
    ],
  },
];
