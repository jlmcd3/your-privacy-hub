// HF2 Task 6 — Sub-processor contradiction detector unit tests (BIDIRECTIONAL).
//
// The prior detector required "Schedule 1" (or "general authorisation") to
// appear BEFORE the sub-processor token, and the test file's fixture #2
// (`text2`) placed Schedule 1 first — masking the bug that reverse-order
// prose (sub-processor mentioned first) escapes detection. The rewritten
// detector fires on either ordering within the proximity window; these
// tests exercise both orderings.
//
// Patterns exercised:
//   Schedule 1 → sub-processor (forward, ≤80 chars)
//   sub-processor → Schedule 1 (reverse, ≤80 chars)
//   general authorisation → sub-processor (forward, ≤120 chars)
//   sub-processor → general authorisation (reverse, ≤120 chars)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const RE_SCHEDULE1_SUBPROC_FWD =
  /\bSchedule\s*1\b[^\n]{0,80}(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)/i;
const RE_SCHEDULE1_SUBPROC_REV =
  /(?:sub[- ]?processor|approved\s+Sub[- ]?processors|list\s+of\s+Sub[- ]?processors)[^\n]{0,80}\bSchedule\s*1\b/i;
const RE_GENERAL_AUTH_SUBPROC_FWD =
  /\bgeneral\s+authorisation\b[^.\n]{0,120}\bsub[- ]?processor/i;
const RE_GENERAL_AUTH_SUBPROC_REV =
  /\bsub[- ]?processor[^.\n]{0,120}\bgeneral\s+authorisation\b/i;

function detect(text: string, hasSubProcessors: boolean): number {
  if (hasSubProcessors) return 0;
  let n = 0;
  if (RE_SCHEDULE1_SUBPROC_FWD.test(text) || RE_SCHEDULE1_SUBPROC_REV.test(text)) n++;
  if (RE_GENERAL_AUTH_SUBPROC_FWD.test(text) || RE_GENERAL_AUTH_SUBPROC_REV.test(text)) n++;
  return n;
}

Deno.test("subproc [caught] Run C 2c935e29 §4.1 verbatim on hasSubProcessors=false", () => {
  const text =
    "4.1 General Authorisation. The Controller grants general authorisation to the Processor to engage sub-processors for the performance of the Services, subject to the conditions set out in this clause 4. General authorisation under this clause applies ONLY to the sub-processors listed in Schedule 1 at the Effective Date.";
  assert(detect(text, false) >= 1);
});

Deno.test("subproc [caught] REVERSE order: sub-processor before Schedule 1 (previously masked)", () => {
  // "the approved Sub-processors set out in Schedule 1" — sub-processor token
  // appears BEFORE Schedule 1. The old forward-only regex escaped this.
  const text = "The Processor may engage the approved Sub-processors set out in Schedule 1 of this DPA.";
  assertEquals(detect(text, false), 1);
});

Deno.test("subproc [caught] REVERSE order: sub-processor before general authorisation", () => {
  const text = "Sub-processors may be engaged under the general authorisation granted in clause 4.";
  assertEquals(detect(text, false), 1);
});

Deno.test("subproc [caught] FORWARD order: Schedule 1 → list of sub-processors", () => {
  const text = "The Processor engages sub-processors as set out in Schedule 1 (List of Sub-processors).";
  assert(detect(text, false) >= 1);
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

// MC-S1b Task 7(b) — epoch-stamp unit test. The grader context version
// constant is the pivot point for stamping quality_batch_runs and baselines.
// Ensures the constant follows the expected shape so downstream ledger
// dividers ("◈ EPOCH CHANGE") can parse it.
Deno.test("MC-S1b epoch-stamp: GRADER_CONTEXT_VERSION shape", async () => {
  const { GRADER_CONTEXT_VERSION } = await import("../_shared/grader/context.ts");
  assert(typeof GRADER_CONTEXT_VERSION === "string");
  assert(/^gc-\d{4}-\d{2}-\d{2}/.test(GRADER_CONTEXT_VERSION), `unexpected shape: ${GRADER_CONTEXT_VERSION}`);
});
