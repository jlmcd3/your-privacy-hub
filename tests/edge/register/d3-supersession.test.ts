// v3 COUNSEL REGISTER — CROSS-TOOL D3 SUPERSESSION BATTERY.
//
// The v3 CEO-ratified counsel register (2026-08-09) bans the "the record
// shows" family in customer-facing prose. SO-11 enforced this at the LIA
// render layer only; the D3-era GENERATOR PROMPTS still mandated the banned
// phrasing. This battery asserts the prompts are reconciled and that no other
// tool carries the same stale phrasing.
//
// Run: deno test -A tests/edge/register/d3-supersession.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { repairRegister } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

const ROOT = new URL("../../../", import.meta.url);

/** The banned family, per the v3 register. */
const BANNED = [
  /\bthe record shows\b/i,
  /\bthe record reflects\b/i,
  /\bthe record indicates\b/i,
  /\bthe record demonstrates\b/i,
  /\bthe record establishes\b/i,
  /\bon this record\b/i,
];

/**
 * Every generator prompt surface that emits customer prose. A generator that
 * ships later must be added here.
 */
const PROMPT_SURFACES = [
  "supabase/functions/run-dpia-framework/index.ts",
  "supabase/functions/run-admt-checker/index.ts",
  "supabase/functions/run-cppa-risk-assessment/index.ts",
  "supabase/functions/run-cppa-cybersecurity/index.ts",
  "supabase/functions/run-li-assessment/index.ts",
  "supabase/functions/run-governance-assessment/index.ts",
  "supabase/functions/generate-ir-playbook/index.ts",
  "supabase/functions/check-biometric-compliance/index.ts",
  "supabase/functions/generate-dpa/index.ts",
];

/**
 * A line is allowed to NAME the banned phrasing when it is prohibiting it.
 * Prohibition markers must appear on the same line as the mention.
 */
const PROHIBITION = /\bBANNED\b|\bnever attributed\b|\bREGISTER defect\b|\bdo not (?:emit|write|use)\b/i;

async function read(rel: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(new URL(rel, ROOT));
  } catch {
    return null;
  }
}

Deno.test("v3 register — no generator prompt PRESCRIBES the banned record family", async () => {
  const findings: string[] = [];
  for (const rel of PROMPT_SURFACES) {
    const src = await read(rel);
    if (src == null) continue;
    src.split("\n").forEach((line, i) => {
      if (line.trim().startsWith("//")) return;
      if (PROHIBITION.test(line)) return;
      for (const re of BANNED) {
        if (re.test(line)) findings.push(`${rel}:${i + 1} ${line.trim().slice(0, 120)}`);
      }
    });
  }
  assertEquals(findings, [], findings.join("\n"));
});

Deno.test("v3 register — DPIA and ADMT canonical-record rules name the ban explicitly", async () => {
  const dpia = (await read("supabase/functions/run-dpia-framework/index.ts"))!;
  const admt = (await read("supabase/functions/run-admt-checker/index.ts"))!;
  for (const [name, src, marker] of [
    ["DPIA", dpia, "CANONICAL RECORD REFERENCE"],
    ["ADMT", admt, "CANONICAL RECORD VOICE"],
  ] as const) {
    const idx = src.indexOf(marker);
    assert(idx > 0, `${name}: canonical-record rule missing`);
    const rule = src.slice(idx, idx + 1400);
    assert(/v3/.test(rule), `${name}: rule does not reference the v3 register`);
    assert(/BANNED/.test(rule), `${name}: rule does not declare the family BANNED`);
    assert(/has indicated|has described/.test(rule),
      `${name}: rule does not prescribe attributed replacement phrasing`);
  }
});

Deno.test("v3 register — the grader no longer exempts the banned family as drafting voice", async () => {
  const ctx = (await read("supabase/functions/_shared/grader/context.ts"))!;
  assert(!/Do NOT flag "the record shows"/.test(ctx),
    "grader context still exempts 'the record shows' from findings");
  assert(/REGISTER defect/.test(ctx), "grader context must classify the family as a register defect");
});

Deno.test("v3 register — the render-layer repair still rewrites the family", () => {
  assertEquals(repairRegister("The record shows a lawful basis."), "The company has indicated a lawful basis.");
  assertEquals(repairRegister("On this record, the purpose is clear."),
    "On the record as documented, the purpose is clear.");
  for (const probe of [
    "the record shows X",
    "the record reflects X",
    "the record indicates X",
    "the record demonstrates X",
    "the record establishes X",
  ]) {
    const out = repairRegister(probe);
    assert(!/the record (shows|reflects|indicates|demonstrates|establishes)/i.test(out), probe);
  }
});
