// W21-RISK-TURNA — unit tests. Deno.test format matches other _shared tests.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyW21RiskTurnA,
  attributeFieldByToken,
  W21_RISK_TURNA_STAMP,
  CPPA_7121_A3_CITATION,
  CPPA_7121_A3_VERBATIM,
} from "../../../supabase/functions/run-cppa-risk-assessment/_w21_risk_turna.ts";
import { buildFactLedger } from "../../../supabase/functions/_shared/intake/fact-ledger.ts";

Deno.test("W21 A1 — token map attributes sensitive-location claims", () => {
  assertEquals(
    attributeFieldByToken("systematic observation of workers/students/applicants"),
    "q5b_profiling_observation",
  );
  assertEquals(
    attributeFieldByToken("sensitive location processing occurs at storefronts"),
    "sensitive_location_basis",
  );
  assertEquals(attributeFieldByToken("no admt logic disclosed"), "i5_admt_logic");
  assertEquals(attributeFieldByToken("this text has no cue"), undefined);
});

Deno.test("W21 A3 — internal fragments scrubbed from prose", () => {
  const src = {
    scope_and_triggers: {
      scope_notes:
        "the trigger review — established on the record shows profiling is present.",
    },
    cross_tool_recommendations: [{
      description: "See the cyber-audit tier review for details.",
    }],
  } as any;
  const { report, counters } = applyW21RiskTurnA(src);
  const notes = (report as any).scope_and_triggers.scope_notes;
  assert(!/trigger review/i.test(notes), `leak survived: ${notes}`);
  const desc = (report as any).cross_tool_recommendations[0].description;
  assert(!/tier review/i.test(desc), `module leak survived: ${desc}`);
  assert(counters.internal_fragments_scrubbed >= 2);
});

Deno.test("W21 A3 — invented ADMT-fieldname 'record n/a' scrubbed", () => {
  const src = {
    inconsistency_flags: [{
      description: "ADMT-logic, ADMT-description, and ADMT-opt-out all record n/a.",
    }],
  } as any;
  const { report, counters } = applyW21RiskTurnA(src);
  const d = (report as any).inconsistency_flags[0].description;
  assert(!/record n\/a/i.test(d), `invented-field survived: ${d}`);
  assert(counters.invented_fieldnames_scrubbed >= 1);
});

Deno.test("W21 A2 — cohort row emitted when cyber-audit context + <$50M revenue", () => {
  const src = {
    cross_tool_recommendations: [
      { id: "ctr_existing", topic: "cybersecurity_audit", action: "see § 7120(b) analysis" },
    ],
  } as any;
  const { report, counters } = applyW21RiskTurnA(src, {
    intake: { annual_gross_revenue_2028: "$30 million" },
  });
  assertEquals(counters.a2_cohort_emitted, 1);
  const ctr = (report as any).cross_tool_recommendations;
  const added = ctr.find((r: any) => r.proposition_key === "ra_cyber_audit_7121a3");
  assert(added, "cohort row missing");
  assertEquals(added.citation, CPPA_7121_A3_CITATION);
  assertEquals(added.verbatim_quote, CPPA_7121_A3_VERBATIM);
  assertEquals(added.deadline, "2030-04-01");
});

Deno.test("W21 A2 — idempotent when § 7121(a)(3) already cited", () => {
  const src = {
    cross_tool_recommendations: [
      { id: "x", citation: "11 CCR § 7121(a)(3)", action: "existing" },
    ],
  } as any;
  const { counters } = applyW21RiskTurnA(src, {
    intake: { annual_gross_revenue_2028: 20_000_000 },
  });
  assertEquals(counters.a2_cohort_emitted, 0);
  assertEquals(counters.a2_cohort_skipped_reason, "already_present");
});

Deno.test("W21 A2 — no emission without revenue signal", () => {
  const src = { cross_tool_recommendations: [{ action: "cybersecurity audit needed" }] } as any;
  const { counters } = applyW21RiskTurnA(src, { intake: {} });
  assertEquals(counters.a2_cohort_emitted, 0);
  assertEquals(counters.a2_cohort_skipped_reason, "no_revenue_signal_under_50m");
});

Deno.test("W21 A2 — no emission without cyber-audit context", () => {
  const src = { information_needed: [] } as any;
  const { counters } = applyW21RiskTurnA(src, {
    intake: { annual_gross_revenue_2028: 10_000_000 },
  });
  assertEquals(counters.a2_cohort_emitted, 0);
  assertEquals(counters.a2_cohort_skipped_reason, "no_cyber_audit_context");
});

Deno.test("W21 A4 — info_needed dropped when intake field already resolved", () => {
  const intake = { q3_sell_share: "No" };
  const ledger = buildFactLedger(intake);
  const src = {
    information_needed: [
      { field: "q3_sell_share", description: "clarify sell/share" },
      { field: "q4_targeted_ads", description: "clarify targeted ads" },
    ],
  } as any;
  const { report, counters } = applyW21RiskTurnA(src, { intake, ledger });
  const kept = (report as any).information_needed;
  assertEquals(kept.length, 1);
  assertEquals(kept[0].field, "q4_targeted_ads");
  assertEquals(counters.a4_info_needed_dropped, 1);
});

Deno.test("W21 — anchor keys (citation/verbatim) never scrubbed", () => {
  const src = {
    citation_ledger: [{
      citation: "11 CCR § 7121(a)(3)",
      verbatim_quote: CPPA_7121_A3_VERBATIM,
      // scrub-target lives on description
      description: "the cyber-audit tier review confirms cohort.",
    }],
  } as any;
  const { report } = applyW21RiskTurnA(src);
  const row = (report as any).citation_ledger[0];
  assertEquals(row.citation, "11 CCR § 7121(a)(3)");
  assertEquals(row.verbatim_quote, CPPA_7121_A3_VERBATIM);
  assert(!/tier review/i.test(row.description));
});

Deno.test("W21 — stamp is a well-formed build stamp", () => {
  assert(/^w21-risk-turna@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W21_RISK_TURNA_STAMP));
});
