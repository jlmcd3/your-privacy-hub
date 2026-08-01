#!/usr/bin/env -S deno run --allow-read
// ITEM 338 — FRAME HARVEST LINT RUNNER (offline).
//   deno run --allow-read scripts/frames/lint-frames.ts [product ...]
// Prints per-product extracted / passed-lint / failed counts and the top
// failing rules, and writes nothing. The same lint runs as a test gate.

import { type FrameSet, lintFrame } from "../../supabase/functions/_shared/prose/frames.ts";

const DIR = "supabase/functions/_shared/prose/frames";
const args = Deno.args.length ? Deno.args : null;

const files: string[] = [];
for await (const e of Deno.readDir(DIR)) {
  if (!e.isFile || !e.name.endsWith(".json")) continue;
  if (args && !args.some((a) => e.name.startsWith(a))) continue;
  files.push(e.name);
}
files.sort();

const table: Record<string, unknown>[] = [];
for (const f of files) {
  const set = JSON.parse(await Deno.readTextFile(`${DIR}/${f}`)) as FrameSet;
  const rules: Record<string, number> = {};
  let passed = 0;
  for (const frame of set.frames) {
    const findings = lintFrame(frame);
    if (findings.length === 0) passed++;
    for (const fi of findings) rules[fi.rule] = (rules[fi.rule] ?? 0) + 1;
  }
  table.push({
    file: f,
    product: set.product,
    approved: set.approved,
    extracted: set.frames.length,
    passed_lint: passed,
    failed_lint: set.frames.length - passed,
    top_rules: Object.entries(rules).sort((a, b) => b[1] - a[1]).slice(0, 4),
  });
}
console.log(JSON.stringify(table, null, 2));
