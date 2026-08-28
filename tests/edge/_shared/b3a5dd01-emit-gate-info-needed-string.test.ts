// B3A5DD01 (quality batch, 2026-08-28) — emit-gate fix (D1D2B3B8-EG1).
//
// ITEM 343/352 fixed this exact clobber for the report-ROOT ARRAY shape of
// `information_needed`. The same clobber survived for a per-FINDING STRING
// shape: `Finding.information_needed?: string` is the near-universal shape
// every product's findings carry (their own specific ask), and whenever the
// emit gate degraded a SIBLING leaf inside that same finding object (e.g.
// its `standard`), `markInformationNeeded` ran with `obj = leaf.parent` =
// the finding itself, saw a non-array existing value, and unconditionally
// overwrote it with the bare boolean `true` — discarding the finding's real
// ask. Live evidence: governance's chapter_v_transfers finding had its
// `standard` degraded and its `information_needed` clobbered from "The
// executed instrument for each transfer leg..." to `true`, which every
// downstream consumer reads as a string and therefore renders as nothing.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";

const DEGRADING_TEXT =
  "Reconcile the record on i1b_min_pi against the intake, since the current position cannot be supported without further evidence collected.";

Deno.test("D1D2B3B8-EG1 — a finding's own non-empty information_needed string survives a sibling leaf's degradation", () => {
  const report: any = {
    domain_element_findings: [
      {
        key: "chapter_v_transfers",
        standard: DEGRADING_TEXT,
        information_needed: "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed.",
      },
    ],
  };
  runEmitGate(report, { tool: "governance", intakeRoster: {} });
  const finding = report.domain_element_findings[0];
  assert(finding.standard.includes("i1b_min_pi") === false, "the degraded leaf itself is still replaced");
  assertEquals(
    typeof finding.information_needed,
    "string",
    "information_needed must remain a string, never clobbered to a boolean",
  );
  assertEquals(
    finding.information_needed,
    "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed.",
  );
});

Deno.test("D1D2B3B8-EG1 — the legacy boolean-flag behavior is unchanged when no prior value exists", () => {
  const report: any = {
    domain_element_findings: [
      { key: "some_finding", standard: DEGRADING_TEXT },
    ],
  };
  runEmitGate(report, { tool: "governance", intakeRoster: {} });
  const finding = report.domain_element_findings[0];
  assertEquals(finding.information_needed, true, "absent prior value still flags true, exactly as before");
});

Deno.test("D1D2B3B8-EG1 — an empty-string prior value still flags true (nothing real to lose)", () => {
  const report: any = {
    domain_element_findings: [
      { key: "some_finding", standard: DEGRADING_TEXT, information_needed: "" },
    ],
  };
  runEmitGate(report, { tool: "governance", intakeRoster: {} });
  const finding = report.domain_element_findings[0];
  assertEquals(finding.information_needed, true);
});

Deno.test("D1D2B3B8-EG1 — the report-root ARRAY shape (ITEM 343/352) is still preserved untouched", () => {
  const report: any = {
    information_needed: [{ id: "customer_row_1", text: "Supply the missing field." }],
    exec_summary: DEGRADING_TEXT,
  };
  runEmitGate(report, { tool: "governance", intakeRoster: {} });
  assertEquals(report.information_needed, [{ id: "customer_row_1", text: "Supply the missing field." }]);
});
