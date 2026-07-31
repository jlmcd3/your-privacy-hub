// REGISTRATION-INTAKE-CONTRACT-RAIL-MAP (2026-07-24) — Registration Assessment
// intake contract, authored on the same pattern as the other 9 contracts.
//
// Source of truth for keys:
//   - Form state:  src/pages/RegistrationAssessment.tsx `IntakeState` (L32-61)
//   - Submit body: `payload` at L179-190 (numeric strings parsed to Number,
//                  empty strings dropped to undefined). The contract encodes
//                  the EMITTED type (number, not string) for
//                  employee_count / annual_revenue_usd / data_subjects_count.
//   - Engine reader: supabase/functions/_shared/registration-engine.ts
//                    `IntakeData` (L30-77), which the edge function reads
//                    at run-registration-assessment/index.ts L188.
//
// Enum sources:
//   - organization_size    → ORG_SIZES.value   (src/data/registration_jurisdictions.ts L81-87)
//   - industry             → INDUSTRIES        (L89-100) — closed list ending in "Other"
//   - role                 → "controller" | "processor" | "both" (form L43)
//   - eu_lead_member_state → JURISDICTION_OPTIONS EU + EEA codes
//   - markets_served       → JURISDICTION_OPTIONS.code (multi-enum)
//   - organization_country → JURISDICTION_OPTIONS.code (open — the country
//                            select renders every code in the file). The
//                            contract encodes it as `text` (free country
//                            code) because the engine tolerates any ISO
//                            code and the list is broader than the contract
//                            should be a runtime whitelist for.
//
// FORM-vs-ENGINE DRIFT NOTES (do not act on this turn — audit-only):
//   - The form emits `is_public_authority` (public-entity flag, CEO 2026-07-23).
//     Engine reads it (registration-engine.ts L76). ✔
//   - The form emits `industry`; the engine `IntakeData` declares `industry`
//     but the engine's rules only branch on `organization_size` /
//     activity booleans — `industry` is currently a passthrough carried on
//     the persisted `intake_data`. Contract keeps it (form emits it).
//   - The form omits engine-declared optional fields (none currently
//     mandatory on either side beyond `organization_country` OR
//     `markets_served`, enforced in the edge function at L196-200 and
//     mirrored by the contract via requiredWhen on those two keys).

import type { IntakeContract } from "./types.ts";

// ── Verbatim enum copies (single source of truth = the .ts modules above) ──

// ORG_SIZES.value (src/data/registration_jurisdictions.ts L81-87).
export const REGISTRATION_ORG_SIZES = [
  "micro",
  "small",
  "medium",
  "large",
  "enterprise",
] as const;

// INDUSTRIES (src/data/registration_jurisdictions.ts L89-100). Closed list.
export const REGISTRATION_INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Financial services",
  "AdTech / MarTech",
  "Education",
  "Media / Publishing",
  "Manufacturing",
  "Public sector",
  "Other",
] as const;

// role — form L43 (union incl. "" — but the submit path drops "" to
// undefined at L184, so the contract does not accept "" as a value).
export const REGISTRATION_ROLES = ["controller", "processor", "both"] as const;

// EU + EEA jurisdiction codes eligible as the GDPR lead SA (subset of
// JURISDICTION_OPTIONS). Verbatim from src/data/registration_jurisdictions.ts.
export const REGISTRATION_EU_LEAD_CODES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "NO","IS","LI",
] as const;

// markets_served options — full JURISDICTION_OPTIONS.code list.
export const REGISTRATION_MARKET_CODES = [
  // EU
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  // EEA
  "NO","IS","LI",
  // Europe non-EU
  "UK","CH",
  // North America
  "US","US-CA","US-CO","US-CT","US-IL","US-OR","US-TX","US-UT","US-VA","US-VT","US-WA",
  "CA","CA-QC",
  // Latin America
  "BR","AR","MX",
  // APAC
  "SG","JP","KR","AU","NZ","IN",
  // MENA
  "AE","SA","IL",
  // Africa
  "ZA","NG","KE",
] as const;

// ITEM 316 — claimed data-broker statutory exclusion. The values name the
// exclusion FAMILIES the four statutes use; the engine records the claim and
// analyses it against the reproduced exclusion text, and never auto-accepts it.
export const REGISTRATION_BROKER_EXEMPTIONS = [
  "none",
  "fcra_consumer_reporting",
  "glba_financial",
  "hipaa_health",
  "insurance",
  "service_provider_processor",
  "affiliate_or_subsidiary",
  "publicly_available_information",
  "unknown",
] as const;

export const registrationContract: IntakeContract = {
  tool_type: "registration_assessment",
  // The edge function persists intake at registration_assessments.intake_data;
  // there is no `registration_runs` table on this tool (SAMPLE_MAP path is
  // "invoke_body.intake_data" to match the .functions.invoke body at L189).
  table: "registration_assessments",
  fields: [
    // ── Step 1 — organisation basics ────────────────────────────────────
    { key: "organization_name",   kind: "text",    required: "always" },
    { key: "is_public_authority", kind: "boolean", required: "optional" },
    { key: "organization_country", kind: "text",   required: "conditional",
      requiredWhen: 'organization_country OR markets_served must be non-empty (enforced at run-registration-assessment/index.ts L196-200)' },
    { key: "organization_size",   kind: "enum",    required: "optional",
      options: REGISTRATION_ORG_SIZES },
    { key: "industry",            kind: "enum",    required: "optional",
      options: REGISTRATION_INDUSTRIES },
    { key: "email",               kind: "text",    required: "optional" },
    // Parsed to Number in the submit path (L181-183). Contract encodes the
    // EMITTED type; hiddenValue "undefined" is not representable, so keys
    // are simply omitted when the input is blank.
    { key: "employee_count",       kind: "text", required: "optional" },
    { key: "annual_revenue_usd",   kind: "text", required: "optional" },
    { key: "data_subjects_count",  kind: "text", required: "optional" },
    { key: "role", kind: "enum", required: "optional", options: REGISTRATION_ROLES },

    // ── Step 2 — processing context (all booleans) ──────────────────────
    { key: "processes_personal_data",       kind: "boolean", required: "optional" },
    { key: "processes_special_categories",  kind: "boolean", required: "optional" },
    { key: "processes_children_data",       kind: "boolean", required: "optional" },
    { key: "large_scale_monitoring",        kind: "boolean", required: "optional" },
    { key: "uses_ai_systems",               kind: "boolean", required: "optional" },
    { key: "ai_high_risk",                  kind: "boolean", required: "optional" },
    { key: "ai_general_purpose_provider",   kind: "boolean", required: "optional" },
    { key: "cross_border_transfers",        kind: "boolean", required: "optional" },
    { key: "acts_as_data_broker",           kind: "boolean", required: "optional" },
    { key: "sells_or_shares_personal_info", kind: "boolean", required: "optional" },
    { key: "processes_biometrics_for_id",   kind: "boolean", required: "optional" },

    // ── ITEM 316 intake extension (2026-07-31) — data-broker thresholds ──
    // Statute-specific counts and limbs. Emitted by the form as numbers
    // (parsed from string inputs) and booleans; keys are omitted when blank,
    // which the deliverables builder reads as "record does not state".
    { key: "collects_data_not_directly_from_individuals", kind: "boolean", required: "optional" },
    { key: "has_direct_relationship_with_data_subjects",  kind: "boolean", required: "optional" },
    { key: "sells_or_licenses_brokered_data",             kind: "boolean", required: "optional" },
    { key: "brokered_data_individual_count",              kind: "text",    required: "optional" },
    { key: "brokered_data_revenue_share_pct",             kind: "text",    required: "optional" },
    { key: "data_broker_exemption_claimed",               kind: "enum",    required: "optional",
      options: REGISTRATION_BROKER_EXEMPTIONS },
    { key: "filing_contact_details_ready",                kind: "boolean", required: "optional" },
    { key: "filing_opt_out_mechanism_documented",         kind: "boolean", required: "optional" },
    { key: "filing_minors_data_practices_documented",     kind: "boolean", required: "optional" },

    // ── Step 3 — establishment & markets ────────────────────────────────
    { key: "has_eu_establishment", kind: "boolean", required: "optional" },
    { key: "has_uk_establishment", kind: "boolean", required: "optional" },
    { key: "eu_lead_member_state", kind: "enum",    required: "optional",
      options: REGISTRATION_EU_LEAD_CODES },
    { key: "markets_served",       kind: "multi-enum", required: "conditional",
      requiredWhen: 'organization_country OR markets_served must be non-empty (enforced at run-registration-assessment/index.ts L196-200)',
      options: REGISTRATION_MARKET_CODES },
  ],
};
