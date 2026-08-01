// LIA-REGISTRY-AUTHORING (2026-07-25) — run-li-assessment verified-authority
// registry. Authoring-only turn: this module is DATA and is NOT imported by
// any generator this turn. Wiring is queued as LIA-REGISTRY-WIRING.
//
// Row shape follows admt-verified-authorities.ts / risk-verified-authorities.ts
// / dpia-verified-authorities.ts exactly (see
// supabase/functions/_shared/verified-authority-resolver.ts).
//
// AUTHORING RULE: every verbatim_quote MUST appear as an exact substring of an
// APPROVED corpus row. Sources:
//   * public.provision_texts rows keyed gdpr-art-*  (status='approved',
//     jurisdiction='EU'; P1 bootstrap, ledger item 38 —
//     NONCPPA-P1-BATCH-REPORT-2026-07-25.md), AND
//   * public.edpb_guidelines rows for "EDPB Guidelines 2/2019" (status='final';
//     P2 batch 1, ledger item 41) — carried forward from DPIA-REGISTRY-AUTHORING
//     because the § 2.4 necessity language is the same primary source relied on
//     for the LIA "necessity" limb of the three-part test.
//
// Any LIA proposition without an anchor in those two sources gets NO row.
// Write-around targets are enumerated in LIA_UNANCHORED_PROPOSITIONS below.
// EDPB Guidelines 1/2024 (legitimate interests) is NOT usable this turn —
// ingested rows carry empty excerpt_text_norm / section_heading (109/109), so
// substring pin-tests cannot be run against them and the narrow-but-solid rule
// forbids paraphrase. All Guidelines 1/2024 propositions are therefore on the
// unanchored list until the P2 clean-up batch lands.
//
// GDPR-pinned first per CEO non-CPPA rule (2026-07-25 T2 sequencing).
//
// Pin-testing: every row passes deterministic substring pin-tests against a
// verbatim snapshot of its source excerpt (see
// supabase/functions/_tests/lia-registry.test.ts pasted output in the courier
// report LIA-REGISTRY-AUTHORING-2026-07-25.md). KNOWN_PARAPHRASED_KEYS is
// EMPTY on entry.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const LIA_VERIFIED_AUTHORITY_VERSION = "lia-va-w2-2026-08-01-item326";


/** Canonical published text URLs (official primary sources). */
const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const EDPB_2_2019_URL =
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en";
const EDPB_1_2024_URL =
  "https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data_en";

/** Verification date — the date these rows were hand-verified against the primary source. */
const VOD = "2026-07-25";

/** ITEM 311 verification date — EDPB 1/2024 + Recital 47 anchors. */
const VOD_311 = "2026-07-31";

/** ITEM 326 verification date — UK GDPR Arts. 22A–22D / Art. 6(1)(ea) anchors. */
const VOD_326 = "2026-08-01";

/** Governing anchor labels. */
const GDPR = "Regulation (EU) 2016/679 (GDPR)";
const UK_GDPR =
  "UK GDPR (Regulation (EU) 2016/679 as retained and amended for the United Kingdom)";
/** King's Printer consolidated UK GDPR article URL. */
const UK_ART_URL = (n: string) =>
  `https://www.legislation.gov.uk/eur/2016/679/article/${n}`;
const EDPB_2_2019 =
  "EDPB Guidelines 2/2019 on processing of personal data under Article 6(1)(b) GDPR";
const EDPB_1_2024 =
  "EDPB Guidelines 1/2024 on processing of personal data based on Article 6(1)(f) GDPR";


const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const LIA_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Art. 6(1)(f) — Legitimate interests basis (central to LIA) -----------
  li_lawful_basis_legitimate_interests: R({
    proposition_key: "li_lawful_basis_legitimate_interests",
    citation: "GDPR Art. 6",
    subsection: "GDPR Art. 6(1)(f)",
    verbatim_quote:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  li_public_authorities_exclusion: R({
    proposition_key: "li_public_authorities_exclusion",
    citation: "GDPR Art. 6",
    subsection: "GDPR Art. 6(1)(f), second subparagraph",
    verbatim_quote:
      "Point (f) of the first subparagraph shall not apply to processing carried out by public authorities in the performance of their tasks.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 5 — Principles (balancing/proportionality dimensions) -----------
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

  // ---- Art. 9(1) — Special categories (LI cannot cover; 9(2) required) ------
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

  // ---- Art. 13 — Transparency at direct collection (LI-specific duties) -----
  art_13_legitimate_interests_disclosure: R({
    proposition_key: "art_13_legitimate_interests_disclosure",
    citation: "GDPR Art. 13",
    subsection: "GDPR Art. 13(1)(d)",
    verbatim_quote:
      "where the processing is based on point (f) of Article 6(1), the legitimate interests pursued by the controller or by a third party;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_13_object_right_information: R({
    proposition_key: "art_13_object_right_information",
    citation: "GDPR Art. 13",
    subsection: "GDPR Art. 13(2)(b)",
    verbatim_quote:
      "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject or to object to processing as well as the right to data portability;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 14 — Transparency at indirect collection (LI-specific duties) ---
  art_14_legitimate_interests_disclosure: R({
    proposition_key: "art_14_legitimate_interests_disclosure",
    citation: "GDPR Art. 14",
    subsection: "GDPR Art. 14(2)(b)",
    verbatim_quote:
      "where the processing is based on point (f) of Article 6(1), the legitimate interests pursued by the controller or by a third party;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_14_object_right_information: R({
    proposition_key: "art_14_object_right_information",
    citation: "GDPR Art. 14",
    subsection: "GDPR Art. 14(2)(c)",
    verbatim_quote:
      "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject and to object to processing as well as the right to data portability;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 22 — ADMT interplay (LI cannot itself authorise 22(1) decisions)
  art_22_admt_right: R({
    proposition_key: "art_22_admt_right",
    citation: "GDPR Art. 22",
    subsection: "GDPR Art. 22(1)",
    verbatim_quote:
      "The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 25 — Data protection by design (safeguards dimension) -----------
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

  // ---- Art. 30 — RoPA (records the LI purpose) ------------------------------
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

  // ---- Art. 35 — DPIA interplay (LIA does not substitute for DPIA) ----------
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

  // ---- EDPB Guidelines 2/2019 — Necessity limb -------------------------------
  // Necessity is the second limb of the LIA three-part test. § 2.4 of Guidelines
  // 2/2019 states the general necessity standard that has been read across to
  // Art. 6(1)(f) by EDPB / national SAs. Same rows carried through DPIA-va-w1.
  necessity_less_intrusive_alternatives: R({
    proposition_key: "necessity_less_intrusive_alternatives",
    citation: "EDPB Guidelines 2/2019, § 2.4 (Necessity)",
    subsection: "EDPB Guidelines 2/2019, § 2.4",
    verbatim_quote:
      "If there are realistic, less intrusive alternatives, the processing is not \u2018necessary\u2019.",
    depth_class: "subsection",
    governing_anchor: EDPB_2_2019,
    verified_on: VOD,
    primary_source_url: EDPB_2_2019_URL,
  }),
  necessity_useful_not_necessary: R({
    proposition_key: "necessity_useful_not_necessary",
    citation: "EDPB Guidelines 2/2019, § 2.4 (Necessity)",
    subsection: "EDPB Guidelines 2/2019, § 2.4",
    verbatim_quote:
      "Article 6(1)(b) will not cover processing which is useful but not objectively necessary for performing the contractual service or for taking relevant pre-contractual steps at the request of the data subject, even if it is necessary for the controller\u2019s other business purposes.",
    depth_class: "subsection",
    governing_anchor: EDPB_2_2019,
    verified_on: VOD,
    primary_source_url: EDPB_2_2019_URL,
  }),

  // ---- ITEM 311 — EDPB Guidelines 1/2024 + Recital 47 anchors ---------------
  // Every quote below is an EXACT substring of an approved corpus row; the
  // snapshot used by the pin test is generated from the corpus, not typed.
  edpb_1_2024_legitimate_interest_qualities: R({
    proposition_key: "edpb_1_2024_legitimate_interest_qualities",
    citation: "EDPB Guidelines 1/2024, Section II.A (pursuit of a legitimate interest)",
    subsection: "EDPB Guidelines 1/2024, Section II.A",
    verbatim_quote:
      "only those interests that are lawful, precisely articulated and present may be validly invoked to rely on Article 6(1)(f) GDPR as a legal basis",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_three_cumulative_conditions: R({
    proposition_key: "edpb_1_2024_three_cumulative_conditions",
    citation: "EDPB Guidelines 1/2024, Section II (three cumulative conditions)",
    subsection: "EDPB Guidelines 1/2024, Section II",
    verbatim_quote:
      "For processing to be based on the legitimate interest legal basis, three cumulative conditions must be fulfilled:",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_public_authorities_exclusion: R({
    proposition_key: "edpb_1_2024_public_authorities_exclusion",
    citation: "EDPB Guidelines 1/2024, Section II (public-authority exclusion)",
    subsection: "EDPB Guidelines 1/2024, Section II",
    verbatim_quote:
      "the second indent of Article 6(1) GDPR provides that the legal basis in Article 6(1)(f) shall not apply to processing carried out by public authorities in the performance of their tasks.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_necessity_less_restrictive_means: R({
    proposition_key: "edpb_1_2024_necessity_less_restrictive_means",
    citation: "EDPB Guidelines 1/2024, Section II.B (necessity of the processing)",
    subsection: "EDPB Guidelines 1/2024, Section II.B",
    verbatim_quote:
      "it should be ascertained whether the legitimate interests pursued cannot reasonably be achieved just as effectively by other means less restrictive of the fundamental rights and freedoms of data subjects",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_reasonable_expectations_weighed: R({
    proposition_key: "edpb_1_2024_reasonable_expectations_weighed",
    citation: "EDPB Guidelines 1/2024, Section II.C.3 (reasonable expectations)",
    subsection: "EDPB Guidelines 1/2024, Section II.C.3",
    verbatim_quote:
      "The controller should therefore take into account the reasonable expectations of data subjects when weighing its legitimate interest(s) and the interests or fundamental rights and freedom of data subjects.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_reasonable_expectations_contextual_elements: R({
    proposition_key: "edpb_1_2024_reasonable_expectations_contextual_elements",
    citation: "EDPB Guidelines 1/2024, Section II.C.3 (contextual elements)",
    subsection: "EDPB Guidelines 1/2024, Section II.C.3",
    verbatim_quote:
      "the following list is meant to illustrate contextual elements which can be considered in the assessment of the reasonable expectations of data subjects",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_notice_alone_not_sufficient: R({
    proposition_key: "edpb_1_2024_notice_alone_not_sufficient",
    citation: "EDPB Guidelines 1/2024 (information duties and reasonable expectations)",
    subsection: "EDPB Guidelines 1/2024",
    verbatim_quote:
      "the mere fulfilment of information duties according to Articles 12, 13 and 14 GDPR is not sufficient in itself to consider that the data subjects can reasonably expect a given processing.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_child_interests_prevail: R({
    proposition_key: "edpb_1_2024_child_interests_prevail",
    citation: "EDPB Guidelines 1/2024, Section II.C (children)",
    subsection: "EDPB Guidelines 1/2024, Section II.C",
    verbatim_quote:
      "the interests or fundamental rights and freedoms of the child should in general prevail",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_child_specific_protection: R({
    proposition_key: "edpb_1_2024_child_specific_protection",
    citation: "EDPB Guidelines 1/2024, Section II.C (children)",
    subsection: "EDPB Guidelines 1/2024, Section II.C",
    verbatim_quote:
      "children merit specific protection with regard to the processing of their personal data because they may be less aware of the risks, consequences and safeguards concerned and of their rights related to such processing of personal data.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_mitigating_measures_beyond_gdpr: R({
    proposition_key: "edpb_1_2024_mitigating_measures_beyond_gdpr",
    citation: "EDPB Guidelines 1/2024, Section II.C.4 (mitigating measures)",
    subsection: "EDPB Guidelines 1/2024, Section II.C.4",
    verbatim_quote:
      "introducing additional safeguards above and beyond the safeguards required under the GDPR may be seen as a mitigating measure",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_mitigating_measures_exclusions: R({
    proposition_key: "edpb_1_2024_mitigating_measures_exclusions",
    citation: "EDPB Guidelines 1/2024, Section II.C.4 (mitigating measures)",
    subsection: "EDPB Guidelines 1/2024, Section II.C.4",
    verbatim_quote:
      "mitigating measures can, for instance, not consist of measures meant to ensure compliance with the controllers’ information obligations, security obligations, obligations to comply with the principle of data minimisation, or the fulfilment of data subject rights under the GDPR, and must go beyond what is already necessary to comply with these legal obligations under the GDPR.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  edpb_1_2024_balance_override_outcome: R({
    proposition_key: "edpb_1_2024_balance_override_outcome",
    citation: "EDPB Guidelines 1/2024, Section II.C (outcome of the balancing test)",
    subsection: "EDPB Guidelines 1/2024, Section II.C",
    verbatim_quote:
      "If the data subject’s interests, rights and freedoms override the legitimate interests being pursued, and no sufficient mitigating measures can be taken, the processing cannot be based on Article 6(1)(f) GDPR.",
    depth_class: "subsection",
    governing_anchor: EDPB_1_2024,
    verified_on: VOD_311,
    primary_source_url: EDPB_1_2024_URL,
  }),
  li_child_data_subject_clause: R({
    proposition_key: "li_child_data_subject_clause",
    citation: "GDPR Art. 6",
    subsection: "GDPR Art. 6(1)(f)",
    verbatim_quote:
      "in particular where the data subject is a child.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD_311,
    primary_source_url: GDPR_URL,
  }),
  recital_47_reasonable_expectation_at_collection: R({
    proposition_key: "recital_47_reasonable_expectation_at_collection",
    citation: "GDPR Recital 47",
    subsection: "GDPR Recital 47",
    verbatim_quote:
      "At any rate the existence of a legitimate interest would need careful assessment including whether a data subject can reasonably expect at the time and in the context of the collection of the personal data that processing for that purpose may take place.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD_311,
    primary_source_url: GDPR_URL,
  }),
  recital_47_override_where_not_expected: R({
    proposition_key: "recital_47_override_where_not_expected",
    citation: "GDPR Recital 47",
    subsection: "GDPR Recital 47",
    verbatim_quote:
      "The interests and fundamental rights of the data subject could in particular override the interest of the data controller where personal data are processed in circumstances where data subjects do not reasonably expect further processing.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD_311,
    primary_source_url: GDPR_URL,
  }),
  recital_47_expectations_from_relationship: R({
    proposition_key: "recital_47_expectations_from_relationship",
    citation: "GDPR Recital 47",
    subsection: "GDPR Recital 47",
    verbatim_quote:
      "taking into consideration the reasonable expectations of data subjects based on their relationship with the controller.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD_311,
    primary_source_url: GDPR_URL,
  }),

  // ======================================================================
  // ITEM 326 — UK GDPR Chapter III Section 4A (Arts. 22A–22D) + Art. 6(1)(ea)
  // ----------------------------------------------------------------------
  // SOURCE: public.provision_texts rows ukgdpr-art-22 / -22a / -22b / -22c /
  // -22d / -art-6 (status='approved', jurisdiction='UK'; ingested at ledger
  // item 318 from the King's Printer consolidated text). Every quote below
  // was re-queried fresh and is a byte-exact substring of its row; the pin
  // test is src/registry/__tests__/lia-uk-art22-corpus-pin.test.ts.
  //
  // WHY THESE ROWS EXIST: EU Art. 22(1) is a prohibition-by-default. UK law
  // is NOT the EU rule re-branded — Art. 22 is not in force, and ordinary
  // (non-Article-9(1)) data defaults to PERMITTED subject to the Art. 22C
  // safeguards. Citing EU Art. 22(1) for UK-scoped LIA output is an accuracy
  // defect; these rows let the builder branch instead.
  //
  // ANNEX 1 SCOPE LIMIT (binding): Annex 1 is NOT in the corpus — there is no
  // gdpr_articles or provision_texts row holding it (verified by direct query
  // 2026-08-01). The rows below cite only that Art. 6(1)(ea) exists, that it
  // is conditioned on Annex 1, and that Art. 22B(4) bars its use for a solely
  // automated significant decision. NOTHING in this file, the builder, or the
  // narrative may state, paraphrase, or evaluate an Annex 1 condition. See
  // LIA_UNANCHORED_PROPOSITIONS → "uk_annex_1_recognised_li_conditions".
  // ======================================================================
  uk_art_22_substituted: R({
    proposition_key: "uk_art_22_substituted",
    citation: "UK GDPR Art. 22",
    subsection: "UK GDPR Art. 22 (substituted)",
    verbatim_quote:
      "There is no UK GDPR Article 22 in force. The UK counterpart provisions are Articles 22A–22D.",
    depth_class: "section",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22"),
  }),
  uk_art_22a_solely_automated_definition: R({
    proposition_key: "uk_art_22a_solely_automated_definition",
    citation: "UK GDPR Art. 22A",
    subsection: "UK GDPR Art. 22A(1)(a)",
    verbatim_quote:
      "a decision is based solely on automated processing if there is no meaningful human involvement in the taking of the decision",
    depth_class: "clause",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22A"),
  }),
  uk_art_22a_significant_decision_definition: R({
    proposition_key: "uk_art_22a_significant_decision_definition",
    citation: "UK GDPR Art. 22A",
    subsection: "UK GDPR Art. 22A(1)(b)",
    verbatim_quote:
      "a decision is a significant decision, in relation to a data subject, if— (i) it produces a legal effect for the data subject, or (ii) it has a similarly significant effect for the data subject.",
    depth_class: "clause",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22A"),
  }),
  uk_art_22a_profiling_consideration: R({
    proposition_key: "uk_art_22a_profiling_consideration",
    citation: "UK GDPR Art. 22A",
    subsection: "UK GDPR Art. 22A(2)",
    verbatim_quote:
      "When considering whether there is meaningful human involvement in the taking of a decision, a person must consider, among other things, the extent to which the decision is reached by means of profiling.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22A"),
  }),
  uk_art_22b_special_category_restriction: R({
    proposition_key: "uk_art_22b_special_category_restriction",
    citation: "UK GDPR Art. 22B",
    subsection: "UK GDPR Art. 22B(1)",
    verbatim_quote:
      "A significant decision based entirely or partly on processing described in Article 9(1) (processing of special categories of personal data) may not be taken based solely on automated processing, unless one of the following conditions is met.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22B"),
  }),
  uk_art_22b_recognised_li_bar: R({
    proposition_key: "uk_art_22b_recognised_li_bar",
    citation: "UK GDPR Art. 22B",
    subsection: "UK GDPR Art. 22B(4)",
    verbatim_quote:
      "A significant decision may not be taken based solely on automated processing if the processing of personal data carried out by, or on behalf of, the decision-maker for the purposes of the decision is carried out entirely or partly in reliance on Article 6(1)(ea).",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22B"),
  }),
  uk_art_22c_safeguards_duty: R({
    proposition_key: "uk_art_22c_safeguards_duty",
    citation: "UK GDPR Art. 22C",
    subsection: "UK GDPR Art. 22C(1)",
    verbatim_quote:
      "the controller must ensure that safeguards for the data subject\u2019s rights, freedoms and legitimate interests are in place which comply with paragraph 2 and any regulations under Article 22D(3).",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22C"),
  }),
  uk_art_22c_safeguard_measures: R({
    proposition_key: "uk_art_22c_safeguard_measures",
    citation: "UK GDPR Art. 22C",
    subsection: "UK GDPR Art. 22C(2)",
    verbatim_quote:
      "The safeguards must consist of or include measures which— (a) provide the data subject with information about decisions described in paragraph 1 taken in relation to the data subject; (b) enable the data subject to make representations about such decisions; (c) enable the data subject to obtain human intervention on the part of the controller in relation to such decisions; (d) enable the data subject to contest such decisions.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22C"),
  }),
  uk_art_22d_safeguard_regulations: R({
    proposition_key: "uk_art_22d_safeguard_regulations",
    citation: "UK GDPR Art. 22D",
    subsection: "UK GDPR Art. 22D(3)",
    verbatim_quote:
      "The Secretary of State may by regulations make the following types of provision about the safeguards required under Article 22C(1)—",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("22D"),
  }),
  uk_art_6_1_ea_recognised_li: R({
    proposition_key: "uk_art_6_1_ea_recognised_li",
    citation: "UK GDPR Art. 6",
    subsection: "UK GDPR Art. 6(1)(ea)",
    verbatim_quote:
      "processing is necessary for the purposes of a recognised legitimate interest;",
    depth_class: "sub_subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("6"),
  }),
  // POINTER ONLY. Quoted so the report can say the basis is conditioned on
  // Annex 1 without saying what Annex 1 requires — Annex 1 is not in corpus.
  uk_art_6_ea_annex_1_condition: R({
    proposition_key: "uk_art_6_ea_annex_1_condition",
    citation: "UK GDPR Art. 6",
    subsection: "UK GDPR Art. 6(5)",
    verbatim_quote:
      "For the purposes of paragraph 1(ea), processing is necessary for the purposes of a recognised legitimate interest only if it meets a condition in Annex 1.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("6"),
  }),
  uk_art_6_1_f_legitimate_interests: R({
    proposition_key: "uk_art_6_1_f_legitimate_interests",
    citation: "UK GDPR Art. 6",
    subsection: "UK GDPR Art. 6(1)(f)",
    verbatim_quote:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.",
    depth_class: "sub_subsection",
    governing_anchor: UK_GDPR,
    verified_on: VOD_326,
    primary_source_url: UK_ART_URL("6"),
  }),
};


/**
 * Propositions the LIA generator asserts today (or is expected to assert at the
 * wiring turn) that have NO anchorable support in the approved corpus and
 * therefore carry NO row. Listed here for the LIA-REGISTRY-WIRING deploy turn
 * (write-around targets).
 *
 * DO NOT paraphrase these into verbatim_quote strings — narrow-but-solid rule.
 * Any proposition below must be either (a) written around, or (b) unlocked by a
 * future corpus ingestion turn that pins the exact source text.
 */
export const LIA_UNANCHORED_PROPOSITIONS: readonly string[] = [
  // GDPR Article surface not held in P1
  "right_to_object_art_21",                 // Art. 21 not in approved P1 set
  "right_to_object_direct_marketing_21_2",  // Art. 21(2) — absolute objection right for direct marketing
  "consent_conditions_art_7",               // Art. 7 not in approved P1 set (alternatives-considered analysis)
  "child_consent_art_8",                    // Art. 8 not in approved P1 set (child-specific balancing)
  "controller_accountability_art_24",       // Art. 24 not in approved P1 set

  // Recital surface not held (recitals are not in provision_texts P1)
  "recital_47_direct_marketing_li",         // direct marketing as a legitimate interest
  "recital_48_intra_group_transmission",    // intra-group administrative purposes
  "recital_49_network_security",            // network-and-information-security LI
  "recital_50_further_processing",          // secondary-use compatibility test

  // Guidance surface not usable this turn
  "edpb_1_2024_vulnerable_data_subjects",   // EDPB 1/2024 — vulnerability generally (the CHILD factor is
                                            // now anchored: edpb_1_2024_child_interests_prevail)
  "wp29_wp217_balancing_test",              // WP29 Opinion 06/2014 not in corpus

  // CJEU case-law surface not held (case_law table not in scope this turn)
  "cjeu_meta_bundeskartellamt_three_part",  // C-252/21 three-part-test articulation
  "cjeu_rigas_purpose_specification",       // C-13/16 purpose specification
  "cjeu_fashion_id_joint_controller",       // C-40/17 joint-controller LI

  // Statutory / SA guidance surface not held
  "uk_ico_lia_template_guidance",           // ICO LIA template guidance

  // ITEM 326 — UK Annex 1. BINDING SCOPE LIMIT: Annex 1 to the UK GDPR is not
  // held in gdpr_articles or provision_texts (verified by direct query
  // 2026-08-01). The conditions that make a "recognised legitimate interest"
  // available under Art. 6(1)(ea) therefore CANNOT be stated, paraphrased, or
  // evaluated by this tool. Output may cite only that the basis exists and is
  // conditioned on Annex 1, and must reserve the conditions to review.
  "uk_annex_1_recognised_li_conditions",

  "cnil_direct_marketing_guidance",         // CNIL direct-marketing LI guidance

  // Balancing conclusion prose (structural, not quotable)
  "balancing_conclusion_pass",              // "LI valid" conclusion has no verbatim anchor
  "balancing_conclusion_fail",              // "LI invalid" conclusion has no verbatim anchor
  "balancing_conditional_safeguards",       // conditional-pass framing — write-around only
] as const;

/**
 * Reserved by narrow-but-solid rule — kept empty on entry so the grader can
 * fail loudly if any future row is added by paraphrase rather than pin-test.
 */
export const KNOWN_PARAPHRASED_KEYS: readonly string[] = [] as const;
