import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertFactorLineBeforeConclusion,
  emitAggregationNoteIfMulti,
  isBQuestionIntake,
  filterInfoNeededToBQuestions,
  AGGREGATION_NOTE_TEXT,
} from "../../../../supabase/functions/_shared/ltp/renderer-181.ts";

Deno.test("renderer-181: order assertion passes when factors precede conclusion", () => {
  const parts = [
    { kind: "factor_line" }, { kind: "factor_line" }, { kind: "conclusion_firm" },
  ];
  assertEquals(assertFactorLineBeforeConclusion(parts), null);
});

Deno.test("renderer-181: order assertion fails when factor after conclusion", () => {
  const parts = [
    { kind: "conclusion_firm" }, { kind: "factor_line" },
  ];
  const err = assertFactorLineBeforeConclusion(parts);
  if (!err || !err.startsWith("factor_line_after_conclusion")) throw new Error(`unexpected: ${err}`);
});

Deno.test("renderer-181: aggregation note emits only when N>1", () => {
  assertEquals(emitAggregationNoteIfMulti(0), "");
  assertEquals(emitAggregationNoteIfMulti(1), "");
  assertEquals(emitAggregationNoteIfMulti(2), AGGREGATION_NOTE_TEXT);
});

Deno.test("renderer-181: (B)-question predicate accepts questions, rejects statements", () => {
  assertEquals(isBQuestionIntake("Please describe your processing?"), true);
  assertEquals(isBQuestionIntake("What is your retention period"), true);
  assertEquals(isBQuestionIntake("Retention period: 30 days"), false);
  assertEquals(isBQuestionIntake(""), false);
  assertEquals(isBQuestionIntake(null), false);
});

Deno.test("renderer-181: filter drops non-B entries", () => {
  const entries = [
    { intake_label: "What is X?" },
    { intake_label: "X = 5" },
    { intake_label: "Please confirm Y" },
  ];
  const out = filterInfoNeededToBQuestions(entries);
  assertEquals(out.length, 2);
});
