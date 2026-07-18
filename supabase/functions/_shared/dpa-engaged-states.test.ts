// FF-DPA nd2 — Unit tests for the engaged-states detector.
//
// Four test classes required by the courier:
//   1. CAUGHT — non-engaged state statute asserted → violation.
//   2. ENGAGED-CLEAN — same statute cited where the state IS engaged → no violation.
//   3. SAVINGS-CLAUSE-CLEAN — statute enumerated in a general applicable-law
//      clause → no violation (Exclusion 1).
//   4. ABBREVIATION FALSE-POSITIVE GUARDS — "CPA firm", "TIPA insurance"-style
//      language must NOT trigger Colorado / Tennessee violations.
//
// Run: deno test --allow-none supabase/functions/_shared/dpa-engaged-states.test.ts

import {
  detectNonEngagedStateAssertions,
  deriveEngagedStates,
} from "./dpa-engaged-states.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// -------------------- Class 1: CAUGHT --------------------

Deno.test("nd2 [caught] CCPA cited when only Texas is engaged", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "3.1 The Processor shall comply with the California Consumer Privacy Act, Cal. Civ. Code § 1798.140.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 2, "expected two hits (CCPA spelled + Cal. Civ. Code)");
  assert(v.every((x) => x.code === "non_engaged_state_statute"));
  assert(v[0].detail.includes("California"));
});

Deno.test("nd2 [caught] Virginia VCDPA cited when only California engaged", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "3.2 Processor undertakes obligations under the Virginia Consumer Data Protection Act.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 1);
  assert(v[0].detail.includes("Virginia"));
});

Deno.test("nd2 [caught] Colorado CPA anchored by state name is caught when not engaged", () => {
  const engaged = deriveEngagedStates(["California", "Texas"]);
  const text = "3.3 The parties acknowledge that Colorado CPA obligations apply.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 1);
  assert(v[0].detail.includes("Colorado"));
});

// -------------------- Class 2: ENGAGED-CLEAN --------------------

Deno.test("nd2 [engaged-clean] CCPA + Cal. Civ. Code cited with California engaged", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "3.1 The Processor shall comply with the California Consumer Privacy Act, Cal. Civ. Code § 1798.140.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [engaged-clean] VCDPA cited with Virginia engaged (via processor)", () => {
  const engaged = deriveEngagedStates(["California", "Virginia"]);
  const text =
    "3.2 Processor undertakes obligations under the Virginia Consumer Data Protection Act, Va. Code § 59.1-575.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

// -------------------- Class 3: SAVINGS-CLAUSE-CLEAN --------------------

Deno.test("nd2 [savings-clause] CCPA in savings clause with California NOT engaged", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "5.2 Processor shall comply with the Texas Data Privacy and Security Act, the CCPA, and any other applicable state privacy laws.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  // The Texas mention is engaged. The CCPA mention is inside a savings clause.
  assertEquals(v.length, 0);
});

Deno.test("nd2 [savings-clause] general enumeration with 'as applicable'", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "5.3 The Processor shall comply, as applicable, with the Virginia Consumer Data Protection Act.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [comparative] Recital comparing to CCPA is not a violation", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "Recital B. Unlike the California Consumer Privacy Act, the Texas DPSA does not include a private right of action.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [note-for-legal-review] mention inside NOTE FOR LEGAL REVIEW is not a violation", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "NOTE FOR LEGAL REVIEW: If the Processor onboards California residents, the California Consumer Privacy Act may become relevant.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

// -------------------- Class 4: ABBREVIATION FALSE-POSITIVE GUARDS --------------------

Deno.test("nd2 [abbrev-guard] 'CPA firm' does NOT trigger Colorado", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "6.1 The Processor engages a licensed CPA firm to audit its financial controls annually.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [abbrev-guard] 'certified public accountant (CPA)' does NOT trigger Colorado", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "6.2 Audit reports shall be issued by a certified public accountant (CPA) engaged by the Processor.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [abbrev-guard] 'TIPA insurance producers' does NOT trigger Tennessee", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "7.1 The Processor is licensed under the TIPA insurance producers scheme in its home jurisdiction.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

Deno.test("nd2 [abbrev-guard] bare 'CDPA' without 'Virginia' nearby does NOT trigger Virginia", () => {
  const engaged = deriveEngagedStates(["California", "California"]);
  const text =
    "8.1 Processor shall comply with the CDPA of its home jurisdiction to the extent applicable.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 0);
});

// -------------------- deriveEngagedStates unit --------------------

Deno.test("nd2 [derive] mixed EU/US canonical values → only US canonical values", () => {
  const engaged = deriveEngagedStates(["Germany", "California", "United Kingdom", "Virginia"]);
  assertEquals(engaged.size, 2);
  assert(engaged.has("California"));
  assert(engaged.has("Virginia"));
});

Deno.test("nd2 [derive] 'United States (federal)' does NOT engage any state", () => {
  const engaged = deriveEngagedStates(["United States (federal)", "United States (federal)"]);
  assertEquals(engaged.size, 0);
});
