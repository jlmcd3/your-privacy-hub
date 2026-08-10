/**
 * ITEM 422-C — THE THREE PILOT DEFECTS (batch a2c66373, run f9973b49).
 *
 * D1 mis-keyed proposition → honest downgrade (both directions).
 * D2 present-but-unresolvable key → never a null citation (both directions).
 * D3 out-of-range pinpoint on deadline_table and every citation-bearing
 *    surface → duty stated, pinpoint withheld (both directions).
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_SUBCHAPTER_FALLBACK,
  resolveAdmtActionCitations,
  resolveActionCitation,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-citations.ts";
import {
  ADMT_PROPOSITION_ANCHOR_VERSION,
  validatePropositionAssignment,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-proposition-anchors.ts";
import {
  ADMT_RANGE_SWEEP_VERSION,
  ADMT_SWEPT_CITATION_SURFACES,
  hasOutOfRangeCitation,
  isInVerifiedAdmtRange,
  sweepAdmtOutOfRangeCitations,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-citation-range-sweep.ts";
import { buildDeadlineTable } from "../../../supabase/functions/run-admt-checker/_w9_admt_slots.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts";

const REG = ADMT_VERIFIED_AUTHORITIES as unknown as Record<string, { subsection: string }>;

Deno.test("ITEM 422-C: module versions are the ratified values", () => {
  assertEquals(ADMT_PROPOSITION_ANCHOR_VERSION, "admt-proposition-anchors@so-ft1-2026-08-10");
  assertEquals(ADMT_RANGE_SWEEP_VERSION, "admt-citation-range-sweep@item422c-2026-08-09");
});

// ── DEFECT 1 — content-anchored proposition assignment ──────────────────────

Deno.test("ITEM 422-C D1: a RIGHT assignment passes untouched", () => {
  const entry: Record<string, unknown> = {
    rank: 1,
    proposition_key: "access_logic",
    action:
      "Publish information about the logic of the ADMT, including the parameters that generated the output.",
  };
  assertEquals(validatePropositionAssignment(entry, "access_logic").verdict, "ok");
  resolveActionCitation(entry, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(entry.proposition_key, "access_logic");
  assertEquals(entry.citation, REG.access_logic.subsection);
  assertEquals(entry._citation_source, "registry_key");
});

Deno.test("ITEM 422-C D1 (SO-FT-1): a MIS-KEYED assignment with unambiguous rival support is RE-KEYED", () => {
  // The pilot's rank 3 and rank 6 shapes. Under item422c these took the
  // honest downgrade because no rival proposition carried a verified row;
  // SO-FT-1 supplied corpus rows for § 7222(g) and § 7222(f), so the
  // content-anchored rival now wins outright and the pinpoint is recovered.
  const secureTx: Record<string, unknown> = {
    rank: 3,
    proposition_key: "access_logic",
    action: "Transmit the access-request response using reasonable security measures.",
  };
  const denial: Record<string, unknown> = {
    rank: 6,
    proposition_key: "access_logic",
    action: "Record the denial basis where a legal conflict prevents disclosure.",
  };
  const expected: Record<string, string> = {
    "3": "access_secure_tx",
    "6": "access_denial",
  };
  for (const e of [secureTx, denial]) {
    assertEquals(validatePropositionAssignment(e, "access_logic").verdict, "mismatch");
    resolveActionCitation(e, ADMT_VERIFIED_AUTHORITIES);
    const want = expected[String(e.rank)];
    assertEquals(e.proposition_key, want);
    assertEquals(e.citation, REG[want].subsection);
    assertEquals(e._mis_keyed_from, "access_logic");
  }
  const report = { priority_actions: [secureTx] };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(diag.crashed, false);
});

Deno.test("ITEM 422-C D1: a MIS-KEYED assignment with NO clear rival still takes the honest downgrade", () => {
  const vague: Record<string, unknown> = {
    rank: 9,
    proposition_key: "access_logic",
    action: "Review the process and confirm the outcome with the responsible owner.",
  };
  assertEquals(validatePropositionAssignment(vague, "access_logic").verdict, "mismatch");
  resolveActionCitation(vague, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(vague.citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(vague.proposition_key, "");
  assertEquals(vague._citation_source, "registry_downgrade_mis_keyed");
  assertEquals(vague._mis_keyed_from, "access_logic");
});

// ── DEFECT 2 — no null citation on any proposition-key state ────────────────

Deno.test("ITEM 422-C D2: no proposition_key state ships a null citation", () => {
  const report = {
    priority_actions: [
      { rank: 1, proposition_key: "human_involvement", action: "Confirm the reviewer can interpret and override the output.", citation: null },
      { rank: 2, proposition_key: "not_a_real_key", action: "Do the thing.", citation: null },
      { rank: 3, proposition_key: "", action: "Do the other thing.", citation: null },
      { rank: 4, action: "No key at all." },
      { rank: 5, proposition_key: "access_logic", citation: "11 CCR § 9999(z)", action: "Model-authored pinpoint." },
    ] as Array<Record<string, unknown>>,
  };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(diag.crashed, false);
  for (const e of report.priority_actions) {
    assert(typeof e.citation === "string" && (e.citation as string).length > 0, `rank ${e.rank} shipped ${e.citation}`);
  }
  // human_involvement DOES resolve — no alias was warranted.
  assertEquals(report.priority_actions[0].citation, REG.human_involvement.subsection);
  // an unknown key takes the downgrade with the key cleared.
  assertEquals(report.priority_actions[1].citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(report.priority_actions[1].proposition_key, "");
  assertEquals(diag.unresolved_key_downgraded >= 1, true);
});

// ── DEFECT 3 — out-of-range citation sweep ──────────────────────────────────

Deno.test("ITEM 422-C D3: the verified range is 7001, 7150-7157, 7200-7222", () => {
  for (const s of [7001, 7150, 7157, 7200, 7222]) assert(isInVerifiedAdmtRange(s));
  for (const s of [7000, 7021, 7149, 7158, 7199, 7223, 7250]) assert(!isInVerifiedAdmtRange(s));
  assert(hasOutOfRangeCitation("Respond within 45 days (11 CCR § 7021(b))."));
  assert(!hasOutOfRangeCitation("See 11 CCR § 7222(b)(2)."));
});

Deno.test("ITEM 422-C D3: deadline_table states the duty and withholds the out-of-range pinpoint", () => {
  const rows = buildDeadlineTable({}, {});
  const timeline = rows.find((r) => r.obligation.includes("access-right response timeline"));
  assert(timeline, "access timeline row present");
  assertEquals(timeline!.compliance_deadline, "Within 45 calendar days of receipt of the request");
  assertEquals(timeline!.subsection, "");
  assertEquals(timeline!.verbatim_quote, "");
  assertEquals(timeline!.information_needed, true);
  assertEquals(timeline!.citation_withheld_reason, "out_of_verified_admt_range");
  // IN-RANGE rows are untouched (the other direction).
  const inRange = rows.filter((r) => r.subsection);
  assert(inRange.length >= 3);
  for (const r of inRange) {
    assert(!hasOutOfRangeCitation(r.subsection), `${r.obligation} → ${r.subsection}`);
    assertEquals(r.information_needed, false);
  }
});

Deno.test("ITEM 422-C D3: the sweep withholds structured pinpoints and neutralizes prose", () => {
  const report: Record<string, unknown> = {
    deadline_table: [
      { obligation: "Access response", compliance_deadline: "45 days", proposition_key: "access_timeline", subsection: "11 CCR § 7021(b)", verbatim_quote: "Businesses shall respond…", information_needed: false },
      { obligation: "Effective date", compliance_deadline: "Jan 1 2027", proposition_key: "scope_deadline", subsection: "11 CCR § 7200(b)", verbatim_quote: "…", information_needed: false },
    ],
    access_gaps: [{ finding: "Response timing is not documented under 11 CCR § 7021(b) today." }],
    determination: { lawfulness: { status: "adequate", citation: "11 CCR § 7222(b)(1)" } },
  };
  const diag = sweepAdmtOutOfRangeCitations(report);
  assertEquals(diag.crashed, false);
  const dt = report.deadline_table as Array<Record<string, unknown>>;
  assertEquals(dt[0].subsection, "");
  assertEquals(dt[0].verbatim_quote, "");
  assertEquals(dt[0].information_needed, true);
  assertEquals(dt[0].citation_withheld_reason, "out_of_verified_admt_range");
  assertEquals(dt[0].obligation, "Access response"); // the duty survives
  // in-range row untouched, byte-identical
  assertEquals(dt[1].subsection, "11 CCR § 7200(b)");
  assertEquals(dt[1].information_needed, false);
  // prose neutralized, machinery untouched
  assert(!hasOutOfRangeCitation(String((report.access_gaps as any)[0].finding)));
  assertEquals((report.determination as any).lawfulness.citation, "11 CCR § 7222(b)(1)");
  assertEquals((report.determination as any).lawfulness.status, "adequate");
  assertEquals(diag.pinpoints_withheld, 1);
  // idempotent
  const again = sweepAdmtOutOfRangeCitations(report);
  assertEquals(again.pinpoints_withheld, 0);
});

Deno.test("ITEM 422-C D3: the swept-surface list is non-empty and includes deadline_table", () => {
  assert(ADMT_SWEPT_CITATION_SURFACES.includes("deadline_table"));
  assert(ADMT_SWEPT_CITATION_SURFACES.length >= 20);
});
