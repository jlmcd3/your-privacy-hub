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
//     byte-for-byte.
//
// DOC 238 FOLLOW-UP (2026-09-09, the hedge): the generic
// RISK_HEDGE_DOMESTIC_FACTS_PROPOSED / RISK_HEDGE_FOREIGN_ANALOGY_PROPOSED
// constants are gone — neither sentence appears in any approved document,
// and doc 234's four approved hedges (candidates 1–4) are each hand-tailored
// and not even phrased alike. The hedge is per-hook DATA
// (`AuthorityHook.hedge_sentence`); `hedge_variant` is classification only.
//
// DOC 238 §5 item 6 / §1.4 / §5.5.2 FOLLOW-UP (2026-09-09, status labels +
// citation data): three things changed in what this file proves.
//   1. Candidate 1's fixture is now the REAL `enforcement_actions` row
//      `dc095815` as it sits in the DB (verified live 2026-09-09):
//      `regulator` "AP", `appeal_status` "final", `regulator_canonical`
//      "Autoriteit Persoonsgegevens" + `regulator_canonical_in_citation`
//      true (written to that ONE row this session, the same way doc 236's
//      E1 row was), no `regulator_english_name` — the English gloss comes
//      from citationFor's curated table. The previous fixture hand-set
//      `regulator: "Autoriteit Persoonsgegevens"` and a placeholder gloss,
//      which was NOT the row's data.
//   2. The status label is DERIVED by the real `deriveSourceStatus` for
//      product "cppa-risk" — no longer hand-set on the fixture — and is doc
//      234's approved "foreign supervisory-authority decision, cited by
//      analogy — not binding on California regulators".
//   3. Candidate 5's FSOR citation is the CEO's own citation form with the
//      slug package name normalised — byte-identical to the parenthetical
//      doc 234 prints for Candidate 5 (unapproved prose, but the citation
//      form is the CEO's, shared with every doc 236 approved FSOR citation).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import {
  citationFor,
  deriveSourceStatus,
  shortLabelFor,
  type HookProfileRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";
import { RISK_HOOK_SHAPES, RISK_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

const NO_STATUS_INPUTS = { appeal_note: null, verified_as_of: null };

/** The real generate-time derivation for THIS product. */
function derivedFor(profile: HookProfileRow, source: HookSourceRow) {
  const status = deriveSourceStatus(profile, source, NO_STATUS_INPUTS, "cppa-risk");
  assert(!("exclude" in status), JSON.stringify(status));
  return status as Exclude<typeof status, { exclude: string }>;
}

/** CEO 2026-09-09: a rendered sentence must never carry an unresolved slot, a
 *  double space, an empty parenthetical or a stray punctuation mark. */
function assertClean(rendered: string | undefined, label: string): string {
  assert(rendered, `${label}: expected a rendered sentence`);
  const s = rendered!;
  assert(!/\{[a-z_]+\}/.test(s), `${label}: unresolved slot in: ${s}`);
  assert(!s.includes("  "), `${label}: double space in: ${s}`);
  assert(!/;\s*[.)]/.test(s), `${label}: stray '; .' or '; )' in: ${s}`);
  assert(!/\(\s*\)/.test(s), `${label}: empty parenthetical in: ${s}`);
  assert(!/\s[.,)]/.test(s), `${label}: space before punctuation in: ${s}`);
  assert(!/\(\s*;/.test(s), `${label}: '(;' in: ${s}`);
  assert(s.endsWith(")"), `${label}: must end at the citation parenthetical: ${s}`);
  return s;
}

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
// The row's own values (doc 234's curation card: regulation_citation,
// page_ref, fsor_package — the SLUG convention).
const c5Source: HookSourceRow = {
  source_table: "cppa_fsor_commentary",
  regulation_citation: "11 CCR § 7152(a)(1)",
  page_ref: "p. 34",
  fsor_package: "ccpa-2025-cyber-risk-admt",
};

/** Doc 234 Candidate 5's citation parenthetical, verbatim (its prose is
 *  unapproved; the citation FORM is the CEO's own, the same form every
 *  doc 236 approved FSOR citation uses). */
const C5_CITATION_234 =
  "(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7152(a)(1), p. 34; CPPA Final Statement of Reasons — agency position, primary regulator commentary.)";

function candidate5(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(c5Profile, c5Source);
  assert(cite);
  const status = derivedFor(c5Profile, c5Source);
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
    authority_label_short: shortLabelFor(c5Profile, c5Source)!, // the real production short label
    regulator: cite!.regulator,
    verb: status.verb,
    source_status: status.source_status,
    status_label: status.status_label,
    status_in_citation: status.status_in_citation,
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
    ...overrides,
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

/** Doc 234's approved status wording for Candidate 1, verbatim. */
const ICS_STATUS_234 = "foreign supervisory-authority decision, cited by analogy — not binding on California regulators";

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
/** `enforcement_actions` row `dc095815`, EXACTLY as it sits in the DB
 *  (verified live 2026-09-09, after this session's one-row write of the
 *  two canonical-name columns — see this file's header). */
const c1Source: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "AP",
  subject: "International Card Services B.V.",
  decision_date: "2024-01-15",
  appeal_status: "final",
  regulator_canonical: "Autoriteit Persoonsgegevens",
  regulator_canonical_in_citation: true,
};

function candidate1(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(c1Profile, c1Source);
  assert(cite);
  const status = derivedFor(c1Profile, c1Source);
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
    // Dutch original verified in the source doc via position(); English
    // rendering per doc 234's own aid translation.
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
    authority_label_short: shortLabelFor(c1Profile, c1Source)!, // "AP, International Card Services B.V." — the real short label
    regulator: cite!.regulator, // "AP" — the row's short form, as the {regulator} slot always prints it
    verb: status.verb,
    source_status: status.source_status,
    status_label: status.status_label, // DERIVED — doc 234's approved wording
    status_in_citation: status.status_in_citation,
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

// ── Tests: citation data (doc 238 §1.4 follow-up) ────────────────────────

Deno.test("doc238 Risk — citationFor composes Candidate 5's FSOR citation from the row's SLUG package name as the CEO's own citation form, byte-identical to doc 234's Candidate 5 parenthetical label (doc 238 §1.4 follow-up: no slug ever prints)", () => {
  const cite = citationFor(c5Profile, c5Source);
  assertEquals(
    cite?.authority_label,
    "California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7152(a)(1), p. 34",
  );
  assert(!cite!.authority_label.includes("ccpa-2025"), "the slug leaked into the citation");
});

Deno.test("doc238 Risk — citationFor's Candidate 1 label is byte-identical to the label inside doc 234's APPROVED citation, from the REAL row data (regulator 'AP' + regulator_canonical opt-in + citationFor's curated gloss — no placeholder field)", () => {
  const cite = citationFor(c1Profile, c1Source);
  assertEquals(
    cite?.authority_label,
    "Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal",
  );
  // The mid-sentence {regulator} slot keeps the row's short form, as for
  // every other regulator (doc 238 follow-up's own design for E1).
  assertEquals(cite?.regulator, "AP");
  assertEquals(shortLabelFor(c1Profile, c1Source), "AP, International Card Services B.V.");
  // Without the opt-in the same row prints the bare short form — the 43
  // other AP rows in the table are byte-identical to before.
  const bare = citationFor(c1Profile, { ...c1Source, regulator_canonical_in_citation: null });
  assertEquals(bare?.authority_label, "AP, International Card Services B.V., decision of 15 January 2024, final on appeal");
});

// ── Tests: status labels (doc 238 §5 item 6 follow-up) ───────────────────

Deno.test("doc238 Risk — deriveSourceStatus for product 'cppa-risk' yields doc 234's APPROVED sa_decision wording; without a product (or for lia/dpia) the shared label is byte-identical to before", () => {
  const risk = derivedFor(c1Profile, c1Source);
  assertEquals(risk.status_label, ICS_STATUS_234);
  assertEquals(risk.source_status, "sa_decision");
  assertEquals(risk.verb, "found");
  assertEquals(risk.status_in_citation, true);
  // The map's own v1 fallback now agrees with the generator (it was dead before).
  assertEquals(RISK_SOURCE_STATUS_LABELS.sa_decision, ICS_STATUS_234);
  for (const product of [undefined, "lia", "dpia"]) {
    const shared = deriveSourceStatus(c1Profile, c1Source, NO_STATUS_INPUTS, product);
    assert(!("exclude" in shared));
    assertEquals((shared as { status_label: string }).status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
  }
});

Deno.test("doc238 Risk — the approved 'foreign … cited by analogy' wording is applied only where the profile's own instrument makes it true: a California-instrument or non-GDPR source keeps the shared label (graceful, never a false claim)", () => {
  for (const instrument of ["CCPA", "CPPA Regulations", "California Civil Code", null, ""]) {
    const s = deriveSourceStatus({ ...c1Profile, instrument }, c1Source, NO_STATUS_INPUTS, "cppa-risk");
    assert(!("exclude" in s));
    assertEquals((s as { status_label: string }).status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction", `instrument ${instrument}`);
  }
  for (const instrument of ["GDPR", "EU GDPR", "UK GDPR", "GDPR (Denmark)"]) {
    const s = deriveSourceStatus({ ...c1Profile, instrument }, c1Source, NO_STATUS_INPUTS, "cppa-risk");
    assert(!("exclude" in s));
    assertEquals((s as { status_label: string }).status_label, ICS_STATUS_234, `instrument ${instrument}`);
  }
});

// ── Tests: rendering ─────────────────────────────────────────────────────

Deno.test("doc238 Risk — hedge_variant alone (either value, hedge_sentence unset) renders NO hedge: there is no generic Risk hedge constant left", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    const hook = candidate1({ hedge_variant, hedge_sentence: undefined });
    const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), `variant ${hedge_variant}`);
    assert(rendered.endsWith(ICS_CITATION_234), `expected to end at the citation: ${rendered}`);
    assert(!rendered.includes("own facts") && !rendered.includes("by analogy;"), `no hedge may render: ${rendered}`);
  }
});

Deno.test("doc238 Risk — {governing_provision} degrades GRACEFULLY, not fail-closed (CEO ruling 2026-09-09: DECIDED, kept): a hook without it still renders S1-S4 cleanly, with that sentence simply absent — every hook RISK_HOOKS ships today omits this field", () => {
  const hook = candidate5({ governing_provision_sentence: undefined });
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "no governing_provision");
  assert(
    rendered.includes("it processes sensitive personal information. In CPPA Final Statement of Reasons, the CPPA found"),
    `expected the governing-provision sentence to vanish cleanly, not leave a gap: ${rendered}`,
  );
  const withIt = assertClean(renderSentence(candidate5(), "S2", hook.fact_atoms, undefined), "with governing_provision");
  assert(withIt.includes("it processes sensitive personal information. The CPPA's regulations require more. In CPPA Final Statement of Reasons, the CPPA found"), withIt);
});

Deno.test("doc238 Risk — Candidate 5 (FSOR, NOT approved): MECHANISM check only — quote + governing_provision order resolve; the citation trailer is byte-identical to doc 234's Candidate 5 parenthetical (status clause KEPT — doc 234's Risk FSOR convention); NO hedge renders", () => {
  const hook = candidate5();
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "C5 S2");

  const sentenceCount = (rendered.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);

  // Order matches doc 234's own APPROVED Candidate 1 ("The company has
  // said this processing is planned... California's rule requires... The
  // Dutch data protection authority applied..."): customer_fact, then the
  // governing provision, then the authority sentence.
  const factIdx = rendered.indexOf("it processes sensitive personal information");
  const provIdx = rendered.indexOf(hook.governing_provision_sentence!);
  const authorityIdx = rendered.indexOf("the CPPA found");
  assert(factIdx >= 0 && provIdx > factIdx && authorityIdx > provIdx, `expected fact -> provision -> authority order: ${rendered}`);
  assert(rendered.includes(`"${hook.finding_span}"`), `expected the verbatim quote: ${rendered}`);
  assert(rendered.includes("Whether that holds on this record is addressed at § 7152(a)(1)"), `forward-looking pointer missing: ${rendered}`);
  assert(rendered.endsWith(C5_CITATION_234), `trailer must be doc 234's own parenthetical: ${rendered}`);
  assert(!rendered.includes("not a fixed rule"), `generic constant leaked: ${rendered}`);
});

Deno.test("doc238 Risk — Candidate 1 (APPROVED, enforcement): the full S2 paragraph is pinned byte-for-byte — the DERIVED approved status, the real-row citation, doc 234's own two-sentence hedge before the section pointer, the approved governing-provision sentence", () => {
  const hook = candidate1();
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "C1 S2");
  assertEquals(
    rendered,
    "The company has stated that it processes sensitive personal information. California's rule requires a risk assessment to be completed before any § 7150(b)-triggering processing begins, and § 7155 sets the timing for that assessment. In AP, International Card Services B.V., AP found that where a company rolled out a new digital identification process using sensitive personal data, the company had not completed a risk assessment before the processing began — in its own words, \"ICS failed to carry out a DPIA before the company began digitally identifying customers in the Netherlands in 2019\". That finding cuts against the company's position on the timing of this assessment relative to the processing it covers. This decision is only persuasive here: the Dutch authority applied Dutch and EU law, not California's. Whether it says anything about this company depends on this company's own facts — whether its processing has actually started, and whether an assessment was completed first. Whether that holds on this record is addressed at § 7155(a). (Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal; foreign supervisory-authority decision, cited by analogy — not binding on California regulators.)",
  );
  assert(rendered.endsWith(ICS_CITATION_234));
  assert(rendered.includes(`${ICS_HEDGE_234} Whether that holds`), `hedge must precede the section pointer: ${rendered}`);
  // Doc 234's approved Candidate 1 has NO section-pointer sentence at all
  // (it goes straight from the hedge to the citation); the amended S2 adds
  // "Whether that holds on this record is addressed at § 7155(a)." — an
  // extra sentence the approved paragraph does not carry. Recorded, not
  // asserted away. Likewise the inline "In AP, … AP found" is the shape's
  // own register (the row's short regulator form), not the approved
  // paragraph's "The Dutch data protection authority applied…" — the
  // shape-vs-paragraph gap doc 238 §0 names, outside this file's scope.
});

Deno.test("doc238 Risk — every reachable combination of the three optional slots (status clause × hedge × governing provision) renders a CLEAN sentence — read each one, never just pass/fail (CEO 2026-09-09)", () => {
  const cases: Array<[string, Partial<AuthorityHook>]> = [
    ["status+hedge+provision", {}],
    ["status+hedge, no provision", { governing_provision_sentence: null }],
    ["status+provision, no hedge", { hedge_sentence: null }],
    ["status only", { hedge_sentence: null, governing_provision_sentence: null }],
    // status_in_citation=false is not a Risk production case (doc 234 keeps
    // the status) — exercised so the MECHANISM is proven clean if the data
    // ever says so.
    ["no status clause, hedge+provision", { status_in_citation: false }],
    ["no status clause, nothing else", { status_in_citation: false, hedge_sentence: null, governing_provision_sentence: null }],
  ];
  const seen = new Set<string>();
  for (const [label, over] of cases) {
    const hook = candidate1(over);
    const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), label);
    assert(!seen.has(rendered), `${label}: identical to another case`);
    seen.add(rendered);
    if (over.status_in_citation === false) {
      assert(rendered.endsWith("International Card Services B.V., decision of 15 January 2024, final on appeal.)"), `${label}: ${rendered}`);
      assert(!rendered.includes("cited by analogy"), `${label}: status must be absent: ${rendered}`);
    } else {
      assert(rendered.endsWith(ICS_CITATION_234), `${label}: ${rendered}`);
    }
    assertEquals(rendered.includes(ICS_HEDGE_234), over.hedge_sentence !== null, label);
    assertEquals(rendered.includes("California's rule requires"), over.governing_provision_sentence !== null, label);
  }
});

Deno.test("doc238 Risk — S4 prints {status} mid-sentence and always keeps it, even for a hook whose citation trailer omits the status clause (never 'That decision is ; it is noted…')", () => {
  const hook = candidate1({ settledness: "R4", posture: "contested", status_in_citation: false });
  const rendered = assertClean(renderSentence(hook, "S4", hook.fact_atoms, undefined), "S4");
  assert(rendered.includes(`That decision is ${ICS_STATUS_234}; it is noted as a boundary and is not applied.`), rendered);
  assert(rendered.endsWith("(Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal.)"), rendered);
});

Deno.test("doc238 Risk — {quote} is the one MANDATORY new slot: finding_span is required on every AuthorityHook already, so {quote} can never be the reason a shape fails to resolve", () => {
  const hook = candidate5();
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
  // DOC 238 FOLLOW-UP (2026-09-09) — Risk's {section} is a § pinpoint, so no
  // Risk shape may say "Section {section}" (S1 did, and rendered "Section
  // § 7155(a) records that determination.").
  for (const [name, text] of Object.entries(RISK_HOOK_SHAPES)) {
    assert(!text.includes("Section {section}"), `${name} prints "Section § …": ${text}`);
  }
  assert(RISK_HOOK_SHAPES.S1.includes("That determination is recorded at {section}."));
});

Deno.test("doc238 Risk — S1 (supports) renders cleanly with the § pinpoint: 'That determination is recorded at § 7155(a).' — never 'Section § 7155(a)'", () => {
  const hook = candidate1({ posture: "accepted" });
  const rendered = assertClean(renderSentence(hook, "S1", hook.fact_atoms, undefined), "S1");
  assert(rendered.includes("That finding supports the company's position on the timing of this assessment relative to the processing it covers. This decision is only persuasive here"), rendered);
  assert(rendered.includes(`${ICS_HEDGE_234} That determination is recorded at § 7155(a). (Autoriteit`), rendered);
  assert(!rendered.includes("Section §"), rendered);
  assert(rendered.endsWith(ICS_CITATION_234), rendered);
});
