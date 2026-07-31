/**
 * ITEM 313 — accountability-spine verified authorities for the governance
 * product (Arts. 5(2), 24, 30, 37, 38, 39).
 *
 * REUSE LAW / AUTHORING RULE: every verbatim_quote below is an exact substring
 * of an APPROVED corpus row in public.gdpr_articles (jurisdiction = 'eu').
 * The rows were EXTRACTED from the corpus, never typed by hand.
 *
 * CORPUS CHECK (this turn, no ingestion required — dispatch Chapter 9 (E)(6)):
 *   Art. 5 = 1977 chars · Art. 24 = 861 · Art. 30 = 2907
 *   Art. 37 = 1989 · Art. 38 = 1390 · Art. 39 = 1278
 *
 * These rows are ADDITIVE to governance-verified-authorities.ts; no existing
 * key is edited or removed. Key namespaces do not overlap.
 */
import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

export const GOVERNANCE_ACCOUNTABILITY_VERSION =
  "governance-accountability-item313-2026-07-31";

const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const GDPR = "Regulation (EU) 2016/679 (GDPR)";
const VOD = "2026-07-31";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const GOVERNANCE_ACCOUNTABILITY_AUTHORITIES: VerifiedAuthorityRegistry = {
  accountability_demonstrate_compliance: R({
    proposition_key: "accountability_demonstrate_compliance",
    citation: "GDPR Art. 5",
    subsection: "GDPR Art. 5(2)",
    verbatim_quote:
      "The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1 (‘accountability’).",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_24_1_appropriate_measures: R({
    proposition_key: "art_24_1_appropriate_measures",
    citation: "GDPR Art. 24",
    subsection: "GDPR Art. 24(1)",
    verbatim_quote:
      "Taking into account the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for the rights and freedoms of natural persons, the controller shall implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_24_1_review_and_update: R({
    proposition_key: "art_24_1_review_and_update",
    citation: "GDPR Art. 24",
    subsection: "GDPR Art. 24(1) (second sentence)",
    verbatim_quote:
      "Those measures shall be reviewed and updated where necessary.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_24_2_data_protection_policies: R({
    proposition_key: "art_24_2_data_protection_policies",
    citation: "GDPR Art. 24",
    subsection: "GDPR Art. 24(2)",
    verbatim_quote:
      "Where proportionate in relation to processing activities, the measures referred to in paragraph 1 shall include the implementation of appropriate data protection policies by the controller.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_24_3_codes_and_certification: R({
    proposition_key: "art_24_3_codes_and_certification",
    citation: "GDPR Art. 24",
    subsection: "GDPR Art. 24(3)",
    verbatim_quote:
      "Adherence to approved codes of conduct as referred to in Article 40 or approved certification mechanisms as referred to in Article 42 may be used as an element by which to demonstrate compliance with the obligations of the controller.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_record_duty: R({
    proposition_key: "art_30_1_record_duty",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)",
    verbatim_quote:
      "Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility. That record shall contain all of the following information:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_a_controller_contact: R({
    proposition_key: "art_30_1_a_controller_contact",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(a)",
    verbatim_quote:
      "the name and contact details of the controller and, where applicable, the joint controller, the controller's representative and the data protection officer;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_b_purposes: R({
    proposition_key: "art_30_1_b_purposes",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(b)",
    verbatim_quote:
      "the purposes of the processing;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_c_categories: R({
    proposition_key: "art_30_1_c_categories",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(c)",
    verbatim_quote:
      "a description of the categories of data subjects and of the categories of personal data;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_d_recipients: R({
    proposition_key: "art_30_1_d_recipients",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(d)",
    verbatim_quote:
      "the categories of recipients to whom the personal data have been or will be disclosed including recipients in third countries or international organisations;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_e_transfers: R({
    proposition_key: "art_30_1_e_transfers",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(e)",
    verbatim_quote:
      "where applicable, transfers of personal data to a third country or an international organisation, including the identification of that third country or international organisation and, in the case of transfers referred to in the second subparagraph of Article 49(1), the documentation of suitable safeguards;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_f_retention: R({
    proposition_key: "art_30_1_f_retention",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(f)",
    verbatim_quote:
      "where possible, the envisaged time limits for erasure of the different categories of data;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_1_g_security_measures: R({
    proposition_key: "art_30_1_g_security_measures",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)(g)",
    verbatim_quote:
      "where possible, a general description of the technical and organisational security measures referred to in Article 32(1).",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_3_in_writing: R({
    proposition_key: "art_30_3_in_writing",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(3)",
    verbatim_quote:
      "The records referred to in paragraphs 1 and 2 shall be in writing, including in electronic form.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_4_available_to_sa: R({
    proposition_key: "art_30_4_available_to_sa",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(4)",
    verbatim_quote:
      "The controller or the processor and, where applicable, the controller's or the processor's representative, shall make the record available to the supervisory authority on request.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_30_5_small_enterprise_exemption: R({
    proposition_key: "art_30_5_small_enterprise_exemption",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(5)",
    verbatim_quote:
      "The obligations referred to in paragraphs 1 and 2 shall not apply to an enterprise or an organisation employing fewer than 250 persons unless the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects, the processing is not occasional, or the processing includes special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_1_designation_trigger: R({
    proposition_key: "art_37_1_designation_trigger",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(1)",
    verbatim_quote:
      "The controller and the processor shall designate a data protection officer in any case where:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_1_a_public_authority: R({
    proposition_key: "art_37_1_a_public_authority",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(1)(a)",
    verbatim_quote:
      "the processing is carried out by a public authority or body, except for courts acting in their judicial capacity;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_1_b_regular_systematic_monitoring: R({
    proposition_key: "art_37_1_b_regular_systematic_monitoring",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(1)(b)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale; or",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_1_c_large_scale_special_category: R({
    proposition_key: "art_37_1_c_large_scale_special_category",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(1)(c)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9 and personal data relating to criminal convictions and offences referred to in Article 10.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_5_professional_qualities: R({
    proposition_key: "art_37_5_professional_qualities",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(5)",
    verbatim_quote:
      "The data protection officer shall be designated on the basis of professional qualities and, in particular, expert knowledge of data protection law and practices and the ability to fulfil the tasks referred to in Article 39.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_37_7_publish_contact_details: R({
    proposition_key: "art_37_7_publish_contact_details",
    citation: "GDPR Art. 37",
    subsection: "GDPR Art. 37(7)",
    verbatim_quote:
      "The controller or the processor shall publish the contact details of the data protection officer and communicate them to the supervisory authority.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_38_1_timely_involvement: R({
    proposition_key: "art_38_1_timely_involvement",
    citation: "GDPR Art. 38",
    subsection: "GDPR Art. 38(1)",
    verbatim_quote:
      "The controller and the processor shall ensure that the data protection officer is involved, properly and in a timely manner, in all issues which relate to the protection of personal data.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_38_2_resources_and_access: R({
    proposition_key: "art_38_2_resources_and_access",
    citation: "GDPR Art. 38",
    subsection: "GDPR Art. 38(2)",
    verbatim_quote:
      "The controller and processor shall support the data protection officer in performing the tasks referred to in Article 39 by providing resources necessary to carry out those tasks and access to personal data and processing operations, and to maintain his or her expert knowledge.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_38_3_independence: R({
    proposition_key: "art_38_3_independence",
    citation: "GDPR Art. 38",
    subsection: "GDPR Art. 38(3)",
    verbatim_quote:
      "The controller and processor shall ensure that the data protection officer does not receive any instructions regarding the exercise of those tasks. He or she shall not be dismissed or penalised by the controller or the processor for performing his tasks. The data protection officer shall directly report to the highest management level of the controller or the processor.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_38_6_conflict_of_interests: R({
    proposition_key: "art_38_6_conflict_of_interests",
    citation: "GDPR Art. 38",
    subsection: "GDPR Art. 38(6)",
    verbatim_quote:
      "The data protection officer may fulfil other tasks and duties. The controller or processor shall ensure that any such tasks and duties do not result in a conflict of interests.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_dpo_tasks: R({
    proposition_key: "art_39_1_dpo_tasks",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)",
    verbatim_quote:
      "The data protection officer shall have at least the following tasks:",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_a_inform_and_advise: R({
    proposition_key: "art_39_1_a_inform_and_advise",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)(a)",
    verbatim_quote:
      "to inform and advise the controller or the processor and the employees who carry out processing of their obligations pursuant to this Regulation and to other Union or Member State data protection provisions;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_b_monitor_compliance: R({
    proposition_key: "art_39_1_b_monitor_compliance",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)(b)",
    verbatim_quote:
      "to monitor compliance with this Regulation, with other Union or Member State data protection provisions and with the policies of the controller or processor in relation to the protection of personal data, including the assignment of responsibilities, awareness-raising and training of staff involved in processing operations, and the related audits;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_c_dpia_advice: R({
    proposition_key: "art_39_1_c_dpia_advice",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)(c)",
    verbatim_quote:
      "to provide advice where requested as regards the data protection impact assessment and monitor its performance pursuant to Article 35;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_d_cooperate_with_sa: R({
    proposition_key: "art_39_1_d_cooperate_with_sa",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)(d)",
    verbatim_quote:
      "to cooperate with the supervisory authority;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_1_e_contact_point: R({
    proposition_key: "art_39_1_e_contact_point",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(1)(e)",
    verbatim_quote:
      "to act as the contact point for the supervisory authority on issues relating to processing, including the prior consultation referred to in Article 36, and to consult, where appropriate, with regard to any other matter.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_39_2_risk_based_tasks: R({
    proposition_key: "art_39_2_risk_based_tasks",
    citation: "GDPR Art. 39",
    subsection: "GDPR Art. 39(2)",
    verbatim_quote:
      "The data protection officer shall in the performance of his or her tasks have due regard to the risk associated with processing operations, taking into account the nature, scope, context and purposes of processing.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
};
