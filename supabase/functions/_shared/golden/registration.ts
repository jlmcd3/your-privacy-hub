// QB-P20 — registration golden set. 3 fixtures.
// Registration is a NON-contract tool (no CONTRACT_BY_TOOL entry) so
// validateIntake short-circuits ok.
//
// QB-P23 item 1 — REGRESSION FIX: intakes must use the shape consumed by
// _shared/registration-engine.ts (IntakeData). Prior version used
// human-readable country names ("United Kingdom", "Germany") in
// markets_served, which the engine's EU_EEA_CODES / markets.has("UK")
// lookups never matched — leaving law/authority/authority_url null and
// silently masking the ai_high_risk R6 rule (R6 requires
// has_eu_establishment || euMarkets.length > 0). Every field below is now
// keyed to what the engine actually reads.
//
// Adversarial: ai_high_risk=true AND ai_general_purpose_provider=false
// with broad EU + UK market coverage — exercises the "narrow deployer +
// broad market coverage" edge that historically produced boilerplate,
// AND now correctly fires R6_AI_HIGH_RISK →
// high_risk_ai_deployer_obligations=true.
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian AI Health",
  organization_country: "GB",
  organization_size: "small" as const,
  employee_count: 25,
  industry: "Healthcare",
  role: "controller" as const,
  processes_personal_data: true,
  has_uk_establishment: true,
  has_eu_establishment: false,
  markets_served: ["UK"],
  ai_high_risk: false,
  ai_general_purpose_provider: false,
  // CEO decision 2026-07-23 — private organisations by default. Existing
  // fixtures must NOT emit any public-authority content (Art. 49(3),
  // "public authority", Art. 37(1)(a)).
  is_public_authority: false,
};

export const REGISTRATION_GOLDEN: GoldenCase[] = [
  {
    id: "reg-uk-single-market-tuning",
    tool: "registration",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "ICO|Information Commissioner", flags: "i", label: "UK ICO named" },
      { kind: "must_not_include", pattern: "Art(?:icle|\\.)?\\s*49\\(3\\)", flags: "i", label: "no Art. 49(3) content for private org" },
      { kind: "must_not_include", pattern: "public[- ]authority|Union body", flags: "i", label: "no public-authority framing for private org" },
    ],
  },
  {
    id: "reg-eu-multi-tuning",
    tool: "registration",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Nordic Care AB",
      organization_country: "SE",
      has_uk_establishment: false,
      has_eu_establishment: true,
      eu_lead_member_state: "SE",
      markets_served: ["DE", "FR", "SE"],
    },
    assertions: [
      { kind: "must_include", pattern: "supervisory authority|DPA|Datainspektionen|IMY", flags: "i", label: "SA/DPA named" },
      { kind: "must_not_include", pattern: "Art(?:icle|\\.)?\\s*49\\(3\\)", flags: "i", label: "no Art. 49(3) content for private org" },
      { kind: "must_not_include", pattern: "public[- ]authority|Union body", flags: "i", label: "no public-authority framing for private org" },
    ],
  },
  {
    id: "reg-high-risk-broad-markets-adversarial",
    tool: "registration",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "PolyCare AI",
      organization_country: "GB",
      has_uk_establishment: true,
      has_eu_establishment: false,
      ai_high_risk: true,
      ai_general_purpose_provider: false,
      uses_ai_systems: true,
      markets_served: ["DE", "FR", "UK", "IE", "NL"],
    },
    assertions: [
      { kind: "must_include", pattern: "high[- ]?risk|Annex III|Chapter III", flags: "i", label: "AI Act high-risk framing" },
      // CEO decision 2026-07-23 — private high-risk deployer must NOT emit
      // Art. 49(3) content or public-authority framing.
      { kind: "must_not_include", pattern: "Art(?:icle|\\.)?\\s*49\\(3\\)", flags: "i", label: "no Art. 49(3) card for private deployer" },
      { kind: "must_not_include", pattern: "public[- ]authority|Union body", flags: "i", label: "no public-authority framing for private deployer" },
    ],
  },
  {
    id: "reg-high-risk-public-authority-adversarial",
    tool: "registration",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "City of Rotterdam — Municipal AI Office",
      organization_country: "NL",
      has_uk_establishment: false,
      has_eu_establishment: true,
      eu_lead_member_state: "NL",
      ai_high_risk: true,
      ai_general_purpose_provider: false,
      uses_ai_systems: true,
      markets_served: ["NL"],
      is_public_authority: true,
    },
    assertions: [
      { kind: "must_include", pattern: "Art(?:icle|\\.)?\\s*49\\(3\\)", flags: "i", label: "Art. 49(3) card appears for public-authority deployer" },
      { kind: "must_include", pattern: "public[- ]authority|Union body", flags: "i", label: "public-authority framing present" },
      { kind: "must_include", pattern: "Chapter III|Arts?\\.?\\s*26", flags: "i", label: "Chapter III deployer duties still cited" },
    ],
  },
];
