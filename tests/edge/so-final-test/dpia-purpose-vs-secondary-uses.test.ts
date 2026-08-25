// DPIA — necessity test must be measured against `purpose`, never
// `secondary_uses`. Evidence: quality-batch 0e2cbbe3, run 5b8240d3.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  detectPurposeConflation,
  conflationRepairInstruction,
} from "../../../supabase/functions/run-dpia-framework/_local/dpia-purpose-guard.ts";

const PURPOSE =
  "To schedule occupational-health return-to-work reviews and adjust duties for employees returning from long-term sick leave.";

const SECONDARY_USES =
  "None. Certificate data is not used for any purpose beyond return-to-work scheduling and duty adjustment, and it is never used for performance management or recruitment decisions.";

Deno.test("guard: secondary_uses quoted as the purpose is detected", () => {
  const section = {
    necessity_test:
      'The record states the purpose ("None. Certificate data is not used for any purpose beyond return-to-work scheduling and duty adjustment, and it is never used for performance management or recruitment decisions.") and measures necessity against it.',
  };
  const findings = detectPurposeConflation(section, PURPOSE, SECONDARY_USES);
  assert(findings.length > 0, "conflation not detected");
});

Deno.test("guard: secondary_uses reused as the proportionality benefit is detected", () => {
  const section = {
    proportionality: [
      {
        benefit:
          "The benefit relied on is that certificate data is not used for any purpose beyond return-to-work scheduling and duty adjustment.",
      },
    ],
  };
  assert(detectPurposeConflation(section, PURPOSE, SECONDARY_USES).length > 0);
});

Deno.test("guard: correct prose quoting the real purpose is clean", () => {
  const section = {
    necessity_test:
      `The record states the purpose as "${PURPOSE}" and the least-intrusive-means comparison is run against that purpose.`,
    minimisation:
      "The record confirms the data is not used beyond that purpose, which the assessment reads as evidence of scope limitation rather than as the purpose itself.",
  };
  assertEquals(detectPurposeConflation(section, PURPOSE, SECONDARY_USES), []);
});

Deno.test("guard: no secondary-uses answer means nothing to confuse", () => {
  const section = { necessity_test: "Purpose analysis." };
  assertEquals(detectPurposeConflation(section, PURPOSE, "Not specified"), []);
  assertEquals(detectPurposeConflation(section, PURPOSE, ""), []);
});

Deno.test("guard: repair instruction names both fields explicitly", () => {
  const t = conflationRepairInstruction(PURPOSE, SECONDARY_USES);
  assert(t.includes("STATED PURPOSE:"));
  assert(t.includes("SECONDARY / COMPATIBLE USES"));
  assert(t.includes(PURPOSE));
});
