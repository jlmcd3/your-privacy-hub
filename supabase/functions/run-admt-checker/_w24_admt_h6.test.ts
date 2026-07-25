// W24-ADMT-H6-GOVERNING-ANCHOR — colocated deno tests.
// Regression pins from wave-21 doc 731689ba and earlier doc eefadb3f.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW24AdmtH6,
  collectAnchors,
  hasSole7001Anchor,
  isSection7001,
  resolveDutyAnchor,
  W24_ADMT_H6_STAMP,
  _internals,
} from "./_w24_admt_h6.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../_shared/registry/admt-verified-authorities.ts";

Deno.test("stamp format", () => {
  assert(W24_ADMT_H6_STAMP.startsWith("w24-admt-h6@"));
});

Deno.test("isSection7001 matches all § 7001 subdivisions", () => {
  assert(isSection7001("11 CCR § 7001(e)"));
  assert(isSection7001("11 CCR § 7001(e)(1)"));
  assert(isSection7001("11 CCR § 7001(ddd)"));
  assert(isSection7001("§ 7001"));
  assert(!isSection7001("11 CCR § 7150(b)(3)"));
  assert(!isSection7001("11 CCR § 7220(c)(1)"));
  assert(!isSection7001(""));
  assert(!isSection7001(undefined as any));
});

Deno.test("collectAnchors pulls scalar + stamp + citations[]", () => {
  const e: any = {
    citation: "11 CCR § 7001(e)",
    regulatory_citation: "",
    subsection: "11 CCR § 7001(e)(1)",
    _va_stamp: { subsection: "11 CCR § 7001(e)" },
    citations: ["11 CCR § 7001(ddd)", { citation: "11 CCR § 7001(e)" }],
  };
  const a = collectAnchors(e);
  assert(a.length === 5);
});

Deno.test("hasSole7001Anchor true when every anchor is § 7001", () => {
  const e: any = {
    citation: "11 CCR § 7001(e)(1)",
    _va_stamp: { subsection: "11 CCR § 7001(ddd)" },
  };
  assert(hasSole7001Anchor(e));
});

Deno.test("hasSole7001Anchor false when any anchor is duty-imposing", () => {
  const e: any = {
    citation: "11 CCR § 7001(e)",
    subsection: "11 CCR § 7150(b)(3)",
  };
  assert(!hasSole7001Anchor(e));
});

Deno.test("hasSole7001Anchor false when no anchors present (no-op path)", () => {
  assert(!hasSole7001Anchor({}));
});

Deno.test("resolveDutyAnchor promotes duty-imposing row (ra_trigger_admt → § 7150)", () => {
  const r = resolveDutyAnchor("ra_trigger_admt");
  assert(r);
  assertEquals(r!.citation, "11 CCR § 7150");
  assert(r!.subsection.startsWith("11 CCR § 7150"));
  // Byte-exact registry quote
  assertEquals(r!.verbatim_quote, ADMT_VERIFIED_AUTHORITIES["ra_trigger_admt"].verbatim_quote);
});

Deno.test("resolveDutyAnchor refuses § 7001-definitional rows (admt_def)", () => {
  const r = resolveDutyAnchor("admt_def");
  assertEquals(r, null);
});

Deno.test("resolveDutyAnchor null on unknown key (never fabricates)", () => {
  assertEquals(resolveDutyAnchor("nonexistent_key_xyz"), null);
  assertEquals(resolveDutyAnchor(undefined as any), null);
  assertEquals(resolveDutyAnchor(""), null);
});

// ── Regression pin — doc 731689ba (§ 7001(e)(1) / § 7001(ddd) sole anchor) ──
Deno.test("regression pin 731689ba — sole § 7001(e)(1) anchor with resolvable key → PROMOTED", () => {
  const report: any = {
    top_3_actions: [{
      id: "act-731689ba-1",
      proposition_key: "ra_trigger_admt",
      action: "Confirm whether AdPicker triggers a risk assessment.",
      citation: "11 CCR § 7001(e)(1)",
      subsection: "11 CCR § 7001(e)(1)",
    }],
  };
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.sole_7001_anchor_hits, 1);
  assertEquals(diag.registry_promotions, 1);
  assertEquals(diag.info_needed_routes, 0);
  const e = report.top_3_actions[0];
  assertEquals(e.citation, "11 CCR § 7150(b)(3)");
  assertEquals(e.subsection, "11 CCR § 7150(b)(3)");
  assert(typeof e.verbatim_quote === "string" && e.verbatim_quote.length > 0);
  assertEquals(e._va_stamp.source, "w24_admt_h6");
});

Deno.test("regression pin 731689ba — sole § 7001(ddd) anchor with NO key → INFO-NEEDED (never fabricated)", () => {
  const report: any = {
    priority_actions: [{
      id: "act-731689ba-2",
      action: "Document the advertising exclusion basis.",
      citation: "11 CCR § 7001(ddd)",
      _va_stamp: { subsection: "11 CCR § 7001(ddd)" },
    }],
  };
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.sole_7001_anchor_hits, 1);
  assertEquals(diag.registry_promotions, 0);
  assertEquals(diag.info_needed_routes, 1);
  const e = report.priority_actions[0];
  assertEquals(e.citation, "");
  assertEquals(e._va_stamp, undefined);
  assertEquals(e._va_stamp_unresolved.reason, "h6_sole_7001_governing_anchor_unresolvable");
  // Prose (action) untouched
  assertEquals(e.action, "Document the advertising exclusion basis.");
});

// ── Regression pin — doc eefadb3f (§ 7001(e) sole anchor on compliance timeline) ──
Deno.test("regression pin eefadb3f — sole § 7001(e) anchor on deadline_table with resolvable key → PROMOTED", () => {
  const report: any = {
    deadline_table: [{
      id: "dl-eefadb3f",
      proposition_key: "notice_optout",
      description: "Pre-use notice must include an opt-out link.",
      citation: "11 CCR § 7001(e)",
      subsection: "11 CCR § 7001(e)",
    }],
  };
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.sole_7001_anchor_hits, 1);
  assertEquals(diag.registry_promotions, 1);
  const e = report.deadline_table[0];
  assertEquals(e.citation, "11 CCR § 7220(c)(2)");
});

// ── Untouched cases ──────────────────────────────────────────────────

Deno.test("duty entry with proper subchapter pinpoint UNTOUCHED", () => {
  const report: any = {
    priority_actions: [{
      id: "p1",
      proposition_key: "notice_purpose",
      action: "Include purpose in pre-use notice.",
      citation: "11 CCR § 7220(c)(1)",
      subsection: "11 CCR § 7220(c)(1)",
      verbatim_quote: "ORIGINAL_QUOTE",
    }],
  };
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.sole_7001_anchor_hits, 0);
  const e = report.priority_actions[0];
  assertEquals(e.citation, "11 CCR § 7220(c)(1)");
  assertEquals(e.verbatim_quote, "ORIGINAL_QUOTE");
});

Deno.test("§ 7001 as SECONDARY support alongside subchapter anchor UNTOUCHED", () => {
  const report: any = {
    top_3_actions: [{
      id: "p2",
      proposition_key: "ra_trigger_admt",
      action: "See § 7001(e) definition then apply § 7150(b)(3).",
      citation: "11 CCR § 7150(b)(3)",
      citations: ["11 CCR § 7150(b)(3)", "11 CCR § 7001(e)"],
      verbatim_quote: "KEEP",
    }],
  };
  const before = JSON.stringify(report.top_3_actions[0]);
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.sole_7001_anchor_hits, 0);
  assertEquals(diag.registry_promotions, 0);
  assertEquals(JSON.stringify(report.top_3_actions[0]).replace(/,"_w24_h6_ran":true/, ""), before);
});

// ── Idempotency + fail-open ─────────────────────────────────────────

Deno.test("idempotency: second call is a no-op beyond stamp echo", () => {
  const report: any = {
    top_3_actions: [{
      id: "p1",
      proposition_key: "ra_trigger_admt",
      citation: "11 CCR § 7001(e)",
      subsection: "11 CCR § 7001(e)",
      action: "Do the thing.",
    }],
  };
  const d1 = applyW24AdmtH6(report, {});
  const snap = JSON.stringify(report.top_3_actions);
  const d2 = applyW24AdmtH6(report, {});
  assertEquals(d2.sole_7001_anchor_hits, 0);
  assertEquals(d2.registry_promotions, 0);
  assertEquals(JSON.stringify(report.top_3_actions), snap);
  assert(d1.registry_promotions === 1);
});

Deno.test("fail-open on null / malformed report", () => {
  const d1 = applyW24AdmtH6(null, {});
  assertEquals(d1.entries_scanned, 0);
  const d2 = applyW24AdmtH6(undefined as any, {});
  assertEquals(d2.entries_scanned, 0);
  const d3 = applyW24AdmtH6({ top_3_actions: "not-an-array" }, {});
  assertEquals(d3.entries_scanned, 0);
});

Deno.test("empty report is a no-op and does not crash", () => {
  const r: any = {};
  const d = applyW24AdmtH6(r, {});
  assertEquals(d.entries_scanned, 0);
  assert(d.stamp_echo_registered);
  assertEquals(r._meta.internal.admt_h6.version, W24_ADMT_H6_STAMP);
});

// ── Anchor-key immutability elsewhere ───────────────────────────────

Deno.test("anchor keys in OTHER buckets untouched (non-duty buckets ignored)", () => {
  const report: any = {
    // "annotations" is not a duty bucket in H6 scope.
    annotations: [{
      id: "a1",
      proposition_key: "ra_trigger_admt",
      citation: "11 CCR § 7001(e)",
      subsection: "11 CCR § 7001(e)",
    }],
  };
  const diag = applyW24AdmtH6(report, {});
  assertEquals(diag.entries_scanned, 0);
  assertEquals(report.annotations[0].citation, "11 CCR § 7001(e)");
});

// ── _meta.internal survival + stamp echo ────────────────────────────

Deno.test("stamp echo lands on _meta.internal.admt_h6", () => {
  const report: any = { top_3_actions: [] };
  const diag = applyW24AdmtH6(report, {});
  assert(diag.stamp_echo_registered);
  assertEquals(report._meta.internal.admt_h6.version, W24_ADMT_H6_STAMP);
});

Deno.test("_internals surface exports for auditability", () => {
  assert(_internals.DUTY_BUCKETS.length > 0);
  assert(_internals.CITATION_FIELDS.includes("citation"));
  assertEquals(_internals.isSection7001, isSection7001);
});
