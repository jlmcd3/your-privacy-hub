// PROMPT 9E — GB/UK normalization, record-regime flow origin, 6(1)(b)
// party-lexicon widening, and the 9D impact-lexicon tightening.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  buildProcessingInventory,
  buildSection2Coverage,
  hasImpactLanguage,
  readTransferFlowAliases,
} from "../ltp/dpia-deliverables/build.ts";
import { canonicalDestinationCode, transferMechanism } from "../dpia-jurisdiction-registry.ts";

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Vanthorpe Insurance Ltd",
    processing_activity_name: "Motor policy underwriting",
    purpose: "To price and underwrite personal motor policies.",
    description: "Applications are scored at quotation.",
    data_categories: ["Contact details"],
    data_subjects: "Individual consumers (adults aged 18+) applying for Vanthorpe personal motor or home insurance products",
    jurisdictions: ["EU (GDPR)"],
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

// ---- Item 1 ----------------------------------------------------------------
Deno.test("9E item 1: GB/UK/GBR canonicalise to one internal key", () => {
  assertEquals(canonicalDestinationCode("GB"), "UK");
  assertEquals(canonicalDestinationCode("gbr"), "UK");
  assertEquals(canonicalDestinationCode("UK"), "UK");
  assertEquals(canonicalDestinationCode("US"), "US");
});

Deno.test("9E item 1: EU-origin flow to GB is an adequacy determination with no ask", () => {
  const t = transfers({
    transfer_flows: [{ destination_country: "GB", recipient: "Nottingham Ops Ltd", origin_regime: "EU" }],
  })[0];
  assertEquals(t.determination, "adequacy");
  assertEquals(t.status, "analysed");
  assert(t.registry_verified_on.length > 0);
});

Deno.test("9E item 1: UK-regime record, no originRegime, destination GB → domestic processing", () => {
  const t = transfers({
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_flows: [{ destination_country: "GB", recipient: "Nottingham Ops Ltd" }],
  })[0];
  assertEquals(t.determination, "uk_domestic_processing");
  assertEquals(t.status, "analysed");
  assertStringIncludes(
    t.finding,
    "stays within the United Kingdom. This is domestic processing, not a Chapter V transfer, and the Art. 28 processing contract is the instrument that governs it.",
  );
});

Deno.test("9E item 1: UK-origin to US without the UK extension is IDTA and still asks", () => {
  const m = transferMechanism({ originRegime: "UK", destinationCountry: "US" });
  assertEquals(m.tiaRequired, true);
  const t = transfers({
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_flows: [{ destination_country: "US", recipient: "Acme Cloud Inc." }],
  })[0];
  assertEquals(t.determination, "chapter_v_mechanism_required");
  assertEquals(t.status, "record_insufficient");
});

Deno.test("9E item 1: contract-shape and UI-shape GB flows produce identical rows", () => {
  const a = transfers({ transfer_flows: [{ destination_country: "GB", recipient: "Acme", origin_regime: "EU" }] });
  const b = transfers({ transfer_flows: [{ destination: "GB", importer: "Acme", originRegime: "EU" }] });
  assertEquals(a, b);
});

// ---- Item 2 ----------------------------------------------------------------
Deno.test("9E item 2: origin falls back to the record regime, not a hardcoded EU", () => {
  assertEquals(readTransferFlowAliases({ destination_country: "GB" }, "UK").origin, "UK");
  assertEquals(readTransferFlowAliases({ destination_country: "GB" }, "EU").origin, "EU");
  assertEquals(readTransferFlowAliases({ destination_country: "GB", origin_regime: "EU" }, "UK").origin, "EU");
});

// ---- Item 3 ----------------------------------------------------------------
const PARTY_YES = [
  "Individual consumers (adults aged 18+) applying for Vanthorpe personal motor or home insurance products",
  "Prospective policyholders who request a quotation",
  "Borrowers and account holders with an active facility",
  "The insured under each policy",
  "Applications for tenancy submitted through the portal",
];
const PARTY_NO = [
  "individuals whose data is collected from public sources",
  "website visitors tracked by cookies",
];

for (const s of PARTY_YES) {
  Deno.test(`9E item 3: party language met — ${s.slice(0, 40)}`, () => {
    const lb = buildLegalBasis(intake({ data_subjects: s }));
    assertEquals(lb[0].verdict, "basis_supported_on_the_record", `not met: ${s}`);
    assertEquals(lb[0].status, "analysed");
  });
}
for (const s of PARTY_NO) {
  Deno.test(`9E item 3: non-party language NOT met — ${s}`, () => {
    const lb = buildLegalBasis(intake({ data_subjects: s }));
    assertEquals(lb[0].verdict, "undetermined_on_the_record");
    assertEquals(lb[0].status, "record_insufficient");
  });
}

// ---- Item 4 ----------------------------------------------------------------
const MUST_NOT_MATCH = [
  "The system now issues 25,000 automated decisions per month, reducing manual workload and cost to serve.",
  "Over 500,000 customers receive personalised offers through the programme each quarter.",
  "No data is shared with third parties without explicit consent being obtained first.",
  "Customers have a clear opt-out mechanism available at any time in the account settings.",
  "Security teams apply continuous monitoring of access logs to protect the data.",
];
for (const s of MUST_NOT_MATCH) {
  Deno.test(`9E item 4: benefit/safeguard prose is NOT impact — ${s.slice(0, 45)}`, () => {
    assert(!hasImpactLanguage(s), `wrongly recognised: ${s}`);
  });
}
