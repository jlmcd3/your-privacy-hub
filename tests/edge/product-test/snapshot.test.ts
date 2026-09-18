// product-test-grade — snapshot family.
//
// pins.json ships empty ({}) per the brief, so there is no committed pin to
// exercise a true mismatch against through the public `checkSnapshot` entry
// point today (a pin is "accepted only by a person" — doc 272 §7). This file
// tests: (a) non-deterministic tools never produce a snapshot check; (b) an
// unpinned deterministic tool passes with `rule_ref: "unpinned"` and
// `actual` = the computed hash; (c) the underlying hash primitive
// (`documentHash`, from the mirrored determinism.ts) is sensitive to content
// changes — the exact property a real pin mismatch depends on — proven
// directly against two different documents.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/snapshot.test.ts

import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkSnapshot } from "../../../supabase/functions/product-test-grade/_local/grade/snapshot.ts";
import { documentHash } from "../../../supabase/functions/product-test-grade/_local/review/determinism.ts";

function skeletonDoc(text: string) {
  return {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [{ id: "body", title: "Body", paragraphs: [{ kind: "skeleton", text, key: "body:0" }] }],
  };
}

Deno.test("snapshot: non-deterministic tool (dpa) emits no snapshot check", async () => {
  const { checks } = await checkSnapshot("dpa", "dpa-p01", "golden", { dpa_text: "some text" });
  assertEquals(checks.length, 0);
});

Deno.test("snapshot: deterministic tool with no pin passes as unpinned", async () => {
  // dpia, not governance: governance left DETERMINISTIC_TOOLS on 2026-09-18
  // until its production flag is confirmed (contracts-registry.ts).
  const { checks, hash } = await checkSnapshot(
    "dpia", "dpia-p01-test", "golden",
    { skeleton_document: skeletonDoc("A DPIA report body.") },
  );
  assertEquals(checks.length, 1);
  assertEquals(checks[0].passed, true);
  assertEquals(checks[0].rule_ref, "unpinned");
  assertEquals(checks[0].actual, hash);
});

Deno.test("snapshot: documentHash is sensitive to content — the primitive a real pin mismatch relies on", async () => {
  const a = await documentHash({ skeleton_document: skeletonDoc("Version A of the document.") });
  const b = await documentHash({ skeleton_document: skeletonDoc("Version B of the document, materially different.") });
  assertNotEquals(a.hash, b.hash);
  assert(/^[0-9a-f]{64}$/.test(a.hash), "documentHash should return a 64-hex-char SHA-256");
});

Deno.test("snapshot: same content hashes identically (determinism)", async () => {
  const a = await documentHash({ skeleton_document: skeletonDoc("Identical content.") });
  const b = await documentHash({ skeleton_document: skeletonDoc("Identical content.") });
  assertEquals(a.hash, b.hash);
});
