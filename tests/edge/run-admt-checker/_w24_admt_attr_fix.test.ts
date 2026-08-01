// W24-ADMT-ATTRIBUTION-FIX — colocated deno tests.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW24AdmtAttrFix,
  scrubBracketedAdvisorySentence,
  scrubInformationNeededProse,
  rewriteOrDropUnresolvedTemplate,
  W24_ADMT_ATTR_STAMP,
} from "./_w24_admt_attr_fix.ts";

Deno.test("stamp format", () => {
  assert(W24_ADMT_ATTR_STAMP.startsWith("w24-admt-attr@"));
});

// ── T-Aa bracketed ALL-CAPS advisory ──────────────────────────────────
Deno.test("T-Aa: regression pin doc a87dcff5 — bracketed ALL-CAPS advisory scrubbed", () => {
  const s =
    "[FURTHER INTERNAL LEGAL REVIEW IS ADVISABLE TO CONFIRM THAT WITHHELD ELEMENTS SATISFY THE APPLICABLE TRADE-SECRET DEFINITION BEFORE THIS CARVE-OUT IS RELIED UPON IN A CONSUMER RESPONSE.] Adopt this document as a formal written policy.";
  const r = scrubBracketedAdvisorySentence(s);
  assertEquals(r.hits, 1);
  assert(!/\[FURTHER INTERNAL LEGAL REVIEW/i.test(r.out));
  assert(r.out.includes("Qualified counsel"));
});

Deno.test("T-Aa: bracketed advisory with SIGN-OFF / RECOMMENDED variants scrubbed", () => {
  const s = "Route to [SIGN-OFF BY OUTSIDE COUNSEL RECOMMENDED] before publishing.";
  const r = scrubBracketedAdvisorySentence(s);
  assertEquals(r.hits, 1);
  assert(!/SIGN-OFF/i.test(r.out));
});

Deno.test("T-Aa: plain bracketed non-advisory left untouched", () => {
  const s = "Cite the [15 business-day] window per § 7221(n)(1).";
  const r = scrubBracketedAdvisorySentence(s);
  assertEquals(r.hits, 0);
  assertEquals(r.out, s);
});

// ── T-Ab information-needed prose ─────────────────────────────────────
Deno.test("T-Ab: 'More information is needed' scrubbed", () => {
  const s = "The determination is uncertain. More information is needed before this item can be assessed.";
  const r = scrubInformationNeededProse(s);
  assertEquals(r.hits, 1);
  assert(!/More information is needed/i.test(r.out));
  assert(r.out.length > 0);
});

Deno.test("T-Ab: variant 'Additional information is needed' scrubbed", () => {
  const s = "Additional information is needed to confirm scope.";
  const r = scrubInformationNeededProse(s);
  assertEquals(r.hits, 1);
});

Deno.test("T-Ab: unrelated prose left alone", () => {
  const s = "The intake indicates the model is used for tier assignment.";
  const r = scrubInformationNeededProse(s);
  assertEquals(r.hits, 0);
  assertEquals(r.out, s);
});

// ── T-B unresolved template-variable guard ────────────────────────────
Deno.test("T-B: regression pin doc 95d8140f — unresolved template dropped in priority_actions body", () => {
  const entry = { finding: "" };
  const s = "No the applicable ADMT-subchapter provision gaps are identified on this record because the significant-decision trigger is not established.";
  const r = rewriteOrDropUnresolvedTemplate(s, entry);
  assertEquals(r.rewrites, 0);
  assertEquals(r.drops, 1);
  assert(!/the applicable ADMT-subchapter provision/i.test(r.out));
});

Deno.test("T-B: unresolved template REWRITTEN when proposition_key resolves", () => {
  const entry = { proposition_key: "scope_deadline" };
  const s = "Confirm the deadline under the applicable ADMT-subchapter provision before first use.";
  const r = rewriteOrDropUnresolvedTemplate(s, entry);
  assertEquals(r.rewrites, 1);
  assert(!/the applicable ADMT-subchapter provision/i.test(r.out));
  assert(r.out.includes("11 CCR §"));
});

Deno.test("T-B: prose without the fallback phrase untouched", () => {
  const entry = {};
  const s = "Assess ADMT scope under 11 CCR § 7150(b).";
  const r = rewriteOrDropUnresolvedTemplate(s, entry);
  assertEquals(r.rewrites, 0);
  assertEquals(r.drops, 0);
  assertEquals(r.out, s);
});

// ── Orchestrator integration + stamp echo ─────────────────────────────
Deno.test("orchestrator: full integration + stamp echo registered", () => {
  const report: any = {
    priority_actions: [
      {
        rank: 1,
        action: "No the applicable ADMT-subchapter provision gaps are identified on this record.",
        finding: "[FURTHER INTERNAL LEGAL REVIEW IS ADVISABLE TO CONFIRM SCOPE.] More information is needed before this item can be assessed.",
      },
    ],
  };
  const d = applyW24AdmtAttrFix(report, {});
  assert(d.stamp_echo_registered);
  assertEquals(report._meta.internal.admt_w24_attr.version, W24_ADMT_ATTR_STAMP);
  assert(d.bracketed_advisory_scrubs >= 1);
  assert(d.info_needed_prose_scrubs >= 1);
  assert(d.template_var_drops >= 1);
  assert(!/the applicable ADMT-subchapter provision/i.test(report.priority_actions[0].action));
  assert(!/FURTHER INTERNAL LEGAL REVIEW/i.test(report.priority_actions[0].finding));
  assert(!/More information is needed/i.test(report.priority_actions[0].finding));
});

Deno.test("orchestrator: empty report — no crash", () => {
  const report: any = {};
  const d = applyW24AdmtAttrFix(report, {});
  assertEquals(d.version, W24_ADMT_ATTR_STAMP);
  assert(d.stamp_echo_registered);
});

Deno.test("orchestrator: idempotency — second pass produces zero counters", () => {
  const report: any = {
    priority_actions: [
      { action: "No the applicable ADMT-subchapter provision gaps are identified." },
    ],
  };
  applyW24AdmtAttrFix(report, {});
  const d2 = applyW24AdmtAttrFix(report, {});
  assertEquals(d2.template_var_drops, 0);
  assertEquals(d2.bracketed_advisory_scrubs, 0);
});
