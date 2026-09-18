#!/usr/bin/env -S deno run -A
// DOC 272 §6.5 "Snapshot" / §9 "the snapshot pins live [in the offline twin]".
//
// Renders every fixture of every wired tool (`tests/edge/product-test/render/
// dispatcher.ts`) offline, writes the reviewer text to
// `tests/edge/product-test/render/snapshots/<tool>/<fixture_id>.txt`, and
// rewrites `tests/edge/product-test/render/pins.json` to the freshly
// rendered hashes.
//
// DOC 272 §6, Score: "A new pin is accepted only by a person." Running this
// script IS that acceptance — it overwrites every existing pin with
// whatever the engines produce right now, with no comparison to the
// previous pins and no review of what changed. Do not run it as part of an
// automated battery or a pre-commit hook; run it deliberately, after
// reading the diff `snapshot.test.ts` would otherwise report, and commit
// the result only once a person has looked at it.
//
// Usage:
//   deno run -A scripts/product-test/pin-snapshots.ts
//   deno run -A scripts/product-test/pin-snapshots.ts cppa-risk dpia   (subset)

import { PANEL_BY_TOOL, type PanelTool } from "../../src/lib/ptestPanels/index.ts";
import { renderOffline, WIRED_TOOLS, type WiredTool } from "../../tests/edge/product-test/render/dispatcher.ts";

const DATE = "2026-09-18";
const RENDER_DIR = new URL("../../tests/edge/product-test/render/", import.meta.url);
const PINS_PATH = new URL("./pins.json", RENDER_DIR);
const SNAPSHOTS_DIR = new URL("./snapshots/", RENDER_DIR);

function isWiredTool(x: string): x is WiredTool {
  return (WIRED_TOOLS as readonly string[]).includes(x);
}

async function main() {
  const requested = Deno.args.length > 0 ? Deno.args : [...WIRED_TOOLS];
  const tools: WiredTool[] = [];
  for (const t of requested) {
    if (!isWiredTool(t)) {
      console.error(`skip: "${t}" is not a wired tool (${WIRED_TOOLS.join(", ")})`);
      continue;
    }
    tools.push(t);
  }

  const pins: Record<string, string> = {};
  let rendered = 0;
  let failed = 0;

  for (const tool of tools) {
    const panel = PANEL_BY_TOOL[tool as PanelTool];
    for (const fixture of panel) {
      const key = `${tool}/${fixture.id}`;
      try {
        const { hash, text } = await renderOffline(tool, fixture.intake as Record<string, unknown>, DATE);
        pins[key] = hash;
        const dir = new URL(`./${tool}/`, SNAPSHOTS_DIR);
        await Deno.mkdir(dir, { recursive: true });
        await Deno.writeTextFile(new URL(`./${fixture.id}.txt`, dir), text);
        rendered++;
        console.log(`ok    ${key}  ${hash}`);
      } catch (e) {
        failed++;
        console.error(`FAIL  ${key}  ${(e as Error)?.message ?? String(e)}`);
      }
    }
  }

  // Preserve pins for any tool NOT included in this run (a subset pin run
  // must not blank out the other tools' pins).
  let existing: Record<string, string> = {};
  try {
    existing = JSON.parse(await Deno.readTextFile(PINS_PATH));
  } catch {
    // pins.json missing or unparseable — start fresh.
  }
  const renderedTools = new Set(tools as string[]);
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(existing)) {
    const tool = k.split("/")[0];
    if (!renderedTools.has(tool)) merged[k] = v;
  }
  Object.assign(merged, pins);

  const ordered = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  await Deno.writeTextFile(PINS_PATH, JSON.stringify(ordered, null, 2) + "\n");

  console.log(`\n${rendered} fixture(s) pinned, ${failed} failed. pins.json rewritten (${Object.keys(ordered).length} total entries).`);
  if (failed > 0) Deno.exit(1);
}

await main();
