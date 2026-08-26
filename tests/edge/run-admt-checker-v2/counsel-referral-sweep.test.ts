// PN-A4 close-out (CEO-ratified 2026-08-26): counsel-referral zones are
// moot-by-determinism — the e6 defect class was a MODEL-prose failure mode,
// and ADMT v2 is zero-model-call — so the deterministic era's zone rule is
// this sweep: the ONLY counsel mention any v2 builder literal may carry is
// the single deliberate, CEO-reviewed form ("The Company or its counsel
// should review …", v3.2.2-surviving). Any new counsel-referral advisory
// added to a builder is a ratification event and must extend the allowlist
// here deliberately.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const MODULES = [
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-generated.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-vocab.ts",
];

/** The sole permitted counsel form in rendered ADMT v2 text. */
const ALLOWED = ["The Company or its counsel"];

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

Deno.test("PN-A4 sweep — no counsel-referral text outside the pinned deliberate form", async () => {
  for (const path of MODULES) {
    const src = await Deno.readTextFile(path);
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (!/counsel/i.test(line)) return;
      if (isCommentLine(line)) return;
      assert(
        ALLOWED.some((a) => line.includes(a)),
        `${path}:${i + 1} carries a counsel mention outside the allowlist: ${line.trim().slice(0, 160)}`,
      );
    });
  }
});

Deno.test("PN-A4 sweep — the banned advisory family never appears in any v2 module", async () => {
  const banned = [
    /consult (?:an? )?(?:legal counsel|attorney|lawyer)/i,
    /seek (?:legal )?(?:counsel|advice from)/i,
    /speak (?:with|to) (?:an? )?(?:attorney|lawyer)/i,
    /retain (?:legal )?counsel/i,
  ];
  for (const path of MODULES) {
    const src = await Deno.readTextFile(path);
    for (const re of banned) {
      assert(!re.test(src), `${path} carries a banned counsel-referral advisory (${re})`);
    }
  }
});
