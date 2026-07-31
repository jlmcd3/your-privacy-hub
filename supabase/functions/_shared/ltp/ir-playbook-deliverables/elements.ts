/**
 * ITEM 312 — registry resolution + closed lexicons for the ir-playbook
 * deliverables.
 *
 * REUSE LAW: every statutory string used by the builder comes from
 * ../../registry/ir-playbook-verified-authorities.ts, whose rows are pinned by
 * exact substring to the approved corpus (gdpr_articles eu '32'/'33'/'34' and
 * provision_texts ukgdpr-art-33 / ukgdpr-art-34). NOTHING is re-typed here.
 *
 * UK-MIRROR RULE (Item 304 Fix D): where the incident's only GDPR-family
 * jurisdiction is the United Kingdom, the Art. 33(1) / Art. 34(1) standards are
 * quoted from the UK mirror rows (which carry "the Commissioner"), never from
 * the EU rows.
 */
import { IR_PLAYBOOK_VERIFIED_AUTHORITIES } from "../../registry/ir-playbook-verified-authorities.ts";
import { requireVerified } from "../../verified-authority-resolver.ts";

/** Resolve an IR registry row, or null when the key is absent. */
export function row(key: string) {
  try {
    return requireVerified(IR_PLAYBOOK_VERIFIED_AUTHORITIES, key);
  } catch {
    return null;
  }
}

/** Proposition keys this module is allowed to cite. */
export const ANCHOR_KEYS = {
  sa_72h: "breach_notify_sa_72h",
  reasons_for_delay: "breach_notify_reasons_for_delay",
  content_a: "notification_content_describe_breach",
  content_b: "notification_content_dpo_contact",
  content_c: "notification_content_likely_consequences",
  content_d: "notification_content_measures_taken",
  phasing: "phased_notification_permitted",
  documentation: "document_breaches_duty",
  ds_high_risk: "communicate_to_data_subject_high_risk",
  ds_plain_language: "communication_clear_plain_language",
  exemption_a: "exception_encryption_unintelligibility",
  exemption_b: "exception_subsequent_measures",
  exemption_c: "exception_disproportionate_effort",
  sa_override: "sa_may_require_communication",
  uk_sa_72h: "uk_gdpr_art_33_mirror",
  uk_ds_high_risk: "uk_gdpr_art_34_mirror",
} as const;

/** Jurisdiction strings that put the EU/EEA GDPR text in scope. */
export const EEA_JURISDICTIONS: readonly string[] = [
  "Ireland", "France", "Germany", "Spain", "Italy", "Netherlands", "Belgium",
  "Sweden", "Denmark", "Poland", "Greece", "Portugal", "Austria", "Finland",
  "Norway", "Luxembourg", "EU/EEA",
];

export const UK_JURISDICTION = "United Kingdom";

/**
 * Data categories that, on their own, raise the severity of a breach.
 * Sourced from the intake's own DATA_TYPES lexicon — no invented categories.
 */
export const SEVERITY_RAISING_DATA_TYPES: readonly string[] = [
  "Health / medical records",
  "Government IDs / SSN",
  "Passwords / credentials",
  "Children's data",
  "Biometric data",
  "Special category data",
  "Financial / payment data",
];

/**
 * The subset above that the Art. 34(1) HIGH-risk test turns on. Deliberately
 * narrower than the Art. 33(1) set: the two thresholds are different standards.
 */
export const HIGH_RISK_DATA_TYPES: readonly string[] = [
  "Health / medical records",
  "Government IDs / SSN",
  "Passwords / credentials",
  "Children's data",
  "Biometric data",
  "Special category data",
];

/** Counts (intake COUNTS lexicon) that indicate large-scale exposure. */
export const LARGE_SCALE_COUNTS: readonly string[] = [
  "10,000–100,000",
  "More than 100,000",
];

/** Causes that indicate a hostile actor holds the data. */
export const HOSTILE_CAUSES: readonly string[] = [
  "Unauthorized external access / cyberattack",
  "Ransomware or malware",
  "Phishing / credential compromise",
  "Insider threat",
];

// ── Intake enums added by ITEM 312 ───────────────────────────────────
export const ENCRYPTION_ALL = "All affected data encrypted / rendered unintelligible";
export const ENCRYPTION_SOME = "Some affected data encrypted";
export const ENCRYPTION_NONE = "No affected data encrypted";
export const ENCRYPTION_UNKNOWN = "Unknown";

export const KEYS_SECURE = "Keys not compromised";
export const KEYS_COMPROMISED = "Keys compromised or possibly compromised";
export const KEYS_NA = "Not applicable — no encryption";
export const KEYS_UNKNOWN = "Unknown";

export const AWARENESS_CONFIRMED = "Confirmed — discovery timestamp verified as the moment of awareness";
export const AWARENESS_ASSUMED = "Assumed — detection timestamp treated as awareness pending confirmation";
export const AWARENESS_UNKNOWN = "Unknown";

/** Owner roles used by the Art. 33(3) content mapping. Closed set. */
export const OWNERS = {
  incident_lead: "Incident Lead (breach response owner)",
  dpo: "Data Protection Officer or nominated contact point",
  forensics: "Security / Forensics Lead",
  remediation: "Remediation Owner",
} as const;

/**
 * SEPARATION LAW lexicon — sentences matching these patterns are exposure
 * framing and are mechanically relocated out of obligation reasoning.
 */
export const EXPOSURE_LEXICON: readonly RegExp[] = [
  /\bfine[sd]?\b/i,
  /\bpenalt(y|ies)\b/i,
  /\benforcement action\b/i,
  /\b(administrative )?sanction/i,
  /\b4\s*%|\b2\s*%|\bEUR\s?20|\b20 million\b/i,
];

/** Placeholder the product uses for a deferral. */
export const TO_BE_COMPLETED = "[TO BE COMPLETED]";
