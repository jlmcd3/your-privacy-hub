// ITEM 402 LEG C — GOVERNANCE REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// CONFIG ONLY. Nothing in the governance pipeline imports this module in leg C;
// leg D wires it into `refinement-core.ts` exactly as `dpia-refinement.ts`,
// `risk-refinement.ts`, `lia-refinement-config.ts` and `admt-refinement.ts` do
// for their products. It is checked in now so the watchlist and the
// designed-output exemplars are change-controlled artefacts rather than prompt
// text invented at wiring time.
//
// ── ARCHIVE MINING (source of the W-classes) ────────────────────────────────
// `quality_check_results`, tool = 'governance': 592 rows, 224 with
// fail_count > 0. Grouped by (check_id, cross_review_category) over
// fail_count > 0:
//
//   rubric_generic_boilerplate           gpt_only       36 rows /  75 fails
//   rubric_citation_misapplied           gpt_only       33 rows /  74 fails
//   ql2:governance                       (layer 2)      69 rows /  69 fails
//   rubric_unsupported_business_claim    gpt/claude     33 rows /  67 fails
//   rubric_actionability                 gpt_only       33 rows /  59 fails
//   e6_counsel_referral                  deterministic   5 rows /  22 fails
//   no_british_spelling                  deterministic   6 rows /  14 fails
//   rubric_internal_reasoning_leak       claude+gpt      4 rows /   9 fails
//   qc_r1_8_governance_additional_context deterministic  4 rows /   4 fails
//   rubric_governance_v2_shape_is_designed              1 row  /   1 fail
//
// Cross-review split over the failing rows: gpt_only 71 rows / 140 fails,
// claude_only 47 / 86, agree 22 / 59, deterministic 15 / 40, layer-2 69 / 69.
//
// Representative evidence carried into the W-classes below:
//   * domain findings that would read identically for any controller of the
//     size — no named tool, owner, date or record quotation (W1).
//   * recommended actions with neither an owner nor a trigger, and "review the
//     position" phrasing with nothing that ends it (W2).
//   * GDPR articles cited at article level for propositions their cited
//     paragraph does not carry; Art. 30(5) exemption reasoning attached to the
//     wrong limb (W3).
//   * claims about what the record contains that the intake contradicts —
//     "no DPO is designated" on a record naming one; a vendor count the intake
//     does not support (W4).
//   * counsel-referral sentences in body text and model reasoning about its own
//     process (W5).
//   * British spelling in a US-facing render (W6).
//   * the item400/402 class: an absence frame occupying a surface the record in
//     fact backs (W7).
//   * additional_context supplied but unused by any finding (W8).

export const GOVERNANCE_REFINEMENT_CONFIG_VERSION =
  "governance-refine-config-2026-08-07-item402";

export interface GovernanceWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

export const GOVERNANCE_WATCH_CLASSES: readonly GovernanceWatchClass[] = [
  {
    id: "W1",
    title: "Generic governance prose",
    archive_fails: 75,
    detector_hint:
      "a domain finding or synthesis passage that would read identically for any controller of the same size and sector — no named tool, owner, date, figure or record quotation.",
  },
  {
    id: "W2",
    title: "Recommendation without an owner or a trigger",
    archive_fails: 59,
    detector_hint:
      "a recommended action or remediation step that names no owner, no trigger and no point at which it is done.",
  },
  {
    id: "W3",
    title: "Citation without a pinpoint, or applied to the wrong proposition",
    archive_fails: 74,
    detector_hint:
      "a GDPR/UK GDPR provision cited at article level for a proposition the cited paragraph does not carry; Art. 30(5) exemption reasoning attached to a limb the record does not engage; an ICO Accountability Framework tracker element cited for a duty it does not state.",
  },
  {
    id: "W4",
    title: "Assertion about the record the record does not carry",
    archive_fails: 67,
    detector_hint:
      "a statement about what the intake contains that the intake contradicts: 'no DPO is designated' on a record that names one, a vendor or tool count the record does not support, a transfer position the record answers differently. Check both ways — an accurate statement about a genuinely silent record is CORRECT.",
  },
  {
    id: "W5",
    title: "Counsel referral or internal reasoning in body text",
    archive_fails: 31,
    detector_hint:
      "a 'review with qualified legal counsel' sentence anywhere outside the standing disclaimer, or model reasoning about its own process.",
  },
  {
    id: "W6",
    title: "British spelling in the customer render",
    archive_fails: 14,
    detector_hint:
      "recognise, organisation, behaviour, personalise, analyse and their family, in a US-only render. On an EU/UK render British English is DESIGNED OUTPUT.",
  },
  {
    id: "W7",
    title: "Absence frame on a backed surface",
    archive_fails: 9,
    detector_hint:
      "an absence sentence — 'the record does not state…', 'we could not verify this item…', 'not established from the information supplied' and their family — occupying a surface the record in fact backs (DPO, vendor/Art. 28, transfers, retention, training). An absence sentence about a GENUINELY silent surface is designed output and must be preserved.",
  },
  {
    id: "W8",
    title: "Supplied context never used",
    archive_fails: 4,
    detector_hint:
      "the record supplies additional_context and no finding, action or determination reflects any part of it.",
  },
];

/** The critic block, in the dpia/lia/admt idiom. Consumed in leg D. */
export const GOVERNANCE_CRITIC_WATCHLIST =
  `GOVERNANCE-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Generic governance prose: a domain finding or synthesis passage that would read identically for any controller of the same size and sector — no named tool, owner, date, figure or record quotation (history: 36 archive rows).
W2 Recommendation without an owner or a trigger: a recommended action or remediation step that names no owner, no trigger and no point at which it is done.
W3 Citation without a pinpoint, or applied to the wrong proposition: a GDPR/UK GDPR provision cited at article level for a proposition the cited paragraph does not carry; Art. 30(5) exemption reasoning attached to a limb the record does not engage; an ICO Accountability Framework tracker element cited for a duty it does not state.
W4 Assertion about the record the record does not carry: "no DPO is designated" on a record naming one; a vendor, tool or transfer position the record answers differently. Check the record both ways — an accurate statement about a genuinely silent record is CORRECT and must not be flagged.
W5 Counsel referral or internal reasoning in body text: a "review with qualified legal counsel" sentence anywhere outside the standing disclaimer; any model reasoning about its own process.
W6 British spelling in the customer render: recognise, organisation, behaviour, personalise, analyse and their family — on a US-only render. On an EU/UK render British English is designed output.
W7 Absence frame on a backed surface: an absence sentence ("the record does not state…", "we could not verify this item…", "not established from the information supplied") on a surface the record in fact backs — DPO, vendor/Art. 28, transfers, retention, training. An absence sentence about a genuinely silent surface is designed output and must be preserved.
W8 Supplied context never used: the record supplies additional_context and no finding, action or determination reflects any part of it.
W-COPYEDIT Assembly-seam copy defects (ITEM 399 R11; the perfect-exemplar register is the "after"): markdown or markup leaking into prose (**bold**, ## headings, backticks, bullet glyphs); a grammar break at a concatenation seam (a frame clause that does not accept the words the quotation actually begins with; a missing relative pronoun, as in "the gap is the reserved judgment must be exercised"); the SAME citation pinpoint repeated back to back inside one string; internal scaffolding surviving mid-sentence ("Owner:"); a Title-Case headline fragment jammed into a paragraph. Report the assembled string, not the builder. Never restyle a byte-pinned surface, a verbatim quotation, a banner or the standing disclaimer to satisfy this class.`;

/**
 * DESIGNED-OUTPUT EXEMPLARS — written against the item400 plan register
 * (`prose/plans/governance.spine.ts`) and the item402 record register.
 * A proposal that alters any of these is REJECTED by the verifier.
 */
export const GOVERNANCE_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-gov-1 — ONE READINESS VOICE. The readiness line is derived from the typed readiness_determination record and restated nowhere else. The approved shape is a single line ("Accountability partly evidenced") followed by the executive summary opening on the same position. A proposal that adds a second, differently-worded readiness claim to any surface — or that restores a maturity tier as a statutory conclusion — is a REGRESSION (see item 313).

xp-gov-2 — DETERMINATION-LED SECTIONS. Every section the item400 plan marks lead:"determination" opens with the determination in its first clause and cites the provision AFTER the position it supports. A proposal that moves the statutory quotation to the opening is a REGRESSION.

xp-gov-3 — HONEST DEGRADATION ON A SILENT RECORD. Where the record is genuinely silent, the surface names the intake field and the provision that makes it relevant, in the drafting voice. An absence sentence about a genuinely silent record is DESIGNED OUTPUT and must be preserved byte-for-byte.

xp-gov-4 — RECORD-STATES-ONLY REGISTER. The record register sentences ("The record states…", "It names…") report the record without evaluating it. A proposal that adds judgement to a register sentence is a REGRESSION.

Also protected: the standing disclaimer; quoted statutory, ICO and EDPB text; the plan's nine section titles and their order; the authority exhibit; drafting-voice references to "the record".`;

/** Surfaces refinement may never touch (leg-D consumption). */
export const GOVERNANCE_PROTECTED_ROOT_KEYS = [
  "disclaimer",
  "framework_disclaimer",
  "authority_exhibit",
  "citation_ledger",
  "enforcement_precedents",
  "enforcement_context",
  "enforcement_meta",
  "readiness_determination",
  "governance_readiness_line",
  "build_stamp",
  "prompt_version",
];

/** Protected leaf classes (leg-D consumption; enumerated for per-class tests). */
export const GOVERNANCE_PROTECTED_LEAF_KEYS = [
  // determination machinery — outcomes are never model-edited
  "verdict",
  "rule_ids",
  "rating",
  "rating_basis",
  "determined_from",
  // citation machinery
  "citation",
  "pinpoint",
  "standard",
  "benchmark_verbatim",
  "element_verbatim",
  "verbatim_quote",
  // gate + telemetry machinery
  "decision",
  "emit_gate",
  "build_stamp",
];
