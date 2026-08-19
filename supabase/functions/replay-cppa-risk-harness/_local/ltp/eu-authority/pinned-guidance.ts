/**
 * ITEM 341 — EU PERSUASIVE-AUTHORITY PINS for the cppa-risk report.
 *
 * PIN LAW: every `verbatim_quote` below is a byte-exact contiguous substring
 * of the `excerpt_text` of the identified `edpb_guidelines` row
 * (status='final'), captured 2026-08-01. The pins are RE-QUERIED at build
 * time (see ./fetch.ts) and a pin whose text no longer matches byte-for-byte
 * is DROPPED rather than shipped — the section never paraphrases, never
 * repairs, and never quotes from memory.
 *
 * PERSUASION LAW: nothing in this file is binding authority for a CPPA risk
 * assessment. It is EU/EEA material under a different legal regime, offered
 * for persuasive comparison only, with weight reserved to the Company and
 * its counsel. The § 7156(a) directive carve-out does NOT extend here.
 */

export const EU_AUTHORITY_PINS_VERSION =
  "cppa-risk-eu-authority-pins-2026-08-01-item341";

export type EuTopicId =
  | "risk_methodology"
  | "automated_decision_making"
  | "sensitive_data"
  | "vulnerable_or_minor_subjects"
  | "legitimate_interest_balancing"
  | "access_and_transparency"
  | "retention";

export interface EuGuidancePin {
  readonly pin_id: string;
  readonly topic_id: EuTopicId;
  /** edpb_guidelines.id — re-queried byte-exact at build time. */
  readonly corpus_row_id: string;
  readonly guideline_ref: string;
  readonly citation: string;
  readonly source_url: string;
  readonly verbatim_quote: string;
}

export const EU_GUIDANCE_PINS: readonly EuGuidancePin[] = [
  {
    pin_id: "wp248_criteria_weight",
    topic_id: "risk_methodology",
    corpus_row_id: "792b08dd-43b8-49e2-93bf-edd398d11adf",
    guideline_ref: "WP248 rev.01",
    citation: "EDPB WP248 rev.01, § III.B (criteria for high risk)",
    source_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
    verbatim_quote:
      "In general, the WP29 considers that the more criteria are met by the processing, the more likely it is to present a high risk to the rights and freedoms of data subjects, and therefore to require a DPIA, regardless of the measures which the controller envisages to adopt. However, in some cases, a data controller can consider that a processing meeting only one of these criteria requires a DPIA.",
  },
  {
    pin_id: "wp248_risk_severity",
    topic_id: "risk_methodology",
    corpus_row_id: "b61c71f6-f03b-4eb7-a5ce-6e292f696bf5",
    guideline_ref: "WP248 rev.01",
    citation: "EDPB WP248 rev.01, Annex 2 (criteria for an acceptable DPIA)",
    source_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
    verbatim_quote:
      "origin, nature, particularity and severity of the risks are appreciated (cf. recital 84) or, more specifically, for each risk (illegitimate access, undesired modification, and disappearance of data) from the perspective of the data subjects",
  },
  {
    pin_id: "wp248_evaluation_scoring",
    topic_id: "automated_decision_making",
    corpus_row_id: "9a8bc2a6-cec9-4687-aa50-0f3f7da0852d",
    guideline_ref: "WP248 rev.01",
    citation: "EDPB WP248 rev.01, § III.B (criterion 1 — evaluation or scoring)",
    source_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
    verbatim_quote:
      "1. Evaluation or scoring, including profiling and predicting, especially from “aspects concerning the data subject's performance at work, economic situation, health, personal preferences or interests, reliability or behavior, location or movements” (recitals 71 and 91).",
  },
  {
    pin_id: "wp248_sensitive_data",
    topic_id: "sensitive_data",
    corpus_row_id: "118b22d4-775e-4472-8f33-4a8d1eb22887",
    guideline_ref: "WP248 rev.01",
    citation: "EDPB WP248 rev.01, § III.B (criterion 4 — sensitive data)",
    source_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
    verbatim_quote:
      "4. Sensitive data or data of a highly personal nature: this includes special categories of personal data as defined in Article 9 (for example information about individuals’ political opinions), as well as personal data relating to criminal convictions or offences as defined in Article 10.",
  },
  {
    pin_id: "wp248_vulnerable_subjects",
    topic_id: "vulnerable_or_minor_subjects",
    corpus_row_id: "93066195-ee78-45bd-b7f6-ffd47ab3b931",
    guideline_ref: "WP248 rev.01",
    citation: "EDPB WP248 rev.01, § III.B (criterion 7 — vulnerable data subjects)",
    source_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
    verbatim_quote:
      "7. Data concerning vulnerable data subjects (recital 75): the processing of this type of data is a criterion because of the increased power imbalance between the data subjects and the data controller, meaning the individuals may be unable to easily consent to, or oppose, the processing of their data, or exercise their rights.",
  },
  {
    pin_id: "edpb_li_interest_not_sufficient",
    topic_id: "legitimate_interest_balancing",
    corpus_row_id: "110176e1-4556-41b6-ba5e-7427a20a61dd",
    guideline_ref: "EDPB Guidelines 1/2024",
    citation: "EDPB Guidelines 1/2024 on legitimate interests, § 2 (¶ 13)",
    source_url: "https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf",
    verbatim_quote:
      "It should be stressed from the outset that the existence and identification of a legitimate interest pursued by the controller or a third party is not in itself sufficient to rely on Article 6(1)(f) GDPR as a legal basis.",
  },
  {
    pin_id: "edpb_access_charter",
    topic_id: "access_and_transparency",
    corpus_row_id: "497f9628-70ca-4b34-b6a6-63b50886bec9",
    guideline_ref: "EDPB Guidelines 01/2022",
    citation: "EDPB Guidelines 01/2022 on the right of access, Executive Summary",
    source_url: "https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf",
    verbatim_quote:
      "The right of access of data subjects is enshrined in Art. 8 of the EU Charter of Fundamental Rights.",
  },
  {
    pin_id: "wp260_storage_period",
    topic_id: "retention",
    corpus_row_id: "b3b78d41-c3ef-4e58-b432-7446dfce8271",
    guideline_ref: "WP260 rev.01",
    citation: "Art. 29 WP WP260 rev.01 on transparency (EDPB-endorsed), storage period",
    source_url: "https://www.edpb.europa.eu/system/files/2023-09/wp260rev01_en.pdf",
    verbatim_quote:
      "The storage period (or criteria to determine it) may be dictated by factors such as statutory requirements or industry guidelines but should be phrased in a way that allows the data subject to assess, on the basis of his or her own situation, what the retention period will be for specific data/ purposes.",
  },
];

export function pinsForTopic(topic: EuTopicId): readonly EuGuidancePin[] {
  return EU_GUIDANCE_PINS.filter((p) => p.topic_id === topic);
}
