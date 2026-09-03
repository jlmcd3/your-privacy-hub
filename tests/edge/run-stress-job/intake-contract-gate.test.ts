// PANEL FIX BATCH 11 (2026-08-30) — the harness contract-gate (doc 108).
// Claude-generated stress intakes that drift from the canonical contracts
// silently route the deterministic builders down record_insufficient paths;
// the low grades then read as product defects. run-stress-job now fails a
// job BEFORE the product runs when the fixture carries label/shape drift,
// with the violations named in error_message. Missing-required and
// unknown-key findings stay advisory (the harness synthesizes some fields
// per tool, and honestly sparse records are legitimate product input).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  blockingContractViolations,
  INTAKE_CONTRACT_GATE_PREFIX,
} from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";

Deno.test("gate: a drifted enum label blocks, with the key and reason named", () => {
  const out = blockingContractViolations("biometric", {
    orgName: "Busted Sled Solutions, Inc.",
    orgType: "Employer (employee biometrics)",
    biometricTypes: ["Fingerprint / palm print"],
    purpose: "Time & attendance / workforce management",
    jurisdictions: ["Illinois, USA (BIPA)"],
    // Drift: the contract's label is "Standalone written release signed
    // before collection".
    consent_artifact_type: "Standalone written release signed before enrollment",
  });
  assert(out.length >= 1, "drifted enum label did not block");
  assert(out.some((v) => v.startsWith("consent_artifact_type:")), out.join("; "));
});

Deno.test("gate: a sparse-but-honest record does not block (missing fields are advisory)", () => {
  const out = blockingContractViolations("biometric", {
    orgName: "Busted Sled Solutions, Inc.",
    orgType: "Employer (employee biometrics)",
    biometricTypes: ["Fingerprint / palm print"],
    purpose: "Time & attendance / workforce management",
    jurisdictions: ["Illinois, USA (BIPA)"],
  });
  assertEquals(out, []);
});

Deno.test("gate: harness-synthesized fields do not false-positive (governance company_name case)", () => {
  // GOV-4's class: the harness maps job.company_name -> organization_name
  // inside the governance arm; the raw fixture carrying company_name (an
  // unknown top-level key) plus a missing organization_name must NOT block.
  const out = blockingContractViolations("governance", {
    company_name: "Misfit Toys Logistics Ltd",
  });
  assertEquals(out, []);
});

Deno.test("gate: a conformant golden fixture passes byte-for-byte", () => {
  const g = CPPA_ADMT_GOLDEN[0];
  const out = blockingContractViolations("cppa-admt", g.intake as Record<string, unknown>);
  assertEquals(out, [], out.join("; "));
});

Deno.test("gate: session-shaped products (ropa, notices) are not gated", () => {
  assertEquals(blockingContractViolations("ropa", { anything: "goes" }), []);
  assertEquals(blockingContractViolations("us-notice", { anything: "goes" }), []);
  assertEquals(blockingContractViolations("eu-notice", { anything: "goes" }), []);
});

Deno.test("gate: the error prefix is stable — the retry loop keys on it", () => {
  assertEquals(INTAKE_CONTRACT_GATE_PREFIX, "INTAKE_CONTRACT_GATE");
});
