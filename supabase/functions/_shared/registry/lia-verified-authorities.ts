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
export const LIA_VERIFIED_AUTHORITY_VERSION = "lia-va-w1-2026-07-25";

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
  "recital_47_three_part_test",             // three-part necessity/reasonable-expectations framing
  "recital_47_direct_marketing_li",         // direct marketing as a legitimate interest
  "recital_48_intra_group_transmission",    // intra-group administrative purposes
  "recital_49_network_security",            // network-and-information-security LI
  "recital_50_further_processing",          // secondary-use compatibility test

  // Guidance surface not usable this turn
  "edpb_1_2024_three_step_test",            // EDPB Guidelines 1/2024 — rows lack excerpt_text_norm; no substring pin possible
  "edpb_1_2024_reasonable_expectations",    // EDPB Guidelines 1/2024 — same
  "edpb_1_2024_vulnerable_data_subjects",   // EDPB Guidelines 1/2024 — same
  "wp29_wp217_balancing_test",              // WP29 Opinion 06/2014 not in corpus

  // CJEU case-law surface not held (case_law table not in scope this turn)
  "cjeu_meta_bundeskartellamt_three_part",  // C-252/21 three-part-test articulation
  "cjeu_rigas_purpose_specification",       // C-13/16 purpose specification
  "cjeu_fashion_id_joint_controller",       // C-40/17 joint-controller LI

  // Statutory / SA guidance surface not held
  "uk_ico_lia_template_guidance",           // ICO LIA template guidance
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
