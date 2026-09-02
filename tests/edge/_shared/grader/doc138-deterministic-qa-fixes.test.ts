// DOC 138 (2026-09-02) — regression guards for two confirmed grader-tooling
// bugs in `deterministic-qa.ts`, both bugs in the checker itself, not in any
// customer-facing product:
//
//   1. `TOKEN_WHITELIST` was missing "ePrivacy" (the EU's ePrivacy
//      Directive), a real legal term of art structurally identical to the
//      already-whitelisted "eDiscovery"/"eIDAS" entries. Without it,
//      CAMEL_RE's `deterministic_raw_field_token` check false-positived on
//      genuinely correct, already-shipped product text.
//   2. `excerptAround()` sliced a fixed 80-character window with no word-
//      boundary awareness, so a boundary landing mid-word (e.g. inside
//      "information") produced a mangled excerpt that reads as if the
//      PRODUCT itself corrupted text, when the rendered document is spelled
//      correctly throughout.
//
// See supabase/functions/_shared/grader/deterministic-qa.ts for the fixes.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runDeterministicQa } from "../../../../supabase/functions/_shared/grader/deterministic-qa.ts";

function docWithText(text: string) {
  return {
    skeleton_document: {
      title: "T",
      sections: [{
        id: "s",
        title: "S",
        paragraphs: [{ kind: "skeleton", text }],
      }],
    },
  };
}

Deno.test("doc138 (a) — 'ePrivacy' does not trigger deterministic_raw_field_token", () => {
  const findings = runDeterministicQa(
    docWithText(
      "Under the ePrivacy Directive, any storage of or access to information on a user's device requires a separate consent from the visitor.",
    ),
  );
  assert(
    !findings.some((f) => f.check_id === "deterministic_raw_field_token"),
    `false positive on whitelisted term of art: ${JSON.stringify(findings)}`,
  );
});

Deno.test("doc138 (b) — a genuine leaking camelCase field name still triggers the check", () => {
  const findings = runDeterministicQa(
    docWithText(
      "Based on the information supplied, someInternalFieldName remains unresolved for this determination.",
    ),
  );
  const hit = findings.find((f) => f.check_id === "deterministic_raw_field_token");
  assert(hit, "true positive no longer detected after whitelist addition");
  assert(hit!.evidence.includes("someInternalFieldName"), "evidence missing the offending token");
});

Deno.test("doc138 (c) — excerptAround never starts or ends mid-word", () => {
  // 80 chars before "ePrivacy" lands inside "information" (mid-word) under
  // the old fixed-count slice; the fix must snap outward to a whole word.
  const prefix = "Because the applicable rules govern any storage of or access to ";
  const text = `${prefix}information on a user's device, the ePrivacy Directive requires a separate consent from the visitor before any non-essential cookie is set.`;
  const findings = runDeterministicQa(docWithText(text));
  // ePrivacy is whitelisted so it won't itself raise a finding; test the
  // excerpt builder directly via a raw-field-token case placed at the same
  // kind of mid-word-risk offset instead.
  const dirty = `${prefix}information on a user's device, someLeakingToken requires review.`;
  const dirtyFindings = runDeterministicQa(docWithText(dirty));
  const hit = dirtyFindings.find((f) => f.check_id === "deterministic_raw_field_token");
  assert(hit, "expected a raw-field-token finding to inspect its excerpt");
  const evidence = hit!.evidence;
  assert(/\binformation\b/.test(evidence), `excerpt lost the whole word "information": ${evidence}`);
  // "formation on" is a substring of the correct "information on", so guard
  // with a word boundary: a mangled excerpt has "formation" as its OWN word
  // (not preceded by "in"), which \bformation\b would catch.
  assert(!/\bformation\b/.test(evidence), `excerpt still mangled mid-word: ${evidence}`);
  // The quoted-token prefix is `"tok" — `; strip it, then confirm the
  // excerpt's own first/last words are not word-fragments: they must match
  // whole-word runs from the original source text.
  const quoted = evidence.replace(/^"[^"]+"\s—\s/, "");
  const firstWord = quoted.split(" ")[0];
  const lastWord = quoted.split(" ").slice(-1)[0];
  assert(dirty.includes(` ${firstWord} `) || dirty.startsWith(firstWord), `excerpt starts mid-word: "${firstWord}"`);
  assert(dirty.includes(` ${lastWord} `) || dirty.endsWith(lastWord), `excerpt ends mid-word: "${lastWord}"`);
  assert(findings.length >= 0); // ePrivacy sentence parses without throwing
});

Deno.test("doc138 (d) — the excerpt stays reasonably bounded, not runaway", () => {
  const longRun = "x".repeat(500); // a single long word-free-adjacent run
  const text = `${longRun} someLeakingToken ${longRun}`;
  const findings = runDeterministicQa(docWithText(text));
  const hit = findings.find((f) => f.check_id === "deterministic_raw_field_token");
  assert(hit, "expected a raw-field-token finding");
  // Base window is ~80 chars each side + up to EXCERPT_BOUNDARY_CAP (20)
  // extension each side + the quoted token prefix; give generous headroom
  // but assert it did not balloon into a page-long quote.
  assert(hit!.evidence.length < 300, `excerpt too long: ${hit!.evidence.length} chars`);
});
