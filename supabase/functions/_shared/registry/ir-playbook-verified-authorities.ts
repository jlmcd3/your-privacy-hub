// IR-REGISTRY-AUTHORING (2026-07-25) — generate-ir-playbook verified-authority registry.
//
// Authoring-only turn: this module is DATA and is NOT imported by any generator
// this turn. Wiring is queued as IR-PLAYBOOK-WIRING (mirror of items 51/55/56 and
// the queued GOVERNANCE-REGISTRY-WIRING / DPA-REGISTRY-WIRING).
//
// Row shape follows dpa-verified-authorities.ts / lia-verified-authorities.ts /
// governance-verified-authorities.ts exactly. See
// supabase/functions/_shared/verified-authority-resolver.ts for the contract.
//
// AUTHORING RULE (CEO non-CPPA — narrow-but-solid, GDPR-pinned):
// every verbatim_quote MUST be a byte-exact substring of an APPROVED corpus
// source. Sources this turn:
//   * public.provision_texts rows keyed gdpr-art-* (status='approved',
//     jurisdiction='EU'; P1 bootstrap, ledger item 38 —
//     NONCPPA-P1-BATCH-REPORT-2026-07-25.md).
//   * public.edpb_guidelines rows for "EDPB Guidelines 2/2019" were REVIEWED
//     for the IR playbook citation surface (breach notification, Art. 33/34
//     mechanics, severity triage, cross-border coordination). NO row from
//     EDPB 2/2019 was pinned — the guideline's substantive scope is Art. 6(1)(b)
//     performance-of-contract, not incident response. EDPB Guidelines 9/2022 on
//     personal data breach notification (the on-topic guidance the IR generator
//     references) is NOT in approved corpus this turn and is enumerated on the
//     unanchored list below.
//
// Any proposition without a byte-exact pin gets NO row. Write-around targets
// are enumerated in IR_PLAYBOOK_UNANCHORED_PROPOSITIONS below. Non-EU
// notification regimes (UK GDPR, HIPAA, US state statutes, PIPEDA / SOR 2018-64,
// Quebec Law 25, Danish DBL §12, national SA portals, WP29 WP250, EDPB 9/2022,
// etc.) are all on the unanchored list until a future ingestion turn lands
// verifiable text.
//
// Pin-testing: every row passes a deterministic substring pin-test against a
// LIVE PostgREST fetch of its source (see
// supabase/functions/_tests/ir-registry.test.ts). KNOWN_PARAPHRASED_KEYS is
// EMPTY on entry and must stay empty.

// ITEM 328 (UK/EU FIX 3) — REUSE-NOT-DUPLICATE.
// The UK Chapter V rows this product needs (Art. 44 omission record, Art. 44A
// general principle, Art. 45B / 46 benchmarks) were verified byte-exact against
// the approved corpus by Item 327 and live in the governance registry. They are
// IMPORTED here by reference rather than re-typed: a second literal copy of the
// same verbatim quote is a second thing to drift, and the Item 327 pin test
// would not be guarding it. The corpus pin therefore covers both products.
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "./governance-verified-authorities.ts";
import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../verified-authority-resolver.ts";

/** Registry version tag. Bumped on any row add/edit; grader may pin against it. */
export const IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION = "ir-va-w2-2026-08-01-item328";

/** Canonical published text URL (official primary source). */
const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";

/** Verification date — hand-verified against the primary source. */
const VOD = "2026-07-25";

/** Governing anchor label. */
const GDPR = "Regulation (EU) 2016/679 (GDPR)";

/** UK GDPR anchors (ITEM 304 / FIX D — sourced from Item 302 corpus rows). */
const UK_GDPR = "Regulation (EU) 2016/679 as retained in UK law (UK GDPR)";
const UK_GDPR_URL_33 = "https://www.legislation.gov.uk/eur/2016/679/article/33";
const UK_GDPR_URL_34 = "https://www.legislation.gov.uk/eur/2016/679/article/34";
const UK_VOD = "2026-07-31";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const IR_PLAYBOOK_VERIFIED_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ---- Art. 33 — Notification to the supervisory authority -----------------
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
  breach_notify_reasons_for_delay: R({
    proposition_key: "breach_notify_reasons_for_delay",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(1)",
    verbatim_quote:
      "Where the notification to the supervisory authority is not made within 72 hours, it shall be accompanied by reasons for the delay.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  processor_notify_controller_without_undue_delay: R({
    proposition_key: "processor_notify_controller_without_undue_delay",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(2)",
    verbatim_quote:
      "The processor shall notify the controller without undue delay after becoming aware of a personal data breach.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  notification_content_describe_breach: R({
    proposition_key: "notification_content_describe_breach",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(3)(a)",
    verbatim_quote:
      "describe the nature of the personal data breach including where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  notification_content_dpo_contact: R({
    proposition_key: "notification_content_dpo_contact",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(3)(b)",
    verbatim_quote:
      "communicate the name and contact details of the data protection officer or other contact point where more information can be obtained;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  notification_content_likely_consequences: R({
    proposition_key: "notification_content_likely_consequences",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(3)(c)",
    verbatim_quote: "describe the likely consequences of the personal data breach;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  notification_content_measures_taken: R({
    proposition_key: "notification_content_measures_taken",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(3)(d)",
    verbatim_quote:
      "describe the measures taken or proposed to be taken by the controller to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  phased_notification_permitted: R({
    proposition_key: "phased_notification_permitted",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(4)",
    verbatim_quote:
      "Where, and in so far as, it is not possible to provide the information at the same time, the information may be provided in phases without undue further delay.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  document_breaches_duty: R({
    proposition_key: "document_breaches_duty",
    citation: "GDPR Art. 33",
    subsection: "GDPR Art. 33(5)",
    verbatim_quote:
      "The controller shall document any personal data breaches, comprising the facts relating to the personal data breach, its effects and the remedial action taken. That documentation shall enable the supervisory authority to verify compliance with this Article.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 34 — Communication to the data subject -------------------------
  communicate_to_data_subject_high_risk: R({
    proposition_key: "communicate_to_data_subject_high_risk",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(1)",
    verbatim_quote:
      "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  communication_clear_plain_language: R({
    proposition_key: "communication_clear_plain_language",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(2)",
    verbatim_quote:
      "The communication to the data subject referred to in paragraph 1 of this Article shall describe in clear and plain language the nature of the personal data breach and contain at least the information and measures referred to in points (b), (c) and (d) of Article 33(3).",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  exception_encryption_unintelligibility: R({
    proposition_key: "exception_encryption_unintelligibility",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(3)(a)",
    verbatim_quote:
      "the controller has implemented appropriate technical and organisational protection measures, and those measures were applied to the personal data affected by the personal data breach, in particular those that render the personal data unintelligible to any person who is not authorised to access it, such as encryption;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  exception_subsequent_measures: R({
    proposition_key: "exception_subsequent_measures",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(3)(b)",
    verbatim_quote:
      "the controller has taken subsequent measures which ensure that the high risk to the rights and freedoms of data subjects referred to in paragraph 1 is no longer likely to materialise;",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  exception_disproportionate_effort: R({
    proposition_key: "exception_disproportionate_effort",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(3)(c)",
    verbatim_quote:
      "it would involve disproportionate effort. In such a case, there shall instead be a public communication or similar measure whereby the data subjects are informed in an equally effective manner.",
    depth_class: "sub_subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
  sa_may_require_communication: R({
    proposition_key: "sa_may_require_communication",
    citation: "GDPR Art. 34",
    subsection: "GDPR Art. 34(4)",
    verbatim_quote:
      "If the controller has not already communicated the personal data breach to the data subject, the supervisory authority, having considered the likelihood of the personal data breach resulting in a high risk, may require it to do so or may decide that any of the conditions referred to in paragraph 3 are met.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),

  // ---- Art. 32 — Security of processing (incident-response backbone) --------
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
  security_risk_factors_scope: R({
    proposition_key: "security_risk_factors_scope",
    citation: "GDPR Art. 32",
    subsection: "GDPR Art. 32(2)",
    verbatim_quote:
      "In assessing the appropriate level of security account shall be taken in particular of the risks that are presented by processing, in particular from accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data transmitted, stored or otherwise processed.",
    depth_class: "subsection",
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

  // ---- Art. 28(3)(f)/(h) — Processor duties invoked during incident --------
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

  // ---- Art. 30 — Records of processing (post-incident evidence) -------------
  controller_ropa_duty: R({
    proposition_key: "controller_ropa_duty",
    citation: "GDPR Art. 30",
    subsection: "GDPR Art. 30(1)",
    verbatim_quote:
      "Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility.",
    depth_class: "subsection",
    governing_anchor: GDPR,
    verified_on: VOD,
    primary_source_url: GDPR_URL,
  }),
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

  // ---- Art. 5(1) — Principles invoked in IR framing ------------------------
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

  // ---- Art. 9(1) — Special categories heightening breach risk --------------
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

  // ---- Chapter V — transfers implicated in cross-border incident coordination
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

  // ---- UK GDPR breach surface (ITEM 304 / FIX D) ---------------------------
  // Item 302 ingested the UK-specific text as provision_texts `ukgdpr-art-33`
  // / `ukgdpr-art-34` (jurisdiction='UK', status='approved'). These rows carry
  // the UK-specific "Commissioner" language and therefore MUST NOT fall back
  // to the EU Art. 33/34 rows above. Both keys were removed from
  // IR_PLAYBOOK_UNANCHORED_PROPOSITIONS in the same turn.
  uk_gdpr_art_33_mirror: R({
    proposition_key: "uk_gdpr_art_33_mirror",
    citation: "UK GDPR Art. 33",
    subsection: "UK GDPR Art. 33(1)",
    verbatim_quote:
      "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the Commissioner , unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: UK_VOD,
    primary_source_url: UK_GDPR_URL_33,
  }),
  uk_gdpr_art_34_mirror: R({
    proposition_key: "uk_gdpr_art_34_mirror",
    citation: "UK GDPR Art. 34",
    subsection: "UK GDPR Art. 34(1)",
    verbatim_quote:
      "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.",
    depth_class: "subsection",
    governing_anchor: UK_GDPR,
    verified_on: UK_VOD,
    primary_source_url: UK_GDPR_URL_34,
  }),

  // ---- UK Chapter V transfer surface (ITEM 328, reused from Item 327) ------
  // Item 302 residual watch item (2): this product cited EU Art. 44 for UK
  // transfer framing against an article that is OMITTED in UK law. The UK rail
  // is Art. 44A / 45A / 45B / 46, and the omission itself is a stated record.
  // Imported by reference from GOVERNANCE_VERIFIED_AUTHORITIES — NOT re-typed.
  uk_art_44_not_in_force: GOVERNANCE_VERIFIED_AUTHORITIES["uk_art_44_not_in_force"],
  uk_transfers_general_principle: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_general_principle"],
  uk_transfers_adequacy_route: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_adequacy_route"],
  uk_transfers_safeguards_route: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_safeguards_route"],
  uk_adequacy_data_protection_test: GOVERNANCE_VERIFIED_AUTHORITIES["uk_adequacy_data_protection_test"],
  uk_transfers_appropriate_safeguards: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_appropriate_safeguards"],
  uk_transfers_sos_clauses: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_sos_clauses"],
  uk_transfers_commissioner_clauses: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_commissioner_clauses"],
  uk_transfers_data_protection_test: GOVERNANCE_VERIFIED_AUTHORITIES["uk_transfers_data_protection_test"],

};

/**
 * Propositions the generate-ir-playbook generator asserts today (or is expected
 * to assert at the wiring turn) that have NO anchorable support in the approved
 * corpus and therefore carry NO row. Listed here for the IR-PLAYBOOK-WIRING
 * deploy turn (write-around targets).
 *
 * DO NOT paraphrase these into verbatim_quote strings — narrow-but-solid rule.
 */
export const IR_PLAYBOOK_UNANCHORED_PROPOSITIONS: readonly string[] = [
  // GDPR/UK GDPR structural surface not held in approved P1
  "art_37_dpo_designation_thresholds",       // Art. 37 not in approved P1 set (DPO conditional-mention framing)
  "art_55_competent_supervisory_authority",  // Art. 55 not in approved P1 set (SA competence rules)
  "art_56_lead_supervisory_authority",       // Art. 56 not in approved P1 set (one-stop-shop lead SA)
  "art_60_cooperation_lead_and_concerned",   // Art. 60 not in approved P1 set (cross-border cooperation)
  "art_83_administrative_fines",             // Art. 83 not in approved P1 set (fine-exposure framing)

  // UK GDPR / DPA 2018 surface
  // ITEM 304 / FIX D: `uk_gdpr_art_33_mirror` and `uk_gdpr_art_34_mirror` were
  // REMOVED from this list — Item 302 landed the UK-specific text in corpus as
  // provision_texts `ukgdpr-art-33` / `ukgdpr-art-34`, and both now carry real
  // registry rows above (UK "Commissioner" language, not the EU fallback).
  "uk_dpa_2018_ico_notification_portal",     // ICO breach-notification portal mechanics — not in corpus

  // EDPB guidance the IR generator invokes but is not in approved corpus
  "edpb_9_2022_breach_notification",         // EDPB Guidelines 9/2022 on personal data breach notification — not ingested
  "edpb_9_2022_awareness_definition",        // 9/2022 "awareness" test (reasonable degree of certainty) — not ingested
  "edpb_9_2022_breach_examples",             // 9/2022 case examples (ransomware, exfiltration, availability) — not ingested
  "wp29_wp250_breach_notification",          // Article 29 WP250 rev.01 — superseded by 9/2022 and not in corpus
  "edpb_01_2021_supersession_note",          // "9/2022 replaces 01/2021" framing — not in corpus

  // National SA operational surface (portals, forms, statutory contact points)
  "garante_it_notification_portal",          // Italy — not in corpus
  "cnil_fr_notification_portal",             // France — not in corpus
  "ico_uk_notification_portal",              // UK — not in corpus
  "aepd_es_notification_portal",             // Spain — not in corpus
  "dsk_de_notification_portal",              // Germany — not in corpus
  "uodo_pl_notification_portal",             // Poland — not in corpus
  "national_sa_registry_generic",            // any "consult regulator's register" prose — not in statute

  // Non-EU breach-notification statutes referenced by the IR generator
  "hipaa_breach_notification_rule",          // 45 CFR §§ 164.400-414 — not in corpus
  "ca_civ_code_1798_82_pre_2026",            // California pre-SB-446 regime — not in corpus
  "ca_sb_446_post_2026_regime",              // California SB-446 30-day / 15-day AG copy — not in corpus
  "ny_shield_act_breach_notification",       // NY GBS §899-aa — not in corpus
  "tx_bccp_breach_notification",             // Texas BCC §521.053 — not in corpus
  "pipeda_breach_of_security_safeguards",    // PIPEDA + SOR/2018-64 — not in corpus
  "quebec_law_25_breach_notification",       // Quebec Law 25 "sans délai" regime — not in corpus
  "danish_dbl_section_12_employment",        // Danish DBL §12 employment context — not in corpus
  "state_ag_notification_thresholds",        // US state AG-notification headcount thresholds — not in corpus

  // IR operational prose (structural, not quotable)
  "seventy_two_hour_operational_mechanics",  // 72-hour clock operational drilldown prose — descriptive not statutory
  "awareness_versus_detection_prose",        // awareness/detection distinction drilldown — 9/2022 not in corpus
  "severity_triage_framework_prose",         // severity-triage matrix / heat maps — no statutory pin
  "containment_and_eradication_prose",       // containment / eradication runbook — no statutory pin
  "forensic_preservation_prose",             // forensic-preservation guidance — no statutory pin
  "communications_stakeholder_matrix_prose", // stakeholder-comms matrix — no statutory pin
  "insurer_and_law_enforcement_notification",// cyber-insurance and LE notification prose — no statutory pin
  "post_incident_review_prose",              // lessons-learned / post-mortem prose — no statutory pin
  "playbook_role_matrix_prose",              // IR role/RACI matrix — no statutory pin
  "notification_letter_template_prose",      // individual-notification template copy — no statutory pin

  // Recitals not held in P1 (recitals are not in provision_texts P1)
  "recital_85_breach_purpose_and_scope",     // Recital 85 breach framing
  "recital_86_communication_content",        // Recital 86 communication scope
  "recital_87_awareness_and_timing",         // Recital 87 awareness/timing framing
  "recital_88_technical_and_organisational", // Recital 88 investigation cooperation

  // CJEU case-law surface (case_law table not in scope this turn)
  "cjeu_c_340_21_natsionalna_agentsia",      // C-340/21 breach-security-standard — not in corpus

  // Conclusion / recommendation prose (structural)
  "conclusion_ir_playbook_summary",          // "playbook aligned" conclusion — no verbatim anchor
  "recommendation_tabletop_exercise",        // "run tabletop exercise" recommendation — structural
  "recommendation_processor_contract_review",// "review processor contracts" recommendation — structural
] as const;

/**
 * Reserved by the narrow-but-solid rule — kept empty on entry so the grader
 * can fail loudly if any future row is added by paraphrase rather than pin-test.
 */
export const KNOWN_PARAPHRASED_KEYS: readonly string[] = [] as const;
