// QA round two (DPA-A-01 / DPA-C01, High, 2026-09-06) — "Subprocessor
// authorization changes".
//
// Customers A and C both selected GENERAL authorisation with 30 days' advance
// notice. Both received clause 5.1 requiring "prior specific written
// authorisation", prefaced by an assertion that no Sub-processors are engaged —
// which neither customer had said, and which the intake never asks. The
// optional clause 20.6 then cross-referenced a 30-day notice that section 5 no
// longer contained.
//
// Cause: DPAGenerator initialises `hasSubProcessors: false` and NO question
// ever sets it, so the no-Sub-processor branch fired on every record and
// silently overrode the one Art. 28(2) answer the intake does collect.
// (Customer B looked correct only because B chose "specific", which happens to
// read the same.) `subProcessorInventoryCollected: false` now separates "the
// record says none" from "nobody asked".
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpaDocument,
  type DpaAssembleInput,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { subprocessorAuthorisationClause } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts";
import { neutralSubprocessorAuthorisationClause } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-v2-supplement.ts";

/** Customer A's record: Ireland↔Ireland, general authorisation, 30 days. */
const CUSTOMER_A: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "QA Fictional Retail LLC",
  controllerJurisdiction: "Ireland",
  processorName: "QA Fictional Compute Ireland Ltd",
  processorJurisdiction: "Ireland",
  services: "hosting, storage, backup, retrieval and deletion of delivery records",
  dataCategories: ["General personal data", "Location data"],
  retention: "24 hours after completion or cancellation; encrypted backups expire after 30 days",
  // What the form actually sends: the default, because nothing sets it.
  hasSubProcessors: false,
  subProcessorInventoryCollected: false,
  subProcessorList: "",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest", "mfa"],
  securityMeasuresDetails: "",
  californiaEngaged: false,
};

Deno.test("DPA-A-01 — a general authorisation survives an uncollected inventory", () => {
  const text = assembleDpaDocument(CUSTOMER_A).document_text;
  assertStringIncludes(text, "General authorisation");
  assertStringIncludes(text, "at least 30 days before any intended addition or replacement");
  assert(
    !/5\.1 No Sub-processors are engaged as of the Effective Date/.test(text),
    "still asserts an empty sub-processor list the record never supplied",
  );
});

Deno.test("DPA-A-01 — Annex D asks for the list instead of asserting there is none", () => {
  const text = assembleDpaDocument(CUSTOMER_A).document_text;
  assert(
    !text.includes("None engaged as of the Effective Date."),
    "Annex D still asserts an empty inventory",
  );
  assertStringIncludes(text, "TO BE COMPLETED: list the Sub-processors engaged for the Services");
});

Deno.test("DPA-A-01 — a specific selection still drafts specific authorisation", () => {
  // Customer B's configuration, which the report found correct. It must stay
  // correct, and must not acquire a notice-with-objection framework.
  const b = { ...CUSTOMER_A, subprocessorAuthorizationModel: "specific" as const };
  const text = assembleDpaDocument(b).document_text;
  assertStringIncludes(text, "Specific authorisation");
  assert(!text.includes("General authorisation"), "mixed the two Art. 28(2) alternatives");
});

Deno.test("DPA-A-01 — a record that genuinely confirms none is unchanged", () => {
  // The existing behaviour, reached only when the inventory WAS collected.
  const collected = { ...CUSTOMER_A, subProcessorInventoryCollected: true };
  const text = assembleDpaDocument(collected).document_text;
  assertStringIncludes(text, "5.1 No Sub-processors are engaged as of the Effective Date.");
  assertStringIncludes(text, "None engaged as of the Effective Date.");
});

Deno.test("DPA-A-01 — the clause builders default to today's behaviour", () => {
  // Every existing caller omits the new argument and must be byte-unchanged.
  assertEquals(
    subprocessorAuthorisationClause("general", 30, false),
    subprocessorAuthorisationClause("general", 30, false, true),
  );
  assertStringIncludes(
    subprocessorAuthorisationClause("general", 30, false),
    "No Sub-processors are engaged as of the Effective Date",
  );
  assertStringIncludes(
    subprocessorAuthorisationClause("general", 30, false, false),
    "General authorisation",
  );
  // The caption-free variant used outside the GDPR family behaves the same.
  assertEquals(
    neutralSubprocessorAuthorisationClause("general", 30, false),
    neutralSubprocessorAuthorisationClause("general", 30, false, true),
  );
  assertStringIncludes(
    neutralSubprocessorAuthorisationClause("general", 30, false, false),
    "General authorisation",
  );
});
