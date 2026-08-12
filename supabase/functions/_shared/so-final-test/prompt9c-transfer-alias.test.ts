// PROMPT 9C item 1 (CEO-authorised) — transfer-flow alias widening.
//
// The Section-2 coverage reader must produce IDENTICAL rows for the contract
// shape (snake_case: destination_country / recipient / dpf_certified) and the
// UI shape (destination / importer / dpfCertified). Branch logic unchanged;
// only the keys read are widened. Mechanism text corroborates certification
// ONLY where the boolean flags are absent.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProcessingInventory,
  buildSection2Coverage,
  readTransferFlowAliases,
} from "../ltp/dpia-deliverables/build.ts";

function intake(flows: unknown[]): Record<string, unknown> {
  return {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    description: "A scoring model applied at intake.",
    data_categories: ["Contact details"],
    data_subjects: "Patients",
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
    necessity_proportionality: "The scoring is limited to triage and nothing else.",
    retention_period: "24 months",
    third_party_processors: ["Acme Cloud"],
    transfer_flows: flows,
  };
}

function transfers(flows: unknown[]) {
  const i = intake(flows);
  return buildSection2Coverage(i, { processing_inventory: buildProcessingInventory(i) }).transfers;
}

Deno.test("9C: contract-shaped and UI-shaped flows produce identical coverage rows", () => {
  const contractShape = transfers([{
    destination_country: "US",
    recipient: "Acme Cloud Inc.",
    origin_regime: "EU",
    transfer_mechanism: "Standard contractual clauses",
  }]);
  const uiShape = transfers([{
    destination: "US",
    importer: "Acme Cloud Inc.",
    originRegime: "EU",
    mechanism: "Standard contractual clauses",
  }]);
  assertEquals(contractShape, uiShape);
  assertEquals(contractShape[0].destination, "US");
  assertEquals(contractShape[0].importer, "Acme Cloud Inc.");
});

Deno.test("9C: snake_case certification booleans are honoured like the camelCase flags", () => {
  const snake = transfers([{ destination_country: "US", recipient: "Acme Cloud Inc.", dpf_certified: true }]);
  const camel = transfers([{ destination: "US", importer: "Acme Cloud Inc.", dpfCertified: true }]);
  assertEquals(snake, camel);
});

Deno.test("9C: mechanism text corroborates certification only when the booleans are absent", () => {
  const corroborated = readTransferFlowAliases({
    destination_country: "US",
    recipient: "Acme Cloud Inc.",
    transfer_mechanism: "Importer is certified under the EU-U.S. Data Privacy Framework",
  });
  assert(corroborated.dpfCertified);

  const explicitFalse = readTransferFlowAliases({
    destination_country: "US",
    recipient: "Acme Cloud Inc.",
    dpf_certified: false,
    transfer_mechanism: "Importer is certified under the EU-U.S. Data Privacy Framework",
  });
  assertEquals(explicitFalse.dpfCertified, false);

  const uk = readTransferFlowAliases({
    destination_country: "US",
    transfer_mechanism: "DPF with the UK Extension",
  });
  assert(uk.dpfCertified);
  assert(uk.ukExtensionCertified);
});

Deno.test("9C: recipient/importer_entity aliases both fill the importer field", () => {
  assertEquals(readTransferFlowAliases({ recipient: "Acme" }).importer, "Acme");
  assertEquals(readTransferFlowAliases({ importer_entity: "Acme" }).importer, "Acme");
  assertEquals(readTransferFlowAliases({ importerEntity: "Acme" }).importer, "Acme");
});
