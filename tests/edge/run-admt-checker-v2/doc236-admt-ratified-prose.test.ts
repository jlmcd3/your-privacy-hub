// DOC 236 RATIFICATION — PREP ONLY (2026-09-09). All ten ADMT candidates in
// doc 236 carry "CEO approved the prose (2026-09-09)" on their own ratify line:
//   G1  § 7150(b)(6) training risk        (f77eaad2, FSOR)   — Governance, no attachment point yet
//   G2  § 7155(a)(3) material change      (be2a91bc, FSOR)   — Governance, no attachment point yet
//   G3  § 7155(c) 31 Dec 2027 deadline    (c6d63d10, FSOR)   — Governance, no attachment point yet
//   E1  Garante, Friuli Occidentale       (a3463b6c, enforcement, foreign analogy)
//   Notice content § 7220(c)(1)           (7f616c44, FSOR)
//   Opt-out § 7221(c)(4) cookie banners   (4b2d39e1, FSOR)
//   Opt-out § 7221(b)(2)(A) appeal reviewer (2951b3e7, FSOR)
//   Access § 7222(b)(1)                   (84d00bed, FSOR)
//   Vendor § 7222(i)                      (88f44d5e, FSOR)
//   Significant decision § 7001(ddd)      (83bcecda, FSOR)
//
// NO `authority_hooks` ROW EXISTS FOR ANY OF THESE YET: as of 2026-09-09
// `authority_relevance_profiles` holds ZERO `product = 'admt'` rows (doc 239
// §3.3's seeding SQL has not been run), so there is no `profile_id` to link
// to. This test proves the RENDER mechanism only — `renderSentence`
// (run-admt-checker-v2/_local/ltp/hook-join.ts, which gained the same
// `literal_sentence_override` check LIA's join has) reproduces each approved
// paragraph byte-for-byte from its fixture. Per-candidate wiring and the
// open [NEEDS] items are in tests/fixtures/doc236/hooks-prep.json.
//
// The fixtures were extracted by a script from doc 236's own markdown (hard-
// wrapped `> ` blockquotes joined with single spaces). Nine of the ten carry
// markdown BOLD on the quoted FSOR clause in the source (`**"…"**`; G2 bolds
// three clauses; the vendor row bolds an unquoted phrase); the `**` markers
// were stripped and counted — the words and quotation marks are untouched.
// Flagged for the CEO in the ratification report.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { renderSentence } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import { ADMT_APPEAL_SENTENCE, ADMT_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc236/", import.meta.url);
async function fixture(id: string): Promise<string> {
  return (await Deno.readTextFile(new URL(`ratified-${id}.txt`, FIXTURE_DIR))).trim();
}

const IDS = ["f77eaad2", "be2a91bc", "c6d63d10", "a3463b6c", "7f616c44", "4b2d39e1", "2951b3e7", "84d00bed", "88f44d5e", "83bcecda"] as const;
const RATIFIED = new Map<string, string>();
for (const id of IDS) RATIFIED.set(id, await fixture(id));

/** A realistic ADMT enforcement-analogy hook (doc 236 E1's own card: rejected,
 *  "Significant decision", healthcare profiling). The shape path needs the
 *  non-prose fields only for the fall-through test below. */
function e1Hook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  return {
    hook_id: "enforcement_actions:a3463b6c:v1",
    profile_id: "profile-e1-not-yet-seeded",
    source_row_id: "a3463b6c-d9d0-47b2-8528-1e416aae8885",
    fact_atoms: ["class:healthcare"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: ["class:healthcare"],
    // Doc 236 E1's card quote (raw_text, position()=408 — re-verified live 2026-09-09).
    finding_span: "the DPA found that the health authority did not have a valid legal basis to process patients",
    fact_pattern_paraphrase: "an algorithmic system scores or profiles individuals to guide a healthcare decision",
    finding_paraphrase: "building patient risk profiles by algorithm without a valid legal basis for that use, and without the required impact assessment, is unlawful",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Significant decision",
    bears_on_element: "Significant decision",
    authority_label: "Garante per la protezione dei dati personali (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022",
    authority_label_short: "Garante, Friuli Occidentale",
    regulator: "the Garante",
    verb: "found",
    source_status: "sa_decision",
    status_label: ADMT_SOURCE_STATUS_LABELS.sa_decision,
    pinpoint: null,
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Significant decision"],
      use_case_class: "healthcare",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    hedge_variant: "foreign_analogy",
    ...overrides,
  };
}

Deno.test("doc236 ADMT — each of the ten approved paragraphs renders VERBATIM through renderSentence via literal_sentence_override, bypassing shape/slot logic (every shape, garbage atoms/pair)", () => {
  for (const id of IDS) {
    const ratified = RATIFIED.get(id)!;
    const hook = e1Hook({ literal_sentence_override: ratified });
    for (const shape of ["S1", "S2", "S3", "S4", "S5a", "S5b", "S6", "S6x"] as const) {
      assertEquals(renderSentence(hook, shape, [], undefined), ratified, `${id} via ${shape}`);
    }
  }
});

Deno.test("doc236 ADMT — the fixtures are the approved paragraphs: no markdown residue, no wrap artifacts, each ends at its citation parenthetical; FSOR citations carry the CPPA form (no status clause), E1 carries the approved foreign-analogy status", () => {
  for (const id of IDS) {
    const text = RATIFIED.get(id)!;
    assert(text.endsWith(".)"), `${id}: must end at the citation parenthetical`);
    assert(!text.includes("*") && !text.includes("\n") && !text.includes("  "), `${id}: markup/newline/double-space leaked`);
    assert(text.length > 800, `${id}: suspiciously short`);
    if (id === "a3463b6c") {
      assert(text.endsWith("foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations.)"));
    } else {
      assert(text.includes("(California Privacy Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR §"), `${id}: FSOR citation form`);
      assert(!text.includes("; CPPA Final Statement of Reasons —"), `${id}: doc 236's approved FSOR citations carry no status clause`);
    }
  }
  // The bold-stripped quoted clauses keep their quotation marks and words.
  assert(RATIFIED.get("f77eaad2")!.includes("training uses of personal information \"pose significant risk to consumers' privacy,\" including"));
  assert(RATIFIED.get("be2a91bc")!.includes("a change is material if it \"creates new negative impacts,\" \"increases the magnitude or likelihood of previously identified negative impacts,\" or \"diminishes the effectiveness of safeguards.\""));
  assert(RATIFIED.get("88f44d5e")!.includes("changes the Agency itself describes as necessary for the regulations' internal consistency, not a narrowing"));
  assert(RATIFIED.get("7f616c44")!.startsWith("The company has described the ADMT's purpose in its Pre-use Notice in general terms"));
  assert(RATIFIED.get("4b2d39e1")!.endsWith("11 CCR § 7221(c)(4), Appendix p. 212.)"));
});

Deno.test("doc236 ADMT — literal_sentence_override still takes appealSuffix, nothing else on top", () => {
  const e1 = RATIFIED.get("a3463b6c")!;
  const hook = e1Hook({ literal_sentence_override: e1, source_status: "sa_decision_appeal_pending" });
  assertEquals(renderSentence(hook, "S2", [], undefined), `${e1} ${ADMT_APPEAL_SENTENCE}`);
});

Deno.test("doc236 ADMT — a hook WITHOUT literal_sentence_override (null/undefined/empty) falls through to the shape path and never reproduces an approved paragraph", () => {
  for (const override of [null, undefined, ""]) {
    const hook = e1Hook({ literal_sentence_override: override });
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered, "shape path should still render");
    for (const id of IDS) assertNotEquals(rendered, RATIFIED.get(id));
    assert(rendered!.includes(`"${hook.finding_span}"`), `the {quote} slot should fire on the shape path: ${rendered}`);
  }
});

Deno.test("doc236 ADMT — the render-time tidy pass is a byte-for-byte no-op on every approved paragraph", () => {
  for (const id of IDS) assertEquals(tidyRenderedSentence(RATIFIED.get(id)!), RATIFIED.get(id)!);
});
