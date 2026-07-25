// DPA-REGISTRY-AUTHORING (2026-07-25) — generate-dpa verified-authority registry.
//
// Authoring-only turn: this module is DATA and is NOT imported by any generator
// this turn. Wiring is queued as DPA-REGISTRY-WIRING (mirror of items 51/55/56).
//
// Row shape follows lia-verified-authorities.ts / dpia-verified-authorities.ts /
// governance-verified-authorities.ts exactly. See
// supabase/functions/_shared/verified-authority-resolver.ts for the contract.
//
// AUTHORING RULE (CEO non-CPPA — narrow-but-solid, GDPR-pinned first):
// every verbatim_quote MUST be a byte-exact substring of an APPROVED corpus
// source. Sources:
//   * public.provision_texts rows keyed gdpr-art-*  (status='approved',
//     jurisdiction='EU'; P1 bootstrap, ledger item 38 —
//     NONCPPA-P1-BATCH-REPORT-2026-07-25.md), AND
//   * public.edpb_guidelines rows for "EDPB Guidelines 2/2019" (status='final';
//     P2 batch 1, ledger item 41; § 2.4 Necessity carried forward for the
//     "necessity" limb that DPA-scope discussions occasionally invoke).
//
// Any proposition without a byte-exact pin gets NO row. Write-around targets
// are enumerated in DPA_UNANCHORED_PROPOSITIONS below. EDPB Guidelines 1/2024
// and EDPB 07/2020 processor guidance are NOT usable this turn — either not
// ingested or empty excerpt_text_norm. All those propositions are on the
// unanchored list until a future ingestion turn lands.
//
// Pin-testing: every row passes a deterministic substring pin-test against a
// LIVE PostgREST fetch of its source (see
// supabase/functions/_tests/dpa-registry.test.ts). KNOWN_PARAPHRASED_KEYS is
// EMPTY on entry and must stay empty.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const DPA_VERIFIED_AUTHORITY_VERSION = "dpa-va-w1-2026-07-25";

/** Canonical published text URLs (official primary sources). */
const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
const EDPB_2_2019_URL =
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en";

/** Verification date — hand-verified against the primary source. */
const VOD = "2026-07-25";

/** Governing anchor labels. */
const GDPR = "Regulation (EU) 2016/679 (GDPR)";
const EDPB_2_2019 =
  "EDPB Guidelines 2/2019 on processing of personal data under Article 6(1)(b) GDPR";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const DPA_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Art. 28 — Processor obligations (the DPA backbone) -------------------
  processor_sufficient_guarantees: R({
    proposition_key: "processor_sufficient_guarantees",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(1)",
    verbatim_quote:
      "the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures in such a manner that processing will meet the requirements of this Regulation and ensure the protection of the rights of the data subject.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  sub_processor_authorisation_required: R({
    proposition_key: "sub_processor_authorisation_required",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(2)",
    verbatim_quote:
      "The processor shall not engage another processor without prior specific or general written authorisation of the controller.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  sub_processor_general_authorisation_change_notice: R({
    proposition_key: "sub_processor_general_authorisation_change_notice",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(2)",
    verbatim_quote:
      "In the case of general written authorisation, the processor shall inform the controller of any intended changes concerning the addition or replacement of other processors, thereby giving the controller the opportunity to object to such changes.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processing_governed_by_binding_contract: R({
    proposition_key: "processing_governed_by_binding_contract",
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
      "processes the personal data only on documented instructions from the controller, including with regard to transfers of personal data to a third country or an international organisation, unless required to do so by Union or Member State law to which the processor is subject; in such a case, the processor shall inform the controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  personnel_confidentiality: R({
    proposition_key: "personnel_confidentiality",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(b)",
    verbatim_quote:
      "ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_security_measures_ref: R({
    proposition_key: "processor_security_measures_ref",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(c)",
    verbatim_quote: "takes all measures required pursuant to Article 32;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  sub_processor_conditions_ref: R({
    proposition_key: "sub_processor_conditions_ref",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(d)",
    verbatim_quote:
      "respects the conditions referred to in paragraphs 2 and 4 for engaging another processor;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_assists_data_subject_requests: R({
    proposition_key: "processor_assists_data_subject_requests",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(e)",
    verbatim_quote:
      "taking into account the nature of the processing, assists the controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the controller's obligation to respond to requests for exercising the data subject's rights laid down in Chapter III;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_assists_arts_32_to_36: R({
    proposition_key: "processor_assists_arts_32_to_36",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(f)",
    verbatim_quote:
      "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  return_or_delete_at_end: R({
    proposition_key: "return_or_delete_at_end",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(g)",
    verbatim_quote:
      "at the choice of the controller, deletes or returns all the personal data to the controller after the end of the provision of services relating to processing, and deletes existing copies unless Union or Member State law requires storage of the personal data;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  demonstrate_compliance_and_audits: R({
    proposition_key: "demonstrate_compliance_and_audits",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3)(h)",
    verbatim_quote:
      "makes available to the controller all information necessary to demonstrate compliance with the obligations laid down in this Article and allow for and contribute to audits, including inspections, conducted by the controller or another auditor mandated by the controller.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_infringement_notification_duty: R({
    proposition_key: "processor_infringement_notification_duty",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(3), final subparagraph",
    verbatim_quote:
      "the processor shall immediately inform the controller if, in its opinion, an instruction infringes this Regulation or other Union or Member State data protection provisions.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  sub_processor_flow_down_obligations: R({
    proposition_key: "sub_processor_flow_down_obligations",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(4)",
    verbatim_quote:
      "the same data protection obligations as set out in the contract or other legal act between the controller and the processor as referred to in paragraph 3 shall be imposed on that other processor by way of a contract or other legal act under Union or Member State law, in particular providing sufficient guarantees to implement appropriate technical and organisational measures in such a manner that the processing will meet the requirements of this Regulation.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  initial_processor_remains_liable: R({
    proposition_key: "initial_processor_remains_liable",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(4)",
    verbatim_quote:
      "Where that other processor fails to fulfil its data protection obligations, the initial processor shall remain fully liable to the controller for the performance of that other processor's obligations.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  contract_in_writing: R({
    proposition_key: "contract_in_writing",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(9)",
    verbatim_quote:
      "The contract or the other legal act referred to in paragraphs 3 and 4 shall be in writing, including in electronic form.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_becomes_controller_if_exceeds_instructions: R({
    proposition_key: "processor_becomes_controller_if_exceeds_instructions",
    citation: "GDPR Art. 28",
    subsection: "GDPR Art. 28(10)",
    verbatim_quote:
      "if a processor infringes this Regulation by determining the purposes and means of processing, the processor shall be considered to be a controller in respect of that processing.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 30(2) — Processor RoPA -----------------------------------------
  processor_ropa_duty: R({
    proposition_key: "processor_ropa_duty",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(2)",
    verbatim_quote:
      "Each processor and, where applicable, the processor's representative shall maintain a record of all categories of processing activities carried out on behalf of a controller",
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
  security_pseudonymisation_encryption: R({
    proposition_key: "security_pseudonymisation_encryption",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)(a)",
    verbatim_quote: "the pseudonymisation and encryption of personal data;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  security_confidentiality_integrity_availability_resilience: R({
    proposition_key: "security_confidentiality_integrity_availability_resilience",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)(b)",
    verbatim_quote:
      "the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  security_restore_availability: R({
    proposition_key: "security_restore_availability",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)(c)",
    verbatim_quote:
      "the ability to restore the availability and access to personal data in a timely manner in the event of a physical or technical incident;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  security_regular_testing: R({
    proposition_key: "security_regular_testing",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(1)(d)",
    verbatim_quote:
      "a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the processing.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  staff_process_only_on_instructions: R({
    proposition_key: "staff_process_only_on_instructions",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(4)",
    verbatim_quote:
      "The controller and processor shall take steps to ensure that any natural person acting under the authority of the controller or the processor who has access to personal data does not process them except on instructions from the controller, unless he or she is required to do so by Union or Member State law.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 33(2) — Processor breach-notify --------------------------------
  processor_breach_notify_controller: R({
    proposition_key: "processor_breach_notify_controller",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(2)",
    verbatim_quote:
      "The processor shall notify the controller without undue delay after becoming aware of a personal data breach.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 5(1) — Principles applied in DPA recitals -----------------------
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

  // ---- Art. 9(1) — Special categories (DPA scope carve-in) -----------------
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

  // ---- Art. 44 — Chapter V general principle for transfers ------------------
  transfers_chapter_v_general_principle: R({
    proposition_key: "transfers_chapter_v_general_principle",
    citation: "GDPR Art. 44",
    subsection: "GDPR Art. 44",
    verbatim_quote:
      "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers of personal data from the third country or an international organisation to another third country or to another international organisation.",
    depth_class: "section",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 46 — Appropriate safeguards for transfers -----------------------
  transfers_appropriate_safeguards_required: R({
    proposition_key: "transfers_appropriate_safeguards_required",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(1)",
    verbatim_quote:
      "In the absence of a decision pursuant to Article 45(3), a controller or processor may transfer personal data to a third country or an international organisation only if the controller or processor has provided appropriate safeguards, and on condition that enforceable data subject rights and effective legal remedies for data subjects are available.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  transfers_bcr_safeguard: R({
    proposition_key: "transfers_bcr_safeguard",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(2)(b)",
    verbatim_quote: "binding corporate rules in accordance with Article 47;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  transfers_scc_safeguard: R({
    proposition_key: "transfers_scc_safeguard",
    citation: "GDPR Art. 46",
    subsection: "GDPR Art. 46(2)(c)",
    verbatim_quote:
      "standard data protection clauses adopted by the Commission in accordance with the examination procedure referred to in Article 93(2);",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- EDPB Guidelines 2/2019 § 2.4 — Necessity ----------------------------
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
 * Propositions the generate-dpa generator asserts today (or is expected to
 * assert at the wiring turn) that have NO anchorable support in the approved
 * corpus and therefore carry NO row. Listed here for the DPA-REGISTRY-WIRING
 * deploy turn (write-around targets).
 *
 * DO NOT paraphrase these into verbatim_quote strings — narrow-but-solid rule.
 */
export const DPA_UNANCHORED_PROPOSITIONS: readonly string[] = [
  // GDPR Article surface not held in approved P1
  "art_29_processor_instruction_scope",       // Art. 29 not in approved P1 set (staff-under-authority companion to 32(4))
  "art_45_adequacy_decision",                 // Art. 45 not in approved P1 set (UK adequacy, EU-US DPF, etc.)
  "art_47_bcr_conditions",                    // Art. 47 not in approved P1 set (BCR approval mechanism)
  "art_82_liability_and_compensation",        // Art. 82 not in approved P1 set (joint-liability / indemnity)
  "art_83_administrative_fines",              // Art. 83 not in approved P1 set (fine-exposure recitals)
  "art_5_2_accountability_principle",         // Art. 5(2) accountability limb not held (only 5(1)(a)-(c))
  "art_5_1_d_accuracy",                       // Art. 5(1)(d) not held in approved P1
  "art_5_1_e_storage_limitation",             // Art. 5(1)(e) not held in approved P1
  "art_5_1_f_integrity_confidentiality",      // Art. 5(1)(f) not held in approved P1
  "art_9_2_exceptions_menu",                  // Art. 9(2)(a)-(j) individual carve-outs not each pinned this turn
  "art_10_criminal_convictions",              // Art. 10 not in approved P1 set

  // Chapter V / transfer surface not usable this turn
  "scc_module_selection",                     // Commission Implementing Decision 2021/914 modules 1-4 — not in corpus
  "scc_module_two_controller_to_processor",   // Module 2 specifics — not in corpus
  "scc_module_three_processor_to_processor",  // Module 3 specifics — not in corpus
  "scc_annex_i_ii_iii_population",            // SCC Annexes I/II/III drafting mechanics — not in corpus
  "transfer_impact_assessment",               // EDPB Recommendations 01/2020 TIA — not in corpus
  "uk_idta_or_uk_addendum",                   // UK IDTA / UK Addendum — not in corpus
  "eu_us_data_privacy_framework",             // EU-US DPF adequacy — not in corpus
  "uk_adequacy_decision_dec_2025",            // UK adequacy 19 Dec 2025 (used in generator prose) — not in corpus

  // Recital surface not held (recitals are not in provision_texts P1)
  "recital_81_processor_selection",           // Recital 81 processor-selection framing
  "recital_82_processor_records",             // Recital 82 processor-records
  "recital_87_breach_notice_scope",           // Recital 87 breach-scope
  "recital_39_transparency_principle",        // Recital 39 transparency
  "recital_108_appropriate_safeguards",       // Recital 108 transfer safeguards

  // Guidance surface not usable this turn
  "edpb_07_2020_controller_processor",        // EDPB Guidelines 07/2020 controller/processor concepts — not in corpus
  "edpb_09_2022_breach_notification",         // EDPB Guidelines 9/2022 breach notification — not in corpus
  "edpb_05_2021_scc_deference",               // EDPB deference to SCCs — not in corpus
  "edpb_02_2020_edct_supplementary_measures", // EDPB Recommendations 01/2020 supplementary measures — not in corpus
  "edpb_1_2024_legitimate_interests",         // EDPB Guidelines 1/2024 — rows lack excerpt_text_norm
  "wp29_wp169_controller_processor",          // WP29 Opinion 1/2010 — not in corpus

  // CJEU case-law surface not held (case_law table not in scope this turn)
  "cjeu_schrems_ii_transfer_standard",        // C-311/18 Schrems II
  "cjeu_wirtschaftsakademie_joint_controller",// C-210/16
  "cjeu_fashion_id_joint_controller",         // C-40/17

  // Contract/commercial prose (structural, not quotable)
  "sub_processor_commercial_terms",           // fees/warranties/termination for sub-processor — no statutory pin
  "liability_indemnity_cap_prose",            // liability caps / indemnities — no statutory pin
  "audit_logistics_prose",                    // notice periods / audit windows / auditor qualifications — no statutory pin
  "warranty_and_representation_prose",        // reps and warranties — no statutory pin
  "governing_law_and_forum_selection",        // governing law / venue — no statutory pin
  "termination_for_convenience_prose",        // termination-for-convenience — no statutory pin
  "return_or_delete_operational_timeline",    // operational SLAs for Art. 28(3)(g) — not in statute
  "audit_frequency_and_notice_prose",         // audit cadence — not in statute

  // Conclusion / recommendation prose (structural, not quotable)
  "conclusion_dpa_valid_summary",             // "DPA is compliant" conclusion — no verbatim anchor
  "recommendation_annex_completion",          // "complete Annex I/II" prose — structural
  "recommendation_scc_execution",             // "execute SCCs" recommendation — structural
] as const;

/**
 * Reserved by the narrow-but-solid rule — kept empty on entry so the grader
 * can fail loudly if any future row is added by paraphrase rather than pin-test.
 */
export const KNOWN_PARAPHRASED_KEYS: readonly string[] = [] as const;
