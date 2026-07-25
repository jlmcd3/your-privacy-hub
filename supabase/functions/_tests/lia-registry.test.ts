// LIA-REGISTRY-AUTHORING (2026-07-25) — deterministic pin-tests.
//
// Every row in `LIA_VERIFIED_AUTHORITIES` must have a `verbatim_quote` that is
// a byte-exact substring of the corresponding APPROVED corpus source excerpt.
// The source snapshots below are pasted verbatim from
// `public.provision_texts.verbatim_excerpt` (status='approved', jurisdiction='EU')
// and `public.edpb_guidelines.excerpt_text` (guideline_ref='EDPB Guidelines
// 2/2019', status='final'). No paraphrase, no re-flow, no whitespace edits.
//
// If any assert fails, DO NOT rewrite the quote — either (a) fix the corpus row
// (approved-only), or (b) move the proposition_key onto
// `LIA_UNANCHORED_PROPOSITIONS`.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_VERIFIED_AUTHORITY_VERSION,
  KNOWN_PARAPHRASED_KEYS,
} from "../_shared/registry/lia-verified-authorities.ts";

// ── Corpus snapshots (verbatim from approved rows read 2026-07-25T12:37Z) ────

const GDPR_ART_6_1_F =
  "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.\n\nPoint (f) of the first subparagraph shall not apply to processing carried out by public authorities in the performance of their tasks.";

const GDPR_ART_5_1_A =
  "processed lawfully, fairly and in a transparent manner in relation to the data subject ('lawfulness, fairness and transparency');";

const GDPR_ART_5_1_B =
  "collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes; further processing for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes shall, in accordance with Article 89(1), not be considered to be incompatible with the initial purposes ('purpose limitation');";

const GDPR_ART_5_1_C =
  "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation');";

const GDPR_ART_9_1 =
  "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.";

// From gdpr-art-13 (full excerpt held in provision_texts). We only pin the
// specific subparagraphs used as verbatim_quote strings.
const GDPR_ART_13_1_D =
  "where the processing is based on point (f) of Article 6(1), the legitimate interests pursued by the controller or by a third party;";
const GDPR_ART_13_2_B =
  "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject or to object to processing as well as the right to data portability;";

// From gdpr-art-14. Note Art 14(2)(c) uses "and to object" (vs Art 13(2)(b)
// "or to object"). Both are held verbatim in the corpus row.
const GDPR_ART_14_2_B = GDPR_ART_13_1_D; // identical text at Art 14(2)(b)
const GDPR_ART_14_2_C =
  "the existence of the right to request from the controller access to and rectification or erasure of personal data or restriction of processing concerning the data subject and to object to processing as well as the right to data portability;";

const GDPR_ART_22_1 =
  "The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her.";

const GDPR_ART_25_1 =
  "Taking into account the state of the art, the cost of implementation and the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for rights and freedoms of natural persons posed by the processing, the controller shall, both at the time of the determination of the means for processing and at the time of the processing itself, implement appropriate technical and organisational measures, such as pseudonymisation, which are designed to implement data-protection principles, such as data minimisation, in an effective manner and to integrate the necessary safeguards into the processing in order to meet the requirements of this Regulation and protect the rights of data subjects.";

const GDPR_ART_30_1 =
  "Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility.";

const GDPR_ART_35_1 =
  "Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data. A single assessment may address a set of similar processing operations that present similar high risks.";

// EDPB Guidelines 2/2019, § 2.4 (Necessity) — carried through DPIA-va-w1 tests.
const EDPB_2_2019_S_2_4_A =
  "If there are realistic, less intrusive alternatives, the processing is not \u2018necessary\u2019.";
const EDPB_2_2019_S_2_4_B =
  "Article 6(1)(b) will not cover processing which is useful but not objectively necessary for performing the contractual service or for taking relevant pre-contractual steps at the request of the data subject, even if it is necessary for the controller\u2019s other business purposes.";

// Row → source-excerpt map. If a row is added to the registry, add its entry
// here or the tests will fail (unmapped row).
const SOURCE_FOR: Record<string, string> = {
  li_lawful_basis_legitimate_interests: GDPR_ART_6_1_F,
  li_public_authorities_exclusion: GDPR_ART_6_1_F,
  principle_lawfulness_fairness_transparency: GDPR_ART_5_1_A,
  principle_purpose_limitation: GDPR_ART_5_1_B,
  principle_data_minimisation: GDPR_ART_5_1_C,
  special_categories_prohibition: GDPR_ART_9_1,
  art_13_legitimate_interests_disclosure: GDPR_ART_13_1_D,
  art_13_object_right_information: GDPR_ART_13_2_B,
  art_14_legitimate_interests_disclosure: GDPR_ART_14_2_B,
  art_14_object_right_information: GDPR_ART_14_2_C,
  art_22_admt_right: GDPR_ART_22_1,
  data_protection_by_design: GDPR_ART_25_1,
  ropa_controller_record: GDPR_ART_30_1,
  dpia_when_required: GDPR_ART_35_1,
  necessity_less_intrusive_alternatives: EDPB_2_2019_S_2_4_A,
  necessity_useful_not_necessary: EDPB_2_2019_S_2_4_B,
};

Deno.test("lia-registry: version tag is w1", () => {
  assert(LIA_VERIFIED_AUTHORITY_VERSION === "lia-va-w1-2026-07-25");
});

Deno.test("lia-registry: no paraphrase on entry", () => {
  assert(KNOWN_PARAPHRASED_KEYS.length === 0);
});

Deno.test("lia-registry: every row is byte-exact substring of its approved corpus source", () => {
  const rows = Object.values(LIA_VERIFIED_AUTHORITIES);
  assert(rows.length > 0, "registry must have at least one row");
  const failures: string[] = [];
  for (const row of rows) {
    const src = SOURCE_FOR[row.proposition_key];
    if (!src) {
      failures.push(`UNMAPPED: ${row.proposition_key} has no SOURCE_FOR entry`);
      continue;
    }
    if (!src.includes(row.verbatim_quote)) {
      failures.push(`NO PIN: ${row.proposition_key} — verbatim_quote is not a substring of its source excerpt`);
    }
  }
  if (failures.length) console.error(failures.join("\n"));
  assert(failures.length === 0, `${failures.length} pin-test failures`);
});

Deno.test("lia-registry: every row has non-empty required fields", () => {
  const rows = Object.values(LIA_VERIFIED_AUTHORITIES);
  for (const row of rows) {
    assert(row.proposition_key.length > 0, "proposition_key empty");
    assert(row.citation.length > 0, `citation empty on ${row.proposition_key}`);
    assert(row.subsection.length > 0, `subsection empty on ${row.proposition_key}`);
    assert(row.verbatim_quote.length > 0, `verbatim_quote empty on ${row.proposition_key}`);
    assert(row.governing_anchor.length > 0, `governing_anchor empty on ${row.proposition_key}`);
    assert(row.verified_on === "2026-07-25", `verified_on wrong on ${row.proposition_key}`);
  }
});

Deno.test("lia-registry: registry keys match proposition_key on each row", () => {
  for (const [k, row] of Object.entries(LIA_VERIFIED_AUTHORITIES)) {
    assert(k === row.proposition_key, `key/proposition_key mismatch: ${k} vs ${row.proposition_key}`);
  }
});
