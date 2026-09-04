// ITEM 303 — REGISTRATION VERIFIED-AUTHORITY SKELETON (2026-07-31).
//
// SOURCES ONLY. This module is DATA. It records, per served jurisdiction,
// WHICH official publisher text the registration product's determinations
// must be pinned to, and the corpus key that carries the verbatim excerpt in
// `public.provision_texts` (or `public.gdpr_articles` for the EU/UK
// representative and DPO-trigger rows below).
//
// CORRECTION (2026-08-26 audit, doc 78 finding): the header above used to
// claim this module was "NOT imported by any generator this turn" / wiring
// "queued as a separate engine turn." That was stale even at the time this
// correction was written — it IS live-wired: `run-registration-assessment/
// index.ts` imports `REGISTRATION_DUTY_AUTHORITIES` directly at module load
// (line 22) and uses it to build the customer-facing authority exhibit and
// to feed the finalize battery. Confirmed by reading the consumer, not by
// re-trusting this comment.
//
// HARD SCOPE RULES FOR THIS FILE (dispatch Item 303):
//   * No conclusions. No "the customer must register by X". No thresholds
//     restated in prose. No computed deadlines.
//   * SCHEDULE-SURFACE LAW: the statutory window is carried as the corpus key
//     of the verbatim enacted text. The engine never computes a customer's
//     deadline from it.
//   * Every row points at a state's OWN official code publisher — never an
//     aggregator, never a law-firm summary, never a registry FAQ page.
//   * A jurisdiction the product asserts but that has NO sourceable
//     registration statute goes in UNSOURCEABLE_ASSERTED_JURISDICTIONS, NOT in
//     the registry. It is a CEO-visible flag, not a gap to be filled by
//     inference.
//
// CMP-B8 §1.2 (ratified 2026-08-23): every corpus_key referenced below must
// resolve to an approved provision row — see
// `assertRegistrationCorpusKeysApproved` in
// `./registration-corpus-approval-ledger.ts`, enforced by
// `tests/edge/run-registration-assessment/registration-corpus-key-fail-loud.test.ts`.

/** Registry version tag. Bump on any row add/edit; grader may pin against it. */
export const REGISTRATION_AUTHORITY_VERSION = "registration-va-skeleton-2026-07-31";

export interface RegistrationAuthoritySource {
  /** ISO-ish jurisdiction tag, matching provision_texts.jurisdiction. */
  readonly jurisdiction: string;
  readonly state_name: string;
  /** Statutory citation as the state publishes it. */
  readonly citation: string;
  /** Body that receives the filing, as named in the statute itself. */
  readonly filing_body: string;
  /** Official code publisher URL (state publisher only). */
  readonly official_source_url: string;
  /** provision_texts.key carrying the verbatim excerpt. */
  readonly corpus_key: string;
  /** What this row's excerpt is load-bearing FOR. No conclusions. */
  readonly role: "definition" | "registration_requirement" | "window_or_term" | "downstream_obligation";
  readonly last_verified_at: string;
}

export const REGISTRATION_AUTHORITY_SOURCES: ReadonlyArray<RegistrationAuthoritySource> = [
  // ── CALIFORNIA — Delete Act (SB 362). Registrar moved DOJ → CPPA. ──────────
  {
    jurisdiction: "US-CA",
    state_name: "California",
    citation: "Cal. Civ. Code § 1798.99.80",
    filing_body: "California Privacy Protection Agency",
    official_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.80",
    corpus_key: "ca-delete-act-1798-99-80",
    role: "definition",
    last_verified_at: "2026-07-31",
  },
  {
    jurisdiction: "US-CA",
    state_name: "California",
    citation: "Cal. Civ. Code § 1798.99.82",
    filing_body: "California Privacy Protection Agency",
    official_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.82",
    corpus_key: "ca-delete-act-1798-99-82",
    role: "registration_requirement",
    last_verified_at: "2026-07-31",
  },
  {
    jurisdiction: "US-CA",
    state_name: "California",
    citation: "Cal. Civ. Code § 1798.99.86",
    filing_body: "California Privacy Protection Agency",
    official_source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.86",
    corpus_key: "ca-delete-act-1798-99-86",
    role: "downstream_obligation",
    last_verified_at: "2026-07-31",
  },

  // ── VERMONT — 9 V.S.A. ch. 62 ─────────────────────────────────────────────
  {
    jurisdiction: "US-VT",
    state_name: "Vermont",
    citation: "9 V.S.A. § 2430",
    filing_body: "Vermont Secretary of State",
    official_source_url:
      "https://legislature.vermont.gov/statutes/section/09/062/02430",
    corpus_key: "vt-9vsa-2430",
    role: "definition",
    last_verified_at: "2026-07-31",
  },
  {
    jurisdiction: "US-VT",
    state_name: "Vermont",
    citation: "9 V.S.A. § 2446",
    filing_body: "Vermont Secretary of State",
    official_source_url:
      "https://legislature.vermont.gov/statutes/section/09/062/02446",
    corpus_key: "vt-9vsa-2446",
    role: "window_or_term",
    last_verified_at: "2026-07-31",
  },

  // ── TEXAS — Bus. & Com. Code ch. 510 (REDESIGNATED from ch. 509 by HB 1620,
  //    eff. 2025-09-01; ch. 509 is now the SCOPE App Act — do NOT cite 509). ──
  {
    jurisdiction: "US-TX",
    state_name: "Texas",
    citation: "Tex. Bus. & Com. Code § 510.001",
    filing_body: "Texas Secretary of State",
    official_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    corpus_key: "tx-bc-510-001",
    role: "definition",
    last_verified_at: "2026-07-31",
  },
  {
    jurisdiction: "US-TX",
    state_name: "Texas",
    citation: "Tex. Bus. & Com. Code § 510.003",
    filing_body: "Texas Secretary of State",
    official_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    corpus_key: "tx-bc-510-003",
    role: "registration_requirement",
    last_verified_at: "2026-07-31",
  },
  {
    jurisdiction: "US-TX",
    state_name: "Texas",
    citation: "Tex. Bus. & Com. Code § 510.005",
    filing_body: "Texas Secretary of State",
    official_source_url:
      "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    corpus_key: "tx-bc-510-005",
    role: "window_or_term",
    last_verified_at: "2026-07-31",
  },

  // ── OREGON — ORS 646A.593 ─────────────────────────────────────────────────
  {
    jurisdiction: "US-OR",
    state_name: "Oregon",
    citation: "ORS 646A.593",
    filing_body: "Oregon Department of Consumer and Business Services",
    official_source_url:
      "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    corpus_key: "or-ors-646a-593",
    role: "registration_requirement",
    last_verified_at: "2026-07-31",
  },
];

/**
 * Jurisdictions the CURRENT registration product asserts obligations for but
 * for which NO data-broker registration statute or registry could be sourced
 * from an official state publisher as of 2026-07-31.
 *
 * These are NOT ingested and NOT inferred. CEO-visible flags only.
 */
export const UNSOURCEABLE_ASSERTED_JURISDICTIONS: ReadonlyArray<{
  readonly jurisdiction: string;
  readonly asserted_where: string;
  readonly finding: string;
}> = [
  {
    jurisdiction: "US-VA",
    asserted_where: "registration_assessments rows; legacy quality_run_documents outputs",
    finding:
      "Virginia has no data-broker registration statute or registry. The VCDPA imposes no registration or filing duty. Nothing to source.",
  },
  {
    jurisdiction: "US-IL",
    asserted_where: "registration_assessments rows; legacy quality_run_documents outputs",
    finding:
      "Illinois has no data-broker registration statute or registry. BIPA is a biometric-consent statute, not a registration regime. Nothing to source.",
  },
];

/** States with a data-broker registration regime, for coverage assertions. */
export const REGISTRATION_SERVED_JURISDICTIONS: ReadonlyArray<string> = [
  "US-CA",
  "US-VT",
  "US-TX",
  "US-OR",
];

// ═══════════════════════════════════════════════════════════════════════════
// ITEM 316 — VERBATIM DUTY REGISTRY (2026-07-31).
//
// The Item 303 block above records WHERE the text lives. This block carries
// the text ITSELF: one row per operative sentence, so the engine can reason
// FROM the statute instead of asserting a boolean next to a citation.
//
// AUTHORING RULE (same as the risk / cyber / ADMT registries): every
// `verbatim_quote` below was EXTRACTED BY SCRIPT as an exact whitespace-
// normalized substring of an APPROVED `public.provision_texts` row (or, for
// Arts. 27/37, an approved `public.gdpr_articles` row anchored by Chapter 9's
// governance work — REFERENCED, not re-derived). Nothing here was typed by
// hand, and `registration-corpus-pin.test.ts` re-proves every substring.
//
// CROSS-STATE BLEED IS THE NAMED HAZARD. The four definitional thresholds are
// NOT interchangeable and the differences decide cases:
//   * CA and VT require NO DIRECT RELATIONSHIP with the consumer.
//   * OR does NOT — it reaches any entity that collects and sells or licenses
//     brokered personal data, direct relationship or not.
//   * TX does not use "sells" at all: it reaches collecting, PROCESSING, or
//     TRANSFERRING data not collected directly, and then narrows by a
//     revenue/volume applicability test in § 510.003 that the other three
//     states have no analogue for.
// Pin tests assert each state's sentence against its OWN state only.
//
// SCHEDULE-SURFACE LAW is unchanged and now enforced in code: a row may carry
// the statutory window verbatim; the engine states the window and NEVER
// computes a customer's deadline date from it.
// ═══════════════════════════════════════════════════════════════════════════

// REG-1 (2026-08-29): +6 AI Act rows (Art. 49(1)/(2)/(3)/(5), Art. 71(1),
// Annex VIII Section A head), keyed to the aiact-* corpus rows approved
// 2026-08-10 and re-confirmed live 2026-08-29.
// DOC 163 (2026-09-03): exclusion lists reproduced in full (CA (1)–(4), TX (1)–(3)
// plus (5) and (6) as their own rows because the approved row elides (4), VT
// (C)(i)–(iv)); BDSG § 38(1) second sentence; Art. 37(7) for both regimes; UK
// twins for Art. 27(2) and Art. 37(1) from gdpr_articles (jurisdiction 'uk').
export const REGISTRATION_DUTY_VERSION = "registration-duty-doc163-2026-09-03";

export type RegistrationDutyRole =
  | "definitional_threshold"
  | "threshold_exclusion"
  | "registration_requirement"
  | "window_or_term"
  | "fee"
  | "filing_content"
  | "representative"
  | "representative_exemption"
  | "dpo_trigger"
  | "dpo_publication";

export interface RegistrationDutyRow {
  readonly key: string;
  /** "US-CA" | "US-OR" | "US-TX" | "US-VT" | "EU" | "UK". */
  readonly jurisdiction: string;
  readonly citation: string;
  /** Exact substring of the approved corpus row named by `corpus_key`. */
  readonly verbatim_quote: string;
  readonly corpus_key: string;
  readonly role: RegistrationDutyRole;
  readonly primary_source_url: string;
  readonly verified_on: string;
}

export const REGISTRATION_DUTY_AUTHORITIES: ReadonlyArray<RegistrationDutyRow> = [
  {
    key: "ca_data_broker_definition",
    jurisdiction: "US-CA",
    citation: "Cal. Civ. Code § 1798.99.80(c)",
    verbatim_quote:
      "\"Data broker\" means a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship.",
    corpus_key: "ca-delete-act-1798-99-80",
    role: "definitional_threshold",
    primary_source_url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.80",
    verified_on: "2026-07-31",
  },
  {
    key: "ca_data_broker_exclusions",
    jurisdiction: "US-CA",
    citation: "Cal. Civ. Code § 1798.99.80(c)",
    verbatim_quote:
      "\"Data broker\" does not include any of the following: (1) An entity to the extent that it is covered by the federal Fair Credit Reporting Act (15 U.S.C. Sec. 1681 et seq.). (2) An entity to the extent that it is covered by the Gramm-Leach-Bliley Act (Public Law 106-102) and implementing regulations. (3) An entity to the extent that it is covered by the Insurance Information and Privacy Protection Act (Article 6.6 (commencing with Section 791) of Chapter 1 of Part 2 of Division 1 of the Insurance Code). (4) An entity, or a business associate of a covered entity, to the extent their processing of personal information is exempt under Section 1798.146.",
    corpus_key: "ca-delete-act-1798-99-80",
    role: "threshold_exclusion",
    primary_source_url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.80",
    verified_on: "2026-07-31",
  },
  {
    key: "ca_registration_requirement",
    jurisdiction: "US-CA",
    citation: "Cal. Civ. Code § 1798.99.82(a)",
    verbatim_quote:
      "On or before January 31 following each year in which a business meets the definition of data broker as provided in this title, the business shall register with the California Privacy Protection Agency pursuant to the requirements of this section.",
    corpus_key: "ca-delete-act-1798-99-82",
    role: "registration_requirement",
    primary_source_url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.82",
    verified_on: "2026-07-31",
  },
  {
    key: "ca_registration_fee",
    jurisdiction: "US-CA",
    citation: "Cal. Civ. Code § 1798.99.82(b)(1)",
    verbatim_quote:
      "Pay a registration fee in an amount determined by the California Privacy Protection Agency, not to exceed the reasonable costs of establishing and maintaining the informational internet website described in Section 1798.99.84 and the reasonable costs of establishing, maintaining, and providing access to the accessible deletion mechanism described in Section 1798.99.86.",
    corpus_key: "ca-delete-act-1798-99-82",
    role: "fee",
    primary_source_url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.82",
    verified_on: "2026-07-31",
  },
  {
    key: "ca_filing_content",
    jurisdiction: "US-CA",
    citation: "Cal. Civ. Code § 1798.99.82(b)(2)",
    verbatim_quote:
      "(A) The name of the data broker and its primary physical, email, and internet website addresses. (B) The metrics compiled pursuant to paragraphs (1) and (2) of subdivision (a) of Section 1798.99.85. (C) Whether the data broker collects the personal information of minors.",
    corpus_key: "ca-delete-act-1798-99-82",
    role: "filing_content",
    primary_source_url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.82",
    verified_on: "2026-07-31",
  },
  {
    key: "or_data_broker_definition",
    jurisdiction: "US-OR",
    citation: "ORS 646A.593(1)(c)(A)",
    verbatim_quote:
      "\"Data broker\" means a business entity or part of a business entity that collects and sells or licenses brokered personal data to another person.",
    corpus_key: "or-ors-646a-593",
    role: "definitional_threshold",
    primary_source_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    verified_on: "2026-07-31",
  },
  {
    key: "or_registration_requirement",
    jurisdiction: "US-OR",
    citation: "ORS 646A.593(2)(a)",
    verbatim_quote:
      "a data broker may not collect, sell or license brokered personal data within this state unless the data broker first registers with the Department of Consumer and Business Services as provided in subsection (3) of this section.",
    corpus_key: "or-ors-646a-593",
    role: "registration_requirement",
    primary_source_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    verified_on: "2026-07-31",
  },
  {
    key: "or_registration_term",
    jurisdiction: "US-OR",
    citation: "ORS 646A.593(4)",
    verbatim_quote:
      "A registration under this section is valid until December 31 of the year in which the department approves the registration.",
    corpus_key: "or-ors-646a-593",
    role: "window_or_term",
    primary_source_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    verified_on: "2026-07-31",
  },
  {
    key: "or_registration_fee",
    jurisdiction: "US-OR",
    citation: "ORS 646A.593(3)(b)",
    verbatim_quote:
      "Pay a fee in an amount the department specifies by rule.",
    corpus_key: "or-ors-646a-593",
    role: "fee",
    primary_source_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    verified_on: "2026-07-31",
  },
  {
    key: "or_filing_content",
    jurisdiction: "US-OR",
    citation: "ORS 646A.593(3)(a)",
    verbatim_quote:
      "(A) The name of the data broker; (B) The street address and telephone number of the data broker; and (C) The data broker's primary website and electronic mail address.",
    corpus_key: "or-ors-646a-593",
    role: "filing_content",
    primary_source_url: "https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html",
    verified_on: "2026-07-31",
  },
  {
    key: "tx_data_broker_definition",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.001(4)",
    verbatim_quote:
      "\"Data broker\" means a business entity that collects, processes, or transfers personal data that the business entity did not collect directly from the individual linked or linkable to the data.",
    corpus_key: "tx-bc-510-001",
    role: "definitional_threshold",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-07-31",
  },
  {
    key: "tx_applicability_threshold",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.003(a)",
    verbatim_quote:
      "this chapter applies only to a data broker that, in a 12-month period, derives: (1) more than 50 percent of the data broker's revenue directly from processing or transferring personal data not collected by the data broker directly from the individuals to whom the data pertains; or (2) revenue directly from processing or transferring the personal data of more than 50,000 individuals not collected by the data broker directly from the individuals to whom the data pertains.",
    corpus_key: "tx-bc-510-003",
    role: "definitional_threshold",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-07-31",
  },
  {
    key: "tx_applicability_exclusions",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.003(b)",
    verbatim_quote:
      "This chapter does not apply to: (1) a service provider, including a service provider that engages in the business of processing employee data for a third-party employer for the sole purpose of providing benefits to the third-party employer's employees; (2) a person or entity that collects personal data from another person or entity to which the person or entity is related by common ownership or corporate control, provided a reasonable consumer would expect the persons or entities to share data; (3) a federal, state, tribal, territorial, or local governmental entity, including a body, authority, board, bureau, commission, district, agency, or political subdivision of a governmental entity;",
    corpus_key: "tx-bc-510-003",
    role: "threshold_exclusion",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-09-03",
  },
  {
    key: "tx_applicability_exclusions_fcra",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.003(b)",
    verbatim_quote:
      "(5) a consumer reporting agency or other person or entity that furnishes information for inclusion in a consumer credit report or obtains a consumer credit report, but only to the extent the person or entity engages in activity regulated or authorized by the Fair Credit Reporting Act (15 U.S.C. Section 1681 et seq.)",
    corpus_key: "tx-bc-510-003",
    role: "threshold_exclusion",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-09-03",
  },
  {
    key: "tx_applicability_exclusions_glba",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.003(b)",
    verbatim_quote:
      "(6) a financial institution subject to Title V, Gramm-Leach-Bliley Act (15 U.S.C. Section 6801 et seq.).",
    corpus_key: "tx-bc-510-003",
    role: "threshold_exclusion",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-09-03",
  },
  {
    key: "tx_registration_requirement",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.005(a)",
    verbatim_quote:
      "To conduct business in this state, a data broker to which this chapter applies shall register with the secretary of state by filing a registration statement and paying a registration fee of $300.",
    corpus_key: "tx-bc-510-005",
    role: "registration_requirement",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-07-31",
  },
  {
    key: "tx_registration_term",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.005(d)",
    verbatim_quote:
      "A registration certificate expires on the first anniversary of its date of issuance.",
    corpus_key: "tx-bc-510-005",
    role: "window_or_term",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-07-31",
  },
  {
    key: "tx_filing_content",
    jurisdiction: "US-TX",
    citation: "Tex. Bus. & Com. Code § 510.005(b)",
    verbatim_quote:
      "(1) the legal name of the data broker; (2) a contact person and the primary physical address, e-mail address, telephone number, and Internet website address for the data broker; (2-a) a link to a page on the data broker's Internet website that provides consumers with specific instructions, which must be prominently displayed, on how to exercise their consumer rights under Section 541.051, and any other applicable data privacy rights under Chapter 541;",
    corpus_key: "tx-bc-510-005",
    role: "filing_content",
    primary_source_url: "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.510.htm",
    verified_on: "2026-07-31",
  },
  {
    key: "vt_data_broker_definition",
    jurisdiction: "US-VT",
    citation: "9 V.S.A. § 2430(4)(A)",
    verbatim_quote:
      "\"Data broker\" means a business, or unit or units of a business, separately or together, that knowingly collects and sells or licenses to third parties the brokered personal information of a consumer with whom the business does not have a direct relationship.",
    corpus_key: "vt-9vsa-2430",
    role: "definitional_threshold",
    primary_source_url: "https://legislature.vermont.gov/statutes/section/09/062/02430",
    verified_on: "2026-07-31",
  },
  {
    key: "vt_direct_relationship_examples",
    jurisdiction: "US-VT",
    citation: "9 V.S.A. § 2430(4)(B)",
    verbatim_quote:
      "Examples of a direct relationship with a business include if the consumer is a past or present: (i) customer, client, subscriber, user, or registered user of the business's goods or services; (ii) employee, contractor, or agent of the business; (iii) investor in the business; or (iv) donor to the business.",
    corpus_key: "vt-9vsa-2430",
    role: "definitional_threshold",
    primary_source_url: "https://legislature.vermont.gov/statutes/section/09/062/02430",
    verified_on: "2026-07-31",
  },
  {
    key: "vt_activity_exclusions",
    jurisdiction: "US-VT",
    citation: "9 V.S.A. § 2430(4)(C)",
    verbatim_quote:
      "The following activities conducted by a business, and the collection and sale or licensing of brokered personal information incidental to conducting these activities, do not qualify the business as a data broker: (i) developing or maintaining third-party e-commerce or application platforms; (ii) providing 411 directory assistance or directory information services, including name, address, and telephone number, on behalf of or as a function of a telecommunications carrier; (iii) providing publicly available information related to a consumer's business or profession; or (iv) providing publicly available information via real-time or near-real-time alert services for health or safety purposes.",
    corpus_key: "vt-9vsa-2430",
    role: "threshold_exclusion",
    primary_source_url: "https://legislature.vermont.gov/statutes/section/09/062/02430",
    verified_on: "2026-07-31",
  },
  {
    key: "vt_registration_requirement",
    jurisdiction: "US-VT",
    citation: "9 V.S.A. § 2446(a)",
    verbatim_quote:
      "Annually, on or before January 31 following a year in which a person meets the definition of data broker as provided in section 2430 of this title, a data broker shall: (1) register with the Secretary of State; (2) pay a registration fee of $100.00;",
    corpus_key: "vt-9vsa-2446",
    role: "registration_requirement",
    primary_source_url: "https://legislature.vermont.gov/statutes/section/09/062/02446",
    verified_on: "2026-07-31",
  },
  {
    key: "vt_filing_content",
    jurisdiction: "US-VT",
    citation: "9 V.S.A. § 2446(a)(3)",
    verbatim_quote:
      "(A) the name and primary physical, e-mail, and Internet addresses of the data broker;",
    corpus_key: "vt-9vsa-2446",
    role: "filing_content",
    primary_source_url: "https://legislature.vermont.gov/statutes/section/09/062/02446",
    verified_on: "2026-07-31",
  },
  {
    key: "eu_representative_requirement",
    jurisdiction: "EU",
    citation: "GDPR Art. 27(1)",
    verbatim_quote:
      "Where Article 3(2) applies, the controller or the processor shall designate in writing a representative in the Union.",
    corpus_key: "gdpr-articles:eu:27",
    role: "representative",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  {
    key: "eu_representative_exemption",
    jurisdiction: "EU",
    citation: "GDPR Art. 27(2)(a)",
    verbatim_quote:
      "processing which is occasional, does not include, on a large scale, processing of special categories of data as referred to in Article 9(1) or processing of personal data relating to criminal convictions and offences referred to in Article 10, and is unlikely to result in a risk to the rights and freedoms of natural persons, taking into account the nature, context, scope and purposes of the processing",
    corpus_key: "gdpr-articles:eu:27",
    role: "representative_exemption",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  {
    key: "eu_representative_public_authority",
    jurisdiction: "EU",
    citation: "GDPR Art. 27(2)(b)",
    verbatim_quote:
      "a public authority or body.",
    corpus_key: "gdpr-articles:eu:27",
    role: "representative_exemption",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  {
    key: "uk_representative_requirement",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 27(1)",
    verbatim_quote:
      "Where Article 3(2) applies, the controller or the processor shall designate in writing a representative in the United Kingdom",
    corpus_key: "gdpr-articles:uk:27",
    role: "representative",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/27",
    verified_on: "2026-07-31",
  },
  {
    key: "dpo_trigger_public_authority",
    jurisdiction: "EU",
    citation: "GDPR Art. 37(1)(a)",
    verbatim_quote:
      "the processing is carried out by a public authority or body, except for courts acting in their judicial capacity;",
    corpus_key: "gdpr-articles:eu:37",
    role: "dpo_trigger",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  {
    key: "dpo_trigger_regular_systematic_monitoring",
    jurisdiction: "EU",
    citation: "GDPR Art. 37(1)(b)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale;",
    corpus_key: "gdpr-articles:eu:37",
    role: "dpo_trigger",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  {
    key: "dpo_trigger_special_categories",
    jurisdiction: "EU",
    citation: "GDPR Art. 37(1)(c)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9 and personal data relating to criminal convictions and offences referred to in Article 10.",
    corpus_key: "gdpr-articles:eu:37",
    role: "dpo_trigger",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-07-31",
  },
  // DOC 163 R9 (2026-09-03) — Art. 37(7), both regimes, so the DPO closing act
  // quotes the publication-and-communication step instead of naming it as
  // un-ingested. Substrings of gdpr_articles eu/uk 37 (UK: "the Commissioner").
  {
    key: "dpo_publication",
    jurisdiction: "EU",
    citation: "GDPR Art. 37(7)",
    verbatim_quote:
      "The controller or the processor shall publish the contact details of the data protection officer and communicate them to the supervisory authority.",
    corpus_key: "gdpr-articles:eu:37",
    role: "dpo_publication",
    primary_source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    verified_on: "2026-09-03",
  },
  {
    key: "uk_dpo_publication",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 37(7)",
    verbatim_quote:
      "The controller or the processor shall publish the contact details of the data protection officer and communicate them to the Commissioner",
    corpus_key: "gdpr-articles:uk:37",
    role: "dpo_publication",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/37",
    verified_on: "2026-09-03",
  },
  // DOC 163 R9 — the UK instrument's own Art. 37(1) branches (gdpr_articles
  // 'uk' 37): "courts and tribunals" in (a); "Article 9 or personal data" in (c).
  // A UK-only record cites these, not the EU rows relabelled.
  {
    key: "uk_dpo_trigger_public_authority",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 37(1)(a)",
    verbatim_quote:
      "the processing is carried out by a public authority or body, except for courts and tribunals acting in their judicial capacity;",
    corpus_key: "gdpr-articles:uk:37",
    role: "dpo_trigger",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/37",
    verified_on: "2026-09-03",
  },
  {
    key: "uk_dpo_trigger_regular_systematic_monitoring",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 37(1)(b)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale;",
    corpus_key: "gdpr-articles:uk:37",
    role: "dpo_trigger",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/37",
    verified_on: "2026-09-03",
  },
  {
    key: "uk_dpo_trigger_special_categories",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 37(1)(c)",
    verbatim_quote:
      "the core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9 or personal data relating to criminal convictions and offences referred to in Article 10.",
    corpus_key: "gdpr-articles:uk:37",
    role: "dpo_trigger",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/37",
    verified_on: "2026-09-03",
  },
  // DOC 163 R9 — the UK instrument's own Art. 27(2) exemptions (gdpr_articles
  // 'uk' 27), so the UK representative walk no longer relabels the EU rows.
  {
    key: "uk_representative_exemption",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 27(2)(a)",
    verbatim_quote:
      "processing which is occasional, does not include, on a large scale, processing of special categories of data as referred to in Article 9(1) or processing of personal data relating to criminal convictions and offences referred to in Article 10, and is unlikely to result in a risk to the rights and freedoms of natural persons, taking into account the nature, context, scope and purposes of the processing",
    corpus_key: "gdpr-articles:uk:27",
    role: "representative_exemption",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/27",
    verified_on: "2026-09-03",
  },
  {
    key: "uk_representative_public_authority",
    jurisdiction: "UK",
    citation: "UK GDPR Art. 27(2)(b)",
    verbatim_quote:
      "a public authority or body",
    corpus_key: "gdpr-articles:uk:27",
    role: "representative_exemption",
    primary_source_url: "https://www.legislation.gov.uk/eur/2016/679/article/27",
    verified_on: "2026-09-03",
  },
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, closes
  // Registration P0-3) — the German national-law DPO trigger the S1.1 (doc
  // 119) conditional already names in customer prose but never had an
  // authority row for. BDSG § 38's own text has no OFFICIAL English-language
  // version the way GDPR does (GDPR's English is one of 24 co-equal official
  // EU languages; BDSG is German-only original law). The quote below is the
  // official English CONVENIENCE TRANSLATION published by the same
  // government body as the German original (Bundesministerium des Innern —
  // Federal Ministry of the Interior — Language Service), retrieved from the
  // same official publisher (gesetze-im-internet.de) as every other row in
  // this file, not a third-party or machine translation. German original,
  // for cross-reference: "Ergänzend zu Artikel 37 Absatz 1 Buchstabe b und c
  // der Verordnung (EU) 2016/679 benennen der Verantwortliche und der
  // Auftragsverarbeiter eine Datenschutzbeauftragte oder einen
  // Datenschutzbeauftragten, soweit sie in der Regel mindestens 20 Personen
  // ständig mit der automatisierten Verarbeitung personenbezogener Daten
  // beschäftigen." (retrieved 2026-08-31 from
  // gesetze-im-internet.de/bdsg_2018/__38.html).
  {
    key: "dpo_trigger_bdsg_de",
    jurisdiction: "DE",
    citation: "BDSG § 38(1)",
    verbatim_quote:
      "In addition to Article 37 (1) (b) and (c) of Regulation (EU) 2016/679, the controller and processor shall designate a data protection officer if they constantly employ as a rule at least 20 persons dealing with the automated processing of personal data.",
    corpus_key: "de-bdsg-38",
    role: "dpo_trigger",
    primary_source_url: "https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html",
    verified_on: "2026-08-31",
  },
  // DOC 163 R8 (2026-09-03) — § 38(1) second sentence: a DPO regardless of
  // headcount for DPIA-subject processing and for commercial processing for
  // transfer, anonymised transfer, or market or opinion research. Same
  // approved row (de-bdsg-38), same official convenience translation.
  {
    key: "dpo_trigger_bdsg_de_regardless",
    jurisdiction: "DE",
    citation: "BDSG § 38(1)",
    verbatim_quote:
      "If the controller or processor undertake processing subject to a data protection impact assessment pursuant to Article 35 of Regulation (EU) 2016/679, or if they commercially process personal data for the purpose of transfer, of anonymized transfer or for purposes of market or opinion research, they shall designate a data protection officer regardless of the number of persons employed in processing.",
    corpus_key: "de-bdsg-38",
    role: "dpo_trigger",
    primary_source_url: "https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html",
    verified_on: "2026-09-03",
  },

  // ── REG-1 (doc 106, 2026-08-29) — EU AI Act Art. 49 registration duties.
  // The corpus rows (aiact-art-49 / aiact-art-71 / aiact-annex-8) were
  // ingested and approved 2026-08-10; approval re-confirmed live against
  // `provision_texts` (status='approved') 2026-08-29 via the Lovable
  // query_database tool, and the stored excerpts independently re-verified
  // byte-for-byte against the EUR-Lex OJ publication the same day. Every
  // verbatim_quote below is an exact substring of its corpus row.
  {
    key: "aiact_registration_provider",
    jurisdiction: "EU",
    citation: "AI Act Art. 49(1)",
    verbatim_quote:
      "Before placing on the market or putting into service a high-risk AI system listed in Annex III, with the exception of high-risk AI systems referred to in point 2 of Annex III, the provider or, where applicable, the authorised representative shall register themselves and their system in the EU database referred to in Article 71.",
    corpus_key: "aiact-art-49",
    role: "registration_requirement",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
  {
    key: "aiact_registration_not_high_risk",
    jurisdiction: "EU",
    citation: "AI Act Art. 49(2)",
    verbatim_quote:
      "Before placing on the market or putting into service an AI system for which the provider has concluded that it is not high-risk according to Article 6(3), that provider or, where applicable, the authorised representative shall register themselves and that system in the EU database referred to in Article 71.",
    corpus_key: "aiact-art-49",
    role: "registration_requirement",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
  {
    key: "aiact_registration_public_deployer",
    jurisdiction: "EU",
    citation: "AI Act Art. 49(3)",
    verbatim_quote:
      "Before putting into service or using a high-risk AI system listed in Annex III, with the exception of high-risk AI systems listed in point 2 of Annex III, deployers that are public authorities, Union institutions, bodies, offices or agencies or persons acting on their behalf shall register themselves, select the system and register its use in the EU database referred to in Article 71.",
    corpus_key: "aiact-art-49",
    role: "registration_requirement",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
  {
    key: "aiact_registration_national_level",
    jurisdiction: "EU",
    citation: "AI Act Art. 49(5)",
    verbatim_quote:
      "High-risk AI systems referred to in point 2 of Annex III shall be registered at national level.",
    corpus_key: "aiact-art-49",
    role: "registration_requirement",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
  {
    key: "aiact_eu_database",
    jurisdiction: "EU",
    citation: "AI Act Art. 71(1)",
    verbatim_quote:
      "The Commission shall, in collaboration with the Member States, set up and maintain an EU database containing information referred to in paragraphs 2 and 3 of this Article concerning high-risk AI systems referred to in Article 6(2) which are registered in accordance with Articles 49 and 60 and AI systems that are not considered as high-risk pursuant to Article 6(3) and which are registered in accordance with Article 6(4) and Article 49.",
    corpus_key: "aiact-art-71",
    role: "definitional_threshold",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
  {
    key: "aiact_filing_content_provider",
    jurisdiction: "EU",
    citation: "AI Act Annex VIII, Section A",
    verbatim_quote:
      "Section A — Information to be submitted by providers of high-risk AI systems in accordance with Article 49(1)",
    corpus_key: "aiact-annex-8",
    role: "filing_content",
    primary_source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
    verified_on: "2026-08-29",
  },
];

/** Index by key. Throws on an unknown key rather than returning undefined —
 *  a missing authority is a build defect, never a silent empty citation. */
const DUTY_BY_KEY = new Map(REGISTRATION_DUTY_AUTHORITIES.map((r) => [r.key, r]));

export function dutyRow(key: string): RegistrationDutyRow {
  const row = DUTY_BY_KEY.get(key);
  if (!row) throw new Error(`[registration-duty] unknown authority key: ${key}`);
  return row;
}

export function dutyRowsFor(jurisdiction: string): RegistrationDutyRow[] {
  return REGISTRATION_DUTY_AUTHORITIES.filter((r) => r.jurisdiction === jurisdiction);
}
