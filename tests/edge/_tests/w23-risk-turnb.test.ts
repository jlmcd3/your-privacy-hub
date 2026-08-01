// WAVE23-FIX TURN B (cppa-risk) — v2 acceptance tests. Covers B1 (leak
// scrub + concat normalization), B2 (pinpointing, orphan-join, priority
// narrowing), B3 (Uncertain template, record-fact, provenance).

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyW23RiskTurnB,
  W23_RISK_TURNB_STAMP,
  W23_RISK_TURNB_VERSION,
} from "../../../supabase/functions/run-cppa-risk-assessment/_w23_risk_turnb.ts";
import { buildFactLedger } from "../../../supabase/functions/_shared/intake/fact-ledger.ts";

const TYPE_CASE =
  "The intake on profiling and systematic observation does not support this statement; it must be reconciled before use.. Civ. Code § 1798.140(ag)/(j) is not documented";

// ── B1 ────────────────────────────────────────────────────────────────
Deno.test("W23B B1 — safeguard_gaps type case scrubbed + double-period normalized", () => {
  const src = { risk_register: { entries: [{ id: "RR-001", safeguard_gaps: TYPE_CASE }] } } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).risk_register.entries[0].safeguard_gaps as string;
  assert(!/does not support this statement/i.test(out));
  assert(!/must be reconciled/i.test(out));
  assert(!/\.\./.test(out));
  assert(counters.internal_note_scrubs >= 1);
  assert(counters.concat_normalizations >= 1);
});

Deno.test("W23B B1 — mitigation_gaps / open_items / arbitrary *_gaps / *_notes covered", () => {
  const src = {
    mitigation_gaps: TYPE_CASE,
    open_items: [TYPE_CASE, "Legitimate open item."],
    vendor_gaps: TYPE_CASE,
    program_notes: TYPE_CASE,
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const blob = JSON.stringify(report);
  assert(!/does not support this statement/i.test(blob));
  assert(counters.internal_note_scrubs >= 4);
  assertEquals((report as any).open_items[1], "Legitimate open item.");
});

Deno.test("W23B B1 — intake-supported claim PRESERVED (ledger consulted)", () => {
  const intake = { q5b_profiling_observation: "Yes, we profile users." };
  const ledger = buildFactLedger(intake);
  const src = { risk_register: { entries: [{ safeguard_gaps: TYPE_CASE }] } } as any;
  const { report, counters } = applyW23RiskTurnB(src, { intake, ledger });
  const out = (report as any).risk_register.entries[0].safeguard_gaps as string;
  assert(/does not support this statement/i.test(out));
  assert(counters.intake_supported_preserved >= 1);
});

Deno.test("W23B B1 — never emits 'information needed' phrasing", () => {
  const src = { safeguard_gaps: TYPE_CASE } as any;
  const { report } = applyW23RiskTurnB(src);
  const out = (report as any).safeguard_gaps as string;
  assert(!/information\s+needed/i.test(out));
});

// ── B2 ────────────────────────────────────────────────────────────────
Deno.test("W23B B2 — bare § 7150(b) pinpoints per surrounding trigger (sale/share)", () => {
  const src = { scope_notes: "No selling or sharing occurs, so § 7150(b) is not engaged." } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).scope_notes as string;
  assert(/§\s*7150\(b\)\(1\)/.test(out), `got: ${out}`);
  assert(counters.pinpoints_added >= 1);
});

Deno.test("W23B B2 — pinpoints for all five trigger classes", () => {
  const cases: Array<[string, string]> = [
    ["No sale or sharing of personal information; § 7150(b) is not engaged.", "(1)"],
    ["No sensitive personal information is processed, so § 7150(b) is not engaged.", "(2)"],
    ["No ADMT for a significant decision is used, so § 7150(b) is not engaged.", "(3)"],
    ["No systematic observation occurs, so § 7150(b) is not engaged.", "(4)"],
    ["No sensitive-location profiling, so § 7150(b) is not engaged.", "(5)"],
    ["No ADMT training, so § 7150(b) is not engaged.", "(6)"],
  ];
  for (const [input, expected] of cases) {
    const { report } = applyW23RiskTurnB({ scope_notes: input } as any);
    const out = (report as any).scope_notes as string;
    assert(out.includes(`§ 7150(b)${expected}`), `expected (b)${expected} in: ${out}`);
  }
});

Deno.test("W23B B2 — orphan 'and' after § 7150(b) cleaned", () => {
  const src = {
    scope_and_triggers: "No ADMT use or training is recorded, so 11 CCR § 7150(b) and are not engaged.",
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).scope_and_triggers as string;
  assert(!/\band\s+are\b/.test(out), `orphan survived: ${out}`);
  assert(/is not engaged/.test(out), `got: ${out}`);
  assert(counters.orphan_joins_fixed >= 1);
});

Deno.test("W23B B2c — priority action narrowed when q18b_admt_training='No'", () => {
  const src = {
    priority_actions: [
      { action: "Resolve and document the applicable § 7150(b) subsection — (significant decision), (training), or both" },
    ],
  } as any;
  const intake = { q18b_admt_training: "No" };
  const { report, counters } = applyW23RiskTurnB(src, { intake });
  const out = (report as any).priority_actions[0].action as string;
  assert(!/\(training\)/i.test(out), `training alt survived: ${out}`);
  assert(!/or both/i.test(out), `'or both' survived: ${out}`);
  assert(/§\s*7150\(b\)\(3\)/.test(out), `not narrowed to (b)(3): ${out}`);
  assert(counters.priority_actions_narrowed >= 1);
});

Deno.test("W23B B2c — priority action UNCHANGED when q18b_admt_training='Yes'", () => {
  const src = {
    priority_actions: [
      { action: "Resolve and document the applicable § 7150(b) subsection — (significant decision), (training), or both" },
    ],
  } as any;
  const { report } = applyW23RiskTurnB(src, { intake: { q18b_admt_training: "Yes" } });
  const out = (report as any).priority_actions[0].action as string;
  assert(/\(training\)/.test(out));
  assert(/or both/i.test(out));
});

// ── B3 ────────────────────────────────────────────────────────────────
Deno.test("W23B B3a — 'Uncertain' self-assessment rewritten to tool-weighing", () => {
  const src = {
    risk_assessment_by_activity: [{
      benefits_outweigh_risks_rationale:
        "The record asserts 'Uncertain' as the organisation's own assessment of whether benefits outweigh risks. Additional context follows.",
    }],
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).risk_assessment_by_activity[0].benefits_outweigh_risks_rationale as string;
  assert(!/record asserts/i.test(out), `template default survived: ${out}`);
  assert(/has not recorded its own conclusion/i.test(out), `rewrite missing: ${out}`);
  assert(counters.record_claims_rewritten >= 1);
});

Deno.test("W23B B3b — 'Profiling inferences are drawn' rewritten conditional when ledger silent", () => {
  const src = {
    risk_assessment_by_activity: [{
      rationale: "Profiling inferences are drawn from this processing.",
    }],
  } as any;
  const { report, counters } = applyW23RiskTurnB(src, { intake: {}, ledger: [] });
  const out = (report as any).risk_assessment_by_activity[0].rationale as string;
  assert(/may be engaged/i.test(out), `conditional rewrite missing: ${out}`);
  assert(/intake does not confirm/i.test(out), `intake caveat missing: ${out}`);
  assert(counters.record_claims_rewritten >= 1);
});

Deno.test("W23B B3b — 'Profiling inferences' PRESERVED when ledger asserts profiling", () => {
  const intake = { q5b_profiling_observation: "Yes — we perform profiling." };
  const ledger = buildFactLedger(intake);
  const src = {
    risk_assessment_by_activity: [{ rationale: "Profiling inferences are drawn from this processing." }],
  } as any;
  const { report } = applyW23RiskTurnB(src, { intake, ledger });
  const out = (report as any).risk_assessment_by_activity[0].rationale as string;
  assert(/Profiling inferences are drawn/.test(out), `wrongly stripped: ${out}`);
});

Deno.test("W23B B3c — provenance annotated when intake self-classified", () => {
  const intake = { q5b_profiling_observation: "Yes — systematic observation via product telemetry." };
  const ledger = buildFactLedger(intake);
  const src = {
    scope_and_triggers: "The record documents systematic observation through product telemetry, engaging § 7150(b)(4).",
  } as any;
  const { report, counters } = applyW23RiskTurnB(src, { intake, ledger });
  const out = (report as any).scope_and_triggers as string;
  assert(/The intake reports/.test(out), `provenance not annotated: ${out}`);
  assert(!/The record documents/.test(out));
  assert(counters.provenance_annotated >= 1);
});

// ── Guardrails ────────────────────────────────────────────────────────
Deno.test("W23B — fields OUTSIDE target set are NOT touched by B1", () => {
  const src = {
    executive_summary: TYPE_CASE,
    risk_register: { entries: [{ id: "RR-001", description: "no leak here." }] },
  } as any;
  const { report } = applyW23RiskTurnB(src);
  assertEquals((report as any).executive_summary, TYPE_CASE);
});

Deno.test("W23B — anchor keys never mutated", () => {
  const src = {
    safeguard_gaps: TYPE_CASE,
    information_needed: [{ field: "q3_sell_share", citation: "11 CCR § 7150(b)", id: "IN-001" }],
  } as any;
  const { report } = applyW23RiskTurnB(src);
  const row = (report as any).information_needed[0];
  assertEquals(row.field, "q3_sell_share");
  assertEquals(row.citation, "11 CCR § 7150(b)");
  assertEquals(row.id, "IN-001");
});

Deno.test("W23B — idempotent", () => {
  const src = {
    safeguard_gaps: TYPE_CASE,
    scope_notes: "No selling or sharing, so § 7150(b) is not engaged.",
  } as any;
  const pass1 = applyW23RiskTurnB(src);
  const pass2 = applyW23RiskTurnB(pass1.report as any);
  assertEquals(pass2.counters.internal_note_scrubs, 0);
  assertEquals(pass2.counters.pinpoints_added, 0);
  assertEquals(pass2.counters.concat_normalizations, 0);
});

Deno.test("W23B — no crash on empty / null / undefined", () => {
  applyW23RiskTurnB({} as any);
  applyW23RiskTurnB(null as any);
  applyW23RiskTurnB(undefined as any);
});

Deno.test("W23B — _meta subtree preserved", () => {
  const src = {
    safeguard_gaps: "clean.",
    _meta: { internal: { risk_w22a: { placeholder_scrubs: 2 } } },
  } as any;
  const { report } = applyW23RiskTurnB(src);
  assertEquals((report as any)._meta.internal.risk_w22a.placeholder_scrubs, 2);
});

Deno.test("W23B — stamp + version well-formed", () => {
  assert(/^w23-risk-turnb@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W23_RISK_TURNB_STAMP));
  assert(/^risk-w23-turnb-v2-/.test(W23_RISK_TURNB_VERSION));
});
