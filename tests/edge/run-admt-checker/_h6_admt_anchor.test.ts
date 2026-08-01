// Tests for H6-ADMT-GOVERNING-ANCHOR (2026-07-26).
// Regression pins on wave-27 shapes: doc 731689ba (class a) and
// doc 3746fd24 (class b). Plus idempotency, fail-open, _meta preservation,
// and unrelated-field control.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyH6AdmtAnchor,
  collectEntryCitations,
  H6_ADMT_ANCHOR_STAMP,
  is7150B3,
  isDefinitional7001,
  resolveGoverningDutyAnchor,
} from "../../../supabase/functions/run-admt-checker/_h6_admt_anchor.ts";

// ── Unit — anchor classifiers ───────────────────────────────────────

Deno.test("isDefinitional7001: matches § 7001 and subdivisions", () => {
  assertEquals(isDefinitional7001("11 CCR § 7001"), true);
  assertEquals(isDefinitional7001("11 CCR § 7001(e)"), true);
  assertEquals(isDefinitional7001("11 CCR § 7001(e)(1)"), true);
  assertEquals(isDefinitional7001("11 CCR § 7001(ddd)"), true);
  assertEquals(isDefinitional7001("11 CCR § 7200(a)"), false);
  assertEquals(isDefinitional7001("11 CCR § 7150(b)(3)"), false);
  assertEquals(isDefinitional7001(""), false);
  assertEquals(isDefinitional7001(null), false);
});

Deno.test("is7150B3: matches only the (b)(3) pinpoint", () => {
  assertEquals(is7150B3("11 CCR § 7150(b)(3)"), true);
  assertEquals(is7150B3("11 CCR § 7150 ( b )( 3 )"), true);
  assertEquals(is7150B3("11 CCR § 7150(b)"), false);
  assertEquals(is7150B3("11 CCR § 7150(b)(6)"), false);
  assertEquals(is7150B3("11 CCR § 7150"), false);
  assertEquals(is7150B3(""), false);
});

Deno.test("collectEntryCitations: scalar + array of strings + array of objs", () => {
  const e = {
    citation: "11 CCR § 7001(ddd)",
    regulatory_citation: " 11 CCR § 7001(e) ",
    subsection: "",
    citations: ["11 CCR § 7001", { citation: "11 CCR § 7200(a)" }, { subsection: "11 CCR § 7150" }],
  };
  const out = collectEntryCitations(e);
  assertEquals(out.length, 5);
  assertEquals(out[0], "11 CCR § 7001(ddd)");
});

Deno.test("resolveGoverningDutyAnchor: definitional registry rows do NOT promote", () => {
  // sig_decision resolves to § 7001(ddd) — definitional — must return null.
  assertEquals(resolveGoverningDutyAnchor("sig_decision"), null);
  // Unknown key -> null.
  assertEquals(resolveGoverningDutyAnchor("does_not_exist_xyz"), null);
  // ra_trigger_admt resolves to § 7150(b)(3) — blocked from promotion.
  assertEquals(resolveGoverningDutyAnchor("ra_trigger_admt"), null);
});

// ── Regression — class (a) doc 731689ba shape ──────────────────────

Deno.test("class (a) 731689ba: § 7001(ddd) sole-anchor entry is excised", () => {
  const report: any = {
    top_3_actions: [
      {
        action:
          "Privacy Program Lead to produce a Significant-Decision Classification Memo formally resolving whether TierSelect tier assignments fall within any § 7001(ddd) enumerated category, by July 31, 2026, gating all downstream ADMT obligations.",
        citation: "11 CCR § 7001(ddd)",
        deadline: "2026-07-31",
        proposition_key: "sig_decision",
      },
      // Control entry — governing anchor, must survive.
      {
        action: "Pre-use notice publication.",
        citation: "11 CCR § 7220(a)",
        proposition_key: "notice_content",
      },
    ],
  };
  const diag = applyH6AdmtAnchor(report);
  assertEquals(diag.class_a_hits, 1);
  assertEquals(diag.entries_excised, 1);
  assertEquals(diag.registry_relabels, 0);
  assertEquals(report.top_3_actions.length, 1);
  assertEquals(report.top_3_actions[0].citation, "11 CCR § 7220(a)");
});

Deno.test("class (a) 731689ba: § 7001(e)(1) sole-anchor entry is excised", () => {
  const report: any = {
    documentation_to_maintain: [
      {
        obligation:
          "Per-Consumer TierSelect Use Frequency Log tracking use count over 12-month periods.",
        citation: "11 CCR § 7001(e)(1)",
        proposition_key: "human_involvement",
      },
    ],
  };
  const diag = applyH6AdmtAnchor(report);
  assertEquals(diag.class_a_hits, 1);
  assertEquals(diag.entries_excised, 1);
  assertEquals(report.documentation_to_maintain.length, 0);
});

// ── Regression — class (b) doc 3746fd24 shape ──────────────────────

Deno.test("class (b) 3746fd24: § 7150(b)(3) on sell/share doc duty is excised", () => {
  const report: any = {
    top_3_actions: [
      {
        action:
          "Privacy Program Lead: document in writing whether AdPicker's data flows constitute selling or sharing personal information, triggering a risk assessment under the risk-assessment subchapter, before January 1, 2027.",
        citation: "11 CCR § 7150(b)(3)",
        deadline: "2027-01-01",
        proposition_key: "ra_trigger_admt",
      },
    ],
  };
  const diag = applyH6AdmtAnchor(report);
  assertEquals(diag.class_b_hits, 1);
  assertEquals(diag.entries_excised, 1);
  assertEquals(report.top_3_actions.length, 0);
});

Deno.test("class (b) precedence: entry with only 7150(b)(3) but no sell/share prose is kept", () => {
  const report: any = {
    top_3_actions: [
      {
        action:
          "Confirm ADMT is used for a significant decision to establish the risk-assessment trigger.",
        citation: "11 CCR § 7150(b)(3)",
        proposition_key: "ra_trigger_admt",
      },
    ],
  };
  const diag = applyH6AdmtAnchor(report);
  assertEquals(diag.class_a_hits, 0);
  assertEquals(diag.class_b_hits, 0);
  assertEquals(diag.entries_excised, 0);
  assertEquals(report.top_3_actions.length, 1);
});

// ── Idempotency ────────────────────────────────────────────────────

Deno.test("idempotent: second pass is a no-op", () => {
  const report: any = {
    top_3_actions: [
      {
        action: "Pre-use notice publication.",
        citation: "11 CCR § 7220(a)",
        proposition_key: "notice_content",
      },
      {
        action: "Definitional-only duty.",
        citation: "11 CCR § 7001(ddd)",
        proposition_key: "sig_decision",
      },
    ],
  };
  const d1 = applyH6AdmtAnchor(report);
  const before = JSON.parse(JSON.stringify(report));
  const d2 = applyH6AdmtAnchor(report);
  assertEquals(d1.entries_excised, 1);
  assertEquals(d2.entries_scanned, 0); // all remaining entries stamped _h6v2_ran
  assertEquals(d2.entries_excised, 0);
  assertEquals(report.top_3_actions, before.top_3_actions);
});

// ── Fail-open ──────────────────────────────────────────────────────

Deno.test("fail-open: non-object report returns diag without throwing", () => {
  const d1 = applyH6AdmtAnchor(null);
  const d2 = applyH6AdmtAnchor(undefined);
  const d3 = applyH6AdmtAnchor("nope" as unknown);
  assertEquals(d1.entries_scanned, 0);
  assertEquals(d2.entries_scanned, 0);
  assertEquals(d3.entries_scanned, 0);
});

Deno.test("fail-open: bucket missing or non-array is skipped", () => {
  const report: any = { top_3_actions: null, notice_gaps: "not-an-array" };
  const d = applyH6AdmtAnchor(report);
  assertEquals(d.entries_scanned, 0);
  assertEquals(d.errors, 0);
});

// ── _meta preservation + telemetry ────────────────────────────────

Deno.test("_meta.internal.admt_h6b written; existing _meta preserved", () => {
  const report: any = {
    _meta: { internal: { admt_h6: { existing: true } }, custom: "keep" },
    top_3_actions: [
      { action: "Definitional only.", citation: "11 CCR § 7001(ddd)", proposition_key: "sig_decision" },
    ],
  };
  const d = applyH6AdmtAnchor(report);
  assertEquals(d.stamp_echo_registered, true);
  assertEquals(report._meta.custom, "keep");
  assertEquals(report._meta.internal.admt_h6.existing, true);
  assertEquals(report._meta.internal.admt_h6b.stamp, H6_ADMT_ANCHOR_STAMP);
  assertEquals(report._meta.internal.admt_h6b.entries_excised, 1);
});

// ── Unrelated-field control ────────────────────────────────────────

Deno.test("unrelated fields untouched; non-DUTY_BUCKETS not scanned", () => {
  const report: any = {
    system_name: "TierSelect",
    enforcement_context: {
      penalty_statutory_basis: "Cal. Civ. Code § 1798.155(a)",
      note: "System qualifies as ADMT and the intake supports a significant-decision assumption pending business confirmation of the § 7001(ddd) category.",
    },
    applicability_verdict: {
      authorities: [
        { subsection: "11 CCR § 7001(e)", proposition_key: "admt_def" },
      ],
    },
    top_3_actions: [
      { action: "Pre-use notice.", citation: "11 CCR § 7220(a)", proposition_key: "notice_content" },
    ],
  };
  const before = JSON.parse(JSON.stringify(report));
  const d = applyH6AdmtAnchor(report);
  assertEquals(d.entries_excised, 0);
  assertEquals(report.system_name, before.system_name);
  assertEquals(report.enforcement_context, before.enforcement_context);
  assertEquals(report.applicability_verdict, before.applicability_verdict);
  // top_3_actions entries gain a `_h6v2_ran` idempotency stamp; strip it
  // before deep-equal.
  const stripped = report.top_3_actions.map((e: any) => {
    const { _h6v2_ran, ...rest } = e;
    return rest;
  });
  assertEquals(stripped, before.top_3_actions);
});
