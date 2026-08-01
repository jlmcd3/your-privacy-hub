// W24-ADMT-RESOLVER-AUDIT — colocated deno tests.
// Regression pins from wave-24 (run 113, quality_run f2c7deca) evidence.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW24AdmtAudit,
  detectKeySelectionMismatch,
  extractPinpoints,
  normalizeSubsectionPinpoint,
  scrubUnsupportedBusinessClaim,
  auditActionability,
  W24_ADMT_AUDIT_STAMP,
  _internals,
} from "./_w24_admt_audit.ts";

Deno.test("stamp format", () => {
  assert(W24_ADMT_AUDIT_STAMP.startsWith("w24-admt-audit@"));
});

// ── Class A: resolver key-selection audit ─────────────────────────────
Deno.test("A: extractPinpoints picks up § 7150(b)(1) and § 7150(b)(2)", () => {
  const s = "Confirm triggers § 7150(b)(1) and § 7150(b)(2) before proceeding.";
  const p = extractPinpoints(s);
  assertEquals(p, ["7150(b)(1)", "7150(b)(2)"]);
});

Deno.test("A: normalizeSubsectionPinpoint extracts from '11 CCR § 7150(b)(3)'", () => {
  assertEquals(normalizeSubsectionPinpoint("11 CCR § 7150(b)(3)"), "7150(b)(3)");
  assertEquals(normalizeSubsectionPinpoint("11 CCR § 7150"), "");
});

Deno.test("A: regression pin — ra_trigger_admt entry mismatched against (b)(1)/(b)(2) prose", () => {
  // Wave-24 evidence: proposition_key ra_trigger_admt resolved to
  // § 7150(b)(3), but the action prose referenced (b)(1) and (b)(2).
  const chk = detectKeySelectionMismatch(
    "Confirm whether AdPicker triggers § 7150(b)(1) or § 7150(b)(2).",
    "11 CCR § 7150(b)(3)",
  );
  assert(chk.mismatch);
  assertEquals(chk.expected, "7150(b)(3)");
  assert(chk.found.includes("7150(b)(1)"));
});

Deno.test("A: no mismatch when resolved pinpoint also appears in prose (cross-ref)", () => {
  const chk = detectKeySelectionMismatch(
    "Triggers § 7150(b)(1), § 7150(b)(2), and § 7150(b)(3) all apply.",
    "11 CCR § 7150(b)(3)",
  );
  assert(!chk.mismatch);
});

Deno.test("A: cross-section pinpoints do not trigger mismatch (handled by neutral fallback)", () => {
  const chk = detectKeySelectionMismatch(
    "Also see § 7221(a) for opt-out mechanics.",
    "11 CCR § 7150(b)(3)",
  );
  assert(!chk.mismatch);
});

Deno.test("A: orchestrator drops stamp and clears citation on mismatch", () => {
  const report: any = {
    top_3_actions: [{
      id: "act-1",
      proposition_key: "ra_trigger_admt",
      action: "Confirm AdPicker triggers § 7150(b)(1) and § 7150(b)(2).",
      citation: "11 CCR § 7150(b)(3)",
      _va_stamp: { proposition_key: "ra_trigger_admt", subsection: "11 CCR § 7150(b)(3)" },
    }],
  };
  const diag = applyW24AdmtAudit(report, {});
  assertEquals(diag.class_a_key_mismatch_drops, 1);
  const e = report.top_3_actions[0];
  assertEquals(e.citation, "");
  assertEquals(e._va_stamp, undefined);
  assertEquals(e._va_stamp_unresolved.reason, "key_selection_mismatch");
});

// ── Class B: rubric_unsupported_business_claim ────────────────────────
Deno.test("B: regression pin — 'the business does not sell or share' rewritten when intake silent", () => {
  const intake = "TierSelect uses AdPicker.";
  const s = "In addition, the business does not sell or share personal information.";
  const r = scrubUnsupportedBusinessClaim(s, intake.toLowerCase());
  assertEquals(r.hits, 1);
  assert(r.out.includes("intake does not include information"));
  assert(!/does not sell or share/i.test(r.out));
});

Deno.test("B: regression pin — 'the intake explicitly records this as not described' scrubbed", () => {
  const s = "The intake explicitly records this as not described.";
  const r = scrubUnsupportedBusinessClaim(s, "");
  assertEquals(r.hits, 1);
  assert(!/explicitly records/i.test(r.out));
});

Deno.test("B: regression pin — 'the record does not track per-consumer use frequency' scrubbed", () => {
  const s = "The record does not track per-consumer use frequency, so the threshold cannot be determined.";
  const r = scrubUnsupportedBusinessClaim(s, "");
  assertEquals(r.hits, 1);
});

Deno.test("B: intake-supported negative business claim preserved", () => {
  const intake = "the business does not sell or share personal information; confirmed by controller";
  const s = "The business does not sell or share personal information under this program.";
  const r = scrubUnsupportedBusinessClaim(s, intake.toLowerCase());
  assertEquals(r.hits, 0);
  assertEquals(r.out, s);
});

Deno.test("B: neutral fallback phrase left alone", () => {
  const s = "The business does not use the applicable ADMT-subchapter provision here.";
  const r = scrubUnsupportedBusinessClaim(s, "");
  assertEquals(r.hits, 0);
});

// ── Class C: actionability ────────────────────────────────────────────
Deno.test("C: pinpoint appended when entry has resolved stamp and action lacks §", () => {
  const entry: any = {
    action: "Adopt and document a trade-secret carve-out policy",
    _va_stamp: { subsection: "11 CCR § 7222(c)(1)" },
  };
  const r = auditActionability(entry);
  assert(r.pinpoint_appended);
  assert(entry.action.includes("11 CCR § 7222(c)(1)"));
});

Deno.test("C: pinpoint NOT appended when action already carries a § token", () => {
  const entry: any = {
    action: "Cite § 7222(c)(1) in the policy.",
    _va_stamp: { subsection: "11 CCR § 7222(c)(1)" },
  };
  const r = auditActionability(entry);
  assert(!r.pinpoint_appended);
});

Deno.test("C: regression pin — pure-deferral action prefixed with intake-grounded confirm cue", () => {
  const entry: any = {
    field: "access_timeline",
    action: "We could not verify this item from the information provided; it is listed under information needed.",
  };
  const r = auditActionability(entry);
  assert(r.deferral_prefixed);
  assert(/^Confirm and document access timeline/.test(entry.action));
});

// ── Orchestrator + integration ────────────────────────────────────────
Deno.test("integration: empty report is a no-op and does not crash", () => {
  const diag = applyW24AdmtAudit({}, {});
  assertEquals(diag.entries_scanned, 0);
  assert(diag.stamp_echo_registered);
});

Deno.test("integration: null report handled fail-open", () => {
  const diag = applyW24AdmtAudit(null, null);
  assertEquals(diag.entries_scanned, 0);
});

Deno.test("integration: multi-bucket walk exercises all three classes", () => {
  const report: any = {
    priority_actions: [
      {
        id: "p1",
        proposition_key: "ra_trigger_admt",
        action: "Confirm § 7150(b)(1) and § 7150(b)(2) triggers.",
        citation: "11 CCR § 7150(b)(3)",
        _va_stamp: { subsection: "11 CCR § 7150(b)(3)" },
      },
      {
        id: "p2",
        action: "Adopt a written policy",
        _va_stamp: { subsection: "11 CCR § 7222(c)(1)" },
      },
    ],
    access_gaps: [{
      id: "g1",
      description: "The record does not track per-consumer use frequency here.",
    }],
  };
  const diag = applyW24AdmtAudit(report, {});
  assertEquals(diag.class_a_key_mismatch_drops, 1);
  assertEquals(diag.class_c_pinpoint_appends, 1);
  assert(diag.class_b_business_claim_scrubs >= 1);
  // Stamp-echo landed under _meta.internal.
  assertEquals(report._meta.internal.admt_w24_audit.version, W24_ADMT_AUDIT_STAMP);
});

Deno.test("idempotency: second call is a no-op beyond stamp echo", () => {
  const report: any = {
    priority_actions: [{
      id: "p1",
      action: "Adopt a policy",
      _va_stamp: { subsection: "11 CCR § 7222(c)(1)" },
    }],
  };
  const d1 = applyW24AdmtAudit(report, {});
  const before = report.priority_actions[0].action;
  const d2 = applyW24AdmtAudit(report, {});
  const after = report.priority_actions[0].action;
  assertEquals(before, after);
  assertEquals(d2.class_c_pinpoint_appends, 0);
  assert(d1.class_c_pinpoint_appends >= 0);
});

Deno.test("anchor keys never mutated by class B walker", () => {
  const report: any = {
    priority_actions: [{
      id: "p1",
      // Anchor keys with problematic strings — must NOT be scrubbed.
      citation: "the business does not sell or share (this looks like B match but is an anchor)",
      verbatim_quote: "the record does not track x",
      subsection: "11 CCR § 7222(c)(1)",
      action: "Adopt policy",
    }],
  };
  applyW24AdmtAudit(report, {});
  const e = report.priority_actions[0];
  assert(e.citation.includes("does not sell or share"));
  assert(e.verbatim_quote.includes("does not track"));
});

Deno.test("_internals surface exports for auditability", () => {
  assert(_internals.CUSTOMER_BUCKETS.length > 0);
  assert(_internals.ANCHOR_KEYS.has("citation"));
  assert(_internals.ANCHOR_KEYS.has("proposition_key"));
});
