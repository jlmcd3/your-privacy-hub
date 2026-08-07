/**
 * PASS-G CANDIDATE INDEX — lia (Legal Test Pipeline, Phase-1 authoring)
 * ----------------------------------------------------------------------
 * Pre-indexed candidate slices keyed by weighing-test id for run-li-assessment.
 * Every entry is EU-domain (Q4(e)); GDPR/UK plans admit NO U.S./CA material
 * in any tier (V3 + V8 enforced). ICO material is deferred per item 136;
 * UK units carry a LIMITED-GUIDANCE DISCLOSURE at render time and DRAW from
 * this same EDPB-based index (EDPB guidance is authoritative for UK GDPR
 * transitional interpretation on Art 6(1)(f) balancing).
 *
 * AUTHORITY-WEIGHT DISCIPLINE (v2.2/v2.3):
 *   - primary = binding-tier EU guidance (EDPB Guidelines 1/2024 — the
 *     EDPB's dedicated Art 6(1)(f) balancing guidance).
 *   - supporting = binding-tier EU guidance from adjacent EDPB families
 *     that carry Art 6(1)(f)-relevant weight (e.g., WP29/EDPB DPIA and
 *     transparency guidelines; only rows that quote-safely bear on the
 *     three-part test).
 *   - enforcement_action_edpb_analogy = FUTURE tier for GDPR enforcement
 *     analogies. CURRENTLY EMPTY BY FINDING: enforcement_actions rows tagged
 *     with 6(1)(f) exist (e.g., Spain AEPD, Greece HDPA, various DPAs) but
 *     NONE are `verification_status='verified'` in the current corpus. Only
 *     verified rows are eligible for binding-tier use (registry discipline);
 *     candidate set stays empty until verification runs land. Logged to T5.
 *   - persuasive analogy tier does NOT exist for GDPR products — the CPPA
 *     product's FSOR-mediation carve-out has no GDPR analogue.
 *
 * Every corpus_ref is a query key downstream Pass G resolves against the
 * live corpus row. `page_ref` is null on many entries because EDPB 1/2024
 * ingestion has `section_heading IS NULL` on every row (coarse indexing);
 * this is a KNOWN GAP logged to T5 and named in the courier.
 *
 * NO WIRING. Data only.
 */

import type { JurisdictionTag } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

export interface CandidateEntry {
  readonly source:
    | "edpb_guideline"
    | "enforcement_action_edpb_analogy";
  readonly regulation_citation: string;
  readonly page_ref: string | null;
  readonly anchor_hint: string;
  readonly corpus_ref: string;
  readonly tier_label: "primary" | "supporting" | "enforcement_action_edpb_analogy";
  /** GDPR products: primary/supporting = "binding" (EDPB is EU-domain binding guidance track). enforcement analogies are binding when the row is `verification_status='verified'` and the analogy is Art 6(1)(f)-tagged. */
  readonly authority_weight: "binding";
}

export interface CandidateSlice {
  readonly test_id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly candidates: readonly CandidateEntry[];
}

const GDPR_EU: JurisdictionTag = "gdpr-eu";

// EDPB Guidelines 1/2024 is the single primary-tier family here. Individual
// row anchors quote fragments already observed in the corpus (verified via
// SELECT this turn) so Pass G can resolve them without a section_heading
// pinpoint until re-ingestion lands.
const PRIMARY_EDPB_2024: readonly CandidateEntry[] = [
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "this assessment should follow the three-step process outlined below (interest / necessity / balancing)",
    corpus_ref: "edpb_guidelines#1-2024.three-step",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "assessing what is 'necessary' involves ascertaining whether in practice the legitimate interest could reasonably be achieved by less intrusive means",
    corpus_ref: "edpb_guidelines#1-2024.necessity",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "when performing a balancing exercise to assess whether a processing may be based on Article 6(1)(f) GDPR, special care must be taken in relation to the status of the data subject",
    corpus_ref: "edpb_guidelines#1-2024.balancing.care",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "the reasonable expectations of data subjects should be considered in the balancing test",
    corpus_ref: "edpb_guidelines#1-2024.reasonable-expectations",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "the types of data that data subjects generally consider to be more private (e.g., financial data, location data, etc.)",
    corpus_ref: "edpb_guidelines#1-2024.nature-of-data",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "controllers that are part of a group of undertakings may have a legitimate interest in transmitting personal data within the group (Recital 48 GDPR)",
    corpus_ref: "edpb_guidelines#1-2024.group-of-undertakings",
    tier_label: "primary",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 1/2024",
    page_ref: null,
    anchor_hint:
      "the right to object to processing of personal data for direct marketing purposes pursuant to Article 21(2) GDPR is unconditional",
    corpus_ref: "edpb_guidelines#1-2024.direct-marketing-objection",
    tier_label: "primary",
    authority_weight: "binding",
  },
];

// Adjacent EDPB families in the corpus that quote-safely bear on Art 6(1)(f)
// balancing when 6(1)(f)-relevant. All are status=final in corpus.
const SUPPORTING_ADJACENT: readonly CandidateEntry[] = [
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 2/2019",
    page_ref: null,
    anchor_hint:
      "contracts and contractual terms must comply with the requirements on the lawfulness of processing (contrast with Art 6(1)(b) — establishes the boundary the LI test must not encroach)",
    corpus_ref: "edpb_guidelines#2-2019.contract-boundary",
    tier_label: "supporting",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "EDPB Guidelines 05/2020",
    page_ref: null,
    anchor_hint:
      "consent boundary — when consent is not freely given the controller cannot pivot to Art 6(1)(f) to rescue the same processing",
    corpus_ref: "edpb_guidelines#05-2020.consent-boundary",
    tier_label: "supporting",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "WP248 rev.01",
    page_ref: null,
    anchor_hint:
      "DPIA guidance — risk-severity/breadth heuristics feed the LI impact factor when the processing is DPIA-eligible",
    corpus_ref: "edpb_guidelines#wp248.risk-severity",
    tier_label: "supporting",
    authority_weight: "binding",
  },
  {
    source: "edpb_guideline",
    regulation_citation: "WP260 rev.01",
    page_ref: null,
    anchor_hint:
      "transparency guidance — the reasonable-expectations factor is anchored in what a data subject could reasonably know at collection",
    corpus_ref: "edpb_guidelines#wp260.reasonable-knowability",
    tier_label: "supporting",
    authority_weight: "binding",
  },
];

export const LIA_PASSG_INDEX: readonly CandidateSlice[] = [
  {
    test_id: "test.gdpr-6-1-f.purpose_legitimacy",
    jurisdiction_tag: GDPR_EU,
    candidates: [
      PRIMARY_EDPB_2024[0],
      SUPPORTING_ADJACENT[0], // Art 6(1)(b) boundary
      SUPPORTING_ADJACENT[1], // consent boundary
    ],
  },
  {
    test_id: "test.gdpr-6-1-f.necessity",
    jurisdiction_tag: GDPR_EU,
    candidates: [
      PRIMARY_EDPB_2024[1],
      PRIMARY_EDPB_2024[0], // three-step framing
    ],
  },
  {
    test_id: "test.gdpr-6-1-f.balance",
    jurisdiction_tag: GDPR_EU,
    candidates: [
      PRIMARY_EDPB_2024[2], // balancing care
      PRIMARY_EDPB_2024[3], // reasonable expectations
      PRIMARY_EDPB_2024[4], // nature of data
      PRIMARY_EDPB_2024[5], // group-of-undertakings illustration
      PRIMARY_EDPB_2024[6], // direct-marketing objection
      SUPPORTING_ADJACENT[2], // DPIA risk-severity
      SUPPORTING_ADJACENT[3], // transparency / knowability
      // ---------- ENFORCEMENT ANALOGIES (EMPTY BY FINDING) ----------
      // TIER EMPTY: enforcement_actions rows tagged with Art 6(1)(f) are all
      // verification_status='requires_review' or 'unverified' in the current
      // corpus. Registry discipline requires verified rows only. Logged to T5
      // as ranked ingestion candidate.
    ],
  },
];

export const LIA_PASSG_INDEX_BY_TEST: Readonly<
  Record<string, CandidateSlice>
> = Object.freeze(
  Object.fromEntries(LIA_PASSG_INDEX.map((s) => [s.test_id, s])),
);
