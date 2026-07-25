// DPIA-REGISTRY-AUTHORING (2026-07-25) — run-dpia-framework verified-authority
// registry. Authoring-only turn: this module is DATA and is NOT imported by
// any generator this turn. Wiring is queued as DPIA-REGISTRY-WIRING.
//
// Row shape follows admt-verified-authorities.ts / risk-verified-authorities.ts
// exactly (see supabase/functions/_shared/verified-authority-resolver.ts).
//
// AUTHORING RULE: every verbatim_quote MUST appear as an exact substring of an
// APPROVED corpus row. Sources:
//   * public.provision_texts rows keyed gdpr-art-*  (status='approved',
//     P1 bootstrap; ledger item 38, batch report NONCPPA-P1-BATCH-REPORT
//     -2026-07-25.md), AND
//   * public.edpb_guidelines rows for "EDPB Guidelines 2/2019" only
//     (status='final'; P2 batch 1, ledger item 41).
//
// Any DPIA proposition without an anchor in those two sources gets NO row.
// Write-around targets are enumerated in
// docs/courier/DPIA-REGISTRY-AUTHORING-2026-07-25.md.
//
// Pin-testing: every row passes deterministic substring pin-tests against its
// source excerpt (see scripts/pin-test-dpia-registry.ts pasted output in the
// courier report). KNOWN_PARAPHRASED_KEYS is EMPTY on entry.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const DPIA_VERIFIED_AUTHORITY_VERSION = "dpia-va-w1-2026-07-25";

/** Canonical published text URLs (official primary sources). */
const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const EDPB_2_2019_URL =
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en";

/** Verification date — the date these rows were hand-verified against the primary source. */
const VOD = "2026-07-25";

/** Governing anchor labels. */
const GDPR = "Regulation (EU) 2016/679 (GDPR)";
const EDPB_2_2019 =
  "EDPB Guidelines 2/2019 on processing of personal data under Article 6(1)(b) GDPR";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const DPIA_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Art. 35 — Data protection impact assessment --------------------------
  dpia_when_required: R({
    proposition_key: "dpia_when_required",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(1)",
    verbatim_quote:
      "Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_similar_operations: R({
    proposition_key: "dpia_similar_operations",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(1)",
    verbatim_quote:
      "A single assessment may address a set of similar processing operations that present similar high risks.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_dpo_advice: R({
    proposition_key: "dpia_dpo_advice",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(2)",
    verbatim_quote:
      "The controller shall seek the advice of the data protection officer, where designated, when carrying out a data protection impact assessment.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_mandatory_intro: R({
    proposition_key: "dpia_mandatory_intro",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)",
    verbatim_quote:
      "A data protection impact assessment referred to in paragraph 1 shall in particular be required in the case of:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_mandatory_evaluation: R({
    proposition_key: "dpia_mandatory_evaluation",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(a)",
    verbatim_quote:
      "a systematic and extensive evaluation of personal aspects relating to natural persons which is based on automated processing, including profiling, and on which decisions are based that produce legal effects concerning the natural person or similarly significantly affect the natural person;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_mandatory_special_categories: R({
    proposition_key: "dpia_mandatory_special_categories",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(b)",
    verbatim_quote:
      "processing on a large scale of special categories of data referred to in Article 9(1), or of personal data relating to criminal convictions and offences referred to in Article 10; or",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_mandatory_public_monitoring: R({
    proposition_key: "dpia_mandatory_public_monitoring",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(c)",
    verbatim_quote:
      "a systematic monitoring of a publicly accessible area on a large scale.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_min_content_intro: R({
    proposition_key: "dpia_min_content_intro",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(7)",
    verbatim_quote: "The assessment shall contain at least:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_content_description: R({
    proposition_key: "dpia_content_description",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(7)(a)",
    verbatim_quote:
      "a systematic description of the envisaged processing operations and the purposes of the processing, including, where applicable, the legitimate interest pursued by the controller;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_content_necessity: R({
    proposition_key: "dpia_content_necessity",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(7)(b)",
    verbatim_quote:
      "an assessment of the necessity and proportionality of the processing operations in relation to the purposes;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_content_risks: R({
    proposition_key: "dpia_content_risks",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(7)(c)",
    verbatim_quote:
      "an assessment of the risks to the rights and freedoms of data subjects referred to in paragraph 1; and",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_content_measures: R({
    proposition_key: "dpia_content_measures",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(7)(d)",
    verbatim_quote:
      "the measures envisaged to address the risks, including safeguards, security measures and mechanisms to ensure the protection of personal data and to demonstrate compliance with this Regulation taking into account the rights and legitimate interests of data subjects and other persons concerned.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_review_on_change: R({
    proposition_key: "dpia_review_on_change",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(11)",
    verbatim_quote:
      "Where necessary, the controller shall carry out a review to assess if processing is performed in accordance with the data protection impact assessment at least when there is a change of the risk represented by processing operations.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 5 — Principles (assessed dimensions) ----------------------------
  principle_lawfulness_fairness_transparency: R({
    proposition_key: "principle_lawfulness_fairness_transparency",
    citation: "GDPR Art. 5",
    subsection: "GDPR Art. 5(1)(a)",
    verbatim_quote:
      "processed lawfully, fairly and in a transparent manner in relation to the data subject ('lawfulness, fairness and transparency');",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  principle_purpose_limitation: R({
    proposition_key: "principle_purpose_limitation",
    citation: "GDPR Art. 5",
    subsection: "GDPR Art. 5(1)(b)",
    verbatim_quote:
      "collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  principle_data_minimisation: R({
    proposition_key: "principle_data_minimisation",
    citation: "GDPR Art. 5",
    subsection: "GDPR Art. 5(1)(c)",
    verbatim_quote:
      "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation');",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 6(1)(f) — Legitimate interests basis (as referenced by DPIA) ----
  lawful_basis_legitimate_interests: R({
    proposition_key: "lawful_basis_legitimate_interests",
    citation: "GDPR Art. 6",
    subsection: "GDPR Art. 6(1)(f)",
    verbatim_quote:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 9 — Special categories ------------------------------------------
  special_categories_prohibition: R({
    proposition_key: "special_categories_prohibition",
    citation: "GDPR Art. 9",
    subsection: "GDPR Art. 9(1)",
    verbatim_quote:
      "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 25 — Data protection by design and by default -------------------
  data_protection_by_design: R({
    proposition_key: "data_protection_by_design",
    citation: "GDPR Art. 25",
    subsection: "GDPR Art. 25(1)",
    verbatim_quote:
      "the controller shall, both at the time of the determination of the means for processing and at the time of the processing itself, implement appropriate technical and organisational measures, such as pseudonymisation, which are designed to implement data-protection principles, such as data minimisation, in an effective manner and to integrate the necessary safeguards into the processing in order to meet the requirements of this Regulation and protect the rights of data subjects.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 28 — Processor obligations --------------------------------------
  processor_sufficient_guarantees: R({
    proposition_key: "processor_sufficient_guarantees",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(1)",
    verbatim_quote:
      "Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures in such a manner that processing will meet the requirements of this Regulation and ensure the protection of the rights of the data subject.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_written_contract: R({
    proposition_key: "processor_written_contract",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)",
    verbatim_quote:
      "Processing by a processor shall be governed by a contract or other legal act under Union or Member State law, that is binding on the processor with regard to the controller and that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_documented_instructions: R({
    proposition_key: "processor_documented_instructions",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(a)",
    verbatim_quote:
      "processes the personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which the processor is subject;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_assists_articles_32_36: R({
    proposition_key: "processor_assists_articles_32_36",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(f)",
    verbatim_quote:
      "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 30 — Records of processing activities ---------------------------
  ropa_controller_record: R({
    proposition_key: "ropa_controller_record",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)",
    verbatim_quote:
      "Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 32 — Security of processing -------------------------------------
  security_appropriate_measures: R({
    proposition_key: "security_appropriate_measures",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)",
    verbatim_quote:
      "the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including inter alia as appropriate:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- EDPB Guidelines 2/2019 — Necessity under Art 6(1)(b) -----------------
  // Source row: edpb_guidelines where guideline_ref='EDPB Guidelines 2/2019'
  // and section_heading='2.4 Necessity' (status='final').
  edpb_2_2019_necessity_test: R({
    proposition_key: "edpb_2_2019_necessity_test",
    citation: "EDPB Guidelines 2/2019, § 2.4 (Necessity)",
    subsection: "EDPB Guidelines 2/2019, § 2.4",
    verbatim_quote:
      "If there are realistic, less intrusive alternatives, the processing is not \u2018necessary\u2019.",
    depth_class: "subsection",
    governing_anchor: EDPB_2_2019,
    verified_on: VOD,
    primary_source_url: EDPB_2_2019_URL,
  }),
  edpb_2_2019_useful_not_necessary: R({
    proposition_key: "edpb_2_2019_useful_not_necessary",
    citation: "EDPB Guidelines 2/2019, § 2.4 (Necessity)",
    subsection: "EDPB Guidelines 2/2019, § 2.4",
    verbatim_quote:
      "Article 6(1)(b) will not cover processing which is useful but not objectively necessary for performing the contractual service or for taking relevant pre-contractual steps at the request of the data subject, even if it is necessary for the controller\u2019s other business purposes.",
    depth_class: "subsection",
    governing_anchor: EDPB_2_2019,
    verified_on: VOD,
    primary_source_url: EDPB_2_2019_URL,
  }),
};

/**
 * Propositions the DPIA report asserts today that have NO anchorable support
 * in the approved corpus and therefore carry NO row. Listed here for the
 * DPIA-REGISTRY-WIRING deploy turn (write-around targets).
 *
 * DO NOT paraphrase these into verbatim_quote strings — narrow-but-solid rule.
 */
export const DPIA_UNANCHORED_PROPOSITIONS: readonly string[] = [
  "prior_consultation_art_36",           // GDPR Art. 36 not in approved P1 set
  "dpo_designation_art_37_39",           // Arts. 37-39 not in approved P1 set
  "risk_severity_edpb_wp248",            // WP248 not in P2 batch 1
  "high_risk_criteria_edpb_wp248",       // WP248 not in P2 batch 1
  "consultation_of_data_subjects_35_9",  // covered by Art 35(9), which is in the excerpt but
                                         // is discretionary ("where appropriate") — reserved
                                         // for the wiring turn once the generator surface is
                                         // decided (do not anchor conclusory claims to it).
];

/** Keys where the row's verbatim_quote is a paraphrase rather than a corpus
 *  substring. MUST be empty per authoring rule. */
export const KNOWN_PARAPHRASED_KEYS: readonly string[] = [];
