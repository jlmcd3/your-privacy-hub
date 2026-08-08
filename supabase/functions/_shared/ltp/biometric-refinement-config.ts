// ITEM 411 LEG C — BIOMETRIC REFINEMENT CONFIG (AUTHORED, NOT WIRED).
//
// CONFIG ONLY. Nothing in the biometric pipeline imports this module in leg C;
// leg D wires it into `refinement-core.ts` exactly as `dpia-refinement.ts`,
// `risk-refinement.ts`, `lia-refinement-config.ts`, `admt-refinement-config.ts`,
// `governance-refinement-config.ts` and `cyber-refinement-config.ts` do for
// their products. It is checked in now so the watchlist and the
// designed-output exemplars are change-controlled artefacts rather than prompt
// text invented at wiring time.
//
// ── ARCHIVE MINING (source of the W-classes) ────────────────────────────────
// `quality_check_results`, tool = 'biometric-checker', mined 2026-08-08
// against the live table: 315 rows, 154 with fail_count > 0. Grouped by
// (check_id, cross_review_category) over fail_count > 0:
//
//   ql2:biometric                        (layer 2)      58 rows /  58 fails
//   rubric_generic_boilerplate           agree          18 rows /  45 fails
//   rubric_citation_misapplied           claude_only    12 rows /  39 fails
//   rubric_generic_boilerplate           gpt_only        9 rows /  30 fails
//   rubric_actionability                 claude_only    13 rows /  24 fails
//   rubric_unsupported_business_claim    claude_only    14 rows /  21 fails
//   rubric_actionability                 gpt_only        5 rows /  13 fails
//   rubric_citation_misapplied           gpt_only        4 rows /  10 fails
//   rubric_citation_misapplied           agree           4 rows /   9 fails
//   rubric_actionability                 agree           6 rows /   8 fails
//   no_british_spelling                  deterministic   1 row  /   5 fails
//   rubric_generic_boilerplate           claude_only     2 rows /   5 fails
//   rubric_unsupported_business_claim    agree           1 row  /   4 fails
//   rubric_internal_reasoning_leak       gpt_only        3 rows /   3 fails
//   rubric_unsupported_business_claim    gpt_only        2 rows /   3 fails
//   rubric_internal_reasoning_leak       claude_only     2 rows /   2 fails
//
// Check-level totals over the failing rows: rubric_generic_boilerplate 29/80,
// rubric_citation_misapplied 20/58, rubric_actionability 24/45,
// rubric_unsupported_business_claim 17/28, ql2:biometric 58/58,
// rubric_internal_reasoning_leak 5/5, no_british_spelling 1/5.
// Cross-review split over the failing rows: claude_only 41, gpt_only 23,
// agree 29, deterministic 1, layer-2 58.
//
// Representative archive evidence carried into the W-classes below (verbatim
// fragments from `sample_evidence` / `gpt_sample_evidence`):
//   * "The report lists five 'top_candidate_statutes' but provides no analysis
//     tailored to Rocky Mountain Retail's specific facts (employer fingerprint
//     time-and-attendance). The candidate list reads as a generic inventory of
//     US biometric statutes…" (W1)
//   * "The report states '§ 503.001(c)(3): destroy biometric identifiers
//     within a reasonable time, no later than one year after the PURPOSE FOR
//     COLLECTION EXPIRES'. Texas CUBI § 503.001(c)(3) actually requires
//     destruction 'within a reasonable time, but not later than the first
//     anniversary of the date the purpose…'" (W2)
//   * "The report states 'Destroy biometric data when purpose expires or
//     within 3 years of collection, whichever is first' under BIPA retention.
//     BIPA Section 15(a) actually requires destruction when the initial
//     purpose has been satisfied OR within 3 years of the individual's last
//     interaction…" (W2)
//   * "The report cites Washington MHMD — 'RCW ch. 19.373 (consumer health
//     data where biometrics infer health status)' — as a top candidate for an
//     employer fingerprint time-and-attendance use case." (W3)
//   * "Priority actions: 3. Audit vendor contracts to confirm no biometric
//     data is shared…" and "Suggested owner (confirm): the HR lead… Timeframe:
//     before any biometric collection from the first affected employee" — the
//     owner/timeframe suffix present but the action itself unspecific (W4)
//   * "'Based on 2,500 enrolled individuals (midpoint of the stated 500-5000
//     range)' … several factual claims about case law and legislative
//     amendments that cannot be verified" (W5)
//   * "British spelling: organisation, analyse" — the deterministic
//     `no_british_spelling` check, five fails on one row (W6)
//   * model reasoning about its own process surfacing in body text (W7)
//   * the item409/411 class: an absence sentence on a duty, identifier or
//     entity surface the record in fact answers (W8).

export const BIOMETRIC_REFINEMENT_CONFIG_VERSION =
  "biometric-refine-config-2026-08-08-item412";


export interface BiometricWatchClass {
  readonly id: string;
  readonly title: string;
  readonly archive_fails: number;
  readonly detector_hint: string;
}

export const BIOMETRIC_WATCH_CLASSES: readonly BiometricWatchClass[] = [
  {
    id: "W1",
    title: "Candidate-statute inventory instead of reasoning on this record",
    archive_fails: 80,
    detector_hint:
      "a list of candidate statutes ('top_candidate_statutes', an extensive catalogue of California, Colorado, Connecticut, Virginia, Utah, Oregon…) recited without reasoning from THIS record's modality, org type and purpose; a jurisdiction section whose requirements would read identically for any employer capturing any modality. Every requirement names the recorded modality, the recorded purpose and the recorded practice it bears on.",
  },
  {
    id: "W2",
    title: "Statutory rule restated at the wrong measure",
    archive_fails: 58,
    detector_hint:
      "CUBI § 503.001(c)(3) rendered as 'no later than one year after the purpose expires' rather than the statute's 'not later than the first anniversary of the date the purpose … expires'; BIPA § 15(a) rendered as 'within 3 years of collection' rather than 'when the initial purpose has been satisfied or within 3 years of the individual's last interaction'; a CPA subsection letter asserted at a depth the enrolled text does not carry. The reference passage is the template: the rule is quoted from it, never paraphrased into a different measure.",
  },
  {
    id: "W3",
    title: "Regime applied outside its own predicate",
    archive_fails: 58,
    detector_hint:
      "RCW ch. 19.373 (MHMDA, consumer health data) applied to an employer time-and-attendance fingerprint record whose intake does not state a health inference; GDPR Article 9(2)(h) offered to an entity the record does not put in the health-care sector; a GLBA or HIPAA carve-out invoked where the record answers the predicate question 'No'. Every regime is reached only through the predicate the intake actually answers.",
  },
  {
    id: "W4",
    title: "Priority action without a record-specific object",
    archive_fails: 45,
    detector_hint:
      "'Audit vendor contracts to confirm no biometric data is shared…', 'Implement notice-and-consent workflow before any biometric capture', 'Execute written releases before any biometric collection' — an owner and a timeframe may be appended and the action is still unspecific. Every action names the recorded system, recipient, artefact or policy it operates on.",
  },
  {
    id: "W5",
    title: "Claim the record and the corpus cannot both support",
    archive_fails: 28,
    detector_hint:
      "a derived population figure ('2,500 enrolled individuals, midpoint of the stated 500-5000 range'), an unverifiable case-law or amendment assertion, a penalty exposure computed from a headcount the record does not state. Figures come from the record; law comes from the reference passages.",
  },
  {
    id: "W6",
    title: "British spelling in a US-statute document",
    archive_fails: 5,
    detector_hint:
      "'organisation', 'analyse', 'behaviour' and their family in a document whose operative law is US state statute. The deterministic `no_british_spelling` check owns this class; a proposal must not re-introduce it.",
  },
  {
    id: "W7",
    title: "Counsel referral or internal reasoning in body text",
    archive_fails: 5,
    detector_hint:
      "a 'review with qualified legal counsel' sentence anywhere outside the standing disclaimer, or model reasoning about its own process, its confidence, or what it was asked to do.",
  },
  {
    id: "W8",
    title: "Absence frame on a surface the record answers",
    archive_fails: 58,
    detector_hint:
      "an absence sentence — 'the record does not settle this', 'the record does not yet support a conclusion', 'the intake supplies no…', 'not determinable on this record' — on a duty, identifier, entity or attestation surface where the intake in fact answers the backing question. An absence sentence about a genuinely unanswered question is designed output and must be preserved byte-for-byte.",
  },
];

/** The critic block, in the admt/governance/cyber idiom. Consumed in leg D. */
export const BIOMETRIC_CRITIC_WATCHLIST =
  `BIOMETRIC-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Candidate-statute inventory instead of reasoning on this record: a recited catalogue of US biometric statutes, or a jurisdiction section whose requirements would read identically for any employer capturing any modality, with nothing drawn from the recorded modality, purpose or practice (history: 29 archive rows).
W2 Statutory rule restated at the wrong measure: CUBI § 503.001(c)(3) as "no later than one year after the purpose expires" instead of "not later than the first anniversary of the date the purpose … expires"; BIPA § 15(a) as "within 3 years of collection" instead of "when the initial purpose has been satisfied or within 3 years of the individual's last interaction"; a subsection letter asserted deeper than the enrolled text supports.
W3 Regime applied outside its own predicate: MHMDA (RCW ch. 19.373) applied to an employer time-and-attendance record with no recorded health inference; Article 9(2)(h) offered to an entity the record does not put in health care; a GLBA or HIPAA carve-out invoked where the record answers the predicate "No".
W4 Priority action without a record-specific object: "Audit vendor contracts…", "Implement notice-and-consent workflow…", "Execute written releases…" — an appended owner and timeframe do not cure an action that names no recorded system, recipient, artefact or policy.
W5 Claim the record and the corpus cannot both support: a derived population midpoint, an unverifiable case-law or amendment assertion, a penalty exposure computed from a headcount the record does not state.
W6 British spelling in a US-statute document: "organisation", "analyse", "behaviour" and their family. The deterministic no_british_spelling check owns this class.
W7 Counsel referral or internal reasoning in body text: a "review with qualified legal counsel" sentence outside the standing disclaimer, or model reasoning about its own process.
W8 Absence frame on a surface the record answers: an absence sentence on a duty, identifier, entity or attestation surface whose backing intake question is in fact answered. Check the record both ways — an absence sentence about a genuinely unanswered question is designed output and must be preserved byte-for-byte.
W-COPYEDIT Assembly-seam copy defects (ITEM 399 R11; the perfect-exemplar register is the "after"): markdown or markup leaking into prose (**bold**, ## headings, backticks, bullet glyphs); a grammar break at a concatenation seam (a frame clause that does not accept the words the quotation actually begins with; a missing relative pronoun); the SAME citation pinpoint repeated back to back inside one string; internal scaffolding surviving mid-sentence ("Owner:", "Suggested owner (confirm):"); a Title-Case headline fragment jammed into a paragraph. Report the assembled string, not the builder. NEVER restyle a reference passage, a verbatim quotation, a citation, the attestation block or the standing disclaimer to satisfy this class — a reference passage is byte-pinned to its corpus row and a seam defect adjacent to one is fixed on the surrounding words only.`;

/**
 * DESIGNED OUTPUT. These are deliberate product decisions, not defects. A
 * refinement proposal that alters any of these is REJECTED by the verifier.
 */
export const BIOMETRIC_VERIFIER_EXEMPLARS =
  `DESIGNED-OUTPUT PATTERNS (deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED):

xp-bio-1 — STATUTE AS TEMPLATE (item409). Every statutory passage is rendered byte-identical to its verified corpus row (prose/biometric-reference-passages.ts). Restyling, shortening, "modernising" or paraphrasing a quoted passage is a REGRESSION, and so is moving a quotation mark.

xp-bio-2 — VERDICT-LED OPENINGS (item409 BG-1). The determination takes the sentence's first position and the intake qualifier follows it ("This framework applies to the processing described, conditionally on the intake as supplied. The organisation is …"). Re-fronting the qualifier is a REGRESSION.

xp-bio-3 — NO BARE ENUMS (item409 BG-3). Contract option strings ("Employer (employee biometrics)", "Fingerprint / palm print", "Time & attendance / workforce management") never appear bare in prose; they appear in their decoded register. Re-inserting the raw option, or a field-label colon, is a REGRESSION.

xp-bio-4 — SEPARATION OF DUTY AND CONSEQUENCE (items 308/310/312). A duty finding says what the statute requires and whether the record shows it, and says nothing about damages, penalties or private suits; that material lives only in consequence_determination. Bleeding exposure back into a duty finding is a REGRESSION.

xp-bio-5 — HONEST DEGRADATION. Where the record genuinely does not answer a duty's backing question, the finding degrades to record_insufficient and names what is missing. Rewriting that into a positive claim is a REGRESSION; so is leaving an absence sentence on a surface the record answers.

Also protected: the standing disclaimer; the four-part finding shape (standard → record fact → application → verdict); every citation and pinpoint; the statute keys and jurisdiction labels; the plan's section titles and their order (prose/plans/biometric.spine.ts); the enum-decoding maps in ltp/biometric-prose-gold.ts.`;
