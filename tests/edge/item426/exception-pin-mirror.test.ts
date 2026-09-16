// Doc 261-review (2026-09-15, LEGAL 03 / LEGAL 04 / EX 04) — MIRROR PARITY.
//
// The intake page's business-purpose / exemption cards cite their authority
// from src/lib/risk-exceptions.ts, a front-end mirror of the engine's
// deterministic pinpoint registry. Two hand-typed citations on the page had
// drifted from the engine ((e)(8) for internal research; (e)(1) for the
// consumer-requested card) while the report was already right. This test pins
// the mirror to the registry byte-for-byte so the two cannot drift again, and
// pins the page's short pinpoint to a prefix of the registry entry.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  EXCEPTION_LABELS as ENGINE_LABELS,
  EXCEPTION_PIN as ENGINE_PIN,
} from "../../../supabase/functions/_shared/report-contracts/risk-exceptions.ts";
import {
  EXCEPTION_LABELS as MIRROR_LABELS,
  EXCEPTION_PIN as MIRROR_PIN,
  exceptionPinpoint,
} from "../../../src/lib/risk-exceptions.ts";

Deno.test("exception pinpoint mirror — identical to the engine registry", () => {
  assertEquals(MIRROR_PIN, ENGINE_PIN);
  assertEquals(MIRROR_LABELS, ENGINE_LABELS);
});

Deno.test("exception pinpoint mirror — the page's short pinpoint is a prefix of the registry entry", () => {
  for (const key of Object.keys(ENGINE_PIN)) {
    const short = exceptionPinpoint(key);
    assert(short.length > 0, `${key}: empty pinpoint`);
    if (key === "employment_context") {
      assert(/no current statutory exemption/i.test(short), `${key}: the warning must survive`);
      continue;
    }
    assert(ENGINE_PIN[key].startsWith(short), `${key}: "${short}" is not a prefix of the registry entry`);
    assert(!short.includes("; deletion requests"), `${key}: report-only cross-reference leaked into the label`);
  }
});

Deno.test("exception pinpoint mirror — the two corrected cards cite the engine's authority", () => {
  assert(exceptionPinpoint("internal_research").includes("1798.140(e)(7)"));
  assert(!exceptionPinpoint("internal_research").includes("(e)(8)"));
  assert(exceptionPinpoint("consumer_request").includes("1798.105(d)(1)"));
  assert(!exceptionPinpoint("consumer_request").includes("1798.140(e)(1)"));
});
