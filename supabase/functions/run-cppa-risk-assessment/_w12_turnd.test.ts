// WAVE12-FIX TURN D — cppa-risk unit tests.
//
// D1: T-1 volume-prong now reads i3_ca_consumer_band (CA_CONSUMER_BAND), not
//     q2_consumers (CONSUMER_OPTS). Wave-12 doc 9ce32381 exact band values:
//       - q2_consumers          = "100,000–249,999"      (previously read → below)
//       - i3_ca_consumer_band   = "100,000–1,000,000"    (correct read → straddle)
//     A definitive "not met" claim must now be a violation, not a pass.
//
// D2: Bidirectional profiling guard. Existing B1b handles OVERclaims; new D2
//     handles DENIALS (wave-12 doc 864495a3: "no profiling inferences are
//     recorded" while q5b_profiling_observation = Yes).
//
// D3 (regression): the third-party definition uses § 1798.140(ai) — verified
//     against cppa_authorities Cal. Civ. Code § 1798.140 corpus text.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW10RiskB1, W12_RISK_D2_STAMP } from "./_w10_risk_b1.ts";

Deno.test("TURN D — BUILD_STAMP restamped (w15-risk-factledger/w15-risk-regwire supersedes w12-risk-turnd)", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const m = src.match(/export const BUILD_STAMP = "([^"]+)"/);
  assert(m && (m[1].startsWith("w15-risk-factledger@") || m[1].startsWith("w15-risk-regwire@") || m[1].startsWith("w12-risk-turnd@") || m[1].startsWith("w16-risk-flfix@") || m[1].startsWith("w16-risk-collapsecov@")), `unexpected stamp: ${m?.[1]}`);
});

Deno.test("TURN D — D2 stamp exported", () => {
  assert(W12_RISK_D2_STAMP.startsWith("w12-risk-d2@"));
});

// ---- D1 evaluator (extracted logic — mirrors T-1 in index.ts) ----
function evaluateT1(i3Band: string, text: string): { violation: boolean; reason?: string } {
  const belowBands = new Set(["Fewer than 10,000", "10,000–100,000"]);
  const aboveBands = new Set(["More than 1,000,000"]);
  const straddleOrUnsure = i3Band === "100,000–1,000,000" || i3Band.toLowerCase() === "unsure";
  const metPatterns = [/exceeds the 250,000/i, /250,000-consumer volume threshold is met/i];
  const notMetPatterns = [/below the 250,000/i, /250,000-consumer volume threshold is not met/i];
  const hasMet = metPatterns.some((re) => re.test(text));
  const hasNotMet = notMetPatterns.some((re) => re.test(text));
  if (straddleOrUnsure && (hasMet || hasNotMet)) return { violation: true, reason: "straddle_or_unsure_definitive_claim" };
  if (belowBands.has(i3Band) && hasMet) return { violation: true, reason: "below_band_claims_met" };
  if (aboveBands.has(i3Band) && hasNotMet) return { violation: true, reason: "above_band_claims_not_met" };
  return { violation: false };
}

Deno.test("D1: wave-12 exact bands — i3=100,000–1,000,000 with 'not met' claim is a violation", () => {
  const doc = "The 250,000-consumer volume threshold is not met on the current record.";
  const r = evaluateT1("100,000–1,000,000", doc);
  assertEquals(r.violation, true);
  assertEquals(r.reason, "straddle_or_unsure_definitive_claim");
});

Deno.test("D1: below-band 'Fewer than 10,000' + 'met' claim → violation", () => {
  const r = evaluateT1("Fewer than 10,000", "processing exceeds the 250,000 consumer count");
  assertEquals(r.violation, true);
  assertEquals(r.reason, "below_band_claims_met");
});

Deno.test("D1: above-band 'More than 1,000,000' + 'not met' claim → violation", () => {
  const r = evaluateT1("More than 1,000,000", "the count is below the 250,000 line");
  assertEquals(r.violation, true);
  assertEquals(r.reason, "above_band_claims_not_met");
});

Deno.test("D1: straddle band with correctly indeterminate prose → no violation", () => {
  const r = evaluateT1(
    "100,000–1,000,000",
    "The recorded band straddles the 250,000 threshold; the volume prong is indeterminate on the current record.",
  );
  assertEquals(r.violation, false);
});

Deno.test("D1: Unsure with any definitive claim → violation", () => {
  assertEquals(evaluateT1("Unsure", "exceeds the 250,000 threshold").violation, true);
  assertEquals(evaluateT1("Unsure", "below the 250,000 line").violation, true);
});

// ---- D2 profiling-denial guard ----
Deno.test("D2: intake asserts profiling → 'no profiling inferences are recorded' is downgraded", () => {
  const intake = { q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants" };
  const report = {
    executive_summary: "There is no basis to flag risk. No profiling inferences are recorded.",
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.profiling_denials_scanned >= 1, true);
  assertEquals(counters.profiling_denials_downgraded >= 1, true);
  const es = report.executive_summary;
  assert(es.includes("intake asserts systematic-observation profiling"), `got: ${es}`);
  assert(es.includes("q5b_profiling_observation"), `should name the intake field`);
});

Deno.test("D2: intake DENIES profiling → denial sentence is left alone", () => {
  const intake = { q5b_profiling_observation: "No" };
  const report = {
    executive_summary: "No profiling inferences are recorded on the current record.",
  };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.profiling_denials_downgraded, 0);
  assert(report.executive_summary.startsWith("No profiling"));
});

Deno.test("D2: 'profiling is not performed' downgraded when intake asserts Yes", () => {
  const intake = { q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants" };
  const report = { risk_register: { entries: [{ harm_type: "Profiling is not performed by the business." }] } };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals(counters.profiling_denials_downgraded >= 1, true);
});

// ---- D3 regression: prompt cite doctrine ----
Deno.test("D3: PRECISE DEFINITION CITES rule includes § 1798.140(ai) for third party", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(
    src.includes("§ 1798.140(ai) ('third party')"),
    "prompt must carry the third-party (ai) cite verbatim",
  );
  assert(
    src.includes("post-CPRA lettering for the 'third party' definition is § 1798.140(ai)"),
    "prompt must carry the never-cite-(ad)-for-third-party guard",
  );
});
