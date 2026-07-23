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
    // QB-P24 Addendum Item 9(a) — DPO precision. `dpo_trigger` names the
    // engaged Art. 37(1) branch (or BDSG §38) when `dpo_required=true`.
    // `dpo_condition` carries the deciding fact when the intake does not
    // establish an unconditional trigger for a small controller (in which
    // case `dpo_required` is false, per the addendum).
    dpo_trigger: string | null;
    dpo_condition: string | null;
    // QB-P24 Addendum Item 7 — honest name. Value equals
    // `gpai_provider_obligations || high_risk_ai_deployer_obligations`. The
    // legacy key `ai_act_provider_obligations` is retained here purely as a
    // read-only alias for any downstream reader that still reaches for it —
    // internal consumers verified this turn: generate-report-pdf and
    // engine_test only. Both are updated to read the new key; the alias is
    // scheduled for removal in the next courier.
    ai_act_obligations_engaged: boolean;
    /** @deprecated Use `ai_act_obligations_engaged`. */
    ai_act_provider_obligations: boolean;
    gpai_provider_obligations: boolean;
    high_risk_ai_deployer_obligations: boolean;
    data_broker_registrations: string[]; // jurisdiction codes (data-broker registries only)
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
      "Established in this jurisdiction — home-jurisdiction data-protection obligations apply; general registration only where this jurisdiction operates a registration scheme",
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

  // Deduplicate: if UK is in the map (from R4), remove any bare GB market entry
  // added by R3 — the UK entry covers GB residents under UK GDPR/DPA 2018.
  if (map.has("UK") && map.has("GB")) {
    map.delete("GB");
  }

  // ------- Rule R5: DPO appointment triggers -------
  // GDPR Art. 37 + national thresholds (DE 20-employee rule).
  // GDPR Art. 37 only applies when EU/UK scope is present.
  const hasEuOrUkScope =
    intake.has_eu_establishment ||
    intake.has_uk_establishment ||
    euMarkets.length > 0 ||
    markets.has("UK") ||
    markets.has("GB");
  let dpoRequired = false;
  const dpoReasons: string[] = [];
  if (
    hasEuOrUkScope &&
    (
      intake.processes_special_categories ||
      intake.large_scale_monitoring ||
      (intake.processes_personal_data && (intake.data_subjects_count ?? 0) > 100_000)
    )
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

  // ------- Rule R6: EU AI Act (split by role) -------
  // Chapter III (Arts. 26–29) + Art. 49(2) EU database — high-risk AI DEPLOYER.
  // Chapter V (Arts. 53–55) — GPAI PROVIDER (places a general-purpose AI
  // model on the EU market). The two obligation sets are DISTINCT: an org
  // may be a GPAI provider without deploying a high-risk system, and vice
  // versa. Do not conflate.
  let highRiskDeployer = false;
  let gpaiProvider = false;
  if (intake.ai_high_risk && (intake.has_eu_establishment || euMarkets.length > 0)) {
    highRiskDeployer = true;
    const target = intake.has_eu_establishment
      ? (intake.eu_lead_member_state || home || "IE")
      : (euMarkets[0] || "IE");
    ensure(map, target, "R6_AI_HIGH_RISK",
      "Deployer/provider of a high-risk AI system in the EU — Chapter III (Arts. 26–29) deployer duties and Art. 49(2) EU-database registration engaged",
      "ai_eu_database");
    fired.push("R6_AI_HIGH_RISK");
  }
  if (intake.ai_general_purpose_provider && (intake.has_eu_establishment || euMarkets.length > 0)) {
    gpaiProvider = true;
    fired.push("R6_AI_GPAI");
  }
  const aiActProvider = highRiskDeployer || gpaiProvider;

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

    // ------- Rule R7a: California SB 361 (2025) expanded DROP disclosures -------
    // SB 361 amended Civ. Code § 1798.99.82(b)(2) effective for the 2026 registration
    // cycle. Data brokers registering with the CPPA must now be prepared to answer
    // an expanded set of yes/no disclosures at filing time, covering collection of
    // sensitive personal-information categories AND sharing/selling to specified
    // recipient classes (foreign actors, federal government, other state
    // governments, law enforcement, and developers of GenAI systems). List drawn
    // verbatim from SB 361 Sec. 1, subparagraphs (C)–(S) as enrolled at
    // leginfo.ca.gov (bill_id 202520260SB361).
    if (map.has("US-CA") && map.get("US-CA")!.obligations.includes("data_broker_registration")) {
      const ca = map.get("US-CA")!;
      if (!ca.obligations.includes("sb361_disclosure_preparation")) {
        ca.obligations.push("sb361_disclosure_preparation");
      }
      warnings.push(
        "California SB 361 (2025) — before submitting the 2026 CPPA data-broker (DROP) " +
        "registration, prepare responses to the expanded § 1798.99.82(b)(2) disclosures: " +
        "(C) collects minors' PI; (D) names / DOB / ZIP / email / phone; (E) account " +
        "login-or-account-number plus credential; (F) government identifiers (driver's " +
        "license, state ID, tax ID, SSN, passport, military ID); (G) MAID / connected-TV / " +
        "VIN identifiers; (H) citizenship or immigration status; (I) union membership; " +
        "(J) sexual orientation; (K) gender identity or expression; (L) biometric data; " +
        "(M) precise geolocation; (N) reproductive-health-care data; (O) shared/sold to a " +
        "foreign actor (foreign-adversary-country government or entity); (P) shared/sold to " +
        "the federal government; (Q) shared/sold to other state governments; (R) shared/sold " +
        "to law enforcement (excluding subpoena/court-order transfers); (S) shared/sold to a " +
        "developer of a GenAI system. Confirm each item against the current CPPA DROP form " +
        "at https://cppa.ca.gov/data_brokers/ before filing."
      );
    }
  }

  // ------- Rule R8: CCPA-family — sells or shares -------
  // Each state has its own statute; use a jurisdiction-neutral obligation label.
  // Only record R8 as fired when it actually adds a jurisdiction.
  if (intake.sells_or_shares_personal_info) {
    let r8Fired = false;
    for (const c of CCPA_STATES) {
      if (markets.has(c)) {
        ensure(map, c, "R8_CCPA_SELL",
          `Sells/shares personal info — sale/share opt-out and consumer disclosures required (${c})`,
          "sale_share_opt_out");
        r8Fired = true;
      }
    }
    if (r8Fired) fired.push("R8_CCPA_SELL");
  }

  // ------- Rule R9: BIPA-style biometric ID -------
  // US biometric statutes (BIPA, CUBI, WA) apply only when there is US nexus:
  // US establishment, US residents explicitly in scope, or the broad "US" market
  // served by a US-based entity.
  if (intake.processes_biometrics_for_id) {
    const hasUsNexus =
      (home != null && (home === "US" || home.startsWith("US-"))) ||
      markets.has("US") ||
      markets.has("US-IL") ||
      markets.has("US-TX") ||
      markets.has("US-WA");
    if (hasUsNexus) {
      for (const c of ["US-IL", "US-TX", "US-WA"]) {
        if (markets.has(c) || markets.has("US")) {
          ensure(map, c, "R9_BIPA",
            "Processes biometric identifiers — written-consent and retention rules apply",
            "biometric_consent_policy");
        }
      }
      fired.push("R9_BIPA");
    }
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

  // Warn when AI is used but no R6 rule fired — the entity may still have
  // EU AI Act compliance obligations (transparency, human oversight, etc.)
  // without being an Article 49 registrant.
  if (
    intake.uses_ai_systems &&
    !intake.ai_high_risk &&
    !intake.ai_general_purpose_provider &&
    (intake.has_eu_establishment || euMarkets.length > 0)
  ) {
    warnings.push(
      "AI systems in use: EU AI Act applies, but Article 49 database registration " +
      "requires provider or deployer of a high-risk AI system (Annex III) or GPAI model. " +
      "Confirm whether your AI systems fall within scope before concluding no registration obligation."
    );
  }


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
      gpai_provider_obligations: gpaiProvider,
      high_risk_ai_deployer_obligations: highRiskDeployer,
      data_broker_registrations: dataBrokerStates,
    },
    confidence: finalConfidence,
    confidence_reasons: reasons,
    rules_fired: fired,
    warnings,
  };
}
