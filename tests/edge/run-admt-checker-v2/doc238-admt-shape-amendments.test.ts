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
// likewise the approved paragraph's own sentence, verbatim.
//
// DOC 238 §5 item 6 / §5.5.2 / §1.4 FOLLOW-UP (2026-09-09, status labels +
// the FSOR status clause + citation data):
//   1. Both fixtures' status is DERIVED by the real `deriveSourceStatus` for
//      product "admt" — E1's is doc 236's approved "foreign supervisory-
//      authority decision, cited by analogy — decided under the GDPR, not
//      the CCPA or its Article 10/11 regulations"; the FSOR row's derives
//      `status_in_citation: false` (doc 236's approved FSOR citations carry
//      NO status clause) and the join + tidy pass render the trailer as the
//      approved "(California Privacy Protection Agency, Final Statement of
//      Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations,
//      11 CCR § 7220(c)(1).)" — byte-identical.
//   2. The FSOR fixture is the REAL `cppa_fsor_commentary` row `7f616c44`
//      (verified live 2026-09-09): `fsor_package` "ccpa-2025-cyber-risk-admt"
//      (the SLUG convention — normalised to the approved package name),
//      `regulation_citation` "11 CCR § 7220(c)(1)", `page_ref` "p. 45". Doc
//      236's curation card for this row lists no page_ref, so its approved
//      citation prints none; the CEO's own convention everywhere a page WAS
//      on the card (doc 236 G1 "Appendix p. 13", opt-out/06 "Appendix p.
//      212", doc 234 C5 "p. 34") prints it — so the real row renders "…,
//      11 CCR § 7220(c)(1), p. 45.)", and the card-as-drafted case (no
//      page) renders the approved text byte-for-byte. Both are pinned;
//      the page question is flagged for the CEO, not decided here.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import {
  citationFor,
  deriveSourceStatus,
  shortLabelFor,
  type HookProfileRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import { ADMT_HOOK_SHAPES, ADMT_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

const NO_STATUS_INPUTS = { appeal_note: null, verified_as_of: null };

/** The real generate-time derivation for THIS product. */
function derivedFor(profile: HookProfileRow, source: HookSourceRow) {
  const status = deriveSourceStatus(profile, source, NO_STATUS_INPUTS, "admt");
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

// ── "Notice content" — FSOR, domestic (doc 236 §7, row notice-content/01), APPROVED ──

/** Doc 236 notice-content/01's approved paragraph, the hedge sentence
 *  copied VERBATIM. */
const NOTICE_HEDGE_236 =
  "Whether this company's stated purpose clears that bar is a judgment about this company's own words, not a fixed word count or template.";

/** Doc 236 notice-content/01's approved citation parenthetical, verbatim —
 *  NO status clause, no page (the card listed none). */
const NOTICE_CITATION_236 =
  "(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1).)";

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
/** `cppa_fsor_commentary` row `7f616c44`, EXACTLY as it sits in the DB
 *  (verified live 2026-09-09). */
const noticeSource: HookSourceRow = {
  source_table: "cppa_fsor_commentary",
  regulation_citation: "11 CCR § 7220(c)(1)",
  fsor_package: "ccpa-2025-cyber-risk-admt",
  page_ref: "p. 45",
};
/** The same row as doc 236's curation card carried it (no page_ref). */
const noticeSourceAsCarded: HookSourceRow = { ...noticeSource, page_ref: null };

function noticeContentHook(overrides: Partial<AuthorityHook> = {}, source: HookSourceRow = noticeSource): AuthorityHook {
  const cite = citationFor(noticeProfile, source);
  assert(cite);
  const status = derivedFor(noticeProfile, source);
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
    authority_label_short: shortLabelFor(noticeProfile, source)!, // "CPPA Final Statement of Reasons" — the real short label
    regulator: cite!.regulator,
    verb: status.verb,
    source_status: status.source_status,
    status_label: status.status_label, // DERIVED — still true, S4 prints it
    status_in_citation: status.status_in_citation, // DERIVED — false for ADMT + FSOR
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

/** Doc 236 E1's approved citation parenthetical, verbatim. */
const E1_CITATION_236 =
  "(Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022; foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)";

/** Doc 236's approved status wording for E1, verbatim. */
const E1_STATUS_236 = "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations";

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
/** `enforcement_actions` row `a3463b6c`, as it sits in the DB (verified
 *  live 2026-09-09): the SHORT `regulator` "Garante" feeds the mid-sentence
 *  {regulator} slot; `regulator_canonical` + the per-row opt-in feed the
 *  citation's full native name; the English gloss comes from citationFor's
 *  own curated table. No `regulator_english_name` is set. */
const e1Source: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "Garante",
  subject: "Azienda Universitaria Friuli Occidentale",
  decision_date: "2022-12-15",
  appeal_status: "unknown",
  regulator_canonical: "Garante per la protezione dei dati personali",
  regulator_canonical_in_citation: true,
};

function e1Hook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(e1Profile, e1Source);
  assert(cite);
  const status = derivedFor(e1Profile, e1Source);
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
    authority_label_short: shortLabelFor(e1Profile, e1Source)!, // "Garante, Azienda Universitaria Friuli Occidentale"
    regulator: cite!.regulator,
    verb: status.verb,
    source_status: status.source_status,
    status_label: status.status_label, // DERIVED — doc 236's approved wording
    status_in_citation: status.status_in_citation,
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

// ── Tests: citation data ──────────────────────────────────────────────────

Deno.test("doc238 ADMT — citationFor composes the FULL native regulator name + English gloss for E1, byte-identical to doc 236's approved citation label (regulator_canonical_in_citation opts this row in; the gloss comes from citationFor's own curated table)", () => {
  const cite = citationFor(e1Profile, e1Source);
  assertEquals(cite?.authority_label, "Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022");
  assertEquals(cite?.regulator, "Garante");
});

Deno.test("doc238 ADMT — citationFor composes notice-content/01's FSOR citation from the row's SLUG package as the CEO's own citation form: byte-identical to doc 236's approved label when the page is absent (as the card had it), and with the real row's ', p. 45' appended when present", () => {
  const carded = citationFor(noticeProfile, noticeSourceAsCarded);
  assertEquals(carded?.authority_label, "California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1)");
  const real = citationFor(noticeProfile, noticeSource);
  assertEquals(real?.authority_label, `${carded!.authority_label}, p. 45`);
  assert(!real!.authority_label.includes("ccpa-2025"), "the slug leaked into the citation");
  assertEquals(shortLabelFor(noticeProfile, noticeSource), "CPPA Final Statement of Reasons");
});

// ── Tests: status labels (doc 238 §5 item 6 / §5.5.2 follow-up) ──────────

Deno.test("doc238 ADMT — deriveSourceStatus for product 'admt' yields doc 236's APPROVED sa_decision wording for E1 and status_in_citation=false for an FSOR row; without a product the shared label/clause are byte-identical to before", () => {
  const e1 = derivedFor(e1Profile, e1Source);
  assertEquals(e1.status_label, E1_STATUS_236);
  assertEquals(e1.status_in_citation, true);
  assertEquals(ADMT_SOURCE_STATUS_LABELS.sa_decision, E1_STATUS_236); // the map's v1 fallback agrees
  const fsor = derivedFor(noticeProfile, noticeSource);
  assertEquals(fsor.status_label, "CPPA Final Statement of Reasons — agency position, primary regulator commentary");
  assertEquals(fsor.status_in_citation, false);
  assertEquals(fsor.verb, "states");
  for (const product of [undefined, "lia", "dpia"]) {
    const shared = deriveSourceStatus(e1Profile, e1Source, NO_STATUS_INPUTS, product);
    assert(!("exclude" in shared));
    assertEquals((shared as { status_label: string }).status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
    const sharedFsor = deriveSourceStatus(noticeProfile, noticeSource, NO_STATUS_INPUTS, product);
    assert(!("exclude" in sharedFsor));
    assertEquals((sharedFsor as { status_in_citation: boolean }).status_in_citation, true);
  }
});

// ── Tests: rendering ─────────────────────────────────────────────────────

Deno.test("doc238 ADMT — 'Notice content' (APPROVED, FSOR): the citation trailer is BYTE-IDENTICAL to doc 236's approved parenthetical — no status clause, no '; .)' artifact — through the real derive + join + tidy path (card-as-drafted, no page)", () => {
  const hook = noticeContentHook({}, noticeSourceAsCarded);
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "notice-content, no page");
  assert(rendered.endsWith(NOTICE_CITATION_236), `trailer must be doc 236's own parenthetical: ${rendered}`);
  assert(!rendered.includes("primary regulator commentary"), `status clause must be absent: ${rendered}`);
  assertEquals(
    rendered,
    "The company has stated that the company reports its Pre-use Notice uses generic language rather than a specific purpose. The CPPA's regulations require more specific language than that (11 CCR § 7220(c)(1)). In CPPA Final Statement of Reasons, the CPPA found that where the Pre-use Notice states the ADMT's purpose only in generic terms, vague language about a planned ADMT use undermines a consumer's ability to exercise the opt-out and access rights — in its own words, \"to prevent businesses from using vague language about their planned use of ADMT\". That finding cuts against the company's position on the Pre-use Notice content. Whether this company's stated purpose clears that bar is a judgment about this company's own words, not a fixed word count or template. Whether that holds on this record is addressed in Section 3. (California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1).)",
  );
});

Deno.test("doc238 ADMT — 'Notice content' from the REAL row (page_ref 'p. 45'): same paragraph, the page appended inside the parenthetical per the CEO's own convention for every FSOR citation that had a page (doc 236 G1/opt-out, doc 234 C5); no status clause", () => {
  const hook = noticeContentHook();
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "notice-content, real page");
  assert(rendered.endsWith("(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1), p. 45.)"), rendered);
  assert(rendered.includes(" The CPPA's regulations require more specific language than that (11 CCR § 7220(c)(1)). In CPPA Final Statement of Reasons"));
  assert(rendered.includes(`"${hook.finding_span}"`));
  // Doc 236's approved pointer: "Section 3 addresses whether the notice's
  // purpose statement meets this standard." — register match, not wording.
  assert(rendered.includes("Whether that holds on this record is addressed in Section 3"));
  assert(rendered.includes(`${NOTICE_HEDGE_236} Whether that holds`), `hedge must precede the section pointer, not follow the citation: ${rendered}`);
  assert(!rendered.includes("not a fixed rule"), `generic constant leaked: ${rendered}`);
});

Deno.test("doc238 ADMT — a hook with hedge_sentence/hedge_variant/governing_provision_sentence unset renders through the amended ADMT_HOOK_SHAPES with no hedge, no unresolved slot, no stray spacing — and the FSOR trailer still closes cleanly without its status clause", () => {
  const hook = noticeContentHook({ hedge_sentence: undefined, hedge_variant: undefined, governing_provision_sentence: undefined }, noticeSourceAsCarded);
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "unset fields");
  // (The template itself says "in its own words", so test for the hedge's
  // own distinctive phrase, not the bare words.)
  assert(!rendered.includes("judgment about this company's own words") && !rendered.includes("own facts") && !rendered.includes("fixed rule"));
  assert(rendered.endsWith(NOTICE_CITATION_236), `expected to end at the approved citation: ${rendered}`);
  assert(rendered.includes("a specific purpose. In CPPA Final Statement of Reasons"), `expected the governing-provision sentence to vanish cleanly: ${rendered}`);
});

Deno.test("doc238 ADMT — every reachable combination of the optional slots for the FSOR hook (hedge × governing provision; the status clause is always absent for ADMT FSOR) renders a CLEAN sentence — read each one (CEO 2026-09-09)", () => {
  const cases: Array<[string, Partial<AuthorityHook>]> = [
    ["hedge+provision", {}],
    ["hedge, no provision", { governing_provision_sentence: null }],
    ["provision, no hedge", { hedge_sentence: null }],
    ["neither", { hedge_sentence: null, governing_provision_sentence: null }],
    // Not an ADMT production case (doc 236 omits the status for FSOR) —
    // exercised so the MECHANISM is proven clean either way.
    ["status clause forced on (mechanism)", { status_in_citation: true }],
  ];
  const seen = new Set<string>();
  for (const [label, over] of cases) {
    const hook = noticeContentHook(over, noticeSourceAsCarded);
    const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), label);
    assert(!seen.has(rendered), `${label}: identical to another case`);
    seen.add(rendered);
    if (over.status_in_citation === true) {
      assert(rendered.endsWith("11 CCR § 7220(c)(1); CPPA Final Statement of Reasons — agency position, primary regulator commentary.)"), `${label}: ${rendered}`);
    } else {
      assert(rendered.endsWith(NOTICE_CITATION_236), `${label}: ${rendered}`);
    }
    assertEquals(rendered.includes(NOTICE_HEDGE_236), over.hedge_sentence !== null, label);
    assertEquals(rendered.includes("The CPPA's regulations require more specific language"), over.governing_provision_sentence !== null, label);
  }
});

Deno.test("doc238 ADMT — S1 (supports) and S3 (distinguished) close the FSOR trailer just as cleanly without the status clause", () => {
  const s1 = noticeContentHook({ posture: "accepted" }, noticeSourceAsCarded);
  const r1 = assertClean(renderSentence(s1, "S1", s1.fact_atoms, undefined), "S1");
  assert(r1.endsWith(NOTICE_CITATION_236), r1);
  assert(r1.includes("That finding supports the company's position on the Pre-use Notice content."), r1);
  const s3 = noticeContentHook({}, noticeSourceAsCarded);
  const r3 = assertClean(
    renderSentence(s3, "S3", [], {
      source_fact_span: "the notice used a generic recital",
      source_polarity: "present",
      record_atom: "state:intake.notice_has_specific_purpose=No — uses generic language",
      record_polarity: "present",
      why_material: "x",
      source_expressly_excludes: false,
    }),
    "S3",
  );
  assert(r3.endsWith(NOTICE_CITATION_236), r3);
});

Deno.test("doc238 ADMT — S4 prints {status} mid-sentence and always keeps it, even for the FSOR hook whose citation trailer omits the status clause (never 'That decision is ; it is noted…')", () => {
  const hook = noticeContentHook({ settledness: "R4", posture: "contested" }, noticeSourceAsCarded);
  const rendered = assertClean(renderSentence(hook, "S4", hook.fact_atoms, undefined), "S4");
  assert(rendered.includes("That decision is CPPA Final Statement of Reasons — agency position, primary regulator commentary; it is noted as a boundary and is not applied."), rendered);
  assert(rendered.endsWith(NOTICE_CITATION_236), rendered);
});

Deno.test("doc238 ADMT — hedge_variant alone (either value, hedge_sentence unset) renders NO hedge: there is no generic ADMT hedge constant left", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    const hook = e1Hook({ hedge_variant, hedge_sentence: undefined });
    const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), `variant ${hedge_variant}`);
    assert(rendered.endsWith(E1_CITATION_236), `expected to end at the citation: ${rendered}`);
    assert(!rendered.includes("own facts") && !rendered.includes("persuasive only"), `no hedge may render: ${rendered}`);
  }
});

Deno.test("doc238 ADMT — E1 (APPROVED, enforcement): the full S2 paragraph is pinned byte-for-byte — the DERIVED approved status, the byte-identical citation, doc 236's own hedge before the section pointer, the approved governing-provision sentence (unregressed)", () => {
  const hook = e1Hook();
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "E1 S2");
  assertEquals(
    rendered,
    "The company has stated that the decision is a healthcare decision. Algorithmic health-risk profiling of this kind is the class of processing California's significant-decision rules address (11 CCR §§ 7001(ddd)(5), 7200(a)). In Garante, Azienda Universitaria Friuli Occidentale, Garante found that where an algorithmic system scores or profiles individuals to guide a healthcare decision, using an algorithm and patients' own data to build risk profiles without a valid legal basis, and without completing a required DPIA, is unlawful — in its own words, \"the DPA found that the health authority did not have a valid legal basis to process patients\". That finding cuts against the company's position on the significant-decision determination. This decision was decided under the GDPR, not California's ADMT rules, so it is persuasive only here; whether it applies to this company depends on what this company's own system actually decides, what legal basis supports the profiling, and whether the required assessments were completed first. Whether that holds on this record is addressed in Section 2. (Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022; foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)",
  );
  assert(rendered.endsWith(E1_CITATION_236));
  assert(rendered.includes(`${E1_HEDGE_236} Whether that holds`), `hedge must precede the section pointer, not follow the citation: ${rendered}`);
  assert(!rendered.includes("cited only by analogy; whether it applies here depends on this company's own facts, not on the decision's"), `generic constant leaked: ${rendered}`);
});

Deno.test("doc238 ADMT — {governing_provision} degrades gracefully (CEO ruling 2026-09-09: DECIDED, kept — never fail-closed), consistent with Risk's own design choice", () => {
  const hook = e1Hook({ governing_provision_sentence: undefined });
  const rendered = assertClean(renderSentence(hook, "S2", hook.fact_atoms, undefined), "E1 no provision");
  assert(rendered.includes("the decision is a healthcare decision. In Garante"), `expected the sentence to vanish cleanly: ${rendered}`);
  assert(rendered.endsWith(E1_CITATION_236));
});

Deno.test("doc238 ADMT — S1-S4 carry {governing_provision}; S5a/S5b/S6/S6x do not (the proposition/condition slots already state the rule there)", () => {
  for (const shape of ["S1", "S2", "S3", "S4"] as const) {
    assert(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), `${shape} missing {governing_provision}`);
  }
  for (const shape of ["S5a", "S5b", "S6", "S6x"] as const) {
    assertNotEquals(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), true, `${shape} should not carry {governing_provision}`);
  }
});
