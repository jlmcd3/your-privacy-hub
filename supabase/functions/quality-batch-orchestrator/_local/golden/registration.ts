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

  // ── ITEM 316 — fixture unblock for the rebuilt registration engine ──────
  // The three cases above predate the data-broker deliverables and supply
  // NONE of the fields the Item 316 threshold analysis reads, so they can
  // only ever produce `record_insufficient` on the state determinations.
  // The three cases below make the product measurable: two states that must
  // register, a Texas case that turns on the volume limb alone, and a
  // not-registrable case that fails on the direct-relationship limb. Each is
  // a specific organisation with specific numbers, not a generic shell.
  {
    id: "reg-ca-vt-broker-perfect-record",
    tool: "registration",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Halyard Audience Data LLC",
      organization_country: "US",
      organization_size: "medium" as const,
      employee_count: 140,
      industry: "AdTech / MarTech",
      role: "controller" as const,
      has_uk_establishment: false,
      has_eu_establishment: false,
      markets_served: ["US-CA", "US-VT"],
      acts_as_data_broker: true,
      sells_or_shares_personal_info: true,
      // Item 316 threshold fields — the CA/VT limbs in full.
      collects_data_not_directly_from_individuals: true,
      has_direct_relationship_with_data_subjects: false,
      sells_or_licenses_brokered_data: true,
      brokered_data_individual_count: 4_200_000,
      brokered_data_revenue_share_pct: 88,
      data_broker_exemption_claimed: "none",
      filing_contact_details_ready: true,
      filing_opt_out_mechanism_documented: true,
      filing_minors_data_practices_documented: true,
      processes_children_data: false,
      processes_special_categories: false,
      large_scale_monitoring: true,
    },
    assertions: [
      { kind: "must_include", pattern: "1798\\.99\\.82", flags: "i", label: "CA registration provision cited" },
      { kind: "must_include", pattern: "2446", flags: "i", label: "VT registration provision cited" },
      { kind: "must_include", pattern: "direct relationship", flags: "i", label: "the deciding limb is named, not just the verdict" },
      { kind: "must_not_include", pattern: "646A\\.593|510\\.005", flags: "i", label: "no Oregon or Texas bleed into a CA/VT record" },
    ],
  },
  {
    id: "reg-tx-volume-limb-tuning",
    tool: "registration",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Brazos Identity Resolution Inc.",
      organization_country: "US",
      organization_size: "small" as const,
      employee_count: 38,
      industry: "SaaS / Software",
      role: "controller" as const,
      has_uk_establishment: false,
      has_eu_establishment: false,
      markets_served: ["US-TX"],
      acts_as_data_broker: false,
      sells_or_shares_personal_info: false,
      // TX reaches PROCESSING and TRANSFER, not sale — and this record has a
      // direct relationship with its data subjects, which would defeat CA and
      // VT but is irrelevant in Texas. Revenue share is below 50%, so the
      // determination must turn on the 50,000-individual volume limb alone.
      collects_data_not_directly_from_individuals: true,
      has_direct_relationship_with_data_subjects: true,
      sells_or_licenses_brokered_data: false,
      brokered_data_individual_count: 310_000,
      brokered_data_revenue_share_pct: 31,
      data_broker_exemption_claimed: "none",
      filing_contact_details_ready: true,
      large_scale_monitoring: false,
      processes_special_categories: false,
    },
    assertions: [
      { kind: "must_include", pattern: "510\\.003", flags: "i", label: "TX applicability test cited" },
      { kind: "must_include", pattern: "50,000", flags: "i", label: "the volume limb is quoted, not summarised" },
      { kind: "must_include", pattern: "\\$300", flags: "i", label: "TX statutory fee stated verbatim" },
      { kind: "must_not_include", pattern: "1798\\.99\\.8|2430|646A", flags: "i", label: "no other state's threshold cited on a TX-only record" },
    ],
  },
  {
    id: "reg-ca-not-registrable-adversarial",
    tool: "registration",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Trailhead Outfitters Co.",
      organization_country: "US",
      organization_size: "medium" as const,
      employee_count: 220,
      industry: "E-commerce",
      role: "controller" as const,
      has_uk_establishment: false,
      has_eu_establishment: false,
      markets_served: ["US-CA"],
      // Adversarial: LOOKS like a broker on the legacy CCPA flag (it shares
      // data for cross-context advertising) but has a direct customer
      // relationship and collects directly, so the CA definition FAILS. The
      // engine must return not_registrable and say which limb decided it,
      // rather than treating "sells or shares" as dispositive.
      acts_as_data_broker: false,
      sells_or_shares_personal_info: true,
      collects_data_not_directly_from_individuals: false,
      has_direct_relationship_with_data_subjects: true,
      sells_or_licenses_brokered_data: true,
      brokered_data_individual_count: 900_000,
      brokered_data_revenue_share_pct: 4,
      data_broker_exemption_claimed: "none",
      large_scale_monitoring: false,
      processes_special_categories: false,
    },
    assertions: [
      { kind: "must_include", pattern: "not required to register|No registration duty", flags: "i", label: "negative determination reached, not omitted" },
      { kind: "must_include", pattern: "direct relationship", flags: "i", label: "the limb that defeated the duty is named" },
      { kind: "must_not_include", pattern: "on or before January 31", flags: "i", label: "no filing schedule surfaced where no duty attaches" },
    ],
  },
];
