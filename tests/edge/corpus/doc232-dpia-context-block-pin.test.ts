// DOC 213 §2 (B) pattern / DOC 232 — the emitted DPIA CONTEXT BLOCK must be a
// VERBATIM copy of the [RATIFY] blocks in the canonical
// run-dpia-framework/_local/corpus/maps/dpia-hooks.ts. Compared after
// normalising CRLF -> LF (doc 207c's line-ending failure must not repeat).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/dpia-hook-context-block.ts";

const CANONICAL_PATH = new URL(
  "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts",
  import.meta.url,
);

const MARKER = "// ── [RATIFY] — the direction matrix";

function lf(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

Deno.test("doc232 — DPIA context block is the canonical [RATIFY] blocks verbatim (CRLF-normalised)", async () => {
  const canonical = lf(await Deno.readTextFile(CANONICAL_PATH));
  const start = canonical.indexOf(MARKER);
  assert(start >= 0, `canonical marker not found: ${MARKER}`);
  assertEquals(lf(DPIA_HOOK_CONTEXT_BLOCK), canonical.slice(start));
});

Deno.test("doc232 — the DPIA context block carries every ratified block", () => {
  for (
    const name of [
      "DPIA_HOOK_DIRECTION_MATRIX",
      "DPIA_ATOM_PHRASES",
      "DPIA_HOOK_SHAPES",
      "DPIA_ATOM_CONCEPTS",
      "DPIA_FACTOR_PHRASES",
      "DPIA_FACTOR_ELEMENT",
      "DPIA_SOURCE_STATUS_LABELS",
      "DPIA_APPEAL_SENTENCE",
      "DPIA_SETTLEDNESS_LABELS",
    ]
  ) {
    assert(DPIA_HOOK_CONTEXT_BLOCK.includes(name), `context block is missing ${name}`);
  }
});
