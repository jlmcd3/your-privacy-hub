// DOC 234 RATIFICATION — PREP ONLY (2026-09-09). The four CPPA Risk candidates
// whose own "CEO: ratify / revise / retire" line in doc 234 reads "CEO approved
// the revised prose (2026-09-09)":
//   Candidate 1  AP (NL), International Card Services  (dc095815)
//   Candidate 2  Garante (IT), Poste Italiane           (a3cf40b0)
//   Candidate 3  AEPD (ES), Cartonajes Bañeres          (e58dfa97)
//   Candidate 4  Garante (IT), Comune di Bolzano        (dbfca969)
// Candidates 5–18 (every FSOR candidate) have a BLANK ratify line and are not
// touched.
//
// NO `authority_hooks` ROW EXISTS FOR ANY OF THESE YET: as of 2026-09-09
// `authority_relevance_profiles` holds ZERO `product = 'cppa-risk'` rows (doc
// 239 §2.3's seeding SQL has not been run), so there is no `profile_id` to
// link to. This test therefore proves the RENDER mechanism only — that
// `renderSentence` (run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts,
// which gained the same `literal_sentence_override` check LIA's join has)
// reproduces each approved paragraph byte-for-byte from the fixture — so the
// DB write, once profiles exist, is a pure data step (see
// tests/fixtures/doc234/hooks-prep.json for the per-candidate wiring).
//
// The fixtures (`tests/fixtures/doc234/ratified-<id>.txt`) were extracted by
// a script from doc 234's own markdown: its prose blockquotes are hard-
// wrapped (14–16 `> ` lines each), joined with single spaces. Candidate 1's
// Dutch quotation was wrapped in markdown italics (`*"…"*`) in the source;
// the two `*` markers were stripped (the quotation marks stay). Nothing else
// in these four was marked up. Flagged for the CEO in the ratification
// report — the stripped form is what a plain-text report can print.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { tidyRenderedSentence } from "../../../supabase/functions/_shared/corpus/hook-render-tidy.ts";
import { renderSentence } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";
import { RISK_APPEAL_SENTENCE, RISK_SOURCE_STATUS_LABELS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

const FIXTURE_DIR = new URL("../../fixtures/doc234/", import.meta.url);
async function fixture(id: string): Promise<string> {
  return (await Deno.readTextFile(new URL(`ratified-${id}.txt`, FIXTURE_DIR))).trim();
}

const ICS = await fixture("dc095815");
const POSTE = await fixture("a3cf40b0");
const CARTONAJES = await fixture("e58dfa97");
const BOLZANO = await fixture("dbfca969");

/** A realistic Risk enforcement-analogy hook (doc 234 Candidate 3's own
 *  card: rejected, "Regulatory trigger and applicability" first, biometric
 *  attendance tracking). Non-prose fields are the card's; the shape path
 *  needs them only for the fall-through test below. */
function cartonajesHook(overrides: Partial<AuthorityHook> = {}): AuthorityHook {
  return {
    hook_id: "enforcement_actions:e58dfa97:v1",
    profile_id: "profile-c3-not-yet-seeded",
    source_row_id: "e58dfa97-b038-4ffa-9ca4-2b9aba436bbb",
    fact_atoms: ["flag:sensitive_pi", "data_category:Biometric information", "flag:profiling_or_systematic_observation"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: ["flag:biometric_data"],
    // Doc 234 Candidate 3's card quote (key_compliance_failure, Spanish,
    // position()=1 — re-verified live 2026-09-09).
    finding_span:
      "realiza una fotografía de la cara de los empleados desde un dispositivo situado en la entrada y no informa del uso de la imagen",
    fact_pattern_paraphrase: "an employer photographing employees' faces at an entry-point device to track attendance without telling them how the images are used",
    finding_paraphrase: "biometric attendance tracking deployed without disclosure or a completed risk assessment is unlawful",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Regulatory trigger and applicability",
    bears_on_element: "Regulatory trigger and applicability",
    authority_label: "Agencia Española de Protección de Datos (Spanish Data Protection Agency), Cartonajes Bañeres, S.A., decision PS-00361-2023, 5 January 2024",
    authority_label_short: "AEPD, Cartonajes Bañeres",
    regulator: "the AEPD",
    verb: "found",
    source_status: "sa_decision",
    status_label: RISK_SOURCE_STATUS_LABELS.sa_decision,
    pinpoint: null,
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Regulatory trigger and applicability", "Safeguards"],
      use_case_class: null,
      relationship: null,
      data_categories: ["Biometric information"],
      flags: ["biometric_data", "sensitive_pi"],
      outcome_posture: "rejected",
    },
    hedge_variant: "foreign_analogy",
    ...overrides,
  };
}

const ALL: readonly [string, string][] = [["dc095815", ICS], ["a3cf40b0", POSTE], ["e58dfa97", CARTONAJES], ["dbfca969", BOLZANO]];

Deno.test("doc234 Risk — each approved paragraph renders VERBATIM through renderSentence via literal_sentence_override, bypassing shape/slot logic (every shape, garbage atoms/pair)", () => {
  for (const [id, ratified] of ALL) {
    const hook = cartonajesHook({ literal_sentence_override: ratified });
    for (const shape of ["S1", "S2", "S3", "S4", "S5a", "S5b", "S6", "S6x"] as const) {
      assertEquals(renderSentence(hook, shape, [], undefined), ratified, `${id} via ${shape}`);
    }
  }
});

Deno.test("doc234 Risk — the four fixtures are the approved paragraphs: CA-rule-first opening, the approved citation parentheticals, no markdown residue, no wrap artifacts", () => {
  for (const [id, text] of ALL) {
    assert(text.startsWith("The company has said"), `${id}: opening`);
    assert(text.endsWith(".)"), `${id}: must end at the citation parenthetical`);
    assert(!text.includes("*") && !text.includes("\n") && !text.includes("  "), `${id}: markup/newline/double-space leaked`);
    assert(text.length > 1000, `${id}: suspiciously short`);
  }
  assert(ICS.endsWith("(Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal; foreign supervisory-authority decision, cited by analogy — not binding on California regulators.)"));
  // The Dutch quotation survives the italic-marker strip with its quotation marks intact.
  assert(ICS.includes("In its own words: \"ICS heeft nagelaten om een DPIA uit te voeren voordat het bedrijf in 2019 begon met het digitaal identificeren van klanten in Nederland\" — \"ICS failed to carry out a DPIA"));
  assert(POSTE.endsWith("not independently re-translated from the Italian decision this session.)"));
  assert(CARTONAJES.endsWith("(Agencia Española de Protección de Datos (Spanish Data Protection Agency), Cartonajes Bañeres, S.A., decision PS-00361-2023, 5 January 2024; foreign supervisory-authority decision, cited by analogy.)"));
  assert(BOLZANO.endsWith("(Garante per la protezione dei dati personali, Comune di Bolzano, decision of 13 May 2021; foreign supervisory-authority decision, cited by analogy.)"));
});

Deno.test("doc234 Risk — literal_sentence_override still takes appealSuffix, nothing else on top", () => {
  const hook = cartonajesHook({ literal_sentence_override: CARTONAJES, source_status: "sa_decision_appeal_pending" });
  assertEquals(renderSentence(hook, "S2", [], undefined), `${CARTONAJES} ${RISK_APPEAL_SENTENCE}`);
});

Deno.test("doc234 Risk — a hook WITHOUT literal_sentence_override (null/undefined/empty) falls through to the shape path and never reproduces an approved paragraph", () => {
  for (const override of [null, undefined, ""]) {
    const hook = cartonajesHook({ literal_sentence_override: override });
    const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
    assert(rendered, "shape path should still render");
    for (const [, text] of ALL) assertNotEquals(rendered, text);
    assert(rendered!.includes(`"${hook.finding_span}"`), `the {quote} slot should fire on the shape path: ${rendered}`);
  }
});

Deno.test("doc234 Risk — the render-time tidy pass is a byte-for-byte no-op on every approved paragraph", () => {
  for (const [, text] of ALL) assertEquals(tidyRenderedSentence(text), text);
});
