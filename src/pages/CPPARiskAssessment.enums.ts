// CPPA Risk Assessment — enum option sets extracted into a standalone module
// so both the intake page and the refine surface's structured editor can
// import them without introducing an import cycle. Do not re-declare these
// literals anywhere; content-anchor every reference back to this file.

// § 7152 impact-assessment scales.
export const IMPACT_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"];
export const IMPACT_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"];
export const IMPACT_BENEFITS_OUTWEIGH_OPTS = ["Yes", "No", "Uncertain"];
export const IMPACT_CYBER_GAPS_OPTS = ["Yes", "No"];

// Aligned to the § 7152(a)(5) enumerated negative-impact examples.
export const HARM_TYPES = [
  "Unauthorised access, destruction, use, modification, or disclosure",
  "Loss of availability of personal information",
  "Unlawful discrimination",
  "Impairment of consumer control over personal information",
  "Coercion or dark patterns",
  "Economic harm",
  "Physical harm",
  "Reputational harm",
  "Psychological harm",
];
