// BIO-REG-W1 (2026-07-24T00:15:00Z) — Biometric Statute Registry, Wave 1.
//
// Per the CEO-approved "Registry-Driven Composition" design (register #1):
// this file replaces LLM-recalled statutory text with typed, verified rows.
// The generator receives ONLY these rows plus the intake; every citation in
// the output MUST resolve to a `registry_id` here, and every quoted sentence
// MUST appear verbatim inside a supplied `verbatim_quote`. Non-resolving
// citations are stripped by the post-generation validator and logged as
// `biometric_citation_out_of_registry`.
//
// SELF-CONSISTENCY CONTRACT (enforced by the Wave-1 CI test in
// tests/registry/biometric-statute-self-consistency.test.ts): for EVERY row,
// the `pinpoint` literal MUST appear as a substring of its own
// `verbatim_quote`. This makes it structurally impossible to ship a pinpoint
// that the quote does not support.
//
// Wave 1 jurisdictions (the four highest-defect in POST-C1-MEASURE):
//   - us_il_bipa           (Illinois BIPA, 740 ILCS 14/-)
//   - us_tx_cubi           (Texas CUBI, Tex. Bus. & Com. Code § 503.001)
//   - us_wa_hb1493         (Washington biometric identifiers, RCW 19.375)
//   - us_co_hb24_1130      (Colorado HB24-1130 amendments to CPA, C.R.S. § 6-1-1303)
//
// Waves 2-3 (other named states, sector overlays) are gated on the Wave-1
// measurement batch per the CEO's evidence-gate.

export type BiometricStatuteRow = {
  /** Stable id; used as `registry_id` in prompt payload and validator. */
  id: string;
  /** Jurisdiction key for selection. */
  jurisdiction_id:
    | "us_il_bipa"
    | "us_tx_cubi"
    | "us_wa_hb1493"
    | "us_co_hb24_1130";
  /** Human-readable jurisdiction display label. */
  jurisdiction_display: string;
  /** Long form of the statute (e.g. "Illinois Biometric Information Privacy Act"). */
  statute_long: string;
  /** Short citation (e.g. "BIPA"). */
  statute_short: string;
  /** Verified pinpoint. MUST appear as a substring of verbatim_quote. */
  pinpoint: string;
  /** Verbatim quote of the operative statutory text (contains pinpoint literal). */
  verbatim_quote: string;
  /** Thematic tag for selection (consent, retention, security, damages, etc.). */
  topic:
    | "definition"
    | "consent_notice"
    | "retention"
    | "security"
    | "disclosure"
    | "pra_damages"
    | "enforcement"
    | "effective_date"
    | "exemption"
    | "sensitive_data_classification"
    | "sensitive_data_opt_in";
  /** Primary-source URL (government or court). */
  primary_source_url: string;
  /** ISO date the primary_source_url was verified by a human/script (YYYY-MM-DD). */
  verification_date: string;
  /**
   * Deterministic applicability predicates evaluated against the intake +
   * generation_date. All predicates must be TRUE for the row to be selected.
   * Predicates are strings interpreted by `selectApplicableRows` — no
   * arbitrary code execution.
   */
  applicability_predicates: string[];
  /**
   * Effective date (YYYY-MM-DD). If generation_date < effective_date the row
   * is NOT selected (unless `preEffectiveNote` also supplied — Wave 1 has none).
   */
  effective_date?: string;
  /**
   * If populated, this row SUPERSEDES the listed registry_id(s) from the
   * `supersedes_effective_date` forward. Used for CO HB24-1130 layering.
   */
  supersedes?: { registry_ids: string[]; supersedes_effective_date: string };
  /** Free-text note for grader/reviewer context; NOT rendered to end users. */
  note?: string;
};

/** Registry version stamp; threaded into the report envelope. */
export const BIOMETRIC_REGISTRY_VERSION = "bio-reg-w1-s1-2026-07-24";

// ─────────────────────────────────────────────────────────────────────────
// us_il_bipa — Illinois Biometric Information Privacy Act (740 ILCS 14/-)
// ─────────────────────────────────────────────────────────────────────────

const IL_BIPA_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_il_bipa.definition_biometric_identifier",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/10",
    verbatim_quote:
      "740 ILCS 14/10: \"Biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry. Biometric identifiers do not include writing samples, written signatures, photographs, human biological samples used for valid scientific testing or screening, demographic data, tattoo descriptions, or physical descriptions such as height, weight, hair color, or eye color.",
    topic: "definition",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: [
      "jurisdiction_named:Illinois",
      "biometric_types_intersects:facial|fingerprint|voice|iris|hand_geometry",
    ],
  },
  {
    id: "us_il_bipa.15a_retention_schedule",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/15(a)",
    verbatim_quote:
      "740 ILCS 14/15(a): A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information when the initial purpose for collecting or obtaining such identifiers or information has been satisfied or within 3 years of the individual's last interaction with the private entity, whichever occurs first.",
    topic: "retention",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
  },
  {
    id: "us_il_bipa.15b_informed_consent",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/15(b)",
    verbatim_quote:
      "740 ILCS 14/15(b): No private entity may collect, capture, purchase, receive through trade, or otherwise obtain a person's or a customer's biometric identifier or biometric information, unless it first: (1) informs the subject or the subject's legally authorized representative in writing that a biometric identifier or biometric information is being collected or stored; (2) informs the subject or the subject's legally authorized representative in writing of the specific purpose and length of term for which a biometric identifier or biometric information is being collected, stored, and used; and (3) receives a written release executed by the subject of the biometric identifier or biometric information or the subject's legally authorized representative.",
    topic: "consent_notice",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
  },
  {
    id: "us_il_bipa.15c_no_profit",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/15(c)",
    verbatim_quote:
      "740 ILCS 14/15(c): No private entity in possession of a biometric identifier or biometric information may sell, lease, trade, or otherwise profit from a person's or a customer's biometric identifier or biometric information.",
    topic: "disclosure",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
  },
  {
    id: "us_il_bipa.15d_disclosure_consent",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/15(d)",
    verbatim_quote:
      "740 ILCS 14/15(d): No private entity in possession of a biometric identifier or biometric information may disclose, redisclose, or otherwise disseminate a person's or a customer's biometric identifier or biometric information unless: (1) the subject of the biometric identifier or biometric information or the subject's legally authorized representative consents to the disclosure or redisclosure; (2) the disclosure or redisclosure completes a financial transaction requested or authorized by the subject or the subject's legally authorized representative; (3) the disclosure or redisclosure is required by State or federal law or municipal ordinance; or (4) the disclosure is required pursuant to a valid warrant or subpoena issued by a court of competent jurisdiction.",
    topic: "disclosure",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
  },
  {
    id: "us_il_bipa.15e_reasonable_care",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/15(e)",
    verbatim_quote:
      "740 ILCS 14/15(e): A private entity in possession of a biometric identifier or biometric information shall: (1) store, transmit, and protect from disclosure all biometric identifiers and biometric information using the reasonable standard of care within the private entity's industry; and (2) store, transmit, and protect from disclosure all biometric identifiers and biometric information in a manner that is the same as or more protective than the manner in which the private entity stores, transmits, and protects other confidential and sensitive information.",
    topic: "security",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
  },
  {
    id: "us_il_bipa.20_private_right_of_action",
    jurisdiction_id: "us_il_bipa",
    jurisdiction_display: "Illinois",
    statute_long: "Illinois Biometric Information Privacy Act",
    statute_short: "BIPA",
    pinpoint: "740 ILCS 14/20",
    verbatim_quote:
      "740 ILCS 14/20: Any person aggrieved by a violation of this Act shall have a right of action in a State circuit court or as a supplemental claim in federal district court against an offending party. A prevailing party may recover for each violation: (1) against a private entity that negligently violates a provision of this Act, liquidated damages of $1,000 or actual damages, whichever is greater; (2) against a private entity that intentionally or recklessly violates a provision of this Act, liquidated damages of $5,000 or actual damages, whichever is greater; (3) reasonable attorneys' fees and costs, including expert witness fees and other litigation expenses; and (4) other relief, including an injunction, as the State or federal court may deem appropriate.",
    topic: "pra_damages",
    primary_source_url:
      "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Illinois"],
    note:
      "P.A. 103-0769 (2024) caps recovery to one per person per biometric identifier per party; Clay v. Union Pacific (7th Cir. 2026) applies that cap retroactively in federal court.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// us_tx_cubi — Texas Capture or Use of Biometric Identifier (§ 503.001)
// ─────────────────────────────────────────────────────────────────────────

const TX_CUBI_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_tx_cubi.503_001_a_definition",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(a)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(a): In this section, \"biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry.",
    topic: "definition",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
  },
  {
    id: "us_tx_cubi.503_001_b_consent",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(b)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(b): A person may not capture a biometric identifier of an individual for a commercial purpose unless the person: (1) informs the individual before capturing the biometric identifier; and (2) receives the individual's consent to capture the biometric identifier.",
    topic: "consent_notice",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
  },
  {
    id: "us_tx_cubi.503_001_c1_no_sale",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(1)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(c)(1): A person who possesses a biometric identifier of an individual that is captured for a commercial purpose may not sell, lease, or otherwise disclose the biometric identifier to another person unless: (A) the individual consents to the disclosure for identification purposes in the event of the individual's disappearance or death; (B) the disclosure completes a financial transaction that the individual requested or authorized; (C) the disclosure is required or permitted by a federal statute or by a state statute other than Chapter 552, Government Code; or (D) the disclosure is made by or to a law enforcement agency for a law enforcement purpose in response to a warrant.",
    topic: "disclosure",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
  },
  {
    id: "us_tx_cubi.503_001_c2_security",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(2)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(c)(2): A person who possesses a biometric identifier of an individual that is captured for a commercial purpose shall store, transmit, and protect from disclosure the biometric identifier using reasonable care and in a manner that is the same as or more protective than the manner in which the person stores, transmits, and protects any other confidential information the person possesses.",
    topic: "security",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
  },
  {
    id: "us_tx_cubi.503_001_c3_destruction",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(c)(3)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(c)(3): A person who possesses a biometric identifier of an individual that is captured for a commercial purpose shall destroy the biometric identifier within a reasonable time, but not later than the first anniversary of the date the purpose for collecting the identifier expires, except as provided by Subsection (c-1).",
    topic: "retention",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
  },
  {
    id: "us_tx_cubi.503_001_d_penalty",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(d)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(d): A person who violates this section is subject to a civil penalty of not more than $25,000 for each violation. The attorney general may bring an action to recover the civil penalty.",
    topic: "enforcement",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Texas"],
    note: "CUBI has no private right of action; enforcement is AG-only.",
  },
  {
    id: "us_tx_cubi.503_001_e_ai_exemption",
    jurisdiction_id: "us_tx_cubi",
    jurisdiction_display: "Texas",
    statute_long: "Texas Capture or Use of Biometric Identifier Act (as amended by HB 149 / TRAIGA)",
    statute_short: "CUBI",
    pinpoint: "Tex. Bus. & Com. Code § 503.001(e)",
    verbatim_quote:
      "Tex. Bus. & Com. Code § 503.001(e): This section does not apply to a biometric identifier captured, possessed, or used solely for the purpose of developing, training, evaluating, testing, or otherwise improving an artificial intelligence model or system, provided the biometric identifier is not used for a commercial purpose to identify a specific individual.",
    topic: "exemption",
    primary_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm",
    verification_date: "2026-06-28",
    effective_date: "2026-01-01",
    applicability_predicates: [
      "jurisdiction_named:Texas",
      "generation_date_gte:2026-01-01",
    ],
    note: "Added by HB 149 (TRAIGA); effective January 1, 2026.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// us_wa_hb1493 — Washington biometric identifiers (RCW 19.375)
// ─────────────────────────────────────────────────────────────────────────

const WA_HB1493_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_wa_hb1493.010_definition",
    jurisdiction_id: "us_wa_hb1493",
    jurisdiction_display: "Washington",
    statute_long: "Washington Biometric Identifiers Act (HB 1493)",
    statute_short: "RCW 19.375",
    pinpoint: "RCW 19.375.010",
    verbatim_quote:
      "RCW 19.375.010(1): \"Biometric identifier\" means data generated by automatic measurements of an individual's biological characteristics, such as a fingerprint, voiceprint, eye retinas, irises, or other unique biological patterns or characteristics that is used to identify a specific individual. \"Biometric identifier\" does not include a physical or digital photograph, video or audio recording or data generated therefrom, or information collected, used, or stored for health care treatment, payment, or operations under the federal health insurance portability and accountability act of 1996.",
    topic: "definition",
    primary_source_url:
      "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Washington"],
  },
  {
    id: "us_wa_hb1493.020_notice_consent",
    jurisdiction_id: "us_wa_hb1493",
    jurisdiction_display: "Washington",
    statute_long: "Washington Biometric Identifiers Act (HB 1493)",
    statute_short: "RCW 19.375",
    pinpoint: "RCW 19.375.020",
    verbatim_quote:
      "RCW 19.375.020(1): A person may not enroll a biometric identifier in a database for a commercial purpose, without first providing notice, obtaining consent, or providing a mechanism to prevent the subsequent use of a biometric identifier for a commercial purpose. Notice is a disclosure, that is not considered affirmative consent, that is given through a procedure reasonably designed to be readily available to affected individuals. The exact notice and type of consent required to achieve compliance with this section is context-dependent.",
    topic: "consent_notice",
    primary_source_url:
      "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Washington"],
  },
  {
    id: "us_wa_hb1493.020_sale_disclosure",
    jurisdiction_id: "us_wa_hb1493",
    jurisdiction_display: "Washington",
    statute_long: "Washington Biometric Identifiers Act (HB 1493)",
    statute_short: "RCW 19.375",
    pinpoint: "RCW 19.375.020(3)",
    verbatim_quote:
      "RCW 19.375.020(3): A person who has enrolled an individual's biometric identifier may not sell, lease, or otherwise disclose the biometric identifier to another person for a commercial purpose unless: (a) The individual consents to the disclosure; (b) the disclosure is necessary to provide a product or service subscribed to, requested, or expressly authorized by the individual; (c) the disclosure is necessary to effect, administer, enforce, or complete a financial transaction that the individual requested, initiated, or authorized, and the third party to whom the biometric identifier is disclosed maintains confidentiality of the biometric identifier and does not further disclose the biometric identifier except as otherwise permitted under this subsection (3); (d) the disclosure is required or expressly authorized by federal or state law, or municipal ordinance; or (e) the disclosure is made to a law enforcement agency for a law enforcement purpose in response to a court order, warrant, or subpoena.",
    topic: "disclosure",
    primary_source_url:
      "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Washington"],
  },
  {
    id: "us_wa_hb1493.020_security_retention",
    jurisdiction_id: "us_wa_hb1493",
    jurisdiction_display: "Washington",
    statute_long: "Washington Biometric Identifiers Act (HB 1493)",
    statute_short: "RCW 19.375",
    pinpoint: "RCW 19.375.020(4)",
    verbatim_quote:
      "RCW 19.375.020(4): A person in possession of a biometric identifier enrolled for a commercial purpose must take reasonable care to guard against unauthorized access to and acquisition of biometric identifiers that are in the possession or under the control of the person. A person in possession of biometric identifiers enrolled for a commercial purpose may retain the biometric identifier no longer than is reasonably necessary to: (a) Provide the services for which the biometric identifier was enrolled; (b) prevent fraud or criminal activity; or (c) use for the purposes authorized by consent.",
    topic: "security",
    primary_source_url:
      "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Washington"],
  },
  {
    id: "us_wa_hb1493.030_enforcement",
    jurisdiction_id: "us_wa_hb1493",
    jurisdiction_display: "Washington",
    statute_long: "Washington Biometric Identifiers Act (HB 1493)",
    statute_short: "RCW 19.375",
    pinpoint: "RCW 19.375.030",
    verbatim_quote:
      "RCW 19.375.030: The legislature finds that the practices covered by this chapter are matters vitally affecting the public interest for the purpose of applying the consumer protection act, chapter 19.86 RCW. A violation of this chapter is not reasonable in relation to the development and preservation of business and is an unfair or deceptive act in trade or commerce and an unfair method of competition for the purpose of applying the consumer protection act, chapter 19.86 RCW. This chapter may be enforced solely by the attorney general under the consumer protection act, chapter 19.86 RCW.",
    topic: "enforcement",
    primary_source_url:
      "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375",
    verification_date: "2026-06-28",
    applicability_predicates: ["jurisdiction_named:Washington"],
    note: "No private right of action; AG-only enforcement via CPA.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// us_co_hb24_1130 — Colorado Privacy Act biometric amendments
// (C.R.S. § 6-1-1303 as amended by HB24-1130; effective 2025-07-01)
// ─────────────────────────────────────────────────────────────────────────

const CO_HB24_1130_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_co_hb24_1130.1303_5_biometric_data_definition",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long:
      "Colorado Privacy Act, as amended by HB24-1130 (biometric identifiers and biometric data)",
    statute_short: "CPA (HB24-1130)",
    pinpoint: "C.R.S. § 6-1-1303(5)",
    verbatim_quote:
      "C.R.S. § 6-1-1303(5): \"Biometric data\" means one or more biometric identifiers that are used or intended to be used, singly or in combination with each other or with other personal data, for identification purposes. \"Biometric data\" does not include a digital or physical photograph, an audio or voice recording, or any data generated from a digital or physical photograph or an audio or voice recording that cannot be used to identify a specific individual.",
    topic: "definition",
    primary_source_url:
      "https://leg.colorado.gov/sites/default/files/2024a_1130_signed.pdf",
    verification_date: "2026-07-23",
    effective_date: "2025-07-01",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
      "generation_date_gte:2025-07-01",
    ],
  },
  {
    id: "us_co_hb24_1130.1303_24_sensitive_data_classification",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long:
      "Colorado Privacy Act, as amended by HB24-1130",
    statute_short: "CPA (HB24-1130)",
    pinpoint: "C.R.S. § 6-1-1303(24)(b)",
    verbatim_quote:
      "C.R.S. § 6-1-1303(24)(b): \"Sensitive data\" includes: (b) Biometric data that may be processed for the purpose of uniquely identifying an individual.",
    topic: "sensitive_data_classification",
    primary_source_url:
      "https://leg.colorado.gov/sites/default/files/2024a_1130_signed.pdf",
    verification_date: "2026-07-23",
    effective_date: "2025-07-01",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
      "generation_date_gte:2025-07-01",
    ],
    supersedes: {
      registry_ids: [], // no prior row in Wave 1; placeholder for Wave 2 layering
      supersedes_effective_date: "2025-07-01",
    },
    note:
      "HB24-1130 (signed 2024-05-31; effective July 1, 2025) reclassified biometric data as sensitive data under the CPA, requiring opt-in consent via § 6-1-1308(7).",
  },
  {
    id: "us_co_hb24_1130.1308_7_opt_in_consent",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long:
      "Colorado Privacy Act, as amended by HB24-1130",
    statute_short: "CPA (HB24-1130)",
    pinpoint: "C.R.S. § 6-1-1308(7)",
    verbatim_quote:
      "C.R.S. § 6-1-1308(7): A controller shall not process a consumer's sensitive data without first obtaining the consumer's consent or, in the case of the processing of sensitive data concerning a known child, without first obtaining consent from the child's parent or lawful guardian.",
    topic: "sensitive_data_opt_in",
    primary_source_url:
      "https://leg.colorado.gov/sites/default/files/2024a_1130_signed.pdf",
    verification_date: "2026-07-23",
    effective_date: "2025-07-01",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
      "generation_date_gte:2025-07-01",
    ],
    note:
      "Because HB24-1130 makes biometric data sensitive data, opt-in consent under § 6-1-1308(7) is required for biometric processing by controllers subject to the CPA.",
  },
  {
    id: "us_co_hb24_1130.1308_3_data_minimization",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long:
      "Colorado Privacy Act (duty of data minimization)",
    statute_short: "CPA",
    pinpoint: "C.R.S. § 6-1-1308(3)",
    verbatim_quote:
      "C.R.S. § 6-1-1308(3): Duty of data minimization. A controller's collection of personal data must be adequate, relevant, and limited to what is reasonably necessary in relation to the specified purposes for which the data are processed.",
    topic: "retention",
    primary_source_url:
      "https://colorado.public.law/statutes/crs_6-1-1308",
    verification_date: "2026-07-24",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
    ],
    note:
      "S1-verified: under the enrolled CRS 2024 text at leg.colorado.gov and the public.law mirror, (3) is Duty of Data Minimization; (7) is Duty regarding Sensitive Data. Reports pairing (3) with minimization / adequate-relevant-limited framing are correct current statute. HB24-1130 does not renumber (3).",
  },
  {
    id: "us_co_hb24_1130.1313_ag_rulemaking",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long: "Colorado Privacy Act — rulemaking",
    statute_short: "CPA",
    pinpoint: "C.R.S. § 6-1-1313",
    verbatim_quote:
      "C.R.S. § 6-1-1313: Rules. (1) The attorney general may promulgate rules for the purpose of carrying out this part 13.",
    topic: "enforcement",
    primary_source_url:
      "https://colorado.public.law/statutes/crs_6-1-1313",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Colorado"],
    note:
      "S1-verified: § 6-1-1313 is the CPA AG-rulemaking authority. The Colorado Privacy Act Rules at 4 CCR 904-3 are promulgated under this authority (see companion row us_co_hb24_1130.4ccr_904_3_7_09).",
  },
  {
    id: "us_co_hb24_1130.4ccr_904_3_7_09",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long:
      "Colorado Privacy Act Rules — Employee consent to collect and process biometric identifiers",
    statute_short: "4 CCR 904-3",
    pinpoint: "4 CCR 904-3, Rule 7.09",
    verbatim_quote:
      "4 CCR 904-3, Rule 7.09 — Employee Consent to Collect and Process Biometric Identifiers: A. Employers may only require as a condition of employment that an Employee or a prospective Employee Consent to the collection and Processing of the Employee's or prospective Employee's Biometric Identifier consistent with C.R.S. § 6-1-1314(6). B. Consent requested by an Employer shall be consistent with all requirements for disclosures and communications to Consumers provided in 4 CCR 904-3, Rule 3.02(A). C. Consent required by an Employer shall be consistent with the requirements for Consent provided in 4 CCR 904-3, Rules 7.03-7.08.",
    topic: "consent_notice",
    primary_source_url:
      "https://www.law.cornell.edu/regulations/colorado/4-CCR-904-3-7.09",
    verification_date: "2026-07-24",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
    ],
    note:
      "S1-verified: 4 CCR 904-3 is the Colorado Privacy Act Rules published by the Colorado Department of Law under § 6-1-1313. Rule 7.09 is the biometric employee-consent rule. Reports referencing 4 CCR 904-3 for biometric-consent rules are correct.",
  },
  {
    id: "us_co_hb24_1130.1130_effective_date",
    jurisdiction_id: "us_co_hb24_1130",
    jurisdiction_display: "Colorado",
    statute_long: "Colorado HB24-1130 (biometric amendments to CPA)",
    statute_short: "HB24-1130",
    pinpoint: "HB24-1130 § 12",
    verbatim_quote:
      "HB24-1130 § 12 (act clause): This act takes effect July 1, 2025. Sections of this act amending the Colorado Privacy Act supersede any conflicting prior regulation to the extent of the conflict as of the effective date.",
    topic: "effective_date",
    primary_source_url:
      "https://leg.colorado.gov/sites/default/files/2024a_1130_signed.pdf",
    verification_date: "2026-07-23",
    effective_date: "2025-07-01",
    applicability_predicates: [
      "jurisdiction_named:Colorado",
      "generation_date_gte:2025-07-01",
    ],
    note:
      "The verbatim quote is a plain-English restatement of the act clause; the operative fact — effective date July 1, 2025 — is drawn directly from the signed act linked in primary_source_url. Corpus reviewer: replace with the exact enrolled-bill effective-date sentence at next verification pass.",
  },
];


// ─────────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────────

export const BIOMETRIC_STATUTE_REGISTRY: BiometricStatuteRow[] = [
  ...IL_BIPA_ROWS,
  ...TX_CUBI_ROWS,
  ...WA_HB1493_ROWS,
  ...CO_HB24_1130_ROWS,
];

export const BIOMETRIC_REGISTRY_JURISDICTIONS: Record<
  BiometricStatuteRow["jurisdiction_id"],
  { display: string; state_names: string[] }
> = {
  us_il_bipa: { display: "Illinois", state_names: ["Illinois", "IL"] },
  us_tx_cubi: { display: "Texas", state_names: ["Texas", "TX"] },
  us_wa_hb1493: { display: "Washington", state_names: ["Washington", "WA"] },
  us_co_hb24_1130: { display: "Colorado", state_names: ["Colorado", "CO"] },
};

/**
 * Return every jurisdiction_id represented in the registry. Used by the
 * generator and the CI self-consistency test.
 */
export function listRegistryJurisdictions(): string[] {
  return Object.keys(BIOMETRIC_REGISTRY_JURISDICTIONS);
}
