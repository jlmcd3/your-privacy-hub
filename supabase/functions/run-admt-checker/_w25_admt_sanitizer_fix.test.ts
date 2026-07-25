// Colocated Deno tests for W25-ADMT-SANITIZER-FIX.
// Verifies: (a) T-Ab whole-sentence excision with proper boundary
// re-join (no splice residue); (b) T-B nested + attributive-modifier
// detection with drop; (c) mid-sentence interpolation drop; (d)
// idempotency; (e) fail-open on malformed input; (f) _meta preservation;
// (g) unrelated fields untouched; (h) anchor keys never mutated.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW25AdmtSanitizerFix,
  sanitizeString,
  splitSentences,
  rejoinSentences,
  W25_ADMT_SANITIZER_STAMP,
} from "./_w25_admt_sanitizer_fix.ts";

Deno.test("splitSentences — preserves terminators and trailing fragment", () => {
  const s = "First one. Second two! Third three? Trailing";
  const parts = splitSentences(s).map((x) => x.trim());
  assertEquals(parts, ["First one.", "Second two!", "Third three?", "Trailing"]);
});

Deno.test("rejoinSentences — single-space, trimmed, collapsed", () => {
  const joined = rejoinSentences([" A. ", "  B.  ", "", "C."]);
  assertEquals(joined, "A. B. C.");
});

Deno.test("T-Ab: whole-sentence excision of info-needed sentence — no splice residue", () => {
  const input =
    "Provide the missing details and refresh the assessment. " +
    "More information is needed before enough exists to pronounce " +
    "the logic disclosure adequate on this record.";
  const r = sanitizeString(input, null);
  assertEquals(r.out, "Provide the missing details and refresh the assessment.");
  assertEquals(r.info_needed_sentence_drops, 1);
  // Regression pin — splice artifact must not appear.
  assert(!r.out.includes("assessment.exists"));
  assert(!r.out.includes("assessment.More"));
});

Deno.test("T-Ab: additional/further variants also excised whole", () => {
  const input = "Keep this. Further information is needed to proceed. Also keep.";
  const r = sanitizeString(input, null);
  assertEquals(r.out, "Keep this. Also keep.");
  assertEquals(r.info_needed_sentence_drops, 1);
});

Deno.test("T-B: attributive-modifier position dropped (regression pin doc 2235d1f6)", () => {
  const input =
    "The scope determination proceeds. " +
    "the applicable ADMT-subchapter provision trigger, conditional on the " +
    "scope determination being confirmed. Downstream review continues.";
  const r = sanitizeString(input, null);
  assertEquals(r.out, "The scope determination proceeds. Downstream review continues.");
  assertEquals(r.template_sentence_drops, 1);
});

Deno.test("T-B: mid-sentence interpolation dropped (regression pin doc 0481fc0c)", () => {
  const input =
    "This entry stands. " +
    "no enumerated the applicable ADMT-subchapter provision category applies. " +
    "The next sentence is fine.";
  const r = sanitizeString(input, null);
  assertEquals(r.out, "This entry stands. The next sentence is fine.");
  assertEquals(r.template_sentence_drops, 1);
});

Deno.test("T-B: registry-first rewrite when proposition_key resolves", () => {
  const entry = { proposition_key: "admt.opt_out.right" }; // any resolvable key
  // If the key doesn't resolve on this fixture registry, we still exercise
  // the drop path safely; the sanitizer must never fail.
  const input = "Prior. the applicable ADMT-subchapter provision governs. After.";
  const r = sanitizeString(input, entry);
  // Either rewritten or dropped — must not leave the fallback phrase.
  assert(!r.out.toLowerCase().includes("the applicable admt-subchapter"));
  assert(r.template_sentence_drops + r.template_sentence_rewrites === 1);
});

Deno.test("idempotency: second pass is a no-op", () => {
  const input = "Keep. More information is needed here. End.";
  const first = sanitizeString(input, null);
  const second = sanitizeString(first.out, null);
  assertEquals(second.out, first.out);
  assertEquals(second.info_needed_sentence_drops, 0);
  assertEquals(second.template_sentence_drops, 0);
});

Deno.test("fail-open: malformed input types return safely", () => {
  // deno-lint-ignore no-explicit-any
  const r1 = sanitizeString(null as any, null);
  assertEquals(r1.out, null as unknown as string);
  // deno-lint-ignore no-explicit-any
  const diag = applyW25AdmtSanitizerFix(null as any);
  assertEquals(diag.strings_scanned, 0);
});

Deno.test("apply: _meta preserved; unrelated fields untouched; anchor keys not mutated", () => {
  const report: Record<string, unknown> = {
    _meta: { build_stamp: "test", internal: { existing: 1 } },
    access_gaps: [
      {
        proposition_key: "admt.access.logic",
        citation: "the applicable ADMT-subchapter provision", // anchor key — must NOT be mutated
        gap: "the applicable ADMT-subchapter provision trigger applies here.",
        detail:
          "Provide the missing details and refresh the assessment. " +
          "More information is needed before enough exists to pronounce " +
          "the logic disclosure adequate on this record.",
      },
    ],
    unrelated_prose: "Nothing to see here. No triggers present.",
  };
  const diag = applyW25AdmtSanitizerFix(report);
  const entry = (report.access_gaps as Array<Record<string, unknown>>)[0];
  // Anchor `citation` must be untouched.
  assertEquals(entry.citation, "the applicable ADMT-subchapter provision");
  // Prose fields cleaned.
  assertEquals(entry.detail, "Provide the missing details and refresh the assessment.");
  assert(!String(entry.gap).toLowerCase().includes("the applicable admt-subchapter"));
  // Unrelated prose untouched.
  assertEquals(report.unrelated_prose, "Nothing to see here. No triggers present.");
  // _meta preserved and stamped.
  const meta = report._meta as Record<string, unknown>;
  assertEquals(meta.build_stamp, "test");
  const internal = meta.internal as Record<string, unknown>;
  assertEquals(internal.existing, 1);
  const stamped = internal.admt_w25_sanitizer as Record<string, unknown>;
  assertEquals(stamped.stamp, W25_ADMT_SANITIZER_STAMP);
  assert((stamped.strings_scanned as number) >= 2);
  assert((stamped.info_needed_sentence_drops as number) >= 1);
  assert((stamped.template_sentence_drops as number) + (stamped.template_sentence_rewrites as number) >= 1);
  assertEquals(diag.errors, 0);
});

Deno.test("apply: nested arrays and deep objects are reached (widened coverage)", () => {
  const report: Record<string, unknown> = {
    priority_actions: [
      {
        proposition_key: "unknown.key",
        elements: {
          key_elements: [
            "First element. the applicable ADMT-subchapter provision governs here. End.",
            "Clean element.",
          ],
        },
      },
    ],
  };
  const diag = applyW25AdmtSanitizerFix(report);
  const el = ((report.priority_actions as Array<Record<string, unknown>>)[0]
    .elements as Record<string, unknown>).key_elements as string[];
  assert(!el[0].toLowerCase().includes("the applicable admt-subchapter"));
  assertEquals(el[1], "Clean element.");
  assert(diag.template_sentence_drops + diag.template_sentence_rewrites >= 1);
});
