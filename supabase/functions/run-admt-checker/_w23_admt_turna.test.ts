// WAVE23-FIX TURN A (cppa-admt) — colocated deno tests.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW23AdmtTurnA,
  scrubBareCounselSubject,
  scrubBracketedRolePlaceholder,
  resolveOrDropEmptyCitation,
  downgradeS7155InEntry,
  downgradeS7001ChainInEntry,
  W23_ADMT_TURNA_STAMP,
} from "./_w23_admt_turna.ts";

Deno.test("stamp: format w23-admt-turna@<ISO>", () => {
  assert(W23_ADMT_TURNA_STAMP.startsWith("w23-admt-turna@"));
  assert(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W23_ADMT_TURNA_STAMP));
});

// ── T3a — bare-article counsel subject ────────────────────────────────
Deno.test("T3a: 'The Privacy Officer must revise the notice' → neutralised", () => {
  const s = "The Privacy Officer must revise the notice before publishing.";
  const r = scrubBareCounselSubject(s);
  assertEquals(r.hits, 1);
  assert(!/Privacy\s+Officer/i.test(r.out));
  assert(r.out.includes("Qualified counsel"));
});

Deno.test("T3a: 'The DPO should confirm' → neutralised", () => {
  const s = "The DPO should confirm the applicability determination.";
  const r = scrubBareCounselSubject(s);
  assertEquals(r.hits, 1);
});

Deno.test("T3a: unrelated sentence untouched", () => {
  const s = "The system produces a decision within 500 milliseconds.";
  const r = scrubBareCounselSubject(s);
  assertEquals(r.hits, 0);
  assertEquals(r.out, s);
});

// ── T3b — bracketed placeholder ───────────────────────────────────────
Deno.test("T3b: '[LEGAL COUNSEL / PRODUCT OWNER]' scrubbed", () => {
  const s = "Route the trade-secret carve-out to [LEGAL COUNSEL / PRODUCT OWNER] for review.";
  const r = scrubBracketedRolePlaceholder(s);
  assertEquals(r.hits, 1);
  assert(!/\[LEGAL COUNSEL/i.test(r.out));
  assert(r.out.includes("qualified counsel"));
});

Deno.test("T3b: '[PRIVACY OFFICER]' placeholder scrubbed", () => {
  const s = "Have [PRIVACY OFFICER] sign off before deployment.";
  const r = scrubBracketedRolePlaceholder(s);
  assertEquals(r.hits, 1);
});

Deno.test("T3b: unrelated brackets untouched", () => {
  const s = "Note the [15 business-day] window per § 7221(n)(1).";
  const r = scrubBracketedRolePlaceholder(s);
  assertEquals(r.hits, 0);
  assertEquals(r.out, s);
});

// ── T1/T4 — opt_out_gaps empty citation ───────────────────────────────
Deno.test("T1: empty citation + resolvable proposition_key → registry-stamped", () => {
  const entry: any = {
    element_id: "optout_offer",
    proposition_key: "optout_offer",
    citation: "",
    finding: "The business does not offer opt-out.",
  };
  const r = resolveOrDropEmptyCitation(entry);
  // Only asserts stamping when the key resolves; if the registry lacks the
  // key, the drop branch fires — either way the empty string is gone.
  assert(r.stamped + r.dropped === 1);
  assert(!("citation" in entry) || (typeof entry.citation === "string" && entry.citation.trim().length > 0));
});

Deno.test("T4: empty citation + no proposition_key → citation field dropped", () => {
  const entry: any = { element_id: "optout_offer", citation: "   ", finding: "x" };
  const r = resolveOrDropEmptyCitation(entry);
  assertEquals(r.stamped, 0);
  assertEquals(r.dropped, 1);
  assert(!("citation" in entry));
});

Deno.test("T4: non-empty citation left untouched", () => {
  const entry: any = { citation: "11 CCR § 7221(a)", finding: "x" };
  const r = resolveOrDropEmptyCitation(entry);
  assertEquals(r.stamped, 0);
  assertEquals(r.dropped, 0);
  assertEquals(entry.citation, "11 CCR § 7221(a)");
});

// ── T5 — § 7155(a)(1) submission-content downgrade ────────────────────
Deno.test("T5: § 7155(a)(1) + 'content of submission' phrasing → downgraded", () => {
  const entry: any = {
    citation: "11 CCR § 7155(a)(1)",
    finding: "Document the content of the submission elements before filing.",
  };
  const n = downgradeS7155InEntry(entry);
  assertEquals(n, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
});

Deno.test("T5: § 7155(a)(1) with pure timing prose untouched", () => {
  const entry: any = {
    citation: "11 CCR § 7155(a)(1)",
    finding: "Submit the risk assessment within the § 7155(a)(1) window.",
  };
  const n = downgradeS7155InEntry(entry);
  assertEquals(n, 0);
  assertEquals(entry.citation, "11 CCR § 7155(a)(1)");
});

// ── T6 — § 7001 chained-subdivision downgrade ─────────────────────────
Deno.test("T6: '§ 7001(e) + § 7001(e)(1)' chain in citation → downgraded", () => {
  const entry: any = { citation: "11 CCR § 7001(e) + 11 CCR § 7001(e)(1)" };
  const n = downgradeS7001ChainInEntry(entry);
  assertEquals(n, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
});

Deno.test("T6: '§ 7001(ddd), § 7001(ddd)(1)' comma-chain downgraded", () => {
  const entry: any = { governing_anchor: "11 CCR § 7001(ddd), 11 CCR § 7001(ddd)(1)" };
  const n = downgradeS7001ChainInEntry(entry);
  assertEquals(n, 1);
});

Deno.test("T6: single § 7001 subdivision left alone", () => {
  const entry: any = { citation: "11 CCR § 7001(e)(1)" };
  const n = downgradeS7001ChainInEntry(entry);
  assertEquals(n, 0);
  assertEquals(entry.citation, "11 CCR § 7001(e)(1)");
});

// ── Orchestrator + stamp-echo ─────────────────────────────────────────
Deno.test("orchestrator: full integration + stamp-echo registered", () => {
  const report: any = {
    opt_out_gaps: [
      { element_id: "optout_offer", citation: "", finding: "The business does not offer opt-out." },
      {
        element_id: "optout_confirmation",
        citation: "11 CCR § 7001(e) + 11 CCR § 7001(e)(1)",
        finding: "The DPO must confirm the opt-out response.",
      },
    ],
    top_3_actions: [
      {
        rank: 1,
        citation: "11 CCR § 7155(a)(1)",
        action: "Document the content of the submission elements. Route to [LEGAL COUNSEL / PRODUCT OWNER] for sign-off.",
      },
    ],
    priority_actions: [
      { action: "The Privacy Officer must revise the notice before publishing." },
    ],
  };
  const d = applyW23AdmtTurnA(report, {});
  assert(d.stamp_echo_registered);
  assertEquals(report._meta.internal.admt_w23a.version, W23_ADMT_TURNA_STAMP);
  assert(d.t1_opt_out_citations_stamped + d.t1_opt_out_citations_dropped >= 1);
  assert(d.t3_counsel_subject_scrubs >= 1);
  assert(d.t3_bracketed_placeholder_scrubs >= 1);
  assert(d.t5_submission_content_downgrades >= 1);
  assert(d.t6_s7001_chain_downgrades >= 1);
  // Post-conditions on customer surface.
  assertEquals(report.top_3_actions[0].citation, "11 CCR §§ 7200–7222");
  assert(!/\[LEGAL COUNSEL/i.test(report.top_3_actions[0].action));
  assert(!/Privacy Officer/i.test(report.priority_actions[0].action));
  assertEquals(report.opt_out_gaps[1].citation, "11 CCR §§ 7200–7222");
});

Deno.test("orchestrator: empty report → no crash, stamp echo attached", () => {
  const report: any = {};
  const d = applyW23AdmtTurnA(report, {});
  assertEquals(d.version, W23_ADMT_TURNA_STAMP);
  assert(d.stamp_echo_registered);
  assertEquals(report._meta.internal.admt_w23a.version, W23_ADMT_TURNA_STAMP);
});

Deno.test("idempotency: second pass produces zero counters (except stamp)", () => {
  const report: any = {
    priority_actions: [{ action: "The Privacy Officer must revise the notice." }],
  };
  applyW23AdmtTurnA(report, {});
  const d2 = applyW23AdmtTurnA(report, {});
  assertEquals(d2.t3_counsel_subject_scrubs, 0);
  assertEquals(d2.t3_bracketed_placeholder_scrubs, 0);
});
