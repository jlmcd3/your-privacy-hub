// ITEM 303 — REGISTRATION VERIFIED-AUTHORITY SKELETON (2026-07-31).
//
// SOURCES ONLY. This module is DATA and is NOT imported by any generator this
// turn. It records, per served jurisdiction, WHICH official publisher text the
// registration product's determinations must be pinned to, and the corpus key
// that carries the verbatim excerpt in `public.provision_texts`.
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
// Wiring is queued as a separate engine turn (mirror of items 51/55/56).

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
