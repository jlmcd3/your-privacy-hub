/**
 * ITEM 242 CP-C RIDER — GROUNDED-NOTE LAW joint tests.
 *
 * Covers: prompt version bump, tokenizer/normalization spec (positive AND
 * negative fixtures), lexicon-membership, ledger-verbatim grounding
 * (including numerals), registry-vocabulary grounding, deterministic
 * replacement form, and the run-#179 "audience insights" fixture that
 * MUST fire a replacement. Legitimate inflected notes MUST NOT fire.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  PASS1_GROUNDED_NOTE_VERSION,
  CONNECTIVE_LEXICON,
  tokenize,
  buildGroundedSet,
  isGrounded,
  applyGroundedNoteScreen,
} from "../_shared/ltp/pass1-grounded-note.ts";
import { PASS1_DERIVE_PROMPT_VERSION, PASS1_DERIVE_SYSTEM } from "../_shared/ltp/content/pass1-derive-prompt.ts";
import { PASS1_LLM_STAMP } from "../_shared/ltp/pass1-llm.ts";
import type { IntakeLedgerEntry, RenderPlan } from "../_shared/render-plan/schema.ts";

const LEDGER: readonly IntakeLedgerEntry[] = [
  { ledger_id: "L.q4_pi_categories", intake_field: "q4_pi_categories", value: "email address, IP address", display: "Categories of personal information processed" },
  { ledger_id: "L.q15_sensitive_pi", intake_field: "q15_sensitive_pi", value: false, display: "Sensitive personal information in scope" },
  { ledger_id: "L.i2_retention_period", intake_field: "i2_retention_period", value: "24 months", display: "Retention period" },
] as const;

function planWithNote(factor_id: string, note: string): RenderPlan {
  return {
    plan_version: "v1", product: "cppa-risk-assessment", build_stamp: "test", jurisdiction_tag: "cppa-ca",
    intake_ledger: LEDGER, citation_bindings: [], propositions: [],
    factor_table: [{
      factor_id, kind: "benefit", jurisdiction_tag: "cppa-ca",
      present_in_intake: true, intake_ledger_refs: [], guidance_refs: [],
      anchor: { corpus_key: "cppa", pinpoint: "11 CCR § 7152(a)(1)" } as any,
      weight_note: note,
    } as any],
    weighing_frame: [], gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  } as RenderPlan;
}

Deno.test("rider — prompt version bumped and Rule 9 disclosure present", () => {
  assertEquals(PASS1_DERIVE_PROMPT_VERSION, "pass1-derive-2026-07-28-item242-cpC-rider-grounded-note");
  assert(PASS1_LLM_STAMP.includes("rider-grounded-note"));
  assert(PASS1_DERIVE_SYSTEM.includes("GROUNDED-NOTE LAW"));
  assert(PASS1_DERIVE_SYSTEM.includes("DETERMINISTICALLY REPLACES"));
  assert(PASS1_GROUNDED_NOTE_VERSION.startsWith("pass1-grounded-note@"));
});

Deno.test("rider — tokenizer: case-fold, quotes stripped, hyphens kept", () => {
  const toks = tokenize('The intake “records” 24-month retention.');
  assert(toks.includes("the"));
  assert(toks.includes("intake"));
  assert(toks.includes("records"));
  assert(toks.includes("24-month"));
  assert(!toks.some((t) => t.includes('"') || t.includes("\u201C")));
});

Deno.test("rider — inflection tolerance: plural + verb forms of grounded tokens pass", () => {
  const set = buildGroundedSet(LEDGER);
  // "record" is in the lexicon; "records", "recorded", "recording" must ground
  for (const t of ["record", "records", "recorded", "recording"]) {
    assert(isGrounded(t, set), `expected inflection "${t}" to be grounded`);
  }
  // "document" family
  for (const t of ["documents", "documented"]) assert(isGrounded(t, set));
});

Deno.test("rider — numerals grounded only via ledger substring match", () => {
  const set = buildGroundedSet(LEDGER);
  assert(isGrounded("24", set), "24 appears in '24 months' ledger verbatim");
  assert(!isGrounded("36", set), "36 has no ledger source");
});

Deno.test("rider — POSITIVE: legitimate inflected note does NOT fire a replacement", () => {
  // "the intake records email address for the stated purpose" — every
  // content token is either a lexicon inflection or a ledger verbatim.
  const plan = planWithNote("benefit.example", "the intake records email address for the stated purpose");
  const { plan: out, telemetry } = applyGroundedNoteScreen(plan);
  assertEquals(telemetry.replacements, 0, `unexpected replacement: ${JSON.stringify(telemetry.details)}`);
  assertEquals(out.factor_table[0].weight_note, "the intake records email address for the stated purpose");
});

Deno.test("rider — NEGATIVE (run #179): 'audience insights' fires the replacement", () => {
  const plan = planWithNote("benefit.marketing", "delivers audience insights for the campaign");
  const { plan: out, telemetry } = applyGroundedNoteScreen(plan);
  assertEquals(telemetry.replacements, 1);
  assertEquals(telemetry.candidates, 1);
  assertEquals(telemetry.replacement_rate, 1);
  assert(telemetry.details[0].ungrounded_tokens.includes("audience") || telemetry.details[0].ungrounded_tokens.includes("insights"));
  // Deterministic replacement form
  const replaced = String(out.factor_table[0].weight_note ?? "");
  assert(
    replaced.startsWith('the intake records "') || replaced === "no record evidence",
    `unexpected replacement form: ${replaced}`,
  );
});

Deno.test("rider — telemetry surfaces tuning threshold and over-threshold flag", () => {
  const plan: RenderPlan = {
    ...planWithNote("benefit.a", "delivers audience insights for the campaign"),
  };
  // Add three more rows: one clean, two ungrounded → 3/4 = 75% > 25%
  (plan.factor_table as any).push(
    { factor_id: "benefit.b", kind: "benefit", jurisdiction_tag: "cppa-ca", present_in_intake: true, intake_ledger_refs: [], guidance_refs: [], anchor: {} as any, weight_note: "leveraging synergistic paradigms" },
    { factor_id: "benefit.c", kind: "benefit", jurisdiction_tag: "cppa-ca", present_in_intake: true, intake_ledger_refs: [], guidance_refs: [], anchor: {} as any, weight_note: "the intake records email address" },
    { factor_id: "benefit.d", kind: "benefit", jurisdiction_tag: "cppa-ca", present_in_intake: true, intake_ledger_refs: [], guidance_refs: [], anchor: {} as any, weight_note: "growth-hacking funnel optimization" },
  );
  const { telemetry } = applyGroundedNoteScreen(plan);
  assertEquals(telemetry.candidates, 4);
  assertEquals(telemetry.replacements, 3);
  assertEquals(telemetry.tuning_threshold_rate, 0.25);
  assertEquals(telemetry.over_threshold, true);
});

Deno.test("rider — CONNECTIVE LEXICON is closed and non-empty", () => {
  assert(CONNECTIVE_LEXICON.length > 50, "lexicon must not be empty");
  // Sanity: forbidden marketing tokens must NOT be in the lexicon.
  for (const bad of ["audience", "insights", "synergistic", "growth-hacking"]) {
    assert(!CONNECTIVE_LEXICON.includes(bad), `forbidden token in lexicon: ${bad}`);
  }
});
