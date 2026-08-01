// T7-RISK-OPENING-PARAGRAPH-PILOT — Deno tests for the deterministic
// opening_summary slot builder. Matches convention of other supabase/_shared
// tests (see emit-gate.test.ts).
//
// Run: deno test supabase/functions/_shared/openings/risk-opening.test.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildRiskOpening, RISK_OPENING_VERSION } from "../../../../supabase/functions/_shared/openings/risk-opening.ts";
import { CCPA_1798_140_D_1_A, CCPA_1798_140_D_1_B } from "../../../../supabase/functions/_shared/openings/ccpa-1798-140-pin.ts";

const base = {
  entity_name: "Meridian SaaS Inc.",
  q1_revenue: "$25M–$50M",
  q2_consumers: "250,000–1 million",
  q5_sell_share: "No",
  q5b_profiling_observation: "No",
  q15_sensitive_pi: "No",
  q18_admt_use: "No",
  q18b_admt_training: "No",
  sensitive_location_basis: "Not applicable — no sensitive-location processing",
  q4_pi_categories: ["Contact identifiers (name, email, phone)"],
  i1_processing_purpose: "Deliver core SaaS analytics functionality.",
  i1b_min_pi: "We collect only identifiers necessary to provision accounts and bill customers.",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
};

const AS_OF = "2026-07-25";

Deno.test("S0 omitted when no criterion unambiguously resolves ($25M–$50M straddles; sell/share = No)", () => {
  const r = buildRiskOpening(base, { asOfDate: AS_OF });
  assertEquals(r.slots.S0, null);
  assertEquals(r.provenance.s0_criteria, []);
  assert(r.provenance.omitted.includes("S0:no_criteria_unambiguously_resolved"));
  assert(!/subject to the CCPA/.test(r.text));
});

Deno.test("S0 asserts (A) only when revenue band unambiguously clears the corpus figure", () => {
  const r = buildRiskOpening({ ...base, q1_revenue: "$50M–$100M" }, { asOfDate: AS_OF });
  assertEquals(r.provenance.s0_criteria, ["A"]);
  assertStringIncludes(r.slots.S0 ?? "", "(A)");
  assertStringIncludes(r.slots.S0 ?? "", CCPA_1798_140_D_1_A);
  assertStringIncludes(r.slots.S0 ?? "", "as adjusted pursuant to subdivision (d) of Section 1798.199.95");
});

Deno.test("(A) omitted on straddling band $25M–$50M even with affirmative sell/share", () => {
  const r = buildRiskOpening({ ...base, q1_revenue: "$25M–$50M", q5_sell_share: "Both" }, { asOfDate: AS_OF });
  assert(!r.provenance.s0_criteria.includes("A"));
});

Deno.test("(B) rejected when consumers band >= 100k but sell/share = No (semantic-honesty gate)", () => {
  const r = buildRiskOpening(
    { ...base, q2_consumers: "1–10 million", q5_sell_share: "No" },
    { asOfDate: AS_OF },
  );
  assert(!r.provenance.s0_criteria.includes("B"));
  assertEquals(r.slots.S0, null);
  // Silent sell/share is a plain omission, not a rejection.
  assertEquals(r.provenance.s0_b_rejected_reason, null);
});

// T7-PILOT-FIX-2 (ledger item 97): q2_consumers is "consumers PROCESSED",
// not "bought, sold, or shared" — design rule 6 forbids it as the (B)
// operand. When sell/share is affirmative but the intake carries no
// compliant `bought_sold_shared_count` field, (B) must be DROPPED (not
// rendered from q2_consumers) and telemetered as no_compliant_count_field.
Deno.test("T7-PILOT-FIX-2: (B) rejected when only q2_consumers present (no compliant count field), sell/share affirmative", () => {
  const r = buildRiskOpening(
    { ...base, q2_consumers: "250,000–1 million", q5_sell_share: "Both" },
    { asOfDate: AS_OF },
  );
  assertEquals(r.provenance.s0_criteria, []);
  assertEquals(r.slots.S0, null);
  assertEquals(r.provenance.s0_b_rejected_reason, "no_compliant_count_field");
  assert(r.provenance.omitted.some((o) => o.startsWith("S0:B_rejected:")));
  // Never rendered from q2_consumers.
  assert(!/buys, sells, or shares/.test(r.text));
});

// T7-PILOT-FIX-2 regression fixture: doc-1da388c6 intake shape from
// wave-27 (quality_run 0e744761, run 140). Builder MUST emit s0_criteria=[]
// — (A) blocked by $25M–$50M straddle, (B) blocked by absent compliant
// count field — and MUST NOT source (B) from q2_consumers.
Deno.test("T7-PILOT-FIX-2 regression fixture — doc-1da388c6 (wave-27 run 140)", () => {
  const r = buildRiskOpening(
    {
      ...base,
      entity_name: "Acme Health Analytics",
      q1_revenue: "$25M–$50M",
      q2_consumers: "250,000–1 million",
      q5_sell_share: "Both",
    },
    { asOfDate: AS_OF },
  );
  assertEquals(r.provenance.s0_criteria, []);
  assertEquals(r.slots.S0, null);
  assertEquals(r.provenance.s0_b_rejected_reason, "no_compliant_count_field");
  assert(!/§\s*1798\.140\(d\)\(1\)\(B\)/.test(r.text));
  assert(!/subject to the CCPA/.test(r.text));
});

// (B) IS asserted when the compliant `bought_sold_shared_count` field is
// present and affirmative sell/share activity is affirmed.
Deno.test("(B) asserted with verbatim corpus quote when bought_sold_shared_count >= 100k AND sell/share affirmative", () => {
  const r = buildRiskOpening(
    {
      ...base,
      q2_consumers: "250,000–1 million",
      q5_sell_share: "Both",
      bought_sold_shared_count: "250,000–1 million",
    },
    { asOfDate: AS_OF },
  );
  assert(r.provenance.s0_criteria.includes("B"));
  assertEquals(r.provenance.s0_b_rejected_reason, null);
  assertStringIncludes(r.slots.S0 ?? "", CCPA_1798_140_D_1_B);
  assertStringIncludes(r.slots.S0 ?? "", "buys, sells, or shares");
  assertStringIncludes(r.slots.S0 ?? "", "100,000 or more consumers or households");
});

Deno.test("Multi-criteria enumerate in statutory order A,B (compliant count field present)", () => {
  const r = buildRiskOpening(
    {
      ...base,
      q1_revenue: "Over $500M",
      q2_consumers: "Over 10 million",
      q5_sell_share: "Both",
      bought_sold_shared_count: "Over 10 million",
    },
    { asOfDate: AS_OF },
  );
  assertEquals(r.provenance.s0_criteria, ["A", "B"]);
  const s0 = r.slots.S0 ?? "";
  assert(s0.indexOf("(A)") < s0.indexOf("(B)"));
});

Deno.test("S1 emits § 7150(b) triggers in statutory order", () => {
  const r = buildRiskOpening(
    {
      ...base,
      q5_sell_share: "Both",
      q15_sensitive_pi: "Yes",
      q18_admt_use: "Yes",
      q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
      q18b_admt_training: "Yes — training ADMT for significant decisions",
    },
    { asOfDate: AS_OF },
  );
  assertEquals(r.provenance.s1_triggers, [1, 2, 3, 4, 6]);
  const s1 = r.slots.S1 ?? "";
  assert(s1.indexOf("(1)") < s1.indexOf("(2)"));
  assert(s1.indexOf("(3)") < s1.indexOf("(4)"));
});

Deno.test("S1 omitted when no trigger resolves", () => {
  const r = buildRiskOpening(base, { asOfDate: AS_OF });
  assertEquals(r.slots.S1, null);
  assert(r.provenance.omitted.includes("S1:no_trigger_resolved"));
});

Deno.test("S4 omitted when intake safeguards silent (never surfaces as customer question in opening)", () => {
  const r = buildRiskOpening(
    { ...base, i4_disclosure_mechanisms: [], i1b_min_pi: "" },
    { asOfDate: AS_OF },
  );
  assertEquals(r.slots.S4, null);
  assert(!/information needed|please provide|missing/i.test(r.text));
});

Deno.test("S3 preserves negation polarities for sell/share and ADMT", () => {
  const r = buildRiskOpening(base, { asOfDate: AS_OF });
  assertStringIncludes(r.slots.S3 ?? "", "does not sell or share");
  assertStringIncludes(r.slots.S3 ?? "", "does not use ADMT");
});

Deno.test("S5/S6 frame and date; version stamp attached", () => {
  const r = buildRiskOpening(base, { asOfDate: AS_OF });
  assertStringIncludes(r.slots.S5, "§ 7152");
  assertEquals(r.slots.S6, "As of 2026-07-25.");
  assertEquals(r.provenance.version, RISK_OPENING_VERSION);
});

Deno.test("Corpus pins are byte-identical in emitted S0", () => {
  const rA = buildRiskOpening({ ...base, q1_revenue: "Over $500M" }, { asOfDate: AS_OF });
  assertStringIncludes(rA.slots.S0 ?? "", CCPA_1798_140_D_1_A);
  const rB = buildRiskOpening(
    {
      ...base,
      q2_consumers: "Over 10 million",
      q5_sell_share: "Both",
      bought_sold_shared_count: "Over 10 million",
    },
    { asOfDate: AS_OF },
  );
  assertStringIncludes(rB.slots.S0 ?? "", CCPA_1798_140_D_1_B);
});
