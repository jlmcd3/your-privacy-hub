// PROMPT 8E items 5 & 6 (CEO-ratified 2026-08-12).
//
// Item 5 — r5_third_country_transfer is regime-aware: it fires only where a
// recorded flow LEAVES the origin regime. Intra-EEA flows are processing, not
// transfers (evidence: run 8996eafc doc 3).
// Item 6 — the ToA legal-basis anchor carries the regime prefix under UK, so it
// no longer reads as a bare "GDPR Art. 6(1)(f)" beside "UK GDPR …" siblings
// (evidence: run 8996eafc doc 2).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  buildRiskRegister,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BASE = {
  organization_name: "Helvetia Clinical",
  processing_activity_name: "Patient triage",
  purpose: "Triage of incoming patient referrals so clinicians see urgent cases first.",
  necessity_proportionality:
    "The processing is limited to the referral fields clinicians need to triage, and no less intrusive route achieves the same outcome.",
  data_categories: ["Health or medical data"],
  retention_period: "24 months",
  existing_safeguards: ["Encryption at rest", "Access controls"],
  legal_basis_proposed: "Legitimate interests",
};

const hasR5 = (register: readonly { risk_id: string }[]) =>
  register.some((r) => r.risk_id === "r5_third_country_transfer");

Deno.test("item 5 — doc-3 shape: intra-EEA flows only, r5 does not fire", () => {
  const register = buildRiskRegister({
    ...BASE,
    jurisdictions: ["EU (GDPR)"],
    transfer_flows: [
      { destination_country: "DE", mechanism: "Intra-EEA — no third-country transfer" },
      { destination_country: "NL", mechanism: "Intra-EEA — no third-country transfer" },
    ],
  });
  assertEquals(hasR5(register), false, JSON.stringify(register.map((r) => r.risk_id)));
});

Deno.test("item 5 — doc-5 shape: a US flow leaves the EEA, r5 fires", () => {
  const register = buildRiskRegister({
    ...BASE,
    jurisdictions: ["EU (GDPR)"],
    transfer_flows: [
      { destination_country: "DE", mechanism: "Intra-EEA" },
      { destination_country: "US", mechanism: "Salesforce — SCCs" },
    ],
  });
  assert(hasR5(register), JSON.stringify(register.map((r) => r.risk_id)));
});

Deno.test("item 5 — UK regime: a US flow leaves the United Kingdom, r5 fires", () => {
  const register = buildRiskRegister({
    ...BASE,
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_flows: [{ destination_country: "US", mechanism: "UK IDTA" }],
  });
  assert(hasR5(register), JSON.stringify(register.map((r) => r.risk_id)));
});

Deno.test("item 5 — UK regime: a UK-only flow does not fire r5", () => {
  const register = buildRiskRegister({
    ...BASE,
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_flows: [{ destination_country: "GB", mechanism: "Domestic only" }],
  });
  assertEquals(hasR5(register), false);
});

Deno.test("item 6 — the UK legal-basis anchor carries the UK GDPR prefix", () => {
  const findings = buildLegalBasis({ ...BASE, jurisdictions: ["United Kingdom (UK GDPR)"] });
  const cites = findings.map((f) => f.citation).join(" | ");
  assert(cites.includes("UK GDPR Art. 6(1)(f)"), cites);
  assertEquals(/(?<!UK )GDPR Art\. 6\(1\)\(f\)/.test(cites), false, cites);
});

Deno.test("item 6 — the EU anchor is untouched", () => {
  const findings = buildLegalBasis({ ...BASE, jurisdictions: ["EU (GDPR)"] });
  const cites = findings.map((f) => f.citation).join(" | ");
  assert(cites.includes("GDPR Art. 6(1)(f)"), cites);
  assertEquals(cites.includes("UK GDPR"), false, cites);
});
