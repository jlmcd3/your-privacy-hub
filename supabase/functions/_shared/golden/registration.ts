// QB-P20 — registration golden set. 3 fixtures.
// Registration is a NON-contract tool (no CONTRACT_BY_TOOL entry) so
// validateIntake short-circuits ok. Fixture shape mirrors what
// run-registration-assessment currently consumes.
//
// Adversarial: ai_high_risk=true AND ai_general_purpose_provider=false
// with 5 markets_served — exercises the "narrow deployer + broad market
// coverage" edge that historically produced boilerplate.
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian AI Health",
  sector: "Healthcare",
  markets_served: ["United Kingdom"],
  ai_high_risk: false,
  ai_general_purpose_provider: false,
};

export const REGISTRATION_GOLDEN: GoldenCase[] = [
  {
    id: "reg-uk-single-market-tuning",
    tool: "registration",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "ICO|Information Commissioner", flags: "i", label: "UK ICO named" },
    ],
  },
  {
    id: "reg-eu-multi-tuning",
    tool: "registration",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Nordic Care AB",
      markets_served: ["Germany", "France", "Sweden"],
    },
    assertions: [
      { kind: "must_include", pattern: "supervisory authority|DPA", flags: "i", label: "SA/DPA named" },
    ],
  },
  {
    id: "reg-high-risk-broad-markets-adversarial",
    tool: "registration",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "PolyCare AI",
      ai_high_risk: true,
      ai_general_purpose_provider: false,
      markets_served: ["Germany", "France", "United Kingdom", "Ireland", "Netherlands"],
    },
    assertions: [
      { kind: "must_include", pattern: "high[- ]?risk|Annex III", flags: "i", label: "AI Act high-risk framing" },
    ],
  },
];
