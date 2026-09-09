// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, LIA. Proves the
// new render mechanism (the `{quote}` slot, the optional
// `{governing_provision}` slot, `hedgeSuffix`) actually works, and — the
// critical safety property — that none of it changes a single byte of the
// LIVE-RATIFIED `LIA_HOOK_SHAPES`/`LIA_ATOM_PHRASES`/etc. or the sentences
// they render. `LIA_HOOK_SHAPES_PROPOSED_2026_09` is a NEW, separate,
// clearly-labelled export in hook-join.ts — never wired into
// `applyLiaHooks`'s own call to `renderSentence` (which still defaults its
// new 5th parameter to the live `LIA_HOOK_SHAPES`) — so this file is the
// ONLY place the proposed shape is exercised at all.
//
// DOC 238 FOLLOW-UP (2026-09-09, the hedge): doc 238's first cut appended
// ONE generic constant ("But the outcome here depends on this company's own
// facts, not on the cited authority's.") whenever `hedge_variant` was set.
// That sentence appears in no CEO-approved document. Doc 223B's approved
// hedge for `0af0876d` is hand-tailored to that hook, so the hedge is now
// per-hook DATA (`AuthorityHook.hedge_sentence`), the generic constant is
// gone, and `hedge_variant` is classification only. Of doc 223B's five
// settled hooks only `0af0876d` carries an approved hedge in this form:
// `63bf2fe9`, `66742297` and `a22b1399`'s approved paragraphs have no "the
// outcome depends on this company's own facts" clause, and `cbd38bc6` has no
// CEO draft at all — so none of those four may carry a `hedge_sentence`
// until the CEO writes one.
//
// DOC 238 FOLLOW-UP (2026-09-09, POSITION FIX): this pass also found the
// hedge was appended AFTER the citation parenthetical (`hedgeSuffix`, a pure
// trailing suffix), while every approved paragraph in docs 223B/233/234/236
// places the hedge BEFORE the citation (and, for LIA/DPIA specifically,
// before the forward-looking section pointer too) — e.g. doc 223B's own
// `0af0876d` paragraph: "...That decision weighs against the company's
// position here. But the outcome depends on this company's own facts:
// [...]. Section IV weighs those facts. (DPC, ...)". Fixed: `{hedge}` is now
// an inline slot inside the S1/S2 shape text itself (the "matching" shapes
// every approved hedge actually sits on), positioned right where doc 223B
// places it — right after the comparison sentence, before the section
// pointer and the citation. `hedgeSuffix` is gone; a hook without
// `hedge_sentence` still renders `{hedge}` as "", byte-identical to before.
//
// The `0af0876d` fixture below (DPC, LinkedIn) copies every citation/status/
// posture/settledness/pinpoint/atom field directly from doc 223B's own
// table for that hook. `finding_span` is not printed verbatim anywhere in
// doc 223B (only the derived `fact_pattern_paraphrase`/`finding_paraphrase`
// are), so it is a realistic placeholder in the DPC's own register — noted
// inline, not presented as the literal DB value.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import {
  renderSentence,
  LIA_HOOK_SHAPES_PROPOSED_2026_09,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts";
import { LIA_HOOK_SHAPES } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

/** Doc 223B, hook `0af0876d`, the CEO-approved simplified paragraph
 *  (2026-09-08) — its hedge sentence, copied VERBATIM. This is the only
 *  approved LIA hedge in existence. */
const LINKEDIN_HEDGE_223B =
  "But the outcome depends on this company's own facts: its purposes, the data involved, its safeguards, the effects on people, and what those people could reasonably expect.";

/** Doc 223B's own literal FULL MATCH / fails / same / S2 row for `0af0876d`
 *  — the sentence the LIVE, ratified path renders today. */
const LINKEDIN_LIVE_S2_223B =
  "The company has stated that its processing is for behavioural advertising; the processing is large-scale; it processes browsing or behavioural data; the people affected are its customers; its interest is commercial or revenue-related; it markets by online advertising. In DPC, LinkedIn, DPC found that where large-scale cross-border processing of members' first party and third party behavioural data for behavioural and targeted advertising, relying on consent and on a commercial legitimate interest, processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection. That finding cuts against the company's position on the balance, and the balance finding in Section IV reflects it. (DPC, LinkedIn, decision of 22 October 2024 § 7; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)";

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
    // Placeholder standing in for the DB's actual verbatim finding_span
    // (doc 223B does not print it) — every other field on this fixture is
    // copied directly from doc 223B's own table/prose for hook `0af0876d`.
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
    // DOC 238 proposed fields — LIA needs only the hedge; its sources ARE
    // its own governing law's authorities, so no `{governing_provision}`
    // slot appears in any LIA shape (proposed or ratified). The hedge is
    // this hook's OWN approved sentence (doc 223B), not a constant.
    hedge_variant: "domestic_facts",
    hedge_sentence: LINKEDIN_HEDGE_223B,
    ...overrides,
  };
}

Deno.test("doc238 LIA — the live ratified LIA_HOOK_SHAPES is untouched: S2's text is byte-identical to before this session", () => {
  assertEquals(
    LIA_HOOK_SHAPES.S2,
    "The company has stated that {customer_fact}. In {authority}, {regulator} found that where {fact_pattern}, {finding}. That finding cuts against the company's position on the {factor}, and the {factor} finding in Section {section} reflects it. ({citation}; {status}.)",
  );
});

Deno.test("doc238 LIA — a hook with hedge_sentence unset renders BYTE-IDENTICAL to doc 223B's own literal 0af0876d FULL MATCH sentence, even with hedge_variant still set (the variant never selects text)", () => {
  const hook = linkedinHook({ hedge_sentence: undefined });
  assertEquals(hook.hedge_variant, "domestic_facts"); // still set — must be inert
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined); // no 5th arg -> LIA_HOOK_SHAPES
  assertEquals(rendered, LINKEDIN_LIVE_S2_223B);
});

Deno.test("doc238 LIA — hedge_variant alone (either value, hedge_sentence null/empty/blank) renders NO hedge: there is no generic hedge constant left to fall back on", () => {
  for (const hedge_variant of ["domestic_facts", "foreign_analogy"] as const) {
    for (const hedge_sentence of [undefined, null, "", "   "]) {
      const hook = linkedinHook({ hedge_variant, hedge_sentence });
      assertEquals(renderSentence(hook, "S2", hook.fact_atoms, undefined), LINKEDIN_LIVE_S2_223B);
      const proposed = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
      assert(proposed);
      assert(proposed!.endsWith("non-binding outside its jurisdiction.)"), `unexpected suffix: ${proposed}`);
      assert(!proposed!.includes("own facts"));
    }
  }
});

Deno.test("doc238 LIA — renderSentence still defaults to the ratified shapes: a hook WITH hedge_sentence renders the live S2 UNCHANGED, since {hedge} is not a slot the live (frozen) shape text references", () => {
  const hook = linkedinHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined); // no 5th arg -> LIA_HOOK_SHAPES
  // `hedge` is populated in the slots map unconditionally, but `{hedge}`
  // only appears in the PROPOSED S1/S2 shapes, never in the live, frozen
  // LIA_HOOK_SHAPES — so a `split("{hedge}").join(...)` against the live
  // text has nothing to replace and is a true no-op, not a suffix append.
  // Production is unaffected either way: none of the hooks LIA_HOOKS ships
  // today (the empty array) sets hedge_sentence.
  assertEquals(rendered, LINKEDIN_LIVE_S2_223B);
});

Deno.test("doc238 LIA — {quote} renders the verbatim finding_span, quoted, through the PROPOSED shape", () => {
  const hook = linkedinHook({ hedge_sentence: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
  assert(rendered);
  assert(
    rendered.includes(`"${hook.finding_span}"`),
    `expected the verbatim, quoted finding_span in: ${rendered}`,
  );
});

Deno.test("doc238 LIA — the PROPOSED S2 rendering for 0af0876d is pinned byte-for-byte, and its hedge is doc 223B's own approved sentence for this hook, not a generic constant", () => {
  const hook = linkedinHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
  assert(rendered, "expected the proposed shape to render");

  // The hedge is the literal doc 223B sentence — the one thing in this
  // paragraph (beyond the ratified atoms/citation/status) that IS
  // CEO-approved wording — and the old generic constant is gone. It sits
  // BEFORE the section pointer and citation, matching doc 223B's own order
  // ("...position here. But the outcome depends... Section IV weighs those
  // facts. (DPC, ...)"), not trailing after the citation at the very end.
  assert(rendered!.includes(`the balance. ${LINKEDIN_HEDGE_223B} Whether`), `approved hedge missing/wrong position: ${rendered}`);
  assert(rendered!.endsWith(")"), `sentence must end at the citation, not the hedge: ${rendered}`);
  assert(!rendered!.includes("But the outcome here depends"), `generic constant leaked: ${rendered}`);

  // POSITION — FIXED (2026-09-09 follow-up): doc 223B's approved paragraph
  // places this hedge BEFORE the section pointer ("…That decision weighs
  // against the company's position here. But the outcome depends on this
  // company's own facts: […]. Section IV weighs those facts. (DPC, …)"),
  // i.e. inside the paragraph, ahead of the citation — `{hedge}` now sits
  // in exactly that position in the shape text.
  assertEquals(
    rendered,
    "The company has stated that its processing is for behavioural advertising; the processing is large-scale; it processes browsing or behavioural data; the people affected are its customers; its interest is commercial or revenue-related; it markets by online advertising. In DPC, LinkedIn, DPC found that where large-scale cross-border processing of members' first party and third party behavioural data for behavioural and targeted advertising, relying on consent and on a commercial legitimate interest, processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection — in its own words, \"processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection\". That finding cuts against the company's position on the balance. But the outcome depends on this company's own facts: its purposes, the data involved, its safeguards, the effects on people, and what those people could reasonably expect. Whether that holds on this record is addressed in Section IV. (DPC, LinkedIn, decision of 22 October 2024 § 7; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)",
  );
});

Deno.test("doc238 LIA — the PROPOSED S2 sentence structurally matches doc 223B's approved 0af0876d paragraph: quoted clause, forward-looking section pointer, citation trailer unchanged in form (structure only — the paragraph is NOT the approved prose byte-for-byte)", () => {
  const hook = linkedinHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
  assert(rendered, "expected the proposed shape to render");

  // 1. Paragraph, not a 2-sentence clause (doc 237 §5 item 1).
  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences, got ${sentenceCount}: ${rendered}`);

  // 2. Verbatim quoted clause present (doc 237 §5 item 2).
  assert(rendered!.includes(`"${hook.finding_span}"`));

  // 3. Forward-looking section pointer, not the old backward assertion
  //    (doc 237 §5 item 5). Doc 223B's own approved text is "Section IV
  //    weighs those facts." — the proposed shape's "Whether that holds on
  //    this record is addressed in Section IV." matches it in register,
  //    not in wording.
  assert(rendered!.includes("Whether that holds on this record is addressed in Section IV"));
  assert(!rendered!.includes("the balance finding in Section IV reflects it"));

  // 4. The citation trailer itself is unchanged in form: "(label § pin;
  //    status.)". Doc 223B's approved paragraph prints a DIFFERENT status
  //    label ("decision of a lead supervisory authority applying the GDPR")
  //    and a fuller case name — doc 238 §2.4's open status-label ruling.
  assert(rendered!.includes("(DPC, LinkedIn, decision of 22 October 2024 § 7; supervisory-authority decision"));
});

Deno.test("doc238 LIA — {governing_provision} is available as a slot mechanism but no LIA shape (proposed or ratified) references it — LIA's sources ARE its own governing law's authorities", () => {
  for (const shape of Object.values(LIA_HOOK_SHAPES_PROPOSED_2026_09)) {
    assertNotEquals(shape.includes("{governing_provision}"), true, `unexpected {governing_provision} in: ${shape}`);
  }
  for (const shape of Object.values(LIA_HOOK_SHAPES)) {
    assertNotEquals(shape.includes("{governing_provision}"), true, `unexpected {governing_provision} in ratified shape: ${shape}`);
  }
});
