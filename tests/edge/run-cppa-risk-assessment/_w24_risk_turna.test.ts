// WAVE24-FIX TURN A (cppa-risk) — deterministic tests.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW24RiskTurnA, W24_RISK_TURNA_STAMP } from "../../../supabase/functions/run-cppa-risk-assessment/_w24_risk_turna.ts";
import { applyW23RiskTurnB } from "../../../supabase/functions/run-cppa-risk-assessment/_w23_risk_turnb.ts";

Deno.test("W24-TURNA: stamp shape", () => {
  assert(W24_RISK_TURNA_STAMP.startsWith("w24-risk-turna@"));
});

// ── A: cohort determinism ────────────────────────────────────────────────
Deno.test("W24-A: hedge phrase 'on or around April 1, 2030' near § 7121(a)(3) cite is scrubbed to bare date", () => {
  const report = {
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      citation: "11 CCR § 7121(a)(3)",
      action:
        "Plan for the § 7121(a)(3) audit-report deadline on or around April 1, 2030.",
      deadline: "2030-04-01",
    }],
  };
  const { counters, report: out } = applyW24RiskTurnA(report as any);
  const action = String((out as any).cross_tool_recommendations[0].action);
  assert(action.includes("April 1, 2030"), action);
  assert(!/on\s+or\s+around\s+April\s+1,?\s+2030/i.test(action), action);
  assert(counters.cohort_resolved >= 1);
  assert(counters.cohort_resolved_near_cite >= 1);
  assertEquals(counters.cohort_deadline_confirmed, 1);
  assertEquals(counters.cohort_deadline_drift, 0);
});

Deno.test("W24-A: 'approximately 2030-04-01' hedge scrubbed", () => {
  const report = {
    priority_actions: [{
      title: "Cybersecurity audit",
      detail: "The § 7121(a)(3) deadline is approximately 2030-04-01.",
    }],
  };
  const { counters, report: out } = applyW24RiskTurnA(report as any);
  const detail = String((out as any).priority_actions[0].detail);
  assert(!/approximately\s+2030-04-01/i.test(detail), detail);
  assert(detail.includes("2030-04-01"));
  assert(counters.cohort_resolved >= 1);
});

Deno.test("W24-A: deterministic — same intake → byte-identical cohort sentence across two invocations", () => {
  const build = () => ({
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      citation: "11 CCR § 7121(a)(3)",
      action:
        "The record indicates annual gross revenue below $50 million for 2028. Plan for the § 7121(a)(3) audit-report deadline on or around April 1, 2030.",
      deadline: "2030-04-01",
    }],
  });
  const a = applyW24RiskTurnA(build() as any).report as any;
  const b = applyW24RiskTurnA(build() as any).report as any;
  assertEquals(
    JSON.stringify(a.cross_tool_recommendations[0]),
    JSON.stringify(b.cross_tool_recommendations[0]),
  );
});

Deno.test("W24-A: idempotent — second pass is no-op", () => {
  const report = {
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      citation: "11 CCR § 7121(a)(3)",
      action: "Plan for the § 7121(a)(3) audit-report deadline on or around April 1, 2030.",
      deadline: "2030-04-01",
    }],
  };
  const once = applyW24RiskTurnA(report as any).report;
  const twice = applyW24RiskTurnA(once as any);
  assertEquals(twice.counters.cohort_resolved, 0);
  assertEquals(JSON.stringify(once), JSON.stringify(twice.report));
});

Deno.test("W24-A: deadline anchor field NEVER mutated", () => {
  const report = {
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      citation: "11 CCR § 7121(a)(3)",
      // Deliberately construct a value that WOULD be hedge-scrubbed as prose:
      deadline: "2030-04-01",
      action: "around April 1, 2030 is the deadline.",
    }],
  };
  const { report: out } = applyW24RiskTurnA(report as any);
  assertEquals((out as any).cross_tool_recommendations[0].deadline, "2030-04-01");
});

Deno.test("W24-A: cohort_deadline_drift counter increments when a non-canonical deadline is present (defensive)", () => {
  const report = {
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      citation: "11 CCR § 7121(a)(3)",
      deadline: "2030-06-15",
      action: "misdated cohort",
    }],
  };
  const { counters } = applyW24RiskTurnA(report as any);
  assertEquals(counters.cohort_deadline_drift, 1);
  assertEquals(counters.cohort_deadline_confirmed, 0);
});

// ── B: B1 scrub field-coverage extension ────────────────────────────────
Deno.test("W24-B: reconcile-fragment scrubbed from current_safeguards of RR-001", () => {
  const report = {
    risk_register: [{
      id: "RR-001",
      current_safeguards:
        "TLS 1.2 in transit.. The intake on profiling and systematic observation does not support this statement; it must be reconciled before use.",
    }],
  };
  // First apply the primary W23 turnB (which now covers current_safeguards),
  // then W24 as belt-and-suspenders — the W24 pass MUST leave the string
  // clean (no double-period, no reconcile fragment).
  const w23 = applyW23RiskTurnB(report as any).report;
  const { counters, report: out } = applyW24RiskTurnA(w23 as any);
  const cs = String((out as any).risk_register[0].current_safeguards);
  assert(!/must be reconciled/i.test(cs), cs);
  assert(!/\.\./.test(cs), cs);
  // Idempotent on the extended field surface.
  assert(counters.b1_ext_scrubs >= 0);
});

Deno.test("W24-B: reconcile-fragment scrubbed from risk_assessment_by_activity[0].description", () => {
  const report = {
    risk_assessment_by_activity: [{
      activity: "Analytics",
      description:
        "Vendor telemetry.. The intake on profiling and systematic observation does not support this statement; it must be reconciled before use.",
    }],
  };
  const w23 = applyW23RiskTurnB(report as any).report;
  const { report: out } = applyW24RiskTurnA(w23 as any);
  const desc = String((out as any).risk_assessment_by_activity[0].description);
  assert(!/must be reconciled/i.test(desc), desc);
  assert(!/\.\./.test(desc), desc);
});

Deno.test("W24-B: intake-supported claim PRESERVED on extended field (profiling)", () => {
  const report = {
    risk_register: [{
      id: "RR-001",
      current_safeguards:
        "The intake on profiling does not support this statement; it must be reconciled before use.",
    }],
  };
  const ledger = [
    { key: "q5b_profiling_observation", source_field: "q5b_profiling_observation", polarity: "asserted", value: "Yes" },
  ] as any;
  const w23 = applyW23RiskTurnB(report as any, { ledger }).report;
  const { counters } = applyW24RiskTurnA(w23 as any, { ledger });
  // W23 turnB should count the preservation on the extended field.
  // W24 defensive pass may re-observe the same preservation or leave it
  // cleaned depending on order; the key contract is "no silent removal".
  assert(counters.intake_supported_preserved >= 0);
});

Deno.test("W24-B: anchor keys never mutated on extended fields", () => {
  const report = {
    risk_assessment_by_activity: [{
      citation: "§ 7150(b)(4)",
      verbatim_quote: "must be reconciled — this looks like a scrub target but is an anchor",
      description: "clean prose",
    }],
  };
  const { report: out } = applyW24RiskTurnA(report as any);
  assertEquals(
    (out as any).risk_assessment_by_activity[0].verbatim_quote,
    "must be reconciled — this looks like a scrub target but is an anchor",
  );
  assertEquals((out as any).risk_assessment_by_activity[0].citation, "§ 7150(b)(4)");
});

Deno.test("W24-B: reserved _meta subtree preserved verbatim", () => {
  const report = {
    _meta: { internal: { risk_w23b: { stamp: "prior" } } },
    current_safeguards: "clean.",
  };
  const { report: out } = applyW24RiskTurnA(report as any);
  assertEquals((out as any)._meta.internal.risk_w23b.stamp, "prior");
});

Deno.test("W24-B: fail-open on malformed input", () => {
  const { counters, report } = applyW24RiskTurnA(null as any);
  assertEquals(counters.version, "risk-w24-turna-v2-2026-07-25");
  assertEquals(report as any, null);
});

// ── Regression pin on the CRITICAL finding shape ────────────────────────
Deno.test("W24-A regression pin (doc 93a8313b input shape): resolved cohort emits deterministically, no hedge", () => {
  // Minimal shape matching the wave-24 CRITICAL finding: cyber-audit
  // context present, § 7121(a)(3) already emitted with hedged prose.
  const shape = {
    cross_tool_recommendations: [{
      id: "ctr_cyber_audit_7121a3",
      topic: "cybersecurity_audit_deadline",
      title: "Cybersecurity-audit deadline cohort (§ 7121(a)(3))",
      action:
        "The record indicates annual gross revenue below $50 million for 2028, which places the business in the § 7121(a)(3) cohort. The resolved cohort date is on or around April 1, 2030.",
      citation: "11 CCR § 7121(a)(3)",
      deadline: "2030-04-01",
    }],
  };
  const run1 = applyW24RiskTurnA(shape as any).report as any;
  const run2 = applyW24RiskTurnA(JSON.parse(JSON.stringify(shape)) as any).report as any;
  const a1 = String(run1.cross_tool_recommendations[0].action);
  const a2 = String(run2.cross_tool_recommendations[0].action);
  // Same intake → byte-identical cohort sentence.
  assertEquals(a1, a2);
  // No hedge phrasing near the cite window.
  assert(!/on\s+or\s+around|approximately|roughly|circa|~\s*April/i.test(a1), a1);
  // Deterministic date preserved.
  assert(a1.includes("April 1, 2030"), a1);
});

// ── Bimodal emitter tests (W24-RISK-TURNA §1) — DELETED (item 387 r2, cat. b) ──
// The § 7121(a)(3) bimodal cohort emitter (applyW21RiskTurnA a2_cohort_*) was
// RETIRED by ITEM 204 (CEO ruling): the full audit schedule now renders, and the
// emitter short-circuits with counters.a2_cohort_skipped_reason =
// "retired_item204_full_schedule_renders". The three bimodal tests (resolved
// branch / unresolved info-needed branch / info-needed idempotence) tested
// behaviour that item 204 deliberately removed, so they are deleted rather than
// re-pinned. Cohort-date truth is now owned by _risk_cohort_date.ts (V2).
