// WAVEB2-CLOSURE regression tests (item 157). Registry-verified prong
// assignment for § 7150(b)(1)–(6), b2A crosswalk indeterminate rule, and
// closure-module truncation/self-contradiction/attestation guards.
//
// Registry pin source: supabase/functions/_shared/openings/ccpa-7150-pin.ts.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CCPA_7150_B_1,
  CCPA_7150_B_2,
  CCPA_7150_B_3,
  CCPA_7150_B_4,
  CCPA_7150_B_5,
  CCPA_7150_B_6,
  CCPA_7150_B_LABELS,
} from "../../../../supabase/functions/_shared/openings/ccpa-7150-pin.ts";
import { applyWaveB2Closure } from "../../../../supabase/functions/_shared/ltp/waveb2-closure.ts";
import { computeProngOutcomes } from "../../../../supabase/functions/_shared/ltp/waveb-completion.ts";

Deno.test("§ 7150(b) prong verbatim texts anchor to their glossed labels", () => {
  // b1 — selling/sharing
  assertEquals(/selling/i.test(CCPA_7150_B_1) && /sharing/i.test(CCPA_7150_B_1), true);
  assertEquals(/selling\s+or\s+sharing/i.test(CCPA_7150_B_LABELS[1]), true);
  // b2 — sensitive PI
  assertEquals(/sensitive\s+personal\s+information/i.test(CCPA_7150_B_2), true);
  assertEquals(/sensitive\s+personal\s+information/i.test(CCPA_7150_B_LABELS[2]), true);
  // b3 — ADMT significant decision
  assertEquals(/ADMT/.test(CCPA_7150_B_3) && /significant\s+decision/i.test(CCPA_7150_B_3), true);
  assertEquals(/ADMT/.test(CCPA_7150_B_LABELS[3]), true);
  // b4 — systematic observation in worker/student/applicant contexts (NOT sensitive location)
  assertEquals(/systematic\s+observation/i.test(CCPA_7150_B_4), true);
  assertEquals(/systematic\s+observation/i.test(CCPA_7150_B_LABELS[4]), true);
  assertEquals(/sensitive\s+location/i.test(CCPA_7150_B_4), false);
  // b5 — sensitive location
  assertEquals(/sensitive\s+location/i.test(CCPA_7150_B_5), true);
  assertEquals(/sensitive\s+location/i.test(CCPA_7150_B_LABELS[5]), true);
  // b6 — training ADMT/biometric
  assertEquals(/train\s+an\s+ADMT/i.test(CCPA_7150_B_6), true);
  assertEquals(/train\s+an\s+ADMT/i.test(CCPA_7150_B_LABELS[6]), true);
  // Cross-guard: b4 label must not claim sensitive-location; b5 must not
  // claim worker/student/applicant.
  assertEquals(/sensitive\s+location/i.test(CCPA_7150_B_LABELS[4]), false);
  assertEquals(/worker|student|applicant/i.test(CCPA_7150_B_LABELS[5]), false);
});

Deno.test("b2A crosswalk: $25M-under-$50M straddles (d)(1)(A) → indeterminate", () => {
  const outcomes = computeProngOutcomes({
    q1_revenue: "$25M to under $50M",
    q2_consumers: "250,000 to under 1,000,000",
  });
  assertEquals(outcomes.b2A, "indeterminate");
});

Deno.test("b2A crosswalk: $50M-$100M + 250K+ → met", () => {
  const outcomes = computeProngOutcomes({
    q1_revenue: "$50M to $100M",
    q2_consumers: "250,000 to under 1,000,000",
  });
  assertEquals(outcomes.b2A, "met");
});

Deno.test("b2A crosswalk: Under $25M → not met", () => {
  const outcomes = computeProngOutcomes({
    q1_revenue: "Under $25M",
    q2_consumers: "250,000 to under 1,000,000",
  });
  assertEquals(outcomes.b2A, "not met");
});

Deno.test("b2A crosswalk: consumers under 250K → not met", () => {
  const outcomes = computeProngOutcomes({
    q1_revenue: "Over $100M",
    q2_consumers: "100,000 to under 250,000",
  });
  assertEquals(outcomes.b2A, "not met");
});

Deno.test("closure: truncation guard drops garbled citation sentence in priority_actions", () => {
  const report: any = {
    priority_actions: [
      { action: "Do the thing. Under 140(d)(1)(A)… complete the record." },
    ],
  };
  const { report: out, counters } = applyWaveB2Closure(report);
  assertEquals(counters.truncation_sentences_dropped >= 1, true);
  assertEquals(/140\(d\)\(1\)\(A\)…/.test(out.priority_actions[0].action), false);
});

Deno.test("closure: information_needed self-contradiction dropped when pinpoint already rendered", () => {
  const report: any = {
    priority_actions: [{ action: "Cite § 7157(b)(5) in the attestation." }],
    information_needed: [
      { citation: "§ 7157(b)(5)", question: "What is the attestation cite?" },
      { citation: "§ 7999(z)(9)", question: "What is the mystery cite?" },
    ],
  };
  const { report: out, counters } = applyWaveB2Closure(report);
  assertEquals(counters.information_needed_self_contradictions_dropped, 1);
  assertEquals(out.information_needed.length, 1);
  assertEquals(out.information_needed[0].citation, "§ 7999(z)(9)");
});

Deno.test("closure: attestation_block statutory_basis rewritten off unverified § 7156(a)", () => {
  const report: any = { attestation_block: { statutory_basis: "§ 7156(a)" } };
  const { report: out, counters } = applyWaveB2Closure(report);
  assertEquals(counters.attestation_basis_rewrites, 1);
  assertEquals(out.attestation_block.statutory_basis, "§ 7157(b)(5), § 7157(c)");
});
