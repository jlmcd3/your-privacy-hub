// ITEM 406 LEG C — CPPA CYBER REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// CONFIG ONLY. Nothing in the cyber pipeline imports this module in leg C;
// leg D wires it into `refinement-core.ts` exactly as `dpia-refinement.ts`,
// `risk-refinement.ts`, `lia-refinement-config.ts`, `admt-refinement-config.ts`
// and `governance-refinement-config.ts` do for their products. It is checked in
// now so the watchlist and the designed-output exemplars are change-controlled
// artefacts rather than prompt text invented at wiring time.
//
// ── ARCHIVE MINING (source of the W-classes) ────────────────────────────────
// `quality_check_results`, tool = 'cppa-cyber', mined 2026-08-08 against the
// live table: 995 rows, 266 with fail_count > 0. Grouped by
// (check_id, cross_review_category) over fail_count > 0:
//
//   rubric_generic_boilerplate           gpt_only       49 rows / 132 fails
//   rubric_actionability                 gpt_only       35 rows /  86 fails
//   rubric_citation_misapplied           gpt_only       31 rows /  64 fails
//   ql2:cppa-cyber                       (layer 2)      64 rows /  64 fails
//   rubric_unsupported_business_claim    claude_only    30 rows /  54 fails
//   rubric_unsupported_business_claim    gpt_only       10 rows /  22 fails
//   rubric_actionability                 claude_only    13 rows /  22 fails
//   rubric_citation_misapplied           claude_only    11 rows /  19 fails
//   rubric_generic_boilerplate           agree           5 rows /  10 fails
//   rubric_internal_reasoning_leak       claude_only     5 rows /  10 fails
//   rubric_actionability                 agree           4 rows /   4 fails
//   e6_counsel_referral                  deterministic   2 rows /   4 fails
//   rubric_unsupported_business_claim    agree           2 rows /   3 fails
//   rubric_internal_reasoning_leak       gpt_only        2 rows /   2 fails
//   rubric_citation_misapplied           agree           2 rows /   2 fails
//   rubric_generic_boilerplate           claude_only     1 row  /   1 fail
//
// Check-level totals over the failing rows: rubric_generic_boilerplate 55/143,
// rubric_actionability 52/112, rubric_citation_misapplied 44/85,
// rubric_unsupported_business_claim 42/79, ql2:cppa-cyber 64/64,
// rubric_internal_reasoning_leak 7/12, e6_counsel_referral 2/4.
// Cross-review split over the failing rows: gpt_only 127, claude_only 60,
// agree 13, deterministic 2, layer-2 64.
//
// Representative archive evidence carried into the W-classes below (verbatim
// fragments from `sample_evidence` / `gpt_sample_evidence`):
//   * "The majority of controls (c3 through c16, c18) share near-identical
//     finding language: 'The intake records [X] as documented and subject to
//     quarterly review, supported by a policy/procedure document and a
//     runbook/SOP.'" (W1)
//   * "Remediation guidance frequently defaults to 'Retain and make audit-ready
//     the documentation' without specifying responsible owners, concrete
//     deadlines, or measurable success criteria." and "'further clarification
//     is advisable' … are vague" (W2)
//   * "corresponding to the NIST CSF 2.0 provides comparative guidance on and
//     Identify functions; the operative requirement is 11 CCR § 7123(c)(15)"
//     — the item404 defect (b) class (W3)
//   * "Multiple controls cite '45 CFR Part 164' as 'comparative context' … the
//     citation is applied at an imprecise level" and § 7123(e) anchored to a
//     BUSINESS-side retention duty (W4)
//   * "The executive summary states 'a mean score of 81 across all 18 scored
//     components'" — the item404 defect (a) class (W5)
//   * "The intake's profile field incidents_12mo is 'None', yet the intake's
//     c17_incident notes describe …" — a claim the record contradicts (W6)
//   * "body-text counsel referral: 'Within 90 days 11 CCR § 7123(c)(15) …
//     approved by Legal Counsel …'" and model reasoning about its own process
//     (W7)
//   * the item404/406 class: an absence sentence on a component the record in
//     fact describes (W8).

export const CYBER_REFINEMENT_CONFIG_VERSION =
  "cyber-refine-config-2026-08-07-item406";

export interface CyberWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

export const CYBER_WATCH_CLASSES: readonly CyberWatchClass[] = [
  {
    id: "W1",
    title: "Near-identical component findings",
    archive_fails: 143,
    detector_hint:
      "a per-component finding or remediation that repeats the same template across components — 'The intake records [X] as documented and subject to quarterly review, supported by a policy/procedure document and a runbook/SOP' — with no named system, vendor, artefact, figure, cadence or date drawn from that component's own record entry.",
  },
  {
    id: "W2",
    title: "Remediation without an owner, a trigger or a completion test",
    archive_fails: 112,
    detector_hint:
      "'Retain and make audit-ready the documentation…' or 'further clarification is advisable' with no owner, no trigger and nothing that says when it is done. Every remediation names the artefact that closes it.",
  },
  {
    id: "W3",
    title: "Comparative framework spliced into the operative sentence",
    archive_fails: 64,
    detector_hint:
      "the item404 defect (b) class: a NIST CSF / ISO 27001 / SOC 2 function name swallowed by an operative verb ('the NIST CSF 2.0 provides comparative guidance on and Identify functions'). A comparative framework is named AS comparative, in its own clause, and never as the operative requirement.",
  },
  {
    id: "W4",
    title: "Citation at the wrong depth or the wrong duty-holder",
    archive_fails: 85,
    detector_hint:
      "11 CCR § 7123(c) cited at subdivision level for a proposition its numbered component does not carry; the BUSINESS's documentation-retention duty anchored to § 7123(e) (the auditor's duty) instead of § 7122(g); '45 CFR Part 164' or a comparative anchor cited at a depth the text does not support.",
  },
  {
    id: "W5",
    title: "Arithmetic about the eighteen components inside a sentence",
    archive_fails: 79,
    detector_hint:
      "the item404 defect (a) class: 'a mean score of 81 across all 18 scored components', 'Mean of 81…', an aggregate or count recited in prose. The tally lives in the typed control_status_counts object; prose points at it and never recites it.",
  },
  {
    id: "W6",
    title: "Assertion about the record the record does not carry",
    archive_fails: 79,
    detector_hint:
      "a component, incident or evidence claim the intake answers differently — an incident narrative that contradicts profile.incidents_12mo, an artefact the record does not name, a count of systems the record does not support. Check the record both ways: an accurate statement about a genuinely silent component is CORRECT and must not be flagged.",
  },
  {
    id: "W7",
    title: "Counsel referral or internal reasoning in body text",
    archive_fails: 16,
    detector_hint:
      "a 'review with qualified legal counsel' sentence anywhere outside the standing disclaimer and the § 7121(a) reserved-to-customer sentence, or model reasoning about its own process.",
  },
  {
    id: "W8",
    title: "Absence frame on a component the record describes",
    archive_fails: 64,
    detector_hint:
      "an absence sentence — 'the intake supplies no artefact for this component', 'the record does not yet carry…', 'not determinable on this record' — on a component, on the audit-readiness surface, on third-party oversight, incident response or training where the record in fact supplies notes, maturity or evidence. An absence sentence about a genuinely silent component is designed output and must be preserved byte-for-byte.",
  },
];

/** The critic block, in the admt/governance idiom. Consumed in leg D. */
export const CYBER_CRITIC_WATCHLIST =
  `CYBER-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Near-identical component findings: a per-component finding or remediation repeating one template across components ("The intake records [X] as documented and subject to quarterly review, supported by a policy/procedure document and a runbook/SOP") with no named system, vendor, artefact, figure, cadence or date from that component's own record entry (history: 55 archive rows).
W2 Remediation without an owner, a trigger or a completion test: "Retain and make audit-ready the documentation…" or "further clarification is advisable" naming no owner, no trigger and no point at which it is done.
W3 Comparative framework spliced into the operative sentence: a NIST CSF / ISO 27001 / SOC 2 function name swallowed by an operative verb ("the NIST CSF 2.0 provides comparative guidance on and Identify functions"). A comparative framework is named AS comparative, in its own clause, never as the operative requirement.
W4 Citation at the wrong depth or the wrong duty-holder: § 7123(c) cited at subdivision level for a proposition its numbered component does not carry; the business's documentation-retention duty anchored to § 7123(e) (the auditor's duty) rather than § 7122(g); a comparative anchor cited deeper than its text supports.
W5 Arithmetic about the eighteen components inside a sentence: "a mean score of 81 across all 18 scored components", "Mean of 81…", any aggregate or count recited in prose. The tally lives in the typed control_status_counts object; prose points at it and never recites it.
W6 Assertion about the record the record does not carry: an incident narrative that contradicts profile.incidents_12mo, an artefact the record does not name, a system count the record does not support. Check the record both ways — an accurate statement about a genuinely silent component is CORRECT and must not be flagged.
W7 Counsel referral or internal reasoning in body text: any "review with qualified legal counsel" sentence outside the standing disclaimer and the § 7121(a) reserved-to-customer sentence; any model reasoning about its own process.
W8 Absence frame on a component the record describes: "the intake supplies no artefact for this component", "the record does not yet carry…", "not determinable on this record" on a component, on audit readiness, on third-party oversight, incident response or training that the record in fact answers. An absence sentence about a genuinely silent component is designed output and must be preserved.
W-COPYEDIT Assembly-seam copy defects (ITEM 399 R11; the perfect-exemplar register is the "after"): markdown or markup leaking into prose (**bold**, ## headings, backticks, bullet glyphs); a grammar break at a concatenation seam (a frame clause that does not accept the words the quotation actually begins with; a missing relative pronoun, as in "the gap is the reserved judgment must be exercised"); the SAME citation pinpoint repeated back to back inside one string; internal scaffolding surviving mid-sentence ("Owner:"); a Title-Case headline fragment jammed into a paragraph. Report the assembled string, not the builder. Never restyle a byte-pinned surface, a verbatim quotation, a banner or the standing disclaimer to satisfy this class.`;

/**
 * DESIGNED-OUTPUT EXEMPLARS — written against the item404 plan register
 * (`prose/plans/cyber.spine.ts`) and the item406 record register. A proposal
 * that alters any of these is REJECTED by the verifier.
 */
export const CYBER_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-cyber-1 — ONE READINESS VOICE (item404 CY-1). The readiness line is derived from the typed readiness_determination and the executive summary opens on it. Restating readiness as a score, or opening the summary on the record instead of the finding, is a REGRESSION.

xp-cyber-2 — THE TYPED TALLY (item404 CY-2/CY-3). The eighteen § 7123(c) components tally in control_status_counts, with the methodology note attached; prose points at the tally and never recites a mean, a count or a denominator. Re-inserting arithmetic into a sentence is a REGRESSION.

xp-cyber-3 — COMPARATIVE IS COMPARATIVE (item404 CY-4). NIST CSF, ISO 27001 and SOC 2 are named in their own clause as comparative guidance; the operative requirement is always the 11 CCR § 7123(c) component. Merging the two is a REGRESSION.

xp-cyber-4 — HONEST DEGRADATION. Where a component's record entry is genuinely silent, the finding names the component, what the record does not supply, and the subsection that makes it relevant. Rewriting that sentence into a positive claim is a REGRESSION; so is leaving an absence sentence on a component the record describes.

xp-cyber-5 — THE § 7121(a) SCHEDULE IS BYTE-PINNED. The phase-in schedule, the resolved-cohort sentence and the reserved-to-customer-and-counsel framing are corpus-pinned literals (ltp/cyber-audit-schedule.ts). Restyling, shortening or recomputing any of them — including the § 7122 independence framing — is a REGRESSION.

Also protected: the standing disclaimer; quoted statutory text and the authority exhibit; the plan's nine section titles and their order (prose/plans/cyber.spine.ts); the enum-label maps in ltp/cyber-prose-gold.ts.`;
