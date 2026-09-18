#!/usr/bin/env -S deno run -A
// DOC 272 §9 "Offline twin" — render ONE panel fixture offline and print (or
// save) its reviewer text, each paragraph prefixed with its block key
// (`section:index`, the same coordinate `product_test_checks.block_key`
// carries per doc 272 §7) — the shape a person reproducing a failed check
// (doc 272 §7: "so it can be reproduced offline by rendering the same
// fixture") wants to read.
//
// Usage:
//   deno run -A scripts/product-test/render-one.ts <tool> <fixture_id>
//   deno run -A scripts/product-test/render-one.ts <tool> <fixture_id> out.md

import { PANEL_BY_TOOL, type PanelTool } from "../../src/lib/ptestPanels/index.ts";
import { renderOffline, WIRED_TOOLS, type WiredTool } from "../../tests/edge/product-test/render/dispatcher.ts";

const DATE = "2026-09-18";

function isWiredTool(x: string): x is WiredTool {
  return (WIRED_TOOLS as readonly string[]).includes(x);
}

async function main() {
  const [tool, fixtureId, outPath] = Deno.args;
  if (!tool || !fixtureId) {
    console.error("usage: deno run -A scripts/product-test/render-one.ts <tool> <fixture_id> [out.md]");
    console.error(`wired tools: ${WIRED_TOOLS.join(", ")}`);
    Deno.exit(2);
  }
  if (!isWiredTool(tool)) {
    console.error(`"${tool}" has no offline chain wired. Wired tools: ${WIRED_TOOLS.join(", ")}`);
    Deno.exit(2);
  }

  const panel = PANEL_BY_TOOL[tool as PanelTool];
  const fixture = panel.find((f) => f.id === fixtureId);
  if (!fixture) {
    console.error(`no fixture "${fixtureId}" in the ${tool} panel. ids: ${panel.map((f) => f.id).join(", ")}`);
    Deno.exit(2);
  }

  const { document, hash, text } = await renderOffline(tool, fixture.intake as Record<string, unknown>, DATE);

  const lines: string[] = [];
  lines.push(`# ${fixture.id} — ${fixture.company} (${tool})`);
  lines.push(`hash: ${hash}`);
  lines.push("");
  if (document) {
    for (const section of document.sections) {
      lines.push(`## ${section.title ?? section.id}`);
      lines.push("");
      section.paragraphs.forEach((p, i) => {
        const key = p.key ?? `${section.id}:${i}`;
        // Tables print as pipe rows (lead, 2026-09-18): a scoreboard or
        // register block would otherwise print as an empty line.
        const table = (p as { table?: { rows?: readonly (readonly string[])[] } }).table;
        if (table?.rows?.length) {
          lines.push(`[${key}] (table)`);
          for (const row of table.rows) lines.push(`| ${row.join(" | ")} |`);
        } else {
          lines.push(`[${key}] ${p.text ?? ""}`);
        }
        lines.push("");
      });
    }
  } else {
    lines.push("(no skeleton_document — raw reviewer text follows)");
    lines.push("");
    lines.push(text);
  }

  const out = lines.join("\n");
  if (outPath) {
    await Deno.writeTextFile(outPath, out);
    console.error(`wrote ${outPath} (${out.length} chars)`);
  } else {
    console.log(out);
  }
}

await main();
