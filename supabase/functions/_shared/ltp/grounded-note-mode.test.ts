/**
 * ITEM 261 — GROUNDED-NOTE SCREEN OBSERVE-MODE DEMOTION (SPEC §6).
 *
 * (a) observe mode (the DEFAULT) leaves every weight_note byte-identical
 *     and never throws — even at replacement_rate 1.0 — while telemetry
 *     still reports candidates/would-replace count/rate/details.
 * (b) enforce mode is UNCHANGED: it replaces notes and still aborts
 *     fail-loud above the 0.5 mass-replace threshold. This is the
 *     regression guard for a future promotion courier.
 */
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  PASS1_GROUNDED_NOTE_VERSION,
  GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD,
  GroundedNoteMassReplaceAbort,
  applyGroundedNoteScreen,
} from "./grounded-note.ts";
import { PASS1_LLM_STAMP } from "./pass1-llm.ts";
import type { IntakeLedgerEntry, RenderPlan } from "../render-plan/schema.ts";

const LEDGER: readonly IntakeLedgerEntry[] = [
  {
    ledger_id: "L.i1_processing_purpose",
    intake_field: "i1_processing_purpose",
    value: "fraud detection",
    display: "Stated processing purpose",
  },
] as const;

function planWithNotes(notes: readonly string[]): RenderPlan {
  return {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "test",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: LEDGER,
    citation_bindings: [],
    propositions: [],
    factor_table: notes.map((weight_note, i) => ({
      factor_id: `benefit.${i}`,
      kind: "benefit",
      jurisdiction_tag: "cppa-ca",
      present_in_intake: true,
      intake_ledger_refs: ["L.i1_processing_purpose"],
      guidance_refs: [],
      anchor: { corpus_key: "cppa", pinpoint: "11 CCR § 7152(a)(1)" } as never,
      weight_note,
    })) as never,
    weighing_frame: [],
    gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  } as unknown as RenderPlan;
}

// The observed run-#179/attempt-3 false-positive register: ordinary
// derivational English whose stems are grounded.
const REAL_NOTES = [
  "the setting supports fraud detection",
  "human review applies to each request",
  "the records include audience insights",
  "growth-hacking funnel optimization",
] as const;

Deno.test("item261 — version + stamp bumped", () => {
  assertEquals(PASS1_GROUNDED_NOTE_VERSION, "pass1-grounded-note@2026-07-30-item267-calibration");
  assertEquals(PASS1_LLM_STAMP, "ltp-pass1-llm-item261-grounded-observe@2026-07-29");
});

Deno.test("item261 — DEFAULT is observe: notes byte-identical, no throw at rate 1.0", () => {
  const plan = planWithNotes(REAL_NOTES);
  const { plan: out, telemetry } = applyGroundedNoteScreen(plan);
  assertEquals(telemetry.mode, "observe");
  assertEquals(telemetry.candidates, REAL_NOTES.length);
  assertEquals(telemetry.replacements, REAL_NOTES.length, "all four are would-replace");
  assertEquals(telemetry.replacement_rate, 1);
  assert(telemetry.replacement_rate > GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD);
  assertEquals(telemetry.over_threshold, true);
  for (let i = 0; i < REAL_NOTES.length; i++) {
    assertEquals(out.factor_table[i].weight_note, REAL_NOTES[i], "note must be byte-identical");
  }
  // details are still fully populated for calibration
  assertEquals(telemetry.details.length, REAL_NOTES.length);
  assert(telemetry.details.every((d) => d.ungrounded_tokens.length > 0));
  assert(telemetry.details.every((d) => d.original_note.length > 0 && d.replacement_note.length > 0));
});

Deno.test("item261 — explicit observe mode behaves identically to the default", () => {
  const a = applyGroundedNoteScreen(planWithNotes(REAL_NOTES));
  const b = applyGroundedNoteScreen(planWithNotes(REAL_NOTES), { mode: "observe" });
  assertEquals(a.telemetry.replacements, b.telemetry.replacements);
  assertEquals(
    a.plan.factor_table.map((r) => r.weight_note),
    b.plan.factor_table.map((r) => r.weight_note),
  );
});

Deno.test("item261 — enforce mode still REPLACES (regression for future promotion)", () => {
  // 1 ungrounded of 4 → rate 0.25, below the abort threshold.
  const plan = planWithNotes([
    "growth-hacking funnel optimization",
    "the intake records fraud detection",
    "the intake records fraud detection",
    "the intake records fraud detection",
  ]);
  const { plan: out, telemetry } = applyGroundedNoteScreen(plan, { mode: "enforce" });
  assertEquals(telemetry.mode, "enforce");
  assertEquals(telemetry.replacements, 1);
  assertEquals(telemetry.replacement_rate, 0.25);
  const replaced = String(out.factor_table[0].weight_note ?? "");
  assert(
    replaced.startsWith('the intake records "') || replaced === "no record evidence",
    `unexpected replacement form: ${replaced}`,
  );
});

Deno.test("item261 — enforce mode still ABORTS above 0.5", () => {
  const plan = planWithNotes(REAL_NOTES);
  const err = assertThrows(
    () => applyGroundedNoteScreen(plan, { mode: "enforce" }),
    GroundedNoteMassReplaceAbort,
  );
  assertEquals((err as GroundedNoteMassReplaceAbort).replacement_rate, 1);
  assertEquals((err as GroundedNoteMassReplaceAbort).telemetry.mode, "enforce");
});
