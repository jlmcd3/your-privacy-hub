// DOC 138 (2026-09-02) — Chapter V remediation item doesn't name the three
// tools already identified elsewhere in the same document.
//
// Root cause: buildTransferAnalysis() (governance-deliverables/build.ts)
// computes the Section 4 narrative's "The tools the company has recorded in
// use are X, Y, Z." sentence (the D1D2B3B8-G3 `recordedTools` block) AFTER
// the verdict/information_needed switch that produces Remediation Item 1's
// text ("The executed instrument for each transfer leg ... The record names
// the mechanism type but not the executed document"). The remediation
// sentence never had access to the tool names the SAME function already
// computes a few lines below it, so a live document could name three
// transfer-implicated tools in Section 4's prose while Remediation Item 1 —
// generated from the same finding, a few paragraphs later in the same
// document — asked the reader to "supply the executed instrument for each
// transfer leg" without saying which leg.
//
// Fix: hoist the `recordedTools` computation above the verdict switch and
// thread it into the "mechanism recorded, regime coherent" information_needed
// branch (the only branch this bug report concerns), reusing the exact same
// `.join(", ")` formatting Section 4 already uses. Only applies when the
// record actually names tools; an unnamed-tools record is unaffected.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildTransferAnalysis } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

// Mirrors the `rich` fixture shape in upgrade5.test.ts: EU jurisdiction only,
// a restricted transfer recorded, and an EU SCC mechanism recorded (matching
// regime, so no mismatch branch) — the exact fact pattern that lands in the
// "executed instrument" else-branch this fix targets.
function baseIntake(): Record<string, unknown> {
  return {
    organization_name: "Northbridge Analytics Ltd",
    jurisdictions: ["EU (GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  };
}

Deno.test("DOC 138 — a record with named transfer tools gets them named in the remediation item", () => {
  const intake = {
    ...baseIntake(),
    tools: ["Microsoft 365 / Copilot", "Shopify Plus", "ShipHero WMS"],
  };
  const transfer = buildTransferAnalysis(intake);
  assertEquals(transfer.verdict, "partially_satisfied");
  assert(transfer.information_needed, "expected an information_needed remediation string");
  assertStringIncludes(
    transfer.information_needed!,
    "Microsoft 365 / Copilot, Shopify Plus, ShipHero WMS",
  );
  assertStringIncludes(transfer.information_needed!, "The executed instrument for each transfer leg");
  assertStringIncludes(
    transfer.information_needed!,
    "The record names the mechanism type but not the executed document",
  );
});

Deno.test("DOC 138 — a record with no transfer tools recorded keeps the prior generic phrasing, unchanged", () => {
  const intake = baseIntake(); // no `tools` field at all
  const transfer = buildTransferAnalysis(intake);
  assertEquals(transfer.verdict, "partially_satisfied");
  assertEquals(
    transfer.information_needed,
    "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment; for an EU leg, the Commission clause set and its transfer impact assessment. The record names the mechanism type but not the executed document, so the leg cannot be closed as satisfied.",
  );
});

Deno.test("DOC 138 — an empty tools array also falls back to the generic phrasing", () => {
  const intake = { ...baseIntake(), tools: [] };
  const transfer = buildTransferAnalysis(intake);
  assertEquals(
    transfer.information_needed,
    "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment; for an EU leg, the Commission clause set and its transfer impact assessment. The record names the mechanism type but not the executed document, so the leg cannot be closed as satisfied.",
  );
});
