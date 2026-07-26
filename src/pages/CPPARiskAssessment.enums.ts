// CPPA Risk Assessment — enum option sets extracted into a standalone module
// so both the intake page and the refine surface's structured editor can
// import them without introducing an import cycle. Do not re-declare these
// literals anywhere; content-anchor every reference back to this file.
//
// RC-FLIP-3 — expanded to include the T-class banded intake option sets
// previously living in CPPARiskAssessment.tsx (REVENUE_OPTS, CONSUMER_OPTS,
// SPI_VOLUME_OPTS, SHARE_REVENUE_50PCT_OPTS, Q5_SELL_SHARE_OPTS,
// Q15_SENSITIVE_PI_OPTS) so shared components never import the page module.
// The page re-exports these names, so page consumers are unchanged.

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

// Revenue bands. R1a split the $25M–$100M band into $25M–$50M and $50M–$100M
// so § 7120(b)(1)(C) (50% revenue prong) analysis can be band-aligned. Legacy
// value "$25M–$100M" is intentionally NOT in this list; stored rows keep it
// and the generator treats it as straddling the $50M line (indeterminate
// per BAND-VS-THRESHOLD). Restore of a legacy draft renders q1 unselected.
// BAND-REALIGNMENT-T2A (2026-07-26) — REVENUE_OPTS retargeted to V2 label
// set (statutorily aligned edges per src/lib/bands/revenueConsumer.ts +
// supabase/functions/_shared/bands/revenue-consumer.ts). Legacy V1 labels
// (kept in stored intakes) resolve via resolveRevenueBand in the edge-side
// normaliser; the classifier retains V1 switch cases for back-compat.
export const REVENUE_OPTS = ["Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M"];
// Consumer-volume bands aligned to statutory breakpoints:
//   100,000 — § 1798.140(d)(1)(B) covered-business threshold
//   250,000 — § 7120(b)(2)(A) cyber-audit volume prong
// Legacy value "100,000–1 million" (which straddles 250,000) is intentionally
// NOT in this list — the risk generator still ACCEPTS it in stored intakes
// and resolves it as indeterminate per the BAND-VS-THRESHOLD rule / T-1
// deterministic check. Restore of a legacy draft clears q2 so the user
// re-answers with a clean band (see applyRestore).
// BAND-REALIGNMENT-T2A (2026-07-26) — CONSUMER_OPTS retargeted to V2.
// Aligned to statutory breakpoints (100,000 and 250,000). Legacy V1 labels
// resolve via resolveConsumerBand in the edge-side normaliser.
export const CONSUMER_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"];
// R1a additions.
export const SPI_VOLUME_OPTS = ["Fewer than 50,000", "50,000 or more", "Unsure"];
export const SHARE_REVENUE_50PCT_OPTS = ["Yes", "No", "Unsure"];
// Q5 options (exported for fixture drift guard).
export const Q5_SELL_SHARE_OPTS = ["Yes — sell only", "Yes — share for advertising only", "Both", "No"];
// Q15 options.
export const Q15_SENSITIVE_PI_OPTS = ["Yes", "No", "Unsure"];

// TURN 1b — § 7150(b)(5) sensitive-location predicate. Discrete enum so the
// generator can deterministically resolve the (b)(5) branch without free-text
// interpretation. "Not applicable" is the safe default; any other value
// engages the (b)(5) predicate in computeIntakeSelectedSubsections().
export const SENSITIVE_LOCATION_BASIS_OPTS = [
  "Not applicable — no sensitive-location processing",
  "Healthcare facility or medical office",
  "Domestic-violence shelter or family-justice services",
  "Place of worship",
  "School or educational facility",
  "Reproductive- or sexual-health services",
  "Substance-use or mental-health treatment facility",
  "Immigration- or refugee-services facility",
  "Other sensitive location (describe in the intake)",
];
