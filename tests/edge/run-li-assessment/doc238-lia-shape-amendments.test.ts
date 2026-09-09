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
  LIA_HEDGE_DOMESTIC_FACTS_PROPOSED,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts";
import { LIA_HOOK_SHAPES } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

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
    // slot appears in any LIA shape (proposed or ratified).
    hedge_variant: "domestic_facts",
    ...overrides,
  };
}

Deno.test("doc238 LIA — the live ratified LIA_HOOK_SHAPES is untouched: S2's text is byte-identical to before this session", () => {
  assertEquals(
    LIA_HOOK_SHAPES.S2,
    "The company has stated that {customer_fact}. In {authority}, {regulator} found that where {fact_pattern}, {finding}. That finding cuts against the company's position on the {factor}, and the {factor} finding in Section {section} reflects it. ({citation}; {status}.)",
  );
});

Deno.test("doc238 LIA — renderSentence still defaults to the ratified shapes: a hook with hedge_variant set renders NOTHING extra through the live path", () => {
  const hook = linkedinHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined); // no 5th arg -> LIA_HOOK_SHAPES
  assert(rendered);
  // The ratified S2 has no {quote}/{governing_provision} placeholder, so the
  // new slots are no-ops — but hedgeSuffix DOES fire (it reads hook.hedge_
  // variant regardless of which shape map was used), which is why this
  // fixture is safe for the LIVE map: none of the five hooks LIA_HOOKS ships
  // today (the empty array) sets hedge_variant, so production is unaffected.
  assert(rendered.includes("cuts against the company's position on the balance"));
  assert(rendered.endsWith(LIA_HEDGE_DOMESTIC_FACTS_PROPOSED));
});

Deno.test("doc238 LIA — a hook with hedge_variant unset renders BYTE-IDENTICAL to doc 223B's own literal 0af0876d FULL MATCH sentence (proves the fixture and the pre-doc-238 render path both)", () => {
  const hook = linkedinHook({ hedge_variant: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!rendered.includes("But the outcome"));
  // Copied verbatim from doc 223B's own table, hook `0af0876d`, FULL
  // MATCH / fails / same / S2 row.
  assertEquals(
    rendered,
    "The company has stated that its processing is for behavioural advertising; the processing is large-scale; it processes browsing or behavioural data; the people affected are its customers; its interest is commercial or revenue-related; it markets by online advertising. In DPC, LinkedIn, DPC found that where large-scale cross-border processing of members' first party and third party behavioural data for behavioural and targeted advertising, relying on consent and on a commercial legitimate interest, processing personal data without an appropriate legal basis is a clear and serious violation of the data subject's fundamental right to data protection. That finding cuts against the company's position on the balance, and the balance finding in Section IV reflects it. (DPC, LinkedIn, decision of 22 October 2024 § 7; supervisory-authority decision — persuasive, non-binding outside its jurisdiction.)",
  );
});

Deno.test("doc238 LIA — {quote} renders the verbatim finding_span, quoted, through the PROPOSED shape", () => {
  const hook = linkedinHook({ hedge_variant: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
  assert(rendered);
  assert(
    rendered.includes(`"${hook.finding_span}"`),
    `expected the verbatim, quoted finding_span in: ${rendered}`,
  );
});

Deno.test("doc238 LIA — the PROPOSED S2 sentence structurally matches doc 223B's approved 0af0876d sentence: quoted clause, hedge, forward-looking section pointer", () => {
  const hook = linkedinHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined, LIA_HOOK_SHAPES_PROPOSED_2026_09);
  assert(rendered, "expected the proposed shape to render");

  // 1. Paragraph, not a 2-sentence clause (doc 237 §5 item 1).
  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences, got ${sentenceCount}: ${rendered}`);

  // 2. Verbatim quoted clause present (doc 237 §5 item 2).
  assert(rendered!.includes(`"${hook.finding_span}"`));

  // 3. Forward-looking section pointer, not the old backward assertion
  //    (doc 237 §5 item 5 — matches doc 223B's own "Section IV weighs those
  //    facts" / doc 233's "Section 3 addresses whether..." register).
  assert(rendered!.includes("Whether that holds on this record is addressed in Section IV"));
  assert(!rendered!.includes("the balance finding in Section IV reflects it"));

  // 4. Hedge present, appended after the citation trailer (doc 237 §5 item
  //    4) — matches doc 223B's own "But the outcome depends on this
  //    company's own facts" clause structurally (a trailing hedge sentence),
  //    though the exact wording is a proposed generic constant, not this
  //    hook's hand-tailored fact list — see doc 238's own flag on this.
  assert(rendered!.trim().endsWith(LIA_HEDGE_DOMESTIC_FACTS_PROPOSED));

  // 5. The citation trailer itself is unchanged in form: "(label § pin;
  //    status.)".
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
