// DOC 164 (2026-09-04) — UK Data Protection Act 2018 sliver + WP243 rev.01
// (DPO Guidelines) verified authorities for the Governance product.
//
// REUSE LAW / AUTHORING RULE: every verbatim_quote below is an exact
// substring of an APPROVED corpus row (public.provision_texts for the DPA
// 2018 rows; public.edpb_guidelines for the WP243 rows), extracted BY SCRIPT
// via SQL `substring()`/`position()` against the live tables — never typed
// by hand — and independently confirmed with a second `position()` check
// before this file was written. Both source batches were ingested
// 2026-09-04 (ICO Ingestion Program Phase I2, and a targeted WP243 batch)
// after the corpus-correction discussed in the Governance Applicable Law
// Outline document.
//
// SCOPE DISCIPLINE: this file registers only the specific paragraphs the
// Governance product actually cites in generated prose (build.ts). The
// other 37 DPA 2018 Schedule 1 paragraphs, and the rest of WP243 rev.01, are
// ingested and available in the corpus but are NOT anchored here — the
// product does not ask the company which Schedule 1 condition it relies on,
// so citing conditions it cannot determine would be exactly the kind of
// unearned specificity this fleet's registries are built to avoid.

import type {
  VerifiedAuthorityRegistry,
  VerifiedAuthorityRow,
} from "../../../_shared/verified-authority-resolver.ts";

export const GOVERNANCE_DPA2018_WP243_VERSION =
  "governance-dpa2018-wp243-doc164-2026-09-04";

const DPA_2018 = "Data Protection Act 2018";
const DPA_2018_URL = "https://www.legislation.gov.uk/ukpga/2018/12/contents";
const WP243 =
  "Article 29 Working Party Guidelines on Data Protection Officers ('DPOs'), WP243 rev.01 (endorsed by the EDPB)";
const WP243_URL =
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/data-protection-officer_en";
const VOD = "2026-09-04";

const R = (r: VerifiedAuthorityRow): VerifiedAuthorityRow => r;

export const GOVERNANCE_DPA2018_WP243_AUTHORITIES: VerifiedAuthorityRegistry = {
  // ── DPA 2018, s.119A — Commissioner's standard clauses for transfers ─────
  dpa2018_s119a_power: R({
    proposition_key: "dpa2018_s119a_power",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, s. 119A(1)",
    verbatim_quote:
      "The Commissioner may issue a document specifying standard data protection clauses which the Commissioner considers are capable of securing that the data protection test set out in Article 46 of the UK GDPR or section 75 of this Act (or both) is met in relation to transfers of personal data.",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),
  dpa2018_s119a_consultation: R({
    proposition_key: "dpa2018_s119a_consultation",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, s. 119A(4)",
    verbatim_quote:
      "Before issuing a document under this section, the Commissioner must consult the Secretary of State and such of the following as the Commissioner considers appropriate",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),

  // ── DPA 2018, Sch. 1 — the appropriate-policy-document mechanics ─────────
  // The four Parts (1 employment/health/research; 2 substantial public
  // interest; 3 additional criminal-convictions conditions; 4 appropriate
  // policy document and safeguards) are named in generated prose but the
  // 37 individual conditions in Parts 1-3 are not anchored (see SCOPE
  // DISCIPLINE above) — only Part 4's cross-cutting mechanics, which apply
  // regardless of which Part 1-3 condition the company relies on.
  dpa2018_sch1_para5: R({
    proposition_key: "dpa2018_sch1_para5",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, Sch. 1, para. 5(1)",
    verbatim_quote:
      "Except as otherwise provided, a condition in this Part of this Schedule is met only if, when the processing is carried out, the controller has an appropriate policy document in place (see paragraph 39 in Part 4 of this Schedule).",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),
  dpa2018_sch1_para39: R({
    proposition_key: "dpa2018_sch1_para39",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, Sch. 1, para. 39",
    verbatim_quote:
      "the controller has produced a document which—\n(a) explains the controller's procedures for securing compliance with the principles in Article 5 of the UK GDPR (principles relating to processing of personal data) in connection with the processing of personal data in reliance on the condition in question, and\n(b) explains the controller's policies as regards the retention and erasure of personal data processed in reliance on the condition, giving an indication of how long such personal data is likely to be retained.",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),
  dpa2018_sch1_para40: R({
    proposition_key: "dpa2018_sch1_para40",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, Sch. 1, para. 40(1)",
    verbatim_quote:
      "the controller must during the relevant period—\n(a) retain the appropriate policy document,\n(b) review and (if appropriate) update it from time to time, and\n(c) make it available to the Commissioner, on request, without charge.",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),
  dpa2018_sch1_para41: R({
    proposition_key: "dpa2018_sch1_para41",
    citation: DPA_2018,
    subsection: "Data Protection Act 2018, Sch. 1, para. 41",
    verbatim_quote:
      "A record maintained by the controller, or the controller's representative, under Article 30 of the UK GDPR in respect of the processing of personal data in reliance on a condition described in paragraph 38 must include the following information—\n(a) which condition is relied on,\n(b) how the processing satisfies Article 6 of the UK GDPR (lawfulness of processing), and\n(c) whether the personal data is retained and erased in accordance with the policies described in paragraph 39(b) and, if it is not, the reasons for not following those policies.",
    depth_class: "sub_subsection",
    governing_anchor: DPA_2018,
    verified_on: VOD,
    primary_source_url: DPA_2018_URL,
  }),

  // ── WP243 rev.01 — 'large scale' and 'core activities' ───────────────────
  wp243_large_scale_factors: R({
    proposition_key: "wp243_large_scale_factors",
    citation: WP243,
    subsection: "WP243 rev.01, §2.1.3 ('Large scale')",
    verbatim_quote:
      "The GDPR does not define what constitutes large-scale processing. The WP29 recommends that the\nfollowing factors, in particular, be considered when determining whether the processing is carried out\non a large scale:\n the number of data subjects concerned - either as a specific number or as a proportion of the\nrelevant population\n the volume of data and/or the range of different data items being processed\n the duration, or permanence, of the data processing activity\n the geographical extent of the processing activity",
    depth_class: "subsection",
    governing_anchor: WP243,
    verified_on: VOD,
    primary_source_url: WP243_URL,
  }),
  wp243_core_activities: R({
    proposition_key: "wp243_core_activities",
    citation: WP243,
    subsection: "WP243 rev.01, §2.1.2 ('Core activities')",
    verbatim_quote:
      "Article 37(1)(b) and (c) of the GDPR refers to the ‘core activities of the controller or processor’. Recital 97 specifies that the core activities of a controller relate to ‘primary activities and do not relate\nto the processing of personal data as ancillary activities’. ‘Core activities’ can be considered as the\nkey operations necessary to achieve the controller’s or processor’s goals.",
    depth_class: "subsection",
    governing_anchor: WP243,
    verified_on: VOD,
    primary_source_url: WP243_URL,
  }),
};
