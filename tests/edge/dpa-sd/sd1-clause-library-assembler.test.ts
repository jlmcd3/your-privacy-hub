// S-D1 (doc 80, 2026-08-27) — the DPA clause library + deterministic
// assembler, dark behind DPA_DETERMINISTIC_ENABLED (default false).
// The Commission Art. 28 SCC pattern: fixed operative clauses, variability
// confined to slots and annexes; byte-deterministic; completeness CI-checked
// against the grader's section contract and the S-D3 required-terms list.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpaDocument,
  checkDpaCompleteness,
  type DpaAssembleInput,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { DPA_DETERMINISTIC_MODES } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts";
import { DPA_US_REQUIRED_TERMS } from "../../../supabase/functions/generate-dpa/_local/registry/dpa-us-required-terms.ts";
import { DPA_REQUIRED_SECTIONS } from "../../../supabase/functions/_shared/grader/format-checks.ts";

const BASE: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Acme GmbH",
  controllerJurisdiction: "Germany",
  processorName: "CloudOps GmbH",
  processorJurisdiction: "Germany",
  services: "cloud hosting and managed backups for the Controller's ERP system",
  dataCategories: ["General personal data", "Employee / HR data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: true,
  subProcessorList: "Hetzner Online GmbH; AWS EMEA SARL",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest", "mfa"],
  securityMeasuresDetails: "AES-256; FIDO2 keys for admins",
  californiaEngaged: false,
};

Deno.test("S-D1 — assembly is byte-deterministic", () => {
  assertEquals(assembleDpaDocument(BASE).document_text, assembleDpaDocument(BASE).document_text);
});

Deno.test("S-D1 — the grader's ten required sections are all present and completeness passes", () => {
  const doc = assembleDpaDocument(BASE);
  assertEquals(checkDpaCompleteness(doc), []);
  const text = doc.document_text.toLowerCase();
  for (const r of DPA_REQUIRED_SECTIONS) {
    assert(text.includes(r.toLowerCase().split(" ")[0].toLowerCase()), `missing: ${r}`);
  }
});

Deno.test("S-D1 — every Art. 28(3) limb is drafted: (a) instructions through (h) audits", () => {
  const t = assembleDpaDocument(BASE).document_text;
  for (const needle of [
    "only on documented instructions",
    "committed themselves to confidentiality",
    "all measures required pursuant to Article 32",
    "conditions referred to in Article 28(2) and 28(4)",
    "fulfilment of the Controller's obligation to respond to requests",
    "Articles 32 to 36",
    "delete or return all the Personal Data",
    "demonstrate compliance with the obligations laid down in Article 28",
  ]) assertStringIncludes(t, needle);
});

Deno.test("S-D1 — customer TOMs render verbatim in Annex C; empty TOMs leave an honest framework", () => {
  const withToms = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(withToms, "Encryption of personal data at rest");
  assertStringIncludes(withToms, "AES-256; FIDO2 keys for admins");
  const without = assembleDpaDocument({ ...BASE, securityMeasuresSelected: [], securityMeasuresDetails: "" }).document_text;
  assertStringIncludes(without, "a bare restatement of the statutory standard does not satisfy Article 28(3)(c)");
});

Deno.test("S-D1 — the S-D7 authorisation model branches; no-subprocessors gets the specific-only regime", () => {
  const general = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(general, "General authorisation");
  assertStringIncludes(general, "at least 30 days before");
  assertStringIncludes(general, "object within [15] days");
  const specific = assembleDpaDocument({ ...BASE, subprocessorAuthorizationModel: "specific" }).document_text;
  assertStringIncludes(specific, "prior specific written authorisation");
  assert(!specific.includes("General authorisation"));
  const none = assembleDpaDocument({ ...BASE, hasSubProcessors: false, subProcessorList: "" }).document_text;
  assertStringIncludes(none, "No Sub-processors are engaged as of the Effective Date");
  assertStringIncludes(none, "None engaged as of the Effective Date.");
});

Deno.test("S-D1 — engaged-California us-state mode carries every S-D3 required term", () => {
  const doc = assembleDpaDocument({
    ...BASE,
    documentType: "us-state",
    controllerJurisdiction: "California",
    californiaEngaged: true,
  });
  const t = doc.document_text;
  assertStringIncludes(t, "PROHIBITED PROCESSING AND CCPA REQUIRED TERMS");
  // Map each checklist item to clause substance.
  const CHECK: Record<string, string> = {
    "100d1_limited_purposes": "limited and specified purposes",
    "100d2_same_protection": "same level of privacy protection",
    "100d3_oversight_rights": "reasonable and appropriate steps",
    "100d4_notify_cannot_comply": "no longer meet its obligations",
    "100d5_stop_remediate": "stop and remediate",
    "7051a1_no_sell_share": "shall not sell and shall not share",
    "7051a2_specific_purposes": "specific business purposes set out in Annex B",
    "7051a3_no_other_purpose": "any purpose other than the specific business purposes",
    "7051a4_no_commercial_purpose": "commercial purpose other than",
    "7051a5_direct_relationship": "outside the direct business relationship",
    "7051a6_compliance_security": "reasonable security procedures and practices",
    "7051a7_audit_rights": "at least once every [12] months",
    "7051a8_notify_cannot_comply": "can no longer meet its obligations",
    "7051a9_stop_remediate_delete": "documentation verifying deletion",
    "7051a10_consumer_requests": "enable the Controller to comply with consumer requests",
  };
  for (const term of DPA_US_REQUIRED_TERMS) {
    const needle = CHECK[term.id];
    assert(needle, `no mapping for ${term.id}`);
    assertStringIncludes(t, needle);
  }
});

Deno.test("S-D1 — transfers: none / mechanism-outstanding / recorded-mechanism all draft honestly", () => {
  const none = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(none, "no transfer of Personal Data across the recorded jurisdictions");
  const outstanding = assembleDpaDocument({ ...BASE, includeTransferClause: true, transferMechanism: "None in place yet" }).document_text;
  assertStringIncludes(outstanding, "shall not commence until an appropriate safeguard is executed");
  const scc = assembleDpaDocument({ ...BASE, includeTransferClause: true, transferMechanism: "EU Standard Contractual Clauses (SCCs)" }).document_text;
  assertStringIncludes(scc, "EU Standard Contractual Clauses (SCCs)");
  assertStringIncludes(scc, "executed with each recipient before any transfer to that recipient commences");
});

Deno.test("S-D1 — no unfilled slots survive into any mode's document", () => {
  for (const mode of ["gdpr", "uk", "us-state", "canada", "dual-eu-us", "dual-eu-ca"] as const) {
    const doc = assembleDpaDocument({ ...BASE, documentType: mode, californiaEngaged: mode.includes("us") });
    const problems = checkDpaCompleteness(doc);
    assertEquals(problems, [], `${mode}: ${problems.join("; ")}`);
  }
});

Deno.test("DOC-81 D-1 — the deterministic mode gate covers the GDPR family plus us-state", () => {
  assertEquals([...DPA_DETERMINISTIC_MODES].sort(), ["dual-eu-ca", "dual-eu-us", "gdpr", "uk", "us-state"]);
  assert(!(DPA_DETERMINISTIC_MODES as readonly string[]).includes("canada"));
});

Deno.test("DOC-81 D-2 — UK mode substitutes domestic law for Union or Member State law", () => {
  const t = assembleDpaDocument({ ...BASE, documentType: "uk" }).document_text;
  assertStringIncludes(t, "unless required to do so by domestic law");
  assertStringIncludes(t, "other domestic data protection provisions");
  assert(!/Union or Member State/.test(t));
});

Deno.test("S-D1 — the flag defaults false and the index branch exists (model path untouched otherwise)", () => {
  const src = Deno.readTextFileSync(new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url));
  assertStringIncludes(src, 'Deno.env.get("DPA_DETERMINISTIC_ENABLED") ?? "false"');
  assertStringIncludes(src, "if (dpaDeterministicPath) {");
  assertStringIncludes(src, "assembleDpaDocument({");
});

Deno.test("DOC-81 A-2 — the deterministic path fails loud on a hard lint violation, never falls back to a model call", () => {
  const src = Deno.readTextFileSync(new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url));
  assertStringIncludes(src, "if (dpaDeterministicPath && hasHardViolations(lint)) {");
  assertStringIncludes(src, "deterministic_dpa_lint:");
});
