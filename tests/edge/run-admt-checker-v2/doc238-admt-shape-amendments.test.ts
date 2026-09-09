// DOC 238 (2026-09-09) — PROPOSED shape-amendment plumbing, ADMT. ADMT's
// ADMT_HOOK_SHAPES/etc. are `[RATIFY — DRAFT, unratified]` (ADMT_HOOKS ships
// `[]`), so this build edits them in place. Two real candidates from doc
// 236, chosen to exercise both hedge variants with sections that are
// ALREADY wired in SECTION_FOR_ELEMENT (the Governance factor G1-G3 use —
// "Notice content" (§ 7220(c)(1), the notice-content/01 FSOR row, domestic)
// and E1 (Garante, Friuli Occidentale, foreign analogy) — is NOT wired to
// any section yet (doc 236 §3/§8.2's own [NEEDS]; out of this build's scope
// per doc 237 §5 item 9), so neither test below depends on it.

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { citationFor, type HookProfileRow, type HookSourceRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { renderSentence } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import {
  ADMT_HOOK_SHAPES,
  ADMT_HEDGE_DOMESTIC_FACTS_PROPOSED,
  ADMT_HEDGE_FOREIGN_ANALOGY_PROPOSED,
} from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

// ── "Notice content" — FSOR, domestic (doc 236 §7, row notice-content/01) ──

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
const noticeSource: HookSourceRow = {
  source_table: "cppa_fsor_commentary",
  regulation_citation: "11 CCR § 7220(c)(1)",
};

function noticeContentHook(): AuthorityHook {
  const cite = citationFor(noticeProfile, noticeSource);
  assert(cite);
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
    fact_pattern_paraphrase: "the Pre-use Notice states the ADMT's purpose only in generic terms",
    finding_paraphrase: "vague language about a planned ADMT use undermines a consumer's ability to exercise the opt-out and access rights",
    settledness: "R1",
    posture: "rejected",
    factor_id: "Notice content",
    bears_on_element: "Notice content",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "states",
    source_status: "regulator_guidance",
    status_label: "CPPA Final Statement of Reasons — agency position, primary regulator commentary",
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
    governing_provision_sentence: "The CPPA's regulations require more specific language than a generic purpose statement (11 CCR § 7220(c)(1)).",
    hedge_variant: "domestic_facts",
  };
}

// ── E1 — Garante, Friuli Occidentale (doc 236 §"E1"), foreign analogy ──────

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
const e1Source: HookSourceRow = {
  source_table: "enforcement_actions",
  regulator: "Garante",
  subject: "Azienda Universitaria Friuli Occidentale",
  decision_date: "2022-12-15",
  appeal_status: "unknown", // real DB value (verified read-only this session)
  // Placeholder — no DB column carries this (doc 238 §7); approved prose's
  // own parenthetical is "(Italian Data Protection Authority)".
  regulator_english_name: "Italian Data Protection Authority",
};

function e1Hook(): AuthorityHook {
  const cite = citationFor(e1Profile, e1Source);
  assert(cite);
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
    fact_pattern_paraphrase: "an algorithmic system scores or profiles individuals to guide a healthcare decision",
    finding_paraphrase: "using an algorithm and patients' own data to build risk profiles without a valid legal basis, and without completing a required DPIA, is unlawful",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Significant decision",
    bears_on_element: "Significant decision",
    authority_label: cite!.authority_label,
    regulator: cite!.regulator,
    verb: "found",
    source_status: "sa_decision",
    status_label: "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations",
    pinpoint: { kind: "page", ref: "1", anchor_span: "the DPA found that the health authority" },
    relevance: {
      instrument: "GDPR",
      factor_ids: ["Significant decision"],
      use_case_class: "healthcare",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    governing_provision_sentence:
      "Algorithmic health-risk profiling of this kind is the class of processing California's significant-decision rules address (11 CCR §§ 7001(ddd)(5), 7200(a)).",
    hedge_variant: "foreign_analogy",
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

Deno.test("doc238 ADMT — citationFor composes the English-regulator parenthetical for E1 (placeholder data; regulator_canonical on the real DB row is the NATIVE name, verified read-only this session)", () => {
  const cite = citationFor(e1Profile, e1Source);
  assertEquals(cite?.authority_label, "Garante (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale, decision of 15 December 2022");
});

Deno.test("doc238 ADMT — a hook with hedge_variant/governing_provision_sentence unset renders through the amended ADMT_HOOK_SHAPES exactly as before", () => {
  const hook = { ...noticeContentHook(), hedge_variant: undefined, governing_provision_sentence: undefined };
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!rendered.includes("own facts") && !rendered.includes("fixed rule"));
  assert(!/\{[a-z_]+\}/.test(rendered!), `unresolved slot: ${rendered}`);
  assert(!rendered!.includes("  "), `stray double space: ${rendered}`);
});

Deno.test("doc238 ADMT — 'Notice content' (FSOR): quote + governing_provision + DOMESTIC hedge, structurally matching doc 236's approved register", () => {
  const hook = noticeContentHook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");

  const sentenceCount = (rendered!.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert(sentenceCount >= 4, `expected >= 4 sentences: ${rendered}`);
  assert(rendered!.includes(hook.governing_provision_sentence!));
  assert(rendered!.includes(`"${hook.finding_span}"`));
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 3"));
  assert(rendered!.trim().endsWith(ADMT_HEDGE_DOMESTIC_FACTS_PROPOSED));
  assert(!rendered!.includes(ADMT_HEDGE_FOREIGN_ANALOGY_PROPOSED));
});

Deno.test("doc238 ADMT — E1 (enforcement): quote + governing_provision + FOREIGN-ANALOGY hedge (doc 236 §4.5's own restructuring of this exact row)", () => {
  const hook = e1Hook();
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered, "expected S2 to render");
  assert(rendered!.includes(hook.governing_provision_sentence!));
  assert(rendered!.includes(`"${hook.finding_span}"`));
  assert(rendered!.includes("Whether that holds on this record is addressed in Section 2"));
  assert(rendered!.trim().endsWith(ADMT_HEDGE_FOREIGN_ANALOGY_PROPOSED));
  assert(!rendered!.includes(ADMT_HEDGE_DOMESTIC_FACTS_PROPOSED));
  assert(rendered!.includes("Garante (Italian Data Protection Authority), Azienda Universitaria Friuli Occidentale"));
});

Deno.test("doc238 ADMT — {governing_provision} degrades gracefully (not fail-closed), consistent with Risk's own design choice", () => {
  const hook = { ...e1Hook(), governing_provision_sentence: undefined };
  const rendered = renderSentence(hook, "S2", hook.fact_atoms, undefined);
  assert(rendered);
  assert(!/\{[a-z_]+\}/.test(rendered!));
});

Deno.test("doc238 ADMT — S1-S4 carry {governing_provision}; S5a/S5b/S6/S6x do not (the proposition/condition slots already state the rule there)", () => {
  for (const shape of ["S1", "S2", "S3", "S4"] as const) {
    assert(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), `${shape} missing {governing_provision}`);
  }
  for (const shape of ["S5a", "S5b", "S6", "S6x"] as const) {
    assertNotEquals(ADMT_HOOK_SHAPES[shape].includes("{governing_provision}"), true, `${shape} should not carry {governing_provision}`);
  }
});
