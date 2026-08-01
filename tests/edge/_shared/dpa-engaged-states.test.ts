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

// -------------------- Class 3: SAVINGS-CLAUSE (HF1 Task 1) --------------------
// Under HF1 Task 1 the savings-clause exclusion is REMOVED. Any sentence
// naming a specific non-engaged state statute is a violation regardless of
// "…and any other applicable state privacy laws" phrasing.

Deno.test("nd2 [caught] CCPA enumerated behind a savings tail is CAUGHT (HF1)", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "5.2 Processor shall comply with the Texas Data Privacy and Security Act, the CCPA, and any other applicable state privacy laws.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  assertEquals(v.length, 1);
  assert(v[0].detail.includes("California"));
});

Deno.test("nd2 [caught] Run C bee94e1e §1.3.4 verbatim — TX/CT/VA/CO/OR enumerated on California-only intake", () => {
  const engaged = deriveEngagedStates(["California", "Singapore"]);
  const text =
    "1.3.4 The parties acknowledge that the Personal Data of residents of other US states, including Texas (TDPSA, Tex. Bus. & Com. Code §§ 541.001–541.201), Connecticut (CTDPA, Conn. Gen. Stat. ch. 743jj), Virginia (VCDPA, Va. Code §§ 59.1-575–59.1-585), Colorado (CPA, C.R.S. §§ 6-1-1301–6-1-1313), and Oregon (OCPA, ORS 646A.570–646A.589), may be processed under this DPA to the extent patients, employees, or other data subjects reside in those states. The obligations of this DPA are drafted to satisfy the most stringent applicable standard among the engaged state laws. To the extent the Personal Data of residents of other US states is processed, the Parties shall comply with the applicable state privacy laws of those states, applying the standards of this DPA as a baseline.";
  const v = detectNonEngagedStateAssertions(text, engaged);
  const states = new Set(v.map((x) => x.detail.match(/"([A-Za-z ]+)" statute/)?.[1]));
  assert(states.has("Texas"));
  assert(states.has("Connecticut"));
  assert(states.has("Virginia"));
  assert(states.has("Colorado"));
  assert(states.has("Oregon"));
});

Deno.test("nd2 [caught] Run C 74f0b87a §2.2 verbatim — statute-name definitions block on Finland+Virginia intake", () => {
  const engaged = deriveEngagedStates(["Finland", "Virginia"]);
  const text =
    '2.2.1 "Consumer" means, under CCPA/CPRA (Cal. Civ. Code § 1798.140(i)), a California resident; under VCDPA (Va. Code § 59.1-575), a Virginia resident acting in an individual or household context (excluding employment context); under CTDPA (Conn. Gen. Stat. § 42-515), a Connecticut resident acting in an individual or household context; under Colorado Privacy Act ("CPA", C.R.S. § 6-1-1303), a Colorado resident acting only in an individual or household context; and under the Texas Data Privacy and Security Act ("TDPSA", Tex. Bus. & Com. Code § 541.001), an individual who is a resident of Texas.';
  const v = detectNonEngagedStateAssertions(text, engaged);
  const states = new Set(v.map((x) => x.detail.match(/"([A-Za-z ]+)" statute/)?.[1]));
  assert(states.has("California"));
  assert(states.has("Connecticut"));
  assert(states.has("Colorado"));
  assert(states.has("Texas"));
});

Deno.test("nd2 [savings-clean] canonical generic savings sentence — no statute names — is not a violation", () => {
  const engaged = deriveEngagedStates(["Texas", "Texas"]);
  const text =
    "5.2 The Processor shall comply with all applicable state privacy laws.";
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
