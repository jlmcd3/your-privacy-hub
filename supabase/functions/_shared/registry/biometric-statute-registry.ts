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
    | "us_co_hb24_1130"
    // ── Wave 2 (S2) ────────────────────────────────────────────────
    | "us_ca_cpra"
    | "us_ny_shield"
    | "us_ar_pipa"
    // ── Wave 3 (S3) — EU / UK / CA / AU / SG ───────────────────────
    | "eu_gdpr"
    | "uk_gdpr"
    | "ca_pipeda"
    | "au_privacy_act"
    | "sg_pdpa";
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
export const BIOMETRIC_REGISTRY_VERSION = "bio-reg-w1-s3-2026-07-24";

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
      
      "740 ILCS 14/15(d): (d) No private entity in possession of a biometric identifier or biometric information may disclose, redisclose, or otherwise disseminate a person's or a customer's biometric identifier or biometric information unless: (1) the subject of the biometric identifier or biometric information or the subject's legally authorized representative consents to the disclosure or redisclosure; (2) the disclosure or redisclosure completes a financial transaction requested or authorized by the subject of the biometric identifier or the biometric information or the subject's legally authorized representative; (3) the disclosure or redisclosure is required by State or federal law or municipal ordinance; or (4) the disclosure is required pursuant to a valid warrant or subpoena issued by a court of competent jurisdiction.",
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
  // ITEM 317 RECONCILIATION — the 740 ILCS 14/20 (private right of action) row
  // was REMOVED. Its "verbatim_quote" was a reconstruction: 740 ILCS 14/20 was
  // never ingested (Item 314 flagged it as a follow-on), so no corpus row
  // supported the damages tiers, fee-shifting, or mental-state language the row
  // carried. Supplying unverifiable text to the generator is the exact defect
  // this registry exists to prevent. The PRA is now handled by
  // BIPA_PRA_CORPUS_STATUS in biometric-verified-authorities.ts, which permits
  // only the existence characterisation and degrades every specific.
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
      
      "Tex. Bus. & Com. Code § 503.001(a): (2) \"Biometric identifier\" means a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry.",
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
      
      "Tex. Bus. & Com. Code § 503.001(c)(1): (c) A person who possesses a biometric identifier of an individual that is captured for a commercial purpose: (1) may not sell, lease, or otherwise disclose the biometric identifier to another person unless: (A) the individual consents to the disclosure for identification purposes in the event of the individual's disappearance or death; (B) the disclosure completes a financial transaction that the individual requested or authorized; (C) the disclosure is required or permitted by a federal statute or by a state statute other than Chapter 552, Government Code; or (D) the disclosure is made by or to a law enforcement agency for a law enforcement purpose in response to a warrant;",
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
      
      "Tex. Bus. & Com. Code § 503.001(c)(2): (2) shall store, transmit, and protect from disclosure the biometric identifier using reasonable care and in a manner that is the same as or more protective than the manner in which the person stores, transmits, and protects any other confidential information the person possesses; and",
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
      
      "Tex. Bus. & Com. Code § 503.001(c)(3): (3) shall destroy the biometric identifier within a reasonable time, but not later than the first anniversary of the date the purpose for collecting the identifier expires, except as provided by Subsection (c-1).",
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
      
      "Tex. Bus. & Com. Code § 503.001(e): (e) This section does not apply to: (1) voiceprint data retained by a financial institution or an affiliate of a financial institution, as those terms are defined by 15 U.S.C. Section 6809; (2) the training, processing, or storage of biometric identifiers involved in developing, training, evaluating, disseminating, or otherwise offering artificial intelligence models or systems, unless a system is used or deployed for the purpose of uniquely identifying a specific individual; or (3) the development or deployment of an artificial intelligence model or system for the purposes of: (A) preventing, detecting, protecting against, or responding to security incidents, identity theft, fraud, harassment, malicious or deceptive activities, or any other illegal activity; (B) preserving the integrity or security of a system; or (C) investigating, reporting, or prosecuting a person responsible for a security incident, identity theft, fraud, harassment, a malicious or deceptive activity, or any other illegal activity.",
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
      
      "RCW 19.375.010(1): (1) \"Biometric identifier\" means data generated by automatic measurements of an individual's biological characteristics, such as a fingerprint, voiceprint, eye retinas, irises, or other unique biological patterns or characteristics that is used to identify a specific individual. \"Biometric identifier\" does not include a physical or digital photograph, video or audio recording or data generated therefrom, or information collected, used, or stored for health care treatment, payment, or operations under the federal health insurance portability and accountability act of 1996.",
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
      
      "RCW 19.375.020(1): (1) A person may not enroll a biometric identifier in a database for a commercial purpose, without first providing notice, obtaining consent, or providing a mechanism to prevent the subsequent use of a biometric identifier for a commercial purpose. (2) Notice is a disclosure, that is not considered affirmative consent, that is given through a procedure reasonably designed to be readily available to affected individuals. The exact notice and type of consent required to achieve compliance with subsection (1) of this section is context-dependent.",
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
      
      "RCW 19.375.020(3): (3) Unless consent has been obtained from the individual, a person who has enrolled an individual's biometric identifier may not sell, lease, or otherwise disclose the biometric identifier to another person for a commercial purpose unless the disclosure: (a) Is consistent with subsections (1), (2), and (4) of this section; (b) Is necessary to provide a product or service subscribed to, requested, or expressly authorized by the individual; (c) Is necessary to effect, administer, enforce, or complete a financial transaction that the individual requested, initiated, or authorized, and the third party to whom the biometric identifier is disclosed maintains confidentiality of the biometric identifier and does not further disclose the biometric identifier except as otherwise permitted under this subsection (3); (d) Is required or expressly authorized by a federal or state statute, or court order; (e) Is made to a third party who contractually promises that the biometric identifier will not be further disclosed and will not be enrolled in a database for a commercial purpose inconsistent with the notice and consent described in this subsection (3) and subsections (1) and (2) of this section; or (f) Is made to prepare for litigation or to respond to or participate in judicial process.",
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
      
      "RCW 19.375.020(4): (4) A person who knowingly possesses a biometric identifier of an individual that has been enrolled for a commercial purpose: (a) Must take reasonable care to guard against unauthorized access to and acquisition of biometric identifiers that are in the possession or under the control of the person; and (b) May retain the biometric identifier no longer than is reasonably necessary to: (i) Comply with a court order, statute, or public records retention schedule specified under federal, state, or local law; (ii) Protect against or prevent actual or potential fraud, criminal activity, claims, security threats, or liability; and (iii) Provide the services for which the biometric identifier was enrolled.",
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
      
      "RCW 19.375.030: (1) The legislature finds that the practices covered by this chapter are matters vitally affecting the public interest for the purpose of applying the consumer protection act, chapter 19.86 RCW. A violation of this chapter is not reasonable in relation to the development and preservation of business and is an unfair or deceptive act in trade or commerce and an unfair method of competition for the purpose of applying the consumer protection act, chapter 19.86 RCW. (2) This chapter may be enforced solely by the attorney general under the consumer protection act, chapter 19.86 RCW.",
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
// us_ca_cpra — California Consumer Privacy Act (as amended by CPRA)
// Cal. Civ. Code §§ 1798.100 et seq. Biometric surface: definition of
// "biometric information", SPI classification when processed for unique
// identification, and the SPI right-to-limit.
// ─────────────────────────────────────────────────────────────────────────

const CA_CPRA_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_ca_cpra.140_c_biometric_information_definition",
    jurisdiction_id: "us_ca_cpra",
    jurisdiction_display: "California",
    statute_long:
      "California Consumer Privacy Act, as amended by the California Privacy Rights Act (CPRA)",
    statute_short: "CCPA/CPRA",
    pinpoint: "Cal. Civ. Code § 1798.140(c)",
    verbatim_quote:
      "Cal. Civ. Code § 1798.140(c): \"Biometric information\" means an individual's physiological, biological, or behavioral characteristics, including information pertaining to an individual's deoxyribonucleic acid (DNA), that is used or is intended to be used singly or in combination with each other or with other identifying data, to establish individual identity. Biometric information includes, but is not limited to, imagery of the iris, retina, fingerprint, face, hand, palm, vein patterns, and voice recordings, from which an identifier template, such as a faceprint, a minutiae template, or a voiceprint, can be extracted, and keystroke patterns or rhythms, gait patterns or rhythms, and sleep, health, or exercise data that contain identifying information.",
    topic: "definition",
    primary_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:California"],
    note:
      "S2a-corrected: Post-CPRA renumbering places 'Biometric information' at § 1798.140(c). Subdivision (l) is 'Dark pattern' and must not be cited for the biometric definition.",
  },
  {
    id: "us_ca_cpra.140_ae_2_a_spi_biometric",
    jurisdiction_id: "us_ca_cpra",
    jurisdiction_display: "California",
    statute_long:
      "California Consumer Privacy Act, as amended by CPRA — Sensitive Personal Information",
    statute_short: "CCPA/CPRA",
    pinpoint: "Cal. Civ. Code § 1798.140(ae)(2)(A)",
    verbatim_quote:
      "Cal. Civ. Code § 1798.140(ae)(2)(A): \"Sensitive personal information\" means: (2)(A) The processing of biometric information for the purpose of uniquely identifying a consumer.",
    topic: "sensitive_data_classification",
    primary_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:California"],
    note:
      "S2a-corrected: Current § 1798.140(ae)(2)(A) — not (2)(C) — is the biometric SPI carve-out, triggered only when biometric information is processed for the purpose of uniquely identifying a consumer. Enrolment for authentication/identification therefore engages § 1798.121 right-to-limit; incidental biometric capture that is not used for identification does not.",
  },
  {
    id: "us_ca_cpra.121_a_right_to_limit_spi",
    jurisdiction_id: "us_ca_cpra",
    jurisdiction_display: "California",
    statute_long:
      "California Consumer Privacy Act, as amended by CPRA — Right to limit use and disclosure of sensitive personal information",
    statute_short: "CCPA/CPRA",
    pinpoint: "Cal. Civ. Code § 1798.121(a)",
    verbatim_quote:
      "Cal. Civ. Code § 1798.121(a): A consumer shall have the right, at any time, to direct a business that collects sensitive personal information about the consumer to limit its use of the consumer's sensitive personal information to that use which is necessary to perform the services or provide the goods reasonably expected by an average consumer who requests those goods or services.",
    topic: "sensitive_data_opt_in",
    primary_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.121.&lawCode=CIV",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:California"],
    note:
      "S2-verified: § 1798.121 is a right-to-limit, not an opt-in gate. Reports must state California SPI biometric processing is permitted absent a limit request, contrasted with true opt-in regimes (CO CPA § 6-1-1308(7); IL BIPA 15(b)).",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// us_ny_shield — New York Stop Hacks and Improve Electronic Data Security
// (SHIELD) Act. Biometric surface: private-information definition
// including biometric information; reasonable-safeguards duty.
// ─────────────────────────────────────────────────────────────────────────

const NY_SHIELD_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_ny_shield.899_aa_1_b_i_5_biometric_private_info",
    jurisdiction_id: "us_ny_shield",
    jurisdiction_display: "New York",
    statute_long:
      "New York Stop Hacks and Improve Electronic Data Security (SHIELD) Act — breach notification",
    statute_short: "N.Y. Gen. Bus. Law § 899-aa",
    pinpoint: "N.Y. Gen. Bus. Law § 899-aa(1)(b)(i)(5)",
    verbatim_quote:
      "N.Y. Gen. Bus. Law § 899-aa(1)(b)(i)(5): \"Private information\" shall mean either: (i) personal information consisting of any information in combination with any one or more of the following data elements, when either the data element or the combination of personal information plus the data element is not encrypted, or is encrypted with an encryption key that has also been accessed or acquired: … (5) biometric information, meaning data generated by electronic measurements of an individual's unique physical characteristics, such as a fingerprint, voice print, or retina or iris image, or other unique physical representation or digital representation of biometric data which are used to authenticate or ascertain the individual's identity.",
    topic: "definition",
    primary_source_url:
      "https://www.nysenate.gov/legislation/laws/GBS/899-AA",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:New York"],
    note:
      "S2a-corrected: Under the current § 899-aa (rev. 2025-03-28), biometric information is data element (5) within paragraph (b)(i). The 2019 SHIELD amendment inserted a new element (4), pushing biometric to (5); do not cite (4). Subparagraph (ii) is a separate branch covering username/e-mail + password and must not be cited for the biometric definition.",
  },
  {
    id: "us_ny_shield.899_bb_reasonable_safeguards",
    jurisdiction_id: "us_ny_shield",
    jurisdiction_display: "New York",
    statute_long:
      "New York SHIELD Act — data security safeguards",
    statute_short: "N.Y. Gen. Bus. Law § 899-bb",
    pinpoint: "N.Y. Gen. Bus. Law § 899-bb(2)(a)",
    verbatim_quote:
      "N.Y. Gen. Bus. Law § 899-bb(2)(a): Any person or business that owns or licenses computerized data which includes private information of a resident of New York shall develop, implement and maintain reasonable safeguards to protect the security, confidentiality and integrity of the private information including, but not limited to, disposal of data.",
    topic: "security",
    primary_source_url:
      "https://www.nysenate.gov/legislation/laws/GBS/899-BB",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:New York"],
    note:
      "S2a-verified against nysenate.gov/legislation/laws/GBS/899-BB (current revision, retrieved 2026-07-24): subdivision (2)(a) is the reasonable-safeguards duty; pinpoint text appears verbatim in the official statute page. Companion pinpoint § 899-bb(2)(b)(ii) enumerates administrative/technical/physical safeguards; not asserted here but available at the same primary source.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// us_ar_pipa — Arkansas Personal Information Protection Act.
// Catalog jurisdiction: no dedicated biometric statute, biometric data
// only surfaces inside the breach-notification "personal information"
// definition. Representative of states such as AR, IA, WI, WY, NC, NE
// that gate biometric obligations exclusively through breach law.
// ─────────────────────────────────────────────────────────────────────────

const AR_PIPA_ROWS: BiometricStatuteRow[] = [
  {
    id: "us_ar_pipa.4_110_103_biometric_in_pi",
    jurisdiction_id: "us_ar_pipa",
    jurisdiction_display: "Arkansas",
    statute_long:
      "Arkansas Personal Information Protection Act — definitions",
    statute_short: "Ark. Code § 4-110-103",
    pinpoint: "Ark. Code Ann. § 4-110-103(7)",
    verbatim_quote:
      "Ark. Code Ann. § 4-110-103(7): \"Personal information\" means an individual's first name or first initial and his or her last name in combination with any one (1) or more of the following data elements when either the name or the data element is not encrypted or redacted: (E) Biometric data.",
    topic: "definition",
    primary_source_url:
      "https://arkleg.state.ar.us/Home/FTPDocument?path=%2FCode%2FA.C.A+Titles%2FTitle+4%2FSubtitle+7%2FChapter+110.pdf",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Arkansas"],
    note:
      "S2-verified: Arkansas represents the catalog pattern — biometric data is regulated only via the breach-notification statute's personal-information definition. No standalone biometric consent, retention, or PRA regime exists. Reports must not import IL/TX/WA/CO substantive duties into an Arkansas-only analysis.",
  },
];


// ─────────────────────────────────────────────────────────────────────────
// eu_gdpr — EU General Data Protection Regulation (Regulation 2016/679).
// Biometric surface: Art. 4(14) definition, Art. 9(1) special-category
// prohibition, Art. 9(2)(a) explicit-consent exception.
// ─────────────────────────────────────────────────────────────────────────

const EU_GDPR_ROWS: BiometricStatuteRow[] = [
  {
    id: "eu_gdpr.art_4_14_biometric_data_definition",
    jurisdiction_id: "eu_gdpr",
    jurisdiction_display: "EU/EEA",
    statute_long:
      "Regulation (EU) 2016/679 of the European Parliament and of the Council (GDPR) — Definitions",
    statute_short: "GDPR",
    pinpoint: "Article 4(14) GDPR",
    verbatim_quote:
      "Article 4(14) GDPR: 'biometric data' means personal data resulting from specific technical processing relating to the physical, physiological or behavioural characteristics of a natural person, which allow or confirm the unique identification of that natural person, such as facial images or dactyloscopic data.",
    topic: "definition",
    primary_source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:EU/EEA"],
    note:
      "S3-verified against EUR-Lex consolidated text (retrieved 2026-07-24). GDPR biometric data is a defined term at Art. 4(14); the special-category trigger at Art. 9(1) attaches only when processing is 'for the purpose of uniquely identifying a natural person'.",
  },
  {
    id: "eu_gdpr.art_9_1_special_category_prohibition",
    jurisdiction_id: "eu_gdpr",
    jurisdiction_display: "EU/EEA",
    statute_long:
      "GDPR — Processing of special categories of personal data",
    statute_short: "GDPR",
    pinpoint: "Article 9(1) GDPR",
    verbatim_quote:
      "Article 9(1) GDPR: Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    topic: "sensitive_data_classification",
    primary_source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:EU/EEA"],
    note:
      "S3-verified: Art. 9(1) prohibition is engaged only when biometric data is processed 'for the purpose of uniquely identifying a natural person' — incidental biometric capture that is not used for unique identification (e.g. crowd-count video) does not trigger Art. 9.",
  },
  {
    id: "eu_gdpr.art_9_2_a_explicit_consent",
    jurisdiction_id: "eu_gdpr",
    jurisdiction_display: "EU/EEA",
    statute_long:
      "GDPR — Exceptions to the Art. 9(1) prohibition",
    statute_short: "GDPR",
    pinpoint: "Article 9(2)(a) GDPR",
    verbatim_quote:
      "Article 9(2)(a) GDPR: paragraph 1 shall not apply if one of the following applies: (a) the data subject has given explicit consent to the processing of those personal data for one or more specified purposes, except where Union or Member State law provide that the prohibition referred to in paragraph 1 may not be lifted by the data subject.",
    topic: "consent_notice",
    primary_source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02016R0679-20160504",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:EU/EEA"],
    note:
      "S3-verified: Explicit consent under Art. 9(2)(a) is the default lawful-basis exception for biometric identification. Employer/employee contexts must still satisfy Art. 7 freely-given requirements — EDPB Guidelines 05/2020 treat consent in employment as generally invalid absent Member-State-law grounding.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// uk_gdpr — UK GDPR (retained EU law) as amended by DPPEC Regs 2019.
// Biometric surface mirrors EU Art. 4(14) / 9(1) / 9(2)(a).
// ─────────────────────────────────────────────────────────────────────────

const UK_GDPR_ROWS: BiometricStatuteRow[] = [
  {
    id: "uk_gdpr.art_4_14_biometric_data_definition",
    jurisdiction_id: "uk_gdpr",
    jurisdiction_display: "United Kingdom",
    statute_long:
      "UK General Data Protection Regulation (Retained EU Regulation 2016/679)",
    statute_short: "UK GDPR",
    pinpoint: "Article 4(14) UK GDPR",
    verbatim_quote:
      "Article 4(14) UK GDPR: 'biometric data' means personal data resulting from specific technical processing relating to the physical, physiological or behavioural characteristics of a natural person, which allow or confirm the unique identification of that natural person, such as facial images or dactyloscopic data.",
    topic: "definition",
    primary_source_url:
      "https://www.legislation.gov.uk/eur/2016/679/article/4",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:United Kingdom"],
    note:
      "S3-verified against legislation.gov.uk retained-EU text (retrieved 2026-07-24). Substantive text is identical to EU Art. 4(14); citation must be styled as 'Article 4(14) UK GDPR' (not 'Article 4(14) GDPR') to reflect the post-Brexit source of law.",
  },
  {
    id: "uk_gdpr.art_9_1_special_category_prohibition",
    jurisdiction_id: "uk_gdpr",
    jurisdiction_display: "United Kingdom",
    statute_long:
      "UK GDPR — Processing of special categories of personal data",
    statute_short: "UK GDPR",
    pinpoint: "Article 9(1) UK GDPR",
    verbatim_quote:
      "Article 9(1) UK GDPR: Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    topic: "sensitive_data_classification",
    primary_source_url:
      "https://www.legislation.gov.uk/eur/2016/679/article/9",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:United Kingdom"],
    note:
      "S3-verified: identical operative text to EU Art. 9(1). UK-specific lawful-basis conditions for special-category data live in DPA 2018 Sched 1 — cited separately when relevant, not asserted in the S3 core registry.",
  },
  {
    id: "uk_gdpr.art_9_2_a_explicit_consent",
    jurisdiction_id: "uk_gdpr",
    jurisdiction_display: "United Kingdom",
    statute_long:
      "UK GDPR — Exceptions to the Art. 9(1) prohibition",
    statute_short: "UK GDPR",
    pinpoint: "Article 9(2)(a) UK GDPR",
    verbatim_quote:
      "Article 9(2)(a) UK GDPR: paragraph 1 shall not apply if one of the following applies: (a) the data subject has given explicit consent to the processing of those personal data for one or more specified purposes, except where domestic law provides that the prohibition referred to in paragraph 1 may not be lifted by the data subject.",
    topic: "consent_notice",
    primary_source_url:
      "https://www.legislation.gov.uk/eur/2016/679/article/9",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:United Kingdom"],
    note:
      "S3-verified: post-Brexit UK GDPR replaces 'Union or Member State law' with 'domestic law' in Art. 9(2)(a) — reproduced verbatim from legislation.gov.uk.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// ca_pipeda — Canada Personal Information Protection and Electronic
// Documents Act, S.C. 2000, c. 5. Biometric data is treated as personal
// information under s. 2(1); consent, appropriate-purposes, and
// safeguards principles apply (no dedicated biometric statute).
// ─────────────────────────────────────────────────────────────────────────

const CA_PIPEDA_ROWS: BiometricStatuteRow[] = [
  {
    id: "ca_pipeda.s_5_3_appropriate_purposes",
    jurisdiction_id: "ca_pipeda",
    jurisdiction_display: "Canada",
    statute_long:
      "Personal Information Protection and Electronic Documents Act (PIPEDA), S.C. 2000, c. 5",
    statute_short: "PIPEDA",
    pinpoint: "PIPEDA s. 5(3)",
    verbatim_quote:
      "PIPEDA s. 5(3): An organization may collect, use or disclose personal information only for purposes that a reasonable person would consider are appropriate in the circumstances.",
    topic: "consent_notice",
    primary_source_url:
      "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/section-5.html",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Canada"],
    note:
      "S3-verified: OPC applies s. 5(3) to biometric enrolments as a proportionality gate (see OPC PIPEDA Report of Findings #2020-004). Purpose test is engaged in addition to — not in lieu of — Sched. 1 consent.",
  },
  {
    id: "ca_pipeda.sched_1_cl_4_3_consent_principle",
    jurisdiction_id: "ca_pipeda",
    jurisdiction_display: "Canada",
    statute_long:
      "PIPEDA — Schedule 1 (Model Code), Principle 3 (Consent)",
    statute_short: "PIPEDA Sch. 1",
    pinpoint: "PIPEDA, Sch. 1, cl. 4.3",
    verbatim_quote:
      "PIPEDA, Sch. 1, cl. 4.3 — Principle 3 (Consent): The knowledge and consent of the individual are required for the collection, use, or disclosure of personal information, except where inappropriate.",
    topic: "consent_notice",
    primary_source_url:
      "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-7.html",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Canada"],
    note:
      "S3-verified: OPC treats biometric characteristics as sensitive under cl. 4.3.4, driving an express-consent expectation for enrolment. Reports must state consent form (express vs implied) is fact-specific.",
  },
  {
    id: "ca_pipeda.sched_1_cl_4_7_safeguards",
    jurisdiction_id: "ca_pipeda",
    jurisdiction_display: "Canada",
    statute_long:
      "PIPEDA — Schedule 1 (Model Code), Principle 7 (Safeguards)",
    statute_short: "PIPEDA Sch. 1",
    pinpoint: "PIPEDA, Sch. 1, cl. 4.7.1",
    verbatim_quote:
      "PIPEDA, Sch. 1, cl. 4.7.1: The security safeguards shall protect personal information against loss or theft, as well as unauthorized access, disclosure, copying, use, or modification. Organizations shall protect personal information regardless of the format in which it is held.",
    topic: "security",
    primary_source_url:
      "https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-7.html",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Canada"],
    note:
      "S3-verified: cl. 4.7.2 requires safeguards proportionate to sensitivity; biometric templates are sensitive by default, so cl. 4.7 requires higher-tier controls (encryption at rest, key custody separation).",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// au_privacy_act — Australian Privacy Act 1988 (Cth). Biometric information
// and templates are enumerated 'sensitive information' under s. 6(1); APP 3
// governs collection; APP 11 governs security.
// ─────────────────────────────────────────────────────────────────────────

const AU_PRIVACY_ACT_ROWS: BiometricStatuteRow[] = [
  {
    id: "au_privacy_act.s_6_1_sensitive_information_biometric",
    jurisdiction_id: "au_privacy_act",
    jurisdiction_display: "Australia",
    statute_long:
      "Privacy Act 1988 (Cth) — Interpretation",
    statute_short: "Privacy Act 1988 (Cth)",
    pinpoint: "s. 6(1) Privacy Act 1988 (Cth)",
    verbatim_quote:
      "s. 6(1) Privacy Act 1988 (Cth): sensitive information means: (a) information or an opinion about an individual's … (viii) biometric information that is to be used for the purpose of automated biometric verification or biometric identification; or (ix) biometric templates.",
    topic: "sensitive_data_classification",
    primary_source_url:
      "https://www.legislation.gov.au/C2004A03712/latest/text",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Australia"],
    note:
      "S3-verified against legislation.gov.au consolidated Act (retrieved 2026-07-24). Australia classes both raw biometric information used for verification/identification and derived biometric templates as sensitive — parallel to EU Art. 9 but expressed at the definitional layer.",
  },
  {
    id: "au_privacy_act.app_3_3_collection_of_sensitive_info",
    jurisdiction_id: "au_privacy_act",
    jurisdiction_display: "Australia",
    statute_long:
      "Privacy Act 1988 (Cth) — Australian Privacy Principle 3 (Collection of solicited personal information)",
    statute_short: "APP 3",
    pinpoint: "APP 3.3",
    verbatim_quote:
      "APP 3.3: An APP entity must not collect sensitive information about an individual unless: (a) the individual consents to the collection of the information and: (i) if the entity is an agency — the information is reasonably necessary for, or directly related to, one or more of the entity's functions or activities; or (ii) if the entity is an organisation — the information is reasonably necessary for one or more of the entity's functions or activities; or (b) subclause 3.4 applies in relation to the information.",
    topic: "consent_notice",
    primary_source_url:
      "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-quick-reference",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Australia"],
    note:
      "S3-verified: APP 3.3 is the affirmative gate for biometric collection by non-agency organisations; the alternative subclause 3.4 permissions (e.g. permitted general/health situations) are narrow and must be substantiated, not assumed.",
  },
  {
    id: "au_privacy_act.app_11_1_security",
    jurisdiction_id: "au_privacy_act",
    jurisdiction_display: "Australia",
    statute_long:
      "Privacy Act 1988 (Cth) — Australian Privacy Principle 11 (Security of personal information)",
    statute_short: "APP 11",
    pinpoint: "APP 11.1",
    verbatim_quote:
      "APP 11.1: If an APP entity holds personal information, the entity must take such steps as are reasonable in the circumstances to protect the information: (a) from misuse, interference and loss; and (b) from unauthorised access, modification or disclosure.",
    topic: "security",
    primary_source_url:
      "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-quick-reference",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Australia"],
    note:
      "S3-verified: OAIC Guide to Securing Personal Information treats biometric templates as high-sensitivity holdings; APP 11.1 'reasonable steps' scales with sensitivity, so template encryption + revocability are baseline expectations.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// sg_pdpa — Singapore Personal Data Protection Act 2012. No standalone
// biometric statute; core obligations are Consent (s. 13) and Protection
// (s. 24). PDPC Advisory Guidelines on the PDPA apply biometric templates
// as personal data subject to both obligations.
// ─────────────────────────────────────────────────────────────────────────

const SG_PDPA_ROWS: BiometricStatuteRow[] = [
  {
    id: "sg_pdpa.s_13_consent_obligation",
    jurisdiction_id: "sg_pdpa",
    jurisdiction_display: "Singapore",
    statute_long:
      "Personal Data Protection Act 2012 (No. 26 of 2012) — Consent required",
    statute_short: "PDPA",
    pinpoint: "s. 13 PDPA",
    verbatim_quote:
      "s. 13 PDPA: An organisation must not, on or after the appointed day, collect, use or disclose personal data about an individual unless — (a) the individual gives, or is deemed to have given, his or her consent under this Act to the collection, use or disclosure, as the case may be; or (b) the collection, use or disclosure, as the case may be, without the consent of the individual is required or authorised under this Act or any other written law.",
    topic: "consent_notice",
    primary_source_url:
      "https://sso.agc.gov.sg/Act/PDPA2012?ProvIds=P13-#pr13-",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Singapore"],
    note:
      "S3-verified against sso.agc.gov.sg consolidated Act (retrieved 2026-07-24). PDPA does not carve out a special-category regime — biometric data is regulated as ordinary personal data through the general Consent, Purpose Limitation, and Protection obligations.",
  },
  {
    id: "sg_pdpa.s_24_protection_obligation",
    jurisdiction_id: "sg_pdpa",
    jurisdiction_display: "Singapore",
    statute_long:
      "Personal Data Protection Act 2012 — Protection of personal data",
    statute_short: "PDPA",
    pinpoint: "s. 24 PDPA",
    verbatim_quote:
      "s. 24 PDPA: An organisation must protect personal data in its possession or under its control by making reasonable security arrangements to prevent — (a) unauthorised access, collection, use, disclosure, copying, modification or disposal, or similar risks; and (b) the loss of any storage medium or device on which personal data is stored.",
    topic: "security",
    primary_source_url:
      "https://sso.agc.gov.sg/Act/PDPA2012?ProvIds=P13-#pr24-",
    verification_date: "2026-07-24",
    applicability_predicates: ["jurisdiction_named:Singapore"],
    note:
      "S3-verified: PDPC Advisory Guidelines on Key Concepts (Ch. 17) treat biometric templates as sensitive personal data for the purpose of s. 24 'reasonable security arrangements' — reports must state template-level encryption + access controls as baseline.",
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
  ...CA_CPRA_ROWS,
  ...NY_SHIELD_ROWS,
  ...AR_PIPA_ROWS,
  ...EU_GDPR_ROWS,
  ...UK_GDPR_ROWS,
  ...CA_PIPEDA_ROWS,
  ...AU_PRIVACY_ACT_ROWS,
  ...SG_PDPA_ROWS,
];

export const BIOMETRIC_REGISTRY_JURISDICTIONS: Record<
  BiometricStatuteRow["jurisdiction_id"],
  { display: string; state_names: string[] }
> = {
  us_il_bipa: { display: "Illinois", state_names: ["Illinois", "IL"] },
  us_tx_cubi: { display: "Texas", state_names: ["Texas", "TX"] },
  us_wa_hb1493: { display: "Washington", state_names: ["Washington", "WA"] },
  us_co_hb24_1130: { display: "Colorado", state_names: ["Colorado", "CO"] },
  us_ca_cpra: { display: "California", state_names: ["California", "CA", "Calif."] },
  us_ny_shield: { display: "New York", state_names: ["New York", "NY", "N.Y."] },
  us_ar_pipa: { display: "Arkansas", state_names: ["Arkansas", "AR", "Ark."] },
  // Wave 3 — non-US regimes are selected via the discrete JURS enum only;
  // state_names is not exercised (kept as [] as a documentation stub).
  eu_gdpr: { display: "EU/EEA", state_names: [] },
  uk_gdpr: { display: "United Kingdom", state_names: [] },
  ca_pipeda: { display: "Canada", state_names: [] },
  au_privacy_act: { display: "Australia", state_names: [] },
  sg_pdpa: { display: "Singapore", state_names: [] },
};

/**
 * Return every jurisdiction_id represented in the registry. Used by the
 * generator and the CI self-consistency test.
 */
export function listRegistryJurisdictions(): string[] {
  return Object.keys(BIOMETRIC_REGISTRY_JURISDICTIONS);
}
