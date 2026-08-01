// PROCESS-RETRO-WRITEBACK conformance test (2026-07-27; ledger item 165).
//
// Asserts that every state × daemon pair in the canonical state machine has
// an owner AND a cancel path, AND that the picker's KICKOFF_ELIGIBLE set
// equals the canonical pre-execution set. If any state becomes unserved in
// a future change, this test fails at deploy time.
//
// Spec: docs/design/HARNESS-STATE-MACHINE.md §8.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LEGAL_STATES,
  PRE_EXECUTION_STATES,
  OWNERSHIP,
  CANCEL_OWNERSHIP,
  REAP_OWNERSHIP,
  isTerminal,
  stateKey,
  verifyStateMachine,
} from "../_shared/harness/state-machine.ts";
import { KICKOFF_ELIGIBLE, isKickoffEligible } from "./index.ts";

Deno.test("state machine — every non-terminal state has a primary owner", () => {
  for (const s of LEGAL_STATES) {
    if (isTerminal(s)) continue;
    const owner = OWNERSHIP[stateKey(s)];
    if (!owner) throw new Error(`non-terminal state ${stateKey(s)} has no primary owner`);
  }
});

Deno.test("state machine — every terminal state has null owner", () => {
  for (const s of LEGAL_STATES) {
    if (!isTerminal(s)) continue;
    const owner = OWNERSHIP[stateKey(s)];
    assertEquals(owner, null, `terminal state ${stateKey(s)} must have null owner`);
  }
});

Deno.test("state machine — every non-terminal state has a cancel path", () => {
  for (const s of LEGAL_STATES) {
    if (isTerminal(s)) continue;
    const cancelOwner = CANCEL_OWNERSHIP[stateKey(s)];
    if (!cancelOwner) throw new Error(`non-terminal state ${stateKey(s)} has no cancel path (§17)`);
  }
});

Deno.test("state machine — every non-terminal state has a reap owner", () => {
  for (const s of LEGAL_STATES) {
    if (isTerminal(s)) continue;
    const reapOwner = REAP_OWNERSHIP[stateKey(s)];
    if (!reapOwner) throw new Error(`non-terminal state ${stateKey(s)} has no reap owner`);
  }
});

Deno.test("picker KICKOFF_ELIGIBLE ≡ canonical PRE_EXECUTION_STATES (§18)", () => {
  const canon = new Set(PRE_EXECUTION_STATES.map((s) => `${s.status}/${s.phase}`));
  const picker = new Set(KICKOFF_ELIGIBLE.map((s) => `${s.status}/${s.phase}`));
  assertEquals(picker, canon, "picker KICKOFF_ELIGIBLE must exactly match canonical pre-execution set");
});

Deno.test("picker isKickoffEligible() serves every canonical pre-execution state", () => {
  for (const s of PRE_EXECUTION_STATES) {
    if (!isKickoffEligible(s.status, s.phase)) {
      throw new Error(`picker isKickoffEligible does not serve canonical ${stateKey(s)}`);
    }
  }
});

Deno.test("verifyStateMachine() reports ok=true with fully-served map", () => {
  const r = verifyStateMachine();
  assertEquals(r.ok, true, `state machine not fully served: ${r.reasons.join("; ")}`);
  assertEquals(r.summary.unowned_non_terminal.length, 0);
  assertEquals(r.summary.missing_cancel_paths.length, 0);
});
