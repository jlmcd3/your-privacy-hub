// RISK-REGISTRY-WIRING (2026-07-24) — cppa-risk verified-authority registry.
//
// Authored per the RISK-REGISTRY-AUTHORING dispatch on the exact pattern of
// admt-verified-authorities.ts (same row shape, same resolver contract).
//
// AUTHORING RULE (audit standing order): every row MUST pass corpus-pin from
// the first commit. Any proposition that cannot carry an exact contiguous
// substring of cppa_authorities.full_text (status='current') is EXCLUDED,
// never paraphrased, never labelled verbatim. KNOWN_PARAPHRASED_KEYS is
// therefore EMPTY on entry.
//
// Sourcing:
//   - Regulation text: 11 CCR Article 10 (§§ 7150–7157) from the CPPA-approved
//     regulatory text package (ccpa_updates_cyber_risk_admt_appr_text.pdf),
//     mirrored in cppa_authorities (source='CPPA_REGS', status='current').
//     Statutory placeholders such as "[OAL to fill in the effective date of
//     these regulations]" are preserved verbatim (CORPUS-2 precedent).
//   - Statutory anchors: Cal. Civ. Code § 1798.140 (definitions — post-CPRA
//     lettering; the "Third party" definition is (ai), NOT (ad) which is
//     "Sell"); § 1798.185(a)(15) (ADMT rule-making authority).
//
// WIRED CONSUMERS (customer-affecting once the deploy turn lands — this
// authoring turn does NOT wire the registry into any generator):
//   - supabase/functions/run-cppa-risk-assessment/index.ts (planned).
//
// Verbatim quotes are excerpted from the OAL-approved text; each row's
// depth_class reflects the pinpoint depth of `subsection`.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const RISK_VERIFIED_AUTHORITY_VERSION = "risk-va-w1-2026-07-24";

/** Canonical published text for §§ 7150–7157 (OAL-approved package). */
const CCR_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

/** California legislative text mirrors for Civ. Code § 1798.x. */
const CIV_CODE_140_URL =
  "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.";
const CIV_CODE_185_URL =
  "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.185.";

/** Verification date — the date these rows were hand-verified against the primary source. */
const VOD = "2026-07-24";

/** Governing anchor labels. */
const ART10 = "11 CCR Art. 10 (Risk Assessments)";
const CCPA_STATUTE = "Cal. Civ. Code § 1798.100 et seq. (CCPA/CPRA)";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const RISK_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- § 7150 — When a Business Must Conduct a Risk Assessment --------------
  ra_when_required: R({
    proposition_key: "ra_when_required",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(a)",
    verbatim_quote:
      "Every business whose processing of consumers' personal information presents significant risk to consumers' privacy as set forth in subsection (b) must conduct a risk assessment before initiating that processing.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_triggers_intro: R({
    proposition_key: "ra_triggers_intro",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)",
    verbatim_quote:
      "Each of the following processing activities presents significant risk to consumers' privacy:",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_sell_share: R({
    proposition_key: "ra_trigger_sell_share",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(1)",
    verbatim_quote: "Selling or sharing personal information.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_sensitive: R({
    proposition_key: "ra_trigger_sensitive",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(2)",
    verbatim_quote: "Processing sensitive personal information.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_sensitive_hr_exclusion: R({
    proposition_key: "ra_trigger_sensitive_hr_exclusion",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(2)(A)",
    verbatim_quote:
      "A business that processes the sensitive personal information of its employees or independent contractors solely and specifically for purposes of administering compensation payments, determining and storing employment authorization, administering employment benefits, providing reasonable accommodation as required by law, or wage reporting as required by law, is not required to conduct a risk assessment for the processing of sensitive personal information for these purposes.",
    depth_class: "clause",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_admt: R({
    proposition_key: "ra_trigger_admt",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(3)",
    verbatim_quote:
      "Using ADMT for a significant decision concerning a consumer.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_infer_context: R({
    proposition_key: "ra_trigger_infer_context",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(4)",
    verbatim_quote:
      "Using automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_trigger_infer_sensitive_location: R({
    proposition_key: "ra_trigger_infer_sensitive_location",
    citation: "11 CCR § 7150",
    subsection: "11 CCR § 7150(b)(5)",
    verbatim_quote:
      "Using automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, or movements, based upon that",
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
      "Processing the personal information of consumers, which the business intends to use to train an ADMT for a significant decision concerning a consumer; or train a facial-recognition, emotion-recognition, or other technology that verifies a consumer's identity, or conducts physical or biological identification or profiling of a consumer.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7151 — Stakeholder Involvement -------------------------------------
  ra_stakeholder_internal: R({
    proposition_key: "ra_stakeholder_internal",
    citation: "11 CCR § 7151",
    subsection: "11 CCR § 7151(a)",
    verbatim_quote:
      "A business's employees whose job duties include participating in the processing of personal information that would be subject to a risk assessment must be included in the business's risk assessment process for that processing activity.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_stakeholder_external: R({
    proposition_key: "ra_stakeholder_external",
    citation: "11 CCR § 7151",
    subsection: "11 CCR § 7151(b)",
    verbatim_quote:
      "In conducting the risk assessment, a business may include external parties in the process.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7152 — Risk Assessment Requirements (content) ----------------------
  ra_content_intro: R({
    proposition_key: "ra_content_intro",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)",
    verbatim_quote:
      "A business must conduct a risk assessment to determine whether the risks to consumers' privacy from the processing of personal information outweigh the benefits to the consumer, the business, other stakeholders, and the public from that same processing.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_purpose: R({
    proposition_key: "ra_content_purpose",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(1)",
    verbatim_quote:
      "Identify and document in a risk assessment report the business's purpose for processing consumers' personal information. The purpose must not be identified or described in generic terms, such as \"to improve our services\" or for \"security purposes.\"",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_categories: R({
    proposition_key: "ra_content_categories",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(2)",
    verbatim_quote:
      "Identify and document in a risk assessment report the categories of personal information to be processed, including any categories of sensitive personal information. This must include the minimum personal information that is necessary to achieve the purpose of processing consumers' personal information.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_operational: R({
    proposition_key: "ra_content_operational",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(3)",
    verbatim_quote:
      "Identify and document in a risk assessment report the following operational elements of the processing:",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_op_method: R({
    proposition_key: "ra_content_op_method",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(3)(A)",
    verbatim_quote:
      "The business's planned method for collecting, using, disclosing, retaining, or otherwise processing personal information, and the sources of the personal information.",
    depth_class: "clause",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_op_retention: R({
    proposition_key: "ra_content_op_retention",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(3)(B)",
    verbatim_quote:
      "How long the business plans to retain each category of personal information, or if unknown, the criteria the business plans to use to determine that retention period.",
    depth_class: "clause",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_op_disclosures: R({
    proposition_key: "ra_content_op_disclosures",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(3)(E)",
    verbatim_quote:
      "What disclosures the business has made or plans to make to the consumer about the processing of their personal information and how these disclosures were or will be made",
    depth_class: "clause",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_op_recipients: R({
    proposition_key: "ra_content_op_recipients",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(3)(F)",
    verbatim_quote:
      "The names or categories of the service providers, contractors, or third parties to whom the business discloses or makes available the consumers' personal information for the processing; and the purpose for which the business discloses or makes the consumers' personal information available to them.",
    depth_class: "clause",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_benefits: R({
    proposition_key: "ra_content_benefits",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(4)",
    verbatim_quote:
      "Identify the benefits to the business, the consumer, other stakeholders, and the public from the processing of the personal information, as applicable. The benefits must not be identified in generic terms, such as \"improving our service.\"",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_negative_impacts: R({
    proposition_key: "ra_content_negative_impacts",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(5)",
    verbatim_quote:
      "Identify the negative impacts to consumers' privacy associated with the processing. The business must identify the sources and causes of these negative impacts.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_safeguards: R({
    proposition_key: "ra_content_safeguards",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(6)",
    verbatim_quote:
      "Identify and document in a risk assessment report any safeguards that the business plans to implement for the processing, such as safeguards to address the negative impacts identified in subsection (a)(5).",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_initiate: R({
    proposition_key: "ra_content_initiate",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(7)",
    verbatim_quote:
      "Identify and document in a risk assessment report whether it will initiate the processing subject to the risk assessment.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_contributors: R({
    proposition_key: "ra_content_contributors",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(8)",
    verbatim_quote:
      "Identify and document in a risk assessment report the individuals who provided the information for the risk assessment, except for legal counsel who provided legal advice.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_content_approval: R({
    proposition_key: "ra_content_approval",
    citation: "11 CCR § 7152",
    subsection: "11 CCR § 7152(a)(9)",
    verbatim_quote:
      "Identify and document in a risk assessment report the date the assessment was reviewed and approved, and the names and positions of the individuals who reviewed or approved the assessment, except for legal counsel who provided legal advice.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7153 — Additional Requirements for Training ADMT -------------------
  ra_train_recipient_facts: R({
    proposition_key: "ra_train_recipient_facts",
    citation: "11 CCR § 7153",
    subsection: "11 CCR § 7153(a)",
    verbatim_quote:
      "A business that makes ADMT available to another business (\"recipient-",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_train_scope: R({
    proposition_key: "ra_train_scope",
    citation: "11 CCR § 7153",
    subsection: "11 CCR § 7153(b)",
    verbatim_quote:
      "The requirements of this section apply only to ADMT trained using personal information.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7154 — Goal of a Risk Assessment -----------------------------------
  ra_goal: R({
    proposition_key: "ra_goal",
    citation: "11 CCR § 7154",
    subsection: "11 CCR § 7154(a)",
    verbatim_quote:
      "The goal of a risk assessment is restricting or prohibiting the processing of personal information if the risks to privacy of the consumer outweigh the benefits resulting from processing to the consumer, the business, other stakeholders, and the public.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7155 — Timing and Retention ----------------------------------------
  ra_timing_new: R({
    proposition_key: "ra_timing_new",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(a)(1)",
    verbatim_quote:
      "A business must conduct and document a risk assessment in accordance with the requirements of this Article before initiating any processing activity identified in section 7150, subsection (b).",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_timing_review_3yr: R({
    proposition_key: "ra_timing_review_3yr",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(a)(2)",
    verbatim_quote:
      "At least once every three years, a business must review, and update as necessary, its risk assessments to ensure that they remain accurate in accordance with the requirements of this Article.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_timing_material_change: R({
    proposition_key: "ra_timing_material_change",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(a)(3)",
    verbatim_quote:
      "a business must update a risk assessment whenever there is a material change relating to the processing activity, as soon as feasibly possible, but no later than 45 calendar days from the date of the material change.",
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
      "For any processing activity identified in section 7150, subsection (b), that the business initiated prior to [OAL to fill in the effective date of these regulations] and that continues after [OAL to fill in the effective date of these regulations], the business must conduct, and document as set forth in section 7152, a risk assessment in accordance with the requirements of this Article no later than December 31, 2027.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_retention: R({
    proposition_key: "ra_retention",
    citation: "11 CCR § 7155",
    subsection: "11 CCR § 7155(c)",
    verbatim_quote:
      "A business must retain its risk assessments, including original and updated versions, for as long as the processing continues or for five years after the completion of the risk assessment, whichever is later.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7156 — Comparable Sets & Reuse -------------------------------------
  ra_comparable_set: R({
    proposition_key: "ra_comparable_set",
    citation: "11 CCR § 7156",
    subsection: "11 CCR § 7156(a)",
    verbatim_quote:
      "A business may conduct a single risk assessment for a comparable set of processing activities. A \"comparable set of processing activities\" that can be addressed by a single risk assessment is a set of similar processing activities that present similar risks to consumers' privacy.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_other_law_reuse: R({
    proposition_key: "ra_other_law_reuse",
    citation: "11 CCR § 7156",
    subsection: "11 CCR § 7156(b)",
    verbatim_quote:
      "A business may utilize a risk assessment that it has prepared for another purpose to meet the requirements in section 7152, provided that the risk assessment contains the information that must be included in, or is paired with the outstanding information necessary for, compliance with section 7152.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- § 7157 — Submission of Risk Assessments to the Agency ----------------
  ra_submit_2026_2027: R({
    proposition_key: "ra_submit_2026_2027",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(a)(1)",
    verbatim_quote:
      "For risk assessments conducted in 2026 and 2027, the business must submit to the Agency the information required by subsection (b) no later than April 1, 2028.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_ongoing: R({
    proposition_key: "ra_submit_ongoing",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(a)(2)",
    verbatim_quote:
      "For risk assessments conducted after 2027, the business must submit to the Agency the information required by subsection (b) no later than April 1 following any year during which the business conducted the risk assessments.",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_content_intro: R({
    proposition_key: "ra_submit_content_intro",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(b)",
    verbatim_quote:
      "A business must submit to the Agency the following risk assessment information:",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_attestation: R({
    proposition_key: "ra_submit_attestation",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(b)(5)",
    verbatim_quote:
      "Attestation to the following statement: \"I attest that the business has conducted a risk assessment for the processing activities set forth in California Code of Regulations, Title 11, section 7150, subsection (b), during the time period covered by this submission, and that I meet the requirements of section 7157, subsection (c). Under penalty of perjury under the laws of the state of California, I hereby declare that the risk assessment information submitted is true and correct.\"",
    depth_class: "sub_subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_signer: R({
    proposition_key: "ra_submit_signer",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(c)",
    verbatim_quote:
      "The individual submitting the information set forth in subsection (b) must be a member of the business's executive management team who:",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_portal: R({
    proposition_key: "ra_submit_portal",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(d)",
    verbatim_quote:
      "The risk assessment information must be submitted to the Agency via the Agency's website at https://cppa.ca.gov/.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),
  ra_submit_ondemand: R({
    proposition_key: "ra_submit_ondemand",
    citation: "11 CCR § 7157",
    subsection: "11 CCR § 7157(e)",
    verbatim_quote:
      "The Agency or the Attorney General may require a business to submit its risk assessment reports to the Agency or to the Attorney General at any time. A business must submit its risk assessment reports within 30 calendar days of the Agency's or the Attorney General's request.",
    depth_class: "subsection",
    governing_anchor: ART10,
    verified_on: VOD,
    primary_source_url: CCR_URL,
  }),

  // ---- Statutory anchors ----------------------------------------------------
  // Post-CPRA lettering: "Third party" is § 1798.140(ai), NOT (ad) which is
  // "Sell". The subsection label reflects the (ai) anchor even though the
  // verbatim substring itself is the definition proper.
  ccpa_third_party_def: R({
    proposition_key: "ccpa_third_party_def",
    citation: "Cal. Civ. Code § 1798.140",
    subsection: "Cal. Civ. Code § 1798.140(ai)",
    verbatim_quote:
      "\"Third party\" means a person who is not any of the following:",
    depth_class: "sub_subsection",
    governing_anchor: CCPA_STATUTE,
    verified_on: VOD,
    primary_source_url: CIV_CODE_140_URL,
  }),
  ccpa_rulemaking: R({
    proposition_key: "ccpa_rulemaking",
    citation: "Cal. Civ. Code § 1798.185",
    subsection: "Cal. Civ. Code § 1798.185(a)(15)",
    verbatim_quote:
      "Issuing regulations governing access and opt-out rights with respect to a business' use of automated decisionmaking technology, including profiling and requiring a business' response to access requests to include meaningful information about the logic involved in those decisionmaking processes, as well as a description of the likely outcome of the process with respect to the consumer.",
    depth_class: "sub_subsection",
    governing_anchor: CCPA_STATUTE,
    verified_on: VOD,
    primary_source_url: CIV_CODE_185_URL,
  }),
};

/** Convenience export: array form for iteration/report. */
export const RISK_VERIFIED_AUTHORITY_ROWS: VerifiedAuthorityRow[] =
  Object.values(RISK_VERIFIED_AUTHORITIES);
