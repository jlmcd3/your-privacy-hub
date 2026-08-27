// S-B1 / S-B2 (doc 80, 2026-08-27) — BIPA § 15(b) three-step split and the
// § 15(a) first-possession timing element.
//
// S-B1: § 15(b)'s three sequential pre-collection writings are three
// independently-tracked duty rows (the pattern § 15(a) already follows);
// each verdict flips on its own facts alone, and a legacy record that never
// saw the new § 15(b)(2) question degrades to record_insufficient with a
// specific ask — never an asserted violation.
//
// S-B2: § 15(a) carries the first-possession timing element. A policy
// complete today but adopted after collection began names the exposure; a
// record silent on the timing cannot support a full-compliance verdict.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { BIOMETRIC_PERFECT } from "../../../supabase/functions/_shared/golden/biometric-perfect.ts";

type Bag = Record<string, unknown>;

function ilIntake(over: Bag = {}): Bag {
  return { ...(BIOMETRIC_PERFECT[0].intake as Bag), ...over };
}

function duty(built: ReturnType<typeof buildBiometricDeliverables>, id: string) {
  const d = (built.duty_findings as Array<Bag>).find((x) => x.key === id);
  if (!d) throw new Error(`duty row ${id} missing`);
  return d as Bag & { verdict: string; application: string; information_needed?: string };
}

Deno.test("S-B1 — the three § 15(b) rows exist and the combined row is gone from duty findings", () => {
  const built = buildBiometricDeliverables(ilIntake());
  const keys = (built.duty_findings as Array<Bag>).map((d) => d.key);
  for (const id of ["il_bipa.15b1_notice_of_collection", "il_bipa.15b2_notice_purpose_term", "il_bipa.15b3_written_release"]) {
    assert(keys.includes(id), `${id} missing`);
  }
  assert(!keys.includes("il_bipa.15b_notice_and_written_release"), "combined row must no longer be emitted");
});

Deno.test("S-B1 — perfect record: all three steps satisfied", () => {
  const built = buildBiometricDeliverables(ilIntake());
  assertEquals(duty(built, "il_bipa.15b1_notice_of_collection").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b2_notice_purpose_term").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b3_written_release").verdict, "satisfied");
});

Deno.test("S-B1 — independence: each verdict flips on its own facts alone", () => {
  // Step 2 fails while 1 and 3 hold.
  let built = buildBiometricDeliverables(ilIntake({ notice_purpose_and_term: "No" }));
  assertEquals(duty(built, "il_bipa.15b1_notice_of_collection").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b2_notice_purpose_term").verdict, "not_satisfied");
  assertEquals(duty(built, "il_bipa.15b3_written_release").verdict, "satisfied");

  // Step 3 fails while 1 and 2 hold.
  built = buildBiometricDeliverables(ilIntake({ consent_artifact_type: "No consent or release obtained" }));
  assertEquals(duty(built, "il_bipa.15b1_notice_of_collection").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b2_notice_purpose_term").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b3_written_release").verdict, "not_satisfied");

  // Notice not in writing fails steps 1 AND 2 (both require a writing) but not 3.
  built = buildBiometricDeliverables(ilIntake({ notice_before_collection: "Notice given before collection, but not in writing" }));
  assertEquals(duty(built, "il_bipa.15b1_notice_of_collection").verdict, "not_satisfied");
  assertEquals(duty(built, "il_bipa.15b2_notice_purpose_term").verdict, "not_satisfied");
  assertEquals(duty(built, "il_bipa.15b3_written_release").verdict, "satisfied");
});

Deno.test("S-B1 — legacy record (new field never asked) degrades honestly, never asserts a violation", () => {
  const legacy = ilIntake();
  delete (legacy as Bag).notice_purpose_and_term;
  const built = buildBiometricDeliverables(legacy);
  const r = duty(built, "il_bipa.15b2_notice_purpose_term");
  assertEquals(r.verdict, "record_insufficient");
  assertStringIncludes(r.information_needed ?? "", "specific purpose and the length of term");
  // Steps 1 and 3 are untouched by the missing step-2 fact.
  assertEquals(duty(built, "il_bipa.15b1_notice_of_collection").verdict, "satisfied");
  assertEquals(duty(built, "il_bipa.15b3_written_release").verdict, "satisfied");
});

Deno.test("S-B2 — perfect record: § 15(a) satisfied with the timing element answered", () => {
  const built = buildBiometricDeliverables(ilIntake());
  assertEquals(duty(built, "il_bipa.15a_written_policy").verdict, "satisfied");
});

Deno.test("S-B2 — backfilled policy: verdict holds for the current state, the exposure is named", () => {
  const built = buildBiometricDeliverables(ilIntake({ retention_policy_predates_possession: "No" }));
  const r = duty(built, "il_bipa.15a_written_policy");
  assertEquals(r.verdict, "satisfied");
  assertStringIncludes(r.application, "attaches at first possession");
  assertStringIncludes(r.application, "named exposure");
});

Deno.test("S-B2 — timing unanswered on an otherwise-complete record degrades to record_insufficient with the timing ask", () => {
  const legacy = ilIntake();
  delete (legacy as Bag).retention_policy_predates_possession;
  const built = buildBiometricDeliverables(legacy);
  const r = duty(built, "il_bipa.15a_written_policy");
  assertEquals(r.verdict, "record_insufficient");
  assertStringIncludes(r.information_needed ?? "", "first possessed biometric data");
});

Deno.test("S-B2 — the timing element never rescues a missing/unpublished policy", () => {
  const built = buildBiometricDeliverables(ilIntake({ retention_policy_public: "No", retention_policy_predates_possession: "Yes" }));
  assertEquals(duty(built, "il_bipa.15a_written_policy").verdict, "not_satisfied");
});

// S-B4 — the 14/20(b)/(c) accrual rules are now corpus-backed; the BIPA
// exposure surface quotes them, and the reserved framing names exactly what
// is still NOT ingested (14/20(a) damages tiers, fee-shifting).
Deno.test("S-B4 — BIPA exposure surface carries the pinned 14/20(b) accrual verbatim, with damages still reserved", () => {
  const built = buildBiometricDeliverables(ilIntake());
  const surface = (built.consequence_determination as Bag).exposure_surfaces as Array<Bag>;
  const bipa = surface.find((x) => x.statute_key === "us_il_bipa") as Bag & {
    standard: string | null; mechanism: string; reserved: string | null; corpus_status: string;
  };
  assert(bipa, "BIPA exposure surface missing");
  assertEquals(bipa.corpus_status, "in_corpus");
  assertStringIncludes(bipa.standard ?? "", "has committed a single violation of subsection (b) of Section 15");
  assertStringIncludes(bipa.mechanism, "at most, one recovery");
  assertStringIncludes(bipa.reserved ?? "", "fee-shifting");
  assert(!/per-scan accrual/.test(bipa.reserved ?? ""), "accrual must no longer be listed as reserved — it is corpus-backed now");
});
