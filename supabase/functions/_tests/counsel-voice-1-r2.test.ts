// CV1-R2 T4c coverage — pure predicate + one-round cap semantics.
// The regen dispatch itself is I/O-heavy and exercised only in staging;
// here we lock in the two properties the courier specifies:
//   1. Trigger predicate: eligible iff every failing deterministic check
//      is in {e5_bare_advisory_close, e6_counsel_referral} AND at least
//      one is failing.
//   2. One-round cap: report_data.regen_round > 0 blocks re-entry.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  isCounselVoiceRegenEligible,
  resolveEvalSourceRef,
  CV_REGEN_TRIGGER_CHECKS,
  type DetCheck,
} from "../_shared/grader/counsel-voice-regen.ts";

const p = (id: string, passed: boolean): DetCheck => ({ check_id: id, passed });

Deno.test("cv1-r2 predicate: empty / null → not eligible", () => {
  assertEquals(isCounselVoiceRegenEligible(undefined), false);
  assertEquals(isCounselVoiceRegenEligible(null), false);
  assertEquals(isCounselVoiceRegenEligible([]), false);
});

Deno.test("cv1-r2 predicate: all passing → not eligible", () => {
  assertEquals(
    isCounselVoiceRegenEligible([p("e5_bare_advisory_close", true), p("e6_counsel_referral", true), p("e4_no_instruction_leak", true)]),
    false,
  );
});

Deno.test("cv1-r2 predicate: only e6 failing → eligible", () => {
  assertEquals(
    isCounselVoiceRegenEligible([p("e6_counsel_referral", false), p("e5_advisory_formula_ok", true), p("e4_no_instruction_leak", true)]),
    true,
  );
});

Deno.test("cv1-r2 predicate: only e5 failing → eligible", () => {
  assertEquals(
    isCounselVoiceRegenEligible([p("e5_bare_advisory_close", false), p("e6_counsel_referral", true)]),
    true,
  );
});

Deno.test("cv1-r2 predicate: e5 AND e6 failing, everything else passing → eligible", () => {
  assertEquals(
    isCounselVoiceRegenEligible([
      p("e5_bare_advisory_close", false),
      p("e6_counsel_referral", false),
      p("e1_sections_ok", true),
      p("e2_heading_hierarchy_ok", true),
      p("e3_tbc_brackets_ok", true),
      p("e4_no_instruction_leak", true),
    ]),
    true,
  );
});

Deno.test("cv1-r2 predicate: e6 failing + a non-CV check failing → NOT eligible", () => {
  assertEquals(
    isCounselVoiceRegenEligible([p("e6_counsel_referral", false), p("e4_instruction_leak", false)]),
    false,
  );
  assertEquals(
    isCounselVoiceRegenEligible([p("e6_counsel_referral", false), p("e1_section_present", false)]),
    false,
  );
});

Deno.test("cv1-r2 predicate: non-CV failure alone → NOT eligible (scores never trigger)", () => {
  assertEquals(
    isCounselVoiceRegenEligible([p("e1_section_present", false), p("e6_counsel_referral", true)]),
    false,
  );
});

Deno.test("cv1-r2 trigger set is exactly {e5_bare_advisory_close, e6_counsel_referral}", () => {
  assertEquals([...CV_REGEN_TRIGGER_CHECKS].sort(), ["e5_bare_advisory_close", "e6_counsel_referral"]);
});

Deno.test("cv1-r2 one-round cap: regen_round marker on report_data blocks re-entry", () => {
  // The cap in run-quality-batch is enforced by:
  //   const alreadyRegenerated = Number(reportData?.regen_round ?? 0) > 0;
  //   if (!alreadyRegenerated && isCounselVoiceRegenEligible(...)) { ... }
  // This test locks the semantics of that guard in pure form.
  const capGuard = (reportData: any) => Number(reportData?.regen_round ?? 0) > 0;
  assertEquals(capGuard(undefined), false);
  assertEquals(capGuard({}), false);
  assertEquals(capGuard({ regen_round: 0 }), false);
  assertEquals(capGuard({ regen_round: 1 }), true);
  assertEquals(capGuard({ regen_round: 2 }), true); // defense-in-depth
});

// -------- CV1-R3 F1: source-ref resolution --------
// Defect: evalSource* was assigned only in the eval-resume branch, so the
// CV1-R2 gate saw null on the fresh-generation path. resolveEvalSourceRef
// picks the first non-null ref (eval-resume wins when both present, fresh
// otherwise), so the auto-regen predicate is source-populated on BOTH
// paths.

Deno.test("cv1-r3 resolveEvalSourceRef: null when neither ref populated", () => {
  assertEquals(resolveEvalSourceRef(null, null), null);
  assertEquals(resolveEvalSourceRef({ table: null, rowId: null }, { table: null, rowId: null }), null);
  assertEquals(resolveEvalSourceRef({ table: "cppa_assessments", rowId: null }, null), null);
});

Deno.test("cv1-r3 resolveEvalSourceRef: fresh-gen path (eval null) resolves", () => {
  const r = resolveEvalSourceRef(
    { table: null, rowId: null },
    { table: "cppa_assessments", rowId: "abc-123" },
  );
  assertEquals(r, { table: "cppa_assessments", rowId: "abc-123" });
});

Deno.test("cv1-r3 resolveEvalSourceRef: eval-resume path resolves and wins over fresh", () => {
  const r = resolveEvalSourceRef(
    { table: "dpia_frameworks", rowId: "eval-1" },
    { table: "dpia_frameworks", rowId: "fresh-1" },
  );
  assertEquals(r, { table: "dpia_frameworks", rowId: "eval-1" });
});

Deno.test("cv1-r3 resolveEvalSourceRef: empty table string tolerated when rowId present", () => {
  const r = resolveEvalSourceRef(null, { table: null, rowId: "row-x" });
  assert(r);
  assertEquals(r!.rowId, "row-x");
});
