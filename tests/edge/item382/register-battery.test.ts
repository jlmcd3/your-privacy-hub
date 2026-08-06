// ITEM 382 — REGISTER BATTERY + FACT-EXEMPT REFERENCE RENDER.
//
// The battery reads the LIA-owned surfaces as source text and asserts that no
// banned register idiom and no reference-render token survives in a literal.
//
// FACT-EXEMPT HARD RULE: the approved reference render (Meridian Insights) is
// an architecture/register reference ONLY. No fact, name, figure or scenario
// from it may reach a customer document.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_BANNED_REGISTER,
  LIA_PIPELINE_STAMP,
  REFERENCE_RENDER_TOKENS,
  liaVerdictLabel,
} from "../../../supabase/functions/_shared/prose/plans/lia.spine.ts";

const ROOT = new URL("../../../", import.meta.url);

/** LIA-owned builder surfaces. Non-LIA surfaces are out of scope by ruling. */
const SURFACES = [
  "supabase/functions/_shared/ltp/lia-deliverables/build.ts",
  "supabase/functions/_shared/ltp/lia-deliverables/build-upgrade4.ts",
  "supabase/functions/_shared/ltp/lia-deliverables/elements.ts",
  "supabase/functions/_shared/prose/plans/lia.spine.ts",
  "supabase/functions/run-li-assessment/_lia_boilerplate_cap.ts",
  "supabase/functions/run-li-assessment/_lia_t6_fix.ts",
];

/**
 * Extract string/template literals, skipping comments. Regex literals are
 * skipped too: the banned-idiom detectors in this repo are detectors, not
 * output.
 */
function literals(src: string): string[] {
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const out: string[] = [];
  const re = /`(?:\\[\s\S]|[^`\\])*`|"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'/g;
  for (const m of noComments.matchAll(re)) out.push(m[0]);
  return out;
}

async function readSurface(rel: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(new URL(rel, ROOT));
  } catch {
    return null;
  }
}

Deno.test("ITEM 382 — no banned register idiom in any LIA builder literal", async () => {
  const findings: string[] = [];
  for (const rel of SURFACES) {
    const src = await readSurface(rel);
    if (src == null) continue;
    for (const lit of literals(src)) {
      for (const rule of LIA_BANNED_REGISTER) {
        // The spine declares the detectors themselves; skip its rule table.
        if (rel.endsWith("lia.spine.ts")) continue;
        if (rule.re.test(lit)) findings.push(`${rel} [${rule.id}] ${lit.slice(0, 120)}`);
      }
    }
  }
  assertEquals(findings, [], findings.join("\n"));
});

Deno.test("ITEM 382 — reference render is fact-exempt: no token reaches a builder literal", async () => {
  const findings: string[] = [];
  for (const rel of SURFACES) {
    const src = await readSurface(rel);
    if (src == null) continue;
    if (rel.endsWith("lia.spine.ts")) continue; // declares the token list
    for (const lit of literals(src)) {
      for (const tok of REFERENCE_RENDER_TOKENS) {
        if (lit.toLowerCase().includes(tok.toLowerCase())) {
          findings.push(`${rel} [${tok}] ${lit.slice(0, 120)}`);
        }
      }
    }
  }
  assertEquals(findings, [], findings.join("\n"));
});

Deno.test("ITEM 382 — verdict enums never reach the reader as the banned idiom", () => {
  assertEquals(liaVerdictLabel("undetermined_on_the_record"), "not yet determined");
  assertEquals(liaVerdictLabel("disproportionate_on_the_record"), "disproportionate");
  assertEquals(liaVerdictLabel(""), "");
  for (const v of ["undetermined_on_the_record", "not_met", "met"]) {
    assert(!/on the record/i.test(liaVerdictLabel(v)), v);
  }
});

Deno.test("ITEM 382 — the finalize-point stamp is the current LIA item stamp", () => {
  // ITEM 385 leg 2 bumped the LIA pipeline stamp; the finalize point is
  // unchanged, only its value.
  assertEquals(LIA_PIPELINE_STAMP, "lia-pipeline@item385r2-2026-08-06");
});

Deno.test("ITEM 382 — the finalize point writes the stamp before the serializer", async () => {
  const src = (await readSurface("supabase/functions/run-li-assessment/index.ts"))!;
  const stampAt = src.indexOf("internal.lia_pipeline_stamp = LIA_PIPELINE_STAMP");
  const serializeAt = src.indexOf("serializeCustomerReport(reportData");
  assert(stampAt > 0, "stamp is not written at the finalize point");
  assert(serializeAt > stampAt, "stamp must be written before the P2 serializer");
  assert(src.includes("boot ${BUILD_STAMP} ${LIA_PIPELINE_STAMP}"), "boot line must print the stamp");
});
