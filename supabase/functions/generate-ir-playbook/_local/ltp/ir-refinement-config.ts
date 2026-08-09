// ITEM 416 LEG C — IR PLAYBOOK REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// CONFIG ONLY. Nothing in the IR pipeline imports this module in leg C; leg D
// wires it into the UNTOUCHABLE `refinement-core.ts` exactly as
// `dpia-refinement.ts`, `risk-refinement.ts`, `lia-refinement-config.ts`,
// `admt-refinement-config.ts`, `governance-refinement-config.ts`,
// `cyber-refinement-config.ts` and `biometric-refinement-config.ts` do for
// their products. It is checked in now so the watchlist and the
// designed-output exemplars are change-controlled artefacts rather than
// prompt text invented at wiring time.
//
// ── ARCHIVE MINING (source of the W-classes) ────────────────────────────────
// `quality_check_results`, tool = 'ir-playbook', mined 2026-08-09 against the
// live table. Grouped by (check_id, cross_review_category) over fail_count > 0:
//
//   rubric_generic_boilerplate         gpt_only       30 rows / 66 fails
//   ql2:ir-playbook                    (layer 2)      61 rows / 61 fails
//   rubric_citation_misapplied         gpt_only       18 rows / 31 fails
//   rubric_unsupported_business_claim  claude_only    10 rows / 22 fails
//   rubric_actionability               gpt_only       16 rows / 21 fails
//   rubric_citation_misapplied         claude_only     8 rows / 11 fails
//   rubric_unsupported_business_claim  gpt_only        6 rows /  9 fails
//   e1_section_present                 deterministic   2 rows /  9 fails
//   rubric_internal_reasoning_leak     claude_only     5 rows /  8 fails
//   rubric_actionability               agree           2 rows /  6 fails
//   rubric_generic_boilerplate         agree           2 rows /  6 fails
//   rubric_citation_misapplied         agree           1 row  /  5 fails
//   e3_tbc_unclosed                    deterministic   3 rows /  5 fails
//   no_british_spelling                deterministic   1 row  /  4 fails
//   e1_section_order                   deterministic   1 row  /  1 fail
//   rubric_internal_reasoning_leak     gpt_only        1 row  /  1 fail
//   e6_counsel_referral                deterministic   1 row  /  1 fail
//
// Check-level totals over the failing rows: rubric_generic_boilerplate 78,
// rubric_citation_misapplied 47, rubric_unsupported_business_claim 31,
// rubric_actionability 27, ql2:ir-playbook 61, internal_reasoning_leak 9,
// deterministic e-checks 20.
//
// Representative archive evidence carried into the W-classes (verbatim
// fragments from `sample_evidence` / `gpt_sample_evidence`):
//   * "generic GDPR breach response guidance … without tailoring analysis to
//     Meridian Hea[lth]…" and "'Notify senior legal and privacy leadership'
//     and 'Initiate technical containment measures' … could [apply to any
//     organisation]" (W1)
//   * "'Retain an independent digital forensics firm.'" — a step with no
//     recorded object (W1/W4)
//   * "The document cites 'GDPR Article 28(3)(f)' as containing 'the
//     obligation to assist the controller in ensuring compliance with Articles
//     33 and 34.'" — Art. 28(3)(f) is the audit/assistance provision, not that
//     obligation (W2)
//   * "45 C.F.R. §164.408(a)" cited for media notification, which is
//     § 164.406; § 164.408 is the HHS/Secretary notification (W2)
//   * "This enforcement action and its details cannot be verified against
//     known primary sources and may be fabricated" — a €5,000 DPC decision
//     with a specific URL (W3)
//   * "this element was added by the A8872A amendment and is now …" — an
//     amendment history the corpus does not carry (W3)
//   * "'Initiate the HIPAA Breach Risk Assessment' … lack[s] specific triggers
//     or timelines"; "no concrete recommendations such as notification
//     templates, deadlines (e.g., the 30-day Cal. Civ. Code § 1798.82
//     individual notice deadline…)" (W4)
//   * '"lint_warnings":[{"code":"upper_enum_in_prose",…}]' surfacing in
//     customer-facing output (W5)
//   * `e3_tbc_unclosed` — "[TO BE COMPLETED] deferral(s) lack an adjacent
//     statutory anchor" (W6)
//   * `e1_section_present` / `e1_section_order` — a standing-playbook section
//     missing or out of its fixed order (W7)
//   * the item414/416 class: an absence sentence on a playbook section the
//     record in fact answers (W8).

export const IR_REFINEMENT_CONFIG_VERSION =
  "ir-refine-config-2026-08-09-item416";

export interface IrWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

export const IR_WATCH_CLASSES: readonly IrWatchClass[] = [
  {
    id: "W1",
    title: "Breach-response guidance that fits any incident",
    archive_fails: 78,
    detector_hint:
      "'Notify senior legal and privacy leadership', 'Initiate technical containment measures', 'Retain an independent digital forensics firm', a description-of-the-breach paragraph that never names the recorded cause, data types, count or systems. Every step names the recorded cause, the recorded data types, the recorded systems or the named contact it operates on.",
  },
  {
    id: "W2",
    title: "Notification provision cited at the wrong pinpoint",
    archive_fails: 47,
    detector_hint:
      "GDPR Article 28(3)(f) offered as the processor's duty to assist with Articles 33 and 34 (that is Art. 28(3)(f)'s assistance clause read past its scope); 45 C.F.R. § 164.408(a) cited for media notification when § 164.408 is notification to the Secretary and § 164.406 is the media provision; a state breach statute's day-count attached to the wrong subsection. The HIPAA anchor discipline of the item414 spine governs: § 164.404 individuals, § 164.406 media, § 164.408 the Secretary, § 164.410 business associates.",
  },
  {
    id: "W3",
    title: "Precedent or amendment history the corpus does not carry",
    archive_fails: 31,
    detector_hint:
      "a named enforcement decision with a fine figure and a URL that no enrolled row supports; 'added by the A8872A amendment'; a regulator's practice asserted from outside the record and the corpus. Enforcement material comes only from the enrolled rows supplied to the generation, and each annotation must state a proposition the underlying decision actually decided.",
  },
  {
    id: "W4",
    title: "Response step without a trigger, an owner or a deadline",
    archive_fails: 27,
    detector_hint:
      "'Initiate the HIPAA Breach Risk Assessment' with no trigger and no clock; a notification duty stated without its statutory deadline (the 72-hour Art. 33(1) clock, the 30-day Cal. Civ. Code § 1798.82 individual-notice deadline, the HIPAA 60-day outer limit); a checklist cell with no owner where the record supplies the roster. A deferral is legitimate ONLY where the record is silent, and then it carries its statutory anchor.",
  },
  {
    id: "W5",
    title: "Pipeline internals in customer-facing text",
    archive_fails: 9,
    detector_hint:
      "lint_warnings, rule ids ('r1b2-post-check'), telemetry JSON, severity/auto_fixed tokens, or model reasoning about its own process surfacing in the playbook or the worksheet. All such material belongs to `_meta.internal` and nowhere else.",
  },
  {
    id: "W6",
    title: "Unanchored deferral in the standing playbook",
    archive_fails: 5,
    detector_hint:
      "the IR-4 standing placeholder standing alone, with no adjacent statement of the duty it defers and no statutory anchor. The placeholder is designed output; an UNANCHORED placeholder is the defect (`e3_tbc_unclosed`).",
  },
  {
    id: "W7",
    title: "Standing-playbook section missing or out of order",
    archive_fails: 10,
    detector_hint:
      "a section of the fixed standing-playbook spine absent, or emitted out of its declared order (`e1_section_present`, `e1_section_order`). Section identity and order are structural; a refinement proposal never adds, removes or reorders a section.",
  },
  {
    id: "W8",
    title: "Absence frame on a section the record answers",
    archive_fails: 61,
    detector_hint:
      "an absence sentence — 'the organisation has not yet recorded what it requires', 'the determination cannot be made', 'is not answerable from what the organisation has recorded' — on an activation, severity, roster, contacts, evidence, contractual-notification or tabletop section whose backing intake keys are in fact answered. An absence sentence about a genuinely unanswered question is designed output and must be preserved byte-for-byte.",
  },
];

/** The critic block, in the admt/governance/cyber/biometric idiom. Leg D. */
export const IR_CRITIC_WATCHLIST =
  `IR-PLAYBOOK-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Breach-response guidance that fits any incident: "Notify senior legal and privacy leadership", "Initiate technical containment measures", "Retain an independent digital forensics firm", or a breach description that never names the recorded cause, data types, affected counts or systems (history: 78 archive fails).
W2 Notification provision cited at the wrong pinpoint: GDPR Article 28(3)(f) offered as the processor's Articles 33/34 assistance duty; 45 C.F.R. § 164.408(a) cited for media notification when § 164.406 is the media provision and § 164.408 is notification to the Secretary; a state day-count attached to the wrong subsection.
W3 Precedent or amendment history the corpus does not carry: a named decision with a fine and a URL no enrolled row supports; an amendment lineage asserted from outside the record; an annotation stating a proposition the underlying decision did not decide.
W4 Response step without a trigger, an owner or a deadline: a duty stated without its clock (Art. 33(1) 72 hours, Cal. Civ. Code § 1798.82's 30 days, HIPAA's 60-day outer limit), or a checklist cell with no owner where the record supplies the roster.
W5 Pipeline internals in customer-facing text: lint_warnings, rule ids, telemetry JSON, severity tokens, or model reasoning about its own process anywhere in the playbook or the worksheet.
W6 Unanchored deferral: the standing placeholder with no adjacent duty statement and no statutory anchor. The placeholder itself is designed output; the missing anchor is the defect.
W7 Standing-playbook section missing or out of order: section identity and order are structural. Never propose adding, removing or reordering a section.
W8 Absence frame on a section the record answers: an absence sentence on an activation, severity, roster, contacts, evidence, contractual-notification or tabletop section whose backing intake keys are answered. Check the record both ways — an absence sentence about a genuinely unanswered question is designed output and must be preserved byte-for-byte.
W-COPYEDIT Assembly-seam copy defects (ITEM 399 R11; the perfect-exemplar register is the "after"): markdown or markup leaking into prose (**bold**, ## headings, backticks, bullet glyphs); a grammar break at a concatenation seam; the SAME citation pinpoint repeated back to back inside one string; internal scaffolding surviving mid-sentence ("Owner:"); a Title-Case headline fragment jammed into a paragraph. Report the assembled string, not the builder. NEVER restyle a quotation, a citation, the attestation block or the standing disclaimer to satisfy this class.`;

/**
 * DESIGNED OUTPUT. These are deliberate product decisions, not defects. A
 * refinement proposal that alters any of them is REJECTED by the verifier.
 */
export const IR_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-ir-1 — TWO ARTIFACTS, TWO VOICES (item369/item414). This product emits a STANDING PLAYBOOK (a durable reference the organisation keeps) and an INCIDENT WORKSHEET (a form filled at the time of an incident). The worksheet is BLANK BY DESIGN: an empty worksheet field is correct output, never a gap, and "filling it in" from the record is a REGRESSION.

xp-ir-2 — THE SINGLE ABSENCE LEDGER (item414 IR-1). Where the record is silent, the playbook says so ONCE, in one ledger sentence naming what it still needs, instead of repeating "Not recorded" cell by cell. Re-scattering absence phrasing across the sections is a REGRESSION.

xp-ir-3 — THE STANDING PLACEHOLDER (item414 IR-4). "To be completed by the organisation" is the deliberate wording for a durable reference the organisation must localise. Replacing it with invented content, or with "[TO BE COMPLETED]", is a REGRESSION.

xp-ir-4 — HIPAA ANCHOR DISCIPLINE (item414). § 164.404 individuals, § 164.406 media, § 164.408 the Secretary, § 164.410 business associates. Each duty is anchored to its own provision and to no other; moving an anchor is a REGRESSION even when the surrounding sentence reads better.

xp-ir-5 — DETERMINATION MACHINERY IS NOT PROSE. Decision enums, rule ids, deadline arithmetic outputs and the Art. 33/34 determination fields are machine surfaces. A proposal that rewrites, softens or re-words a determination value is a REGRESSION; only the explanatory prose around it is refinable.

xp-ir-6 — SECTION SPINE IS FIXED. The standing playbook's section identities and their order are structural (see W7). A proposal never adds, removes, merges or reorders a section.`;
