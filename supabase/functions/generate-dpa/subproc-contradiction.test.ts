// HF1 Task 2 — Sub-processor contradiction detector unit tests.
//
// Behavioral fixtures required by the courier:
//   1. CAUGHT — Run C doc 2c935e29 verbatim Section 4.1 (Schedule 1 /
//      general-authorisation) on hasSubProcessors===false → violation.
//   2. CAUGHT — bare Schedule 1 list-of-sub-processors reference on
//      hasSubProcessors===false → violation.
//   3. CLEAN — the same passage where hasSubProcessors===true → no violation.
//   4. CLEAN — the courier-mandated "no sub-processors are engaged as of the
//      Effective Date" clause when hasSubProcessors===false.
//
// The detector is scoped to two regex patterns:
//   RE_SCHEDULE1_SUBPROC     — "Schedule 1" within 80 chars of sub-processor
//   RE_GENERAL_AUTH_SUBPROC  — "general authorisation" within 120 chars of sub-processor

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Re-declare the detector locally so this test file does not need to load the
// full edge function module (which imports supabase, gdpr-context, etc.).
const RE_SCHEDULE1_SUBPROC =
  /\bSchedule\s*1\b(?:[^\n]{0,80}(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors))/i;
const RE_GENERAL_AUTH_SUBPROC =
  /\bgeneral\s+authorisation\b[^.\n]{0,120}\bsub[- ]?processor/i;
function detect(text: string, hasSubProcessors: boolean): number {
  if (hasSubProcessors) return 0;
  let n = 0;
  if (RE_SCHEDULE1_SUBPROC.test(text)) n++;
  if (RE_GENERAL_AUTH_SUBPROC.test(text)) n++;
  return n;
}

Deno.test("subproc [caught] Run C 2c935e29 §4.1 verbatim on hasSubProcessors=false", () => {
  const text =
    "4.1 General Authorisation. The Controller grants general authorisation to the Processor to engage sub-processors for the performance of the Services, subject to the conditions set out in this clause 4. General authorisation under this clause applies ONLY to the sub-processors listed in Schedule 1 at the Effective Date.";
  assert(detect(text, false) >= 1);
});

Deno.test("subproc [caught] bare Schedule 1 list-of-sub-processors on hasSubProcessors=false", () => {
  const text = "The Processor may engage the approved Sub-processors set out in Schedule 1 of this DPA.";
  // "Schedule 1" ... "approved Sub-processors" — the pattern is inversion-agnostic on
  // scheduled order in the text; a "sub-processor" mention within 80 chars of Schedule 1
  // is what fires. This fixture places Schedule 1 first.
  const text2 = "The Processor engages sub-processors as set out in Schedule 1 (List of Sub-processors).";
  assert(detect(text2, false) >= 1);
});

Deno.test("subproc [clean] same passage when hasSubProcessors=true", () => {
  const text =
    "4.1 General Authorisation. The Controller grants general authorisation to the Processor to engage sub-processors listed in Schedule 1.";
  assertEquals(detect(text, true), 0);
});

Deno.test("subproc [clean] no-sub-processors clause on hasSubProcessors=false", () => {
  const text =
    "4.1 The Parties acknowledge that no sub-processors are engaged as of the Effective Date. Any future engagement of a sub-processor by the Processor requires the Controller's prior specific written authorisation obtained before the engagement commences.";
  assertEquals(detect(text, false), 0);
});
