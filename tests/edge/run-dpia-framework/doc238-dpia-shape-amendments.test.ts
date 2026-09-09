// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, DPIA. DPIA's
// DPIA_HOOK_SHAPES/etc. are `[RATIFY — DRAFT, unratified]` (DPIA_HOOKS ships
// `[]`), so this build edits them in place.
//
// DOC 238 FOLLOW-UP (2026-09-09, the hedge): the generic
// `DPIA_HEDGE_DOMESTIC_FACTS_PROPOSED` constant ("But the outcome here
// depends on this company's own facts, not on the cited authority's.") is
// gone — that sentence appears in no approved document. Every approved DPIA
// hedge in doc 233 is "But the outcome depends on this company's own facts:
// <that hook's own fact list>", so the hedge is per-hook DATA
// (`AuthorityHook.hedge_sentence`, rendered verbatim by `hedgeSuffix`) and
// `hedge_variant` is classification only.
//
// Two fixtures:
//   - AENA (doc 233 #1). Its "CEO: ratify / revise / retire" line in doc 233
//     is BLANK — this prose is NOT approved. Kept as a MECHANISM fixture only
//     (quote slot, forward pointer, backward compatibility); nothing it
//     renders is asserted as ratified wording, and it carries NO hedge.
//   - Comune di Bolzano (doc 233 #6) — "CEO approved the revised prose, both
//     the obligation-fires and distinguished versions (2026-09-08)". Its
//     approved S2-style paragraph carries a hedge, copied verbatim below.
//     Its citation is composed by the REAL `citationFor` from the row facts
//     doc 233 prints, and the rendered citation parenthetical reproduces the
//     approved one byte-for-byte. Its paraphrase fields are fixture
//     placeholders derived from the approved prose (doc 233 prints the
//     approved paragraph, not the DB's paraphrase columns), labelled inline.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { citationFor, deriveSourceStatus, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts";
import { DPIA_HOOK_SHAPES, DPIA_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";

// ── AENA — doc 233 #1, NOT approved (ratify line blank) — mechanism only ──

function aenaHook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  return {
    hook_id: "enforcement_actions:8113274e:v1",
    profile_id: "8113274e",
    source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
    fact_atoms: ["flag:biometric", "flag:large_scale"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    // Doc 233's own curation card (position()=90 in key_compliance_failure);
    // Spanish, not translated — the aid translation lives only in the
    // rendered prose, matching the doc's own convention for this row.
    finding_span:
      "la falta de inclusión en la Evaluación de Impacto relativa a la Protección de Datos (EIPD) de un análisis de idoneidad, necesidad y proporcionalidad del tratamiento de datos biométricos de los pasajeros",
    fact_pattern_paraphrase: "biometric data is used to identify passengers at scale",
    finding_paraphrase:
      "a DPIA that omits a structured suitability, necessity and proportionality analysis of the specific biometric measure does not satisfy Article 35(7) GDPR",
    settledness: "R3",
    posture: "rejected",
    factor_id: "the adequacy of the biometric-processing analysis",
    bears_on_element: "adequacy",
    authority_label: "AEPD, AENA, S.M.E., S.A., decision of 6 November 2025",
    authority_label_short: "AEPD, AENA",
    regulator: "the AEPD",
    verb: "found",
    source_status: "sa_decision",
    status_label: "supervisory-authority decision — persuasive, non-binding outside its jurisdiction",
    // Doc 233 flags this row's pinpoint `[NEEDS: pinpoint unlocatable]` —
    // placeholder, not a real DB value.
    pinpoint: { kind: "page", ref: "1", anchor_span: "la falta de inclusión" },
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["the adequacy of the biometric-processing analysis"],
      use_case_class: null,
      relationship: null,
      data_categories: ["Biometric data"],
      flags: ["biometric", "large_scale"],
      outcome_posture: "rejected",
    },
    // No hedge: AENA's prose is unapproved, so no hedge_sentence may exist.
    ...overrides,
  };
}

// ── Comune di Bolzano — doc 233 #6, CEO APPROVED (2026-09-08) ─────────────

/** Doc 233 #6, obligation-fires (S2-style) paragraph, the hedge sentence
 *  copied VERBATIM. */
const BOLZANO_HEDGE_233 =
  "But the outcome depends on this company's own facts: whether the monitoring is organized and ongoing (systematic), or occasional and incidental.";

/** The approved paragraph's trailing citation, verbatim. */
const BOLZANO_CITATION_233 =
  "(Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)";

const bolzanoProfile: HookProfileRow = {
  id: "profile-bolzano",
  source_table: "enforcement_actions",
  source_row_id: "dbfca969-3139-43d1-8a5b-7fff179f8db6",
  outcome_posture: "rejected",
  instrument: "EU GDPR",
  factor_ids: ["the employee-monitoring trigger"],
  ratified_by: "ceo",
  ratified_at: "2026-09-08T00:00:00Z",
  ledger_ref: "doc233-6",
};
// Row facts exactly as doc 233's curation card prints them (Garante, 13 May
// 2021). No `regulator_english_name` (no DB column exists — doc 238 §1.4)
// and no resolved appeal status, so `citationFor`'s doc-238 additions are
// both no-ops here — the label is the pre-doc-238 composition.
const bolzanoSource: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "Garante",
  subject: "Comune di Bolzano",
  decision_date: "2021-05-13",
};

function bolzanoHook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  const cite = citationFor(bolzanoProfile, bolzanoSource);
  assert(cite);
  return {
    hook_id: "enforcement_actions:dbfca969:v1",
    profile_id: bolzanoProfile.id,
    source_row_id: bolzanoProfile.source_row_id,
    fact_atoms: ["class:employee_monitoring"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: ["class:employee_monitoring"],
    // Doc 233's curation card quote (key_compliance_failure, position()=18).
    finding_span:
      "The municipality unlawfully monitored employee internet usage and processed sensitive health data without a valid legal basis or proper transparency",
    // Fixture placeholders derived from doc 233 #6's approved paragraph
    // ("…found that systematic monitoring of employee internet usage
    // requires a DPIA under WP248's 'systematic monitoring' criterion —
    // even where the monitoring is not carried out on a large scale") — NOT
    // the DB's paraphrase columns (doc 233 does not print them) and NOT
    // asserted below as ratified wording.
    fact_pattern_paraphrase: "an employer monitors employees' internet usage",
    finding_paraphrase:
      "systematic monitoring of employee internet usage requires a DPIA under WP248's \"systematic monitoring\" criterion, even where the monitoring is not carried out on a large scale",
    settledness: "R3",
    posture: "rejected",
    factor_id: "the employee-monitoring trigger",
    bears_on_element: "obligation",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "found",
    source_status: "sa_decision",
    status_label: "supervisory-authority decision — persuasive, non-binding outside its jurisdiction",
    pinpoint: null, // doc 233: `[NEEDS: pinpoint unlocatable]` — the approved citation carries none
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["the employee-monitoring trigger"],
      use_case_class: "employee_monitoring",
      relationship: "employee",
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    hedge_variant: "domestic_facts",
    hedge_sentence: BOLZANO_HEDGE_233,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

Deno.test("doc238 DPIA — DPIA_SOURCE_STATUS_LABELS.sa_decision is ALREADY the text every approved doc 233 SA-decision paragraph prints: no status-label gap for DPIA (doc 237 §5 item 6)", () => {
  assertEquals(DPIA_SOURCE_STATUS_LABELS.sa_decision, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
});

Deno.test("doc238 DPIA — a hook with hedge_sentence unset renders through the amended DPIA_HOOK_SHAPES with no hedge and no unresolved slot (every hook DPIA_HOOKS ships today)", () => {
  const hook = aenaHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!rendered.includes("own facts"));
  assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot: ${rendered}`);
});

Deno.test("doc238 DPIA — hedge_variant alone (either value, hedge_sentence unset) renders NO hedge: there is no generic DPIA hedge constant left", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    const hook = bolzanoHook({ hedge_variant, hedge_sentence: undefined });
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered);
    assert(rendered!.endsWith(BOLZANO_CITATION_233), `expected to end at the citation: ${rendered}`);
    assert(!rendered!.includes("own facts"));
  }
});

Deno.test("doc238 DPIA — Comune di Bolzano (APPROVED, doc 233 #6): S2 carries doc 233's own hedge sentence for this hook, verbatim, positioned before the section pointer and citation, and the citation parenthetical reproduces the approved one byte-for-byte", () => {
  const hook = bolzanoHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");
  assert(rendered!.endsWith(BOLZANO_CITATION_233), `sentence must end at the approved citation, not the hedge: ${rendered}`);
  assert(!rendered!.includes("But the outcome here depends"), `generic constant leaked: ${rendered}`);
  assert(rendered!.includes(`"${hook.finding_span}"`), `verbatim quote missing: ${rendered}`);
  // Doc 233's approved pointer is "Section 1 records whether that trigger is
  // satisfied." — the amended S2's "Whether that holds on this record is
  // addressed in Section 1." matches in register (forward-looking), NOT in
  // wording. Doc 238 §3.2 calls the approved sentence "the literal target
  // text this change matches"; it is the register, not the letter.
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 1"), `forward pointer missing: ${rendered}`);
  // Pinned byte-for-byte so the mechanism's output is deterministic. Only
  // the citation parenthetical and the hedge are CEO-approved wording; the
  // customer-fact atom phrase and the paraphrases are fixture placeholders.
  // POSITION — FIXED (2026-09-09 follow-up): as in LIA, doc 233 places the
  // hedge BEFORE "Section 1 records …" and before the citation; `{hedge}`
  // now sits in exactly that position.
  assertEquals(
    rendered,
    "The record identifies that the processing monitors employees. In Garante, Comune di Bolzano, decision of 13 May 2021, Garante found that where an employer monitors employees' internet usage, systematic monitoring of employee internet usage requires a DPIA under WP248's \"systematic monitoring\" criterion, even where the monitoring is not carried out on a large scale — in its own words, \"The municipality unlawfully monitored employee internet usage and processed sensitive health data without a valid legal basis or proper transparency\". That finding cuts against the assessment's position on the employee-monitoring trigger. But the outcome depends on this company's own facts: whether the monitoring is organized and ongoing (systematic), or occasional and incidental. Whether that holds on this record is addressed in Section 1. (Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)",
  );
});

Deno.test("doc238 DPIA — AENA (NOT approved — doc 233 #1's ratify line is blank): MECHANISM check only — quote slot + forward-looking pointer resolve through the amended S2", () => {
  const hook = aenaHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");

  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);
  assert(rendered!.includes(`"${hook.finding_span}"`), `expected the verbatim quote: ${rendered}`);
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 3"), `forward pointer missing: ${rendered}`);
  assert(!rendered!.includes("determination in Section 3 reflects it"));
  assert(rendered!.includes("(AEPD, AENA, S.M.E., S.A., decision of 6 November 2025"), `citation missing: ${rendered}`);
  assert(!rendered!.includes("own facts"), `no hedge may render for an unapproved hook: ${rendered}`);
});

// ── DOC 238 §5 item 6 FOLLOW-UP (2026-09-09) — the shared `deriveSourceStatus`
// gained a per-product `sa_decision` override for Risk/ADMT. DPIA is the
// reference for "what correct looks like" (every approved doc 233 paragraph
// prints the shared text), so these pin that the shared code path still
// derives EXACTLY the same label for DPIA, and that the Bolzano paragraph
// built from the DERIVED status is byte-identical to the pinned one. ──────

const BOLZANO_PINNED_S2 =
  "The record identifies that the processing monitors employees. In Garante, Comune di Bolzano, decision of 13 May 2021, Garante found that where an employer monitors employees' internet usage, systematic monitoring of employee internet usage requires a DPIA under WP248's \"systematic monitoring\" criterion, even where the monitoring is not carried out on a large scale — in its own words, \"The municipality unlawfully monitored employee internet usage and processed sensitive health data without a valid legal basis or proper transparency\". That finding cuts against the assessment's position on the employee-monitoring trigger. But the outcome depends on this company's own facts: whether the monitoring is organized and ongoing (systematic), or occasional and incidental. Whether that holds on this record is addressed in Section 1. (Garante, Comune di Bolzano, decision of 13 May 2021; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)";

Deno.test("doc238 DPIA — deriveSourceStatus for product 'dpia' still derives the shared sa_decision label (the text every approved doc 233 paragraph prints) with the status clause in the citation: the Risk/ADMT override does not reach DPIA", () => {
  const status = deriveSourceStatus(bolzanoProfile, bolzanoSource, { appeal_note: null, verified_as_of: null }, "dpia");
  assert(!("exclude" in status));
  if (!("exclude" in status)) {
    assertEquals(status.status_label, DPIA_SOURCE_STATUS_LABELS.sa_decision);
    assertEquals(status.status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
    assertEquals(status.status_in_citation, true);
    assertEquals(status.verb, "found");
    // A Bolzano hook built from the DERIVED status (the real generate-time
    // path) renders byte-identical to the hand-pinned paragraph.
    const hook = bolzanoHook({ status_label: status.status_label, status_in_citation: status.status_in_citation, verb: status.verb, source_status: status.source_status });
    assertEquals(renderSentence(hook, "S2", hook.fact_atoms, undefined), BOLZANO_PINNED_S2);
  }
});

Deno.test("doc238 DPIA — the render-time tidy pass is a byte-for-byte no-op on the pinned Bolzano paragraph and on doc 233's approved citation parenthetical", () => {
  assertEquals(tidyRenderedSentence(BOLZANO_PINNED_S2), BOLZANO_PINNED_S2);
  assertEquals(tidyRenderedSentence(BOLZANO_CITATION_233), BOLZANO_CITATION_233);
});

Deno.test("doc238 DPIA — a DPIA hook whose data ever said status_in_citation=false would still render cleanly (mechanism only — no DPIA hook does): the trailer closes right after the citation, no '; .)' artifact", () => {
  const hook = bolzanoHook({ status_in_citation: false });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(rendered!.endsWith("(Garante, Comune di Bolzano, decision of 13 May 2021.)"), rendered);
  assert(!rendered!.includes("; .") && !rendered!.includes("  "), rendered);
});

Deno.test("doc238 DPIA — no DPIA_HOOK_SHAPES entry references {governing_provision}: DPIA's sources ARE its own governing law's authorities (doc 237 §5 item 3's beneficiary list is Risk/ADMT/LIA's UK-guidance hooks only, not DPIA)", () => {
  for (const [name, shape] of Object.entries(DPIA_HOOK_SHAPES)) {
    assertNotEquals(shape.includes("{governing_provision}"), true, `${name} unexpectedly references {governing_provision}`);
  }
});

Deno.test("doc238 DPIA — every shape carries {quote} except the ones with no natural place for it (S3/S4 which already quote via {source_fact}/finding)", () => {
  for (const name of ["S1", "S2", "S5a", "S5b", "S6", "S6x"] as const) {
    assert(DPIA_HOOK_SHAPES[name].includes("{quote}"), `${name} missing {quote}`);
  }
});
