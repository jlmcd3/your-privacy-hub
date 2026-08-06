// ITEM 394 LEG C — ADMT REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// Mined from `quality_check_results` for tool `cppa-admt` (rows with
// fail_count > 0: 411 of 1815). The W-classes below are the mined failure
// classes, ranked by verified fail volume, in the LIA idiom
// (`lia-refinement-config.ts`, item385 leg 2). NOTHING in this module is
// wired into a run path: leg C authors the config, a later leg wires the
// critic/verifier pass exactly as item386 did for the LIA.
//
// MINING RESULT (top classes, cppa-admt, fail_count > 0)
// ------------------------------------------------------
//   rubric_generic_boilerplate ......... 151 fails (avg rate 0.513)
//   rubric_actionability ............... 120 fails
//   rubric_citation_misapplied .......... 97 fails
//   h7_admt_blanket_range ............... 32 fails (rate 1.00)
//   h6_admt_governing_anchor ............ 24 fails
//   rubric_unbacked_record_claim ........ 21 fails
//   rubric_internal_reasoning_leak ...... 17 fails
//   rubric_invented_admt_section ........ 14 fails
//   rubric_british_spelling .............. 9 fails
//   rubric_absence_on_backed_surface ..... 8 fails

export const ADMT_REFINEMENT_CONFIG_VERSION = "admt-refinement-config@item394-2026-08-06";

export interface AdmtWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

/** The mined W-classes, ordered by verified fail volume. */
export const ADMT_WATCH_CLASSES: readonly AdmtWatchClass[] = [
  {
    id: "W1",
    title: "Generic ADMT boilerplate",
    archive_fails: 151,
    detector_hint:
      "a scope, notice, opt-out or access passage that would read identically for any business deploying any automated decision-making technology — no named system, no named decision domain, no figure, date or quotation from this record.",
  },
  {
    id: "W2",
    title: "Action without an owner or a trigger",
    archive_fails: 120,
    detector_hint:
      "a priority action, top-3 action or documentation item that names no owner, no trigger and no point at which it is done — 'update the pre-use notice' with nobody, no date and no process.",
  },
  {
    id: "W3",
    title: "Citation misapplied, or a blanket range used as a duty anchor",
    archive_fails: 97 + 32,
    detector_hint:
      "11 CCR §§ 7220-7222 (or any multi-section range) cited as the anchor for a single duty instead of the subsection that carries it; a subsection cited for a proposition its text does not carry; a citation deeper than the verified registry depth (e.g. 11 CCR § 7001(ddd)(1)).",
  },
  {
    id: "W4",
    title: "Assertion about the record the record does not carry",
    archive_fails: 21,
    detector_hint:
      "a statement that the record says something it does not — a claimed opt-out method, a claimed notice element, a miscount of the ADMT systems or of the consumers affected. Check the record BOTH ways: an accurate statement about a genuinely silent record is CORRECT and must not be flagged.",
  },
  {
    id: "W5",
    title: "Counsel referral or internal reasoning in body text",
    archive_fails: 17,
    detector_hint:
      "a 'review with qualified legal counsel' sentence anywhere outside the standing disclaimer; any model reasoning about its own process; the malformed splice family 'The intake does not address The record states that…'.",
  },
  {
    id: "W6",
    title: "Governing-anchor drift",
    archive_fails: 24,
    detector_hint:
      "a section whose governing anchor is not the section the duty lives in — pre-use notice reasoning anchored anywhere but § 7220, opt-out reasoning anywhere but § 7221, access reasoning anywhere but § 7222.",
  },
  {
    id: "W7",
    title: "Absence frame on a backed surface / British spelling",
    archive_fails: 8 + 9,
    detector_hint:
      "a controlled absence sentence occupying a surface the record in fact backs (most often the notice-element and access-readiness findings); and the British spelling family — recognise, organisation, behaviour, personalise, analyse. An absence sentence about a GENUINELY silent surface is designed output and must be preserved.",
  },
];

/** The critic block, in the lia-refinement idiom. Consumed when leg D wires it. */
export const ADMT_CRITIC_WATCHLIST =
  `ADMT-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Generic ADMT boilerplate: a scope, notice, opt-out or access passage that would read identically for any business deploying any ADMT — no named system, decision domain, figure, date or record quotation.
W2 Action without an owner or a trigger: an action or documentation item naming no owner, no trigger and no point at which it is done.
W3 Citation misapplied, or a blanket range as a duty anchor: 11 CCR §§ 7220-7222 (or any range) anchoring a single duty instead of the subsection that carries it; a subsection cited for a proposition its text does not carry; a citation deeper than the verified registry depth.
W4 Assertion about the record the record does not carry: a claimed opt-out method, notice element or count the record does not supply. Check the record both ways — an accurate statement about a genuinely silent record is CORRECT.
W5 Counsel referral or internal reasoning in body text: any "review with qualified legal counsel" sentence outside the standing disclaimer; any reasoning about the model's own process; malformed splices of the form "The intake does not address The record states that…".
W6 Governing-anchor drift: pre-use notice reasoning anchored anywhere but § 7220, opt-out reasoning anywhere but § 7221, access reasoning anywhere but § 7222.
W7 Absence frame on a backed surface, and British spelling: a controlled absence sentence on a surface the record backs; recognise, organisation, behaviour, personalise, analyse and their family. An absence sentence about a genuinely silent surface is designed output and must be preserved.`;

/**
 * DESIGNED-OUTPUT EXEMPLARS — written against the item392 plan register
 * (`prose/plans/admt.spine.ts`) and the item392 register repairs. A proposal
 * that alters any of these is REJECTED by the verifier.
 */
export const ADMT_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-admt-1 — VERDICT-LEAD SECTIONS. Every section the item392 plan marks lead:"determination" opens with the finding in its first clause and cites the subsection AFTER the position it supports. Moving the statutory quotation back to the opening is a REGRESSION.

xp-admt-2 — ONE OPEN-ELEMENT LEDGER (item392 AG-1). Each adequacy element states its OWN conclusion once, and the unresolved elements are named ONCE in a single ledger sentence. A proposal that restores a per-element hedge sentence is a REGRESSION.

xp-admt-3 — READER-FACING LABEL SIBLINGS (item392 AG-2). Machine enums stay where the renderers key on them (status, conclusion, verdict) and the reader-facing words live in the *_label siblings. A proposal that rewrites a machine enum into prose is a REGRESSION.

xp-admt-4 — HONEST DEGRADATION. Where the record is genuinely silent, the finding names the intake field, what is missing, and the subsection that makes it relevant — never "cannot be determined" applied to an element the record partly answers.

Also protected: the standing disclaimer; quoted statutory text and the authority exhibit; the plan's 12 section titles and their order; the enum-label maps in ltp/admt-prose-gold.ts.`;

/** Surfaces refinement may never touch. */
export const ADMT_PROTECTED_ROOT_KEYS = [
  "disclaimer",
  "framework_disclaimer",
  "authority_exhibit",
  "citation_ledger",
  "enforcement_precedents",
  "enforcement_meta",
  "deadline_table",
  "compliance_deadline",
  "schema_version",
];

/** C1 — determination outcome fields. The finding itself is never rewritten. */
export const ADMT_PROTECTED_DETERMINATION_KEYS = [
  "determination",
  "verdict",
  "conclusion",
  "outcome",
  "overall_status",
  "applicability_verdict",
  "is_admt",
  "exception_qualifies",
  "human_review_qualifies",
  "qualifies",
] as const;

/** C2 — machine enums and their renderer keys. */
export const ADMT_PROTECTED_ENUM_KEYS = [
  "status",
  "status_label",
  "overall_status_label",
  "priority",
  "severity",
  "information_needed",
] as const;

/** C3 — citation and authority fields. */
export const ADMT_PROTECTED_CITATION_KEYS = [
  "citation",
  "citations",
  "statutory_basis",
  "provision",
  "subsection",
  "authority",
  "element_verbatim",
  "condition_verbatim",
  "verbatim_quote",
  "as_cited",
  "corpus_key",
  "pin_verified",
] as const;

/** C4 — spine identity. */
export const ADMT_PROTECTED_SECTION_IDS = [
  "id",
  "element_id",
  "requirement_id",
  "finding_id",
  "condition_id",
  "proposition_key",
  "proposition_keys",
  "activity_id",
  "rule_ids",
] as const;

export const ADMT_PROTECTED_LEAF_CLASSES = {
  determination: ADMT_PROTECTED_DETERMINATION_KEYS,
  enum: ADMT_PROTECTED_ENUM_KEYS,
  citation: ADMT_PROTECTED_CITATION_KEYS,
  section_id: ADMT_PROTECTED_SECTION_IDS,
} as const;

export const ADMT_PROTECTED_LEAF_KEYS: string[] = Array.from(
  new Set(Object.values(ADMT_PROTECTED_LEAF_CLASSES).flatMap((v) => [...v])),
);
