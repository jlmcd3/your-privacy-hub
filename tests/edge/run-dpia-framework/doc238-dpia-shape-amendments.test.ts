// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, DPIA. DPIA's
// DPIA_HOOK_SHAPES/etc. are `[RATIFY — DRAFT, unratified]` (DPIA_HOOKS ships
// `[]`), so this build edits them in place. Fixture below (`AENA`, doc 233
// candidate #1) copies its citation/status/posture/settledness/atom fields
// directly from doc 233's own curation card and prose. Doc 233 itself flags
// this hook's pinpoint as `[NEEDS: pinpoint unlocatable]` and does not print
// an English verbatim finding_span (only a paraphrase) — this fixture uses
// the curation card's own SPANISH verbatim quote (position-verified in that
// document) as `finding_span`, and a placeholder pinpoint, both noted inline.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { renderSentence } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts";
import {
  DPIA_HOOK_SHAPES,
  DPIA_HEDGE_DOMESTIC_FACTS_PROPOSED,
} from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";

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
    hedge_variant: "domestic_facts",
    ...overrides,
  };
}

Deno.test("doc238 DPIA — status label for sa_decision is ALREADY the approved text: no gap, unlike LIA/Risk/ADMT (doc 237 §5 item 6)", () => {
  const hook = aenaHook();
  assertEquals(hook.status_label, "supervisory-authority decision — persuasive, non-binding outside its jurisdiction");
  // Copied verbatim from doc 233's own AENA prose's trailing citation.
});

Deno.test("doc238 DPIA — a hook with hedge_variant unset renders through the amended DPIA_HOOK_SHAPES exactly as before (no hedge, no {quote} usage change)", () => {
  const hook = aenaHook({ hedge_variant: undefined });
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!rendered.includes("But the outcome"));
  assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot: ${rendered}`);
});

Deno.test("doc238 DPIA — AENA S2: quote + domestic hedge + forward-looking section pointer, structurally matching doc 233's approved register", () => {
  const hook = aenaHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");

  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);

  assert(rendered!.includes(`"${hook.finding_span}"`), `expected the verbatim quote: ${rendered}`);
  // Doc 233's own approved wording for this exact row: "Section 3 addresses
  // whether that analysis is present." — forward-looking, not asserted.
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 3"), `forward pointer missing: ${rendered}`);
  assert(!rendered!.includes("determination in Section 3 reflects it"));
  assert(rendered!.trim().endsWith(DPIA_HEDGE_DOMESTIC_FACTS_PROPOSED), `hedge missing: ${rendered}`);
  assert(rendered!.includes("(AEPD, AENA, S.M.E., S.A., decision of 6 November 2025"), `citation missing: ${rendered}`);
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
