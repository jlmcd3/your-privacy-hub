// ITEM 385 LEG 2 — LIA REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// This module is CONFIG ONLY. Nothing in the LIA pipeline imports it in leg 2;
// leg 3 wires it into `refinement-core.ts` exactly as `dpia-refinement.ts` and
// `risk-refinement.ts` do for their products. It is checked in now so the
// watchlist and the designed-output exemplars are change-controlled artefacts
// rather than prompt text invented at wiring time.
//
// ── ARCHIVE MINING (source of the W-classes) ────────────────────────────────
// `quality_check_results`, tool = 'lia', 542 rows, 194 with fail_count > 0,
// grouped by (check_id, cross_review_category) over fail_count > 0:
//
//   rubric_generic_boilerplate         gpt_only      36 rows /  98 fails
//   rubric_actionability               gpt_only      33 rows /  81 fails
//   ql2:lia                            (layer 2)     58 rows /  58 fails
//   rubric_citation_misapplied         gpt_only      20 rows /  36 fails
//   rubric_unsupported_business_claim  claude_only   16 rows /  31 fails
//   e6_counsel_referral                deterministic  6 rows /  23 fails
//   no_british_spelling                deterministic  4 rows /  15 fails
//   rubric_citation_misapplied         claude_only    7 rows /  14 fails
//   rubric_unsupported_business_claim  gpt_only       4 rows /   9 fails
//   rubric_internal_reasoning_leak     claude+gpt     7 rows /  16 fails
//   (agree rows: citation_misapplied 7, unsupported_business_claim 5,
//    actionability 1, generic_boilerplate 1)
//
// Representative evidence carried into the W-classes below:
//   * "The balancing test analysis appears generic, referring broadly to EDPB
//     Guidelines without fully integrating specifics unique to the intake's
//     facts" (W1).
//   * "Recommendations … without specifying the process or responsible party"
//     and "no specific deadlines or responsible owners" (W2).
//   * "'Applying the four-factor balancing methodology in EDPB Guidelines
//     1/2024 Section II.C' … does not specify which parts support the
//     conclusion"; "Article 6(11) UK GDPR" applied to processing it does not
//     cover (W3).
//   * "The classification section states special_category_data: true, but the
//     intake explicitly states false"; "references
//     'balancing_details.safeguards' with value 'none specified' — the intake
//     contains no such field"; "the intake actually contains TWO alternatives
//     entries" (W4).
//   * body-text counsel referral: "Review the findings with qualified legal
//     counsel before relying on legitimate interest…" (W5).
//   * British spelling in a US-facing render: recognise, organisation,
//     behaviour, personalise, analyse (W6).

export const LIA_REFINEMENT_CONFIG_VERSION = "lia-refine-config-2026-08-06-item385";

/** The mined defect classes, with their archive counts. */
export interface LiaWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

export const LIA_WATCH_CLASSES: readonly LiaWatchClass[] = [
  {
    id: "W1",
    title: "Generic balancing prose",
    archive_fails: 99,
    detector_hint:
      "a three-part-test or balancing passage that would read identically for any controller in the sector — no named system, role, figure, date or record quotation.",
  },
  {
    id: "W2",
    title: "Recommendation without an owner or a trigger",
    archive_fails: 82,
    detector_hint:
      "a documentation recommendation or next step that names no owner, no trigger and no point at which it is done.",
  },
  {
    id: "W3",
    title: "Citation without a pinpoint, or applied to the wrong proposition",
    archive_fails: 57,
    detector_hint:
      "EDPB Guidelines 1/2024 or a UK GDPR provision cited at guideline or article level for a proposition its cited part does not carry; UK Art. 6(11) (DUAA 2025) applied beyond intra-group administrative transmission.",
  },
  {
    id: "W4",
    title: "Assertion about the record the record does not carry",
    archive_fails: 45,
    detector_hint:
      "a statement about what the intake contains that the intake contradicts: an overridden special-category answer, a quoted field path that does not exist, a miscount of the alternatives entries.",
  },
  {
    id: "W5",
    title: "Counsel referral or internal reasoning in body text",
    archive_fails: 39,
    detector_hint:
      "a 'review with qualified legal counsel' sentence anywhere outside the standing disclaimer, or model reasoning about its own process.",
  },
  {
    id: "W6",
    title: "British spelling in the customer render",
    archive_fails: 15,
    detector_hint: "recognise, organisation, behaviour, personalise, analyse and their family.",
  },
];

/** The critic block, in the dpia-refinement idiom. Consumed in leg 3. */
export const LIA_CRITIC_WATCHLIST =
  `LIA-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Generic balancing prose: a three-part-test or balancing passage that would read identically for any controller in the sector — no named system, role, figure, date or record quotation (history: balancing analyses citing EDPB Guidelines 1/2024 broadly without integrating the record's own facts).
W2 Recommendation without an owner or a trigger: a documentation recommendation or next step that names no owner, no trigger and no point at which it is done (history: "specify retention periods" with no owner, no date and no process).
W3 Citation without a pinpoint, or applied to the wrong proposition: EDPB Guidelines 1/2024 or a UK GDPR provision cited at guideline or article level for a proposition its cited part does not carry; UK GDPR Art. 6(11) (DUAA 2025) applied beyond intra-group transmission for internal administrative purposes.
W4 Assertion about the record the record does not carry: an overridden special-category answer, a quoted intake field path that does not exist, a miscount of the alternatives the record supplies. Check the record both ways — an accurate statement about a genuinely silent record is CORRECT and must not be flagged.
W5 Counsel referral or internal reasoning in body text: a "review with qualified legal counsel" sentence anywhere outside the standing disclaimer; any model reasoning about its own process.
W6 British spelling in the customer render: recognise, organisation, behaviour, personalise, analyse and their family.`;

/**
 * DESIGNED-OUTPUT EXEMPLARS — the xp-lia-1 / xp-lia-2 after-register blocks,
 * written against the item382 plan register (`prose/plans/lia.spine.ts`).
 * A proposal that alters any of these is REJECTED by the verifier.
 */
export const LIA_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-lia-1 — DETERMINATION-LEAD SECTIONS. Every section the item382 plan marks lead:"determination" opens with the finding in its first clause, and cites the provision AFTER the position it supports. The approved shape is: "Legitimate interests carries this processing as the record stands — the interest is stated, the comparison against less intrusive means is recorded, and no weighed factor puts the individuals' rights above it. Article 6(1)(f) permits processing that 'is necessary for the purposes of the legitimate interests pursued by the controller…'." A proposal that moves the statutory quotation back to the opening is a REGRESSION.

xp-lia-2 — HONEST DEGRADATION IN THE ASK SECTIONS. Where the record is genuinely silent, "What the record does not yet state" names the intake field, what the missing dimension is, and the provision that makes it relevant, in the drafting voice — never "cannot be determined" or "no basis to assess" applied to a whole test the record partly answers. An absence sentence about a genuinely silent record is DESIGNED OUTPUT and must be preserved.

Also protected: the standing disclaimer; quoted statutory and EDPB text; the plan's 14 section titles and their order; drafting-voice references to "the record"; the enum-label map in prose/plans/lia.spine.ts.`;

/** Surfaces refinement may never touch (leg-3 consumption). */
export const LIA_PROTECTED_ROOT_KEYS = [
  "disclaimer",
  "data_currency_note",
  "authority_exhibit",
  "citation_ledger",
  "enforcement_precedents",
  "build_stamp",
  "prompt_version",
];

export const LIA_PROTECTED_LEAF_KEYS = [
  "outcome",
  "verdict",
  "status",
  "citation",
  "standard_citation",
  "supporting_citation",
  "authority_verbatim",
  "supporting_verbatim",
  "standard",
  "rule_id",
  "approval_date",
];
