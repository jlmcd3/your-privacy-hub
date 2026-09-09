// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, CPPA Risk. Risk's
// RISK_HOOK_SHAPES/RISK_ATOM_PHRASES/etc. are still `[RATIFY — DRAFT,
// unratified]` (never a live-ratified byte — RISK_HOOKS ships `[]`), so this
// build edits them in place (doc 238's own explicit permission), unlike
// LIA's frozen file. Two candidates from doc 234:
//   - Candidate 5 (`41408f4d`, FSOR, "Processing purpose specificity").
//     Its "CEO: ratify / revise / retire" line in doc 234 is BLANK — as is
//     every FSOR candidate's (5–18). NOT approved. Kept as a MECHANISM
//     fixture only: citationFor's fsor_package/page_ref composition and the
//     `{governing_provision}` graceful degrade. It carries NO hedge — Risk
//     has no approved "domestic" hedge to give it.
//   - Candidate 1 (`dc095815`/ICS, enforcement, "Assessment timing and
//     material changes") — "CEO approved the revised prose (2026-09-09)".
//     Its governing-provision sentence and its two-sentence hedge are copied
//     VERBATIM from the approved paragraph; its citation is composed by the
//     REAL `citationFor` and reproduces the approved citation parenthetical
//     byte-for-byte (with `regulator_english_name` as placeholder data —
//     no DB column carries it, doc 238 §1.4).
//
// DOC 238 FOLLOW-UP (2026-09-09, the hedge): the generic
// RISK_HEDGE_DOMESTIC_FACTS_PROPOSED / RISK_HEDGE_FOREIGN_ANALOGY_PROPOSED
// constants are gone — neither sentence appears in any approved document,
// and doc 234's four approved hedges (candidates 1–4) are each hand-tailored
// and not even phrased alike. The hedge is per-hook DATA
// (`AuthorityHook.hedge_sentence`); `hedge_variant` is classification only.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import {
  citationFor,
  type HookProfileRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";
import { RISK_HOOK_SHAPES } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

// ── Candidate 5 — FSOR (doc 234 §"Candidate 5"), NOT approved ─────────────

const c5Profile: HookProfileRow = {
  id: "profile-c5",
  source_table: "cppa_fsor_commentary",
  source_row_id: "41408f4d-6355-499e-8c66-33022becb826",
  outcome_posture: "rejected",
  instrument: "CPPA Regulations",
  factor_ids: ["Processing purpose specificity"],
  ratified_by: "ceo",
  ratified_at: "2026-09-09T00:00:00Z",
  ledger_ref: "doc238-test",
};
const c5Source: HookSourceRow = {
  source_table: "cppa_fsor_commentary",
  regulation_citation: "11 CCR § 7152(a)(1)",
  page_ref: "p. 34",
  fsor_package: "ccpa-2025-cyber-risk-admt",
};

function candidate5(): AuthorityHook {
  const cite = citationFor(c5Profile, c5Source);
  assert(cite);
  return {
    hook_id: "cppa_fsor_commentary:41408f4d:v1",
    profile_id: c5Profile.id,
    source_row_id: c5Profile.source_row_id,
    // RISK_ATOM_PHRASES has no atom for "purpose stated generically" (doc
    // 234's own fact pattern doesn't reduce to the closed vocabulary today
    // — a real curation gap, not this test's problem to solve); this atom
    // is a placeholder so S1/S2/S4's mandatory {customer_fact} slot has
    // something real to resolve, exercising the render mechanism only.
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    // Verified verbatim in doc 234's own curation card:
    // position('This is necessary to clarify how to identify a purpose
    // with the necessary specificity to conduct a risk assessment' in
    // agency_response) -> 103.
    finding_span:
      "This is necessary to clarify how to identify a purpose with the necessary specificity to conduct a risk assessment",
    fact_pattern_paraphrase: "the stated purpose is a generic recital with no named operation",
    finding_paraphrase: "a generic purpose recital does not satisfy § 7152(a)(1)'s specificity requirement",
    settledness: "R1",
    posture: "rejected",
    factor_id: "Processing purpose specificity",
    bears_on_element: "Processing purpose specificity", // riskElementOf is an identity map
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "states",
    source_status: "regulator_guidance",
    status_label: "CPPA Final Statement of Reasons — agency position, primary regulator commentary",
    pinpoint: { kind: "section", ref: "7152(a)(1)", anchor_span: "clarify how to identify a purpose" },
    relevance: {
      instrument: "CPPA Regulations",
      factor_ids: ["Processing purpose specificity"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    // The governing-provision sentence is doc 234 Candidate 5's own literal
    // sentence ("The CPPA's regulations require more.") — UNAPPROVED, like
    // the rest of that candidate; used here only so the slot resolves.
    governing_provision_sentence: "The CPPA's regulations require more.",
    hedge_variant: "domestic_facts",
    // No hedge_sentence: no FSOR candidate in doc 234 is approved, so Risk
    // has no approved domestic-facts hedge at all.
  };
}

// ── Candidate 1 — enforcement, foreign analogy (doc 234 §"Candidate 1"), APPROVED ──

/** Doc 234 Candidate 1's approved paragraph, the hedge passage copied
 *  VERBATIM — two sentences, the second with an em-dash. */
const ICS_HEDGE_234 =
  "This decision is only persuasive here: the Dutch authority applied Dutch and EU law, not California's. Whether it says anything about this company depends on this company's own facts — whether its processing has actually started, and whether an assessment was completed first.";

/** The approved paragraph's trailing citation, verbatim. */
const ICS_CITATION_234 =
  "(Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal; foreign supervisory-authority decision, cited by analogy — not binding on California regulators.)";

const c1Profile: HookProfileRow = {
  id: "profile-c1",
  source_table: "enforcement_actions",
  source_row_id: "dc095815-d03d-4bb2-b3be-2711e7f7d459",
  outcome_posture: "rejected",
  instrument: "GDPR",
  factor_ids: ["Assessment timing and material changes"],
  ratified_by: "ceo",
  ratified_at: "2026-09-09T00:00:00Z",
  ledger_ref: "doc238-test",
};
const c1Source: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "Autoriteit Persoonsgegevens",
  subject: "International Card Services B.V.",
  decision_date: "2024-01-15",
  appeal_status: "final",
  // Placeholder — doc 238 §1.4 flags that NO DB column carries this today
  // (enforcement_actions.regulator_canonical holds the NATIVE full name,
  // not an English gloss); this proves the mechanism only.
  regulator_english_name: "Dutch Data Protection Authority",
};

function candidate1(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(c1Profile, c1Source);
  assert(cite);
  return {
    hook_id: "enforcement_actions:dc095815:v1",
    profile_id: c1Profile.id,
    source_row_id: c1Profile.source_row_id,
    // ICS's fact pattern (digital identity verification using a selfie
    // matched to an ID document) is sensitive PI on the closed vocabulary.
    fact_atoms: ["flag:sensitive_pi"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    // Dutch original verified this session's source doc via position();
    // English rendering per doc 234's own aid translation.
    finding_span: "ICS failed to carry out a DPIA before the company began digitally identifying customers in the Netherlands in 2019",
    // Fixture placeholders derived from the approved paragraph — doc 234
    // prints the paragraph, not the DB's paraphrase columns.
    fact_pattern_paraphrase: "a company rolled out a new digital identification process using sensitive personal data",
    finding_paraphrase: "the company had not completed a risk assessment before the processing began",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Assessment timing and material changes",
    bears_on_element: "Assessment timing and material changes",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "found",
    source_status: "sa_decision",
    status_label: "foreign supervisory-authority decision, cited by analogy — not binding on California regulators",
    pinpoint: null, // the approved citation carries no pinpoint (doc 234's card locates the quote by position() only)
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Assessment timing and material changes"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    // Verbatim from doc 234 Candidate 1's approved paragraph.
    governing_provision_sentence:
      "California's rule requires a risk assessment to be completed before any § 7150(b)-triggering processing begins, and § 7155 sets the timing for that assessment.",
    hedge_variant: "foreign_analogy",
    hedge_sentence: ICS_HEDGE_234,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

Deno.test("doc238 Risk — citationFor composes the FSOR package + page pinpoint for Candidate 5 (doc 237 §5 item 7, real row data; slug package name printed verbatim, doc 238 §1.4)", () => {
  const cite = citationFor(c5Profile, c5Source);
  assertEquals(cite?.authority_label, "CPPA Final Statement of Reasons, ccpa-2025-cyber-risk-admt, 11 CCR § 7152(a)(1), p. 34");
});

Deno.test("doc238 Risk — citationFor's Candidate 1 label is byte-identical to the label inside doc 234's APPROVED citation (English name = placeholder data)", () => {
  const cite = citationFor(c1Profile, c1Source);
  assertEquals(
    cite?.authority_label,
    "Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal",
  );
});

Deno.test("doc238 Risk — hedge_variant alone (either value, hedge_sentence unset) renders NO hedge: there is no generic Risk hedge constant left", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    const hook = candidate1({ hedge_variant, hedge_sentence: undefined });
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered);
    assert(rendered!.endsWith(ICS_CITATION_234), `expected to end at the citation: ${rendered}`);
    assert(!rendered!.includes("own facts") && !rendered!.includes("by analogy;"), `no hedge may render: ${rendered}`);
    assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot in: ${rendered}`);
  }
});

Deno.test("doc238 Risk — {governing_provision} degrades GRACEFULLY, not fail-closed: a hook without it still renders S1-S4 cleanly, with that sentence simply absent (no unresolved slot, no stray spacing) — every hook RISK_HOOKS ships today omits this field, so this keeps S1-S4 backward compatible", () => {
  const hook = { ...candidate5(), governing_provision_sentence: undefined };
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to still render without governing_provision_sentence");
  assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot in: ${rendered}`);
  assert(!rendered!.includes("  "), `stray double space where the sentence was omitted: ${rendered}`);
  assert(
    rendered!.includes("it processes sensitive personal information. In CPPA Final Statement of Reasons"),
    `expected the governing-provision sentence to vanish cleanly, not leave a gap: ${rendered}`,
  );
});

Deno.test("doc238 Risk — Candidate 5 (FSOR, NOT approved): MECHANISM check only — quote + governing_provision order resolve; NO hedge renders because Risk has no approved domestic-facts hedge", () => {
  const hook = candidate5();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");

  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);

  // Order matches doc 234's own APPROVED Candidate 1 ("The company has
  // said this processing is planned... California's rule requires... The
  // Dutch data protection authority applied..."): customer_fact, then the
  // governing provision, then the authority sentence.
  assert(rendered!.includes(hook.governing_provision_sentence!), `governing_provision missing: ${rendered}`);
  const factIdx = rendered!.indexOf("it processes sensitive personal information");
  const provIdx = rendered!.indexOf(hook.governing_provision_sentence!);
  const authorityIdx = rendered!.indexOf("the CPPA found");
  assert(factIdx < provIdx && provIdx < authorityIdx, `expected fact -> provision -> authority order: ${rendered}`);
  assert(rendered!.includes(`"${hook.finding_span}"`), `expected the verbatim quote: ${rendered}`);
  assert(rendered!.includes("Whether that holds on this record is addressed at § 7152(a)(1)"), `forward-looking pointer missing: ${rendered}`);
  assert(rendered!.includes("CPPA Final Statement of Reasons, ccpa-2025-cyber-risk-admt, 11 CCR § 7152(a)(1)"), `citation missing: ${rendered}`);
  assert(rendered!.endsWith("primary regulator commentary.)"), `unapproved hook must carry no hedge: ${rendered}`);
  assert(!rendered!.includes("not a fixed rule"), `generic constant leaked: ${rendered}`);
});

Deno.test("doc238 Risk — Candidate 1 (APPROVED, enforcement): S2 carries doc 234's own two-sentence hedge for this hook, verbatim, positioned before the section pointer and citation; the governing-provision sentence is the approved one", () => {
  const hook = candidate1();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");
  assert(rendered!.endsWith(ICS_CITATION_234), `sentence must end at the approved citation, not the hedge: ${rendered}`);
  assert(!rendered!.includes("cited only by analogy; whether it applies here depends on this company's own facts, not on the decision's"), `generic constant leaked: ${rendered}`);
  assert(rendered!.includes(`"${hook.finding_span}"`));
  assert(rendered!.includes(" California's rule requires a risk assessment to be completed before any § 7150(b)-triggering processing begins, and § 7155 sets the timing for that assessment. In Autoriteit Persoonsgegevens"));
  // Doc 234's approved Candidate 1 has NO section-pointer sentence at all
  // (it goes straight from the hedge to the citation); the amended S2 adds
  // "Whether that holds on this record is addressed at § 7155(a)." — an
  // extra sentence the approved paragraph does not carry. Recorded, not
  // asserted away.
  assert(rendered!.includes("Whether that holds on this record is addressed at § 7155(a)."));
  // POSITION — FIXED (2026-09-09 follow-up): doc 234 places the hedge
  // BEFORE the citation; `{hedge}` now sits directly before the (amended
  // shape's own) section-pointer sentence, which itself precedes the
  // citation — the hedge no longer trails after it.
  assert(rendered!.includes(`${ICS_HEDGE_234} Whether that holds`), `hedge must precede the section pointer, not follow the citation: ${rendered}`);
});

Deno.test("doc238 Risk — {quote} is the one MANDATORY new slot: finding_span is required on every AuthorityHook already, so {quote} can never be the reason a shape fails to resolve", () => {
  const hook = candidate5();
  // finding_span is a required (non-optional) AuthorityHook field — there is
  // no fixture to build where it is legitimately absent; this test instead
  // documents the asymmetry directly: {governing_provision} degrades
  // gracefully (previous test), {quote} cannot, by construction of the type.
  assertEquals(typeof hook.finding_span, "string");
  assert(hook.finding_span.length > 0);
});

Deno.test("doc238 Risk — the amended RISK_HOOK_SHAPES text is what shipped: spot-check S1-S4 carry {governing_provision}, S1/S5a/S6x carry {quote}, S2/S6x are forward-looking", () => {
  for (const shape of ["S1", "S2", "S3", "S4"] as const) {
    assert(RISK_HOOK_SHAPES[shape].includes("{governing_provision}"), `${shape} missing {governing_provision}`);
  }
  for (const shape of ["S5a", "S5b", "S6", "S6x"] as const) {
    assert(!RISK_HOOK_SHAPES[shape].includes("{governing_provision}"), `${shape} should not carry {governing_provision} — {proposition}/{condition} already state the rule`);
  }
  assert(RISK_HOOK_SHAPES.S1.includes("{quote}"));
  assert(RISK_HOOK_SHAPES.S5a.includes("{quote}"));
  assert(RISK_HOOK_SHAPES.S6x.includes("{quote}"));
  assert(RISK_HOOK_SHAPES.S2.includes("Whether that holds on this record is addressed at {section}"));
  assert(!RISK_HOOK_SHAPES.S2.includes("and the finding at {section} reflects it"));
  assert(RISK_HOOK_SHAPES.S6x.includes("Whether it applies here is addressed at {section}"));
});
