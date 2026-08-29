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

// Plain-English rewrite (2026-08-29, CEO redline) — same four review points,
// "gate" terminology replaced by a description of what each one checks.
const WALK_LEAD = "four things are reviewed";

Deno.test("IR-F1: a US-state record carries the four-part walk with all four points present", () => {
  const text = textFor();
  assertStringIncludes(text, WALK_LEAD);
  assertStringIncludes(text, "First, whether it counts as a breach");
  assertStringIncludes(text, "Second, whether the right kind of data was involved");
  assertStringIncludes(text, "Third, whether the harm is serious enough to matter");
  assertStringIncludes(text, "Fourth, whether encryption changes the outcome");
});

Deno.test("IR-F1: the recorded cause and data types resolve points 1 and 2, case preserved", () => {
  const text = textFor();
  assertStringIncludes(text, "ransomware or malware");
  // Enum labels keep their case (acronym-mangling caught on the render pass).
  assertStringIncludes(text, "Government IDs / SSN; Financial / payment data");
});

Deno.test("IR-F1: encryption posture — full encryption with safe keys supports an exception", () => {
  const text = textFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys not compromised",
  });
  assertStringIncludes(text, "this can qualify for an exception to notification under the states that allow one");
  assertStringIncludes(text, "as long as the encryption meets that state's specific standard");
});

Deno.test("IR-F1: encryption posture — compromised keys defeat it even with full encryption", () => {
  const text = textFor({
    encryptionStatus: "All affected data encrypted / rendered unintelligible",
    encryptionKeyStatus: "Keys compromised or possibly compromised",
  });
  assertStringIncludes(text, "encryption does not excuse notification here");
  assert(!text.includes("this can qualify for an exception to notification"));
});

Deno.test("IR-F1: encryption posture — partial encryption reaches only that part", () => {
  const text = textFor({ encryptionStatus: "Some affected data encrypted" });
  assertStringIncludes(text, "any exception could only apply to that part");
});

Deno.test("IR-F1: encryption posture — an unstated posture resolves neither way", () => {
  const text = textFor();
  assertStringIncludes(text, "the encryption status hasn't been recorded, so this can't be resolved either way");
});

Deno.test("IR-F1: the harm point is never pre-resolved", () => {
  const text = textFor();
  assertStringIncludes(text, "this playbook does not decide it in advance");
});

Deno.test("IR-F1: an unknown cause degrades point 1 honestly", () => {
  const text = textFor({ cause: "Unknown / still investigating" });
  assertStringIncludes(text, "the cause of the incident hasn't been recorded yet");
});

Deno.test("IR-F1: a pure EU/UK record carries no walk block", () => {
  const text = textFor({ jurisdictions: ["Ireland"] });
  assert(!text.includes(WALK_LEAD), "no state/sectoral rows -> nothing to walk");
});

Deno.test("IR-F1: the walk renders alongside GDPR-family duties on a mixed record", () => {
  const text = textFor({ jurisdictions: ["California", "Ireland"] });
  assertStringIncludes(text, WALK_LEAD);
});

Deno.test("IR-F1: no per-state statutory content is asserted by the generic walk itself", () => {
  // The generic walk names review STRUCTURE only; covered-PI definitions and
  // carve-outs stay with the sourced per-state gates. Guard the boundary: the
  // generic paragraph never claims a specific state defines or exempts anything.
  const text = textFor();
  const at = text.indexOf(WALK_LEAD);
  const end = text.indexOf("whether encryption changes the outcome");
  const walkSlice = text.slice(at, end + 400);
  assert(!/California (?:defines|exempts|provides)/.test(walkSlice));
  assert(!/Texas (?:defines|exempts|provides)/.test(walkSlice));
});
