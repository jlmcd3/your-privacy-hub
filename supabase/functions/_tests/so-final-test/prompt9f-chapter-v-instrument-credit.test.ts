// PROMPT 9F item 1 — credit-first Art. 46 instrument recognition.
// Fixtures land VERBATIM from batch 87c5b390 (run #187),
// quality_runs.partial_state.intakeGen.rejected.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProcessingInventory,
  buildSection2Coverage,
  readChapterVInstrumentCredit,
} from "../ltp/dpia-deliverables/build.ts";

// ── run 187 retry, flow 1 transfer_mechanism (VERBATIM) ─────────────────────
const RUN187_FLOW1_MECHANISM =
  "UK International Data Transfer Agreement (IDTA) — addendum to the DataRobot Master Services Agreement countersigned by both parties on 2024-11-14 (reference VIG-IDTA-2024-11). DataRobot Inc holds active certification under the UK Extension to the EU-US Data Privacy Framework as of 2025-02-07 (certification ID DPF-UK-DR-20250207). A Transfer Risk Assessment (TRA) specific to this flow was completed by Anna Whitfield at Pinsent Masons on 2024-11-10 (ref PM/VIG/2024/TRA-01); the TRA concluded that the combination of IDTA contractual protections, DataRobot's UK Extension certification, and the pseudonymised nature of the weekly behaviour matrices transmitted reduces residual transfer risk to a level Vanthorpe assessed as tolerable. The TRA is held in OneTrust workspace VIG-DPIA-2025-003 and is scheduled for annual review by Siobhan Kehoe no later than 2025-11-14.";

// ── must-NOT-credit texts (run 187 flows 2 and 4, plus the CEO's planned-TRA)
const RUN187_FLOW2_MECHANISM =
  "No transfer mechanism documented. Reinsurance treaty in place but no GDPR Art. 46 or UK GDPR Schedule 21 mechanism identified. This is an open gap.";
const RUN187_FLOW4_MECHANISM =
  "UK IDTA addendum to Guidewire Master Subscription Agreement; however, the MSA was last updated in 2022 and has not been re-papered to reference the 2022 IDTA template — gap noted by Siobhan Kehoe.";
const RUN187_FLOW4_NOTES =
  "PolicyCenter SaaS instance is hosted in AWS EU-West-2 (London) under a data residency commitment; US parent access for support purposes triggers a transfer requiring mechanism. Mechanism validity is uncertain pending re-papering.";
const PLANNED_TRA =
  "Standard Contractual Clauses executed on 2024-03-02. TRA is planned for next quarter.";

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Vanthorpe Insurance Ltd",
    processing_activity_name: "Motor policy underwriting",
    purpose: "To price and underwrite personal motor policies.",
    description: "Applications are scored at quotation.",
    data_categories: ["Contact details"],
    data_subjects: "Individual consumers applying for Vanthorpe personal motor policies",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    legal_basis_proposed: "Contract (Art. 6(1)(b))",
    necessity_proportionality: "Limited to underwriting.",
    retention_period: "24 months",
    transfer_flows: [],
    ...over,
  };
}

function transfers(over: Record<string, unknown>) {
  const i = intake(over);
  return buildSection2Coverage(i, { processing_inventory: buildProcessingInventory(i) }).transfers;
}

// Destination BR carries no adequacy in either regime, so the base
// determination is chapter_v_mechanism_required and the credit is the only
// path off the ask.
const flow = (mechanism: string, notes = "", over: Record<string, unknown> = {}) => ({
  destination_country: "BR",
  recipient: "DataRobot Inc (US parent entity)",
  transfer_mechanism: mechanism,
  ...(notes ? { notes } : {}),
  ...over,
});

Deno.test("9F: must-credit fixture (run-187 retry flow 1, verbatim) → instrument_recorded, no ask", () => {
  const t = transfers({ transfer_flows: [flow(RUN187_FLOW1_MECHANISM)] })[0];
  assertEquals(t.determination, "instrument_recorded");
  assertEquals(t.status, "analysed");
  assertEquals(t.information_needed, undefined);
  assertEquals(t.ask_class, undefined);
  assertStringIncludes(t.finding, "the company records an executed IDTA and a completed transfer risk assessment");
  assertStringIncludes(t.finding, "has not reviewed the instrument itself.");
  assertStringIncludes(t.finding, "countersigned by both parties on 2024-11-14");
});

Deno.test("9F: detector credits the run-187 retry mechanism text with the IDTA label", () => {
  const c = readChapterVInstrumentCredit(RUN187_FLOW1_MECHANISM);
  assert(c.credited);
  assertEquals(c.instrumentLabel, "IDTA");
  assert(c.verbatim.length > 0 && c.verbatim.length <= 301);
});

for (
  const [name, mech, notes] of [
    ["run-187 flow 2 (no mechanism documented, open gap)", RUN187_FLOW2_MECHANISM, ""],
    ["run-187 flow 4 (IDTA not re-papered, gap noted)", RUN187_FLOW4_MECHANISM, RUN187_FLOW4_NOTES],
    ["planned TRA", PLANNED_TRA, ""],
  ] as [string, string, string][]
) {
  Deno.test(`9F: must-NOT-credit — ${name} keeps the Chapter V ask unchanged`, () => {
    const t = transfers({ transfer_flows: [flow(mech, notes)] })[0];
    assertEquals(t.determination, "chapter_v_mechanism_required");
    assertEquals(t.status, "record_insufficient");
    assertEquals(t.ask_class, "ask_transfer_mechanism");
    assertStringIncludes(
      t.information_needed ?? "",
      "which Chapter V instrument is executed for the flow to BR, the date it was signed, and the transfer risk assessment supporting it",
    );
  });
}

Deno.test("9F: negation forms never credit (no IDTA in place / mechanism validity is uncertain)", () => {
  assertEquals(readChapterVInstrumentCredit("There is no IDTA in place. TRA completed on 2024-01-01.").credited, false);
  assertEquals(readChapterVInstrumentCredit("Mechanism validity is uncertain.").credited, false);
  assertEquals(
    readChapterVInstrumentCredit("IDTA has not been re-papered since 2022; TRA on file ref X.").credited,
    false,
  );
});

Deno.test("9F: instrument without an execution date keeps the ask", () => {
  const t = transfers({
    transfer_flows: [flow("IDTA in force with the importer. Transfer Risk Assessment completed, ref PM/VIG/2024/TRA-01.")],
  })[0];
  assertEquals(t.determination, "chapter_v_mechanism_required");
  assertEquals(t.ask_class, "ask_transfer_mechanism");
});

Deno.test("9F: instrument and date without a completed TRA keeps the ask", () => {
  const t = transfers({
    transfer_flows: [flow("IDTA addendum countersigned by both parties on 2024-11-14 (reference VIG-IDTA-2024-11).")],
  })[0];
  assertEquals(t.determination, "chapter_v_mechanism_required");
  assertEquals(t.ask_class, "ask_transfer_mechanism");
});

Deno.test("9F: determination is reachable in both regimes", () => {
  const uk = transfers({ transfer_flows: [flow(RUN187_FLOW1_MECHANISM)] })[0];
  assertEquals(uk.origin_regime, "UK");
  assertEquals(uk.determination, "instrument_recorded");
  const eu = transfers({
    jurisdictions: ["EU (GDPR)"],
    transfer_flows: [flow(RUN187_FLOW1_MECHANISM)],
  })[0];
  assertEquals(eu.origin_regime, "EU");
  assertEquals(eu.determination, "instrument_recorded");
});

Deno.test("9F: redaction — removing the TRA sentence moves the row back to the ask, never the reverse", () => {
  const withoutTra = RUN187_FLOW1_MECHANISM.split(" A Transfer Risk Assessment")[0];
  assert(!withoutTra.includes("Transfer Risk Assessment"));
  const t = transfers({ transfer_flows: [flow(withoutTra)] })[0];
  assertEquals(t.determination, "chapter_v_mechanism_required");
  assertEquals(t.ask_class, "ask_transfer_mechanism");
  const back = transfers({ transfer_flows: [flow(RUN187_FLOW1_MECHANISM)] })[0];
  assertEquals(back.determination, "instrument_recorded");
});

Deno.test("9F: idempotence — repeated builds produce byte-identical rows", () => {
  const a = transfers({ transfer_flows: [flow(RUN187_FLOW1_MECHANISM)] });
  const b = transfers({ transfer_flows: [flow(RUN187_FLOW1_MECHANISM)] });
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  assertEquals(
    JSON.stringify(readChapterVInstrumentCredit(RUN187_FLOW1_MECHANISM)),
    JSON.stringify(readChapterVInstrumentCredit(RUN187_FLOW1_MECHANISM)),
  );
});

Deno.test("9F: credit never applies to intra-EEA or UK-domestic rows", () => {
  const domestic = transfers({
    transfer_flows: [{ ...flow(RUN187_FLOW1_MECHANISM), destination_country: "GB" }],
  })[0];
  assertEquals(domestic.determination, "uk_domestic_processing");
  const intra = transfers({
    jurisdictions: ["EU (GDPR)"],
    transfer_flows: [{ ...flow(RUN187_FLOW1_MECHANISM), destination_country: "DE" }],
  })[0];
  assertEquals(intra.determination, "intra_eea_processing");
});
