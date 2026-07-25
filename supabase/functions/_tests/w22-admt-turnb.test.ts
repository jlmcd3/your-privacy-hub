// WAVE22-FIX TURN B (cppa-admt) — tests.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  applyW22AdmtTurnB,
  W22_ADMT_TURNB_STAMP,
  _internals,
} from "../run-admt-checker/_w22_admt_turnb.ts";

// P1 — pinpoint substitution replaces blanket range when proposition_key resolves.
Deno.test("P1: registry-first substitution for optout_offer", () => {
  const report: any = {
    opt_out_gaps: [{
      proposition_key: "optout_offer",
      citation: "11 CCR §§ 7200–7222",
      verbatim_quote: "",
    }],
  };
  const d = applyW22AdmtTurnB(report, {});
  assertEquals(report.opt_out_gaps[0].citation, "11 CCR § 7221(a)");
  assert(report.opt_out_gaps[0].verbatim_quote.length > 0, "verbatim backfilled");
  assertEquals(d.pinpoint_substitutions, 1);
});

Deno.test("P1: notice_howworks resolves to § 7220 pinpoint via key", () => {
  const report: any = {
    notice_gaps: [{
      proposition_key: "notice_timing",
      citation: "11 CCR §§ 7200–7222",
    }],
  };
  applyW22AdmtTurnB(report, {});
  assertEquals(report.notice_gaps[0].citation, "11 CCR § 7220(b)(2)");
});

Deno.test("P1: unresolvable keys keep the neutral range (never invented)", () => {
  const report: any = {
    notice_gaps: [{
      proposition_key: "does_not_exist_key",
      citation: "11 CCR §§ 7200–7222",
    }],
  };
  const d = applyW22AdmtTurnB(report, {});
  assertEquals(report.notice_gaps[0].citation, "11 CCR §§ 7200–7222");
  assertEquals(d.pinpoint_substitutions, 0);
});

Deno.test("P1: keyless entries with neutral range are NOT substituted", () => {
  const report: any = {
    opt_out_gaps: [{ citation: "11 CCR §§ 7200–7222" }],
  };
  applyW22AdmtTurnB(report, {});
  assertEquals(report.opt_out_gaps[0].citation, "11 CCR §§ 7200–7222");
});

// P2 — internal-note phrase scrubbed from structured fields.
Deno.test("P2: unresolved-authority phrase removed from subsection field", () => {
  const report: any = {
    deadline_table: [{
      field: "Consumer access-right response timeline",
      subsection:
        "The applicable authority is not verified in our source registry; a specific citation is not provided here.",
      verbatim_quote:
        "The applicable authority is not verified in our source registry; a specific citation is…",
      citation: "11 CCR §§ 7200–7222",
    }],
  };
  const d = applyW22AdmtTurnB(report, {});
  assert(!("subsection" in report.deadline_table[0]), "subsection stripped");
  assert(!("verbatim_quote" in report.deadline_table[0]), "verbatim_quote stripped");
  assert(d.internal_note_scrubs >= 2);
});

Deno.test("P2 regression: phrase-absence across all customer-visible structured fields", () => {
  const report: any = {
    notice_gaps: [{ subsection: "The applicable authority is not verified in our source registry;" }],
    opt_out_gaps: [{ verbatim_quote: "The applicable authority is not verified in our source registry; a specific citation is not provided here." }],
    access_gaps: [{ provision: "The applicable authority is not verified in our source registry;" }],
  };
  applyW22AdmtTurnB(report, {});
  const walk = JSON.stringify(report);
  assert(!/applicable authority is not verified/i.test(walk), "phrase must not survive in customer-visible tree");
});

// P3 — stamp echo survives and is registered on _meta.internal.
Deno.test("P3: build-stamp echo key registered on _meta.internal.admt_w22b", () => {
  const report: any = { notice_gaps: [] };
  const d = applyW22AdmtTurnB(report, {});
  assertEquals(d.stamp_echo_registered, true);
  assertEquals(report._meta.internal.admt_w22b.version, W22_ADMT_TURNB_STAMP);
});

Deno.test("P3: stamp is well-formed w22-admt-turnb@<utc>", () => {
  assert(/^w22-admt-turnb@2026-07-25/.test(W22_ADMT_TURNB_STAMP));
});

// P4 — counsel-referral broadened detector.
Deno.test("P4: 'Your Privacy Officer should …' is scrubbed", () => {
  const report: any = {
    executive_summary:
      "Your Privacy Officer should review the ADMT pre-use notice before deployment. Deploy on Tuesday.",
  };
  const d = applyW22AdmtTurnB(report, {});
  assert(!/Privacy Officer/i.test(report.executive_summary));
  assert(d.counsel_referral_items >= 1);
});

Deno.test("P4: subject-first legal-team pattern is scrubbed", () => {
  const report: any = {
    top_3_actions: [{ action: "The business's legal team must approve the alternative process." }],
  };
  applyW22AdmtTurnB(report, {});
  assert(!/legal team must approve/i.test(JSON.stringify(report)));
});

// P5 — § 7155(a)(1) submission-vs-timing broadened.
Deno.test("P5: submission-content row with § 7155(a)(1) is downgraded to neutral", () => {
  const report: any = {
    deadline_table: [{
      field: "Submission elements for risk assessment",
      citation: "11 CCR § 7155(a)(1)",
    }],
  };
  const d = applyW22AdmtTurnB(report, {});
  assertEquals(report.deadline_table[0].citation, "11 CCR §§ 7200–7222");
  assertEquals(d.submission_timing_fixes, 1);
});

Deno.test("P5: timing row with § 7155(a)(1) is preserved", () => {
  const report: any = {
    deadline_table: [{
      field: "Deadline to conduct risk assessment before initiating processing",
      citation: "11 CCR § 7155(a)(1)",
    }],
  };
  applyW22AdmtTurnB(report, {});
  assertEquals(report.deadline_table[0].citation, "11 CCR § 7155(a)(1)");
});

// P6 — governing anchor § 7001 sole-anchor downgrade.
Deno.test("P6: § 7001 sole governing_anchor with duty verb is downgraded", () => {
  const report: any = {
    top_3_actions: [{
      action: "The business must provide pre-use notice.",
      governing_anchor: "11 CCR § 7001(e)(1)",
    }],
  };
  const d = applyW22AdmtTurnB(report, {});
  assertEquals(report.top_3_actions[0].governing_anchor, "11 CCR §§ 7200–7222");
  assertEquals(d.governing_anchor_completions, 1);
});

// Anchor-key immutability — prose walker does not touch anchor fields.
Deno.test("Anchor keys are immutable across walker even if they contain counsel words", () => {
  const report: any = {
    notice_gaps: [{
      // deliberately anchor-like keys containing pattern-matching prose
      citation: "Your Privacy Officer should approve — but this is a citation field",
      verbatim_quote: "The business's legal team must document this outcome.",
      // customer prose — MUST be scrubbed
      note: "Your Privacy Officer should approve the log.",
    }],
  };
  applyW22AdmtTurnB(report, {});
  // Anchor fields unchanged
  assert(/Privacy Officer/.test(report.notice_gaps[0].citation));
  assert(/legal team/.test(report.notice_gaps[0].verbatim_quote));
  // Prose scrubbed
  assert(!/Privacy Officer/.test(report.notice_gaps[0].note));
});

// Fail-open — null / bad shapes never throw.
Deno.test("Fail-open on null / non-object / missing buckets", () => {
  applyW22AdmtTurnB(null, null);
  applyW22AdmtTurnB(undefined, undefined);
  applyW22AdmtTurnB({}, {});
  applyW22AdmtTurnB({ notice_gaps: "not-an-array" }, {});
});

// LEAK-PREV P2 whitelist survival: _meta.internal preserved by serializer.
Deno.test("Serializer preservation: _meta.internal.admt_w22b survives report-serialize", async () => {
  const { serializeCustomerReport } = await import(
    "../_shared/report-serialize.ts"
  );
  const { ADMT_REPORT_SCHEMA } = await import(
    "../_shared/report-schemas/admt.ts"
  );
  const report: any = { notice_gaps: [] };
  applyW22AdmtTurnB(report, {});
  const out = serializeReportForCustomer(report, ADMT_REPORT_SCHEMA);
  assertEquals(
    (out as any)?._meta?.internal?.admt_w22b?.version,
    W22_ADMT_TURNB_STAMP,
  );
});

// Sanity: internals reachable for downstream tests.
Deno.test("Internals surfaced", () => {
  assert(_internals.BLANKET_RANGE_RE.test("11 CCR §§ 7200–7222"));
  assert(_internals.UNRESOLVED_AUTHORITY_RE.test("The applicable authority is not verified in our source registry; a specific citation is…"));
});
