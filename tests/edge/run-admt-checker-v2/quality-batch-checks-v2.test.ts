// CONVERSION v1.2 (2026-08-21) — proves the ADMT_ONLY quality-batch checks
// actually work against a v2-shaped report, not just that they no longer
// crash. Before this fix: overall_status_present hard-failed every v2
// report; notice_gaps_when_inscope would have started hard-failing every
// v2 report too, the moment readAdmtScope's v2 fallback made
// triggers_significant_decision readable; adtech/gaming misclassification
// checks silently no-op'd (never actually verified anything) because
// readAdmtScope always returned null for a v2 report.
//
// Imports run-quality-batch/index.ts, which calls Deno.serve() at module
// load — needs --allow-net, same as tests/edge/item393's live-parity test.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CHECKS } from "../../../supabase/functions/run-quality-batch/index.ts";
import { readAdmtScope } from "../../../supabase/functions/_shared/admt-scope-contract.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";

function check(id: string) {
  const c = CHECKS.find((c) => c.id === id);
  if (!c) throw new Error(`check not found: ${id}`);
  return c;
}

function v2Report(scopeState: string, overallPostureLabel = "Meets on reported facts"): Record<string, unknown> {
  return { _meta: { internal: { scope_state: scopeState, overall_posture_label: overallPostureLabel } } };
}

Deno.test("readAdmtScope v2 fallback: IN_SCOPE/OUT_OF_SCOPE map to triggers_significant_decision, v1 shape untouched", () => {
  assertEquals(readAdmtScope(v2Report("IN_SCOPE")).triggers_significant_decision, true);
  assertEquals(readAdmtScope(v2Report("OUT_OF_SCOPE")).triggers_significant_decision, false);
  assertEquals(readAdmtScope(v2Report("UNABLE_TO_ASSESS")).triggers_significant_decision, null);
  // A v1 report with no _meta.internal.scope_state at all is unaffected —
  // this is the "no scope_state key present" case, not a v2 report.
  assertEquals(readAdmtScope({ triggers_significant_decision: true }).triggers_significant_decision, true);
  assertEquals(readAdmtScope({}).triggers_significant_decision, null);
});

Deno.test("overall_status_present: passes on v2's overall_posture_label, still requires v1's overall_status when neither v2 field nor v1 field is present", () => {
  assertEquals(check("overall_status_present").run({}, v2Report("IN_SCOPE")), { passed: true });
  assertEquals(check("overall_status_present").run({}, { overall_status: "gaps_identified" }), { passed: true });
  const failing = check("overall_status_present").run({}, {});
  assertEquals(failing.passed, false);
});

Deno.test("notice_gaps_when_inscope: does not false-fail a v2 IN_SCOPE MEETS_REPORTED report for lacking a top-level notice_gaps array", () => {
  const result = check("notice_gaps_when_inscope").run({}, v2Report("IN_SCOPE"));
  assertEquals(result, { passed: true });
});

Deno.test("adtech/gaming misclassification checks now actually evaluate v2 reports instead of silently no-op'ing", () => {
  // Correct behavior: an advertising-domain intake that correctly resolved
  // OUT_OF_SCOPE (triggers=false) passes.
  const okIntake = { decision_domains: ["Advertising"] };
  assertEquals(check("adtech_not_significant_decision").run(okIntake, v2Report("OUT_OF_SCOPE")), { passed: true });

  // Proves the check is actually WIRED now, not just non-crashing: an
  // advertising-domain intake that (hypothetically, if the engine ever
  // regressed) resolved IN_SCOPE must fail this check.
  const buggyResult = check("adtech_not_significant_decision").run(okIntake, v2Report("IN_SCOPE"));
  assertEquals(buggyResult.passed, false);

  const gamingIntake = { decision_domains: ["Entertainment or gaming platforms"] };
  assertEquals(check("gaming_not_significant_decision").run(gamingIntake, v2Report("OUT_OF_SCOPE")), { passed: true });
  assertEquals(check("gaming_not_significant_decision").run(gamingIntake, v2Report("IN_SCOPE")).passed, false);
});

Deno.test("real fixture sanity: every ADMT_ONLY check runs clean (no exceptions, no false-fails) against the real v2 engine output for all 10 golden fixtures", () => {
  for (const g of CPPA_ADMT_GOLDEN) {
    const computed = computeAdmtV2(g.intake as Record<string, unknown>);
    const report = {
      _meta: {
        internal: {
          scope_state: computed.scope.scopeState,
          overall_posture_label: computed.overallPostureLabel,
        },
      },
    };
    for (const id of ["overall_status_present", "notice_gaps_when_inscope", "adtech_not_significant_decision", "gaming_not_significant_decision", "art11_gate_enforced"]) {
      const result = check(id).run(g.intake as Record<string, unknown>, report);
      assert(result.passed, `${g.id}: check ${id} unexpectedly failed — ${result.evidence ?? "(no evidence)"}`);
    }
  }
});
