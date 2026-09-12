// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on two real DPIA defects.
//
// DPIA5-02 — the zero-transfer-flows sentinel scanned processor NAMES for a
// foreign-country marker (PANEL DPIA-P3), but never scanned
// processor_obligations text for a named transfer mechanism (SCCs, IDTA,
// BCRs), so a record whose processor obligations literally named "Standard
// Contractual Clauses in place for any UK transfers" still asserted "No
// cross-border transfer is on the record" — a customer-visible, grader-
// confirmed contradiction.
// DPIA5-05 — the Matters Outstanding ledger's risk-register rows named only
// "the remaining risk level for {risk}", never that the item was one of the
// ones the Art. 36(1) prior-consultation paragraph above actually turns on.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildProcessingInventory, buildSection2Coverage, buildGapLedgerDetailed } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

type Bag = Record<string, unknown>;

const BASE: Bag = {
  organization_name: "Really, Really North Gold Possibilities GmbH",
  controller_country: "DE",
  jurisdictions: ["EU"],
  purpose: "To produce ortho-rectified visual mosaics used to identify drill-target prospects",
  processing_activity_name: "Drone-based geological survey imagery capture",
  necessity_proportionality:
    "The blurring pipeline plus 30-day raw-frame deletion is the least-intrusive means; alternatives (ground surveys, satellite imagery at lower resolution) were considered and rejected as insufficient for drill-target identification",
  data_categories: ["Location data"],
  data_subjects: "residents along access roads",
  legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
  third_party_processors: [
    "Glacier Peak Hosting GmbH (DE) cloud storage",
    "Northwind Cloud EMEA Ltd (IE) infrastructure",
  ],
  transfer_flows: [],
};

Deno.test("DPIA5-02 — processor obligations naming Standard Contractual Clauses degrade the no-transfer sentinel instead of asserting it", () => {
  const intake = {
    ...BASE,
    processor_obligations: "Northwind Cloud EMEA Ltd: infrastructure processing only; Standard Contractual Clauses in place for any UK transfers.",
  };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "record_insufficient");
  assert(!String(t.finding).startsWith("No cross-border transfer is on the record"), "must not assert no-transfer alongside its own contradicting SCC language");
  assertStringIncludes(String(t.finding), "processor obligations name a set of Standard Contractual Clauses");
  assertStringIncludes(String(t.information_needed ?? ""), "set of Standard Contractual Clauses");
  assertEquals(t.ask_class, "ask_transfer_leg_unresolved");
});

Deno.test("DPIA5-02 — no country marker and no named mechanism keeps the clean no-transfer sentinel byte-unchanged (no regression)", () => {
  const intake = { ...BASE, processor_obligations: "Glacier Peak Hosting GmbH: CDN and storage only, no sub-processing." };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "analysed");
  assertStringIncludes(String(t.finding), "No cross-border transfer is on the record for this processing");
});

// ── DPIA5-05: the ledger names which risk(s) control Art. 36(1) ──────────

function riskRow(over: Bag): Bag {
  return {
    risk_id: "r1", risk_label: "Test risk", source: "", affected_rights: "",
    likelihood: "Possible", severity: "Moderate", inherent_band: "moderate", measures: [],
    residual_band: "moderate", citation: "", authority_verbatim: "", status: "analysed",
    ...over,
  };
}

Deno.test("DPIA5-05 — a risk-register gap that drives Art. 36(1) is named as such in the ledger's 'enables' text", () => {
  const risk = riskRow({
    risk_id: "r8_automated_significant_effect", risk_label: "Automated evaluation producing legal or similarly significant effects",
    residual_band: "high", information_needed: "the Art. 22(3) human-intervention measure",
  });
  const result = buildGapLedgerDetailed({} as never, {
    necessity_findings: [], proportionality: [], legal_basis: [],
    risk_register: [risk] as never,
    art36_consultation: { determination: "consultation_required" } as never,
    decision: { blockers: [] } as never,
  } as never);
  const row = result.gap_ledger.find((r) => String(r.dimensions).includes("Art. 22(3)"));
  assert(row, "expected the risk gap row in the ledger");
  assertStringIncludes(String(row!.enables), "Art. 36(1) prior-consultation determination above turns on");
});

Deno.test("DPIA5-05 — a risk-register gap that does NOT drive Art. 36(1) keeps the plain 'enables' text (no regression)", () => {
  const risk = riskRow({
    risk_id: "r6_processor_chain", risk_label: "Loss of control over the data in the processor chain",
    residual_band: "low", information_needed: "the DPA execution date",
  });
  const result = buildGapLedgerDetailed({} as never, {
    necessity_findings: [], proportionality: [], legal_basis: [],
    risk_register: [risk] as never,
    art36_consultation: { determination: "consultation_not_required" } as never,
    decision: { blockers: [] } as never,
  } as never);
  const row = result.gap_ledger.find((r) => String(r.dimensions).includes("DPA execution date"));
  assert(row, "expected the risk gap row in the ledger");
  assertEquals(row!.enables, "the remaining risk level for Loss of control over the data in the processor chain");
});
