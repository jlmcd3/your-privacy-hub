// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on one real DPA defect.
//
// DPA6-02 — the "Sensitive Data" definition (dpa-v2-supplement.ts) named
// "the GDPR or UK GDPR" unconditionally, even in us-state mode where no
// GDPR-family framework is in scope. The neighboring "Applicable Data
// Protection Law" clause a few lines above already gates its own
// GDPR-specific text on the same `gdprCore` flag; this clause did not.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";

const BASE: DpaAssembleInput = {
  documentType: "us-state",
  controllerName: "Velorix Media Corp.",
  controllerJurisdiction: "Delaware",
  processorName: "ContextStream Inc.",
  processorJurisdiction: "California",
  services: "programmatic ad delivery",
  dataCategories: ["General personal data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: false,
  subProcessorList: "",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: [],
  securityMeasuresDetails: "",
  californiaEngaged: true,
};

// ── DPA6-02 ──────────────────────────────────────────────────────────────

Deno.test("DPA6-02 — us-state mode's Sensitive Data definition no longer names the GDPR or UK GDPR", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, '(Sensitive Data.) "Sensitive Data" means Personal Data subject to heightened protection under Applicable Data Protection Law, including sensitive data or sensitive personal information where U.S. state law applies.');
  assert(!t.includes("GDPR or UK GDPR"), "us-state mode must not name a GDPR-family framework it is not in scope");
});

Deno.test("DPA6-02 — gdpr mode's Sensitive Data definition still names the GDPR or UK GDPR", () => {
  const t = assembleDpaDocument({
    ...BASE,
    documentType: "gdpr",
    controllerJurisdiction: "Ireland",
    processorJurisdiction: "Germany",
  }).document_text;
  assertStringIncludes(
    t,
    '(Sensitive Data.) "Sensitive Data" means Personal Data subject to heightened protection under Applicable Data Protection Law, including special categories of personal data where the GDPR or UK GDPR applies and sensitive data or sensitive personal information where U.S. state law applies.',
  );
});
