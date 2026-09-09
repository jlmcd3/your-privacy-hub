// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, ADMT. ADMT's
// ADMT_HOOK_SHAPES/etc. are `[RATIFY — DRAFT, unratified]` (ADMT_HOOKS ships
// `[]`), so this build edits them in place. Two candidates from doc 236,
// both "CEO approved the prose (2026-09-09)", chosen because their sections
// are ALREADY wired in SECTION_FOR_ELEMENT (the Governance rows G1–G3 have
// no attachment point yet — doc 236 §3/§8.2's own [NEEDS]; out of scope per
// doc 237 §5 item 9):
//   - "Notice content" (§ 7220(c)(1), existing row notice-content/01, FSOR).
//   - E1 (Garante, Friuli Occidentale, foreign enforcement).
//
// DOC 238 FOLLOW-UP (2026-09-09, the hedge): the generic
// ADMT_HEDGE_DOMESTIC_FACTS_PROPOSED / ADMT_HEDGE_FOREIGN_ANALOGY_PROPOSED
// constants are gone — neither sentence appears in any approved document.
// Each fixture below carries ITS OWN approved hedge sentence, copied
// verbatim from doc 236, in `hedge_sentence`; `hedge_variant` is
// classification only. Each fixture's `governing_provision_sentence` is
// likewise the approved paragraph's own sentence, verbatim (doc 238's first
// cut had reworded notice-content/01's).

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { citationFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import { ADMT_HOOK_SHAPES } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

// ── "Notice content" — FSOR, domestic (doc 236 §7, row notice-content/01), APPROVED ──

/** Doc 236 notice-content/01's approved paragraph, the hedge sentence
 *  copied VERBATIM. */
const NOTICE_HEDGE_236 =
  "Whether this company's stated purpose clears that bar is a judgment about this company's own words, not a fixed word count or template.";

const noticeProfile: HookProfileRow = {
  id: "profile-notice-content",
  source_table: "cppa_fsor_commentary",
  source_row_id: "7f616c44-b6f9-43b0-9891-1fdbd501bffc",
  outcome_posture: "rejected",
  instrument: "CPPA ADMT Regulations",
  factor_ids: ["Notice content"],
  ratified_by: "ceo",
  ratified_at: "2026-09-09T00:00:00Z",
  ledger_ref: "doc238-test",
};
const noticeSource: HookSourceRow = {
  source_table: "cppa_fsor_commentary",
  regulation_citation: "11 CCR § 7220(c)(1)",
};

function noticeContentHook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(noticeProfile, noticeSource);
  assert(cite);
  return {
    hook_id: "cppa_fsor_commentary:7f616c44:v1",
    profile_id: noticeProfile.id,
    source_row_id: noticeProfile.source_row_id,
    // ADMT_ATOM_PHRASES has no atom for "notice states a generic purpose"
    // (doc 236's own curation gap, same shape as Risk's Candidate 5) — a
    // real atom, "notice_has_specific_purpose=No", stands in as the closest
    // available fact to exercise the mandatory {customer_fact} slot.
    fact_atoms: ["state:intake.notice_has_specific_purpose=No — uses generic language"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    // Verified verbatim in doc 236's own curation card: position('to
    // prevent businesses from using vague language about their planned use
    // of ADMT' in agency_response) -> 480.
    finding_span: "to prevent businesses from using vague language about their planned use of ADMT",
    // Fixture placeholders derived from the approved paragraph (doc 236
    // prints the paragraph, not the DB's paraphrase columns).
    fact_pattern_paraphrase: "the Pre-use Notice states the ADMT's purpose only in generic terms",
    finding_paraphrase: "vague language about a planned ADMT use undermines a consumer's ability to exercise the opt-out and access rights",
    settledness: "R1",
    posture: "rejected",
    factor_id: "Notice content",
    bears_on_element: "Notice content",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "states",
    source_status: "regulator_guidance",
    status_label: "CPPA Final Statement of Reasons — agency position, primary regulator commentary",
    pinpoint: { kind: "section", ref: "7220(c)(1)", anchor_span: "prevent businesses from using vague language" },
    relevance: {
      instrument: "CPPA ADMT Regulations",
      factor_ids: ["Notice content"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    // Verbatim from doc 236's approved paragraph ("…something like 'to
    // improve our services,' without saying what the ADMT actually decides.
    // The CPPA's regulations require more specific language than that (11
    // CCR § 7220(c)(1))."). Doc 238's first cut reworded this to "…than a
    // generic purpose statement…", which no approved document says.
    governing_provision_sentence: "The CPPA's regulations require more specific language than that (11 CCR § 7220(c)(1)).",
    hedge_variant: "domestic_facts",
    hedge_sentence: NOTICE_HEDGE_236,
    ...overrides,
  };
}

// ── E1 — Garante, Friuli Occidentale (doc 236 §"E1"), foreign analogy, APPROVED ──

/** Doc 236 E1's approved paragraph, the hedge sentence copied VERBATIM. */
const E1_HEDGE_236 =
  "This decision was decided under the GDPR, not California's ADMT rules, so it is persuasive only here; whether it applies to this company depends on what this company's own system actually decides, what legal basis supports the profiling, and whether the required assessments were completed first.";

const e1Profile: HookProfileRow = {
  id: "profile-e1",
  source_table: "enforcement_actions",
  source_row_id: "a3463b6c-d9d0-47b2-8528-1e416aae8885",
  outcome_posture: "rejected",
  instrument: "GDPR",
  factor_ids: ["Significant decision"],
  ratified_by: "ceo",
  ratified_at: "2026-09-09T00:00:00Z",
  ledger_ref: "doc238-test",
};
const e1Source: HookSourceRow = {
  source_table: "enforcement_actions",
  // The DB row's `regulator` column value per doc 236's card — the SHORT
  // form, used only for the mid-sentence {regulator} slot, never the
  // citation label (see below).
  regulator: "Garante",
  subject: "Azienda Universitaria Friuli Occidentale",
  decision_date: "2022-12-15",
  appeal_status: "unknown", // real DB value (verified read-only in the doc 238 session)
  // DOC 238 FOLLOW-UP (2026-09-09) — `regulator_canonical` is a real,
  // already-populated DB column ("Garante per la protezione dei dati
  // personali", verified live for this exact row), and
  // `regulator_canonical_in_citation` is a real, additive opt-in column,
  // set true for this one row (verified live) because doc 236's approved
  // citation confirms the full native name is the curator's actual choice
  // for E1. Neither field is hand-set here as a placeholder — this proves
  // the real production read path, not just the mechanism. No
  // `regulator_english_name` is set: the English gloss now comes from
  // `citationFor`'s own curated `KNOWN_REGULATOR_ENGLISH_GLOSS` table
  // (generate.ts), which the approved parenthetical "(Italian Data
  // Protection Authority)" confirmed correct for this regulator.
  regulator_canonical: "Garante per la protezione dei dati personali",
  regulator_canonical_in_citation: true,
};

function e1Hook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(e1Profile, e1Source);
  assert(cite);
  return {
    hook_id: "enforcement_actions:a3463b6c:v1",
    profile_id: e1Profile.id,
    source_row_id: e1Profile.source_row_id,
    fact_atoms: ["class:healthcare"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    // Verified verbatim in doc 236's own curation card: position('the DPA
    // found that the health authority did not have a valid legal basis to
    // process patients' in raw_text) -> 408.
    finding_span: "the DPA found that the health authority did not have a valid legal basis to process patients",
    // Fixture placeholders derived from the approved paragraph.
    fact_pattern_paraphrase: "an algorithmic system scores or profiles individuals to guide a healthcare decision",
    finding_paraphrase: "using an algorithm and patients' own data to build risk profiles without a valid legal basis, and without completing a required DPIA, is unlawful",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Significant decision",
    bears_on_element: "Significant decision",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "found",
    source_status: "sa_decision",
    status_label: "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations",
    pinpoint: null, // the approved citation carries no pinpoint
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Significant decision"],
      use_case_class: "healthcare",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    // Verbatim from doc 236 E1's approved paragraph.
    governing_provision_sentence:
      "Algorithmic health-risk profiling of this kind is the class of processing California's significant-decision rules address (11 CCR §§ 7001(ddd)(5), 7200(a)).",
    hedge_variant: "foreign_analogy",
    hedge_sentence: E1_HEDGE_236,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

Deno.test("doc238 ADMT — citationFor composes the FULL native regulator name + English gloss for E1, byte-identical to doc 236's approved citation label (FIXED, 2026-09-09 follow-up: regulator_canonical_in_citation opts this row in; the gloss comes from citationFor's own curated table, not hand-set fixture data)", () => {
  const cite = citationFor(e1Profile, e1Source);
  assertEquals(cite?.authority_label, "Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022");
});

Deno.test("doc238 ADMT — a hook with hedge_sentence/hedge_variant/governing_provision_sentence unset renders through the amended ADMT_HOOK_SHAPES with no hedge, no unresolved slot, no stray spacing", () => {
  const hook = noticeContentHook({ hedge_sentence: undefined, hedge_variant: undefined, governing_provision_sentence: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  // (The template itself says "in its own words", so test for the hedge's
  // own distinctive phrase, not the bare words.)
  assert(!rendered.includes("judgment about this company's own words") && !rendered.includes("own facts") && !rendered.includes("fixed rule"));
  assert(rendered!.endsWith("primary regulator commentary.)"), `expected to end at the citation: ${rendered}`);
  assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot: ${rendered}`);
  assert(!rendered!.includes("  "), `stray double space: ${rendered}`);
});

Deno.test("doc238 ADMT — hedge_variant alone (either value, hedge_sentence unset) renders NO hedge: there is no generic ADMT hedge constant left", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    const hook = e1Hook({ hedge_variant, hedge_sentence: undefined });
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered);
    assert(rendered!.endsWith("not the CCPA or its Article 10/11 regulations.)"), `expected to end at the citation: ${rendered}`);
    assert(!rendered!.includes("own facts") && !rendered!.includes("persuasive only"), `no hedge may render: ${rendered}`);
  }
});

Deno.test("doc238 ADMT — 'Notice content' (APPROVED, FSOR): the approved governing-provision sentence, the verbatim quote, and doc 236's own hedge sentence for this row, verbatim, positioned before the section pointer and citation", () => {
  const hook = noticeContentHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");

  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);
  assert(rendered!.includes(" The CPPA's regulations require more specific language than that (11 CCR § 7220(c)(1)). In CPPA Final Statement of Reasons"));
  assert(rendered!.includes(`"${hook.finding_span}"`));
  // Doc 236's approved pointer: "Section 3 addresses whether the notice's
  // purpose statement meets this standard." — register match, not wording.
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 3"));
  // POSITION — FIXED (2026-09-09 follow-up): the hedge now precedes the
  // section pointer, not the citation trailer.
  assert(rendered!.includes(`${NOTICE_HEDGE_236} Whether that holds`), `hedge must precede the section pointer, not follow the citation: ${rendered}`);
  assert(!rendered!.includes("not a fixed rule"), `generic constant leaked: ${rendered}`);
  // Doc 238 §5.5.2's own flag, confirmed: doc 236's approved FSOR citation
  // is "(California Privacy Protection Agency, Final Statement of Reasons,
  // CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR
  // § 7220(c)(1).)" — no trailing "; {status}" clause and a different
  // label form — while the shape prints "({citation}; {status}.)".
  assert(rendered!.includes("(CPPA Final Statement of Reasons, 11 CCR § 7220(c)(1); CPPA Final Statement of Reasons — agency position, primary regulator commentary.)"));
});

Deno.test("doc238 ADMT — E1 (APPROVED, enforcement): the approved governing-provision sentence, the verbatim quote, and doc 236's own hedge sentence for this row, verbatim, positioned before the section pointer and citation; the citation is now BYTE-IDENTICAL to doc 236's approved one (FIXED, 2026-09-09 follow-up)", () => {
  const hook = e1Hook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");
  assert(rendered!.includes(" Algorithmic health-risk profiling of this kind is the class of processing California's significant-decision rules address (11 CCR §§ 7001(ddd)(5), 7200(a)). In Garante"));
  assert(rendered!.includes(`"${hook.finding_span}"`));
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 2"));
  assert(!rendered!.includes("cited only by analogy; whether it applies here depends on this company's own facts, not on the decision's"), `generic constant leaked: ${rendered}`);
  // POSITION — FIXED (2026-09-09 follow-up): doc 236 places E1's hedge
  // directly before the citation; `{hedge}` now sits before the (amended
  // shape's own) section-pointer sentence, which itself precedes the
  // citation.
  assert(rendered!.includes(`${E1_HEDGE_236} Whether that holds`), `hedge must precede the section pointer, not follow the citation: ${rendered}`);
  // CITATION — FIXED (2026-09-09 follow-up): `regulator_canonical` +
  // `regulator_canonical_in_citation` (real DB columns, both populated for
  // this row) now compose the full native name; the English gloss comes
  // from citationFor's own curated table. Byte-identical to doc 236's
  // approved citation: "(Garante per la protezione dei dati personali
  // (Italian Data Protection Authority), Azienda Universitaria Friuli
  // Occidentale, decision of 15 December 2022; foreign supervisory-authority
  // decision, cited by analogy — decided under the GDPR, not the CCPA or its
  // Article 10/11 regulations.)"
  assert(rendered!.endsWith(
    "(Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022; foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)",
  ));
});

Deno.test("doc238 ADMT — {governing_provision} degrades gracefully (not fail-closed), consistent with Risk's own design choice", () => {
  const hook = e1Hook({ governing_provision_sentence: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!/\{[a-z_]+\}/.test(rendered!));
  assert(rendered!.includes("the decision is a healthcare decision. In Garante"), `expected the sentence to vanish cleanly: ${rendered}`);
});

Deno.test("doc238 ADMT — S1-S4 carry {governing_provision}; S5a/S5b/S6/S6x do not (the proposition/condition slots already state the rule there)", () => {
  for (const shape of ["S1", "S2", "S3", "S4"] as const) {
    assert(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), `${shape} missing {governing_provision}`);
  }
  for (const shape of ["S5a", "S5b", "S6", "S6x"] as const) {
    assertNotEquals(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), true, `${shape} should not carry {governing_provision}`);
  }
});
