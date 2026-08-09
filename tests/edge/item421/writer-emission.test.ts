/**
 * ITEM 421 — THE WRITER EMITS THE TYPED RECORD.
 *
 * Asserts the emission shape of `buildRiskActionRecord` and the FIX-2
 * retirement properties the typed record makes structural:
 *   - the pinpoint appears exactly ONCE in the stored action prose;
 *   - the role lives in exactly ONE field (`owner_role` XOR `reserved_to`);
 *   - the headline the renderer composes and the record body derive from the
 *     SAME role value;
 *   - no markdown survives into the composed headline.
 */
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRiskActionRecord,
  dedupePinpoint,
  deadlineFields,
  RISK_ACTION_RECORD_WRITER_VERSION,
} from "../../../supabase/functions/_shared/ltp/risk-action-records.ts";
import {
  formatActionHeadline,
  isActionRecord,
} from "../../../supabase/functions/_shared/report-contracts/action-record.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

const DEADLINE_ROW = {
  deadline_label: "Ongoing — 2027-12-31 (11 CCR § 7155(b))",
  anchor_pinpoint: "11 CCR § 7155(b)",
  deadline_sentence: "Complete by December 31, 2027.",
} as never;

function input(overrides: Record<string, unknown> = {}) {
  return {
    headline_label: "Document the safeguard that addresses re-identification risk",
    entity_name: "Northwind Analytics",
    customer_recorded_fact_clause: "the record names no safeguard for this element",
    gap_or_consequence_clause: "the element is not evidenced in the assessment record",
    compliance_guidance_sentence:
      "Record the safeguard under 11 CCR § 7152(a)(3) and retain the assessment record",
    pinpoint: "11 CCR § 7152(a)(3)",
    owner: "Chief Compliance Officer",
    is_reserved: false,
    deadline_row: DEADLINE_ROW,
    rank: 1,
    ...overrides,
  } as never;
}

Deno.test("ITEM 421: stamp and writer version are the ratified values", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item428c-2026-08-09");
  assertEquals(RISK_ACTION_RECORD_WRITER_VERSION, "risk-action-records@item421-2026-08-09");
});

Deno.test("ITEM 421: emitted value is a canonical action record with one home per fact", () => {
  const r = buildRiskActionRecord(input());
  assert(isActionRecord(r), "emission must satisfy isActionRecord");
  assertEquals(r.statutory_basis, "11 CCR § 7152(a)(3)");
  assertEquals(r.owner_role, "Chief Compliance Officer");
  assertEquals(r.reserved_to, undefined);
  assertEquals(r.deadline, "Ongoing — 2027-12-31");
  assertEquals(r.deadline_basis, "11 CCR § 7155(b)");
  assertEquals(r.rank, 1);
});

Deno.test("ITEM 421 (FIX-2 retirement): the pinpoint occurs exactly once in the action prose", () => {
  const r = buildRiskActionRecord(input());
  const occurrences = r.action.split("11 CCR § 7152(a)(3)").length - 1;
  assertEquals(occurrences, 1, `pinpoint occurs ${occurrences}× in the stored action`);

  // Where the composed clauses would state the pinpoint twice, every later
  // occurrence becomes "that provision" — one pinpoint per action, always.
  const twice = buildRiskActionRecord(input({
    headline_label: "Document the safeguard required by 11 CCR § 7152(a)(3)",
  }));
  assertEquals(twice.action.split("11 CCR § 7152(a)(3)").length - 1, 1);
  assertStringIncludes(twice.action, "that provision");
});

Deno.test("ITEM 421 (FIX-2 retirement): the role has exactly one home and one value", () => {
  const owned = buildRiskActionRecord(input());
  assert(!("reserved_to" in owned), "non-reserved rows must not carry reserved_to");

  const reserved = buildRiskActionRecord(input({ is_reserved: true, owner: "Qualified counsel" }));
  assertEquals(reserved.reserved_to, "Qualified counsel");
  assert(!("owner_role" in reserved), "reserved rows must not carry owner_role");
});

Deno.test("ITEM 421: headline and body derive from the SAME role value", () => {
  const reserved = buildRiskActionRecord(input({ is_reserved: true, owner: "Qualified counsel" }));
  const headline = formatActionHeadline(reserved);
  assertStringIncludes(headline, "Reserved to: Qualified counsel");
  assertEquals(headline.split("Qualified counsel").length - 1, 1, "role stated once");

  const owned = buildRiskActionRecord(input());
  const h2 = formatActionHeadline(owned);
  assertStringIncludes(h2, "Owner: Chief Compliance Officer");
  assertEquals(h2.split("Chief Compliance Officer").length - 1, 1);
  // Pinpoint still exactly once across the composed headline.
  assertEquals(h2.split("11 CCR § 7152(a)(3)").length - 1, 1);
});

Deno.test("ITEM 421: no markdown survives into the composed headline", () => {
  const r = buildRiskActionRecord(input({ headline_label: "## **Document** the `safeguard`" }));
  const h = formatActionHeadline(r);
  assert(!/[*`#]/.test(h), `markdown leaked: ${h}`);
});

Deno.test("ITEM 421: helpers are total on degenerate inputs (fail-open)", () => {
  assertEquals(dedupePinpoint("no pinpoint here", ""), "no pinpoint here");
  assertEquals(deadlineFields({ deadline_label: "", anchor_pinpoint: "" } as never).deadline, "");
});
