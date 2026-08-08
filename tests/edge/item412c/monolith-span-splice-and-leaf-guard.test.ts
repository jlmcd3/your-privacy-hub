// ITEM 412-C — MONOLITH-LEAF SPAN SPLICING + LEAF-INTEGRITY GUARD.
//
// Identities:
//   item412c a monolith-leaf splice is SPAN-LEVEL: bytes outside the span are identical
//   item412c REGRESSION: a verifier-approved whole-leaf proposal is rejected by the guard
//   item412c the guard rejects a splice that shrinks the leaf below 90%
//   item412c OUTPUT PRESERVATION: header, jurisdiction sections and citations survive
//   item412c telemetry carries the leaf_guard_rejected bucket with full accounting
//   item412c the stamp is item412c

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BIOMETRIC_LEAF_MIN_RETAINED_FRACTION,
  BIOMETRIC_MONOLITH_LEAF_PATHS,
  checkLeafIntegrity,
  runBiometricRefinement,
  spanSplice,
  type RefinementDeps,
} from "../../../supabase/functions/_shared/ltp/biometric-refinement.ts";
import { BIOMETRIC_PIPELINE_STAMP } from "../../../supabase/functions/_shared/prose/plans/biometric.spine.ts";

const HEADER = "Northwind Clinical Diagnostics Corporation — Biometric Compliance Assessment\n\n";
const IL =
  "Illinois (BIPA). Under 740 ILCS 14/15(a), a private entity in possession of biometric identifiers must develop a written retention and destruction policy.\n\n";
const TX =
  "Texas (CUBI). Under Tex. Bus. & Com. Code § 503.001(c)(3), a person who possesses a biometric identifier must destroy it within a reasonable time.\n\n";
const WA =
  "Washington (HB 1493). Under RCW 19.375.020, a person may not enroll a biometric identifier in a database for a commercial purpose without notice.\n\n";
const TAIL =
  "1. Written releases: the record confirms written releases are obtained at enrolment and retained for the life of the record.\n";

const DOC_TEXT = HEADER + IL + TX + WA + TAIL;

const QUOTE = "the record confirms written releases are obtained at enrolment";
const BETTER = "the record confirms written releases are obtained before enrolment";

function deps(findings: unknown[], approveAll = true): RefinementDeps {
  return {
    critic: () => Promise.resolve(JSON.stringify({ findings, structural_findings: [] })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: (findings as { path: string }[]).map((f) => ({
          path: f.path,
          verdict: approveAll ? "approve" : "reject",
          reason: "ok",
        })),
      })),
  };
}

function baseDoc() {
  return { assessment_text: DOC_TEXT, _meta: { internal: {} } } as Record<string, unknown>;
}

Deno.test("item412c a monolith-leaf splice is SPAN-LEVEL: bytes outside the span are identical", async () => {
  const doc = baseDoc();
  const tel = await runBiometricRefinement(doc, { org: "Northwind" }, deps([{
    path: "$.assessment_text",
    quote: QUOTE,
    class: "record-contradiction",
    anchor: "written_release_timing",
    replacement: BETTER,
    confidence: "high",
  }]));

  const out = doc.assessment_text as string;
  assertEquals(tel.spliced, 1);
  assertEquals(tel.span_spliced_paths, ["$.assessment_text"]);
  assertEquals(tel.leaf_guard_rejected.count, 0);
  // Every byte outside the replaced span is identical.
  const at = DOC_TEXT.indexOf(QUOTE);
  assertEquals(out.slice(0, at), DOC_TEXT.slice(0, at));
  assertEquals(out.slice(at + BETTER.length), DOC_TEXT.slice(at + QUOTE.length));
  assertEquals(out.length, DOC_TEXT.length + (BETTER.length - QUOTE.length));
});

Deno.test("item412c REGRESSION: a verifier-approved whole-leaf proposal is rejected by the guard", async () => {
  // This is the re-pilot defect verbatim: one approved, double-anchored
  // proposal whose `replacement` is a short rewrite of the tail. Pre-fix the
  // core's node-level write made THIS the entire document (1,833 B from
  // 14,058 B). Post-fix the guard rejects it and the leaf is byte-identical.
  const doc = baseDoc();
  const tel = await runBiometricRefinement(doc, {}, deps([{
    path: "$.assessment_text",
    // Double-anchored on the whole head of the document …
    quote: HEADER + IL + TX + WA,
    class: "generic-boilerplate",
    anchor: "intake",
    // … and rewritten away, leaving the document beginning mid-text at
    // "1. Written releases:" — the re-pilot defect verbatim (14,058 B → 1,833 B).
    replacement: "Assessment summary.\n\n",
    confidence: "high",
  }]));

  assertEquals(doc.assessment_text, DOC_TEXT, "leaf must be byte-identical after rejection");
  assertEquals(tel.spliced, 0);
  assertEquals(tel.spliced_paths, []);
  assertEquals(tel.leaf_guard_rejected.count, 1);
  assertEquals(tel.leaf_guard_rejected.items[0].path, "$.assessment_text");
  assertEquals(tel.leaf_guard_rejected.items[0].reason, "shrank_below_floor");
  assertEquals(tel.leaf_guard_rejected.items[0].pre_length, DOC_TEXT.length);
});

Deno.test("item412c the guard rejects a splice that shrinks the leaf below 90%", () => {
  const pre = "x".repeat(1000);
  const quote = "x".repeat(500);
  const rej = checkLeafIntegrity("$.assessment_text", pre, "x".repeat(500), quote, "");
  assert(rej !== null);
  assertEquals(rej!.reason, "shrank_below_floor");
  // A whole-leaf replacement (delta mismatch) is its own named class.
  const whole = checkLeafIntegrity("$.assessment_text", pre, "short", quote, "short");
  assertEquals(whole!.reason, "whole_leaf_replacement");
  // A true span splice inside the floor is accepted.
  assertEquals(
    checkLeafIntegrity("$.assessment_text", pre, "x".repeat(950) + "y".repeat(50), "x".repeat(50), "y".repeat(50)),
    null,
  );
  assertEquals(BIOMETRIC_LEAF_MIN_RETAINED_FRACTION, 0.9);
  assertEquals([...BIOMETRIC_MONOLITH_LEAF_PATHS], ["$.assessment_text"]);
  assertEquals(spanSplice("abcdef", "cd", "ZZ"), "abZZef");
  assertEquals(spanSplice("abcdef", "zz", "ZZ"), null);
});

Deno.test("item412c OUTPUT PRESERVATION: header, jurisdiction sections and citations survive", async () => {
  const doc = baseDoc();
  const before = (doc.assessment_text as string).length;
  await runBiometricRefinement(doc, {}, deps([
    { path: "$.assessment_text", quote: QUOTE, class: "x", anchor: "y", replacement: BETTER, confidence: "high" },
    {
      path: "$.assessment_text",
      quote: "Illinois (BIPA).",
      class: "x",
      anchor: "y",
      replacement: "Nothing to report.",
      confidence: "high",
    },
  ]));
  const out = doc.assessment_text as string;
  assert(out.startsWith("Northwind Clinical Diagnostics Corporation"), "org header preserved");
  for (const cite of ["740 ILCS 14/15(a)", "Tex. Bus. & Com. Code § 503.001(c)(3)", "RCW 19.375.020"]) {
    assert(out.includes(cite), `citation preserved: ${cite}`);
  }
  for (const sec of ["Illinois (BIPA)", "Texas (CUBI)", "Washington (HB 1493)"]) {
    assert(out.includes(sec), `section preserved: ${sec}`);
  }
  assert(out.length >= Math.floor(before * 0.9), "leaf never shrinks below 90%");
});

Deno.test("item412c telemetry carries the leaf_guard_rejected bucket with full accounting", async () => {
  const doc = baseDoc();
  const tel = await runBiometricRefinement(doc, {}, deps([{
    path: "$.assessment_text",
    quote: QUOTE,
    class: "x",
    anchor: "y",
    replacement: "tiny",
    confidence: "high",
  }]));
  assert(Array.isArray(tel.leaf_guard_rejected.items));
  assertEquals(tel.leaf_guard_rejected.count, tel.leaf_guard_rejected.items.length);
  assertEquals(tel.critic_findings, 1);
  assert(Array.isArray(tel.findings_log));
  assert(Array.isArray(tel.span_spliced_paths));
});

Deno.test("item412c the stamp is item412c", () => {
  assertEquals(BIOMETRIC_PIPELINE_STAMP, "biometric-pipeline@item412c-2026-08-08");
});
