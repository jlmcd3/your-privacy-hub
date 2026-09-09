// DOC 238 (2026-09-09) + DOC 223B RATIFICATION FOLLOW-UP (2026-09-09) — the
// paragraph-form shape mechanism, and its PROMOTION to be the live,
// production LIA shape map.
//
// Through 2026-09-09 this file proved a SEPARATE, non-live
// `LIA_HOOK_SHAPES_PROPOSED_2026_09` export worked, without touching the
// live, frozen `LIA_HOOK_SHAPES` at all. That export is gone: the CEO
// authorized promoting it to BE `LIA_HOOK_SHAPES` (lia-hooks.ts's own header
// comment has the full rationale) — this file now tests the promoted,
// production shape map directly, no second map.
//
// Separately, and more importantly: doc 223B's own "Implementation note" for
// each of its four approved hooks says the approved paragraph does not fit
// even the paragraph-form shape as a slot substitution (different sentence
// breaks, no quoted clause on some, hand-tailored asides) — the CEO's own
// words, this session: "the 'simplified' prose was - and is - CEO ratified."
// So those four hooks (`0af0876d`, `63bf2fe9`, `66742297`, `a22b1399`) render
// through `AuthorityHook.literal_sentence_override` instead (hook-types.ts):
// their DB rows now carry doc 223B's approved paragraph, verbatim, and
// `renderSentence` prints it unchanged, bypassing shape/slot logic entirely.
// `cbd38bc6` has no CEO draft in doc 223B (its own ratify line is blank) and
// carries no override — not part of this ratification round.
//
// The four fixture strings below are read from
// `tests/fixtures/doc223b/ratified-<id>.txt` — copied, not retyped, from a
// script that extracted them directly from doc 223B's own markdown via
// regex, specifically to avoid the transcription-loss risk this project has
// hit before with hand-relayed text (see `project_large_text_writes_never_
// through_chat` in memory). The live DB values were verified byte-length-
// identical to these same files before this test file was written.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { citationFor, deriveSourceStatus, shortLabelFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts";
import { LIA_HOOK_SHAPES, LIA_SOURCE_STATUS_LABELS, LIA_APPEAL_SENTENCE } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc223b/", import.meta.url);
async function fixture(id: string): Promise<string> {
  return (await Deno.readTextFile(new URL(`ratified-${id}.txt`, FIXTURE_DIR))).trim();
}

const LINKEDIN_RATIFIED = await fixture("0af0876d");
const VIDEO_DEVICES_RATIFIED = await fixture("63bf2fe9");
const SUBWAY_RATIFIED = await fixture("66742297");
const DIRECT_MARKETING_RATIFIED = await fixture("a22b1399");

/** Doc 223B, hook `0af0876d` — every non-prose field copied directly from
 *  doc 223B's own table for that hook. `finding_span` is not printed
 *  verbatim anywhere in doc 223B, so it is a realistic placeholder in the
 *  DPC's own register, not presented as the literal DB value. */
function linkedinHook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  return {
    hook_id: "enforcement_actions:0af0876d:v1",
    profile_id: "0af0876d",
    source_row_id: "0af0876d",
    fact_atoms: [
      "class:behavioral_advertising",
      "flag:large_scale",
      "data_category:Browsing/behavioural data",
      "relationship:customer",
      "state:intake.purpose_details.interest_type=Commercial / revenue-related",
      "state:intake.purpose_details.marketing_channels.online_advertising=true",
    ],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: ["class:behavioral_advertising"],
    finding_span:
      "processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection",
    fact_pattern_paraphrase:
      "large-scale cross-border processing of members' first party and third party behavioural data for behavioural and targeted advertising, relying on consent and on a commercial legitimate interest",
    finding_paraphrase:
      "processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Balancing of interests, rights and freedoms",
    bears_on_element: "balancing",
    authority_label: "DPC, LinkedIn, decision of 22 October 2024",
    authority_label_short: "DPC, LinkedIn",
    regulator: "DPC",
    verb: "found",
    source_status: "sa_decision",
    status_label: "supervisory-authority decision — persuasive, non-binding outside its jurisdiction",
    pinpoint: { kind: "section", ref: "7", anchor_span: "processing personal data without an appropriate legal basis" },
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Balancing of interests, rights and freedoms"],
      use_case_class: "behavioral_advertising",
      relationship: "customer",
      data_categories: ["Browsing/behavioural data"],
      flags: ["large_scale"],
      outcome_posture: "rejected",
    },
    hedge_variant: "domestic_facts",
    hedge_sentence:
      "But the outcome depends on this company's own facts: its purposes, the data involved, its safeguards, the effects on people, and what those people could reasonably expect.",
    ...overrides,
  };
}

// ── The promoted live shape map ─────────────────────────────────────────────

Deno.test("doc238 LIA — LIA_HOOK_SHAPES is the PROMOTED paragraph-form map: S2 carries {quote}/{hedge} and the forward-looking pointer, not the old clause-form text", () => {
  assertEquals(
    LIA_HOOK_SHAPES.S2,
    "The company has stated that {customer_fact}. In {authority}, {regulator} found that where {fact_pattern}, {finding} — in its own words, \"{quote}\". That finding cuts against the company's position on the {factor}. {hedge}Whether that holds on this record is addressed in Section {section}. ({citation}; {status}.)",
  );
  assertNotEquals(
    LIA_HOOK_SHAPES.S2.includes("and the {factor} finding in Section {section} reflects it"),
    true,
    "the old clause-form S2 text must be gone, not merely duplicated",
  );
});

Deno.test("doc238 LIA — {governing_provision} is available as a slot mechanism but no LIA shape references it — LIA's sources ARE its own governing law's authorities", () => {
  for (const shape of Object.values(LIA_HOOK_SHAPES)) {
    assertNotEquals(shape.includes("{governing_provision}"), true, `unexpected {governing_provision} in: ${shape}`);
  }
});

// ── literal_sentence_override — the four ratified hooks ────────────────────

Deno.test("doc238 LIA — literal_sentence_override renders VERBATIM, bypassing shape/slot logic entirely: 0af0876d reproduces doc 223B's own ratified paragraph byte-for-byte", () => {
  const hook = linkedinHook({ literal_sentence_override: LINKEDIN_RATIFIED });
  // Deliberately pass garbage for shape/factAtomsHolding/pair — none of it
  // should be consulted once literal_sentence_override is set.
  const rendered = renderSentence(hook, "S2", [], undefined);
  assertEquals(rendered, LINKEDIN_RATIFIED);
  assert(rendered!.startsWith("The company has stated that it processes browsing and behavioural data"));
  assert(rendered!.endsWith("decision of a lead supervisory authority applying the GDPR.)"));
});

Deno.test("doc238 LIA — literal_sentence_override for the other three ratified hooks (63bf2fe9, 66742297, a22b1399), each byte-for-byte against doc 223B", () => {
  const base = linkedinHook();
  for (
    const [ratified, ends] of [
      [VIDEO_DEVICES_RATIFIED, "EDPB Guidelines, adopted 29 January 2020 — interpretive guidance.)"],
      [SUBWAY_RATIFIED, "decision of the Icelandic supervisory authority applying the GDPR and Icelandic electronic-surveillance rules.)"],
      [DIRECT_MARKETING_RATIFIED, "regulatory guidance interpreting the UK GDPR and PECR.)"],
    ] as const
  ) {
    const hook: AuthorityHook = { ...base, literal_sentence_override: ratified };
    const rendered = renderSentence(hook, "S5a", [], undefined);
    assertEquals(rendered, ratified);
    assert(rendered!.endsWith(ends), `expected to end with ${JSON.stringify(ends)}: ${rendered}`);
  }
});

Deno.test("doc238 LIA — a hook WITHOUT literal_sentence_override is unaffected: renders through the promoted shape/slot mechanism as normal, none of the four fixtures leak in", () => {
  const hook = linkedinHook({ hedge_sentence: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assertNotEquals(rendered, LINKEDIN_RATIFIED);
  assert(rendered!.includes(`"${hook.finding_span}"`), `expected the {quote} slot to have fired: ${rendered}`);
});

Deno.test("doc238 LIA — literal_sentence_override still takes appealSuffix (a fact about the source discovered after ratification, not part of the ratified text) but never a hedge/quote/shape slot on top", () => {
  const hook = linkedinHook({
    literal_sentence_override: LINKEDIN_RATIFIED,
    source_status: "sa_decision_appeal_pending",
  });
  const rendered = renderSentence(hook, "S2", [], undefined);
  assertEquals(rendered, `${LINKEDIN_RATIFIED} ${LIA_APPEAL_SENTENCE}`);
});

Deno.test("doc238 LIA — literal_sentence_override null/undefined/empty all fall through to normal rendering (graceful, matches every other optional-field convention in this codebase)", () => {
  const base = linkedinHook({ hedge_sentence: undefined });
  for (const override of [null, undefined, ""]) {
    const hook: AuthorityHook = { ...base, literal_sentence_override: override };
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered);
    assertNotEquals(rendered, LINKEDIN_RATIFIED);
  }
});

// ── DOC 238 §5 item 6 FOLLOW-UP (2026-09-09) — the shared `deriveSourceStatus`
// gained a per-product `sa_decision` override for Risk/ADMT. LIA's label is
// LIVE-RATIFIED (LIA_SOURCE_STATUS_LABELS) and doc 223B's approved paragraphs
// vary hook-by-hook with no matrix-level ruling — that per-hook wording now
// lives entirely inside each hook's own `literal_sentence_override`, not in
// a shared matrix change, so `deriveSourceStatus` for product "lia" is
// UNCHANGED. Pinned here through the real generate-time path against the
// real `enforcement_actions` row for DPC/LinkedIn (`69eee35f`: regulator
// "DPC", subject "LinkedIn", decision_date 2024-10-22, appeal_status
// "unknown" — verified live 2026-09-09). ────────────────────────────────────

const linkedinProfile: HookProfileRow = {
  id: "0af0876d",
  source_table: "enforcement_actions",
  source_row_id: "69eee35f-a280-47be-8159-bf778767ff31",
  outcome_posture: "rejected",
  instrument: "EU GDPR",
  factor_ids: ["Balancing of interests, rights and freedoms"],
  ratified_by: "ceo",
  ratified_at: "2026-09-08T00:00:00Z",
  ledger_ref: "doc223b",
};
const linkedinSource: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "DPC",
  subject: "LinkedIn",
  decision_date: "2024-10-22",
  appeal_status: "unknown",
};

Deno.test("doc238 LIA — deriveSourceStatus for product 'lia' derives the RATIFIED LIA_SOURCE_STATUS_LABELS.sa_decision text, unchanged by the per-product override or by the ratification promotion; the derived citation facts reproduce doc 223B's own label/short label", () => {
  const status = deriveSourceStatus(linkedinProfile, linkedinSource, { appeal_note: null, verified_as_of: null }, "lia");
  assert(!("exclude" in status));
  if (!("exclude" in status)) {
    assertEquals(status.status_label, LIA_SOURCE_STATUS_LABELS.sa_decision);
    assertEquals(status.status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
    assertEquals(status.status_in_citation, true);
    assertEquals(status.verb, "found");
    const noProduct = deriveSourceStatus(linkedinProfile, linkedinSource, { appeal_note: null, verified_as_of: null });
    assertEquals(noProduct, status);
    const cite = citationFor(linkedinProfile, linkedinSource);
    assertEquals(cite?.authority_label, "DPC, LinkedIn, decision of 22 October 2024"); // doc 223B's own "Authority label"
    assertEquals(shortLabelFor(linkedinProfile, linkedinSource), "DPC, LinkedIn"); // doc 223B's own "Short label"
  }
});

Deno.test("doc238 LIA — the render-time tidy pass is a byte-for-byte no-op on doc 223B's own ratified paragraphs and hedge", () => {
  for (const text of [LINKEDIN_RATIFIED, VIDEO_DEVICES_RATIFIED, SUBWAY_RATIFIED, DIRECT_MARKETING_RATIFIED]) {
    assertEquals(tidyRenderedSentence(text), text);
  }
});
