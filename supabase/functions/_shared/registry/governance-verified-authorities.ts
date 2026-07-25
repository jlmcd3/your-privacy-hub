// GOVERNANCE-REGISTRY-AUTHORING (2026-07-25) — run-governance-assessment
// verified-authority registry. Authoring-only turn: this module is DATA and is
// NOT imported by any generator this turn. Wiring is queued as
// GOVERNANCE-REGISTRY-WIRING (post-wave-22 window).
//
// Row shape follows lia-verified-authorities.ts / dpia-verified-authorities.ts
// exactly (see supabase/functions/_shared/verified-authority-resolver.ts).
//
// AUTHORING RULE: every verbatim_quote MUST appear as an exact substring of an
// APPROVED corpus row. Sources this turn:
//   * public.provision_texts rows keyed gdpr-art-*  (status='approved',
//     jurisdiction='EU'; P1 bootstrap ledger item 38 + P1 backfill).
//   * public.edpb_guidelines rows for "EDPB Guidelines 2/2019" (status='final';
//     P2 batch 1 corpus-clean rows, ledger item 41) — reused ONLY where the
//     necessity standard genuinely anchors a governance proposition (data
//     minimisation / DPIA necessity limb). Not stretched to LI-only guidance.
//
// Any governance proposition without an anchor in those two sources gets NO
// row. Write-around targets are enumerated in
// GOVERNANCE_UNANCHORED_PROPOSITIONS below. NEVER paraphrase; narrow-but-solid.
//
// GDPR-pinned first per CEO non-CPPA rule (2026-07-25 T2 sequencing).
//
// Pin-testing: every row passes deterministic LIVE substring pin-tests against
// PostgREST at test time (see supabase/functions/_tests/governance-registry.test.ts
// pasted output in the courier report GOVERNANCE-REGISTRY-AUTHORING-2026-07-25.md).
// KNOWN_PARAPHRASED_KEYS is EMPTY on entry.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const GOVERNANCE_VERIFIED_AUTHORITY_VERSION =
  "governance-va-w1-2026-07-25";

const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const EDPB_2_2019_URL =
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en";

const VOD = "2026-07-25";
const GDPR = "Regulation (EU) 2016/679 (GDPR)";
const EDPB_2_2019 =
  "EDPB Guidelines 2/2019 on processing of personal data under Article 6(1)(b) GDPR";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const GOVERNANCE_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Art. 5 — Principles (accountability spine) --------------------------
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

  // ---- Art. 6(1)(f) — LI basis (governance surface enumerates lawful bases)
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

  // ---- Art. 9(1) — Special-category prohibition ----------------------------
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

  // ---- Art. 13 — Transparency at direct collection -------------------------
  art_13_controller_identity: R({
    proposition_key: "art_13_controller_identity",
    citation: "GDPR Art. 13",
    subsection: "GDPR Art. 13(1)(a)",
    verbatim_quote:
      "the identity and the contact details of the controller and, where applicable, of the controller's representative;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  art_13_rights_information: R({
    proposition_key: "art_13_rights_information",
    citation: "GDPR Art. 13",
    subsection: "GDPR Art. 13(2)(b)",
    verbatim_quote:
      "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject or to object to processing as well as the right to data portability;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 14 — Transparency at indirect collection -----------------------
  art_14_rights_information: R({
    proposition_key: "art_14_rights_information",
    citation: "GDPR Art. 14",
    subsection: "GDPR Art. 14(2)(c)",
    verbatim_quote:
      "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject and to object to processing as well as the right to data portability;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 22 — ADMT interplay (governance flags ADMT dependency) --------
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

  // ---- Art. 25 — Data protection by design & by default --------------------
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

  // ---- Art. 28 — Processor engagement (contract requirements) -------------
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
  processor_sub_processor_authorisation: R({
    proposition_key: "processor_sub_processor_authorisation",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(2)",
    verbatim_quote:
      "The processor shall not engage another processor without prior specific or general written authorisation of the controller.",
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
      "processes the personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which the processor is subject",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_confidentiality: R({
    proposition_key: "processor_confidentiality",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(b)",
    verbatim_quote:
      "ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_return_or_delete: R({
    proposition_key: "processor_return_or_delete",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(g)",
    verbatim_quote:
      "at the choice of the controller, deletes or returns all the personal data to the controller after the end of the provision of services relating to processing, and deletes existing copies unless Union or Member State law requires storage of the personal data;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_audit_rights: R({
    proposition_key: "processor_audit_rights",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(h)",
    verbatim_quote:
      "makes available to the controller all information necessary to demonstrate compliance with the obligations laid down in this Article and allow for and contribute to audits, including inspections, conducted by the controller or another auditor mandated by the controller.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 30 — RoPA -----------------------------------------------------
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
  ropa_processor_record: R({
    proposition_key: "ropa_processor_record",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(2)",
    verbatim_quote:
      "Each processor and, where applicable, the processor's representative shall maintain a record of all categories of processing activities carried out on behalf of a controller",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  ropa_small_enterprise_carveout: R({
    proposition_key: "ropa_small_enterprise_carveout",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(5)",
    verbatim_quote:
      "The obligations referred to in paragraphs 1 and 2 shall not apply to an enterprise or an organisation employing fewer than 250 persons unless the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects, the processing is not occasional, or the processing includes special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 32 — Security of processing -----------------------------------
  security_appropriate_measures: R({
    proposition_key: "security_appropriate_measures",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)",
    verbatim_quote:
      "the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  security_staff_instructions: R({
    proposition_key: "security_staff_instructions",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(4)",
    verbatim_quote:
      "The controller and processor shall take steps to ensure that any natural person acting under the authority of the controller or the processor who has access to personal data does not process them except on instructions from the controller, unless he or she is required to do so by Union or Member State law.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 33 — Breach notification to SA (72-hour rule) -----------------
  breach_notify_sa_72h: R({
    proposition_key: "breach_notify_sa_72h",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(1)",
    verbatim_quote:
      "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  breach_processor_notify_controller: R({
    proposition_key: "breach_processor_notify_controller",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(2)",
    verbatim_quote:
      "The processor shall notify the controller without undue delay after becoming aware of a personal data breach.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 34 — Breach communication to data subjects --------------------
  breach_notify_data_subject_high_risk: R({
    proposition_key: "breach_notify_data_subject_high_risk",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(1)",
    verbatim_quote:
      "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 35 — DPIA -----------------------------------------------------
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
  dpia_trigger_automated_profiling: R({
    proposition_key: "dpia_trigger_automated_profiling",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(a)",
    verbatim_quote:
      "a systematic and extensive evaluation of personal aspects relating to natural persons which is based on automated processing, including profiling, and on which decisions are based that produce legal effects concerning the natural person or similarly significantly affect the natural person;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_trigger_special_categories_large_scale: R({
    proposition_key: "dpia_trigger_special_categories_large_scale",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(b)",
    verbatim_quote:
      "processing on a large scale of special categories of data referred to in Article 9(1), or of personal data relating to criminal convictions and offences referred to in Article 10;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  dpia_trigger_public_area_monitoring: R({
    proposition_key: "dpia_trigger_public_area_monitoring",
    citation: "GDPR Art. 35",
    subsection: "GDPR Art. 35(3)(c)",
    verbatim_quote:
      "a systematic monitoring of a publicly accessible area on a large scale.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Chapter V — International transfers --------------------------------
  transfers_general_principle: R({
    proposition_key: "transfers_general_principle",
    citation: "GDPR Art. 44",
    subsection: "GDPR Art. 44",
    verbatim_quote:
      "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor",
    depth_class: "section",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  transfers_appropriate_safeguards: R({
    proposition_key: "transfers_appropriate_safeguards",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(1)",
    verbatim_quote:
      "a controller or processor may transfer personal data to a third country or an international organisation only if the controller or processor has provided appropriate safeguards, and on condition that enforceable data subject rights and effective legal remedies for data subjects are available.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  transfers_scc_mechanism: R({
    proposition_key: "transfers_scc_mechanism",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(2)(c)",
    verbatim_quote:
      "standard data protection clauses adopted by the Commission in accordance with the examination procedure referred to in Article 93(2);",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  transfers_bcr_mechanism: R({
    proposition_key: "transfers_bcr_mechanism",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(2)(b)",
    verbatim_quote:
      "binding corporate rules in accordance with Article 47;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- EDPB Guidelines 2/2019 § 2.4 — Necessity limb ----------------------
  // Governance uses this for the DPIA necessity/proportionality assessment
  // (Art. 35(7)(b)) and for data-minimisation framing.
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
};

/**
 * Governance propositions the generator asserts today (or is expected to
 * assert at the wiring turn) that have NO anchorable support in the approved
 * corpus and therefore carry NO row. Listed here for GOVERNANCE-REGISTRY-WIRING
 * as write-around targets.
 *
 * DO NOT paraphrase these into verbatim_quote strings — narrow-but-solid rule.
 */
export const GOVERNANCE_UNANCHORED_PROPOSITIONS: readonly string[] = [
  // GDPR surface not in approved P1 set
  "art_4_definitions",                        // Art. 4 not in P1 (definitions-only per rule anyway)
  "art_6_1_a_consent",                        // Art. 6(1)(a) — full sub-subsection text not in P1
  "art_7_consent_conditions",                 // Art. 7 not in P1
  "art_10_criminal_convictions",              // Art. 10 not in P1
  "art_12_transparency_modalities",           // Art. 12 not in P1
  "art_12_3_response_deadline",               // Art. 12(3) one-month deadline — Art. 12 not in P1
  "art_24_controller_accountability",         // Art. 24 not in P1
  "art_29_processing_under_authority",        // Art. 29 not in P1
  "art_37_dpo_designation",                   // Art. 37 not in P1
  "art_37_1_b_dpo_trigger_core_activities",   // Art. 37(1)(b) — Art. 37 not in P1
  "art_39_dpo_tasks",                         // Art. 39 not in P1
  "art_45_adequacy_decision",                 // Art. 45 not in P1
  "art_56_lead_supervisory_authority",        // Art. 56 not in P1
  "art_57_supervisory_authority_tasks",       // Art. 57 not in P1

  // Recital surface (recitals are not in provision_texts P1)
  "recital_39_transparency_and_awareness",
  "recital_47_legitimate_interests",

  // US-side surface out of scope for GDPR-pinned registry (governed by
  // CCPA/CPRA registries; governance tool cites California via other paths)
  "ccpa_service_provider_contract_1798_100_d",
  "ccpa_right_to_correct_1798_106",
  "ccpa_right_to_delete_1798_105",
  "ccpa_breach_notification_ca_1798_82_sb446",
  "bipa_740_ilcs_14_15_a_e",
  "us_dsr_45_day_deadline",

  // French implementing law framing (per DEFINITIONAL-ARTICLE / France rule)
  "france_loi_informatique_libertes_general",
  "france_cnil_supervisory_authority",

  // Guidance surface not in approved corpus this turn
  "wp29_wp250_breach_notification",
  "wp29_wp243_dpo_guidelines",
  "wp29_wp248_dpia_criteria",
  "edpb_1_2024_legitimate_interests",         // rows lack excerpt_text_norm
  "edpb_9_2022_breach_notification_examples",

  // Conclusion/structural prose (no verbatim anchor by design)
  "governance_maturity_conclusion",
  "governance_recommendation_prose",
] as const;

/**
 * Reserved by narrow-but-solid rule — kept empty on entry so the grader can
 * fail loudly if any future row is added by paraphrase rather than pin-test.
 */
export const KNOWN_PARAPHRASED_KEYS: readonly string[] = [] as const;
