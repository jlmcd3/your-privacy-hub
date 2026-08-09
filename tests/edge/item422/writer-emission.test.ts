/**
 * ITEM 422 — THE ADMT WRITER EMITS THE TYPED RECORD.
 *
 * Pins the single-write-site normaliser: dual-read on input, canonical action
 * record on output, one home per fact, fail-open on garbage.
 */
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_ACTION_RECORD_WRITER_VERSION,
  coerceModelActionRecord,
  normalizeAdmtPriorityActions,
  parseLegacyActionString,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-records.ts";
import {
  ACTION_RECORD_CONTRACT_VERSION,
  formatActionHeadline,
  isActionRecord,
} from "../../../supabase/functions/_shared/report-contracts/action-record.ts";
import { ADMT_PIPELINE_STAMP } from "../../../supabase/functions/run-admt-checker/_local/prose/plans/admt.spine.ts";

Deno.test("ITEM 422: stamps are the ratified values", () => {
  assertEquals(ADMT_PIPELINE_STAMP, "admt-pipeline@item422b-2026-08-09");
  assertEquals(ADMT_ACTION_RECORD_WRITER_VERSION, "admt-action-records@item422-2026-08-09");
  assertEquals(ACTION_RECORD_CONTRACT_VERSION, "action-record@2026-08-09-item422");
});

Deno.test("ITEM 422: pipe-idiom legacy string lifts severity, deadline, owner out of the prose", () => {
  const r = parseLegacyActionString(
    "6. IMMEDIATE — by January 1, 2027 | Owner: Privacy Officer | Confirm that the ADMT access response includes the logic disclosure.",
    5,
  );
  assert(isActionRecord(r));
  assertEquals(r.rank, 6);
  assertEquals(r.severity, "IMMEDIATE");
  assertEquals(r.deadline, "January 1, 2027");
  assertEquals(r.owner_role, "Privacy Officer");
  assertEquals(r.action, "Confirm that the ADMT access response includes the logic disclosure.");
  assert(!/IMMEDIATE|Owner:/.test(r.action), "lifted facts must not remain in the prose");
});

Deno.test("ITEM 422: sentence-idiom legacy string lifts the role prefix", () => {
  const r = parseLegacyActionString(
    "3. IMMEDIATE — by January 1, 2027. Consumer-Request Handler / Vendor Manager: Document the service-provider notification step.",
    2,
  );
  assertEquals(r.severity, "IMMEDIATE");
  assertEquals(r.owner_role, "Consumer-Request Handler / Vendor Manager");
  assertEquals(r.action, "Document the service-provider notification step.");
});

Deno.test("ITEM 422: the pinpoint has ONE home (citation), never duplicated", () => {
  const r = coerceModelActionRecord({
    action: "Update the pre-use notice opt-out link title.",
    citation: "11 CCR § 7220(c)(2)(A)",
    proposition_key: "admt_preuse_optout_link",
    deadline: "January 1, 2027",
    owner_role: "Privacy Officer",
    severity: "immediate",
    rank: 1,
  }, 0);
  assertEquals(r.citation, "11 CCR § 7220(c)(2)(A)");
  assertEquals(r.statutory_basis, undefined);
  assertEquals(r.severity, "IMMEDIATE");

  const h = formatActionHeadline(r);
  assertStringIncludes(h, "Statutory basis: 11 CCR § 7220(c)(2)(A)");
  assertEquals(h.split("11 CCR § 7220(c)(2)(A)").length - 1, 1, "pinpoint stated once");
  assertEquals(h.split("Privacy Officer").length - 1, 1, "owner stated once");
  assert(!/[*`#]/.test(h), `markdown leaked: ${h}`);
});

Deno.test("ITEM 422: normaliser is the single write site and is dual-read", () => {
  const report: Record<string, unknown> = {
    priority_actions: [
      "1. IMMEDIATE — by January 1, 2027 | Owner: Privacy Officer | Do the first thing.",
      { rank: 2, action: "Do the second thing.", citation: "§ 7221(a)", deadline: "" },
      "",
      42,
    ],
    top_3_actions: [{ rank: 1, action: "untouched", citation: "§ 7221(a)" }],
  };
  const before = JSON.stringify(report.top_3_actions);
  const diag = normalizeAdmtPriorityActions(report);
  assertEquals(diag.from_string, 1);
  assertEquals(diag.from_record, 1);
  assertEquals(diag.dropped, 2);
  assertEquals(diag.total, 2);
  assertEquals(JSON.stringify(report.top_3_actions), before, "top_3_actions must stay byte-identical");

  const pa = report.priority_actions as Record<string, unknown>[];
  assert(pa.every((r) => isActionRecord(r)));
  assertEquals(pa[1].citation, "§ 7221(a)");
  assertEquals(pa[1].deadline, undefined);
});

Deno.test("ITEM 422: fail-open on degenerate input", () => {
  const empty = { priority_actions: [] };
  normalizeAdmtPriorityActions(empty);
  assertEquals(empty.priority_actions.length, 0);
  normalizeAdmtPriorityActions(null);
  normalizeAdmtPriorityActions({ priority_actions: "not an array" });
  const junk = { priority_actions: [123, null] };
  normalizeAdmtPriorityActions(junk);
  assertEquals(junk.priority_actions, [123, null], "no records ⇒ original value untouched");
});
