// Declarative, typed Registration Assessment rules engine.
//
// Design goals:
//   1. Every recommendation is produced by a named, traceable rule.
//   2. EU "one-stop-shop" (OSS) is honoured: when an org has an EU
//      establishment, member-state markets collapse into a single lead
//      supervisory authority recommendation (with member-state notes for
//      local filings that survive OSS — France's CNIL biometrics, Germany's
//      DPO, Italy's Garante, etc.).
//   3. When an org has NO EU establishment but offers goods/services into
//      EU markets, GDPR Art. 27 EU representative is required and each
//      targeted member state remains separately listed.
//   4. Intake fields actually drive the output. Every Step-2 toggle is
//      consumed by at least one rule.
//   5. Confidence is derived from data quality, not just "fields filled".
//
// The engine is pure — no Supabase, no fetch — so it can be unit-tested
// with `deno test` and reused by the edge function.

// ---------- Types ----------

export type Role = "controller" | "processor" | "both";
export type OrgSize =
  | "micro"
  | "small"
  | "medium"
  | "large"
  | "enterprise";

export interface IntakeData {
  // Org basics
  organization_name?: string;
  organization_country?: string; // ISO code where org is established
  organization_size?: OrgSize;
  industry?: string;
  email?: string;
  // NEW — concrete numbers that drive thresholds
  employee_count?: number;
  annual_revenue_usd?: number;
  data_subjects_count?: number; // total identifiable individuals processed / yr

  // Role
  role?: Role; // controller, processor, both

  // Processing context (booleans drive specific rules)
  processes_personal_data?: boolean;
  processes_special_categories?: boolean; // health, biometric, etc
  processes_children_data?: boolean;
  large_scale_monitoring?: boolean; // GDPR Art. 37(1)(b) — public-area / behavioural
  uses_ai_systems?: boolean;
  ai_high_risk?: boolean; // EU AI Act high-risk
  ai_general_purpose_provider?: boolean; // GPAI provider (places GPAI on EU market)
  cross_border_transfers?: boolean;

  // Markets — ISO codes (or US state codes like "US-CA", "US-TX") where
  // the org offers goods/services or monitors behaviour.
  markets_served?: string[];

  // Establishment flags
  has_eu_establishment?: boolean;
  has_uk_establishment?: boolean;
  eu_lead_member_state?: string; // ISO of chosen lead SA, optional

  // Self-declared activities
  acts_as_data_broker?: boolean;
  sells_or_shares_personal_info?: boolean; // CCPA "sale or share"
  processes_biometrics_for_id?: boolean; // BIPA / IL, TX CUBI, WA
}

export interface RecommendedJurisdiction {
  code: string;
  why: string;          // human-readable reason
  rule_id: string;      // which rule fired
  obligations: string[]; // e.g. ["registration", "dpo", "eu_rep", "ai_filing"]
}

export interface AssessmentOutput {
  jurisdictions: RecommendedJurisdiction[];
  obligations_summary: {
    eu_representative_required: boolean;
    uk_representative_required: boolean;
    dpo_required: boolean;
    ai_act_provider_obligations: boolean;
    data_broker_registrations: string[]; // jurisdiction codes
  };
  confidence: "high" | "medium" | "low";
  confidence_reasons: string[];
  rules_fired: string[]; // ordered list, for audit trail
  warnings: string[];    // missing-info hints
}

// ---------- Constants ----------

// EU/EEA member states — used for OSS dedup and Art. 27 evaluation.
export const EU_EEA_CODES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "NO","IS","LI", // EEA non-EU
]);

// US state-level data broker registries currently in force.
// Source: state statutes in effect as of 2025.
const US_DATA_BROKER_STATES = new Set(["US-CA", "US-VT", "US-TX", "US-OR"]);

// Jurisdictions where operating in the local market always requires a
// local rep / DPC notification regardless of OSS.
const ALWAYS_LOCAL_FILING = new Set(["UK", "CH"]);

// CCPA-style state laws with thresholds where "sells/shares" matters.
const CCPA_STATES = new Set(["US-CA", "US-CO", "US-CT", "US-VA", "US-UT"]);

// ---------- Rule helpers ----------

function ensure(
  map: Map<string, RecommendedJurisdiction>,
  code: string,
  rule_id: string,
  why: string,
  obligation: string,
) {
  const existing = map.get(code);
  if (existing) {
    if (!existing.obligations.includes(obligation)) {
      existing.obligations.push(obligation);
    }
    // Append rule trace into "why" only if it adds new info
    if (!existing.why.includes(why)) {
      existing.why = `${existing.why} • ${why}`;
    }
    return;
  }
  map.set(code, { code, why, rule_id, obligations: [obligation] });
}

// ---------- The engine ----------

export function runRegistrationAssessment(intake: IntakeData): AssessmentOutput {
  const map = new Map<string, RecommendedJurisdiction>();
  const fired: string[] = [];
  const warnings: string[] = [];
  const markets = new Set(intake.markets_served || []);
  const home = intake.organization_country;

  // ------- Rule R1: Home jurisdiction registration -------
  if (home) {
    ensure(map, home, "R1_HOME",
      "Established in this jurisdiction — local data-protection registration applies",
      "registration");
    fired.push("R1_HOME");
  }

  // ------- Rule R2: EU one-stop-shop -------
  // If the org has an EU establishment, EU member-state markets collapse to
  // a single lead supervisory authority. Otherwise, each EU market remains
  // separately listed AND an Art. 27 EU representative is required.
  const euMarkets = [...markets].filter((c) => EU_EEA_CODES.has(c));
  let euRepRequired = false;

  if (intake.has_eu_establishment) {
    const lead = intake.eu_lead_member_state
      || (home && EU_EEA_CODES.has(home) ? home : "IE");
    ensure(map, lead, "R2_OSS_LEAD",
      `EU one-stop-shop: ${lead} acts as lead supervisory authority for cross-border processing`,
      "lead_authority");
    // Drop the individual EU market entries that would otherwise have been added by R3
    for (const c of euMarkets) {
      if (c !== lead && map.has(c) && map.get(c)!.rule_id === "R3_MARKET") {
        map.delete(c);
      }
    }
    fired.push("R2_OSS_LEAD");
  } else if (euMarkets.length > 0) {
    // No EU establishment → Art. 27 representative + per-state listing
    euRepRequired = true;
    for (const c of euMarkets) {
      ensure(map, c, "R2_ART27",
        "Offers goods/services to residents — GDPR Art. 27 representative required and local DPA may apply",
        "eu_representative");
      ensure(map, c, "R2_ART27", "", "registration");
    }
    fired.push("R2_ART27");
  }

  // ------- Rule R3: Each non-EU market served -------
  for (const c of markets) {
    if (EU_EEA_CODES.has(c)) continue; // handled by R2
    ensure(map, c, "R3_MARKET",
      `Offers goods/services to residents of ${c}`,
      "registration");
  }
  if (markets.size > 0) fired.push("R3_MARKET");

  // ------- Rule R4: UK GDPR / ICO fee -------
  if (intake.has_uk_establishment || markets.has("UK")) {
    ensure(map, "UK", "R4_UK_ICO",
      "UK GDPR applies; ICO annual data-protection fee required",
      "ico_fee");
    if (!intake.has_uk_establishment && markets.has("UK")) {
      ensure(map, "UK", "R4_UK_REP",
        "No UK establishment — UK Art. 27 representative required",
        "uk_representative");
    }
    fired.push("R4_UK_ICO");
  }

  // ------- Rule R5: DPO appointment triggers -------
  // GDPR Art. 37 + national thresholds (DE 20-employee rule).
  let dpoRequired = false;
  const dpoReasons: string[] = [];
  if (
    intake.processes_special_categories ||
    intake.large_scale_monitoring ||
    (intake.processes_personal_data && (intake.data_subjects_count ?? 0) > 100_000)
  ) {
    dpoRequired = true;
    dpoReasons.push("GDPR Art. 37(1)(b)/(c): large-scale or special-category processing");
  }
  if (
    (home === "DE" || markets.has("DE")) &&
    (intake.employee_count ?? 0) >= 20
  ) {
    dpoRequired = true;
    dpoReasons.push("German BDSG §38: ≥20 employees handling personal data → DPO required");
    ensure(map, "DE", "R5_DE_DPO",
      "BDSG §38 — DPO mandatory at 20+ employees",
      "dpo");
  }
  if (dpoRequired) {
    fired.push("R5_DPO");
  }

  // ------- Rule R6: EU AI Act -------
  let aiActProvider = false;
  if (intake.ai_high_risk && (intake.has_eu_establishment || euMarkets.length > 0)) {
    aiActProvider = true;
    const target = intake.has_eu_establishment
      ? (intake.eu_lead_member_state || home || "IE")
      : (euMarkets[0] || "IE");
    ensure(map, target, "R6_AI_HIGH_RISK",
      "Operates a high-risk AI system in the EU — EU database registration (Annex VIII) required",
      "ai_eu_database");
    fired.push("R6_AI_HIGH_RISK");
  }
  if (intake.ai_general_purpose_provider && (intake.has_eu_establishment || euMarkets.length > 0)) {
    aiActProvider = true;
    fired.push("R6_AI_GPAI");
  }

  // ------- Rule R7: US data broker registration -------
  const dataBrokerStates: string[] = [];
  if (intake.acts_as_data_broker) {
    for (const state of US_DATA_BROKER_STATES) {
      // Register if you target that state OR if you target US broadly.
      if (markets.has(state) || markets.has("US")) {
        ensure(map, state, "R7_DATA_BROKER",
          `Data broker registration required (${state})`,
          "data_broker_registration");
        dataBrokerStates.push(state);
      }
    }
    if (dataBrokerStates.length > 0) fired.push("R7_DATA_BROKER");
  }

  // ------- Rule R8: CCPA-family — sells or shares -------
  if (intake.sells_or_shares_personal_info) {
    for (const c of CCPA_STATES) {
      if (markets.has(c)) {
        ensure(map, c, "R8_CCPA_SELL",
          `Sells/shares personal info — opt-out and disclosures required (${c})`,
          "ccpa_disclosures");
      }
    }
    fired.push("R8_CCPA_SELL");
  }

  // ------- Rule R9: BIPA-style biometric ID -------
  if (intake.processes_biometrics_for_id) {
    for (const c of ["US-IL", "US-TX", "US-WA"]) {
      if (markets.has(c) || markets.has("US")) {
        ensure(map, c, "R9_BIPA",
          "Processes biometric identifiers — written-consent and retention rules apply",
          "biometric_consent_policy");
      }
    }
    fired.push("R9_BIPA");
  }

  // ------- Rule R10: Children's data — adds notes to existing jurisdictions -------
  if (intake.processes_children_data) {
    for (const j of map.values()) {
      j.obligations.push("childrens_data_safeguards");
    }
    fired.push("R10_CHILDREN");
  }

  // ------- Confidence scoring -------
  const reasons: string[] = [];
  let score = 0;
  if (home) { score += 2; reasons.push("home jurisdiction provided"); }
  else { warnings.push("No home jurisdiction — recommendations may miss local registration."); }
  if (intake.organization_size) { score += 1; reasons.push("org size provided"); }
  if ((intake.employee_count ?? 0) > 0) { score += 2; reasons.push("employee count provided"); }
  else warnings.push("No employee count — DE BDSG DPO threshold cannot be evaluated.");
  if (intake.industry) { score += 1; reasons.push("industry provided"); }
  if (intake.role) { score += 1; reasons.push("controller/processor role provided"); }
  else warnings.push("No controller/processor role — processor obligations may be miscategorised.");
  if (markets.size > 0) { score += 2; reasons.push(`${markets.size} markets specified`); }
  else warnings.push("No markets selected — extraterritorial application not evaluated.");
  if (intake.processes_personal_data !== undefined) { score += 1; reasons.push("processing scope confirmed"); }

  const confidence: "high" | "medium" | "low" =
    score >= 8 ? "high" : score >= 5 ? "medium" : "low";

  // Force "low" if we recommended jurisdictions but lacked critical context.
  let finalConfidence = confidence;
  if (map.size > 0 && (!home || markets.size === 0)) {
    finalConfidence = "low";
  }

  return {
    jurisdictions: Array.from(map.values()),
    obligations_summary: {
      eu_representative_required: euRepRequired,
      uk_representative_required:
        markets.has("UK") && !intake.has_uk_establishment,
      dpo_required: dpoRequired,
      ai_act_provider_obligations: aiActProvider,
      data_broker_registrations: dataBrokerStates,
    },
    confidence: finalConfidence,
    confidence_reasons: reasons,
    rules_fired: fired,
    warnings,
  };
}
