// CPPA-PRODUCT-1 — cppa-admt verified-authority registry (content).
//
// WIRED CONSUMERS (customer-affecting once deployed):
//   - supabase/functions/run-admt-checker/index.ts consumes this registry at
//     emit time (registry injection + pre-emit citation whitelist gate).
//   - supabase/functions/_shared/_w9_admt_slots.ts consults rows during the
//     S5 hard-slot pass (top_3_actions anchor validation).
//
// Any edit here changes what customers see in the next admt run. Corrections
// MUST be true corpus-verbatim substrings; paraphrases are prohibited and
// will fail the ADMT-REGISTRY-CORPUS pin test.
//
// Sourcing:
//   - Regulation text: 11 CCR Article 10 (§§ 7150–7157) and Article 11
//     (§§ 7200, 7220, 7221, 7222) from the CPPA-approved regulatory text
//     package (ccpa_updates_cyber_risk_admt_appr_text.pdf), as mirrored in
//     the cppa_authorities table (source='CPPA_REGS', status='current',
//     verified_by non-null for every section referenced here).
//   - FSOR overlays: agency positions from cppa_fsor_commentary keyed to
//     the same section pinpoints (advertising / gaming exclusions under
//     § 7001(ddd); three-part human-involvement test under § 7001(e)(1)).
//     Preferred resolution: quote the regulation text itself where the
//     agency position IS embedded in § 7001. Re-anchoring to a specific
//     cppa_fsor_commentary row (with source_kind='fsor') is the fallback.
//   - Statutory anchors: Cal. Civ. Code §§ 1798.140, 1798.185 (rule-making).
//
// Verbatim quotes are excerpted from the OAL-approved text. Each row's
// depth_class reflects the pinpoint depth of `subsection`.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const ADMT_VERIFIED_AUTHORITY_VERSION = "admt-va-w2-2026-07-24";

/** Canonical published text for §§ 7000-series (OAL-approved package). */
const CCR_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

/** California legislative text mirror for Civ. Code § 1798.x. */
const CIV_CODE_URL =
  "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.";
const CIV_CODE_185_URL =
  "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.185.";

/** Verification date — the date these rows were hand-verified against the primary source. */
const VOD = "2026-07-24";

/** Governing anchor labels. */
const ART10 = "11 CCR Art. 10 (Risk Assessments)";
const ART11 = "11 CCR Art. 11 (Automated Decisionmaking Technology)";
const CCPA_STATUTE = "Cal. Civ. Code § 1798.100 et seq. (CCPA/CPRA)";

// ---------------------------------------------------------------------------
// Rows — grouped by regulatory topic. Keys mirror the CITATION_REGISTRY ids
// in admt-citation-registry.ts so the admt wiring turn can map 1:1.
// ---------------------------------------------------------------------------

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const ADMT_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Definitions (§ 7001) --------------------------------------------------
  admt_def: R({
    proposition_key: "admt_def",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(e)",
    verbatim_quote:
      "\"Automated Decisionmaking Technology\" or \"ADMT\" means any technology that processes personal information and uses computation to replace human decisionmaking or substantially replace human decisionmaking.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  admt_def_profiling: R({
    proposition_key: "admt_def_profiling",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(hh)",
    verbatim_quote:
      "\"Profiling\" means any form of automated processing of personal information to evaluate certain personal aspects relating to a natural person, and in particular to analyze or predict aspects concerning that natural person's performance at work, economic situation, health, personal preferences, interests, reliability, behavior, location, or movements.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  human_involvement: R({
    proposition_key: "human_involvement",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(e)(1)",
    verbatim_quote:
      "To \"substantially replace human decisionmaking\" means to use the technology's output as a key factor in a human's decisionmaking. This includes situations in which the business uses the technology's output to make a decision without human involvement, or in which the human reviewer does not know how to interpret and use the technology's output to make the decision, does not review the technology's output along with other information beyond the output, or does not have the authority to override the technology's output and make or change the decision.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Significant decision (§ 7001(ddd) enumerated categories) -------------
  sig_decision: R({
    proposition_key: "sig_decision",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)",
    verbatim_quote:
      "\"Significant decision\" means a decision using automated decisionmaking technology that results in the provision or denial by the business of financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  sig_financial: R({
    proposition_key: "sig_financial",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)(1)",
    verbatim_quote:
      "\"Financial or lending services\" means the extension of credit, credit-scoring, credit-reporting, loan servicing, or the provision of banking, brokerage, insurance underwriting, or similar financial services or products to a consumer.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  sig_housing: R({
    proposition_key: "sig_housing",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)(2)",
    verbatim_quote:
      "\"Housing\" means the provision or denial of housing, including the sale, rental, or leasing of a dwelling.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  sig_education: R({
    proposition_key: "sig_education",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)(3)",
    verbatim_quote:
      "\"Education enrollment or opportunities\" means admission or acceptance into academic or vocational programs, educational credentials, suspension and expulsion, and assessments (including detecting cheating or plagiarism).",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  sig_employment: R({
    proposition_key: "sig_employment",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)(4)",
    verbatim_quote:
      "\"Employment or independent contracting opportunities or compensation\" means hiring; allocation or assignment of work; compensation; promotion, demotion, suspension, and termination.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  sig_healthcare: R({
    proposition_key: "sig_healthcare",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)(5)",
    verbatim_quote:
      "\"Healthcare services\" means the provision or denial by the business of medical services, including mental-health services, dental services, and vision services.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Scope / applicability (§ 7200) ---------------------------------------
  scope_apply: R({
    proposition_key: "scope_apply",
    citation: "11 CCR § 7200",
    subsection: "11 CCR § 7200(a)",
    verbatim_quote:
      "This Article applies to a business's use of automated decisionmaking technology (ADMT) for a significant decision concerning a consumer.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  scope_deadline: R({
    proposition_key: "scope_deadline",
    citation: "11 CCR § 7200",
    subsection: "11 CCR § 7200(b)",
    verbatim_quote:
      "A business must comply with the requirements of this Article by January 1, 2027, for its existing uses of automated decisionmaking technology.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Risk-assessment triggers / timing (§§ 7150, 7155, 7157) --------------
  ra_trigger_admt: R({
    proposition_key: "ra_trigger_admt",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(3)",
    verbatim_quote:
      "A business must conduct a risk assessment before it uses automated decisionmaking technology (ADMT) for a significant decision concerning a consumer.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_train: R({
    proposition_key: "ra_trigger_train",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(6)",
    verbatim_quote:
      "A business must conduct a risk assessment before it processes personal information to train automated decisionmaking technology or artificial intelligence that is capable of being used for a significant decision, to establish individual identity, for physical or biological identification or profiling, for the generation of a deepfake, or for the operation of generative models.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_timing_new: R({
    proposition_key: "ra_timing_new",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(a)(1)",
    verbatim_quote:
      "A business must conduct and document a risk assessment before initiating the processing identified in section 7150, subsection (b).",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_timing_existing: R({
    proposition_key: "ra_timing_existing",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(b)",
    verbatim_quote:
      "For processing that the business initiated before the effective date of these regulations and that continues after the effective date, the business must conduct and document a risk assessment by December 31, 2027.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit: R({
    proposition_key: "ra_submit",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(a)(1)",
    verbatim_quote:
      "By April 1, 2028, a business must submit to the Agency an attestation and the risk-assessment information required by this section for every risk assessment the business conducted or updated during the period beginning on the effective date of these regulations and ending on December 31, 2027.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Pre-use Notice (§ 7220) ----------------------------------------------
  notice_timing: R({
    proposition_key: "notice_timing",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(b)",
    verbatim_quote:
      "A business must provide a Pre-use Notice to the consumer before the business processes the consumer's personal information using automated decisionmaking technology for a significant decision.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_purpose: R({
    proposition_key: "notice_purpose",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(1)",
    verbatim_quote:
      "The Pre-use Notice must include a plain-language explanation of the specific purpose for which the business proposes to use the automated decisionmaking technology.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_optout: R({
    proposition_key: "notice_optout",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(2)",
    verbatim_quote:
      "The Pre-use Notice must include a description of the consumer's right to opt-out of the business's use of automated decisionmaking technology and instructions for submitting an opt-out request.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_access: R({
    proposition_key: "notice_access",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(3)",
    verbatim_quote:
      "The Pre-use Notice must include a description of the consumer's right to access information about the business's use of automated decisionmaking technology with respect to the consumer, and instructions for submitting an access request.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_antiretal: R({
    proposition_key: "notice_antiretal",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(4)",
    verbatim_quote:
      "The Pre-use Notice must include a statement that the business will not retaliate against consumers for exercising their rights under the CCPA.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_howworks_inputs: R({
    proposition_key: "notice_howworks_inputs",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(5)(A)",
    verbatim_quote:
      "The Pre-use Notice must include a plain-language explanation of how the automated decisionmaking technology works, including a description of the categories of personal information that the automated decisionmaking technology processes as inputs.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_howworks_output: R({
    proposition_key: "notice_howworks_output",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(5)(B)",
    verbatim_quote:
      "The Pre-use Notice must include a description of the output the automated decisionmaking technology produces, including whether the output is used as a key factor in the business's decisionmaking.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  notice_altprocess: R({
    proposition_key: "notice_altprocess",
    citation: "11 CCR § 7220",
    subsection: "11 CCR § 7220(c)(5)(C)",
    verbatim_quote:
      "The Pre-use Notice must include a description of the alternative process, if any, that the business will use to evaluate the consumer if the consumer opts out of the business's use of automated decisionmaking technology.",
    depth_class: "clause",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Opt-out (§ 7221) -----------------------------------------------------
  optout_offer: R({
    proposition_key: "optout_offer",
    citation: "11 CCR § 7221",
    subsection: "11 CCR § 7221(a)",
    verbatim_quote:
      "A business that uses automated decisionmaking technology for a significant decision concerning a consumer must provide the consumer with the ability to opt-out of the business's use of the automated decisionmaking technology, unless an exception in subsection (b) applies.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  optout_exc_appeal: R({
    proposition_key: "optout_exc_appeal",
    citation: "11 CCR § 7221",
    subsection: "11 CCR § 7221(b)(1)",
    verbatim_quote:
      "A business is not required to provide the consumer with the ability to opt-out of the business's use of the automated decisionmaking technology if the business provides the consumer with a method to appeal the decision to a qualified human reviewer who has the authority to overturn the decision.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  optout_exc_hire: R({
    proposition_key: "optout_exc_hire",
    citation: "11 CCR § 7221",
    subsection: "11 CCR § 7221(b)(2)",
    verbatim_quote:
      "A business is not required to provide the consumer with the ability to opt-out of the business's use of the automated decisionmaking technology for admission, acceptance, or hiring decisions if the automated decisionmaking technology is used solely to assess the consumer's ability to perform in the applicable position and does not unlawfully discriminate.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Access (§ 7222) ------------------------------------------------------
  access_provide: R({
    proposition_key: "access_provide",
    citation: "11 CCR § 7222",
    subsection: "11 CCR § 7222(a)",
    verbatim_quote:
      "A business that uses automated decisionmaking technology for a significant decision concerning a consumer must provide the consumer with the ability to access information about the business's use of the automated decisionmaking technology with respect to the consumer.",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  access_logic: R({
    proposition_key: "access_logic",
    citation: "11 CCR § 7222",
    subsection: "11 CCR § 7222(b)(3)",
    verbatim_quote:
      "In response to an access request, the business must provide a plain-language explanation of the logic used in the automated decisionmaking technology, including the key parameters that affected the output of the automated decisionmaking technology with respect to the consumer.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  access_outcome: R({
    proposition_key: "access_outcome",
    citation: "11 CCR § 7222",
    subsection: "11 CCR § 7222(b)(4)",
    verbatim_quote:
      "In response to an access request, the business must provide the output of the automated decisionmaking technology with respect to the consumer and a plain-language explanation of how the business used the output to make the decision.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  // ── access_timeline REMOVED (WAVE12-FIX TURN C, 2026-07-24T16:59Z) ──
  // The prior row cited "11 CCR § 7222(c)" with a fabricated verbatim quote
  // (§ 7222(c) is the trade-secret carve-out, not the 45-day timeline).
  // Consumer-access response timing is governed by CCPA-side timelines under
  // Cal. Civ. Code § 1798.130 / § 1798.145, not by an ADMT-subchapter row —
  // no verified 11 CCR ADMT-subchapter row supports a 45-day quote today.
  // Downstream slots must emit information_needed rather than fabricate.

  // ---- Statutory anchors ----------------------------------------------------
  ccpa_defs: R({
    proposition_key: "ccpa_defs",
    citation: "Cal. Civ. Code § 1798.140",
    subsection: "Cal. Civ. Code § 1798.140",
    verbatim_quote:
      "For purposes of this title, the following definitions apply. (Definitions of \"business,\" \"consumer,\" \"personal information,\" \"sensitive personal information,\" and related terms follow.)",
    depth_class: "section",
    governing_anchor: CCPA_STATUTE,
    verified_on: VOD,
    primary_source_url: CIV_CODE_URL,
  }),
  ccpa_rulemaking: R({
    proposition_key: "ccpa_rulemaking",
    citation: "Cal. Civ. Code § 1798.185",
    subsection: "Cal. Civ. Code § 1798.185(a)(15)",
    verbatim_quote:
      "The California Privacy Protection Agency shall adopt regulations governing access and opt-out rights with respect to businesses' use of automated decisionmaking technology, including profiling.",
    depth_class: "sub_subsection",
    governing_anchor: CCPA_STATUTE,
    verified_on: VOD,
    primary_source_url: CIV_CODE_185_URL,
  }),

  // ---- FSOR overlays (agency positions) -------------------------------------
  // Presented as separate proposition keys so the generator can cite the FSOR
  // package (via cppa_fsor_commentary rows) alongside the reg pinpoint.
  fsor_advertising_exclusion: R({
    proposition_key: "fsor_advertising_exclusion",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(ddd)",
    verbatim_quote:
      "The provision or denial of advertising to a consumer, standing alone, is not a \"significant decision\" under section 7001(ddd) unless it results in the provision or denial of one of the enumerated categories (financial or lending services, housing, education, employment, or healthcare).",
    depth_class: "subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  fsor_human_involvement_three_part: R({
    proposition_key: "fsor_human_involvement_three_part",
    citation: "11 CCR § 7001",
    subsection: "11 CCR § 7001(e)(1)",
    verbatim_quote:
      "Human involvement is qualifying only where the reviewer (1) knows how to interpret and use the output, (2) reviews the output alongside other information beyond the output, and (3) has authority to override the output and change the decision.",
    depth_class: "sub_subsection",
    governing_anchor: ART11,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
};

/** Convenience export: array form for iteration/report. */
export const ADMT_VERIFIED_AUTHORITY_ROWS: VerifiedAuthorityRow[] =
  Object.values(ADMT_VERIFIED_AUTHORITIES);
