// W20-RISK-TURNB deterministic sanitizer tests.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW20RiskTurnB, W20_RISK_TURNB_STAMP } from "../../../supabase/functions/run-cppa-risk-assessment/_w20_risk_turnb.ts";
import { applyW10RiskB1 } from "../../../supabase/functions/run-cppa-risk-assessment/_w10_risk_b1.ts";

Deno.test("W20-TURNB: stamp present and shaped", () => {
  assert(W20_RISK_TURNB_STAMP.startsWith("w20-risk-turnb@"));
});

Deno.test("W20-B2: empty parenthetical debris scrubbed", () => {
  const report = {
    scope_and_triggers: {
      scope_notes: "selling or sharing personal information () triggers § 7150(b).",
    },
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  const notes = (out as any).scope_and_triggers.scope_notes as string;
  assertEquals(notes.includes("()"), false);
  // real pinpoints like "(b)" preserved.
  assert(notes.includes("§ 7150(b)"));
  assert(counters.empty_parens_scrubbed >= 1);
});

Deno.test("W20-B3a: doubled-determiner splice scrubbed", () => {
  const report = {
    inconsistency_flags: [{
      description: "The record carries two the § 7150(b) trigger indicators using identical labels.",
    }],
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  const desc = (out as any).inconsistency_flags[0].description as string;
  assertEquals(desc.includes("two the §"), false);
  assert(desc.includes("the § 7150(b)"));
  assert(counters.doubled_determiner_scrubbed >= 1);
});

Deno.test("W20-B3b: doubled trailing noun-pair scrubbed", () => {
  const report = {
    executive_summary: "The two § 7150(b) trigger analysis trigger indicators overlap.",
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  const es = (out as any).executive_summary as string;
  assertEquals(es.includes("trigger analysis trigger indicators"), false);
  assert(es.includes("trigger indicators"));
  assert(counters.doubled_trailing_noun_scrubbed >= 1);
});

Deno.test("W20-B5: ADMT cross-ref sentence dropped when no ADMT payload", () => {
  const report = {
    executive_summary: "The record shows 'n/a' ADMT content entries were populated. Other prose stays.",
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  const es = (out as any).executive_summary as string;
  assertEquals(es.includes("ADMT content entries"), false);
  assert(es.includes("Other prose stays"));
  assert(counters.admt_cross_ref_sentences_dropped >= 1);
});

Deno.test("W20-B5: ADMT cross-ref sentence PRESERVED when payload exists", () => {
  const report = {
    executive_summary: "The record shows 'n/a' ADMT content entries were populated.",
    admt_summary: { count: 3 },
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  assert(((out as any).executive_summary as string).includes("ADMT content entries"));
  assertEquals(counters.admt_cross_ref_sentences_dropped, 0);
});

Deno.test("W20-B6: body-text counsel referral rewritten", () => {
  const report = {
    inconsistency_flags: [{
      resolution_required: "The controller must consult qualified legal counsel before proceeding.",
    }],
  };
  const { counters, report: out } = applyW20RiskTurnB(report);
  const rr = (out as any).inconsistency_flags[0].resolution_required as string;
  assertEquals(/consult\s+.*counsel/i.test(rr), false);
  assert(counters.counsel_referrals_rewritten >= 1);
});

Deno.test("W20-B4 (widened D2 regex): 'record does not establish ... profiling' denied → template with q5b Yes", () => {
  const intake = {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  };
  const original = "The record does not separately establish a sensitive-location profiling basis.";
  const report = { inconsistency_flags: [{ description: original }] };
  const { counters } = applyW10RiskB1(report as any, intake);
  assert(counters.profiling_denials_scanned >= 1);
});

Deno.test("W20-B4: 'contradict any inference that ... independently triggered' matches denial pattern", () => {
  const intake = {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  };
  const original = "The two fields directly contradict any inference that both subsections are independently triggered.";
  const report = { inconsistency_flags: [{ description: original }] };
  const { counters } = applyW10RiskB1(report as any, intake);
  assert(counters.profiling_denials_scanned >= 1);
});

Deno.test("W20 anchor-key protection: citation strings never scrubbed", () => {
  const report = {
    inconsistency_flags: [{
      description: "some description",
      regulatory_citation: "11 CCR § 7150(b) (see also § 7121)",
      citation: "11 CCR § 7150",
    }],
  };
  const { report: out } = applyW20RiskTurnB(report);
  assertEquals((out as any).inconsistency_flags[0].regulatory_citation, "11 CCR § 7150(b) (see also § 7121)");
});
