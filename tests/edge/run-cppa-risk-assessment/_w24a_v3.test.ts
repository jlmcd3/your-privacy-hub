// W24A-V3 (cppa-risk) — deterministic tests.
// Regression fixtures pinned VERBATIM from quality_run_documents doc
// 7f0de458 (quality_run 0e744761, wave-27 run 140) per dispatch
// W24A-V3-TURN-2026-07-26 (c). Read from DB, not retyped.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW24aV3, W24A_V3_STAMP, W24A_V3_VERSION } from "../../../supabase/functions/run-cppa-risk-assessment/_w24a_v3.ts";
import { applyW24RiskTurnA } from "../../../supabase/functions/run-cppa-risk-assessment/_w24_risk_turna.ts";

// ── Verbatim wave-27 offending strings (doc 7f0de458) ────────────────────
const SCOPE_NOTES_7F0DE458 =
  "This assessment is scoped to a single processing activity: profiling of California consumers on the free tier via systematic observation. No ADMT training use is indicated (11 CCR not triggered). The sensitive-location basis field records the same predicate as the systematic-observation field; this is noted in the Inconsistencies section. No exceptions under Cal. Civ. 105(d) are claimed. The § 7120(b)(1) 50%-from-sale/share prong is not met: the record shows that personal information is not sold or shared. The § 7120(b)(2)(B) sensitive-PI threshold does not apply: no sensitive-PI processing is indicated. The recorded consumer/household band of 250,000–1 million meets the § 7120(b)(2)(A) volume threshold in conjunction with the revenue condition; however, annual gross revenue in the $25M–$50M band lies below the $100M line and triggers the April 1, 2030 cybersecurity-audit cohort under 11 CCR § 7121(a) (applicable if 2027 annual gross revenue is under $50M — confirm cohort when 2027 revenue is final).";

const CTR_CYBER_RATIONALE_7F0DE458 =
  "The § 7120(b)(1) 50%-from-sale/share prong is not met: the record shows that personal information is not sold or shared. The § 7120(b)(2)(B) sensitive-PI threshold does not apply: no sensitive-PI processing is indicated. The consumer/household band of 250,000–1 million meets the § 7120(b)(2)(A) volume threshold; however, annual gross revenue in the $25M–$50M band is below the $100M line. The § 7121(a) cybersecurity-audit obligation, if triggered, would fall in the April 1, 2030 cohort applicable to businesses with annual gross revenue under $50M. Whether the revenue band resolves to §7121(a) cohort 2030-04-01 (revenue band $25M–$50M) cannot be determined until 2027 annual gross revenue is final: if 2027 revenue is $50M–$100M, the applicable cohort date is April 1, 2029; if under $50M, it is April 1, 2030. The recorded band does not yet resolve the precise cohort; recording exact 2027 annual gross revenue completes the § 7121(a) cohort determination. A cybersecurity audit is not currently flagged as required on the current record, but the cohort determination should be confirmed when 2027 revenue is final.";

Deno.test("W24A-V3: stamp + version shape", () => {
  assert(W24A_V3_STAMP.startsWith("w24a-v3@"));
  assertEquals(W24A_V3_VERSION, "risk-w24-turna-v3-2026-07-26");
});

// ── Attribution proof: v2 misses these fixtures, v3 catches them ────────
Deno.test("W24A-V3 [attribution]: v2 (turnA) does NOT scrub the doc-7f0de458 scope_notes parenthetical hedge", () => {
  const report = {
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
  };
  const { counters, report: out } = applyW24RiskTurnA(report as any);
  // v2 leaves the parenthetical hedge in place.
  const notes = String((out as any).scope_and_triggers.scope_notes);
  assert(
    /applicable if 2027 annual gross revenue is under \$50M/.test(notes),
    "v2 unexpectedly rewrote the parenthetical",
  );
  assert(/confirm cohort when 2027 revenue is final/.test(notes));
  // And v2's cohort_resolved counter stays 0 (no hedge-adjacent-date match).
  assertEquals(counters.cohort_resolved, 0);
});

Deno.test("W24A-V3 [walker coverage]: reaches scope_and_triggers.scope_notes (fixture doc 7f0de458 verbatim)", () => {
  const report = {
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
  };
  const { counters, report: out } = applyW24aV3(report as any);
  const notes = String((out as any).scope_and_triggers.scope_notes);
  // The whole offending sentence is excised (no partial-clause splice).
  assert(!/applicable if 2027 annual gross revenue is under \$50M/.test(notes), notes);
  assert(!/confirm cohort when 2027 revenue is final/.test(notes), notes);
  assert(!/triggers the April 1, 2030 cybersecurity-audit cohort/.test(notes), notes);
  // Non-hedge prose survives.
  assert(/profiling of California consumers on the free tier/.test(notes));
  assert(/Cal\. Civ\. 105\(d\)/.test(notes), "unrelated citation prose preserved");
  // Telemetry: resolved cohort was detected near the cite, and one
  // sentence was excised.
  assert(counters.cohort_resolved >= 1);
  assert(counters.cohort_resolved_near_cite >= 1);
  assertEquals(counters.cohort_hedge_sentence_excised, 1);
  assertEquals(counters.errors, 0);
  assert(counters.strings_scanned >= 1);
});

Deno.test("W24A-V3 [walker coverage]: reaches cross_tool_recommendations.cybersecurity_audit_rationale (fixture doc 7f0de458 verbatim)", () => {
  const report = {
    cross_tool_recommendations: {
      cybersecurity_audit: false,
      cybersecurity_audit_rationale: CTR_CYBER_RATIONALE_7F0DE458,
    },
  };
  const { counters, report: out } = applyW24aV3(report as any);
  const rationale = String(
    (out as any).cross_tool_recommendations.cybersecurity_audit_rationale,
  );
  // Every conditional/hedge sentence excised.
  assert(!/cannot be determined until 2027 annual gross revenue is final/.test(rationale), rationale);
  assert(!/if 2027 revenue is \$50M–\$100M/.test(rationale), rationale);
  assert(!/should be confirmed when 2027 revenue is final/.test(rationale), rationale);
  assert(!/if triggered, would fall in the April 1, 2030 cohort/.test(rationale), rationale);
  // Neutral prose preserved.
  assert(/50%-from-sale\/share prong is not met/.test(rationale));
  // Telemetry
  assert(counters.cohort_resolved >= 1);
  assert(counters.cohort_resolved_near_cite >= 1);
  assert(counters.cohort_hedge_sentence_excised >= 2);
  assertEquals(counters.errors, 0);
});

// ── Doctrine tests ──────────────────────────────────────────────────────
Deno.test("W24A-V3: idempotent — second pass no-op on excision counters", () => {
  const report = {
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
  };
  const once = applyW24aV3(report as any).report;
  const twice = applyW24aV3(once as any);
  assertEquals(twice.counters.cohort_hedge_sentence_excised, 0);
  assertEquals(
    JSON.stringify(once),
    JSON.stringify(twice.report),
  );
});

Deno.test("W24A-V3: deterministic — byte-identical output across two invocations", () => {
  const build = () => ({
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
    cross_tool_recommendations: {
      cybersecurity_audit_rationale: CTR_CYBER_RATIONALE_7F0DE458,
    },
  });
  const a = applyW24aV3(build() as any).report;
  const b = applyW24aV3(build() as any).report;
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

Deno.test("W24A-V3: anchor keys (deadline, citation, provision) NEVER mutated", () => {
  const report = {
    cross_tool_recommendations: [{
      citation: "11 CCR § 7121(a) (applicable if 2027 revenue is under $50M — confirm cohort when 2027 revenue is final)",
      deadline: "2030-04-01",
      provision: "confirm cohort when 2027 revenue is final",
    }],
  };
  const { report: out, counters } = applyW24aV3(report as any);
  const e = (out as any).cross_tool_recommendations[0];
  assertEquals(e.citation, report.cross_tool_recommendations[0].citation);
  assertEquals(e.deadline, "2030-04-01");
  assertEquals(e.provision, "confirm cohort when 2027 revenue is final");
  assertEquals(counters.cohort_deadline_confirmed, 1);
});

Deno.test("W24A-V3: reserved subtree _meta preserved verbatim", () => {
  const report = {
    scope_and_triggers: { scope_notes: SCOPE_NOTES_7F0DE458 },
    _meta: { internal: { risk_w24a: { keep: "me" } } },
  };
  const { report: out } = applyW24aV3(report as any);
  assertEquals((out as any)._meta.internal.risk_w24a.keep, "me");
});

Deno.test("W24A-V3: whole-sentence excision — no partial-clause residue", () => {
  const s = "Alpha. The § 7121(a) cohort should be confirmed when 2027 revenue is final. Bravo.";
  const { report: out } = applyW24aV3({ scope_and_triggers: { scope_notes: s } } as any);
  const notes = String((out as any).scope_and_triggers.scope_notes);
  assertEquals(notes, "Alpha. Bravo.");
});

Deno.test("W24A-V3: unrelated prose untouched; strings_scanned reflects walker coverage", () => {
  const report = {
    executive_summary: "This is unrelated text with no cohort mention.",
    scope_and_triggers: {
      scope_notes: "Nothing hedge-worthy here.",
    },
  };
  const { counters, report: out } = applyW24aV3(report as any);
  assertEquals(
    (out as any).executive_summary,
    "This is unrelated text with no cohort mention.",
  );
  assertEquals(counters.cohort_resolved, 0);
  assertEquals(counters.cohort_hedge_sentence_excised, 0);
  assert(counters.strings_scanned >= 2);
});

Deno.test("W24A-V3: resolved cohort date detection fires even without hedge", () => {
  const report = {
    priority_actions: [{
      detail: "The § 7121(a) cohort resolves to April 1, 2030 based on the record.",
    }],
  };
  const { counters } = applyW24aV3(report as any);
  assertEquals(counters.cohort_resolved, 1);
  assertEquals(counters.cohort_resolved_near_cite, 1);
  assertEquals(counters.cohort_hedge_sentence_excised, 0);
});
