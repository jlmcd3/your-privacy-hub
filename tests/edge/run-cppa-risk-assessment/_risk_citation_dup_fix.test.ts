// RISK-CITATION-DUP-FIX — Deno tests. Run:
//   deno test supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyRiskCitationDupFix,
  isDefectiveTriggerComparison,
  isAdmtConsequence,
  RISK_CITATION_DUP_FIX_VERSION,
} from "../../../supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.ts";

// ── Invariant unit tests ──────────────────────────────────────────────

Deno.test("A1: bare '§ 7150(b) and § 7150(b)' repeated pinpoint is defective", () => {
  assert(isDefectiveTriggerComparison("§ 7150(b) and § 7150(b) triggers are not engaged."));
});

Deno.test("A2: 'neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4)' is defective", () => {
  assert(isDefectiveTriggerComparison("neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4) is engaged."));
});

Deno.test("A3: parenthetical-differentiated but SAME pinpoint on both sides is defective", () => {
  assert(isDefectiveTriggerComparison(
    "cannot simultaneously satisfy both § 7150(b) (systematic observation of workers) and § 7150(b) (inference from sensitive-location presence).",
  ));
});

Deno.test("A4: DISTINCT pinpoints across the comparison are NOT defective", () => {
  assert(!isDefectiveTriggerComparison("§ 7150(b)(1) and § 7150(b)(4) triggers are engaged."));
  assert(!isDefectiveTriggerComparison("neither § 7150(b)(4) nor § 7150(b)(6) is engaged."));
});

Deno.test("A5: single-trigger sentence is NOT defective", () => {
  assert(!isDefectiveTriggerComparison("§ 7150(b)(4) is engaged by the profiling predicate."));
});

Deno.test("A6: property — every same-pinpoint pair across a connective trips the invariant", () => {
  const nums = ["", "(1)", "(2)", "(3)", "(4)", "(5)", "(6)"];
  const connectives = ["and", "or", "nor"];
  for (const n of nums) {
    for (const c of connectives) {
      const tag = `§ 7150(b)${n}`;
      const s = `${tag} ${c} ${tag} — check.`;
      assert(isDefectiveTriggerComparison(s), `expected defective for "${s}"`);
    }
  }
});

Deno.test("A7: property — distinct pinpoints across a connective NEVER trip", () => {
  const nums = ["(1)", "(2)", "(3)", "(4)", "(5)", "(6)"];
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const s = `§ 7150(b)${nums[i]} and § 7150(b)${nums[j]} triggers are engaged.`;
      assert(!isDefectiveTriggerComparison(s), `expected clean for "${s}"`);
    }
  }
});

// ── ADMT-consequence gate unit tests ─────────────────────────────────

Deno.test("B1: sentence citing § 7001(ddd) is an ADMT consequence", () => {
  assert(isAdmtConsequence("The profiling may affect decisions enumerated in 11 CCR § 7001(ddd)."));
});

Deno.test("B2: 'ADMT ... decisions' prose is an ADMT consequence", () => {
  assert(isAdmtConsequence("ADMT may affect significant decisions about consumers."));
});

Deno.test("B3: bare § 7150(b)(4) engagement is NOT an ADMT consequence", () => {
  assert(!isAdmtConsequence("§ 7150(b)(4) is engaged by the systematic observation predicate."));
});

// ── End-to-end walker tests ──────────────────────────────────────────

Deno.test("E1: fixture doc-1 sentence #1 (repeated bare pinpoint) is excised", () => {
  const report = {
    body: {
      analysis: "Baseline framing. § 7150(b) and § 7150(b) triggers are not engaged. Closing sentence.",
    },
  };
  const { counters, report: out } = applyRiskCitationDupFix({ q18_admt_use: "Yes" }, report);
  assertEquals(counters.dup_sentence_excisions, 1);
  const body = (out as any).body.analysis as string;
  assert(!/§ 7150\(b\) and § 7150\(b\)/.test(body));
  assert(/Baseline framing\./.test(body));
  assert(/Closing sentence\./.test(body));
});

Deno.test("E2: fixture doc-1 sentence #2 (parenthetical-differentiated repeated pinpoint) is excised", () => {
  const report = {
    body: {
      analysis: "The controller cannot simultaneously satisfy both § 7150(b) (systematic observation of workers) and § 7150(b) (inference from sensitive-location presence). Everything else stands.",
    },
  };
  const { counters, report: out } = applyRiskCitationDupFix({ q18_admt_use: "Yes" }, report);
  assertEquals(counters.dup_sentence_excisions, 1);
  const body = (out as any).body.analysis as string;
  assert(!/cannot simultaneously satisfy/.test(body));
  assert(/Everything else stands\./.test(body));
});

Deno.test("E3: fixture doc-2 sentence (repeated (b)(4) via 'neither…nor') is excised", () => {
  const report = {
    body: {
      analysis: "Cohort framing. Given the fixture posture, neither 11 CCR § 7150(b)(4) nor 11 CCR § 7150(b)(4) is engaged. Next paragraph.",
    },
  };
  const { counters, report: out } = applyRiskCitationDupFix({ q18_admt_use: "No" }, report);
  assertEquals(counters.dup_sentence_excisions, 1);
  const body = (out as any).body.analysis as string;
  assert(!/neither 11 CCR § 7150\(b\)\(4\) nor/.test(body));
});

Deno.test("E4: ADMT-consequence sentence gated ONLY when q18=No", () => {
  const report = {
    body: {
      finding: "The profiling may affect decisions enumerated in 11 CCR § 7001(ddd). Trigger remains § 7150(b)(4).",
    },
  };
  // q18=No → excise consequence sentence, preserve (b)(4) trigger sentence.
  const rNo = applyRiskCitationDupFix({ q18_admt_use: "No" }, structuredClone(report));
  assertEquals(rNo.counters.admt_consequence_excisions, 1);
  const bodyNo = (rNo.report as any).body.finding as string;
  assert(!/§ 7001\(ddd\)/.test(bodyNo));
  assert(/§ 7150\(b\)\(4\)/.test(bodyNo));

  // q18=Yes → gate closed; consequence sentence preserved.
  const rYes = applyRiskCitationDupFix({ q18_admt_use: "Yes" }, structuredClone(report));
  assertEquals(rYes.counters.admt_consequence_excisions, 0);
  const bodyYes = (rYes.report as any).body.finding as string;
  assert(/§ 7001\(ddd\)/.test(bodyYes));
});

Deno.test("E5: reserved subtrees are NOT scrubbed (opening_summary/_meta/annotations)", () => {
  const bad = "§ 7150(b) and § 7150(b) triggers are not engaged.";
  const report = {
    opening_summary: { text: bad },
    _meta: { note: bad },
    engagement_map: { note: bad },
    annotations: { note: bad },
    body: { analysis: bad },
  };
  const { counters, report: out } = applyRiskCitationDupFix({ q18_admt_use: "No" }, report);
  // Only body/analysis excised.
  assertEquals(counters.dup_sentence_excisions, 1);
  assertEquals((out as any).opening_summary.text, bad);
  assertEquals((out as any)._meta.note, bad);
  assertEquals((out as any).engagement_map.note, bad);
  assertEquals((out as any).annotations.note, bad);
  assert(!(out as any).body.analysis.includes("§ 7150(b) and § 7150(b)"));
});

Deno.test("E6: anchor fields (citation, verbatim_quote, source_fields) are NOT scrubbed", () => {
  const bad = "§ 7150(b) and § 7150(b) triggers are not engaged.";
  const report = {
    findings: [{
      citation: bad,
      verbatim_quote: bad,
      source_fields: [bad],
      body: bad,
    }],
  };
  const { report: out } = applyRiskCitationDupFix({ q18_admt_use: "No" }, report);
  const f = (out as any).findings[0];
  assertEquals(f.citation, bad);
  assertEquals(f.verbatim_quote, bad);
  assertEquals(f.source_fields[0], bad);
  assert(!f.body.includes("§ 7150(b) and § 7150(b)"));
});

Deno.test("E7: idempotent — second pass finds nothing", () => {
  const report = {
    body: { analysis: "§ 7150(b) and § 7150(b) triggers are not engaged. Kept sentence." },
  };
  const r1 = applyRiskCitationDupFix({ q18_admt_use: "No" }, report);
  assertEquals(r1.counters.dup_sentence_excisions, 1);
  const r2 = applyRiskCitationDupFix({ q18_admt_use: "No" }, r1.report);
  assertEquals(r2.counters.dup_sentence_excisions, 0);
  assertEquals(r2.counters.admt_consequence_excisions, 0);
});

Deno.test("E8: fail-open on non-object report", () => {
  const { counters, report } = applyRiskCitationDupFix({ q18_admt_use: "No" }, null);
  assertEquals(counters.dup_sentence_excisions, 0);
  assertEquals(report, null);
});

Deno.test("E9: telemetry stamps version + build_stamp", () => {
  const { counters } = applyRiskCitationDupFix({ q18_admt_use: "No" }, {}, { buildStamp: "test-stamp" });
  assertEquals(counters.version, RISK_CITATION_DUP_FIX_VERSION);
  assertEquals(counters.build_stamp, "test-stamp");
});
