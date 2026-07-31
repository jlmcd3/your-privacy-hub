/**
 * ITEM 317 — biometric duty registry (verbatim, corpus-anchored).
 *
 * REUSE LAW: every `verbatim_quote` below was extracted BY SCRIPT as an exact
 * substring of an APPROVED `public.provision_texts` row ingested in Item 314.
 * Nothing here is typed by hand and nothing here is a paraphrase. The pin tests
 * in src/registry/__tests__/biometric-duty-registry.test.ts re-assert the
 * substring relation against a snapshot of those rows.
 *
 * ONE ROW PER DUTY. BIPA § 15(a)-(e), CUBI § 503.001(b)/(b-1)/(c)(1)-(3)/(c-1)/
 * (c-2)/(e)/(f) and RCW 19.375.020(1)-(7) are separate rows exactly as Item 314
 * pinned them; they are never lumped into a per-statute blob.
 *
 * NOT IN THIS REGISTRY, DELIBERATELY:
 *   - 740 ILCS 14/20 (BIPA private right of action) — NOT INGESTED. Item 314
 *     flagged it as a follow-on. See `BIPA_PRA_CORPUS_STATUS`; the deliverables
 *     builder degrades to `record_insufficient` on any PRA specifics rather
 *     than quoting text no corpus row supports.
 *   - RCW 19.373 (My Health My Data Act) — its corpus row is `status='pending'`
 *     by CEO-gated design. Item 314 adjudicated RCW 19.375 as the biometric-
 *     identifiers chapter. Nothing here reads, cites, or activates 19.373.
 */

export type BiometricStatuteKey = "us_il_bipa" | "us_tx_cubi" | "us_wa_19375";

export type BiometricDutyKind =
  | "definition"
  | "actor_scope"
  | "duty"
  | "qualifier"
  | "exclusion"
  | "enforcement";

export interface BiometricDutyRow {
  /** Stable id, `<statute>.<duty>`. */
  id: string;
  statute_key: BiometricStatuteKey;
  statute_long: string;
  statute_short: string;
  jurisdiction: string;
  /** Corpus row citation, as ingested. */
  citation: string;
  /** Pinpoint used in user-facing output. */
  pinpoint: string;
  kind: BiometricDutyKind;
  label: string;
  /** Exact substring of the corpus row named by `corpus_key`. */
  verbatim_quote: string;
  corpus_key: string;
  source_url: string;
}

export const BIOMETRIC_DUTY_VERSION = "biometric-duty-registry-item317-2026-07-31";

/**
 * RESERVED-FRAMING LAW (Item 314). The BIPA private right of action is real and
 * is the fleet's highest litigation-exposure surface, but its operative text is
 * not in the corpus. Consumers may say that BIPA carries a private right of
 * action at 740 ILCS 14/20 — a fact the statute's own structure and the
 * ingested § 5 findings support — and may say nothing about damages tiers,
 * mental-state standards, fee-shifting, or accrual. Those degrade.
 */
export const BIPA_PRA_CORPUS_STATUS = {
  citation: "740 ILCS 14/20",
  ingested: false,
  ingestion_status: "flagged as a follow-on by Item 314; not yet ingested",
  permitted_characterisation:
    "BIPA is enforced by private suit rather than solely by a regulator.",
  reserved:
    "Damages amounts, negligence/recklessness tiers, fee-shifting, per-scan accrual, and any amendment history are NOT available on this record and must degrade to record_insufficient.",
} as const;

export const BIOMETRIC_DUTY_ROWS: readonly BiometricDutyRow[] = [
  {
    id: "il_bipa.def_biometric_identifier",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/10 (Definitions)",
    pinpoint: "740 ILCS 14/10",
    kind: "definition",
    label: "\"Biometric identifier\" (BIPA)",
    verbatim_quote:
      "\"Biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry. Biometric identifiers do not include writing samples, written signatures, photographs, human biological samples used for valid scientific testing or screening, demographic data, tattoo descriptions, or physical descriptions such as height, weight, hair color, or eye color. Biometric identifiers do not include donated organs, tissues, or parts as defined in the Illinois Anatomical Gift Act or blood or serum stored on behalf of recipients or potential recipients of living or cadaveric transplants and obtained or stored by a federally designated organ procurement agency. Biometric identifiers do not include biological materials regulated under the Genetic Information Privacy Act. Biometric identifiers do not include information captured from a patient in a health care setting or information collected, used, or stored for health care treatment, payment, or operations under the federal Health Insurance Portability and Accountability Act of 1996. Biometric identifiers do not include an X-ray, roentgen process, computed tomography, MRI, PET scan, mammography, or other image or film of the human anatomy used to diagnose, prognose, or treat an illness or other medical condition or to further validate scientific testing or screening.",
    corpus_key: "il-bipa-740-14-10",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.def_biometric_information",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/10 (Definitions)",
    pinpoint: "740 ILCS 14/10",
    kind: "definition",
    label: "\"Biometric information\" (BIPA)",
    verbatim_quote:
      "\"Biometric information\" means any information, regardless of how it is captured, converted, stored, or shared, based on an individual's biometric identifier used to identify an individual. Biometric information does not include information derived from items or procedures excluded under the definition of biometric identifiers.",
    corpus_key: "il-bipa-740-14-10",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.def_private_entity",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/10 (Definitions)",
    pinpoint: "740 ILCS 14/10",
    kind: "actor_scope",
    label: "\"Private entity\" (BIPA)",
    verbatim_quote:
      "\"Private entity\" means any individual, partnership, corporation, limited liability company, association, or other group, however organized. A private entity does not include a State or local government agency. A private entity does not include any court of Illinois, a clerk of the court, or a judge or justice thereof.",
    corpus_key: "il-bipa-740-14-10",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.def_written_release",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/10 (Definitions)",
    pinpoint: "740 ILCS 14/10",
    kind: "definition",
    label: "\"Written release\" (BIPA)",
    verbatim_quote:
      "\"Written release\" means informed written consent, electronic signature, or, in the context of employment, a release executed by an employee as a condition of employment.",
    corpus_key: "il-bipa-740-14-10",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.def_confidential_sensitive",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/10 (Definitions)",
    pinpoint: "740 ILCS 14/10",
    kind: "definition",
    label: "\"Confidential and sensitive information\" (BIPA)",
    verbatim_quote:
      "\"Confidential and sensitive information\" means personal information that can be used to uniquely identify an individual or an individual's account or property. Examples of confidential and sensitive information include, but are not limited to, a genetic marker, genetic testing information, a unique identifier number to locate an account or property, an account number, a PIN number, a pass code, a driver's license number, or a social security number.",
    corpus_key: "il-bipa-740-14-10",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15a_written_policy",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(a) (Retention schedule; destruction guidelines)",
    pinpoint: "740 ILCS 14/15(a)",
    kind: "duty",
    label: "Public written retention-and-destruction policy",
    verbatim_quote:
      "(a) A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information when the initial purpose for collecting or obtaining such identifiers or information has been satisfied or within 3 years of the individual's last interaction with the private entity, whichever occurs first.",
    corpus_key: "il-bipa-740-14-15-a",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15a_comply_with_schedule",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(a) (Retention schedule; destruction guidelines)",
    pinpoint: "740 ILCS 14/15(a)",
    kind: "duty",
    label: "Compliance with the established retention schedule",
    verbatim_quote:
      "Absent a valid warrant or subpoena issued by a court of competent jurisdiction, a private entity in possession of biometric identifiers or biometric information must comply with its established retention schedule and destruction guidelines.",
    corpus_key: "il-bipa-740-14-15-a",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15b_notice_and_written_release",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(b) (Notice and written release before collection)",
    pinpoint: "740 ILCS 14/15(b)",
    kind: "duty",
    label: "Written notice and written release before collection",
    verbatim_quote:
      "(b) No private entity may collect, capture, purchase, receive through trade, or otherwise obtain a person's or a customer's biometric identifier or biometric information, unless it first:\n(1) informs the subject or the subject's legally authorized representative in writing that a biometric identifier or biometric information is being collected or stored;\n(2) informs the subject or the subject's legally authorized representative in writing of the specific purpose and length of term for which a biometric identifier or biometric information is being collected, stored, and used; and\n(3) receives a written release executed by the subject of the biometric identifier or biometric information or the subject's legally authorized representative.",
    corpus_key: "il-bipa-740-14-15-b",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15c_no_profit",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(c) (No profit from biometric data)",
    pinpoint: "740 ILCS 14/15(c)",
    kind: "duty",
    label: "No sale, lease, trade, or other profit",
    verbatim_quote:
      "(c) No private entity in possession of a biometric identifier or biometric information may sell, lease, trade, or otherwise profit from a person's or a customer's biometric identifier or biometric information.",
    corpus_key: "il-bipa-740-14-15-c",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15d_disclosure_limits",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(d) (Disclosure limits)",
    pinpoint: "740 ILCS 14/15(d)",
    kind: "duty",
    label: "Disclosure and redisclosure limits",
    verbatim_quote:
      "(d) No private entity in possession of a biometric identifier or biometric information may disclose, redisclose, or otherwise disseminate a person's or a customer's biometric identifier or biometric information unless:\n(1) the subject of the biometric identifier or biometric information or the subject's legally authorized representative consents to the disclosure or redisclosure;\n(2) the disclosure or redisclosure completes a financial transaction requested or authorized by the subject of the biometric identifier or the biometric information or the subject's legally authorized representative;\n(3) the disclosure or redisclosure is required by State or federal law or municipal ordinance; or\n(4) the disclosure is required pursuant to a valid warrant or subpoena issued by a court of competent jurisdiction.",
    corpus_key: "il-bipa-740-14-15-d",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "il_bipa.15e_reasonable_care",
    statute_key: "us_il_bipa",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    jurisdiction: "US-IL",
    citation: "740 ILCS 14/15(e) (Reasonable standard of care; storage and transmission)",
    pinpoint: "740 ILCS 14/15(e)",
    kind: "duty",
    label: "Reasonable standard of care in storage and transmission",
    verbatim_quote:
      "(e) A private entity in possession of a biometric identifier or biometric information shall:\n(1) store, transmit, and protect from disclosure all biometric identifiers and biometric information using the reasonable standard of care within the private entity's industry; and\n(2) store, transmit, and protect from disclosure all biometric identifiers and biometric information in a manner that is the same as or more protective than the manner in which the private entity stores, transmits, and protects other confidential and sensitive information.",
    corpus_key: "il-bipa-740-14-15-e",
    source_url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
  },
  {
    id: "tx_cubi.def_biometric_identifier",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(a) (Definitions)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(a)(2)",
    kind: "definition",
    label: "\"Biometric identifier\" (CUBI)",
    verbatim_quote:
      "(2) \"Biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry.",
    corpus_key: "tx-cubi-503-001-a",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.b_notice_and_consent",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(b), (b-1) (Notice and consent before capture)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(b)",
    kind: "duty",
    label: "Notice and consent before capture for a commercial purpose",
    verbatim_quote:
      "(b) A person may not capture a biometric identifier of an individual for a commercial purpose unless the person:\n(1) informs the individual before capturing the biometric identifier; and\n(2) receives the individual's consent to capture the biometric identifier.",
    corpus_key: "tx-cubi-503-001-b",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.b1_public_media_qualifier",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(b), (b-1) (Notice and consent before capture)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(b-1)",
    kind: "qualifier",
    label: "Publicly available media does not supply notice or consent",
    verbatim_quote:
      "(b-1) For purposes of Subsection (b), an individual has not been informed of and has not provided consent for the capture or storage of a biometric identifier of an individual for a commercial purpose based solely on the existence of an image or other media containing one or more biometric identifiers of the individual on the Internet or other publicly available source unless the image or other media was made publicly available by the individual to whom the biometric identifiers relate.",
    corpus_key: "tx-cubi-503-001-b",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.c1_disclosure_limits",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(c), (c-1), (c-2) (Disclosure limits; reasonable care; destruction)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(1)",
    kind: "duty",
    label: "No sale, lease, or other disclosure except as listed",
    verbatim_quote:
      "(c) A person who possesses a biometric identifier of an individual that is captured for a commercial purpose:\n(1) may not sell, lease, or otherwise disclose the biometric identifier to another person unless:\n(A) the individual consents to the disclosure for identification purposes in the event of the individual's disappearance or death;\n(B) the disclosure completes a financial transaction that the individual requested or authorized;\n(C) the disclosure is required or permitted by a federal statute or by a state statute other than Chapter 552, Government Code; or\n(D) the disclosure is made by or to a law enforcement agency for a law enforcement purpose in response to a warrant;",
    corpus_key: "tx-cubi-503-001-c",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.c2_reasonable_care",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(c), (c-1), (c-2) (Disclosure limits; reasonable care; destruction)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(2)",
    kind: "duty",
    label: "Reasonable care in storage and transmission",
    verbatim_quote:
      "(2) shall store, transmit, and protect from disclosure the biometric identifier using reasonable care and in a manner that is the same as or more protective than the manner in which the person stores, transmits, and protects any other confidential information the person possesses; and",
    corpus_key: "tx-cubi-503-001-c",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.c3_one_year_destruction",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(c), (c-1), (c-2) (Disclosure limits; reasonable care; destruction)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(3)",
    kind: "duty",
    label: "Destruction within one year of expiry of the collection purpose",
    verbatim_quote:
      "(3) shall destroy the biometric identifier within a reasonable time, but not later than the first anniversary of the date the purpose for collecting the identifier expires, except as provided by Subsection (c-1).",
    corpus_key: "tx-cubi-503-001-c",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.c1_qualifier_other_law",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(c), (c-1), (c-2) (Disclosure limits; reasonable care; destruction)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c-1)",
    kind: "qualifier",
    label: "Extended clock where another law requires longer retention",
    verbatim_quote:
      "(c-1) If a biometric identifier of an individual captured for a commercial purpose is used in connection with an instrument or document that is required by another law to be maintained for a period longer than the period prescribed by Subsection (c)(3), the person who possesses the biometric identifier shall destroy the biometric identifier within a reasonable time, but not later than the first anniversary of the date the instrument or document is no longer required to be maintained by law.",
    corpus_key: "tx-cubi-503-001-c",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.c2_qualifier_employer",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(c), (c-1), (c-2) (Disclosure limits; reasonable care; destruction)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c-2)",
    kind: "qualifier",
    label: "Employer security collection: purpose presumed to expire on termination",
    verbatim_quote:
      "(c-2) If a biometric identifier captured for a commercial purpose has been collected for security purposes by an employer, the purpose for collecting the identifier under Subsection (c)(3) is presumed to expire on termination of the employment relationship.",
    corpus_key: "tx-cubi-503-001-c",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.e_exceptions",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(e) (Exceptions)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(e)",
    kind: "exclusion",
    label: "Section-level exceptions",
    verbatim_quote:
      "(e) This section does not apply to:\n(1) voiceprint data retained by a financial institution or an affiliate of a financial institution, as those terms are defined by 15 U.S.C. Section 6809;\n(2) the training, processing, or storage of biometric identifiers involved in developing, training, evaluating, disseminating, or otherwise offering artificial intelligence models or systems, unless a system is used or deployed for the purpose of uniquely identifying a specific individual; or\n(3) the development or deployment of an artificial intelligence model or system for the purposes of:\n(A) preventing, detecting, protecting against, or responding to security incidents, identity theft, fraud, harassment, malicious or deceptive activities, or any other illegal activity;\n(B) preserving the integrity or security of a system; or\n(C) investigating, reporting, or prosecuting a person responsible for a security incident, identity theft, fraud, harassment, a malicious or deceptive activity, or any other illegal activity.",
    corpus_key: "tx-cubi-503-001-e",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.f_subsequent_commercial_use",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(f) (Subsequent commercial use of AI-training biometrics)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(f)",
    kind: "qualifier",
    label: "Subsequent commercial use of AI-training biometrics",
    verbatim_quote:
      "(f) If a biometric identifier captured for the purpose of training an artificial intelligence system is subsequently used for a commercial purpose not described by Subsection (e), the person possessing the biometric identifier is subject to:\n(1) this section's provisions for the possession and destruction of a biometric identifier; and\n(2) the penalties associated with a violation of this section.",
    corpus_key: "tx-cubi-503-001-f",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "tx_cubi.d_enforcement",
    statute_key: "us_tx_cubi",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 503.001(d) (Civil penalty; enforcement)",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(d)",
    kind: "enforcement",
    label: "Civil penalty; attorney general enforcement",
    verbatim_quote:
      "(d) A person who violates this section is subject to a civil penalty of not more than $25,000 for each violation. The attorney general may bring an action to recover the civil penalty.",
    corpus_key: "tx-cubi-503-001-d",
    source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
  },
  {
    id: "wa_19375.def_biometric_identifier",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.010 (Definitions)",
    pinpoint: "RCW 19.375.010(1)",
    kind: "definition",
    label: "\"Biometric identifier\" (RCW 19.375)",
    verbatim_quote:
      "(1) \"Biometric identifier\" means data generated by automatic measurements of an individual's biological characteristics, such as a fingerprint, voiceprint, eye retinas, irises, or other unique biological patterns or characteristics that is used to identify a specific individual. \"Biometric identifier\" does not include a physical or digital photograph, video or audio recording or data generated therefrom, or information collected, used, or stored for health care treatment, payment, or operations under the federal health insurance portability and accountability act of 1996.",
    corpus_key: "wa-rcw-19-375-010",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.def_commercial_purpose",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.010 (Definitions)",
    pinpoint: "RCW 19.375.010(4)",
    kind: "definition",
    label: "\"Commercial purpose\" (RCW 19.375)",
    verbatim_quote:
      "(4) \"Commercial purpose\" means a purpose in furtherance of the sale or disclosure to a third party of a biometric identifier for the purpose of marketing of goods or services when such goods or services are unrelated to the initial transaction in which a person first gains possession of an individual's biometric identifier. \"Commercial purpose\" does not include a security or law enforcement purpose.",
    corpus_key: "wa-rcw-19-375-010",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.def_enroll",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.010 (Definitions)",
    pinpoint: "RCW 19.375.010(5)",
    kind: "definition",
    label: "\"Enroll\" (RCW 19.375)",
    verbatim_quote:
      "(5) \"Enroll\" means to capture a biometric identifier of an individual, convert it into a reference template that cannot be reconstructed into the original output image, and store it in a database that matches the biometric identifier to a specific individual.",
    corpus_key: "wa-rcw-19-375-010",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.def_person",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.010 (Definitions)",
    pinpoint: "RCW 19.375.010(7)",
    kind: "actor_scope",
    label: "\"Person\" (RCW 19.375)",
    verbatim_quote:
      "(7) \"Person\" means an individual, partnership, corporation, limited liability company, organization, association, or any other legal or commercial entity, but does not include a government agency.",
    corpus_key: "wa-rcw-19-375-010",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.def_security_purpose",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.010 (Definitions)",
    pinpoint: "RCW 19.375.010(8)",
    kind: "definition",
    label: "\"Security purpose\" (RCW 19.375)",
    verbatim_quote:
      "(8) \"Security purpose\" means the purpose of preventing shoplifting, fraud, or any other misappropriation or theft of a thing of value, including tangible and intangible goods, services, and other purposes in furtherance of protecting the security or integrity of software, accounts, applications, online services, or any person.",
    corpus_key: "wa-rcw-19-375-010",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_1_enrollment_notice_consent",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(1)",
    kind: "duty",
    label: "Notice, consent, or opt-out mechanism before commercial enrollment",
    verbatim_quote:
      "(1) A person may not enroll a biometric identifier in a database for a commercial purpose, without first providing notice, obtaining consent, or providing a mechanism to prevent the subsequent use of a biometric identifier for a commercial purpose.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_2_notice_standard",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(2)",
    kind: "qualifier",
    label: "What counts as notice; context-dependence",
    verbatim_quote:
      "(2) Notice is a disclosure, that is not considered affirmative consent, that is given through a procedure reasonably designed to be readily available to affected individuals. The exact notice and type of consent required to achieve compliance with subsection (1) of this section is context-dependent.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_3_disclosure_limits",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(3)",
    kind: "duty",
    label: "Disclosure limits absent consent",
    verbatim_quote:
      "(3) Unless consent has been obtained from the individual, a person who has enrolled an individual's biometric identifier may not sell, lease, or otherwise disclose the biometric identifier to another person for a commercial purpose unless the disclosure:\n(a) Is consistent with subsections (1), (2), and (4) of this section;\n(b) Is necessary to provide a product or service subscribed to, requested, or expressly authorized by the individual;\n(c) Is necessary to effect, administer, enforce, or complete a financial transaction that the individual requested, initiated, or authorized, and the third party to whom the biometric identifier is disclosed maintains confidentiality of the biometric identifier and does not further disclose the biometric identifier except as otherwise permitted under this subsection (3);\n(d) Is required or expressly authorized by a federal or state statute, or court order;\n(e) Is made to a third party who contractually promises that the biometric identifier will not be further disclosed and will not be enrolled in a database for a commercial purpose inconsistent with the notice and consent described in this subsection (3) and subsections (1) and (2) of this section; or\n(f) Is made to prepare for litigation or to respond to or participate in judicial process.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_4_care_and_retention",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(4)",
    kind: "duty",
    label: "Reasonable care and retention limit",
    verbatim_quote:
      "(4) A person who knowingly possesses a biometric identifier of an individual that has been enrolled for a commercial purpose:\n(a) Must take reasonable care to guard against unauthorized access to and acquisition of biometric identifiers that are in the possession or under the control of the person; and\n(b) May retain the biometric identifier no longer than is reasonably necessary to:\n(i) Comply with a court order, statute, or public records retention schedule specified under federal, state, or local law;\n(ii) Protect against or prevent actual or potential fraud, criminal activity, claims, security threats, or liability; and\n(iii) Provide the services for which the biometric identifier was enrolled.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_5_material_inconsistency",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(5)",
    kind: "duty",
    label: "No materially inconsistent use or disclosure without new consent",
    verbatim_quote:
      "(5) A person who enrolls a biometric identifier of an individual for a commercial purpose or obtains a biometric identifier of an individual from a third party for a commercial purpose pursuant to this section may not use or disclose it in a manner that is materially inconsistent with the terms under which the biometric identifier was originally provided without obtaining consent for the new terms of use or disclosure.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_6_unenrolled",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(6)",
    kind: "qualifier",
    label: "Unenrolled identifiers outside the disclosure and retention limits",
    verbatim_quote:
      "(6) The limitations on disclosure and retention of biometric identifiers provided in this section do not apply to disclosure or retention of biometric identifiers that have been unenrolled.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.020_7_security_purpose_carveout",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.020 (Enrollment, disclosure, and retention of biometric identifiers)",
    pinpoint: "RCW 19.375.020(7)",
    kind: "exclusion",
    label: "Security-purpose carve-out from notice and consent",
    verbatim_quote:
      "(7) Nothing in this section requires an entity to provide notice and obtain consent to collect, capture, or enroll a biometric identifier and store it in a biometric system, or otherwise, in furtherance of a security purpose.",
    corpus_key: "wa-rcw-19-375-020",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.040_exclusions",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.040 (Exclusions)",
    pinpoint: "RCW 19.375.040",
    kind: "exclusion",
    label: "Chapter-level exclusions (GLBA, HIPAA, law enforcement)",
    verbatim_quote:
      "(1) Nothing in this chapter applies in any manner to a financial institution or an affiliate of a financial institution that is subject to Title V of the federal Gramm-Leach-Bliley act of 1999 and the rules promulgated thereunder.\n(2) Nothing in this chapter applies to activities subject to Title V of the federal health insurance privacy and portability act of 1996 and the rules promulgated thereunder.\n(3) Nothing in this chapter expands or limits the authority of a law enforcement officer acting within the scope of his or her authority including, but not limited to, the authority of a state law enforcement officer in executing lawful searches and seizures.",
    corpus_key: "wa-rcw-19-375-040",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
  {
    id: "wa_19375.030_enforcement",
    statute_key: "us_wa_19375",
    statute_long: "Washington biometric identifiers chapter",
    statute_short: "RCW 19.375",
    jurisdiction: "US-WA",
    citation: "RCW 19.375.030 (Application of consumer protection act)",
    pinpoint: "RCW 19.375.030",
    kind: "enforcement",
    label: "Consumer protection act; attorney general sole enforcement",
    verbatim_quote:
      "(1) The legislature finds that the practices covered by this chapter are matters vitally affecting the public interest for the purpose of applying the consumer protection act, chapter 19.86 RCW. A violation of this chapter is not reasonable in relation to the development and preservation of business and is an unfair or deceptive act in trade or commerce and an unfair method of competition for the purpose of applying the consumer protection act, chapter 19.86 RCW.\n(2) This chapter may be enforced solely by the attorney general under the consumer protection act, chapter 19.86 RCW.",
    corpus_key: "wa-rcw-19-375-030",
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
  },
];

const BY_ID = new Map(BIOMETRIC_DUTY_ROWS.map((r) => [r.id, r]));

/** Look up a duty row. Throws on an unknown id so a typo cannot ship a silent omission. */
export function dutyRow(id: string): BiometricDutyRow {
  const row = BY_ID.get(id);
  if (!row) {
    throw new Error(`[biometric-duty-registry] unknown duty row id: ${id}`);
  }
  return row;
}

/** All rows for one statute, optionally filtered by kind. */
export function dutiesFor(
  statute: BiometricStatuteKey,
  kind?: BiometricDutyKind,
): BiometricDutyRow[] {
  return BIOMETRIC_DUTY_ROWS.filter(
    (r) => r.statute_key === statute && (kind ? r.kind === kind : true),
  );
}
