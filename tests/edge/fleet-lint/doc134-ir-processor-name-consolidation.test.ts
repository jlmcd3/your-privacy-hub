// DOC 134 (follow-up to doc 133's CPPA Risk / IR Playbook items, CEO-
// directed 2026-09-01) — regression guards for the IR Playbook
// processor-name consolidation.
//
// Found while double-checking doc 133's "residual fragility, not urgent"
// note: `ir-playbook-deliverables/build.ts`'s readIncidentFacts() computed
// processorName from intake.processorName ALONE, with no fallback to a
// contract-tagged counterparty — a THIRD, independent computation from the
// one composeProcessors()/deriveIncidentFactsTable() used (already patched
// same-day by A-TEAM DELTA "EU Incident P0-1"). That meant build.ts:390's
// Article 33(1) analysis paragraph and edpb-art33-template.ts's "Processor
// involved" field could still say the processor was unnamed even when the
// Incident Facts table correctly named it. Fixed by consolidating into one
// exported resolveProcessorName()/processorNameFromContracts() pair in
// build.ts, used by every consumer, and broadening the parenthetical match
// from an exact "(processor)" to any parenthetical containing the word
// "processor(s)".
//
// (No code change was needed for doc 133's other item, the CPPA Risk
// controls-vs-safeguards question — investigation found it already
// resolved by the same-day doc-129 RISK fix; see doc 134 for detail.)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  processorNameFromContracts,
  readIncidentFacts,
  resolveProcessorName,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";

Deno.test("doc134 — processorNameFromContracts: exact '(processor)' still matches (unchanged)", () => {
  const intake = { breachNoticeContracts: [{ counterparty: "Nordisk WMS Hosting ApS (processor)", deadline: "72 hours" }] };
  assertEquals(processorNameFromContracts(intake), "Nordisk WMS Hosting ApS");
});

Deno.test("doc134 — processorNameFromContracts: broadened to sub-processor / data processor / third-party processor", () => {
  assertEquals(
    processorNameFromContracts({ breachNoticeContracts: [{ counterparty: "Acme Hosting (Sub-processor)" }] }),
    "Acme Hosting",
  );
  assertEquals(
    processorNameFromContracts({ breachNoticeContracts: [{ counterparty: "Acme Hosting (data processor)" }] }),
    "Acme Hosting",
  );
  assertEquals(
    processorNameFromContracts({ breachNoticeContracts: [{ counterparty: "Acme Hosting (third-party processor)" }] }),
    "Acme Hosting",
  );
});

Deno.test("doc134 — processorNameFromContracts: does not fire on an unrelated 'processor' mention outside the trailing parenthetical", () => {
  assertEquals(
    processorNameFromContracts({ breachNoticeContracts: [{ counterparty: "Processor Analytics Ltd (controller)" }] }),
    "",
  );
  assertEquals(
    processorNameFromContracts({ breachNoticeContracts: [{ counterparty: "Acme Hosting" }] }),
    "",
  );
});

Deno.test("doc134 — resolveProcessorName: intake.processorName wins when both are present", () => {
  const intake = {
    processorName: "Explicit Co",
    breachNoticeContracts: [{ counterparty: "Contract Co (processor)" }],
  };
  assertEquals(resolveProcessorName(intake), "Explicit Co");
});

Deno.test("doc134 — resolveProcessorName: falls back to the contract-tagged name when processorName is blank", () => {
  const intake = { breachNoticeContracts: [{ counterparty: "Nordisk WMS Hosting ApS (processor)" }] };
  assertEquals(resolveProcessorName(intake), "Nordisk WMS Hosting ApS");
});

Deno.test("doc134 — readIncidentFacts: processorName now uses the same fallback (the fixed bug's regression guard)", () => {
  // The exact grader-reproduction shape: no top-level processorName field,
  // but the processor is named in breachNoticeContracts. Before this fix,
  // readIncidentFacts() (unlike composeProcessors()) never applied this
  // fallback, so facts.processorName was "" here.
  const intake = {
    organizationName: "Busted Sled Solutions, Inc.",
    breachNoticeContracts: [{ counterparty: "Nordisk WMS Hosting ApS (processor)", deadline: "72 hours" }],
  };
  const facts = readIncidentFacts(intake);
  assertEquals(facts.processorName, "Nordisk WMS Hosting ApS");
});

Deno.test("doc134 — readIncidentFacts: no processor named anywhere still yields an empty string (unchanged)", () => {
  const facts = readIncidentFacts({ organizationName: "Acme Ltd" });
  assertEquals(facts.processorName, "");
});
