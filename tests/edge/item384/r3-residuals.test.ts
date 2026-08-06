// ITEM 384 r3 — RESIDUAL 1 (sufficiency placeholder) + RESIDUAL 2 (analytics coherence).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskProseGold,
  isDegradedPlaceholderRow,
  normalizeActivityAnalytics,
  REVIEW_DATE_ACTION_SENTENCE,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";

const PLACEHOLDER =
  "We could not verify this item from the information provided; it is listed under information needed.";
const ELEMENT =
  "Benefits to the business: present in the record as documented (11 CCR § 7152(a)(4)).";
const AFFIRMATIVE = "The record before this assessment is complete: every question the intake asks has been answered.";

const analytics = () => [{
  activity_name: "Fleet telematics",
  consequence: {
    status: "record_insufficient",
    decision: "reserved_insufficient_record",
    rule_ids: ["§ 7152(a)(7); § 7152(a)(9)"],
    reasons: [
      "The review date required by § 7152(a)(9) has not yet been recorded on the assessment; once entered, the assessment record will be complete.",
    ],
    information_needed: "Record the date the assessment was reviewed (§ 7152(a)(9)).",
  },
}];

Deno.test("r3-1: gate-TRUE drops the placeholder row, keeps elements", () => {
  const report: Record<string, unknown> = {
    record_sufficiency: [PLACEHOLDER, ELEMENT],
  };
  const t = applyRiskProseGold(report, {
    recordComplete: true,
    affirmative: AFFIRMATIVE,
    reservedCount: 0,
  });
  const rs = report.record_sufficiency as string[];
  assertEquals(rs.includes(PLACEHOLDER), false);
  assertEquals(rs[rs.length - 1], ELEMENT);
  assertEquals(t.sufficiency_placeholders_dropped, 1);
});

Deno.test("r3-1: gate-FALSE preserves the sufficiency array untouched", () => {
  const rows = [PLACEHOLDER, ELEMENT];
  const report: Record<string, unknown> = { record_sufficiency: [...rows] };
  const t = applyRiskProseGold(report, {
    recordComplete: false,
    affirmative: AFFIRMATIVE,
    reservedCount: 0,
  });
  assertEquals(report.record_sufficiency, rows);
  assertEquals(t.sufficiency_placeholders_dropped, 0);
});

Deno.test("r3-1: a placeholder carrying real substance is not a placeholder row", () => {
  assertEquals(isDegradedPlaceholderRow(PLACEHOLDER), true);
  assertEquals(
    isDegradedPlaceholderRow(`${PLACEHOLDER} Precise geolocation is collected for route optimisation across the fleet.`),
    false,
  );
  assertEquals(isDegradedPlaceholderRow(ELEMENT), false);
});

Deno.test("r3-2: gate-TRUE re-voices analytics status, reasons and ledger", () => {
  const report: Record<string, unknown> = { activity_analytics: analytics() };
  const t = applyRiskProseGold(report, {
    recordComplete: true,
    affirmative: AFFIRMATIVE,
    reservedCount: 1,
  });
  const cons = (report.activity_analytics as any[])[0].consequence;
  assertEquals(cons.status, "analysed");
  assertEquals(cons.reasons, [REVIEW_DATE_ACTION_SENTENCE]);
  assertEquals(cons.information_needed, undefined);
  // determination machinery untouched
  assertEquals(cons.decision, "reserved_insufficient_record");
  assertEquals(cons.rule_ids, ["§ 7152(a)(7); § 7152(a)(9)"]);
  assertEquals(t.analytics_statuses_normalized, 1);
  assertEquals(t.analytics_reasons_rewritten, 1);
});

Deno.test("r3-2: gate-FALSE leaves analytics statuses standing", () => {
  const report: Record<string, unknown> = { activity_analytics: analytics() };
  const t = applyRiskProseGold(report, {
    recordComplete: false,
    affirmative: AFFIRMATIVE,
    reservedCount: 1,
  });
  const cons = (report.activity_analytics as any[])[0].consequence;
  assertEquals(cons.status, "record_insufficient");
  assertEquals(cons.reasons.length, 1);
  assertEquals(typeof cons.information_needed, "string");
  assertEquals(t.analytics_statuses_normalized, 0);
});

Deno.test("r3-2: non-insufficiency reasons survive verbatim on a gate-TRUE record", () => {
  const rows = analytics();
  rows[0].consequence.reasons.push(
    "For every beneficiary class the stated benefit is specific and outweighs the identified negative impacts.",
  );
  const counts = normalizeActivityAnalytics(rows, true);
  assertEquals(counts.statuses, 1);
  assertEquals(rows[0].consequence.reasons, [
    REVIEW_DATE_ACTION_SENTENCE,
    "For every beneficiary class the stated benefit is specific and outweighs the identified negative impacts.",
  ]);
});
