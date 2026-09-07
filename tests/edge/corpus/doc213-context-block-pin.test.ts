// DOC 213 §2 (B) — the emitted CONTEXT BLOCK must be a VERBATIM copy of the
// three [RATIFY] blocks in the canonical run-li-assessment hook map. Compared
// after normalising CRLF -> LF: doc 207c failed on line endings alone, and
// that must not repeat.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/hook-context-block.ts";

const CANONICAL_PATH = new URL(
  "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts",
  import.meta.url,
);

const MARKER = "// ── [RATIFY] — the direction matrix";

function lf(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

Deno.test("doc213 — context block is the canonical [RATIFY] blocks verbatim (CRLF-normalised)", async () => {
  const canonical = lf(await Deno.readTextFile(CANONICAL_PATH));
  const start = canonical.indexOf(MARKER);
  assert(start >= 0, `canonical marker not found: ${MARKER}`);
  assertEquals(lf(LIA_HOOK_CONTEXT_BLOCK), canonical.slice(start));
});

Deno.test("doc213 — the context block carries all three ratified blocks", () => {
  for (const name of ["LIA_HOOK_DIRECTION_MATRIX", "LIA_ATOM_PHRASES", "LIA_HOOK_SHAPES"]) {
    assert(LIA_HOOK_CONTEXT_BLOCK.includes(name), `context block is missing ${name}`);
  }
});
