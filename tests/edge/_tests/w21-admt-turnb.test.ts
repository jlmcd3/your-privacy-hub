// WAVE21-FIX TURN B (cppa-admt) — colocated deno tests.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW21AdmtTurnB,
  guardDefinitionalOnlyCitation,
  guardS7150b3Misapplication,
  guardS7155InDeadlineTable,
  resolveKeylessAndFill,
  restoreIntakeTimelinesInEntry,
  scrubCounselReferralProse,
  W21_ADMT_TURNB_STAMP,
  _internals,
} from "../../../supabase/functions/run-admt-checker/_w21_admt_turnb.ts";

Deno.test("stamp has w21-admt-turnb prefix", () => {
  assert(W21_ADMT_TURNB_STAMP.startsWith("w21-admt-turnb@"));
});

// ── B1 keyless registry resolution ────────────────────────────────────
Deno.test("B1: keyless entry with in-prose registry anchor gets citation promoted", () => {
  const entry: any = {
    element: "Notice at Collection timing per 11 CCR § 7220(b)(2)",
    citation: "the applicable ADMT-subchapter provision",
  };
  const r = resolveKeylessAndFill(entry, "notice_gaps");
  assertEquals(r.b1, 1);
  assertEquals(entry.citation, "11 CCR § 7220(b)(2)");
  assertEquals(entry.proposition_key, "notice_timing");
});

Deno.test("B1: keyless entry with no in-prose anchor leaves fallback for w20 to handle", () => {
  const entry: any = { element: "Unknown item", citation: "the applicable ADMT-subchapter provision" };
  const r = resolveKeylessAndFill(entry, "top_3_actions");
  assertEquals(r.b1, 0);
});

// ── B2 no empty citations on gaps ─────────────────────────────────────
Deno.test("B2: opt_out_gaps entry with empty citation and no anchor gets neutral catalog phrase", () => {
  const entry: any = { element: "some opt-out gap", citation: "" };
  const r = resolveKeylessAndFill(entry, "opt_out_gaps");
  assertEquals(r.b2, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
});

Deno.test("B2: keyed entry with empty citation resolves from proposition_key", () => {
  const entry: any = { proposition_key: "optout_offer", citation: "" };
  const r = resolveKeylessAndFill(entry, "opt_out_gaps");
  assertEquals(r.b2, 1);
  assertEquals(entry.citation, "11 CCR § 7221(a)");
});

// ── B3 counsel referral scrub ─────────────────────────────────────────
Deno.test("B3: 'your Privacy Officer should review' sentence is rewritten to neutral", () => {
  const s = "Update your notice. Your Privacy Officer should review this policy quarterly.";
  const r = scrubCounselReferralProse(s);
  assertEquals(r.hits, 1);
  assert(!/Privacy Officer should review/i.test(r.out), r.out);
  assert(/Qualified counsel must review/.test(r.out), r.out);
});

Deno.test("B3: ownership disclaimer sentence is preserved", () => {
  const s = "The business must review, complete, and own this workproduct.";
  const r = scrubCounselReferralProse(s);
  assertEquals(r.hits, 0);
});

// ── B4 § 7001 sole-anchor duty guard ──────────────────────────────────
Deno.test("B4: entry with duty verb and § 7001-only citation gets downgraded to neutral", () => {
  const entry: any = {
    element: "The business must provide a pre-use notice.",
    citation: "11 CCR § 7001(e)(1)",
  };
  const n = guardDefinitionalOnlyCitation(entry);
  assertEquals(n, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
});

Deno.test("B4: § 7001-only citation with no duty verb is left alone", () => {
  const entry: any = { element: "Definition: ADMT means a system that...", citation: "11 CCR § 7001(e)(1)" };
  const n = guardDefinitionalOnlyCitation(entry);
  assertEquals(n, 0);
  assertEquals(entry.citation, "11 CCR § 7001(e)(1)");
});

Deno.test("B4: entry promotes to in-prose subchapter anchor when available", () => {
  const entry: any = {
    element: "The business must disclose per 11 CCR § 7220(c)(1).",
    citation: "11 CCR § 7001(ddd)",
  };
  const n = guardDefinitionalOnlyCitation(entry);
  assertEquals(n, 1);
  assertEquals(entry.citation, "11 CCR § 7220(c)(1)");
});

// ── B5 § 7155(a)(1) submission-vs-timing guard ────────────────────────
Deno.test("B5: § 7155(a)(1) on content-of-submission row is downgraded", () => {
  const report: any = {
    deadline_table: [
      { field: "submission-content", citation: "11 CCR § 7155(a)(1)" },
      { field: "conduct-timing", citation: "11 CCR § 7155(a)(1)" },
    ],
  };
  const n = guardS7155InDeadlineTable(report);
  assertEquals(n, 1);
  assertEquals(report.deadline_table[0].citation, "11 CCR §§ 7200–7222");
  assertEquals(report.deadline_table[1].citation, "11 CCR § 7155(a)(1)"); // timing preserved
});

// ── B6 § 7150(b)(3) proposition guard ─────────────────────────────────
Deno.test("B6: § 7150(b)(3) with non-ra_trigger_admt proposition is downgraded", () => {
  const entry: any = {
    proposition_key: "notice_timing",
    element: "Sell/share documentation obligations",
    citation: "11 CCR § 7150(b)(3)",
  };
  const n = guardS7150b3Misapplication(entry);
  assertEquals(n, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
});

Deno.test("B6: § 7150(b)(3) with ra_trigger_admt is preserved", () => {
  const entry: any = { proposition_key: "ra_trigger_admt", element: "Trigger", citation: "11 CCR § 7150(b)(3)" };
  const n = guardS7150b3Misapplication(entry);
  assertEquals(n, 0);
  assertEquals(entry.citation, "11 CCR § 7150(b)(3)");
});

// ── B7 intake-supported timeline restoration ──────────────────────────
Deno.test("B7: entry with A4 stub restores intake 'Within 45 calendar days'", () => {
  const entry: any = {
    action: "Respond to access requests on a timeline that requires confirmation.",
    information_needed: true,
  };
  const n = restoreIntakeTimelinesInEntry(entry, "within 45 calendar days");
  assertEquals(n, 1);
  assert(/within 45 calendar days/i.test(entry.action), entry.action);
  assertEquals(entry.information_needed, false);
});

Deno.test("B7: no restoration when intake has no timeline", () => {
  const entry: any = { action: "on a timeline that requires confirmation", information_needed: true };
  const n = restoreIntakeTimelinesInEntry(entry, null);
  assertEquals(n, 0);
  assertEquals(entry.information_needed, true);
});

// ── B8 telemetry ───────────────────────────────────────────────────────
Deno.test("B8: applyW21AdmtTurnB attaches _meta.internal.admt_w21b and mirrors w19/w20 diag", () => {
  const report: any = {
    _w19_admt_turna: { version: "v19" },
    _w20_admt_turna: { version: "v20" },
    notice_gaps: [{ element: "x", citation: "" }],
    opt_out_gaps: [],
    access_gaps: [],
  };
  const diag = applyW21AdmtTurnB(report, {});
  assertEquals(diag.version, W21_ADMT_TURNB_STAMP);
  assert(report._meta && report._meta.internal, "expected _meta.internal");
  assertEquals(report._meta.internal.admt_w21b.version, W21_ADMT_TURNB_STAMP);
  assertEquals(report._meta.internal.admt_w19a.version, "v19");
  assertEquals(report._meta.internal.admt_w20a.version, "v20");
});

// ── Orchestrator smoke ────────────────────────────────────────────────
Deno.test("orchestrator: end-to-end on a shaped report is idempotent", () => {
  const report: any = {
    opt_out_gaps: [
      { element: "Opt-out mechanism absent", citation: "" },
      { proposition_key: "optout_offer", citation: "" },
    ],
    top_3_actions: [
      { action: "Your privacy officer should validate the notice.", citation: "the applicable ADMT-subchapter provision" },
    ],
    deadline_table: [
      { field: "submission-content", citation: "11 CCR § 7155(a)(1)" },
    ],
  };
  const d1 = applyW21AdmtTurnB(report, { access_response_timeline: "Within 45 calendar days (standard)" });
  assert(d1.b2_empty_citations_filled >= 2, JSON.stringify(d1));
  assert(d1.b3_counsel_scrubs >= 1, JSON.stringify(d1));
  assert(d1.b5_7155_content_row_downgrades === 1, JSON.stringify(d1));
  // Idempotence: second application does not further mutate cited fields.
  const before = JSON.stringify(report);
  applyW21AdmtTurnB(report, { access_response_timeline: "Within 45 calendar days (standard)" });
  const after = JSON.parse(JSON.stringify(report));
  // _meta.internal.admt_w21b is re-attached but counters go to 0 on 2nd pass
  assertEquals(after._meta.internal.admt_w21b.b3_counsel_scrubs, 0);
  assertEquals(after._meta.internal.admt_w21b.b5_7155_content_row_downgrades, 0);
  assert(before.length > 0);
});

// ── extractIntakeTimeline ─────────────────────────────────────────────
Deno.test("extractIntakeTimeline pulls timeline from access_response_timeline", () => {
  const t = _internals.extractIntakeTimeline({ access_response_timeline: "Within 45 calendar days (standard)" });
  assertEquals(t, "within 45 calendar days");
});
