// RISK-COHORT-DATE-DETERMINISM — colocated tests. Green suite required
// before deploy per dispatch RISK-COHORT-DATE-DETERMINISM-2026-07-26.
//
// Regression pins reconstruct the omission shape observed in:
//   • w28 doc e5a04cf7 (run 141, quality_run 38cfb5d6) — acc 57
//   • w28 doc 1036f12c (run 141, quality_run 38cfb5d6) — acc 47
//   • w27 doc 7f0de458 (run 140, quality_run 0e744761) — 1/3 fail
// After applyW24aV3 (upstream) excises the only cohort-mentioning
// sentence, nothing else in the report states "April 1, 2030" and
// the deterministic grader qc_r1_4_cohort_determinism fails. This
// module guarantees the literal appears.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskCohortDate,
  RISK_COHORT_DATE_STAMP,
  RISK_COHORT_DATE_VERSION,
  DETERMINISTIC_COHORT_SENTENCE_25_50M,
  COHORT_DATE_LITERAL_25_50M,
  AUDIT_PERIOD_LITERAL_25_50M,
} from "./_risk_cohort_date.ts";
import { applyW24aV3 } from "./_w24a_v3.ts";

// The exact sentence the V2 truth-table emitter writes for the $25M–$50M band.
const V2_COHORT_SENTENCE_25_50M =
  "Per 11 CCR § 7121(a)(3), the first cybersecurity audit report is due " +
  "April 1, 2030 (audit period January 1, 2029 through January 1, 2030).";

// ── Corpus-pin: literals must match provision_texts.cppa-7121 §7121(a)(3) ──
Deno.test("RCD [corpus pin]: literal date + audit period match § 7121(a)(3) verbatim", () => {
  // Pin the deterministic literals; changing either without a corpus
  // migration to provision_texts.cppa-7121 breaks this assertion.
  assertEquals(COHORT_DATE_LITERAL_25_50M, "April 1, 2030");
  assertEquals(AUDIT_PERIOD_LITERAL_25_50M, "January 1, 2029 through January 1, 2030");
  assert(DETERMINISTIC_COHORT_SENTENCE_25_50M.includes("§ 7121(a)(3)"));
  assert(DETERMINISTIC_COHORT_SENTENCE_25_50M.includes("$50,000,000"));
});

Deno.test("RCD [stamp+version shape]", () => {
  assert(RISK_COHORT_DATE_STAMP.startsWith("risk-cohort-date@"));
  // (a) STALE PIN, item 387 r2: PRE-WAVED-EMITTER-FIXES-2026-07-27 replaced the
  // 25_50m-only V1 emitter with the full V2 revenue-band truth table.
  // old: risk-cohort-date-v1-2026-07-26 → new: risk-cohort-date-v2-truth-table-2026-07-27
  assertEquals(RISK_COHORT_DATE_VERSION, "risk-cohort-date-v2-truth-table-2026-07-27");
});

// ── Band-not-resolved / other-band no-ops ────────────────────────────────
Deno.test("RCD [no-op]: unspecified band → no emit, no mutation", () => {
  const before = { cross_tool_recommendations: { cybersecurity_audit_rationale: "unchanged." } };
  const { counters, report } = applyRiskCohortDate({}, before as any);
  assertEquals(counters.date_emitted, 0);
  assertEquals(counters.date_corrected, 0);
  assertEquals((report as any).cross_tool_recommendations.cybersecurity_audit_rationale, "unchanged.");
});

// (b) DEAD TESTS, item 387 r2: the no-op assertions for "Under $25M",
// "$50M–$100M", "$100M–$500M" and "Over $500M" tested V1 behaviour that
// PRE-WAVED-EMITTER-FIXES-2026-07-27 (V2 truth table) deliberately removed — V2
// emits the corpus-pinned literal for every RESOLVABLE band. Only the
// indeterminate legacy band stays a no-op (OMISSION-OVER-INVENTION). Positive
// per-band emit expectations are pinned in the truth-table test below.
for (const other of ["$25M–$100M"]) {
  Deno.test(`RCD [no-op]: band ${other} → no emit`, () => {
    const before = { cross_tool_recommendations: { cybersecurity_audit_rationale: "keep me." } };
    const { counters, report } = applyRiskCohortDate(
      { q1_revenue: other }, before as any,
    );
    assertEquals(counters.date_emitted, 0);
    assertEquals(counters.date_corrected, 0);
    assertEquals((report as any).cross_tool_recommendations.cybersecurity_audit_rationale, "keep me.");
  });
}

// ── V2 truth-table: resolvable bands emit their corpus-pinned literal ────
for (
  const [band, subdivision, date, period] of [
    ["Under $25M", "(a)(3)", "April 1, 2030", "January 1, 2029 through January 1, 2030"],
    ["$25M\u2013$50M", "(a)(3)", "April 1, 2030", "January 1, 2029 through January 1, 2030"],
    ["$50M\u2013$100M", "(a)(2)", "April 1, 2029", "January 1, 2028 through January 1, 2029"],
    ["$100M\u2013$500M", "(a)(1)", "April 1, 2028", "January 1, 2027 through January 1, 2028"],
    ["Over $500M", "(a)(1)", "April 1, 2028", "January 1, 2027 through January 1, 2028"],
  ] as const
) {
  Deno.test(`RCD [V2 truth table]: band ${band} \u2192 \u00a7 7121${subdivision} / ${date}`, () => {
    const before = { cross_tool_recommendations: { cybersecurity_audit_rationale: "" } };
    const { counters, report } = applyRiskCohortDate({ q1_revenue: band }, before as any);
    assertEquals(counters.date_emitted, 1);
    assertEquals(counters.errors, 0);
    assertEquals(
      String((report as any).cross_tool_recommendations.cybersecurity_audit_rationale),
      `Per 11 CCR \u00a7 7121${subdivision}, the first cybersecurity audit report is due ${date} (audit period ${period}).`,
    );
  });
}

// ── Regression pins from w27/w28 offending fixtures ──────────────────────
// Reconstructed by running W24A-V3 (upstream) over the fixture strings
// pinned in _w24a_v3.test.ts. After V3 excision, no cohort date remains.
const SCOPE_NOTES_7F0DE458 =
  "This assessment is scoped to a single processing activity: profiling of California consumers on the free tier via systematic observation. No ADMT training use is indicated (11 CCR not triggered). The sensitive-location basis field records the same predicate as the systematic-observation field; this is noted in the Inconsistencies section. No exceptions under Cal. Civ. 105(d) are claimed. The § 7120(b)(1) 50%-from-sale/share prong is not met: the record shows that personal information is not sold or shared. The § 7120(b)(2)(B) sensitive-PI threshold does not apply: no sensitive-PI processing is indicated. The recorded consumer/household band of 250,000–1 million meets the § 7120(b)(2)(A) volume threshold in conjunction with the revenue condition; however, annual gross revenue in the $25M–$50M band lies below the $100M line and triggers the April 1, 2030 cybersecurity-audit cohort under 11 CCR § 7121(a) (applicable if 2027 annual gross revenue is under $50M — confirm cohort when 2027 revenue is final).";
const CTR_CYBER_RATIONALE_7F0DE458 =
  "The § 7120(b)(1) 50%-from-sale/share prong is not met: the record shows that personal information is not sold or shared. The § 7120(b)(2)(B) sensitive-PI threshold does not apply: no sensitive-PI processing is indicated. The consumer/household band of 250,000–1 million meets the § 7120(b)(2)(A) volume threshold; however, annual gross revenue in the $25M–$50M band is below the $100M line. The § 7121(a) cybersecurity-audit obligation, if triggered, would fall in the April 1, 2030 cohort applicable to businesses with annual gross revenue under $50M. Whether the revenue band resolves to §7121(a) cohort 2030-04-01 (revenue band $25M–$50M) cannot be determined until 2027 annual gross revenue is final: if 2027 revenue is $50M–$100M, the applicable cohort date is April 1, 2029; if under $50M, it is April 1, 2030. The recorded band does not yet resolve the precise cohort; recording exact 2027 annual gross revenue completes the § 7121(a) cohort determination. A cybersecurity audit is not currently flagged as required on the current record, but the cohort determination should be confirmed when 2027 revenue is final.";

Deno.test("RCD [regression w27 7f0de458 / w28 e5a04cf7+1036f12c shape]: after V3 excision, RCD restores cohort date", () => {
  // Step 1 — run W24A-V3 to reproduce the pre-w24a excision state.
  const raw = {
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
    cross_tool_recommendations: { cybersecurity_audit_rationale: CTR_CYBER_RATIONALE_7F0DE458 },
  };
  const { report: postV3 } = applyW24aV3(raw as any);
  const postV3Json = JSON.stringify(postV3);
  // Precondition: V3 has stripped every cohort-date mention.
  assert(
    !/April\s+1,?\s+2030/i.test(postV3Json) && !/2030-04-01/.test(postV3Json),
    `V3 should have excised cohort-date mentions; instead got: ${postV3Json}`,
  );

  // Step 2 — RCD guarantees the deterministic literal is present.
  const { counters, report: after } = applyRiskCohortDate(
    { q1_revenue: "$25M–$50M" }, postV3 as any,
  );
  const afterJson = JSON.stringify(after);
  assert(/April\s+1,\s+2030/.test(afterJson), "cohort date must be stated after RCD");
  assertEquals(counters.band_resolved, "25_50m");
  assertEquals(counters.date_emitted, 1);
  assertEquals(counters.errors, 0);
  // (a) STALE PIN, item 387 r2: V2 emits the truth-table sentence rather than the
  // V1 constant DETERMINISTIC_COHORT_SENTENCE_25_50M (which carried a
  // "$50,000,000" revenue clause). old: DETERMINISTIC_COHORT_SENTENCE_25_50M
  // \u2192 new: the \u00a7 7121(a)(3) truth-table sentence pinned verbatim below.
  assert(
    String((after as any).cross_tool_recommendations.cybersecurity_audit_rationale)
      .includes(V2_COHORT_SENTENCE_25_50M),
  );
});

// ── Already-stated: no emit, idempotent ─────────────────────────────────
Deno.test("RCD [no-op]: report already states April 1, 2030 elsewhere", () => {
  const before = {
    executive_summary: "The applicable audit cohort is April 1, 2030 per § 7121(a)(3).",
    cross_tool_recommendations: { cybersecurity_audit_rationale: "" },
  };
  const { counters, report } = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, before as any);
  assertEquals(counters.date_emitted, 0);
  assertEquals(counters.date_corrected, 0);
  assertEquals((report as any).cross_tool_recommendations.cybersecurity_audit_rationale, "");
});

Deno.test("RCD [idempotence]: second pass no-op", () => {
  const before = { cross_tool_recommendations: { cybersecurity_audit_rationale: "" } };
  const r1 = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, before as any);
  assertEquals(r1.counters.date_emitted, 1);
  const r2 = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, r1.report);
  assertEquals(r2.counters.date_emitted, 0);
  assertEquals(r2.counters.date_corrected, 0);
});

// ── Wrong-date excision + replacement ───────────────────────────────────
Deno.test("RCD [wrong-date excision]: sentence stating April 1, 2029 for cohort → excised, replaced", () => {
  const before = {
    cross_tool_recommendations: {
      cybersecurity_audit_rationale:
        "Baseline sentence unrelated. Per 11 CCR § 7121(a), the applicable cohort is April 1, 2029. Another retained sentence.",
    },
  };
  const { counters, report } = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, before as any);
  assertEquals(counters.sentences_excised, 1);
  assertEquals(counters.date_corrected, 1);
  const out = String((report as any).cross_tool_recommendations.cybersecurity_audit_rationale);
  assert(!/April\s+1,?\s+2029/.test(out), "wrong date must be gone");
  assert(out.includes(V2_COHORT_SENTENCE_25_50M));
  assert(out.includes("Baseline sentence unrelated"));
  assert(out.includes("Another retained sentence"));
});

// ── Anchor keys not treated as prose ────────────────────────────────────
Deno.test("RCD [anchor safety]: citation / verbatim_quote / deadline preserved verbatim", () => {
  const before = {
    cross_tool_recommendations: {
      cybersecurity_audit_rationale: "",
      citation: "11 CCR § 7121(a) — April 1, 2029",  // wrong-date literal on anchor key
      verbatim_quote: "April 1, 2029 cohort text",
      deadline: "2029-04-01",
      deadline_basis: "§ 7121(a)(2)",
    },
  };
  const { report } = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, before as any);
  const ctr: any = (report as any).cross_tool_recommendations;
  assertEquals(ctr.citation, "11 CCR § 7121(a) — April 1, 2029");
  assertEquals(ctr.verbatim_quote, "April 1, 2029 cohort text");
  assertEquals(ctr.deadline, "2029-04-01");
  assertEquals(ctr.deadline_basis, "§ 7121(a)(2)");
});

// ── Reserved subtrees untouched ─────────────────────────────────────────
Deno.test("RCD [reserved subtrees]: _meta / _internal / engagement_map / annotations preserved", () => {
  const before = {
    cross_tool_recommendations: { cybersecurity_audit_rationale: "" },
    _meta: { internal: { risk_w24a: { version: "v3" }, risk_t7_opening: { v: 1 } } },
    _internal: { keep: true },
    engagement_map: { note: "sentence about April 1, 2029 cohort § 7121." },
    annotations: [{ text: "sentence about April 1, 2029 cohort § 7121." }],
  };
  const { report } = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, before as any);
  // reserved subtrees untouched — wrong-date sentence still present there
  assertEquals((report as any)._meta.internal.risk_w24a.version, "v3");
  assertEquals((report as any)._meta.internal.risk_t7_opening.v, 1);
  assertEquals((report as any)._internal.keep, true);
  assert(String((report as any).engagement_map.note).includes("April 1, 2029"));
  assert(String((report as any).annotations[0].text).includes("April 1, 2029"));
});

// ── Fail-open on malformed input ────────────────────────────────────────
Deno.test("RCD [fail-open]: null intake, primitive report → no throw", () => {
  const r1 = applyRiskCohortDate(null, null as any);
  assertEquals(r1.counters.errors, 0);
  const r2 = applyRiskCohortDate({ q1_revenue: "$25M–$50M" }, "not-an-object" as any);
  assertEquals(r2.counters.errors, 0);
});

// ── Telemetry shape ─────────────────────────────────────────────────────
Deno.test("RCD [telemetry]: counters carry version/stamp/build_stamp/band/date fields", () => {
  const { counters } = applyRiskCohortDate(
    { q1_revenue: "$25M–$50M" },
    { cross_tool_recommendations: { cybersecurity_audit_rationale: "" } } as any,
    { buildStamp: "risk-cohort-date@TEST" },
  );
  assertEquals(counters.version, RISK_COHORT_DATE_VERSION);
  assertEquals(counters.stamp, RISK_COHORT_DATE_STAMP);
  assertEquals(counters.build_stamp, "risk-cohort-date@TEST");
  assertEquals(counters.band_resolved, "25_50m");
  assertEquals(counters.date_emitted, 1);
  assertEquals(counters.date_corrected, 0);
  assertEquals(counters.sentences_excised, 0);
  assertEquals(counters.errors, 0);
});
