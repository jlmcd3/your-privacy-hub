// Cyber master review (2026-09-15/16) — F06 dated revenue threshold, F07
// separate notification facts, F17 no stale notification claim.
//
// F06: the CCPA revenue trigger is CPI-adjusted ($26,625,000 from 1 January
// 2025 per the CPPA's published adjustment), so the "$25M to under $50M" band
// straddles it and can never resolve § 1798.140(d)(1)(A) by itself. The
// engine now tests against a dated threshold record and resolves the
// straddling band only through the dated threshold question.
// F07: whether a notice was required and whether it was sent are separate
// facts, for consumers and for an agency; "required but not yet sent" exists.
// F17: a notification answer retained beside a count of "None" (the form
// keeps hidden answers) used to print a notice claim next to a no-incidents
// statement.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CCPA_REVENUE_THRESHOLDS,
  REVENUE_BAND_APPLICABILITY_A,
  ccpaRevenueThresholdForYear,
  ccpaRevenueThresholdOn,
} from "../../../supabase/functions/_shared/bands/revenue-consumer.ts";
import { buildCyberApplicabilityTable, resolveA2, resolveRevenueGate } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-applicability.ts";
import { buildIncidentReadiness, resolveNotificationFacts } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { incidentPhrase } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/record-facts.ts";

// ── F06 ──────────────────────────────────────────────────────────────────

Deno.test("F06 — the threshold is a dated record: $25,000,000 statutory, $26,625,000 from 2025-01-01", () => {
  assertEquals(CCPA_REVENUE_THRESHOLDS.map((t) => [t.effective, t.amount]), [["2020-01-01", 25_000_000], ["2025-01-01", 26_625_000]]);
  assertEquals(ccpaRevenueThresholdOn("2024-12-31").amount, 25_000_000);
  assertEquals(ccpaRevenueThresholdOn("2025-01-01").amount, 26_625_000);
  assertEquals(ccpaRevenueThresholdOn("2026-09-16").label, "$26,625,000");
  // Revenue for calendar year 2024 is tested against the figure in force on 2025-01-01.
  assertEquals(ccpaRevenueThresholdForYear(2024).amount, 26_625_000);
  assertEquals(ccpaRevenueThresholdForYear(2023).amount, 25_000_000);
  assert(CCPA_REVENUE_THRESHOLDS[1].source.includes("cppa.ca.gov/regulations/cpi_adjustment"));
});

Deno.test("F06 — the straddling band is null in the band map; the clean bands keep their answer", () => {
  assertEquals(REVENUE_BAND_APPLICABILITY_A["$25M to under $50M"], null);
  assertEquals(REVENUE_BAND_APPLICABILITY_A["Under $25M"], false);
  assertEquals(REVENUE_BAND_APPLICABILITY_A["$50M to $100M"], true);
  assertEquals(REVENUE_BAND_APPLICABILITY_A["Over $100M"], true);
});

Deno.test("F06 — the revenue gate resolves the straddling band only through the dated threshold question", () => {
  const band = { q1_revenue: "$25M to under $50M" };
  assertEquals(resolveRevenueGate(band).value, null);
  assert(resolveRevenueGate(band).basis.includes("$26,625,000"), resolveRevenueGate(band).basis);
  assertEquals(resolveRevenueGate({ ...band, q1_revenue_threshold_check: "Yes — above the threshold" }).value, true);
  assertEquals(resolveRevenueGate({ ...band, q1_revenue_threshold_check: "No — at or below the threshold" }).value, false);
  assertEquals(resolveRevenueGate({ ...band, q1_revenue_threshold_check: "Unsure" }).value, null);
  // The reference year selects the figure: 2023 revenue was tested against $25,000,000.
  assert(resolveRevenueGate({ ...band, q1_revenue_reference_year: "2023" }).basis.includes("$25,000,000"));
  assert(resolveRevenueGate({ ...band, q1_revenue_reference_year: "2025" }).basis.includes("$26,625,000"));
  // Clean bands never need the question.
  assertEquals(resolveRevenueGate({ q1_revenue: "$50M to $100M" }).value, true);
  assertEquals(resolveRevenueGate({ q1_revenue: "Under $25M" }).value, false);
  assertEquals(resolveRevenueGate({}).value, null);
});

Deno.test("F06 — boundary matrix on A2: just below / straddling / clearly above, with the volume prong met", () => {
  const vol = { q2_consumers: "250,000 to under 1,000,000" };
  assertEquals(resolveA2({ ...vol, q1_revenue: "Under $25M" }).value, false);
  assertEquals(resolveA2({ ...vol, q1_revenue: "$25M to under $50M" }).value, null);
  assertEquals(resolveA2({ ...vol, q1_revenue: "$25M to under $50M", q1_revenue_threshold_check: "Yes — above the threshold" }).value, true);
  assertEquals(resolveA2({ ...vol, q1_revenue: "$25M to under $50M", q1_revenue_threshold_check: "No — at or below the threshold" }).value, false);
  assertEquals(resolveA2({ ...vol, q1_revenue: "$50M to $100M" }).value, true);
  // 249,999 / 250,000 consumers: the band edge is the statutory line.
  assertEquals(resolveA2({ q1_revenue: "Over $100M", q2_consumers: "100,000 to under 250,000", q15_sensitive_pi: "No" }).value, false);
  assertEquals(resolveA2({ q1_revenue: "Over $100M", q2_consumers: "250,000 to under 1,000,000" }).value, true);
});

Deno.test("F06 — the applicability table names the dated figure, never the bare statutory $25,000,000", () => {
  const t = buildCyberApplicabilityTable({ q1_revenue: "$25M to under $50M", q2_consumers: "1,000,000 or more" });
  assert(t.rows[1][1].includes("$26,625,000"), t.rows[1][1]);
  assert(t.rows[1][1].includes("2025-01-01"), t.rows[1][1]);
  assert(!/exceeds \$25,000,000 \(/.test(t.rows[1][1]), t.rows[1][1]);
  assert(t.rows[1][2].startsWith("Insufficient information"), t.rows[1][2]);
  assert(t.rows[1][2].includes("straddles"), t.rows[1][2]);
});

// ── F07 / F17 ────────────────────────────────────────────────────────────

const noDeliverables = {} as never;

Deno.test("F17 — a notification answer retained beside a count of None states nothing", () => {
  const intake = { profile: { incidents_12mo: "None", incident_notifications: "Affected consumers were notified (Civ. Code § 1798.82(a))", consumer_notice_status: "Notice provided to affected consumers" }, controls: [] };
  const nf = resolveNotificationFacts(intake);
  assertEquals(nf.hasIncidents, false);
  assertEquals(nf.consumersNotified, false);
  assertEquals(nf.material, false);
  const r = buildIncidentReadiness(intake, noDeliverables);
  assert(r.analysis.includes("reports no security incidents"), r.analysis);
  assert(!/sample copy|were notified|§ 7123\(e\)\(9\)/.test(r.analysis), r.analysis);
});

Deno.test("F07 — required-but-not-yet-sent is its own state, for consumers and for an agency", () => {
  const intake = { profile: { incidents_12mo: "1", consumer_notice_status: "Notice required but not yet sent", agency_notice_status: "No notice was required" }, controls: [] };
  const nf = resolveNotificationFacts(intake);
  assertEquals([nf.consumerPending, nf.agencyPending, nf.consumersNotified, nf.agencyNotRequired, nf.open], [true, false, false, true, false]);
  const r = buildIncidentReadiness(intake, noDeliverables);
  assert(r.analysis.includes("was required and has not yet been sent"), r.analysis);
  assert(r.analysis.includes("no reported incident required notification to an agency"), r.analysis);
  assert(r.follow_up.includes("required but not yet sent to affected consumers"), r.follow_up);
});

Deno.test("F07 — the legacy aggregate is read only when both new facts are absent", () => {
  const legacyOnly = { profile: { incidents_12mo: "1", incident_notifications: "Both affected consumers and an agency were notified" }, controls: [] };
  const nf1 = resolveNotificationFacts(legacyOnly);
  assertEquals([nf1.consumersNotified, nf1.agencyNotified], [true, true]);
  const both = { profile: { ...legacyOnly.profile, consumer_notice_status: "No notice was required", agency_notice_status: "No notice was required" }, controls: [] };
  const nf2 = resolveNotificationFacts(both);
  assertEquals([nf2.consumersNotified, nf2.agencyNotified, nf2.consumerNotRequired, nf2.agencyNotRequired], [false, false, true, true]);
});

Deno.test("F07 — an unknown incident count is stated as unknown and completes as a record item", () => {
  assertEquals(incidentPhrase("Unknown / not yet reviewed"), "an as-yet-unreviewed number of security incidents");
  const intake = { profile: { incidents_12mo: "Unknown / not yet reviewed", consumer_notice_status: "Notice provided to affected consumers" }, controls: [] };
  const nf = resolveNotificationFacts(intake);
  assertEquals([nf.countUnknown, nf.hasIncidents, nf.consumersNotified], [true, false, false]);
  const r = buildIncidentReadiness(intake, noDeliverables);
  assert(r.analysis.includes("recorded as unknown"), r.analysis);
  assert(r.follow_up.includes("review the incident register"), r.follow_up);
  assert(!r.analysis.includes("sample copy"), r.analysis);
});
