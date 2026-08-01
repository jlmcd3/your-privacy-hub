/**
 * ITEM 311 — registry resolution + closed lexicons for the lia deliverables.
 *
 * REUSE LAW: every statutory or guidance string used by the builder comes from
 * ../../registry/lia-verified-authorities.ts, which is pinned by exact
 * substring to the approved corpus rows (provision_texts gdpr-art-6-1-f /
 * gdpr-recital-47, and edpb_guidelines "EDPB Guidelines 1/2024"). NOTHING is
 * re-derived or re-typed here.
 */
import { LIA_VERIFIED_AUTHORITIES } from "../../registry/lia-verified-authorities.ts";
import { requireVerified } from "../../verified-authority-resolver.ts";

/** Resolve an LIA registry row, or null when the key is absent. */
export function row(key: string) {
  try {
    return requireVerified(LIA_VERIFIED_AUTHORITIES, key);
  } catch {
    return null;
  }
}

/** Proposition keys this module is allowed to cite. */
export const ANCHOR_KEYS = {
  li_basis: "li_lawful_basis_legitimate_interests",
  child_clause: "li_child_data_subject_clause",
  public_authority: "li_public_authorities_exclusion",
  edpb_public_authority: "edpb_1_2024_public_authorities_exclusion",
  r47_at_collection: "recital_47_reasonable_expectation_at_collection",
  r47_relationship: "recital_47_expectations_from_relationship",
  r47_override: "recital_47_override_where_not_expected",
  edpb_re_weighed: "edpb_1_2024_reasonable_expectations_weighed",
  edpb_re_contextual: "edpb_1_2024_reasonable_expectations_contextual_elements",
  edpb_notice_not_enough: "edpb_1_2024_notice_alone_not_sufficient",
  edpb_child_prevail: "edpb_1_2024_child_interests_prevail",
  edpb_child_protection: "edpb_1_2024_child_specific_protection",
  edpb_three_conditions: "edpb_1_2024_three_cumulative_conditions",
  edpb_necessity: "edpb_1_2024_necessity_less_restrictive_means",
  edpb_mitigation_beyond: "edpb_1_2024_mitigating_measures_beyond_gdpr",
  edpb_mitigation_excluded: "edpb_1_2024_mitigating_measures_exclusions",
  edpb_override_outcome: "edpb_1_2024_balance_override_outcome",
  // ITEM 326 — UK GDPR Chapter III Section 4A + Art. 6(1)(ea).
  eu_art_22_right: "art_22_admt_right",
  uk_art_22_substituted: "uk_art_22_substituted",
  uk_22a_solely_automated: "uk_art_22a_solely_automated_definition",
  uk_22a_significant: "uk_art_22a_significant_decision_definition",
  uk_22a_profiling: "uk_art_22a_profiling_consideration",
  uk_22b_special_category: "uk_art_22b_special_category_restriction",
  uk_22b_recognised_li_bar: "uk_art_22b_recognised_li_bar",
  uk_22c_duty: "uk_art_22c_safeguards_duty",
  uk_22c_measures: "uk_art_22c_safeguard_measures",
  uk_6_1_ea: "uk_art_6_1_ea_recognised_li",
  uk_6_ea_annex_1: "uk_art_6_ea_annex_1_condition",
} as const;

// ── ITEM 326 — jurisdiction branching (mirrors the `ukOnly` pattern in
// ../ir-playbook-deliverables/build.ts: exact-value membership over the
// recorded `jurisdictions` array, no semantic defaults). ────────────────

/** Verbatim option string from LIAssessment.enums.ts JURISDICTIONS. */
export const UK_JURISDICTION = "United Kingdom (UK GDPR)";
/** Verbatim option string from LIAssessment.enums.ts JURISDICTIONS. */
export const EU_JURISDICTION = "EU (GDPR)";

/**
 * ANNEX 1 SCOPE LIMIT (ITEM 326, binding). Annex 1 to the UK GDPR is not held
 * in this tool's corpus (no gdpr_articles / provision_texts row; verified by
 * direct query 2026-08-01). Wherever Art. 6(1)(ea) is mentioned, THIS EXACT
 * SENTENCE is emitted and nothing further: no Annex 1 condition may be
 * stated, paraphrased, listed, or evaluated anywhere downstream.
 */
export const ANNEX_1_RESERVED_NOTE =
  "Article 6(1)(ea) is available only where processing meets a condition in Annex 1. The specific conditions in Annex 1 are outside this tool's current corpus and are not assessed here; whether any Annex 1 condition is met is reserved to review by qualified counsel.";

/** Intake option strings that indicate children are among the data subjects. */
export const CHILD_VULNERABLE_OPTIONS: readonly string[] = [
  "Children under 16",
];

/** Enum answers to `balancing_details.children_data_subjects`. */
export const CHILD_YES = ["yes"];
export const CHILD_NO = ["no"];

/**
 * Reasonable-expectation enum answers, mapped to a verdict direction.
 * Both the contract's short set ("Yes" / "Partly" / "No") and the form's
 * long sentences are matched, because the record carries either.
 */
export const EXPECTATION_POSITIVE: readonly RegExp[] = [
  /^yes\b/i,
  /directly contemplated/i,
];
export const EXPECTATION_PARTIAL: readonly RegExp[] = [
  /^partly\b/i,
  /^probably\b/i,
  /^maybe\b/i,
];
export const EXPECTATION_NEGATIVE: readonly RegExp[] = [
  /^no\b/i,
  /^unlikely\b/i,
  /would surprise/i,
];

/**
 * Language that shows the ONLY support for expectation is that information
 * was supplied. EDPB 1/2024: that is not sufficient in itself.
 */
export const NOTICE_ONLY_LEXICON: readonly RegExp[] = [
  /privacy (notice|policy)/i,
  /\bterms (and|&) conditions\b/i,
  /\bdisclosed in (our|the) (notice|policy)\b/i,
  /\bwe inform(ed)? (them|users|customers)\b/i,
  /\bfair processing notice\b/i,
];

/**
 * Contextual elements EDPB 1/2024 Section II.C.3 lists for the
 * reasonable-expectations assessment, paired with the intake signal that
 * evidences each. Only elements the record actually supplies are emitted.
 */
export interface ContextualElementSpec {
  readonly id: string;
  readonly label: string;
}
export const CONTEXTUAL_ELEMENTS: readonly ContextualElementSpec[] = [
  { id: "relationship_existence", label: "the existence and type of the relationship with the data subject" },
  { id: "collection_context", label: "the place and context in which the personal data were collected" },
  { id: "service_nature", label: "the nature and characteristics of the processing described in the record" },
  { id: "data_nature", label: "the categories of personal data the record states are processed" },
];

/**
 * Measures the GDPR already requires. EDPB 1/2024 Section II.C.4: these do
 * NOT count as mitigating measures in a re-balance.
 */
export const ALREADY_REQUIRED_LEXICON: readonly RegExp[] = [
  /\bencryption\b/i,
  /\baccess controls?\b/i,
  /\bleast privilege\b/i,
  /\bretention limits?\b/i,
  /\bdata minimisation\b/i,
  /\bprivacy notice\b/i,
  /\btransparency\b/i,
  /\bvendor due diligence\b/i,
  /\bresponding to (data subject|access) requests?\b/i,
];

/** Enforcement-exposure framing that must not sit inside a determination. */
export const EXPOSURE_LEXICON: readonly RegExp[] = [
  /\bfine(s|d)?\b/i,
  /\bpenalt(y|ies)\b/i,
  /\benforcement action\b/i,
  /\badministrative fine\b/i,
  /\b4\s*%|\b2\s*%|\bEUR\s?20\s?million|\b£17\.5\s?million/i,
  /\bsanction(s)?\b/i,
  /\bArt(icle)?\.?\s*83\b/i,
];

/** Harm answers that put material weight on the data-subject side. */
export const HARM_MATERIAL: readonly RegExp[] = [
  /^significant/i,
  /^severe/i,
];
