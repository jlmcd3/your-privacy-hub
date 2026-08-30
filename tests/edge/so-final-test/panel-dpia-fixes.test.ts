// PANEL FIX BATCH 3 (2026-08-30) — DPIA defects from the expert-panel review
// (doc 108), each verified against the published sample before fixing:
//   DPIA-P1  quote-then-deny: the necessity branch asserted the record
//            "records no alternative means" while the document quoted the
//            company's own necessity narrative naming them, and blocked
//            sign-off on that denial;
//   DPIA-P2  appendix-reverses-body: the ToA matrix's DESCRIPTIVE rows fired
//            "The Company has provided the necessary information" on table
//            row COUNT, even when the rows were open asks;
//   DPIA-P3  a zero-flows record with a processor marked "(CH)" asserted
//            "No cross-border transfer is on the record".

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNecessityFindings, buildSection2Coverage, buildProcessingInventory } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

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
    "OrthoMosaic Alpine SA (CH) photogrammetry processing",
  ],
  transfer_flows: [],
};

Deno.test("DPIA-P1: an empty alternatives list with a necessity narrative never denies that alternatives were considered", () => {
  const findings = buildNecessityFindings(BASE as never);
  const f = findings[0] as unknown as Bag;
  assertEquals(f.verdict, "undetermined_on_the_record");
  assert(!String(f.why).includes("records no alternative means"), "denied material the document quotes");
  assertStringIncludes(String(f.why), "the company's necessity narrative is quoted in this assessment");
  assertStringIncludes(String(f.why), "itemised form");
});

Deno.test("DPIA-P1: with NO narrative anywhere, the original no-alternatives sentence is byte-unchanged", () => {
  const findings = buildNecessityFindings({ ...BASE, necessity_proportionality: "" } as never);
  const f = findings[0] as unknown as Bag;
  assertStringIncludes(String(f.why), "records no alternative means that were considered and rejected");
});

Deno.test("DPIA-P3: a zero-flows record with a (CH)-marked processor degrades instead of asserting no transfer", () => {
  const inv = buildProcessingInventory(BASE as never);
  const cov = buildSection2Coverage(BASE as never, { processing_inventory: inv } as never) as unknown as Bag;
  const transfers = cov.transfers as Array<Bag>;
  assertEquals(transfers.length, 1);
  const t = transfers[0];
  assertEquals(t.status, "record_insufficient");
  assert(!String(t.finding).startsWith("No cross-border transfer is on the record"));
  assertStringIncludes(String(t.finding), "OrthoMosaic Alpine SA (CH)");
  assertStringIncludes(String(t.finding), "not resolved on the record");
  assertStringIncludes(String(t.information_needed ?? ""), "OrthoMosaic Alpine SA (CH)");
  assertEquals(t.ask_class, "ask_transfer_leg_unresolved");
});

Deno.test("DPIA-P3: EEA-only processor markers keep the clean no-transfer sentinel byte-unchanged", () => {
  const intake = { ...BASE, third_party_processors: ["Glacier Peak Hosting GmbH (DE) cloud storage"] };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "analysed");
  assertStringIncludes(String(t.finding), "No cross-border transfer is on the record for this processing");
});

Deno.test("DPIA-P3: a UK-regime record treats an EEA marker as outside the domestic territory", () => {
  const intake = {
    ...BASE,
    jurisdictions: ["United Kingdom"],
    controller_country: "GB",
    third_party_processors: ["Glacier Peak Hosting GmbH (DE) cloud storage"],
  };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "record_insufficient");
});

Deno.test("DPIA-P2: matrix DESCRIPTIVE sentences follow row status — open asks read 'in part', never 'provided the necessary information'", async () => {
  const mod = await import("../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts");
  // Exercise via the exported helper surface if present; otherwise assert on
  // an assembled matrix from a minimal report.
  const report: Bag = {
    section2_coverage: {
      data_quality: [{ status: "record_insufficient", information_needed: "the measures that keep the data accurate" }],
      measures_article5: [{ status: "analysed" }],
      measures_rights: [{ status: "record_insufficient", information_needed: "how each right is exercised" }],
      data_minimisation_retention: [{ item: "Location data", status: "analysed" }],
      special_category_conditions: [],
      transfers: [],
      measures_dpbd: [],
      measures_security: [],
      processor_contract: {},
    },
    processing_inventory: {
      controllers: [{ status: "record_insufficient", information_needed: "whether a DPO is designated" }],
      processors: [{ status: "analysed" }],
      data_items: [],
      purposes: [],
      secondary_uses: [],
      planning: [],
    },
    legal_basis: [],
  };
  const matrix = (mod as Bag & { buildDpiaFactorMatrix?: unknown });
  // The matrix builder is not exported standalone; assert through the full
  // assembled document instead.
  const doc = (mod as { assembleDpiaSkeletonDocument: (r: unknown, i: unknown) => unknown })
    .assembleDpiaSkeletonDocument(report as never, BASE as never);
  const text = JSON.stringify(doc);
  assert(!text.includes("provided the necessary information for how it keeps this data accurate"),
    "accuracy row overclaimed over an open ask");
  assert(!text.includes("provided the necessary information for how data subjects exercise their rights"),
    "rights row overclaimed over an open ask");
  assert(
    !text.includes("including its data protection officer, its processor engagements"),
    "controller row overclaimed while the DPO point is open",
  );
  assertStringIncludes(text, "in part");
  void matrix;
});
