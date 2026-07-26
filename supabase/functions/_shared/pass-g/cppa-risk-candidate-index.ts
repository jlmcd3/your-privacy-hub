/**
 * PASS-G CANDIDATE INDEX — cppa-risk (Two-Pass Architecture, Phase-1 authoring)
 * -----------------------------------------------------------------------------
 * Pre-indexed candidate slices keyed by weighing-test id. Pass G at runtime
 * selects entries from these slices only (candidate-set closure per
 * TWO-PASS-ARCHITECTURE §2.6/§2.7). Every entry is CPPA-domain (Q4(e)).
 *
 * PER CEO EXCEPTION: FSOR-internal analogies (i.e., enforcement or comparative
 * discussion the FSOR itself references) are legitimate CPPA-domain corpus.
 * The current corpus has no FSOR-internal enforcement analogies indexed to
 * § 7152; that tier is empty and logged to the T5 feed via the courier.
 *
 * NO WIRING. Data only.
 */

import type { JurisdictionTag } from "../legal-test/cppa-risk-conclusions.ts";

export interface CandidateEntry {
  readonly source: "fsor_commentary" | "fsor_callout" | "enforcement_action_fsor_analogy";
  readonly regulation_citation: string;
  readonly page_ref: string | null;
  readonly anchor_hint: string;
  /** Corpus row surrogate — a query key downstream Pass G will resolve. */
  readonly corpus_ref: string;
  readonly tier_label: "primary" | "supporting" | "analogy_fsor_internal";
}

export interface CandidateSlice {
  readonly test_id: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly candidates: readonly CandidateEntry[];
}

const CPPA: JurisdictionTag = "cppa-ca";

export const CPPA_RISK_PASSG_INDEX: readonly CandidateSlice[] = [
  {
    test_id: "test.cppa-7152.balance",
    jurisdiction_tag: CPPA,
    candidates: [
      // ---------- PRIMARY (rows explicitly tagged § 7152) ----------
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 134",
        anchor_hint:
          "balance privacy risks against broader benefits to various stakeholders and document specific safeguards",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p134.balance",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 131",
        anchor_hint:
          "§ 7152(a) less-prescriptive-language proposal rejected — reg retains prescriptive purpose/categories/safeguards discipline",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p131.less-prescriptive",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 131",
        anchor_hint:
          "GDPR-alignment argument rejected — CPPA retained the CA-specific content requirements",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p131.gdpr-alignment",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 132",
        anchor_hint:
          "§ 7152(a)(5)-(6) First Amendment challenge rejected — negative-impact and safeguard disclosures retained",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p132.first-amendment",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 134",
        anchor_hint:
          "§ 7152(a) requirements apply regardless of business size/complexity — reg refused a small-business modification",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p134.size-neutral",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "Appendix, p. 135",
        anchor_hint:
          "§ 7152 applies only to processing that presents significant risk — not all processing",
        corpus_ref: "cppa_fsor_commentary#7152.appendix-p135.significant-risk-only",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "p. 33",
        anchor_hint:
          "§ 7152 amendments clarify and strengthen risk-assessment requirements",
        corpus_ref: "cppa_fsor_commentary#7152.p33.amendment-rationale",
        tier_label: "primary",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7152",
        page_ref: "p. 37",
        anchor_hint:
          "ADMT-using businesses must identify specific evaluations, policies, procedures, and training in the risk assessment",
        corpus_ref: "cppa_fsor_commentary#7152.p37.admt-specificity",
        tier_label: "primary",
        authority_weight: "binding",
      },
      // ---------- SUPPORTING (§ 7150 rows that scope § 7152 applicability) ----------
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7150",
        page_ref: "p. 30",
        anchor_hint:
          "§ 7150 threshold rationale — when a business must conduct a risk assessment under the CCPA",
        corpus_ref: "cppa_fsor_commentary#7150.p30.when-required",
        tier_label: "supporting",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7150",
        page_ref: "Appendix, p. 117",
        anchor_hint:
          "§ 7150 refusal to limit risk assessments to sensitive-PI-only processing",
        corpus_ref: "cppa_fsor_commentary#7150.appendix-p117.not-limited-to-sensitive",
        tier_label: "supporting",
        authority_weight: "binding",
      },
      {
        source: "fsor_commentary",
        regulation_citation: "11 CCR § 7150",
        page_ref: "Appendix, p. 119",
        anchor_hint:
          "§ 7150 refusal to reduce burdens on smaller businesses — same content requirements apply",
        corpus_ref: "cppa_fsor_commentary#7150.appendix-p119.size-neutral",
        tier_label: "supporting",
        authority_weight: "binding",
      },
      // ---------- ANALOGY_FSOR_INTERNAL (per CEO exception) ----------
      // TIER EMPTY: no FSOR-internal enforcement analogies indexed to § 7152 in
      // the current corpus. Logged to T5 as a ranked ingestion candidate in the
      // courier so future FSOR revisions or CPPA enforcement discussions flow in
      // automatically once ingested (Q4(e) future-proofing).
    ],
  },
];

export const CPPA_RISK_PASSG_INDEX_BY_TEST: Readonly<
  Record<string, CandidateSlice>
> = Object.freeze(
  Object.fromEntries(CPPA_RISK_PASSG_INDEX.map((s) => [s.test_id, s])),
);
