// T7-RISK-PILOT-FIX — colocated tests. Regression pins on 49893a61,
// 6a7b03e9, e19a41de shapes; idempotency; fail-open; _meta preserved;
// fields outside target set untouched.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runT7RiskPilotFix } from "../../../../supabase/functions/_shared/openings/_t7_risk_pilotfix.ts";

function seedMeta(rd: any, triggers: number[]) {
  rd._meta = { internal: { risk_t7_opening: { s1_triggers: triggers } } };
}

// F1 — regression pin on doc 49893a61 shape.
Deno.test("F1: garbled 'The the § 7150(b)(N) trigger analysis ...' sentence dropped", () => {
  const rd: any = {
    executive_summary:
      "This report covers the assessment scope. The the \u00A7 7150(b)(4) trigger analysis systematic-observation trigger is the sole enumerated basis on this record. Additional risks are enumerated below.",
  };
  seedMeta(rd, [4]);
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f1_garbled_sentences_dropped, 1);
  assert(!/The the/.test(rd.executive_summary));
  assert(!/trigger analysis/.test(rd.executive_summary));
  assert(/This report covers the assessment scope/.test(rd.executive_summary));
  assert(/Additional risks are enumerated below/.test(rd.executive_summary));
});

// F2 — regression pin on doc 6a7b03e9 shape.
Deno.test("F2: truncated '(11 CCR )' citation stripped", () => {
  const rd: any = {
    top_risks: [{ description: "The obligation applies (11 CCR ) to this record." }],
  };
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f2_truncated_citations_stripped, 1);
  assert(!/\(11 CCR/.test(rd.top_risks[0].description));
});

// F3 — regression pin on doc 49893a61 shape.
Deno.test("F3: empty regulatory_citation omitted on inconsistency_flags[0]", () => {
  const rd: any = {
    inconsistency_flags: [{ description: "Scope disagreement.", regulatory_citation: "" }],
  };
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f3_empty_reg_citations_omitted, 1);
  assert(!("regulatory_citation" in rd.inconsistency_flags[0]));
});

// F4 — subsection conflation: singleton resolved trigger relabels.
Deno.test("F4: singleton resolved trigger relabels mismatching pinpoint", () => {
  const rd: any = {
    inconsistency_flags: [{
      description: "Sensitive-location trigger analysis at \u00A7 7150(b)(4) requires refresh.",
    }],
  };
  seedMeta(rd, [5]);
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f4_subsection_labels_relabeled, 1);
  assert(/\u00A7 7150\(b\)\(5\)/.test(rd.inconsistency_flags[0].description));
});

Deno.test("F4: no singleton -> pinpoint stripped", () => {
  const rd: any = {
    inconsistency_flags: [{ description: "Analysis at \u00A7 7150(b)(4) requires refresh." }],
  };
  seedMeta(rd, [1, 3]);
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f4_subsection_pinpoints_stripped, 1);
  assert(/\u00A7 7150\(b\)/.test(rd.inconsistency_flags[0].description));
  assert(!/\u00A7 7150\(b\)\(4\)/.test(rd.inconsistency_flags[0].description));
});

// F5 — dedup identical information_needed entries.
Deno.test("F5: duplicate information_needed entries deduped by canonical key", () => {
  const rd: any = {
    information_needed: [
      { field: "q15_sensitive_pi", citation: "\u00A7 7150(b)(2)", question: "Confirm sensitive PI processing" },
      { field: "q15_sensitive_pi", citation: "\u00A7 7150(b)(2)", question: "Confirm sensitive PI processing" },
      { field: "q18_admt_use", citation: "\u00A7 7150(b)(3)", question: "Confirm ADMT use" },
    ],
  };
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f5_information_needed_deduped, 1);
  assertEquals(rd.information_needed.length, 2);
});

// F6 — regression pin on doc e19a41de shape.
Deno.test("F6: scope_notes contradiction sentence dropped", () => {
  const rd: any = {
    scope_and_triggers: {
      scope_notes:
        "No \u00A7 7150(b)(1), (b)(4), (b)(5), or (b)(6) trigger is engaged on this record. Additional context is provided below.",
    },
  };
  seedMeta(rd, [1]);
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f6_scope_notes_contradictions_dropped, 1);
  assert(!/No \u00A7 7150\(b\)\(1\)/.test(rd.scope_and_triggers.scope_notes));
  assert(/Additional context/.test(rd.scope_and_triggers.scope_notes));
});

// F7 — corpus-pin scrub.
Deno.test("F7: § 7001(ddd) unverified categories dropped", () => {
  const rd: any = {
    executive_summary:
      "The record engages \u00A7 7001(ddd) (systematic observation, novel-behavior, sensitive location, fabricated-category).",
  };
  const { counters } = runT7RiskPilotFix(rd);
  assertEquals(counters.f7_7001ddd_enum_scrubs, 1);
  assert(/systematic observation/.test(rd.executive_summary));
  assert(/sensitive location/.test(rd.executive_summary));
  assert(!/novel-behavior/.test(rd.executive_summary));
  assert(!/fabricated-category/.test(rd.executive_summary));
});

// Idempotency — second pass is a no-op.
Deno.test("Idempotent: second run produces zero additional mutations", () => {
  const rd: any = {
    executive_summary:
      "The the \u00A7 7150(b)(4) trigger analysis systematic-observation trigger is the sole basis. Applies (11 CCR ) here. Engages \u00A7 7001(ddd) (systematic observation, fabricated).",
    information_needed: [
      { field: "a", citation: "b", question: "c" }, { field: "a", citation: "b", question: "c" },
    ],
    inconsistency_flags: [{ description: "x", regulatory_citation: "" }],
  };
  seedMeta(rd, [4]);
  const first = runT7RiskPilotFix(rd);
  assert(first.counters.f1_garbled_sentences_dropped +
         first.counters.f2_truncated_citations_stripped +
         first.counters.f3_empty_reg_citations_omitted +
         first.counters.f5_information_needed_deduped +
         first.counters.f7_7001ddd_enum_scrubs > 0);
  const second = runT7RiskPilotFix(rd);
  assertEquals(second.counters.f1_garbled_sentences_dropped, 0);
  assertEquals(second.counters.f2_truncated_citations_stripped, 0);
  assertEquals(second.counters.f3_empty_reg_citations_omitted, 0);
  assertEquals(second.counters.f5_information_needed_deduped, 0);
  assertEquals(second.counters.f7_7001ddd_enum_scrubs, 0);
});

// Fail-open — malformed input does not throw.
Deno.test("Fail-open: undefined / non-object report_data does not throw", () => {
  const r1 = runT7RiskPilotFix(undefined as any);
  assertEquals(r1.counters.errors >= 0, true);
  const r2 = runT7RiskPilotFix(null as any);
  assertEquals(r2.counters.errors >= 0, true);
  const r3 = runT7RiskPilotFix({} as any);
  assertEquals(r3.counters.errors, 0);
});

// _meta preservation and anchor-key safety.
Deno.test("_meta subtree and opening_summary are never mutated", () => {
  const rd: any = {
    opening_summary: "The the \u00A7 7150(b)(4) trigger analysis pattern is deliberate.",
    _meta: {
      internal: {
        risk_t7_opening: { s1_triggers: [4] },
        sacred: { deep: "The the \u00A7 7150(b)(4) trigger analysis remains here." },
      },
    },
  };
  runT7RiskPilotFix(rd);
  assert(/The the/.test(rd.opening_summary));
  assert(/The the/.test(rd._meta.internal.sacred.deep));
});

// Fields outside target set untouched (positive control).
Deno.test("Unrelated string fields are untouched", () => {
  const rd: any = {
    executive_summary: "Ordinary sentence one. Ordinary sentence two.",
    disclaimer: "This document is not legal advice.",
  };
  runT7RiskPilotFix(rd);
  assertEquals(rd.executive_summary, "Ordinary sentence one. Ordinary sentence two.");
  assertEquals(rd.disclaimer, "This document is not legal advice.");
});
