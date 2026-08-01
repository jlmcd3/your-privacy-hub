/**
 * ITEM 267 PART 3 — GROUNDED-NOTE CALIBRATION (observe mode unchanged).
 *
 * Authority: CEO delegation 2026-07-30 (verbatim): "I agree to whatever the
 * teams recommend on each issue - except for issue 8. Go forward with all
 * other changes".
 *
 * POSITIVE fixtures: derivational/geminated forms of GROUNDED stems now
 * ground. NEGATIVE fixtures: invented content tokens (vendor names absent
 * from the intake, off-record sector terms) still fail — the calibration
 * widens the FEED side only, never the note side.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  PASS1_GROUNDED_NOTE_VERSION,
  buildGroundedSet,
  isGrounded,
  feedVariants,
  tokenize,
} from "./grounded-note.ts";
import type { IntakeLedgerEntry } from "../render-plan/schema.ts";

const LEDGER: readonly IntakeLedgerEntry[] = [
  {
    ledger_id: "L.i1_processing_purpose",
    intake_field: "i1_processing_purpose",
    value: "fraud detect and ship a set of credit decisions",
    display: "Stated processing purpose",
  },
  {
    ledger_id: "L.i4_disclosure_mechanisms",
    intake_field: "i4_disclosure_mechanisms",
    value: "disclosure to a recipient by secure transfer",
    display: "Disclosure mechanisms",
  },
] as const;

const SET = buildGroundedSet(LEDGER);

Deno.test("item267 — version bumped", () => {
  assertEquals(PASS1_GROUNDED_NOTE_VERSION, "pass1-grounded-note@2026-07-30-item267-calibration");
});

Deno.test("item267 — gemination forms of grounded stems ground", () => {
  for (const t of ["setting", "shipped", "shipping"]) {
    assert(isGrounded(t, SET), `${t} should be grounded`);
  }
});

Deno.test("item267 — derivational suffixes off grounded stems ground", () => {
  for (const t of ["detection", "disclosures", "transfers"]) {
    assert(isGrounded(t, SET), `${t} should be grounded`);
  }
});

Deno.test("item267 — mined ordinary English is now in the connective lexicon", () => {
  for (const t of ["include", "who", "their", "role", "receive", "request", "apply", "human", "fully", "type", "indicating", "active"]) {
    assert(isGrounded(t, SET), `${t} should be grounded via the lexicon`);
  }
});

Deno.test("item267 — NEGATIVE: invented content tokens still fail", () => {
  for (const t of ["blockchain", "acxiom", "equifax", "plaid", "scoreedge", "quantum"]) {
    assertEquals(isGrounded(t, SET), false, `${t} must remain ungrounded`);
  }
});

Deno.test("item267 — feedVariants is feed-side only and closed", () => {
  const v = feedVariants("set");
  assert(v.includes("setting"));
  assert(v.includes("setter"));
  assert(feedVariants("detect").includes("detection"));
  assert(!v.includes("blockchain"));
  // note-side tokenization is untouched
  assertEquals(tokenize("Fraud detection, applied."), ["fraud", "detection", "applied"]);
});
