// IR-F TRANCHE 1 (2026-08-29, doc 100 recommendation; advance-ratification
// ledger) — the four-gate notification decision walk, resolved against the
// incident record from EXISTING intake fields only (cause, dataTypes,
// encryptionStatus, encryptionKeyStatus). Per-state gate content (covered-PI
// definitions, risk-of-harm carve-outs, safe-harbour formulations) is
// deliberately NOT asserted — that is the sourced registry work of the
// remaining IR-F tranches.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function mk(over: Bag = {}): Bag {
  return {
    organizationName: "Cobalt Retail Inc",
    discoveryDateTime: "2026-08-20T10:00",
    cause: "Ransomware or malware",
    dataTypes: ["Government IDs / SSN", "Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["California", "Texas"],
    contained: "Yes",
    organisationType: "Company",
    ...over,
  };
}

function textFor(over: Bag = {}): string {
  const intake = mk(over);
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return JSON.stringify(assembleIRSkeletonDocument(report, intake));
}

const WALK_LEAD = "walked through four gates against this incident's record";

Deno.test("IR-F1: a US-state record carries the four-gate walk with all gates present", () => {
  const text = textFor();
  assertStringIncludes(text, WALK_LEAD);
  assertStringIncludes(text, "the breach-definition gate");
  assertStringIncludes(text, "the data-element gate");
  assertStringIncludes(text, "the harm-threshold gate");
  assertStringIncludes(text, "the safe-harbour gate");
});

Deno.test("IR-F1: the recorded cause and data types resolve gates 1 and 2, case preserved", () => {
  const text = textFor();
  assertStringIncludes(text, "ransomware or malware");
  // Enum labels keep their case (acronym-mangling caught on the render pass).
  assertStringIncludes(text, "Government IDs / SSN; Financial / payment data");
});

Deno.test("IR-F1: safe-harbour posture — full encryption with safe keys supports the position", () => {
  const text = textFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys not compromised",
  });
  assertStringIncludes(text, "supports an encryption-based safe-harbour position");
  assertStringIncludes(text, "subject to confirming that statute's own formulation");
});

Deno.test("IR-F1: safe-harbour posture — compromised keys defeat it even with full encryption", () => {
  const text = textFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys compromised or possibly compromised",
  });
  assertStringIncludes(text, "an encryption safe harbour is not available on the record's own account");
  assert(!text.includes("supports an encryption-based safe-harbour position"));
});

Deno.test("IR-F1: safe-harbour posture — partial encryption reaches only the encrypted portion", () => {
  const text = textFor({ encryptionStatus: "Some affected data encrypted" });
  assertStringIncludes(text, "could reach only the encrypted portion");
});

Deno.test("IR-F1: safe-harbour posture — an unstated posture takes no position", () => {
  const text = textFor();
  assertStringIncludes(text, "the record does not establish the encryption posture, so no safe-harbour position is taken");
});

Deno.test("IR-F1: the harm-threshold gate is never pre-resolved", () => {
  const text = textFor();
  assertStringIncludes(text, "this playbook does not pre-resolve it");
});

Deno.test("IR-F1: an unknown cause degrades gate 1 honestly", () => {
  const text = textFor({ cause: "Unknown / still investigating" });
  assertStringIncludes(text, "the cause is not yet established on the record");
});

Deno.test("IR-F1: a pure EU/UK record carries no walk block", () => {
  const text = textFor({ jurisdictions: ["Ireland"] });
  assert(!text.includes(WALK_LEAD), "no state/sectoral rows -> nothing to walk");
});

Deno.test("IR-F1: the walk renders alongside GDPR-family duties on a mixed record", () => {
  const text = textFor({ jurisdictions: ["California", "Ireland"] });
  assertStringIncludes(text, WALK_LEAD);
});

Deno.test("IR-F1: no per-state statutory content is asserted by the walk itself", () => {
  // The walk names gate STRUCTURE only; covered-PI definitions and
  // carve-outs stay with the sourced duty rows. Guard the boundary: the walk
  // sentences never claim a specific state defines or exempts anything.
  const text = textFor();
  const at = text.indexOf(WALK_LEAD);
  const walkSlice = text.slice(at, text.indexOf("safe-harbour gate") + 400);
  assert(!/California (?:defines|exempts|provides)/.test(walkSlice));
  assert(!/Texas (?:defines|exempts|provides)/.test(walkSlice));
});
